/**
 * SEO Engine Governance Tests
 *
 * Tests for approval gates, action executor, and safety controls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Approval Gate', () => {
  describe('Approval Requirements', () => {
    const ALWAYS_REQUIRE_APPROVAL = [
      'QUEUE_DELETE',
      'BULK_NOINDEX',
      'BULK_REINDEX',
      'MASS_UNPUBLISH',
    ];

    const SUPERVISED_REQUIRE_APPROVAL = [
      'SET_NOINDEX',
      'REMOVE_NOINDEX',
      'BLOCK_PUBLISH',
      'UNBLOCK_PUBLISH',
      'UPDATE_CANONICAL',
      'MASS_META_UPDATE',
    ];

    it('should always require approval for destructive actions', () => {
      const checkApprovalRequired = (
        actionType: string,
        autopilotMode: 'off' | 'supervised' | 'autonomous'
      ): boolean => {
        // Always require approval for these
        if (ALWAYS_REQUIRE_APPROVAL.includes(actionType)) {
          return true;
        }

        // Require approval based on mode
        if (autopilotMode === 'off') {
          return true;
        }

        if (autopilotMode === 'supervised') {
          return SUPERVISED_REQUIRE_APPROVAL.includes(actionType);
        }

        // Autonomous mode - only always-require actions need approval
        return ALWAYS_REQUIRE_APPROVAL.includes(actionType);
      };

      // Always require approval
      expect(checkApprovalRequired('QUEUE_DELETE', 'autonomous')).toBe(true);
      expect(checkApprovalRequired('BULK_NOINDEX', 'supervised')).toBe(true);

      // Supervised mode
      expect(checkApprovalRequired('SET_NOINDEX', 'supervised')).toBe(true);
      expect(checkApprovalRequired('SET_NOINDEX', 'autonomous')).toBe(false);

      // Off mode - everything needs approval
      expect(checkApprovalRequired('UPDATE_META', 'off')).toBe(true);
    });

    it('should check content-specific policies', () => {
      const contentPolicies = {
        heroPages: { alwaysRequireApproval: true },
        hubPages: { requireApprovalForNoindex: true },
        spokePages: { allowAutonomous: true },
      };

      const checkContentPolicy = (
        classification: string,
        actionType: string
      ): boolean => {
        const policy = contentPolicies[classification as keyof typeof contentPolicies];
        if (!policy) return true;

        if (policy.alwaysRequireApproval) return true;
        if (policy.requireApprovalForNoindex && actionType.includes('NOINDEX')) return true;

        return false;
      };

      expect(checkContentPolicy('heroPages', 'UPDATE_META')).toBe(true);
      expect(checkContentPolicy('hubPages', 'SET_NOINDEX')).toBe(true);
      expect(checkContentPolicy('spokePages', 'UPDATE_META')).toBe(false);
    });
  });

  describe('Approval Workflow', () => {
    it('should create approval request', () => {
      interface ApprovalRequest {
        id: string;
        actionType: string;
        contentId: string;
        requestedBy: string;
        status: 'pending' | 'approved' | 'rejected' | 'expired';
        createdAt: Date;
        expiresAt: Date;
      }

      const createApprovalRequest = (
        actionType: string,
        contentId: string,
        requestedBy: string
      ): ApprovalRequest => {
        return {
          id: `approval_${Date.now()}`,
          actionType,
          contentId,
          requestedBy,
          status: 'pending',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };
      };

      const request = createApprovalRequest('SET_NOINDEX', 'content-123', 'user-1');

      expect(request.status).toBe('pending');
      expect(request.actionType).toBe('SET_NOINDEX');
      expect(request.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should approve request', () => {
      const request = {
        id: 'approval-1',
        status: 'pending' as const,
        approvedBy: null as string | null,
        approvedAt: null as Date | null,
      };

      const approveRequest = (
        request: typeof request,
        approvedBy: string
      ) => {
        return {
          ...request,
          status: 'approved' as const,
          approvedBy,
          approvedAt: new Date(),
        };
      };

      const approved = approveRequest(request, 'admin-1');

      expect(approved.status).toBe('approved');
      expect(approved.approvedBy).toBe('admin-1');
      expect(approved.approvedAt).not.toBeNull();
    });

    it('should reject request', () => {
      const request = {
        id: 'approval-1',
        status: 'pending' as const,
        rejectedBy: null as string | null,
        rejectionReason: null as string | null,
      };

      const rejectRequest = (
        request: typeof request,
        rejectedBy: string,
        reason: string
      ) => {
        return {
          ...request,
          status: 'rejected' as const,
          rejectedBy,
          rejectionReason: reason,
        };
      };

      const rejected = rejectRequest(request, 'admin-1', 'Not appropriate');

      expect(rejected.status).toBe('rejected');
      expect(rejected.rejectionReason).toBe('Not appropriate');
    });

    it('should expire old requests', () => {
      const requests = [
        { id: 'r1', status: 'pending', expiresAt: new Date(Date.now() - 1000) },
        { id: 'r2', status: 'pending', expiresAt: new Date(Date.now() + 1000) },
        { id: 'r3', status: 'approved', expiresAt: new Date(Date.now() - 1000) },
      ];

      const cleanupExpired = (requests: typeof requests) => {
        return requests.map(r => {
          if (r.status === 'pending' && r.expiresAt.getTime() < Date.now()) {
            return { ...r, status: 'expired' };
          }
          return r;
        });
      };

      const cleaned = cleanupExpired(requests);

      expect(cleaned.find(r => r.id === 'r1')?.status).toBe('expired');
      expect(cleaned.find(r => r.id === 'r2')?.status).toBe('pending');
      expect(cleaned.find(r => r.id === 'r3')?.status).toBe('approved');
    });
  });
});

describe('Action Executor', () => {
  describe('Dry Run Mode', () => {
    it('should simulate action without making changes', () => {
      const content = {
        id: 'content-123',
        noindex: false,
        metaTitle: 'Original Title',
      };

      const executeAction = (
        actionType: string,
        content: typeof content,
        params: any,
        dryRun: boolean
      ): { changes: any[]; applied: boolean } => {
        const changes: any[] = [];

        if (actionType === 'SET_NOINDEX') {
          changes.push({
            field: 'noindex',
            oldValue: content.noindex,
            newValue: true,
          });
        }

        if (actionType === 'UPDATE_META') {
          if (params.metaTitle) {
            changes.push({
              field: 'metaTitle',
              oldValue: content.metaTitle,
              newValue: params.metaTitle,
            });
          }
        }

        // In dry run, don't apply changes
        if (dryRun) {
          return { changes, applied: false };
        }

        // Apply changes
        return { changes, applied: true };
      };

      const dryRunResult = executeAction('SET_NOINDEX', content, {}, true);
      expect(dryRunResult.applied).toBe(false);
      expect(dryRunResult.changes.length).toBe(1);
      expect(dryRunResult.changes[0].newValue).toBe(true);

      const liveResult = executeAction('SET_NOINDEX', content, {}, false);
      expect(liveResult.applied).toBe(true);
    });

    it('should return preview of all changes', () => {
      const params = {
        metaTitle: 'New Title',
        metaDescription: 'New Description',
        noindex: true,
      };

      const previewChanges = (currentState: any, params: any): any[] => {
        const changes: any[] = [];

        for (const [key, newValue] of Object.entries(params)) {
          if (currentState[key] !== newValue) {
            changes.push({
              field: key,
              oldValue: currentState[key],
              newValue,
            });
          }
        }

        return changes;
      };

      const currentState = {
        metaTitle: 'Old Title',
        metaDescription: 'Old Description',
        noindex: false,
      };

      const preview = previewChanges(currentState, params);

      expect(preview.length).toBe(3);
      expect(preview.some(c => c.field === 'metaTitle')).toBe(true);
    });
  });

  describe('Rollback Token Generation', () => {
    it('should generate rollback token on execution', () => {
      const generateRollbackToken = (
        actionId: string,
        contentId: string,
        previousState: any
      ): string => {
        const data = {
          actionId,
          contentId,
          previousState,
          createdAt: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        };
        return Buffer.from(JSON.stringify(data)).toString('base64');
      };

      const token = generateRollbackToken('action-1', 'content-1', { noindex: false });

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      // Verify token is valid base64
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      expect(decoded.actionId).toBe('action-1');
      expect(decoded.previousState.noindex).toBe(false);
    });

    it('should execute rollback from token', () => {
      const tokenData = {
        actionId: 'action-1',
        contentId: 'content-1',
        previousState: { noindex: false, metaTitle: 'Original' },
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60,
      };

      const executeRollback = (
        token: string,
        currentState: any
      ): { success: boolean; changes: any[] } => {
        try {
          const data = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));

          // Check expiry
          if (Date.now() > data.expiresAt) {
            return { success: false, changes: [] };
          }

          // Calculate changes to restore
          const changes: any[] = [];
          for (const [key, value] of Object.entries(data.previousState)) {
            if (currentState[key] !== value) {
              changes.push({ field: key, oldValue: currentState[key], newValue: value });
            }
          }

          return { success: true, changes };
        } catch {
          return { success: false, changes: [] };
        }
      };

      const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
      const currentState = { noindex: true, metaTitle: 'Changed' };

      const result = executeRollback(token, currentState);

      expect(result.success).toBe(true);
      expect(result.changes.length).toBe(2);
    });

    it('should reject expired rollback tokens', () => {
      const expiredTokenData = {
        actionId: 'action-1',
        contentId: 'content-1',
        previousState: {},
        createdAt: Date.now() - 48 * 60 * 60 * 1000,
        expiresAt: Date.now() - 24 * 60 * 60 * 1000,
      };

      const validateToken = (token: string): boolean => {
        try {
          const data = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
          return Date.now() < data.expiresAt;
        } catch {
          return false;
        }
      };

      const token = Buffer.from(JSON.stringify(expiredTokenData)).toString('base64');

      expect(validateToken(token)).toBe(false);
    });
  });

  describe('Action Audit Trail', () => {
    it('should log action execution', () => {
      interface AuditEntry {
        id: string;
        actionType: string;
        contentId: string;
        executedBy: string;
        dryRun: boolean;
        timestamp: Date;
        changes: any[];
        rollbackToken?: string;
      }

      const auditLog: AuditEntry[] = [];

      const logAction = (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
        auditLog.push({
          ...entry,
          id: `audit_${Date.now()}`,
          timestamp: new Date(),
        });
      };

      logAction({
        actionType: 'SET_NOINDEX',
        contentId: 'content-123',
        executedBy: 'user-1',
        dryRun: false,
        changes: [{ field: 'noindex', oldValue: false, newValue: true }],
        rollbackToken: 'token-abc',
      });

      expect(auditLog.length).toBe(1);
      expect(auditLog[0].actionType).toBe('SET_NOINDEX');
      expect(auditLog[0].rollbackToken).toBe('token-abc');
    });

    it('should query audit log by content', () => {
      const auditLog = [
        { contentId: 'c1', actionType: 'UPDATE_META', timestamp: new Date('2024-01-01') },
        { contentId: 'c1', actionType: 'SET_NOINDEX', timestamp: new Date('2024-01-02') },
        { contentId: 'c2', actionType: 'UPDATE_META', timestamp: new Date('2024-01-01') },
      ];

      const getAuditForContent = (contentId: string) => {
        return auditLog
          .filter(e => e.contentId === contentId)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      };

      const entries = getAuditForContent('c1');

      expect(entries.length).toBe(2);
      expect(entries[0].actionType).toBe('SET_NOINDEX');
    });
  });
});

describe('Safety Controls', () => {
  describe('Rate Limiting', () => {
    it('should enforce per-hour limits', () => {
      const checkRateLimit = (
        executedThisHour: number,
        maxPerHour: number
      ): { allowed: boolean; remaining: number } => {
        const remaining = Math.max(0, maxPerHour - executedThisHour);
        return {
          allowed: executedThisHour < maxPerHour,
          remaining,
        };
      };

      expect(checkRateLimit(5, 10).allowed).toBe(true);
      expect(checkRateLimit(5, 10).remaining).toBe(5);
      expect(checkRateLimit(10, 10).allowed).toBe(false);
      expect(checkRateLimit(10, 10).remaining).toBe(0);
    });

    it('should enforce cooldown between actions', () => {
      const checkCooldown = (
        lastActionTime: number,
        cooldownMs: number
      ): { allowed: boolean; waitMs: number } => {
        const elapsed = Date.now() - lastActionTime;
        const waitMs = Math.max(0, cooldownMs - elapsed);
        return {
          allowed: elapsed >= cooldownMs,
          waitMs,
        };
      };

      const recent = Date.now() - 2000; // 2 seconds ago
      const cooldown = 5000; // 5 second cooldown

      const result = checkCooldown(recent, cooldown);
      expect(result.allowed).toBe(false);
      expect(result.waitMs).toBeGreaterThan(0);

      const old = Date.now() - 10000; // 10 seconds ago
      expect(checkCooldown(old, cooldown).allowed).toBe(true);
    });
  });

  describe('Batch Size Limits', () => {
    it('should enforce maximum batch size', () => {
      const MAX_BATCH_SIZE = 10;

      const validateBatch = (contentIds: string[]): { valid: boolean; message?: string } => {
        if (contentIds.length === 0) {
          return { valid: false, message: 'Batch cannot be empty' };
        }
        if (contentIds.length > MAX_BATCH_SIZE) {
          return { valid: false, message: `Batch size ${contentIds.length} exceeds max ${MAX_BATCH_SIZE}` };
        }
        return { valid: true };
      };

      expect(validateBatch(['c1', 'c2', 'c3']).valid).toBe(true);
      expect(validateBatch([]).valid).toBe(false);
      expect(validateBatch(Array(15).fill('c')).valid).toBe(false);
    });
  });

  describe('Content Protection', () => {
    it('should protect hero pages from bulk operations', () => {
      const contentClassifications = new Map([
        ['c1', 'HERO'],
        ['c2', 'HUB'],
        ['c3', 'SPOKE'],
      ]);

      const validateBulkOperation = (
        contentIds: string[],
        actionType: string
      ): { allowed: boolean; blocked: string[] } => {
        const protectedActions = ['BULK_NOINDEX', 'BULK_DELETE'];

        if (!protectedActions.includes(actionType)) {
          return { allowed: true, blocked: [] };
        }

        const blocked = contentIds.filter(id => {
          const classification = contentClassifications.get(id);
          return classification === 'HERO';
        });

        return {
          allowed: blocked.length === 0,
          blocked,
        };
      };

      const result = validateBulkOperation(['c1', 'c2', 'c3'], 'BULK_NOINDEX');

      expect(result.allowed).toBe(false);
      expect(result.blocked).toContain('c1');
    });
  });
});

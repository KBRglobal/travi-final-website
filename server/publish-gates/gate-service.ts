/**
 * Publish Gates - Gate Service
 * Main service for publish gate operations
 */

import { db } from '../db';
import { contents } from '@shared/schema';
import { eq } from 'drizzle-orm';
import {
  PublishGateConfig,
  GateEvaluationContext,
  GateEvaluationResult,
  GateOverrideRequest,
  GateOverrideRecord,
  DEFAULT_GATE_CONFIG,
} from './types';
import { rulesRegistry } from './rules';
import { evaluatePublishGates } from './evaluator';

// In-memory override storage (use DB in production)
const overrides: Map<string, GateOverrideRecord> = new Map();
const auditLog: Array<{
  timestamp: Date;
  action: string;
  contentId: string;
  userId: string;
  details: Record<string, unknown>;
}> = [];

const MAX_AUDIT_LOG_SIZE = 10000;

function isEnabled(): boolean {
  return process.env.ENABLE_PUBLISH_GATES === 'true';
}

function getConfig(): PublishGateConfig {
  return {
    ...DEFAULT_GATE_CONFIG,
    enabled: isEnabled(),
    strictMode: process.env.PUBLISH_GATES_STRICT === 'true',
  };
}

function addAuditEntry(
  action: string,
  contentId: string,
  userId: string,
  details: Record<string, unknown> = {}
): void {
  if (auditLog.length >= MAX_AUDIT_LOG_SIZE) {
    auditLog.splice(0, 1000); // Remove oldest 1000 entries
  }

  auditLog.push({
    timestamp: new Date(),
    action,
    contentId,
    userId,
    details,
  });
}

export const gateService = {
  /**
   * Check if gates are enabled
   */
  isEnabled,

  /**
   * Get current configuration
   */
  getConfig,

  /**
   * Evaluate publish gates for content
   */
  async evaluate(context: GateEvaluationContext): Promise<GateEvaluationResult> {
    if (!isEnabled()) {
      return {
        passed: true,
        contentId: context.contentId,
        evaluatedAt: new Date(),
        totalRules: 0,
        passedRules: 0,
        failedRules: 0,
        results: [],
        blockedBy: [],
        canOverride: true,
      };
    }

    // Check for existing override
    const override = this.getOverride(context.contentId);
    if (override && (!override.expiresAt || override.expiresAt > new Date())) {
      addAuditEntry('evaluate_with_override', context.contentId, context.userId, {
        overrideId: override.id,
      });

      return {
        passed: true,
        contentId: context.contentId,
        evaluatedAt: new Date(),
        totalRules: 0,
        passedRules: 0,
        failedRules: 0,
        results: [],
        blockedBy: [],
        canOverride: true,
      };
    }

    const result = await evaluatePublishGates(context);

    addAuditEntry('evaluate', context.contentId, context.userId, {
      passed: result.passed,
      passedRules: result.passedRules,
      failedRules: result.failedRules,
      blockedBy: result.blockedBy,
    });

    return result;
  },

  /**
   * Attempt to publish content (with gate evaluation)
   */
  async attemptPublish(
    contentId: string,
    userId: string,
    userRole: string
  ): Promise<{ success: boolean; result: GateEvaluationResult; error?: string }> {
    if (!isEnabled()) {
      return {
        success: true,
        result: {
          passed: true,
          contentId,
          evaluatedAt: new Date(),
          totalRules: 0,
          passedRules: 0,
          failedRules: 0,
          results: [],
          blockedBy: [],
          canOverride: true,
        },
      };
    }

    // Fetch content type
    const [content] = await db
      .select({ type: contents.type })
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);

    if (!content) {
      return {
        success: false,
        result: {
          passed: false,
          contentId,
          evaluatedAt: new Date(),
          totalRules: 0,
          passedRules: 0,
          failedRules: 0,
          results: [],
          blockedBy: ['content_not_found'],
          canOverride: false,
        },
        error: 'Content not found',
      };
    }

    const context: GateEvaluationContext = {
      contentId,
      contentType: content.type,
      userId,
      userRole,
    };

    const result = await this.evaluate(context);

    if (!result.passed) {
      addAuditEntry('publish_blocked', contentId, userId, {
        blockedBy: result.blockedBy,
        failedRules: result.failedRules,
      });

      return {
        success: false,
        result,
        error: `Publishing blocked by: ${result.blockedBy.join(', ')}`,
      };
    }

    addAuditEntry('publish_allowed', contentId, userId, {
      passedRules: result.passedRules,
    });

    return { success: true, result };
  },

  /**
   * Create override for content
   */
  async createOverride(request: GateOverrideRequest): Promise<GateOverrideRecord> {
    const record: GateOverrideRecord = {
      id: `override-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      contentId: request.contentId,
      userId: request.userId,
      reason: request.reason,
      overriddenRules: [],
      approvedBy: request.approvedBy || null,
      createdAt: new Date(),
      expiresAt: request.expiresAt || null,
    };

    overrides.set(request.contentId, record);

    addAuditEntry('override_created', request.contentId, request.userId, {
      overrideId: record.id,
      reason: request.reason,
      approvedBy: request.approvedBy,
      expiresAt: request.expiresAt?.toISOString(),
    });

    return record;
  },

  /**
   * Get override for content
   */
  getOverride(contentId: string): GateOverrideRecord | null {
    return overrides.get(contentId) || null;
  },

  /**
   * Revoke override
   */
  revokeOverride(contentId: string, userId: string): boolean {
    const existing = overrides.get(contentId);
    if (!existing) return false;

    overrides.delete(contentId);

    addAuditEntry('override_revoked', contentId, userId, {
      overrideId: existing.id,
    });

    return true;
  },

  /**
   * Get all active overrides
   */
  getActiveOverrides(): GateOverrideRecord[] {
    const now = new Date();
    return Array.from(overrides.values()).filter(
      o => !o.expiresAt || o.expiresAt > now
    );
  },

  /**
   * Get audit log entries
   */
  getAuditLog(
    filters: { contentId?: string; userId?: string; action?: string; limit?: number } = {}
  ): typeof auditLog {
    let entries = [...auditLog];

    if (filters.contentId) {
      entries = entries.filter(e => e.contentId === filters.contentId);
    }
    if (filters.userId) {
      entries = entries.filter(e => e.userId === filters.userId);
    }
    if (filters.action) {
      entries = entries.filter(e => e.action === filters.action);
    }

    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters.limit) {
      entries = entries.slice(0, filters.limit);
    }

    return entries;
  },

  /**
   * Get gate statistics
   */
  getStats(): {
    enabled: boolean;
    totalRules: number;
    enabledRules: number;
    activeOverrides: number;
    recentBlocks: number;
    recentPasses: number;
  } {
    const allRules = rulesRegistry.getAllRules();
    const enabledRules = rulesRegistry.getEnabledRules();
    const activeOverrides = this.getActiveOverrides();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = auditLog.filter(e => e.timestamp > oneDayAgo);
    const recentBlocks = recentLogs.filter(e => e.action === 'publish_blocked').length;
    const recentPasses = recentLogs.filter(e => e.action === 'publish_allowed').length;

    return {
      enabled: isEnabled(),
      totalRules: allRules.length,
      enabledRules: enabledRules.length,
      activeOverrides: activeOverrides.length,
      recentBlocks,
      recentPasses,
    };
  },

  /**
   * Get rules
   */
  getRules() {
    return rulesRegistry.getAllRules();
  },

  /**
   * Update rule
   */
  updateRule(ruleId: string, updates: { enabled?: boolean; threshold?: number }) {
    if (updates.enabled !== undefined) {
      if (updates.enabled) {
        rulesRegistry.enableRule(ruleId);
      } else {
        rulesRegistry.disableRule(ruleId);
      }
    }
    if (updates.threshold !== undefined) {
      rulesRegistry.setRuleThreshold(ruleId, updates.threshold);
    }
    return rulesRegistry.getRule(ruleId);
  },
};

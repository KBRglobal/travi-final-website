/**
 * Enterprise Policy Compliance Engine - Violation Management
 *
 * Tracks and manages compliance violations.
 * READ-ONLY enforcement — flags violations only.
 */

import { log } from '../lib/logger';
import type { Violation, ComplianceResult, PolicyCategory, SeverityLevel } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[Violations] ${msg}`, data),
};

// Bounded storage
const MAX_VIOLATIONS = 1000;

/**
 * Generate unique violation ID
 */
function generateViolationId(): string {
  return `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface ViolationQuery {
  status?: Violation['status'] | Violation['status'][];
  severity?: SeverityLevel | SeverityLevel[];
  category?: PolicyCategory | PolicyCategory[];
  policyId?: string;
  entityId?: string;
  since?: Date;
  limit?: number;
}

class ViolationRepository {
  private violations: Map<string, Violation> = new Map();
  private enabled = false;

  constructor() {
    this.enabled = process.env.ENABLE_COMPLIANCE_ENGINE === 'true';
    if (this.enabled) {
      logger.info('Violation Repository initialized');
    }
  }

  /**
   * Record a violation from a compliance result
   */
  recordFromResult(result: ComplianceResult): Violation | null {
    if (result.status === 'compliant') {
      return null; // Not a violation
    }

    // Check if already recorded
    const existing = this.findByPolicyAndEntity(result.policyId, result.entityId);
    if (existing && existing.status === 'open') {
      return existing; // Already tracked
    }

    const violation: Violation = {
      id: generateViolationId(),
      policyId: result.policyId,
      policyName: result.policyName,
      category: result.category,
      status: 'open',
      severity: result.severity,
      entityId: result.entityId,
      entityType: result.entityType,
      scope: result.scope,
      message: result.message,
      details: result.details || '',
      actualValue: result.actualValue,
      expectedValue: result.expectedValue,
      detectedAt: new Date(),
      readinessImpact: result.severity === 'critical' || result.severity === 'high',
      governorBlocking: result.severity === 'critical',
    };

    this.violations.set(violation.id, violation);
    this.enforceLimit();

    logger.info('Violation recorded', {
      id: violation.id,
      policyId: violation.policyId,
      severity: violation.severity,
    });

    return violation;
  }

  /**
   * Find violation by policy and entity
   */
  private findByPolicyAndEntity(
    policyId: string,
    entityId?: string
  ): Violation | undefined {
    return Array.from(this.violations.values()).find(
      v => v.policyId === policyId &&
           v.entityId === entityId &&
           v.status !== 'resolved'
    );
  }

  /**
   * Get a violation by ID
   */
  get(id: string): Violation | undefined {
    return this.violations.get(id);
  }

  /**
   * Acknowledge a violation
   */
  acknowledge(id: string): boolean {
    const violation = this.violations.get(id);
    if (!violation || violation.status !== 'open') {
      return false;
    }

    violation.status = 'acknowledged';
    violation.acknowledgedAt = new Date();
    return true;
  }

  /**
   * Resolve a violation
   */
  resolve(id: string): boolean {
    const violation = this.violations.get(id);
    if (!violation || violation.status === 'resolved') {
      return false;
    }

    violation.status = 'resolved';
    violation.resolvedAt = new Date();
    return true;
  }

  /**
   * Waive a violation
   */
  waive(id: string, waivedBy: string, reason: string): boolean {
    const violation = this.violations.get(id);
    if (!violation) {
      return false;
    }

    violation.status = 'waived';
    violation.waivedAt = new Date();
    violation.waivedBy = waivedBy;
    violation.waiverReason = reason;
    return true;
  }

  /**
   * Query violations
   */
  query(query: ViolationQuery = {}): Violation[] {
    let results = Array.from(this.violations.values());

    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      results = results.filter(v => statuses.includes(v.status));
    }

    if (query.severity) {
      const severities = Array.isArray(query.severity) ? query.severity : [query.severity];
      results = results.filter(v => severities.includes(v.severity));
    }

    if (query.category) {
      const categories = Array.isArray(query.category) ? query.category : [query.category];
      results = results.filter(v => categories.includes(v.category));
    }

    if (query.policyId) {
      results = results.filter(v => v.policyId === query.policyId);
    }

    if (query.entityId) {
      results = results.filter(v => v.entityId === query.entityId);
    }

    if (query.since) {
      results = results.filter(v => v.detectedAt >= query.since!);
    }

    // Sort by detection date descending
    results.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get open violations
   */
  getOpen(): Violation[] {
    return this.query({ status: 'open' });
  }

  /**
   * Get critical violations
   */
  getCritical(): Violation[] {
    return this.query({ status: 'open', severity: 'critical' });
  }

  /**
   * Get violations that block governor
   */
  getGovernorBlocking(): Violation[] {
    return Array.from(this.violations.values()).filter(
      v => v.governorBlocking && v.status === 'open'
    );
  }

  /**
   * Get stats
   */
  getStats() {
    const all = Array.from(this.violations.values());

    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const v of all) {
      byStatus[v.status] = (byStatus[v.status] || 0) + 1;
      bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
      byCategory[v.category] = (byCategory[v.category] || 0) + 1;
    }

    return {
      total: all.length,
      open: byStatus['open'] || 0,
      acknowledged: byStatus['acknowledged'] || 0,
      resolved: byStatus['resolved'] || 0,
      waived: byStatus['waived'] || 0,
      bySeverity,
      byCategory,
    };
  }

  /**
   * Count violations
   */
  count(): number {
    return this.violations.size;
  }

  /**
   * Enforce storage limit
   */
  private enforceLimit(): void {
    if (this.violations.size > MAX_VIOLATIONS) {
      // Remove oldest resolved violations first
      const resolved = Array.from(this.violations.entries())
        .filter(([_, v]) => v.status === 'resolved')
        .sort((a, b) => a[1].resolvedAt!.getTime() - b[1].resolvedAt!.getTime());

      for (const [id] of resolved.slice(0, MAX_VIOLATIONS / 4)) {
        this.violations.delete(id);
      }
    }
  }

  /**
   * Clear all violations
   */
  clear(): void {
    this.violations.clear();
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton
let instance: ViolationRepository | null = null;

export function getViolationRepository(): ViolationRepository {
  if (!instance) {
    instance = new ViolationRepository();
  }
  return instance;
}

export function resetViolationRepository(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}

export { ViolationRepository };

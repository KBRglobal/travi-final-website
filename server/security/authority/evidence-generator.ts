/**
 * Evidence Generator - Compliance Bundle Creator
 *
 * Automatically collects and organizes:
 * - Data Decisions taken
 * - SEO blocks
 * - Autopilot state changes
 * - Overrides
 *
 * Outputs:
 * - SOC2 bundle
 * - GDPR bundle
 * - Executive PDF summary
 *
 * Feature flag: ENABLE_SECURITY_AUTHORITY
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SecurityEvidence,
  EvidenceType,
  ComplianceBundle,
  ComplianceSummary,
  ComplianceFinding,
  GateDecision,
  ActorIdentity,
  GatedAction,
  ResourceType,
} from './types';
import { SecurityGate } from './security-gate';
import { OverrideRegistry } from './override-registry';
import { SecurityModeManager } from './security-modes';
import { SecuritySeverity } from '../audit-logger';

// ============================================================================
// EVIDENCE STORAGE
// ============================================================================

// In-memory evidence store (would be DB in production)
const MAX_EVIDENCE = 10000;
const evidenceStore: SecurityEvidence[] = [];

// Compliance findings cache
const findingsCache = new Map<string, ComplianceFinding[]>();

// ============================================================================
// EVIDENCE GENERATOR
// ============================================================================

export const EvidenceGenerator = {
  /**
   * Record a security evidence item
   */
  async recordEvidence(params: {
    type: EvidenceType;
    source: string;
    actor: ActorIdentity;
    action: GatedAction;
    resource: ResourceType;
    decision: GateDecision;
    relatedOverride?: string;
    metadata?: Record<string, unknown>;
  }): Promise<SecurityEvidence> {
    const evidence: SecurityEvidence = {
      id: uuidv4(),
      type: params.type,
      source: params.source,
      timestamp: new Date(),
      actor: params.actor,
      action: params.action,
      resource: params.resource,
      decision: params.decision,
      relatedOverride: params.relatedOverride,
      metadata: params.metadata || {},
    };

    // Enforce storage bounds
    if (evidenceStore.length >= MAX_EVIDENCE) {
      evidenceStore.shift();
    }

    evidenceStore.push(evidence);

    return evidence;
  },

  /**
   * Get evidence by ID
   */
  getEvidence(id: string): SecurityEvidence | undefined {
    return evidenceStore.find(e => e.id === id);
  },

  /**
   * Query evidence
   */
  queryEvidence(filters: {
    type?: EvidenceType;
    startDate?: Date;
    endDate?: Date;
    actor?: string;
    action?: GatedAction;
    resource?: ResourceType;
    limit?: number;
  }): SecurityEvidence[] {
    let results = [...evidenceStore];

    if (filters.type) {
      results = results.filter(e => e.type === filters.type);
    }

    if (filters.startDate) {
      results = results.filter(e => e.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      results = results.filter(e => e.timestamp <= filters.endDate!);
    }

    if (filters.actor) {
      results = results.filter(e => e.actor.userId === filters.actor);
    }

    if (filters.action) {
      results = results.filter(e => e.action === filters.action);
    }

    if (filters.resource) {
      results = results.filter(e => e.resource === filters.resource);
    }

    if (filters.limit) {
      results = results.slice(-filters.limit);
    }

    return results;
  },

  /**
   * Generate SOC2 compliance bundle
   */
  async generateSOC2Bundle(periodStart: Date, periodEnd: Date): Promise<ComplianceBundle> {
    const evidence = this.queryEvidence({ startDate: periodStart, endDate: periodEnd });

    const summary = this.generateSummary(evidence, 'SOC2');

    // SOC2-specific findings
    const soc2Findings = this.generateSOC2Findings(evidence);
    summary.findings = [...summary.findings, ...soc2Findings];

    return {
      bundleId: uuidv4(),
      framework: 'SOC2',
      generatedAt: new Date(),
      periodStart,
      periodEnd,
      evidence,
      summary,
      exportFormat: 'json',
    };
  },

  /**
   * Generate GDPR compliance bundle
   */
  async generateGDPRBundle(periodStart: Date, periodEnd: Date): Promise<ComplianceBundle> {
    const evidence = this.queryEvidence({ startDate: periodStart, endDate: periodEnd });

    const summary = this.generateSummary(evidence, 'GDPR');

    // GDPR-specific findings
    const gdprFindings = this.generateGDPRFindings(evidence);
    summary.findings = [...summary.findings, ...gdprFindings];

    return {
      bundleId: uuidv4(),
      framework: 'GDPR',
      generatedAt: new Date(),
      periodStart,
      periodEnd,
      evidence,
      summary,
      exportFormat: 'json',
    };
  },

  /**
   * Generate Executive Summary (for PDF export)
   */
  async generateExecutiveSummary(periodStart: Date, periodEnd: Date): Promise<{
    title: string;
    period: { start: Date; end: Date };
    metrics: {
      totalSecurityDecisions: number;
      deniedActions: number;
      overridesUsed: number;
      threatEvents: number;
      modeChanges: number;
      complianceScore: number;
    };
    highlights: string[];
    concerns: string[];
    recommendations: string[];
    modeHistory: Array<{ mode: string; duration: number; percentage: number }>;
    topDeniedActions: Array<{ action: string; count: number }>;
  }> {
    const evidence = this.queryEvidence({ startDate: periodStart, endDate: periodEnd });

    // Calculate metrics
    const deniedActions = evidence.filter(e => !e.decision.allowed).length;
    const overridesUsed = evidence.filter(e => e.type === 'override_used').length;
    const threatEvents = evidence.filter(e => e.type === 'threat_detected').length;
    const modeChanges = evidence.filter(e => e.type === 'mode_changed').length;

    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(evidence);

    // Get mode history
    const modeStats = SecurityModeManager.getModeStats();
    const totalTime = modeStats.timeInEachMode.lockdown + modeStats.timeInEachMode.enforce + modeStats.timeInEachMode.monitor;

    const modeHistory = [
      {
        mode: 'lockdown',
        duration: modeStats.timeInEachMode.lockdown,
        percentage: totalTime > 0 ? (modeStats.timeInEachMode.lockdown / totalTime) * 100 : 0,
      },
      {
        mode: 'enforce',
        duration: modeStats.timeInEachMode.enforce,
        percentage: totalTime > 0 ? (modeStats.timeInEachMode.enforce / totalTime) * 100 : 0,
      },
      {
        mode: 'monitor',
        duration: modeStats.timeInEachMode.monitor,
        percentage: totalTime > 0 ? (modeStats.timeInEachMode.monitor / totalTime) * 100 : 0,
      },
    ];

    // Get top denied actions
    const deniedByAction = new Map<string, number>();
    evidence
      .filter(e => !e.decision.allowed)
      .forEach(e => {
        deniedByAction.set(e.action, (deniedByAction.get(e.action) || 0) + 1);
      });

    const topDeniedActions = Array.from(deniedByAction.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));

    // Generate highlights, concerns, and recommendations
    const { highlights, concerns, recommendations } = this.generateInsights(evidence, complianceScore);

    return {
      title: 'Security Authority Executive Summary',
      period: { start: periodStart, end: periodEnd },
      metrics: {
        totalSecurityDecisions: evidence.length,
        deniedActions,
        overridesUsed,
        threatEvents,
        modeChanges,
        complianceScore,
      },
      highlights,
      concerns,
      recommendations,
      modeHistory,
      topDeniedActions,
    };
  },

  /**
   * Export bundle as JSON
   */
  exportAsJSON(bundle: ComplianceBundle): string {
    return JSON.stringify(bundle, null, 2);
  },

  /**
   * Export bundle as CSV
   */
  exportAsCSV(bundle: ComplianceBundle): string {
    const headers = [
      'ID',
      'Type',
      'Timestamp',
      'Actor',
      'Action',
      'Resource',
      'Decision',
      'Reasons',
    ].join(',');

    const rows = bundle.evidence.map(e => [
      e.id,
      e.type,
      e.timestamp.toISOString(),
      e.actor.userId || e.actor.ipAddress || 'system',
      e.action,
      e.resource,
      e.decision.decision,
      e.decision.reasons.map(r => r.message).join('; '),
    ].join(','));

    return [headers, ...rows].join('\n');
  },

  /**
   * Generate summary from evidence
   */
  generateSummary(evidence: SecurityEvidence[], framework: string): ComplianceSummary {
    const allowedCount = evidence.filter(e => e.decision.allowed).length;
    const deniedCount = evidence.filter(e => !e.decision.allowed).length;
    const overrideCount = evidence.filter(e => e.type === 'override_used').length;
    const threatCount = evidence.filter(e => e.type === 'threat_detected').length;

    const highRiskActions = evidence.filter(e =>
      e.decision.reasons.some(r =>
        r.severity === SecuritySeverity.HIGH || r.severity === SecuritySeverity.CRITICAL
      )
    ).length;

    const complianceScore = this.calculateComplianceScore(evidence);

    return {
      totalDecisions: evidence.length,
      allowedCount,
      deniedCount,
      overrideCount,
      threatCount,
      highRiskActions,
      complianceScore,
      findings: [],
    };
  },

  /**
   * Calculate compliance score
   */
  calculateComplianceScore(evidence: SecurityEvidence[]): number {
    if (evidence.length === 0) return 100;

    let score = 100;

    // Deduct for threats
    const threats = evidence.filter(e => e.type === 'threat_detected').length;
    score -= threats * 2;

    // Deduct for overrides
    const overrides = evidence.filter(e => e.type === 'override_used').length;
    score -= overrides * 1;

    // Deduct for policy violations
    const violations = evidence.filter(e => e.type === 'policy_violated').length;
    score -= violations * 3;

    // Deduct for high-severity denials
    const highSeverity = evidence.filter(e =>
      e.decision.reasons.some(r => r.severity === SecuritySeverity.CRITICAL)
    ).length;
    score -= highSeverity * 5;

    return Math.max(0, Math.min(100, score));
  },

  /**
   * Generate SOC2-specific findings
   */
  generateSOC2Findings(evidence: SecurityEvidence[]): ComplianceFinding[] {
    const findings: ComplianceFinding[] = [];

    // Check for access control issues
    const unauthorizedAccess = evidence.filter(e =>
      e.decision.reasons.some(r => r.code === 'DENIED' && r.source === 'policy')
    );
    if (unauthorizedAccess.length > 10) {
      findings.push({
        severity: SecuritySeverity.MEDIUM,
        category: 'Access Control',
        description: `${unauthorizedAccess.length} unauthorized access attempts detected`,
        recommendation: 'Review user permissions and access policies',
        occurrences: unauthorizedAccess.length,
      });
    }

    // Check for override usage
    const overrides = evidence.filter(e => e.type === 'override_used');
    if (overrides.length > 5) {
      findings.push({
        severity: SecuritySeverity.LOW,
        category: 'Override Usage',
        description: `${overrides.length} security overrides were used`,
        recommendation: 'Review override justifications and reduce reliance on overrides',
        occurrences: overrides.length,
      });
    }

    // Check for threat detections
    const threats = evidence.filter(e => e.type === 'threat_detected');
    if (threats.length > 0) {
      findings.push({
        severity: SecuritySeverity.HIGH,
        category: 'Security Threats',
        description: `${threats.length} security threats were detected`,
        recommendation: 'Investigate threat sources and strengthen security controls',
        occurrences: threats.length,
      });
    }

    return findings;
  },

  /**
   * Generate GDPR-specific findings
   */
  generateGDPRFindings(evidence: SecurityEvidence[]): ComplianceFinding[] {
    const findings: ComplianceFinding[] = [];

    // Check for data access patterns
    const dataReads = evidence.filter(e => e.action === 'data_read').length;
    const dataWrites = evidence.filter(e => e.action === 'data_write').length;
    const dataDeletes = evidence.filter(e => e.action === 'data_delete').length;
    const dataExports = evidence.filter(e => e.action === 'data_export').length;

    if (dataExports > 10) {
      findings.push({
        severity: SecuritySeverity.MEDIUM,
        category: 'Data Export',
        description: `${dataExports} data export operations performed`,
        recommendation: 'Verify all data exports comply with GDPR data transfer requirements',
        occurrences: dataExports,
      });
    }

    if (dataDeletes > 0) {
      findings.push({
        severity: SecuritySeverity.LOW,
        category: 'Data Deletion',
        description: `${dataDeletes} data deletion operations performed`,
        recommendation: 'Ensure deletion requests are properly documented for compliance',
        occurrences: dataDeletes,
      });
    }

    // Check for unauthorized data access
    const deniedDataAccess = evidence.filter(e =>
      (e.action === 'data_read' || e.action === 'data_write') && !e.decision.allowed
    );
    if (deniedDataAccess.length > 5) {
      findings.push({
        severity: SecuritySeverity.MEDIUM,
        category: 'Unauthorized Data Access',
        description: `${deniedDataAccess.length} unauthorized data access attempts`,
        recommendation: 'Investigate access patterns and review data protection policies',
        occurrences: deniedDataAccess.length,
      });
    }

    return findings;
  },

  /**
   * Generate insights from evidence
   */
  generateInsights(evidence: SecurityEvidence[], complianceScore: number): {
    highlights: string[];
    concerns: string[];
    recommendations: string[];
  } {
    const highlights: string[] = [];
    const concerns: string[] = [];
    const recommendations: string[] = [];

    // Compliance score insights
    if (complianceScore >= 90) {
      highlights.push('Excellent compliance score maintained');
    } else if (complianceScore >= 70) {
      highlights.push('Good compliance posture with minor areas for improvement');
    } else {
      concerns.push(`Low compliance score (${complianceScore}%) requires attention`);
      recommendations.push('Conduct security review and address identified issues');
    }

    // Override insights
    const overrideCount = evidence.filter(e => e.type === 'override_used').length;
    if (overrideCount === 0) {
      highlights.push('No security overrides were used');
    } else if (overrideCount > 10) {
      concerns.push(`High number of overrides used (${overrideCount})`);
      recommendations.push('Review override policies and reduce bypass usage');
    }

    // Threat insights
    const threatCount = evidence.filter(e => e.type === 'threat_detected').length;
    if (threatCount === 0) {
      highlights.push('No security threats detected');
    } else {
      concerns.push(`${threatCount} security threats were detected`);
      recommendations.push('Investigate threat sources and enhance detection capabilities');
    }

    // Mode insights
    const modeChanges = evidence.filter(e => e.type === 'mode_changed').length;
    if (modeChanges > 10) {
      concerns.push(`Frequent security mode changes (${modeChanges})`);
      recommendations.push('Stabilize security posture and reduce reactive mode changes');
    }

    return { highlights, concerns, recommendations };
  },

  /**
   * Get evidence statistics
   */
  getStats(): {
    totalEvidence: number;
    byType: Record<EvidenceType, number>;
    recentCount: number;
    oldestTimestamp?: Date;
    newestTimestamp?: Date;
  } {
    const byType = {} as Record<EvidenceType, number>;

    evidenceStore.forEach(e => {
      byType[e.type] = (byType[e.type] || 0) + 1;
    });

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentCount = evidenceStore.filter(e => e.timestamp >= oneDayAgo).length;

    return {
      totalEvidence: evidenceStore.length,
      byType,
      recentCount,
      oldestTimestamp: evidenceStore.length > 0 ? evidenceStore[0].timestamp : undefined,
      newestTimestamp: evidenceStore.length > 0 ? evidenceStore[evidenceStore.length - 1].timestamp : undefined,
    };
  },

  /**
   * Clear old evidence (for maintenance)
   */
  clearOldEvidence(olderThan: Date): number {
    const initialLength = evidenceStore.length;
    const filtered = evidenceStore.filter(e => e.timestamp >= olderThan);
    evidenceStore.length = 0;
    evidenceStore.push(...filtered);
    return initialLength - evidenceStore.length;
  },
};

// ============================================================================
// AUTO-RECORD FROM SECURITY GATE
// ============================================================================

// Hook into SecurityGate to auto-record decisions
const originalGetAuditBuffer = SecurityGate.getAuditBuffer.bind(SecurityGate);

// Periodically sync audit buffer to evidence - only when not in publishing mode
if (process.env.DISABLE_BACKGROUND_SERVICES !== 'true' && process.env.REPLIT_DEPLOYMENT !== '1') {
  setInterval(() => {
    const buffer = originalGetAuditBuffer();
    if (buffer.length > 0) {
      buffer.forEach(entry => {
        EvidenceGenerator.recordEvidence({
          type: 'gate_decision',
          source: 'security-gate',
          actor: entry.request.actor,
          action: entry.request.action,
          resource: entry.request.resource,
          decision: entry.decision,
          metadata: {
            context: entry.request.context,
            auditId: entry.auditId,
          },
        });
      });
      SecurityGate.clearAuditBuffer();
    }
  }, 30 * 1000); // Every 30 seconds
}

console.log('[EvidenceGenerator] Compliance bundle creator loaded');

/**
 * Approval Safety Rules - Prevent Approval Loop Abuse
 *
 * Guards against:
 * - Self-approval attacks
 * - Circular approval chains
 * - Approval flooding (overwhelming approvers)
 * - Rubber-stamping detection
 * - Collusion patterns
 * - Approval timeout exploitation
 */

import { ROLE_HIERARCHY } from "../../governance/types";
import { logAdminEvent } from "../../governance/security-logger";

// ============================================================================
// TYPES
// ============================================================================

export interface ApprovalRequest {
  id: string;
  requesterId: string;
  requesterRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  approvers: string[];
  status: "pending" | "approved" | "rejected" | "escalated" | "expired";
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalSafetyResult {
  allowed: boolean;
  violations: ApprovalViolation[];
  riskScore: number; // 0-100
  recommendations: string[];
}

export interface ApprovalViolation {
  type: ApprovalViolationType;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  evidence?: Record<string, unknown>;
}

export type ApprovalViolationType =
  | "self_approval"
  | "circular_chain"
  | "rubber_stamping"
  | "approval_flooding"
  | "collusion_suspected"
  | "timeout_exploitation"
  | "privilege_escalation"
  | "approver_shopping"
  | "insufficient_separation"
  | "role_mismatch";

// ============================================================================
// CONFIGURATION
// ============================================================================

const APPROVAL_SAFETY_CONFIG = {
  // Minimum time before approval (seconds) - prevent rubber stamping
  minApprovalDelay: 30,

  // Maximum approvals per approver per hour
  maxApprovalsPerHour: 20,

  // Maximum pending requests per requester
  maxPendingPerRequester: 10,

  // Minimum number of different approvers required over time
  minApproverDiversity: 3,

  // Time window for diversity calculation (hours)
  diversityWindowHours: 24,

  // Maximum approval rate threshold (approvals per minute)
  suspiciousApprovalRate: 5,

  // Required role separation levels
  minRoleSeparation: 1, // At least 1 hierarchy level between requester and approver

  // Sensitive operations requiring extra scrutiny
  sensitiveOperations: [
    "delete_users",
    "manage_roles",
    "manage_policies",
    "system_configure",
    "export_data",
  ],
};

// ============================================================================
// APPROVAL HISTORY TRACKING
// ============================================================================

interface ApprovalHistoryEntry {
  requestId: string;
  requesterId: string;
  approverId: string;
  action: string;
  timestamp: Date;
  approvalTimeMs: number; // Time from request to approval
}

class ApprovalHistoryTracker {
  private history: ApprovalHistoryEntry[] = [];
  private readonly maxHistorySize = 10000;

  record(entry: ApprovalHistoryEntry): void {
    this.history.push(entry);

    // Trim old entries
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize / 2);
    }
  }

  getRecentApprovals(approverId: string, hours: number): ApprovalHistoryEntry[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.history.filter(e => e.approverId === approverId && e.timestamp > cutoff);
  }

  getApproverPairs(hours: number): Map<string, Map<string, number>> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const pairs = new Map<string, Map<string, number>>();

    for (const entry of this.history) {
      if (entry.timestamp < cutoff) continue;

      if (!pairs.has(entry.requesterId)) {
        pairs.set(entry.requesterId, new Map());
      }
      const approverMap = pairs.get(entry.requesterId)!;
      approverMap.set(entry.approverId, (approverMap.get(entry.approverId) || 0) + 1);
    }

    return pairs;
  }

  getAverageApprovalTime(approverId: string): number {
    const approverHistory = this.history.filter(e => e.approverId === approverId);
    if (approverHistory.length === 0) return 0;

    const totalTime = approverHistory.reduce((sum, e) => sum + e.approvalTimeMs, 0);
    return totalTime / approverHistory.length;
  }

  getUniqueApprovers(requesterId: string, hours: number): string[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const approvers = new Set<string>();

    for (const entry of this.history) {
      if (entry.requesterId === requesterId && entry.timestamp > cutoff) {
        approvers.add(entry.approverId);
      }
    }

    return Array.from(approvers);
  }
}

const approvalHistory = new ApprovalHistoryTracker();

// ============================================================================
// SAFETY CHECKS
// ============================================================================

/**
 * Check for self-approval attempt
 */
function checkSelfApproval(requesterId: string, approverId: string): ApprovalViolation | null {
  if (requesterId === approverId) {
    return {
      type: "self_approval",
      severity: "critical",
      message: "Self-approval is strictly prohibited",
      evidence: { requesterId, approverId },
    };
  }
  return null;
}

/**
 * Check for circular approval chains
 */
function checkCircularChain(
  requesterId: string,
  approverId: string,
  recentApprovals: ApprovalHistoryEntry[]
): ApprovalViolation | null {
  // Look for A approves B, B approves A pattern
  const reverseApprovals = recentApprovals.filter(
    e => e.requesterId === approverId && e.approverId === requesterId
  );

  if (reverseApprovals.length > 0) {
    return {
      type: "circular_chain",
      severity: "high",
      message: "Circular approval pattern detected - users approving each other",
      evidence: {
        requesterId,
        approverId,
        reverseApprovalCount: reverseApprovals.length,
      },
    };
  }
  return null;
}

/**
 * Check for rubber-stamping (too fast approvals)
 */
function checkRubberStamping(approverId: string, approvalTimeMs: number): ApprovalViolation | null {
  const minDelayMs = APPROVAL_SAFETY_CONFIG.minApprovalDelay * 1000;

  if (approvalTimeMs < minDelayMs) {
    return {
      type: "rubber_stamping",
      severity: "medium",
      message: `Approval too fast (${Math.round(approvalTimeMs / 1000)}s) - minimum ${APPROVAL_SAFETY_CONFIG.minApprovalDelay}s required`,
      evidence: {
        approverId,
        approvalTimeMs,
        minRequired: minDelayMs,
      },
    };
  }

  // Also check average approval time
  const avgTime = approvalHistory.getAverageApprovalTime(approverId);
  if (avgTime > 0 && approvalTimeMs < avgTime * 0.1) {
    return {
      type: "rubber_stamping",
      severity: "medium",
      message: "Approval significantly faster than approver's average",
      evidence: {
        approverId,
        approvalTimeMs,
        averageTimeMs: avgTime,
      },
    };
  }

  return null;
}

/**
 * Check for approval flooding
 */
function checkApprovalFlooding(approverId: string): ApprovalViolation | null {
  const recentApprovals = approvalHistory.getRecentApprovals(approverId, 1);

  if (recentApprovals.length >= APPROVAL_SAFETY_CONFIG.maxApprovalsPerHour) {
    return {
      type: "approval_flooding",
      severity: "high",
      message: `Approver has exceeded hourly limit (${recentApprovals.length}/${APPROVAL_SAFETY_CONFIG.maxApprovalsPerHour})`,
      evidence: {
        approverId,
        approvalsThisHour: recentApprovals.length,
        limit: APPROVAL_SAFETY_CONFIG.maxApprovalsPerHour,
      },
    };
  }

  // Check approval rate (per minute)
  const recentMinute = recentApprovals.filter(e => e.timestamp > new Date(Date.now() - 60 * 1000));

  if (recentMinute.length >= APPROVAL_SAFETY_CONFIG.suspiciousApprovalRate) {
    return {
      type: "approval_flooding",
      severity: "high",
      message: "Suspicious approval rate detected",
      evidence: {
        approverId,
        approvalsPerMinute: recentMinute.length,
        threshold: APPROVAL_SAFETY_CONFIG.suspiciousApprovalRate,
      },
    };
  }

  return null;
}

/**
 * Check for collusion patterns
 */
function checkCollusion(requesterId: string, approverId: string): ApprovalViolation | null {
  const pairs = approvalHistory.getApproverPairs(APPROVAL_SAFETY_CONFIG.diversityWindowHours);

  const requesterPairs = pairs.get(requesterId);
  if (!requesterPairs) return null;

  const approvalCount = requesterPairs.get(approverId) || 0;
  const totalApprovals = Array.from(requesterPairs.values()).reduce((a, b) => a + b, 0);

  // If same approver handles > 80% of requests, suspicious
  if (totalApprovals >= 5 && approvalCount / totalApprovals > 0.8) {
    return {
      type: "collusion_suspected",
      severity: "high",
      message: "Same approver handles majority of requests - collusion suspected",
      evidence: {
        requesterId,
        approverId,
        approvalsByThisApprover: approvalCount,
        totalApprovals,
        percentage: Math.round((approvalCount / totalApprovals) * 100),
      },
    };
  }

  return null;
}

/**
 * Check approver diversity
 */
function checkApproverDiversity(requesterId: string): ApprovalViolation | null {
  const uniqueApprovers = approvalHistory.getUniqueApprovers(
    requesterId,
    APPROVAL_SAFETY_CONFIG.diversityWindowHours
  );

  // Only check if requester has enough history
  const recentRequests = approvalHistory
    .getApproverPairs(APPROVAL_SAFETY_CONFIG.diversityWindowHours)
    .get(requesterId);

  if (!recentRequests) return null;

  const totalRequests = Array.from(recentRequests.values()).reduce((a, b) => a + b, 0);

  if (totalRequests >= 10 && uniqueApprovers.length < APPROVAL_SAFETY_CONFIG.minApproverDiversity) {
    return {
      type: "insufficient_separation",
      severity: "medium",
      message: "Insufficient approver diversity - requests concentrated among few approvers",
      evidence: {
        requesterId,
        uniqueApprovers: uniqueApprovers.length,
        minRequired: APPROVAL_SAFETY_CONFIG.minApproverDiversity,
        totalRequests,
      },
    };
  }

  return null;
}

/**
 * Check role separation
 */
function checkRoleSeparation(
  requesterRole: string,
  approverRole: string
): ApprovalViolation | null {
  const requesterLevel = ROLE_HIERARCHY[requesterRole as keyof typeof ROLE_HIERARCHY];
  const approverLevel = ROLE_HIERARCHY[approverRole as keyof typeof ROLE_HIERARCHY];

  // Approver should be at or above requester level
  if (approverLevel < requesterLevel) {
    return {
      type: "role_mismatch",
      severity: "high",
      message: "Approver has lower privilege than requester",
      evidence: {
        requesterRole,
        approverRole,
        requesterLevel,
        approverLevel,
      },
    };
  }

  // For sensitive operations, require higher role
  const levelDifference = approverLevel - requesterLevel;
  if (levelDifference < APPROVAL_SAFETY_CONFIG.minRoleSeparation * 10) {
    return {
      type: "insufficient_separation",
      severity: "low",
      message: "Minimal role separation between requester and approver",
      evidence: {
        requesterRole,
        approverRole,
        levelDifference,
      },
    };
  }

  return null;
}

/**
 * Check for privilege escalation attempt
 */
function checkPrivilegeEscalation(request: ApprovalRequest): ApprovalViolation | null {
  const privilegeActions = ["manage_roles", "manage_policies", "assign_role"];

  if (!privilegeActions.includes(request.action)) return null;

  // If trying to grant higher role than requester has
  if (request.metadata?.targetRole) {
    const targetRoleLevel =
      ROLE_HIERARCHY[request.metadata.targetRole as keyof typeof ROLE_HIERARCHY];
    const requesterLevel = ROLE_HIERARCHY[request.requesterRole as keyof typeof ROLE_HIERARCHY];

    if (targetRoleLevel >= requesterLevel) {
      return {
        type: "privilege_escalation",
        severity: "critical",
        message: "Attempting to grant role equal to or higher than own role",
        evidence: {
          requesterRole: request.requesterRole,
          targetRole: request.metadata.targetRole,
        },
      };
    }
  }

  return null;
}

// ============================================================================
// MAIN SAFETY CHECK
// ============================================================================

const SEVERITY_SCORES: Record<string, number> = {
  critical: 40,
  high: 25,
  medium: 10,
  low: 5,
};

function calculateRiskScore(violations: ApprovalViolation[]): number {
  const raw = violations.reduce((sum, v) => sum + (SEVERITY_SCORES[v.severity] || 0), 0);
  return Math.min(100, raw);
}

const VIOLATION_RECOMMENDATIONS: Partial<Record<ApprovalViolationType, string>> = {
  self_approval: "Request approval from a different team member",
  circular_chain: "Use a third-party approver to break circular pattern",
  rubber_stamping: "Review request details before approving",
  collusion_suspected: "Rotate approvers to maintain separation of duties",
  insufficient_separation: "Request approval from senior team member",
};

function generateRecommendations(violations: ApprovalViolation[]): string[] {
  const violationTypes = new Set(violations.map(v => v.type));
  return (Object.entries(VIOLATION_RECOMMENDATIONS) as [ApprovalViolationType, string][])
    .filter(([type]) => violationTypes.has(type))
    .map(([, msg]) => msg);
}

/**
 * Perform comprehensive approval safety check
 */
export function checkApprovalSafety(
  request: ApprovalRequest,
  approverId: string,
  approverRole: string,
  approvalTimeMs: number
): ApprovalSafetyResult {
  const recentApprovals = approvalHistory.getRecentApprovals(
    approverId,
    APPROVAL_SAFETY_CONFIG.diversityWindowHours
  );

  // Run all checks, collecting violations
  const checks = [
    checkSelfApproval(request.requesterId, approverId),
    checkCircularChain(request.requesterId, approverId, recentApprovals),
    checkRubberStamping(approverId, approvalTimeMs),
    checkApprovalFlooding(approverId),
    checkCollusion(request.requesterId, approverId),
    checkApproverDiversity(request.requesterId),
    checkRoleSeparation(request.requesterRole, approverRole),
    checkPrivilegeEscalation(request),
  ];
  const violations = checks.filter((v): v is ApprovalViolation => v !== null);

  const riskScore = calculateRiskScore(violations);
  const recommendations = generateRecommendations(violations);
  const criticalCount = violations.filter(v => v.severity === "critical").length;
  const allowed = criticalCount === 0;

  if (!allowed || riskScore > 50) {
    logAdminEvent(
      approverId,
      "APPROVAL_SAFETY_CHECK",
      request.resource,
      request.resourceId || "unknown",
      {
        allowed,
        riskScore,
        violationCount: violations.length,
        criticalCount,
        requestId: request.id,
      }
    );
  }

  return { allowed, violations, riskScore, recommendations };
}

/**
 * Record an approval for history tracking
 */
export function recordApproval(request: ApprovalRequest, approverId: string): void {
  const approvalTimeMs = request.approvedAt
    ? request.approvedAt.getTime() - request.createdAt.getTime()
    : 0;

  approvalHistory.record({
    requestId: request.id,
    requesterId: request.requesterId,
    approverId,
    action: request.action,
    timestamp: new Date(),
    approvalTimeMs,
  });
}

/**
 * Pre-check before creating approval request
 */
export function validateApprovalRequest(
  requesterId: string,
  requesterRole: string,
  action: string,
  proposedApprovers: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Can't approve own requests
  if (proposedApprovers.includes(requesterId)) {
    errors.push("Requester cannot be in approver list");
  }

  // Check pending request limit (would need to query actual pending requests)
  // This is a placeholder - in real implementation, query the database

  // For sensitive operations, require multiple approvers
  if (APPROVAL_SAFETY_CONFIG.sensitiveOperations.includes(action)) {
    if (proposedApprovers.length < 2) {
      errors.push("Sensitive operations require at least 2 approvers");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get approval safety metrics
 */
export function getApprovalSafetyMetrics(): {
  totalApprovals24h: number;
  uniqueApprovers24h: number;
  averageApprovalTimeMs: number;
  violationsDetected24h: number;
} {
  const allApprovals = approvalHistory.getRecentApprovals("*", 24);

  // This is simplified - in real implementation, track violations separately
  return {
    totalApprovals24h: allApprovals.length,
    uniqueApprovers24h: new Set(allApprovals.map(a => a.approverId)).size,
    averageApprovalTimeMs:
      allApprovals.length > 0
        ? allApprovals.reduce((sum, a) => sum + a.approvalTimeMs, 0) / allApprovals.length
        : 0,
    violationsDetected24h: 0, // Would be tracked separately
  };
}

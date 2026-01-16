/**
 * Approval SLA Escalation Service
 *
 * Monitors approval requests and escalates based on SLA rules.
 * Feature flag: ENABLE_APPROVAL_ESCALATION
 */

import { db } from "../db";
import { approvalRequests, approvalSteps, users, governanceRoles } from "@shared/schema";
import { eq, and, lt, isNull, inArray, sql } from "drizzle-orm";
import { notifyApprovalEscalated, notifyApprovalExpired } from "./notifications";

// =====================================================
// TYPES
// =====================================================

export interface EscalationRule {
  id: string;
  name: string;
  requestTypes: string[];
  slaHours: number;
  escalateTo: "manager" | "admin" | "super_admin" | "specific_role";
  escalateToRole?: string;
  maxEscalations: number;
  autoApproveOnMaxEscalation: boolean;
  autoRejectOnMaxEscalation: boolean;
}

export interface EscalationResult {
  requestId: string;
  action: "escalated" | "expired" | "auto_approved" | "auto_rejected" | "skipped";
  escalationLevel?: number;
  escalatedTo?: string[];
  error?: string;
}

export interface EscalationConfig {
  enabled: boolean;
  defaultSlaHours: number;
  checkIntervalMinutes: number;
  maxEscalationLevel: number;
  rules: EscalationRule[];
}

// =====================================================
// CONFIGURATION
// =====================================================

function getEscalationConfig(): EscalationConfig {
  const rulesJson = process.env.APPROVAL_ESCALATION_RULES;
  let rules: EscalationRule[] = [];

  if (rulesJson) {
    try {
      rules = JSON.parse(rulesJson);
    } catch {
      console.error("[Escalation] Failed to parse APPROVAL_ESCALATION_RULES");
    }
  }

  // Default rules if none configured
  if (rules.length === 0) {
    rules = [
      {
        id: "default-publish",
        name: "Publish Escalation",
        requestTypes: ["publish", "unpublish"],
        slaHours: 24,
        escalateTo: "admin",
        maxEscalations: 2,
        autoApproveOnMaxEscalation: false,
        autoRejectOnMaxEscalation: false,
      },
      {
        id: "default-delete",
        name: "Delete Escalation",
        requestTypes: ["delete", "bulk_delete"],
        slaHours: 48,
        escalateTo: "super_admin",
        maxEscalations: 1,
        autoApproveOnMaxEscalation: false,
        autoRejectOnMaxEscalation: true,
      },
      {
        id: "default-urgent",
        name: "Urgent Escalation",
        requestTypes: ["urgent"],
        slaHours: 4,
        escalateTo: "admin",
        maxEscalations: 3,
        autoApproveOnMaxEscalation: true,
        autoRejectOnMaxEscalation: false,
      },
    ];
  }

  return {
    enabled: process.env.ENABLE_APPROVAL_ESCALATION === "true",
    defaultSlaHours: parseInt(process.env.APPROVAL_DEFAULT_SLA_HOURS || "24"),
    checkIntervalMinutes: parseInt(process.env.APPROVAL_ESCALATION_CHECK_INTERVAL_MINUTES || "15"),
    maxEscalationLevel: parseInt(process.env.APPROVAL_MAX_ESCALATION_LEVEL || "3"),
    rules,
  };
}

// =====================================================
// ESCALATION LOGIC
// =====================================================

interface PendingRequest {
  id: string;
  requestType: string;
  resourceType: string;
  resourceId: string;
  requesterId: string;
  currentStep: number;
  status: string;
  priority: string;
  escalatedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
}

async function getPendingRequests(): Promise<PendingRequest[]> {
  const results = await db
    .select()
    .from(approvalRequests)
    .where(
      and(
        inArray(approvalRequests.status, ["pending", "escalated"]),
        lt(approvalRequests.createdAt, new Date())
      )
    );

  return results.map((r) => ({
    id: r.id,
    requestType: r.requestType,
    resourceType: r.resourceType,
    resourceId: r.resourceId,
    requesterId: r.requesterId,
    currentStep: r.currentStep,
    status: r.status,
    priority: r.priority,
    escalatedAt: r.escalatedAt,
    expiresAt: r.expiresAt,
    createdAt: r.createdAt!,
    metadata: r.metadata as Record<string, unknown> | null,
  }));
}

function findMatchingRule(
  request: PendingRequest,
  rules: EscalationRule[]
): EscalationRule | null {
  return rules.find((rule) => rule.requestTypes.includes(request.requestType)) || null;
}

function calculateEscalationLevel(request: PendingRequest): number {
  const metadata = request.metadata || {};
  return (metadata.escalationLevel as number) || 0;
}

function isOverdue(request: PendingRequest, slaHours: number): boolean {
  const createdAt = new Date(request.createdAt);
  const deadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
  return new Date() > deadline;
}

async function getApproversByRole(roleName: string): Promise<string[]> {
  // Get users with the specified governance role
  const roleResult = await db
    .select({ id: governanceRoles.id })
    .from(governanceRoles)
    .where(eq(governanceRoles.name, roleName))
    .limit(1);

  if (!roleResult.length) return [];

  // In a full implementation, we'd join with user_role_assignments
  // For now, return admins as fallback
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)))
    .limit(5);

  return admins.map((u) => u.id);
}

async function escalateRequest(
  request: PendingRequest,
  rule: EscalationRule,
  currentLevel: number
): Promise<EscalationResult> {
  const newLevel = currentLevel + 1;

  // Check if max escalations reached
  if (newLevel > rule.maxEscalations) {
    if (rule.autoApproveOnMaxEscalation) {
      await db
        .update(approvalRequests)
        .set({
          status: "approved",
          updatedAt: new Date(),
          metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
            autoApproved: true,
            autoApproveReason: "Max escalations reached",
            escalationLevel: newLevel,
          })}::jsonb`,
        })
        .where(eq(approvalRequests.id, request.id));

      return { requestId: request.id, action: "auto_approved", escalationLevel: newLevel };
    }

    if (rule.autoRejectOnMaxEscalation) {
      await db
        .update(approvalRequests)
        .set({
          status: "rejected",
          updatedAt: new Date(),
          metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
            autoRejected: true,
            autoRejectReason: "Max escalations reached without approval",
            escalationLevel: newLevel,
          })}::jsonb`,
        })
        .where(eq(approvalRequests.id, request.id));

      return { requestId: request.id, action: "auto_rejected", escalationLevel: newLevel };
    }

    // Mark as expired if no auto action
    await db
      .update(approvalRequests)
      .set({
        status: "expired",
        updatedAt: new Date(),
        metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
          expiredReason: "Max escalations reached",
          escalationLevel: newLevel,
        })}::jsonb`,
      })
      .where(eq(approvalRequests.id, request.id));

    await notifyApprovalExpired(
      request.id,
      request.requestType,
      request.resourceType,
      request.resourceId,
      request.requesterId
    );

    return { requestId: request.id, action: "expired", escalationLevel: newLevel };
  }

  // Get approvers for escalation
  const approverRole = rule.escalateToRole || rule.escalateTo;
  const approverIds = await getApproversByRole(approverRole);

  // Update request with escalation
  await db
    .update(approvalRequests)
    .set({
      status: "escalated",
      escalatedAt: new Date(),
      updatedAt: new Date(),
      metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
        escalationLevel: newLevel,
        escalatedTo: approverRole,
        escalatedAt: new Date().toISOString(),
      })}::jsonb`,
    })
    .where(eq(approvalRequests.id, request.id));

  // Send escalation notification
  await notifyApprovalEscalated(
    request.id,
    request.requestType,
    request.resourceType,
    request.resourceId,
    request.requesterId,
    newLevel,
    approverIds
  );

  console.log(`[Escalation] Request ${request.id} escalated to level ${newLevel} (${approverRole})`);

  return {
    requestId: request.id,
    action: "escalated",
    escalationLevel: newLevel,
    escalatedTo: approverIds,
  };
}

// =====================================================
// MAIN ESCALATION PROCESSOR
// =====================================================

export async function processEscalations(): Promise<EscalationResult[]> {
  const config = getEscalationConfig();
  const results: EscalationResult[] = [];

  if (!config.enabled) {
    console.log("[Escalation] Escalation processing disabled (ENABLE_APPROVAL_ESCALATION not set)");
    return results;
  }

  console.log("[Escalation] Processing pending approval requests...");

  try {
    const pendingRequests = await getPendingRequests();
    console.log(`[Escalation] Found ${pendingRequests.length} pending requests`);

    for (const request of pendingRequests) {
      const rule = findMatchingRule(request, config.rules);

      if (!rule) {
        // Use default SLA if no specific rule
        const defaultSla = config.defaultSlaHours;
        if (isOverdue(request, defaultSla)) {
          // Escalate with default behavior
          const level = calculateEscalationLevel(request);
          if (level < config.maxEscalationLevel) {
            const result = await escalateRequest(request, {
              id: "default",
              name: "Default Escalation",
              requestTypes: [request.requestType],
              slaHours: defaultSla,
              escalateTo: "admin",
              maxEscalations: config.maxEscalationLevel,
              autoApproveOnMaxEscalation: false,
              autoRejectOnMaxEscalation: false,
            }, level);
            results.push(result);
          }
        }
        continue;
      }

      const currentLevel = calculateEscalationLevel(request);
      const slaHours = rule.slaHours * Math.pow(0.5, currentLevel); // SLA reduces with each escalation

      if (isOverdue(request, slaHours)) {
        const result = await escalateRequest(request, rule, currentLevel);
        results.push(result);
      } else {
        results.push({ requestId: request.id, action: "skipped" });
      }
    }

    const escalated = results.filter((r) => r.action === "escalated").length;
    const expired = results.filter((r) => r.action === "expired").length;
    const autoActions = results.filter((r) => r.action.startsWith("auto_")).length;

    console.log(`[Escalation] Processed: ${escalated} escalated, ${expired} expired, ${autoActions} auto-actioned`);

  } catch (error) {
    console.error("[Escalation] Error processing escalations:", error);
    throw error;
  }

  return results;
}

// =====================================================
// SCHEDULED RUNNER
// =====================================================

let escalationInterval: ReturnType<typeof setInterval> | null = null;

export function startEscalationProcessor(): void {
  const config = getEscalationConfig();

  if (!config.enabled) {
    console.log("[Escalation] Processor not started (disabled)");
    return;
  }

  if (escalationInterval) {
    console.log("[Escalation] Processor already running");
    return;
  }

  const intervalMs = config.checkIntervalMinutes * 60 * 1000;

  console.log(`[Escalation] Starting processor (checking every ${config.checkIntervalMinutes} minutes)`);

  // Run immediately on start
  processEscalations().catch(console.error);

  // Then run on interval
  escalationInterval = setInterval(() => {
    processEscalations().catch(console.error);
  }, intervalMs);
}

export function stopEscalationProcessor(): void {
  if (escalationInterval) {
    clearInterval(escalationInterval);
    escalationInterval = null;
    console.log("[Escalation] Processor stopped");
  }
}

// =====================================================
// MANUAL ESCALATION
// =====================================================

export async function manuallyEscalateRequest(
  requestId: string,
  escalateToRole: string,
  reason?: string
): Promise<EscalationResult> {
  const [request] = await db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.id, requestId))
    .limit(1);

  if (!request) {
    return { requestId, action: "skipped", error: "Request not found" };
  }

  if (!["pending", "escalated"].includes(request.status)) {
    return { requestId, action: "skipped", error: `Cannot escalate ${request.status} request` };
  }

  const currentLevel = ((request.metadata as Record<string, unknown>)?.escalationLevel as number) || 0;
  const approverIds = await getApproversByRole(escalateToRole);

  await db
    .update(approvalRequests)
    .set({
      status: "escalated",
      escalatedAt: new Date(),
      updatedAt: new Date(),
      metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
        escalationLevel: currentLevel + 1,
        escalatedTo: escalateToRole,
        escalatedAt: new Date().toISOString(),
        manualEscalation: true,
        escalationReason: reason,
      })}::jsonb`,
    })
    .where(eq(approvalRequests.id, requestId));

  await notifyApprovalEscalated(
    requestId,
    request.requestType,
    request.resourceType,
    request.resourceId,
    request.requesterId,
    currentLevel + 1,
    approverIds
  );

  return {
    requestId,
    action: "escalated",
    escalationLevel: currentLevel + 1,
    escalatedTo: approverIds,
  };
}

console.log("[Escalation] Module loaded");

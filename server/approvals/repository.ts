/**
 * Approvals Repository
 * Feature flag: ENABLE_APPROVAL_WORKFLOWS
 */

import { db } from "../db";
import { approvalRequests, approvalSteps } from "@shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { ApprovalStatus } from "./types";

function isEnabled(): boolean {
  return process.env.ENABLE_APPROVAL_WORKFLOWS === "true";
}

/**
 * Get approval statistics
 */
export async function getApprovalStats(): Promise<{
  pending: number;
  approved: number;
  rejected: number;
  escalated: number;
}> {
  if (!isEnabled()) {
    return { pending: 0, approved: 0, rejected: 0, escalated: 0 };
  }

  const stats = await db
    .select({
      status: approvalRequests.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(approvalRequests)
    .groupBy(approvalRequests.status);

  const result = {
    pending: 0,
    approved: 0,
    rejected: 0,
    escalated: 0,
  };

  for (const stat of stats) {
    if (stat.status in result) {
      result[stat.status as keyof typeof result] = Number(stat.count);
    }
  }

  return result;
}

/**
 * Get requests by status
 */
export async function getRequestsByStatus(
  status: ApprovalStatus,
  limit: number = 50
): Promise<typeof approvalRequests.$inferSelect[]> {
  if (!isEnabled()) return [];

  return db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.status, status))
    .orderBy(desc(approvalRequests.createdAt))
    .limit(limit);
}

/**
 * Get requests for a resource
 */
export async function getRequestsForResource(
  resourceType: string,
  resourceId: string
): Promise<typeof approvalRequests.$inferSelect[]> {
  if (!isEnabled()) return [];

  return db
    .select()
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.resourceType, resourceType),
        eq(approvalRequests.resourceId, resourceId)
      )
    )
    .orderBy(desc(approvalRequests.createdAt));
}

/**
 * Get requests by requester
 */
export async function getRequestsByRequester(
  requesterId: string,
  limit: number = 50
): Promise<typeof approvalRequests.$inferSelect[]> {
  if (!isEnabled()) return [];

  return db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.requesterId, requesterId))
    .orderBy(desc(approvalRequests.createdAt))
    .limit(limit);
}

/**
 * Get expired requests that need auto-processing
 */
export async function getExpiredRequests(): Promise<
  typeof approvalRequests.$inferSelect[]
> {
  if (!isEnabled()) return [];

  const now = new Date();

  return db
    .select()
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.status, "pending"),
        lte(approvalRequests.expiresAt, now)
      )
    );
}

/**
 * Get steps ready for auto-approval
 */
export async function getAutoApproveSteps(): Promise<
  typeof approvalSteps.$inferSelect[]
> {
  if (!isEnabled()) return [];

  const now = new Date();

  return db
    .select()
    .from(approvalSteps)
    .where(
      and(
        eq(approvalSteps.status, "pending"),
        lte(approvalSteps.autoApproveAt, now)
      )
    );
}

/**
 * Update request status
 */
export async function updateRequestStatus(
  requestId: string,
  status: ApprovalStatus
): Promise<void> {
  if (!isEnabled()) return;

  await db
    .update(approvalRequests)
    .set({ status, updatedAt: new Date() })
    .where(eq(approvalRequests.id, requestId));
}

/**
 * Escalate a request
 */
export async function escalateRequest(requestId: string): Promise<void> {
  if (!isEnabled()) return;

  await db
    .update(approvalRequests)
    .set({
      status: "escalated",
      escalatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(approvalRequests.id, requestId));
}

/**
 * Get recent activity
 */
export async function getRecentActivity(
  limit: number = 20
): Promise<typeof approvalRequests.$inferSelect[]> {
  if (!isEnabled()) return [];

  return db
    .select()
    .from(approvalRequests)
    .orderBy(desc(approvalRequests.updatedAt))
    .limit(limit);
}

console.log("[Approvals] Repository loaded");

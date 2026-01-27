/**
 * Audit Query Engine
 * Feature flag: ENABLE_AUDIT_LOGS
 */

import { db } from "../db";
import { governanceAuditLogs } from "@shared/schema";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import { AuditQuery, AuditQueryResult, AuditLogEntry, AuditSummary } from "./types";

function isEnabled(): boolean {
  return process.env.ENABLE_AUDIT_LOGS === "true";
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(query: AuditQuery): Promise<AuditQueryResult> {
  if (!isEnabled()) {
    return { entries: [], total: 0, hasMore: false };
  }

  const limit = Math.min(query.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = query.offset || 0;

  // Build conditions
  const conditions = [];

  if (query.userId) {
    conditions.push(eq(governanceAuditLogs.userId, query.userId));
  }
  if (query.action) {
    conditions.push(eq(governanceAuditLogs.action, query.action));
  }
  if (query.resource) {
    conditions.push(eq(governanceAuditLogs.resource, query.resource));
  }
  if (query.resourceId) {
    conditions.push(eq(governanceAuditLogs.resourceId, query.resourceId));
  }
  if (query.source) {
    conditions.push(eq(governanceAuditLogs.source, query.source));
  }
  if (query.startDate) {
    conditions.push(gte(governanceAuditLogs.createdAt, query.startDate));
  }
  if (query.endDate) {
    conditions.push(lte(governanceAuditLogs.createdAt, query.endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const [countResult] = await db
    .select({ count: count() })
    .from(governanceAuditLogs)
    .where(whereClause);

  const total = countResult?.count || 0;

  // Get entries
  const entries = await db
    .select()
    .from(governanceAuditLogs)
    .where(whereClause)
    .orderBy(desc(governanceAuditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    entries: entries as unknown as AuditLogEntry[],
    total,
    hasMore: offset + entries.length < total,
  };
}

/**
 * Get audit log by ID
 */
export async function getAuditLog(id: string): Promise<AuditLogEntry | null> {
  if (!isEnabled()) return null;

  const [entry] = await db
    .select()
    .from(governanceAuditLogs)
    .where(eq(governanceAuditLogs.id, id))
    .limit(1);

  return entry as unknown as AuditLogEntry | null;
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceHistory(
  resource: string,
  resourceId: string,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  if (!isEnabled()) return [];

  const entries = await db
    .select()
    .from(governanceAuditLogs)
    .where(
      and(
        eq(governanceAuditLogs.resource, resource),
        eq(governanceAuditLogs.resourceId, resourceId)
      )
    )
    .orderBy(desc(governanceAuditLogs.createdAt))
    .limit(limit);

  return entries as unknown as AuditLogEntry[];
}

/**
 * Get user activity
 */
export async function getUserActivity(
  userId: string,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  if (!isEnabled()) return [];

  const entries = await db
    .select()
    .from(governanceAuditLogs)
    .where(eq(governanceAuditLogs.userId, userId))
    .orderBy(desc(governanceAuditLogs.createdAt))
    .limit(limit);

  return entries as unknown as AuditLogEntry[];
}

/**
 * Get audit summary statistics
 */
export async function getAuditSummary(startDate?: Date, endDate?: Date): Promise<AuditSummary> {
  if (!isEnabled()) {
    return {
      totalEvents: 0,
      byAction: {},
      byResource: {},
      bySource: {},
      topUsers: [],
      recentActivity: [],
    };
  }

  const conditions = [];
  if (startDate) {
    conditions.push(gte(governanceAuditLogs.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(governanceAuditLogs.createdAt, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Total count
  const [totalResult] = await db
    .select({ count: count() })
    .from(governanceAuditLogs)
    .where(whereClause);

  // By action
  const actionStats = await db
    .select({
      action: governanceAuditLogs.action,
      count: count(),
    })
    .from(governanceAuditLogs)
    .where(whereClause)
    .groupBy(governanceAuditLogs.action);

  // By resource
  const resourceStats = await db
    .select({
      resource: governanceAuditLogs.resource,
      count: count(),
    })
    .from(governanceAuditLogs)
    .where(whereClause)
    .groupBy(governanceAuditLogs.resource);

  // By source
  const sourceStats = await db
    .select({
      source: governanceAuditLogs.source,
      count: count(),
    })
    .from(governanceAuditLogs)
    .where(whereClause)
    .groupBy(governanceAuditLogs.source);

  // Top users
  const topUsersResult = await db
    .select({
      userId: governanceAuditLogs.userId,
      count: count(),
    })
    .from(governanceAuditLogs)
    .where(whereClause)
    .groupBy(governanceAuditLogs.userId)
    .orderBy(desc(count()))
    .limit(10);

  // Recent activity
  const recentActivity = await db
    .select()
    .from(governanceAuditLogs)
    .where(whereClause)
    .orderBy(desc(governanceAuditLogs.createdAt))
    .limit(20);

  return {
    totalEvents: totalResult?.count || 0,
    byAction: Object.fromEntries(actionStats.map(s => [s.action, s.count])),
    byResource: Object.fromEntries(resourceStats.map(s => [s.resource, s.count])),
    bySource: Object.fromEntries(sourceStats.map(s => [s.source, s.count])),
    topUsers: topUsersResult
      .filter(u => u.userId)
      .map(u => ({ userId: u.userId!, count: u.count })),
    recentActivity: recentActivity as unknown as AuditLogEntry[],
  };
}

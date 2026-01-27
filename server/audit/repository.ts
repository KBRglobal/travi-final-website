/**
 * Audit Repository
 * Feature flag: ENABLE_AUDIT_LOGS
 */

import { db } from "../db";
import { governanceAuditLogs } from "@shared/schema";
import { eq, lte, desc, and, sql } from "drizzle-orm";

function isEnabled(): boolean {
  return process.env.ENABLE_AUDIT_LOGS === "true";
}

/**
 * Clean up old audit logs (retention policy)
 */
export async function cleanupOldLogs(retentionDays: number = 90): Promise<number> {
  if (!isEnabled()) return 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await db
    .delete(governanceAuditLogs)
    .where(lte(governanceAuditLogs.createdAt, cutoffDate))
    .returning({ id: governanceAuditLogs.id });

  return result.length;
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  totalEntries: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  estimatedSizeBytes: number;
}> {
  if (!isEnabled()) {
    return {
      totalEntries: 0,
      estimatedSizeBytes: 0,
    };
  }

  const [stats] = await db
    .select({
      count: sql<number>`COUNT(*)`,
      oldest: sql<Date>`MIN(created_at)`,
      newest: sql<Date>`MAX(created_at)`,
    })
    .from(governanceAuditLogs);

  // Estimate size (rough calculation)
  const avgEntrySize = 500; // bytes
  const estimatedSize = (stats?.count || 0) * avgEntrySize;

  return {
    totalEntries: stats?.count || 0,
    oldestEntry: stats?.oldest,
    newestEntry: stats?.newest,
    estimatedSizeBytes: estimatedSize,
  };
}

/**
 * Export logs to JSON format
 */
export async function exportLogs(startDate?: Date, endDate?: Date): Promise<string> {
  if (!isEnabled()) return "[]";

  const conditions = [];
  if (startDate) {
    conditions.push(sql`created_at >= ${startDate}`);
  }
  if (endDate) {
    conditions.push(sql`created_at <= ${endDate}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const logs = await db
    .select()
    .from(governanceAuditLogs)
    .where(whereClause)
    .orderBy(desc(governanceAuditLogs.createdAt));

  return JSON.stringify(logs, null, 2);
}

/**
 * Verify log integrity (check snapshot hashes)
 */
export async function verifyIntegrity(limit: number = 1000): Promise<{
  verified: number;
  failed: number;
  failedIds: string[];
}> {
  if (!isEnabled()) {
    return { verified: 0, failed: 0, failedIds: [] };
  }

  const { createHash } = await import("crypto");

  const logs = await db
    .select()
    .from(governanceAuditLogs)
    .limit(limit)
    .orderBy(desc(governanceAuditLogs.createdAt));

  let verified = 0;
  let failed = 0;
  const failedIds: string[] = [];

  for (const log of logs) {
    if (log.afterSnapshot && log.snapshotHash) {
      const computedHash = createHash("sha256").update(log.afterSnapshot).digest("hex");

      if (computedHash === log.snapshotHash) {
        verified++;
      } else {
        failed++;
        failedIds.push(log.id);
      }
    } else {
      verified++; // No snapshot to verify
    }
  }

  return { verified, failed, failedIds };
}

/**
 * Get distinct values for filtering
 */
export async function getDistinctValues(): Promise<{
  actions: string[];
  resources: string[];
  sources: string[];
}> {
  if (!isEnabled()) {
    return { actions: [], resources: [], sources: [] };
  }

  const [actions, resources, sources] = await Promise.all([
    db.selectDistinct({ action: governanceAuditLogs.action }).from(governanceAuditLogs),
    db.selectDistinct({ resource: governanceAuditLogs.resource }).from(governanceAuditLogs),
    db.selectDistinct({ source: governanceAuditLogs.source }).from(governanceAuditLogs),
  ]);

  return {
    actions: actions.map(a => a.action),
    resources: resources.map(r => r.resource),
    sources: sources.map(s => s.source),
  };
}

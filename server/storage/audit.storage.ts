import {
  eq,
  desc,
  sql,
  and,
  db,
  auditLogs,
  rateLimits,
  type AuditLog,
  type InsertAuditLog,
} from "./base";

export class AuditStorage {
  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db
      .insert(auditLogs)
      .values(log as any)
      .returning();
    return auditLog;
  }

  async getAuditLogs(filters?: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    actionType?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    const conditions = [];
    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters?.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType as any));
    }
    if (filters?.entityId) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }
    if (filters?.actionType) {
      conditions.push(eq(auditLogs.actionType, filters.actionType as any));
    }

    const query = db.select().from(auditLogs);

    if (conditions.length > 0) {
      return await query
        .where(and(...conditions))
        .orderBy(desc(auditLogs.timestamp))
        .limit(filters?.limit || 100)
        .offset(filters?.offset || 0);
    }

    return await query
      .orderBy(desc(auditLogs.timestamp))
      .limit(filters?.limit || 100)
      .offset(filters?.offset || 0);
  }

  async getAuditLogCount(filters?: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    actionType?: string;
  }): Promise<number> {
    const conditions = [];
    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters?.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType as any));
    }
    if (filters?.entityId) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }
    if (filters?.actionType) {
      conditions.push(eq(auditLogs.actionType, filters.actionType as any));
    }

    if (conditions.length > 0) {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(and(...conditions));
      return result[0]?.count || 0;
    }

    const result = await db.select({ count: sql<number>`count(*)::int` }).from(auditLogs);
    return result[0]?.count || 0;
  }

  // Rate Limits - for persistent rate limiting
  async getRateLimit(key: string): Promise<{ count: number; resetAt: Date } | null> {
    const [limit] = await db.select().from(rateLimits).where(eq(rateLimits.key, key));
    if (!limit) return null;
    return { count: limit.count, resetAt: limit.resetAt };
  }

  async incrementRateLimit(key: string, resetAt: Date): Promise<{ count: number; resetAt: Date }> {
    // Use upsert with increment
    const [result] = await db
      .insert(rateLimits)
      .values({ key, count: 1, resetAt, updatedAt: new Date() } as any)
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`${rateLimits.count} + 1`,
          updatedAt: new Date(),
        } as any,
      })
      .returning();
    return { count: result.count, resetAt: result.resetAt };
  }

  async resetRateLimit(key: string, resetAt: Date): Promise<void> {
    await db
      .insert(rateLimits)
      .values({ key, count: 1, resetAt, updatedAt: new Date() } as any)
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: 1,
          resetAt,
          updatedAt: new Date(),
        } as any,
      });
  }

  async cleanupExpiredRateLimits(): Promise<number> {
    const result = await db
      .delete(rateLimits)
      .where(sql`${rateLimits.resetAt} < NOW()`)
      .returning();
    return result.length;
  }
}

export const auditStorage = new AuditStorage();

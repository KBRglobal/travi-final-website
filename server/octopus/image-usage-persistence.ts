/**
 * Octopus v2 - Image Usage Persistence Layer
 * Database-backed CRUD operations for ImageUsage tracking
 * 
 * Tracks how images are used and why, without touching the Image Engine.
 */

import { db } from '../db';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { 
  imageUsage, 
  type ImageUsage,
  type InsertImageUsage,
  type IntelligenceSnapshot
} from '@shared/schema';
import { log } from '../lib/logger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[ImageUsagePersistence] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => 
    log.error(`[ImageUsagePersistence] ${msg}`, undefined, data),
};

export type ImageUsageDecision = "approved" | "rejected" | "pending" | "reuse" | "generate";
export type ImageRole = "hero" | "card" | "thumbnail" | "gallery" | "background" | "inline" | "og_image" | "logo";

export interface CreateImageUsageParams {
  assetId: string;
  entityId?: string;
  entityType?: string;
  pageId?: string;
  pageType?: string;
  requestedRole?: ImageRole;
  decision?: ImageUsageDecision;
  decisionReason?: string;
}

export interface UpdateImageUsageParams {
  finalRole?: ImageRole;
  intelligenceSnapshot?: IntelligenceSnapshot;
  decision?: ImageUsageDecision;
  decisionReason?: string;
  decisionRuleId?: string;
  approvedBy?: string;
  approvedAt?: Date;
  reusedFromId?: string;
}

/**
 * Create a new ImageUsage record
 */
export async function createImageUsage(params: CreateImageUsageParams): Promise<ImageUsage> {
  const [usage] = await db.insert(imageUsage).values({
    assetId: params.assetId,
    entityId: params.entityId,
    entityType: params.entityType,
    pageId: params.pageId,
    pageType: params.pageType,
    requestedRole: params.requestedRole as any,
    decision: (params.decision || 'pending') as any,
    decisionReason: params.decisionReason,
  } as any).returning();

  logger.info('ImageUsage created', { 
    id: usage.id, 
    assetId: params.assetId, 
    pageId: params.pageId 
  });
  
  return usage;
}

/**
 * Get an ImageUsage record by ID
 */
export async function getImageUsage(id: string): Promise<ImageUsage | null> {
  const [usage] = await db.select().from(imageUsage).where(eq(imageUsage.id, id));
  return usage || null;
}

/**
 * Get ImageUsage by asset and page
 */
export async function getImageUsageByAssetAndPage(
  assetId: string, 
  pageId: string,
  requestedRole?: ImageRole
): Promise<ImageUsage | null> {
  const conditions = [
    eq(imageUsage.assetId, assetId),
    eq(imageUsage.pageId, pageId)
  ];
  
  if (requestedRole) {
    conditions.push(eq(imageUsage.requestedRole, requestedRole as any));
  }
  
  const [usage] = await db.select()
    .from(imageUsage)
    .where(and(...conditions));
  
  return usage || null;
}

/**
 * Get all ImageUsage records for an entity
 */
export async function getImageUsageByEntity(
  entityType: string, 
  entityId: string
): Promise<ImageUsage[]> {
  return db.select()
    .from(imageUsage)
    .where(and(
      eq(imageUsage.entityType, entityType),
      eq(imageUsage.entityId, entityId)
    ))
    .orderBy(desc(imageUsage.createdAt));
}

/**
 * Get all ImageUsage records for a page
 */
export async function getImageUsageByPage(
  pageType: string, 
  pageId: string
): Promise<ImageUsage[]> {
  return db.select()
    .from(imageUsage)
    .where(and(
      eq(imageUsage.pageType, pageType),
      eq(imageUsage.pageId, pageId)
    ))
    .orderBy(desc(imageUsage.createdAt));
}

/**
 * Get all ImageUsage records for an asset
 */
export async function getImageUsageByAsset(assetId: string): Promise<ImageUsage[]> {
  return db.select()
    .from(imageUsage)
    .where(eq(imageUsage.assetId, assetId))
    .orderBy(desc(imageUsage.createdAt));
}

/**
 * Get pending ImageUsage records
 */
export async function getPendingImageUsages(limit = 50): Promise<ImageUsage[]> {
  return db.select()
    .from(imageUsage)
    .where(eq(imageUsage.decision, 'pending'))
    .orderBy(desc(imageUsage.createdAt))
    .limit(limit);
}

/**
 * Update an ImageUsage record
 */
export async function updateImageUsage(
  id: string, 
  params: UpdateImageUsageParams
): Promise<ImageUsage | null> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (params.finalRole !== undefined) {
    updateData.finalRole = params.finalRole;
  }
  if (params.intelligenceSnapshot !== undefined) {
    updateData.intelligenceSnapshot = params.intelligenceSnapshot;
  }
  if (params.decision !== undefined) {
    updateData.decision = params.decision;
  }
  if (params.decisionReason !== undefined) {
    updateData.decisionReason = params.decisionReason;
  }
  if (params.decisionRuleId !== undefined) {
    updateData.decisionRuleId = params.decisionRuleId;
  }
  if (params.approvedBy !== undefined) {
    updateData.approvedBy = params.approvedBy;
  }
  if (params.approvedAt !== undefined) {
    updateData.approvedAt = params.approvedAt;
  }
  if (params.reusedFromId !== undefined) {
    updateData.reusedFromId = params.reusedFromId;
  }

  const [usage] = await db.update(imageUsage)
    .set(updateData)
    .where(eq(imageUsage.id, id))
    .returning();

  if (usage) {
    logger.info('ImageUsage updated', { 
      id, 
      decision: params.decision,
      finalRole: params.finalRole 
    });
  }

  return usage || null;
}

/**
 * Batch update multiple ImageUsage records
 */
export async function batchUpdateImageUsages(
  ids: string[], 
  params: UpdateImageUsageParams
): Promise<ImageUsage[]> {
  if (ids.length === 0) return [];

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (params.decision !== undefined) {
    updateData.decision = params.decision;
  }
  if (params.decisionReason !== undefined) {
    updateData.decisionReason = params.decisionReason;
  }

  const usages = await db.update(imageUsage)
    .set(updateData)
    .where(inArray(imageUsage.id, ids))
    .returning();

  logger.info('ImageUsages batch updated', { 
    count: usages.length, 
    decision: params.decision 
  });

  return usages;
}

/**
 * Delete an ImageUsage record
 */
export async function deleteImageUsage(id: string): Promise<boolean> {
  const result = await db.delete(imageUsage).where(eq(imageUsage.id, id));
  logger.info('ImageUsage deleted', { id });
  return true;
}

/**
 * Find reusable images for an entity/role combination
 * Returns approved images that could be reused
 */
export async function findReusableImages(
  entityType: string,
  requestedRole: ImageRole,
  limit = 10
): Promise<ImageUsage[]> {
  return db.select()
    .from(imageUsage)
    .where(and(
      eq(imageUsage.entityType, entityType),
      eq(imageUsage.finalRole, requestedRole as any),
      eq(imageUsage.decision, 'approved')
    ))
    .orderBy(desc(imageUsage.createdAt))
    .limit(limit);
}

/**
 * Get usage statistics for observability
 */
export async function getImageUsageStats(): Promise<{
  totalUsages: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  reuseCount: number;
  byRole: Record<string, number>;
}> {
  const [stats] = await db.select({
    totalUsages: sql<number>`count(*)::int`,
    pendingCount: sql<number>`count(*) filter (where decision = 'pending')::int`,
    approvedCount: sql<number>`count(*) filter (where decision = 'approved')::int`,
    rejectedCount: sql<number>`count(*) filter (where decision = 'rejected')::int`,
    reuseCount: sql<number>`count(*) filter (where decision = 'reuse')::int`,
  }).from(imageUsage);

  const roleStats = await db.select({
    role: imageUsage.finalRole,
    count: sql<number>`count(*)::int`,
  })
    .from(imageUsage)
    .where(sql`${imageUsage.finalRole} is not null`)
    .groupBy(imageUsage.finalRole);

  const byRole: Record<string, number> = {};
  for (const row of roleStats) {
    if (row.role) {
      byRole[row.role] = row.count;
    }
  }

  return {
    totalUsages: stats?.totalUsages || 0,
    pendingCount: stats?.pendingCount || 0,
    approvedCount: stats?.approvedCount || 0,
    rejectedCount: stats?.rejectedCount || 0,
    reuseCount: stats?.reuseCount || 0,
    byRole,
  };
}

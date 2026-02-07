/**
 * VAMS (Visual Asset Management System) Storage
 * Manages image assets, variants, and content relationships
 */

import { eq, and, desc, sql, ilike, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  vamsAssets,
  vamsAssetVariants,
  vamsContentAssets,
  vamsSearchCache,
  type VamsAsset,
  type InsertVamsAsset,
  type VamsAssetVariant,
  type InsertVamsAssetVariant,
  type VamsContentAsset,
  type InsertVamsContentAsset,
  type VamsSearchCache,
  type InsertVamsSearchCache,
  type VamsProvider,
  type VamsAssetStatus,
  type VamsVariantType,
} from "@shared/schema";
import crypto from "node:crypto";

export class VamsStorage {
  // ============================================================================
  // ASSETS CRUD
  // ============================================================================

  async getAssets(options?: {
    provider?: VamsProvider;
    status?: VamsAssetStatus;
    limit?: number;
    offset?: number;
  }): Promise<VamsAsset[]> {
    const conditions: any[] = [];

    if (options?.provider) {
      conditions.push(eq(vamsAssets.provider, options.provider));
    }

    if (options?.status) {
      conditions.push(eq(vamsAssets.status, options.status));
    }

    let query = db.select().from(vamsAssets);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(vamsAssets.createdAt)) as any;

    if (options?.limit) {
      query = query.limit(options.limit) as any;
    }

    if (options?.offset) {
      query = query.offset(options.offset) as any;
    }

    return await query;
  }

  async getAsset(id: string): Promise<VamsAsset | undefined> {
    const [asset] = await db.select().from(vamsAssets).where(eq(vamsAssets.id, id));
    return asset;
  }

  async getAssetByProviderId(
    provider: VamsProvider,
    providerId: string
  ): Promise<VamsAsset | undefined> {
    const [asset] = await db
      .select()
      .from(vamsAssets)
      .where(and(eq(vamsAssets.provider, provider), eq(vamsAssets.providerId, providerId)));
    return asset;
  }

  async createAsset(data: InsertVamsAsset): Promise<VamsAsset> {
    const [asset] = await db
      .insert(vamsAssets)
      .values(data as any)
      .returning();
    return asset;
  }

  async updateAsset(id: string, data: Partial<InsertVamsAsset>): Promise<VamsAsset | undefined> {
    const [asset] = await db
      .update(vamsAssets)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(vamsAssets.id, id))
      .returning();
    return asset;
  }

  async deleteAsset(id: string): Promise<boolean> {
    await db.delete(vamsAssets).where(eq(vamsAssets.id, id));
    return true;
  }

  async incrementAssetUsage(id: string): Promise<void> {
    await db
      .update(vamsAssets)
      .set({
        usageCount: sql`${vamsAssets.usageCount} + 1`,
        lastUsedAt: new Date(),
      } as any)
      .where(eq(vamsAssets.id, id));
  }

  async searchAssets(query: string, limit: number = 20): Promise<VamsAsset[]> {
    const searchTerms = query.toLowerCase().split(" ");
    const conditions = searchTerms.map(
      term => sql`(
        ${vamsAssets.title} ILIKE ${"%" + term + "%"} OR
        ${vamsAssets.description} ILIKE ${"%" + term + "%"} OR
        ${vamsAssets.altText} ILIKE ${"%" + term + "%"} OR
        ${vamsAssets.tags}::text ILIKE ${"%" + term + "%"} OR
        ${vamsAssets.aiLabels}::text ILIKE ${"%" + term + "%"}
      )`
    );

    return await db
      .select()
      .from(vamsAssets)
      .where(and(eq(vamsAssets.status, "ready"), ...conditions))
      .orderBy(desc(vamsAssets.usageCount))
      .limit(limit);
  }

  // ============================================================================
  // VARIANTS CRUD
  // ============================================================================

  async getVariants(assetId: string): Promise<VamsAssetVariant[]> {
    return await db.select().from(vamsAssetVariants).where(eq(vamsAssetVariants.assetId, assetId));
  }

  async getVariant(
    assetId: string,
    variantType: VamsVariantType,
    format?: string
  ): Promise<VamsAssetVariant | undefined> {
    const conditions = [
      eq(vamsAssetVariants.assetId, assetId),
      eq(vamsAssetVariants.variantType, variantType),
    ];

    if (format) {
      conditions.push(eq(vamsAssetVariants.format, format));
    }

    const [variant] = await db
      .select()
      .from(vamsAssetVariants)
      .where(and(...conditions));

    return variant;
  }

  async createVariant(data: InsertVamsAssetVariant): Promise<VamsAssetVariant> {
    const [variant] = await db
      .insert(vamsAssetVariants)
      .values(data as any)
      .returning();
    return variant;
  }

  async deleteVariants(assetId: string): Promise<boolean> {
    await db.delete(vamsAssetVariants).where(eq(vamsAssetVariants.assetId, assetId));
    return true;
  }

  // ============================================================================
  // CONTENT-ASSET RELATIONSHIPS
  // ============================================================================

  async getContentAssets(contentId: string): Promise<(VamsContentAsset & { asset?: VamsAsset })[]> {
    const relationships = await db
      .select()
      .from(vamsContentAssets)
      .where(eq(vamsContentAssets.contentId, contentId))
      .orderBy(vamsContentAssets.position);

    // Enrich with asset data
    const enriched = await Promise.all(
      relationships.map(async rel => {
        const asset = await this.getAsset(rel.assetId);
        return { ...rel, asset };
      })
    );

    return enriched;
  }

  async getAssetContents(assetId: string): Promise<VamsContentAsset[]> {
    return await db.select().from(vamsContentAssets).where(eq(vamsContentAssets.assetId, assetId));
  }

  async linkAssetToContent(data: InsertVamsContentAsset): Promise<VamsContentAsset> {
    const contentId = (data as any).contentId;
    const assetId = (data as any).assetId;
    const role = (data as any).role;

    // Check if link already exists
    const existing = await db
      .select()
      .from(vamsContentAssets)
      .where(
        and(
          eq(vamsContentAssets.contentId, contentId),
          eq(vamsContentAssets.assetId, assetId),
          eq(vamsContentAssets.role, role)
        )
      );

    if (existing.length > 0) {
      return existing[0];
    }

    const [relationship] = await db
      .insert(vamsContentAssets)
      .values(data as any)
      .returning();

    // Increment usage count
    await this.incrementAssetUsage(assetId);

    return relationship;
  }

  async unlinkAssetFromContent(contentId: string, assetId: string, role: string): Promise<boolean> {
    await db
      .delete(vamsContentAssets)
      .where(
        and(
          eq(vamsContentAssets.contentId, contentId),
          eq(vamsContentAssets.assetId, assetId),
          eq(vamsContentAssets.role, role)
        )
      );
    return true;
  }

  async getContentImageByRole(
    contentId: string,
    role: string
  ): Promise<(VamsContentAsset & { asset?: VamsAsset }) | undefined> {
    const [relationship] = await db
      .select()
      .from(vamsContentAssets)
      .where(and(eq(vamsContentAssets.contentId, contentId), eq(vamsContentAssets.role, role)));

    if (!relationship) return undefined;

    const asset = await this.getAsset(relationship.assetId);
    return { ...relationship, asset };
  }

  // ============================================================================
  // SEARCH CACHE
  // ============================================================================

  private hashQuery(provider: string, query: string): string {
    const normalized = `${provider}:${query.toLowerCase().trim()}`;
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  async getCachedSearch(
    provider: VamsProvider,
    query: string
  ): Promise<VamsSearchCache | undefined> {
    const hash = this.hashQuery(provider, query);

    const [cached] = await db
      .select()
      .from(vamsSearchCache)
      .where(
        and(
          eq(vamsSearchCache.provider, provider),
          eq(vamsSearchCache.queryHash, hash),
          sql`${vamsSearchCache.expiresAt} > NOW()`
        )
      );

    if (cached) {
      // Increment hit count
      await db
        .update(vamsSearchCache)
        .set({ hitCount: sql`${vamsSearchCache.hitCount} + 1` } as any)
        .where(eq(vamsSearchCache.id, cached.id));
    }

    return cached;
  }

  async cacheSearch(data: Omit<InsertVamsSearchCache, "queryHash">): Promise<VamsSearchCache> {
    const provider = (data as any).provider as VamsProvider;
    const query = (data as any).query as string;
    const hash = this.hashQuery(provider, query);

    // Upsert: delete existing and insert new
    await db
      .delete(vamsSearchCache)
      .where(and(eq(vamsSearchCache.provider, provider), eq(vamsSearchCache.queryHash, hash)));

    const [cached] = await db
      .insert(vamsSearchCache)
      .values({
        ...data,
        queryHash: hash,
      } as any)
      .returning();

    return cached;
  }

  async clearExpiredCache(): Promise<number> {
    const result = await db
      .delete(vamsSearchCache)
      .where(sql`${vamsSearchCache.expiresAt} <= NOW()`);

    return (result as any).rowCount || 0;
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  async getAssetStats(): Promise<{
    totalAssets: number;
    readyAssets: number;
    byProvider: Record<string, number>;
    totalUsage: number;
  }> {
    const assets = await this.getAssets();

    const byProvider: Record<string, number> = {};
    let totalUsage = 0;
    let readyAssets = 0;

    for (const asset of assets) {
      byProvider[asset.provider] = (byProvider[asset.provider] || 0) + 1;
      totalUsage += asset.usageCount || 0;
      if (asset.status === "ready") readyAssets++;
    }

    return {
      totalAssets: assets.length,
      readyAssets,
      byProvider,
      totalUsage,
    };
  }

  async getMostUsedAssets(limit: number = 10): Promise<VamsAsset[]> {
    return await db
      .select()
      .from(vamsAssets)
      .where(eq(vamsAssets.status, "ready"))
      .orderBy(desc(vamsAssets.usageCount))
      .limit(limit);
  }
}

export const vamsStorage = new VamsStorage();

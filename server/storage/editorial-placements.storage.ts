/**
 * Editorial Placements Storage
 * Manages where content appears on the site - headlines, featured, secondary, etc.
 */

import { eq, and, desc, or, sql, asc, lte, gte, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  editorialPlacements,
  editorialRotationHistory,
  editorialZoneConfig,
  editorialSchedule,
  type EditorialPlacement,
  type InsertEditorialPlacement,
  type EditorialRotationHistory,
  type InsertEditorialRotationHistory,
  type EditorialZoneConfig,
  type InsertEditorialZoneConfig,
  type EditorialSchedule,
  type InsertEditorialSchedule,
  type EditorialZone,
  type PlacementStatus,
  type PlacementPriority,
} from "@shared/schema";

export class EditorialPlacementsStorage {
  // ============================================================================
  // PLACEMENTS CRUD
  // ============================================================================

  /**
   * Get all placements for a zone
   */
  async getPlacementsByZone(
    zone: EditorialZone,
    options?: {
      destinationId?: string;
      status?: PlacementStatus;
      includeExpired?: boolean;
    }
  ): Promise<EditorialPlacement[]> {
    const conditions = [eq(editorialPlacements.zone, zone)];

    if (options?.destinationId) {
      conditions.push(eq(editorialPlacements.destinationId, options.destinationId));
    }

    if (options?.status) {
      conditions.push(eq(editorialPlacements.status, options.status));
    }

    if (!options?.includeExpired) {
      conditions.push(
        or(isNull(editorialPlacements.expiresAt), gte(editorialPlacements.expiresAt, new Date()))!
      );
    }

    return await db
      .select()
      .from(editorialPlacements)
      .where(and(...conditions))
      .orderBy(asc(editorialPlacements.position), desc(editorialPlacements.priority));
  }

  /**
   * Get active placements for a zone (what's currently visible)
   */
  async getActivePlacements(
    zone: EditorialZone,
    destinationId?: string
  ): Promise<EditorialPlacement[]> {
    const conditions = [
      eq(editorialPlacements.zone, zone),
      eq(editorialPlacements.status, "active"),
      lte(editorialPlacements.startsAt, new Date()),
    ];

    if (destinationId) {
      conditions.push(eq(editorialPlacements.destinationId, destinationId));
    } else {
      conditions.push(isNull(editorialPlacements.destinationId));
    }

    return await db
      .select()
      .from(editorialPlacements)
      .where(
        and(
          ...conditions,
          or(isNull(editorialPlacements.expiresAt), gte(editorialPlacements.expiresAt, new Date()))
        )
      )
      .orderBy(asc(editorialPlacements.position));
  }

  /**
   * Get a single placement by ID
   */
  async getPlacement(id: string): Promise<EditorialPlacement | undefined> {
    const [placement] = await db
      .select()
      .from(editorialPlacements)
      .where(eq(editorialPlacements.id, id));
    return placement;
  }

  /**
   * Get placement by content ID and zone
   */
  async getPlacementByContent(
    contentId: string,
    zone?: EditorialZone
  ): Promise<EditorialPlacement[]> {
    const conditions = [eq(editorialPlacements.contentId, contentId)];

    if (zone) {
      conditions.push(eq(editorialPlacements.zone, zone));
    }

    return await db
      .select()
      .from(editorialPlacements)
      .where(and(...conditions))
      .orderBy(desc(editorialPlacements.createdAt));
  }

  /**
   * Create a new placement
   */
  async createPlacement(data: InsertEditorialPlacement): Promise<EditorialPlacement> {
    const insertData = {
      ...data,
      status: (data as any).status || "active",
      startsAt: (data as any).startsAt || new Date(),
    };
    const [placement] = await db
      .insert(editorialPlacements)
      .values(insertData as any)
      .returning();
    return placement;
  }

  /**
   * Update a placement
   */
  async updatePlacement(
    id: string,
    data: Partial<InsertEditorialPlacement>
  ): Promise<EditorialPlacement | undefined> {
    const [placement] = await db
      .update(editorialPlacements)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(editorialPlacements.id, id))
      .returning();
    return placement;
  }

  /**
   * Delete a placement
   */
  async deletePlacement(id: string): Promise<boolean> {
    await db.delete(editorialPlacements).where(eq(editorialPlacements.id, id));
    return true;
  }

  /**
   * Rotate out a placement (mark as rotated, not delete)
   */
  async rotatePlacement(
    id: string,
    reason: string,
    triggeredBy: string
  ): Promise<EditorialPlacement | undefined> {
    const placement = await this.getPlacement(id);
    if (!placement) return undefined;

    // Record rotation history
    await this.createRotationHistory({
      placementId: id,
      contentIdRemoved: placement.contentId,
      zone: placement.zone,
      rotationReason: reason,
      triggeredBy,
      metricsSnapshot: {
        impressions: placement.impressions || 0,
        clicks: placement.clicks || 0,
        ctr: placement.impressions ? ((placement.clicks || 0) / placement.impressions) * 100 : 0,
      },
    });

    // Update the placement
    return await this.updatePlacement(id, {
      status: "rotated_out",
      rotatedOutAt: new Date(),
      rotatedOutReason: reason,
    } as any);
  }

  /**
   * Increment impression count
   */
  async incrementImpressions(id: string): Promise<void> {
    await db
      .update(editorialPlacements)
      .set({
        impressions: sql`${editorialPlacements.impressions} + 1`,
      } as any)
      .where(eq(editorialPlacements.id, id));
  }

  /**
   * Increment click count
   */
  async incrementClicks(id: string): Promise<void> {
    await db
      .update(editorialPlacements)
      .set({
        clicks: sql`${editorialPlacements.clicks} + 1`,
      } as any)
      .where(eq(editorialPlacements.id, id));
  }

  /**
   * Reorder placements in a zone
   */
  async reorderPlacements(zone: EditorialZone, orderedIds: string[]): Promise<boolean> {
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(editorialPlacements)
        .set({ position: i + 1, updatedAt: new Date() } as any)
        .where(and(eq(editorialPlacements.id, orderedIds[i]), eq(editorialPlacements.zone, zone)));
    }
    return true;
  }

  // ============================================================================
  // ROTATION HISTORY
  // ============================================================================

  async createRotationHistory(
    data: InsertEditorialRotationHistory
  ): Promise<EditorialRotationHistory> {
    const [history] = await db
      .insert(editorialRotationHistory)
      .values(data as any)
      .returning();
    return history;
  }

  async getRotationHistory(options?: {
    zone?: EditorialZone;
    placementId?: string;
    limit?: number;
  }): Promise<EditorialRotationHistory[]> {
    let query = db.select().from(editorialRotationHistory);
    const conditions: any[] = [];

    if (options?.zone) {
      conditions.push(eq(editorialRotationHistory.zone, options.zone));
    }

    if (options?.placementId) {
      conditions.push(eq(editorialRotationHistory.placementId, options.placementId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(editorialRotationHistory.createdAt)) as any;

    if (options?.limit) {
      query = query.limit(options.limit) as any;
    }

    return await query;
  }

  // ============================================================================
  // ZONE CONFIG
  // ============================================================================

  async getZoneConfigs(): Promise<EditorialZoneConfig[]> {
    return await db.select().from(editorialZoneConfig).orderBy(editorialZoneConfig.zone);
  }

  async getZoneConfig(zone: EditorialZone): Promise<EditorialZoneConfig | undefined> {
    const [config] = await db
      .select()
      .from(editorialZoneConfig)
      .where(eq(editorialZoneConfig.zone, zone));
    return config;
  }

  async upsertZoneConfig(data: InsertEditorialZoneConfig): Promise<EditorialZoneConfig> {
    const zone = (data as any).zone as EditorialZone;
    const existing = await this.getZoneConfig(zone);

    if (existing) {
      const [config] = await db
        .update(editorialZoneConfig)
        .set({ ...data, updatedAt: new Date() } as any)
        .where(eq(editorialZoneConfig.zone, zone))
        .returning();
      return config;
    }

    const [config] = await db
      .insert(editorialZoneConfig)
      .values(data as any)
      .returning();
    return config;
  }

  // ============================================================================
  // SCHEDULING
  // ============================================================================

  async getScheduledItems(options?: {
    zone?: EditorialZone;
    pendingOnly?: boolean;
    from?: Date;
    to?: Date;
  }): Promise<EditorialSchedule[]> {
    const conditions: any[] = [];

    if (options?.zone) {
      conditions.push(eq(editorialSchedule.zone, options.zone));
    }

    if (options?.pendingOnly) {
      conditions.push(eq(editorialSchedule.isExecuted, false));
    }

    if (options?.from) {
      conditions.push(gte(editorialSchedule.scheduledAt, options.from));
    }

    if (options?.to) {
      conditions.push(lte(editorialSchedule.scheduledAt, options.to));
    }

    let query = db.select().from(editorialSchedule);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(asc(editorialSchedule.scheduledAt));
  }

  async createScheduledItem(data: InsertEditorialSchedule): Promise<EditorialSchedule> {
    const [item] = await db
      .insert(editorialSchedule)
      .values(data as any)
      .returning();
    return item;
  }

  async updateScheduledItem(
    id: string,
    data: Partial<InsertEditorialSchedule>
  ): Promise<EditorialSchedule | undefined> {
    const [item] = await db
      .update(editorialSchedule)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(editorialSchedule.id, id))
      .returning();
    return item;
  }

  async markScheduleExecuted(
    id: string,
    placementId: string
  ): Promise<EditorialSchedule | undefined> {
    const [item] = await db
      .update(editorialSchedule)
      .set({
        isExecuted: true,
        executedAt: new Date(),
        placementId,
        updatedAt: new Date(),
      } as any)
      .where(eq(editorialSchedule.id, id))
      .returning();
    return item;
  }

  async deleteScheduledItem(id: string): Promise<boolean> {
    await db.delete(editorialSchedule).where(eq(editorialSchedule.id, id));
    return true;
  }

  /**
   * Get scheduled items ready to execute (scheduled time has passed)
   */
  async getDueScheduledItems(): Promise<EditorialSchedule[]> {
    return await db
      .select()
      .from(editorialSchedule)
      .where(
        and(eq(editorialSchedule.isExecuted, false), lte(editorialSchedule.scheduledAt, new Date()))
      )
      .orderBy(asc(editorialSchedule.scheduledAt));
  }

  // ============================================================================
  // AUTO-ROTATION HELPERS
  // ============================================================================

  /**
   * Get placements that need rotation (based on zone config)
   */
  async getPlacementsNeedingRotation(): Promise<
    Array<{ placement: EditorialPlacement; config: EditorialZoneConfig }>
  > {
    const configs = await this.getZoneConfigs();
    const results: Array<{ placement: EditorialPlacement; config: EditorialZoneConfig }> = [];

    for (const config of configs) {
      if (!config.autoRotate || !config.isActive) continue;

      const activePlacements = await this.getActivePlacements(config.zone as EditorialZone);

      for (const placement of activePlacements) {
        if (placement.isPinned) continue; // Don't rotate pinned items

        const ageMinutes = Math.floor(
          (Date.now() - new Date(placement.startsAt!).getTime()) / 60000
        );

        if (ageMinutes >= (config.rotationIntervalMinutes || 240)) {
          results.push({ placement, config });
        }
      }
    }

    return results;
  }

  /**
   * Get expired placements that should be removed
   */
  async getExpiredPlacements(): Promise<EditorialPlacement[]> {
    return await db
      .select()
      .from(editorialPlacements)
      .where(
        and(
          eq(editorialPlacements.status, "active"),
          lte(editorialPlacements.expiresAt, new Date())
        )
      );
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Get placement stats for a zone
   */
  async getZoneStats(zone: EditorialZone): Promise<{
    totalPlacements: number;
    activePlacements: number;
    totalImpressions: number;
    totalClicks: number;
    avgCtr: number;
  }> {
    const placements = await this.getPlacementsByZone(zone, { includeExpired: true });

    const active = placements.filter(p => p.status === "active");
    const totalImpressions = placements.reduce((sum, p) => sum + (p.impressions || 0), 0);
    const totalClicks = placements.reduce((sum, p) => sum + (p.clicks || 0), 0);

    return {
      totalPlacements: placements.length,
      activePlacements: active.length,
      totalImpressions,
      totalClicks,
      avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    };
  }

  /**
   * Get top performing content by zone
   */
  async getTopPerformingContent(
    zone: EditorialZone,
    limit: number = 10
  ): Promise<EditorialPlacement[]> {
    return await db
      .select()
      .from(editorialPlacements)
      .where(eq(editorialPlacements.zone, zone))
      .orderBy(desc(editorialPlacements.clicks))
      .limit(limit);
  }
}

export const editorialPlacementsStorage = new EditorialPlacementsStorage();

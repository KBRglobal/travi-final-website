/**
 * Content Inventory Exporter - Entity Export
 */

import { createLogger } from "../lib/logger";
import { EXPORTS_CONFIG } from "./config";
import type { EntityExportRow, ExportOptions, ExportResult } from "./types";
import { db } from "../db";
import { destinations, attractions, hotels, contents } from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";

const logger = createLogger("entity-exporter");

// ============================================================================
// Data Source
// ============================================================================

export function fetchEntityRows(
  entityType: string,
  options?: {
    limit?: number;
    offset?: number;
    filters?: {
      destinationId?: string;
    };
  }
): EntityExportRow[] {
  // Synchronous wrapper kept for backward compatibility
  return [];
}

async function fetchEntityRowsAsync(
  entityType: string,
  options?: {
    limit?: number;
    offset?: number;
    filters?: {
      destinationId?: string;
    };
  }
): Promise<EntityExportRow[]> {
  try {
    const limit = options?.limit || 1000;
    const offset = options?.offset || 0;

    if (entityType === "destinations") {
      const rows = await db
        .select({
          id: destinations.id,
          name: destinations.name,
          country: destinations.country,
          status: destinations.status,
          slug: destinations.slug,
        })
        .from(destinations)
        .limit(limit)
        .offset(offset);

      return rows.map(row => ({
        id: row.id,
        name: row.name,
        type: "destination",
        destinationId: null,
        contentCount: 0,
        lastUpdated: new Date().toISOString(),
        status: row.status,
        website: null,
        phone: null,
      }));
    }

    if (entityType === "attractions") {
      const rows = await db
        .select({
          id: attractions.id,
          contentId: attractions.contentId,
          destinationId: attractions.destinationId,
          title: contents.title,
          status: contents.status,
          updatedAt: contents.updatedAt,
        })
        .from(attractions)
        .leftJoin(contents, eq(attractions.contentId, contents.id))
        .limit(limit)
        .offset(offset);

      return rows.map(row => ({
        id: row.id,
        name: row.title || "Untitled",
        type: "attraction",
        destinationId: row.destinationId,
        contentCount: 1,
        lastUpdated: row.updatedAt?.toISOString() || new Date().toISOString(),
        status: row.status || "draft",
        website: null,
        phone: null,
      }));
    }

    if (entityType === "hotels") {
      const rows = await db
        .select({
          id: hotels.id,
          contentId: hotels.contentId,
          destinationId: hotels.destinationId,
          title: contents.title,
          status: contents.status,
          updatedAt: contents.updatedAt,
        })
        .from(hotels)
        .leftJoin(contents, eq(hotels.contentId, contents.id))
        .limit(limit)
        .offset(offset);

      return rows.map(row => ({
        id: row.id,
        name: row.title || "Untitled",
        type: "hotel",
        destinationId: row.destinationId,
        contentCount: 1,
        lastUpdated: row.updatedAt?.toISOString() || new Date().toISOString(),
        status: row.status || "draft",
        website: null,
        phone: null,
      }));
    }

    return [];
  } catch (error) {
    logger.error({ error, entityType }, "Failed to fetch entity rows from DB");
    return [];
  }
}

// ============================================================================
// CSV Generation
// ============================================================================

const ENTITY_CSV_HEADERS = [
  "id",
  "name",
  "type",
  "destinationId",
  "contentCount",
  "lastUpdated",
  "status",
  "website",
  "phone",
];

function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCSV(row: EntityExportRow): string {
  return ENTITY_CSV_HEADERS.map(header => {
    const value = row[header as keyof EntityExportRow];
    return escapeCSVValue(value);
  }).join(",");
}

// ============================================================================
// Export Functions
// ============================================================================

export async function exportEntitiesAsCSV(
  entityType: string,
  options?: ExportOptions
): Promise<ExportResult> {
  const limit = Math.min(
    options?.limit || EXPORTS_CONFIG.defaultLimit,
    EXPORTS_CONFIG.maxExportRows
  );

  const rows = await fetchEntityRowsAsync(entityType, {
    limit,
    offset: options?.offset,
    filters: options?.filters,
  });

  const lines: string[] = [];

  if (options?.includeHeaders !== false) {
    lines.push(ENTITY_CSV_HEADERS.join(","));
  }

  for (const row of rows) {
    lines.push(rowToCSV(row));
  }

  const data = lines.join("\n");

  logger.info({ entityType, rowCount: rows.length }, "Entity CSV export generated");

  return {
    data,
    contentType: "text/csv",
    filename: `${entityType}-${Date.now()}.csv`,
    rowCount: rows.length,
    generatedAt: new Date(),
  };
}

export async function exportEntitiesAsJSON(
  entityType: string,
  options?: ExportOptions
): Promise<ExportResult> {
  const limit = Math.min(
    options?.limit || EXPORTS_CONFIG.defaultLimit,
    EXPORTS_CONFIG.maxExportRows
  );

  const rows = await fetchEntityRowsAsync(entityType, {
    limit,
    offset: options?.offset,
    filters: options?.filters,
  });

  const data = JSON.stringify(
    { entityType, entities: rows, exportedAt: new Date().toISOString() },
    null,
    2
  );

  logger.info({ entityType, rowCount: rows.length }, "Entity JSON export generated");

  return {
    data,
    contentType: "application/json",
    filename: `${entityType}-${Date.now()}.json`,
    rowCount: rows.length,
    generatedAt: new Date(),
  };
}

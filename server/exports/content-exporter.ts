/**
 * Content Inventory Exporter - Content Export
 */

import { createLogger } from "../lib/logger";
import { EXPORTS_CONFIG } from "./config";
import type { ContentExportRow, ExportOptions, ExportResult } from "./types";
import { db } from "../db";
import { contents, internalLinks } from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";

const logger = createLogger("content-exporter");

// ============================================================================
// Data Source
// ============================================================================

export function fetchContentRows(options?: {
  limit?: number;
  offset?: number;
  filters?: {
    status?: string;
    type?: string;
    locale?: string;
  };
}): ContentExportRow[] {
  // Synchronous wrapper - actual query happens in async export functions
  // This signature is kept for backward compatibility
  return [];
}

async function fetchContentRowsAsync(options?: {
  limit?: number;
  offset?: number;
  filters?: {
    status?: string;
    type?: string;
    locale?: string;
  };
}): Promise<ContentExportRow[]> {
  try {
    const limit = options?.limit || 1000;
    const offset = options?.offset || 0;

    const rows = await db
      .select({
        id: contents.id,
        title: contents.title,
        status: contents.status,
        type: contents.type,
        publishedAt: contents.publishedAt,
        updatedAt: contents.updatedAt,
        createdAt: contents.createdAt,
        slug: contents.slug,
        authorId: contents.authorId,
        aeoScore: contents.aeoScore,
        answerCapsule: contents.answerCapsule,
        seoScore: contents.seoScore,
      })
      .from(contents)
      .orderBy(desc(contents.updatedAt))
      .limit(limit)
      .offset(offset);

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      status: row.status,
      locale: "en",
      type: row.type,
      publishedAt: row.publishedAt?.toISOString() || null,
      updatedAt: row.updatedAt?.toISOString() || new Date().toISOString(),
      createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
      entityLinksCount: 0,
      searchIndexed: row.status === "published",
      aeoExists: Boolean(row.answerCapsule),
      readinessScore: row.seoScore,
      slug: row.slug,
      authorId: row.authorId,
    }));
  } catch (error) {
    logger.error({ error }, "Failed to fetch content rows from DB");
    return [];
  }
}

// ============================================================================
// CSV Generation
// ============================================================================

const CONTENT_CSV_HEADERS = [
  "id",
  "title",
  "status",
  "locale",
  "type",
  "publishedAt",
  "updatedAt",
  "createdAt",
  "entityLinksCount",
  "searchIndexed",
  "aeoExists",
  "readinessScore",
  "slug",
  "authorId",
];

function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCSV(row: ContentExportRow): string {
  return CONTENT_CSV_HEADERS.map(header => {
    const value = row[header as keyof ContentExportRow];
    return escapeCSVValue(value);
  }).join(",");
}

// ============================================================================
// Export Functions
// ============================================================================

export async function exportContentsAsCSV(options?: ExportOptions): Promise<ExportResult> {
  const limit = Math.min(
    options?.limit || EXPORTS_CONFIG.defaultLimit,
    EXPORTS_CONFIG.maxExportRows
  );

  const rows = await fetchContentRowsAsync({
    limit,
    offset: options?.offset,
    filters: options?.filters,
  });

  const lines: string[] = [];

  if (options?.includeHeaders !== false) {
    lines.push(CONTENT_CSV_HEADERS.join(","));
  }

  for (const row of rows) {
    lines.push(rowToCSV(row));
  }

  const data = lines.join("\n");

  logger.info({ rowCount: rows.length }, "Content CSV export generated");

  return {
    data,
    contentType: "text/csv",
    filename: `contents-${Date.now()}.csv`,
    rowCount: rows.length,
    generatedAt: new Date(),
  };
}

export async function exportContentsAsJSON(options?: ExportOptions): Promise<ExportResult> {
  const limit = Math.min(
    options?.limit || EXPORTS_CONFIG.defaultLimit,
    EXPORTS_CONFIG.maxExportRows
  );

  const rows = await fetchContentRowsAsync({
    limit,
    offset: options?.offset,
    filters: options?.filters,
  });

  const data = JSON.stringify({ contents: rows, exportedAt: new Date().toISOString() }, null, 2);

  logger.info({ rowCount: rows.length }, "Content JSON export generated");

  return {
    data,
    contentType: "application/json",
    filename: `contents-${Date.now()}.json`,
    rowCount: rows.length,
    generatedAt: new Date(),
  };
}

/**
 * Content Inventory Exporter - Entity Export
 */

import { createLogger } from '../lib/logger';
import { EXPORTS_CONFIG } from './config';
import type { EntityExportRow, ExportOptions, ExportResult } from './types';

const logger = createLogger('entity-exporter');

// ============================================================================
// Mock Data Source (would use DB in production)
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
  // Simulated empty result - in production this queries the DB
  return [];
}

// ============================================================================
// CSV Generation
// ============================================================================

const ENTITY_CSV_HEADERS = [
  'id',
  'name',
  'type',
  'destinationId',
  'contentCount',
  'lastUpdated',
  'status',
  'website',
  'phone',
];

function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCSV(row: EntityExportRow): string {
  return ENTITY_CSV_HEADERS.map(header => {
    const value = row[header as keyof EntityExportRow];
    return escapeCSVValue(value);
  }).join(',');
}

// ============================================================================
// Export Functions
// ============================================================================

export function exportEntitiesAsCSV(
  entityType: string,
  options?: ExportOptions
): ExportResult {
  const limit = Math.min(
    options?.limit || EXPORTS_CONFIG.defaultLimit,
    EXPORTS_CONFIG.maxExportRows
  );

  const rows = fetchEntityRows(entityType, {
    limit,
    offset: options?.offset,
    filters: options?.filters,
  });

  const lines: string[] = [];

  if (options?.includeHeaders !== false) {
    lines.push(ENTITY_CSV_HEADERS.join(','));
  }

  for (const row of rows) {
    lines.push(rowToCSV(row));
  }

  const data = lines.join('\n');

  logger.info({ entityType, rowCount: rows.length }, 'Entity CSV export generated');

  return {
    data,
    contentType: 'text/csv',
    filename: `${entityType}-${Date.now()}.csv`,
    rowCount: rows.length,
    generatedAt: new Date(),
  };
}

export function exportEntitiesAsJSON(
  entityType: string,
  options?: ExportOptions
): ExportResult {
  const limit = Math.min(
    options?.limit || EXPORTS_CONFIG.defaultLimit,
    EXPORTS_CONFIG.maxExportRows
  );

  const rows = fetchEntityRows(entityType, {
    limit,
    offset: options?.offset,
    filters: options?.filters,
  });

  const data = JSON.stringify(
    { entityType, entities: rows, exportedAt: new Date().toISOString() },
    null,
    2
  );

  logger.info({ entityType, rowCount: rows.length }, 'Entity JSON export generated');

  return {
    data,
    contentType: 'application/json',
    filename: `${entityType}-${Date.now()}.json`,
    rowCount: rows.length,
    generatedAt: new Date(),
  };
}

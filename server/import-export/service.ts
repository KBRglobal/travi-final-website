/**
 * Import/Export System - Service
 */

import { log } from '../lib/logger';
import type {
  ExportRequest,
  ExportResult,
  ExportFormat,
  ImportRequest,
  ImportResult,
  ImportValidationResult,
  ValidationError,
  ContentExportRecord,
  ContentImportRecord,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ImportExport] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[ImportExport] ${msg}`, data),
};

// Bounded storage for results
const MAX_RESULTS = 100;

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Simulated data source (in production would query actual DB)
 */
function getContentData(): ContentExportRecord[] {
  // Simulated content records
  return [
    {
      id: 'content-1',
      title: 'Sample Content 1',
      slug: 'sample-content-1',
      status: 'published',
      content: 'This is sample content.',
      metadata: { category: 'blog' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    },
  ];
}

function getEntityData(): Record<string, unknown>[] {
  return [];
}

function getRedirectData(): Record<string, unknown>[] {
  return [];
}

class ImportExportService {
  private exportResults: Map<string, ExportResult> = new Map();
  private importResults: Map<string, ImportResult> = new Map();
  private enabled = false;

  constructor() {
    this.enabled = process.env.ENABLE_IMPORT_EXPORT === 'true';
    if (this.enabled) {
      logger.info('Import/Export Service initialized');
    }
  }

  // ============================================================
  // EXPORT
  // ============================================================

  /**
   * Export data
   */
  async export(request: ExportRequest): Promise<ExportResult> {
    const format = request.format || 'json';
    const entityCounts: Record<string, number> = {};
    const allData: Record<string, unknown[]> = {};

    for (const entityType of request.entityTypes) {
      let data: unknown[] = [];

      switch (entityType) {
        case 'contents':
          data = this.exportContents(request.filters);
          break;
        case 'entities':
          data = this.exportEntities(request.filters);
          break;
        case 'redirects':
          data = this.exportRedirects(request.filters);
          break;
      }

      allData[entityType] = data;
      entityCounts[entityType] = data.length;
    }

    const totalRecords = Object.values(entityCounts).reduce((a, b) => a + b, 0);

    const result: ExportResult = {
      id: generateId('export'),
      timestamp: new Date(),
      request,
      status: 'completed',
      format,
      entityCounts,
      totalRecords,
      data: request.includeMetadata
        ? { metadata: { exportedAt: new Date(), version: '1.0' }, data: allData }
        : allData,
    };

    this.storeExportResult(result);

    logger.info('Export completed', {
      id: result.id,
      entityTypes: request.entityTypes,
      totalRecords,
    });

    return result;
  }

  /**
   * Export contents
   */
  private exportContents(filters?: ExportRequest['filters']): ContentExportRecord[] {
    let data = getContentData();

    if (filters?.status?.length) {
      data = data.filter(c => filters.status!.includes(c.status));
    }

    if (filters?.ids?.length) {
      data = data.filter(c => filters.ids!.includes(c.id));
    }

    if (filters?.limit) {
      data = data.slice(0, filters.limit);
    }

    return data;
  }

  /**
   * Export entities
   */
  private exportEntities(filters?: ExportRequest['filters']): Record<string, unknown>[] {
    return getEntityData();
  }

  /**
   * Export redirects
   */
  private exportRedirects(filters?: ExportRequest['filters']): Record<string, unknown>[] {
    return getRedirectData();
  }

  // ============================================================
  // IMPORT
  // ============================================================

  /**
   * Validate import data
   */
  validateImport(request: ImportRequest): ImportValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    let validRecords = 0;

    for (let i = 0; i < request.data.length; i++) {
      const record = request.data[i] as ContentImportRecord;
      let valid = true;

      // Validate required fields
      if (!record.title || typeof record.title !== 'string') {
        errors.push({
          index: i,
          field: 'title',
          value: record.title,
          message: 'Title is required and must be a string',
        });
        valid = false;
      }

      if (!record.content || typeof record.content !== 'string') {
        errors.push({
          index: i,
          field: 'content',
          value: record.content,
          message: 'Content is required and must be a string',
        });
        valid = false;
      }

      // Validate slug format
      if (record.slug && !/^[a-z0-9-]+$/.test(record.slug)) {
        errors.push({
          index: i,
          field: 'slug',
          value: record.slug,
          message: 'Slug must be lowercase alphanumeric with hyphens only',
        });
        valid = false;
      }

      // Validate title length
      if (record.title && record.title.length > 500) {
        errors.push({
          index: i,
          field: 'title',
          value: record.title.substring(0, 50) + '...',
          message: 'Title must be 500 characters or less',
        });
        valid = false;
      }

      if (valid) {
        validRecords++;
      }
    }

    // Add warnings
    if (request.data.length > 100) {
      warnings.push(`Large import: ${request.data.length} records may take time to process`);
    }

    return {
      valid: errors.length === 0,
      totalRecords: request.data.length,
      validRecords,
      invalidRecords: request.data.length - validRecords,
      errors,
      warnings,
    };
  }

  /**
   * Run dry-run import
   */
  async dryRun(request: ImportRequest): Promise<ImportResult> {
    const validation = this.validateImport(request);

    const result: ImportResult = {
      id: generateId('import-dry'),
      timestamp: new Date(),
      mode: 'dry-run',
      entityType: request.entityType,
      status: validation.valid ? 'completed' : 'failed',
      totalRecords: request.data.length,
      imported: 0,
      skipped: 0,
      failed: validation.invalidRecords,
      validation,
    };

    this.storeImportResult(result);

    logger.info('Dry-run completed', {
      id: result.id,
      valid: validation.valid,
      errors: validation.errors.length,
    });

    return result;
  }

  /**
   * Apply import
   */
  async applyImport(request: ImportRequest): Promise<ImportResult> {
    const validation = this.validateImport(request);

    // Don't proceed if validation fails
    if (!validation.valid) {
      const result: ImportResult = {
        id: generateId('import'),
        timestamp: new Date(),
        mode: 'apply',
        entityType: request.entityType,
        status: 'failed',
        totalRecords: request.data.length,
        imported: 0,
        skipped: 0,
        failed: validation.invalidRecords,
        validation,
        errors: validation.errors.map(e => ({
          index: e.index,
          error: e.message,
        })),
      };

      this.storeImportResult(result);
      return result;
    }

    // Process import (all or nothing for data integrity)
    const importedIds: string[] = [];
    const errors: { index: number; error: string }[] = [];
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < request.data.length; i++) {
      const record = request.data[i] as ContentImportRecord;

      try {
        // In production, this would create actual content
        const newId = generateId('content');

        // Check for duplicates if option set
        if (request.options?.skipDuplicates) {
          // Would check for existing slug/title
          // For now, just import
        }

        // Simulated import
        importedIds.push(newId);
        imported++;
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const status = errors.length === 0 ? 'completed' :
                   imported > 0 ? 'partial' : 'failed';

    const result: ImportResult = {
      id: generateId('import'),
      timestamp: new Date(),
      mode: 'apply',
      entityType: request.entityType,
      status,
      totalRecords: request.data.length,
      imported,
      skipped,
      failed: errors.length,
      validation,
      importedIds,
      errors: errors.length > 0 ? errors : undefined,
    };

    this.storeImportResult(result);

    logger.info('Import completed', {
      id: result.id,
      status,
      imported,
      failed: errors.length,
    });

    return result;
  }

  // ============================================================
  // RESULTS
  // ============================================================

  /**
   * Get export result
   */
  getExportResult(id: string): ExportResult | undefined {
    return this.exportResults.get(id);
  }

  /**
   * Get import result
   */
  getImportResult(id: string): ImportResult | undefined {
    return this.importResults.get(id);
  }

  /**
   * Store export result
   */
  private storeExportResult(result: ExportResult): void {
    this.exportResults.set(result.id, result);
    this.enforceLimit(this.exportResults);
  }

  /**
   * Store import result
   */
  private storeImportResult(result: ImportResult): void {
    this.importResults.set(result.id, result);
    this.enforceLimit(this.importResults);
  }

  /**
   * Enforce storage limit
   */
  private enforceLimit(map: Map<string, unknown>): void {
    if (map.size <= MAX_RESULTS) return;

    // Remove oldest entries
    const entries = Array.from(map.entries());
    for (let i = 0; i < map.size - MAX_RESULTS; i++) {
      map.delete(entries[i][0]);
    }
  }

  /**
   * Clear all results (for testing)
   */
  clear(): void {
    this.exportResults.clear();
    this.importResults.clear();
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton
let instance: ImportExportService | null = null;

export function getImportExportService(): ImportExportService {
  if (!instance) {
    instance = new ImportExportService();
  }
  return instance;
}

export function resetImportExportService(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}

export { ImportExportService };

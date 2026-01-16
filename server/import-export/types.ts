/**
 * Import/Export System - Types
 */

export type ExportFormat = 'json' | 'csv';

export type ExportEntityType = 'contents' | 'entities' | 'redirects';

export type ImportEntityType = 'contents';

export type ImportMode = 'dry-run' | 'apply';

/**
 * Export request
 */
export interface ExportRequest {
  entityTypes: ExportEntityType[];
  format?: ExportFormat;
  filters?: ExportFilters;
  includeMetadata?: boolean;
}

/**
 * Export filters
 */
export interface ExportFilters {
  status?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  ids?: string[];
  limit?: number;
}

/**
 * Export result
 */
export interface ExportResult {
  id: string;
  timestamp: Date;
  request: ExportRequest;
  status: 'completed' | 'failed';
  format: ExportFormat;
  entityCounts: Record<string, number>;
  totalRecords: number;
  data: unknown;  // The actual exported data
  error?: string;
}

/**
 * Import request
 */
export interface ImportRequest {
  entityType: ImportEntityType;
  mode: ImportMode;
  data: unknown[];
  options?: ImportOptions;
}

/**
 * Import options
 */
export interface ImportOptions {
  skipDuplicates?: boolean;
  updateExisting?: boolean;
  validateOnly?: boolean;
}

/**
 * Validation error
 */
export interface ValidationError {
  index: number;
  field: string;
  value: unknown;
  message: string;
}

/**
 * Import validation result
 */
export interface ImportValidationResult {
  valid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Import result
 */
export interface ImportResult {
  id: string;
  timestamp: Date;
  mode: ImportMode;
  entityType: ImportEntityType;
  status: 'completed' | 'failed' | 'partial';

  // Stats
  totalRecords: number;
  imported: number;
  skipped: number;
  failed: number;

  // Validation
  validation: ImportValidationResult;

  // Details
  importedIds?: string[];
  errors?: { index: number; error: string }[];
}

/**
 * Content export record
 */
export interface ContentExportRecord {
  id: string;
  title: string;
  slug: string;
  status: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

/**
 * Content import record
 */
export interface ContentImportRecord {
  title: string;
  slug?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Entity export record
 */
export interface EntityExportRecord {
  id: string;
  type: string;
  name: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Redirect export record
 */
export interface RedirectExportRecord {
  id: string;
  source: string;
  destination: string;
  type: 'permanent' | 'temporary';
  createdAt: string;
}

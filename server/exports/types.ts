/**
 * Content Inventory Exporter - Type Definitions
 * Feature Flag: ENABLE_EXPORTS=true
 */

export type ExportFormat = 'csv' | 'json';
export type ExportType = 'contents' | 'entities';

export interface ContentExportRow {
  id: string;
  title: string;
  status: string;
  locale: string;
  type: string;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  entityLinksCount: number;
  searchIndexed: boolean;
  aeoExists: boolean;
  readinessScore: number | null;
  slug: string | null;
  authorId: string | null;
}

export interface EntityExportRow {
  id: string;
  name: string;
  type: string;
  destinationId: string | null;
  contentCount: number;
  lastUpdated: string;
  status: string;
  website: string | null;
  phone: string | null;
}

export interface ExportOptions {
  format: ExportFormat;
  includeHeaders?: boolean;
  limit?: number;
  offset?: number;
  filters?: {
    status?: string;
    type?: string;
    locale?: string;
    destinationId?: string;
  };
}

export interface ExportResult {
  data: string;
  contentType: string;
  filename: string;
  rowCount: number;
  generatedAt: Date;
}

export interface ExportsStatus {
  enabled: boolean;
  config: {
    maxExportRows: number;
    supportedFormats: ExportFormat[];
  };
}

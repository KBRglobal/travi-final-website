/**
 * Content Inventory Exporter - Configuration
 * Feature Flag: ENABLE_EXPORTS=true
 */

export function isExportsEnabled(): boolean {
  return process.env.ENABLE_EXPORTS === 'true';
}

export const EXPORTS_CONFIG = {
  // Maximum rows to export
  maxExportRows: parseInt(process.env.EXPORT_MAX_ROWS || '10000', 10),

  // Default limit per request
  defaultLimit: parseInt(process.env.EXPORT_DEFAULT_LIMIT || '1000', 10),

  // Supported formats
  supportedFormats: ['csv', 'json'] as const,
} as const;

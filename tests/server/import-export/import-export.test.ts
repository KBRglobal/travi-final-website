/**
 * Unit Tests - Import/Export System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../server/lib/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('Import/Export Service', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_IMPORT_EXPORT = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_IMPORT_EXPORT;
  });

  it('should initialize when enabled', async () => {
    const { getImportExportService, resetImportExportService } = await import(
      '../../../server/import-export/service'
    );

    resetImportExportService();
    const service = getImportExportService();
    expect(service.isEnabled()).toBe(true);
  });

  describe('Export', () => {
    it('should export contents', async () => {
      const { getImportExportService, resetImportExportService } = await import(
        '../../../server/import-export/service'
      );

      resetImportExportService();
      const service = getImportExportService();

      const result = await service.export({
        entityTypes: ['contents'],
      });

      expect(result.id).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.entityCounts['contents']).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should export multiple entity types', async () => {
      const { getImportExportService, resetImportExportService } = await import(
        '../../../server/import-export/service'
      );

      resetImportExportService();
      const service = getImportExportService();

      const result = await service.export({
        entityTypes: ['contents', 'entities', 'redirects'],
      });

      expect(result.entityCounts['contents']).toBeDefined();
      expect(result.entityCounts['entities']).toBeDefined();
      expect(result.entityCounts['redirects']).toBeDefined();
    });

    it('should include metadata when requested', async () => {
      const { getImportExportService, resetImportExportService } = await import(
        '../../../server/import-export/service'
      );

      resetImportExportService();
      const service = getImportExportService();

      const result = await service.export({
        entityTypes: ['contents'],
        includeMetadata: true,
      });

      const data = result.data as { metadata: unknown; data: unknown };
      expect(data.metadata).toBeDefined();
    });

    it('should store export result', async () => {
      const { getImportExportService, resetImportExportService } = await import(
        '../../../server/import-export/service'
      );

      resetImportExportService();
      const service = getImportExportService();

      const result = await service.export({ entityTypes: ['contents'] });
      const retrieved = service.getExportResult(result.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(result.id);
    });
  });

  describe('Import Validation', () => {
    it('should validate import data', async () => {
      const { getImportExportService, resetImportExportService } = await import(
        '../../../server/import-export/service'
      );

      resetImportExportService();
      const service = getImportExportService();

      const result = service.validateImport({
        entityType: 'contents',
        mode: 'dry-run',
        data: [
          { title: 'Valid Content', content: 'Some content here' },
        ],
      });

      expect(result.valid).toBe(true);
      expect(result.validRecords).toBe(1);
      expect(result.errors.length).toBe(0);
    });

    it('should detect missing required fields', async () => {
      const { getImportExportService, resetImportExportService } = await import(
        '../../../server/import-export/service'
      );

      resetImportExportService();
      const service = getImportExportService();

      const result = service.validateImport({
        entityType: 'contents',
        mode: 'dry-run',
        data: [
          { title: 'Missing Content' }, // Missing content field
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('content');
    });

    it('should validate slug format', async () => {
      const { getImportExportService, resetImportExportService } = await import(
        '../../../server/import-export/service'
      );

      resetImportExportService();
      const service = getImportExportService();

      const result = service.validateImport({
        entityType: 'contents',
        mode: 'dry-run',
        data: [
          { title: 'Test', content: 'Content', slug: 'Invalid Slug!' },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'slug')).toBe(true);
    });
  });

  describe('Import Dry Run', () => {
    it('should run dry-run without applying', async () => {
      const { getImportExportService, resetImportExportService } = await import(
        '../../../server/import-export/service'
      );

      resetImportExportService();
      const service = getImportExportService();

      const result = await service.dryRun({
        entityType: 'contents',
        mode: 'dry-run',
        data: [
          { title: 'Test Content', content: 'Some content' },
        ],
      });

      expect(result.mode).toBe('dry-run');
      expect(result.status).toBe('completed');
      expect(result.imported).toBe(0); // Dry run doesn't import
    });

    it('should fail dry-run with invalid data', async () => {
      const { getImportExportService, resetImportExportService } = await import(
        '../../../server/import-export/service'
      );

      resetImportExportService();
      const service = getImportExportService();

      const result = await service.dryRun({
        entityType: 'contents',
        mode: 'dry-run',
        data: [
          { title: '', content: '' }, // Invalid
        ],
      });

      expect(result.status).toBe('failed');
      expect(result.validation.valid).toBe(false);
    });
  });

  describe('Import Apply', () => {
    it('should apply valid import', async () => {
      const { getImportExportService, resetImportExportService } = await import(
        '../../../server/import-export/service'
      );

      resetImportExportService();
      const service = getImportExportService();

      const result = await service.applyImport({
        entityType: 'contents',
        mode: 'apply',
        data: [
          { title: 'Test Content', content: 'Some content' },
        ],
      });

      expect(result.mode).toBe('apply');
      expect(result.status).toBe('completed');
      expect(result.imported).toBe(1);
      expect(result.importedIds?.length).toBe(1);
    });

    it('should fail apply with invalid data', async () => {
      const { getImportExportService, resetImportExportService } = await import(
        '../../../server/import-export/service'
      );

      resetImportExportService();
      const service = getImportExportService();

      const result = await service.applyImport({
        entityType: 'contents',
        mode: 'apply',
        data: [
          { title: '', content: '' }, // Invalid
        ],
      });

      expect(result.status).toBe('failed');
      expect(result.imported).toBe(0);
    });
  });
});

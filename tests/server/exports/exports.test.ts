/**
 * Tests for Content Inventory Exporter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubEnv('ENABLE_EXPORTS', 'true');

import { isExportsEnabled, EXPORTS_CONFIG } from '../../../server/exports/config';
import { exportContentsAsCSV, exportContentsAsJSON } from '../../../server/exports/content-exporter';
import { exportEntitiesAsCSV, exportEntitiesAsJSON } from '../../../server/exports/entity-exporter';

describe('Content Inventory Exporter', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_EXPORTS', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Feature Flag', () => {
    it('should be enabled when env is true', () => {
      vi.stubEnv('ENABLE_EXPORTS', 'true');
      expect(isExportsEnabled()).toBe(true);
    });

    it('should be disabled when env is not set', () => {
      vi.stubEnv('ENABLE_EXPORTS', '');
      expect(isExportsEnabled()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should have max export rows configured', () => {
      expect(EXPORTS_CONFIG.maxExportRows).toBeGreaterThan(0);
    });

    it('should support csv and json formats', () => {
      expect(EXPORTS_CONFIG.supportedFormats).toContain('csv');
      expect(EXPORTS_CONFIG.supportedFormats).toContain('json');
    });
  });

  describe('Content Export', () => {
    it('should export contents as CSV', () => {
      const result = exportContentsAsCSV({ format: 'csv', includeHeaders: true });

      expect(result.contentType).toBe('text/csv');
      expect(result.filename).toMatch(/contents-\d+\.csv/);
      expect(result.data).toContain('id,title,status');
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should export contents as CSV without headers', () => {
      const result = exportContentsAsCSV({ format: 'csv', includeHeaders: false });

      expect(result.data).not.toContain('id,title,status');
    });

    it('should export contents as JSON', () => {
      const result = exportContentsAsJSON({ format: 'json' });

      expect(result.contentType).toBe('application/json');
      expect(result.filename).toMatch(/contents-\d+\.json/);

      const parsed = JSON.parse(result.data);
      expect(parsed.contents).toBeDefined();
      expect(parsed.exportedAt).toBeDefined();
    });

    it('should respect limit option', () => {
      const result = exportContentsAsCSV({ format: 'csv', limit: 10 });
      expect(result.rowCount).toBeLessThanOrEqual(10);
    });
  });

  describe('Entity Export', () => {
    it('should export entities as CSV', () => {
      const result = exportEntitiesAsCSV('hotels', { format: 'csv', includeHeaders: true });

      expect(result.contentType).toBe('text/csv');
      expect(result.filename).toMatch(/hotels-\d+\.csv/);
      expect(result.data).toContain('id,name,type');
    });

    it('should export entities as JSON', () => {
      const result = exportEntitiesAsJSON('attractions', { format: 'json' });

      expect(result.contentType).toBe('application/json');

      const parsed = JSON.parse(result.data);
      expect(parsed.entityType).toBe('attractions');
      expect(parsed.entities).toBeDefined();
    });

    it('should handle different entity types', () => {
      const hotelResult = exportEntitiesAsCSV('hotels', { format: 'csv' });
      expect(hotelResult.filename).toContain('hotels');

      const attractionResult = exportEntitiesAsCSV('attractions', { format: 'csv' });
      expect(attractionResult.filename).toContain('attractions');

      const diningResult = exportEntitiesAsCSV('dining', { format: 'csv' });
      expect(diningResult.filename).toContain('dining');
    });
  });

  describe('CSV Escaping', () => {
    it('should generate valid CSV structure', () => {
      const result = exportContentsAsCSV({ format: 'csv' });

      // Should have header row
      const lines = result.data.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(1);

      // Header should have expected columns
      const headers = lines[0].split(',');
      expect(headers).toContain('id');
      expect(headers).toContain('title');
      expect(headers).toContain('status');
    });
  });

  describe('Max Rows Enforcement', () => {
    it('should enforce max export rows', () => {
      const maxRows = EXPORTS_CONFIG.maxExportRows;

      // Request more than max
      const result = exportContentsAsCSV({ format: 'csv', limit: maxRows + 1000 });

      // Should be capped at max
      expect(result.rowCount).toBeLessThanOrEqual(maxRows);
    });
  });
});

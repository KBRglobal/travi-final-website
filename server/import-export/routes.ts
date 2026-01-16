/**
 * Import/Export System - Routes
 */

import { Hono } from 'hono';
import { getImportExportService } from './service';
import type { ExportRequest, ImportRequest } from './types';

const app = new Hono();

/**
 * Check if enabled
 */
function checkEnabled() {
  return process.env.ENABLE_IMPORT_EXPORT === 'true';
}

/**
 * GET /
 * Get service status
 */
app.get('/', (c) => {
  const enabled = checkEnabled();

  return c.json({
    name: 'Import/Export System',
    enabled,
    endpoints: enabled ? {
      export: 'POST /export',
      dryRun: 'POST /import/dry-run',
      apply: 'POST /import/apply',
    } : null,
  });
});

/**
 * POST /export
 * Export data
 */
app.post('/export', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Import/Export is disabled' }, 403);
  }

  const body = await c.req.json() as ExportRequest;

  if (!body.entityTypes || !Array.isArray(body.entityTypes) || body.entityTypes.length === 0) {
    return c.json({ error: 'entityTypes array is required' }, 400);
  }

  const validTypes = ['contents', 'entities', 'redirects'];
  const invalidTypes = body.entityTypes.filter(t => !validTypes.includes(t));
  if (invalidTypes.length > 0) {
    return c.json({ error: `Invalid entity types: ${invalidTypes.join(', ')}` }, 400);
  }

  const service = getImportExportService();
  const result = await service.export(body);

  return c.json(result);
});

/**
 * GET /export/:id
 * Get export result
 */
app.get('/export/:id', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Import/Export is disabled' }, 403);
  }

  const id = c.req.param('id');
  const service = getImportExportService();
  const result = service.getExportResult(id);

  if (!result) {
    return c.json({ error: 'Export result not found' }, 404);
  }

  return c.json(result);
});

/**
 * POST /import/dry-run
 * Validate import without applying
 */
app.post('/import/dry-run', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Import/Export is disabled' }, 403);
  }

  const body = await c.req.json() as ImportRequest;

  if (!body.entityType) {
    return c.json({ error: 'entityType is required' }, 400);
  }

  if (body.entityType !== 'contents') {
    return c.json({ error: 'Only contents import is currently supported' }, 400);
  }

  if (!body.data || !Array.isArray(body.data)) {
    return c.json({ error: 'data array is required' }, 400);
  }

  if (body.data.length === 0) {
    return c.json({ error: 'data array cannot be empty' }, 400);
  }

  if (body.data.length > 1000) {
    return c.json({ error: 'Maximum 1000 records per import' }, 400);
  }

  const service = getImportExportService();
  const result = await service.dryRun({
    ...body,
    mode: 'dry-run',
  });

  return c.json(result);
});

/**
 * POST /import/apply
 * Apply import
 */
app.post('/import/apply', async (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Import/Export is disabled' }, 403);
  }

  const body = await c.req.json() as ImportRequest;

  if (!body.entityType) {
    return c.json({ error: 'entityType is required' }, 400);
  }

  if (body.entityType !== 'contents') {
    return c.json({ error: 'Only contents import is currently supported' }, 400);
  }

  if (!body.data || !Array.isArray(body.data)) {
    return c.json({ error: 'data array is required' }, 400);
  }

  if (body.data.length === 0) {
    return c.json({ error: 'data array cannot be empty' }, 400);
  }

  if (body.data.length > 1000) {
    return c.json({ error: 'Maximum 1000 records per import' }, 400);
  }

  const service = getImportExportService();
  const result = await service.applyImport({
    ...body,
    mode: 'apply',
  });

  return c.json(result);
});

/**
 * GET /import/:id
 * Get import result
 */
app.get('/import/:id', (c) => {
  if (!checkEnabled()) {
    return c.json({ error: 'Import/Export is disabled' }, 403);
  }

  const id = c.req.param('id');
  const service = getImportExportService();
  const result = service.getImportResult(id);

  if (!result) {
    return c.json({ error: 'Import result not found' }, 404);
  }

  return c.json(result);
});

export default app;

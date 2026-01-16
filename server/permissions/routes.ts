/**
 * User Permissions - Admin Routes
 */

import { Router, Request, Response } from 'express';
import { isPermissionsEngineEnabled } from './types';
import { getAllBuiltInRoles } from './roles';
import {
  checkPermission,
  getUserRoles,
  assignRole,
  removeRole,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  getAllRoles,
  getAuditLog,
  checkPermissions,
} from './checker';
import { governanceGuard } from '../security/middleware/security-guards';

const router = Router();

// Apply Security Gate to all mutation routes
router.use(governanceGuard);

function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isPermissionsEngineEnabled()) {
    res.status(503).json({
      error: 'Permissions Engine is disabled',
      hint: 'Set ENABLE_PERMISSIONS_ENGINE=true to enable',
    });
    return;
  }
  next();
}

/**
 * GET /api/admin/permissions/roles
 */
router.get('/roles', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const roles = getAllRoles();
    res.json({ roles, count: roles.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/permissions/roles/builtin
 */
router.get('/roles/builtin', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const roles = getAllBuiltInRoles();
    res.json({ roles });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/permissions/roles
 */
router.post('/roles', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id, name, description, permissions } = req.body;

    if (!id || !name) {
      res.status(400).json({ error: 'id and name are required' });
      return;
    }

    const role = createCustomRole({
      id,
      name,
      description: description || '',
      permissions: permissions || [],
    });

    res.json({ role });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * PUT /api/admin/permissions/roles/:roleId
 */
router.put('/roles/:roleId', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    const updates = req.body;

    const role = updateCustomRole(roleId, updates);
    if (!role) {
      res.status(404).json({ error: 'Role not found or is built-in' });
      return;
    }

    res.json({ role });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * DELETE /api/admin/permissions/roles/:roleId
 */
router.delete('/roles/:roleId', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    const deleted = deleteCustomRole(roleId);

    if (!deleted) {
      res.status(400).json({ error: 'Cannot delete built-in role or role not found' });
      return;
    }

    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/permissions/users/:userId/roles
 */
router.get('/users/:userId/roles', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const roles = getUserRoles(userId);
    res.json({ userId, roles });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/permissions/users/:userId/roles
 */
router.post('/users/:userId/roles', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { roleId, assignedBy, expiresAt } = req.body;

    if (!roleId) {
      res.status(400).json({ error: 'roleId is required' });
      return;
    }

    const assignment = assignRole(
      userId,
      roleId,
      assignedBy || 'system',
      expiresAt ? new Date(expiresAt) : undefined
    );

    res.json({ assignment });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * DELETE /api/admin/permissions/users/:userId/roles/:roleId
 */
router.delete('/users/:userId/roles/:roleId', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { userId, roleId } = req.params;
    const removed = removeRole(userId, roleId);
    res.json({ removed });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/permissions/check
 */
router.post('/check', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { userId, action, resource, context } = req.body;

    if (!userId || !action || !resource) {
      res.status(400).json({ error: 'userId, action, and resource are required' });
      return;
    }

    const result = checkPermission(userId, action, resource, context);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/permissions/check-batch
 */
router.post('/check-batch', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { userId, checks } = req.body;

    if (!userId || !Array.isArray(checks)) {
      res.status(400).json({ error: 'userId and checks array are required' });
      return;
    }

    const results = checkPermissions(userId, checks);
    res.json({ results: Object.fromEntries(results) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/permissions/audit
 */
router.get('/audit', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { userId, action, resource } = req.query;
    const limit = parseInt(req.query.limit as string) || 100;

    const log = getAuditLog(
      {
        userId: userId as string,
        action: action as 'create' | 'read' | 'update' | 'delete' | 'publish' | 'unpublish' | 'approve' | 'reject' | 'manage',
        resource: resource as 'content' | 'entity' | 'media' | 'user' | 'role' | 'settings' | 'analytics' | 'jobs' | 'redirects' | 'locales',
      },
      limit
    );

    res.json({ log, count: log.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as permissionsRoutes };

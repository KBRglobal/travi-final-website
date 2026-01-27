/**
 * Access Control Admin Routes
 * Feature flag: ENABLE_RBAC
 */

import { Router, Request, Response, RequestHandler } from "express";
import * as repo from "./repository";
import { GovernanceRoleName } from "./types";
import { governanceGuard } from "../security/middleware/security-guards";

const router = Router();

// Apply Security Gate to all mutation routes
router.use(governanceGuard as unknown as RequestHandler);

function isEnabled(): boolean {
  return process.env.ENABLE_RBAC === "true";
}

// GET /api/admin/access-control/roles
router.get("/roles", async (req: Request, res: Response) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, roles: [] });
  }

  try {
    const roles = await repo.getAllRoles();
    res.json({ roles });
  } catch (error) {
    
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

// GET /api/admin/access-control/roles/:name
router.get("/roles/:name", async (req: Request, res: Response) => {
  if (!isEnabled()) {
    return res.json({ enabled: false });
  }

  try {
    const role = await repo.getRoleByName(req.params.name as GovernanceRoleName);
    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    const permissions = await repo.getRolePermissionsFromDb(role.id);
    res.json({ role, permissions });
  } catch (error) {
    
    res.status(500).json({ error: "Failed to fetch role" });
  }
});

// POST /api/admin/access-control/roles/:roleId/permissions
router.post("/roles/:roleId/permissions", async (req: Request, res: Response) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "RBAC not enabled" });
  }

  try {
    const permission = await repo.addPermission(req.params.roleId, req.body);
    res.status(201).json({ permission });
  } catch (error) {
    
    res.status(500).json({ error: "Failed to add permission" });
  }
});

// DELETE /api/admin/access-control/permissions/:id
router.delete("/permissions/:id", async (req: Request, res: Response) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "RBAC not enabled" });
  }

  try {
    await repo.removePermission(req.params.id);
    res.json({ success: true });
  } catch (error) {
    
    res.status(500).json({ error: "Failed to remove permission" });
  }
});

// POST /api/admin/access-control/users/:userId/roles
router.post("/users/:userId/roles", async (req: Request, res: Response) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "RBAC not enabled" });
  }

  try {
    const { roleId, scope, scopeValue, expiresAt } = req.body;
    const grantedBy = (req as any).user?.id || "system";

    const assignment = await repo.assignRole(
      req.params.userId,
      roleId,
      grantedBy,
      scope,
      scopeValue,
      expiresAt ? new Date(expiresAt) : undefined
    );

    res.status(201).json({ assignment });
  } catch (error) {
    
    res.status(500).json({ error: "Failed to assign role" });
  }
});

// DELETE /api/admin/access-control/users/:userId/roles/:roleId
router.delete("/users/:userId/roles/:roleId", async (req: Request, res: Response) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "RBAC not enabled" });
  }

  try {
    const { scope, scopeValue } = req.query;
    await repo.revokeRole(
      req.params.userId,
      req.params.roleId,
      (scope as string) || "global",
      scopeValue as string | undefined
    );
    res.json({ success: true });
  } catch (error) {
    
    res.status(500).json({ error: "Failed to revoke role" });
  }
});

// GET /api/admin/access-control/users/:userId/roles
router.get("/users/:userId/roles", async (req: Request, res: Response) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, assignments: [] });
  }

  try {
    const assignments = await repo.getUserRoleAssignments(req.params.userId);
    res.json({ assignments });
  } catch (error) {
    
    res.status(500).json({ error: "Failed to fetch user roles" });
  }
});

// POST /api/admin/access-control/init
router.post("/init", async (req: Request, res: Response) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "RBAC not enabled" });
  }

  try {
    await repo.initializeSystemRoles();
    res.json({ success: true, message: "System roles initialized" });
  } catch (error) {
    
    res.status(500).json({ error: "Failed to initialize roles" });
  }
});

export { router as accessControlRoutes };



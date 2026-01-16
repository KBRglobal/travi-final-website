/**
 * Governance Dashboard Routes
 *
 * Single pane of glass for enterprise governance:
 * - Who can do what (roles/permissions)
 * - What is blocked (policies)
 * - What is pending approval
 * - Who changed what recently (audit)
 * - Data access scoping
 * - Compliance exports
 *
 * Feature flag: ENABLE_ENTERPRISE_GOVERNANCE
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { users, governanceRoles, governancePolicies, approvalRequests, governanceAuditLogs, userRoleAssignments } from "@shared/schema";
import { desc, eq, count, and, sql, gte } from "drizzle-orm";
import { getAllRoles, getRoleByName } from "../access-control/repository";
import { getApprovalStats, getRecentActivity } from "../approvals/repository";
import { getAuditSummary } from "../audit/query-engine";
import { getEnforcementSummary } from "../policies/policy-engine";
import { BUILT_IN_POLICIES } from "../policies/built-in-policies";

// Import new RBAC services
import { policyEngine } from "./policy-engine";
import { approvalWorkflowService } from "./approval-workflow";
import { dataScopingService } from "./data-scoping";
import { complianceExportService } from "./compliance-export";
import { securityLogger, logAdminEvent } from "./security-logger";
import { Resource, Action, AdminRole } from "./types";

// Helper types
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
    name?: string;
    [key: string]: unknown;
  };
}

function getIpAddress(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
         req.socket.remoteAddress ||
         "unknown";
}

function requireAdminRole(req: AuthenticatedRequest, res: Response, next: () => void) {
  const adminRoles = ["super_admin", "system_admin", "admin", "manager"];
  if (!req.user?.role || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

const router = Router();

function isEnabled(): boolean {
  return process.env.ENABLE_ENTERPRISE_GOVERNANCE === "true";
}

// GET /api/admin/governance/summary
router.get("/summary", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false });
  }

  try {
    // Get counts in parallel
    const [
      [usersCount],
      [rolesCount],
      [policiesCount],
      [pendingApprovalsCount],
      [recentAuditCount],
    ] = await Promise.all([
      db.select({ count: count() }).from(users).where(eq(users.isActive, true)),
      db.select({ count: count() }).from(governanceRoles).where(eq(governanceRoles.isActive, true)),
      db.select({ count: count() }).from(governancePolicies).where(eq(governancePolicies.isActive, true)),
      db.select({ count: count() }).from(approvalRequests).where(eq(approvalRequests.status, "pending")),
      db.select({ count: count() }).from(governanceAuditLogs).where(
        gte(governanceAuditLogs.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
      ),
    ]);

    res.json({
      enabled: true,
      counts: {
        activeUsers: usersCount?.count || 0,
        activeRoles: rolesCount?.count || 0,
        activePolicies: (policiesCount?.count || 0) + BUILT_IN_POLICIES.filter(p => p.isActive).length,
        pendingApprovals: pendingApprovalsCount?.count || 0,
        recentAuditEvents: recentAuditCount?.count || 0,
      },
      flags: {
        rbacEnabled: process.env.ENABLE_RBAC === "true",
        approvalsEnabled: process.env.ENABLE_APPROVAL_WORKFLOWS === "true",
        auditEnabled: process.env.ENABLE_AUDIT_LOGS === "true",
        policiesEnabled: process.env.ENABLE_POLICY_ENFORCEMENT === "true",
      },
    });
  } catch (error) {
    console.error("[Governance] Error fetching summary:", error);
    res.status(500).json({ error: "Failed to fetch governance summary" });
  }
});

// GET /api/admin/governance/roles
router.get("/roles", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, roles: [] });
  }

  try {
    const roles = await getAllRoles();

    // Get user counts per role
    const roleCounts = await db
      .select({
        roleId: userRoleAssignments.roleId,
        count: count(),
      })
      .from(userRoleAssignments)
      .where(eq(userRoleAssignments.isActive, true))
      .groupBy(userRoleAssignments.roleId);

    const roleCountMap = new Map(roleCounts.map((r) => [r.roleId, r.count]));

    const rolesWithCounts = roles.map((role) => ({
      ...role,
      userCount: roleCountMap.get(role.id) || 0,
    }));

    res.json({ roles: rolesWithCounts });
  } catch (error) {
    console.error("[Governance] Error fetching roles:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

// GET /api/admin/governance/users
router.get("/users", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, users: [] });
  }

  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const usersList = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit);

    // Get role assignments for each user
    const userIds = usersList.map((u) => u.id);

    if (userIds.length > 0) {
      const assignments = await db
        .select({
          userId: userRoleAssignments.userId,
          roleId: userRoleAssignments.roleId,
        })
        .from(userRoleAssignments)
        .where(eq(userRoleAssignments.isActive, true));

      const roleMap = new Map<string, string[]>();
      for (const a of assignments) {
        const roles = roleMap.get(a.userId) || [];
        roles.push(a.roleId);
        roleMap.set(a.userId, roles);
      }

      const usersWithRoles = usersList.map((user) => ({
        ...user,
        governanceRoles: roleMap.get(user.id) || [],
      }));

      return res.json({ users: usersWithRoles });
    }

    res.json({ users: usersList });
  } catch (error) {
    console.error("[Governance] Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/admin/governance/permissions
router.get("/permissions", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, permissions: [] });
  }

  try {
    // Return a matrix of roles and their permissions
    const roles = await getAllRoles();

    const permissionMatrix = roles.map((role) => ({
      roleId: role.id,
      roleName: role.name,
      displayName: role.displayName,
      // Permissions would be fetched from the access-control module
    }));

    res.json({ permissionMatrix });
  } catch (error) {
    console.error("[Governance] Error fetching permissions:", error);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
});

// GET /api/admin/governance/policies
router.get("/policies", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, policies: [] });
  }

  try {
    const dbPolicies = await db
      .select()
      .from(governancePolicies)
      .orderBy(desc(governancePolicies.priority));

    const summary = await getEnforcementSummary();

    res.json({
      policies: [
        ...BUILT_IN_POLICIES.map((p) => ({ ...p, isBuiltIn: true })),
        ...dbPolicies.map((p) => ({ ...p, isBuiltIn: false })),
      ],
      summary,
    });
  } catch (error) {
    console.error("[Governance] Error fetching policies:", error);
    res.status(500).json({ error: "Failed to fetch policies" });
  }
});

// GET /api/admin/governance/approvals
router.get("/approvals", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, approvals: [] });
  }

  try {
    const [stats, recent] = await Promise.all([
      getApprovalStats(),
      getRecentActivity(20),
    ]);

    res.json({
      stats,
      recent,
    });
  } catch (error) {
    console.error("[Governance] Error fetching approvals:", error);
    res.status(500).json({ error: "Failed to fetch approvals" });
  }
});

// GET /api/admin/governance/audit
router.get("/audit", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false });
  }

  try {
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    const summary = await getAuditSummary(startDate);

    res.json(summary);
  } catch (error) {
    console.error("[Governance] Error fetching audit:", error);
    res.status(500).json({ error: "Failed to fetch audit summary" });
  }
});

// GET /api/admin/governance/blocked
router.get("/blocked", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, blocked: [] });
  }

  try {
    // Get recently blocked actions from policy evaluations
    const blocked = await db
      .select()
      .from(governanceAuditLogs)
      .where(
        and(
          sql`${governanceAuditLogs.metadata}->>'policyBlocked' = 'true'`,
          gte(governanceAuditLogs.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
        )
      )
      .orderBy(desc(governanceAuditLogs.createdAt))
      .limit(50);

    res.json({ blocked });
  } catch (error) {
    console.error("[Governance] Error fetching blocked:", error);
    res.status(500).json({ error: "Failed to fetch blocked actions" });
  }
});

// GET /api/admin/governance/health
router.get("/health", async (req, res) => {
  try {
    const checks = {
      database: false,
      rbac: false,
      approvals: false,
      audit: false,
      policies: false,
    };

    // Database check
    try {
      await db.select({ id: users.id }).from(users).limit(1);
      checks.database = true;
    } catch {}

    // Module checks
    checks.rbac = process.env.ENABLE_RBAC === "true";
    checks.approvals = process.env.ENABLE_APPROVAL_WORKFLOWS === "true";
    checks.audit = process.env.ENABLE_AUDIT_LOGS === "true";
    checks.policies = process.env.ENABLE_POLICY_ENFORCEMENT === "true";

    const healthy = checks.database && (checks.rbac || checks.approvals || checks.audit || checks.policies);

    res.json({
      healthy,
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Governance] Health check failed:", error);
    res.status(500).json({ healthy: false, error: "Health check failed" });
  }
});

// ============================================================================
// ENHANCED POLICY ENGINE ROUTES
// ============================================================================

// GET /api/admin/governance/policy-engine/policies
router.get("/policy-engine/policies", async (req: AuthenticatedRequest, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, policies: [] });
  }

  try {
    const policies = policyEngine.getAllPolicies();
    res.json({ policies });
  } catch (error) {
    console.error("[Governance] Error fetching policies:", error);
    res.status(500).json({ error: "Failed to fetch policies" });
  }
});

// GET /api/admin/governance/policy-engine/evaluate
router.post("/policy-engine/evaluate", async (req: AuthenticatedRequest, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false });
  }

  try {
    const { action, resource, context } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await policyEngine.evaluate({
      userId,
      action: action as Action,
      resource: resource as Resource,
      context: context || { resource, action },
      userRoles: [req.user?.role as AdminRole || "viewer"],
      ipAddress: getIpAddress(req),
    });

    res.json(result);
  } catch (error) {
    console.error("[Governance] Error evaluating policy:", error);
    res.status(500).json({ error: "Failed to evaluate policy" });
  }
});

// GET /api/admin/governance/policy-engine/analytics
router.get("/policy-engine/analytics", async (req: AuthenticatedRequest, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false });
  }

  try {
    const analytics = await policyEngine.getAnalytics({
      policyId: req.query.policyId as string,
      limit: parseInt(req.query.limit as string) || 1000,
    });
    res.json(analytics);
  } catch (error) {
    console.error("[Governance] Error fetching policy analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// ============================================================================
// APPROVAL WORKFLOW ROUTES
// ============================================================================

// GET /api/admin/governance/workflows
router.get("/workflows", async (req: AuthenticatedRequest, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, workflows: [] });
  }

  try {
    const workflows = approvalWorkflowService.getAllWorkflows();
    res.json({ workflows });
  } catch (error) {
    console.error("[Governance] Error fetching workflows:", error);
    res.status(500).json({ error: "Failed to fetch workflows" });
  }
});

// GET /api/admin/governance/approvals/pending
router.get("/approvals/pending", async (req: AuthenticatedRequest, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, requests: [] });
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const requests = await approvalWorkflowService.getPendingForUser(userId);
    res.json({ requests });
  } catch (error) {
    console.error("[Governance] Error fetching pending approvals:", error);
    res.status(500).json({ error: "Failed to fetch pending approvals" });
  }
});

// GET /api/admin/governance/approvals/request/:id
router.get("/approvals/request/:id", async (req: AuthenticatedRequest, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false });
  }

  try {
    const request = await approvalWorkflowService.getRequest(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Approval request not found" });
    }

    const steps = await approvalWorkflowService.getSteps(req.params.id);
    res.json({ request, steps });
  } catch (error) {
    console.error("[Governance] Error fetching approval:", error);
    res.status(500).json({ error: "Failed to fetch approval" });
  }
});

// POST /api/admin/governance/approvals/create
router.post("/approvals/create", async (req: AuthenticatedRequest, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Governance not enabled" });
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { workflowId, requestType, resourceType, resourceId, resourceTitle, action, priority, reason, metadata } = req.body;

    const request = await approvalWorkflowService.createRequest({
      workflowId,
      requestType,
      resourceType: resourceType as Resource,
      resourceId,
      resourceTitle,
      action: action as Action,
      requesterId: userId,
      requesterName: req.user?.name,
      priority,
      reason,
      metadata,
      ipAddress: getIpAddress(req),
    });

    res.status(201).json({ request });
  } catch (error) {
    console.error("[Governance] Error creating approval:", error);
    res.status(500).json({ error: "Failed to create approval request" });
  }
});

// POST /api/admin/governance/approvals/:id/decide
router.post("/approvals/:id/decide", async (req: AuthenticatedRequest, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Governance not enabled" });
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { decision, reason } = req.body;

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ error: "Invalid decision" });
    }

    const result = await approvalWorkflowService.processDecision({
      requestId: req.params.id,
      decision,
      decidedBy: userId,
      decidedByName: req.user?.name,
      reason,
      ipAddress: getIpAddress(req),
    });

    res.json(result);
  } catch (error) {
    console.error("[Governance] Error processing decision:", error);
    res.status(500).json({ error: "Failed to process decision" });
  }
});

// ============================================================================
// DATA SCOPING ROUTES
// ============================================================================

// GET /api/admin/governance/scoping/summary
router.get("/scoping/summary", async (req: AuthenticatedRequest, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false });
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const summary = await dataScopingService.getScopeSummary(userId);
    res.json(summary);
  } catch (error) {
    console.error("[Governance] Error fetching scope summary:", error);
    res.status(500).json({ error: "Failed to fetch scope summary" });
  }
});

// GET /api/admin/governance/scoping/user/:userId
router.get("/scoping/user/:userId", async (req: AuthenticatedRequest, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false });
  }

  // Check if requester is admin
  const adminRoles = ["super_admin", "system_admin", "admin", "manager"];
  if (!req.user?.role || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const summary = await dataScopingService.getScopeSummary(req.params.userId);
    res.json(summary);
  } catch (error) {
    console.error("[Governance] Error fetching user scope:", error);
    res.status(500).json({ error: "Failed to fetch user scope" });
  }
});

// ============================================================================
// COMPLIANCE EXPORT ROUTES
// ============================================================================

// POST /api/admin/governance/compliance/gdpr-export
router.post("/compliance/gdpr-export", async (req: AuthenticatedRequest, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Governance not enabled" });
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Check admin access
  const adminRoles = ["super_admin", "system_admin", "admin"];
  if (!req.user?.role || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const targetUserId = req.body.targetUserId || userId;
    const includeAuditLogs = req.body.includeAuditLogs !== false;
    const includeAnalytics = req.body.includeAnalytics === true;

    const exportRequest = await complianceExportService.createGDPRExport({
      requesterId: userId,
      targetUserId,
      includeAuditLogs,
      includeAnalytics,
      ipAddress: getIpAddress(req),
    });

    res.json({ export: exportRequest });
  } catch (error) {
    console.error("[Governance] Error creating GDPR export:", error);
    res.status(500).json({ error: "Failed to create GDPR export" });
  }
});

// POST /api/admin/governance/compliance/audit-report
router.post("/compliance/audit-report", async (req: AuthenticatedRequest, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Governance not enabled" });
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Check admin access
  const adminRoles = ["super_admin", "system_admin", "admin"];
  if (!req.user?.role || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const fromDate = new Date(req.body.fromDate || Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = new Date(req.body.toDate || Date.now());

    const exportRequest = await complianceExportService.createAuditReport({
      requesterId: userId,
      fromDate,
      toDate,
      targetUserId: req.body.targetUserId,
      actions: req.body.actions,
      resources: req.body.resources,
      ipAddress: getIpAddress(req),
    });

    res.json({ export: exportRequest });
  } catch (error) {
    console.error("[Governance] Error creating audit report:", error);
    res.status(500).json({ error: "Failed to create audit report" });
  }
});

// POST /api/admin/governance/compliance/permissions-report
router.post("/compliance/permissions-report", async (req: AuthenticatedRequest, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Governance not enabled" });
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Check admin access
  const adminRoles = ["super_admin", "system_admin", "admin"];
  if (!req.user?.role || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const exportRequest = await complianceExportService.createPermissionsReport({
      requesterId: userId,
      ipAddress: getIpAddress(req),
    });

    res.json({ export: exportRequest });
  } catch (error) {
    console.error("[Governance] Error creating permissions report:", error);
    res.status(500).json({ error: "Failed to create permissions report" });
  }
});

// GET /api/admin/governance/compliance/download/:exportId
router.get("/compliance/download/:exportId", async (req: AuthenticatedRequest, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Governance not enabled" });
  }

  // Check admin access
  const adminRoles = ["super_admin", "system_admin", "admin"];
  if (!req.user?.role || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const { filePath, exists } = complianceExportService.getExportFile(req.params.exportId);

    if (!exists) {
      return res.status(404).json({ error: "Export not found or expired" });
    }

    res.download(filePath, `${req.params.exportId}.json`);
  } catch (error) {
    console.error("[Governance] Error downloading export:", error);
    res.status(500).json({ error: "Failed to download export" });
  }
});

// ============================================================================
// SECURITY AUDIT ROUTES
// ============================================================================

// POST /api/admin/governance/audit/verify-integrity
router.post("/audit/verify-integrity", async (req: AuthenticatedRequest, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Governance not enabled" });
  }

  // Check super admin access
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ error: "Super admin access required" });
  }

  try {
    const fromDate = new Date(req.body.fromDate || Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = new Date(req.body.toDate || Date.now());

    const result = await securityLogger.verifyChainIntegrity(fromDate, toDate);
    res.json(result);
  } catch (error) {
    console.error("[Governance] Error verifying integrity:", error);
    res.status(500).json({ error: "Failed to verify integrity" });
  }
});

// POST /api/admin/governance/audit/flush
router.post("/audit/flush", async (req: AuthenticatedRequest, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Governance not enabled" });
  }

  // Check admin access
  const adminRoles = ["super_admin", "system_admin"];
  if (!req.user?.role || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "System admin access required" });
  }

  try {
    await securityLogger.flush();
    res.json({ success: true, message: "Audit events flushed to database" });
  } catch (error) {
    console.error("[Governance] Error flushing audit events:", error);
    res.status(500).json({ error: "Failed to flush audit events" });
  }
});

export { router as governanceRoutes };

console.log("[Governance] Dashboard routes loaded");

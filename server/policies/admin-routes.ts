/**
 * Policies Admin Routes
 * Feature flag: ENABLE_POLICY_ENFORCEMENT
 */

import { Router } from "express";
import * as repo from "./repository";
import { evaluatePolicies, checkPolicy, getEnforcementSummary } from "./policy-engine";
import { BUILT_IN_POLICIES } from "./built-in-policies";
import { PolicyContext } from "./types";

const router = Router();

function isEnabled(): boolean {
  return process.env.ENABLE_POLICY_ENFORCEMENT === "true";
}

// GET /api/admin/policies
router.get("/", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, policies: [] });
  }

  try {
    const dbPolicies = await repo.getAllPolicies();
    const builtIn = BUILT_IN_POLICIES;

    res.json({
      policies: dbPolicies,
      builtIn,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch policies" });
  }
});

// GET /api/admin/policies/summary
router.get("/summary", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false });
  }

  try {
    const summary = await getEnforcementSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// GET /api/admin/policies/stats
router.get("/stats", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false });
  }

  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;

    const stats = await repo.getEvaluationStats(startDate);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /api/admin/policies/:id
router.get("/:id", async (req, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Policy enforcement not enabled" });
  }

  try {
    // Check built-in first
    const builtIn = BUILT_IN_POLICIES.find(p => p.id === req.params.id);
    if (builtIn) {
      return res.json({ policy: builtIn, isBuiltIn: true });
    }

    const policy = await repo.getPolicyById(req.params.id);
    if (!policy) {
      return res.status(404).json({ error: "Policy not found" });
    }

    res.json({ policy, isBuiltIn: false });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch policy" });
  }
});

// POST /api/admin/policies
router.post("/", async (req: any, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Policy enforcement not enabled" });
  }

  try {
    const createdBy = req.user?.id;
    const policy = await repo.createPolicy(req.body, createdBy);
    res.status(201).json({ policy });
  } catch (error) {
    res.status(500).json({ error: "Failed to create policy" });
  }
});

// PUT /api/admin/policies/:id
router.put("/:id", async (req, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Policy enforcement not enabled" });
  }

  try {
    // Don't allow updating built-in policies
    const builtIn = BUILT_IN_POLICIES.find(p => p.id === req.params.id);
    if (builtIn) {
      return res.status(400).json({ error: "Cannot modify built-in policies" });
    }

    const policy = await repo.updatePolicy(req.params.id, req.body);
    if (!policy) {
      return res.status(404).json({ error: "Policy not found" });
    }

    res.json({ policy });
  } catch (error) {
    res.status(500).json({ error: "Failed to update policy" });
  }
});

// DELETE /api/admin/policies/:id
router.delete("/:id", async (req, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Policy enforcement not enabled" });
  }

  try {
    // Don't allow deleting built-in policies
    const builtIn = BUILT_IN_POLICIES.find(p => p.id === req.params.id);
    if (builtIn) {
      return res.status(400).json({ error: "Cannot delete built-in policies" });
    }

    const success = await repo.deletePolicy(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Policy not found" });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete policy" });
  }
});

// POST /api/admin/policies/:id/toggle
router.post("/:id/toggle", async (req, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Policy enforcement not enabled" });
  }

  try {
    const success = await repo.togglePolicyActive(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Policy not found" });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle policy" });
  }
});

// POST /api/admin/policies/evaluate
router.post("/evaluate", async (req: any, res) => {
  if (!isEnabled()) {
    return res.json({ effect: "allow", reason: "Policy enforcement disabled" });
  }

  try {
    const context: PolicyContext = {
      userId: req.user?.id || req.body.userId,
      userRole: req.user?.role || req.body.userRole,
      userRoles: req.body.userRoles || (req.user?.role ? [req.user.role] : undefined),
      action: req.body.action,
      resource: req.body.resource,
      resourceId: req.body.resourceId,
      locale: req.body.locale,
      contentStatus: req.body.contentStatus,
      contentType: req.body.contentType,
      score: req.body.score,
      metadata: req.body.metadata,
    };

    const result = await checkPolicy(context);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to evaluate policies" });
  }
});

export { router as policiesRoutes };

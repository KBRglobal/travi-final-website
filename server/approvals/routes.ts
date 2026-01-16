/**
 * Approvals Routes
 * Feature flag: ENABLE_APPROVAL_WORKFLOWS
 */

import { Router } from "express";
import {
  createApprovalRequest,
  processDecision,
  cancelRequest,
  getPendingApprovals,
  getRequestDetails,
} from "./workflow-engine";
import * as repo from "./repository";
import { RequestType, Priority } from "./types";

const router = Router();

function isEnabled(): boolean {
  return process.env.ENABLE_APPROVAL_WORKFLOWS === "true";
}

// GET /api/admin/approvals
router.get("/", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, requests: [] });
  }

  try {
    const { status, limit } = req.query;
    let requests;

    if (status) {
      requests = await repo.getRequestsByStatus(
        status as any,
        limit ? parseInt(limit as string) : 50
      );
    } else {
      requests = await repo.getRecentActivity(
        limit ? parseInt(limit as string) : 50
      );
    }

    res.json({ requests });
  } catch (error) {
    console.error("[Approvals] Error fetching requests:", error);
    res.status(500).json({ error: "Failed to fetch approval requests" });
  }
});

// GET /api/admin/approvals/pending
router.get("/pending", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, requests: [] });
  }

  try {
    const requests = await getPendingApprovals();
    res.json({ requests });
  } catch (error) {
    console.error("[Approvals] Error fetching pending:", error);
    res.status(500).json({ error: "Failed to fetch pending approvals" });
  }
});

// GET /api/admin/approvals/stats
router.get("/stats", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, stats: {} });
  }

  try {
    const stats = await repo.getApprovalStats();
    res.json({ stats });
  } catch (error) {
    console.error("[Approvals] Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch approval stats" });
  }
});

// GET /api/admin/approvals/:id
router.get("/:id", async (req, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Approval workflows not enabled" });
  }

  try {
    const details = await getRequestDetails(req.params.id);
    if (!details) {
      return res.status(404).json({ error: "Request not found" });
    }
    res.json(details);
  } catch (error) {
    console.error("[Approvals] Error fetching request:", error);
    res.status(500).json({ error: "Failed to fetch request details" });
  }
});

// POST /api/admin/approvals
router.post("/", async (req: any, res) => {
  if (!isEnabled()) {
    return res.json({
      success: true,
      status: "approved",
      message: "Auto-approved (workflows disabled)",
    });
  }

  try {
    const {
      requestType,
      resourceType,
      resourceId,
      reason,
      priority,
      metadata,
      contentType,
      score,
    } = req.body;

    const requesterId = req.user?.id || "system";

    const result = await createApprovalRequest(
      requestType as RequestType,
      resourceType,
      resourceId,
      requesterId,
      { reason, priority: priority as Priority, metadata, contentType, score }
    );

    res.status(201).json(result);
  } catch (error) {
    console.error("[Approvals] Error creating request:", error);
    res.status(500).json({ error: "Failed to create approval request" });
  }
});

// POST /api/admin/approvals/:id/approve
router.post("/:id/approve", async (req: any, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Approval workflows not enabled" });
  }

  try {
    const { reason } = req.body;
    const decidedBy = req.user?.id || "system";

    const result = await processDecision(req.params.id, {
      approved: true,
      reason,
      decidedBy,
    });

    res.json(result);
  } catch (error) {
    console.error("[Approvals] Error approving:", error);
    res.status(500).json({ error: "Failed to approve" });
  }
});

// POST /api/admin/approvals/:id/reject
router.post("/:id/reject", async (req: any, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Approval workflows not enabled" });
  }

  try {
    const { reason } = req.body;
    const decidedBy = req.user?.id || "system";

    if (!reason) {
      return res.status(400).json({ error: "Rejection reason required" });
    }

    const result = await processDecision(req.params.id, {
      approved: false,
      reason,
      decidedBy,
    });

    res.json(result);
  } catch (error) {
    console.error("[Approvals] Error rejecting:", error);
    res.status(500).json({ error: "Failed to reject" });
  }
});

// POST /api/admin/approvals/:id/cancel
router.post("/:id/cancel", async (req: any, res) => {
  if (!isEnabled()) {
    return res.status(400).json({ error: "Approval workflows not enabled" });
  }

  try {
    const { reason } = req.body;
    const cancelledBy = req.user?.id || "system";

    const result = await cancelRequest(req.params.id, cancelledBy, reason);
    res.json(result);
  } catch (error) {
    console.error("[Approvals] Error cancelling:", error);
    res.status(500).json({ error: "Failed to cancel" });
  }
});

// GET /api/admin/approvals/resource/:type/:id
router.get("/resource/:type/:id", async (req, res) => {
  if (!isEnabled()) {
    return res.json({ enabled: false, requests: [] });
  }

  try {
    const requests = await repo.getRequestsForResource(
      req.params.type,
      req.params.id
    );
    res.json({ requests });
  } catch (error) {
    console.error("[Approvals] Error fetching resource requests:", error);
    res.status(500).json({ error: "Failed to fetch resource requests" });
  }
});

export { router as approvalsRoutes };

console.log("[Approvals] Routes loaded");

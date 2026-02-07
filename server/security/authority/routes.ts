/**
 * Security Authority API Routes
 *
 * Provides endpoints for:
 * - Security mode management
 * - Override management
 * - Threat level control
 * - Autonomy impact
 * - Evidence and compliance
 *
 * Feature flag: ENABLE_SECURITY_AUTHORITY
 */

import { Router, Request, Response } from "express";
import { SecurityGate, requireSecurityGate } from "./security-gate";
import { SecurityModeManager, getAutonomyImpact } from "./security-modes";
import { OverrideRegistry } from "./override-registry";
import { EvidenceGenerator } from "./evidence-generator";
import { emergencyStop } from "./index";

import { SecurityMode, ThreatLevel, DEFAULT_SECURITY_AUTHORITY_CONFIG } from "./types";

const router = Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Check if security authority is enabled
function requireEnabled(req: Request, res: Response, next: Function) {
  if (!DEFAULT_SECURITY_AUTHORITY_CONFIG.enabled) {
    return res.status(503).json({
      error: "Security authority is disabled",
      hint: "Set ENABLE_SECURITY_AUTHORITY=true to enable",
    });
  }
  next();
}

// All routes require security authority to be enabled
router.use(requireEnabled);

// ============================================================================
// STATUS & HEALTH
// ============================================================================

/**
 * GET /api/security/status
 * Get current security authority status
 */
router.get("/status", async (req: Request, res: Response) => {
  const mode = SecurityModeManager.getMode();
  const threat = SecurityGate.getThreatState();
  const stats = SecurityGate.getStats();
  const overrideStats = OverrideRegistry.getStats();

  res.json({
    enabled: DEFAULT_SECURITY_AUTHORITY_CONFIG.enabled,
    mode: {
      current: mode.mode,
      reason: mode.reason,
      activatedAt: mode.activatedAt,
      activatedBy: mode.activatedBy,
      autoExpireAt: mode.autoExpireAt,
    },
    threat: {
      level: threat.level,
      activeSince: threat.activeSince,
      sourceCount: threat.sources.length,
    },
    stats: {
      activeOverrides: stats.activeOverrides,
      pendingAudits: stats.pendingAudits,
      rateLimitedActors: stats.rateLimitedActors,
    },
    overrides: {
      active: overrideStats.activeOverrides,
      totalUsage: overrideStats.totalUsage,
    },
  });
});

/**
 * GET /api/security/autonomy-impact
 * Get current security impact on autonomy systems
 */
router.get("/autonomy-impact", async (req: Request, res: Response) => {
  const impact = getAutonomyImpact();
  res.json(impact);
});

// ============================================================================
// MODE MANAGEMENT
// ============================================================================

/**
 * GET /api/security/mode
 * Get current security mode
 */
router.get("/mode", async (req: Request, res: Response) => {
  const mode = SecurityModeManager.getMode();
  const history = SecurityModeManager.getModeHistory(10);
  const stats = SecurityModeManager.getModeStats();

  res.json({
    current: mode,
    history,
    stats,
  });
});

/**
 * POST /api/security/mode
 * Set security mode
 */
router.post(
  "/mode",
  requireSecurityGate("settings_change", "settings"),
  async (req: Request, res: Response) => {
    const { mode, reason, autoExpireMinutes } = req.body as {
      mode: SecurityMode;
      reason: string;
      autoExpireMinutes?: number;
    };

    if (!mode || !["lockdown", "enforce", "monitor"].includes(mode)) {
      return res.status(400).json({ error: "Invalid mode" });
    }

    if (!reason) {
      return res.status(400).json({ error: "Reason is required" });
    }

    const user = (req as any).user;
    const result = await SecurityModeManager.setMode({
      mode,
      reason,
      activatedBy: user?.claims?.sub || "api",
      autoExpireMinutes,
    });

    res.json(result);
  }
);

/**
 * POST /api/security/lockdown
 * Activate lockdown mode
 */
router.post(
  "/lockdown",
  requireSecurityGate("admin_action", "system"),
  async (req: Request, res: Response) => {
    const { reason, durationMinutes } = req.body as {
      reason: string;
      durationMinutes?: number;
    };

    if (!reason) {
      return res.status(400).json({ error: "Reason is required" });
    }

    const user = (req as any).user;
    await SecurityModeManager.activateLockdown(
      reason,
      user?.claims?.sub || "api",
      durationMinutes || 60
    );

    res.json({
      success: true,
      message: "Lockdown activated",
      mode: SecurityModeManager.getMode(),
    });
  }
);

/**
 * POST /api/security/emergency-stop
 * Execute emergency stop
 */
router.post(
  "/emergency-stop",
  requireSecurityGate("admin_action", "system"),
  async (req: Request, res: Response) => {
    const { reason } = req.body as { reason: string };

    if (!reason) {
      return res.status(400).json({ error: "Reason is required" });
    }

    const user = (req as any).user;
    await emergencyStop(reason, user?.claims?.sub || "api");

    res.json({
      success: true,
      message: "EMERGENCY STOP EXECUTED",
      mode: SecurityModeManager.getMode(),
      threat: SecurityGate.getThreatState(),
    });
  }
);

// ============================================================================
// THREAT MANAGEMENT
// ============================================================================

/**
 * GET /api/security/threat
 * Get current threat state
 */
router.get("/threat", async (req: Request, res: Response) => {
  const threat = SecurityGate.getThreatState();
  res.json(threat);
});

/**
 * POST /api/security/threat/escalate
 * Escalate threat level
 */
router.post(
  "/threat/escalate",
  requireSecurityGate("admin_action", "system"),
  async (req: Request, res: Response) => {
    const { level, reason, sources } = req.body as {
      level: ThreatLevel;
      reason: string;
      sources?: Array<{ type: string; identifier: string; description: string }>;
    };

    if (!level || !["normal", "elevated", "high", "critical"].includes(level)) {
      return res.status(400).json({ error: "Invalid threat level" });
    }

    if (!reason) {
      return res.status(400).json({ error: "Reason is required" });
    }

    const threatSources = (sources || []).map(s => ({
      ...s,
      detectedAt: new Date(),
      severity: (() => {
        if (level === "critical") return "critical" as const;
        if (level === "high") return "high" as const;
        return "medium" as const;
      })(),
    }));

    await SecurityGate.escalateThreat(level, threatSources as any, reason);

    res.json({
      success: true,
      threat: SecurityGate.getThreatState(),
    });
  }
);

/**
 * POST /api/security/threat/deescalate
 * Deescalate threat level
 */
router.post(
  "/threat/deescalate",
  requireSecurityGate("admin_action", "system"),
  async (req: Request, res: Response) => {
    const { level, reason } = req.body as {
      level: ThreatLevel;
      reason: string;
    };

    if (!level || !["normal", "elevated", "high"].includes(level)) {
      return res.status(400).json({ error: "Invalid threat level" });
    }

    if (!reason) {
      return res.status(400).json({ error: "Reason is required" });
    }

    await SecurityGate.deescalateThreat(level, reason);

    res.json({
      success: true,
      threat: SecurityGate.getThreatState(),
    });
  }
);

// ============================================================================
// OVERRIDE MANAGEMENT
// ============================================================================

/**
 * GET /api/security/overrides
 * Get all active overrides
 */
router.get("/overrides", async (req: Request, res: Response) => {
  const active = OverrideRegistry.getActiveOverrides();
  const stats = OverrideRegistry.getStats();
  const policies = OverrideRegistry.getPolicies();

  res.json({
    active,
    stats,
    policies,
  });
});

/**
 * POST /api/security/overrides
 * Request a new override
 */
router.post(
  "/overrides",
  requireSecurityGate("admin_action", "system"),
  async (req: Request, res: Response) => {
    const { type, target, reason, justification, evidence, durationMinutes, maxUses } = req.body;

    if (!type || !reason || !justification) {
      return res.status(400).json({
        error: "type, reason, and justification are required",
      });
    }

    const user = (req as any).user;
    const result = await OverrideRegistry.requestOverride({
      request: {
        type,
        target: target || {},
        reason,
        justification,
        evidence,
        durationMinutes: durationMinutes || 60,
        maxUses,
      },
      requestedBy: user?.claims?.sub || "api",
      requestedByRoles: user?.roles || ["admin"],
      ipAddress: req.ip,
    });

    if (result.requiresSecondApprover) {
      return res.status(202).json({
        success: false,
        message: "Second approver required",
        requiresSecondApprover: true,
      });
    }

    if (!result.success) {
      return res.status(403).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      override: result.override,
    });
  }
);

/**
 * DELETE /api/security/overrides/:id
 * Revoke an override
 */
router.delete(
  "/overrides/:id",
  requireSecurityGate("admin_action", "system"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Reason is required" });
    }

    const user = (req as any).user;
    const result = await OverrideRegistry.revokeOverride({
      overrideId: id,
      revokedBy: user?.claims?.sub || "api",
      reason,
      ipAddress: req.ip,
    });

    res.json(result);
  }
);

/**
 * GET /api/security/overrides/alerts
 * Get override alerts
 */
router.get("/overrides/alerts", async (req: Request, res: Response) => {
  const user = (req as any).user;
  const roles = user?.roles || ["viewer"];

  const alerts = OverrideRegistry.getAlerts(roles);
  res.json({ alerts });
});

/**
 * POST /api/security/overrides/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.post("/overrides/alerts/:id/acknowledge", async (req: Request, res: Response) => {
  const { id } = req.params;
  const success = OverrideRegistry.acknowledgeAlert(id);
  res.json({ success });
});

// ============================================================================
// EVIDENCE & COMPLIANCE
// ============================================================================

/**
 * GET /api/security/evidence
 * Query security evidence
 */
router.get("/evidence", async (req: Request, res: Response) => {
  const { type, startDate, endDate, actor, action, resource, limit } = req.query;

  const evidence = EvidenceGenerator.queryEvidence({
    type: type as any,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    actor: actor as string,
    action: action as any,
    resource: resource as any,
    limit: limit ? Number.parseInt(limit as string, 10) : 100,
  });

  res.json({
    count: evidence.length,
    evidence,
  });
});

/**
 * GET /api/security/evidence/stats
 * Get evidence statistics
 */
router.get("/evidence/stats", async (req: Request, res: Response) => {
  const stats = EvidenceGenerator.getStats();
  res.json(stats);
});

/**
 * GET /api/security/compliance/soc2
 * Generate SOC2 compliance bundle
 */
router.get("/compliance/soc2", async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const start = startDate
    ? new Date(startDate as string)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  const bundle = await EvidenceGenerator.generateSOC2Bundle(start, end);
  res.json(bundle);
});

/**
 * GET /api/security/compliance/gdpr
 * Generate GDPR compliance bundle
 */
router.get("/compliance/gdpr", async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const start = startDate
    ? new Date(startDate as string)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  const bundle = await EvidenceGenerator.generateGDPRBundle(start, end);
  res.json(bundle);
});

/**
 * GET /api/security/compliance/executive-summary
 * Generate executive summary
 */
router.get("/compliance/executive-summary", async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const start = startDate
    ? new Date(startDate as string)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  const summary = await EvidenceGenerator.generateExecutiveSummary(start, end);
  res.json(summary);
});

/**
 * GET /api/security/compliance/export
 * Export compliance bundle in specified format
 */
router.get("/compliance/export", async (req: Request, res: Response) => {
  const { framework, format, startDate, endDate } = req.query;

  const start = startDate
    ? new Date(startDate as string)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  let bundle;
  if (framework === "gdpr") {
    bundle = await EvidenceGenerator.generateGDPRBundle(start, end);
  } else {
    bundle = await EvidenceGenerator.generateSOC2Bundle(start, end);
  }

  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=security-${framework}-${Date.now()}.csv`
    );
    return res.send(EvidenceGenerator.exportAsCSV(bundle));
  }

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=security-${framework}-${Date.now()}.json`
  );
  res.send(EvidenceGenerator.exportAsJSON(bundle));
});

export default router;

/**
 * Executive Security Dashboard API
 *
 * Real-time security posture overview for executives:
 * - Security health score
 * - Threat level status
 * - Active incidents
 * - Compliance status
 * - Key risk indicators
 */

import { Router } from "express";
import {
  getSecurityMode,
  getModeConfiguration,
  assessThreatLevel,
  setSecurityMode,
  ThreatAssessment,
} from "../modes/security-modes";
import {
  getIntelligenceSummary,
  getRecentAnomalies,
  getHighRiskUsers,
} from "../intelligence/security-intelligence";
import { lintPolicies, LintResult } from "../policy/policy-linter";
import { scanForDrift, getDriftHistory, DriftScanResult } from "../drift/drift-scanner";
import {
  generateComplianceReport,
  verifyEvidenceChain,
  ComplianceFramework,
} from "../compliance/evidence-generator";
import { exfiltrationGuard } from "../exfiltration/exfiltration-guard";
import { getApprovalSafetyMetrics } from "../approvals/approval-safety";
import { AdminRole } from "../../governance/types";

// ============================================================================
// TYPES
// ============================================================================

export interface SecurityPosture {
  overallScore: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  status: "healthy" | "warning" | "critical" | "under_attack";
  lastUpdated: Date;
}

export interface ExecutiveDashboard {
  posture: SecurityPosture;
  mode: {
    current: string;
    reason: string;
    setAt: Date;
  };
  threatLevel: {
    level: string;
    score: number;
    trend: "improving" | "stable" | "degrading";
  };
  incidents: {
    active: number;
    last24h: number;
    critical: number;
  };
  compliance: {
    status: string;
    score: number;
    frameworks: Record<string, string>;
  };
  keyMetrics: KeyMetric[];
  alerts: Alert[];
}

export interface KeyMetric {
  name: string;
  value: number | string;
  unit?: string;
  change?: number;
  trend?: "up" | "down" | "stable";
  status: "good" | "warning" | "critical";
}

export interface Alert {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  timestamp: Date;
  actionRequired: boolean;
  action?: string;
}

// ============================================================================
// DASHBOARD GENERATOR
// ============================================================================

class SecurityDashboardService {
  private alertHistory: Alert[] = [];
  private lastPosture: SecurityPosture | null = null;

  /**
   * Generate executive dashboard
   */
  async generateDashboard(): Promise<ExecutiveDashboard> {
    const [posture, mode, threat, incidents, compliance, metrics, alerts] = await Promise.all([
      this.calculatePosture(),
      this.getModeStatus(),
      this.getThreatStatus(),
      this.getIncidentStatus(),
      this.getComplianceStatus(),
      this.getKeyMetrics(),
      this.getActiveAlerts(),
    ]);

    return {
      posture,
      mode,
      threatLevel: threat,
      incidents,
      compliance,
      keyMetrics: metrics,
      alerts,
    };
  }

  /**
   * Calculate overall security posture
   */
  async calculatePosture(): Promise<SecurityPosture> {
    let score = 100;
    const deductions: { reason: string; points: number }[] = [];

    // Check threat level
    const threat = await assessThreatLevel();
    if (threat.level === "black") {
      score -= 40;
      deductions.push({ reason: "Critical threat level", points: 40 });
    } else if (threat.level === "red") {
      score -= 30;
      deductions.push({ reason: "High threat level", points: 30 });
    } else if (threat.level === "orange") {
      score -= 20;
      deductions.push({ reason: "Elevated threat level", points: 20 });
    } else if (threat.level === "yellow") {
      score -= 10;
      deductions.push({ reason: "Warning threat level", points: 10 });
    }

    // Check policy health
    const policyLint = lintPolicies();
    if (policyLint.summary.errors > 0) {
      const policyDeduction = Math.min(20, policyLint.summary.errors * 5);
      score -= policyDeduction;
      deductions.push({ reason: "Policy configuration errors", points: policyDeduction });
    }

    // Check for drift
    try {
      const drift = await scanForDrift();
      if (drift.summary.criticalDrifts > 0) {
        score -= 15;
        deductions.push({ reason: "Critical security drift", points: 15 });
      } else if (drift.summary.highDrifts > 0) {
        score -= 10;
        deductions.push({ reason: "High-severity drift", points: 10 });
      }
    } catch {
      // No baseline
    }

    // Check evidence chain
    const chain = verifyEvidenceChain();
    if (!chain.valid) {
      score -= 10;
      deductions.push({ reason: "Evidence chain integrity issue", points: 10 });
    }

    // Check mode
    const mode = getSecurityMode();
    if (mode === "monitor" && process.env.NODE_ENV === "production") {
      score -= 15;
      deductions.push({ reason: "Production in monitor mode", points: 15 });
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    // Determine grade
    let grade: SecurityPosture["grade"];
    if (score >= 90) grade = "A";
    else if (score >= 80) grade = "B";
    else if (score >= 70) grade = "C";
    else if (score >= 60) grade = "D";
    else grade = "F";

    // Determine status
    let status: SecurityPosture["status"];
    if (threat.level === "black" || threat.level === "red") {
      status = "under_attack";
    } else if (score < 60) {
      status = "critical";
    } else if (score < 80) {
      status = "warning";
    } else {
      status = "healthy";
    }

    const posture: SecurityPosture = {
      overallScore: score,
      grade,
      status,
      lastUpdated: new Date(),
    };

    this.lastPosture = posture;
    return posture;
  }

  /**
   * Get current mode status
   */
  private getModeStatus(): {
    current: string;
    reason: string;
    setAt: Date;
  } {
    const config = getModeConfiguration();
    return {
      current: config.mode,
      reason: config.reason,
      setAt: config.setAt,
    };
  }

  /**
   * Get threat status
   */
  private async getThreatStatus(): Promise<{
    level: string;
    score: number;
    trend: "improving" | "stable" | "degrading";
  }> {
    const threat = await assessThreatLevel();

    // Determine trend (would compare with historical data)
    const trend: "improving" | "stable" | "degrading" = "stable";

    return {
      level: threat.level,
      score: threat.score,
      trend,
    };
  }

  /**
   * Get incident status
   */
  private getIncidentStatus(): {
    active: number;
    last24h: number;
    critical: number;
  } {
    const anomalies = getRecentAnomalies(24);

    return {
      active: anomalies.filter(a => a.severity === "critical" || a.severity === "high").length,
      last24h: anomalies.length,
      critical: anomalies.filter(a => a.severity === "critical").length,
    };
  }

  /**
   * Get compliance status
   */
  private getComplianceStatus(): {
    status: string;
    score: number;
    frameworks: Record<string, string>;
  } {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const frameworks: Record<string, string> = {};
    let totalScore = 0;
    let frameworkCount = 0;

    const frameworkList: ComplianceFramework[] = ["SOC2", "ISO27001", "GDPR"];

    for (const framework of frameworkList) {
      try {
        const report = generateComplianceReport(framework, thirtyDaysAgo, now);
        frameworks[framework] = report.overallStatus;

        if (report.overallStatus === "compliant") totalScore += 100;
        else if (report.overallStatus === "partial") totalScore += 50;

        frameworkCount++;
      } catch {
        frameworks[framework] = "not_configured";
      }
    }

    const averageScore = frameworkCount > 0 ? Math.round(totalScore / frameworkCount) : 0;

    let status: string;
    if (averageScore >= 90) status = "compliant";
    else if (averageScore >= 70) status = "mostly_compliant";
    else if (averageScore >= 50) status = "partial";
    else status = "non_compliant";

    return {
      status,
      score: averageScore,
      frameworks,
    };
  }

  /**
   * Get key security metrics
   */
  private async getKeyMetrics(): Promise<KeyMetric[]> {
    const intel = getIntelligenceSummary();
    const highRiskUsers = getHighRiskUsers(50);
    const approvalMetrics = getApprovalSafetyMetrics();
    const policyLint = lintPolicies();

    return [
      {
        name: "Anomalies Detected (24h)",
        value: intel.anomaliesLast24h,
        status:
          intel.anomaliesLast24h > 20
            ? "critical"
            : intel.anomaliesLast24h > 10
              ? "warning"
              : "good",
        trend: "stable",
      },
      {
        name: "High-Risk Users",
        value: highRiskUsers.length,
        status:
          highRiskUsers.length > 5 ? "critical" : highRiskUsers.length > 2 ? "warning" : "good",
      },
      {
        name: "Policy Health Score",
        value: policyLint.score,
        unit: "%",
        status: policyLint.score < 70 ? "critical" : policyLint.score < 90 ? "warning" : "good",
      },
      {
        name: "Approval Requests (24h)",
        value: approvalMetrics.totalApprovals24h,
        status: "good",
      },
      {
        name: "Events Processed",
        value: intel.totalEventsProcessed,
        status: "good",
      },
      {
        name: "Security Mode",
        value: getSecurityMode().toUpperCase(),
        status: getSecurityMode() === "lockdown" ? "warning" : "good",
      },
    ];
  }

  /**
   * Get active alerts
   */
  private async getActiveAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Check threat level
    const threat = await assessThreatLevel();
    if (threat.level !== "green") {
      alerts.push({
        id: `threat_${Date.now()}`,
        severity: threat.level === "black" || threat.level === "red" ? "critical" : "warning",
        title: "Elevated Threat Level",
        message: `Current threat level is ${threat.level.toUpperCase()} (score: ${threat.score})`,
        timestamp: new Date(),
        actionRequired: threat.level === "black" || threat.level === "red",
        action: threat.level === "red" ? "Consider escalating to lockdown mode" : undefined,
      });
    }

    // Check for high-risk users
    const highRiskUsers = getHighRiskUsers(70);
    if (highRiskUsers.length > 0) {
      alerts.push({
        id: `risk_users_${Date.now()}`,
        severity: "warning",
        title: "High-Risk Users Detected",
        message: `${highRiskUsers.length} users have threat scores above 70`,
        timestamp: new Date(),
        actionRequired: true,
        action: "Review user activity and consider account restrictions",
      });
    }

    // Check policy errors
    const policyLint = lintPolicies();
    if (policyLint.summary.errors > 0) {
      alerts.push({
        id: `policy_${Date.now()}`,
        severity: "critical",
        title: "Policy Configuration Errors",
        message: `${policyLint.summary.errors} policy errors detected`,
        timestamp: new Date(),
        actionRequired: true,
        action: "Review and fix policy configuration",
      });
    }

    // Check for critical drift
    const driftHistory = getDriftHistory(24);
    const criticalDrifts = driftHistory.filter(d => d.severity === "critical");
    if (criticalDrifts.length > 0) {
      alerts.push({
        id: `drift_${Date.now()}`,
        severity: "critical",
        title: "Critical Security Drift",
        message: `${criticalDrifts.length} critical drift events detected in last 24h`,
        timestamp: new Date(),
        actionRequired: true,
        action: "Investigate and remediate configuration changes",
      });
    }

    // Check mode
    if (getSecurityMode() === "lockdown") {
      alerts.push({
        id: `lockdown_${Date.now()}`,
        severity: "warning",
        title: "System in Lockdown Mode",
        message: "All write operations are blocked",
        timestamp: new Date(),
        actionRequired: false,
      });
    }

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return alerts;
  }

  /**
   * Generate PDF report (placeholder)
   */
  async generatePDFReport(): Promise<Buffer> {
    // In real implementation, would use a PDF library
    const dashboard = await this.generateDashboard();
    const content = JSON.stringify(dashboard, null, 2);
    return Buffer.from(content);
  }
}

// ============================================================================
// API ROUTES
// ============================================================================

export const securityDashboardRouter = Router();
const dashboardService = new SecurityDashboardService();

/**
 * Get executive dashboard
 */
securityDashboardRouter.get("/dashboard", async (req, res) => {
  try {
    const dashboard = await dashboardService.generateDashboard();
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate dashboard" });
  }
});

/**
 * Get security posture
 */
securityDashboardRouter.get("/posture", async (req, res) => {
  try {
    const posture = await dashboardService.calculatePosture();
    res.json(posture);
  } catch (error) {
    res.status(500).json({ error: "Failed to calculate posture" });
  }
});

/**
 * Get threat assessment
 */
securityDashboardRouter.get("/threat", async (req, res) => {
  try {
    const threat = await assessThreatLevel();
    res.json(threat);
  } catch (error) {
    res.status(500).json({ error: "Failed to assess threat" });
  }
});

/**
 * Get current mode
 */
securityDashboardRouter.get("/mode", (req, res) => {
  const config = getModeConfiguration();
  res.json(config);
});

/**
 * Set security mode
 */
securityDashboardRouter.post("/mode", (req, res) => {
  const { mode, reason, expiresIn } = req.body;
  const userId = (req as any).user?.id || "unknown";

  if (!["monitor", "enforce", "lockdown"].includes(mode)) {
    return res.status(400).json({ error: "Invalid mode" });
  }

  if (!reason) {
    return res.status(400).json({ error: "Reason required" });
  }

  try {
    const config = setSecurityMode(mode, reason, userId, expiresIn);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Failed to set mode" });
  }
});

/**
 * Get policy health
 */
securityDashboardRouter.get("/policy-health", (req, res) => {
  try {
    const lint = lintPolicies();
    res.json(lint);
  } catch (error) {
    res.status(500).json({ error: "Failed to lint policies" });
  }
});

/**
 * Get drift status
 */
securityDashboardRouter.get("/drift", async (req, res) => {
  try {
    const result = await scanForDrift();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to scan for drift" });
  }
});

/**
 * Get high-risk users
 */
securityDashboardRouter.get("/high-risk-users", (req, res) => {
  const threshold = Number.parseInt(req.query.threshold as string) || 50;
  const users = getHighRiskUsers(threshold);
  res.json(users);
});

/**
 * Get recent anomalies
 */
securityDashboardRouter.get("/anomalies", (req, res) => {
  const hours = Number.parseInt(req.query.hours as string) || 24;
  const anomalies = getRecentAnomalies(hours);
  res.json(anomalies);
});

/**
 * Get intelligence summary
 */
securityDashboardRouter.get("/intelligence", (req, res) => {
  const summary = getIntelligenceSummary();
  res.json(summary);
});

/**
 * Export PDF report
 */
securityDashboardRouter.get("/report/pdf", async (req, res) => {
  try {
    const pdf = await dashboardService.generatePDFReport();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=security-report.pdf");
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate report" });
  }
});

/**
 * Health check
 */
securityDashboardRouter.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mode: getSecurityMode(),
    timestamp: new Date(),
  });
});

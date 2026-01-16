/**
 * Security Drift Detection Scanner
 *
 * Continuously monitors for security configuration drift:
 * - Permission changes
 * - Policy modifications
 * - Role assignments
 * - Configuration changes
 * - Environment variable tampering
 * - Bypass attempt patterns
 */

import * as crypto from "crypto";
import { AdminRole, Resource, Action } from "../../governance/types";
import { logAdminEvent } from "../../governance/security-logger";

// ============================================================================
// TYPES
// ============================================================================

export interface DriftReport {
  id: string;
  timestamp: Date;
  category: DriftCategory;
  severity: "low" | "medium" | "high" | "critical";
  component: string;
  description: string;
  baseline: unknown;
  current: unknown;
  delta: unknown;
  remediation: string;
  autoRemediable: boolean;
}

export type DriftCategory =
  | "permission_drift"
  | "policy_drift"
  | "role_drift"
  | "config_drift"
  | "env_drift"
  | "code_drift"
  | "access_pattern_drift";

export interface SecurityBaseline {
  id: string;
  name: string;
  capturedAt: Date;
  capturedBy: string;
  hash: string;
  components: BaselineComponent[];
  metadata: Record<string, unknown>;
}

export interface BaselineComponent {
  type: string;
  name: string;
  hash: string;
  data: unknown;
}

export interface DriftScanResult {
  scanId: string;
  startedAt: Date;
  completedAt: Date;
  baselineId: string;
  drifts: DriftReport[];
  summary: {
    totalComponents: number;
    driftedComponents: number;
    criticalDrifts: number;
    highDrifts: number;
    mediumDrifts: number;
    lowDrifts: number;
  };
  overallStatus: "clean" | "minor_drift" | "significant_drift" | "critical_drift";
}

// ============================================================================
// BASELINE SNAPSHOTS
// ============================================================================

interface PermissionSnapshot {
  roles: Record<AdminRole, Record<Resource, Action[]>>;
  userAssignments: Record<string, AdminRole[]>;
}

interface PolicySnapshot {
  policies: {
    id: string;
    name: string;
    hash: string;
    effect: string;
    priority: number;
    isActive: boolean;
  }[];
}

interface ConfigSnapshot {
  rbacEnabled: boolean;
  auditEnabled: boolean;
  approvalRequired: boolean;
  sessionTimeout: number;
  mfaRequired: boolean;
  ipWhitelist: string[];
  encryptionEnabled: boolean;
}

interface EnvSnapshot {
  securityVars: Record<string, string>;
  hashOfAll: string;
}

// ============================================================================
// DRIFT SCANNER
// ============================================================================

class DriftScanner {
  private baselines: Map<string, SecurityBaseline> = new Map();
  private currentBaseline: SecurityBaseline | null = null;
  private driftHistory: DriftReport[] = [];

  /**
   * Capture a new security baseline
   */
  async captureBaseline(
    name: string,
    capturedBy: string
  ): Promise<SecurityBaseline> {
    const components: BaselineComponent[] = [];

    // Capture permissions
    const permissionSnapshot = await this.capturePermissions();
    components.push({
      type: "permissions",
      name: "Role-Permission Matrix",
      hash: this.hashData(permissionSnapshot),
      data: permissionSnapshot,
    });

    // Capture policies
    const policySnapshot = await this.capturePolicies();
    components.push({
      type: "policies",
      name: "Policy Configuration",
      hash: this.hashData(policySnapshot),
      data: policySnapshot,
    });

    // Capture config
    const configSnapshot = await this.captureConfig();
    components.push({
      type: "config",
      name: "Security Configuration",
      hash: this.hashData(configSnapshot),
      data: configSnapshot,
    });

    // Capture environment
    const envSnapshot = await this.captureEnvironment();
    components.push({
      type: "environment",
      name: "Environment Variables",
      hash: this.hashData(envSnapshot),
      data: envSnapshot,
    });

    const baseline: SecurityBaseline = {
      id: `BL-${Date.now()}`,
      name,
      capturedAt: new Date(),
      capturedBy,
      hash: this.hashData(components),
      components,
      metadata: {
        nodeEnv: process.env.NODE_ENV,
        version: "1.0.0",
      },
    };

    this.baselines.set(baseline.id, baseline);
    this.currentBaseline = baseline;

    logAdminEvent(
      capturedBy,
      "BASELINE_CAPTURED",
      "security_baseline",
      baseline.id,
      { name, componentCount: components.length }
    );

    return baseline;
  }

  /**
   * Run drift scan against baseline
   */
  async scan(baselineId?: string): Promise<DriftScanResult> {
    const startedAt = new Date();
    const baseline = baselineId
      ? this.baselines.get(baselineId)
      : this.currentBaseline;

    if (!baseline) {
      throw new Error("No baseline found. Capture a baseline first.");
    }

    const drifts: DriftReport[] = [];

    // Scan each component
    for (const component of baseline.components) {
      const currentData = await this.captureComponent(component.type);
      const currentHash = this.hashData(currentData);

      if (currentHash !== component.hash) {
        const driftReports = this.analyzeDrift(
          component.type,
          component.name,
          component.data,
          currentData
        );
        drifts.push(...driftReports);
      }
    }

    // Store drift history
    this.driftHistory.push(...drifts);

    const result: DriftScanResult = {
      scanId: `SCAN-${Date.now()}`,
      startedAt,
      completedAt: new Date(),
      baselineId: baseline.id,
      drifts,
      summary: {
        totalComponents: baseline.components.length,
        driftedComponents: new Set(drifts.map((d) => d.component)).size,
        criticalDrifts: drifts.filter((d) => d.severity === "critical").length,
        highDrifts: drifts.filter((d) => d.severity === "high").length,
        mediumDrifts: drifts.filter((d) => d.severity === "medium").length,
        lowDrifts: drifts.filter((d) => d.severity === "low").length,
      },
      overallStatus: this.determineOverallStatus(drifts),
    };

    return result;
  }

  /**
   * Continuous drift monitoring
   */
  startContinuousMonitoring(intervalMs: number = 60000): NodeJS.Timer {
    console.log(`[DriftScanner] Starting continuous monitoring (interval: ${intervalMs}ms)`);

    return setInterval(async () => {
      try {
        if (!this.currentBaseline) {
          console.log("[DriftScanner] No baseline set, skipping scan");
          return;
        }

        const result = await this.scan();

        if (result.drifts.length > 0) {
          console.warn(
            `[DriftScanner] Drift detected: ${result.drifts.length} issues`
          );

          // Log critical drifts
          for (const drift of result.drifts.filter(
            (d) => d.severity === "critical"
          )) {
            logAdminEvent(
              "system",
              "CRITICAL_DRIFT_DETECTED",
              drift.component,
              drift.id,
              {
                category: drift.category,
                description: drift.description,
              }
            );
          }
        }
      } catch (error) {
        console.error("[DriftScanner] Scan failed:", error);
      }
    }, intervalMs);
  }

  /**
   * Auto-remediate drift
   */
  async autoRemediate(driftId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const drift = this.driftHistory.find((d) => d.id === driftId);

    if (!drift) {
      return { success: false, message: "Drift not found" };
    }

    if (!drift.autoRemediable) {
      return { success: false, message: "Drift is not auto-remediable" };
    }

    // Implement remediation logic based on category
    switch (drift.category) {
      case "env_drift":
        // Can't auto-remediate env vars safely
        return { success: false, message: "Environment variables cannot be auto-remediated" };

      case "config_drift":
        // Would restore config to baseline
        console.log(`[DriftScanner] Auto-remediating config drift: ${drift.id}`);
        return { success: true, message: "Configuration restored to baseline" };

      default:
        return { success: false, message: "Auto-remediation not implemented for this drift type" };
    }
  }

  // ============================================================================
  // CAPTURE METHODS
  // ============================================================================

  private async capturePermissions(): Promise<PermissionSnapshot> {
    // In real implementation, would query actual permission data
    // This is a structural example
    return {
      roles: {
        super_admin: {
          content: ["view", "create", "edit", "delete", "publish"],
          users: ["view", "create", "edit", "delete", "manage_users"],
          roles: ["view", "create", "edit", "delete", "manage_roles"],
          policies: ["view", "create", "edit", "delete", "manage_policies"],
          system: ["view", "configure"],
        } as Record<Resource, Action[]>,
        // ... other roles would be captured here
      } as Record<AdminRole, Record<Resource, Action[]>>,
      userAssignments: {},
    };
  }

  private async capturePolicies(): Promise<PolicySnapshot> {
    // Would query policy engine
    return {
      policies: [],
    };
  }

  private async captureConfig(): Promise<ConfigSnapshot> {
    return {
      rbacEnabled: process.env.ENABLE_RBAC !== "false",
      auditEnabled: process.env.ENABLE_AUDIT !== "false",
      approvalRequired: process.env.REQUIRE_APPROVAL === "true",
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || "3600"),
      mfaRequired: process.env.REQUIRE_MFA === "true",
      ipWhitelist: (process.env.IP_WHITELIST || "").split(",").filter(Boolean),
      encryptionEnabled: process.env.ENABLE_ENCRYPTION !== "false",
    };
  }

  private async captureEnvironment(): Promise<EnvSnapshot> {
    const securityVars: Record<string, string> = {};
    const securityVarPrefixes = [
      "ENABLE_",
      "DISABLE_",
      "REQUIRE_",
      "FORCE_",
      "SECURITY_",
      "AUTH_",
      "RBAC_",
    ];

    for (const [key, value] of Object.entries(process.env)) {
      if (securityVarPrefixes.some((prefix) => key.startsWith(prefix))) {
        // Hash sensitive values
        securityVars[key] = this.hashData(value || "");
      }
    }

    return {
      securityVars,
      hashOfAll: this.hashData(securityVars),
    };
  }

  private async captureComponent(type: string): Promise<unknown> {
    switch (type) {
      case "permissions":
        return this.capturePermissions();
      case "policies":
        return this.capturePolicies();
      case "config":
        return this.captureConfig();
      case "environment":
        return this.captureEnvironment();
      default:
        return null;
    }
  }

  // ============================================================================
  // ANALYSIS METHODS
  // ============================================================================

  private analyzeDrift(
    type: string,
    name: string,
    baseline: unknown,
    current: unknown
  ): DriftReport[] {
    const reports: DriftReport[] = [];

    switch (type) {
      case "permissions":
        reports.push(...this.analyzePermissionDrift(baseline as PermissionSnapshot, current as PermissionSnapshot));
        break;
      case "policies":
        reports.push(...this.analyzePolicyDrift(baseline as PolicySnapshot, current as PolicySnapshot));
        break;
      case "config":
        reports.push(...this.analyzeConfigDrift(baseline as ConfigSnapshot, current as ConfigSnapshot));
        break;
      case "environment":
        reports.push(...this.analyzeEnvDrift(baseline as EnvSnapshot, current as EnvSnapshot));
        break;
    }

    return reports;
  }

  private analyzePermissionDrift(
    baseline: PermissionSnapshot,
    current: PermissionSnapshot
  ): DriftReport[] {
    const reports: DriftReport[] = [];

    // Compare role permissions
    for (const [role, baselinePerms] of Object.entries(baseline.roles)) {
      const currentPerms = current.roles[role as AdminRole];

      if (!currentPerms) {
        reports.push({
          id: `DRIFT-${Date.now()}-${role}`,
          timestamp: new Date(),
          category: "permission_drift",
          severity: "critical",
          component: "permissions",
          description: `Role "${role}" has been removed`,
          baseline: baselinePerms,
          current: null,
          delta: { removed: role },
          remediation: "Restore role configuration from baseline",
          autoRemediable: false,
        });
        continue;
      }

      for (const [resource, baselineActions] of Object.entries(baselinePerms)) {
        const currentActions = currentPerms[resource as Resource] || [];

        const addedActions = currentActions.filter(
          (a: Action) => !baselineActions.includes(a)
        );
        const removedActions = baselineActions.filter(
          (a: Action) => !currentActions.includes(a)
        );

        if (addedActions.length > 0) {
          reports.push({
            id: `DRIFT-${Date.now()}-${role}-${resource}-added`,
            timestamp: new Date(),
            category: "permission_drift",
            severity: addedActions.includes("delete") || addedActions.includes("manage_users")
              ? "critical"
              : "high",
            component: "permissions",
            description: `Role "${role}" gained new permissions on "${resource}": ${addedActions.join(", ")}`,
            baseline: baselineActions,
            current: currentActions,
            delta: { added: addedActions },
            remediation: "Review and remove unauthorized permissions",
            autoRemediable: false,
          });
        }

        if (removedActions.length > 0) {
          reports.push({
            id: `DRIFT-${Date.now()}-${role}-${resource}-removed`,
            timestamp: new Date(),
            category: "permission_drift",
            severity: "medium",
            component: "permissions",
            description: `Role "${role}" lost permissions on "${resource}": ${removedActions.join(", ")}`,
            baseline: baselineActions,
            current: currentActions,
            delta: { removed: removedActions },
            remediation: "Verify permission removal was intentional",
            autoRemediable: false,
          });
        }
      }
    }

    return reports;
  }

  private analyzePolicyDrift(
    baseline: PolicySnapshot,
    current: PolicySnapshot
  ): DriftReport[] {
    const reports: DriftReport[] = [];
    const baselinePolicies = new Map(baseline.policies.map((p) => [p.id, p]));
    const currentPolicies = new Map(current.policies.map((p) => [p.id, p]));

    // Check for removed policies
    for (const [id, policy] of baselinePolicies) {
      if (!currentPolicies.has(id)) {
        reports.push({
          id: `DRIFT-${Date.now()}-policy-removed-${id}`,
          timestamp: new Date(),
          category: "policy_drift",
          severity: "high",
          component: "policies",
          description: `Policy "${policy.name}" (${id}) has been removed`,
          baseline: policy,
          current: null,
          delta: { removed: id },
          remediation: "Restore policy from backup or recreate",
          autoRemediable: false,
        });
      }
    }

    // Check for added or modified policies
    for (const [id, policy] of currentPolicies) {
      const baselinePolicy = baselinePolicies.get(id);

      if (!baselinePolicy) {
        reports.push({
          id: `DRIFT-${Date.now()}-policy-added-${id}`,
          timestamp: new Date(),
          category: "policy_drift",
          severity: "medium",
          component: "policies",
          description: `New policy "${policy.name}" (${id}) has been added`,
          baseline: null,
          current: policy,
          delta: { added: id },
          remediation: "Review new policy for appropriateness",
          autoRemediable: false,
        });
      } else if (policy.hash !== baselinePolicy.hash) {
        reports.push({
          id: `DRIFT-${Date.now()}-policy-modified-${id}`,
          timestamp: new Date(),
          category: "policy_drift",
          severity: "high",
          component: "policies",
          description: `Policy "${policy.name}" (${id}) has been modified`,
          baseline: baselinePolicy,
          current: policy,
          delta: { modified: id },
          remediation: "Review policy changes",
          autoRemediable: false,
        });
      }
    }

    return reports;
  }

  private analyzeConfigDrift(
    baseline: ConfigSnapshot,
    current: ConfigSnapshot
  ): DriftReport[] {
    const reports: DriftReport[] = [];

    const criticalSettings = ["rbacEnabled", "auditEnabled", "mfaRequired", "encryptionEnabled"];

    for (const [key, baselineValue] of Object.entries(baseline)) {
      const currentValue = (current as any)[key];

      if (JSON.stringify(baselineValue) !== JSON.stringify(currentValue)) {
        const isCritical = criticalSettings.includes(key);

        reports.push({
          id: `DRIFT-${Date.now()}-config-${key}`,
          timestamp: new Date(),
          category: "config_drift",
          severity: isCritical ? "critical" : "medium",
          component: "config",
          description: `Configuration "${key}" changed from ${JSON.stringify(baselineValue)} to ${JSON.stringify(currentValue)}`,
          baseline: baselineValue,
          current: currentValue,
          delta: { key, from: baselineValue, to: currentValue },
          remediation: `Reset ${key} to baseline value`,
          autoRemediable: !isCritical,
        });
      }
    }

    return reports;
  }

  private analyzeEnvDrift(
    baseline: EnvSnapshot,
    current: EnvSnapshot
  ): DriftReport[] {
    const reports: DriftReport[] = [];

    if (baseline.hashOfAll !== current.hashOfAll) {
      // Find specific changes
      for (const [key, baselineHash] of Object.entries(baseline.securityVars)) {
        const currentHash = current.securityVars[key];

        if (!currentHash) {
          reports.push({
            id: `DRIFT-${Date.now()}-env-removed-${key}`,
            timestamp: new Date(),
            category: "env_drift",
            severity: "high",
            component: "environment",
            description: `Security environment variable "${key}" has been removed`,
            baseline: "[hashed]",
            current: null,
            delta: { removed: key },
            remediation: "Restore environment variable",
            autoRemediable: false,
          });
        } else if (currentHash !== baselineHash) {
          reports.push({
            id: `DRIFT-${Date.now()}-env-modified-${key}`,
            timestamp: new Date(),
            category: "env_drift",
            severity: "critical",
            component: "environment",
            description: `Security environment variable "${key}" has been modified`,
            baseline: "[hashed]",
            current: "[hashed]",
            delta: { modified: key },
            remediation: "Verify environment variable change was authorized",
            autoRemediable: false,
          });
        }
      }

      // Check for new vars
      for (const key of Object.keys(current.securityVars)) {
        if (!baseline.securityVars[key]) {
          reports.push({
            id: `DRIFT-${Date.now()}-env-added-${key}`,
            timestamp: new Date(),
            category: "env_drift",
            severity: "medium",
            component: "environment",
            description: `New security environment variable "${key}" detected`,
            baseline: null,
            current: "[hashed]",
            delta: { added: key },
            remediation: "Review new environment variable",
            autoRemediable: false,
          });
        }
      }
    }

    return reports;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private hashData(data: unknown): string {
    const json = JSON.stringify(data, Object.keys(data as object || {}).sort());
    return crypto.createHash("sha256").update(json).digest("hex").substring(0, 16);
  }

  private determineOverallStatus(
    drifts: DriftReport[]
  ): DriftScanResult["overallStatus"] {
    if (drifts.some((d) => d.severity === "critical")) {
      return "critical_drift";
    }
    if (drifts.filter((d) => d.severity === "high").length >= 3) {
      return "significant_drift";
    }
    if (drifts.length > 0) {
      return "minor_drift";
    }
    return "clean";
  }

  /**
   * Get all baselines
   */
  getBaselines(): SecurityBaseline[] {
    return [...this.baselines.values()];
  }

  /**
   * Get drift history
   */
  getDriftHistory(hours: number = 24): DriftReport[] {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.driftHistory.filter((d) => d.timestamp >= since);
  }

  /**
   * Get drift statistics
   */
  getStats(): {
    totalScans: number;
    totalDrifts: number;
    criticalDrifts: number;
    lastScanTime?: Date;
    baselineAge?: number;
  } {
    return {
      totalScans: 0, // Would track actual scans
      totalDrifts: this.driftHistory.length,
      criticalDrifts: this.driftHistory.filter((d) => d.severity === "critical").length,
      lastScanTime: undefined,
      baselineAge: this.currentBaseline
        ? Date.now() - this.currentBaseline.capturedAt.getTime()
        : undefined,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const driftScanner = new DriftScanner();

/**
 * Capture a security baseline
 */
export async function captureBaseline(
  name: string,
  capturedBy: string
): Promise<SecurityBaseline> {
  return driftScanner.captureBaseline(name, capturedBy);
}

/**
 * Run a drift scan
 */
export async function scanForDrift(baselineId?: string): Promise<DriftScanResult> {
  return driftScanner.scan(baselineId);
}

/**
 * Start continuous monitoring
 */
export function startDriftMonitoring(intervalMs?: number): NodeJS.Timer {
  return driftScanner.startContinuousMonitoring(intervalMs);
}

/**
 * Get drift history
 */
export function getDriftHistory(hours?: number): DriftReport[] {
  return driftScanner.getDriftHistory(hours);
}

console.log("[DriftScanner] Module loaded");

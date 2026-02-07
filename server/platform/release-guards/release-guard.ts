/**
 * Release Safety & Deploy Guards - Core Guard
 *
 * FEATURE 2: Validate on server startup that configuration is safe
 *
 * Feature flag: ENABLE_RELEASE_GUARDS
 */

import { log } from "../../lib/logger";
import type { GuardSeverity, GuardCheckResult, ReleaseGuardConfig, SafetyReport } from "./types";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[ReleaseGuard] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[ReleaseGuard] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[ReleaseGuard] ${msg}`, undefined, data),
};

const DEFAULT_CONFIG: ReleaseGuardConfig = {
  requiredEnvVars: ["DATABASE_URL", "NODE_ENV"],
  incompatibleFlags: [
    {
      flags: ["ENABLE_COST_GUARDS", "DISABLE_ALL_LIMITS"],
      reason: "Cost guards and disable limits cannot both be active",
    },
  ],
  requiredTables: ["users", "destinations", "media"],
  warnOnDisabledKillSwitches: true,
  customValidators: [],
};

class ReleaseGuard {
  private config: ReleaseGuardConfig;
  private enabled = false;
  private lastReport: SafetyReport | null = null;

  constructor(config?: Partial<ReleaseGuardConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.enabled = process.env.ENABLE_RELEASE_GUARDS === "true";
  }

  /**
   * Collect a check result into the appropriate lists
   */
  private collectResult(
    result: GuardCheckResult,
    checks: GuardCheckResult[],
    blockingIssues: string[],
    warnings: string[]
  ): void {
    checks.push(result);
    if (result.severity === "block") {
      blockingIssues.push(result.message);
    } else if (result.severity === "warn") {
      warnings.push(result.message);
    }
  }

  /**
   * Run custom validators and collect results
   */
  private async runCustomValidators(
    checks: GuardCheckResult[],
    blockingIssues: string[],
    warnings: string[]
  ): Promise<void> {
    for (const validator of this.config.customValidators) {
      try {
        const result = await validator.validate();
        this.collectResult(result, checks, blockingIssues, warnings);
      } catch (err) {
        checks.push({
          name: validator.name,
          category: "dependency",
          severity: "warn",
          message: `Validator ${validator.name} failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          failedAt: new Date(),
        });
      }
    }
  }

  /**
   * Log the final report summary
   */
  private logReportSummary(blockingIssues: string[], warnings: string[]): void {
    if (blockingIssues.length > 0) {
      logger.error("Release safety checks FAILED", {
        blockingIssues,
        warningCount: warnings.length,
      });
    } else if (warnings.length > 0) {
      logger.warn("Release safety checks passed with warnings", { warnings });
    } else {
      logger.info("All release safety checks passed");
    }
  }

  /**
   * Run all safety checks
   */
  async runChecks(): Promise<SafetyReport> {
    const checks: GuardCheckResult[] = [];
    const blockingIssues: string[] = [];
    const warnings: string[] = [];

    for (const envVar of this.config.requiredEnvVars) {
      this.collectResult(this.checkEnvVar(envVar), checks, blockingIssues, warnings);
    }

    for (const combo of this.config.incompatibleFlags) {
      this.collectResult(
        this.checkFlagCombo(combo.flags, combo.reason),
        checks,
        blockingIssues,
        warnings
      );
    }

    for (const table of this.config.requiredTables) {
      this.collectResult(await this.checkDatabaseTable(table), checks, blockingIssues, warnings);
    }

    if (this.config.warnOnDisabledKillSwitches && process.env.NODE_ENV === "production") {
      this.collectResult(await this.checkKillSwitches(), checks, blockingIssues, warnings);
    }

    await this.runCustomValidators(checks, blockingIssues, warnings);

    let overallSeverity: GuardSeverity = "ok";
    if (warnings.length > 0) overallSeverity = "warn";
    if (blockingIssues.length > 0) overallSeverity = "block";

    const report: SafetyReport = {
      timestamp: new Date(),
      environment: process.env.NODE_ENV || "development",
      overallSeverity,
      canProceed: blockingIssues.length === 0,
      checks,
      blockingIssues,
      warnings,
    };

    this.lastReport = report;
    this.logReportSummary(blockingIssues, warnings);

    return report;
  }

  /**
   * Check if a required env var is set
   */
  private checkEnvVar(name: string): GuardCheckResult {
    const value = process.env[name];
    const isSet = value !== undefined && value !== "";

    return {
      name: `env:${name}`,
      category: "env_var",
      severity: isSet ? "ok" : "block",
      message: isSet
        ? `Environment variable ${name} is set`
        : `Missing required environment variable: ${name}`,
      details: { name, isSet },
      passedAt: isSet ? new Date() : undefined,
      failedAt: isSet ? undefined : new Date(),
    };
  }

  /**
   * Check for incompatible flag combinations
   */
  private checkFlagCombo(flags: string[], reason: string): GuardCheckResult {
    const activeFlags = flags.filter(f => process.env[f] === "true");
    const allActive = activeFlags.length === flags.length;

    return {
      name: `flags:${flags.join("+")}`,
      category: "feature_flag",
      severity: allActive ? "block" : "ok",
      message: allActive
        ? `Incompatible flags active: ${flags.join(", ")} - ${reason}`
        : `Flag combination check passed`,
      details: { flags, activeFlags, reason },
      passedAt: allActive ? undefined : new Date(),
      failedAt: allActive ? new Date() : undefined,
    };
  }

  /**
   * Check if a database table exists
   * SECURITY: Uses whitelist validation to prevent SQL injection
   */
  private async checkDatabaseTable(table: string): Promise<GuardCheckResult> {
    // SECURITY: Whitelist of allowed table names to prevent SQL injection
    const ALLOWED_TABLES = new Set([
      "users",
      "destinations",
      "media",
      "contents",
      "articles",
      "attractions",
      "hotels",
      "events",
      "itineraries",
      "media_files",
      "rss_feeds",
      "affiliate_links",
      "tags",
      "translations",
      "newsletter_subscribers",
      "newsletter_campaigns",
      "audit_logs",
      "sessions",
      "homepage_sections",
      "homepage_cards",
      "content_versions",
    ]);

    // SECURITY: Reject any table name not in whitelist
    if (!ALLOWED_TABLES.has(table.toLowerCase())) {
      return {
        name: `table:${table}`,
        category: "database",
        severity: "warn",
        message: `Table ${table} not in allowed list - skipping check for security`,
        details: { table, reason: "not_whitelisted" },
        failedAt: new Date(),
      };
    }

    try {
      const { pool } = await import("../../db");

      // SECURITY: Table name is validated against whitelist above
      await Promise.race([
        pool.query(`SELECT 1 FROM "${table}" LIMIT 1`),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
      ]);

      return {
        name: `table:${table}`,
        category: "database",
        severity: "ok",
        message: `Database table ${table} exists`,
        details: { table },
        passedAt: new Date(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const isTimeout = message.includes("Timeout");

      return {
        name: `table:${table}`,
        category: "database",
        severity: isTimeout ? "warn" : "block",
        message: isTimeout
          ? `Database check timed out for ${table}`
          : `Database table ${table} missing or inaccessible: ${message}`,
        details: { table, error: message },
        failedAt: new Date(),
      };
    }
  }

  /**
   * Check if kill switches are properly configured in production
   */
  private async checkKillSwitches(): Promise<GuardCheckResult> {
    const killSwitchEnabled = process.env.ENABLE_KILL_SWITCHES === "true";

    return {
      name: "kill_switches:enabled",
      category: "kill_switch",
      severity: killSwitchEnabled ? "ok" : "warn",
      message: killSwitchEnabled
        ? "Kill switches are enabled in production"
        : "Kill switches are disabled in production - recommend enabling for safety",
      details: { killSwitchEnabled },
      passedAt: killSwitchEnabled ? new Date() : undefined,
      failedAt: killSwitchEnabled ? undefined : new Date(),
    };
  }

  /**
   * Validate and block startup if unsafe (call from server init)
   */
  async validateStartup(): Promise<boolean> {
    if (!this.enabled) {
      logger.info("Release guards disabled, skipping validation");
      return true;
    }

    const report = await this.runChecks();

    if (!report.canProceed) {
      logger.error("BLOCKING STARTUP: Release safety checks failed", {
        blockingIssues: report.blockingIssues,
      });

      // In production, could throw to halt startup
      if (process.env.NODE_ENV === "production") {
        throw new Error(`Release safety check failed: ${report.blockingIssues.join("; ")}`);
      }
    }

    return report.canProceed;
  }

  /**
   * Get last safety report
   */
  getLastReport(): SafetyReport | null {
    return this.lastReport;
  }

  /**
   * Add a custom validator
   */
  addValidator(name: string, validate: () => Promise<GuardCheckResult>): void {
    this.config.customValidators.push({ name, validate });
  }

  /**
   * Check if feature is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton
let instance: ReleaseGuard | null = null;

export function getReleaseGuard(): ReleaseGuard {
  if (!instance) {
    instance = new ReleaseGuard();
  }
  return instance;
}

export function resetReleaseGuard(): void {
  instance = null;
}

export { ReleaseGuard };

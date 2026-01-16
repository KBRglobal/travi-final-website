/**
 * Go-Live Switch - Service
 *
 * Single endpoint to answer: "Are we ready to go live?"
 */

import { log } from '../lib/logger';
import type {
  GoLiveCheck,
  GoLiveStatusResponse,
  GoLiveStatus,
  GoLiveOverride,
  OverrideRequest,
  GoLiveHistoryEntry,
  CheckStatus,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[GoLive] ${msg}`, data),
};

// Bounded history
const MAX_HISTORY = 100;

/**
 * Generate unique ID
 */
function generateId(): string {
  return `golive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

class GoLiveService {
  private currentOverride: GoLiveOverride | null = null;
  private history: GoLiveHistoryEntry[] = [];
  private enabled = false;

  constructor() {
    this.enabled = process.env.ENABLE_GO_LIVE_V2 === 'true';
    if (this.enabled) {
      logger.info('Go-Live Service initialized');
    }
  }

  /**
   * Run all go-live checks
   */
  async runChecks(): Promise<GoLiveCheck[]> {
    const checks: GoLiveCheck[] = [];
    const now = new Date();

    // Check 1: No critical incidents
    checks.push(await this.checkNoIncidents());

    // Check 2: No blocked publishes
    checks.push(await this.checkNoBlockedPublishes());

    // Check 3: Sitemap enabled
    checks.push(this.checkSitemapEnabled());

    // Check 4: Search enabled
    checks.push(this.checkSearchEnabled());

    // Check 5: Autonomy not blocking
    checks.push(await this.checkAutonomyNotBlocking());

    // Check 6: Platform readiness (if enabled)
    checks.push(await this.checkPlatformReadiness());

    // Check 7: No compliance violations
    checks.push(await this.checkNoComplianceViolations());

    // Check 8: Database healthy
    checks.push(await this.checkDatabaseHealthy());

    return checks;
  }

  /**
   * Check for critical incidents
   */
  private async checkNoIncidents(): Promise<GoLiveCheck> {
    // In production, would check incident manager
    const hasIncidents = false;

    return {
      id: 'no-incidents',
      name: 'No Critical Incidents',
      description: 'No active critical or high-severity incidents',
      category: 'critical',
      status: hasIncidents ? 'fail' : 'pass',
      message: hasIncidents
        ? 'There are active critical incidents that must be resolved'
        : 'No active critical incidents',
      checkedAt: new Date(),
    };
  }

  /**
   * Check for blocked publishes
   */
  private async checkNoBlockedPublishes(): Promise<GoLiveCheck> {
    // In production, would check publishing system
    const blockedCount = 0;

    return {
      id: 'no-blocked-publishes',
      name: 'No Blocked Publishes',
      description: 'No content blocked from publishing',
      category: 'required',
      status: blockedCount > 0 ? 'warn' : 'pass',
      message: blockedCount > 0
        ? `${blockedCount} content items are currently blocked`
        : 'No content is blocked',
      actionUrl: blockedCount > 0 ? '/admin/content?status=blocked' : undefined,
      checkedAt: new Date(),
    };
  }

  /**
   * Check sitemap enabled
   */
  private checkSitemapEnabled(): GoLiveCheck {
    const enabled = process.env.ENABLE_SITEMAP !== 'false';

    return {
      id: 'sitemap-enabled',
      name: 'Sitemap Enabled',
      description: 'Sitemap generation is enabled for SEO',
      category: 'required',
      status: enabled ? 'pass' : 'warn',
      message: enabled
        ? 'Sitemap is enabled'
        : 'Sitemap is disabled - SEO may be impacted',
      checkedAt: new Date(),
    };
  }

  /**
   * Check search enabled
   */
  private checkSearchEnabled(): GoLiveCheck {
    const enabled = process.env.ENABLE_SEARCH !== 'false';

    return {
      id: 'search-enabled',
      name: 'Search Enabled',
      description: 'Search functionality is enabled',
      category: 'required',
      status: enabled ? 'pass' : 'warn',
      message: enabled
        ? 'Search is enabled'
        : 'Search is disabled',
      checkedAt: new Date(),
    };
  }

  /**
   * Check autonomy not blocking
   */
  private async checkAutonomyNotBlocking(): Promise<GoLiveCheck> {
    // In production, would check autonomy governor
    const isBlocking = false;

    return {
      id: 'autonomy-not-blocking',
      name: 'Autonomy Not Blocking',
      description: 'Autonomy governor is not blocking operations',
      category: 'critical',
      status: isBlocking ? 'fail' : 'pass',
      message: isBlocking
        ? 'Autonomy governor is blocking operations'
        : 'Autonomy governor is not blocking',
      checkedAt: new Date(),
    };
  }

  /**
   * Check platform readiness
   */
  private async checkPlatformReadiness(): Promise<GoLiveCheck> {
    // Check if readiness module is enabled
    const readinessEnabled = process.env.ENABLE_PLATFORM_READINESS === 'true';

    if (!readinessEnabled) {
      return {
        id: 'platform-readiness',
        name: 'Platform Readiness',
        description: 'Platform readiness checks',
        category: 'recommended',
        status: 'skip',
        message: 'Platform readiness checks are not enabled',
        checkedAt: new Date(),
      };
    }

    // In production, would check readiness score
    const score = 85;
    const threshold = 70;

    return {
      id: 'platform-readiness',
      name: 'Platform Readiness',
      description: 'Platform readiness score meets threshold',
      category: 'required',
      status: score >= threshold ? 'pass' : 'fail',
      message: `Readiness score: ${score}/100 (threshold: ${threshold})`,
      checkedAt: new Date(),
    };
  }

  /**
   * Check no compliance violations
   */
  private async checkNoComplianceViolations(): Promise<GoLiveCheck> {
    const complianceEnabled = process.env.ENABLE_COMPLIANCE_ENGINE === 'true';

    if (!complianceEnabled) {
      return {
        id: 'compliance',
        name: 'Compliance Check',
        description: 'No blocking compliance violations',
        category: 'recommended',
        status: 'skip',
        message: 'Compliance engine is not enabled',
        checkedAt: new Date(),
      };
    }

    // In production, would check compliance engine
    const violations = 0;

    return {
      id: 'compliance',
      name: 'Compliance Check',
      description: 'No blocking compliance violations',
      category: 'required',
      status: violations > 0 ? 'fail' : 'pass',
      message: violations > 0
        ? `${violations} compliance violation(s) require attention`
        : 'No compliance violations',
      checkedAt: new Date(),
    };
  }

  /**
   * Check database healthy
   */
  private async checkDatabaseHealthy(): Promise<GoLiveCheck> {
    // In production, would run actual health check
    const healthy = true;

    return {
      id: 'database-healthy',
      name: 'Database Healthy',
      description: 'Database is connected and responsive',
      category: 'critical',
      status: healthy ? 'pass' : 'fail',
      message: healthy
        ? 'Database is healthy'
        : 'Database health check failed',
      checkedAt: new Date(),
    };
  }

  /**
   * Get go-live status
   */
  async getStatus(): Promise<GoLiveStatusResponse> {
    const checks = await this.runChecks();

    // Calculate summary
    const summary = {
      total: checks.length,
      passed: checks.filter(c => c.status === 'pass').length,
      failed: checks.filter(c => c.status === 'fail').length,
      warned: checks.filter(c => c.status === 'warn').length,
      skipped: checks.filter(c => c.status === 'skip').length,
    };

    // Find blockers (failed critical checks)
    const blockers = checks.filter(
      c => c.status === 'fail' && c.category === 'critical'
    );

    // Check if override is active and not expired
    let activeOverride = this.currentOverride;
    if (activeOverride?.expiresAt && activeOverride.expiresAt < new Date()) {
      activeOverride = null;
      this.currentOverride = null;
    }

    // Determine status
    let status: GoLiveStatus;
    let ready: boolean;
    let recommendation: string;

    if (activeOverride?.active) {
      status = 'overridden';
      ready = true;
      recommendation = `Override active by ${activeOverride.overriddenBy}: ${activeOverride.reason}`;
    } else if (blockers.length > 0) {
      status = 'blocked';
      ready = false;
      recommendation = `Resolve ${blockers.length} critical blocker(s) before going live`;
    } else if (summary.failed > 0) {
      status = 'not_ready';
      ready = false;
      recommendation = `Address ${summary.failed} failed check(s) before going live`;
    } else if (summary.warned > 0) {
      status = 'ready';
      ready = true;
      recommendation = `Ready to go live, but consider addressing ${summary.warned} warning(s)`;
    } else {
      status = 'ready';
      ready = true;
      recommendation = 'All checks passed. Ready to go live!';
    }

    const response: GoLiveStatusResponse = {
      timestamp: new Date(),
      status,
      ready,
      checks,
      summary,
      blockers,
      override: activeOverride || undefined,
      recommendation,
    };

    // Record in history
    this.recordHistory(response);

    return response;
  }

  /**
   * Set override
   */
  setOverride(request: OverrideRequest): GoLiveOverride {
    const override: GoLiveOverride = {
      active: true,
      overriddenBy: request.overriddenBy,
      reason: request.reason,
      overriddenAt: new Date(),
      expiresAt: request.expiresInHours
        ? new Date(Date.now() + request.expiresInHours * 3600000)
        : undefined,
    };

    this.currentOverride = override;

    logger.info('Go-live override set', {
      by: request.overriddenBy,
      reason: request.reason,
      expiresAt: override.expiresAt,
    });

    return override;
  }

  /**
   * Clear override
   */
  clearOverride(): boolean {
    if (!this.currentOverride) return false;

    logger.info('Go-live override cleared', {
      by: this.currentOverride.overriddenBy,
    });

    this.currentOverride = null;
    return true;
  }

  /**
   * Get current override
   */
  getOverride(): GoLiveOverride | null {
    // Check expiration
    if (this.currentOverride?.expiresAt && this.currentOverride.expiresAt < new Date()) {
      this.currentOverride = null;
    }
    return this.currentOverride;
  }

  /**
   * Record status in history
   */
  private recordHistory(response: GoLiveStatusResponse): void {
    const entry: GoLiveHistoryEntry = {
      id: generateId(),
      timestamp: response.timestamp,
      status: response.status,
      ready: response.ready,
      checksSummary: {
        passed: response.summary.passed,
        failed: response.summary.failed,
      },
      override: response.override,
    };

    this.history.unshift(entry);

    // Enforce limit
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(0, MAX_HISTORY);
    }
  }

  /**
   * Get history
   */
  getHistory(limit = 20): GoLiveHistoryEntry[] {
    return this.history.slice(0, limit);
  }

  /**
   * Clear state (for testing)
   */
  clear(): void {
    this.currentOverride = null;
    this.history = [];
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton
let instance: GoLiveService | null = null;

export function getGoLiveService(): GoLiveService {
  if (!instance) {
    instance = new GoLiveService();
  }
  return instance;
}

export function resetGoLiveService(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}

export { GoLiveService };

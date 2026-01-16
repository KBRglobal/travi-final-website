/**
 * Admin Dashboard Backend - Service
 *
 * Aggregates data from various systems for frontend display.
 */

import { log } from '../lib/logger';
import type {
  DashboardSummary,
  ContentDashboard,
  SystemDashboard,
  ContentCounts,
  SystemHealth,
  Issue,
  ScheduledPublish,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[Dashboard] ${msg}`, data),
};

/**
 * Get content counts (simulated - in production would query DB)
 */
function getContentCounts(): ContentCounts {
  // In production, this would query the actual content database
  return {
    total: 150,
    byStatus: {
      draft: 25,
      pending_review: 10,
      approved: 15,
      published: 85,
      unpublished: 10,
      blocked: 5,
    },
    recentlyPublished: 8,
    recentlyUpdated: 15,
    needsReview: 10,
  };
}

/**
 * Get system health from various sources
 */
async function getSystemHealth(): Promise<SystemHealth> {
  const components: SystemHealth['components'] = [];

  // Check various system components
  // In production, these would be actual health checks

  // Database
  components.push({
    name: 'Database',
    status: 'healthy',
  });

  // Search
  const searchEnabled = process.env.ENABLE_SEARCH !== 'false';
  components.push({
    name: 'Search',
    status: searchEnabled ? 'healthy' : 'unknown',
    message: searchEnabled ? undefined : 'Search is disabled',
  });

  // AI Providers
  components.push({
    name: 'AI Providers',
    status: 'healthy',
  });

  // Cache
  components.push({
    name: 'Cache',
    status: 'healthy',
  });

  // Calculate overall status
  const hasError = components.some(c => c.status === 'critical');
  const hasDegraded = components.some(c => c.status === 'degraded');
  const hasUnknown = components.some(c => c.status === 'unknown');

  let overallStatus: SystemHealth['overallStatus'] = 'healthy';
  let score = 100;

  if (hasError) {
    overallStatus = 'critical';
    score = 30;
  } else if (hasDegraded) {
    overallStatus = 'degraded';
    score = 70;
  } else if (hasUnknown) {
    score = 90;
  }

  return {
    overallStatus,
    score,
    components,
    lastChecked: new Date(),
  };
}

/**
 * Get top issues
 */
function getTopIssues(limit = 5): Issue[] {
  // In production, this would aggregate issues from:
  // - Compliance violations
  // - Health warnings
  // - Blocked content
  // - Incidents

  const issues: Issue[] = [];

  // Check for blocked content
  const counts = getContentCounts();
  if (counts.byStatus.blocked > 0) {
    issues.push({
      id: 'issue-blocked-content',
      type: 'warning',
      title: `${counts.byStatus.blocked} content items blocked`,
      description: 'Some content is blocked from publishing due to policy violations or quality issues.',
      source: 'content',
      createdAt: new Date(),
      actionUrl: '/admin/content?status=blocked',
    });
  }

  // Check for pending reviews
  if (counts.needsReview > 5) {
    issues.push({
      id: 'issue-pending-reviews',
      type: 'warning',
      title: `${counts.needsReview} items pending review`,
      description: 'Content is waiting for approval.',
      source: 'workflow',
      createdAt: new Date(),
      actionUrl: '/admin/content?status=pending_review',
    });
  }

  return issues.slice(0, limit);
}

/**
 * Get scheduled publishes
 */
function getScheduledPublishes(): ScheduledPublish[] {
  // In production, this would query scheduled content
  return [];
}

/**
 * Get feature status
 */
function getFeatureStatus(): { name: string; enabled: boolean; status: 'active' | 'inactive' | 'error' }[] {
  const features = [
    { name: 'Notifications', envKey: 'ENABLE_NOTIFICATIONS' },
    { name: 'Activity Feed', envKey: 'ENABLE_ACTIVITY_FEED' },
    { name: 'Compliance Engine', envKey: 'ENABLE_COMPLIANCE_ENGINE' },
    { name: 'Decision Simulator', envKey: 'ENABLE_DECISION_SIMULATOR' },
    { name: 'Org Memory', envKey: 'ENABLE_ORG_MEMORY' },
    { name: 'Intelligence Hub', envKey: 'ENABLE_INTELLIGENCE_HUB' },
    { name: 'Import/Export', envKey: 'ENABLE_IMPORT_EXPORT' },
    { name: 'Go-Live v2', envKey: 'ENABLE_GO_LIVE_V2' },
  ];

  return features.map(f => ({
    name: f.name,
    enabled: process.env[f.envKey] === 'true',
    status: process.env[f.envKey] === 'true' ? 'active' as const : 'inactive' as const,
  }));
}

class DashboardService {
  private enabled = false;

  constructor() {
    this.enabled = process.env.ENABLE_ADMIN_DASHBOARD === 'true';
    if (this.enabled) {
      logger.info('Dashboard Service initialized');
    }
  }

  /**
   * Get dashboard summary
   */
  async getSummary(): Promise<DashboardSummary> {
    const counts = getContentCounts();
    const health = await getSystemHealth();
    const issues = getTopIssues();
    const scheduled = getScheduledPublishes();

    return {
      timestamp: new Date(),
      content: {
        total: counts.total,
        published: counts.byStatus.published,
        drafts: counts.byStatus.draft,
        pendingReview: counts.byStatus.pending_review,
        blocked: counts.byStatus.blocked,
        recentlyPublished: counts.recentlyPublished,
      },
      issues: {
        total: issues.length,
        critical: issues.filter(i => i.type === 'critical').length,
        warnings: issues.filter(i => i.type === 'warning').length,
        topIssues: issues,
      },
      system: {
        status: health.overallStatus,
        healthScore: health.score,
      },
      upcoming: {
        scheduledPublishes: scheduled.length,
        pendingApprovals: counts.needsReview,
      },
    };
  }

  /**
   * Get content dashboard
   */
  async getContentDashboard(): Promise<ContentDashboard> {
    const counts = getContentCounts();
    const scheduled = getScheduledPublishes();

    return {
      timestamp: new Date(),
      counts,
      recentlyPublished: [],  // Would query DB
      recentlyUpdated: [],    // Would query DB
      blocked: [],            // Would query DB
      pendingReview: [],      // Would query DB
      scheduled,
    };
  }

  /**
   * Get system dashboard
   */
  async getSystemDashboard(): Promise<SystemDashboard> {
    const health = await getSystemHealth();
    const features = getFeatureStatus();
    const issues = getTopIssues(10);

    return {
      timestamp: new Date(),
      health,
      features,
      recentIssues: issues,
      stats: {
        activeIncidents: 0,
        resolvedToday: 0,
      },
    };
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton
let instance: DashboardService | null = null;

export function getDashboardService(): DashboardService {
  if (!instance) {
    instance = new DashboardService();
  }
  return instance;
}

export function resetDashboardService(): void {
  instance = null;
}

export { DashboardService };

/**
 * Admin Dashboard Backend - Types
 */

export type ContentStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'unpublished' | 'blocked';

/**
 * Content counts by status
 */
export interface ContentCounts {
  total: number;
  byStatus: Record<ContentStatus, number>;
  recentlyPublished: number;
  recentlyUpdated: number;
  needsReview: number;
}

/**
 * System health overview
 */
export interface SystemHealth {
  overallStatus: 'healthy' | 'degraded' | 'critical' | 'unknown';
  score: number;          // 0-100
  components: {
    name: string;
    status: 'healthy' | 'degraded' | 'critical' | 'unknown';
    message?: string;
  }[];
  lastChecked: Date;
}

/**
 * Issue summary
 */
export interface Issue {
  id: string;
  type: 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  source: string;
  entityId?: string;
  entityType?: string;
  createdAt: Date;
  actionUrl?: string;
}

/**
 * Scheduled publish
 */
export interface ScheduledPublish {
  contentId: string;
  contentTitle: string;
  scheduledFor: Date;
  status: 'pending' | 'ready' | 'blocked';
  blockedReason?: string;
}

/**
 * Dashboard summary response
 */
export interface DashboardSummary {
  timestamp: Date;

  // Content overview
  content: {
    total: number;
    published: number;
    drafts: number;
    pendingReview: number;
    blocked: number;
    recentlyPublished: number; // Last 24h
  };

  // Issues
  issues: {
    total: number;
    critical: number;
    warnings: number;
    topIssues: Issue[];
  };

  // System
  system: {
    status: 'healthy' | 'degraded' | 'critical' | 'unknown';
    healthScore: number;
  };

  // Upcoming
  upcoming: {
    scheduledPublishes: number;
    pendingApprovals: number;
  };
}

/**
 * Content dashboard response
 */
export interface ContentDashboard {
  timestamp: Date;

  counts: ContentCounts;

  // Recent activity
  recentlyPublished: {
    contentId: string;
    title: string;
    publishedAt: Date;
    publishedBy: string;
  }[];

  recentlyUpdated: {
    contentId: string;
    title: string;
    updatedAt: Date;
    updatedBy: string;
  }[];

  // Blocked content
  blocked: {
    contentId: string;
    title: string;
    blockedAt: Date;
    reason: string;
  }[];

  // Pending review
  pendingReview: {
    contentId: string;
    title: string;
    submittedAt: Date;
    submittedBy: string;
  }[];

  // Scheduled
  scheduled: ScheduledPublish[];
}

/**
 * System dashboard response
 */
export interface SystemDashboard {
  timestamp: Date;

  health: SystemHealth;

  // Feature status
  features: {
    name: string;
    enabled: boolean;
    status: 'active' | 'inactive' | 'error';
  }[];

  // Recent issues
  recentIssues: Issue[];

  // Stats
  stats: {
    activeIncidents: number;
    resolvedToday: number;
    avgResponseTime?: number;
  };
}

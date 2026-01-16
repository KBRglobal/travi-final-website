/**
 * Unified Dashboards Configuration
 *
 * Role-based dashboard configurations for PM, SEO, and Ops teams.
 * Each dashboard provides metrics and insights relevant to the role.
 */

import { log } from '../../lib/logger';
import { getMetricsRegistry, getMetricsForDashboard } from '../registry';
import { getOpportunitiesEngine, getOpportunitySummary } from '../opportunities';
import { getAnomalyDetector, getCriticalAnomalies } from '../anomaly';
import { getSnapshotStore, compareWeekOverWeek } from '../snapshots';
import { getFunnelSystem, analyzeFunnel, PREDEFINED_FUNNELS } from '../funnel';
import type {
  DashboardConfig,
  DashboardWidget,
  DashboardRole,
  MetricDefinition,
} from '../registry/types';
import type { GrowthOpportunity, OpportunitySummary } from '../opportunities';
import type { Anomaly } from '../anomaly';
import type { ComparisonReport } from '../snapshots';
import type { FunnelAnalysis } from '../funnel';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[Dashboards] ${msg}`, data),
};

// =====================================================
// DASHBOARD DATA TYPES
// =====================================================

export interface DashboardData {
  role: DashboardRole;
  config: DashboardConfig;
  data: {
    kpis: KPIData[];
    charts: ChartData[];
    alerts: AlertData[];
    opportunities: GrowthOpportunity[];
    funnel?: FunnelAnalysis;
    comparison?: ComparisonReport;
    summary: DashboardSummary;
  };
  generatedAt: Date;
}

export interface KPIData {
  id: string;
  name: string;
  value: number;
  formattedValue: string;
  trend: 'up' | 'down' | 'stable';
  changePercent?: number;
  status: 'good' | 'warning' | 'critical' | 'neutral';
  sparkline?: number[];
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'area' | 'pie' | 'funnel';
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  xAxis?: string;
  yAxis?: string;
}

export interface AlertData {
  id: string;
  type: 'anomaly' | 'threshold' | 'opportunity' | 'system';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metricId?: string;
  timestamp: Date;
  actionUrl?: string;
}

export interface DashboardSummary {
  overallHealth: 'healthy' | 'attention' | 'critical';
  healthScore: number;              // 0-100
  criticalAlerts: number;
  warningAlerts: number;
  topOpportunity?: string;
  weekOverWeekTrend: 'up' | 'down' | 'stable';
}

// =====================================================
// DASHBOARD CONFIGURATIONS
// =====================================================

const PM_DASHBOARD: DashboardConfig = {
  id: 'pm-dashboard',
  role: 'pm',
  name: 'Product Manager Dashboard',
  description: 'Content performance, growth metrics, and conversion tracking',
  widgets: [
    // Row 1: KPIs
    {
      id: 'kpi-traffic',
      type: 'kpi',
      title: 'Total Traffic',
      metricIds: ['traffic.total_sessions'],
      size: 'small',
      position: { row: 1, col: 1 },
      config: { showTrend: true, showSparkline: true },
    },
    {
      id: 'kpi-engagement',
      type: 'kpi',
      title: 'Avg. Session Duration',
      metricIds: ['engagement.session_duration'],
      size: 'small',
      position: { row: 1, col: 2 },
      config: { showTrend: true },
    },
    {
      id: 'kpi-conversion',
      type: 'kpi',
      title: 'Conversion Rate',
      metricIds: ['conversion.conversion_rate'],
      size: 'small',
      position: { row: 1, col: 3 },
      config: { showTrend: true },
    },
    {
      id: 'kpi-content-score',
      type: 'kpi',
      title: 'Avg. Content Score',
      metricIds: ['content.performance_score'],
      size: 'small',
      position: { row: 1, col: 4 },
      config: { showTrend: true },
    },

    // Row 2: Charts
    {
      id: 'chart-traffic-trend',
      type: 'chart',
      title: 'Traffic Trend (30d)',
      metricIds: ['traffic.total_sessions', 'traffic.organic_sessions', 'traffic.ai_referral_sessions'],
      size: 'large',
      position: { row: 2, col: 1 },
      config: { chartType: 'area', period: '30d' },
    },
    {
      id: 'chart-content-funnel',
      type: 'funnel',
      title: 'Content Discovery Funnel',
      metricIds: [],
      size: 'medium',
      position: { row: 2, col: 3 },
      config: { funnelId: 'content-discovery' },
    },

    // Row 3: Opportunities & Alerts
    {
      id: 'opportunities-list',
      type: 'table',
      title: 'Top Opportunities',
      metricIds: [],
      size: 'medium',
      position: { row: 3, col: 1 },
      config: { limit: 5, categories: ['quick_win', 'content', 'revenue'] },
    },
    {
      id: 'alerts-list',
      type: 'alert',
      title: 'Alerts',
      metricIds: [],
      size: 'medium',
      position: { row: 3, col: 3 },
      config: { limit: 5 },
    },

    // Row 4: Growth Loop & Revenue
    {
      id: 'growth-loops',
      type: 'chart',
      title: 'Growth Loop Performance',
      metricIds: ['growth.search_loop_conversion', 'growth.chat_loop_conversion', 'growth.content_loop_retention'],
      size: 'medium',
      position: { row: 4, col: 1 },
      config: { chartType: 'bar' },
    },
    {
      id: 'revenue-chart',
      type: 'chart',
      title: 'Revenue Trend',
      metricIds: ['revenue.total_revenue', 'revenue.affiliate_revenue'],
      size: 'medium',
      position: { row: 4, col: 3 },
      config: { chartType: 'line', period: '30d' },
    },
  ],
  refreshInterval: 300,
  defaultDateRange: '7d',
};

const SEO_DASHBOARD: DashboardConfig = {
  id: 'seo-dashboard',
  role: 'seo',
  name: 'SEO & AEO Dashboard',
  description: 'Search performance, rankings, and AI optimization metrics',
  widgets: [
    // Row 1: Core SEO KPIs
    {
      id: 'kpi-impressions',
      type: 'kpi',
      title: 'Search Impressions',
      metricIds: ['seo.impressions'],
      size: 'small',
      position: { row: 1, col: 1 },
      config: { showTrend: true, showSparkline: true },
    },
    {
      id: 'kpi-clicks',
      type: 'kpi',
      title: 'Search Clicks',
      metricIds: ['seo.clicks'],
      size: 'small',
      position: { row: 1, col: 2 },
      config: { showTrend: true },
    },
    {
      id: 'kpi-ctr',
      type: 'kpi',
      title: 'CTR',
      metricIds: ['seo.ctr'],
      size: 'small',
      position: { row: 1, col: 3 },
      config: { showTrend: true },
    },
    {
      id: 'kpi-position',
      type: 'kpi',
      title: 'Avg. Position',
      metricIds: ['seo.average_position'],
      size: 'small',
      position: { row: 1, col: 4 },
      config: { showTrend: true, invertTrend: true },
    },

    // Row 2: AEO KPIs
    {
      id: 'kpi-ai-impressions',
      type: 'kpi',
      title: 'AI Impressions',
      metricIds: ['aeo.ai_impressions'],
      size: 'small',
      position: { row: 2, col: 1 },
      config: { showTrend: true },
    },
    {
      id: 'kpi-citations',
      type: 'kpi',
      title: 'AI Citations',
      metricIds: ['aeo.citations'],
      size: 'small',
      position: { row: 2, col: 2 },
      config: { showTrend: true },
    },
    {
      id: 'kpi-aeo-score',
      type: 'kpi',
      title: 'AEO Score',
      metricIds: ['aeo.aeo_score'],
      size: 'small',
      position: { row: 2, col: 3 },
      config: { showTrend: true },
    },
    {
      id: 'kpi-crawlers',
      type: 'kpi',
      title: 'AI Crawler Visits',
      metricIds: ['aeo.crawler_visits'],
      size: 'small',
      position: { row: 2, col: 4 },
      config: { showTrend: true },
    },

    // Row 3: Charts
    {
      id: 'chart-seo-trend',
      type: 'chart',
      title: 'SEO Performance (30d)',
      metricIds: ['seo.impressions', 'seo.clicks'],
      size: 'large',
      position: { row: 3, col: 1 },
      config: { chartType: 'area', period: '30d' },
    },
    {
      id: 'chart-search-funnel',
      type: 'funnel',
      title: 'Search Journey Funnel',
      metricIds: [],
      size: 'medium',
      position: { row: 3, col: 3 },
      config: { funnelId: 'search-journey' },
    },

    // Row 4: AEO & Content
    {
      id: 'chart-aeo-platforms',
      type: 'chart',
      title: 'Citations by Platform',
      metricIds: ['aeo.citations'],
      size: 'medium',
      position: { row: 4, col: 1 },
      config: { chartType: 'pie', groupBy: 'platform' },
    },
    {
      id: 'chart-content-freshness',
      type: 'chart',
      title: 'Content Freshness Distribution',
      metricIds: ['content.freshness_score'],
      size: 'medium',
      position: { row: 4, col: 3 },
      config: { chartType: 'bar' },
    },

    // Row 5: Opportunities
    {
      id: 'seo-opportunities',
      type: 'table',
      title: 'SEO & AEO Opportunities',
      metricIds: [],
      size: 'full',
      position: { row: 5, col: 1 },
      config: { limit: 10, categories: ['seo', 'aeo', 'quick_win'] },
    },
  ],
  refreshInterval: 600,
  defaultDateRange: '30d',
};

const OPS_DASHBOARD: DashboardConfig = {
  id: 'ops-dashboard',
  role: 'ops',
  name: 'Operations Dashboard',
  description: 'System health, costs, and operational metrics',
  widgets: [
    // Row 1: Health KPIs
    {
      id: 'kpi-uptime',
      type: 'kpi',
      title: 'Uptime',
      metricIds: ['health.uptime'],
      size: 'small',
      position: { row: 1, col: 1 },
      config: { showTrend: true },
    },
    {
      id: 'kpi-response-time',
      type: 'kpi',
      title: 'Avg. Response Time',
      metricIds: ['health.api_response_time'],
      size: 'small',
      position: { row: 1, col: 2 },
      config: { showTrend: true, invertTrend: true },
    },
    {
      id: 'kpi-error-rate',
      type: 'kpi',
      title: 'Error Rate',
      metricIds: ['health.error_rate'],
      size: 'small',
      position: { row: 1, col: 3 },
      config: { showTrend: true, invertTrend: true },
    },
    {
      id: 'kpi-cache-hit',
      type: 'kpi',
      title: 'Cache Hit Rate',
      metricIds: ['health.cache_hit_rate'],
      size: 'small',
      position: { row: 1, col: 4 },
      config: { showTrend: true },
    },

    // Row 2: Cost KPIs
    {
      id: 'kpi-ai-cost',
      type: 'kpi',
      title: 'AI API Cost (Today)',
      metricIds: ['cost.ai_api_cost'],
      size: 'small',
      position: { row: 2, col: 1 },
      config: { showTrend: true, invertTrend: true },
    },
    {
      id: 'kpi-content-cost',
      type: 'kpi',
      title: 'Content Gen Cost',
      metricIds: ['cost.content_generation_cost'],
      size: 'small',
      position: { row: 2, col: 2 },
      config: { showTrend: true, invertTrend: true },
    },
    {
      id: 'kpi-roi',
      type: 'kpi',
      title: 'ROI',
      metricIds: ['cost.roi'],
      size: 'small',
      position: { row: 2, col: 3 },
      config: { showTrend: true },
    },
    {
      id: 'kpi-queue',
      type: 'kpi',
      title: 'Job Queue',
      metricIds: ['health.job_queue_length'],
      size: 'small',
      position: { row: 2, col: 4 },
      config: { showTrend: true, invertTrend: true },
    },

    // Row 3: Charts
    {
      id: 'chart-system-health',
      type: 'chart',
      title: 'System Health (24h)',
      metricIds: ['health.api_response_time', 'health.error_rate'],
      size: 'large',
      position: { row: 3, col: 1 },
      config: { chartType: 'line', period: '24h' },
    },
    {
      id: 'chart-costs',
      type: 'chart',
      title: 'Cost Trend (30d)',
      metricIds: ['cost.ai_api_cost', 'cost.content_generation_cost'],
      size: 'medium',
      position: { row: 3, col: 3 },
      config: { chartType: 'area', period: '30d' },
    },

    // Row 4: Alerts & Anomalies
    {
      id: 'anomalies-list',
      type: 'table',
      title: 'Active Anomalies',
      metricIds: [],
      size: 'medium',
      position: { row: 4, col: 1 },
      config: { limit: 10 },
    },
    {
      id: 'content-production',
      type: 'chart',
      title: 'Content Production',
      metricIds: ['content.created_this_period', 'content.total_published'],
      size: 'medium',
      position: { row: 4, col: 3 },
      config: { chartType: 'bar', period: '7d' },
    },

    // Row 5: Infrastructure
    {
      id: 'db-connections',
      type: 'chart',
      title: 'Database Connections',
      metricIds: ['health.database_connections'],
      size: 'medium',
      position: { row: 5, col: 1 },
      config: { chartType: 'line', period: '24h' },
    },
    {
      id: 'crawler-activity',
      type: 'chart',
      title: 'Crawler Activity',
      metricIds: ['aeo.crawler_visits'],
      size: 'medium',
      position: { row: 5, col: 3 },
      config: { chartType: 'bar', period: '7d' },
    },
  ],
  refreshInterval: 60,
  defaultDateRange: 'today',
};

// =====================================================
// DASHBOARD SERVICE
// =====================================================

export class DashboardService {
  private static instance: DashboardService | null = null;
  private configs: Map<DashboardRole, DashboardConfig> = new Map();

  private constructor() {
    this.configs.set('pm', PM_DASHBOARD);
    this.configs.set('seo', SEO_DASHBOARD);
    this.configs.set('ops', OPS_DASHBOARD);
    logger.info('Dashboard Service initialized');
  }

  static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  static reset(): void {
    DashboardService.instance = null;
  }

  /**
   * Get dashboard configuration
   */
  getConfig(role: DashboardRole): DashboardConfig {
    return this.configs.get(role) || PM_DASHBOARD;
  }

  /**
   * Get all configurations
   */
  getAllConfigs(): DashboardConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Generate dashboard data
   */
  async generateDashboardData(role: DashboardRole): Promise<DashboardData> {
    const config = this.getConfig(role);
    const registry = getMetricsRegistry();
    const metrics = getMetricsForDashboard(role);

    // Generate KPIs
    const kpis: KPIData[] = [];
    for (const widget of config.widgets.filter(w => w.type === 'kpi')) {
      for (const metricId of widget.metricIds) {
        const def = registry.getDefinition(metricId);
        if (!def) continue;

        const snapshot = registry.getSnapshot(metricId, 'system');
        kpis.push({
          id: widget.id,
          name: def.name,
          value: snapshot?.current || 0,
          formattedValue: registry.formatValue(metricId, snapshot?.current || 0),
          trend: snapshot?.trend || 'stable',
          changePercent: snapshot?.changePercent,
          status: registry.getMetricStatus(metricId, snapshot?.current || 0),
        });
      }
    }

    // Get opportunities
    const opportunitySummary = getOpportunitySummary();
    const opportunities = opportunitySummary.topOpportunities;

    // Get anomalies as alerts
    const anomalies = getCriticalAnomalies();
    const alerts: AlertData[] = anomalies.map(a => ({
      id: a.id,
      type: 'anomaly',
      severity: a.severity,
      title: a.title,
      message: a.description,
      metricId: a.metricId,
      timestamp: a.detectedAt,
    }));

    // Add opportunity alerts
    opportunities
      .filter(o => o.priority === 'critical' || o.priority === 'high')
      .forEach(o => {
        alerts.push({
          id: o.id,
          type: 'opportunity',
          severity: o.priority === 'critical' ? 'critical' : 'warning',
          title: o.title,
          message: o.description,
          timestamp: o.createdAt,
        });
      });

    // Get funnel data
    let funnel: FunnelAnalysis | undefined;
    const funnelId = role === 'pm' ? 'content-discovery' :
                    role === 'seo' ? 'search-journey' : undefined;
    if (funnelId) {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      funnel = getFunnelSystem().analyzeFunnel(funnelId, weekAgo, now) || undefined;
    }

    // Get week over week comparison
    const comparisonMetrics = metrics.slice(0, 10).map(m => m.id);
    const comparison = getSnapshotStore().compareWeekOverWeek(comparisonMetrics);

    // Calculate summary
    const summary = this.calculateSummary(kpis, alerts, opportunities, comparison);

    return {
      role,
      config,
      data: {
        kpis,
        charts: [], // Would be populated from time-series data
        alerts: alerts.sort((a, b) =>
          a.severity === 'critical' ? -1 : b.severity === 'critical' ? 1 : 0
        ).slice(0, 10),
        opportunities: opportunities.slice(0, 5),
        funnel,
        comparison,
        summary,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Calculate dashboard summary
   */
  private calculateSummary(
    kpis: KPIData[],
    alerts: AlertData[],
    opportunities: GrowthOpportunity[],
    comparison: ComparisonReport
  ): DashboardSummary {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = alerts.filter(a => a.severity === 'warning').length;

    // Calculate health score
    let healthScore = 100;
    healthScore -= criticalAlerts * 20;
    healthScore -= warningAlerts * 5;
    healthScore = Math.max(0, healthScore);

    const overallHealth: 'healthy' | 'attention' | 'critical' =
      criticalAlerts > 0 ? 'critical' :
      warningAlerts > 2 || healthScore < 70 ? 'attention' : 'healthy';

    return {
      overallHealth,
      healthScore,
      criticalAlerts,
      warningAlerts,
      topOpportunity: opportunities[0]?.title,
      weekOverWeekTrend: comparison.summary.overallTrend === 'positive' ? 'up' :
                        comparison.summary.overallTrend === 'negative' ? 'down' : 'stable',
    };
  }
}

// =====================================================
// CONVENIENCE EXPORTS
// =====================================================

export function getDashboardService(): DashboardService {
  return DashboardService.getInstance();
}

export function getDashboardConfig(role: DashboardRole): DashboardConfig {
  return getDashboardService().getConfig(role);
}

export async function generateDashboard(role: DashboardRole): Promise<DashboardData> {
  return getDashboardService().generateDashboardData(role);
}

export { PM_DASHBOARD, SEO_DASHBOARD, OPS_DASHBOARD };

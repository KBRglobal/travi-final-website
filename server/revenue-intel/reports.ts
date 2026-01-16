/**
 * Revenue Intelligence Layer - Reports
 * Generates revenue intelligence reports
 */

import {
  RevenueReport,
  RevenueReportData,
  RevenueMetrics,
  ReportType,
  ReportPeriod,
  DEFAULT_REVENUE_CONFIG,
} from './types';
import {
  getRevenueEvents,
  getTotalRevenue,
  getConversionPaths,
} from './attribution';
import {
  getTopEarners,
  getZeroConverters,
  getContentRoiReport,
} from './content-value';
import { getTopEntities, getUnderperformingEntities } from './entity-value';

// Report cache
const reportCache = new Map<string, { report: RevenueReport; expiresAt: number }>();
const REPORT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function generateReportId(): string {
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function generateReport(
  type: ReportType,
  period: ReportPeriod
): Promise<RevenueReport> {
  const cacheKey = `${type}-${period.startDate.getTime()}-${period.endDate.getTime()}`;
  const cached = reportCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.report;
  }

  const events = getRevenueEvents({
    startDate: period.startDate,
    endDate: period.endDate,
  });

  const totalRevenue = events.reduce((sum, e) => sum + e.amount, 0);
  const totalConversions = events.length;
  const averageOrderValue = totalConversions > 0 ? totalRevenue / totalConversions : 0;

  const topContent = await getTopEarners(10);
  const topEntities = await getTopEntities(10);
  const zeroConverters = await getZeroConverters(20);
  const conversionPaths = getConversionPaths(10).map(p => ({
    id: p.path.join('-'),
    touchpoints: p.path.map((contentId, idx) => ({
      contentId,
      type: idx === 0 ? 'first' as const : idx === p.path.length - 1 ? 'last' as const : 'assist' as const,
      timestamp: new Date(),
      position: idx,
      weight: 1 / p.path.length,
    })),
    revenue: p.totalRevenue,
    frequency: p.frequency,
  }));

  const data: RevenueReportData = {
    totalRevenue,
    totalConversions,
    averageOrderValue,
    topContent,
    topEntities,
    zeroConverters,
    conversionPaths,
  };

  const report: RevenueReport = {
    id: generateReportId(),
    type,
    period,
    generatedAt: new Date(),
    data,
  };

  // Cache report
  reportCache.set(cacheKey, {
    report,
    expiresAt: Date.now() + REPORT_CACHE_TTL_MS,
  });

  return report;
}

export async function getRevenueMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<RevenueMetrics> {
  const now = new Date();
  const periodStart = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodEnd = endDate || now;

  // Current period
  const currentEvents = getRevenueEvents({
    startDate: periodStart,
    endDate: periodEnd,
  });

  const currentRevenue = currentEvents.reduce((sum, e) => sum + e.amount, 0);
  const currentConversions = currentEvents.length;

  // Previous period (same duration)
  const periodDuration = periodEnd.getTime() - periodStart.getTime();
  const previousStart = new Date(periodStart.getTime() - periodDuration);
  const previousEnd = new Date(periodStart.getTime() - 1);

  const previousEvents = getRevenueEvents({
    startDate: previousStart,
    endDate: previousEnd,
  });

  const previousRevenue = previousEvents.reduce((sum, e) => sum + e.amount, 0);

  // Calculate growth
  const revenueGrowth = previousRevenue > 0
    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
    : 0;

  // Revenue by type
  const revenueByType: Record<string, number> = {};
  for (const event of currentEvents) {
    revenueByType[event.type] = (revenueByType[event.type] || 0) + event.amount;
  }

  // Get ROI report for performance metrics
  const roiReport = await getContentRoiReport();

  return {
    totalRevenue: currentRevenue,
    revenueGrowth,
    averageOrderValue: currentConversions > 0 ? currentRevenue / currentConversions : 0,
    conversionRate: 0, // Would need pageview data
    topPerformingContent: roiReport.highRoi.length,
    underperformingContent: roiReport.lowRoi.length,
    revenueByType,
  };
}

export async function getExecutiveSummary(): Promise<{
  headline: string;
  metrics: RevenueMetrics;
  insights: string[];
  recommendations: string[];
}> {
  const metrics = await getRevenueMetrics();
  const topContent = await getTopEarners(5);
  const zeroConverters = await getZeroConverters(10);
  const underperformingEntities = await getUnderperformingEntities(5);

  const insights: string[] = [];
  const recommendations: string[] = [];

  // Generate insights
  if (metrics.revenueGrowth > 10) {
    insights.push(`Strong revenue growth of ${metrics.revenueGrowth.toFixed(1)}% vs previous period`);
  } else if (metrics.revenueGrowth < -10) {
    insights.push(`Revenue declined ${Math.abs(metrics.revenueGrowth).toFixed(1)}% vs previous period`);
  }

  if (topContent.length > 0) {
    insights.push(`Top content piece generated $${topContent[0].totalRevenue.toFixed(2)} in revenue`);
  }

  if (zeroConverters.length > 10) {
    insights.push(`${zeroConverters.length} content pieces with traffic have zero conversions`);
  }

  // Generate recommendations
  if (zeroConverters.length > 5) {
    recommendations.push('Review zero-converting content for CTA optimization');
  }

  if (underperformingEntities.length > 0) {
    recommendations.push('Invest in content for underperforming high-traffic entities');
  }

  if (metrics.averageOrderValue < 50) {
    recommendations.push('Consider upselling strategies to increase average order value');
  }

  const headline = metrics.revenueGrowth >= 0
    ? `Revenue up ${metrics.revenueGrowth.toFixed(1)}% with $${metrics.totalRevenue.toFixed(2)} total`
    : `Revenue down ${Math.abs(metrics.revenueGrowth).toFixed(1)}% - attention needed`;

  return {
    headline,
    metrics,
    insights,
    recommendations,
  };
}

export function invalidateReportCache(): void {
  reportCache.clear();
}

export function getReportCacheStats(): { size: number; reports: string[] } {
  return {
    size: reportCache.size,
    reports: Array.from(reportCache.keys()),
  };
}

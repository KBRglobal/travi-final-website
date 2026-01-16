/**
 * Executive Go-Live Report - Report Generator
 */

import { createLogger } from '../../lib/logger';
import { REPORT_CONFIG, isExecutiveReportEnabled } from './config';
import type {
  ExecutiveReport, ExecutiveSummary, ExecutiveRecommendation,
  RiskAssessment, RiskFactor, ReadinessScorecard, TimelineHighlight,
  ActionItem, ReportAppendix, ReportFormat, ReportStatus,
} from './types';

const logger = createLogger('executive-report');

// Storage
const reportHistory: ExecutiveReport[] = [];
let lastReport: ExecutiveReport | null = null;
let lastReportTime = 0;

// ============================================================================
// Data Collection
// ============================================================================

async function collectCutoverData(): Promise<{ decision: string; score: number } | null> {
  try {
    const cm = await import('../../production-cutover');
    if (cm.isProductionCutoverEnabled()) {
      const result = await cm.evaluateCutover('dry-run');
      return { decision: result.decision, score: result.score };
    }
  } catch { /* not available */ }
  return null;
}

async function collectReadinessData(): Promise<{ score: number; status: string } | null> {
  try {
    const rm = await import('../../platform-readiness');
    if (rm.isPlatformReadinessEnabled()) {
      const result = await rm.evaluateReadiness();
      return { score: result.score, status: result.status };
    }
  } catch { /* not available */ }
  return null;
}

async function collectGovernorData(): Promise<{ restrictions: number } | null> {
  try {
    const gm = await import('../../platform-governor');
    if (gm.isPlatformGovernorEnabled()) {
      const restrictions = gm.getActiveRestrictions();
      return { restrictions: restrictions.length };
    }
  } catch { /* not available */ }
  return null;
}

async function collectIncidentData(): Promise<{ open: number; critical: number } | null> {
  try {
    const im = await import('../../incidents');
    if (im.isIncidentsEnabled()) {
      const summary = im.getSummary();
      return { open: summary.open, critical: summary.bySeverity.critical };
    }
  } catch { /* not available */ }
  return null;
}

async function collectForensicsData(): Promise<{ recentEvents: number } | null> {
  try {
    const fm = await import('../../go-live-forensics');
    if (fm.isGoLiveForensicsEnabled()) {
      const status = fm.getStatus();
      return { recentEvents: status.totalEvents };
    }
  } catch { /* not available */ }
  return null;
}

// ============================================================================
// Analysis
// ============================================================================

function determineRecommendation(
  cutover: { decision: string; score: number } | null,
  incidents: { open: number; critical: number } | null,
  governor: { restrictions: number } | null
): { recommendation: ExecutiveRecommendation; confidence: 'high' | 'medium' | 'low' } {
  // Critical incidents = ROLL_BACK
  if (incidents && incidents.critical > 0) {
    return { recommendation: 'ROLL_BACK', confidence: 'high' };
  }

  // Cutover blocked = WAIT
  if (cutover && cutover.decision === 'BLOCK') {
    return { recommendation: 'WAIT', confidence: 'high' };
  }

  // Governor restrictions = WAIT
  if (governor && governor.restrictions > 2) {
    return { recommendation: 'WAIT', confidence: 'medium' };
  }

  // Cutover warning = WAIT (low confidence)
  if (cutover && cutover.decision === 'WARN') {
    return { recommendation: 'WAIT', confidence: 'low' };
  }

  // All clear = GO
  if (cutover && cutover.decision === 'CAN_GO_LIVE' && cutover.score >= 80) {
    return { recommendation: 'GO', confidence: 'high' };
  }

  if (cutover && cutover.decision === 'CAN_GO_LIVE') {
    return { recommendation: 'GO', confidence: 'medium' };
  }

  // Default with no data
  return { recommendation: 'WAIT', confidence: 'low' };
}

function generateHeadline(recommendation: ExecutiveRecommendation, confidence: string): string {
  const headlines: Record<ExecutiveRecommendation, string> = {
    'GO': confidence === 'high'
      ? 'All Systems Ready for Go-Live'
      : 'Go-Live Possible with Minor Concerns',
    'WAIT': confidence === 'high'
      ? 'Go-Live Not Recommended at This Time'
      : 'Proceed with Caution - Review Required',
    'ROLL_BACK': 'Immediate Action Required - Consider Rollback',
  };
  return headlines[recommendation];
}

function generateKeyPoints(
  recommendation: ExecutiveRecommendation,
  cutover: { decision: string; score: number } | null,
  incidents: { open: number; critical: number } | null,
  governor: { restrictions: number } | null
): string[] {
  const points: string[] = [];

  if (cutover) {
    points.push(`Readiness score: ${cutover.score}%`);
  }

  if (incidents) {
    if (incidents.critical > 0) {
      points.push(`${incidents.critical} critical incident(s) require attention`);
    } else if (incidents.open > 0) {
      points.push(`${incidents.open} open incident(s) being monitored`);
    } else {
      points.push('No active incidents');
    }
  }

  if (governor) {
    if (governor.restrictions > 0) {
      points.push(`${governor.restrictions} governor restriction(s) active`);
    } else {
      points.push('No governor restrictions');
    }
  }

  if (recommendation === 'GO') {
    points.push('Platform health indicators are positive');
  } else if (recommendation === 'ROLL_BACK') {
    points.push('Recommend rollback to last known good state');
  }

  return points;
}

function assessRisks(
  cutover: { decision: string; score: number } | null,
  incidents: { open: number; critical: number } | null,
  governor: { restrictions: number } | null
): RiskAssessment {
  const factors: RiskFactor[] = [];

  if (cutover && cutover.score < 70) {
    factors.push({
      id: 'low_readiness',
      category: 'Platform',
      description: 'Platform readiness score below threshold',
      severity: cutover.score < 50 ? 'critical' : 'high',
      likelihood: 'certain',
      impact: 'May experience degraded performance or failures',
    });
  }

  if (incidents && incidents.critical > 0) {
    factors.push({
      id: 'critical_incidents',
      category: 'Operations',
      description: 'Active critical incidents',
      severity: 'critical',
      likelihood: 'certain',
      impact: 'System stability compromised',
    });
  }

  if (governor && governor.restrictions > 0) {
    factors.push({
      id: 'governor_restrictions',
      category: 'Governance',
      description: 'Active platform restrictions',
      severity: governor.restrictions > 2 ? 'high' : 'medium',
      likelihood: 'likely',
      impact: 'Some features may be throttled or disabled',
    });
  }

  const overallRisk = factors.some(f => f.severity === 'critical') ? 'critical'
    : factors.some(f => f.severity === 'high') ? 'high'
    : factors.length > 0 ? 'medium'
    : 'low';

  const mitigations: string[] = [];
  if (factors.length > 0) {
    mitigations.push('Review and resolve blocking issues before proceeding');
    mitigations.push('Prepare rollback plan');
    mitigations.push('Enable enhanced monitoring during go-live');
  }

  return { overallRisk, factors, mitigations };
}

function buildScorecard(
  cutover: { decision: string; score: number } | null,
  readiness: { score: number; status: string } | null,
  incidents: { open: number; critical: number } | null,
  governor: { restrictions: number } | null
): ReadinessScorecard {
  const platform = readiness?.score || (cutover?.score || 50);
  const governance = governor ? Math.max(0, 100 - governor.restrictions * 20) : 100;
  const incidentScore = incidents
    ? Math.max(0, 100 - incidents.critical * 50 - incidents.open * 10)
    : 100;
  const infrastructure = 85; // Placeholder - would come from infra monitoring

  const overall = Math.round((platform + governance + incidentScore + infrastructure) / 4);

  return {
    overall,
    platform,
    governance,
    incidents: incidentScore,
    infrastructure,
    trend: overall >= 80 ? 'improving' : overall >= 60 ? 'stable' : 'declining',
  };
}

function generateActionItems(
  recommendation: ExecutiveRecommendation,
  riskAssessment: RiskAssessment
): ActionItem[] {
  const items: ActionItem[] = [];
  let idx = 0;

  if (recommendation === 'ROLL_BACK') {
    items.push({
      id: `action_${++idx}`,
      priority: 'critical',
      action: 'Initiate rollback procedure',
      status: 'pending',
    });
    items.push({
      id: `action_${++idx}`,
      priority: 'critical',
      action: 'Alert incident response team',
      status: 'pending',
    });
  }

  for (const factor of riskAssessment.factors) {
    if (factor.severity === 'critical') {
      items.push({
        id: `action_${++idx}`,
        priority: 'critical',
        action: `Resolve: ${factor.description}`,
        status: 'pending',
      });
    } else if (factor.severity === 'high') {
      items.push({
        id: `action_${++idx}`,
        priority: 'high',
        action: `Address: ${factor.description}`,
        status: 'pending',
      });
    }
  }

  if (recommendation === 'WAIT') {
    items.push({
      id: `action_${++idx}`,
      priority: 'medium',
      action: 'Re-evaluate readiness in 30 minutes',
      status: 'pending',
    });
  }

  if (recommendation === 'GO') {
    items.push({
      id: `action_${++idx}`,
      priority: 'medium',
      action: 'Enable enhanced monitoring',
      status: 'pending',
    });
    items.push({
      id: `action_${++idx}`,
      priority: 'low',
      action: 'Notify stakeholders of go-live',
      status: 'pending',
    });
  }

  return items.slice(0, REPORT_CONFIG.maxActionItems);
}

// ============================================================================
// Report Generation
// ============================================================================

export async function generateReport(
  format: ReportFormat = REPORT_CONFIG.defaultFormat,
  requestedBy?: string
): Promise<ExecutiveReport> {
  if (!isExecutiveReportEnabled()) {
    throw new Error('Executive report generation is not enabled');
  }

  // Check cache
  if (lastReport && Date.now() - lastReportTime < REPORT_CONFIG.cacheReportMs) {
    return lastReport;
  }

  const start = Date.now();

  // Collect data from all systems
  const [cutover, readiness, governor, incidents, forensics] = await Promise.all([
    collectCutoverData(),
    collectReadinessData(),
    collectGovernorData(),
    collectIncidentData(),
    collectForensicsData(),
  ]);

  // Analysis
  const { recommendation, confidence } = determineRecommendation(cutover, incidents, governor);
  const headline = generateHeadline(recommendation, confidence);
  const keyPoints = generateKeyPoints(recommendation, cutover, incidents, governor);
  const riskAssessment = assessRisks(cutover, incidents, governor);
  const scorecard = buildScorecard(cutover, readiness, incidents, governor);
  const actionItems = generateActionItems(recommendation, riskAssessment);

  const summary: ExecutiveSummary = {
    recommendation,
    confidence,
    headline,
    oneLineSummary: `${recommendation}: ${headline}`,
    keyPoints,
  };

  const timelineHighlights: TimelineHighlight[] = [
    {
      timestamp: new Date(),
      event: 'Report Generated',
      significance: `Recommendation: ${recommendation}`,
      impact: recommendation === 'GO' ? 'positive' : recommendation === 'ROLL_BACK' ? 'negative' : 'neutral',
    },
  ];

  const appendix: ReportAppendix = {
    cutoverDecision: cutover?.decision,
    activeIncidents: incidents?.open || 0,
    activeRestrictions: governor?.restrictions || 0,
    recentForensicsEvents: forensics?.recentEvents || 0,
  };

  const report: ExecutiveReport = {
    id: `report_${Date.now()}`,
    generatedAt: new Date(),
    generatedBy: requestedBy,
    format,
    summary,
    scorecard,
    riskAssessment,
    timelineHighlights,
    actionItems,
    appendix,
    durationMs: Date.now() - start,
  };

  // Cache and store
  lastReport = report;
  lastReportTime = Date.now();
  reportHistory.unshift(report);
  if (reportHistory.length > 50) reportHistory.pop();

  logger.info({ recommendation, confidence, score: scorecard.overall }, 'Executive report generated');
  return report;
}

// ============================================================================
// Format Converters
// ============================================================================

export function toMarkdown(report: ExecutiveReport): string {
  const lines: string[] = [
    `# Go-Live Report`,
    ``,
    `**Generated:** ${report.generatedAt.toISOString()}`,
    `**Report ID:** ${report.id}`,
    ``,
    `## Executive Summary`,
    ``,
    `### Recommendation: ${report.summary.recommendation}`,
    ``,
    `**${report.summary.headline}**`,
    ``,
    `*Confidence: ${report.summary.confidence}*`,
    ``,
    `### Key Points`,
    ``,
    ...report.summary.keyPoints.map(p => `- ${p}`),
    ``,
    `## Readiness Scorecard`,
    ``,
    `| Metric | Score |`,
    `|--------|-------|`,
    `| Overall | ${report.scorecard.overall}% |`,
    `| Platform | ${report.scorecard.platform}% |`,
    `| Governance | ${report.scorecard.governance}% |`,
    `| Incidents | ${report.scorecard.incidents}% |`,
    `| Infrastructure | ${report.scorecard.infrastructure}% |`,
    ``,
    `**Trend:** ${report.scorecard.trend}`,
    ``,
    `## Risk Assessment`,
    ``,
    `**Overall Risk:** ${report.riskAssessment.overallRisk.toUpperCase()}`,
    ``,
  ];

  if (report.riskAssessment.factors.length > 0) {
    lines.push(`### Risk Factors`, ``);
    for (const factor of report.riskAssessment.factors) {
      lines.push(`- **${factor.severity.toUpperCase()}**: ${factor.description}`);
      lines.push(`  - Likelihood: ${factor.likelihood}`);
      lines.push(`  - Impact: ${factor.impact}`);
    }
    lines.push(``);
  }

  if (report.riskAssessment.mitigations.length > 0) {
    lines.push(`### Mitigations`, ``);
    lines.push(...report.riskAssessment.mitigations.map(m => `- ${m}`));
    lines.push(``);
  }

  lines.push(
    `## Action Items`,
    ``,
    `| Priority | Action | Status |`,
    `|----------|--------|--------|`,
    ...report.actionItems.map(a => `| ${a.priority} | ${a.action} | ${a.status} |`),
    ``,
    `---`,
    `*Report generated in ${report.durationMs}ms*`,
  );

  return lines.join('\n');
}

export function toHtml(report: ExecutiveReport): string {
  const md = toMarkdown(report);
  // Simple markdown to HTML conversion
  return `<!DOCTYPE html>
<html>
<head>
  <title>Go-Live Report - ${report.id}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f4f4f4; }
    .GO { color: green; }
    .WAIT { color: orange; }
    .ROLL_BACK { color: red; }
  </style>
</head>
<body>
  <pre>${md}</pre>
</body>
</html>`;
}

// ============================================================================
// Public API
// ============================================================================

export function getReportHistory(limit = 10): ExecutiveReport[] {
  return reportHistory.slice(0, limit);
}

export function getStatus(): ReportStatus {
  return {
    enabled: isExecutiveReportEnabled(),
    reportsGenerated: reportHistory.length,
    lastGeneratedAt: reportHistory[0]?.generatedAt,
  };
}

export function clearCache(): void {
  lastReport = null;
  lastReportTime = 0;
}

export function clearHistory(): void {
  reportHistory.length = 0;
  clearCache();
}

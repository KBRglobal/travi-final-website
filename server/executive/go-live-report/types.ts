/**
 * Executive Go-Live Report - Type Definitions
 * Feature Flag: ENABLE_EXECUTIVE_REPORT=false
 */

export type ExecutiveRecommendation = 'GO' | 'WAIT' | 'ROLL_BACK';
export type ReportFormat = 'json' | 'markdown' | 'html';

export interface ExecutiveSummary {
  recommendation: ExecutiveRecommendation;
  confidence: 'high' | 'medium' | 'low';
  headline: string;
  oneLineSummary: string;
  keyPoints: string[];
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  mitigations: string[];
}

export interface RiskFactor {
  id: string;
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  likelihood: 'unlikely' | 'possible' | 'likely' | 'certain';
  impact: string;
}

export interface ReadinessScorecard {
  overall: number;
  platform: number;
  governance: number;
  incidents: number;
  infrastructure: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface TimelineHighlight {
  timestamp: Date;
  event: string;
  significance: string;
  impact: 'positive' | 'neutral' | 'negative';
}

export interface ActionItem {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  owner?: string;
  deadline?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

export interface ExecutiveReport {
  id: string;
  generatedAt: Date;
  generatedBy?: string;
  format: ReportFormat;
  summary: ExecutiveSummary;
  scorecard: ReadinessScorecard;
  riskAssessment: RiskAssessment;
  timelineHighlights: TimelineHighlight[];
  actionItems: ActionItem[];
  appendix: ReportAppendix;
  durationMs: number;
}

export interface ReportAppendix {
  cutoverDecision?: string;
  activeIncidents: number;
  activeRestrictions: number;
  blastRadiusSummary?: string;
  recentForensicsEvents: number;
}

export interface ReportStatus {
  enabled: boolean;
  reportsGenerated: number;
  lastGeneratedAt?: Date;
}

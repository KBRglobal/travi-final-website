export type AlertType =
  | "JOB_STALLED"
  | "EVENT_BUS_INACTIVE"
  | "RSS_PIPELINE_FAILED"
  | "SEARCH_INDEX_STALE"
  | "INTELLIGENCE_COVERAGE_DROP"
  | "AI_PROVIDER_FAILURE";

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  detectedAt: Date;
  resolvedAt: Date | null;
  metadata: Record<string, unknown>;
  isActive: boolean;
}

export interface AlertRule {
  type: AlertType;
  severity: AlertSeverity;
  detect: () => Promise<{ triggered: boolean; message: string; metadata?: Record<string, unknown> }>;
  resolveCondition?: () => Promise<boolean>;
}

export interface AlertStats {
  total: number;
  active: number;
  bySeverity: Record<AlertSeverity, number>;
  oldestUnresolved: Date | null;
  lastDetectionRun: Date | null;
}

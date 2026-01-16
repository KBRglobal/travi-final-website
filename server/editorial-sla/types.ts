/**
 * Editorial SLA & Staleness Enforcement Types
 */

export type SlaStatus = 'compliant' | 'at_risk' | 'breached' | 'exempt';

export interface SlaPolicy {
  id: string;
  name: string;
  contentTypes: string[];
  maxAgeDays: number;
  reviewIntervalDays: number;
  warningThresholdDays: number;
  isActive: boolean;
  createdAt: Date;
}

export interface ContentSlaStatus {
  contentId: string;
  contentTitle: string;
  contentType: string;
  lastUpdatedAt: Date | null;
  lastReviewedAt: Date | null;
  policyId: string | null;
  status: SlaStatus;
  daysSinceUpdate: number;
  daysUntilBreach: number;
  nextReviewDue: Date | null;
  isExempt: boolean;
  exemptReason?: string;
}

export interface SlaViolation {
  id: string;
  contentId: string;
  policyId: string;
  violationType: 'staleness' | 'review_overdue';
  detectedAt: Date;
  resolvedAt?: Date;
  severity: 'warning' | 'critical';
}

export interface SlaStats {
  totalContent: number;
  compliant: number;
  atRisk: number;
  breached: number;
  exempt: number;
  avgDaysSinceUpdate: number;
}

export function isSlaEnforcementEnabled(): boolean {
  return process.env.ENABLE_SLA_ENFORCEMENT === 'true';
}

export const DEFAULT_POLICIES: Omit<SlaPolicy, 'id' | 'createdAt'>[] = [
  { name: 'Standard Content', contentTypes: ['article', 'attraction', 'hotel'], maxAgeDays: 180, reviewIntervalDays: 90, warningThresholdDays: 14, isActive: true },
  { name: 'Destination Pages', contentTypes: ['destination'], maxAgeDays: 365, reviewIntervalDays: 180, warningThresholdDays: 30, isActive: true },
  { name: 'News Content', contentTypes: ['news'], maxAgeDays: 30, reviewIntervalDays: 7, warningThresholdDays: 3, isActive: true },
];

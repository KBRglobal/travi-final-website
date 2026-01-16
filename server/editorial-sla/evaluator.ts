/**
 * Editorial SLA Evaluator
 */

import { db } from "../db";
import { contents } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import {
  type SlaPolicy,
  type ContentSlaStatus,
  type SlaStatus,
  type SlaViolation,
  type SlaStats,
  DEFAULT_POLICIES,
} from "./types";

const policies: Map<string, SlaPolicy> = new Map();
const violations: SlaViolation[] = [];
const exemptions: Map<string, { reason: string; expiresAt?: Date }> = new Map();

// Initialize default policies
let initialized = false;
function ensureInitialized(): void {
  if (initialized) return;
  DEFAULT_POLICIES.forEach((p, i) => {
    const policy: SlaPolicy = {
      ...p,
      id: `policy-${i + 1}`,
      createdAt: new Date(),
    };
    policies.set(policy.id, policy);
  });
  initialized = true;
}

export function getPolicy(policyId: string): SlaPolicy | undefined {
  ensureInitialized();
  return policies.get(policyId);
}

export function getAllPolicies(): SlaPolicy[] {
  ensureInitialized();
  return Array.from(policies.values());
}

export function findPolicyForContentType(contentType: string): SlaPolicy | undefined {
  ensureInitialized();
  return Array.from(policies.values()).find(p => p.isActive && p.contentTypes.includes(contentType));
}

export function setExemption(contentId: string, reason: string, expiresAt?: Date): void {
  exemptions.set(contentId, { reason, expiresAt });
}

export function removeExemption(contentId: string): void {
  exemptions.delete(contentId);
}

export function calculateSlaStatus(
  lastUpdatedAt: Date | null,
  policy: SlaPolicy | undefined,
  isExempt: boolean
): { status: SlaStatus; daysSinceUpdate: number; daysUntilBreach: number } {
  if (isExempt) {
    return { status: 'exempt', daysSinceUpdate: 0, daysUntilBreach: Infinity };
  }

  if (!policy || !lastUpdatedAt) {
    return { status: 'compliant', daysSinceUpdate: 0, daysUntilBreach: Infinity };
  }

  const now = new Date();
  const daysSinceUpdate = Math.floor((now.getTime() - lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilBreach = policy.maxAgeDays - daysSinceUpdate;

  let status: SlaStatus = 'compliant';
  if (daysUntilBreach <= 0) {
    status = 'breached';
  } else if (daysUntilBreach <= policy.warningThresholdDays) {
    status = 'at_risk';
  }

  return { status, daysSinceUpdate, daysUntilBreach };
}

export async function evaluateContentSla(contentId: string): Promise<ContentSlaStatus> {
  ensureInitialized();

  const [content] = await db
    .select({
      id: contents.id,
      title: contents.title,
      type: contents.type,
      updatedAt: contents.updatedAt,
    })
    .from(contents)
    .where(eq(contents.id, contentId));

  if (!content) {
    return {
      contentId,
      contentTitle: 'Unknown',
      contentType: 'unknown',
      lastUpdatedAt: null,
      lastReviewedAt: null,
      policyId: null,
      status: 'exempt',
      daysSinceUpdate: 0,
      daysUntilBreach: 0,
      nextReviewDue: null,
      isExempt: true,
      exemptReason: 'Content not found',
    };
  }

  const exemption = exemptions.get(contentId);
  const isExempt = exemption && (!exemption.expiresAt || exemption.expiresAt > new Date());
  const policy = findPolicyForContentType(content.type);

  const { status, daysSinceUpdate, daysUntilBreach } = calculateSlaStatus(
    content.updatedAt,
    policy,
    !!isExempt
  );

  const nextReviewDue = policy && content.updatedAt
    ? new Date(content.updatedAt.getTime() + policy.reviewIntervalDays * 24 * 60 * 60 * 1000)
    : null;

  return {
    contentId: content.id,
    contentTitle: content.title,
    contentType: content.type,
    lastUpdatedAt: content.updatedAt,
    lastReviewedAt: null,
    policyId: policy?.id || null,
    status,
    daysSinceUpdate,
    daysUntilBreach,
    nextReviewDue,
    isExempt: !!isExempt,
    exemptReason: isExempt ? exemption?.reason : undefined,
  };
}

export async function getStaleContent(limit: number = 50): Promise<ContentSlaStatus[]> {
  ensureInitialized();

  const allContent = await db
    .select({
      id: contents.id,
      title: contents.title,
      type: contents.type,
      updatedAt: contents.updatedAt,
    })
    .from(contents)
    .where(eq(contents.status, 'published'))
    .orderBy(contents.updatedAt)
    .limit(limit * 2);

  const results: ContentSlaStatus[] = [];

  for (const content of allContent) {
    const exemption = exemptions.get(content.id);
    const isExempt = exemption && (!exemption.expiresAt || exemption.expiresAt > new Date());
    const policy = findPolicyForContentType(content.type);

    if (!policy || isExempt) continue;

    const { status, daysSinceUpdate, daysUntilBreach } = calculateSlaStatus(
      content.updatedAt,
      policy,
      false
    );

    if (status === 'breached' || status === 'at_risk') {
      results.push({
        contentId: content.id,
        contentTitle: content.title,
        contentType: content.type,
        lastUpdatedAt: content.updatedAt,
        lastReviewedAt: null,
        policyId: policy.id,
        status,
        daysSinceUpdate,
        daysUntilBreach,
        nextReviewDue: new Date(content.updatedAt!.getTime() + policy.reviewIntervalDays * 24 * 60 * 60 * 1000),
        isExempt: false,
      });
    }

    if (results.length >= limit) break;
  }

  return results.sort((a, b) => a.daysUntilBreach - b.daysUntilBreach);
}

export async function getSlaStats(): Promise<SlaStats> {
  ensureInitialized();

  const allContent = await db
    .select({
      id: contents.id,
      type: contents.type,
      updatedAt: contents.updatedAt,
    })
    .from(contents)
    .where(eq(contents.status, 'published'));

  let compliant = 0, atRisk = 0, breached = 0, exempt = 0;
  let totalDays = 0;

  for (const content of allContent) {
    const exemption = exemptions.get(content.id);
    const isExempt = exemption && (!exemption.expiresAt || exemption.expiresAt > new Date());
    const policy = findPolicyForContentType(content.type);

    const { status, daysSinceUpdate } = calculateSlaStatus(content.updatedAt, policy, !!isExempt);
    totalDays += daysSinceUpdate;

    switch (status) {
      case 'compliant': compliant++; break;
      case 'at_risk': atRisk++; break;
      case 'breached': breached++; break;
      case 'exempt': exempt++; break;
    }
  }

  return {
    totalContent: allContent.length,
    compliant,
    atRisk,
    breached,
    exempt,
    avgDaysSinceUpdate: allContent.length > 0 ? Math.round(totalDays / allContent.length) : 0,
  };
}

export function recordViolation(contentId: string, policyId: string, type: 'staleness' | 'review_overdue'): SlaViolation {
  const violation: SlaViolation = {
    id: `vio-${Date.now()}`,
    contentId,
    policyId,
    violationType: type,
    detectedAt: new Date(),
    severity: type === 'staleness' ? 'critical' : 'warning',
  };
  violations.push(violation);
  return violation;
}

export function getViolations(contentId?: string): SlaViolation[] {
  if (contentId) {
    return violations.filter(v => v.contentId === contentId);
  }
  return [...violations];
}

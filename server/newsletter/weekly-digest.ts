/**
 * Weekly Digest Module - Stub Implementation
 */

import { log } from "../lib/logger";

export interface DigestStatus {
  lastSent: Date | null;
  subscriberCount: number;
  nextScheduled: Date | null;
  status: "ready" | "sending" | "disabled";
}

export interface DigestKPIStats {
  totalSent: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
}

export interface DigestResult {
  success: boolean;
  sentCount: number;
  errors: string[];
}

export async function getDigestStatus(): Promise<DigestStatus> {
  log.info("[WeeklyDigest] Getting digest status");
  return {
    lastSent: null,
    subscriberCount: 0,
    nextScheduled: null,
    status: "disabled",
  };
}

export async function sendWeeklyDigest(): Promise<DigestResult> {
  log.info("[WeeklyDigest] Sending weekly digest");
  return {
    success: true,
    sentCount: 0,
    errors: [],
  };
}

export async function sendTestDigest(email: string): Promise<DigestResult> {
  log.info({ email }, "[WeeklyDigest] Sending test digest");
  return {
    success: true,
    sentCount: 1,
    errors: [],
  };
}

export async function dryRunDigest(): Promise<{ wouldSendTo: number; preview: string }> {
  log.info("[WeeklyDigest] Running dry run");
  return {
    wouldSendTo: 0,
    preview: "<p>Weekly digest preview - no content yet</p>",
  };
}

export async function getDigestKPIStats(): Promise<DigestKPIStats> {
  log.info("[WeeklyDigest] Getting KPI stats");
  return {
    totalSent: 0,
    openRate: 0,
    clickRate: 0,
    unsubscribeRate: 0,
  };
}

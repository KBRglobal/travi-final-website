/**
 * AI Cost Forecasting Engine
 *
 * Predicts future AI spend based on recent usage patterns.
 * Uses rolling window analysis (7d/30d) per subsystem.
 *
 * Feature flag: ENABLE_AI_COST_FORECAST
 */

import { db } from "../db";
import { aiCostRecords } from "@shared/schema";
import { sql, gte, and, eq } from "drizzle-orm";

function isEnabled(): boolean {
  return process.env.ENABLE_AI_COST_FORECAST === "true";
}

export interface SubsystemCost {
  subsystem: string;
  last7dCostCents: number;
  last30dCostCents: number;
  avgDailyCost7d: number;
  avgDailyCost30d: number;
  trend: "increasing" | "decreasing" | "stable";
  forecastNext7dCents: number;
  forecastNext30dCents: number;
}

export interface CostForecast {
  totalLast7dCents: number;
  totalLast30dCents: number;
  forecastNext7dCents: number;
  forecastNext30dCents: number;
  bySubsystem: SubsystemCost[];
  alerts: CostAlert[];
  calculatedAt: string;
}

export interface CostAlert {
  level: "soft" | "hard";
  subsystem: string;
  message: string;
  forecastCents: number;
  thresholdCents: number;
}

// Alert thresholds (configurable via env)
const SOFT_THRESHOLD_CENTS = parseInt(process.env.AI_COST_SOFT_THRESHOLD || "10000"); // $100
const HARD_THRESHOLD_CENTS = parseInt(process.env.AI_COST_HARD_THRESHOLD || "50000"); // $500

/**
 * Record an AI cost event
 */
export async function recordAiCost(
  subsystem: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  costCents: number,
  contentId?: string,
  jobId?: string
): Promise<void> {
  if (!isEnabled()) return;

  await db.insert(aiCostRecords).values({
    subsystem,
    model,
    inputTokens,
    outputTokens,
    costCents,
    contentId,
    jobId,
  } as any);
}

/**
 * Get cost forecast with rolling window analysis
 */
export async function getCostForecast(): Promise<CostForecast> {
  if (!isEnabled()) {
    return {
      totalLast7dCents: 0,
      totalLast30dCents: 0,
      forecastNext7dCents: 0,
      forecastNext30dCents: 0,
      bySubsystem: [],
      alerts: [],
      calculatedAt: new Date().toISOString(),
    };
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get costs by subsystem for 7d and 30d
  const costs7d = await db
    .select({
      subsystem: aiCostRecords.subsystem,
      totalCost: sql<number>`SUM(${aiCostRecords.costCents})`,
      totalInputTokens: sql<number>`SUM(${aiCostRecords.inputTokens})`,
      totalOutputTokens: sql<number>`SUM(${aiCostRecords.outputTokens})`,
    })
    .from(aiCostRecords)
    .where(gte(aiCostRecords.createdAt, sevenDaysAgo))
    .groupBy(aiCostRecords.subsystem);

  const costs30d = await db
    .select({
      subsystem: aiCostRecords.subsystem,
      totalCost: sql<number>`SUM(${aiCostRecords.costCents})`,
    })
    .from(aiCostRecords)
    .where(gte(aiCostRecords.createdAt, thirtyDaysAgo))
    .groupBy(aiCostRecords.subsystem);

  // Build subsystem map
  const subsystemMap = new Map<string, SubsystemCost>();

  for (const row of costs30d) {
    const subsystem = row.subsystem;
    const cost30d = row.totalCost || 0;
    const avgDaily30d = cost30d / 30;

    subsystemMap.set(subsystem, {
      subsystem,
      last7dCostCents: 0,
      last30dCostCents: cost30d,
      avgDailyCost7d: 0,
      avgDailyCost30d: avgDaily30d,
      trend: "stable",
      forecastNext7dCents: Math.round(avgDaily30d * 7),
      forecastNext30dCents: Math.round(avgDaily30d * 30),
    });
  }

  for (const row of costs7d) {
    const subsystem = row.subsystem;
    const cost7d = row.totalCost || 0;
    const avgDaily7d = cost7d / 7;

    const existing = subsystemMap.get(subsystem);
    if (existing) {
      existing.last7dCostCents = cost7d;
      existing.avgDailyCost7d = avgDaily7d;

      // Determine trend
      const ratio = avgDaily7d / (existing.avgDailyCost30d || 1);
      if (ratio > 1.2) {
        existing.trend = "increasing";
        // Adjust forecast based on 7d trend
        existing.forecastNext7dCents = Math.round(avgDaily7d * 7);
        existing.forecastNext30dCents = Math.round(avgDaily7d * 30);
      } else if (ratio < 0.8) {
        existing.trend = "decreasing";
        existing.forecastNext7dCents = Math.round(avgDaily7d * 7);
        existing.forecastNext30dCents = Math.round(avgDaily7d * 30);
      }
    } else {
      subsystemMap.set(subsystem, {
        subsystem,
        last7dCostCents: cost7d,
        last30dCostCents: cost7d,
        avgDailyCost7d: avgDaily7d,
        avgDailyCost30d: avgDaily7d,
        trend: "stable",
        forecastNext7dCents: Math.round(avgDaily7d * 7),
        forecastNext30dCents: Math.round(avgDaily7d * 30),
      });
    }
  }

  const bySubsystem = Array.from(subsystemMap.values());

  // Calculate totals
  const totalLast7dCents = bySubsystem.reduce((sum, s) => sum + s.last7dCostCents, 0);
  const totalLast30dCents = bySubsystem.reduce((sum, s) => sum + s.last30dCostCents, 0);
  const forecastNext7dCents = bySubsystem.reduce((sum, s) => sum + s.forecastNext7dCents, 0);
  const forecastNext30dCents = bySubsystem.reduce((sum, s) => sum + s.forecastNext30dCents, 0);

  // Generate alerts
  const alerts: CostAlert[] = [];

  for (const subsystem of bySubsystem) {
    if (subsystem.forecastNext30dCents >= HARD_THRESHOLD_CENTS) {
      alerts.push({
        level: "hard",
        subsystem: subsystem.subsystem,
        message: `${subsystem.subsystem} forecast exceeds hard threshold`,
        forecastCents: subsystem.forecastNext30dCents,
        thresholdCents: HARD_THRESHOLD_CENTS,
      });
    } else if (subsystem.forecastNext30dCents >= SOFT_THRESHOLD_CENTS) {
      alerts.push({
        level: "soft",
        subsystem: subsystem.subsystem,
        message: `${subsystem.subsystem} forecast approaching threshold`,
        forecastCents: subsystem.forecastNext30dCents,
        thresholdCents: SOFT_THRESHOLD_CENTS,
      });
    }
  }

  return {
    totalLast7dCents,
    totalLast30dCents,
    forecastNext7dCents,
    forecastNext30dCents,
    bySubsystem,
    alerts,
    calculatedAt: new Date().toISOString(),
  };
}

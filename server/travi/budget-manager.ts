/**
 * TRAVI Content Generation - Budget & Rate Limit Manager
 *
 * Tracks API usage, enforces budget limits, and manages rate limiting
 * across all AI and data services.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

// Budget thresholds (in USD)
const BUDGET_THRESHOLDS = {
  warning: 100, // $100 - Send warning alert
  critical: 500, // $500 - Critical alert, reduce processing speed
  stop: 1000, // $1000 - Hard stop all processing
};

// Rate limits per service (per day)
const RATE_LIMITS = {
  gemini: 1500, // Free tier daily limit
  gpt: 10000, // Based on token usage
  claude: 5000, // Based on token usage
  google_places: 1000, // Places API daily limit
  freepik: 500, // API calls per day
  tripadvisor: 5000, // Daily call limit
  wikipedia: 10000, // MediaWiki API (generous)
  osm: 10000, // Nominatim/Overpass (generous with delays)
};

// Cost estimates per 1K tokens (USD)
const TOKEN_COSTS = {
  gemini: { input: 0.0, output: 0.0 }, // Free tier
  gpt: { input: 0.00015, output: 0.0006 }, // GPT-4o Mini
  claude: { input: 0.0008, output: 0.004 }, // Claude Haiku
};

export type ServiceType =
  | "gemini"
  | "gpt"
  | "claude"
  | "google_places"
  | "freepik"
  | "tripadvisor"
  | "wikipedia"
  | "osm";

export interface UsageStats {
  date: string;
  service: ServiceType;
  requestCount: number;
  successCount: number;
  failedCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: string;
  rateLimitHits: number;
}

export interface BudgetStatus {
  totalSpent: number;
  status: "ok" | "warning" | "critical" | "stopped";
  remainingBudget: number;
  alertMessage?: string;
}

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// Get or create usage record for today
async function getOrCreateDailyUsage(service: ServiceType): Promise<UsageStats | null> {
  const today = getTodayDate();

  try {
    // Check if record exists
    const existing = await db.execute(sql`
      SELECT * FROM travi_api_usage 
      WHERE date = ${today} AND service = ${service}::travi_api_service
    `);

    if (existing.rows.length > 0) {
      const row = existing.rows[0] as any;
      return {
        date: row.date,
        service: row.service,
        requestCount: row.request_count || 0,
        successCount: row.success_count || 0,
        failedCount: row.failed_count || 0,
        promptTokens: row.prompt_tokens || 0,
        completionTokens: row.completion_tokens || 0,
        totalTokens: row.total_tokens || 0,
        estimatedCost: row.estimated_cost || "0",
        rateLimitHits: row.rate_limit_hits || 0,
      };
    }

    // Create new record
    await db.execute(sql`
      INSERT INTO travi_api_usage (id, date, service, request_count, success_count, failed_count, 
        prompt_tokens, completion_tokens, total_tokens, estimated_cost, rate_limit_hits)
      VALUES (gen_random_uuid(), ${today}, ${service}::travi_api_service, 0, 0, 0, 0, 0, 0, '0', 0)
    `);

    return {
      date: today,
      service,
      requestCount: 0,
      successCount: 0,
      failedCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCost: "0",
      rateLimitHits: 0,
    };
  } catch (error) {
    return null;
  }
}

// Processing state - controlled by budget status
let processingPaused = false;
let processingThrottled = false;

// Check if processing is paused due to budget
export function isProcessingPaused(): boolean {
  return processingPaused;
}

// Check if processing is throttled (at critical threshold)
export function isProcessingThrottled(): boolean {
  return processingThrottled;
}

// Get throttle multiplier for delays (max 10x to prevent hangs)
export function getThrottleMultiplier(): number {
  if (processingPaused) return 10; // Max 10x delay when paused (not Infinity to prevent hangs)
  if (processingThrottled) return 3; // 3x slower at critical threshold
  return 1;
}

// Check if we can make an API call (rate limit + budget check)
export async function canMakeRequest(service: ServiceType): Promise<{
  allowed: boolean;
  reason?: string;
  throttled?: boolean;
  delayMs?: number;
}> {
  // Check manual pause first
  if (processingPaused) {
    return {
      allowed: false,
      reason: "Processing is manually paused",
    };
  }

  const usage = await getOrCreateDailyUsage(service);

  if (!usage) {
    return { allowed: false, reason: "Failed to check usage stats" };
  }

  const limit = RATE_LIMITS[service];
  if (usage.requestCount >= limit) {
    return {
      allowed: false,
      reason: `Daily rate limit reached for ${service}: ${usage.requestCount}/${limit}`,
    };
  }

  // Check overall budget with auto-pause/throttle
  const budgetStatus = await getBudgetStatus();

  // Hard stop at $1000
  if (budgetStatus.status === "stopped") {
    processingPaused = true;
    return {
      allowed: false,
      reason: `BUDGET EXCEEDED: $${budgetStatus.totalSpent.toFixed(2)} - Processing stopped`,
    };
  }

  // Auto-throttle at critical threshold ($500)
  if (budgetStatus.status === "critical") {
    processingThrottled = true;

    const baseDelay = getRecommendedDelay(service);
    return {
      allowed: true,
      throttled: true,
      delayMs: baseDelay * 3,
      reason: `Critical budget warning - processing throttled`,
    };
  }

  // Warning at $100 - log but continue
  if (budgetStatus.status === "warning") {
  }

  // Reset throttle if budget is back to OK
  if (budgetStatus.status === "ok") {
    processingThrottled = false;
  }

  return { allowed: true };
}

// Pause all processing (manual override)
export function pauseProcessing(reason: string = "Manual pause"): void {
  processingPaused = true;
}

// Resume processing (manual override)
export function resumeProcessing(): void {
  processingPaused = false;
  processingThrottled = false;
}

// Record API request (call before making request)
export async function recordRequestStart(service: ServiceType): Promise<void> {
  const today = getTodayDate();

  try {
    await db.execute(sql`
      UPDATE travi_api_usage 
      SET request_count = request_count + 1, updated_at = now()
      WHERE date = ${today} AND service = ${service}::travi_api_service
    `);
  } catch (error) {}
}

// Record API request result
export async function recordRequestResult(
  service: ServiceType,
  success: boolean,
  promptTokens: number = 0,
  completionTokens: number = 0,
  hitRateLimit: boolean = false
): Promise<void> {
  const today = getTodayDate();
  const totalTokens = promptTokens + completionTokens;

  // Calculate cost
  let cost = 0;
  if (service in TOKEN_COSTS) {
    const costs = TOKEN_COSTS[service as keyof typeof TOKEN_COSTS];
    cost = (promptTokens / 1000) * costs.input + (completionTokens / 1000) * costs.output;
  }

  try {
    if (success) {
      await db.execute(sql`
        UPDATE travi_api_usage 
        SET 
          success_count = success_count + 1,
          prompt_tokens = prompt_tokens + ${promptTokens},
          completion_tokens = completion_tokens + ${completionTokens},
          total_tokens = total_tokens + ${totalTokens},
          estimated_cost = (estimated_cost::numeric + ${cost})::text,
          rate_limit_hits = rate_limit_hits + ${hitRateLimit ? 1 : 0},
          last_rate_limit_at = ${hitRateLimit ? sql`now()` : sql`last_rate_limit_at`},
          updated_at = now()
        WHERE date = ${today} AND service = ${service}::travi_api_service
      `);
    } else {
      await db.execute(sql`
        UPDATE travi_api_usage 
        SET 
          failed_count = failed_count + 1,
          rate_limit_hits = rate_limit_hits + ${hitRateLimit ? 1 : 0},
          last_rate_limit_at = ${hitRateLimit ? sql`now()` : sql`last_rate_limit_at`},
          updated_at = now()
        WHERE date = ${today} AND service = ${service}::travi_api_service
      `);
    }

    // Check for budget alerts
    await checkAndCreateAlerts();
  } catch (error) {}
}

// Get total budget status
export async function getBudgetStatus(): Promise<BudgetStatus> {
  try {
    const result = await db.execute(sql`
      SELECT COALESCE(SUM(estimated_cost::numeric), 0) as total_cost
      FROM travi_api_usage
    `);

    const totalSpent = parseFloat((result.rows[0] as any)?.total_cost || "0");

    let status: "ok" | "warning" | "critical" | "stopped" = "ok";
    let alertMessage: string | undefined;

    if (totalSpent >= BUDGET_THRESHOLDS.stop) {
      status = "stopped";
      alertMessage = `BUDGET EXCEEDED: $${totalSpent.toFixed(2)} spent. Processing stopped.`;
    } else if (totalSpent >= BUDGET_THRESHOLDS.critical) {
      status = "critical";
      alertMessage = `Critical budget warning: $${totalSpent.toFixed(2)} spent of $${BUDGET_THRESHOLDS.stop} limit`;
    } else if (totalSpent >= BUDGET_THRESHOLDS.warning) {
      status = "warning";
      alertMessage = `Budget warning: $${totalSpent.toFixed(2)} spent`;
    }

    return {
      totalSpent,
      status,
      remainingBudget: BUDGET_THRESHOLDS.stop - totalSpent,
      alertMessage,
    };
  } catch (error) {
    return {
      totalSpent: 0,
      status: "ok",
      remainingBudget: BUDGET_THRESHOLDS.stop,
    };
  }
}

// Check and create alerts if needed
async function checkAndCreateAlerts(): Promise<void> {
  try {
    const budgetStatus = await getBudgetStatus();

    if (budgetStatus.status === "ok") return;

    // Check if alert already exists for this threshold
    const severity =
      budgetStatus.status === "stopped"
        ? "budget_stop"
        : budgetStatus.status === "critical"
          ? "critical"
          : "warning";

    const threshold =
      budgetStatus.status === "stopped"
        ? BUDGET_THRESHOLDS.stop
        : budgetStatus.status === "critical"
          ? BUDGET_THRESHOLDS.critical
          : BUDGET_THRESHOLDS.warning;

    // Check for existing unacknowledged alert
    const existingAlert = await db.execute(sql`
      SELECT id FROM travi_system_alerts
      WHERE severity = ${severity}::travi_alert_severity
        AND acknowledged = false
        AND budget_threshold = ${threshold.toString()}
      LIMIT 1
    `);

    if (existingAlert.rows.length === 0) {
      // Create new alert
      await db.execute(sql`
        INSERT INTO travi_system_alerts (id, severity, message, total_cost, budget_threshold)
        VALUES (
          gen_random_uuid(),
          ${severity}::travi_alert_severity,
          ${budgetStatus.alertMessage || "Budget threshold reached"},
          ${budgetStatus.totalSpent.toString()},
          ${threshold.toString()}
        )
      `);
    }
  } catch (error) {}
}

// Get usage stats for all services today
export async function getTodayUsageStats(): Promise<UsageStats[]> {
  const today = getTodayDate();

  try {
    const result = await db.execute(sql`
      SELECT * FROM travi_api_usage WHERE date = ${today}
    `);

    return result.rows.map((row: any) => ({
      date: row.date,
      service: row.service,
      requestCount: row.request_count || 0,
      successCount: row.success_count || 0,
      failedCount: row.failed_count || 0,
      promptTokens: row.prompt_tokens || 0,
      completionTokens: row.completion_tokens || 0,
      totalTokens: row.total_tokens || 0,
      estimatedCost: row.estimated_cost || "0",
      rateLimitHits: row.rate_limit_hits || 0,
    }));
  } catch (error) {
    return [];
  }
}

// Get active (unacknowledged) alerts
export async function getActiveAlerts(): Promise<any[]> {
  try {
    const result = await db.execute(sql`
      SELECT * FROM travi_system_alerts
      WHERE acknowledged = false
      ORDER BY created_at DESC
    `);

    return result.rows;
  } catch (error) {
    return [];
  }
}

// Acknowledge an alert
export async function acknowledgeAlert(
  alertId: string,
  acknowledgedBy: string = "system"
): Promise<boolean> {
  try {
    await db.execute(sql`
      UPDATE travi_system_alerts
      SET 
        acknowledged = true,
        acknowledged_by = ${acknowledgedBy},
        acknowledged_at = now()
      WHERE id = ${alertId}
    `);
    return true;
  } catch (error) {
    return false;
  }
}

// Get recommended delay between requests (for rate limiting)
export function getRecommendedDelay(service: ServiceType): number {
  // Base delays in milliseconds
  const baseDelays: Record<ServiceType, number> = {
    gemini: 1000, // 1 second
    gpt: 500, // 0.5 seconds
    claude: 500, // 0.5 seconds
    google_places: 200, // 0.2 seconds
    freepik: 2000, // 2 seconds (more conservative)
    tripadvisor: 100, // 0.1 seconds
    wikipedia: 100, // 0.1 seconds (courteous delay)
    osm: 1000, // 1 second (Nominatim policy)
  };

  return baseDelays[service] || 1000;
}

// Wait for recommended delay
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Smart delay with exponential backoff after rate limit hits
export async function smartDelay(service: ServiceType, rateLimitHits: number = 0): Promise<void> {
  const baseDelay = getRecommendedDelay(service);
  const backoffMultiplier = Math.pow(2, Math.min(rateLimitHits, 5)); // Max 32x backoff
  const totalDelay = baseDelay * backoffMultiplier;

  await delay(totalDelay);
}

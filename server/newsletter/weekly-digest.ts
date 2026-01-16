/**
 * Weekly Digest Scheduler
 * 
 * Sends automated weekly digest emails to subscribers with frequency: 'weekly'
 * Feature flag controlled via ENABLE_WEEKLY_DIGEST environment variable
 * 
 * PHASE 14 TASK 4: Safe Activation Mode
 * - Test endpoint: Send to single email for testing
 * - Dry-run mode: Generate content without sending
 * - Week dedupe protection: Prevent duplicate sends in same calendar week
 * - KPI tracking: Track digest metrics
 */

import { campaigns, subscribers } from "../newsletter";
import { cache } from "../cache";
import { Resend } from "resend";

// Cache keys for digest state
const CACHE_KEY_LAST_DIGEST = "newsletter:weekly_digest:last_sent";
const CACHE_KEY_LAST_WEEK_NUMBER = "newsletter:weekly_digest:last_week";
const CACHE_KEY_KPI_STATS = "newsletter:weekly_digest:kpi_stats";

const MIN_DAYS_BETWEEN_DIGESTS = 6;

// ============================================================================
// TYPES
// ============================================================================

interface DigestStatus {
  enabled: boolean;
  lastSent: Date | null;
  lastWeekNumber: number | null;
  nextScheduled: Date | null;
  subscriberCount: number;
  currentWeekNumber: number;
  canSendThisWeek: boolean;
}

interface DigestKPIStats {
  totalDigestsSent: number;
  totalRecipientsReached: number;
  digestsSentThisMonth: number;
  lastMonthReset: string;
  lastUpdated: string;
}

interface TestDigestResult {
  success: boolean;
  previewHtml: string;
  sentTo: string;
  generatedAt: string;
  articleCount: number;
  error?: string;
}

interface DryRunResult {
  previewHtml: string;
  articleCount: number;
  estimatedRecipients: number;
  generatedAt: string;
  subject: string;
  subjectHe: string;
}

interface SendDigestResult {
  success: boolean;
  campaignId?: string;
  recipientCount?: number;
  error?: string;
  weekNumber?: number;
  skippedReason?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Check if weekly digest feature is enabled
 */
export function isWeeklyDigestEnabled(): boolean {
  return process.env.ENABLE_WEEKLY_DIGEST === "true";
}

/**
 * Get configured day of week (0-6, 0 = Sunday, 1 = Monday)
 */
function getScheduledDay(): number {
  const day = parseInt(process.env.WEEKLY_DIGEST_DAY || "1", 10);
  return isNaN(day) || day < 0 || day > 6 ? 1 : day; // Default: Monday
}

/**
 * Get configured hour (0-23)
 */
function getScheduledHour(): number {
  const hour = parseInt(process.env.WEEKLY_DIGEST_HOUR || "9", 10);
  return isNaN(hour) || hour < 0 || hour > 23 ? 9 : hour; // Default: 9 AM UTC
}

/**
 * Get ISO week number for a date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Get current month key (YYYY-MM)
 */
function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Calculate next scheduled run time
 */
function getNextScheduledTime(): Date {
  const now = new Date();
  const targetDay = getScheduledDay();
  const targetHour = getScheduledHour();
  
  const next = new Date(now);
  next.setUTCHours(targetHour, 0, 0, 0);
  
  const daysUntilTarget = (targetDay - now.getUTCDay() + 7) % 7;
  
  if (daysUntilTarget === 0 && now.getUTCHours() >= targetHour) {
    next.setUTCDate(next.getUTCDate() + 7);
  } else {
    next.setUTCDate(next.getUTCDate() + daysUntilTarget);
  }
  
  return next;
}

/**
 * Get Resend client for email sending
 */
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Digest] RESEND_API_KEY not configured");
    return null;
  }
  return new Resend(apiKey);
}

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Get last digest sent timestamp from cache
 */
async function getLastDigestSent(): Promise<Date | null> {
  const cached = await cache.get(CACHE_KEY_LAST_DIGEST);
  if (cached) {
    return new Date(cached as string);
  }
  return null;
}

/**
 * Set last digest sent timestamp
 */
async function setLastDigestSent(date: Date): Promise<void> {
  await cache.set(CACHE_KEY_LAST_DIGEST, date.toISOString(), 60 * 60 * 24 * 30); // 30 days TTL
}

/**
 * Get last week number when digest was sent
 */
async function getLastWeekNumber(): Promise<number | null> {
  const cached = await cache.get(CACHE_KEY_LAST_WEEK_NUMBER);
  if (cached) {
    return parseInt(cached as string, 10);
  }
  return null;
}

/**
 * Set last week number
 */
async function setLastWeekNumber(weekNumber: number): Promise<void> {
  await cache.set(CACHE_KEY_LAST_WEEK_NUMBER, weekNumber.toString(), 60 * 60 * 24 * 30);
}

/**
 * Get KPI stats from cache
 */
async function getKPIStats(): Promise<DigestKPIStats> {
  const cached = await cache.get(CACHE_KEY_KPI_STATS);
  const currentMonth = getCurrentMonthKey();
  
  const defaultStats: DigestKPIStats = {
    totalDigestsSent: 0,
    totalRecipientsReached: 0,
    digestsSentThisMonth: 0,
    lastMonthReset: currentMonth,
    lastUpdated: new Date().toISOString(),
  };

  if (cached) {
    try {
      const stats = JSON.parse(cached as string) as DigestKPIStats;
      // Reset monthly counter if month changed
      if (stats.lastMonthReset !== currentMonth) {
        stats.digestsSentThisMonth = 0;
        stats.lastMonthReset = currentMonth;
      }
      return stats;
    } catch {
      return defaultStats;
    }
  }
  return defaultStats;
}

/**
 * Update KPI stats
 */
async function updateKPIStats(recipientCount: number): Promise<void> {
  const stats = await getKPIStats();
  stats.totalDigestsSent += 1;
  stats.totalRecipientsReached += recipientCount;
  stats.digestsSentThisMonth += 1;
  stats.lastUpdated = new Date().toISOString();
  
  await cache.set(CACHE_KEY_KPI_STATS, JSON.stringify(stats), 60 * 60 * 24 * 365); // 1 year TTL
}

/**
 * Check if enough time has passed since last digest
 */
async function canSendDigest(): Promise<boolean> {
  const lastSent = await getLastDigestSent();
  if (!lastSent) return true;
  
  const daysSinceLastSent = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceLastSent >= MIN_DAYS_BETWEEN_DIGESTS;
}

/**
 * Check if digest was already sent this calendar week
 */
async function wasDigestSentThisWeek(): Promise<boolean> {
  const lastWeek = await getLastWeekNumber();
  const currentWeek = getWeekNumber(new Date());
  return lastWeek === currentWeek;
}

/**
 * Get count of weekly subscribers
 */
async function getWeeklySubscriberCount(): Promise<number> {
  const weeklySubscribers = await subscribers.getActive({ frequency: "weekly" });
  return weeklySubscribers.length;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Generate digest content without sending
 */
async function generateDigestContent(): Promise<{
  subject: string;
  subjectHe: string;
  contentHtml: string;
  contentHtmlHe: string;
  contentCount: number;
}> {
  const generated = await campaigns.generateFromContent({
    days: 7,
    limit: 5
  });
  return generated;
}

/**
 * DRY RUN: Generate full digest content but do NOT send
 * Useful for verifying content before enabling
 */
export async function dryRunDigest(): Promise<DryRunResult> {
  console.log("[Digest] Starting dry-run generation...");
  
  const generated = await generateDigestContent();
  const subscriberCount = await getWeeklySubscriberCount();
  
  console.log(`[Digest] Dry-run complete: ${generated.contentCount} articles, ${subscriberCount} potential recipients`);
  
  return {
    previewHtml: generated.contentHtml,
    articleCount: generated.contentCount,
    estimatedRecipients: subscriberCount,
    generatedAt: new Date().toISOString(),
    subject: generated.subject,
    subjectHe: generated.subjectHe,
  };
}

/**
 * TEST: Send digest to a single test email
 * Does not affect KPI counters or dedupe state
 */
export async function sendTestDigest(recipientEmail: string): Promise<TestDigestResult> {
  console.log(`[Digest] Sending test digest to: ${recipientEmail}`);
  
  const resend = getResendClient();
  if (!resend) {
    return {
      success: false,
      previewHtml: "",
      sentTo: recipientEmail,
      generatedAt: new Date().toISOString(),
      articleCount: 0,
      error: "Resend not configured. Set RESEND_API_KEY environment variable.",
    };
  }
  
  try {
    const generated = await generateDigestContent();
    
    if (generated.contentCount === 0) {
      return {
        success: false,
        previewHtml: generated.contentHtml,
        sentTo: recipientEmail,
        generatedAt: new Date().toISOString(),
        articleCount: 0,
        error: "No recent content found for digest",
      };
    }
    
    // Get sender email from env or use default
    const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || "noreply@travi.world";
    const fromName = process.env.NEWSLETTER_FROM_NAME || "Travi";
    
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmail,
      subject: `[TEST] ${generated.subject}`,
      html: `
        <div style="background: #fff3cd; padding: 12px; margin-bottom: 20px; border-radius: 8px;">
          <strong>TEST EMAIL</strong> - This is a test digest. Not sent to subscribers.
        </div>
        ${generated.contentHtml}
      `,
    });
    
    console.log(`[Digest] Test digest sent successfully to ${recipientEmail}`);
    
    return {
      success: true,
      previewHtml: generated.contentHtml,
      sentTo: recipientEmail,
      generatedAt: new Date().toISOString(),
      articleCount: generated.contentCount,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Digest] Test send failed:", errorMessage);
    
    return {
      success: false,
      previewHtml: "",
      sentTo: recipientEmail,
      generatedAt: new Date().toISOString(),
      articleCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Send weekly digest to all weekly subscribers
 * With week dedupe protection and KPI tracking
 */
export async function sendWeeklyDigest(options: { force?: boolean } = {}): Promise<SendDigestResult> {
  const currentWeek = getWeekNumber(new Date());
  
  if (!isWeeklyDigestEnabled()) {
    console.log("[Digest] Feature is disabled, skipping");
    return { success: false, error: "Feature disabled" };
  }

  // Week dedupe protection
  if (!options.force) {
    const alreadySentThisWeek = await wasDigestSentThisWeek();
    if (alreadySentThisWeek) {
      const message = `Digest already sent for week ${currentWeek}`;
      console.log(`[Digest] ${message}`);
      return { 
        success: false, 
        error: message,
        skippedReason: "week_dedupe",
        weekNumber: currentWeek,
      };
    }
  }

  const canSend = await canSendDigest();
  if (!canSend && !options.force) {
    console.log("[Digest] Too soon since last digest, skipping");
    return { success: false, error: "Minimum interval not reached" };
  }

  console.log("[Digest] Starting weekly digest generation...");

  try {
    const generated = await generateDigestContent();

    if (generated.contentCount === 0) {
      console.log("[Digest] No recent content found, skipping");
      return { success: false, error: "No recent content" };
    }

    console.log(`[Digest] Generated digest with ${generated.contentCount} articles`);

    const campaign = await campaigns.create({
      name: `Weekly Digest - ${new Date().toISOString().split("T")[0]}`,
      subject: generated.subject,
      subjectHe: generated.subjectHe,
      previewText: "Your weekly roundup of the best travel discoveries",
      previewTextHe: "סיכום שבועי של התגליות הטובות ביותר",
      contentHtml: generated.contentHtml,
      contentHtmlHe: generated.contentHtmlHe,
      targetTags: undefined,
      targetLocales: undefined,
    });

    console.log(`[Digest] Campaign created: ${campaign.id}`);

    const result = await campaigns.sendNow(campaign.id);

    if (result.success) {
      // Update state
      await setLastDigestSent(new Date());
      await setLastWeekNumber(currentWeek);
      
      // Update KPI counters
      await updateKPIStats(result.recipientCount);
      
      console.log(`[Digest] Weekly digest sent to ${result.recipientCount} subscribers`);
      
      return {
        success: true,
        campaignId: campaign.id,
        recipientCount: result.recipientCount,
        weekNumber: currentWeek,
      };
    } else {
      console.log("[Digest] Failed to send campaign");
      return { success: false, error: "Campaign send failed" };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Digest] Error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Check if it's time to send digest and send if needed
 */
async function checkAndSendDigest(): Promise<void> {
  if (!isWeeklyDigestEnabled()) return;

  const now = new Date();
  const targetDay = getScheduledDay();
  const targetHour = getScheduledHour();

  if (now.getUTCDay() === targetDay && now.getUTCHours() === targetHour) {
    console.log("[Digest] Scheduled time reached, triggering digest...");
    await sendWeeklyDigest();
  }
}

/**
 * Get current digest status with enhanced info
 */
export async function getDigestStatus(): Promise<DigestStatus> {
  const enabled = isWeeklyDigestEnabled();
  const lastSent = await getLastDigestSent();
  const lastWeek = await getLastWeekNumber();
  const subscriberCount = await getWeeklySubscriberCount();
  const nextScheduled = enabled ? getNextScheduledTime() : null;
  const currentWeek = getWeekNumber(new Date());
  const canSendThisWeek = !await wasDigestSentThisWeek();

  return {
    enabled,
    lastSent,
    lastWeekNumber: lastWeek,
    nextScheduled,
    subscriberCount,
    currentWeekNumber: currentWeek,
    canSendThisWeek,
  };
}

/**
 * Get digest KPI statistics
 */
export async function getDigestKPIStats(): Promise<DigestKPIStats & { status: DigestStatus }> {
  const stats = await getKPIStats();
  const status = await getDigestStatus();
  
  return {
    ...stats,
    status,
  };
}

/**
 * Start the weekly digest scheduler
 */
export function startWeeklyDigestScheduler(): void {
  if (!isWeeklyDigestEnabled()) {
    console.log("[Digest] Feature disabled, scheduler not started");
    return;
  }

  if (schedulerInterval) {
    console.log("[Digest] Scheduler already running");
    return;
  }

  console.log("[Digest] Starting scheduler...");
  console.log(`[Digest] Configured: Day=${getScheduledDay()} (0=Sun, 1=Mon), Hour=${getScheduledHour()} UTC`);
  console.log(`[Digest] Next scheduled: ${getNextScheduledTime().toISOString()}`);

  schedulerInterval = setInterval(async () => {
    await checkAndSendDigest();
  }, 60 * 60 * 1000); // Check every hour

  console.log("[Digest] Scheduler started (checking hourly)");
}

/**
 * Stop the weekly digest scheduler
 */
export function stopWeeklyDigestScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[Digest] Scheduler stopped");
  }
}

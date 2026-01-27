/**
 * Content Health Scheduler
 *
 * Runs periodic health scans on published content.
 * Identifies issues and optionally enqueues refresh jobs.
 *
 * SAFETY:
 * - Feature flag controlled
 * - Bounded batch sizes
 * - No blocking of user requests
 * - Idempotent issue detection
 */

import { scanContentBatch } from "./scanner";
type ContentHealthScan = any;
import {
  upsertHealthIssue,
  resolveHealthIssue,
  markJobEnqueued,
  setLastScanAt,
  getOpenIssues,
} from "./repository";
import {
  type HealthIssueType,
  type BatchScanResult,
  isContentHealthJobsEnabled,
  isAutoEnqueueEnabled,
  DEFAULT_SCANNER_CONFIG,
} from "./types";
import { scheduleBackgroundJob } from "../jobs/background-scheduler";

// Scheduler state
let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;
let currentOffset = 0;
let cycleComplete = true;

// Metrics
interface SchedulerMetrics {
  totalScanned: number;
  totalIssuesFound: number;
  totalJobsEnqueued: number;
  cyclesCompleted: number;
  lastCycleAt: Date | null;
  isRunning: boolean;
}

const metrics: SchedulerMetrics = {
  totalScanned: 0,
  totalIssuesFound: 0,
  totalJobsEnqueued: 0,
  cyclesCompleted: 0,
  lastCycleAt: null,
  isRunning: false,
};

/**
 * Process health scan results
 */
function processScans(scans: ContentHealthScan[]): number {
  let issuesFound = 0;

  for (const scan of scans) {
    // Check each issue type
    const issueTypes: HealthIssueType[] = [
      "no_blocks",
      "no_entities",
      "no_aeo_capsule",
      "not_indexed",
      "low_intelligence_coverage",
      "low_seo_score",
      "low_aeo_score",
      "stale_content",
    ];

    for (const issueType of issueTypes) {
      if (scan.issues.includes(issueType)) {
        upsertHealthIssue(scan.contentId, scan.contentTitle, scan.contentType, issueType, {
          score: scan.score,
          overallHealth: scan.overallHealth,
        });
        issuesFound++;
      } else {
        // Issue no longer exists - resolve it
        resolveHealthIssue(scan.contentId, issueType);
      }
    }
  }

  return issuesFound;
}

/**
 * Enqueue refresh jobs for open issues
 */
function enqueueRefreshJobs(): number {
  if (!isAutoEnqueueEnabled()) {
    return 0;
  }

  const openIssues = getOpenIssues(20); // Limit to 20 jobs per cycle
  let enqueued = 0;

  for (const issue of openIssues) {
    if (issue.jobEnqueued) continue;

    // Map issue type to job type
    let jobType: "seo-improvement" | "content-enrichment" | "internal-linking" | null = null;

    switch (issue.issueType) {
      case "no_aeo_capsule":
      case "no_entities":
      case "low_aeo_score":
        jobType = "content-enrichment";
        break;
      case "low_seo_score":
        jobType = "seo-improvement";
        break;
      case "not_indexed":
      case "low_intelligence_coverage":
        jobType = "content-enrichment";
        break;
      default:
        // No automatic job for other issue types
        break;
    }

    if (jobType) {
      scheduleBackgroundJob(jobType, issue.contentId, "low");
      markJobEnqueued(issue.id);
      enqueued++;
    }
  }

  return enqueued;
}

/**
 * Run a single scan batch
 */
async function runScanBatch(): Promise<BatchScanResult> {
  const startTime = Date.now();

  const { scans, hasMore, nextOffset } = await scanContentBatch(
    currentOffset,
    DEFAULT_SCANNER_CONFIG
  );

  const issuesFound = processScans(scans);
  const jobsEnqueued = enqueueRefreshJobs();

  // Update metrics
  metrics.totalScanned += scans.length;
  metrics.totalIssuesFound += issuesFound;
  metrics.totalJobsEnqueued += jobsEnqueued;

  // Update offset for next batch
  if (hasMore) {
    currentOffset = nextOffset;
  } else {
    // Cycle complete
    currentOffset = 0;
    cycleComplete = true;
    metrics.cyclesCompleted++;
    metrics.lastCycleAt = new Date();
  }

  setLastScanAt(new Date());

  return {
    scannedCount: scans.length,
    issuesFound,
    newIssues: issuesFound,
    resolvedIssues: 0, // We don't track this per batch
    duration: Date.now() - startTime,
    nextBatchOffset: currentOffset,
  };
}

/**
 * Run the health scanner
 */
async function runHealthScanner(): Promise<void> {
  if (!isContentHealthJobsEnabled()) {
    return;
  }

  if (isProcessing) {
    return;
  }

  isProcessing = true;

  try {
    const result = await runScanBatch();

    if (result.scannedCount > 0) {
    }

    if (cycleComplete) {
      cycleComplete = false;
    }
  } catch (error) {
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the health scanner
 */
export function startHealthScanner(): void {
  if (!isContentHealthJobsEnabled()) {
    return;
  }

  if (schedulerInterval) {
    return;
  }

  metrics.isRunning = true;

  // Run immediately on start
  runHealthScanner().catch(() => {});

  // Then run periodically
  schedulerInterval = setInterval(() => {
    runHealthScanner().catch(() => {});
  }, DEFAULT_SCANNER_CONFIG.scanIntervalMs);
}

/**
 * Stop the health scanner
 */
export function stopHealthScanner(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    metrics.isRunning = false;
  }
}

/**
 * Get scheduler metrics
 */
export function getSchedulerMetrics(): SchedulerMetrics {
  return { ...metrics };
}

/**
 * Manually trigger a scan cycle
 */
export async function triggerScan(): Promise<BatchScanResult> {
  if (!isContentHealthJobsEnabled()) {
    throw new Error("Content health jobs disabled");
  }
  return runScanBatch();
}

/**
 * Reset the scanner (for testing)
 */
export function resetScanner(): void {
  currentOffset = 0;
  cycleComplete = true;
  metrics.totalScanned = 0;
  metrics.totalIssuesFound = 0;
  metrics.totalJobsEnqueued = 0;
  metrics.cyclesCompleted = 0;
  metrics.lastCycleAt = null;
}

/**
 * Check if scanner is running
 */
export function isHealthScannerRunning(): boolean {
  return schedulerInterval !== null;
}

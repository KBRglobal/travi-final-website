/**
 * Background Services Startup
 *
 * Unified startup for all background services:
 * - Translation Queue & Worker
 * - RSS Scheduler
 * - Localization Governance
 *
 * All services are configurable via environment variables.
 */

import { log } from '../lib/logger';

// Service state tracking
let servicesStarted = false;
let shutdownHandlers: Array<() => void | Promise<void>> = [];

// ============================================================================
// CONFIGURATION
// ============================================================================

interface BackgroundServicesConfig {
  enableTranslationQueue: boolean;
  enableTranslationWorker: boolean;
  enableRSSScheduler: boolean;
  enableLocalizationGovernance: boolean;
  rssSchedulerConfig: {
    dailyLimit: number;
    intervalMinutes: number;
  };
}

function getConfig(): BackgroundServicesConfig {
  return {
    // Translation services - enabled by default
    enableTranslationQueue: process.env.ENABLE_TRANSLATION_QUEUE !== 'false',
    enableTranslationWorker: process.env.ENABLE_TRANSLATION_WORKER !== 'false',

    // RSS scheduler - enabled by default
    enableRSSScheduler: process.env.ENABLE_RSS_SCHEDULER !== 'false',

    // Localization governance - enabled by default
    enableLocalizationGovernance: process.env.ENABLE_LOCALIZATION_GOVERNANCE !== 'false',

    // RSS scheduler settings
    rssSchedulerConfig: {
      dailyLimit: parseInt(process.env.RSS_DAILY_LIMIT || '20', 10),
      intervalMinutes: parseInt(process.env.RSS_INTERVAL_MINUTES || '60', 10),
    },
  };
}

// ============================================================================
// TRANSLATION SERVICES
// ============================================================================

async function startTranslationServices(config: BackgroundServicesConfig): Promise<void> {
  if (!config.enableTranslationQueue && !config.enableTranslationWorker) {
    log('[BackgroundServices] Translation services DISABLED via environment', 'server');
    return;
  }

  try {
    // Start translation queue
    if (config.enableTranslationQueue) {
      const { startQueue, stopQueue } = await import('../localization/translation-queue');
      startQueue();
      shutdownHandlers.push(stopQueue);
      log('[BackgroundServices] Translation queue STARTED', 'server');
    }

    // Start translation worker in background
    if (config.enableTranslationWorker) {
      const { runWorkerLoop } = await import('../localization/translation-worker');

      // Run worker loop in background (don't await)
      runWorkerLoop().catch((err) => {
        log(`[BackgroundServices] Translation worker error: ${err}`, 'error');
      });

      log('[BackgroundServices] Translation worker STARTED', 'server');
    }
  } catch (error) {
    log(`[BackgroundServices] Failed to start translation services: ${error}`, 'error');
  }
}

// ============================================================================
// RSS SCHEDULER
// ============================================================================

async function startRSSSchedulerService(config: BackgroundServicesConfig): Promise<void> {
  if (!config.enableRSSScheduler) {
    log('[BackgroundServices] RSS scheduler DISABLED via environment', 'server');
    return;
  }

  try {
    const { startRSSScheduler, stopRSSScheduler } = await import('../octypo/rss-scheduler');

    startRSSScheduler({
      enabled: true,
      dailyLimit: config.rssSchedulerConfig.dailyLimit,
      intervalMinutes: config.rssSchedulerConfig.intervalMinutes,
    });

    shutdownHandlers.push(stopRSSScheduler);
    log(`[BackgroundServices] RSS scheduler STARTED (limit: ${config.rssSchedulerConfig.dailyLimit}/day, interval: ${config.rssSchedulerConfig.intervalMinutes}min)`, 'server');
  } catch (error) {
    log(`[BackgroundServices] Failed to start RSS scheduler: ${error}`, 'error');
  }
}

// ============================================================================
// LOCALIZATION GOVERNANCE
// ============================================================================

async function startLocalizationGovernance(config: BackgroundServicesConfig): Promise<void> {
  if (!config.enableLocalizationGovernance) {
    log('[BackgroundServices] Localization governance DISABLED via environment', 'server');
    return;
  }

  try {
    // Import and initialize the governance module
    const governance = await import('../localization-governance');

    // Check if the module exports an initialization function
    if (typeof governance.initializeGovernance === 'function') {
      await governance.initializeGovernance();
      log('[BackgroundServices] Localization governance INITIALIZED', 'server');
    } else {
      log('[BackgroundServices] Localization governance module loaded (no init function)', 'server');
    }
  } catch (error) {
    // Module may not exist or have errors - that's okay
    log(`[BackgroundServices] Localization governance not available: ${error}`, 'server');
  }
}

// ============================================================================
// MAIN STARTUP
// ============================================================================

/**
 * Start all background services
 * Call this from server initialization
 */
export async function startBackgroundServices(): Promise<void> {
  if (servicesStarted) {
    log('[BackgroundServices] Services already started, skipping', 'server');
    return;
  }

  const config = getConfig();
  log('[BackgroundServices] Starting background services...', 'server');

  // Start all services in parallel
  await Promise.all([
    startTranslationServices(config),
    startRSSSchedulerService(config),
    startLocalizationGovernance(config),
  ]);

  servicesStarted = true;
  log('[BackgroundServices] All background services initialized', 'server');
}

/**
 * Stop all background services
 * Call this during graceful shutdown
 */
export async function stopBackgroundServices(): Promise<void> {
  if (!servicesStarted) {
    return;
  }

  log('[BackgroundServices] Stopping background services...', 'server');

  for (const handler of shutdownHandlers) {
    try {
      await handler();
    } catch (error) {
      log(`[BackgroundServices] Shutdown handler error: ${error}`, 'error');
    }
  }

  shutdownHandlers = [];
  servicesStarted = false;
  log('[BackgroundServices] All background services stopped', 'server');
}

/**
 * Get status of all background services
 */
export async function getBackgroundServicesStatus(): Promise<{
  started: boolean;
  config: BackgroundServicesConfig;
  services: {
    translationQueue: { enabled: boolean; status: string };
    translationWorker: { enabled: boolean; status: string };
    rssScheduler: { enabled: boolean; status: any };
    localizationGovernance: { enabled: boolean; status: string };
  };
}> {
  const config = getConfig();

  let rssSchedulerStatus: any = { running: false };
  try {
    const { getRSSSchedulerStatus } = await import('../octypo/rss-scheduler');
    rssSchedulerStatus = getRSSSchedulerStatus();
  } catch {
    // Scheduler not available
  }

  let translationQueueStatus = 'not_started';
  try {
    const { getQueueStatus } = await import('../localization/translation-queue');
    const qStatus = await getQueueStatus();
    translationQueueStatus = qStatus.isRunning ? 'running' : (qStatus.isPaused ? 'paused' : 'idle');
  } catch {
    // Queue not available
  }

  return {
    started: servicesStarted,
    config,
    services: {
      translationQueue: {
        enabled: config.enableTranslationQueue,
        status: translationQueueStatus,
      },
      translationWorker: {
        enabled: config.enableTranslationWorker,
        status: config.enableTranslationWorker && servicesStarted ? 'running' : 'stopped',
      },
      rssScheduler: {
        enabled: config.enableRSSScheduler,
        status: rssSchedulerStatus,
      },
      localizationGovernance: {
        enabled: config.enableLocalizationGovernance,
        status: config.enableLocalizationGovernance && servicesStarted ? 'active' : 'inactive',
      },
    },
  };
}

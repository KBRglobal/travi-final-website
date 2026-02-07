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

import { log } from "../lib/logger";

type ServiceMode = "off" | "supervised" | "full";

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
  enableGatekeeperPipeline: boolean;
  enableLocalizationGovernance: boolean;
  enableSEOAutopilot: boolean;
  enableDataDecisions: boolean;
  enableContentHealth: boolean;
  rssSchedulerConfig: {
    dailyLimitPerDestination: number;
    globalDailyLimit: number;
    intervalMinutes: number;
    minQualityScore: number;
  };
  seoAutopilotConfig: {
    mode: ServiceMode;
    intervalMinutes: number;
  };
  dataDecisionsConfig: {
    mode: ServiceMode;
    intervalMinutes: number;
  };
  contentHealthConfig: {
    intervalMinutes: number;
  };
}

function getConfig(): BackgroundServicesConfig {
  return {
    // Translation services - enabled by default
    enableTranslationQueue: process.env.ENABLE_TRANSLATION_QUEUE !== "false",
    enableTranslationWorker: process.env.ENABLE_TRANSLATION_WORKER !== "false",

    // RSS scheduler - enabled by default
    enableRSSScheduler: process.env.ENABLE_RSS_SCHEDULER !== "false",

    // Gatekeeper pipeline - runs autonomous content evaluation every 30 min
    enableGatekeeperPipeline: process.env.ENABLE_GATEKEEPER_PIPELINE === "true",

    // Localization governance - enabled by default
    enableLocalizationGovernance: process.env.ENABLE_LOCALIZATION_GOVERNANCE !== "false",

    // SEO Autopilot - enabled by default (set to 'false' to disable)
    enableSEOAutopilot: process.env.ENABLE_SEO_AUTOPILOT !== "false",

    // Data Decisions Autonomous Loop - enabled by default (set to 'false' to disable)
    enableDataDecisions: process.env.ENABLE_DATA_DECISIONS !== "false",

    // Content Health Scheduler - enabled by default (set to 'false' to disable)
    enableContentHealth: process.env.ENABLE_CONTENT_HEALTH !== "false",

    // RSS scheduler settings (per-destination limits)
    rssSchedulerConfig: {
      dailyLimitPerDestination: Number.parseInt(
        process.env.RSS_DAILY_LIMIT_PER_DESTINATION || "5",
        10
      ),
      globalDailyLimit: Number.parseInt(process.env.RSS_GLOBAL_DAILY_LIMIT || "50", 10),
      intervalMinutes: Number.parseInt(process.env.RSS_INTERVAL_MINUTES || "30", 10),
      minQualityScore: Number.parseInt(process.env.RSS_MIN_QUALITY_SCORE || "85", 10),
    },

    // SEO Autopilot settings
    seoAutopilotConfig: {
      mode: (process.env.SEO_AUTOPILOT_MODE as ServiceMode) || "supervised",
      intervalMinutes: Number.parseInt(process.env.SEO_AUTOPILOT_INTERVAL || "15", 10),
    },

    // Data Decisions settings
    dataDecisionsConfig: {
      mode: (process.env.DATA_DECISIONS_AUTOPILOT_MODE as ServiceMode) || "supervised",
      intervalMinutes: Number.parseInt(process.env.DATA_DECISIONS_INTERVAL || "5", 10),
    },

    // Content Health settings
    contentHealthConfig: {
      intervalMinutes: Number.parseInt(process.env.CONTENT_HEALTH_INTERVAL || "30", 10),
    },
  };
}

// ============================================================================
// TRANSLATION SERVICES
// ============================================================================

async function startTranslationServices(config: BackgroundServicesConfig): Promise<void> {
  if (!config.enableTranslationQueue && !config.enableTranslationWorker) {
    log.info("[BackgroundServices] Translation services DISABLED via environment");
    return;
  }

  try {
    // Start translation queue
    if (config.enableTranslationQueue) {
      const { startQueue, stopQueue } = await import("../localization/translation-queue");
      startQueue();
      shutdownHandlers.push(stopQueue);
      log.info("[BackgroundServices] Translation queue STARTED");
    }

    // Start translation worker in background
    if (config.enableTranslationWorker) {
      const { runWorkerLoop } = await import("../localization/translation-worker");

      // Run worker loop in background (don't await)
      runWorkerLoop().catch(err => {
        log.error(`[BackgroundServices] Translation worker error: ${err}`);
      });

      log.info("[BackgroundServices] Translation worker STARTED");
    }
  } catch (error) {
    log.error(`[BackgroundServices] Failed to start translation services: ${error}`);
  }
}

// ============================================================================
// RSS SCHEDULER
// ============================================================================

async function startRSSSchedulerService(config: BackgroundServicesConfig): Promise<void> {
  if (!config.enableRSSScheduler) {
    log.info("[BackgroundServices] RSS scheduler DISABLED via environment");
    return;
  }

  try {
    const { startRSSScheduler, stopRSSScheduler } = await import("../octypo/rss-scheduler");

    startRSSScheduler({
      enabled: true,
      dailyLimitPerDestination: config.rssSchedulerConfig.dailyLimitPerDestination,
      globalDailyLimit: config.rssSchedulerConfig.globalDailyLimit,
      intervalMinutes: config.rssSchedulerConfig.intervalMinutes,
      minQualityScore: config.rssSchedulerConfig.minQualityScore,
    });

    shutdownHandlers.push(stopRSSScheduler);
    log.info(
      `[BackgroundServices] RSS scheduler STARTED (limit: ${config.rssSchedulerConfig.dailyLimitPerDestination}/dest/day, global: ${config.rssSchedulerConfig.globalDailyLimit}/day, interval: ${config.rssSchedulerConfig.intervalMinutes}min)`
    );
  } catch (error) {
    log.error(`[BackgroundServices] Failed to start RSS scheduler: ${error}`);
  }
}

// ============================================================================
// LOCALIZATION GOVERNANCE
// ============================================================================

async function startLocalizationGovernance(config: BackgroundServicesConfig): Promise<void> {
  if (!config.enableLocalizationGovernance) {
    log.info("[BackgroundServices] Localization governance DISABLED via environment");
    return;
  }

  try {
    // Import and initialize the governance module
    const governance = await import("../localization-governance");

    // Check if the module exports an initialization function
    if (typeof governance.initializeGovernance === "function") {
      await governance.initializeGovernance();
      log.info("[BackgroundServices] Localization governance INITIALIZED");
    } else {
      log.info("[BackgroundServices] Localization governance module loaded (no init function)");
    }
  } catch (error) {
    // Module may not exist or have errors - that's okay
    log.info(`[BackgroundServices] Localization governance not available: ${error}`);
  }
}

// ============================================================================
// SEO AUTOPILOT
// ============================================================================

let seoAutopilotInterval: ReturnType<typeof setInterval> | null = null;

async function startSEOAutopilotService(config: BackgroundServicesConfig): Promise<void> {
  if (!config.enableSEOAutopilot || config.seoAutopilotConfig.mode === "off") {
    log.info("[BackgroundServices] SEO Autopilot DISABLED via environment");
    return;
  }

  try {
    const { getAutopilot } = await import("../seo-engine/autopilot");

    // Get autopilot with the configured mode
    const autopilot = getAutopilot(config.seoAutopilotConfig.mode);

    // Run initial cycle
    log.info(
      `[BackgroundServices] SEO Autopilot starting in ${config.seoAutopilotConfig.mode} mode...`
    );
    await autopilot.runCycle().catch((err: Error) => {
      log.warn(`[BackgroundServices] Initial SEO Autopilot cycle error: ${err.message}`);
    });

    // Set up scheduled runner
    const intervalMs = config.seoAutopilotConfig.intervalMinutes * 60 * 1000;
    seoAutopilotInterval = setInterval(async () => {
      try {
        await autopilot.runCycle();
      } catch (err: any) {
        log.error(`[BackgroundServices] SEO Autopilot cycle error: ${err.message}`);
      }
    }, intervalMs);

    shutdownHandlers.push(() => {
      if (seoAutopilotInterval) {
        clearInterval(seoAutopilotInterval);
        seoAutopilotInterval = null;
      }
    });

    log.info(
      `[BackgroundServices] SEO Autopilot STARTED (mode: ${config.seoAutopilotConfig.mode}, interval: ${config.seoAutopilotConfig.intervalMinutes}min)`
    );
  } catch (error) {
    log.error(`[BackgroundServices] Failed to start SEO Autopilot: ${error}`);
  }
}

// ============================================================================
// DATA DECISIONS AUTONOMOUS LOOP
// ============================================================================

let dataDecisionsInterval: ReturnType<typeof setInterval> | null = null;

async function startDataDecisionsService(config: BackgroundServicesConfig): Promise<void> {
  if (!config.enableDataDecisions || config.dataDecisionsConfig.mode === "off") {
    log.info("[BackgroundServices] Data Decisions Loop DISABLED via environment");
    return;
  }

  try {
    const { initializeDataDecisionSystem, shutdownDataDecisionSystem } =
      await import("../data-decisions");

    // Initialize the system with autonomous loop enabled
    initializeDataDecisionSystem({
      autopilotMode: config.dataDecisionsConfig.mode,
      startLoop: true,
      startHealthMonitor: true,
    });

    // Set up interval tracking for status
    dataDecisionsInterval = setInterval(
      () => {
        // Keep-alive marker - actual work done by autonomous loop
      },
      config.dataDecisionsConfig.intervalMinutes * 60 * 1000
    );

    shutdownHandlers.push(async () => {
      try {
        if (dataDecisionsInterval) {
          clearInterval(dataDecisionsInterval);
          dataDecisionsInterval = null;
        }
        shutdownDataDecisionSystem();
      } catch (error) {
        log.error("Background service error", error);
      }
    });

    log.info(
      `[BackgroundServices] Data Decisions Loop STARTED (mode: ${config.dataDecisionsConfig.mode})`
    );
  } catch (error) {
    log.error(`[BackgroundServices] Failed to start Data Decisions Loop: ${error}`);
  }
}

// ============================================================================
// GATEKEEPER PIPELINE SERVICE
// ============================================================================

let gatekeeperInterval: ReturnType<typeof setInterval> | null = null;

async function startGatekeeperService(config: BackgroundServicesConfig): Promise<void> {
  if (!config.enableGatekeeperPipeline) {
    log.info(
      "[BackgroundServices] Gatekeeper Pipeline DISABLED (set ENABLE_GATEKEEPER_PIPELINE=true)"
    );
    return;
  }

  try {
    const { getGatekeeperOrchestrator } = await import("../octypo/gatekeeper");
    const orchestrator = getGatekeeperOrchestrator();

    log.info("[BackgroundServices] Gatekeeper Pipeline starting...");

    // Run initial cycle after 2 min delay (let other services start first)
    setTimeout(async () => {
      try {
        const stats = await orchestrator.runPipeline(10);
        log.info(
          `[BackgroundServices] Gatekeeper initial cycle: ${stats.itemsEvaluated} evaluated, ${stats.itemsApprovedForWriting} approved`
        );
      } catch (err: any) {
        log.warn(`[BackgroundServices] Gatekeeper initial cycle error: ${err.message}`);
      }
    }, 120000);

    // Run every 30 minutes
    const intervalMs = 30 * 60 * 1000;
    gatekeeperInterval = setInterval(async () => {
      try {
        const stats = await orchestrator.runPipeline(10);
        if (stats.itemsEvaluated > 0) {
          log.info(
            `[BackgroundServices] Gatekeeper cycle: ${stats.itemsEvaluated} evaluated, ${stats.itemsApprovedForWriting} approved`
          );
        }
      } catch (err: any) {
        log.error(`[BackgroundServices] Gatekeeper cycle error: ${err.message}`);
      }
    }, intervalMs);

    shutdownHandlers.push(() => {
      if (gatekeeperInterval) {
        clearInterval(gatekeeperInterval);
        gatekeeperInterval = null;
      }
    });

    log.info("[BackgroundServices] Gatekeeper Pipeline STARTED (interval: 30min)");
  } catch (error) {
    log.error(`[BackgroundServices] Failed to start Gatekeeper Pipeline: ${error}`);
  }
}

// ============================================================================
// CONTENT HEALTH SCHEDULER
// ============================================================================

let contentHealthInterval: ReturnType<typeof setInterval> | null = null;

async function startContentHealthService(config: BackgroundServicesConfig): Promise<void> {
  if (!config.enableContentHealth) {
    log.info("[BackgroundServices] Content Health Scheduler DISABLED via environment");
    return;
  }

  try {
    const { startHealthScanner, stopHealthScanner } = await import("../content-health/scheduler");

    // Start the health scanner (it has its own internal interval)
    log.info("[BackgroundServices] Content Health Scheduler starting...");
    startHealthScanner();

    // Track for status reporting
    contentHealthInterval = setInterval(
      () => {
        // Keep-alive marker - actual work done by health scanner
      },
      config.contentHealthConfig.intervalMinutes * 60 * 1000
    );

    shutdownHandlers.push(() => {
      if (contentHealthInterval) {
        clearInterval(contentHealthInterval);
        contentHealthInterval = null;
      }
      stopHealthScanner();
    });

    log.info(`[BackgroundServices] Content Health Scheduler STARTED`);
  } catch (error) {
    log.error(`[BackgroundServices] Failed to start Content Health Scheduler: ${error}`);
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
    log.info("[BackgroundServices] Services already started, skipping");
    return;
  }

  const config = getConfig();
  log.info("[BackgroundServices] Starting background services...");

  // Start critical services immediately
  await startTranslationServices(config);

  servicesStarted = true;
  log.info("[BackgroundServices] Critical services initialized");

  // Delay non-critical services by 30 seconds to reduce startup load
  const NON_CRITICAL_DELAY = 30000;
  setTimeout(async () => {
    log.info("[BackgroundServices] Starting non-critical services (30s delay)...");
    await Promise.all([
      startRSSSchedulerService(config),
      startGatekeeperService(config),
      startLocalizationGovernance(config),
      startSEOAutopilotService(config),
      startDataDecisionsService(config),
      startContentHealthService(config),
    ]);
    log.info("[BackgroundServices] All non-critical services initialized");
  }, NON_CRITICAL_DELAY);
}

/**
 * Stop all background services
 * Call this during graceful shutdown
 */
export async function stopBackgroundServices(): Promise<void> {
  if (!servicesStarted) {
    return;
  }

  log.info("[BackgroundServices] Stopping background services...");

  for (const handler of shutdownHandlers) {
    try {
      await handler();
    } catch (error) {
      log.error(`[BackgroundServices] Shutdown handler error: ${error}`);
    }
  }

  shutdownHandlers = [];
  servicesStarted = false;
  log.info("[BackgroundServices] All background services stopped");
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
    gatekeeperPipeline: { enabled: boolean; status: string };
    localizationGovernance: { enabled: boolean; status: string };
    seoAutopilot: { enabled: boolean; mode: string; status: string };
    dataDecisions: { enabled: boolean; mode: string; status: string };
    contentHealth: { enabled: boolean; status: string };
  };
}> {
  const config = getConfig();

  let rssSchedulerStatus: any = { running: false };
  try {
    const { getRSSSchedulerStatus } = await import("../octypo/rss-scheduler");
    rssSchedulerStatus = getRSSSchedulerStatus();
  } catch (error) {
    // Scheduler not available
    console.error(error);
  }

  let translationQueueStatus = "not_started";
  try {
    const { getQueueStatus } = await import("../localization/translation-queue");
    const qStatus = await getQueueStatus();
    if (qStatus.isRunning) translationQueueStatus = "running";
    else if (qStatus.isPaused) translationQueueStatus = "paused";
    else translationQueueStatus = "idle";
  } catch (error) {
    // Queue not available
    console.error(error);
  }

  let seoAutopilotStatus = "stopped";
  try {
    if (config.enableSEOAutopilot && seoAutopilotInterval) {
      const { getAutopilot } = await import("../seo-engine/autopilot");
      const autopilot = getAutopilot();
      const status = autopilot.getStatus();
      seoAutopilotStatus = status.mode !== "off" ? "running" : "paused";
    }
  } catch (error) {
    // Autopilot not available
    console.error(error);
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
        status: config.enableTranslationWorker && servicesStarted ? "running" : "stopped",
      },
      rssScheduler: {
        enabled: config.enableRSSScheduler,
        status: rssSchedulerStatus,
      },
      gatekeeperPipeline: {
        enabled: config.enableGatekeeperPipeline,
        status: config.enableGatekeeperPipeline && gatekeeperInterval ? "running" : "stopped",
      },
      localizationGovernance: {
        enabled: config.enableLocalizationGovernance,
        status: config.enableLocalizationGovernance && servicesStarted ? "active" : "inactive",
      },
      seoAutopilot: {
        enabled: config.enableSEOAutopilot,
        mode: config.seoAutopilotConfig.mode,
        status: seoAutopilotStatus,
      },
      dataDecisions: {
        enabled: config.enableDataDecisions,
        mode: config.dataDecisionsConfig.mode,
        status: config.enableDataDecisions && dataDecisionsInterval ? "running" : "stopped",
      },
      contentHealth: {
        enabled: config.enableContentHealth,
        status: config.enableContentHealth && contentHealthInterval ? "running" : "stopped",
      },
    },
  };
}

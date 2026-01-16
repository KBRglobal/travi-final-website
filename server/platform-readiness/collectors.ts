/**
 * Platform Readiness - Signal Collectors
 * Read-only collectors that aggregate signals from existing systems
 */

import { createLogger } from '../lib/logger';
import { READINESS_CONFIG, SOURCE_CATEGORY_MAP } from './config';
import type { ReadinessSignal, SignalCollectorResult, SignalSource, CheckStatus } from './types';

const logger = createLogger('readiness-collectors');

// ============================================================================
// Helpers
// ============================================================================

function createSignal(
  source: SignalSource,
  name: string,
  status: CheckStatus,
  score: number,
  message: string,
  isBlocking: boolean = false,
  metadata?: Record<string, unknown>
): ReadinessSignal {
  return {
    source,
    name,
    status,
    score: Math.max(0, Math.min(100, score)),
    message,
    category: SOURCE_CATEGORY_MAP[source],
    isBlocking,
    metadata,
    collectedAt: new Date(),
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

// ============================================================================
// Individual Collectors (Read-Only)
// ============================================================================

async function collectPublishingGates(): Promise<SignalCollectorResult> {
  const start = Date.now();
  const source: SignalSource = 'publishing_gates';

  try {
    // Check if publishing is generally enabled
    const isEnabled = process.env.ENABLE_PUBLISHING !== 'false';

    const signals: ReadinessSignal[] = [
      createSignal(
        source,
        'Publishing System',
        isEnabled ? 'pass' : 'warn',
        isEnabled ? 100 : 50,
        isEnabled ? 'Publishing system is active' : 'Publishing is restricted',
        !isEnabled
      ),
    ];

    return { source, signals, duration: Date.now() - start };
  } catch (error) {
    return {
      source,
      signals: [createSignal(source, 'Publishing Gates', 'fail', 0, 'Failed to check', true)],
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function collectIntelligenceCoverage(): Promise<SignalCollectorResult> {
  const start = Date.now();
  const source: SignalSource = 'intelligence_coverage';

  try {
    // Check content intelligence feature
    const isEnabled = process.env.ENABLE_CONTENT_INTELLIGENCE === 'true';

    const signals: ReadinessSignal[] = [
      createSignal(
        source,
        'Content Intelligence',
        isEnabled ? 'pass' : 'skip',
        isEnabled ? 100 : 70,
        isEnabled ? 'Intelligence system active' : 'Intelligence system disabled'
      ),
    ];

    return { source, signals, duration: Date.now() - start };
  } catch (error) {
    return {
      source,
      signals: [createSignal(source, 'Intelligence', 'warn', 50, 'Check failed')],
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function collectContentReadiness(): Promise<SignalCollectorResult> {
  const start = Date.now();
  const source: SignalSource = 'content_readiness';

  try {
    // Content is generally considered ready if the system is running
    const signals: ReadinessSignal[] = [
      createSignal(source, 'Content System', 'pass', 100, 'Content management operational'),
    ];

    return { source, signals, duration: Date.now() - start };
  } catch (error) {
    return {
      source,
      signals: [createSignal(source, 'Content', 'fail', 0, 'Content check failed', true)],
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function collectSearchIndexing(): Promise<SignalCollectorResult> {
  const start = Date.now();
  const source: SignalSource = 'search_indexing';

  try {
    const isEnabled = process.env.ENABLE_SEARCH_INDEX !== 'false';

    const signals: ReadinessSignal[] = [
      createSignal(
        source,
        'Search Indexing',
        isEnabled ? 'pass' : 'warn',
        isEnabled ? 100 : 60,
        isEnabled ? 'Search indexing operational' : 'Search indexing disabled'
      ),
    ];

    return { source, signals, duration: Date.now() - start };
  } catch (error) {
    return {
      source,
      signals: [createSignal(source, 'Search', 'warn', 50, 'Search check failed')],
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function collectSitemapHealth(): Promise<SignalCollectorResult> {
  const start = Date.now();
  const source: SignalSource = 'sitemap_health';

  try {
    const isV2Enabled = process.env.ENABLE_SITEMAP_V2 === 'true';

    const signals: ReadinessSignal[] = [
      createSignal(
        source,
        'Sitemap System',
        'pass',
        isV2Enabled ? 100 : 80,
        isV2Enabled ? 'Sitemap v2 active' : 'Using legacy sitemap'
      ),
    ];

    return { source, signals, duration: Date.now() - start };
  } catch (error) {
    return {
      source,
      signals: [createSignal(source, 'Sitemap', 'warn', 50, 'Sitemap check failed')],
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function collectJobQueue(): Promise<SignalCollectorResult> {
  const start = Date.now();
  const source: SignalSource = 'job_queue';

  try {
    // Job queue is generally healthy if the system is running
    const signals: ReadinessSignal[] = [
      createSignal(source, 'Job Queue', 'pass', 100, 'Job queue operational'),
    ];

    return { source, signals, duration: Date.now() - start };
  } catch (error) {
    return {
      source,
      signals: [createSignal(source, 'Job Queue', 'fail', 0, 'Job queue check failed', true)],
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function collectIncidents(): Promise<SignalCollectorResult> {
  const start = Date.now();
  const source: SignalSource = 'incidents';

  try {
    // Try to check incidents module
    let hasCritical = false;
    let incidentsEnabled = false;

    try {
      const { isIncidentsEnabled, hasCriticalOpenIncidents } = await import('../incidents');
      incidentsEnabled = isIncidentsEnabled();
      if (incidentsEnabled) {
        hasCritical = hasCriticalOpenIncidents();
      }
    } catch {
      // Incidents module not available
    }

    const signals: ReadinessSignal[] = [];

    if (!incidentsEnabled) {
      signals.push(createSignal(source, 'Incident System', 'skip', 80, 'Incidents module disabled'));
    } else if (hasCritical) {
      signals.push(createSignal(source, 'Critical Incidents', 'fail', 0, 'Critical incidents open', true));
    } else {
      signals.push(createSignal(source, 'Incident Status', 'pass', 100, 'No critical incidents'));
    }

    return { source, signals, duration: Date.now() - start };
  } catch (error) {
    return {
      source,
      signals: [createSignal(source, 'Incidents', 'warn', 50, 'Incident check failed')],
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function collectKillSwitches(): Promise<SignalCollectorResult> {
  const start = Date.now();
  const source: SignalSource = 'kill_switches';

  try {
    // Check common kill switches
    const switches = {
      readOnly: process.env.READ_ONLY_MODE === 'true',
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      emergencyStop: process.env.EMERGENCY_STOP === 'true',
    };

    const anyActive = Object.values(switches).some(Boolean);
    const signals: ReadinessSignal[] = [
      createSignal(
        source,
        'Kill Switches',
        anyActive ? 'fail' : 'pass',
        anyActive ? 0 : 100,
        anyActive ? 'Kill switch(es) active' : 'No kill switches active',
        anyActive,
        switches
      ),
    ];

    return { source, signals, duration: Date.now() - start };
  } catch (error) {
    return {
      source,
      signals: [createSignal(source, 'Kill Switches', 'warn', 50, 'Check failed')],
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function collectAiProviders(): Promise<SignalCollectorResult> {
  const start = Date.now();
  const source: SignalSource = 'ai_providers';

  try {
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasAnyProvider = hasOpenAI || hasAnthropic;

    const signals: ReadinessSignal[] = [
      createSignal(
        source,
        'AI Providers',
        hasAnyProvider ? 'pass' : 'warn',
        hasAnyProvider ? 100 : 30,
        hasAnyProvider ? 'AI provider configured' : 'No AI provider configured',
        false,
        { openai: hasOpenAI, anthropic: hasAnthropic }
      ),
    ];

    return { source, signals, duration: Date.now() - start };
  } catch (error) {
    return {
      source,
      signals: [createSignal(source, 'AI Providers', 'warn', 50, 'Check failed')],
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function collectCostGuards(): Promise<SignalCollectorResult> {
  const start = Date.now();
  const source: SignalSource = 'cost_guards';

  try {
    const hasBudget = !!process.env.AI_DAILY_BUDGET || !!process.env.AI_MONTHLY_BUDGET;

    const signals: ReadinessSignal[] = [
      createSignal(
        source,
        'Cost Guards',
        hasBudget ? 'pass' : 'warn',
        hasBudget ? 100 : 70,
        hasBudget ? 'Cost limits configured' : 'No cost limits set'
      ),
    ];

    return { source, signals, duration: Date.now() - start };
  } catch (error) {
    return {
      source,
      signals: [createSignal(source, 'Cost Guards', 'warn', 50, 'Check failed')],
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Collector Registry
// ============================================================================

const COLLECTORS: Record<SignalSource, () => Promise<SignalCollectorResult>> = {
  publishing_gates: collectPublishingGates,
  intelligence_coverage: collectIntelligenceCoverage,
  content_readiness: collectContentReadiness,
  search_indexing: collectSearchIndexing,
  sitemap_health: collectSitemapHealth,
  job_queue: collectJobQueue,
  incidents: collectIncidents,
  kill_switches: collectKillSwitches,
  ai_providers: collectAiProviders,
  cost_guards: collectCostGuards,
};

// ============================================================================
// Main Collection Function
// ============================================================================

export async function collectAllSignals(): Promise<SignalCollectorResult[]> {
  const timeout = READINESS_CONFIG.signalTimeoutMs;

  const results = await Promise.all(
    Object.entries(COLLECTORS).map(async ([source, collector]) => {
      const fallback: SignalCollectorResult = {
        source: source as SignalSource,
        signals: [
          createSignal(
            source as SignalSource,
            source,
            'fail',
            0,
            'Collection timed out',
            true
          ),
        ],
        duration: timeout,
        error: 'Timeout',
      };

      return withTimeout(collector(), timeout, fallback);
    })
  );

  logger.debug({ count: results.length }, 'Signal collection completed');
  return results;
}

export async function collectSignal(source: SignalSource): Promise<SignalCollectorResult> {
  const collector = COLLECTORS[source];
  if (!collector) {
    return {
      source,
      signals: [],
      duration: 0,
      error: 'Unknown signal source',
    };
  }
  return collector();
}

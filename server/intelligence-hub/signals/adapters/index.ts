/**
 * Enterprise Intelligence Hub - Signal Adapters
 *
 * Adapters for various signal sources.
 * NO direct imports from banned modules.
 */

import { log } from '../../../lib/logger';
import { normalizeSignal } from '../normalizer';
import type {
  SignalAdapter,
  SignalSource,
  RawSignal,
  UnifiedSignal,
} from '../types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[SignalAdapter] ${msg}`, data),
};

/**
 * Base adapter with common functionality
 */
abstract class BaseAdapter implements SignalAdapter {
  abstract source: SignalSource;

  isAvailable(): boolean {
    return true;
  }

  abstract fetchSignals(since?: Date): Promise<RawSignal[]>;

  normalize(raw: RawSignal): UnifiedSignal | null {
    return normalizeSignal(raw);
  }
}

/**
 * Incident System Adapter
 * Pulls from ops/incidents (if available)
 */
export class IncidentAdapter extends BaseAdapter {
  source: SignalSource = 'incidents';

  isAvailable(): boolean {
    return process.env.ENABLE_INCIDENT_MANAGEMENT === 'true';
  }

  async fetchSignals(since?: Date): Promise<RawSignal[]> {
    try {
      const { getIncidentManager } = await import('../../../ops/incidents');
      const manager = getIncidentManager();
      const incidents = manager.listIncidents({
        since,
        limit: 100,
      });

      return incidents.map(inc => ({
        source: this.source,
        entityType: 'system' as const,
        entityId: inc.id,
        rawSeverity: inc.severity,
        rawScore: this.severityToScore(inc.severity),
        message: inc.title,
        data: {
          type: inc.type,
          status: inc.status,
          description: inc.description,
          detectedAt: inc.detectedAt,
        },
        timestamp: inc.detectedAt,
      }));
    } catch {
      return [];
    }
  }

  private severityToScore(severity: string): number {
    switch (severity) {
      case 'critical': return 100;
      case 'high': return 80;
      case 'medium': return 50;
      case 'low': return 25;
      default: return 10;
    }
  }
}

/**
 * Cost Guards Adapter
 * Pulls from ops/cost-guards
 */
export class CostGuardsAdapter extends BaseAdapter {
  source: SignalSource = 'cost-guards';

  isAvailable(): boolean {
    return process.env.ENABLE_COST_GUARDS === 'true';
  }

  async fetchSignals(_since?: Date): Promise<RawSignal[]> {
    try {
      const { getCostGuards } = await import('../../../ops/cost-guards');
      const guards = getCostGuards();
      const usage = guards.getAllUsage();
      const degraded = guards.getDegradedFeatures();

      const signals: RawSignal[] = [];

      for (const u of usage) {
        const usagePercent = Math.max(
          (u.dailyUsedUsd / u.dailyLimitUsd) * 100,
          (u.monthlyUsedUsd / u.monthlyLimitUsd) * 100
        );

        if (usagePercent >= 50) {
          signals.push({
            source: this.source,
            entityType: 'system',
            entityId: `feature:${u.feature}`,
            rawScore: usagePercent,
            rawSeverity: degraded.includes(u.feature) ? 'critical' : usagePercent >= 80 ? 'high' : 'medium',
            message: degraded.includes(u.feature)
              ? `Feature ${u.feature} is degraded due to cost limits`
              : `Feature ${u.feature} at ${Math.round(usagePercent)}% of budget`,
            data: { ...u, isDegraded: degraded.includes(u.feature) },
            timestamp: new Date(),
          });
        }
      }

      return signals;
    } catch {
      return [];
    }
  }
}

/**
 * Backpressure Adapter
 */
export class BackpressureAdapter extends BaseAdapter {
  source: SignalSource = 'backpressure';

  isAvailable(): boolean {
    return process.env.ENABLE_BACKPRESSURE === 'true';
  }

  async fetchSignals(_since?: Date): Promise<RawSignal[]> {
    try {
      const { getBackpressureController } = await import('../../../ops/backpressure');
      const controller = getBackpressureController();
      const state = controller.getState();

      if (!state.isActive) return [];

      return [{
        source: this.source,
        entityType: 'system',
        entityId: 'backpressure',
        rawScore: state.level === 'heavy' ? 90 : 60,
        rawSeverity: state.level === 'heavy' ? 'high' : 'medium',
        message: `System under ${state.level} backpressure: ${state.reason || 'Load management active'}`,
        data: {
          level: state.level,
          metrics: state.metrics,
          activatedAt: state.activatedAt,
        },
        timestamp: state.activatedAt || new Date(),
      }];
    } catch {
      return [];
    }
  }
}

/**
 * AI Failover Adapter
 */
export class AIFailoverAdapter extends BaseAdapter {
  source: SignalSource = 'ai-audit';

  isAvailable(): boolean {
    return process.env.ENABLE_AI_FAILOVER === 'true';
  }

  async fetchSignals(_since?: Date): Promise<RawSignal[]> {
    try {
      const { getAIFailoverController } = await import('../../../ops/ai-failover');
      const controller = getAIFailoverController();
      const statuses = controller.getProviderStatuses();

      const signals: RawSignal[] = [];

      for (const status of statuses) {
        if (status.state !== 'healthy') {
          signals.push({
            source: this.source,
            entityType: 'system',
            entityId: `ai-provider:${status.provider}`,
            rawScore: status.state === 'disabled' ? 100 : 70,
            rawSeverity: status.state === 'disabled' ? 'critical' : 'high',
            message: `AI Provider ${status.provider} is ${status.state}`,
            data: {
              provider: status.provider,
              state: status.state,
              errorRate: status.metrics.errorRate,
              latencyMs: status.metrics.latencyMs,
              disabledReason: status.disabledReason,
            },
            timestamp: status.stateChangedAt,
          });
        }
      }

      return signals;
    } catch {
      return [];
    }
  }
}

/**
 * Data Integrity Adapter
 */
export class DataIntegrityAdapter extends BaseAdapter {
  source: SignalSource = 'data-integrity';

  isAvailable(): boolean {
    return process.env.ENABLE_DATA_INTEGRITY_WATCHDOG === 'true';
  }

  async fetchSignals(_since?: Date): Promise<RawSignal[]> {
    try {
      const { getDataIntegrityWatchdog } = await import('../../../monitoring/data-integrity');
      const watchdog = getDataIntegrityWatchdog();
      const issues = watchdog.getIssues(false);

      return issues.slice(0, 50).map(issue => ({
        source: this.source,
        entityType: issue.affectedEntityType as never || 'content',
        entityId: issue.affectedEntity || issue.id,
        rawSeverity: issue.severity,
        rawScore: this.severityToScore(issue.severity),
        message: issue.title,
        data: {
          type: issue.type,
          description: issue.description,
          autoResolvable: issue.autoResolvable,
          ...issue.metadata,
        },
        timestamp: issue.detectedAt,
      }));
    } catch {
      return [];
    }
  }

  private severityToScore(severity: string): number {
    switch (severity) {
      case 'critical': return 100;
      case 'error': return 80;
      case 'warning': return 50;
      case 'info': return 20;
      default: return 30;
    }
  }
}

/**
 * Get all available adapters
 */
export function createDefaultAdapters(): SignalAdapter[] {
  return [
    new IncidentAdapter(),
    new CostGuardsAdapter(),
    new BackpressureAdapter(),
    new AIFailoverAdapter(),
    new DataIntegrityAdapter(),
  ];
}

/**
 * Register all default adapters with the registry
 */
export async function registerDefaultAdapters(): Promise<void> {
  const { getSignalRegistry } = await import('../registry');
  const registry = getSignalRegistry();
  const adapters = createDefaultAdapters();

  for (const adapter of adapters) {
    registry.registerAdapter(adapter);
  }

  logger.info('Default adapters registered', {
    count: adapters.length,
    sources: adapters.map(a => a.source),
  });
}

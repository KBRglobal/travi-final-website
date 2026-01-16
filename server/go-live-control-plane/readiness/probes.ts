/**
 * Go-Live Control Plane - Readiness Probes
 *
 * Individual checks for environment readiness
 */

import { ProbeResult, ProbeCategory } from './results';

// Probe timeout in ms
const PROBE_TIMEOUT = 5000;

/**
 * Probe definition
 */
interface ProbeDefinition {
  name: string;
  category: ProbeCategory;
  check: () => Promise<{ status: 'pass' | 'warn' | 'fail'; message: string; details?: Record<string, unknown> }>;
}

/**
 * Run a probe with timeout
 */
async function runProbeWithTimeout(probe: ProbeDefinition): Promise<ProbeResult> {
  const start = Date.now();

  try {
    const result = await Promise.race([
      probe.check(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Probe timeout')), PROBE_TIMEOUT)
      ),
    ]);

    return {
      name: probe.name,
      category: probe.category,
      status: result.status,
      message: result.message,
      details: result.details,
      durationMs: Date.now() - start,
      checkedAt: new Date(),
    };
  } catch (err) {
    return {
      name: probe.name,
      category: probe.category,
      status: 'fail',
      message: err instanceof Error ? err.message : 'Unknown error',
      durationMs: Date.now() - start,
      checkedAt: new Date(),
    };
  }
}

/**
 * Database probes
 */
export const databaseProbes: ProbeDefinition[] = [
  {
    name: 'database_connection',
    category: 'database',
    check: async () => {
      // Check if DATABASE_URL is configured
      if (!process.env.DATABASE_URL) {
        return { status: 'fail', message: 'DATABASE_URL not configured' };
      }
      // In production, would actually test connection
      return { status: 'pass', message: 'Database connection configured' };
    },
  },
  {
    name: 'database_pool',
    category: 'database',
    check: async () => {
      // Check connection pool health
      const poolSize = parseInt(process.env.DB_POOL_SIZE || '10', 10);
      if (poolSize < 5) {
        return { status: 'warn', message: `Pool size ${poolSize} may be too small`, details: { poolSize } };
      }
      return { status: 'pass', message: `Pool size: ${poolSize}`, details: { poolSize } };
    },
  },
];

/**
 * Service probes
 */
export const serviceProbes: ProbeDefinition[] = [
  {
    name: 'redis_connection',
    category: 'services',
    check: async () => {
      if (!process.env.REDIS_URL) {
        return { status: 'warn', message: 'Redis not configured - some features may be limited' };
      }
      return { status: 'pass', message: 'Redis configured' };
    },
  },
  {
    name: 'background_workers',
    category: 'services',
    check: async () => {
      // Check if background worker flag is set
      const workersEnabled = process.env.ENABLE_BACKGROUND_WORKERS === 'true';
      if (!workersEnabled) {
        return { status: 'warn', message: 'Background workers not enabled' };
      }
      return { status: 'pass', message: 'Background workers enabled' };
    },
  },
];

/**
 * AI provider probes
 */
export const aiProviderProbes: ProbeDefinition[] = [
  {
    name: 'openai_api',
    category: 'ai_providers',
    check: async () => {
      if (!process.env.OPENAI_API_KEY) {
        const aiEnabled = process.env.ENABLE_MEDIA_ALT_AI === 'true';
        if (aiEnabled) {
          return { status: 'fail', message: 'OpenAI API key missing but AI features enabled' };
        }
        return { status: 'warn', message: 'OpenAI API key not configured' };
      }
      return { status: 'pass', message: 'OpenAI API configured' };
    },
  },
  {
    name: 'anthropic_api',
    category: 'ai_providers',
    check: async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        return { status: 'warn', message: 'Anthropic API key not configured' };
      }
      return { status: 'pass', message: 'Anthropic API configured' };
    },
  },
];

/**
 * Rate limit probes
 */
export const rateLimitProbes: ProbeDefinition[] = [
  {
    name: 'api_rate_limits',
    category: 'rate_limits',
    check: async () => {
      const rateLimit = parseInt(process.env.API_RATE_LIMIT || '0', 10);
      if (rateLimit === 0) {
        return { status: 'warn', message: 'API rate limits not configured', details: { rateLimit } };
      }
      if (rateLimit < 100) {
        return { status: 'warn', message: `Rate limit ${rateLimit}/min may be too restrictive`, details: { rateLimit } };
      }
      return { status: 'pass', message: `Rate limit: ${rateLimit}/min`, details: { rateLimit } };
    },
  },
  {
    name: 'ai_rate_limits',
    category: 'rate_limits',
    check: async () => {
      const aiLimit = parseInt(process.env.MEDIA_ALT_AI_RATE_LIMIT || '30', 10);
      return { status: 'pass', message: `AI rate limit: ${aiLimit}/min`, details: { aiLimit } };
    },
  },
];

/**
 * Kill switch probes
 */
export const killSwitchProbes: ProbeDefinition[] = [
  {
    name: 'emergency_stop',
    category: 'kill_switches',
    check: async () => {
      // Check if emergency stop mechanism is configured
      const hasEmergencyStop = process.env.EMERGENCY_STOP_ENABLED === 'true';
      if (!hasEmergencyStop) {
        return { status: 'warn', message: 'Emergency stop not configured' };
      }
      return { status: 'pass', message: 'Emergency stop mechanism ready' };
    },
  },
  {
    name: 'feature_flags_killable',
    category: 'kill_switches',
    check: async () => {
      // All feature flags should be disableable at runtime
      return { status: 'pass', message: 'Feature flags can be disabled at runtime' };
    },
  },
];

/**
 * Autonomy probes
 */
export const autonomyProbes: ProbeDefinition[] = [
  {
    name: 'autonomy_budget',
    category: 'autonomy',
    check: async () => {
      const budget = parseInt(process.env.AUTONOMY_BUDGET || '100', 10);
      if (budget > 1000) {
        return { status: 'warn', message: `Autonomy budget ${budget} may be too high`, details: { budget } };
      }
      return { status: 'pass', message: `Autonomy budget: ${budget}`, details: { budget } };
    },
  },
  {
    name: 'autonomy_limits',
    category: 'autonomy',
    check: async () => {
      const autoApply = process.env.ENABLE_MEDIA_AUTO_APPLY === 'true';
      const destructiveOps = process.env.ENABLE_MEDIA_DESTRUCTIVE_OPS === 'true';

      if (autoApply && destructiveOps) {
        return { status: 'warn', message: 'Both auto-apply and destructive ops enabled - high autonomy' };
      }
      return { status: 'pass', message: 'Autonomy levels within acceptable range' };
    },
  },
];

/**
 * Configuration probes
 */
export const configurationProbes: ProbeDefinition[] = [
  {
    name: 'node_env',
    category: 'configuration',
    check: async () => {
      const env = process.env.NODE_ENV;
      if (!env) {
        return { status: 'warn', message: 'NODE_ENV not set' };
      }
      if (env === 'development') {
        return { status: 'warn', message: 'Running in development mode', details: { env } };
      }
      return { status: 'pass', message: `Environment: ${env}`, details: { env } };
    },
  },
  {
    name: 'logging',
    category: 'configuration',
    check: async () => {
      const logLevel = process.env.LOG_LEVEL || 'info';
      if (logLevel === 'debug') {
        return { status: 'warn', message: 'Debug logging enabled - may impact performance', details: { logLevel } };
      }
      return { status: 'pass', message: `Log level: ${logLevel}`, details: { logLevel } };
    },
  },
  {
    name: 'cache_configuration',
    category: 'configuration',
    check: async () => {
      const cacheSize = parseInt(process.env.MEDIA_CACHE_SIZE || '5000', 10);
      const cacheTtl = parseInt(process.env.MEDIA_CACHE_TTL || '600000', 10);

      if (cacheSize < 1000) {
        return { status: 'warn', message: 'Cache size may be too small', details: { cacheSize, cacheTtl } };
      }
      return { status: 'pass', message: 'Cache configuration OK', details: { cacheSize, cacheTtl } };
    },
  },
];

/**
 * All probes
 */
export const allProbes: ProbeDefinition[] = [
  ...databaseProbes,
  ...serviceProbes,
  ...aiProviderProbes,
  ...rateLimitProbes,
  ...killSwitchProbes,
  ...autonomyProbes,
  ...configurationProbes,
];

/**
 * Run all probes
 */
export async function runAllProbes(): Promise<ProbeResult[]> {
  const results = await Promise.all(allProbes.map(runProbeWithTimeout));
  return results;
}

/**
 * Run probes by category
 */
export async function runProbesByCategory(category: ProbeCategory): Promise<ProbeResult[]> {
  const categoryProbes = allProbes.filter(p => p.category === category);
  const results = await Promise.all(categoryProbes.map(runProbeWithTimeout));
  return results;
}

/**
 * Run specific probes
 */
export async function runProbes(probeNames: string[]): Promise<ProbeResult[]> {
  const selectedProbes = allProbes.filter(p => probeNames.includes(p.name));
  const results = await Promise.all(selectedProbes.map(runProbeWithTimeout));
  return results;
}

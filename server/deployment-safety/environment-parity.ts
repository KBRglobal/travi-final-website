/**
 * Environment Parity Validation System
 *
 * FEATURE: Detect configuration drift between environments
 * - Config comparison (dev/staging/prod)
 * - Feature flag parity
 * - Secret completeness
 * - Database schema validation
 * - Resource capacity checks
 *
 * Feature flag: ENABLE_ENVIRONMENT_PARITY=true
 */

import { randomUUID } from 'crypto';
import { log } from '../lib/logger';
import type {
  Environment,
  EnvironmentConfig,
  ParityCheck,
  ParityDifference,
  ParityReport,
} from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[EnvParity] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[EnvParity] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[EnvParity] ${msg}`, undefined, data),
};

// Environment configurations
const environmentConfigs: Map<Environment, EnvironmentConfig> = new Map();

// Parity reports storage
const MAX_REPORTS = 50;
const parityReports: Map<string, ParityReport> = new Map();

// Required feature flags for production
const PRODUCTION_REQUIRED_FLAGS = [
  'ENABLE_RELEASE_GUARDS',
  'ENABLE_KILL_SWITCHES',
  'ENABLE_COST_GUARDS',
  'ENABLE_BACKPRESSURE',
  'ENABLE_INCIDENTS',
];

// Required secrets for each environment
const REQUIRED_SECRETS: Record<Environment, string[]> = {
  development: [
    'DATABASE_URL',
    'SESSION_SECRET',
  ],
  staging: [
    'DATABASE_URL',
    'SESSION_SECRET',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
  ],
  production: [
    'DATABASE_URL',
    'SESSION_SECRET',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'DEEPL_API_KEY',
    'RESEND_API_KEY',
    'STRIPE_SECRET_KEY',
    'REPLICATE_API_TOKEN',
  ],
};

// Minimum resource requirements
const MINIMUM_RESOURCES: Record<Environment, { memoryMB: number; cpuCores: number; replicas: number }> = {
  development: { memoryMB: 512, cpuCores: 0.5, replicas: 1 },
  staging: { memoryMB: 1024, cpuCores: 1, replicas: 1 },
  production: { memoryMB: 2048, cpuCores: 2, replicas: 2 },
};

/**
 * Register environment configuration
 */
export function registerEnvironment(config: EnvironmentConfig): void {
  environmentConfigs.set(config.name, config);
  logger.info('Environment registered', {
    environment: config.name,
    baseUrl: config.baseUrl,
  });
}

/**
 * Get current environment from process.env
 */
export function getCurrentEnvironment(): Environment {
  const env = process.env.NODE_ENV;
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
}

/**
 * Build config from current environment
 */
export function buildCurrentEnvironmentConfig(): EnvironmentConfig {
  const env = getCurrentEnvironment();

  // Extract feature flags from process.env
  const featureFlags: Record<string, boolean> = {};
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('ENABLE_') || key.startsWith('DISABLE_')) {
      featureFlags[key] = process.env[key] === 'true';
    }
  }

  // Check which secrets are present (don't store values!)
  const secrets: string[] = [];
  const allSecrets = [...REQUIRED_SECRETS[env], 'STRIPE_SECRET_KEY', 'REPLICATE_API_TOKEN'];
  for (const secret of allSecrets) {
    if (process.env[secret]) {
      secrets.push(secret);
    }
  }

  return {
    name: env,
    baseUrl: process.env.BASE_URL || 'http://localhost:5000',
    databaseUrl: process.env.DATABASE_URL ? '[PRESENT]' : '[MISSING]',
    replicaCount: parseInt(process.env.REPLICA_COUNT || '1', 10),
    memoryMB: parseInt(process.env.MEMORY_MB || '512', 10),
    cpuCores: parseFloat(process.env.CPU_CORES || '0.5'),
    featureFlags,
    secrets,
    version: process.env.APP_VERSION,
    lastDeployedAt: process.env.DEPLOY_TIME ? new Date(process.env.DEPLOY_TIME) : undefined,
  };
}

/**
 * Check feature flag parity
 */
function checkFeatureFlagParity(environments: Environment[]): ParityCheck {
  const differences: ParityDifference[] = [];
  const configs = environments.map(e => environmentConfigs.get(e)).filter(Boolean) as EnvironmentConfig[];

  if (configs.length < 2) {
    return {
      id: randomUUID(),
      category: 'features',
      name: 'Feature Flag Parity',
      description: 'Compare feature flags across environments',
      environments,
      status: 'unknown',
      differences: [],
      lastChecked: new Date(),
      severity: 'info',
    };
  }

  // Collect all flags
  const allFlags = new Set<string>();
  for (const config of configs) {
    for (const flag of Object.keys(config.featureFlags)) {
      allFlags.add(flag);
    }
  }

  // Compare each flag
  for (const flag of allFlags) {
    const envValues = environments.map(env => {
      const config = environmentConfigs.get(env);
      return {
        environment: env,
        value: config?.featureFlags[flag],
        present: config?.featureFlags[flag] !== undefined,
      };
    });

    // Check if values differ
    const values = envValues.filter(e => e.present).map(e => e.value);
    const allSame = values.every(v => v === values[0]);

    if (!allSame) {
      differences.push({
        key: flag,
        category: 'feature_flag',
        environments: envValues,
        recommendation: `Consider aligning ${flag} across environments`,
      });
    }
  }

  // Check required flags for production
  const prodConfig = environmentConfigs.get('production');
  if (prodConfig) {
    for (const flag of PRODUCTION_REQUIRED_FLAGS) {
      if (!prodConfig.featureFlags[flag]) {
        differences.push({
          key: flag,
          category: 'feature_flag',
          environments: [{ environment: 'production', value: false, present: true }],
          expectedValue: true,
          recommendation: `${flag} should be enabled in production`,
        });
      }
    }
  }

  return {
    id: randomUUID(),
    category: 'features',
    name: 'Feature Flag Parity',
    description: 'Compare feature flags across environments',
    environments,
    status: differences.length === 0 ? 'in_sync' : 'drift',
    differences,
    lastChecked: new Date(),
    severity: differences.some(d => PRODUCTION_REQUIRED_FLAGS.includes(d.key)) ? 'critical' : 'warning',
  };
}

/**
 * Check secret completeness
 */
function checkSecretCompleteness(environments: Environment[]): ParityCheck {
  const differences: ParityDifference[] = [];

  for (const env of environments) {
    const config = environmentConfigs.get(env);
    if (!config) continue;

    const required = REQUIRED_SECRETS[env];
    const missing = required.filter(s => !config.secrets.includes(s));

    for (const secret of missing) {
      differences.push({
        key: secret,
        category: 'secret',
        environments: [{ environment: env, value: null, present: false }],
        expectedValue: '[PRESENT]',
        recommendation: `Add ${secret} to ${env} environment`,
      });
    }
  }

  return {
    id: randomUUID(),
    category: 'secrets',
    name: 'Secret Completeness',
    description: 'Check required secrets are present in each environment',
    environments,
    status: differences.length === 0 ? 'in_sync' : 'drift',
    differences,
    lastChecked: new Date(),
    severity: differences.length > 0 ? 'critical' : 'info',
  };
}

/**
 * Check resource capacity
 */
function checkResourceCapacity(environments: Environment[]): ParityCheck {
  const differences: ParityDifference[] = [];

  for (const env of environments) {
    const config = environmentConfigs.get(env);
    if (!config) continue;

    const minimum = MINIMUM_RESOURCES[env];

    if (config.memoryMB < minimum.memoryMB) {
      differences.push({
        key: 'memoryMB',
        category: 'resource',
        environments: [{ environment: env, value: config.memoryMB, present: true }],
        expectedValue: minimum.memoryMB,
        recommendation: `Increase memory to at least ${minimum.memoryMB}MB for ${env}`,
      });
    }

    if (config.cpuCores < minimum.cpuCores) {
      differences.push({
        key: 'cpuCores',
        category: 'resource',
        environments: [{ environment: env, value: config.cpuCores, present: true }],
        expectedValue: minimum.cpuCores,
        recommendation: `Increase CPU to at least ${minimum.cpuCores} cores for ${env}`,
      });
    }

    if (config.replicaCount < minimum.replicas) {
      differences.push({
        key: 'replicaCount',
        category: 'resource',
        environments: [{ environment: env, value: config.replicaCount, present: true }],
        expectedValue: minimum.replicas,
        recommendation: `Increase replicas to at least ${minimum.replicas} for ${env}`,
      });
    }
  }

  return {
    id: randomUUID(),
    category: 'resources',
    name: 'Resource Capacity',
    description: 'Check resource allocations meet minimum requirements',
    environments,
    status: differences.length === 0 ? 'in_sync' : 'drift',
    differences,
    lastChecked: new Date(),
    severity: differences.some(d => d.environments[0].environment === 'production') ? 'critical' : 'warning',
  };
}

/**
 * Check configuration consistency
 */
function checkConfigConsistency(environments: Environment[]): ParityCheck {
  const differences: ParityDifference[] = [];
  const configs = environments.map(e => environmentConfigs.get(e)).filter(Boolean) as EnvironmentConfig[];

  if (configs.length < 2) {
    return {
      id: randomUUID(),
      category: 'config',
      name: 'Configuration Consistency',
      description: 'Compare configurations across environments',
      environments,
      status: 'unknown',
      differences: [],
      lastChecked: new Date(),
      severity: 'info',
    };
  }

  // Check database URL presence
  const dbStatus = environments.map(env => {
    const config = environmentConfigs.get(env);
    return {
      environment: env,
      value: config?.databaseUrl === '[PRESENT]' ? 'configured' : 'missing',
      present: config?.databaseUrl === '[PRESENT]',
    };
  });

  const missingDb = dbStatus.filter(s => !s.present);
  if (missingDb.length > 0) {
    differences.push({
      key: 'DATABASE_URL',
      category: 'config',
      environments: dbStatus,
      expectedValue: 'configured',
      recommendation: 'Ensure DATABASE_URL is set in all environments',
    });
  }

  return {
    id: randomUUID(),
    category: 'config',
    name: 'Configuration Consistency',
    description: 'Compare configurations across environments',
    environments,
    status: differences.length === 0 ? 'in_sync' : 'drift',
    differences,
    lastChecked: new Date(),
    severity: differences.some(d => d.key === 'DATABASE_URL') ? 'critical' : 'warning',
  };
}

/**
 * Check schema versions (if migration system available)
 */
async function checkSchemaVersion(environments: Environment[]): Promise<ParityCheck> {
  const differences: ParityDifference[] = [];

  // This would check actual migration versions in production
  // For now, we check if migrations table exists
  const env = getCurrentEnvironment();
  const config = environmentConfigs.get(env);

  try {
    const { pool } = await import('../db');
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = '__drizzle_migrations'
      )
    `);

    const hasMigrations = result.rows[0]?.exists ?? false;

    if (!hasMigrations) {
      differences.push({
        key: 'migrations_table',
        category: 'schema',
        environments: [{ environment: env, value: 'missing', present: false }],
        expectedValue: 'present',
        recommendation: 'Run database migrations',
      });
    }
  } catch (err) {
    differences.push({
      key: 'database_connection',
      category: 'schema',
      environments: [{ environment: env, value: 'error', present: false }],
      recommendation: 'Check database connectivity',
    });
  }

  return {
    id: randomUUID(),
    category: 'schema',
    name: 'Database Schema',
    description: 'Check database schema version consistency',
    environments,
    status: differences.length === 0 ? 'in_sync' : 'drift',
    differences,
    lastChecked: new Date(),
    severity: differences.length > 0 ? 'critical' : 'info',
  };
}

/**
 * Check dependency versions
 */
function checkDependencyVersions(environments: Environment[]): ParityCheck {
  const differences: ParityDifference[] = [];

  // Check Node.js version
  const nodeVersion = process.version;
  const env = getCurrentEnvironment();

  // In production, we want Node 20.x
  if (env === 'production' && !nodeVersion.startsWith('v20')) {
    differences.push({
      key: 'node_version',
      category: 'dependency',
      environments: [{ environment: env, value: nodeVersion, present: true }],
      expectedValue: 'v20.x',
      recommendation: 'Production should use Node.js 20.x',
    });
  }

  return {
    id: randomUUID(),
    category: 'dependencies',
    name: 'Dependency Versions',
    description: 'Check runtime dependency versions',
    environments,
    status: differences.length === 0 ? 'in_sync' : 'drift',
    differences,
    lastChecked: new Date(),
    severity: differences.length > 0 ? 'warning' : 'info',
  };
}

/**
 * Run full parity check
 */
export async function runParityCheck(environments?: Environment[]): Promise<ParityReport> {
  const envs = environments || ['development', 'staging', 'production'] as Environment[];

  // Ensure current environment is registered
  const currentConfig = buildCurrentEnvironmentConfig();
  registerEnvironment(currentConfig);

  logger.info('Running environment parity check', { environments: envs });

  const checks: ParityCheck[] = [
    checkFeatureFlagParity(envs),
    checkSecretCompleteness(envs),
    checkResourceCapacity(envs),
    checkConfigConsistency(envs),
    await checkSchemaVersion(envs),
    checkDependencyVersions(envs),
  ];

  const driftCount = checks.filter(c => c.status === 'drift').length;
  const criticalDriftCount = checks.filter(c => c.status === 'drift' && c.severity === 'critical').length;

  const recommendations: string[] = [];
  for (const check of checks) {
    for (const diff of check.differences) {
      if (diff.recommendation) {
        recommendations.push(diff.recommendation);
      }
    }
  }

  let overallStatus: 'in_sync' | 'drift' | 'critical_drift' = 'in_sync';
  if (criticalDriftCount > 0) {
    overallStatus = 'critical_drift';
  } else if (driftCount > 0) {
    overallStatus = 'drift';
  }

  const report: ParityReport = {
    id: randomUUID(),
    generatedAt: new Date(),
    environments: envs,
    checks,
    overallStatus,
    driftCount,
    criticalDriftCount,
    recommendations,
  };

  // Store report
  if (parityReports.size >= MAX_REPORTS) {
    const oldest = Array.from(parityReports.entries())
      .sort((a, b) => a[1].generatedAt.getTime() - b[1].generatedAt.getTime())[0];
    if (oldest) {
      parityReports.delete(oldest[0]);
    }
  }
  parityReports.set(report.id, report);

  logger.info('Parity check completed', {
    overallStatus,
    driftCount,
    criticalDriftCount,
    checkCount: checks.length,
  });

  return report;
}

/**
 * Get parity report by ID
 */
export function getParityReport(reportId: string): ParityReport | null {
  return parityReports.get(reportId) || null;
}

/**
 * Get latest parity report
 */
export function getLatestParityReport(): ParityReport | null {
  const reports = Array.from(parityReports.values())
    .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  return reports[0] || null;
}

/**
 * List all parity reports
 */
export function listParityReports(limit?: number): ParityReport[] {
  const reports = Array.from(parityReports.values())
    .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  return limit ? reports.slice(0, limit) : reports;
}

/**
 * Check if environment is ready for deployment
 */
export async function isEnvironmentReady(environment: Environment): Promise<{
  ready: boolean;
  blockers: string[];
}> {
  const report = await runParityCheck([environment]);

  const blockers: string[] = [];

  // Check for critical issues
  for (const check of report.checks) {
    if (check.severity === 'critical' && check.status === 'drift') {
      for (const diff of check.differences) {
        blockers.push(`${check.name}: ${diff.key} - ${diff.recommendation || 'Fix required'}`);
      }
    }
  }

  return {
    ready: blockers.length === 0,
    blockers,
  };
}

/**
 * Get environment config
 */
export function getEnvironmentConfig(environment: Environment): EnvironmentConfig | null {
  return environmentConfigs.get(environment) || null;
}

/**
 * Compare two environments
 */
export async function compareEnvironments(
  env1: Environment,
  env2: Environment
): Promise<ParityReport> {
  return runParityCheck([env1, env2]);
}

/**
 * Get parity statistics
 */
export function getParityStats(): {
  totalReports: number;
  latestStatus: 'in_sync' | 'drift' | 'critical_drift' | 'unknown';
  environmentsChecked: Environment[];
  lastChecked?: Date;
} {
  const latest = getLatestParityReport();

  return {
    totalReports: parityReports.size,
    latestStatus: latest?.overallStatus || 'unknown',
    environmentsChecked: latest?.environments || [],
    lastChecked: latest?.generatedAt,
  };
}

/**
 * Clear all reports (for testing)
 */
export function clearAllReports(): void {
  parityReports.clear();
  environmentConfigs.clear();
  logger.info('All parity data cleared');
}

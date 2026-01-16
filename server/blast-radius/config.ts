/**
 * Blast Radius & Impact Simulator - Configuration
 * Feature Flag: ENABLE_BLAST_RADIUS=false
 */

export function isBlastRadiusEnabled(): boolean {
  return process.env.ENABLE_BLAST_RADIUS === 'true';
}

export const BLAST_RADIUS_CONFIG = {
  // Baseline metrics for simulation
  totalUsers: parseInt(process.env.BLAST_TOTAL_USERS || '100000', 10),
  totalContent: parseInt(process.env.BLAST_TOTAL_CONTENT || '10000', 10),
  totalRevenue: parseFloat(process.env.BLAST_TOTAL_REVENUE || '1000000'),

  // Severity thresholds (percentage)
  severityThresholds: {
    low: 5,
    medium: 15,
    high: 30,
    critical: 50,
  },

  // Cache settings
  cacheDurationMs: parseInt(process.env.BLAST_CACHE_MS || '300000', 10), // 5 minutes
  maxHistory: parseInt(process.env.BLAST_MAX_HISTORY || '100', 10),

  // Default locale distribution
  localeDistribution: {
    'en-US': 0.40,
    'en-GB': 0.15,
    'de-DE': 0.12,
    'fr-FR': 0.10,
    'es-ES': 0.08,
    'ja-JP': 0.07,
    'other': 0.08,
  },

  // Default segment distribution
  segmentDistribution: {
    'enterprise': 0.15,
    'business': 0.25,
    'pro': 0.30,
    'free': 0.30,
  },

  version: '1.0.0',
} as const;

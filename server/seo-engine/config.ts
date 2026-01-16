/**
 * SEO Engine Configuration
 *
 * Feature flags and configuration for the SEO Engine subsystems.
 * All flags default to OFF for safe deployment.
 */

import { registerFeatureContract } from '../feature-contract';

// ============================================================================
// Feature Flags
// ============================================================================

export interface SEOEngineFeatureFlags {
  // Master flag - must be ON for any SEO Engine functionality
  ENABLE_SEO_ENGINE: boolean;

  // Subsystem flags - each can be toggled independently
  ENABLE_SEO_AUTOPILOT: boolean;
  ENABLE_SEO_ACTIONS: boolean;
  ENABLE_SEO_LINK_GRAPH: boolean;
  ENABLE_SEO_PIPELINE: boolean;
  ENABLE_SEO_RISK_MONITOR: boolean;
  ENABLE_SEO_EXEC_DASHBOARD: boolean;
  ENABLE_SEO_CLASSIFICATION: boolean;
  ENABLE_SEO_AEO_VALIDATION: boolean;
}

// Default configuration - ALL OFF for safety
const defaultFlags: SEOEngineFeatureFlags = {
  ENABLE_SEO_ENGINE: false,
  ENABLE_SEO_AUTOPILOT: false,
  ENABLE_SEO_ACTIONS: false,
  ENABLE_SEO_LINK_GRAPH: false,
  ENABLE_SEO_PIPELINE: false,
  ENABLE_SEO_RISK_MONITOR: false,
  ENABLE_SEO_EXEC_DASHBOARD: false,
  ENABLE_SEO_CLASSIFICATION: false,
  ENABLE_SEO_AEO_VALIDATION: false,
};

// Runtime flag storage
let currentFlags: SEOEngineFeatureFlags = { ...defaultFlags };

/**
 * Get current feature flags
 */
export function getSEOEngineFlags(): SEOEngineFeatureFlags {
  // Merge environment variables with defaults
  return {
    ENABLE_SEO_ENGINE: process.env.ENABLE_SEO_ENGINE === 'true' || currentFlags.ENABLE_SEO_ENGINE,
    ENABLE_SEO_AUTOPILOT: process.env.ENABLE_SEO_AUTOPILOT === 'true' || currentFlags.ENABLE_SEO_AUTOPILOT,
    ENABLE_SEO_ACTIONS: process.env.ENABLE_SEO_ACTIONS === 'true' || currentFlags.ENABLE_SEO_ACTIONS,
    ENABLE_SEO_LINK_GRAPH: process.env.ENABLE_SEO_LINK_GRAPH === 'true' || currentFlags.ENABLE_SEO_LINK_GRAPH,
    ENABLE_SEO_PIPELINE: process.env.ENABLE_SEO_PIPELINE === 'true' || currentFlags.ENABLE_SEO_PIPELINE,
    ENABLE_SEO_RISK_MONITOR: process.env.ENABLE_SEO_RISK_MONITOR === 'true' || currentFlags.ENABLE_SEO_RISK_MONITOR,
    ENABLE_SEO_EXEC_DASHBOARD: process.env.ENABLE_SEO_EXEC_DASHBOARD === 'true' || currentFlags.ENABLE_SEO_EXEC_DASHBOARD,
    ENABLE_SEO_CLASSIFICATION: process.env.ENABLE_SEO_CLASSIFICATION === 'true' || currentFlags.ENABLE_SEO_CLASSIFICATION,
    ENABLE_SEO_AEO_VALIDATION: process.env.ENABLE_SEO_AEO_VALIDATION === 'true' || currentFlags.ENABLE_SEO_AEO_VALIDATION,
  };
}

/**
 * Update feature flags at runtime (requires admin)
 */
export function updateSEOEngineFlags(updates: Partial<SEOEngineFeatureFlags>): void {
  currentFlags = { ...currentFlags, ...updates };
  console.log('[SEO Engine] Feature flags updated:', currentFlags);
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof SEOEngineFeatureFlags): boolean {
  const flags = getSEOEngineFlags();

  // Master flag must be on for any subsystem
  if (feature !== 'ENABLE_SEO_ENGINE' && !flags.ENABLE_SEO_ENGINE) {
    return false;
  }

  return flags[feature];
}

/**
 * Reset flags to defaults (for testing)
 */
export function resetSEOEngineFlags(): void {
  currentFlags = { ...defaultFlags };
}

// ============================================================================
// Autopilot Configuration
// ============================================================================

export type AutopilotMode = 'off' | 'supervised' | 'full';

export interface AutopilotConfig {
  mode: AutopilotMode;
  lastModeChange: Date | null;
  changedBy: string | null;

  // Which actions can execute without approval
  autoExecuteActions: string[];

  // Which actions always require approval
  requireApprovalActions: string[];
}

const defaultAutopilotConfig: AutopilotConfig = {
  mode: 'off', // SAFE DEFAULT
  lastModeChange: null,
  changedBy: null,
  autoExecuteActions: [
    'GENERATE_SCHEMA',
    'SET_CANONICAL',
    'QUEUE_REINDEX',
    'FLAG_FOR_REVIEW',
  ],
  requireApprovalActions: [
    'SET_NOINDEX',
    'BLOCK_PUBLISH',
    'MOVE_TO_DRAFT',
    'QUEUE_MERGE',
    'QUEUE_DELETE',
    'INJECT_LINKS',
  ],
};

let autopilotConfig: AutopilotConfig = { ...defaultAutopilotConfig };

/**
 * Get current autopilot configuration
 */
export function getAutopilotConfig(): AutopilotConfig {
  return { ...autopilotConfig };
}

/**
 * Set autopilot mode with audit trail
 */
export function setAutopilotMode(mode: AutopilotMode, changedBy: string): void {
  autopilotConfig = {
    ...autopilotConfig,
    mode,
    lastModeChange: new Date(),
    changedBy,
  };
  console.log(`[SEO Engine] Autopilot mode changed to '${mode}' by ${changedBy}`);
}

/**
 * Check if an action requires approval based on current config
 */
export function actionRequiresApproval(actionType: string): boolean {
  // In 'off' mode, nothing executes
  if (autopilotConfig.mode === 'off') {
    return true;
  }

  // In 'supervised' mode, destructive actions need approval
  if (autopilotConfig.mode === 'supervised') {
    return autopilotConfig.requireApprovalActions.includes(actionType);
  }

  // In 'full' mode, only explicitly required actions need approval
  // But we still require approval for delete operations
  if (actionType === 'QUEUE_DELETE') {
    return true;
  }

  return false;
}

// ============================================================================
// Feature Contracts Registration
// ============================================================================

// Register SEO Engine master contract
registerFeatureContract({
  name: 'seo_engine',
  displayName: 'SEO Engine v2',
  description: 'Autonomous SEO Growth Operating System with classification, actions, and autopilot',
  dependencies: [],
  risks: [
    {
      id: 'SEO-R001',
      severity: 'high',
      description: 'Autopilot may make unwanted changes to content indexing',
      mitigation: 'Start with autopilot OFF, enable supervised mode first',
    },
    {
      id: 'SEO-R002',
      severity: 'medium',
      description: 'Classification changes may affect sitemap priorities',
      mitigation: 'Monitor sitemap changes after enabling',
    },
  ],
  requiredReadinessLevel: 'STAGING',
  approvalRequirements: ['admin'],
  allowedDegradedModes: ['limited', 'read_only'],
  featureFlag: 'ENABLE_SEO_ENGINE',
  version: '2.0.0',
});

// Register autopilot contract
registerFeatureContract({
  name: 'seo_autopilot',
  displayName: 'SEO Autopilot',
  description: 'Autonomous execution of SEO actions based on governance rules',
  dependencies: ['seo_engine'],
  risks: [
    {
      id: 'AUTO-R001',
      severity: 'critical',
      description: 'Full autopilot may make destructive changes without review',
      mitigation: 'Only enable full mode after extensive testing in supervised mode',
    },
    {
      id: 'AUTO-R002',
      severity: 'high',
      description: 'Batch operations may overwhelm the system',
      mitigation: 'Implement rate limiting and backpressure',
    },
  ],
  requiredReadinessLevel: 'GO_LIVE',
  approvalRequirements: ['admin', 'seo_lead'],
  allowedDegradedModes: ['limited'],
  featureFlag: 'ENABLE_SEO_AUTOPILOT',
  version: '1.0.0',
});

console.log('[SEO Engine] Configuration loaded - all features OFF by default');

/**
 * SEO Engine Configuration
 *
 * Feature flags and configuration for the SEO Engine subsystems.
 * All flags default to OFF for safe deployment.
 */

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
    ENABLE_SEO_ENGINE: process.env.ENABLE_SEO_ENGINE === "true" || currentFlags.ENABLE_SEO_ENGINE,
    ENABLE_SEO_AUTOPILOT:
      process.env.ENABLE_SEO_AUTOPILOT === "true" || currentFlags.ENABLE_SEO_AUTOPILOT,
    ENABLE_SEO_ACTIONS:
      process.env.ENABLE_SEO_ACTIONS === "true" || currentFlags.ENABLE_SEO_ACTIONS,
    ENABLE_SEO_LINK_GRAPH:
      process.env.ENABLE_SEO_LINK_GRAPH === "true" || currentFlags.ENABLE_SEO_LINK_GRAPH,
    ENABLE_SEO_PIPELINE:
      process.env.ENABLE_SEO_PIPELINE === "true" || currentFlags.ENABLE_SEO_PIPELINE,
    ENABLE_SEO_RISK_MONITOR:
      process.env.ENABLE_SEO_RISK_MONITOR === "true" || currentFlags.ENABLE_SEO_RISK_MONITOR,
    ENABLE_SEO_EXEC_DASHBOARD:
      process.env.ENABLE_SEO_EXEC_DASHBOARD === "true" || currentFlags.ENABLE_SEO_EXEC_DASHBOARD,
    ENABLE_SEO_CLASSIFICATION:
      process.env.ENABLE_SEO_CLASSIFICATION === "true" || currentFlags.ENABLE_SEO_CLASSIFICATION,
    ENABLE_SEO_AEO_VALIDATION:
      process.env.ENABLE_SEO_AEO_VALIDATION === "true" || currentFlags.ENABLE_SEO_AEO_VALIDATION,
  };
}

/**
 * Update feature flags at runtime (requires admin)
 */
export function updateSEOEngineFlags(updates: Partial<SEOEngineFeatureFlags>): void {
  currentFlags = { ...currentFlags, ...updates };
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof SEOEngineFeatureFlags): boolean {
  const flags = getSEOEngineFlags();

  // Master flag must be on for any subsystem
  if (feature !== "ENABLE_SEO_ENGINE" && !flags.ENABLE_SEO_ENGINE) {
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

export type AutopilotMode = "off" | "supervised" | "full";

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
  mode: "off", // SAFE DEFAULT
  lastModeChange: null,
  changedBy: null,
  autoExecuteActions: ["GENERATE_SCHEMA", "SET_CANONICAL", "QUEUE_REINDEX", "FLAG_FOR_REVIEW"],
  requireApprovalActions: [
    "SET_NOINDEX",
    "BLOCK_PUBLISH",
    "MOVE_TO_DRAFT",
    "QUEUE_MERGE",
    "QUEUE_DELETE",
    "INJECT_LINKS",
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
}

/**
 * Check if an action requires approval based on current config
 */
export function actionRequiresApproval(actionType: string): boolean {
  // In 'off' mode, nothing executes
  if (autopilotConfig.mode === "off") {
    return true;
  }

  // In 'supervised' mode, destructive actions need approval
  if (autopilotConfig.mode === "supervised") {
    return autopilotConfig.requireApprovalActions.includes(actionType);
  }

  // In 'full' mode, only explicitly required actions need approval
  // But we still require approval for delete operations
  if (actionType === "QUEUE_DELETE") {
    return true;
  }

  return false;
}


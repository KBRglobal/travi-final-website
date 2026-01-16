/**
 * Autonomy Control Plane
 * Admin interface for policy management, budgets, and overrides
 *
 * Routes mounted at: /api/admin/autonomy/control-plane/*
 */

// Admin routes
export { controlPlaneRoutes } from './admin-routes';

// Override management
export {
  createOverride,
  revokeOverride,
  getActiveOverride,
  listOverrides,
  getOverride,
  getOverrideStats,
  createOverrideSchema,
  startOverrideCleanup,
  stopOverrideCleanup,
  clearOverrideCache,
} from './overrides';

// Risk dashboard
export {
  getDashboardData,
  simulateEvaluation,
  getTrendingMetrics,
} from './risk-dashboard';

export type {
  DashboardStatus,
  DecisionSummary,
  BudgetSummary,
  TopOffender,
  ControlPlaneDashboard,
} from './risk-dashboard';

import { startOverrideCleanup, stopOverrideCleanup } from './overrides';

/**
 * Initialize control plane
 */
export function initControlPlane(): void {
  startOverrideCleanup();
  console.log('[ControlPlane] Initialized');
}

/**
 * Shutdown control plane
 */
export function shutdownControlPlane(): void {
  stopOverrideCleanup();
  console.log('[ControlPlane] Shutdown');
}

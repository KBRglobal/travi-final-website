/**
 * Health Tracker (Stub)
 */

export interface HealthTracker {
  isHealthy: () => boolean;
  getStatus: () => any;
}

export function getHealthTracker(): HealthTracker {
  return {
    isHealthy: () => true,
    getStatus: () => ({ status: 'healthy' }),
  };
}

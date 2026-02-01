/**
 * Cost Analytics (Stub)
 */

export interface CostAnalytics {
  getTotalCost: () => number;
  getCostByProvider: () => Record<string, number>;
}

export function getCostAnalytics(): CostAnalytics {
  return {
    getTotalCost: () => 0,
    getCostByProvider: () => ({}),
  };
}

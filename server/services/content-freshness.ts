// Stub - content freshness service removed
export interface DestinationFreshnessItem {
  destinationId: string;
  name: string;
  country?: string;
  isActive: boolean;
  freshnessScore: number;
  staleSeverity: "critical" | "high" | "medium" | "low" | "fresh";
  stalenessReasons: string[];
  daysSinceGeneration: number;
  seoScore?: number;
  wordCount?: number;
  lastGenerated?: Date;
  priority: number;
  isStale: boolean;
}

export interface FreshnessCheckResult {
  destinations: DestinationFreshnessItem[];
  totalDestinations: number;
  staleCount: number;
  freshCount: number;
  criticalCount: number;
  averageFreshnessScore: number;
  checkedAt: Date;
}

export interface RefreshResult {
  destinationId: string;
  name?: string;
  staleness?: number;
  previousScore?: number;
  newScore?: number;
  duration?: number;
  success: boolean;
  error?: string;
}

// Keep these for backwards compatibility
export type DestinationFreshness = DestinationFreshnessItem;
export type RunFreshnessCheckResult = { checked: number; stale: number };

export const freshnessConfig = {
  maxRefreshesPerDay: 0,
  staleThresholdDays: 30,
  autoRefreshStale: false,
  lowSeoScoreThreshold: 50,
};

export const contentFreshness = {
  async checkFreshness(): Promise<DestinationFreshnessItem[]> {
    return [];
  },
  async getStaleDestinations(): Promise<DestinationFreshnessItem[]> {
    return [];
  },
  async updateFreshnessConfig(_config: Partial<typeof freshnessConfig>): Promise<void> {},
};

export async function runFreshnessCheck(): Promise<RunFreshnessCheckResult> {
  return { checked: 0, stale: 0 };
}

export async function checkContentFreshness(): Promise<FreshnessCheckResult> {
  return {
    destinations: [],
    totalDestinations: 0,
    staleCount: 0,
    freshCount: 0,
    criticalCount: 0,
    averageFreshnessScore: 100,
    checkedAt: new Date(),
  };
}

export async function refreshStaleContent(_destinationId?: string): Promise<RefreshResult> {
  return { destinationId: "", success: false, error: "Service disabled" };
}

export async function getTodayRefreshCount(): Promise<number> {
  return 0;
}

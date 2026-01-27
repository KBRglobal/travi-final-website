/**
 * Traffic Intelligence - Module Exports
 *
 * Complete traffic attribution & channel intelligence system.
 *
 * Feature Flags:
 * - ENABLE_TRAFFIC_INTELLIGENCE (main feature)
 * - ENABLE_AI_VISIBILITY_TRACKING (AI visibility)
 */

// Types
export type {
  TrafficChannel,
  SearchEngine,
  AIPlatform,
  SocialPlatform,
  TrafficSource,
  TrafficAttribution,
  AIVisibilityMetrics,
  TrafficSummary,
  ContentTrafficStats,
} from "./types";

// Source Detection
export {
  detectTrafficSource,
  detectFromRequest,
  extractDetectionInput,
  isAITraffic,
  getChannelDisplayName,
  SEARCH_ENGINE_PATTERNS,
  AI_REFERRER_PATTERNS,
  AI_USER_AGENT_PATTERNS,
  SOCIAL_PATTERNS,
} from "./source-detection";

// Attribution
import { getAttributionStore as _getAttributionStore } from "./attribution";
export {
  AttributionStore,
  getAttributionStore,
  resetAttributionStore,
  trafficTrackingMiddleware,
  getTrafficSource,
  getTrackedContentId,
} from "./attribution";

// AI Visibility
export {
  AIVisibilityTracker,
  getAIVisibilityTracker,
  resetAIVisibilityTracker,
} from "./ai-visibility";

// Routes
export { createTrafficIntelRouter } from "./routes";

/**
 * Initialize traffic intelligence system
 */
export function initTrafficIntelligence(): void {
  const enabled = process.env.ENABLE_TRAFFIC_INTELLIGENCE === "true";

  if (!enabled) {
    return;
  }

  const store = (_getAttributionStore as any)();
  store.start();

  const aiEnabled = process.env.ENABLE_AI_VISIBILITY_TRACKING === "true";
  if (aiEnabled) {
  }
}

/**
 * Shutdown traffic intelligence system
 */
export function shutdownTrafficIntelligence(): void {
  const store = (_getAttributionStore as any)();
  store.stop();
}

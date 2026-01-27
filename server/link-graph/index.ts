/**
 * Link Graph Engine Module
 * Maintains a living internal link graph and optimizes it
 *
 * Enable with: ENABLE_LINK_GRAPH=true
 */

export * from "./types";
export {
  buildGraph,
  getGraph,
  getNode,
  getInboundLinks,
  getOutboundLinks,
  getOrphanNodes,
  getTopAuthorities,
  getGraphAge,
  isGraphStale,
  invalidateNode,
} from "./graph-builder";
export {
  calculatePageRank,
  calculateHITS,
  calculateCentralityScores,
  updateAuthorityScores,
  getGraphMetrics,
} from "./centrality";
export {
  generateSuggestionsForContent,
  getSuggestions,
  getAllPendingSuggestions,
  acceptSuggestion,
  rejectSuggestion,
  clearSuggestions,
  findLinkOpportunities,
} from "./suggestions";
export {
  initializeLinkGraph,
  rebuildGraph,
  shutdownLinkGraph,
  exportGraphData,
  getOrphanReport,
  getContentLinkStats,
  getLinkGraphStatus,
  onContentChanged,
  forceRefreshContent,
} from "./persistence";

import { initializeLinkGraph, shutdownLinkGraph } from "./persistence";

/**
 * Initialize link graph module
 */
export function initLinkGraph(): void {
  const enabled = process.env.ENABLE_LINK_GRAPH === "true";

  if (enabled) {
    initializeLinkGraph();
  }
}

/**
 * Shutdown link graph module
 */
export function shutdownLinkGraphModule(): void {
  shutdownLinkGraph();
}

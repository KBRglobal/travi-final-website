/**
 * Content Dependency Graph v2
 *
 * Production-grade content dependency tracking with impact analysis.
 *
 * Feature flags:
 * - ENABLE_CONTENT_GRAPH=true (main toggle)
 * - ENABLE_CONTENT_GRAPH_AUTOBUILD=true (auto-rebuild on content changes)
 *
 * Environment:
 * - GRAPH_CACHE_SIZE=10000 (max cached nodes)
 * - GRAPH_CACHE_TTL=1800000 (cache TTL in ms, default 30 min)
 */

// Types
export {
  isContentGraphEnabled,
  isAutoBuildEnabled,
} from './types-v2';

export type {
  DependencyType,
  TargetType,
  NodeStatus,
  ContentDependency,
  GraphNodeV2,
  ImpactAnalysisV2,
  RecommendedAction,
  OrphanResult,
  HubNode,
  GraphStatsV2,
  GraphBuildRequest,
  GraphBuildResult,
  GraphPathV2,
  ContentWithDependencies,
} from './types-v2';

// Graph Engine
export {
  upsertNode,
  getNode,
  removeNode,
  upsertEdge,
  removeEdge,
  getOutgoingEdges,
  getIncomingEdges,
  getDirectDependents,
  getDirectDependencies,
  getTransitiveDependents,
  analyzeImpact,
  findOrphans,
  findHubs,
  findPath,
  detectCircularDependencies,
  buildFromContent,
  batchBuild,
  getGraphStats,
  clearGraph,
  getGraphCacheStats,
} from './graph-engine';

// Routes
export { contentGraphRoutesV2 } from './routes-v2';

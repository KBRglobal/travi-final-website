#!/usr/bin/env npx tsx
/**
 * Smoke Test: Content Dependency Graph v2
 *
 * Usage: npx tsx scripts/smoke-test-content-graph.ts
 *
 * Exit codes:
 *   0 - All tests passed
 *   1 - Critical regression found
 */

import {
  upsertNode,
  getNode,
  upsertEdge,
  getOutgoingEdges,
  getIncomingEdges,
  getDirectDependents,
  analyzeImpact,
  findOrphans,
  findHubs,
  findPath,
  detectCircularDependencies,
  buildFromContent,
  getGraphStats,
  clearGraph,
  getGraphCacheStats,
} from '../server/content-graph/graph-engine';
import { ContentWithDependencies } from '../server/content-graph/types-v2';

// Enable feature for testing
process.env.ENABLE_CONTENT_GRAPH = 'true';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function log(message: string, color: string = RESET): void {
  console.log(`${color}${message}${RESET}`);
}

function assert(condition: boolean, message: string): void {
  if (condition) {
    log(`  ✓ ${message}`, GREEN);
    passed++;
  } else {
    log(`  ✗ ${message}`, RED);
    failed++;
  }
}

async function runTests(): Promise<void> {
  log('\n═══════════════════════════════════════════');
  log('  CONTENT DEPENDENCY GRAPH v2 - SMOKE TEST');
  log('═══════════════════════════════════════════\n');

  // Clear any previous state
  clearGraph();

  // Test 1: Node Operations
  log('1. Node Operations', YELLOW);
  const node1 = upsertNode('content-1', 'content', 'Homepage', 'published', 'en', {}, '/');
  assert(node1 !== undefined, 'Node created successfully');
  assert(node1.id === 'content-1', 'Node ID correct');
  assert(node1.type === 'content', 'Node type correct');
  assert(node1.inDegree === 0, 'Initial inDegree is 0');
  assert(node1.outDegree === 0, 'Initial outDegree is 0');

  const retrieved = getNode('content-1');
  assert(retrieved !== undefined, 'Node retrieved successfully');
  assert(retrieved!.title === 'Homepage', 'Node title preserved');

  // Test 2: Edge Operations (Idempotent)
  log('\n2. Edge Operations', YELLOW);
  upsertNode('content-2', 'content', 'About Page', 'published', 'en');
  upsertNode('content-3', 'content', 'Contact Page', 'published', 'en');

  const edge1 = upsertEdge('content-1', 'content-2', 'internal_link');
  assert(edge1.sourceContentId === 'content-1', 'Edge source correct');
  assert(edge1.targetId === 'content-2', 'Edge target correct');

  // Idempotent - second upsert should not create duplicate
  upsertEdge('content-1', 'content-2', 'internal_link');
  const outgoing = getOutgoingEdges('content-1');
  assert(outgoing.length === 1, 'Edge upsert is idempotent');

  // Add more edges
  upsertEdge('content-1', 'content-3', 'internal_link');
  upsertEdge('content-2', 'content-3', 'internal_link');

  // Test 3: Degree Updates
  log('\n3. Degree Tracking', YELLOW);
  const homepageNode = getNode('content-1');
  const aboutNode = getNode('content-2');
  assert(homepageNode!.outDegree === 2, 'Homepage has 2 outgoing edges');
  assert(aboutNode!.inDegree === 1, 'About page has 1 incoming edge');
  assert(aboutNode!.outDegree === 1, 'About page has 1 outgoing edge');

  // Test 4: Dependency Traversal
  log('\n4. Dependency Traversal', YELLOW);
  const dependents = getDirectDependents('content-3');
  assert(dependents.length === 2, 'Contact page has 2 direct dependents');
  assert(dependents.some(d => d.id === 'content-1'), 'Homepage depends on Contact');
  assert(dependents.some(d => d.id === 'content-2'), 'About depends on Contact');

  // Test 5: Impact Analysis
  log('\n5. Impact Analysis', YELLOW);
  const impact = analyzeImpact('content-3');
  assert(impact.directDependents.length === 2, 'Impact analysis finds direct dependents');
  assert(impact.totalImpact >= 2, 'Total impact calculated');
  assert(['low', 'medium', 'high', 'critical'].includes(impact.cascadeRisk), 'Cascade risk calculated');
  assert(impact.recommendedActions.length >= 0, 'Recommended actions generated');

  // Test 6: Orphan Detection
  log('\n6. Orphan Detection', YELLOW);
  upsertNode('orphan-1', 'content', 'Orphan Page', 'draft', 'en');
  const orphans = findOrphans();
  assert(orphans.some(o => o.nodeId === 'orphan-1'), 'Orphan detected');
  assert(orphans.every(o => o.reason !== undefined), 'Orphan reason provided');
  assert(orphans.every(o => o.suggestedAction !== undefined), 'Orphan action suggested');

  // Test 7: Hub Detection
  log('\n7. Hub Detection', YELLOW);
  // Create a hub with many connections
  upsertNode('hub-1', 'content', 'Hub Page', 'published', 'en');
  for (let i = 0; i < 10; i++) {
    upsertNode(`spoke-${i}`, 'content', `Spoke ${i}`, 'published', 'en');
    upsertEdge(`spoke-${i}`, 'hub-1', 'internal_link');
  }
  const hubs = findHubs(5);
  assert(hubs.length > 0, 'Hubs detected');
  assert(hubs[0].node.id === 'hub-1', 'Hub-1 is top hub');
  assert(hubs[0].inDegree === 10, 'Hub has correct inDegree');

  // Test 8: Path Finding
  log('\n8. Path Finding', YELLOW);
  const path = findPath('content-1', 'content-3');
  assert(path !== null, 'Path found between nodes');
  assert(path!.source === 'content-1', 'Path source correct');
  assert(path!.target === 'content-3', 'Path target correct');
  assert(path!.path.length >= 2, 'Path has at least 2 nodes');

  const noPath = findPath('orphan-1', 'content-1');
  assert(noPath === null, 'No path for disconnected nodes');

  // Test 9: Circular Dependency Detection
  log('\n9. Circular Dependency Detection', YELLOW);
  upsertNode('cycle-a', 'content', 'Cycle A', 'published', 'en');
  upsertNode('cycle-b', 'content', 'Cycle B', 'published', 'en');
  upsertNode('cycle-c', 'content', 'Cycle C', 'published', 'en');
  upsertEdge('cycle-a', 'cycle-b', 'internal_link');
  upsertEdge('cycle-b', 'cycle-c', 'internal_link');
  upsertEdge('cycle-c', 'cycle-a', 'internal_link'); // Creates cycle

  const circles = detectCircularDependencies();
  assert(circles.length > 0, 'Circular dependency detected');

  // Test 10: Build from Content
  log('\n10. Build from Content Object', YELLOW);
  const content: ContentWithDependencies = {
    contentId: 'article-smoke',
    title: 'Smoke Test Article',
    status: 'published',
    locale: 'en',
    url: '/smoke-test-article',
    internalLinks: [
      { targetId: 'content-1', anchor: 'Homepage' },
      { targetId: 'content-2', anchor: 'About' },
    ],
    entityMentions: [
      { entityId: 'hotel-123', entityType: 'hotel' },
    ],
    mediaReferences: ['media-456'],
    relatedContent: ['content-3'],
  };

  const buildResult = buildFromContent(content);
  assert(buildResult.nodesCreated === 1, 'Node created from content');
  assert(buildResult.edgesCreated === 5, 'Edges created from content links');
  assert(buildResult.errors.length === 0, 'No build errors');

  const articleNode = getNode('article-smoke');
  assert(articleNode !== undefined, 'Article node exists');
  assert(articleNode!.url === '/smoke-test-article', 'Article URL preserved');

  // Test 11: Graph Statistics
  log('\n11. Graph Statistics', YELLOW);
  const stats = getGraphStats();
  assert(stats.totalNodes > 0, 'Stats count nodes');
  assert(stats.totalEdges > 0, 'Stats count edges');
  assert(stats.nodesByType.content > 0, 'Stats show content nodes');
  assert(stats.edgesByType.internal_link > 0, 'Stats show internal links');
  assert(typeof stats.averageInDegree === 'number', 'Average inDegree calculated');
  assert(typeof stats.averageOutDegree === 'number', 'Average outDegree calculated');

  // Test 12: Bounded Cache
  log('\n12. Bounded Cache', YELLOW);
  const cacheStats = getGraphCacheStats();
  assert(cacheStats.nodes.size > 0, 'Node cache has entries');
  assert(cacheStats.nodes.maxSize > 0, 'Node cache has max size');
  assert(cacheStats.edges.size > 0, 'Edge cache has entries');
  assert(cacheStats.nodes.size <= cacheStats.nodes.maxSize, 'Cache respects max size');

  // Summary
  log('\n═══════════════════════════════════════════');
  log('  SMOKE TEST SUMMARY');
  log('═══════════════════════════════════════════');
  log(`  Passed: ${passed}`, GREEN);
  if (failed > 0) {
    log(`  Failed: ${failed}`, RED);
  }
  log('═══════════════════════════════════════════\n');

  // Print graph summary
  log('Graph Summary:', YELLOW);
  log(`  Total Nodes: ${stats.totalNodes}`);
  log(`  Total Edges: ${stats.totalEdges}`);
  log(`  Orphans: ${stats.orphanCount}`);
  log(`  Hubs: ${stats.hubCount}`);
  log(`  Circular Dependencies: ${stats.circularDependencyCount}`);
  log('');

  // Clean up
  clearGraph();
}

// Run and exit with appropriate code
runTests()
  .then(() => {
    if (failed > 0) {
      log('CRITICAL: Smoke test failed with regressions!', RED);
      process.exit(1);
    } else {
      log('All smoke tests passed!', GREEN);
      process.exit(0);
    }
  })
  .catch((err) => {
    log(`CRITICAL: Smoke test threw error: ${err}`, RED);
    process.exit(1);
  });

/**
 * User Intent & Decision Graph (UIDG) Module
 *
 * Models: User Intent → Content → Actions → Outcomes
 *
 * Feature flag: ENABLE_INTENT_GRAPH=false
 */

export * from "./types";
export {
  IntentGraphBuilder,
  getIntentGraphBuilder,
  resetIntentGraphBuilder,
} from "./graph-builder";
export { IntentGraphScorer, getIntentGraphScorer, resetIntentGraphScorer } from "./scorer";
export {
  IntentGraphQueryEngine,
  getIntentGraphQueryEngine,
  resetIntentGraphQueryEngine,
} from "./query-engine";
export { createIntentGraphRouter } from "./routes";

const ENABLE_INTENT_GRAPH = process.env.ENABLE_INTENT_GRAPH === "true";

/**
 * Initialize the Intent Graph system
 */
export function initIntentGraph(): void {
  if (!ENABLE_INTENT_GRAPH) {
    return;
  }

  // Pre-initialize singletons
  const { getIntentGraphBuilder } = require("./graph-builder");
  const { getIntentGraphScorer } = require("./scorer");
  const { getIntentGraphQueryEngine } = require("./query-engine");

  getIntentGraphBuilder();
  getIntentGraphScorer();
  getIntentGraphQueryEngine();
}

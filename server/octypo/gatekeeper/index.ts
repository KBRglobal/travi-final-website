/**
 * Gatekeeper Module
 * Intelligent autonomous content selection and approval system
 *
 * Two gates:
 * 1. Gate 1 (Pre-Writing): Evaluates RSS items, decides what's worth writing
 * 2. Gate 2 (Post-Writing): Reviews articles, approves or sends for revision
 *
 * Flow:
 * RSS → Gate1 → Writer → Gate2 → Publish → 30 languages
 *       ↓              ↓
 *      Skip         Revise/Reject
 *
 * Zero human touch. Fully autonomous.
 */

// Types
export * from "./types";

// Deduplication (LSH-based, 85% threshold)
export { DeduplicationEngine, getDeduplicationEngine } from "./deduplication";

// Gate 1: Content Selection
export { Gate1Selector, getGate1Selector } from "./gate1-selector";

// Gate 2: Article Approval
export { Gate2Approver, getGate2Approver } from "./gate2-approver";

// Orchestrator
export {
  GatekeeperOrchestrator,
  getGatekeeperOrchestrator,
  handleRevisionJob,
  handlePostWriteReview,
} from "./orchestrator";

// Job Handlers
export { registerGatekeeperJobHandlers } from "./job-handlers";

// Convenience function to run the pipeline
import { getGatekeeperOrchestrator } from "./orchestrator";

export async function runGatekeeperPipeline(maxItems: number = 10) {
  const orchestrator = getGatekeeperOrchestrator();
  return orchestrator.runPipeline(maxItems);
}

/**
 * Initialize the Gatekeeper system
 * Call this during server startup
 */
export async function initializeGatekeeper(): Promise<void> {
  const { registerGatekeeperJobHandlers } = await import("./job-handlers");
  registerGatekeeperJobHandlers();
}

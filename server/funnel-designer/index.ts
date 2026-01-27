/**
 * Autonomous Funnel Designer Module
 *
 * Auto-detect, score, and iterate funnels based on real traffic data.
 *
 * Feature flags:
 * - ENABLE_FUNNEL_DESIGNER=false
 * - ENABLE_FUNNEL_SIMULATION=false
 */

export * from "./types";
export { FunnelDetector, getFunnelDetector, resetFunnelDetector } from "./detector";
export { FunnelSimulator, getFunnelSimulator, resetFunnelSimulator } from "./simulator";
export {
  FunnelProposalEngine,
  getFunnelProposalEngine,
  resetFunnelProposalEngine,
} from "./proposal-engine";
export { createFunnelDesignerRouter } from "./routes";

const ENABLE_FUNNEL_DESIGNER = process.env.ENABLE_FUNNEL_DESIGNER === "true";

/**
 * Initialize the Funnel Designer system
 */
export function initFunnelDesigner(): void {
  if (!ENABLE_FUNNEL_DESIGNER) {
    return;
  }

  // Pre-initialize singletons
  const { getFunnelDetector } = require("./detector");
  const { getFunnelSimulator } = require("./simulator");
  const { getFunnelProposalEngine } = require("./proposal-engine");

  getFunnelDetector();
  getFunnelSimulator();
  getFunnelProposalEngine();
}

/**
 * Autonomy Learning Engine
 * Learn from past decisions and outcomes
 *
 * Feature flag: ENABLE_AUTONOMY_LEARNING=true
 */

export * from "./types";
export * from "./engine";

export function initLearningEngine(): void {
  const enabled = process.env.ENABLE_AUTONOMY_LEARNING === "true";
}

export function shutdownLearningEngine(): void {}

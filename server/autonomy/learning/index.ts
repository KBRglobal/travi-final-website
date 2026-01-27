/**
 * Autonomy Learning Engine
 * Learn from past decisions and outcomes
 *
 * Feature flag: ENABLE_AUTONOMY_LEARNING=true
 */

export * from "./types";
export * from "./engine";

import { DEFAULT_LEARNING_CONFIG } from "./types";

export function initLearningEngine(): void {
  const enabled = process.env.ENABLE_AUTONOMY_LEARNING === "true";
}

export function shutdownLearningEngine(): void {}

// Stub - Attraction Content Generator V2 disabled

import type { QualityScore } from "./content-quality-validator";

interface GenerationResult {
  content: Record<string, unknown>;
  qualityScore: QualityScore;
}

export async function generateWithRetry(
  _attraction: unknown,
  _retries?: number
): Promise<GenerationResult | null> {
  return null;
}

export function getKeyPoolSize(): number {
  return 0;
}

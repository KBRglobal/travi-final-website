// Stub - Knowledge Decay module disabled
import { Express } from "express";

export function registerKnowledgeDecayRoutes(_app: Express): void {
  // Disabled
}

export const isKnowledgeDecayEnabled = () => false;
export const DECAY_PATTERNS = {};
export const DECAY_THRESHOLDS = {};

export async function analyzeDecay() {
  return null;
}
export async function getCachedAnalysis() {
  return null;
}
export async function getDecayStats() {
  return { total: 0 };
}
export async function getContentNeedingAttention() {
  return [];
}
export async function updateIndicatorStatus() {
  return null;
}

export type DecayIndicator = { id: string };
export type DecayAnalysis = { indicators: DecayIndicator[] };
export type DecayStats = { total: number };

// Stub - Internal Competition module disabled
import { Express } from "express";

export function registerInternalCompetitionRoutes(_app: Express): void {
  // Disabled
}

export const isInternalCompetitionEnabled = () => false;
export const OVERLAP_WEIGHTS = {};
export const SEVERITY_THRESHOLDS = {};

export async function analyzeCompetition() {
  return null;
}
export async function getCachedAnalysis() {
  return null;
}
export async function getCompetitionStats() {
  return { total: 0 };
}
export async function getHighPriorityPairs() {
  return [];
}
export async function resolvePair() {
  return { success: false };
}
export async function createCluster() {
  return null;
}
export async function getClusters() {
  return [];
}

export type CompetitionPair = { id1: string; id2: string };
export type CompetitionAnalysis = { pairs: CompetitionPair[] };
export type CompetitionCluster = { id: string };
export type CompetitionStats = { total: number };
export type CompetitionType = string;
export type CompetitionSeverity = string;
export type ResolutionStrategy = string;

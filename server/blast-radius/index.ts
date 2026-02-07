// Stub - Blast Radius module disabled
import { Router } from "express";

export const isBlastRadiusEnabled = () => false;
export const BLAST_RADIUS_CONFIG = {};
export default Router();
export const blastRadiusRoutes = Router();

export async function simulateBlastRadius() {
  return null;
}
export async function simulateMultiple() {
  return [];
}
export async function compareScenarios() {
  return null;
}
export async function getSimulationHistory() {
  return [];
}
export function getStatus() {
  return { enabled: false };
}
export function clearCache() {
  /* empty */
}
export function clearHistory() {
  /* empty */
}
export function clearAll() {
  /* empty */
}

export type ImpactScope = string;
export type ImpactSeverity = string;
export type ImpactTarget = { type: string };
export type ImpactMetrics = { affected: number };
export type ImpactBreakdown = Record<string, unknown>;
export type BlastRadiusResult = { impact: ImpactMetrics };
export type DependencyNode = { id: string };
export type SimulationScenario = { id: string };
export type SimulationHistory = { scenarios: SimulationScenario[] };
export type BlastRadiusStatus = { enabled: boolean };

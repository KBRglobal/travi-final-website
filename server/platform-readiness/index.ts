// Stub - Platform Readiness disabled
import { Router } from "express";
export const platformReadinessRoutes = Router();
export default platformReadinessRoutes;
export function evaluateReadiness() {
  return { ready: true, score: 100, status: "ready", blockers: [] };
}
export function isReady() {
  return true;
}
export function getBlockers() {
  return [];
}
export function isPlatformReadinessEnabled() {
  return false;
}

// Stub - Governance disabled
import type { Express } from "express";
import { Router } from "express";
export const governanceRoutes = Router();
export function registerGovernanceRoutes(_app: Express) {
  /* empty */
}
export * from "./types";
export * from "./security-logger";

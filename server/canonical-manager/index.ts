// Stub - Canonical Manager module disabled
import { Express } from "express";

export function registerCanonicalManagerRoutes(_app: Express): void {
  // Disabled
}

// Alias for routes.ts import
export const registerCanonicalRoutes = registerCanonicalManagerRoutes;

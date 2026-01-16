/**
 * Export Center V2
 *
 * Governed data exports with:
 * - Approval workflows for sensitive/large exports
 * - Multiple format support (CSV, JSON, XLSX, XML)
 * - Rate limiting
 * - Audit trails
 * - Download expiration
 *
 * Feature flag: ENABLE_EXPORT_CENTER_V2
 */

import { Express } from "express";
import { exportCenterRoutes } from "./export-center";

export { exportCenterRoutes as exportsRoutes };
export * from "./export-center";

export function registerExportCenterRoutes(app: Express): void {
  const isEnabled = process.env.ENABLE_EXPORT_CENTER_V2 === "true";
  const isGovernanceEnabled = process.env.ENABLE_ENTERPRISE_GOVERNANCE === "true";

  if (!isEnabled && !isGovernanceEnabled) {
    console.log("[ExportCenter] Module disabled (ENABLE_EXPORT_CENTER_V2 not set)");
    return;
  }

  app.use("/api/exports", exportCenterRoutes);
  console.log("[ExportCenter] Routes registered at /api/exports");
}

console.log("[ExportCenter] Module loaded");

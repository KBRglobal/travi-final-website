// Stub - Executive Reports disabled
import { Router } from "express";
export const goLiveReportRoutes = Router();
export const executiveReportRoutes = Router();
export function generateGoLiveReport() {
  return { ready: true };
}

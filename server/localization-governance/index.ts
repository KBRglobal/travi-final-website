// Stub - Localization Governance module disabled
import { Router } from "express";

export const isLocalizationGovernanceEnabled = () => false;
export default Router();
export const localizationGovernanceRoutes = Router();

export async function initializeGovernance(): Promise<void> {
  // Disabled
}

export async function calculateTranslationStatus() {
  return null;
}
export async function calculateVersionBehind() {
  return 0;
}
export function getIssueSeverity() {
  return "low";
}
export async function analyzeContentLocalization() {
  return null;
}
export async function getContentTranslationStatus() {
  return null;
}
export async function getLocalizationSummary() {
  return { total: 0 };
}
export async function getLocalizationGovernanceStatus() {
  return { enabled: false };
}
export function clearLocalizationCache() {}

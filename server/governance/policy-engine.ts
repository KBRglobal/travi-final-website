// Stub - Policy Engine disabled
import type { PolicyRule } from "./types";

export function evaluatePolicy() {
  return { allowed: true };
}
export function validatePolicy() {
  return { valid: true, errors: [] };
}
export function simulatePolicy() {
  return { result: "allow" };
}
export function getAllPolicies(): PolicyRule[] {
  return [];
}
export function getPolicy(_id: string): PolicyRule | null {
  return null;
}

export const policyEngine = {
  evaluate: () => ({ allowed: true }),
  validate: () => ({ valid: true, errors: [] }),
  simulate: () => ({ result: "allow" }),
  getAllPolicies: (): PolicyRule[] => [],
  getPolicy: (_id: string): PolicyRule | null => null,
};

// Stub - Entity Merge module disabled
import { Express } from "express";

export function registerEntityMergeRoutes(_app: Express): void {
  // Disabled
}

export const isEntityMergeEnabled = () => false;
export const normalizeName = (name: string) => name.toLowerCase().trim();
export const calculateSimilarity = () => 0;

export async function detectDuplicates() {
  return [];
}
export async function findDuplicatesFor() {
  return [];
}
export async function getDuplicateStats() {
  return { total: 0 };
}
export async function mergeEntities() {
  return { success: false };
}
export async function undoMerge() {
  return { success: false };
}
export async function getAllRedirects() {
  return [];
}
export async function getRedirect() {
  return null;
}
export async function getMergeHistory() {
  return [];
}

export type MergeableEntityType = "attraction" | "hotel" | "restaurant";
export type MergeStrategy = "keep_primary" | "merge_all";
export type DuplicatePair = { id1: string; id2: string };
export type EntityRedirect = { from: string; to: string };
export type MergeRequest = { primary: string; secondary: string };
export type MergeResult = { success: boolean };

// Stub - Content Lifecycle module disabled
import { Express } from "express";

export function registerLifecycleRoutes(_app: Express): void {
  // Disabled
}

export const isLifecycleTimelineEnabled = () => false;

export async function recordEvent() {
  return null;
}
export async function getContentLifecycle() {
  return null;
}
export async function queryEvents() {
  return [];
}
export async function getTimelineStats() {
  return { total: 0 };
}
export async function exportAudit() {
  return null;
}
export async function getRecentEvents() {
  return [];
}
export async function compareSnapshots() {
  return null;
}
export const EventRecorders = {};

export type LifecycleEvent = { id: string };
export type ContentLifecycle = { events: LifecycleEvent[] };
export type TimelineFilter = Record<string, unknown>;
export type TimelineStats = { total: number };
export type AuditExport = { data: unknown };
export type StateSnapshot = Record<string, unknown>;

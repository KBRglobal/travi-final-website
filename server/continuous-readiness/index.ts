// Stub - Continuous Readiness module disabled
import { Router } from "express";

export const isContinuousReadinessEnabled = () => false;
export const READINESS_CONFIG = {};
export default Router();
export const readinessRoutes = Router();

export async function checkNow() {
  return null;
}
export function startMonitor() {}
export function stopMonitor() {}
export function getMonitorStatus() {
  return { running: false };
}
export function getCurrentState() {
  return { ready: false };
}
export function getLastSnapshot() {
  return null;
}
export async function getSnapshotHistory() {
  return [];
}
export async function getActiveDegradations() {
  return [];
}
export async function getAllDegradations() {
  return [];
}
export async function getMTTRStats() {
  return { avg: 0 };
}
export async function getEvents() {
  return [];
}
export function subscribe() {
  return () => {};
}
export function clearAll() {}

export type ReadinessState = { ready: boolean };
export type ReadinessCheck = { name: string };
export type ReadinessSnapshot = { state: ReadinessState };
export type DegradationEvent = { id: string };
export type MTTRStats = { avg: number };
export type ReadinessEvent = { type: string };
export type MonitorConfig = Record<string, unknown>;
export type MonitorStatus = { running: boolean };

// Stub - Change Management module disabled
import { Express } from "express";

export function registerChangeManagementRoutes(_app: Express): void {
  // Disabled
}

export const isChangeManagementEnabled = () => false;
export const isChangeApplyEnabled = () => false;
export const isChangeRollbackEnabled = () => false;
export const isDryRunEnabled = () => false;

// Plans stubs
export const createPlan = async () => null;
export const getPlan = async () => null;
export const updatePlanStatus = async () => null;
export const updateChange = async () => null;
export const listPlans = async () => [];
export const getPlanHistory = async () => [];
export const getStats = async () => ({ total: 0 });
export const deletePlan = async () => null;
export const generateChangeId = () => "";

// Diff stubs
export const generateChangeDiff = async () => null;
export const generateContentDiff = async () => null;
export const generatePlanPreview = async () => null;
export const generateHumanReadableSummary = async () => "";
export const generateUnifiedDiff = async () => "";
export const generateJsonDiff = async () => ({});

// Guards stubs
export const evaluateGuards = async () => [];
export const hasBlockingFailures = () => false;
export const canApprove = () => true;
export const canApply = () => true;
export const setGuardConfig = () => {};
export const getGuardConfig = () => ({});

// Executor stubs
export const dryRun = async () => null;
export const executePlan = async () => null;
export const isExecuting = () => false;
export const getExecutionStatus = () => null;

// Rollback stubs
export const generateRollbackPlan = async () => null;
export const canRollback = () => false;
export const rollbackPlan = async () => null;
export const rollbackChanges = async () => null;
export const previewRollback = async () => null;
export const isRollingBack = () => false;

// Types
export type ChangePlan = { id: string };
export type ChangeItem = { id: string };
export type ChangeType = string;
export type ChangeStatus = string;
export type PlanStatus = string;
export type PlanScope = string;
export type RiskLevel = string;
export type CreatedFrom = string;
export type ImpactEstimate = { affected: number };
export type DryRunResult = { success: boolean };
export type DiffBlock = { content: string };
export type ContentDiff = { blocks: DiffBlock[] };
export type ChangePreview = { diff: ContentDiff };
export type GuardType = string;
export type GuardResult = { passed: boolean };
export type GuardConfig = Record<string, unknown>;
export type ExecutionContext = { planId: string };
export type ExecutionResult = { success: boolean };
export type ChangeResult = { success: boolean };
export type ExecutionError = { message: string };
export type RollbackPlan = { id: string };
export type RollbackItem = { id: string };
export type RollbackResult = { success: boolean };
export type PlanHistoryEntry = { id: string };
export type ChangeManagementStats = { total: number };

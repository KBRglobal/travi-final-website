/**
 * Enterprise RBAC System
 *
 * Complete Role-Based Access Control with:
 * - Policy-as-Code
 * - Approval Workflows
 * - Security Event Logging
 * - Data Access Scoping
 * - GDPR Compliance Exports
 */

export * from "../types";
export * from "../security-logger";
export * from "../approval-workflow";
export * from "../policy-engine";
export * from "../data-scoping";
export * from "../compliance-export";

// Re-export commonly used functions
export {
  securityLogger,
  logAuthEvent,
  logAuthzEvent,
  logDataAccessEvent,
  logAdminEvent,
  logApprovalEvent,
} from "../security-logger";
export { approvalWorkflowService } from "../approval-workflow";
export { policyEngine } from "../policy-engine";
export { dataScopingService } from "../data-scoping";
export { complianceExportService } from "../compliance-export";

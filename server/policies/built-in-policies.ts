/**
 * Built-in Policies
 * Feature flag: ENABLE_POLICY_ENFORCEMENT
 */

import { Policy, PolicyCondition } from "./types";

export const BUILT_IN_POLICIES: Policy[] = [
  // Publish requires approval
  {
    id: "builtin-publish-approval",
    name: "Publish Requires Approval",
    description: "Content cannot be published without going through approval workflow",
    policyType: "publish_gate",
    effect: "block",
    priority: 100,
    conditions: [{ field: "contentStatus", operator: "ne", value: "approved" }],
    actions: ["publish"],
    resources: ["content"],
    roles: ["editor", "analyst", "viewer"],
    message: "Content must be approved before publishing",
    isActive: true,
  },

  // No edit after publish (except admin)
  {
    id: "builtin-no-edit-after-publish",
    name: "No Edit After Publish",
    description: "Published content cannot be edited without admin role",
    policyType: "edit_restriction",
    effect: "block",
    priority: 90,
    conditions: [{ field: "contentStatus", operator: "eq", value: "published" }],
    actions: ["edit", "update"],
    resources: ["content"],
    roles: ["editor", "analyst", "viewer"],
    message: "Cannot edit published content. Request an admin to make changes.",
    isActive: true,
  },

  // Revenue features restricted
  {
    id: "builtin-revenue-restricted",
    name: "Revenue Features Restricted",
    description: "Revenue intelligence features require admin or analyst role",
    policyType: "revenue_protection",
    effect: "block",
    priority: 100,
    conditions: [],
    actions: ["view", "edit", "configure"],
    resources: ["revenue"],
    roles: ["editor", "viewer", "ops"],
    message: "Revenue features require analyst or admin access",
    isActive: true,
  },

  // Ops features for ops/admin only
  {
    id: "builtin-ops-restricted",
    name: "Ops Features Restricted",
    description: "Operations features require ops or admin role",
    policyType: "ops_restriction",
    effect: "block",
    priority: 100,
    conditions: [],
    actions: ["ops", "configure"],
    resources: ["ops", "settings"],
    roles: ["editor", "analyst", "viewer"],
    message: "Operations features require ops or admin access",
    isActive: true,
  },

  // Delete protection for published content
  {
    id: "builtin-delete-protection",
    name: "Delete Protection",
    description: "Published content cannot be deleted without super admin",
    policyType: "delete_protection",
    effect: "block",
    priority: 100,
    conditions: [{ field: "contentStatus", operator: "eq", value: "published" }],
    actions: ["delete"],
    resources: ["content"],
    roles: ["admin", "editor", "analyst", "ops", "viewer"],
    message: "Published content can only be deleted by super admin",
    isActive: true,
  },

  // Low score publish warning
  {
    id: "builtin-low-score-warning",
    name: "Low Score Warning",
    description: "Warn when publishing content with low ICE score",
    policyType: "publish_gate",
    effect: "warn",
    priority: 50,
    conditions: [{ field: "score", operator: "lt", value: 50 }],
    actions: ["publish"],
    resources: ["content"],
    roles: [],
    message: "Content has low ICE score. Consider improvements before publishing.",
    isActive: true,
  },

  // Locale-based access (example)
  {
    id: "builtin-locale-access",
    name: "Locale Access Control",
    description: "Users can only edit content in their assigned locales",
    policyType: "locale_access",
    effect: "block",
    priority: 80,
    conditions: [{ field: "localeMatch", operator: "eq", value: false }],
    actions: ["edit", "update", "delete"],
    resources: ["content"],
    roles: ["editor"],
    message: "You do not have access to edit content in this locale",
    isActive: false, // Disabled by default
  },

  // Bulk operations require admin
  {
    id: "builtin-bulk-admin",
    name: "Bulk Operations Require Admin",
    description: "Bulk operations are restricted to admin roles",
    policyType: "access_control",
    effect: "block",
    priority: 100,
    conditions: [{ field: "isBulkOperation", operator: "eq", value: true }],
    actions: ["update", "delete", "publish"],
    resources: ["content"],
    roles: ["editor", "analyst", "ops", "viewer"],
    message: "Bulk operations require admin access",
    isActive: true,
  },
];

export function getBuiltInPolicy(id: string): Policy | undefined {
  return BUILT_IN_POLICIES.find(p => p.id === id);
}

export function getBuiltInPoliciesByType(type: Policy["policyType"]): Policy[] {
  return BUILT_IN_POLICIES.filter(p => p.policyType === type && p.isActive);
}

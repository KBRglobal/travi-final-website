/**
 * Policies Repository
 * Feature flag: ENABLE_POLICY_ENFORCEMENT
 */

import { db } from "../db";
import { governancePolicies, policyEvaluations } from "@shared/schema";
import { eq, desc, and, sql, gte, count } from "drizzle-orm";
import { Policy, PolicyCondition, PolicyEffect, PolicyType } from "./types";
import { clearPolicyCache } from "./policy-engine";

function isEnabled(): boolean {
  return process.env.ENABLE_POLICY_ENFORCEMENT === "true";
}

/**
 * Get all policies
 */
export async function getAllPolicies(): Promise<Policy[]> {
  if (!isEnabled()) return [];

  const dbPolicies = await db
    .select()
    .from(governancePolicies)
    .orderBy(desc(governancePolicies.priority));

  return dbPolicies.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || undefined,
    policyType: p.policyType as PolicyType,
    effect: p.effect as PolicyEffect,
    priority: p.priority,
    conditions: (p.conditions as unknown as PolicyCondition[]) || [],
    actions: (p.actions as string[]) || [],
    resources: (p.resources as string[]) || [],
    roles: (p.roles as string[]) || [],
    message: p.message || undefined,
    isActive: p.isActive,
  }));
}

/**
 * Get policy by ID
 */
export async function getPolicyById(id: string): Promise<Policy | null> {
  if (!isEnabled()) return null;

  const [policy] = await db
    .select()
    .from(governancePolicies)
    .where(eq(governancePolicies.id, id))
    .limit(1);

  if (!policy) return null;

  return {
    id: policy.id,
    name: policy.name,
    description: policy.description || undefined,
    policyType: policy.policyType as PolicyType,
    effect: policy.effect as PolicyEffect,
    priority: policy.priority,
    conditions: (policy.conditions as unknown as PolicyCondition[]) || [],
    actions: (policy.actions as string[]) || [],
    resources: (policy.resources as string[]) || [],
    roles: (policy.roles as string[]) || [],
    message: policy.message || undefined,
    isActive: policy.isActive,
  };
}

/**
 * Create a new policy
 */
export async function createPolicy(
  policy: Omit<Policy, "id">,
  createdBy?: string
): Promise<Policy> {
  const [created] = await db
    .insert(governancePolicies)
    .values({
      name: policy.name,
      description: policy.description,
      policyType: policy.policyType,
      effect: policy.effect,
      priority: policy.priority,
      conditions: policy.conditions as unknown as Record<string, unknown>,
      actions: policy.actions,
      resources: policy.resources,
      roles: policy.roles,
      message: policy.message,
      isActive: policy.isActive,
      createdBy,
    })
    .returning();

  clearPolicyCache();

  return {
    ...policy,
    id: created.id,
  };
}

/**
 * Update a policy
 */
export async function updatePolicy(
  id: string,
  updates: Partial<Omit<Policy, "id">>
): Promise<Policy | null> {
  const [updated] = await db
    .update(governancePolicies)
    .set({
      ...updates,
      conditions: updates.conditions as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(governancePolicies.id, id))
    .returning();

  clearPolicyCache();

  if (!updated) return null;

  return getPolicyById(id);
}

/**
 * Delete a policy
 */
export async function deletePolicy(id: string): Promise<boolean> {
  const result = await db
    .delete(governancePolicies)
    .where(eq(governancePolicies.id, id))
    .returning({ id: governancePolicies.id });

  clearPolicyCache();

  return result.length > 0;
}

/**
 * Toggle policy active status
 */
export async function togglePolicyActive(id: string): Promise<boolean> {
  const [current] = await db
    .select({ isActive: governancePolicies.isActive })
    .from(governancePolicies)
    .where(eq(governancePolicies.id, id))
    .limit(1);

  if (!current) return false;

  await db
    .update(governancePolicies)
    .set({ isActive: !current.isActive, updatedAt: new Date() })
    .where(eq(governancePolicies.id, id));

  clearPolicyCache();

  return true;
}

/**
 * Get evaluation statistics
 */
export async function getEvaluationStats(
  startDate?: Date
): Promise<{
  total: number;
  byResult: Record<string, number>;
  byPolicy: { policyName: string; count: number }[];
}> {
  if (!isEnabled()) {
    return { total: 0, byResult: {}, byPolicy: [] };
  }

  const conditions = startDate ? [gte(policyEvaluations.evaluatedAt, startDate)] : [];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [total] = await db
    .select({ count: count() })
    .from(policyEvaluations)
    .where(whereClause);

  const resultStats = await db
    .select({
      result: policyEvaluations.result,
      count: count(),
    })
    .from(policyEvaluations)
    .where(whereClause)
    .groupBy(policyEvaluations.result);

  const policyStats = await db
    .select({
      policyName: policyEvaluations.policyName,
      count: count(),
    })
    .from(policyEvaluations)
    .where(whereClause)
    .groupBy(policyEvaluations.policyName)
    .orderBy(desc(count()))
    .limit(10);

  return {
    total: total?.count || 0,
    byResult: Object.fromEntries(resultStats.map((s) => [s.result, s.count])),
    byPolicy: policyStats.map((s) => ({ policyName: s.policyName, count: s.count })),
  };
}

console.log("[Policies] Repository loaded");

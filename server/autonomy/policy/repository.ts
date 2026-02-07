/**
 * Autonomy Policy Engine - Repository
 * Persistence layer for policies and decision logs
 */

import { db } from "../../db";
import { autonomyPolicies, autonomyDecisionLogs } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  PolicyDefinition,
  PolicyTarget,
  DecisionLogEntry,
  PolicyDecision,
  PolicyReason,
  policyDefinitionSchema,
} from "./types";
import { DEFAULT_GLOBAL_POLICY, FEATURE_POLICIES, DEFAULT_AUTONOMY_CONFIG } from "./config";

const OPERATION_TIMEOUT_MS = 5000;

// In-memory policy cache
let policyCache: PolicyDefinition[] | null = null;
let policyCacheExpiry = 0;
const POLICY_CACHE_TTL_MS = 60000; // 1 minute

// Decision log buffer for batch inserts
const decisionLogBuffer: DecisionLogEntry[] = [];
const MAX_BUFFER_SIZE = 100;
const FLUSH_INTERVAL_MS = 5000;
let flushIntervalId: NodeJS.Timeout | null = null;

function isEnabled(): boolean {
  return process.env.ENABLE_AUTONOMY_POLICY === "true";
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Repository operation timeout")), ms)
    ),
  ]);
}

// Convert DB row to PolicyDefinition
function dbToPolicy(row: typeof autonomyPolicies.$inferSelect): PolicyDefinition {
  const config = row.config as Record<string, unknown>;

  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    target: {
      type: row.targetType as PolicyTarget["type"],
      feature: row.targetFeature as PolicyTarget["feature"],
      entity: row.targetEntity as PolicyTarget["entity"],
      locale: row.targetLocale || undefined,
    },
    enabled: row.enabled,
    priority: row.priority,
    allowedActions: (config.allowedActions as any) || [],
    blockedActions: (config.blockedActions as any) || [],
    budgetLimits: (config.budgetLimits as any[]) || [],
    allowedHours: config.allowedHours as any,
    approvalLevel: (config.approvalLevel as any) || "auto",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy || undefined,
  };
}

// Convert PolicyDefinition to DB row
function policyToDb(policy: PolicyDefinition): typeof autonomyPolicies.$inferInsert {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    targetType: policy.target.type,
    targetFeature: policy.target.feature,
    targetEntity: policy.target.entity,
    targetLocale: policy.target.locale,
    enabled: policy.enabled,
    priority: policy.priority,
    config: {
      allowedActions: policy.allowedActions,
      blockedActions: policy.blockedActions,
      budgetLimits: policy.budgetLimits,
      allowedHours: policy.allowedHours,
      approvalLevel: policy.approvalLevel,
    },
    createdBy: policy.createdBy,
  } as any;
}

export async function getPolicies(): Promise<PolicyDefinition[]> {
  // Return cache if valid
  if (policyCache && Date.now() < policyCacheExpiry) {
    return policyCache;
  }

  try {
    const rows = await withTimeout(
      db.select().from(autonomyPolicies).orderBy(desc(autonomyPolicies.priority)),
      OPERATION_TIMEOUT_MS
    );

    if (rows.length === 0) {
      // Return default policies if none in DB
      policyCache = [DEFAULT_GLOBAL_POLICY, ...FEATURE_POLICIES];
    } else {
      policyCache = rows.map(dbToPolicy);
    }

    policyCacheExpiry = Date.now() + POLICY_CACHE_TTL_MS;
    return policyCache;
  } catch (error) {
    // Return defaults on error
    return [DEFAULT_GLOBAL_POLICY, ...FEATURE_POLICIES];
  }
}

export async function getPolicy(id: string): Promise<PolicyDefinition | null> {
  const policies = await getPolicies();
  return policies.find(p => p.id === id) || null;
}

export async function createPolicy(policy: PolicyDefinition): Promise<PolicyDefinition> {
  // Validate with zod
  const validated = policyDefinitionSchema.parse(policy);

  const [created] = await withTimeout(
    db
      .insert(autonomyPolicies)
      .values(
        policyToDb({
          ...validated,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
      )
      .returning(),
    OPERATION_TIMEOUT_MS
  );

  // Invalidate cache
  policyCache = null;

  return dbToPolicy(created);
}

export async function updatePolicy(
  id: string,
  updates: Partial<PolicyDefinition>
): Promise<PolicyDefinition | null> {
  const existing = await getPolicy(id);
  if (!existing) return null;

  const merged: PolicyDefinition = {
    ...existing,
    ...updates,
    id, // Ensure ID doesn't change
    updatedAt: new Date(),
  };

  // Validate merged policy
  policyDefinitionSchema.parse(merged);

  const [updated] = await withTimeout(
    db
      .update(autonomyPolicies)
      .set({
        name: merged.name,
        description: merged.description,
        targetType: merged.target.type,
        targetFeature: merged.target.feature,
        targetEntity: merged.target.entity,
        targetLocale: merged.target.locale,
        enabled: merged.enabled,
        priority: merged.priority,
        config: {
          allowedActions: merged.allowedActions,
          blockedActions: merged.blockedActions,
          budgetLimits: merged.budgetLimits,
          allowedHours: merged.allowedHours,
          approvalLevel: merged.approvalLevel,
        },
        updatedAt: new Date(),
      } as any)
      .where(eq(autonomyPolicies.id, id))
      .returning(),
    OPERATION_TIMEOUT_MS
  );

  // Invalidate cache
  policyCache = null;

  return updated ? dbToPolicy(updated) : null;
}

export async function deletePolicy(id: string): Promise<boolean> {
  const result = await withTimeout(
    db.delete(autonomyPolicies).where(eq(autonomyPolicies.id, id)).returning(),
    OPERATION_TIMEOUT_MS
  );

  // Invalidate cache
  policyCache = null;

  return result.length > 0;
}

export async function seedDefaultPolicies(): Promise<number> {
  const existing = await db.select({ id: autonomyPolicies.id }).from(autonomyPolicies);

  if (existing.length > 0) {
    return 0; // Already seeded
  }

  const toSeed = [DEFAULT_GLOBAL_POLICY, ...FEATURE_POLICIES];
  let seeded = 0;

  for (const policy of toSeed) {
    try {
      await db.insert(autonomyPolicies).values(policyToDb(policy));
      seeded++;
    } catch (error) {
      /* ignored */
    }
  }

  // Invalidate cache
  policyCache = null;

  return seeded;
}

// Decision logging
export async function logDecision(
  entry: Omit<DecisionLogEntry, "id" | "timestamp">
): Promise<void> {
  if (!isEnabled()) return;

  const fullEntry: DecisionLogEntry = {
    id: `decision-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(),
    ...entry,
  };

  // Add to buffer
  decisionLogBuffer.push(fullEntry);

  // Flush if buffer is full
  if (decisionLogBuffer.length >= MAX_BUFFER_SIZE) {
    await flushDecisionLogs();
  }
}

async function flushDecisionLogs(): Promise<void> {
  if (decisionLogBuffer.length === 0) return;

  const toFlush = decisionLogBuffer.splice(0, MAX_BUFFER_SIZE);

  try {
    await db.insert(autonomyDecisionLogs).values(
      toFlush.map(entry => ({
        targetKey: entry.targetKey,
        actionType: entry.actionType,
        decision: entry.decision,
        reasons: entry.reasons,
        matchedPolicyId: entry.matchedPolicyId,
        requesterId: entry.requesterId,
        metadata: entry.metadata,
      }))
    );
  } catch (error) {
    // Don't re-add to buffer to avoid infinite growth
  }
}

export async function getRecentDecisions(
  limit = 100,
  filters?: {
    targetKey?: string;
    actionType?: string;
    decision?: PolicyDecision;
  }
): Promise<DecisionLogEntry[]> {
  // Flush pending logs first
  await flushDecisionLogs();

  let query = db.select().from(autonomyDecisionLogs);

  const conditions = [];
  if (filters?.targetKey) {
    conditions.push(eq(autonomyDecisionLogs.targetKey, filters.targetKey));
  }
  if (filters?.actionType) {
    conditions.push(eq(autonomyDecisionLogs.actionType, filters.actionType));
  }
  if (filters?.decision) {
    conditions.push(eq(autonomyDecisionLogs.decision, filters.decision));
  }

  const rows = await db
    .select()
    .from(autonomyDecisionLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(autonomyDecisionLogs.createdAt))
    .limit(Math.min(limit, 1000)); // Cap at 1000

  return rows.map(row => ({
    id: row.id,
    timestamp: row.createdAt,
    targetKey: row.targetKey,
    actionType: row.actionType as any,
    decision: row.decision as PolicyDecision,
    reasons: row.reasons as PolicyReason[],
    matchedPolicyId: row.matchedPolicyId || undefined,
    requesterId: row.requesterId || undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
  }));
}

export async function pruneOldDecisions(olderThanDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const result = await db
    .delete(autonomyDecisionLogs)
    .where(sql`${autonomyDecisionLogs.createdAt} < ${cutoff}`)
    .returning();

  return result.length;
}

// Start background flush timer
export function startDecisionLogFlusher(): void {
  if (flushIntervalId) return;

  flushIntervalId = setInterval(() => {
    flushDecisionLogs().catch(err => {});
  }, FLUSH_INTERVAL_MS);
}

export function stopDecisionLogFlusher(): void {
  if (flushIntervalId) {
    clearInterval(flushIntervalId);
    flushIntervalId = null;
  }
  // Final flush
  flushDecisionLogs().catch(() => {});
}

export function invalidatePolicyCache(): void {
  policyCache = null;
  policyCacheExpiry = 0;
}

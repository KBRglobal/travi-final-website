/**
 * Newsletter Segmentation
 * Dynamic and static segment management for targeted campaigns
 */

import { db } from "../db";
import {
  subscriberSegments,
  segmentConditions,
  newsletterSubscribers,
  type SubscriberSegment,
  type SegmentCondition,
  type InsertSubscriberSegment,
  type InsertSegmentCondition,
} from "@shared/schema";
import { eq, desc, and, or, gte, lte, like, inArray, sql } from "drizzle-orm";

// ============================================================================
// SEGMENT TYPES
// ============================================================================

export interface SegmentConditionData {
  field: string; // subscription_date, engagement, location, preferences
  operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "in" | "not_in";
  value: any;
  logicOperator: "AND" | "OR";
}

// ============================================================================
// SEGMENT CRUD
// ============================================================================

/**
 * Create a new segment
 */
export async function createSegment(
  data: InsertSubscriberSegment
): Promise<SubscriberSegment> {
  const [segment] = await db
    .insert(subscriberSegments)
    .values(data)
    .returning();
  
  return segment;
}

/**
 * Get all segments
 */
export async function getSegments(): Promise<SubscriberSegment[]> {
  return db
    .select()
    .from(subscriberSegments)
    .orderBy(desc(subscriberSegments.createdAt));
}

/**
 * Get segment by ID
 */
export async function getSegment(segmentId: string): Promise<SubscriberSegment | null> {
  const [segment] = await db
    .select()
    .from(subscriberSegments)
    .where(eq(subscriberSegments.id, segmentId))
    .limit(1);
  
  return segment || null;
}

/**
 * Get segment with conditions
 */
export async function getSegmentWithConditions(segmentId: string): Promise<(SubscriberSegment & { conditions: SegmentCondition[] }) | null> {
  const segment = await getSegment(segmentId);
  if (!segment) return null;
  
  const conditions = await db
    .select()
    .from(segmentConditions)
    .where(eq(segmentConditions.segmentId, segmentId))
    .orderBy(segmentConditions.order);
  
  return { ...segment, conditions };
}

/**
 * Update segment
 */
export async function updateSegment(
  segmentId: string,
  data: Partial<InsertSubscriberSegment>
): Promise<SubscriberSegment | null> {
  const [updated] = await db
    .update(subscriberSegments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(subscriberSegments.id, segmentId))
    .returning();
  
  return updated || null;
}

/**
 * Delete segment
 */
export async function deleteSegment(segmentId: string): Promise<boolean> {
  const result = await db
    .delete(subscriberSegments)
    .where(eq(subscriberSegments.id, segmentId));
  
  return (result.rowCount ?? 0) > 0;
}

// ============================================================================
// CONDITION MANAGEMENT
// ============================================================================

/**
 * Add condition to segment
 */
export async function addCondition(
  segmentId: string,
  data: Omit<InsertSegmentCondition, "segmentId">
): Promise<SegmentCondition> {
  const [condition] = await db
    .insert(segmentConditions)
    .values({
      segmentId,
      ...data,
    })
    .returning();
  
  return condition;
}

/**
 * Update condition
 */
export async function updateCondition(
  conditionId: string,
  data: Partial<InsertSegmentCondition>
): Promise<SegmentCondition | null> {
  const [updated] = await db
    .update(segmentConditions)
    .set(data)
    .where(eq(segmentConditions.id, conditionId))
    .returning();
  
  return updated || null;
}

/**
 * Delete condition
 */
export async function deleteCondition(conditionId: string): Promise<boolean> {
  const result = await db
    .delete(segmentConditions)
    .where(eq(segmentConditions.id, conditionId));
  
  return (result.rowCount ?? 0) > 0;
}

// ============================================================================
// SEGMENT EVALUATION
// ============================================================================

/**
 * Evaluate a subscriber against segment conditions
 */
function evaluateCondition(subscriber: any, condition: SegmentCondition): boolean {
  const field = condition.field;
  const operator = condition.operator;
  const value = condition.value;
  const subscriberValue = subscriber[field];
  
  switch (operator) {
    case "equals":
      return subscriberValue === value;
    case "not_equals":
      return subscriberValue !== value;
    case "contains":
      return String(subscriberValue).toLowerCase().includes(String(value).toLowerCase());
    case "not_contains":
      return !String(subscriberValue).toLowerCase().includes(String(value).toLowerCase());
    case "greater_than":
      return subscriberValue > value;
    case "less_than":
      return subscriberValue < value;
    case "in":
      return Array.isArray(value) && value.includes(subscriberValue);
    case "not_in":
      return Array.isArray(value) && !value.includes(subscriberValue);
    default:
      return false;
  }
}

/**
 * Get subscribers matching a segment
 */
export async function getSegmentSubscribers(segmentId: string): Promise<any[]> {
  const segmentData = await getSegmentWithConditions(segmentId);
  if (!segmentData) return [];
  
  // If no conditions, return all subscribers
  if (segmentData.conditions.length === 0) {
    return db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.status, "subscribed"));
  }
  
  // Get all subscribers
  const allSubscribers = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, "subscribed"));
  
  // Filter subscribers based on conditions
  const matchingSubscribers = allSubscribers.filter(subscriber => {
    let result = true;
    let lastLogicOperator = "AND";
    
    for (const condition of segmentData.conditions) {
      const conditionResult = evaluateCondition(subscriber, condition);
      
      if (lastLogicOperator === "AND") {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
      
      lastLogicOperator = condition.logicOperator || "AND";
    }
    
    return result;
  });
  
  return matchingSubscribers;
}

/**
 * Update segment subscriber count
 */
export async function updateSegmentCount(segmentId: string): Promise<number> {
  const subscribers = await getSegmentSubscribers(segmentId);
  const count = subscribers.length;
  
  await db
    .update(subscriberSegments)
    .set({ subscriberCount: count, updatedAt: new Date() })
    .where(eq(subscriberSegments.id, segmentId));
  
  return count;
}

/**
 * Refresh all dynamic segments
 */
export async function refreshAllDynamicSegments(): Promise<void> {
  const segments = await db
    .select()
    .from(subscriberSegments)
    .where(eq(subscriberSegments.isDynamic, true));
  
  for (const segment of segments) {
    await updateSegmentCount(segment.id);
  }
}

// ============================================================================
// PRE-DEFINED SEGMENT TEMPLATES
// ============================================================================

export const segmentTemplates = {
  engaged: {
    name: "Engaged Subscribers",
    description: "Subscribers who have opened emails in the last 30 days",
    conditions: [
      {
        field: "lastEmailAt",
        operator: "greater_than" as const,
        value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        logicOperator: "AND" as const,
      },
      {
        field: "emailsOpened",
        operator: "greater_than" as const,
        value: 0,
        logicOperator: "AND" as const,
      },
    ],
  },
  
  inactive: {
    name: "Inactive Subscribers",
    description: "Subscribers who haven't opened emails in 90+ days",
    conditions: [
      {
        field: "lastEmailAt",
        operator: "less_than" as const,
        value: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        logicOperator: "OR" as const,
      },
      {
        field: "emailsOpened",
        operator: "equals" as const,
        value: 0,
        logicOperator: "AND" as const,
      },
    ],
  },
  
  newSubscribers: {
    name: "New Subscribers",
    description: "Subscribers who joined in the last 7 days",
    conditions: [
      {
        field: "subscribedAt",
        operator: "greater_than" as const,
        value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        logicOperator: "AND" as const,
      },
    ],
  },
  
  highEngagement: {
    name: "High Engagement",
    description: "Subscribers with high open and click rates",
    conditions: [
      {
        field: "emailsOpened",
        operator: "greater_than" as const,
        value: 5,
        logicOperator: "AND" as const,
      },
      {
        field: "emailsClicked",
        operator: "greater_than" as const,
        value: 3,
        logicOperator: "AND" as const,
      },
    ],
  },
};

/**
 * Create segment from template
 */
export async function createFromTemplate(
  templateKey: keyof typeof segmentTemplates,
  userId: string
): Promise<SubscriberSegment> {
  const template = segmentTemplates[templateKey];
  
  // Create segment
  const segment = await createSegment({
    name: template.name,
    description: template.description,
    isDynamic: true,
    createdBy: userId,
  });
  
  // Add conditions
  for (let i = 0; i < template.conditions.length; i++) {
    await addCondition(segment.id, {
      ...template.conditions[i],
      order: i,
    });
  }
  
  // Update count
  await updateSegmentCount(segment.id);
  
  return segment;
}

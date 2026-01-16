/**
 * Analytics Pro - Comprehensive Analytics System
 * User Journeys, Funnels, Cohorts, and Custom Reports
 */

import { db } from "../db";
import {
  userJourneys,
  journeyTouchpoints,
  conversionFunnels,
  funnelSteps,
  funnelEvents,
  cohorts,
  customReports,
  analyticsEvents,
  type UserJourney,
  type JourneyTouchpoint,
  type ConversionFunnel,
  type FunnelStep,
  type FunnelEvent,
  type Cohort,
  type CustomReport,
  type InsertUserJourney,
  type InsertJourneyTouchpoint,
  type InsertConversionFunnel,
  type InsertFunnelStep,
  type InsertFunnelEvent,
  type InsertCohort,
  type InsertCustomReport,
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, inArray } from "drizzle-orm";

// ============================================================================
// USER JOURNEY TRACKING
// ============================================================================

/**
 * Start a new user journey
 */
export async function startJourney(data: Omit<InsertUserJourney, "touchpointCount" | "durationSeconds">): Promise<UserJourney> {
  const [journey] = await db.insert(userJourneys).values({
    ...data,
    touchpointCount: 0,
    durationSeconds: 0,
  }).returning();
  return journey;
}

/**
 * Add touchpoint to journey
 */
export async function addTouchpoint(journeyId: string, data: Omit<InsertJourneyTouchpoint, "journeyId" | "stepNumber">): Promise<JourneyTouchpoint> {
  // Get current touchpoint count
  const [journey] = await db.select().from(userJourneys).where(eq(userJourneys.id, journeyId)).limit(1);
  if (!journey) throw new Error("Journey not found");
  
  const stepNumber = (journey.touchpointCount || 0) + 1;
  
  const [touchpoint] = await db.insert(journeyTouchpoints).values({
    journeyId,
    stepNumber,
    ...data,
  }).returning();
  
  // Update journey
  await db.update(userJourneys).set({
    touchpointCount: stepNumber,
    endPage: data.pageUrl,
  }).where(eq(userJourneys.id, journeyId));
  
  return touchpoint;
}

/**
 * End user journey
 */
export async function endJourney(journeyId: string, converted: boolean = false, conversionType?: string, conversionValue?: number): Promise<void> {
  const [journey] = await db.select().from(userJourneys).where(eq(userJourneys.id, journeyId)).limit(1);
  if (!journey) return;
  
  const endedAt = new Date();
  const durationSeconds = Math.floor((endedAt.getTime() - new Date(journey.startedAt).getTime()) / 1000);
  
  await db.update(userJourneys).set({
    endedAt,
    durationSeconds,
    converted,
    conversionType,
    conversionValue,
  }).where(eq(userJourneys.id, journeyId));
}

/**
 * Get journey with touchpoints
 */
export async function getJourney(journeyId: string): Promise<(UserJourney & { touchpoints: JourneyTouchpoint[] }) | null> {
  const [journey] = await db.select().from(userJourneys).where(eq(userJourneys.id, journeyId)).limit(1);
  if (!journey) return null;
  
  const touchpoints = await db.select().from(journeyTouchpoints).where(eq(journeyTouchpoints.journeyId, journeyId)).orderBy(journeyTouchpoints.stepNumber);
  return { ...journey, touchpoints };
}

/**
 * Get journeys for visitor
 */
export async function getVisitorJourneys(visitorId: string): Promise<UserJourney[]> {
  return db.select().from(userJourneys).where(eq(userJourneys.visitorId, visitorId)).orderBy(desc(userJourneys.startedAt));
}

// ============================================================================
// CONVERSION FUNNELS
// ============================================================================

/**
 * Create funnel
 */
export async function createFunnel(data: InsertConversionFunnel): Promise<ConversionFunnel> {
  const [funnel] = await db.insert(conversionFunnels).values(data).returning();
  return funnel;
}

/**
 * Add step to funnel
 */
export async function addFunnelStep(funnelId: string, data: Omit<InsertFunnelStep, "funnelId">): Promise<FunnelStep> {
  const [step] = await db.insert(funnelSteps).values({ funnelId, ...data }).returning();
  return step;
}

/**
 * Get all funnels
 */
export async function getFunnels(): Promise<ConversionFunnel[]> {
  return db.select().from(conversionFunnels).orderBy(desc(conversionFunnels.createdAt));
}

/**
 * Get funnel with steps
 */
export async function getFunnelWithSteps(funnelId: string): Promise<(ConversionFunnel & { steps: FunnelStep[] }) | null> {
  const [funnel] = await db.select().from(conversionFunnels).where(eq(conversionFunnels.id, funnelId)).limit(1);
  if (!funnel) return null;
  
  const steps = await db.select().from(funnelSteps).where(eq(funnelSteps.funnelId, funnelId)).orderBy(funnelSteps.stepNumber);
  return { ...funnel, steps };
}

/**
 * Track funnel progress
 */
export async function trackFunnelProgress(funnelId: string, sessionId: string, visitorId: string, currentStep: number): Promise<void> {
  // Check if event already exists
  const [existing] = await db.select().from(funnelEvents).where(and(
    eq(funnelEvents.funnelId, funnelId),
    eq(funnelEvents.sessionId, sessionId)
  )).limit(1);
  
  if (existing) {
    // Update existing
    const completed = currentStep === (await getFunnelWithSteps(funnelId))?.steps.length;
    
    await db.update(funnelEvents).set({
      currentStep,
      completed,
      completedAt: completed ? new Date() : undefined,
    }).where(eq(funnelEvents.id, existing.id));
  } else {
    // Create new
    await db.insert(funnelEvents).values({
      funnelId,
      sessionId,
      visitorId,
      currentStep,
      completed: false,
    });
  }
  
  // Update step stats
  await updateFunnelStats(funnelId);
}

/**
 * Update funnel statistics
 */
async function updateFunnelStats(funnelId: string): Promise<void> {
  const events = await db.select().from(funnelEvents).where(eq(funnelEvents.funnelId, funnelId));
  
  const totalEntries = events.length;
  const totalConversions = events.filter(e => e.completed).length;
  const conversionRate = totalEntries > 0 ? Math.round((totalConversions / totalEntries) * 10000) : 0;
  
  await db.update(conversionFunnels).set({
    totalEntries,
    totalConversions,
    conversionRate,
    updatedAt: new Date(),
  }).where(eq(conversionFunnels.id, funnelId));
  
  // Update step-level stats
  const funnel = await getFunnelWithSteps(funnelId);
  if (!funnel) return;
  
  for (const step of funnel.steps) {
    const entryCount = events.filter(e => e.currentStep >= step.stepNumber).length;
    const exitCount = events.filter(e => e.droppedAtStep === step.stepNumber).length;
    const conversionCount = events.filter(e => e.currentStep > step.stepNumber || e.completed).length;
    const dropoffRate = entryCount > 0 ? Math.round((exitCount / entryCount) * 10000) : 0;
    
    await db.update(funnelSteps).set({
      entryCount,
      exitCount,
      conversionCount,
      dropoffRate,
    }).where(eq(funnelSteps.id, step.id));
  }
}

// ============================================================================
// COHORT ANALYSIS
// ============================================================================

/**
 * Create cohort
 */
export async function createCohort(data: InsertCohort): Promise<Cohort> {
  const [cohort] = await db.insert(cohorts).values(data).returning();
  return cohort;
}

/**
 * Get cohorts
 */
export async function getCohorts(): Promise<Cohort[]> {
  return db.select().from(cohorts).orderBy(desc(cohorts.createdAt));
}

/**
 * Analyze cohort retention
 */
export async function analyzeCohortRetention(cohortId: string): Promise<any> {
  const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, cohortId)).limit(1);
  if (!cohort) return null;
  
  // Get users in this cohort based on criteria
  const startDate = new Date(cohort.dateRange.start);
  const endDate = new Date(cohort.dateRange.end);
  
  // Example: Get analytics events for users in date range
  const cohortEvents = await db
    .select()
    .from(analyticsEvents)
    .where(and(
      gte(analyticsEvents.timestamp, startDate),
      lte(analyticsEvents.timestamp, endDate)
    ));
  
  // Calculate retention by week/month
  const retentionData: Record<string, number> = {};
  
  // Group by visitor and calculate return visits
  const visitorFirstSeen = new Map<string, Date>();
  const visitorLastSeen = new Map<string, Date>();
  
  for (const event of cohortEvents) {
    const visitorId = event.visitorId;
    const timestamp = new Date(event.timestamp);
    
    if (!visitorFirstSeen.has(visitorId)) {
      visitorFirstSeen.set(visitorId, timestamp);
    }
    visitorLastSeen.set(visitorId, timestamp);
  }
  
  // Calculate retention for different time periods
  const uniqueVisitors = visitorFirstSeen.size;
  
  for (const [visitorId, firstSeen] of visitorFirstSeen) {
    const lastSeen = visitorLastSeen.get(visitorId)!;
    const daysSinceFirst = Math.floor((lastSeen.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24));
    
    const week = Math.floor(daysSinceFirst / 7);
    retentionData[`week_${week}`] = (retentionData[`week_${week}`] || 0) + 1;
  }
  
  // Calculate percentages
  for (const key in retentionData) {
    retentionData[key] = Math.round((retentionData[key] / uniqueVisitors) * 100);
  }
  
  // Update cohort
  await db.update(cohorts).set({
    userCount: uniqueVisitors,
    retentionData,
    updatedAt: new Date(),
  }).where(eq(cohorts.id, cohortId));
  
  return {
    cohort,
    userCount: uniqueVisitors,
    retentionData,
  };
}

// ============================================================================
// CUSTOM REPORTS
// ============================================================================

/**
 * Create custom report
 */
export async function createCustomReport(data: InsertCustomReport): Promise<CustomReport> {
  const [report] = await db.insert(customReports).values(data).returning();
  return report;
}

/**
 * Get custom reports
 */
export async function getCustomReports(userId?: string): Promise<CustomReport[]> {
  if (userId) {
    return db.select().from(customReports).where(eq(customReports.createdBy, userId)).orderBy(desc(customReports.createdAt));
  }
  return db.select().from(customReports).where(eq(customReports.isPublic, true)).orderBy(desc(customReports.createdAt));
}

/**
 * Execute custom report
 */
export async function executeCustomReport(reportId: string): Promise<any> {
  const [report] = await db.select().from(customReports).where(eq(customReports.id, reportId)).limit(1);
  if (!report) return null;
  
  // Build query based on report configuration
  const { metrics, dimensions, filters, dateRange } = report;
  
  // Get date range
  let startDate: Date;
  let endDate: Date = new Date();
  
  switch (dateRange.type) {
    case "last_7_days":
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "last_30_days":
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "last_90_days":
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "custom":
      startDate = new Date(dateRange.start!);
      endDate = new Date(dateRange.end!);
      break;
    default:
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }
  
  // Execute query (simplified)
  const events = await db
    .select()
    .from(analyticsEvents)
    .where(and(
      gte(analyticsEvents.timestamp, startDate),
      lte(analyticsEvents.timestamp, endDate)
    ));
  
  // Aggregate data based on metrics and dimensions
  const aggregated: any = {
    totalEvents: events.length,
    uniqueVisitors: new Set(events.map(e => e.visitorId)).size,
    pageViews: events.filter(e => e.eventType === "page_view").length,
  };
  
  return {
    report,
    data: aggregated,
    period: { startDate, endDate },
  };
}

/**
 * Real-time Analytics Dashboard
 * Live visitor tracking and activity monitoring
 */

import { db } from "../../db";
import {
  realtimeSessions,
  analyticsEvents,
  type RealtimeSession,
  type InsertRealtimeSession,
} from "@shared/schema";
import { eq, desc, and, gte } from "drizzle-orm";

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Create or update realtime session
 */
export async function upsertRealtimeSession(data: Omit<InsertRealtimeSession, "id">): Promise<RealtimeSession> {
  // Check if session exists
  const [existing] = await db
    .select()
    .from(realtimeSessions)
    .where(eq(realtimeSessions.sessionId, (data as any).sessionId))
    .limit(1);
  
  if (existing) {
    // Update existing session
    const [updated] = await db
      .update(realtimeSessions)
      .set({
        currentPage: (data as any).currentPage,
        currentPageTitle: (data as any).currentPageTitle,
        lastActivityAt: new Date(),
        isActive: true,
      } as any)
      .where(eq(realtimeSessions.sessionId, (data as any).sessionId))
      .returning();
    
    return updated;
  }
  
  // Create new session
  const [session] = await db
    .insert(realtimeSessions)
    .values(data as any)
    .returning();
  
  return session;
}

/**
 * Mark session as inactive
 */
export async function deactivateSession(sessionId: string): Promise<void> {
  await db
    .update(realtimeSessions)
    .set({ isActive: false } as any)
    .where(eq(realtimeSessions.sessionId, sessionId));
}

/**
 * Get active sessions
 */
export async function getActiveSessions(): Promise<RealtimeSession[]> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  return db
    .select()
    .from(realtimeSessions)
    .where(and(
      eq(realtimeSessions.isActive, true),
      gte(realtimeSessions.lastActivityAt, fiveMinutesAgo)
    ))
    .orderBy(desc(realtimeSessions.lastActivityAt));
}

/**
 * Get active visitor count
 */
export async function getActiveVisitorCount(): Promise<number> {
  const activeSessions = await getActiveSessions();
  return activeSessions.length;
}

/**
 * Get active pages with visitor counts
 */
export async function getActivePages(): Promise<{ page: string; pageTitle: string; visitors: number }[]> {
  const activeSessions = await getActiveSessions();
  
  const pageMap = new Map<string, { page: string; pageTitle: string; count: number }>();
  
  for (const session of activeSessions) {
    if (!session.currentPage) continue;
    
    const key = session.currentPage;
    if (pageMap.has(key)) {
      pageMap.get(key)!.count++;
    } else {
      pageMap.set(key, {
        page: session.currentPage,
        pageTitle: session.currentPageTitle || "Untitled",
        count: 1,
      });
    }
  }
  
  return Array.from(pageMap.values())
    .map(item => ({ ...item, visitors: item.count }))
    .sort((a, b) => b.visitors - a.visitors);
}

/**
 * Get recent events (last 5 minutes)
 */
export async function getRecentEvents(limit: number = 50): Promise<any[]> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  return db
    .select()
    .from(analyticsEvents)
    .where(gte(analyticsEvents.timestamp, fiveMinutesAgo))
    .orderBy(desc(analyticsEvents.timestamp))
    .limit(limit);
}

/**
 * Get realtime metrics
 */
export async function getRealtimeMetrics(): Promise<{
  activeVisitors: number;
  activePages: { page: string; pageTitle: string; visitors: number }[];
  recentEvents: any[];
  topCountries: { country: string; visitors: number }[];
  topDevices: { device: string; visitors: number }[];
}> {
  const activeSessions = await getActiveSessions();
  
  // Top countries
  const countryMap = new Map<string, number>();
  for (const session of activeSessions) {
    if (!session.country) continue;
    countryMap.set(session.country, (countryMap.get(session.country) || 0) + 1);
  }
  
  const topCountries = Array.from(countryMap.entries())
    .map(([country, visitors]) => ({ country, visitors }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 10);
  
  // Top devices
  const deviceMap = new Map<string, number>();
  for (const session of activeSessions) {
    if (!session.deviceType) continue;
    deviceMap.set(session.deviceType, (deviceMap.get(session.deviceType) || 0) + 1);
  }
  
  const topDevices = Array.from(deviceMap.entries())
    .map(([device, visitors]) => ({ device, visitors }))
    .sort((a, b) => b.visitors - a.visitors);
  
  return {
    activeVisitors: activeSessions.length,
    activePages: await getActivePages(),
    recentEvents: await getRecentEvents(20),
    topCountries,
    topDevices,
  };
}

/**
 * Clean up old sessions (keep last 24 hours)
 */
export async function cleanupOldSessions(): Promise<number> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const result = await db
    .delete(realtimeSessions)
    .where(and(
      eq(realtimeSessions.isActive, false),
      gte(realtimeSessions.lastActivityAt, oneDayAgo)
    ));
  
  return result.rowCount || 0;
}

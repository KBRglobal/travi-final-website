/**
 * N+1 Query Detection Middleware
 * Tracks database queries per request and detects N+1 patterns
 */

import type { Request, Response, NextFunction } from "express";
import { createLogger } from "../lib/logger";

const queryLog = createLogger("query-analyzer");

interface QueryRecord {
  sql: string;
  normalizedSql: string;
  timestamp: number;
  duration?: number;
}

interface RequestQueryContext {
  requestId: string;
  path: string;
  method: string;
  queries: QueryRecord[];
  startTime: number;
}

// Store for tracking queries per request
const requestContexts = new Map<string, RequestQueryContext>();

// N+1 detection thresholds
const N_PLUS_ONE_THRESHOLD = 3; // Minimum similar queries to trigger warning
const SIMILAR_QUERY_WINDOW_MS = 5000; // Time window for grouping similar queries

// Global stats
let totalN1Detections = 0;
let totalQueriesTracked = 0;

/**
 * Normalize SQL query for pattern matching
 * Replaces literal values with placeholders to identify similar queries
 */
function normalizeQuery(sql: string): string {
  return sql
    // Remove extra whitespace
    .replace(/\s+/g, " ")
    .trim()
    // Replace string literals
    .replace(/'[^']*'/g, "'?'")
    // Replace numeric literals
    .replace(/\b\d+\b/g, "?")
    // Replace UUID patterns
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, "?")
    // Replace IN clause values
    .replace(/IN\s*\(\s*\?(?:\s*,\s*\?)*\s*\)/gi, "IN (?)")
    // Lowercase for consistency
    .toLowerCase();
}

/**
 * Check for N+1 patterns in a set of queries
 */
function detectN1Patterns(queries: QueryRecord[]): { pattern: string; count: number }[] {
  const patternCounts = new Map<string, number>();
  
  for (const query of queries) {
    const count = patternCounts.get(query.normalizedSql) || 0;
    patternCounts.set(query.normalizedSql, count + 1);
  }
  
  const n1Patterns: { pattern: string; count: number }[] = [];
  
  for (const [pattern, count] of patternCounts) {
    if (count >= N_PLUS_ONE_THRESHOLD) {
      n1Patterns.push({ pattern, count });
    }
  }
  
  return n1Patterns;
}

/**
 * Record a query for the current request
 */
export function recordQuery(requestId: string, sql: string, duration?: number): void {
  const context = requestContexts.get(requestId);
  if (!context) return;
  
  const record: QueryRecord = {
    sql,
    normalizedSql: normalizeQuery(sql),
    timestamp: Date.now(),
    duration,
  };
  
  context.queries.push(record);
  totalQueriesTracked++;
}

/**
 * Get or create query context for a request
 */
function getOrCreateContext(req: Request): RequestQueryContext {
  const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  if (!requestContexts.has(requestId)) {
    requestContexts.set(requestId, {
      requestId,
      path: req.path,
      method: req.method,
      queries: [],
      startTime: Date.now(),
    });
  }
  
  return requestContexts.get(requestId)!;
}

/**
 * Analyze queries and log N+1 warnings
 */
function analyzeAndCleanup(requestId: string): void {
  const context = requestContexts.get(requestId);
  if (!context) return;
  
  const n1Patterns = detectN1Patterns(context.queries);
  
  if (n1Patterns.length > 0) {
    totalN1Detections++;
    
    for (const pattern of n1Patterns) {
      queryLog.warn({
        type: "n_plus_one_detected",
        requestId: context.requestId,
        path: context.path,
        method: context.method,
        pattern: pattern.pattern,
        queryCount: pattern.count,
        totalQueries: context.queries.length,
        message: `N+1 query pattern detected: ${pattern.count} similar queries`,
      });
    }
  }
  
  // Log query summary if there were many queries
  if (context.queries.length > 10) {
    queryLog.info({
      type: "high_query_count",
      requestId: context.requestId,
      path: context.path,
      method: context.method,
      queryCount: context.queries.length,
      message: `High query count: ${context.queries.length} queries in single request`,
    });
  }
  
  // Cleanup context
  requestContexts.delete(requestId);
}

/**
 * Express middleware for query analysis
 */
export function queryAnalyzerMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip non-API routes
  if (!req.path.startsWith("/api")) {
    next();
    return;
  }
  
  const context = getOrCreateContext(req);
  
  // Attach helper to request for manual query tracking
  (req as any).recordQuery = (sql: string, duration?: number) => {
    recordQuery(context.requestId, sql, duration);
  };
  
  // Analyze on response finish
  res.on("finish", () => {
    analyzeAndCleanup(context.requestId);
  });
  
  next();
}

/**
 * Get query analysis statistics
 */
export function getQueryAnalyzerStats(): {
  totalN1Detections: number;
  totalQueriesTracked: number;
  activeContexts: number;
} {
  return {
    totalN1Detections,
    totalQueriesTracked,
    activeContexts: requestContexts.size,
  };
}

/**
 * Reset statistics (for testing)
 */
export function resetQueryAnalyzerStats(): void {
  totalN1Detections = 0;
  totalQueriesTracked = 0;
  requestContexts.clear();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      recordQuery?: (sql: string, duration?: number) => void;
    }
  }
}

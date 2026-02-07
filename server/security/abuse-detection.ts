/**
 * Abuse Detection System
 *
 * Comprehensive abuse pattern detection including:
 * - Suspicious activity tracking
 * - Behavioral anomaly detection
 * - Automated threat response
 * - Security event correlation
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Abuse Pattern Types
 */
export type AbusePatternType =
  | "rapid_requests" // Too many requests in short time
  | "credential_stuffing" // Multiple login attempts with different credentials
  | "enumeration" // User/resource enumeration attempts
  | "scraping" // Automated content scraping
  | "injection_attempt" // SQL/XSS/Command injection attempts
  | "path_traversal" // Directory traversal attempts
  | "api_abuse" // API abuse patterns
  | "session_hijack" // Session hijacking attempts
  | "bot_behavior" // Bot-like behavior patterns
  | "ddos_attempt"; // DDoS pattern detection

/**
 * Abuse Event
 */
export interface AbuseEvent {
  id: string;
  timestamp: Date;
  ip: string;
  userId?: string;
  userAgent?: string;
  path: string;
  method: string;
  patternType: AbusePatternType;
  severity: "low" | "medium" | "high" | "critical";
  details: Record<string, unknown>;
  blocked: boolean;
}

/**
 * IP Reputation Score
 */
interface IpReputation {
  ip: string;
  score: number; // 0-100, lower is worse
  totalRequests: number;
  blockedRequests: number;
  patterns: Map<AbusePatternType, number>;
  lastSeen: Date;
  isBlocked: boolean;
  blockExpiresAt?: Date;
}

/**
 * Abuse Detection Configuration
 */
export const ABUSE_CONFIG = {
  // Request rate thresholds
  rapidRequestsThreshold: 60, // requests per minute
  rapidRequestsWindow: 60 * 1000, // 1 minute window

  // Credential stuffing detection
  credentialStuffingThreshold: 5, // Different usernames per IP in window
  credentialStuffingWindow: 5 * 60 * 1000, // 5 minutes

  // Enumeration detection
  enumerationThreshold: 20, // 404s per IP in window
  enumerationWindow: 5 * 60 * 1000, // 5 minutes

  // Scraping detection
  scrapingThreshold: 100, // Pages per IP in window
  scrapingWindow: 60 * 1000, // 1 minute

  // Bot detection - requests without typical browser characteristics
  botDetectionPatterns: [
    /^python-requests/i,
    /^curl\//i,
    /^wget\//i,
    /^axios\//i,
    /^node-fetch/i,
    /^go-http-client/i,
  ],

  // Blocking thresholds
  blockScoreThreshold: 30, // Block if reputation score drops below this
  blockDuration: 60 * 60 * 1000, // 1 hour default block

  // Score adjustments
  scoreDecrement: {
    low: 5,
    medium: 15,
    high: 30,
    critical: 50,
  },

  // Score recovery
  scoreRecoveryRate: 1, // Points recovered per minute
  scoreRecoveryInterval: 60 * 1000, // Check every minute
};

// In-memory stores with size limits (Phase 16: Bound all maps)
const MAX_IP_REPUTATIONS = 50000;
const MAX_REQUEST_COUNTS = 50000;
const MAX_LOGIN_ATTEMPTS = 10000;
const MAX_NOT_FOUND_COUNTS = 10000;
const MAX_EVENTS = 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const ENTRY_TTL_MS = 60 * 60 * 1000; // 1 hour

const ipReputations = new Map<string, IpReputation>();
const recentEvents: AbuseEvent[] = [];
const requestCounts = new Map<string, { count: number; timestamps: number[] }>();
const loginAttempts = new Map<string, { usernames: Set<string>; firstAttempt: number }>();
const notFoundCounts = new Map<string, { count: number; firstError: number }>();

// Phase 16: Periodic cleanup to prevent unbounded growth
function cleanupStaleEntries(): void {
  const now = Date.now();
  const cutoff = now - ENTRY_TTL_MS;

  // Cleanup ipReputations - remove stale entries
  if (ipReputations.size > MAX_IP_REPUTATIONS) {
    const entries = Array.from(ipReputations.entries());
    entries.sort((a, b) => a[1].lastSeen.getTime() - b[1].lastSeen.getTime());
    const toRemove = entries.slice(0, entries.length - MAX_IP_REPUTATIONS);
    for (const [key] of toRemove) {
      ipReputations.delete(key);
    }
  }

  // Cleanup requestCounts - remove old entries
  for (const [key, value] of requestCounts) {
    value.timestamps = value.timestamps.filter(t => t > cutoff);
    if (value.timestamps.length === 0) {
      requestCounts.delete(key);
    }
  }
  if (requestCounts.size > MAX_REQUEST_COUNTS) {
    const keys = Array.from(requestCounts.keys()).slice(0, requestCounts.size - MAX_REQUEST_COUNTS);
    keys.forEach(k => requestCounts.delete(k));
  }

  // Cleanup loginAttempts - remove old entries
  for (const [key, value] of loginAttempts) {
    if (value.firstAttempt < cutoff) {
      loginAttempts.delete(key);
    }
  }
  if (loginAttempts.size > MAX_LOGIN_ATTEMPTS) {
    const keys = Array.from(loginAttempts.keys()).slice(0, loginAttempts.size - MAX_LOGIN_ATTEMPTS);
    keys.forEach(k => loginAttempts.delete(k));
  }

  // Cleanup notFoundCounts - remove old entries
  for (const [key, value] of notFoundCounts) {
    if (value.firstError < cutoff) {
      notFoundCounts.delete(key);
    }
  }
  if (notFoundCounts.size > MAX_NOT_FOUND_COUNTS) {
    const keys = Array.from(notFoundCounts.keys()).slice(
      0,
      notFoundCounts.size - MAX_NOT_FOUND_COUNTS
    );
    keys.forEach(k => notFoundCounts.delete(k));
  }
}

// Start periodic cleanup - only when not in publishing mode
if (process.env.DISABLE_BACKGROUND_SERVICES !== "true" && process.env.REPLIT_DEPLOYMENT !== "1") {
  setInterval(cleanupStaleEntries, CLEANUP_INTERVAL_MS);
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `abuse_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get or create IP reputation
 */
function getIpReputation(ip: string): IpReputation {
  let reputation = ipReputations.get(ip);

  if (!reputation) {
    reputation = {
      ip,
      score: 100,
      totalRequests: 0,
      blockedRequests: 0,
      patterns: new Map(),
      lastSeen: new Date(),
      isBlocked: false,
    };
    ipReputations.set(ip, reputation);
  }

  // Check if block has expired
  if (reputation.isBlocked && reputation.blockExpiresAt && reputation.blockExpiresAt < new Date()) {
    reputation.isBlocked = false;
    reputation.blockExpiresAt = undefined;
    reputation.score = Math.min(reputation.score + 20, 50); // Partial score recovery
  }

  return reputation;
}

/**
 * Record an abuse event
 */
export function recordAbuseEvent(event: Omit<AbuseEvent, "id">): AbuseEvent {
  const fullEvent: AbuseEvent = {
    ...event,
    id: generateEventId(),
  };

  // Add to recent events (circular buffer)
  recentEvents.push(fullEvent);
  if (recentEvents.length > MAX_EVENTS) {
    recentEvents.shift();
  }

  // Update IP reputation
  const reputation = getIpReputation(event.ip);
  reputation.lastSeen = new Date();

  // Track pattern occurrence
  const currentCount = reputation.patterns.get(event.patternType) || 0;
  reputation.patterns.set(event.patternType, currentCount + 1);

  // Decrease reputation score
  const decrement = ABUSE_CONFIG.scoreDecrement[event.severity];
  reputation.score = Math.max(0, reputation.score - decrement);

  if (event.blocked) {
    reputation.blockedRequests++;
  }

  // Auto-block if score too low
  if (reputation.score <= ABUSE_CONFIG.blockScoreThreshold && !reputation.isBlocked) {
    reputation.isBlocked = true;
    reputation.blockExpiresAt = new Date(Date.now() + ABUSE_CONFIG.blockDuration);
  }

  // Log the event

  return fullEvent;
}

/**
 * Mask IP for logging (privacy)
 */
function maskIp(ip: string): string {
  if (ip.includes(".")) {
    const parts = ip.split(".");
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  return ip.substring(0, ip.length / 2) + "...";
}

/**
 * Check for rapid request patterns
 */
function checkRapidRequests(ip: string): boolean {
  const now = Date.now();
  let data = requestCounts.get(ip);

  if (!data) {
    data = { count: 0, timestamps: [] };
    requestCounts.set(ip, data);
  }

  // Remove old timestamps
  data.timestamps = data.timestamps.filter(t => now - t < ABUSE_CONFIG.rapidRequestsWindow);
  data.timestamps.push(now);
  data.count = data.timestamps.length;

  return data.count > ABUSE_CONFIG.rapidRequestsThreshold;
}

/**
 * Check for credential stuffing patterns
 */
function checkCredentialStuffing(ip: string, username?: string): boolean {
  if (!username) return false;

  const now = Date.now();
  let data = loginAttempts.get(ip);

  if (!data || now - data.firstAttempt > ABUSE_CONFIG.credentialStuffingWindow) {
    data = { usernames: new Set(), firstAttempt: now };
    loginAttempts.set(ip, data);
  }

  data.usernames.add(username.toLowerCase());

  return data.usernames.size > ABUSE_CONFIG.credentialStuffingThreshold;
}

/**
 * Check for enumeration patterns (many 404s)
 */
function checkEnumeration(ip: string, statusCode: number): boolean {
  if (statusCode !== 404) return false;

  const now = Date.now();
  let data = notFoundCounts.get(ip);

  if (!data || now - data.firstError > ABUSE_CONFIG.enumerationWindow) {
    data = { count: 0, firstError: now };
    notFoundCounts.set(ip, data);
  }

  data.count++;

  return data.count > ABUSE_CONFIG.enumerationThreshold;
}

/**
 * Check for bot behavior
 */
function checkBotBehavior(userAgent?: string): boolean {
  if (!userAgent) return true; // No user agent is suspicious

  return ABUSE_CONFIG.botDetectionPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Check for path traversal attempts
 */
function checkPathTraversal(path: string): boolean {
  const traversalPatterns = [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e\//i,
    /\.\.%2f/i,
    /%252e%252e/i,
  ];

  return traversalPatterns.some(pattern => pattern.test(path));
}

/**
 * Paths to skip from abuse detection (dev server, static assets)
 */
const SKIP_PATHS = [
  /^\/src\//, // Vite source files
  /^\/node_modules\//, // Node modules
  /^\/@fs\//, // Vite filesystem access
  /^\/@vite\//, // Vite HMR
  /^\/@react-refresh/, // React HMR
  /^\/\.vite\//, // Vite cache
  /\.(js|ts|tsx|css|svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)$/i, // Static assets
  /^\/favicon/, // Favicon
  /^\/assets\//, // Static assets folder
];

/**
 * Main abuse detection middleware
 */
export function abuseDetectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"];
  const path = req.path;

  // Skip abuse detection for development server requests and static assets
  const isDevServer = ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  const isSkippedPath = SKIP_PATHS.some(pattern => pattern.test(path));

  if (isDevServer || isSkippedPath) {
    return next();
  }

  // Get reputation
  const reputation = getIpReputation(ip);
  reputation.totalRequests++;
  reputation.lastSeen = new Date();

  // Check if blocked
  if (reputation.isBlocked) {
    recordAbuseEvent({
      timestamp: new Date(),
      ip,
      userId: (req as any).user?.claims?.sub,
      userAgent,
      path,
      method: req.method,
      patternType: "api_abuse",
      severity: "high",
      details: { reason: "IP is blocked" },
      blocked: true,
    });

    return res.status(429).json({
      error: "Too many requests. Please try again later.",
      retryAfter: reputation.blockExpiresAt
        ? Math.ceil((reputation.blockExpiresAt.getTime() - Date.now()) / 1000)
        : 3600,
    });
  }

  // Check for path traversal
  if (checkPathTraversal(path)) {
    recordAbuseEvent({
      timestamp: new Date(),
      ip,
      userAgent,
      path,
      method: req.method,
      patternType: "path_traversal",
      severity: "critical",
      details: { path },
      blocked: true,
    });

    return res.status(400).json({ error: "Invalid request" });
  }

  // Check for rapid requests
  if (checkRapidRequests(ip)) {
    recordAbuseEvent({
      timestamp: new Date(),
      ip,
      userId: (req as any).user?.claims?.sub,
      userAgent,
      path,
      method: req.method,
      patternType: "rapid_requests",
      severity: "medium",
      details: { requestsInWindow: requestCounts.get(ip)?.count || 0 },
      blocked: false,
    });
    // Don't block yet, just record
  }

  // Check for bot behavior on non-API routes
  if (!path.startsWith("/api/") && checkBotBehavior(userAgent)) {
    recordAbuseEvent({
      timestamp: new Date(),
      ip,
      userAgent,
      path,
      method: req.method,
      patternType: "bot_behavior",
      severity: "low",
      details: { userAgent },
      blocked: false,
    });
    // Don't block bots outright, just track
  }

  // Capture response to check for enumeration
  const originalSend = res.send;
  res.send = function (body) {
    if (res.statusCode === 404) {
      if (checkEnumeration(ip, 404)) {
        recordAbuseEvent({
          timestamp: new Date(),
          ip,
          userAgent,
          path,
          method: req.method,
          patternType: "enumeration",
          severity: "medium",
          details: { notFoundCount: notFoundCounts.get(ip)?.count || 0 },
          blocked: false,
        });
      }
    }
    return originalSend.call(this, body);
  };

  next();
}

/**
 * Login abuse detection - call from login routes
 */
export function recordLoginAttempt(ip: string, username: string, success: boolean): void {
  if (!success && checkCredentialStuffing(ip, username)) {
    recordAbuseEvent({
      timestamp: new Date(),
      ip,
      path: "/api/login",
      method: "POST",
      patternType: "credential_stuffing",
      severity: "high",
      details: {
        attemptedUsernames: loginAttempts.get(ip)?.usernames.size || 0,
      },
      blocked: false,
    });
  }
}

/**
 * Get abuse statistics
 */
export function getAbuseStats(): {
  totalEvents: number;
  blockedIps: number;
  patternCounts: Record<AbusePatternType, number>;
  recentEvents: AbuseEvent[];
  lowReputationIps: Array<{ ip: string; score: number; patterns: string[] }>;
} {
  const patternCounts: Record<AbusePatternType, number> = {
    rapid_requests: 0,
    credential_stuffing: 0,
    enumeration: 0,
    scraping: 0,
    injection_attempt: 0,
    path_traversal: 0,
    api_abuse: 0,
    session_hijack: 0,
    bot_behavior: 0,
    ddos_attempt: 0,
  };

  recentEvents.forEach(event => {
    patternCounts[event.patternType]++;
  });

  let blockedIps = 0;
  const lowReputationIps: Array<{ ip: string; score: number; patterns: string[] }> = [];

  ipReputations.forEach((rep, ip) => {
    if (rep.isBlocked) blockedIps++;
    if (rep.score < 50) {
      lowReputationIps.push({
        ip: maskIp(ip),
        score: rep.score,
        patterns: Array.from(rep.patterns.keys()),
      });
    }
  });

  return {
    totalEvents: recentEvents.length,
    blockedIps,
    patternCounts,
    recentEvents: recentEvents.slice(-20), // Last 20 events
    lowReputationIps: lowReputationIps.slice(0, 10), // Top 10 worst IPs
  };
}

/**
 * Manually block an IP
 */
export function blockIp(ip: string, durationMs: number = ABUSE_CONFIG.blockDuration): void {
  const reputation = getIpReputation(ip);
  reputation.isBlocked = true;
  reputation.blockExpiresAt = new Date(Date.now() + durationMs);
  reputation.score = 0;
}

/**
 * Unblock an IP
 */
export function unblockIp(ip: string): void {
  const reputation = ipReputations.get(ip);
  if (reputation) {
    reputation.isBlocked = false;
    reputation.blockExpiresAt = undefined;
    reputation.score = 50; // Partial recovery
  }
}

/**
 * Cleanup old data periodically - only when not in publishing mode
 */
if (process.env.DISABLE_BACKGROUND_SERVICES !== "true" && process.env.REPLIT_DEPLOYMENT !== "1") {
  setInterval(() => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Clean up request counts
    requestCounts.forEach((data, ip) => {
      data.timestamps = data.timestamps.filter(t => t > oneHourAgo);
      if (data.timestamps.length === 0) {
        requestCounts.delete(ip);
      }
    });

    // Clean up login attempts
    loginAttempts.forEach((data, ip) => {
      if (data.firstAttempt < oneHourAgo) {
        loginAttempts.delete(ip);
      }
    });

    // Clean up 404 counts
    notFoundCounts.forEach((data, ip) => {
      if (data.firstError < oneHourAgo) {
        notFoundCounts.delete(ip);
      }
    });

    // Recover reputation scores
    ipReputations.forEach(rep => {
      if (!rep.isBlocked && rep.score < 100) {
        rep.score = Math.min(100, rep.score + ABUSE_CONFIG.scoreRecoveryRate);
      }
    });
  }, ABUSE_CONFIG.scoreRecoveryInterval);
}

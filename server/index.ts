// Load environment variables from .env file FIRST (before any other imports)
import "dotenv/config";

// Initialize Sentry early (before other imports) for error tracking
import { initSentry, Sentry } from "./lib/sentry";
initSentry();

// =============================================================================
// CRITICAL: Global Error Handlers - Must be registered BEFORE anything else
// =============================================================================
// Pino logger imported early for process-level handlers
import { createLogger } from "./lib/logger";
const processLog = createLogger("process");

process.on("unhandledRejection", (reason, _promise) => {
  processLog.fatal({ reason }, "Unhandled Promise Rejection");
});

process.on("uncaughtException", error => {
  processLog.fatal({ err: error }, "Uncaught Exception — initiating emergency shutdown");
  process.exit(1);
});

process.on("warning", warning => {
  processLog.warn({ name: warning.name }, warning.message);
});

import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "node:http";
import { corsMiddleware, sanitizeInput, approvedBotMiddleware } from "./security";
import { setupSecurityMiddleware } from "./security/index";
import { consoleLogger } from "./console-logger";
import { ssrMiddleware } from "./lib/ssr-middleware";
import { setupMonitoring } from "./monitoring";
import { apiVersioningMiddleware } from "./middleware/api-versioning";
import { cdnCacheHeaders } from "./middleware/cache-headers";
// [REMOVED] Octopus imports - migrated to Octypo v2
import { bootstrapFoundationMiddleware, initializeFoundationEvents } from "./foundation";
import { validateRequiredEnvVars } from "./config/env-validator";
import {
  startTiqetsBackgroundGenerator,
  stopTiqetsBackgroundGenerator,
} from "./services/tiqets-background-generator";
import { runProductionSeed } from "./lib/production-seed";

import { initializeGatekeeper } from "./octypo/gatekeeper";
import { initializeRssFeedItemsTable } from "./octypo/rss-reader";
import { startBackgroundServices, stopBackgroundServices } from "./services/background-services";
import { db } from "./db";
import { destinations } from "@shared/schema";
import { sendProblemResponse, zodToProblemDetails, ErrorTypes } from "./lib/error-response";
import { eq, sql } from "drizzle-orm";
import { redirectMiddleware, attractionSlugRedirectMiddleware } from "./middleware/redirects";
import { localeMiddleware } from "./middleware/locale";

// Validate environment variables before starting the application
validateRequiredEnvVars();

// Start capturing console output for the admin logs panel
consoleLogger.start();

const app = express();

// CRITICAL: Readiness flag for deployment health checks
// Server starts listening immediately, but returns 503 for non-health routes until ready
let isServerReady = false;
let isShuttingDown = false;

// CRITICAL: Health check endpoint MUST be registered BEFORE any middleware
// This ensures Replit deployment health checks pass immediately when server starts
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok", ready: isServerReady, timestamp: new Date().toISOString() });
});

// Reject requests during shutdown (except health checks)
app.use((req, res, next) => {
  if (isShuttingDown && !req.path.includes("health")) {
    res.status(503).json({
      error: "Service Unavailable",
      message: "Server is shutting down",
      retryAfter: 30,
    });
    return;
  }
  next();
});

// Disable X-Powered-By header globally
app.disable("x-powered-by");

// Redirect www to non-www (preserve path and query string)
// Fixes 404s for high-authority backlinks pointing to www.travi.world
app.use((req: Request, res: Response, next: NextFunction) => {
  const host = req.hostname || req.headers.host || "";
  if (host.startsWith("www.")) {
    const newHost = host.replace(/^www\./, "");
    return res.redirect(301, `https://${newHost}${req.originalUrl}`);
  }
  next();
});

// Correlation ID — assign unique request ID for tracing (early in chain)
import { correlationIdMiddleware } from "./shared/middleware/correlation-id";
app.use(correlationIdMiddleware);

// Initialize enterprise security layer (Helmet + attack detection)
setupSecurityMiddleware(app);

// Initialize performance monitoring (latency tracking + N+1 detection)
setupMonitoring(app);

// Apply CORS to all requests (from existing security.ts)
app.use(corsMiddleware);

// CSP and security headers are handled by setupSecurityMiddleware (Helmet) above.
// HSTS is handled by Cloudflare — no duplicate header needed here.

// CDN-ready cache headers (Vary: Accept-Encoding for static assets)
app.use(cdnCacheHeaders);

// Enable gzip/deflate compression for all responses
app.use(
  compression({
    level: 6, // Balanced compression level
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
      // Always compress HTML, CSS, JS, JSON, SVG
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  })
);

const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Security: Limit request body size to prevent DoS attacks
// JSON/urlencoded capped at 2MB; uploads use separate multipart handlers
app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "2mb",
  })
);

// Sanitize incoming request data (remove null bytes, control chars)
app.use(sanitizeInput);

// Genesis G1: Locale resolution middleware
// Extracts locale from URL prefix, validates, and sets req.locale + headers
app.use(localeMiddleware);

// 301 Redirects Middleware - handles SEO redirects AFTER locale detection
// This ensures Content-Language/Vary headers are set even for redirected responses
app.use(redirectMiddleware);

// Attraction slug redirects - redirects old slugs (with random IDs) to clean seoSlugs
// This is async because it requires DB lookup
app.use((req, res, next) => {
  attractionSlugRedirectMiddleware(req, res, next).catch(next);
});

// SEO Fix: 301 Redirects for legacy Dubai paths to new /destinations/dubai/ hierarchy
// This ensures search engines and users are directed to the canonical URLs
app.use((req, res, next) => {
  const path = req.path;

  // Map of old Dubai paths to new destinations hierarchy
  const dubaiRedirects: Record<string, string> = {
    // Real estate paths
    "/dubai-real-estate": "/destinations/dubai/real-estate",
    "/dubai-off-plan-properties": "/destinations/dubai/off-plan",

    // Landing pages
    "/dubai/laws-for-tourists": "/destinations/dubai/laws-for-tourists",
    "/dubai/sheikh-mohammed-bin-rashid": "/destinations/dubai/sheikh-mohammed",
    "/dubai/24-hours-open": "/destinations/dubai/24-hours-open",
    "/dubai/free-things-to-do": "/destinations/dubai/free-things-to-do",

    // Attractions
    "/attractions/list/dubai": "/destinations/dubai/attractions",

    // Dubai districts (common ones)
    "/districts/downtown-dubai": "/destinations/dubai/districts/downtown",
    "/districts/dubai-marina": "/destinations/dubai/districts/marina",
    "/districts/palm-jumeirah": "/destinations/dubai/districts/palm-jumeirah",
    "/districts/jbr": "/destinations/dubai/districts/jbr",
    "/districts/business-bay": "/destinations/dubai/districts/business-bay",

    // Dubai guides
    "/guides/dubai-to-rak-transport": "/destinations/dubai/guides/rak-transport",
    "/guides/dubai-vs-rak": "/destinations/dubai/guides/rak-comparison",
  };

  // Check exact matches first
  if (dubaiRedirects[path]) {
    const queryString = Object.keys(req.query).length
      ? "?" + new URLSearchParams(req.query as Record<string, string>).toString()
      : "";
    return res.redirect(301, dubaiRedirects[path] + queryString);
  }

  // Handle dynamic /dubai/* routes (excluding API paths)
  // Redirect /dubai/anything to /destinations/dubai/anything
  if (path.startsWith("/dubai/") && !path.includes("/api/")) {
    const newPath = "/destinations" + path;
    const queryString = Object.keys(req.query).length
      ? "?" + new URLSearchParams(req.query as Record<string, string>).toString()
      : "";
    return res.redirect(301, newPath + queryString);
  }

  // Handle district pages with dubai in slug that should redirect
  // /districts/dubai-* → /destinations/dubai/districts/*
  if (path.startsWith("/districts/dubai-")) {
    const districtSlug = path.replace("/districts/dubai-", "");
    const newPath = `/destinations/dubai/districts/${districtSlug}`;
    const queryString = Object.keys(req.query).length
      ? "?" + new URLSearchParams(req.query as Record<string, string>).toString()
      : "";
    return res.redirect(301, newPath + queryString);
  }

  // Handle legacy Dubai guides pattern
  // /guides/dubai-* → /destinations/dubai/guides/*
  if (path.startsWith("/guides/dubai-")) {
    const guideSlug = path.replace("/guides/dubai-", "");
    const newPath = `/destinations/dubai/guides/${guideSlug}`;
    const queryString = Object.keys(req.query).length
      ? "?" + new URLSearchParams(req.query as Record<string, string>).toString()
      : "";
    return res.redirect(301, newPath + queryString);
  }

  next();
});

// API Versioning middleware - supports /api/v1/* URL prefix and Accept header versioning
// Existing /api/* routes continue to work, /api/v1/* routes are also available
app.use(apiVersioningMiddleware);

// Phase 1 Foundation: Bootstrap foundation middleware (correlation ID, etc.)
// Feature flagged via ENABLE_FOUNDATION=true (default: OFF)
bootstrapFoundationMiddleware(app);

const serverLog = createLogger("server");
export function log(message: string, source = "express") {
  if (source === "error") {
    serverLog.error(message);
  } else {
    serverLog.info({ source }, message);
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Critical: Root-level health check that responds IMMEDIATELY before any other routes
// This allows Replit deployment health checks to pass while background seeding continues
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Deep health check — verifies DB connectivity
app.get("/health/db", async (_req, res) => {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    res.status(200).json({
      status: "ok",
      db: "connected",
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      db: "unreachable",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "DB check failed",
    });
  }
});

// ============================================================================
// SEO INFRASTRUCTURE ROUTES - Must be registered FIRST before any middleware
// These are critical SEO endpoints that must NEVER be hijacked by SPA fallback
// ============================================================================
app.get("/sitemap", async (_req, res) => {
  try {
    // Fetch live destinations with failsafe
    let liveDestinations: { id: number; name: string; slug: string | null }[] = [];
    try {
      liveDestinations = await db
        .select({
          id: destinations.id,
          name: destinations.name,
          slug: destinations.slug,
        })
        .from(destinations)
        .where(eq(destinations.isActive, true))
        .orderBy(destinations.name);
    } catch (dbError) {
      // Continue with empty destinations - never fail
    }

    const baseUrl = process.env.SITE_URL || "https://travi.travel";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sitemap | TRAVI</title>
  <meta name="description" content="Complete sitemap of TRAVI - Browse all pages including destinations, attractions, hotels, dining, guides, and more.">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem 1rem; line-height: 1.6; }
    h1 { font-size: 2rem; margin-bottom: 2rem; }
    h2 { font-size: 1.25rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin-top: 2rem; margin-bottom: 1rem; }
    ul { list-style: none; padding: 0; margin: 0; }
    li { margin-bottom: 0.5rem; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Sitemap</h1>

  <section>
    <h2>Core Pages</h2>
    <ul>
      <li><a href="${baseUrl}/">Home</a></li>
      <li><a href="${baseUrl}/search">Search</a></li>
      <li><a href="${baseUrl}/destinations">Destinations</a></li>
      <li><a href="${baseUrl}/news">News</a></li>
      <li><a href="${baseUrl}/shopping">Shopping</a></li>
      <li><a href="${baseUrl}/events">Events</a></li>
      <li><a href="${baseUrl}/glossary">Glossary</a></li>
      <li><a href="${baseUrl}/help">Help Center</a></li>
    </ul>
  </section>

  <section>
    <h2>Destinations</h2>
    <ul>
      ${
        liveDestinations.length > 0
          ? liveDestinations
              .map(d => `<li><a href="${baseUrl}${d.slug}">${d.name}</a></li>`)
              .join("\n      ")
          : "<li>Loading destinations...</li>"
      }
    </ul>
  </section>

  <section>
    <h2>Guides & Articles</h2>
    <ul>
      <li><a href="${baseUrl}/guides">Travel Guides</a></li>
      <li><a href="${baseUrl}/articles">Articles</a></li>
      <li><a href="${baseUrl}/guides/wynn-al-marjan-island">Wynn Al Marjan Island Guide</a></li>
      <li><a href="${baseUrl}/guides/jebel-jais-adventure">Jebel Jais Adventure Guide</a></li>
      <li><a href="${baseUrl}/destinations/dubai/guides/rak-transport">Dubai to RAK Transport Guide</a></li>
      <li><a href="${baseUrl}/destinations/dubai/guides/rak-comparison">Dubai vs RAK Comparison</a></li>
      <li><a href="${baseUrl}/guides/where-to-stay-rak">Where to Stay in RAK</a></li>
      <li><a href="${baseUrl}/guides/rak-real-estate-investment">RAK Real Estate Investment Guide</a></li>
    </ul>
  </section>

  <section>
    <h2>Categories</h2>
    <ul>
      <li><a href="${baseUrl}/attractions">Attractions</a></li>
      <li><a href="${baseUrl}/hotels">Hotels</a></li>
      <li><a href="${baseUrl}/dining">Dining</a></li>
      <li><a href="${baseUrl}/things-to-do">Things To Do</a></li>
    </ul>
  </section>

  <section>
    <h2>Legal & Company</h2>
    <ul>
      <li><a href="${baseUrl}/about">About Us</a></li>
      <li><a href="${baseUrl}/contact">Contact</a></li>
      <li><a href="${baseUrl}/privacy">Privacy Policy</a></li>
      <li><a href="${baseUrl}/terms">Terms & Conditions</a></li>
      <li><a href="${baseUrl}/cookie-policy">Cookie Policy</a></li>
      <li><a href="${baseUrl}/security">Security</a></li>
      <li><a href="${baseUrl}/affiliate-disclosure">Affiliate Disclosure</a></li>
    </ul>
  </section>
</body>
</html>`;

    res
      .status(200)
      .set({
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      })
      .end(html);
  } catch (error) {
    // Ultimate failsafe - always return valid HTML, never 404

    const minimalHtml = `<!DOCTYPE html><html><head><title>Sitemap | TRAVI</title></head><body><h1>Sitemap</h1><p>Please visit <a href="/">TRAVI Home</a></p></body></html>`;
    res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(minimalHtml);
  }
});

// ============================================================================
// EARLY LISTEN PATTERN: Start server IMMEDIATELY, then initialize
// This ensures Replit deployment health checks pass before heavy init
// ============================================================================

// ALWAYS serve the app on the port specified in the environment variable PORT
// Other ports are firewalled. Default to 5000 if not specified.
const port = Number.parseInt(process.env.PORT || "5000", 10);

// Security: Set server timeouts to prevent slow loris attacks
httpServer.timeout = 120000; // 2 minutes for complete request
httpServer.keepAliveTimeout = 65000; // Keep alive timeout
httpServer.headersTimeout = 66000; // Headers timeout (must be > keepAliveTimeout)

// Start listening IMMEDIATELY - this allows health checks to pass
httpServer.listen(
  {
    port,
    host: "0.0.0.0",
    // reusePort disabled - causes ENOTSUP on macOS
  },
  () => {
    log(`[EARLY-LISTEN] Server listening on port ${port} - health checks will pass`, "server");
    log(`[EARLY-LISTEN] Starting background initialization...`, "server");

    // Now do all the heavy initialization in the background
    initializeServer().catch(err => {
      log(`[CRITICAL] Server initialization failed: ${err}`, "error");
    });
  }
);

// Heavy initialization function - runs AFTER server is listening
async function initializeServer() {
  const initStart = Date.now();

  try {
    // Register all routes (heavy operation)
    await registerRoutes(httpServer, app);

    // Sentry error handler (must be before custom error handler)
    Sentry.setupExpressErrorHandler(app);

    // Global error handler middleware
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      Sentry.captureException(err);
      log(`Error: ${err.message || "Unknown error"} - ${req.method} ${req.path}`, "error");
      if (process.env.NODE_ENV === "development") {
        serverLog.debug({ stack: err.stack }, "Error stack trace");
      }

      if (err.name === "ZodError" && err.errors) {
        const problem = zodToProblemDetails(err, `${req.method} ${req.path}`);
        return sendProblemResponse(res, problem);
      }

      if (err.isOperational) {
        const opStatus = err.statusCode || err.status || 400;
        return sendProblemResponse(res, {
          type: opStatus === 404 ? ErrorTypes.NOT_FOUND : undefined,
          title: err.message,
          status: opStatus,
          instance: `${req.method} ${req.path}`,
        });
      }

      const status = err.status || err.statusCode || 500;
      const message =
        process.env.NODE_ENV === "production" && status === 500
          ? "Internal Server Error"
          : err.message || "Internal Server Error";

      sendProblemResponse(res, {
        type: ErrorTypes.INTERNAL,
        title: message,
        status,
        instance: `${req.method} ${req.path}`,
      });
    });

    // API catch-all: Return JSON 404 for unmatched /api/* routes
    app.all("/api/*", (req: Request, res: Response) => {
      sendProblemResponse(res, {
        type: ErrorTypes.NOT_FOUND,
        title: "Not Found",
        status: 404,
        detail: `API endpoint ${req.method} ${req.path} does not exist`,
        instance: `${req.method} ${req.path}`,
        _meta: { apiVersion: "v1" },
      });
    });

    // SSR middleware for bot detection
    app.use(approvedBotMiddleware);
    app.use(ssrMiddleware);
    log("[SSR] Bot detection and SSR middleware enabled", "server");

    // Setup static serving or Vite dev server
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    // Mark server as fully ready
    isServerReady = true;
    const initTime = Date.now() - initStart;
    log(`[READY] Server fully initialized in ${initTime}ms`, "server");

    // Start background tasks (non-blocking)
    if (process.env.RUN_PROD_SEED === "true") {
      log("[ProdSeed] Starting background database seeding...", "server");
      runProductionSeed()
        .then(() => {
          log("[ProdSeed] Background seeding completed successfully", "server");
        })
        .catch(err => {
          log(`[ProdSeed] Background seeding failed: ${err}`, "server");
        });
    }

    startTiqetsBackgroundGenerator();
    log("[TiqetsBackground] Content generation automation ENABLED", "server");

    // Old Pipeline A handler removed — Gatekeeper pipeline handles all RSS content generation

    // Initialize RSS feed items table with Gate1 columns
    await initializeRssFeedItemsTable();

    await initializeGatekeeper();
    log("[Gatekeeper] Autonomous content pipeline initialized", "server");

    // Start all background services (translation, RSS scheduler, governance)
    startBackgroundServices().catch(err => {
      log(`[BackgroundServices] Failed to start: ${err}`, "error");
    });

    initializeFoundationEvents();
  } catch (error) {
    log(`[INIT-ERROR] ${error}`, "error");
    throw error;
  }
}

// Graceful shutdown handling with proper request draining
const shutdown = async (signal: string) => {
  if (isShuttingDown) {
    log("Shutdown already in progress, ignoring duplicate signal", "server");
    return;
  }
  isShuttingDown = true;
  isServerReady = false; // Stop accepting new work

  log(`${signal} received. Starting graceful shutdown...`, "server");
  const shutdownStart = Date.now();
  const SHUTDOWN_TIMEOUT = 30000; // 30 seconds max

  // Phase 1: Stop accepting new connections (immediate)
  log("[Shutdown] Phase 1: Stopping new connections...", "server");
  httpServer.close(() => {
    log("[Shutdown] HTTP server closed - no new connections", "server");
  });

  // Phase 2: Stop background services (they should flush their queues)
  log("[Shutdown] Phase 2: Stopping background services...", "server");
  try {
    await Promise.race([
      stopBackgroundServices(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Background services timeout")), 10000)
      ),
    ]);
    log("[Shutdown] Background services stopped", "server");
  } catch (error) {
    log(`[Shutdown] Background services stop error: ${error}`, "server");
  }

  // Phase 3: Stop other generators
  try {
    stopTiqetsBackgroundGenerator();
    log("[Shutdown] Tiqets generator stopped", "server");
  } catch (error) {
    log(`[Shutdown] Tiqets generator stop error: ${error}`, "server");
  }

  // Phase 4: Wait for in-flight requests (with timeout)
  log("[Shutdown] Phase 3: Waiting for in-flight requests...", "server");
  await new Promise(resolve => setTimeout(resolve, 2000)); // Give 2s for requests to complete

  // Phase 5: Close database connections
  log("[Shutdown] Phase 4: Closing database connections...", "server");
  try {
    const { pool } = await import("./db");
    await Promise.race([
      pool.end(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB pool close timeout")), 5000)
      ),
    ]);
    log("[Shutdown] Database pool closed", "server");
  } catch (error) {
    log(`[Shutdown] Database pool close error: ${error}`, "server");
  }

  const shutdownDuration = Date.now() - shutdownStart;
  log(`[Shutdown] Graceful shutdown completed in ${shutdownDuration}ms`, "server");

  // Force exit if we exceeded timeout
  if (shutdownDuration > SHUTDOWN_TIMEOUT) {
    log("[Shutdown] Shutdown exceeded timeout, forcing exit", "server");
  }

  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes, autoProcessRssFeeds } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { securityHeaders, corsMiddleware, sanitizeInput, approvedBotMiddleware } from "./security";
import { setupSecurityMiddleware } from "./security/index";
import { consoleLogger } from "./console-logger";
import { ssrMiddleware } from "./lib/ssr-middleware";
import { setupMonitoring } from "./monitoring";
import { apiVersioningMiddleware } from "./middleware/api-versioning";
// [REMOVED] Octopus imports - migrated to Octypo v2
import { initializeContentSubscribers } from "./events";
import { bootstrapFoundationMiddleware, initializeFoundationEvents } from "./foundation";
import { validateRequiredEnvVars } from "./config/env-validator";
import { startTiqetsBackgroundGenerator, stopTiqetsBackgroundGenerator } from "./services/tiqets-background-generator";
import { runProductionSeed } from "./lib/production-seed";
import { registerOctypoJobHandler } from "./octypo/job-handler";
import { db } from "./db";
import { destinations } from "@shared/schema";
import { eq } from "drizzle-orm";
import { redirectMiddleware } from "./middleware/redirects";
import { localeMiddleware } from "./middleware/locale";

// Validate environment variables before starting the application
validateRequiredEnvVars();


// Start capturing console output for the admin logs panel
consoleLogger.start();

const app = express();

// CRITICAL: Readiness flag for deployment health checks
// Server starts listening immediately, but returns 503 for non-health routes until ready
let isServerReady = false;

// CRITICAL: Health check endpoint MUST be registered BEFORE any middleware
// This ensures Replit deployment health checks pass immediately when server starts
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok', ready: isServerReady, timestamp: new Date().toISOString() });
});

// Disable X-Powered-By header globally
app.disable('x-powered-by');

// Initialize enterprise security layer (Helmet + attack detection)
setupSecurityMiddleware(app);

// Initialize performance monitoring (latency tracking + N+1 detection)
setupMonitoring(app);

// Apply CORS to all requests (from existing security.ts)
app.use(corsMiddleware);

// Lighthouse Security Headers Middleware (HSTS, CSP, Trusted Types)
app.use((req, res, next) => {
  // HSTS - Force HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // Content Security Policy with Trusted Types
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://www.google-analytics.com https://api.tiqets.com wss: ws:",
      "frame-ancestors 'self'",
      "require-trusted-types-for 'script'",
    ].join('; ')
  );
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
});

// Enable gzip/deflate compression for all responses
app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Always compress HTML, CSS, JS, JSON, SVG
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Security: Limit request body size to prevent DoS attacks
app.use(
  express.json({
    limit: '10mb',  // Maximum JSON body size
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({
  extended: false,
  limit: '10mb',  // Maximum URL-encoded body size
}));

// Sanitize incoming request data (remove null bytes, control chars)
app.use(sanitizeInput);

// Genesis G1: Locale resolution middleware
// Extracts locale from URL prefix, validates, and sets req.locale + headers
app.use(localeMiddleware);
console.log('[Locale] Locale resolution middleware registered');

// 301 Redirects Middleware - handles SEO redirects AFTER locale detection
// This ensures Content-Language/Vary headers are set even for redirected responses
app.use(redirectMiddleware);
console.log('[Redirects] 301 redirect middleware registered');

// SEO Fix: 301 Redirects for legacy Dubai paths to new /destinations/dubai/ hierarchy
// This ensures search engines and users are directed to the canonical URLs
app.use((req, res, next) => {
  const path = req.path;
  
  // Map of old Dubai paths to new destinations hierarchy
  const dubaiRedirects: Record<string, string> = {
    // Real estate paths
    '/dubai-real-estate': '/destinations/dubai/real-estate',
    '/dubai-off-plan-properties': '/destinations/dubai/off-plan',
    
    // Landing pages
    '/dubai/laws-for-tourists': '/destinations/dubai/laws-for-tourists',
    '/dubai/sheikh-mohammed-bin-rashid': '/destinations/dubai/sheikh-mohammed',
    '/dubai/24-hours-open': '/destinations/dubai/24-hours-open',
    '/dubai/free-things-to-do': '/destinations/dubai/free-things-to-do',
    
    // Attractions
    '/attractions/list/dubai': '/destinations/dubai/attractions',
    
    // Dubai districts (common ones)
    '/districts/downtown-dubai': '/destinations/dubai/districts/downtown',
    '/districts/dubai-marina': '/destinations/dubai/districts/marina',
    '/districts/palm-jumeirah': '/destinations/dubai/districts/palm-jumeirah',
    '/districts/jbr': '/destinations/dubai/districts/jbr',
    '/districts/business-bay': '/destinations/dubai/districts/business-bay',
    
    // Dubai guides
    '/guides/dubai-to-rak-transport': '/destinations/dubai/guides/rak-transport',
    '/guides/dubai-vs-rak': '/destinations/dubai/guides/rak-comparison',
  };
  
  // Check exact matches first
  if (dubaiRedirects[path]) {
    const queryString = Object.keys(req.query).length 
      ? '?' + new URLSearchParams(req.query as Record<string, string>).toString() 
      : '';
    return res.redirect(301, dubaiRedirects[path] + queryString);
  }
  
  // Handle dynamic /dubai/* routes (excluding API paths)
  // Redirect /dubai/anything to /destinations/dubai/anything
  if (path.startsWith('/dubai/') && !path.includes('/api/')) {
    const newPath = '/destinations' + path;
    const queryString = Object.keys(req.query).length 
      ? '?' + new URLSearchParams(req.query as Record<string, string>).toString() 
      : '';
    return res.redirect(301, newPath + queryString);
  }
  
  // Handle district pages with dubai in slug that should redirect
  // /districts/dubai-* → /destinations/dubai/districts/*
  if (path.startsWith('/districts/dubai-')) {
    const districtSlug = path.replace('/districts/dubai-', '');
    const newPath = `/destinations/dubai/districts/${districtSlug}`;
    const queryString = Object.keys(req.query).length 
      ? '?' + new URLSearchParams(req.query as Record<string, string>).toString() 
      : '';
    return res.redirect(301, newPath + queryString);
  }
  
  // Handle legacy Dubai guides pattern
  // /guides/dubai-* → /destinations/dubai/guides/*
  if (path.startsWith('/guides/dubai-')) {
    const guideSlug = path.replace('/guides/dubai-', '');
    const newPath = `/destinations/dubai/guides/${guideSlug}`;
    const queryString = Object.keys(req.query).length 
      ? '?' + new URLSearchParams(req.query as Record<string, string>).toString() 
      : '';
    return res.redirect(301, newPath + queryString);
  }
  
  // SEO Fix: Redirect /article/* (singular) to /articles/* (plural)
  // Also handles localized paths like /fil/article/* → /fil/articles/*
  // Supports 2-3 letter locale codes (ar, he, fil, etc.)
  const articleSingularMatch = path.match(/^(\/[a-z]{2,3})?\/article\/(.+)$/);
  if (articleSingularMatch) {
    const localePrefix = articleSingularMatch[1] || '';
    const articleSlug = articleSingularMatch[2];
    const newPath = `${localePrefix}/articles/${articleSlug}`;
    const queryString = Object.keys(req.query).length 
      ? '?' + new URLSearchParams(req.query as Record<string, string>).toString() 
      : '';
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

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
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
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// SEO INFRASTRUCTURE ROUTES - Must be registered FIRST before any middleware
// These are critical SEO endpoints that must NEVER be hijacked by SPA fallback
// ============================================================================
app.get('/sitemap', async (_req, res) => {
  try {
    // Fetch live destinations with failsafe
    let liveDestinations: { id: string; name: string; slug: string }[] = [];
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
      console.error("[Sitemap] Database fetch failed, returning empty destinations:", dbError);
      // Continue with empty destinations - never fail
    }

    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : "https://travi.travel";

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
      ${liveDestinations.length > 0 
        ? liveDestinations.map(d => `<li><a href="${baseUrl}${d.slug}">${d.name}</a></li>`).join('\n      ')
        : '<li>Loading destinations...</li>'}
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

    res.status(200).set({ 
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }).end(html);
  } catch (error) {
    // Ultimate failsafe - always return valid HTML, never 404
    console.error("[Sitemap] Critical error, returning minimal sitemap:", error);
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
const port = parseInt(process.env.PORT || "5000", 10);

// Security: Set server timeouts to prevent slow loris attacks
httpServer.timeout = 120000;        // 2 minutes for complete request
httpServer.keepAliveTimeout = 65000; // Keep alive timeout
httpServer.headersTimeout = 66000;   // Headers timeout (must be > keepAliveTimeout)

// Start listening IMMEDIATELY - this allows health checks to pass
httpServer.listen(
  {
    port,
    host: "0.0.0.0",
    reusePort: true,
  },
  () => {
    log(`[EARLY-LISTEN] Server listening on port ${port} - health checks will pass`, "server");
    log(`[EARLY-LISTEN] Starting background initialization...`, "server");
    
    // Now do all the heavy initialization in the background
    initializeServer().catch((err) => {
      log(`[CRITICAL] Server initialization failed: ${err}`, "error");
      console.error(err);
    });
  },
);

// Heavy initialization function - runs AFTER server is listening
async function initializeServer() {
  const initStart = Date.now();
  
  try {
    // Register all routes (heavy operation)
    await registerRoutes(httpServer, app);

    // Global error handler middleware
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      log(`Error: ${err.message || 'Unknown error'} - ${req.method} ${req.path}`, 'error');
      if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
      }

      if (err.name === 'ZodError' && err.errors) {
        return res.status(400).json({
          error: 'Validation Error',
          details: err.errors.map((e: any) => ({
            field: e.path?.join('.') || 'unknown',
            message: e.message
          }))
        });
      }

      if (err.isOperational) {
        return res.status(err.statusCode || err.status || 400).json({
          error: err.message
        });
      }

      const status = err.status || err.statusCode || 500;
      const message = process.env.NODE_ENV === 'production' && status === 500
        ? 'Internal Server Error'
        : err.message || 'Internal Server Error';

      res.status(status).json({ error: message });
    });

    // API catch-all: Return JSON 404 for unmatched /api/* routes
    app.all('/api/*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `API endpoint ${req.method} ${req.path} does not exist`,
        _meta: { apiVersion: 'v1' }
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
    if (process.env.RUN_PROD_SEED === 'true') {
      log("[ProdSeed] Starting background database seeding...", "server");
      runProductionSeed().then(() => {
        log("[ProdSeed] Background seeding completed successfully", "server");
      }).catch((err) => {
        log(`[ProdSeed] Background seeding failed: ${err}`, "server");
      });
    }
    
    startTiqetsBackgroundGenerator();
    log("[TiqetsBackground] Content generation automation ENABLED", "server");
    
    registerOctypoJobHandler();
    log("[OctypoV2] Content generation job handler registered", "server");
    
    import("./scripts/publish-articles").then(({ publishAllArticles }) => {
      publishAllArticles().then((result) => {
        if (result.articles > 0 || result.hotels > 0) {
          log(`[AutoPublish] Published ${result.articles} articles, ${result.hotels} hotels`, "server");
        }
      }).catch((err) => {
        log(`[AutoPublish] Error: ${err}`, "server");
      });
    });

    initializeFoundationEvents();
    
  } catch (error) {
    log(`[INIT-ERROR] ${error}`, "error");
    throw error;
  }
}

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  log(`${signal} received. Starting graceful shutdown...`, "server");
  
  stopTiqetsBackgroundGenerator();
  log("[TiqetsBackground] Background generator stopped", "server");

  httpServer.close(() => {
    log("HTTP server closed", "server");
  });

  setTimeout(() => {
    log("Forcing shutdown after timeout", "server");
    process.exit(0);
  }, 10000);

  try {
    const { pool } = await import("./db");
    await pool.end();
    log("Database pool closed", "server");
  } catch (error) {
    log(`Error closing database pool: ${error}`, "server");
  }

  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

/**
 * Enterprise Security Layer
 *
 * Centralized security module providing:
 * - Rate limiting
 * - Helmet security headers
 * - Attack detection (SQL injection, XSS)
 * - Request validation
 * - Comprehensive security middleware setup
 */

import helmet from "helmet";
import type { Express, Request, Response, NextFunction } from "express";
import { abuseDetectionMiddleware } from "./abuse-detection";
import { initializeSessionSecrets, logRotationStatus } from "./key-rotation";

// ============================================================================
// INPUT VALIDATION - Inlined from validators.ts
// ============================================================================

/**
 * SQL Injection Pattern Detection
 * Returns true if suspicious SQL patterns are detected
 */
function detectSqlInjection(input: string): boolean {
  if (!input) return false;

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s+\d+\s*=\s*\d+)/gi,
    /(--|#|\/\*|\*\/)/g,
    /(\bxp_\w+\b)/gi,
    /(\bsp_\w+\b)/gi,
    /('\s*OR\s*'?\d+'?\s*=\s*'?\d+'?)/gi,
    /('\s*;)/gi,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * XSS Pattern Detection
 * Returns true if suspicious XSS patterns are detected
 */
function detectXss(input: string): boolean {
  if (!input) return false;

  const xssPatterns = [
    // Match script tags with any whitespace before closing >
    /<script\b[^<]*(?:(?!<\/script[\s>])<[^<]*)*<\/script[\s>]/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick, onerror
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<img[^>]*on\w+/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Log security event (simplified - just console log)
 */
function logSecurityEvent(type: string, details: Record<string, unknown>) {
  /* empty */
}

/**
 * Attack detection middleware
 * Detects and blocks SQL injection and XSS attempts
 */
export function attackDetectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const checkData = (data: unknown, path: string = ""): boolean => {
    if (typeof data === "string") {
      // Check for SQL injection
      if (detectSqlInjection(data)) {
        logSecurityEvent("SQL_INJECTION_ATTEMPT", {
          path: req.path,
          method: req.method,
          field: path,
          ip: req.ip,
        });
        return false;
      }

      // Check for XSS
      if (detectXss(data)) {
        logSecurityEvent("XSS_ATTEMPT", {
          path: req.path,
          method: req.method,
          field: path,
          ip: req.ip,
        });
        return false;
      }
    } else if (typeof data === "object" && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (!checkData(value, path ? `${path}.${key}` : key)) {
          return false;
        }
      }
    }
    return true;
  };

  // Check body
  if (req.body && !checkData(req.body, "body")) {
    return res.status(400).json({
      error: "Request contains potentially malicious content",
      code: "ATTACK_DETECTED",
    });
  }

  // Check query parameters
  if (req.query && !checkData(req.query, "query")) {
    return res.status(400).json({
      error: "Request contains potentially malicious content",
      code: "ATTACK_DETECTED",
    });
  }

  // Check URL parameters
  if (req.params && !checkData(req.params, "params")) {
    return res.status(400).json({
      error: "Request contains potentially malicious content",
      code: "ATTACK_DETECTED",
    });
  }

  next();
}

// ============================================================================
// CSP CONFIGURATION
// ============================================================================
// Production: strict CSP (no unsafe-inline/unsafe-eval for scripts)
// Development: relaxed CSP (allows Vite HMR, inline scripts)
// Override with STRICT_CSP=false in production to temporarily relax
const isProduction = process.env.NODE_ENV === "production";
const STRICT_CSP =
  process.env.STRICT_CSP !== undefined ? process.env.STRICT_CSP === "true" : isProduction;

/**
 * Setup security middleware on Express app
 */
export function setupSecurityMiddleware(app: Express): void {
  // ============================================================================
  // CSP DIRECTIVE EXPLANATIONS
  // ============================================================================
  // Each CSP exception is documented below with justification:
  //
  // script-src exceptions:
  //   'unsafe-inline' - Required for Vite HMR, React inline event handlers, styled-components
  //   'unsafe-eval'   - Required for Vite dev server hot module replacement
  //   replit.com      - Replit platform integration scripts
  //   googletagmanager.com - Google Tag Manager for GDPR-compliant analytics
  //   google-analytics.com - Google Analytics tracking
  //   emrld.ltd       - Travelpayouts affiliate verification script (required for affiliate program)
  //
  // style-src exceptions:
  //   'unsafe-inline' - Required for styled-components, Radix UI, Tailwind dynamic styles
  //   fonts.googleapis.com - Google Fonts stylesheets
  //   fonts.cdnfonts.com   - CDN fonts (Satoshi, Chillax)
  //
  // connect-src exceptions:
  //   *.replit.dev/app - Replit preview/deployment domains
  //   api.deepl.com    - DeepL translation API
  //   api.openai.com   - OpenAI API for content generation
  //   generativelanguage.googleapis.com - Google Gemini API
  //   openrouter.ai    - OpenRouter AI gateway
  //   images.unsplash.com - Stock image provider
  //   google-analytics.com - Analytics data collection
  //   emrld.ltd        - Travelpayouts affiliate tracking
  //   wss:             - WebSocket connections for real-time features
  //
  // frame-src:
  //   'self'           - Only allow iframes from same origin
  //   googletagmanager.com - GTM preview/debug mode requires iframe
  // ============================================================================

  // Build script-src based on STRICT_CSP mode
  // PostHog domains: us.i.posthog.com (ingestion), us-assets.i.posthog.com (assets)
  // Common script sources shared by both modes
  const commonScriptSrc = [
    "'self'",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://emrld.ltd", // Travelpayouts affiliate verification
    "https://*.emrld.ltd", // Travelpayouts subdomains
    "https://us-assets.i.posthog.com", // PostHog analytics assets
    "https://us.i.posthog.com", // PostHog analytics
    "https://static.cloudflareinsights.com", // Cloudflare Web Analytics
  ];

  // DEFERRED: Removing 'unsafe-inline' from script-src requires externalizing
  // inline scripts in client/index.html (SW cleanup IIFE and Travelpayouts loader)
  // to external .js files loaded with defer. Until then, 'unsafe-inline' remains
  // required in both modes to avoid breaking those scripts.
  const scriptSrcDirective = STRICT_CSP
    ? [
        ...commonScriptSrc,
        "'unsafe-inline'", // TEMPORARY: required for inline scripts in index.html (SW cleanup, Travelpayouts)
        // 'unsafe-eval' is intentionally excluded in production for security
      ]
    : [
        ...commonScriptSrc,
        "'unsafe-inline'", // Required: Vite HMR, React inline handlers, index.html inline scripts
        "'unsafe-eval'", // Required: Vite dev server hot module replacement
      ];

  // Helmet - Security headers
  // NOTE: HSTS is intentionally DISABLED here because Cloudflare CDN (in front of this app)
  // already sets Strict-Transport-Security: max-age=63072000; includeSubDomains; preload.
  // Enabling helmet's HSTS would create duplicate headers with potentially conflicting
  // max-age values, which browsers may handle unpredictably. Cloudflare's HSTS config
  // is managed via their dashboard at the DNS/CDN layer.
  app.use(
    helmet({
      // HSTS disabled - Cloudflare handles this (see comment above)
      strictTransportSecurity: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: scriptSrcDirective,
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required: styled-components, Radix UI, Tailwind dynamic styles
            "https://fonts.googleapis.com",
            "https://fonts.cdnfonts.com",
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
            "https://fonts.cdnfonts.com",
            "data:", // Base64 encoded fonts
          ],
          imgSrc: [
            "'self'",
            "data:", // Base64 images, SVG data URIs
            "blob:", // Canvas/generated images
            "https:", // All HTTPS images (required for user-uploaded content)
            "http:", // Legacy image support (should migrate to HTTPS)
          ],
          connectSrc: [
            "'self'",
            "https://travi.world",
            "https://www.travi.world",
            "https://travi.travel",
            "https://www.travi.travel",
            "https://api.deepl.com",
            "https://api.openai.com",
            "https://api.anthropic.com", // Anthropic AI API
            "https://generativelanguage.googleapis.com",
            "https://openrouter.ai",
            "https://images.unsplash.com",
            "https://www.google-analytics.com",
            "https://api.tiqets.com", // Tiqets ticket API
            "https://emrld.ltd", // Travelpayouts affiliate tracking
            "https://*.emrld.ltd", // Travelpayouts subdomains
            "https://us.i.posthog.com", // PostHog analytics ingestion
            "https://us-assets.i.posthog.com", // PostHog assets
            "https://static.cloudflareinsights.com", // Cloudflare Web Analytics beacon POST
            "wss:", // WebSocket connections
          ],
          // Explicit frame-src - controls what can be loaded in iframes
          frameSrc: [
            "'self'",
            "https://www.googletagmanager.com", // GTM preview/debug mode
            "https://www.youtube.com", // YouTube video embeds
            "https://www.youtube-nocookie.com", // YouTube privacy-enhanced embeds
            "https://player.vimeo.com", // Vimeo video embeds
            "https://www.google.com", // Google Maps embeds
          ],
          frameAncestors: ["'self'"], // Prevents clickjacking - only allow embedding from same origin
          formAction: ["'self'"], // Forms can only submit to same origin
          baseUri: ["'self'"], // Prevents base tag injection attacks
        },
      },
      crossOriginEmbedderPolicy: false, // Required for third-party services (fonts, images)
      crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
    })
  );

  // Additional security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    next();
  });

  // Cache headers for static assets
  // Long-lived immutable cache for fingerprinted assets (JS, CSS, fonts, images)
  // No-cache for HTML to ensure fresh content on every navigation
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.match(/\.(js|css|woff2|woff|ttf|png|jpg|jpeg|webp|svg|ico)$/)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else if (req.path.endsWith(".html") || req.path === "/") {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    }
    next();
  });

  // Attack detection - Apply to all routes
  app.use(attackDetectionMiddleware);

  // Abuse detection middleware - tracks suspicious patterns
  app.use(abuseDetectionMiddleware);

  // Initialize key rotation tracking
  try {
    initializeSessionSecrets();
    logRotationStatus();
  } catch (err) {
    console.error("Session secret initialization error:", err);
  }
}

// ============================================================================
// ACTIVE SECURITY MODULES
// ============================================================================

// --- Audit Logger ---
// Comprehensive security event logging with severity levels and PII masking
export * from "./audit-logger";

// --- Password Policy ---
// Password strength validation, zxcvbn scoring, dual lockout (IP + username)
export * from "./password-policy";

// --- Rate Limiter ---
// Configurable rate limiters for login, API, AI, and write operations
export * from "./rate-limiter";

// --- File Upload Security ---
// Magic bytes validation, MIME type verification, malicious content detection
export * from "./file-upload";

// --- Admin Hardening ---
// Kill switch, IP allowlist, mandatory 2FA, unified auth guards
export * from "./admin-hardening";

// --- Pre-Auth Token ---
// Short-lived HMAC-signed tokens for MFA flow (no session before TOTP)
export * from "./pre-auth-token";

// --- Key Rotation ---
// Secure key rotation for session secrets, JWT tokens, API keys
export * from "./key-rotation";

// --- Abuse Detection ---
// Comprehensive abuse pattern detection with IP reputation scoring
export * from "./abuse-detection";

// ============================================================================
// SECURITY AUTHORITY (Highest Authority Layer)
// ============================================================================
// Feature flag: ENABLE_SECURITY_AUTHORITY
// All critical actions must pass through SecurityGate
// Security Authority is ABOVE Data, SEO, Ops, and Autonomy systems

// --- Security Authority ---
// Global enforcement hook, security modes, override registry, evidence generator
export * from "./authority";

// --- Security Adapters ---
// Cross-system threat propagation (Data, SEO, Ops, Autonomy, Users)
export * from "./adapters";
// SECURITY OPERATING SYSTEM (SecurityOS)
// ============================================================================
// Enterprise-grade security layer with fail-closed architecture

// --- Security Kernel ---
// Fail-closed core with threat levels and bypass detection
// Note: SecurityMode, ThreatLevel, getSecurityMode, setSecurityMode already exported from ./authority
export {
  initSecurityKernel,
  isSecurityInitialized,
  getThreatLevel,
  setThreatLevel,
  triggerLockdown,
  shouldAllow,
  recordViolation,
  recordBlock,
  getKernelStatus,
  verifyKernelIntegrity,
  detectBypassAttempt,
  onThreatLevelChange,
} from "./core/security-kernel";

// --- RBAC Enforcer ---
// Complete role-permission matrix with fail-closed middleware
export * from "./rbac/enforcer";

// --- Policy Linting & Simulation ---
// Detect conflicts, shadows, and simulate policy changes
export * from "./policy/policy-linter";
export * from "./policy/policy-simulator";

// --- Approval Safety ---
// Prevent self-approval, circular chains, and rubber-stamping
export * from "./approvals/approval-safety";

// --- Security Intelligence ---
// Real-time correlation, anomaly detection, and threat scoring
export * from "./intelligence/security-intelligence";

// --- Exfiltration Prevention ---
// Rate limits, access tracking, and data export guards
export * from "./exfiltration/exfiltration-guard";

// --- Compliance Evidence ---
// SOC2, ISO27001, GDPR evidence generation with chain integrity
// Note: EvidenceType already exported from ./authority
export {
  generateEvidence,
  generateComplianceReport,
  exportEvidencePackage,
  verifyEvidenceChain,
  evidenceGenerator,
} from "./compliance/evidence-generator";

// --- Drift Detection ---
// Continuous security configuration monitoring
export * from "./drift/drift-scanner";

// --- Security Modes ---
// Autonomous monitor/enforce/lockdown mode management
// Note: SecurityMode, getSecurityMode, setSecurityMode already exported from ./authority or ./core/security-kernel
// Note: ThreatFactor already exported from ./intelligence/security-intelligence
export {
  startAutoModeMonitoring,
  getModeConfiguration,
  isOperationAllowed,
  modeCheckMiddleware,
  securityModeManager,
} from "./modes/security-modes";

// --- Executive Dashboard ---
// Real-time security posture and threat status API
export { securityDashboardRouter } from "./api/security-dashboard";

// ============================================================================
// GLOBAL SECURITY AUTHORITY (Phase 2)
// ============================================================================
// Security is the highest authority - above Data, SEO, Ops, Autonomy

// --- Security Gate ---
// Single enforcement point for ALL critical actions
// Note: SecurityGateError already exported from ./authority
export {
  securityGateMiddleware,
  requiresSecurityGate,
  getGateStatistics,
  resetGateStatistics,
} from "./gate/security-gate";

// --- Autonomy Controller ---
// Security mode integration with all autopilot systems
// Note: AutonomyImpact already exported from ./authority
export { autonomyController, autonomyRouter } from "./autonomy/autonomy-controller";

// --- Override Registry ---
// Centralized, auditable security override management
// Note: OverrideRequest, OverrideType already exported from ./authority
export { overrideRegistry, overrideRouter } from "./overrides/override-registry";

// --- Threat Propagator ---
// Cross-system threat response coordination
// Note: SystemAdapter already exported from ./authority
export {
  threatPropagator,
  propagateThreat,
  propagateAnomaly,
  propagateHighRiskUser,
  registerThreatAdapter,
  getThreatAdapterStatuses,
} from "./adapters/threat-propagator";

// --- Unified Evidence ---
// Automatic compliance evidence from all systems
export * from "./compliance/unified-evidence";

// ============================================================================
// SECURITY OS INITIALIZATION
// ============================================================================

import { initSecurityKernel, isSecurityInitialized } from "./core/security-kernel";
import { detectRBACBypass } from "./rbac/enforcer";
import { startAutoModeMonitoring, getSecurityMode } from "./modes/security-modes";
import { startDriftMonitoring, captureBaseline } from "./drift/drift-scanner";
import { logAdminEvent } from "../governance/security-logger";

// Note: autonomyRouter and overrideRouter already exported above

export interface SecurityOSConfig {
  enableAutoMode?: boolean;
  autoModeIntervalMs?: number;
  enableDriftMonitoring?: boolean;
  driftIntervalMs?: number;
  captureInitialBaseline?: boolean;
}

let securityOSInitialized = false;

/**
 * Initialize the Security Operating System
 * CRITICAL: Call this before handling any requests
 */
export async function initSecurityOS(config: SecurityOSConfig = {}): Promise<void> {
  if (securityOSInitialized) {
    return;
  }

  const startTime = Date.now();

  // Initialize security kernel (fail-closed)
  initSecurityKernel();

  // Detect RBAC bypass attempts
  detectRBACBypass();

  // Start auto-mode monitoring
  if (config.enableAutoMode !== false) {
    startAutoModeMonitoring(config.autoModeIntervalMs || 60000);
  }

  // Start drift monitoring
  if (config.enableDriftMonitoring !== false) {
    if (config.captureInitialBaseline) {
      try {
        await captureBaseline("Initial Baseline", "system");
      } catch (error) {
        /* ignored */
      }
    }

    startDriftMonitoring(config.driftIntervalMs || 300000);
  }

  securityOSInitialized = true;
  const elapsed = Date.now() - startTime;

  logAdminEvent("system", "SECURITY_OS_INITIALIZED", "security", "system", {
    mode: getSecurityMode(),
    elapsed,
  });
}

/**
 * Check if SecurityOS is fully initialized
 */
export function isSecurityOSInitialized(): boolean {
  return securityOSInitialized && isSecurityInitialized();
}

/**
 * Get SecurityOS status
 */
export function getSecurityOSStatus(): {
  initialized: boolean;
  mode: string;
  kernelReady: boolean;
} {
  return {
    initialized: securityOSInitialized,
    mode: getSecurityMode(),
    kernelReady: isSecurityInitialized(),
  };
}

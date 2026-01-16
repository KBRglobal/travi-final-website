import type { Express } from "express";
import { registerAuthRoutes } from "./auth-routes";
import { registerContentRoutes } from "./content-routes";
import { registerAnalyticsRoutes } from "./analytics-routes";
import { registerNewsletterRoutes } from "./newsletter-routes";

/**
 * Main router registry that coordinates all domain-specific route modules.
 *
 * This file serves as a single entry point for registering all application routes,
 * organized by business domain for better maintainability and code organization.
 *
 * Domain route modules:
 * - auth-routes: Authentication, TOTP 2FA, and security endpoints
 * - content-routes: Content CRUD operations and public content APIs
 * - analytics-routes: Metrics, performance tracking, and statistics
 * - newsletter-routes: Newsletter subscriptions, campaigns, and management
 *
 * Usage:
 * import { registerAllRoutes } from "./routes";
 * registerAllRoutes(app);
 */

export async function registerAllRoutes(app: Express): Promise<void> {
  console.log("[Routes] Registering domain-based route modules...");

  // Authentication and security routes
  // Handles: login, logout, TOTP 2FA, device management, session security
  registerAuthRoutes(app);
  console.log("[Routes] ✓ Auth routes registered");

  // Content management routes
  // Handles: Content CRUD, public APIs, translations, versions
  registerContentRoutes(app);
  console.log("[Routes] ✓ Content routes registered");

  // Analytics and metrics routes
  // Handles: Stats, content metrics, performance tracking
  await registerAnalyticsRoutes(app);
  console.log("[Routes] ✓ Analytics routes registered");

  // Newsletter routes
  // Handles: Subscriptions, campaigns, A/B testing
  registerNewsletterRoutes(app);
  console.log("[Routes] ✓ Newsletter routes registered");

  console.log("[Routes] All domain route modules registered successfully");
}

// Export individual registrars for selective usage
export {
  registerAuthRoutes,
  registerContentRoutes,
  registerAnalyticsRoutes,
  registerNewsletterRoutes,
};

/**
 * Foundation Bootstrap
 * Phase 1 Foundation: Minimal wiring for foundation infrastructure
 *
 * This module provides a single entry point to bootstrap all foundation
 * components without breaking existing functionality.
 *
 * Usage in server/index.ts:
 *   import { bootstrapFoundation } from './foundation';
 *   bootstrapFoundation(app);
 */

import type { Express } from "express";
import { createLogger } from "../lib/logger";
import { correlationIdMiddleware } from "../shared/middleware/correlation-id";
import { foundationErrorHandler } from "../shared/middleware/error-handler";
import { registerAllDomains } from "../domains";
import { foundationEventBus } from "../shared/events";

const logger = createLogger("foundation");

// Master feature flag - everything is OFF by default
const ENABLE_FOUNDATION = process.env.ENABLE_FOUNDATION === "true";

/**
 * Foundation configuration
 */
export interface FoundationConfig {
  /** Enable correlation ID middleware */
  enableCorrelationId?: boolean;
  /** Enable foundation error handler */
  enableErrorHandler?: boolean;
  /** Enable domain routes */
  enableDomains?: boolean;
}

/**
 * Bootstrap foundation middleware (early in middleware chain)
 * Should be called BEFORE route registration
 */
export function bootstrapFoundationMiddleware(app: Express): void {
  if (!ENABLE_FOUNDATION) {
    logger.debug("Foundation disabled - skipping middleware bootstrap");
    return;
  }

  // Add correlation ID middleware (must be early)
  app.use(correlationIdMiddleware);

  logger.info("Foundation middleware bootstrapped");
}

/**
 * Bootstrap foundation domains and routes
 * Should be called DURING route registration
 */
export function bootstrapFoundationDomains(app: Express): void {
  if (!ENABLE_FOUNDATION) {
    logger.debug("Foundation disabled - skipping domain registration");
    return;
  }

  registerAllDomains(app);

  logger.info("Foundation domains registered");
}

/**
 * Bootstrap foundation error handler
 * Should be called AFTER all routes are registered (last middleware)
 */
export function bootstrapFoundationErrorHandler(app: Express): void {
  if (!ENABLE_FOUNDATION) {
    logger.debug("Foundation disabled - skipping error handler");
    return;
  }

  app.use(foundationErrorHandler());

  logger.info("Foundation error handler registered");
}

/**
 * Initialize foundation event bus and subscribers
 * Should be called AFTER server starts listening
 */
export function initializeFoundationEvents(): void {
  if (!ENABLE_FOUNDATION) {
    logger.debug("Foundation disabled - skipping event initialization");
    return;
  }

  const stats = foundationEventBus.getStats();
  logger.info({ ...stats }, "Foundation event bus initialized");
}

/**
 * Full bootstrap (convenience wrapper)
 * NOTE: Error handler should still be added separately after routes
 */
export function bootstrapFoundation(app: Express): {
  addErrorHandler: () => void;
  initializeEvents: () => void;
} {
  bootstrapFoundationMiddleware(app);
  bootstrapFoundationDomains(app);

  return {
    addErrorHandler: () => bootstrapFoundationErrorHandler(app),
    initializeEvents: () => initializeFoundationEvents(),
  };
}

/**
 * Get foundation status
 */
export function getFoundationStatus(): {
  enabled: boolean;
  eventBus: ReturnType<typeof foundationEventBus.getStats>;
  domains: string[];
} {
  return {
    enabled: ENABLE_FOUNDATION,
    eventBus: foundationEventBus.getStats(),
    domains: [], // Will be populated when domains are enabled
  };
}

/**
 * Content Domain
 * Phase 1 Foundation: Domain skeleton for content management
 *
 * This domain will handle:
 * - Articles, Pages, Media assets
 * - Content lifecycle (draft → published → archived)
 * - Content versioning
 */

import type { Express, Router } from 'express';
import { Router as createRouter } from 'express';

// Feature flag - domain is OFF by default
const ENABLE_CONTENT_DOMAIN = process.env.ENABLE_DOMAIN_CONTENT === 'true';

/**
 * Content domain router
 * Placeholder - routes will be migrated here in Phase 2
 */
export function createContentRouter(): Router {
  const router = createRouter();

  // Placeholder route for testing domain wiring
  router.get('/_domain/health', (_req, res) => {
    res.json({
      domain: 'content',
      enabled: ENABLE_CONTENT_DOMAIN,
      status: 'skeleton',
    });
  });

  return router;
}

/**
 * Register content domain routes
 * Called from main router during bootstrap
 */
export function registerContentDomain(app: Express): void {
  if (!ENABLE_CONTENT_DOMAIN) {
    return;
  }

  const router = createContentRouter();
  app.use('/api/domains/content', router);
}

/**
 * Domain metadata for discovery
 */
export const contentDomainInfo = {
  name: 'content',
  description: 'Content management domain (articles, pages, media)',
  enabled: ENABLE_CONTENT_DOMAIN,
  routes: {
    base: '/api/domains/content',
  },
};

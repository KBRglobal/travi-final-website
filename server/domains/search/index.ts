/**
 * Search Domain
 * Phase 1 Foundation: Domain skeleton for search functionality
 *
 * This domain will handle:
 * - Full-text search
 * - Search indexing
 * - Search suggestions and autocomplete
 */

import type { Express, Router } from 'express';
import { Router as createRouter } from 'express';

// Feature flag - domain is OFF by default
const ENABLE_SEARCH_DOMAIN = process.env.ENABLE_DOMAIN_SEARCH === 'true';

/**
 * Search domain router
 */
export function createSearchRouter(): Router {
  const router = createRouter();

  router.get('/_domain/health', (_req, res) => {
    res.json({
      domain: 'search',
      enabled: ENABLE_SEARCH_DOMAIN,
      status: 'skeleton',
    });
  });

  return router;
}

/**
 * Register search domain routes
 */
export function registerSearchDomain(app: Express): void {
  if (!ENABLE_SEARCH_DOMAIN) {
    return;
  }

  const router = createSearchRouter();
  app.use('/api/domains/search', router);
}

export const searchDomainInfo = {
  name: 'search',
  description: 'Search and indexing domain',
  enabled: ENABLE_SEARCH_DOMAIN,
  routes: {
    base: '/api/domains/search',
  },
};

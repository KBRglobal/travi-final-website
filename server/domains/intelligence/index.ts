/**
 * Intelligence Domain
 * Phase 1 Foundation: Domain skeleton for AI/ML features
 *
 * This domain will handle:
 * - AEO (Answer Engine Optimization)
 * - AI-powered content generation
 * - Analytics and insights
 */

import type { Express, Router } from 'express';
import { Router as createRouter } from 'express';

// Feature flag - domain is OFF by default
const ENABLE_INTELLIGENCE_DOMAIN = process.env.ENABLE_DOMAIN_INTELLIGENCE === 'true';

/**
 * Intelligence domain router
 */
export function createIntelligenceRouter(): Router {
  const router = createRouter();

  router.get('/_domain/health', (_req, res) => {
    res.json({
      domain: 'intelligence',
      enabled: ENABLE_INTELLIGENCE_DOMAIN,
      status: 'skeleton',
    });
  });

  return router;
}

/**
 * Register intelligence domain routes
 */
export function registerIntelligenceDomain(app: Express): void {
  if (!ENABLE_INTELLIGENCE_DOMAIN) {
    return;
  }

  const router = createIntelligenceRouter();
  app.use('/api/domains/intelligence', router);
}

export const intelligenceDomainInfo = {
  name: 'intelligence',
  description: 'AI/ML domain (AEO, analytics, insights)',
  enabled: ENABLE_INTELLIGENCE_DOMAIN,
  routes: {
    base: '/api/domains/intelligence',
  },
};

/**
 * Media Domain
 * Phase 1 Foundation: Domain skeleton for media management
 *
 * This domain will handle:
 * - Image upload and processing
 * - File storage
 * - Media optimization
 */

import type { Express, Router } from 'express';
import { Router as createRouter } from 'express';

// Feature flag - domain is OFF by default
const ENABLE_MEDIA_DOMAIN = process.env.ENABLE_DOMAIN_MEDIA === 'true';

/**
 * Media domain router
 */
export function createMediaRouter(): Router {
  const router = createRouter();

  router.get('/_domain/health', (_req, res) => {
    res.json({
      domain: 'media',
      enabled: ENABLE_MEDIA_DOMAIN,
      status: 'skeleton',
    });
  });

  return router;
}

/**
 * Register media domain routes
 */
export function registerMediaDomain(app: Express): void {
  if (!ENABLE_MEDIA_DOMAIN) {
    return;
  }

  const router = createMediaRouter();
  app.use('/api/domains/media', router);
}

export const mediaDomainInfo = {
  name: 'media',
  description: 'Media management domain (images, files)',
  enabled: ENABLE_MEDIA_DOMAIN,
  routes: {
    base: '/api/domains/media',
  },
};

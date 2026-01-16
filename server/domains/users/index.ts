/**
 * Users Domain
 * Phase 1 Foundation: Domain skeleton for user management
 *
 * This domain will handle:
 * - Authentication
 * - Authorization and roles
 * - User profiles
 * - Permissions
 */

import type { Express, Router } from 'express';
import { Router as createRouter } from 'express';

// Feature flag - domain is OFF by default
const ENABLE_USERS_DOMAIN = process.env.ENABLE_DOMAIN_USERS === 'true';

/**
 * Users domain router
 */
export function createUsersRouter(): Router {
  const router = createRouter();

  router.get('/_domain/health', (_req, res) => {
    res.json({
      domain: 'users',
      enabled: ENABLE_USERS_DOMAIN,
      status: 'skeleton',
    });
  });

  return router;
}

/**
 * Register users domain routes
 */
export function registerUsersDomain(app: Express): void {
  if (!ENABLE_USERS_DOMAIN) {
    return;
  }

  const router = createUsersRouter();
  app.use('/api/domains/users', router);
}

export const usersDomainInfo = {
  name: 'users',
  description: 'User management domain (auth, roles, permissions)',
  enabled: ENABLE_USERS_DOMAIN,
  routes: {
    base: '/api/domains/users',
  },
};

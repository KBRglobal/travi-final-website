/**
 * Help Center - Module Exports
 *
 * Feature flag: ENABLE_HELP_CENTER=true
 */

// Types
export * from './types';

// Service (business logic)
export * as helpService from './help-service';

// Routes
export { default as helpAdminRoutes } from './admin-routes';
export { default as helpPublicRoutes } from './public-routes';

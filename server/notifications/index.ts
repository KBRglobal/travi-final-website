/**
 * User & Content Notification System
 *
 * Notifies admins/editors when important events happen.
 *
 * Feature flag: ENABLE_NOTIFICATIONS=false
 */

export * from './types';
export * from './service';
export { default as notificationRoutes } from './routes';

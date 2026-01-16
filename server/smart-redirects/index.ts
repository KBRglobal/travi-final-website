/**
 * Smart Redirects & URL Lifecycle Manager
 *
 * Feature flag: ENABLE_SMART_REDIRECTS=true
 */

export { isSmartRedirectsEnabled } from './types';
export type {
  RedirectType,
  RedirectRule,
  UrlChangeEvent,
  RedirectMatch,
  RedirectChain,
  RedirectStats,
  BulkImportResult,
} from './types';

export {
  createRedirect,
  getRedirect,
  updateRedirect,
  deleteRedirect,
  matchRedirect,
  findRedirectChain,
  recordUrlChange,
  getAllRedirects,
  findChainsAndLoops,
  getRedirectStats,
  bulkImport,
  exportRedirects,
  getUrlChangeHistory,
  cleanupExpired,
} from './redirect-manager';

export { smartRedirectsRoutes } from './routes';

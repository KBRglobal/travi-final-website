/**
 * Domains Registry
 * Phase 1 Foundation: Central registry for all domain modules
 *
 * Each domain exports:
 * - registerXDomain(app) - Registers domain routes
 * - xDomainInfo - Domain metadata
 */

import type { Express } from 'express';

import { registerContentDomain, contentDomainInfo } from './content';
import { registerSearchDomain, searchDomainInfo } from './search';
import { registerMediaDomain, mediaDomainInfo } from './media';
import { registerUsersDomain, usersDomainInfo } from './users';
import { registerIntelligenceDomain, intelligenceDomainInfo } from './intelligence';
import { registerSystemDomain, systemDomainInfo } from './system';

// Feature flag - foundation domains are OFF by default
const ENABLE_FOUNDATION_DOMAINS = process.env.ENABLE_FOUNDATION_DOMAINS === 'true';

/**
 * All domain metadata
 */
export const domains = {
  content: contentDomainInfo,
  search: searchDomainInfo,
  media: mediaDomainInfo,
  users: usersDomainInfo,
  intelligence: intelligenceDomainInfo,
  system: systemDomainInfo,
};

/**
 * Register all domain routes
 * Called during app bootstrap
 */
export function registerAllDomains(app: Express): void {
  if (!ENABLE_FOUNDATION_DOMAINS) {
    return;
  }

  // Register each domain (each has its own feature flag)
  registerContentDomain(app);
  registerSearchDomain(app);
  registerMediaDomain(app);
  registerUsersDomain(app);
  registerIntelligenceDomain(app);
  registerSystemDomain(app);
}

/**
 * Get list of enabled domains
 */
export function getEnabledDomains(): string[] {
  return Object.entries(domains)
    .filter(([_, info]) => info.enabled)
    .map(([name]) => name);
}

/**
 * Get domain info by name
 */
export function getDomainInfo(name: string): typeof domains[keyof typeof domains] | undefined {
  return domains[name as keyof typeof domains];
}

// Re-export individual domain registrations for granular control
export { registerContentDomain } from './content';
export { registerSearchDomain } from './search';
export { registerMediaDomain } from './media';
export { registerUsersDomain } from './users';
export { registerIntelligenceDomain } from './intelligence';
export { registerSystemDomain } from './system';

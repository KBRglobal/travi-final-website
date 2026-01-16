/**
 * Go-Live Control Plane - Capability Registry
 *
 * Discovers and tracks all platform capabilities
 */

import {
  Capability,
  CapabilityDomain,
  CapabilityGroup,
  CapabilitySnapshot,
  CapabilityStatus,
  RiskLevel,
  KNOWN_FEATURE_FLAGS,
} from './types';

// Bounded capability store
const MAX_CAPABILITIES = 500;
const capabilities = new Map<string, Capability>();
let lastSnapshot: CapabilitySnapshot | null = null;

/**
 * Derive capability ID from flag name
 */
function flagToCapabilityId(flag: string): string {
  return flag.toLowerCase().replace(/_/g, '-');
}

/**
 * Check if a flag is enabled in environment
 */
function isFlagEnabled(flagName: string): boolean {
  return process.env[flagName] === 'true';
}

/**
 * Discover capabilities from known flags
 */
export function discoverCapabilities(): Capability[] {
  const discovered: Capability[] = [];

  for (const flagDef of KNOWN_FEATURE_FLAGS) {
    const id = flagToCapabilityId(flagDef.flag);
    const enabled = isFlagEnabled(flagDef.flag);

    const capability: Capability = {
      id,
      name: flagDef.name,
      description: `Capability controlled by ${flagDef.flag}`,
      flagName: flagDef.flag,
      domain: flagDef.domain,
      status: enabled ? 'enabled' : 'disabled',
      riskLevel: flagDef.riskLevel,
      blastRadius: flagDef.blastRadius,
      dependencies: flagDef.dependencies.map(flagToCapabilityId),
      dependents: [], // Will be computed
      requiredEnvVars: [flagDef.flag],
      requiredServices: [],
      enabledAt: enabled ? new Date() : undefined,
    };

    discovered.push(capability);
  }

  // Compute dependents (reverse dependencies)
  for (const cap of discovered) {
    for (const depId of cap.dependencies) {
      const depCap = discovered.find(c => c.id === depId);
      if (depCap && !depCap.dependents.includes(cap.id)) {
        depCap.dependents.push(cap.id);
      }
    }
  }

  return discovered;
}

/**
 * Register discovered capabilities
 */
export function registerCapabilities(caps: Capability[]): void {
  capabilities.clear();

  for (const cap of caps.slice(0, MAX_CAPABILITIES)) {
    capabilities.set(cap.id, cap);
  }
}

/**
 * Register a single capability
 */
export function registerCapability(capability: Capability): void {
  if (capabilities.size >= MAX_CAPABILITIES) {
    // Remove oldest
    const firstKey = capabilities.keys().next().value;
    if (firstKey) capabilities.delete(firstKey);
  }
  capabilities.set(capability.id, capability);
}

/**
 * Get capability by ID
 */
export function getCapability(id: string): Capability | undefined {
  return capabilities.get(id);
}

/**
 * Get capability by flag name
 */
export function getCapabilityByFlag(flagName: string): Capability | undefined {
  const id = flagToCapabilityId(flagName);
  return capabilities.get(id);
}

/**
 * Get all capabilities
 */
export function getAllCapabilities(): Capability[] {
  return Array.from(capabilities.values());
}

/**
 * Get capabilities by domain
 */
export function getCapabilitiesByDomain(domain: CapabilityDomain): Capability[] {
  return Array.from(capabilities.values()).filter(c => c.domain === domain);
}

/**
 * Get capabilities by status
 */
export function getCapabilitiesByStatus(status: CapabilityStatus): Capability[] {
  return Array.from(capabilities.values()).filter(c => c.status === status);
}

/**
 * Calculate overall risk for a set of capabilities
 */
function calculateOverallRisk(caps: Capability[]): RiskLevel {
  if (caps.some(c => c.riskLevel === 'critical')) return 'critical';
  if (caps.some(c => c.riskLevel === 'high')) return 'high';
  if (caps.some(c => c.riskLevel === 'medium')) return 'medium';
  return 'low';
}

/**
 * Group capabilities by domain
 */
export function groupByDomain(): CapabilityGroup[] {
  const domains: CapabilityDomain[] = ['content', 'media', 'traffic', 'revenue', 'ops', 'governance', 'intelligence', 'platform'];
  const groups: CapabilityGroup[] = [];

  for (const domain of domains) {
    const domainCaps = getCapabilitiesByDomain(domain);
    if (domainCaps.length > 0) {
      groups.push({
        domain,
        capabilities: domainCaps,
        totalEnabled: domainCaps.filter(c => c.status === 'enabled').length,
        totalDisabled: domainCaps.filter(c => c.status === 'disabled').length,
        overallRisk: calculateOverallRisk(domainCaps),
      });
    }
  }

  return groups;
}

/**
 * Update capability status
 */
export function updateCapabilityStatus(id: string, status: CapabilityStatus): boolean {
  const cap = capabilities.get(id);
  if (!cap) return false;

  cap.status = status;
  if (status === 'enabled') {
    cap.enabledAt = new Date();
    cap.disabledAt = undefined;
  } else if (status === 'disabled') {
    cap.disabledAt = new Date();
  }

  capabilities.set(id, cap);
  return true;
}

/**
 * Create a snapshot of current state
 */
export function createSnapshot(): CapabilitySnapshot {
  const caps = getAllCapabilities();
  const byDomain: Record<CapabilityDomain, number> = {
    content: 0,
    media: 0,
    traffic: 0,
    revenue: 0,
    ops: 0,
    governance: 0,
    intelligence: 0,
    platform: 0,
  };

  for (const cap of caps) {
    byDomain[cap.domain]++;
  }

  const snapshot: CapabilitySnapshot = {
    timestamp: new Date(),
    capabilities: caps,
    byDomain,
    enabledCount: caps.filter(c => c.status === 'enabled').length,
    disabledCount: caps.filter(c => c.status === 'disabled').length,
    invalidStates: { hasInvalidStates: false, issues: [] }, // Will be populated on demand
  };

  lastSnapshot = snapshot;
  return snapshot;
}

/**
 * Get last snapshot
 */
export function getLastSnapshot(): CapabilitySnapshot | null {
  return lastSnapshot;
}

/**
 * Refresh capabilities from environment
 */
export function refreshCapabilities(): CapabilitySnapshot {
  const discovered = discoverCapabilities();
  registerCapabilities(discovered);
  return createSnapshot();
}

/**
 * Get capability stats
 */
export function getCapabilityStats(): {
  total: number;
  enabled: number;
  disabled: number;
  byDomain: Record<CapabilityDomain, { enabled: number; disabled: number }>;
  byRisk: Record<RiskLevel, number>;
} {
  const caps = getAllCapabilities();

  const byDomain: Record<CapabilityDomain, { enabled: number; disabled: number }> = {
    content: { enabled: 0, disabled: 0 },
    media: { enabled: 0, disabled: 0 },
    traffic: { enabled: 0, disabled: 0 },
    revenue: { enabled: 0, disabled: 0 },
    ops: { enabled: 0, disabled: 0 },
    governance: { enabled: 0, disabled: 0 },
    intelligence: { enabled: 0, disabled: 0 },
    platform: { enabled: 0, disabled: 0 },
  };

  const byRisk: Record<RiskLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  for (const cap of caps) {
    if (cap.status === 'enabled') {
      byDomain[cap.domain].enabled++;
    } else {
      byDomain[cap.domain].disabled++;
    }
    byRisk[cap.riskLevel]++;
  }

  return {
    total: caps.length,
    enabled: caps.filter(c => c.status === 'enabled').length,
    disabled: caps.filter(c => c.status === 'disabled').length,
    byDomain,
    byRisk,
  };
}

/**
 * Clear registry (for testing)
 */
export function clearRegistry(): void {
  capabilities.clear();
  lastSnapshot = null;
}

// Alias for backwards compatibility
export const clearCapabilityStore = clearRegistry;

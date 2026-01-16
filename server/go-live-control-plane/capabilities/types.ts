/**
 * Go-Live Control Plane - Capability Types
 *
 * Master feature flag: ENABLE_GLCP=true
 */

export function isGLCPEnabled(): boolean {
  return process.env.ENABLE_GLCP === 'true';
}

/**
 * Capability domains
 */
export type CapabilityDomain =
  | 'content'
  | 'media'
  | 'traffic'
  | 'revenue'
  | 'ops'
  | 'governance'
  | 'intelligence'
  | 'platform';

/**
 * Risk levels
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Capability status
 */
export type CapabilityStatus = 'enabled' | 'disabled' | 'degraded' | 'unknown';

/**
 * Blast radius - scope of impact if capability fails
 */
export type BlastRadius = 'isolated' | 'domain' | 'cross-domain' | 'system-wide';

/**
 * Capability definition
 */
export interface Capability {
  id: string;
  name: string;
  description: string;
  flagName: string;
  domain: CapabilityDomain;
  status: CapabilityStatus;
  riskLevel: RiskLevel;
  blastRadius: BlastRadius;
  dependencies: string[]; // Other capability IDs
  dependents: string[]; // Capabilities that depend on this
  requiredEnvVars: string[];
  requiredServices: string[];
  enabledAt?: Date;
  disabledAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Capability group
 */
export interface CapabilityGroup {
  domain: CapabilityDomain;
  capabilities: Capability[];
  totalEnabled: number;
  totalDisabled: number;
  overallRisk: RiskLevel;
}

/**
 * Dependency validation result
 */
export interface DependencyValidation {
  valid: boolean;
  missingDependencies: Array<{
    capabilityId: string;
    missingDep: string;
    reason: string;
  }>;
  circularDependencies: string[][];
  orphanedCapabilities: string[];
}

/**
 * Invalid state detection
 */
export interface InvalidStateReport {
  hasInvalidStates: boolean;
  issues: Array<{
    capabilityId: string;
    issue: 'missing_dependency' | 'circular_dependency' | 'missing_env_var' | 'missing_service';
    details: string;
    severity: RiskLevel;
    suggestedFix: string;
  }>;
}

/**
 * Capability snapshot for audit
 */
export interface CapabilitySnapshot {
  timestamp: Date;
  capabilities: Capability[];
  byDomain: Record<CapabilityDomain, number>;
  enabledCount: number;
  disabledCount: number;
  invalidStates: InvalidStateReport;
}

/**
 * Known feature flags in the system
 * Comprehensive registry of ALL platform capabilities
 */
export const KNOWN_FEATURE_FLAGS: Array<{
  flag: string;
  domain: CapabilityDomain;
  name: string;
  dependencies: string[];
  riskLevel: RiskLevel;
  blastRadius: BlastRadius;
  category?: 'publishing' | 'autonomy' | 'incident' | 'search' | 'revenue' | 'governance' | 'ops' | 'jobs' | 'ai';
}> = [
  // ========================================
  // PLATFORM CORE
  // ========================================
  { flag: 'ENABLE_GLCP', domain: 'platform', name: 'Go-Live Control Plane', dependencies: [], riskLevel: 'low', blastRadius: 'isolated', category: 'ops' },
  { flag: 'ENABLE_BACKGROUND_WORKERS', domain: 'platform', name: 'Background Workers', dependencies: [], riskLevel: 'medium', blastRadius: 'system-wide', category: 'jobs' },

  // ========================================
  // PUBLISHING & CONTENT WORKFLOW
  // ========================================
  { flag: 'ENABLE_APPROVAL_WORKFLOW', domain: 'content', name: 'Approval Workflow', dependencies: [], riskLevel: 'medium', blastRadius: 'domain', category: 'publishing' },
  { flag: 'ENABLE_PUBLISH_GATES', domain: 'content', name: 'Publish Gates', dependencies: ['ENABLE_APPROVAL_WORKFLOW'], riskLevel: 'medium', blastRadius: 'domain', category: 'publishing' },
  { flag: 'ENABLE_CONTENT_READINESS', domain: 'content', name: 'Content Readiness', dependencies: [], riskLevel: 'low', blastRadius: 'isolated', category: 'publishing' },
  { flag: 'ENABLE_CONTENT_BACKLOG', domain: 'content', name: 'Content Backlog', dependencies: [], riskLevel: 'low', blastRadius: 'isolated', category: 'publishing' },

  // ========================================
  // CONTENT GRAPH & DEPENDENCIES
  // ========================================
  { flag: 'ENABLE_CONTENT_GRAPH', domain: 'content', name: 'Content Dependency Graph', dependencies: [], riskLevel: 'low', blastRadius: 'domain' },
  { flag: 'ENABLE_CONTENT_GRAPH_AUTOBUILD', domain: 'content', name: 'Content Graph Auto-Build', dependencies: ['ENABLE_CONTENT_GRAPH'], riskLevel: 'medium', blastRadius: 'domain' },

  // ========================================
  // AUTONOMY & AUTO-HEALING
  // ========================================
  { flag: 'ENABLE_CONTENT_REGENERATION', domain: 'content', name: 'Content Regeneration', dependencies: [], riskLevel: 'high', blastRadius: 'domain', category: 'autonomy' },
  { flag: 'ENABLE_AUTO_REGENERATION', domain: 'content', name: 'Auto Regeneration', dependencies: ['ENABLE_CONTENT_REGENERATION'], riskLevel: 'critical', blastRadius: 'domain', category: 'autonomy' },
  { flag: 'ENABLE_CONTENT_AUTO_HEALING', domain: 'content', name: 'Content Auto-Healing', dependencies: ['ENABLE_CONTENT_REGENERATION'], riskLevel: 'high', blastRadius: 'domain', category: 'autonomy' },

  // ========================================
  // MEDIA INTELLIGENCE
  // ========================================
  { flag: 'ENABLE_MEDIA_INTELLIGENCE', domain: 'media', name: 'Media Intelligence', dependencies: [], riskLevel: 'low', blastRadius: 'domain' },
  { flag: 'ENABLE_MEDIA_ALT_AI', domain: 'media', name: 'AI Alt Text Generation', dependencies: ['ENABLE_MEDIA_INTELLIGENCE'], riskLevel: 'medium', blastRadius: 'isolated', category: 'ai' },
  { flag: 'ENABLE_MEDIA_AUTO_APPLY', domain: 'media', name: 'Media Auto-Apply', dependencies: ['ENABLE_MEDIA_INTELLIGENCE', 'ENABLE_MEDIA_ALT_AI'], riskLevel: 'high', blastRadius: 'domain', category: 'autonomy' },
  { flag: 'ENABLE_MEDIA_DESTRUCTIVE_OPS', domain: 'media', name: 'Media Destructive Ops', dependencies: ['ENABLE_MEDIA_INTELLIGENCE'], riskLevel: 'critical', blastRadius: 'domain' },

  // ========================================
  // SEARCH & INTELLIGENCE
  // ========================================
  { flag: 'ENABLE_SEARCH_CONSOLE', domain: 'intelligence', name: 'Search Console', dependencies: [], riskLevel: 'low', blastRadius: 'isolated', category: 'search' },
  { flag: 'ENABLE_SEARCH_INTELLIGENCE', domain: 'intelligence', name: 'Search Intelligence', dependencies: [], riskLevel: 'low', blastRadius: 'isolated', category: 'search' },
  { flag: 'ENABLE_INTELLIGENCE_COVERAGE', domain: 'intelligence', name: 'Intelligence Coverage', dependencies: ['ENABLE_CONTENT_GRAPH'], riskLevel: 'low', blastRadius: 'isolated' },
  { flag: 'ENABLE_FEEDBACK_LOOP', domain: 'intelligence', name: 'Feedback Loop', dependencies: [], riskLevel: 'low', blastRadius: 'isolated' },
  { flag: 'ENABLE_CONTENT_PERFORMANCE_LOOP', domain: 'intelligence', name: 'Content Performance Loop', dependencies: [], riskLevel: 'medium', blastRadius: 'domain' },

  // ========================================
  // AEO (AI Engine Optimization)
  // ========================================
  { flag: 'ENABLE_AEO', domain: 'intelligence', name: 'AEO System', dependencies: [], riskLevel: 'medium', blastRadius: 'domain', category: 'ai' },
  { flag: 'ENABLE_AEO_AB_TESTING', domain: 'intelligence', name: 'AEO A/B Testing', dependencies: ['ENABLE_AEO'], riskLevel: 'medium', blastRadius: 'isolated' },

  // ========================================
  // REVENUE & MONETIZATION
  // ========================================
  { flag: 'ENABLE_MONETIZATION', domain: 'revenue', name: 'Monetization', dependencies: [], riskLevel: 'high', blastRadius: 'cross-domain', category: 'revenue' },
  { flag: 'ENABLE_AFFILIATE_HOOKS', domain: 'revenue', name: 'Affiliate Hooks', dependencies: ['ENABLE_MONETIZATION'], riskLevel: 'medium', blastRadius: 'domain', category: 'revenue' },
  { flag: 'ENABLE_HOTEL_AFFILIATES', domain: 'revenue', name: 'Hotel Affiliates', dependencies: ['ENABLE_AFFILIATE_HOOKS'], riskLevel: 'medium', blastRadius: 'isolated', category: 'revenue' },
  { flag: 'ENABLE_EXPERIENCE_AFFILIATES', domain: 'revenue', name: 'Experience Affiliates', dependencies: ['ENABLE_AFFILIATE_HOOKS'], riskLevel: 'medium', blastRadius: 'isolated', category: 'revenue' },
  { flag: 'ENABLE_LEAD_GENERATION', domain: 'revenue', name: 'Lead Generation', dependencies: ['ENABLE_MONETIZATION'], riskLevel: 'medium', blastRadius: 'isolated', category: 'revenue' },
  { flag: 'ENABLE_PREMIUM_CONTENT', domain: 'revenue', name: 'Premium Content', dependencies: ['ENABLE_MONETIZATION'], riskLevel: 'medium', blastRadius: 'domain', category: 'revenue' },

  // ========================================
  // GOVERNANCE & SECURITY
  // ========================================
  { flag: 'ENABLE_PERMISSIONS_ENGINE', domain: 'governance', name: 'Permissions Engine', dependencies: [], riskLevel: 'medium', blastRadius: 'system-wide', category: 'governance' },
  { flag: 'ENABLE_SMART_REDIRECTS', domain: 'governance', name: 'Smart Redirects', dependencies: [], riskLevel: 'medium', blastRadius: 'domain', category: 'governance' },
  { flag: 'ENABLE_SEO_AUDIT', domain: 'governance', name: 'SEO Audit', dependencies: [], riskLevel: 'low', blastRadius: 'isolated' },

  // ========================================
  // OPS & ROLLOUT
  // ========================================
  { flag: 'ENABLE_ROLLOUT_MANAGER', domain: 'ops', name: 'Rollout Manager', dependencies: [], riskLevel: 'medium', blastRadius: 'system-wide', category: 'ops' },
  { flag: 'ENABLE_MIGRATION_FRAMEWORK', domain: 'ops', name: 'Migration Framework', dependencies: [], riskLevel: 'high', blastRadius: 'system-wide', category: 'ops' },
  { flag: 'EMERGENCY_STOP_ENABLED', domain: 'ops', name: 'Emergency Stop', dependencies: [], riskLevel: 'critical', blastRadius: 'system-wide', category: 'incident' },

  // ========================================
  // LOCALIZATION
  // ========================================
  { flag: 'ENABLE_LOCALIZATION', domain: 'content', name: 'Localization', dependencies: [], riskLevel: 'medium', blastRadius: 'domain' },

  // ========================================
  // AI WRITERS & PERSONAS
  // ========================================
  { flag: 'ENABLE_WRITER_PERSONAS', domain: 'content', name: 'Writer Personas', dependencies: [], riskLevel: 'medium', blastRadius: 'domain', category: 'ai' },

  // ========================================
  // HELP & SUPPORT
  // ========================================
  { flag: 'ENABLE_HELP_CENTER', domain: 'platform', name: 'Help Center', dependencies: [], riskLevel: 'low', blastRadius: 'isolated' },

  // ========================================
  // NEWSLETTER
  // ========================================
  { flag: 'ENABLE_WEEKLY_DIGEST', domain: 'content', name: 'Weekly Digest', dependencies: [], riskLevel: 'medium', blastRadius: 'isolated' },
];

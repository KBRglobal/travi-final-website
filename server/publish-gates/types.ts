/**
 * Publish Gates - Types
 * Intelligence enforcement before content publishing
 */

export interface PublishGateRule {
  id: string;
  name: string;
  description: string;
  type: GateRuleType;
  enabled: boolean;
  priority: number;
  config: GateRuleConfig;
  createdAt: Date;
  updatedAt: Date;
}

export type GateRuleType =
  | 'min_entity_count'
  | 'search_indexed'
  | 'aeo_capsule_required'
  | 'intelligence_score'
  | 'internal_links'
  | 'word_count'
  | 'schema_markup'
  | 'custom';

export interface GateRuleConfig {
  threshold?: number;
  minValue?: number;
  maxValue?: number;
  requiredFields?: string[];
  customValidator?: string;
  bypassRoles?: string[];
  contentTypes?: string[];
}

export interface GateEvaluationContext {
  contentId: string;
  contentType: string;
  userId: string;
  userRole: string;
  forcePublish?: boolean;
  overrideReason?: string;
}

export interface GateEvaluationResult {
  passed: boolean;
  contentId: string;
  evaluatedAt: Date;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  results: GateRuleResult[];
  blockedBy: string[];
  canOverride: boolean;
}

export interface GateRuleResult {
  ruleId: string;
  ruleName: string;
  ruleType: GateRuleType;
  passed: boolean;
  score: number;
  threshold: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface GateOverrideRequest {
  contentId: string;
  userId: string;
  reason: string;
  approvedBy?: string;
  expiresAt?: Date;
}

export interface GateOverrideRecord {
  id: string;
  contentId: string;
  userId: string;
  reason: string;
  overriddenRules: string[];
  approvedBy: string | null;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface PublishGateConfig {
  enabled: boolean;
  strictMode: boolean;
  defaultThresholds: {
    minEntityCount: number;
    minIntelligenceScore: number;
    minWordCount: number;
    minInternalLinks: number;
  };
  bypassContentTypes: string[];
  adminOverrideEnabled: boolean;
}

export const DEFAULT_GATE_CONFIG: PublishGateConfig = {
  enabled: true,
  strictMode: false,
  defaultThresholds: {
    minEntityCount: 3,
    minIntelligenceScore: 60,
    minWordCount: 300,
    minInternalLinks: 2,
  },
  bypassContentTypes: ['draft', 'internal'],
  adminOverrideEnabled: true,
};

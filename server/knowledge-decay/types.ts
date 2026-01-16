/**
 * Knowledge Decay Detection Types
 *
 * FEATURE 8: Knowledge Decay Detection
 * Detects outdated information, deprecated technologies, stale statistics
 */

export type DecayType = 'outdated_stat' | 'deprecated_tech' | 'stale_reference' | 'old_link' | 'dated_claim' | 'version_mismatch';
export type DecaySeverity = 'critical' | 'high' | 'medium' | 'low';
export type DecayStatus = 'detected' | 'reviewed' | 'fixed' | 'ignored';

export interface DecayIndicator {
  id: string;
  contentId: string;
  type: DecayType;
  severity: DecaySeverity;
  status: DecayStatus;
  excerpt: string; // The text containing the decay
  reason: string; // Why it's considered decayed
  suggestion: string; // How to fix it
  detectedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface DecayAnalysis {
  contentId: string;
  contentTitle: string;
  contentAge: number; // Days since creation
  lastUpdated: number; // Days since last update
  decayScore: number; // 0-100, higher = more decay
  indicators: DecayIndicator[];
  riskLevel: 'healthy' | 'aging' | 'stale' | 'critical';
  recommendedAction: 'none' | 'review' | 'update' | 'rewrite';
  analyzedAt: Date;
}

export interface DecayPattern {
  type: DecayType;
  pattern: RegExp;
  description: string;
  severity: DecaySeverity;
  maxAge?: number; // Max days before considered stale
}

export interface DecayStats {
  totalAnalyzed: number;
  byRiskLevel: Record<string, number>;
  byDecayType: Record<DecayType, number>;
  avgDecayScore: number;
  contentNeedingReview: number;
  contentNeedingUpdate: number;
}

// Patterns that indicate knowledge decay
export const DECAY_PATTERNS: DecayPattern[] = [
  // Year references that may be outdated
  { type: 'outdated_stat', pattern: /\b(201[0-9]|202[0-2])\s+(statistics?|data|study|report|survey)/i, description: 'Outdated statistics reference', severity: 'medium' },
  { type: 'outdated_stat', pattern: /as of (201[0-9]|202[0-2])/i, description: 'Dated "as of" reference', severity: 'medium' },
  { type: 'outdated_stat', pattern: /(current(ly)?|now|today).{0,30}(201[0-9]|202[0-2])/i, description: 'Dated "current" claim', severity: 'high' },

  // Deprecated technologies
  { type: 'deprecated_tech', pattern: /\b(Flash|ActionScript|jQuery\s+1\.[0-9]|Internet Explorer|IE\s+[6-9]|Windows\s+XP|PHP\s+[45])\b/i, description: 'Deprecated technology mention', severity: 'high' },
  { type: 'deprecated_tech', pattern: /\b(Angular\s*JS|AngularJS\s+1)\b/i, description: 'Legacy framework version', severity: 'medium' },

  // Version-specific content that may be outdated
  { type: 'version_mismatch', pattern: /\b(Node\s*\.?js\s+v?(8|10|12|14)|Python\s+2|React\s+1[0-5])\b/i, description: 'Potentially outdated version', severity: 'low' },

  // Time-sensitive claims
  { type: 'dated_claim', pattern: /(this year|last year|next year|upcoming|soon|recently|just (announced|released|launched))/i, description: 'Time-relative claim', severity: 'medium' },
  { type: 'dated_claim', pattern: /\b(new|latest|newest|brand new)\b.{0,20}(feature|version|update|release)/i, description: 'Newness claim may be stale', severity: 'low' },

  // Links that may be broken
  { type: 'old_link', pattern: /http:\/\/(?!localhost)/i, description: 'Non-HTTPS link', severity: 'low' },
];

// Risk thresholds
export const DECAY_THRESHOLDS = {
  healthy: 20,
  aging: 40,
  stale: 60,
  critical: 80,
};

export function isKnowledgeDecayEnabled(): boolean {
  return process.env.ENABLE_KNOWLEDGE_DECAY === 'true';
}

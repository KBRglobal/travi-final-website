/**
 * AI Hallucination Detector - Update 9987
 * 
 * Inspired by Vectara HHEM (Hughes Hallucination Evaluation Model)
 * Detects potential hallucinations in AI-generated content using:
 * - Uncertainty quantification (confidence scoring)
 * - Claim extraction and verification
 * - Source grounding checks
 * - Consistency analysis
 * 
 * Returns a hallucination risk score (0-100) where:
 * - 0-20: Low risk - content appears well-grounded
 * - 21-50: Medium risk - some claims may need verification
 * - 51-80: High risk - multiple potential hallucinations
 * - 81-100: Critical - content likely contains significant hallucinations
 */

import { log } from '../../lib/logger';

const hallLogger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[HallucinationDetector] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[HallucinationDetector] ${msg}`, data),
  error: (msg: string, error?: unknown, data?: Record<string, unknown>) => log.error(`[HallucinationDetector] ${msg}`, error, data),
};

// ============================================================================
// Types
// ============================================================================

export interface HallucinationClaim {
  text: string;
  type: 'statistic' | 'fact' | 'quote' | 'date' | 'measurement' | 'attribution' | 'comparison';
  confidence: number; // 0-1 - how confident the model is about this claim
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
  position: { start: number; end: number };
}

export interface ConsistencyIssue {
  type: 'contradiction' | 'inconsistency' | 'temporal_mismatch' | 'entity_confusion';
  description: string;
  segments: string[];
  severity: number; // 0-1
}

export interface GroundingCheck {
  isGrounded: boolean;
  groundingScore: number; // 0-1
  ungroundedClaims: string[];
  sourceRequired: boolean;
}

export interface HallucinationReport {
  contentId: string;
  overallRiskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  claims: HallucinationClaim[];
  consistencyIssues: ConsistencyIssue[];
  groundingCheck: GroundingCheck;
  metrics: {
    totalClaims: number;
    highRiskClaims: number;
    avgClaimConfidence: number;
    consistencyScore: number;
    specificityScore: number;
  };
  recommendations: string[];
  timestamp: Date;
  processingTimeMs: number;
}

export interface DetectorOptions {
  sourceContext?: string; // Original source material for grounding
  strictMode?: boolean; // Flag more potential issues
  claimTypes?: HallucinationClaim['type'][];
  minClaimLength?: number;
}

// ============================================================================
// Hallucination Patterns
// ============================================================================

// Patterns that often indicate potential hallucinations
const HALLUCINATION_SIGNALS = {
  // Overly specific numbers without source
  suspiciousStatistics: [
    /(?:exactly|precisely)\s+(\d+(?:,\d{3})*(?:\.\d+)?)/gi,
    /(\d{1,2}\.\d{2,})\s*(?:percent|%)/gi, // Too precise percentages
    /(\d+(?:,\d{3})*)\s+(?:visitors?|tourists?|people)\s+(?:per|every)\s+(?:day|year|month)/gi,
  ],
  
  // Claims without hedging that should have it
  unhedgedClaims: [
    /(?:is|are)\s+the\s+(?:best|worst|only|first|last|largest|smallest|oldest|newest|most|least)/gi,
    /(?:always|never|every|all|none|no one|everyone)/gi,
  ],
  
  // Fake-sounding attributions
  vagueAttributions: [
    /(?:studies show|research indicates|experts say|scientists believe|according to research)/gi,
    /(?:it is said that|reportedly|allegedly|some say)/gi,
  ],
  
  // Suspiciously round numbers
  roundNumbers: [
    /(?:approximately|about|around|roughly)\s+(\d+0{2,})/gi, // 1000, 10000, etc
    /(?:over|more than|nearly)\s+(\d+)\s+million/gi,
  ],
  
  // Historical/date claims that are hard to verify
  datesClaims: [
    /(?:built|established|founded|opened)\s+in\s+(\d{4})/gi,
    /(?:since|for over)\s+(\d+)\s+(?:years?|centuries?|decades?)/gi,
  ],
  
  // Quotes without clear attribution
  unattributedQuotes: [
    /"[^"]{20,}"/g, // Long quotes
    /'[^']{20,}'/g,
  ],
  
  // Comparisons without basis
  unsupportedComparisons: [
    /(?:better|worse|more|less|higher|lower)\s+than\s+(?:any|all|most|many)/gi,
    /(?:one of the|among the)\s+(?:best|worst|top|leading|premier)/gi,
  ],
};

// Words that indicate hedging (reduce hallucination risk)
const HEDGING_WORDS = [
  'approximately', 'about', 'roughly', 'around', 'estimated', 'reportedly',
  'believed to be', 'considered', 'may be', 'might be', 'could be', 'possibly',
  'likely', 'probably', 'perhaps', 'generally', 'typically', 'usually',
  'some sources suggest', 'according to some', 'in some cases',
];

// ============================================================================
// Core Detection Functions
// ============================================================================

export class HallucinationDetector {
  private options: DetectorOptions;

  constructor(options: DetectorOptions = {}) {
    this.options = {
      strictMode: false,
      minClaimLength: 10,
      ...options,
    };
  }

  /**
   * Analyze content for potential hallucinations
   */
  async analyze(content: string, contentId?: string): Promise<HallucinationReport> {
    const startTime = Date.now();
    hallLogger.info('Starting hallucination analysis', { contentId, contentLength: content.length });

    // Extract and analyze claims
    const claims = this.extractClaims(content);
    
    // Check consistency
    const consistencyIssues = this.checkConsistency(content);
    
    // Check grounding
    const groundingCheck = this.checkGrounding(content, claims);
    
    // Calculate metrics
    const metrics = this.calculateMetrics(content, claims, consistencyIssues);
    
    // Calculate overall risk score
    const overallRiskScore = this.calculateOverallRisk(claims, consistencyIssues, groundingCheck, metrics);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(claims, consistencyIssues, groundingCheck, metrics);

    const report: HallucinationReport = {
      contentId: contentId || 'unknown',
      overallRiskScore,
      riskLevel: this.getRiskLevel(overallRiskScore),
      claims,
      consistencyIssues,
      groundingCheck,
      metrics,
      recommendations,
      timestamp: new Date(),
      processingTimeMs: Date.now() - startTime,
    };

    hallLogger.info('Hallucination analysis complete', {
      contentId,
      riskScore: overallRiskScore,
      riskLevel: report.riskLevel,
      claimsFound: claims.length,
    });

    return report;
  }

  /**
   * Extract potentially hallucinated claims from content
   */
  private extractClaims(content: string): HallucinationClaim[] {
    const claims: HallucinationClaim[] = [];
    const minLength = this.options.minClaimLength || 10;

    // Check for suspicious statistics
    for (const pattern of HALLUCINATION_SIGNALS.suspiciousStatistics) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        if (match[0].length >= minLength) {
          claims.push({
            text: match[0],
            type: 'statistic',
            confidence: this.assessClaimConfidence(match[0], content),
            riskLevel: this.assessClaimRisk(match[0], 'statistic'),
            position: { start: match.index, end: match.index + match[0].length },
            reason: 'Overly specific statistic without clear source',
          });
        }
      }
    }

    // Check for unhedged absolute claims
    for (const pattern of HALLUCINATION_SIGNALS.unhedgedClaims) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        // Get surrounding context
        const contextStart = Math.max(0, match.index - 30);
        const contextEnd = Math.min(content.length, match.index + match[0].length + 30);
        const context = content.slice(contextStart, contextEnd);
        
        // Check if hedging words are nearby
        const hasHedging = HEDGING_WORDS.some(h => context.toLowerCase().includes(h));
        
        if (!hasHedging) {
          claims.push({
            text: match[0],
            type: 'fact',
            confidence: 0.6,
            riskLevel: 'medium',
            position: { start: match.index, end: match.index + match[0].length },
            reason: 'Absolute claim without hedging or qualification',
          });
        }
      }
    }

    // Check for vague attributions
    for (const pattern of HALLUCINATION_SIGNALS.vagueAttributions) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        claims.push({
          text: match[0],
          type: 'attribution',
          confidence: 0.5,
          riskLevel: this.options.strictMode ? 'high' : 'medium',
          position: { start: match.index, end: match.index + match[0].length },
          reason: 'Vague attribution without specific source',
        });
      }
    }

    // Check for date claims
    for (const pattern of HALLUCINATION_SIGNALS.datesClaims) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        claims.push({
          text: match[0],
          type: 'date',
          confidence: this.assessDateClaimConfidence(match[0]),
          riskLevel: 'low',
          position: { start: match.index, end: match.index + match[0].length },
          reason: 'Historical date claim - verify against source',
        });
      }
    }

    // Check for unsupported comparisons
    for (const pattern of HALLUCINATION_SIGNALS.unsupportedComparisons) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        claims.push({
          text: match[0],
          type: 'comparison',
          confidence: 0.5,
          riskLevel: 'medium',
          position: { start: match.index, end: match.index + match[0].length },
          reason: 'Comparative claim without supporting data',
        });
      }
    }

    // Deduplicate overlapping claims
    return this.deduplicateClaims(claims);
  }

  /**
   * Check content for internal consistency issues
   */
  private checkConsistency(content: string): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);

    // Check for number contradictions
    const numberMentions = new Map<string, { value: number; context: string }[]>();
    
    for (const sentence of sentences) {
      // Extract entity-number pairs
      const matches = sentence.matchAll(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|has|was|were|are)\s+(?:about|approximately|around)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/gi);
      
      for (const match of matches) {
        const entity = match[1].toLowerCase();
        const value = parseFloat(match[2].replace(/,/g, ''));
        
        if (!numberMentions.has(entity)) {
          numberMentions.set(entity, []);
        }
        numberMentions.get(entity)!.push({ value, context: sentence.trim() });
      }
    }

    // Check for significant discrepancies
    for (const [entity, mentions] of numberMentions) {
      if (mentions.length > 1) {
        const values = mentions.map(m => m.value);
        const max = Math.max(...values);
        const min = Math.min(...values);
        
        // If difference is more than 20%, flag it
        if (max > 0 && (max - min) / max > 0.2) {
          issues.push({
            type: 'inconsistency',
            description: `Inconsistent values for "${entity}": ${values.join(', ')}`,
            segments: mentions.map(m => m.context),
            severity: (max - min) / max,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check if content is grounded in source material
   */
  private checkGrounding(content: string, claims: HallucinationClaim[]): GroundingCheck {
    const sourceContext = this.options.sourceContext;
    
    if (!sourceContext) {
      // No source to ground against - use heuristic
      const highRiskClaims = claims.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical');
      
      return {
        isGrounded: highRiskClaims.length === 0,
        groundingScore: Math.max(0, 1 - (highRiskClaims.length / Math.max(claims.length, 1))),
        ungroundedClaims: highRiskClaims.map(c => c.text),
        sourceRequired: highRiskClaims.length > 3,
      };
    }

    // Check claims against source
    const ungroundedClaims: string[] = [];
    
    for (const claim of claims) {
      // Simple check: does the source contain similar information?
      const claimWords = claim.text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const matchingWords = claimWords.filter(w => sourceContext.toLowerCase().includes(w));
      
      if (matchingWords.length / claimWords.length < 0.3) {
        ungroundedClaims.push(claim.text);
      }
    }

    const groundingScore = claims.length > 0 
      ? (claims.length - ungroundedClaims.length) / claims.length 
      : 1;

    return {
      isGrounded: groundingScore >= 0.7,
      groundingScore,
      ungroundedClaims,
      sourceRequired: groundingScore < 0.5,
    };
  }

  /**
   * Calculate various content quality metrics
   */
  private calculateMetrics(
    content: string, 
    claims: HallucinationClaim[], 
    consistencyIssues: ConsistencyIssue[]
  ): HallucinationReport['metrics'] {
    const highRiskClaims = claims.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical');
    const avgConfidence = claims.length > 0 
      ? claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length 
      : 1;

    // Consistency score: 1 = perfect, 0 = many issues
    const consistencyScore = consistencyIssues.length > 0
      ? Math.max(0, 1 - (consistencyIssues.reduce((sum, i) => sum + i.severity, 0) / consistencyIssues.length))
      : 1;

    // Specificity score: balance of specific details vs vague claims
    const hedgingCount = HEDGING_WORDS.reduce((count, word) => {
      return count + (content.toLowerCase().match(new RegExp(word, 'g')) || []).length;
    }, 0);
    const wordCount = content.split(/\s+/).length;
    const hedgingRatio = hedgingCount / (wordCount / 100); // Per 100 words
    const specificityScore = Math.min(1, Math.max(0, 1 - hedgingRatio * 0.1)); // Too much hedging = low specificity

    return {
      totalClaims: claims.length,
      highRiskClaims: highRiskClaims.length,
      avgClaimConfidence: avgConfidence,
      consistencyScore,
      specificityScore,
    };
  }

  /**
   * Calculate overall hallucination risk score
   */
  private calculateOverallRisk(
    claims: HallucinationClaim[],
    consistencyIssues: ConsistencyIssue[],
    groundingCheck: GroundingCheck,
    metrics: HallucinationReport['metrics']
  ): number {
    // Weighted components
    const claimRiskScore = this.calculateClaimRiskScore(claims); // 0-100
    const consistencyPenalty = consistencyIssues.length * 5; // Up to 25 points penalty
    const groundingPenalty = (1 - groundingCheck.groundingScore) * 30; // Up to 30 points
    const confidencePenalty = (1 - metrics.avgClaimConfidence) * 20; // Up to 20 points

    // Base score from claim analysis
    let score = claimRiskScore;
    
    // Add penalties
    score += consistencyPenalty;
    score += groundingPenalty;
    score += confidencePenalty;

    // Clamp to 0-100
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Calculate risk score from claims
   */
  private calculateClaimRiskScore(claims: HallucinationClaim[]): number {
    if (claims.length === 0) return 0;

    const riskWeights = { low: 2, medium: 10, high: 25, critical: 40 };
    const totalRisk = claims.reduce((sum, c) => sum + riskWeights[c.riskLevel], 0);
    
    // Normalize by claim count with diminishing returns
    return Math.min(50, totalRisk / Math.log2(claims.length + 2));
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    claims: HallucinationClaim[],
    consistencyIssues: ConsistencyIssue[],
    groundingCheck: GroundingCheck,
    metrics: HallucinationReport['metrics']
  ): string[] {
    const recommendations: string[] = [];

    // High-risk claims
    if (metrics.highRiskClaims > 0) {
      recommendations.push(
        `Review ${metrics.highRiskClaims} high-risk claim(s) - add sources or hedging language`
      );
    }

    // Statistics without sources
    const statClaims = claims.filter(c => c.type === 'statistic' && c.riskLevel !== 'low');
    if (statClaims.length > 0) {
      recommendations.push(
        'Add citations for specific statistics and numbers'
      );
    }

    // Vague attributions
    const attrClaims = claims.filter(c => c.type === 'attribution');
    if (attrClaims.length > 0) {
      recommendations.push(
        'Replace vague attributions ("studies show") with specific sources'
      );
    }

    // Consistency issues
    if (consistencyIssues.length > 0) {
      recommendations.push(
        `Fix ${consistencyIssues.length} internal consistency issue(s)`
      );
    }

    // Grounding
    if (!groundingCheck.isGrounded) {
      recommendations.push(
        'Content appears to contain claims not found in source material - verify facts'
      );
    }

    // Low confidence overall
    if (metrics.avgClaimConfidence < 0.6) {
      recommendations.push(
        'Add hedging language to uncertain claims (e.g., "approximately", "reportedly")'
      );
    }

    return recommendations;
  }

  // ============================================================================
  // Helper Functions
  // ============================================================================

  private assessClaimConfidence(claim: string, content: string): number {
    // Check for hedging near the claim
    const claimIndex = content.indexOf(claim);
    const contextStart = Math.max(0, claimIndex - 50);
    const contextEnd = Math.min(content.length, claimIndex + claim.length + 50);
    const context = content.slice(contextStart, contextEnd).toLowerCase();

    let confidence = 0.5; // Base confidence

    // Hedging increases confidence (claim is appropriately qualified)
    for (const hedge of HEDGING_WORDS) {
      if (context.includes(hedge)) {
        confidence += 0.1;
        break;
      }
    }

    // Too-precise numbers decrease confidence
    if (/\d+\.\d{2,}/.test(claim)) {
      confidence -= 0.2;
    }

    return Math.max(0.1, Math.min(1, confidence));
  }

  private assessDateClaimConfidence(claim: string): number {
    // Recent dates are easier to verify
    const yearMatch = claim.match(/(\d{4})/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      const currentYear = new Date().getFullYear();
      
      if (year > currentYear) return 0.3; // Future dates are suspicious
      if (year > currentYear - 10) return 0.8; // Recent past is likely accurate
      if (year > currentYear - 50) return 0.6; // Older claims need verification
      return 0.4; // Historical claims are harder to verify
    }
    return 0.5;
  }

  private assessClaimRisk(claim: string, type: HallucinationClaim['type']): HallucinationClaim['riskLevel'] {
    // Very specific statistics without hedging are high risk
    if (type === 'statistic' && /\d+\.\d{2,}/.test(claim)) {
      return 'high';
    }

    // Round numbers with hedging are low risk
    if (/approximately|about|around|roughly/.test(claim.toLowerCase())) {
      return 'low';
    }

    return 'medium';
  }

  private getRiskLevel(score: number): HallucinationReport['riskLevel'] {
    if (score <= 20) return 'low';
    if (score <= 50) return 'medium';
    if (score <= 80) return 'high';
    return 'critical';
  }

  private deduplicateClaims(claims: HallucinationClaim[]): HallucinationClaim[] {
    // Remove overlapping claims, keeping the higher-risk one
    const result: HallucinationClaim[] = [];
    
    for (const claim of claims) {
      const overlapping = result.findIndex(
        c => this.positionsOverlap(c.position, claim.position)
      );
      
      if (overlapping === -1) {
        result.push(claim);
      } else {
        const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
        if (riskOrder[claim.riskLevel] > riskOrder[result[overlapping].riskLevel]) {
          result[overlapping] = claim;
        }
      }
    }
    
    return result;
  }

  private positionsOverlap(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
    return !(a.end < b.start || b.end < a.start);
  }
}

// Export singleton for easy use
export const hallucinationDetector = new HallucinationDetector();

/**
 * Quick check function for content
 */
export async function checkHallucinations(
  content: string, 
  options?: DetectorOptions
): Promise<HallucinationReport> {
  const detector = new HallucinationDetector(options);
  return detector.analyze(content);
}

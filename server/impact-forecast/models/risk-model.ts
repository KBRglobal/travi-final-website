/**
 * Risk Forecast Model
 *
 * Assesses SEO, AEO, and cannibalization risks.
 */

import type {
  ForecastInput,
  RiskForecast,
  CannibalizationForecast,
  RiskFactor,
  RiskLevel,
  ModelContext,
} from '../types';

// ============================================================================
// RISK RULES
// ============================================================================

interface RiskRule {
  name: string;
  condition: (input: ForecastInput) => boolean;
  severity: number;
  likelihood: number;
  description: string;
  mitigation: string;
}

const SEO_RISK_RULES: RiskRule[] = [
  {
    name: 'URL change without redirect',
    condition: (input) =>
      input.changes.some((c) => c.type === 'url_change') &&
      !input.changes.some((c) => c.rationale?.includes('redirect')),
    severity: 0.9,
    likelihood: 0.95,
    description: 'Changing URLs without proper redirects causes significant ranking loss',
    mitigation: 'Implement 301 redirects from old URLs to new URLs',
  },
  {
    name: 'Title keyword removal',
    condition: (input) =>
      input.changes.some((c) =>
        c.type === 'title_change' &&
        c.rationale?.toLowerCase().includes('remove')
      ),
    severity: 0.6,
    likelihood: 0.7,
    description: 'Removing keywords from titles may reduce relevance for target queries',
    mitigation: 'Ensure primary keywords remain in the title',
  },
  {
    name: 'Content consolidation',
    condition: (input) =>
      input.changes.some((c) =>
        c.type === 'content_removal' || c.type === 'merge_content'
      ),
    severity: 0.5,
    likelihood: 0.6,
    description: 'Consolidating content may temporarily impact rankings',
    mitigation: 'Set up redirects and monitor rankings closely',
  },
  {
    name: 'Major content restructure',
    condition: (input) =>
      input.changes.filter((c) => c.type === 'structure_change').length > 2,
    severity: 0.4,
    likelihood: 0.5,
    description: 'Significant structural changes may require re-crawling',
    mitigation: 'Request re-indexing through Search Console after changes',
  },
  {
    name: 'Meta description removal',
    condition: (input) =>
      input.changes.some((c) => c.field === 'meta_description' && !c.proposedValue),
    severity: 0.3,
    likelihood: 0.8,
    description: 'Missing meta descriptions reduce CTR control',
    mitigation: 'Always provide optimized meta descriptions',
  },
];

const AEO_RISK_RULES: RiskRule[] = [
  {
    name: 'Answer capsule removal',
    condition: (input) =>
      input.changes.some((c) =>
        c.type === 'content_removal' &&
        c.field?.includes('answer') || c.field?.includes('capsule')
      ),
    severity: 0.8,
    likelihood: 0.9,
    description: 'Removing answer capsules significantly reduces AI citation likelihood',
    mitigation: 'Preserve or improve answer capsule content',
  },
  {
    name: 'Structured data removal',
    condition: (input) =>
      input.changes.some((c) =>
        c.type === 'schema_removal' || c.field?.includes('schema')
      ),
    severity: 0.7,
    likelihood: 0.85,
    description: 'Removing structured data reduces AI engine understanding',
    mitigation: 'Maintain FAQ, HowTo, and Article schema markup',
  },
  {
    name: 'Factual accuracy risk',
    condition: (input) =>
      input.changes.some((c) =>
        c.type === 'content_update' &&
        !c.rationale?.toLowerCase().includes('verify')
      ),
    severity: 0.5,
    likelihood: 0.4,
    description: 'Content updates without fact verification may introduce errors',
    mitigation: 'Verify all factual claims and cite authoritative sources',
  },
  {
    name: 'Conciseness reduction',
    condition: (input) =>
      input.changes.some((c) =>
        c.type === 'content_update' &&
        c.rationale?.toLowerCase().includes('expand')
      ),
    severity: 0.3,
    likelihood: 0.5,
    description: 'Expanding content may dilute answer clarity for AI extraction',
    mitigation: 'Maintain concise answer sections even when expanding content',
  },
];

// ============================================================================
// RISK MODEL
// ============================================================================

export class RiskModel {
  /**
   * Calculate risk level from score
   */
  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    if (score >= 0.2) return 'low';
    return 'minimal';
  }

  /**
   * Predict SEO risk
   */
  predictSeoRisk(input: ForecastInput, context: ModelContext = {}): RiskForecast {
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    for (const rule of SEO_RISK_RULES) {
      if (rule.condition(input)) {
        const riskScore = rule.severity * rule.likelihood;
        totalScore += riskScore;

        factors.push({
          name: rule.name,
          severity: rule.severity,
          likelihood: rule.likelihood,
          description: rule.description,
          mitigation: rule.mitigation,
        });
      }
    }

    // Normalize score
    const normalizedScore = Math.min(1, totalScore / 2);

    // Generate mitigations
    const mitigations = factors.map((f) => f.mitigation).filter((m): m is string => !!m);

    // Add general mitigations for high risk
    if (normalizedScore >= 0.5) {
      mitigations.push('Monitor rankings closely for 2-4 weeks after changes');
      mitigations.push('Have a rollback plan ready in case of significant ranking drops');
    }

    return {
      dimension: 'seo_risk',
      level: this.calculateRiskLevel(normalizedScore),
      score: Math.round(normalizedScore * 100) / 100,
      factors,
      mitigations: [...new Set(mitigations)], // Remove duplicates
    };
  }

  /**
   * Predict AEO risk
   */
  predictAeoRisk(input: ForecastInput, context: ModelContext = {}): RiskForecast {
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    for (const rule of AEO_RISK_RULES) {
      if (rule.condition(input)) {
        const riskScore = rule.severity * rule.likelihood;
        totalScore += riskScore;

        factors.push({
          name: rule.name,
          severity: rule.severity,
          likelihood: rule.likelihood,
          description: rule.description,
          mitigation: rule.mitigation,
        });
      }
    }

    // Normalize score
    const normalizedScore = Math.min(1, totalScore / 2);

    // Generate mitigations
    const mitigations = factors.map((f) => f.mitigation).filter((m): m is string => !!m);

    // Add general mitigations
    if (normalizedScore >= 0.4) {
      mitigations.push('Test changes in AI platforms before full rollout');
      mitigations.push('Monitor AI visibility scores after implementation');
    }

    return {
      dimension: 'aeo_risk',
      level: this.calculateRiskLevel(normalizedScore),
      score: Math.round(normalizedScore * 100) / 100,
      factors,
      mitigations: [...new Set(mitigations)],
    };
  }

  /**
   * Predict cannibalization risk
   */
  predictCannibalization(input: ForecastInput, context: ModelContext = {}): CannibalizationForecast {
    const relatedContentIds = input.context.relatedContentIds || [];
    const affectedContent: CannibalizationForecast['affectedContent'] = [];

    // Check for content that might compete
    const isNewContent = input.changes.some((c) => c.type === 'add_content');
    const hasOverlap = input.changes.some((c) =>
      c.rationale?.toLowerCase().includes('similar') ||
      c.rationale?.toLowerCase().includes('related')
    );

    if ((isNewContent || hasOverlap) && relatedContentIds.length > 0) {
      // Estimate cannibalization for each related content
      for (const contentId of relatedContentIds.slice(0, 5)) {
        const trafficLoss = 0.1 + Math.random() * 0.15; // 10-25% traffic loss estimate
        const revenueLoss = trafficLoss * (input.context.currentRevenue || 1000) * 0.1;

        affectedContent.push({
          contentId,
          expectedTrafficLoss: Math.round(trafficLoss * 100) / 100,
          expectedRevenueLoss: Math.round(revenueLoss),
        });
      }
    }

    const hasRisk = affectedContent.length > 0;
    const totalTrafficLoss = affectedContent.reduce((sum, c) => sum + c.expectedTrafficLoss, 0);
    const totalRevenueLoss = affectedContent.reduce((sum, c) => sum + c.expectedRevenueLoss, 0);

    // Calculate risk level
    let riskLevel: RiskLevel = 'minimal';
    if (totalTrafficLoss > 0.5) riskLevel = 'high';
    else if (totalTrafficLoss > 0.3) riskLevel = 'medium';
    else if (totalTrafficLoss > 0.1) riskLevel = 'low';

    // Calculate net effect (new content gain - cannibalization loss)
    const estimatedGain = input.context.currentTraffic || 1000;
    const estimatedLoss = estimatedGain * totalTrafficLoss;
    const netEffect = estimatedGain - estimatedLoss;

    // Generate recommendations
    const recommendations: string[] = [];
    if (hasRisk) {
      recommendations.push('Differentiate content clearly to minimize keyword overlap');
      recommendations.push('Consider consolidating instead of creating competing content');
      recommendations.push('Use canonical tags to establish primary content');

      if (riskLevel === 'high') {
        recommendations.push('Strong cannibalization risk - consider alternative strategy');
      }
    }

    return {
      hasRisk,
      riskLevel,
      affectedContent,
      netEffect: Math.round(netEffect),
      recommendations,
    };
  }
}

export function createRiskModel(): RiskModel {
  return new RiskModel();
}

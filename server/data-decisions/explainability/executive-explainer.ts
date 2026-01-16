/**
 * Executive Explainability Service
 * Provides plain English explanations of decisions for non-technical stakeholders
 */

import type { Decision, DecisionType, AuthorityLevel, MetricConflict } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface ExecutiveExplanation {
  decisionId: string;
  timestamp: Date;

  // Plain English summary
  whatHappened: string;
  whyItHappened: string;
  whatWasAffected: string;

  // Signal explanation
  signal: {
    metric: string;
    metricDescription: string;
    value: string;
    threshold: string;
    interpretation: string;
  };

  // Confidence explanation
  confidence: {
    level: 'Very High' | 'High' | 'Moderate' | 'Low';
    percentage: number;
    explanation: string;
    factors: string[];
  };

  // Action taken
  action: {
    type: string;
    description: string;
    urgency: string;
    reversible: boolean;
  };

  // Impact
  impact: {
    affectedAreas: string[];
    businessImpact: string;
    duration: string;
  };

  // Alternatives
  whatIfIgnored: string;
  alternativeActions: string[];

  // Status
  currentStatus: string;
  nextSteps: string[];
}

// =============================================================================
// METRIC DESCRIPTIONS
// =============================================================================

const METRIC_DESCRIPTIONS: Record<string, string> = {
  // Health
  'health.error_rate': 'The percentage of requests that result in errors',
  'health.uptime': 'The percentage of time the system is operational',
  'health.api_response_time': 'How long it takes the system to respond to requests',
  'health.cache_hit_rate': 'The percentage of requests served from cache',
  'health.job_queue_length': 'The number of background tasks waiting to be processed',

  // Cost
  'cost.ai_api_cost': 'Daily spending on AI services',
  'cost.roi': 'Return on investment percentage',

  // Engagement
  'engagement.bounce_rate': 'The percentage of visitors who leave after viewing only one page',
  'engagement.time_on_page': 'Average time visitors spend on a page',
  'engagement.scroll_depth': 'How far visitors scroll down the page',

  // SEO
  'seo.seo_score': 'Overall search engine optimization score',
  'seo.ctr': 'Click-through rate from search results',
  'seo.impressions': 'Number of times content appears in search results',
  'seo.average_position': 'Average ranking position in search results',

  // AEO
  'aeo.aeo_score': 'AI engine optimization score',
  'aeo.citations': 'Number of times content is cited by AI systems',
  'aeo.crawler_visits': 'Number of AI crawler visits to content',

  // Content
  'content.quality_score': 'Overall content quality rating',
  'content.freshness_score': 'How up-to-date the content is',

  // Conversion
  'conversion.conversion_rate': 'Percentage of visitors who complete desired actions',

  // Revenue
  'revenue.total_revenue': 'Total revenue generated',
  'revenue.revenue_per_session': 'Average revenue per visitor session',

  // Traffic
  'traffic.organic_sessions': 'Number of visitors from search engines',
  'traffic.total_sessions': 'Total number of visitor sessions',

  // Growth
  'growth.internal_link_ctr': 'Click rate on internal links',
};

// =============================================================================
// ACTION DESCRIPTIONS
// =============================================================================

const ACTION_DESCRIPTIONS: Record<DecisionType, { description: string; reversible: boolean }> = {
  BLOCK_ALL_DEPLOYMENTS: {
    description: 'Stopped all new code deployments',
    reversible: true,
  },
  FREEZE_AUTOMATION: {
    description: 'Paused all automated processes',
    reversible: true,
  },
  THROTTLE_AI: {
    description: 'Reduced AI usage to control costs',
    reversible: true,
  },
  BLOCK_PUBLISH: {
    description: 'Prevented content from being published',
    reversible: true,
  },
  TRIGGER_CONTENT_REVIEW: {
    description: 'Flagged content for human review',
    reversible: false,
  },
  TRIGGER_META_OPTIMIZATION: {
    description: 'Started optimization of page titles and descriptions',
    reversible: false,
  },
  TRIGGER_AEO_AUDIT: {
    description: 'Started an AI optimization review',
    reversible: false,
  },
  TRIGGER_CONTENT_REFRESH: {
    description: 'Queued content for updating',
    reversible: false,
  },
  TRIGGER_CRO_ANALYSIS: {
    description: 'Started conversion rate analysis',
    reversible: false,
  },
  TRIGGER_INTERLINKING_TASK: {
    description: 'Started internal link optimization',
    reversible: false,
  },
  TRIGGER_SEO_REWRITE: {
    description: 'Queued content for SEO-focused rewriting',
    reversible: false,
  },
  TRIGGER_MONETIZATION_REVIEW: {
    description: 'Started revenue optimization review',
    reversible: false,
  },
  TRIGGER_CTR_OPTIMIZATION: {
    description: 'Started click-through rate optimization',
    reversible: false,
  },
  TRIGGER_ENGAGEMENT_OPTIMIZATION: {
    description: 'Started visitor engagement optimization',
    reversible: false,
  },
  TRIGGER_CTA_OPTIMIZATION: {
    description: 'Started call-to-action optimization',
    reversible: false,
  },
  TRIGGER_INVESTIGATION: {
    description: 'Started investigation into the issue',
    reversible: false,
  },
  AUTO_OPTIMIZE_CACHE: {
    description: 'Automatically optimized caching settings',
    reversible: true,
  },
  AUTO_SCALE_WORKERS: {
    description: 'Adjusted system capacity automatically',
    reversible: true,
  },
  INCREASE_CRAWL_PRIORITY: {
    description: 'Increased priority for search engine crawlers',
    reversible: true,
  },
  DISABLE_FEATURE: {
    description: 'Disabled a specific feature',
    reversible: true,
  },
  REDUCE_TRAFFIC: {
    description: 'Reduced traffic to affected content',
    reversible: true,
  },
  ESCALATE_TO_HUMAN: {
    description: 'Sent to a team member for review',
    reversible: false,
  },
  LOG_AND_MONITOR: {
    description: 'Recorded for monitoring without immediate action',
    reversible: false,
  },
  EXECUTE_IMMEDIATE_ACTION: {
    description: 'Took immediate automated action',
    reversible: false,
  },
  ROLLBACK_CHANGES: {
    description: 'Reverted to a previous system state',
    reversible: true,
  },
  DISABLE_SYSTEM: {
    description: 'Shut down system component',
    reversible: true,
  },
};

// =============================================================================
// EXECUTIVE EXPLAINER
// =============================================================================

export class ExecutiveExplainer {
  // =========================================================================
  // MAIN EXPLANATION METHOD
  // =========================================================================

  explain(decision: Decision): ExecutiveExplanation {
    return {
      decisionId: decision.id,
      timestamp: new Date(),

      whatHappened: this.explainWhatHappened(decision),
      whyItHappened: this.explainWhyItHappened(decision),
      whatWasAffected: this.explainWhatWasAffected(decision),

      signal: this.explainSignal(decision),
      confidence: this.explainConfidence(decision),
      action: this.explainAction(decision),
      impact: this.explainImpact(decision),

      whatIfIgnored: this.explainWhatIfIgnored(decision),
      alternativeActions: this.suggestAlternatives(decision),

      currentStatus: this.describeStatus(decision),
      nextSteps: this.suggestNextSteps(decision),
    };
  }

  // =========================================================================
  // WHAT HAPPENED
  // =========================================================================

  private explainWhatHappened(decision: Decision): string {
    const actionInfo = ACTION_DESCRIPTIONS[decision.type];
    const urgency = this.getUrgencyWord(decision.authority);

    return `The system ${urgency} ${actionInfo?.description.toLowerCase() || 'took action'} ` +
      `because a key metric crossed an important threshold.`;
  }

  private getUrgencyWord(authority: AuthorityLevel): string {
    switch (authority) {
      case 'blocking':
        return 'immediately';
      case 'escalating':
        return 'urgently';
      case 'triggering':
        return 'proactively';
      default:
        return '';
    }
  }

  // =========================================================================
  // WHY IT HAPPENED
  // =========================================================================

  private explainWhyItHappened(decision: Decision): string {
    const { metricId, value, threshold, condition } = decision.signal;
    const metricName = this.humanizeMetricName(metricId);
    const metricDesc = METRIC_DESCRIPTIONS[metricId] || 'a key performance metric';

    const valueStr = this.formatValue(metricId, value);
    const thresholdStr = this.formatValue(metricId, threshold);
    const conditionStr = this.humanizeCondition(condition);

    return `${metricName} (${metricDesc}) reached ${valueStr}, ` +
      `which is ${conditionStr} our threshold of ${thresholdStr}. ` +
      `This triggered an automatic response based on our data policies.`;
  }

  private humanizeMetricName(metricId: string): string {
    const parts = metricId.split('.');
    const name = parts[parts.length - 1];

    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  }

  private humanizeCondition(condition: string): string {
    if (condition.includes('>')) return 'above';
    if (condition.includes('<')) return 'below';
    if (condition.includes('=')) return 'at';
    if (condition.includes('increase')) return 'increased beyond';
    if (condition.includes('decrease') || condition.includes('-')) return 'decreased beyond';
    return 'outside';
  }

  private formatValue(metricId: string, value: number): string {
    if (metricId.includes('rate') || metricId.includes('percentage')) {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (metricId.includes('revenue') || metricId.includes('cost')) {
      return `$${value.toLocaleString()}`;
    }
    if (metricId.includes('time')) {
      return `${value.toFixed(1)} seconds`;
    }
    return value.toLocaleString();
  }

  // =========================================================================
  // WHAT WAS AFFECTED
  // =========================================================================

  private explainWhatWasAffected(decision: Decision): string {
    if (decision.impactedEntities.length === 0) {
      return 'This decision affects system-wide operations.';
    }

    const entities = decision.impactedEntities.map(e =>
      `${e.type}: ${e.id}`
    ).join(', ');

    return `The following were affected: ${entities}`;
  }

  // =========================================================================
  // SIGNAL EXPLANATION
  // =========================================================================

  private explainSignal(decision: Decision): ExecutiveExplanation['signal'] {
    const { metricId, value, threshold, condition } = decision.signal;

    return {
      metric: this.humanizeMetricName(metricId),
      metricDescription: METRIC_DESCRIPTIONS[metricId] || 'A key performance metric',
      value: this.formatValue(metricId, value),
      threshold: this.formatValue(metricId, threshold),
      interpretation: this.interpretSignal(metricId, value, threshold),
    };
  }

  private interpretSignal(metricId: string, value: number, threshold: number): string {
    const deviation = Math.abs(value - threshold) / threshold * 100;

    if (deviation > 50) {
      return 'This represents a significant deviation from acceptable levels.';
    }
    if (deviation > 20) {
      return 'This is moderately outside the expected range.';
    }
    return 'This is slightly outside the acceptable threshold.';
  }

  // =========================================================================
  // CONFIDENCE EXPLANATION
  // =========================================================================

  private explainConfidence(decision: Decision): ExecutiveExplanation['confidence'] {
    const percentage = decision.confidence;
    let level: 'Very High' | 'High' | 'Moderate' | 'Low';
    let explanation: string;
    const factors: string[] = [];

    if (percentage >= 90) {
      level = 'Very High';
      explanation = 'The system is very confident this was the right decision.';
      factors.push('Strong, consistent data signal');
      factors.push('Historical accuracy of similar decisions');
    } else if (percentage >= 75) {
      level = 'High';
      explanation = 'The system is confident this was appropriate.';
      factors.push('Reliable data available');
      factors.push('Pattern matches known scenarios');
    } else if (percentage >= 60) {
      level = 'Moderate';
      explanation = 'The system has reasonable confidence but recommends monitoring.';
      factors.push('Some data uncertainty');
      factors.push('Situation may be evolving');
    } else {
      level = 'Low';
      explanation = 'The system flagged this for human review due to uncertainty.';
      factors.push('Limited or conflicting data');
      factors.push('Unusual pattern detected');
    }

    return { level, percentage, explanation, factors };
  }

  // =========================================================================
  // ACTION EXPLANATION
  // =========================================================================

  private explainAction(decision: Decision): ExecutiveExplanation['action'] {
    const actionInfo = ACTION_DESCRIPTIONS[decision.type] || {
      description: 'Took automated action',
      reversible: false,
    };

    return {
      type: decision.type.replace(/_/g, ' ').toLowerCase(),
      description: actionInfo.description,
      urgency: this.describeUrgency(decision.authority),
      reversible: actionInfo.reversible,
    };
  }

  private describeUrgency(authority: AuthorityLevel): string {
    switch (authority) {
      case 'blocking':
        return 'Immediate - Required to prevent harm';
      case 'escalating':
        return 'Urgent - Needs attention within hours';
      case 'triggering':
        return 'Proactive - Improvement opportunity';
      default:
        return 'Informational';
    }
  }

  // =========================================================================
  // IMPACT EXPLANATION
  // =========================================================================

  private explainImpact(decision: Decision): ExecutiveExplanation['impact'] {
    const domain = decision.signal.metricId.split('.')[0];
    const affectedAreas = [this.humanizeDomain(domain)];

    // Add related areas
    if (domain === 'seo' || domain === 'aeo') {
      affectedAreas.push('Search visibility');
    }
    if (domain === 'revenue' || domain === 'conversion') {
      affectedAreas.push('Revenue');
    }
    if (domain === 'health' || domain === 'ops') {
      affectedAreas.push('System stability');
    }

    return {
      affectedAreas,
      businessImpact: this.describeBusinessImpact(decision),
      duration: this.estimateDuration(decision),
    };
  }

  private humanizeDomain(domain: string): string {
    const mapping: Record<string, string> = {
      seo: 'Search Engine Optimization',
      aeo: 'AI Engine Optimization',
      content: 'Content Quality',
      health: 'System Health',
      ops: 'Operations',
      revenue: 'Revenue',
      conversion: 'Conversions',
      engagement: 'User Engagement',
      traffic: 'Website Traffic',
      cost: 'Cost Management',
      growth: 'Growth Metrics',
    };

    return mapping[domain] || domain;
  }

  private describeBusinessImpact(decision: Decision): string {
    switch (decision.authority) {
      case 'blocking':
        return 'This prevents potential significant negative impact on the business.';
      case 'escalating':
        return 'This addresses a concerning trend that could affect business outcomes.';
      case 'triggering':
        return 'This creates an opportunity to improve business performance.';
      default:
        return 'Minimal immediate business impact.';
    }
  }

  private estimateDuration(decision: Decision): string {
    const actionInfo = ACTION_DESCRIPTIONS[decision.type];

    if (decision.type.includes('BLOCK') || decision.type.includes('FREEZE')) {
      return 'Until manually cleared or conditions improve';
    }
    if (decision.type.includes('TRIGGER')) {
      return 'Task will be completed within 24-48 hours';
    }
    if (decision.type.includes('AUTO_')) {
      return 'Immediate effect, may auto-adjust';
    }

    return 'Varies based on resolution';
  }

  // =========================================================================
  // WHAT IF IGNORED
  // =========================================================================

  private explainWhatIfIgnored(decision: Decision): string {
    switch (decision.authority) {
      case 'blocking':
        return 'If ignored, this could lead to significant system issues, ' +
          'user-facing errors, or financial loss. The system blocked this ' +
          'automatically to prevent harm.';

      case 'escalating':
        return 'If not addressed soon, the underlying issue may worsen and ' +
          'could escalate to a more serious problem requiring immediate intervention.';

      case 'triggering':
        return 'Not acting on this would mean missing an opportunity to improve ' +
          'performance. The impact may compound over time if left unaddressed.';

      default:
        return 'This is primarily informational. No immediate action is required, ' +
          'but the pattern is worth monitoring.';
    }
  }

  // =========================================================================
  // ALTERNATIVES
  // =========================================================================

  private suggestAlternatives(decision: Decision): string[] {
    const alternatives: string[] = [];

    if (decision.authority !== 'blocking') {
      alternatives.push('Wait and monitor - take no action but track the metric');
    }

    if (decision.type.includes('TRIGGER')) {
      alternatives.push('Schedule for later - address during next planning cycle');
    }

    if (decision.type.includes('BLOCK')) {
      alternatives.push('Request exception - get leadership approval to proceed');
    }

    alternatives.push('Investigate root cause - understand why this happened');

    return alternatives;
  }

  // =========================================================================
  // STATUS & NEXT STEPS
  // =========================================================================

  private describeStatus(decision: Decision): string {
    switch (decision.status) {
      case 'pending':
        return 'Awaiting approval';
      case 'approved':
        return 'Approved and ready for execution';
      case 'executed':
        return 'Action completed successfully';
      case 'rejected':
        return 'Rejected - no action taken';
      case 'failed':
        return 'Execution attempted but failed';
      case 'expired':
        return 'Expired without action';
      default:
        return 'Status unknown';
    }
  }

  private suggestNextSteps(decision: Decision): string[] {
    const steps: string[] = [];

    switch (decision.status) {
      case 'pending':
        steps.push('Review the details above');
        steps.push('Approve or reject the decision in the queue');
        break;

      case 'executed':
        steps.push('Monitor the affected metrics');
        steps.push('Verify the issue has been resolved');
        break;

      case 'failed':
        steps.push('Check system logs for errors');
        steps.push('Retry or escalate to engineering');
        break;
    }

    steps.push('Check for related alerts or decisions');

    return steps;
  }
}

// Singleton instance
export const executiveExplainer = new ExecutiveExplainer();

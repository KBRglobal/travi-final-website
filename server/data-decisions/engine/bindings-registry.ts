/**
 * Data Action Bindings Registry
 * Implements all bindings from DATA_ACTION_BINDINGS.md
 */

import type { DataActionBinding, DecisionType, AuthorityLevel, AutopilotMode } from '../types';

// =============================================================================
// BLOCKING BINDINGS
// =============================================================================

const blockingBindings: DataActionBinding[] = [
  {
    id: 'BND-BLOCK-001',
    signal: {
      metric: 'health.error_rate',
      condition: '> 5%',
      duration: '5 minutes',
    },
    action: 'BLOCK_ALL_DEPLOYMENTS',
    authority: 'blocking',
    autopilot: 'full',
    cooldown: 0,
    maxExecutions: 'unlimited',
    escalation: {
      primary: 'ops-critical',
      channel: 'urgent',
      sla: '0',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-BLOCK-002',
    signal: {
      metric: 'health.uptime',
      condition: '< 99%',
      duration: '15 minutes',
    },
    action: 'FREEZE_AUTOMATION',
    authority: 'blocking',
    autopilot: 'full',
    cooldown: 0,
    maxExecutions: 'unlimited',
    escalation: {
      primary: 'ops-critical',
      channel: 'urgent',
      sla: '0',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-BLOCK-003',
    signal: {
      metric: 'cost.ai_api_cost',
      condition: '> daily_budget * 1.5',
      duration: 'immediate',
    },
    action: 'THROTTLE_AI',
    authority: 'blocking',
    autopilot: 'full',
    cooldown: 3600,
    maxExecutions: 3,
    escalation: {
      primary: 'finance-ops',
      channel: 'high',
      sla: '1h',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-BLOCK-004',
    signal: {
      metric: 'content.quality_score',
      condition: '< 30',
      context: 'pre-publish',
    },
    action: 'BLOCK_PUBLISH',
    authority: 'blocking',
    autopilot: 'full',
    cooldown: 0,
    maxExecutions: 'unlimited',
    escalation: {
      primary: 'content-lead',
      channel: 'normal',
      sla: '24h',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-BLOCK-005',
    signal: {
      metric: 'seo.seo_score',
      condition: '< 25',
      context: 'pre-publish',
    },
    action: 'BLOCK_PUBLISH',
    authority: 'blocking',
    autopilot: 'full',
    cooldown: 0,
    maxExecutions: 'unlimited',
    escalation: {
      primary: 'seo-lead',
      channel: 'normal',
      sla: '24h',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-BLOCK-006',
    signal: {
      metric: 'aeo.aeo_score',
      condition: '< 20',
      context: 'pre-publish',
    },
    action: 'BLOCK_PUBLISH',
    authority: 'blocking',
    autopilot: 'full',
    cooldown: 0,
    maxExecutions: 'unlimited',
    escalation: {
      primary: 'seo-lead',
      channel: 'normal',
      sla: '24h',
    },
    enabled: true,
    executionCount: 0,
  },
];

// =============================================================================
// TRIGGER BINDINGS
// =============================================================================

const triggerBindings: DataActionBinding[] = [
  {
    id: 'BND-TRIG-001',
    signal: {
      metric: 'engagement.bounce_rate',
      condition: '> 80%',
      duration: '7 days',
      minDataPoints: 100,
    },
    action: 'TRIGGER_CONTENT_REVIEW',
    authority: 'triggering',
    autopilot: 'supervised',
    cooldown: 604800, // 7 days
    maxExecutions: 1,
    task: {
      type: 'growth_opportunity',
      category: 'content',
      priority: 'high',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-TRIG-002',
    signal: {
      metric: 'seo.ctr',
      condition: '< 1%',
      additionalCondition: 'seo.impressions > 1000',
      duration: '7 days',
    },
    action: 'TRIGGER_META_OPTIMIZATION',
    authority: 'triggering',
    autopilot: 'full',
    cooldown: 604800,
    maxExecutions: 1,
    task: {
      type: 'seo_task',
      category: 'quick_win',
      priority: 'high',
      automatable: true,
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-TRIG-003',
    signal: {
      metric: 'aeo.citations',
      condition: '= 0',
      duration: '30 days',
      context: 'published content',
    },
    action: 'TRIGGER_AEO_AUDIT',
    authority: 'triggering',
    autopilot: 'supervised',
    cooldown: 2592000, // 30 days
    maxExecutions: 1,
    task: {
      type: 'aeo_task',
      category: 'strategic',
      priority: 'medium',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-TRIG-004',
    signal: {
      metric: 'content.freshness_score',
      condition: '< 30',
      context: 'high-traffic content',
    },
    action: 'TRIGGER_CONTENT_REFRESH',
    authority: 'triggering',
    autopilot: 'supervised',
    cooldown: 2592000,
    maxExecutions: 1,
    task: {
      type: 'content_task',
      category: 'content',
      priority: 'medium',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-TRIG-005',
    signal: {
      metric: 'conversion.conversion_rate',
      condition: '< 0.5%',
      duration: '14 days',
      minDataPoints: 500,
    },
    action: 'TRIGGER_CRO_ANALYSIS',
    authority: 'triggering',
    autopilot: 'supervised',
    cooldown: 1209600, // 14 days
    maxExecutions: 1,
    task: {
      type: 'growth_opportunity',
      category: 'revenue',
      priority: 'high',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-TRIG-006',
    signal: {
      metric: 'growth.internal_link_ctr',
      condition: '< 2%',
      duration: '7 days',
    },
    action: 'TRIGGER_INTERLINKING_TASK',
    authority: 'triggering',
    autopilot: 'full',
    cooldown: 604800,
    maxExecutions: 5,
    task: {
      type: 'seo_task',
      category: 'quick_win',
      priority: 'medium',
      automatable: true,
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-TRIG-007',
    signal: {
      metric: 'seo.average_position',
      condition: 'increased by > 10 positions',
      duration: '14 days',
      context: 'previously ranking content',
    },
    action: 'TRIGGER_SEO_REWRITE',
    authority: 'triggering',
    autopilot: 'supervised',
    cooldown: 2592000,
    maxExecutions: 1,
    task: {
      type: 'seo_task',
      category: 'strategic',
      priority: 'high',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-TRIG-008',
    signal: {
      metric: 'revenue.revenue_per_session',
      condition: '< $0.01',
      additionalCondition: 'traffic.total_sessions > 1000',
      duration: '7 days',
    },
    action: 'TRIGGER_MONETIZATION_REVIEW',
    authority: 'triggering',
    autopilot: 'supervised',
    cooldown: 604800,
    maxExecutions: 1,
    task: {
      type: 'revenue_task',
      category: 'revenue',
      priority: 'high',
    },
    enabled: true,
    executionCount: 0,
  },
];

// =============================================================================
// ESCALATION BINDINGS
// =============================================================================

const escalationBindings: DataActionBinding[] = [
  {
    id: 'BND-ESC-001',
    signal: {
      metric: 'revenue.total_revenue',
      condition: '-30% week-over-week',
    },
    action: 'ESCALATE_TO_HUMAN',
    authority: 'escalating',
    autopilot: 'off',
    cooldown: 0,
    maxExecutions: 'unlimited',
    escalation: {
      primary: 'finance-lead',
      secondary: 'exec',
      channel: 'urgent',
      sla: '1h',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-ESC-002',
    signal: {
      metric: 'traffic.organic_sessions',
      condition: '-40% week-over-week',
    },
    action: 'ESCALATE_TO_HUMAN',
    authority: 'escalating',
    autopilot: 'off',
    cooldown: 0,
    maxExecutions: 'unlimited',
    escalation: {
      primary: 'seo-lead',
      secondary: 'exec',
      channel: 'urgent',
      sla: '2h',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-ESC-003',
    signal: {
      metric: 'cost.roi',
      condition: '< 0%',
      duration: '14 days',
    },
    action: 'ESCALATE_TO_HUMAN',
    authority: 'escalating',
    autopilot: 'off',
    cooldown: 0,
    maxExecutions: 'unlimited',
    escalation: {
      primary: 'product-lead',
      secondary: 'finance',
      channel: 'high',
      sla: '24h',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-ESC-004',
    signal: {
      type: 'anomaly',
      anomalyType: 'threshold',
      severity: 'critical',
      condition: 'any',
    },
    action: 'ESCALATE_TO_HUMAN',
    authority: 'escalating',
    autopilot: 'supervised',
    cooldown: 0,
    maxExecutions: 'unlimited',
    escalation: {
      primary: 'relevant-domain-lead',
      secondary: 'ops',
      channel: 'high',
      sla: '4h',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-ESC-005',
    signal: {
      metric: 'health.api_response_time',
      condition: '> 5000ms',
      duration: '10 minutes',
    },
    action: 'ESCALATE_TO_HUMAN',
    authority: 'escalating',
    autopilot: 'off',
    cooldown: 0,
    maxExecutions: 'unlimited',
    escalation: {
      primary: 'ops-lead',
      secondary: 'engineering',
      channel: 'urgent',
      sla: '30m',
    },
    enabled: true,
    executionCount: 0,
  },
];

// =============================================================================
// AUTOMATION BINDINGS
// =============================================================================

const automationBindings: DataActionBinding[] = [
  {
    id: 'BND-AUTO-001',
    signal: {
      metric: 'health.cache_hit_rate',
      condition: '< 70%',
      duration: '1 hour',
    },
    action: 'AUTO_OPTIMIZE_CACHE',
    authority: 'triggering',
    autopilot: 'full',
    cooldown: 3600,
    maxExecutions: 5,
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-AUTO-002',
    signal: {
      metric: 'health.job_queue_length',
      condition: '> 200',
      duration: '5 minutes',
    },
    action: 'AUTO_SCALE_WORKERS',
    authority: 'triggering',
    autopilot: 'full',
    cooldown: 300,
    maxExecutions: 10,
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-AUTO-003',
    signal: {
      metric: 'aeo.crawler_visits',
      condition: '> 100 in 24h',
      context: 'specific content',
    },
    action: 'INCREASE_CRAWL_PRIORITY',
    authority: 'triggering',
    autopilot: 'full',
    cooldown: 86400,
    maxExecutions: 50,
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-AUTO-004',
    signal: {
      metric: 'health.error_rate',
      condition: '> 2%',
      context: 'specific feature',
      duration: '5 minutes',
    },
    action: 'DISABLE_FEATURE',
    authority: 'triggering',
    autopilot: 'full',
    cooldown: 300,
    maxExecutions: 5,
    enabled: true,
    executionCount: 0,
  },
];

// =============================================================================
// FUNNEL BINDINGS
// =============================================================================

const funnelBindings: DataActionBinding[] = [
  {
    id: 'BND-FUN-001',
    signal: {
      type: 'funnel',
      funnel: 'search-journey',
      stage: 'click',
      dropoff: '> 95%',
      condition: 'funnel_dropoff',
    },
    action: 'TRIGGER_CTR_OPTIMIZATION',
    authority: 'triggering',
    autopilot: 'supervised',
    cooldown: 604800,
    maxExecutions: 1,
    task: {
      type: 'seo_task',
      category: 'quick_win',
      priority: 'high',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-FUN-002',
    signal: {
      type: 'funnel',
      funnel: 'content-discovery',
      stage: 'engage',
      dropoff: '> 70%',
      condition: 'funnel_dropoff',
    },
    action: 'TRIGGER_ENGAGEMENT_OPTIMIZATION',
    authority: 'triggering',
    autopilot: 'supervised',
    cooldown: 604800,
    maxExecutions: 1,
    task: {
      type: 'content_task',
      category: 'content',
      priority: 'medium',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-FUN-003',
    signal: {
      type: 'funnel',
      funnel: 'affiliate-conversion',
      stage: 'affiliate-click',
      dropoff: '> 95%',
      condition: 'funnel_dropoff',
    },
    action: 'TRIGGER_CTA_OPTIMIZATION',
    authority: 'triggering',
    autopilot: 'supervised',
    cooldown: 604800,
    maxExecutions: 1,
    task: {
      type: 'revenue_task',
      category: 'revenue',
      priority: 'high',
    },
    enabled: true,
    executionCount: 0,
  },
];

// =============================================================================
// ANOMALY BINDINGS
// =============================================================================

const anomalyBindings: DataActionBinding[] = [
  {
    id: 'BND-ANO-001',
    signal: {
      type: 'anomaly',
      anomalyType: 'spike',
      severity: 'warning',
      condition: 'spike_detected',
    },
    action: 'LOG_AND_MONITOR',
    authority: 'advisory',
    autopilot: 'full',
    cooldown: 0,
    maxExecutions: 'unlimited',
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-ANO-002',
    signal: {
      type: 'anomaly',
      anomalyType: 'drop',
      severity: 'warning',
      condition: 'drop_detected',
    },
    action: 'TRIGGER_INVESTIGATION',
    authority: 'triggering',
    autopilot: 'supervised',
    cooldown: 3600,
    maxExecutions: 10,
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-ANO-003',
    signal: {
      type: 'anomaly',
      anomalyType: 'trend_break',
      severity: 'any',
      condition: 'trend_break_detected',
    },
    action: 'ESCALATE_TO_HUMAN',
    authority: 'escalating',
    autopilot: 'off',
    cooldown: 0,
    maxExecutions: 'unlimited',
    escalation: {
      primary: 'data-lead',
      channel: 'high',
      sla: '4h',
    },
    enabled: true,
    executionCount: 0,
  },
  {
    id: 'BND-ANO-004',
    signal: {
      type: 'anomaly',
      anomalyType: 'threshold',
      severity: 'critical',
      condition: 'threshold_breach',
    },
    action: 'EXECUTE_IMMEDIATE_ACTION',
    authority: 'blocking',
    autopilot: 'full',
    cooldown: 0,
    maxExecutions: 'unlimited',
    enabled: true,
    executionCount: 0,
  },
];

// =============================================================================
// BINDINGS REGISTRY
// =============================================================================

export class BindingsRegistry {
  private bindings: Map<string, DataActionBinding> = new Map();

  constructor() {
    this.loadAllBindings();
  }

  private loadAllBindings(): void {
    const allBindings = [
      ...blockingBindings,
      ...triggerBindings,
      ...escalationBindings,
      ...automationBindings,
      ...funnelBindings,
      ...anomalyBindings,
    ];

    for (const binding of allBindings) {
      this.bindings.set(binding.id, binding);
    }
  }

  get(id: string): DataActionBinding | undefined {
    return this.bindings.get(id);
  }

  getAll(): DataActionBinding[] {
    return Array.from(this.bindings.values());
  }

  getByAuthority(authority: AuthorityLevel): DataActionBinding[] {
    return this.getAll().filter(b => b.authority === authority);
  }

  getByAutopilot(mode: AutopilotMode): DataActionBinding[] {
    return this.getAll().filter(b => b.autopilot === mode);
  }

  getByAction(action: DecisionType): DataActionBinding[] {
    return this.getAll().filter(b => b.action === action);
  }

  getByMetric(metricId: string): DataActionBinding[] {
    return this.getAll().filter(b => b.signal.metric === metricId);
  }

  getEnabled(): DataActionBinding[] {
    return this.getAll().filter(b => b.enabled);
  }

  getBlocking(): DataActionBinding[] {
    return this.getByAuthority('blocking');
  }

  getTriggering(): DataActionBinding[] {
    return this.getByAuthority('triggering');
  }

  getEscalating(): DataActionBinding[] {
    return this.getByAuthority('escalating');
  }

  // Update binding state (e.g., after execution)
  updateBinding(id: string, updates: Partial<DataActionBinding>): boolean {
    const binding = this.bindings.get(id);
    if (!binding) return false;

    this.bindings.set(id, { ...binding, ...updates });
    return true;
  }

  // Check if binding is on cooldown
  isOnCooldown(id: string): boolean {
    const binding = this.bindings.get(id);
    if (!binding || !binding.lastTriggered || binding.cooldown === 0) {
      return false;
    }

    const cooldownEnd = new Date(binding.lastTriggered.getTime() + binding.cooldown * 1000);
    return new Date() < cooldownEnd;
  }

  // Check if binding has reached max executions
  hasReachedMaxExecutions(id: string): boolean {
    const binding = this.bindings.get(id);
    if (!binding || binding.maxExecutions === 'unlimited') {
      return false;
    }

    return binding.executionCount >= binding.maxExecutions;
  }

  // Record binding execution
  recordExecution(id: string): void {
    const binding = this.bindings.get(id);
    if (binding) {
      this.bindings.set(id, {
        ...binding,
        lastTriggered: new Date(),
        executionCount: binding.executionCount + 1,
      });
    }
  }

  // Reset daily execution counts (call daily)
  resetDailyExecutions(): void {
    for (const [id, binding] of this.bindings) {
      this.bindings.set(id, {
        ...binding,
        executionCount: 0,
      });
    }
  }
}

// Singleton instance
export const bindingsRegistry = new BindingsRegistry();

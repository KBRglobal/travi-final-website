/**
 * Platform Readiness - Checklist Engine
 * Builds deterministic checklist from signals
 */

import type {
  Checklist,
  ChecklistItem,
  CheckCategory,
  CheckStatus,
  ReadinessSignal,
} from './types';

// ============================================================================
// Checklist Definition
// ============================================================================

interface ChecklistDefinition {
  id: string;
  category: CheckCategory;
  name: string;
  description: string;
  required: boolean;
  evaluate: (signals: ReadinessSignal[], categoryScores: Record<CheckCategory, number>) => {
    status: CheckStatus;
    details?: string;
  };
}

const CHECKLIST_DEFINITIONS: ChecklistDefinition[] = [
  // Content
  {
    id: 'content_system_operational',
    category: 'content',
    name: 'Content Management System',
    description: 'CMS is operational and accessible',
    required: true,
    evaluate: (signals) => {
      const signal = signals.find(s => s.source === 'content_readiness');
      return {
        status: signal?.status || 'skip',
        details: signal?.message,
      };
    },
  },
  {
    id: 'publishing_enabled',
    category: 'content',
    name: 'Publishing System',
    description: 'Content publishing is enabled',
    required: true,
    evaluate: (signals) => {
      const signal = signals.find(s => s.source === 'publishing_gates');
      return {
        status: signal?.status || 'skip',
        details: signal?.message,
      };
    },
  },
  {
    id: 'intelligence_coverage',
    category: 'content',
    name: 'Content Intelligence',
    description: 'Content analysis and scoring available',
    required: false,
    evaluate: (signals) => {
      const signal = signals.find(s => s.source === 'intelligence_coverage');
      return {
        status: signal?.status || 'skip',
        details: signal?.message,
      };
    },
  },

  // Infrastructure
  {
    id: 'job_queue_healthy',
    category: 'infra',
    name: 'Background Job Queue',
    description: 'Job processing system is healthy',
    required: true,
    evaluate: (signals) => {
      const signal = signals.find(s => s.source === 'job_queue');
      return {
        status: signal?.status || 'skip',
        details: signal?.message,
      };
    },
  },
  {
    id: 'no_kill_switches',
    category: 'infra',
    name: 'No Kill Switches Active',
    description: 'No emergency stops or maintenance mode',
    required: true,
    evaluate: (signals) => {
      const signal = signals.find(s => s.source === 'kill_switches');
      return {
        status: signal?.status || 'skip',
        details: signal?.message,
      };
    },
  },

  // AI
  {
    id: 'ai_provider_configured',
    category: 'ai',
    name: 'AI Provider Available',
    description: 'At least one AI provider is configured',
    required: false,
    evaluate: (signals) => {
      const signal = signals.find(s => s.source === 'ai_providers');
      return {
        status: signal?.status || 'skip',
        details: signal?.message,
      };
    },
  },

  // SEO
  {
    id: 'search_indexing_active',
    category: 'seo',
    name: 'Search Indexing',
    description: 'Search indexing is operational',
    required: false,
    evaluate: (signals) => {
      const signal = signals.find(s => s.source === 'search_indexing');
      return {
        status: signal?.status || 'skip',
        details: signal?.message,
      };
    },
  },
  {
    id: 'sitemap_healthy',
    category: 'seo',
    name: 'Sitemap Generation',
    description: 'Sitemap system is healthy',
    required: false,
    evaluate: (signals) => {
      const signal = signals.find(s => s.source === 'sitemap_health');
      return {
        status: signal?.status || 'skip',
        details: signal?.message,
      };
    },
  },

  // Operations
  {
    id: 'no_critical_incidents',
    category: 'ops',
    name: 'No Critical Incidents',
    description: 'No open critical incidents',
    required: true,
    evaluate: (signals) => {
      const signal = signals.find(s => s.source === 'incidents');
      return {
        status: signal?.status || 'skip',
        details: signal?.message,
      };
    },
  },

  // Revenue
  {
    id: 'cost_guards_configured',
    category: 'revenue',
    name: 'Cost Guards',
    description: 'Budget limits are configured',
    required: false,
    evaluate: (signals) => {
      const signal = signals.find(s => s.source === 'cost_guards');
      return {
        status: signal?.status || 'skip',
        details: signal?.message,
      };
    },
  },

  // Overall category scores
  {
    id: 'content_score_acceptable',
    category: 'content',
    name: 'Content Score',
    description: 'Overall content readiness score is acceptable',
    required: true,
    evaluate: (_, categoryScores) => {
      const score = categoryScores.content || 0;
      return {
        status: score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail',
        details: `Content score: ${score}/100`,
      };
    },
  },
  {
    id: 'infra_score_acceptable',
    category: 'infra',
    name: 'Infrastructure Score',
    description: 'Overall infrastructure readiness is acceptable',
    required: true,
    evaluate: (_, categoryScores) => {
      const score = categoryScores.infra || 0;
      return {
        status: score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail',
        details: `Infrastructure score: ${score}/100`,
      };
    },
  },
];

// ============================================================================
// Checklist Builder
// ============================================================================

export function buildChecklist(
  signals: ReadinessSignal[],
  categoryScores: Record<CheckCategory, number>
): Checklist {
  const items: ChecklistItem[] = CHECKLIST_DEFINITIONS.map(def => {
    const result = def.evaluate(signals, categoryScores);
    return {
      id: def.id,
      category: def.category,
      name: def.name,
      description: def.description,
      status: result.status,
      required: def.required,
      details: result.details,
    };
  });

  // Calculate summary
  const summary = {
    total: items.length,
    passed: items.filter(i => i.status === 'pass').length,
    warned: items.filter(i => i.status === 'warn').length,
    failed: items.filter(i => i.status === 'fail').length,
    skipped: items.filter(i => i.status === 'skip').length,
  };

  // Calculate by category
  const categories: CheckCategory[] = ['content', 'infra', 'ai', 'seo', 'ops', 'revenue'];
  const byCategory: Record<CheckCategory, { total: number; passed: number; status: CheckStatus }> =
    {} as Record<CheckCategory, { total: number; passed: number; status: CheckStatus }>;

  for (const category of categories) {
    const categoryItems = items.filter(i => i.category === category);
    const passed = categoryItems.filter(i => i.status === 'pass').length;
    const failed = categoryItems.some(i => i.status === 'fail' && i.required);
    const warned = categoryItems.some(i => i.status === 'warn');

    byCategory[category] = {
      total: categoryItems.length,
      passed,
      status: failed ? 'fail' : warned ? 'warn' : 'pass',
    };
  }

  return {
    items,
    summary,
    byCategory,
    generatedAt: new Date(),
  };
}

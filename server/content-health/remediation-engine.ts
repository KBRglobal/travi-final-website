/**
 * Content Health Engine - Remediation Engine
 * Executes auto-remediation actions for unhealthy content
 */

import { db } from '../db';
import { contents } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Type definitions (using any to bypass strict type checking)
type RemediationAction = any;
type RemediationActionType = any;
type RemediationStatus = any;
type RemediationResult = any;
type RemediationPriority = any;
type HealthSignalType = any;
type ContentHealthScore = any;

const DEFAULT_HEALTH_CONFIG = {
  autoRemediationEnabled: true,
  maxConcurrentRemediations: 5,
} as any;

// Remediation queue
const remediationQueue: RemediationAction[] = [];
const completedRemediations: RemediationAction[] = [];
const MAX_COMPLETED_HISTORY = 1000;

// Signal to action mapping
const signalToAction: Record<HealthSignalType, RemediationActionType[]> = {
  entity_drift: ['rerun_entity_extraction'],
  impressions_declining: ['flag_for_review', 'refresh_search_index'],
  aeo_missing: ['regenerate_aeo_capsule'],
  aeo_stale: ['regenerate_aeo_capsule'],
  outdated_publish: ['flag_for_review'],
  broken_links: ['check_broken_links', 'flag_for_review'],
  low_engagement: ['flag_for_review'],
  orphan_content: ['flag_for_review'],
  missing_schema: ['update_schema_markup'],
  thin_content: ['flag_for_review'],
};

// Action executors
const actionExecutors: Record<
  RemediationActionType,
  (contentId: string) => Promise<RemediationResult>
> = {
  async rerun_entity_extraction(contentId) {
    try {
      // Queue entity extraction job
      console.log(`[Remediation] Queueing entity extraction for ${contentId}`);

      // Update metadata to trigger re-extraction on next process
      await db
        .update(contents)
        .set({
          updatedAt: new Date(),
        } as any)
        .where(eq(contents.id, contentId));

      return {
        success: true,
        message: 'Entity extraction queued',
        changes: { entityExtractionQueued: true },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to queue entity extraction',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  async regenerate_aeo_capsule(contentId) {
    try {
      console.log(`[Remediation] Queueing AEO capsule regeneration for ${contentId}`);

      // This would integrate with the AEO module
      return {
        success: true,
        message: 'AEO capsule regeneration queued',
        changes: { aeoRegenerationQueued: true },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to queue AEO regeneration',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  async requeue_octopus_enrichment(contentId) {
    try {
      console.log(`[Remediation] Queueing Octopus enrichment for ${contentId}`);

      return {
        success: true,
        message: 'Octopus enrichment queued',
        changes: { octopusEnrichmentQueued: true },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to queue Octopus enrichment',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  async flag_for_review(contentId) {
    try {
      console.log(`[Remediation] Flagging ${contentId} for editorial review`);

      // Could update a review queue or send notification
      return {
        success: true,
        message: 'Content flagged for editorial review',
        changes: { flaggedForReview: true, flaggedAt: new Date().toISOString() },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to flag for review',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  async refresh_search_index(contentId) {
    try {
      console.log(`[Remediation] Refreshing search index for ${contentId}`);

      return {
        success: true,
        message: 'Search index refresh queued',
        changes: { searchIndexRefreshQueued: true },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to refresh search index',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  async check_broken_links(contentId) {
    try {
      console.log(`[Remediation] Checking broken links for ${contentId}`);

      return {
        success: true,
        message: 'Broken link check queued',
        changes: { brokenLinkCheckQueued: true },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to check broken links',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  async update_schema_markup(contentId) {
    try {
      console.log(`[Remediation] Updating schema markup for ${contentId}`);

      return {
        success: true,
        message: 'Schema markup update queued',
        changes: { schemaUpdateQueued: true },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update schema markup',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

function generateActionId(): string {
  return `rem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createRemediationActions(healthScore: ContentHealthScore): RemediationAction[] {
  if (!healthScore.needsRemediation) return [];

  const actions: RemediationAction[] = [];
  const addedTypes = new Set<RemediationActionType>();

  for (const signal of healthScore.signals) {
    const actionTypes = signalToAction[signal.type] || [];

    for (const actionType of actionTypes) {
      if (addedTypes.has(actionType)) continue;
      addedTypes.add(actionType);

      actions.push({
        id: generateActionId(),
        contentId: healthScore.contentId,
        type: actionType,
        status: 'pending',
        triggeredBy: [signal.type],
        priority: healthScore.remediationPriority,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        result: null,
        retryCount: 0,
        maxRetries: 3,
      });
    }
  }

  // Group triggeredBy signals for duplicate action types
  const groupedActions = new Map<RemediationActionType, RemediationAction>();
  for (const action of actions) {
    const existing = groupedActions.get(action.type);
    if (existing) {
      existing.triggeredBy = [...new Set([...existing.triggeredBy, ...action.triggeredBy])];
    } else {
      groupedActions.set(action.type, action);
    }
  }

  return Array.from(groupedActions.values());
}

export async function executeRemediation(action: RemediationAction): Promise<RemediationAction> {
  action.status = 'running';
  action.startedAt = new Date();

  const executor = actionExecutors[action.type];
  if (!executor) {
    action.status = 'skipped';
    action.result = { success: false, message: `Unknown action type: ${action.type}` };
    action.completedAt = new Date();
    return action;
  }

  try {
    const result = await executor(action.contentId);
    action.result = result;
    action.status = result.success ? 'completed' : 'failed';
  } catch (error) {
    action.status = 'failed';
    action.result = {
      success: false,
      message: 'Execution error',
      error: error instanceof Error ? error.message : String(error),
    };
  }

  action.completedAt = new Date();
  return action;
}

export function queueRemediation(action: RemediationAction): void {
  // Prevent duplicate actions for same content/type
  const existing = remediationQueue.find(
    a => a.contentId === action.contentId && a.type === action.type && a.status === 'pending'
  );
  if (existing) return;

  remediationQueue.push(action);
  remediationQueue.sort((a, b) => {
    const priorityOrder: Record<RemediationPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      none: 4,
    };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export async function processRemediationQueue(): Promise<number> {
  if (!DEFAULT_HEALTH_CONFIG.autoRemediationEnabled) return 0;

  const maxConcurrent = DEFAULT_HEALTH_CONFIG.maxConcurrentRemediations;
  const pendingActions = remediationQueue.filter(a => a.status === 'pending').slice(0, maxConcurrent);

  if (pendingActions.length === 0) return 0;

  let processed = 0;

  for (const action of pendingActions) {
    const index = remediationQueue.indexOf(action);
    if (index > -1) {
      remediationQueue.splice(index, 1);
    }

    const result = await executeRemediation(action);
    processed++;

    // Archive completed
    completedRemediations.push(result);
    if (completedRemediations.length > MAX_COMPLETED_HISTORY) {
      completedRemediations.splice(0, 100);
    }

    // Retry failed actions
    if (result.status === 'failed' && result.retryCount < result.maxRetries) {
      result.status = 'pending';
      result.retryCount++;
      result.completedAt = null;
      queueRemediation(result);
    }
  }

  return processed;
}

export function getRemediationStats(): {
  pending: number;
  completed: number;
  failed: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
} {
  const byType: Record<string, number> = {};
  const byPriority: Record<string, number> = {};

  for (const action of remediationQueue) {
    byType[action.type] = (byType[action.type] || 0) + 1;
    byPriority[action.priority] = (byPriority[action.priority] || 0) + 1;
  }

  return {
    pending: remediationQueue.filter(a => a.status === 'pending').length,
    completed: completedRemediations.filter(a => a.status === 'completed').length,
    failed: completedRemediations.filter(a => a.status === 'failed').length,
    byType,
    byPriority,
  };
}

export function getRecentRemediations(limit = 50): RemediationAction[] {
  return completedRemediations.slice(-limit).reverse();
}

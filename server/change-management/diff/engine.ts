/**
 * Change Diff Engine
 *
 * Generates human-readable + machine-readable diffs for change plans.
 * Supports preview without applying changes.
 */

import { db } from "../../db";
import { contents as content } from "@shared/schema";
import { eq } from "drizzle-orm";
import type {
  ChangePlan,
  ChangeItem,
  DiffBlock,
  ContentDiff,
  ChangePreview,
} from "../types";

// ============================================================================
// DIFF GENERATION
// ============================================================================

/**
 * Generate diff for a single change
 */
export async function generateChangeDiff(change: ChangeItem): Promise<DiffBlock[]> {
  const blocks: DiffBlock[] = [];

  if (change.field) {
    blocks.push(createDiffBlock(
      change.field,
      change.beforeValue,
      change.afterValue
    ));
  } else {
    // Handle complex changes (like content updates)
    if (typeof change.beforeValue === 'object' && typeof change.afterValue === 'object') {
      const beforeObj = change.beforeValue as Record<string, unknown>;
      const afterObj = change.afterValue as Record<string, unknown>;

      const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

      for (const key of allKeys) {
        const before = beforeObj[key];
        const after = afterObj[key];

        if (JSON.stringify(before) !== JSON.stringify(after)) {
          blocks.push(createDiffBlock(key, before, after));
        }
      }
    } else {
      blocks.push(createDiffBlock('value', change.beforeValue, change.afterValue));
    }
  }

  return blocks;
}

/**
 * Create a diff block from before/after values
 */
function createDiffBlock(field: string, before: unknown, after: unknown): DiffBlock {
  const beforeStr = formatValue(before);
  const afterStr = formatValue(after);

  let type: DiffBlock['type'];
  if (before === undefined || before === null) {
    type = 'added';
  } else if (after === undefined || after === null) {
    type = 'removed';
  } else if (beforeStr === afterStr) {
    type = 'unchanged';
  } else {
    type = 'modified';
  }

  return {
    field,
    type,
    before: beforeStr,
    after: afterStr,
  };
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    // Truncate long strings
    return value.length > 500 ? value.substring(0, 500) + '...' : value;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * Generate content-specific diff with entity and link changes
 */
export async function generateContentDiff(
  contentId: string,
  changes: ChangeItem[]
): Promise<ContentDiff> {
  // Get current content state
  const [currentContent] = await db.select().from(content).where(eq(content.id, parseInt(contentId))).limit(1);

  const blocks: DiffBlock[] = [];
  const entityChanges = { added: [] as string[], removed: [] as string[] };
  const linkChanges = {
    added: [] as { text: string; url: string }[],
    removed: [] as { text: string; url: string }[],
  };
  const metaChanges: DiffBlock[] = [];

  for (const change of changes) {
    if (change.targetType !== 'content' || change.targetId !== contentId) continue;

    const diffBlocks = await generateChangeDiff(change);

    for (const block of diffBlocks) {
      // Categorize the changes
      if (['metaTitle', 'metaDescription', 'metaKeywords', 'slug'].includes(block.field)) {
        metaChanges.push(block);
      } else {
        blocks.push(block);
      }
    }

    // Track entity changes
    if (change.type === 'link_add' && change.field === 'entity') {
      entityChanges.added.push(String(change.afterValue));
    }
    if (change.type === 'link_remove' && change.field === 'entity') {
      entityChanges.removed.push(String(change.beforeValue));
    }

    // Track link changes
    if (change.type === 'link_add') {
      const linkData = change.afterValue as { text?: string; url?: string };
      if (linkData.url) {
        linkChanges.added.push({ text: linkData.text || '', url: linkData.url });
      }
    }
    if (change.type === 'link_remove') {
      const linkData = change.beforeValue as { text?: string; url?: string };
      if (linkData.url) {
        linkChanges.removed.push({ text: linkData.text || '', url: linkData.url });
      }
    }
  }

  return {
    contentId,
    title: currentContent?.title || 'Unknown',
    blocks,
    entityChanges,
    linkChanges,
    metaChanges,
  };
}

/**
 * Generate preview for entire plan
 */
export async function generatePlanPreview(plan: ChangePlan): Promise<ChangePreview[]> {
  const previews: ChangePreview[] = [];

  for (const change of plan.changes) {
    try {
      const diff = await generateChangeDiff(change);

      previews.push({
        changeId: change.id,
        wouldApply: change.status === 'pending',
        reason: change.status !== 'pending' ? `Status: ${change.status}` : undefined,
        diff,
      });
    } catch (error) {
      previews.push({
        changeId: change.id,
        wouldApply: false,
        reason: `Error generating diff: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  return previews;
}

// ============================================================================
// HUMAN-READABLE OUTPUT
// ============================================================================

/**
 * Generate human-readable summary of changes
 */
export function generateHumanReadableSummary(plan: ChangePlan): string {
  const lines: string[] = [];

  lines.push(`# Change Plan: ${plan.name}`);
  lines.push(`ID: ${plan.id}`);
  lines.push(`Status: ${plan.status}`);
  lines.push(`Risk Level: ${plan.riskLevel.toUpperCase()}`);
  lines.push('');
  lines.push(`## Description`);
  lines.push(plan.description);
  lines.push('');
  lines.push(`## Impact Summary`);
  lines.push(`- Content affected: ${plan.impactEstimate.contentAffected}`);
  lines.push(`- Entities affected: ${plan.impactEstimate.entitiesAffected}`);
  lines.push(`- Pages needing reindex: ${plan.impactEstimate.pagesReindexNeeded}`);
  lines.push(`- AEO capsules to regenerate: ${plan.impactEstimate.capsulesToRegenerate}`);
  lines.push('');

  if (plan.impactEstimate.warnings.length > 0) {
    lines.push(`## Warnings`);
    for (const warning of plan.impactEstimate.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push('');
  }

  lines.push(`## Changes (${plan.changes.length} total)`);
  lines.push('');

  // Group changes by type
  const byType = new Map<string, ChangeItem[]>();
  for (const change of plan.changes) {
    const items = byType.get(change.type) || [];
    items.push(change);
    byType.set(change.type, items);
  }

  for (const [type, changes] of byType) {
    lines.push(`### ${formatChangeType(type)} (${changes.length})`);
    for (const change of changes.slice(0, 10)) {
      lines.push(`- ${change.targetTitle || change.targetId}${change.field ? `: ${change.field}` : ''}`);
    }
    if (changes.length > 10) {
      lines.push(`  ... and ${changes.length - 10} more`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format change type for display
 */
function formatChangeType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate unified diff format for a change
 */
export function generateUnifiedDiff(change: ChangeItem): string {
  const lines: string[] = [];

  lines.push(`--- a/${change.targetType}/${change.targetId}${change.field ? `#${change.field}` : ''}`);
  lines.push(`+++ b/${change.targetType}/${change.targetId}${change.field ? `#${change.field}` : ''}`);

  const beforeLines = formatValue(change.beforeValue).split('\n');
  const afterLines = formatValue(change.afterValue).split('\n');

  // Simple line-by-line diff
  const maxLines = Math.max(beforeLines.length, afterLines.length);

  for (let i = 0; i < maxLines; i++) {
    const before = beforeLines[i] || '';
    const after = afterLines[i] || '';

    if (before === after) {
      lines.push(` ${before}`);
    } else {
      if (before) lines.push(`-${before}`);
      if (after) lines.push(`+${after}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate JSON diff (machine-readable)
 */
export async function generateJsonDiff(plan: ChangePlan): Promise<object> {
  const previews = await generatePlanPreview(plan);

  return {
    planId: plan.id,
    planName: plan.name,
    status: plan.status,
    riskLevel: plan.riskLevel,
    generatedAt: new Date().toISOString(),
    summary: {
      totalChanges: plan.changes.length,
      byType: countByType(plan.changes),
      byTarget: countByTarget(plan.changes),
    },
    impact: plan.impactEstimate,
    changes: previews.map(p => ({
      id: p.changeId,
      wouldApply: p.wouldApply,
      reason: p.reason,
      diff: p.diff,
    })),
  };
}

function countByType(changes: ChangeItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const change of changes) {
    counts[change.type] = (counts[change.type] || 0) + 1;
  }
  return counts;
}

function countByTarget(changes: ChangeItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const change of changes) {
    counts[change.targetType] = (counts[change.targetType] || 0) + 1;
  }
  return counts;
}

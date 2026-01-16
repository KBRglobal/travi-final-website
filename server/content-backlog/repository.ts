/**
 * Content Backlog - Repository
 *
 * Stores and manages backlog items.
 */

import { BacklogItem, BacklogItemStatus, BacklogSource, BacklogSummary } from './types';
import { calculatePriorityScore, scoreAndRankItems } from './scorer';

// In-memory store (would be DB in production)
const backlogStore = new Map<string, BacklogItem>();

// Deduplication index
const dedupeIndex = new Map<string, string>(); // hash -> itemId

/**
 * Generate deduplication hash.
 */
function generateDedupeHash(item: Partial<BacklogItem>): string {
  const source = item.source || '';
  const title = (item.title || '').toLowerCase().trim();
  const keywords = (item.suggestedKeywords || []).sort().join(',');
  return `${source}:${title}:${keywords}`;
}

/**
 * Create a new backlog item.
 */
export async function createBacklogItem(
  item: Partial<BacklogItem>
): Promise<BacklogItem | null> {
  // Check for duplicates
  const hash = generateDedupeHash(item);
  if (dedupeIndex.has(hash)) {
    console.log(`[backlog] Duplicate item skipped: ${item.title}`);
    return null;
  }

  const id = `backlog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();

  const backlogItem: BacklogItem = {
    id,
    title: item.title || 'Untitled',
    description: item.description || '',
    source: item.source || 'zero_result_search',
    sourceDetails: item.sourceDetails || {},
    priorityScore: item.priorityScore || calculatePriorityScore(item),
    status: 'new',
    suggestedKeywords: item.suggestedKeywords || [],
    relatedEntityIds: item.relatedEntityIds || [],
    createdAt: now,
    updatedAt: now,
  };

  backlogStore.set(id, backlogItem);
  dedupeIndex.set(hash, id);

  return backlogItem;
}

/**
 * Create multiple backlog items (with deduplication).
 */
export async function createBacklogItems(
  items: Partial<BacklogItem>[]
): Promise<{ created: number; skipped: number }> {
  // Score items first
  const scoredItems = scoreAndRankItems(items);

  let created = 0;
  let skipped = 0;

  for (const item of scoredItems) {
    const result = await createBacklogItem(item);
    if (result) {
      created++;
    } else {
      skipped++;
    }
  }

  return { created, skipped };
}

/**
 * Get backlog item by ID.
 */
export async function getBacklogItem(id: string): Promise<BacklogItem | null> {
  return backlogStore.get(id) || null;
}

/**
 * Get all backlog items.
 */
export async function getBacklogItems(
  options: {
    status?: BacklogItemStatus;
    source?: BacklogSource;
    minScore?: number;
    limit?: number;
  } = {}
): Promise<BacklogItem[]> {
  const { status, source, minScore = 0, limit = 100 } = options;

  let items = Array.from(backlogStore.values());

  if (status) {
    items = items.filter(i => i.status === status);
  }

  if (source) {
    items = items.filter(i => i.source === source);
  }

  if (minScore > 0) {
    items = items.filter(i => i.priorityScore >= minScore);
  }

  return items
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, limit);
}

/**
 * Update backlog item status.
 */
export async function updateBacklogItemStatus(
  id: string,
  status: BacklogItemStatus
): Promise<BacklogItem | null> {
  const item = backlogStore.get(id);
  if (!item) return null;

  item.status = status;
  item.updatedAt = new Date();

  backlogStore.set(id, item);
  return item;
}

/**
 * Convert backlog item to draft content.
 */
export async function convertToContent(
  id: string,
  contentId: string
): Promise<BacklogItem | null> {
  const item = backlogStore.get(id);
  if (!item) return null;

  item.status = 'converted';
  item.convertedContentId = contentId;
  item.updatedAt = new Date();

  backlogStore.set(id, item);
  return item;
}

/**
 * Delete backlog item.
 */
export async function deleteBacklogItem(id: string): Promise<boolean> {
  const item = backlogStore.get(id);
  if (!item) return false;

  // Remove from dedupe index
  const hash = generateDedupeHash(item);
  dedupeIndex.delete(hash);

  return backlogStore.delete(id);
}

/**
 * Get backlog summary.
 */
export async function getBacklogSummary(): Promise<BacklogSummary> {
  const items = Array.from(backlogStore.values());

  const byStatus: Record<BacklogItemStatus, number> = {
    new: 0,
    in_review: 0,
    approved: 0,
    rejected: 0,
    converted: 0,
  };

  const bySource: Record<BacklogSource, number> = {
    zero_result_search: 0,
    low_click_search: 0,
    rss_topic: 0,
    entity_gap: 0,
  };

  let totalScore = 0;

  for (const item of items) {
    byStatus[item.status]++;
    bySource[item.source]++;
    totalScore += item.priorityScore;
  }

  const topItems = items
    .filter(i => i.status === 'new' || i.status === 'approved')
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 10);

  return {
    total: items.length,
    byStatus,
    bySource,
    averageScore: items.length > 0 ? Math.round(totalScore / items.length) : 0,
    topItems,
  };
}

/**
 * Clear old converted/rejected items.
 */
export async function cleanupOldItems(olderThanDays: number = 30): Promise<number> {
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  let cleaned = 0;

  for (const [id, item] of backlogStore) {
    if (
      (item.status === 'converted' || item.status === 'rejected') &&
      item.updatedAt.getTime() < cutoff
    ) {
      await deleteBacklogItem(id);
      cleaned++;
    }
  }

  return cleaned;
}

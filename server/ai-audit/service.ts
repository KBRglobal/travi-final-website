/**
 * AI Output Audit Trail Service
 */

import {
  type AiAuditEntry,
  type AiOperationType,
  type AuditStatus,
  type AuditFilter,
  type AuditStats,
} from "./types";

const auditLog: AiAuditEntry[] = [];

function generateId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function recordAiOperation(
  contentId: string,
  operationType: AiOperationType,
  model: string,
  prompt: string,
  output: string,
  createdBy: string,
  options: {
    promptTokens?: number;
    outputTokens?: number;
    cost?: number;
    duration?: number;
    metadata?: Record<string, unknown>;
  } = {}
): AiAuditEntry {
  const promptTokens = options.promptTokens || Math.ceil(prompt.length / 4);
  const outputTokens = options.outputTokens || Math.ceil(output.length / 4);

  const entry: AiAuditEntry = {
    id: generateId(),
    contentId,
    operationType,
    model,
    prompt: prompt.substring(0, 5000),
    promptTokens,
    output: output.substring(0, 10000),
    outputTokens,
    totalTokens: promptTokens + outputTokens,
    cost: options.cost || (promptTokens + outputTokens) * 0.00001,
    duration: options.duration || 0,
    status: 'pending',
    createdAt: new Date(),
    createdBy,
    metadata: options.metadata || {},
  };

  auditLog.push(entry);
  return entry;
}

export function reviewAuditEntry(
  entryId: string,
  status: AuditStatus,
  reviewedBy: string,
  notes?: string
): boolean {
  const entry = auditLog.find(e => e.id === entryId);
  if (!entry) return false;

  entry.status = status;
  entry.reviewedBy = reviewedBy;
  entry.reviewedAt = new Date();
  entry.reviewNotes = notes;
  return true;
}

export function getAuditEntry(entryId: string): AiAuditEntry | undefined {
  return auditLog.find(e => e.id === entryId);
}

export function queryAuditLog(filter: AuditFilter = {}): AiAuditEntry[] {
  let results = [...auditLog];

  if (filter.contentId) {
    results = results.filter(e => e.contentId === filter.contentId);
  }
  if (filter.operationType) {
    results = results.filter(e => e.operationType === filter.operationType);
  }
  if (filter.status) {
    results = results.filter(e => e.status === filter.status);
  }
  if (filter.model) {
    results = results.filter(e => e.model === filter.model);
  }
  if (filter.startDate) {
    results = results.filter(e => e.createdAt >= filter.startDate!);
  }
  if (filter.endDate) {
    results = results.filter(e => e.createdAt <= filter.endDate!);
  }

  results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (filter.limit) {
    results = results.slice(0, filter.limit);
  }

  return results;
}

export function getContentAuditHistory(contentId: string): AiAuditEntry[] {
  return queryAuditLog({ contentId });
}

export function getAuditStats(filter?: { startDate?: Date; endDate?: Date }): AuditStats {
  let entries = [...auditLog];

  if (filter?.startDate) {
    entries = entries.filter(e => e.createdAt >= filter.startDate!);
  }
  if (filter?.endDate) {
    entries = entries.filter(e => e.createdAt <= filter.endDate!);
  }

  const byOperation: Record<AiOperationType, number> = {
    content_generation: 0,
    content_rewrite: 0,
    seo_optimization: 0,
    aeo_capsule: 0,
    entity_extraction: 0,
    translation: 0,
    image_generation: 0,
    summary: 0,
    other: 0,
  };

  const byStatus: Record<AuditStatus, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
    modified: 0,
  };

  let totalTokens = 0;
  let totalCost = 0;
  let totalDuration = 0;

  for (const entry of entries) {
    byOperation[entry.operationType]++;
    byStatus[entry.status]++;
    totalTokens += entry.totalTokens;
    totalCost += entry.cost;
    totalDuration += entry.duration;
  }

  return {
    totalOperations: entries.length,
    totalTokens,
    totalCost: Math.round(totalCost * 100) / 100,
    byOperation,
    byStatus,
    avgDuration: entries.length > 0 ? Math.round(totalDuration / entries.length) : 0,
  };
}

export function getPendingReviews(): AiAuditEntry[] {
  return auditLog.filter(e => e.status === 'pending');
}

export function exportAuditLog(filter?: AuditFilter): string {
  const entries = queryAuditLog(filter);
  return JSON.stringify(entries, null, 2);
}

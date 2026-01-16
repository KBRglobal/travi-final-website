/**
 * AI Output Audit Trail Types
 */

export type AiOperationType =
  | 'content_generation'
  | 'content_rewrite'
  | 'seo_optimization'
  | 'aeo_capsule'
  | 'entity_extraction'
  | 'translation'
  | 'image_generation'
  | 'summary'
  | 'other';

export type AuditStatus = 'pending' | 'approved' | 'rejected' | 'modified';

export interface AiAuditEntry {
  id: string;
  contentId: string;
  operationType: AiOperationType;
  model: string;
  prompt: string;
  promptTokens: number;
  output: string;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  duration: number;
  status: AuditStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  createdBy: string;
  metadata: Record<string, unknown>;
}

export interface AuditFilter {
  contentId?: string;
  operationType?: AiOperationType;
  status?: AuditStatus;
  model?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface AuditStats {
  totalOperations: number;
  totalTokens: number;
  totalCost: number;
  byOperation: Record<AiOperationType, number>;
  byStatus: Record<AuditStatus, number>;
  avgDuration: number;
}

export function isAiAuditEnabled(): boolean {
  return process.env.ENABLE_AI_AUDIT === 'true';
}

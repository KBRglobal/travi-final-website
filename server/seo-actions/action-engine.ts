/**
 * SEO Action Engine - Autonomous Decision Layer
 *
 * This engine EXECUTES decisions, not recommendations.
 * Actions are taken automatically based on SEO/AEO signals.
 *
 * Modes:
 * - OFF: No automatic actions
 * - SUPERVISED: Actions require confirmation
 * - FULL: Autonomous execution
 */

import { db } from '../db';
import { contents, seoAuditLogs } from '../../shared/schema';
import { eq, and, lt, gt, sql, isNull } from 'drizzle-orm';
import { PageClassifier, PageClassification } from '../seo-engine/page-classifier';

export type AutopilotMode = 'off' | 'supervised' | 'full';

export type ActionType =
  | 'BLOCK_PUBLISH'
  | 'ALLOW_PUBLISH'
  | 'SET_NOINDEX'
  | 'SET_INDEX'
  | 'AUTO_FIX'
  | 'QUEUE_REINDEX'
  | 'GENERATE_SCHEMA'
  | 'SET_CANONICAL'
  | 'INJECT_LINKS'
  | 'GENERATE_ANSWER_CAPSULE'
  | 'GENERATE_FAQ'
  | 'FLAG_FOR_REVIEW'
  | 'MOVE_TO_DRAFT'
  | 'QUEUE_MERGE'
  | 'QUEUE_DELETE'
  | 'ALERT';

export type ActionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface SEOAction {
  id: string;
  contentId: string;
  actionType: ActionType;
  priority: ActionPriority;
  reason: string;
  triggeredBy: 'automatic' | 'manual';
  requiresConfirmation: boolean;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  data?: Record<string, any>;
  createdAt: Date;
  executedAt?: Date;
  executedBy?: string;
}

export interface ActionDecision {
  shouldExecute: boolean;
  actions: SEOAction[];
  blocks: string[];
  warnings: string[];
}

// Absolute blocks - NO override allowed
const ABSOLUTE_BLOCKS = [
  { condition: (c: any) => (c.seoScore || 0) < 40, reason: 'Critical SEO failure (score < 40)' },
  { condition: (c: any) => !c.metaTitle, reason: 'Missing meta title' },
  { condition: (c: any) => !c.metaDescription, reason: 'Missing meta description' },
  { condition: (c: any) => (c.wordCount || 0) < 200, reason: 'Content too thin (< 200 words)' },
  { condition: (c: any) => (c.duplicateSimilarity || 0) > 0.9, reason: 'Near-duplicate content' },
  { condition: (c: any) => (c.spamScore || 0) > 0.7, reason: 'Spam detected' },
  { condition: (c: any) => c.aiHallucinationDetected, reason: 'AI hallucination flagged' },
];

// Conditional blocks - Admin can override
const CONDITIONAL_BLOCKS = [
  {
    condition: (c: any) => (c.seoScore || 0) < 60 && c.pageClassification === 'MONEY_PAGE',
    reason: 'Money page below SEO threshold (score < 60)',
  },
  {
    condition: (c: any) => (c.aeoScore || 0) < 50 && c.pageClassification === 'INFORMATIONAL',
    reason: 'Informational page not AEO-ready (score < 50)',
  },
  {
    condition: (c: any) => (c.cannibalizationRisk || 0) > 0.7,
    reason: 'High cannibalization risk',
  },
  {
    condition: (c: any) => (c.internalLinksCount || 0) < 2,
    reason: 'Insufficient internal linking',
  },
  {
    condition: (c: any) => !c.schemaMarkup,
    reason: 'Missing structured data',
  },
];

// Warnings - logged but not blocking
const WARNINGS = [
  {
    condition: (c: any) => {
      const density = c.keywordDensity || 0;
      return density < 0.5 || density > 3.0;
    },
    reason: 'Keyword density outside optimal range (0.5-3%)',
  },
  { condition: (c: any) => (c.readabilityScore || 0) < 50, reason: 'Low readability score' },
  { condition: (c: any) => (c.avgParagraphLength || 0) > 200, reason: 'Paragraphs too long' },
  { condition: (c: any) => (c.externalLinksCount || 0) === 0, reason: 'No external links' },
  { condition: (c: any) => (c.imageCount || 0) < 2, reason: 'Insufficient images' },
];

export class SEOActionEngine {
  private autopilotMode: AutopilotMode = 'supervised';
  private classifier: PageClassifier;

  constructor(mode: AutopilotMode = 'supervised') {
    this.autopilotMode = mode;
    this.classifier = new PageClassifier();
  }

  /**
   * Set autopilot mode
   */
  setAutopilotMode(mode: AutopilotMode): void {
    this.autopilotMode = mode;
  }

  /**
   * Get current autopilot mode
   */
  getAutopilotMode(): AutopilotMode {
    return this.autopilotMode;
  }

  /**
   * Evaluate content and decide on actions
   */
  async evaluateContent(contentId: string): Promise<ActionDecision> {
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    // Classify the content first
    const classification = await this.classifier.classifyContent(contentId);

    const actions: SEOAction[] = [];
    const blocks: string[] = [];
    const warnings: string[] = [];

    // Check absolute blocks
    for (const block of ABSOLUTE_BLOCKS) {
      if (block.condition(content)) {
        blocks.push(block.reason);
        actions.push(this.createAction(contentId, 'BLOCK_PUBLISH', 'CRITICAL', block.reason));
      }
    }

    // If no absolute blocks, check conditional blocks
    if (blocks.length === 0) {
      for (const block of CONDITIONAL_BLOCKS) {
        if (block.condition({ ...content, pageClassification: classification.classification })) {
          if (this.autopilotMode === 'full') {
            // In full autopilot, treat as blocking
            blocks.push(block.reason);
            actions.push(this.createAction(contentId, 'BLOCK_PUBLISH', 'HIGH', block.reason));
          } else {
            // In supervised mode, flag for review
            warnings.push(block.reason);
            actions.push(this.createAction(contentId, 'FLAG_FOR_REVIEW', 'HIGH', block.reason, true));
          }
        }
      }
    }

    // Check warnings
    for (const warning of WARNINGS) {
      if (warning.condition(content)) {
        warnings.push(warning.reason);
      }
    }

    // Add auto-fix actions if no blocks
    if (blocks.length === 0) {
      // Auto-generate schema if missing
      if (!content.schemaMarkup) {
        actions.push(this.createAction(contentId, 'GENERATE_SCHEMA', 'MEDIUM', 'Missing structured data'));
      }

      // Auto-set canonical if missing
      if (!content.canonicalUrl) {
        actions.push(this.createAction(contentId, 'SET_CANONICAL', 'MEDIUM', 'Missing canonical URL'));
      }

      // Queue for reindex
      actions.push(this.createAction(contentId, 'QUEUE_REINDEX', 'LOW', 'Content updated'));

      // Generate answer capsule if AEO-eligible
      if (
        classification.requirements.answerCapsuleRequired &&
        !(content as any).answerCapsule
      ) {
        actions.push(
          this.createAction(contentId, 'GENERATE_ANSWER_CAPSULE', 'HIGH', 'AEO requirement: missing answer capsule')
        );
      }

      // Generate FAQs if needed
      const faqCount = (content as any).faqCount || 0;
      if (faqCount < classification.requirements.minFAQs) {
        actions.push(
          this.createAction(
            contentId,
            'GENERATE_FAQ',
            'MEDIUM',
            `AEO requirement: needs ${classification.requirements.minFAQs - faqCount} more FAQs`
          )
        );
      }

      // Inject internal links if insufficient
      const internalLinksCount = (content as any).internalLinksCount || 0;
      if (internalLinksCount < 3) {
        actions.push(
          this.createAction(contentId, 'INJECT_LINKS', 'MEDIUM', 'Insufficient internal linking')
        );
      }
    }

    // Handle SEO_RISK classification
    if (classification.classification === 'SEO_RISK') {
      actions.push(this.createAction(contentId, 'SET_NOINDEX', 'HIGH', classification.reason));
      actions.push(this.createAction(contentId, 'QUEUE_MERGE', 'MEDIUM', 'SEO_RISK content queued for merge/delete'));
    }

    return {
      shouldExecute: blocks.length === 0,
      actions,
      blocks,
      warnings,
    };
  }

  /**
   * Execute pending actions for content
   */
  async executeActions(contentId: string): Promise<{ executed: SEOAction[]; skipped: SEOAction[] }> {
    if (this.autopilotMode === 'off') {
      return { executed: [], skipped: [] };
    }

    const decision = await this.evaluateContent(contentId);
    const executed: SEOAction[] = [];
    const skipped: SEOAction[] = [];

    for (const action of decision.actions) {
      if (action.requiresConfirmation && this.autopilotMode !== 'full') {
        skipped.push(action);
        continue;
      }

      try {
        await this.executeAction(action);
        executed.push({ ...action, status: 'completed', executedAt: new Date() });
      } catch (error) {
        console.error(`Failed to execute action ${action.actionType}:`, error);
        skipped.push({ ...action, status: 'failed' });
      }
    }

    // Log all actions
    for (const action of [...executed, ...skipped]) {
      await this.logAction(action);
    }

    return { executed, skipped };
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: SEOAction): Promise<void> {
    switch (action.actionType) {
      case 'BLOCK_PUBLISH':
        await this.blockPublish(action.contentId, action.reason);
        break;

      case 'SET_NOINDEX':
        await this.setNoindex(action.contentId);
        break;

      case 'SET_INDEX':
        await this.setIndex(action.contentId);
        break;

      case 'QUEUE_REINDEX':
        await this.queueReindex(action.contentId);
        break;

      case 'GENERATE_SCHEMA':
        await this.generateSchema(action.contentId);
        break;

      case 'SET_CANONICAL':
        await this.setCanonical(action.contentId);
        break;

      case 'MOVE_TO_DRAFT':
        await this.moveToDraft(action.contentId, action.reason);
        break;

      case 'GENERATE_ANSWER_CAPSULE':
        // This would integrate with content AI system
        console.log(`[ACTION] Generate answer capsule for ${action.contentId}`);
        break;

      case 'GENERATE_FAQ':
        // This would integrate with content AI system
        console.log(`[ACTION] Generate FAQs for ${action.contentId}`);
        break;

      case 'INJECT_LINKS':
        // This would use InternalLinkingEngine
        console.log(`[ACTION] Inject internal links for ${action.contentId}`);
        break;

      case 'QUEUE_MERGE':
        // Mark for merge review
        await db
          .update(contents)
          .set({ mergeQueued: true, mergeQueuedAt: new Date() } as any)
          .where(eq(contents.id, action.contentId));
        break;

      case 'QUEUE_DELETE':
        // Mark for deletion review
        await db
          .update(contents)
          .set({ deleteQueued: true, deleteQueuedAt: new Date() } as any)
          .where(eq(contents.id, action.contentId));
        break;

      case 'ALERT':
        // Send alert (would integrate with notification system)
        console.log(`[ALERT] ${action.reason} for content ${action.contentId}`);
        break;

      default:
        console.log(`[ACTION] Unknown action type: ${action.actionType}`);
    }
  }

  /**
   * Block content from publishing
   */
  private async blockPublish(contentId: string, reason: string): Promise<void> {
    await db
      .update(contents)
      .set({
        status: 'draft',
        publishBlocked: true,
        publishBlockReason: reason,
        publishBlockedAt: new Date(),
      } as any)
      .where(eq(contents.id, contentId));
  }

  /**
   * Set content to noindex
   */
  private async setNoindex(contentId: string): Promise<void> {
    await db
      .update(contents)
      .set({ noindex: true } as any)
      .where(eq(contents.id, contentId));
  }

  /**
   * Set content to index
   */
  private async setIndex(contentId: string): Promise<void> {
    await db
      .update(contents)
      .set({ noindex: false } as any)
      .where(eq(contents.id, contentId));
  }

  /**
   * Queue content for reindex
   */
  private async queueReindex(contentId: string): Promise<void> {
    await db
      .update(contents)
      .set({ reindexQueued: true, reindexQueuedAt: new Date() } as any)
      .where(eq(contents.id, contentId));
  }

  /**
   * Generate schema markup
   */
  private async generateSchema(contentId: string): Promise<void> {
    // This would use SchemaEngine from seo-engine
    console.log(`[ACTION] Generate schema for ${contentId}`);
    // Schema generation logic would go here
  }

  /**
   * Set canonical URL
   */
  private async setCanonical(contentId: string): Promise<void> {
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (content) {
      const canonical = `https://traviseo.com/${content.slug}`;
      await db
        .update(contents)
        .set({ canonicalUrl: canonical } as any)
        .where(eq(contents.id, contentId));
    }
  }

  /**
   * Move content to draft
   */
  private async moveToDraft(contentId: string, reason: string): Promise<void> {
    await db
      .update(contents)
      .set({
        status: 'draft',
        movedToDraftReason: reason,
        movedToDraftAt: new Date(),
      } as any)
      .where(eq(contents.id, contentId));
  }

  /**
   * Create an action object
   */
  private createAction(
    contentId: string,
    actionType: ActionType,
    priority: ActionPriority,
    reason: string,
    requiresConfirmation: boolean = false,
    data?: Record<string, any>
  ): SEOAction {
    return {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contentId,
      actionType,
      priority,
      reason,
      triggeredBy: 'automatic',
      requiresConfirmation,
      status: 'pending',
      data,
      createdAt: new Date(),
    };
  }

  /**
   * Log action to audit trail
   */
  private async logAction(action: SEOAction): Promise<void> {
    try {
      await db.insert(seoAuditLogs).values({
        contentId: action.contentId,
        action: action.actionType,
        reason: action.reason,
        triggeredBy: action.triggeredBy,
        status: action.status,
        priority: action.priority,
        data: action.data ? JSON.stringify(action.data) : null,
        createdAt: action.createdAt,
        executedAt: action.executedAt,
      } as any);
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  }

  /**
   * Get pending actions for all content
   */
  async getPendingActions(): Promise<Map<string, SEOAction[]>> {
    const allContent = await db.query.contents.findMany({
      where: eq(contents.status, 'published'),
    });

    const pendingActions = new Map<string, SEOAction[]>();

    for (const content of allContent) {
      const decision = await this.evaluateContent(content.id);
      const pending = decision.actions.filter(
        (a) => a.requiresConfirmation || a.status === 'pending'
      );
      if (pending.length > 0) {
        pendingActions.set(content.id, pending);
      }
    }

    return pendingActions;
  }

  /**
   * Execute all automatic actions (for batch processing)
   */
  async executeAllAutomaticActions(): Promise<{
    total: number;
    executed: number;
    skipped: number;
    errors: number;
  }> {
    if (this.autopilotMode === 'off') {
      return { total: 0, executed: 0, skipped: 0, errors: 0 };
    }

    const allContent = await db.query.contents.findMany({
      where: eq(contents.status, 'published'),
    });

    let total = 0;
    let executed = 0;
    let skipped = 0;
    let errors = 0;

    for (const content of allContent) {
      try {
        const result = await this.executeActions(content.id);
        total += result.executed.length + result.skipped.length;
        executed += result.executed.length;
        skipped += result.skipped.length;
      } catch (error) {
        errors++;
        console.error(`Error executing actions for ${content.id}:`, error);
      }
    }

    return { total, executed, skipped, errors };
  }

  /**
   * Pre-publish validation (called before any content is published)
   */
  async validatePrePublish(contentId: string): Promise<{
    canPublish: boolean;
    blocks: string[];
    warnings: string[];
    requiredActions: SEOAction[];
  }> {
    const decision = await this.evaluateContent(contentId);

    return {
      canPublish: decision.shouldExecute,
      blocks: decision.blocks,
      warnings: decision.warnings,
      requiredActions: decision.actions.filter((a) => a.priority === 'CRITICAL' || a.priority === 'HIGH'),
    };
  }
}

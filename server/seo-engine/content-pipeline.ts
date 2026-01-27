/**
 * Content Pipeline - Zero/Thin/Toxic Content Detection and Action
 *
 * Pipeline stages:
 * 1. DETECT - Identify problematic content
 * 2. CLASSIFY - Categorize the issue
 * 3. DECIDE - Determine action
 * 4. EXECUTE - Take automatic action
 *
 * Content types:
 * - ZERO: No traffic for 90+ days
 * - THIN: Word count below minimum
 * - TOXIC: Harmful to site SEO (duplicate, cannibalization, spam)
 */

import { db } from "../db";
import { contents } from "../../shared/schema";
import { eq, and, lt, gt, sql, or } from "drizzle-orm";
import { PageClassifier } from "./page-classifier";
import { SEOActionEngine, AutopilotMode } from "../seo-actions/action-engine";

export type ContentIssueType =
  | "ZERO"
  | "THIN"
  | "TOXIC"
  | "STALE"
  | "DUPLICATE"
  | "CANNIBALIZATION";

export type ContentAction =
  | "NOINDEX"
  | "MERGE"
  | "DELETE"
  | "ENHANCE"
  | "REDIRECT"
  | "FLAG"
  | "KEEP";

export interface ContentIssue {
  contentId: string;
  title: string;
  url: string;
  issueType: ContentIssueType;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  details: string;
  metrics: {
    wordCount?: number;
    trafficLast90Days?: number;
    seoScore?: number;
    duplicateSimilarity?: number;
    cannibalizationScore?: number;
    daysWithoutTraffic?: number;
    daysSinceUpdate?: number;
  };
  suggestedAction: ContentAction;
  autoActionEnabled: boolean;
  relatedContentIds?: string[];
}

export interface PipelineResult {
  scannedCount: number;
  issuesFound: number;
  actionsExecuted: number;
  issues: ContentIssue[];
  summary: {
    zero: number;
    thin: number;
    toxic: number;
    stale: number;
    duplicate: number;
    cannibalization: number;
  };
}

// Minimum word counts by content type
const MIN_WORD_COUNTS: Record<string, number> = {
  attraction: 1500,
  hotel: 1200,
  article: 1200,
  dining: 1200,
  district: 1500,
  event: 800,
  itinerary: 1500,
  guide: 1800,
  landing_page: 1000,
};

// Thin content thresholds (percentage of minimum)
const THIN_THRESHOLD = 0.5; // 50% of minimum is thin
const CRITICAL_THIN_THRESHOLD = 0.25; // 25% of minimum is critical

export class ContentPipeline {
  private classifier: PageClassifier;
  private actionEngine: SEOActionEngine;
  private autopilotMode: AutopilotMode;

  constructor(autopilotMode: AutopilotMode = "supervised") {
    this.classifier = new PageClassifier();
    this.actionEngine = new SEOActionEngine(autopilotMode);
    this.autopilotMode = autopilotMode;
  }

  /**
   * Run the full content pipeline
   */
  async runPipeline(): Promise<PipelineResult> {
    const allContent = await db.query.contents.findMany({
      where: eq(contents.status, "published"),
    });

    const issues: ContentIssue[] = [];
    const summary = {
      zero: 0,
      thin: 0,
      toxic: 0,
      stale: 0,
      duplicate: 0,
      cannibalization: 0,
    };

    // Stage 1 & 2: DETECT and CLASSIFY
    for (const content of allContent) {
      const contentIssues = await this.detectIssues(content);
      issues.push(...contentIssues);

      // Update summary
      for (const issue of contentIssues) {
        switch (issue.issueType) {
          case "ZERO":
            summary.zero++;
            break;
          case "THIN":
            summary.thin++;
            break;
          case "TOXIC":
            summary.toxic++;
            break;
          case "STALE":
            summary.stale++;
            break;
          case "DUPLICATE":
            summary.duplicate++;
            break;
          case "CANNIBALIZATION":
            summary.cannibalization++;
            break;
        }
      }
    }

    // Stage 3 & 4: DECIDE and EXECUTE
    let actionsExecuted = 0;
    if (this.autopilotMode !== "off") {
      for (const issue of issues) {
        if (issue.autoActionEnabled) {
          const executed = await this.executeAction(issue);
          if (executed) actionsExecuted++;
        }
      }
    }

    return {
      scannedCount: allContent.length,
      issuesFound: issues.length,
      actionsExecuted,
      issues: issues.sort((a, b) => {
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      summary,
    };
  }

  /**
   * Detect issues for a single content item
   */
  private async detectIssues(content: any): Promise<ContentIssue[]> {
    const issues: ContentIssue[] = [];

    // Check for ZERO traffic
    const zeroIssue = this.checkZeroTraffic(content);
    if (zeroIssue) issues.push(zeroIssue);

    // Check for THIN content
    const thinIssue = this.checkThinContent(content);
    if (thinIssue) issues.push(thinIssue);

    // Check for STALE content
    const staleIssue = this.checkStaleContent(content);
    if (staleIssue) issues.push(staleIssue);

    // Check for DUPLICATE content
    const duplicateIssue = await this.checkDuplicateContent(content);
    if (duplicateIssue) issues.push(duplicateIssue);

    // Check for CANNIBALIZATION
    const cannibalizationIssue = await this.checkCannibalization(content);
    if (cannibalizationIssue) issues.push(cannibalizationIssue);

    return issues;
  }

  /**
   * Check for zero traffic content
   */
  private checkZeroTraffic(content: any): ContentIssue | null {
    const trafficLast90Days = content.trafficLast90Days || 0;
    const createdAt = new Date(content.createdAt);
    const ageInDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    // Only flag if content is old enough
    if (ageInDays < 30) return null;

    if (trafficLast90Days === 0 && ageInDays > 90) {
      return {
        contentId: content.id,
        title: content.title,
        url: content.slug || `/${content.type}/${content.id}`,
        issueType: "ZERO",
        severity: "CRITICAL",
        details: `No traffic for 90+ days (${ageInDays} days old)`,
        metrics: {
          trafficLast90Days: 0,
          daysWithoutTraffic: ageInDays,
        },
        suggestedAction: "NOINDEX",
        autoActionEnabled: this.autopilotMode === "full",
      };
    }

    if (trafficLast90Days < 10 && ageInDays > 60) {
      return {
        contentId: content.id,
        title: content.title,
        url: content.slug || `/${content.type}/${content.id}`,
        issueType: "ZERO",
        severity: "HIGH",
        details: `Very low traffic (${trafficLast90Days} visits in 90 days)`,
        metrics: {
          trafficLast90Days,
          daysWithoutTraffic: ageInDays,
        },
        suggestedAction: "ENHANCE",
        autoActionEnabled: false,
      };
    }

    return null;
  }

  /**
   * Check for thin content
   */
  private checkThinContent(content: any): ContentIssue | null {
    const wordCount = content.wordCount || 0;
    const contentType = content.type?.toLowerCase() || "article";
    const minWords = MIN_WORD_COUNTS[contentType] || 800;

    const ratio = wordCount / minWords;

    if (ratio < CRITICAL_THIN_THRESHOLD) {
      return {
        contentId: content.id,
        title: content.title,
        url: content.slug || `/${content.type}/${content.id}`,
        issueType: "THIN",
        severity: "CRITICAL",
        details: `Critically thin content: ${wordCount} words (need ${minWords}, only ${Math.round(ratio * 100)}%)`,
        metrics: {
          wordCount,
          seoScore: content.seoScore,
        },
        suggestedAction: "NOINDEX",
        autoActionEnabled: this.autopilotMode === "full",
      };
    }

    if (ratio < THIN_THRESHOLD) {
      return {
        contentId: content.id,
        title: content.title,
        url: content.slug || `/${content.type}/${content.id}`,
        issueType: "THIN",
        severity: "HIGH",
        details: `Thin content: ${wordCount} words (need ${minWords}, only ${Math.round(ratio * 100)}%)`,
        metrics: {
          wordCount,
          seoScore: content.seoScore,
        },
        suggestedAction: "ENHANCE",
        autoActionEnabled: false,
      };
    }

    return null;
  }

  /**
   * Check for stale content
   */
  private checkStaleContent(content: any): ContentIssue | null {
    const updatedAt = new Date(content.updatedAt || content.createdAt);
    const daysSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

    // Different thresholds by content type
    const staleThresholds: Record<string, number> = {
      event: 30,
      news: 60,
      guide: 180,
      article: 180,
      hotel: 365,
      attraction: 365,
    };

    const threshold = staleThresholds[content.type?.toLowerCase()] || 180;

    if (daysSinceUpdate > threshold * 2) {
      return {
        contentId: content.id,
        title: content.title,
        url: content.slug || `/${content.type}/${content.id}`,
        issueType: "STALE",
        severity: "HIGH",
        details: `Very stale content: not updated in ${daysSinceUpdate} days`,
        metrics: {
          daysSinceUpdate,
        },
        suggestedAction: "FLAG",
        autoActionEnabled: false,
      };
    }

    if (daysSinceUpdate > threshold) {
      return {
        contentId: content.id,
        title: content.title,
        url: content.slug || `/${content.type}/${content.id}`,
        issueType: "STALE",
        severity: "MEDIUM",
        details: `Stale content: not updated in ${daysSinceUpdate} days`,
        metrics: {
          daysSinceUpdate,
        },
        suggestedAction: "ENHANCE",
        autoActionEnabled: false,
      };
    }

    return null;
  }

  /**
   * Check for duplicate content
   */
  private async checkDuplicateContent(content: any): Promise<ContentIssue | null> {
    const duplicateSimilarity = content.duplicateSimilarity || 0;
    const duplicateOfId = content.duplicateOfId;

    if (duplicateSimilarity > 0.9) {
      return {
        contentId: content.id,
        title: content.title,
        url: content.slug || `/${content.type}/${content.id}`,
        issueType: "DUPLICATE",
        severity: "CRITICAL",
        details: `Near-duplicate content (${Math.round(duplicateSimilarity * 100)}% similar)`,
        metrics: {
          duplicateSimilarity,
        },
        suggestedAction: "MERGE",
        autoActionEnabled: this.autopilotMode === "full",
        relatedContentIds: duplicateOfId ? [duplicateOfId] : undefined,
      };
    }

    if (duplicateSimilarity > 0.7) {
      return {
        contentId: content.id,
        title: content.title,
        url: content.slug || `/${content.type}/${content.id}`,
        issueType: "DUPLICATE",
        severity: "HIGH",
        details: `High duplicate similarity (${Math.round(duplicateSimilarity * 100)}%)`,
        metrics: {
          duplicateSimilarity,
        },
        suggestedAction: "FLAG",
        autoActionEnabled: false,
        relatedContentIds: duplicateOfId ? [duplicateOfId] : undefined,
      };
    }

    return null;
  }

  /**
   * Check for keyword cannibalization
   */
  private async checkCannibalization(content: any): Promise<ContentIssue | null> {
    const cannibalizationScore = content.cannibalizationScore || 0;
    const cannibalizedBy = content.cannibalizedBy;

    if (cannibalizationScore > 0.8) {
      return {
        contentId: content.id,
        title: content.title,
        url: content.slug || `/${content.type}/${content.id}`,
        issueType: "CANNIBALIZATION",
        severity: "HIGH",
        details: `High cannibalization risk (${Math.round(cannibalizationScore * 100)}%)`,
        metrics: {
          cannibalizationScore,
        },
        suggestedAction: "MERGE",
        autoActionEnabled: false,
        relatedContentIds: cannibalizedBy ? [cannibalizedBy] : undefined,
      };
    }

    if (cannibalizationScore > 0.5) {
      return {
        contentId: content.id,
        title: content.title,
        url: content.slug || `/${content.type}/${content.id}`,
        issueType: "CANNIBALIZATION",
        severity: "MEDIUM",
        details: `Moderate cannibalization risk (${Math.round(cannibalizationScore * 100)}%)`,
        metrics: {
          cannibalizationScore,
        },
        suggestedAction: "FLAG",
        autoActionEnabled: false,
        relatedContentIds: cannibalizedBy ? [cannibalizedBy] : undefined,
      };
    }

    return null;
  }

  /**
   * Execute action for an issue
   */
  private async executeAction(issue: ContentIssue): Promise<boolean> {
    try {
      switch (issue.suggestedAction) {
        case "NOINDEX":
          await db
            .update(contents)
            .set({
              noindex: true,
              noindexReason: issue.details,
              noindexedAt: new Date(),
            } as any)
            .where(eq(contents.id, issue.contentId));

          return true;

        case "MERGE":
          await db
            .update(contents)
            .set({
              mergeQueued: true,
              mergeQueuedAt: new Date(),
              mergeReason: issue.details,
              mergeWithId: issue.relatedContentIds?.[0],
            } as any)
            .where(eq(contents.id, issue.contentId));

          return true;

        case "DELETE":
          await db
            .update(contents)
            .set({
              deleteQueued: true,
              deleteQueuedAt: new Date(),
              deleteReason: issue.details,
            } as any)
            .where(eq(contents.id, issue.contentId));

          return true;

        case "FLAG":
          await db
            .update(contents)
            .set({
              flagged: true,
              flaggedAt: new Date(),
              flagReason: issue.details,
            } as any)
            .where(eq(contents.id, issue.contentId));

          return true;

        case "ENHANCE":
          await db
            .update(contents)
            .set({
              enhancementQueued: true,
              enhancementQueuedAt: new Date(),
              enhancementReason: issue.details,
            } as any)
            .where(eq(contents.id, issue.contentId));

          return true;

        case "REDIRECT":
          // Would require additional redirect logic

          return false;

        case "KEEP":
          // No action needed
          return true;

        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get issues by type
   */
  async getIssuesByType(issueType: ContentIssueType): Promise<ContentIssue[]> {
    const result = await this.runPipeline();
    return result.issues.filter(i => i.issueType === issueType);
  }

  /**
   * Get issues by severity
   */
  async getIssuesBySeverity(
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  ): Promise<ContentIssue[]> {
    const result = await this.runPipeline();
    return result.issues.filter(i => i.severity === severity);
  }

  /**
   * Get content needing immediate action
   */
  async getUrgentIssues(): Promise<ContentIssue[]> {
    const result = await this.runPipeline();
    return result.issues.filter(
      i => i.severity === "CRITICAL" || (i.severity === "HIGH" && i.issueType === "TOXIC")
    );
  }

  /**
   * Set autopilot mode
   */
  setAutopilotMode(mode: AutopilotMode): void {
    this.autopilotMode = mode;
    this.actionEngine.setAutopilotMode(mode);
  }
}

/**
 * SEO Engine - Unified SEO & AEO Management System
 *
 * Centralized engine that controls:
 * - Schema.org structured data generation
 * - Canonical URL management
 * - Sitemap generation
 * - AEO (Answer Engine Optimization)
 * - Index health monitoring
 * - Content quality detection
 * - Internal linking
 * - Re-index triggers
 * - Bot behavior monitoring
 */

export * from "./schema-engine";
export * from "./canonical-engine";
export * from "./aeo-score-engine";
export * from "./index-health-engine";
export * from "./content-quality-engine";
export * from "./internal-linking-engine";
export * from "./reindex-engine";
export * from "./bot-monitor-engine";
export * from "./snippet-engine";
export * from "./speakable-generator";
export * from "./types";

import { SchemaEngine } from "./schema-engine";
import { CanonicalEngine } from "./canonical-engine";
import { AEOScoreEngine } from "./aeo-score-engine";
import { IndexHealthEngine } from "./index-health-engine";
import { ContentQualityEngine } from "./content-quality-engine";
import { InternalLinkingEngine } from "./internal-linking-engine";
import { ReindexEngine } from "./reindex-engine";
import { BotMonitorEngine } from "./bot-monitor-engine";
import { SnippetEngine } from "./snippet-engine";
import { SEOEngineConfig, SEOEngineStatus, ContentSEOReport } from "./types";

/**
 * Main SEO Engine class - orchestrates all SEO/AEO functionality
 */
export class SEOEngine {
  private config: SEOEngineConfig;

  public schema: SchemaEngine;
  public canonical: CanonicalEngine;
  public aeoScore: AEOScoreEngine;
  public indexHealth: IndexHealthEngine;
  public contentQuality: ContentQualityEngine;
  public internalLinking: InternalLinkingEngine;
  public reindex: ReindexEngine;
  public botMonitor: BotMonitorEngine;
  public snippet: SnippetEngine;

  constructor(config: Partial<SEOEngineConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || process.env.BASE_URL || "https://travi.world",
      siteName: config.siteName || "TRAVI",
      defaultLocale: config.defaultLocale || "en",
      supportedLocales: config.supportedLocales || [
        "en",
        "ar",
        "zh",
        "hi",
        "ru",
        "de",
        "fr",
        "ja",
        "ko",
        "pt",
        "es",
        "it",
        "nl",
        "tr",
        "fa",
        "ur",
        "he",
      ],
      enableAEO: config.enableAEO !== false,
      enableReindexTriggers: config.enableReindexTriggers !== false,
      enableBotMonitoring: config.enableBotMonitoring !== false,
      minContentQualityScore: config.minContentQualityScore || 70,
      thinContentThreshold: config.thinContentThreshold || 300,
    };

    // Initialize all sub-engines
    this.schema = new SchemaEngine(this.config);
    this.canonical = new CanonicalEngine(this.config);
    this.aeoScore = new AEOScoreEngine(this.config);
    this.indexHealth = new IndexHealthEngine(this.config);
    this.contentQuality = new ContentQualityEngine(this.config);
    this.internalLinking = new InternalLinkingEngine(this.config);
    this.reindex = new ReindexEngine(this.config);
    this.botMonitor = new BotMonitorEngine(this.config);
    this.snippet = new SnippetEngine(this.config);
  }

  /**
   * Generate complete SEO report for a piece of content
   */
  async generateContentReport(contentId: string): Promise<ContentSEOReport> {
    const [schemaData, canonicalUrl, aeoScore, qualityScore, internalLinks, snippetReadiness] =
      await Promise.all([
        this.schema.generateForContent(contentId),
        this.canonical.getCanonicalUrl(contentId),
        this.aeoScore.calculate(contentId),
        this.contentQuality.analyze(contentId),
        this.internalLinking.getLinksForContent(contentId),
        this.snippet.analyzeReadiness(contentId),
      ]);

    return {
      contentId,
      timestamp: new Date(),
      schema: schemaData,
      canonical: canonicalUrl,
      aeo: aeoScore,
      quality: qualityScore,
      internalLinks,
      snippetReadiness,
      overallScore: this.calculateOverallScore({
        aeoScore: aeoScore.score,
        qualityScore: qualityScore.score,
        snippetScore: snippetReadiness.score,
      }),
    };
  }

  /**
   * Get engine status
   */
  async getStatus(): Promise<SEOEngineStatus> {
    const [indexHealth, botStats] = await Promise.all([
      this.indexHealth.getSummary(),
      this.botMonitor.getStats(),
    ]);

    return {
      isRunning: true,
      config: this.config,
      indexHealth,
      botActivity: botStats,
      lastUpdated: new Date(),
    };
  }

  /**
   * Trigger content re-indexing if needed
   */
  async triggerReindexIfNeeded(contentId: string): Promise<boolean> {
    if (!this.config.enableReindexTriggers) {
      return false;
    }
    return this.reindex.evaluateAndTrigger(contentId);
  }

  /**
   * Calculate overall SEO score from components
   */
  private calculateOverallScore(scores: {
    aeoScore: number;
    qualityScore: number;
    snippetScore: number;
  }): number {
    // Weighted average: AEO 40%, Quality 35%, Snippet 25%
    return Math.round(
      scores.aeoScore * 0.4 + scores.qualityScore * 0.35 + scores.snippetScore * 0.25
    );
  }
}

// Singleton instance
let seoEngineInstance: SEOEngine | null = null;

export function getSEOEngine(config?: Partial<SEOEngineConfig>): SEOEngine {
  if (!seoEngineInstance) {
    seoEngineInstance = new SEOEngine(config);
  }
  return seoEngineInstance;
}

export function resetSEOEngine(): void {
  seoEngineInstance = null;
}

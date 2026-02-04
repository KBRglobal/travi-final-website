/**
 * Static Pre-rendering Generator
 * ISR-like static HTML generation for optimal SEO
 *
 * Architecture:
 * Database → Static Generator → dist/static/*.html → Bot Detection → Serve
 *                                                    ↓
 *                                              User → React SPA
 */

import { db } from "../db";
import { contents, tiqetsAttractions, destinations } from "../../shared/schema";
import { eq, and, isNotNull, desc } from "drizzle-orm";
import { renderSSR } from "../lib/ssr-renderer";
import { log } from "../lib/logger";
import * as fs from "fs/promises";
import * as path from "path";

// Priority locales for static generation
const PRIORITY_LOCALES = ["en", "ar", "de", "zh"];

// Content types to pre-render
const STATIC_CONTENT_TYPES = [
  "attraction",
  "hotel",
  "dining",
  "district",
  "article",
  "destination",
];

export interface StaticGenerationConfig {
  outputDir: string;
  baseUrl: string;
  locales: string[];
  contentTypes: string[];
  maxPagesPerType?: number;
  concurrency?: number;
}

export interface GenerationStats {
  totalPages: number;
  successfulPages: number;
  failedPages: number;
  skippedPages: number;
  totalSizeBytes: number;
  durationMs: number;
  errors: Array<{ path: string; error: string }>;
}

export interface RegenerationResult {
  contentId: string;
  paths: string[];
  success: boolean;
  error?: string;
}

const DEFAULT_CONFIG: StaticGenerationConfig = {
  outputDir: "./dist/static",
  baseUrl: "https://travi.world",
  locales: PRIORITY_LOCALES,
  contentTypes: STATIC_CONTENT_TYPES,
  maxPagesPerType: 10000,
  concurrency: 5,
};

export class StaticGenerator {
  private config: StaticGenerationConfig;

  constructor(config: Partial<StaticGenerationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate all static pages
   */
  async generateAll(): Promise<GenerationStats> {
    const startTime = Date.now();
    const stats: GenerationStats = {
      totalPages: 0,
      successfulPages: 0,
      failedPages: 0,
      skippedPages: 0,
      totalSizeBytes: 0,
      durationMs: 0,
      errors: [],
    };

    log.info(`[StaticGenerator] Starting full static generation`);
    log.info(`[StaticGenerator] Output: ${this.config.outputDir}`);
    log.info(`[StaticGenerator] Locales: ${this.config.locales.join(", ")}`);

    try {
      // Ensure output directory exists
      await this.ensureOutputDir();

      // Generate homepage for each locale
      for (const locale of this.config.locales) {
        await this.generatePage("/", locale, stats);
      }

      // Generate content pages
      for (const contentType of this.config.contentTypes) {
        await this.generateContentType(contentType, stats);
      }

      // Generate Tiqets attractions
      await this.generateTiqetsAttractions(stats);

      // Generate category pages
      await this.generateCategoryPages(stats);

      stats.durationMs = Date.now() - startTime;

      log.info(`[StaticGenerator] Generation complete:`, {
        total: stats.totalPages,
        success: stats.successfulPages,
        failed: stats.failedPages,
        duration: `${stats.durationMs}ms`,
        size: `${(stats.totalSizeBytes / 1024 / 1024).toFixed(2)}MB`,
      });

      return stats;
    } catch (error) {
      log.error("[StaticGenerator] Generation failed:", error);
      stats.durationMs = Date.now() - startTime;
      return stats;
    }
  }

  /**
   * Generate pages for a specific content type
   */
  private async generateContentType(contentType: string, stats: GenerationStats): Promise<void> {
    log.info(`[StaticGenerator] Generating ${contentType} pages`);

    try {
      const contentItems = await db
        .select({
          id: contents.id,
          slug: contents.slug,
          type: contents.type,
        })
        .from(contents)
        .where(
          and(
            eq(contents.type, contentType),
            eq(contents.status, "published"),
            isNotNull(contents.slug)
          )
        )
        .orderBy(desc(contents.publishedAt))
        .limit(this.config.maxPagesPerType || 10000);

      for (const content of contentItems) {
        for (const locale of this.config.locales) {
          const pagePath = `/${contentType}/${content.slug}`;
          await this.generatePage(pagePath, locale, stats);
        }
      }
    } catch (error) {
      log.error(`[StaticGenerator] Error generating ${contentType}:`, error);
    }
  }

  /**
   * Generate Tiqets attraction pages
   */
  private async generateTiqetsAttractions(stats: GenerationStats): Promise<void> {
    log.info(`[StaticGenerator] Generating Tiqets attraction pages`);

    try {
      const attractions = await db
        .select({
          slug: tiqetsAttractions.slug,
        })
        .from(tiqetsAttractions)
        .where(isNotNull(tiqetsAttractions.slug))
        .limit(this.config.maxPagesPerType || 10000);

      for (const attraction of attractions) {
        for (const locale of this.config.locales) {
          const pagePath = `/attractions/${attraction.slug}`;
          await this.generatePage(pagePath, locale, stats);
        }
      }
    } catch (error) {
      log.error("[StaticGenerator] Error generating Tiqets pages:", error);
    }
  }

  /**
   * Generate category listing pages
   */
  private async generateCategoryPages(stats: GenerationStats): Promise<void> {
    const categoryPages = [
      "/attractions",
      "/hotels",
      "/dining",
      "/articles",
      "/districts",
      "/events",
      "/guides",
      "/destinations",
    ];

    log.info(`[StaticGenerator] Generating category pages`);

    for (const page of categoryPages) {
      for (const locale of this.config.locales) {
        await this.generatePage(page, locale, stats);
      }
    }
  }

  /**
   * Generate a single page
   */
  private async generatePage(
    pagePath: string,
    locale: string,
    stats: GenerationStats
  ): Promise<boolean> {
    stats.totalPages++;

    try {
      // Render the page using existing SSR renderer
      const html = await renderSSR(pagePath, locale as any);

      if (!html) {
        stats.skippedPages++;
        return false;
      }

      // Determine output file path
      const filePath = this.getOutputPath(pagePath, locale);

      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Write the file
      await fs.writeFile(filePath, html, "utf-8");

      stats.successfulPages++;
      stats.totalSizeBytes += Buffer.byteLength(html, "utf-8");

      return true;
    } catch (error) {
      stats.failedPages++;
      stats.errors.push({
        path: `${locale}${pagePath}`,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get output file path for a page
   */
  private getOutputPath(pagePath: string, locale: string): string {
    // Normalize path
    let normalizedPath = pagePath === "/" ? "/index" : pagePath;

    // Add locale prefix
    const localePath = locale === "en" ? normalizedPath : `/${locale}${normalizedPath}`;

    // Create file path
    return path.join(this.config.outputDir, `${localePath}.html`);
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDir(): Promise<void> {
    await fs.mkdir(this.config.outputDir, { recursive: true });
  }

  /**
   * Regenerate specific content
   */
  async regenerateContent(contentId: string): Promise<RegenerationResult> {
    const paths: string[] = [];

    try {
      // Get content details
      const content = await db.query.contents.findFirst({
        where: eq(contents.id, contentId),
      });

      if (!content || !content.slug) {
        return {
          contentId,
          paths: [],
          success: false,
          error: "Content not found or has no slug",
        };
      }

      const pagePath = `/${content.type}/${content.slug}`;

      // Regenerate for all locales
      for (const locale of this.config.locales) {
        const html = await renderSSR(pagePath, locale as any);

        if (html) {
          const filePath = this.getOutputPath(pagePath, locale);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, html, "utf-8");
          paths.push(filePath);
        }
      }

      log.info(`[StaticGenerator] Regenerated ${paths.length} pages for content ${contentId}`);

      return {
        contentId,
        paths,
        success: true,
      };
    } catch (error) {
      log.error(`[StaticGenerator] Regeneration failed for ${contentId}:`, error);
      return {
        contentId,
        paths,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Regenerate pages that link to a content item
   */
  async regenerateLinkedPages(contentId: string): Promise<number> {
    // This would be implemented to find all pages that link to this content
    // and regenerate them to update link validity
    // For now, return 0 as placeholder
    return 0;
  }

  /**
   * Delete static files for content
   */
  async deleteContent(contentId: string, slug: string, type: string): Promise<void> {
    const pagePath = `/${type}/${slug}`;

    for (const locale of this.config.locales) {
      const filePath = this.getOutputPath(pagePath, locale);
      try {
        await fs.unlink(filePath);
        log.info(`[StaticGenerator] Deleted static file: ${filePath}`);
      } catch {
        // File may not exist, which is fine
      }
    }
  }

  /**
   * Get generation status for a specific page
   */
  async getPageStatus(
    pagePath: string,
    locale: string
  ): Promise<{
    exists: boolean;
    lastModified?: Date;
    size?: number;
  }> {
    const filePath = this.getOutputPath(pagePath, locale);

    try {
      const stat = await fs.stat(filePath);
      return {
        exists: true,
        lastModified: stat.mtime,
        size: stat.size,
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Clean up old static files
   */
  async cleanup(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    let deletedCount = 0;
    const now = Date.now();

    try {
      const cleanupDir = async (dir: string): Promise<void> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await cleanupDir(fullPath);
          } else if (entry.name.endsWith(".html")) {
            const stat = await fs.stat(fullPath);
            if (now - stat.mtimeMs > maxAgeMs) {
              await fs.unlink(fullPath);
              deletedCount++;
            }
          }
        }
      };

      await cleanupDir(this.config.outputDir);

      log.info(`[StaticGenerator] Cleanup complete: deleted ${deletedCount} old files`);
    } catch (error) {
      log.error("[StaticGenerator] Cleanup error:", error);
    }

    return deletedCount;
  }
}

// Singleton instance
let staticGeneratorInstance: StaticGenerator | null = null;

export function getStaticGenerator(config?: Partial<StaticGenerationConfig>): StaticGenerator {
  if (!staticGeneratorInstance) {
    staticGeneratorInstance = new StaticGenerator(config);
  }
  return staticGeneratorInstance;
}

export function resetStaticGenerator(): void {
  staticGeneratorInstance = null;
}

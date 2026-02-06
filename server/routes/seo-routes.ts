/**
 * SEO Routes - API endpoints for SEO validation and auto-fix
 */

import { Express, Request, Response } from "express";
import { validateSEO, PageType, SEOValidationResult } from "../services/seo-validation-agent";
import { autoFixSEO, AutoFixResult } from "../services/seo-auto-fixer";
import { requirePermission } from "../security";
import { logger } from "../services/log-service";

export function registerSEORoutes(app: Express) {
  /**
   * POST /api/seo/validate
   * Validate content against SEO checklist with 4 tiers
   *
   * Body: { content: ContentData, pageType?: PageType }
   * Returns: SEOValidationResult
   */
  app.post(
    "/api/seo/validate",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const { content, pageType = "attraction" } = req.body;

        if (!content) {
          return res.status(400).json({ error: "Content is required" });
        }

        const validPageTypes: PageType[] = [
          "attraction",
          "hotel",
          "article",
          "dining",
          "district",
          "event",
          "itinerary",
          "landing_page",
          "case_study",
          "off_plan",
          "listicle",
          "comparison",
          "guide",
        ];

        const normalizedPageType = validPageTypes.includes(pageType) ? pageType : "attraction";

        logger.seo.info(
          `Validating SEO for ${normalizedPageType}: ${content.title?.substring(0, 50)}...`
        );

        const result = validateSEO(content, normalizedPageType as PageType);

        // Log the result
        logger.seo.info(`SEO Validation complete: ${result.overallScore}%`, {
          pageType: normalizedPageType,
          canPublish: result.canPublish,
          tier1Score: result.tier1Score,
          tier2Score: result.tier2Score,
          tier3Score: result.tier3Score,
          tier4Score: result.tier4Score,
          blockingIssues: result.blockingIssues.length,
          autoFixable: result.autoFixableIssues.length,
        });

        // Transform result to frontend expected format
        const transformTier = (tierName: string, score: number) => {
          const tierChecks = result.checks.filter(c => c.tier === tierName);
          const maxScore = tierChecks.length * 100;
          const passedCount = tierChecks.filter(c => c.passed).length;

          return {
            score: passedCount,
            maxScore: tierChecks.length,
            percentage: score,
            issues: tierChecks
              .filter(c => !c.passed)
              .map(c => ({
                field: c.name,
                issue: c.message,
                severity:
                  tierName === "tier1_critical"
                    ? "critical"
                    : tierName === "tier2_essential"
                      ? "warning"
                      : "info",
                fixable: c.autoFixable || false,
                suggestion: c.fixSuggestion,
              })),
          };
        };

        const transformedResult = {
          overallScore: result.overallScore,
          tier1_critical: transformTier("tier1_critical", result.tier1Score),
          tier2_essential: transformTier("tier2_essential", result.tier2Score),
          tier3_technical: transformTier("tier3_technical", result.tier3Score),
          tier4_quality: transformTier("tier4_quality", result.tier4Score),
          canPublish: result.canPublish,
          publishBlockReason:
            result.publishBlockReasons.length > 0
              ? result.publishBlockReasons.join("; ")
              : undefined,
          fixableIssuesCount: result.autoFixableIssues.length,
        };

        res.json(transformedResult);
      } catch (error) {
        logger.seo.error("SEO validation error", { error: String(error) });
        res.status(500).json({ error: "Failed to validate SEO" });
      }
    }
  );

  /**
   * POST /api/seo/auto-fix
   * Auto-fix SEO issues in content
   *
   * Body: { content: ContentData }
   * Returns: AutoFixResult with fixed content
   */
  app.post(
    "/api/seo/auto-fix",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        // Accept both 'content' and 'article' parameter names for backward compatibility
        const content = req.body.content || req.body.article;

        if (!content) {
          return res.status(400).json({ error: "Content is required" });
        }

        logger.seo.info(`Auto-fixing SEO for: ${content.title?.substring(0, 50)}...`);

        const result = autoFixSEO(content);

        logger.seo.info(`SEO Auto-fix complete: ${result.fixesApplied} fixes applied`, {
          fixesApplied: result.fixesApplied,
          fixesFailed: result.fixesFailed,
          fixTypes: result.fixDetails.map(f => f.field),
        });

        res.json(result);
      } catch (error) {
        logger.seo.error("SEO auto-fix error", { error: String(error) });
        res.status(500).json({ error: "Failed to auto-fix SEO" });
      }
    }
  );

  /**
   * POST /api/seo/validate-and-fix
   * Validate and optionally auto-fix SEO issues
   *
   * Body: { content: ContentData, pageType?: PageType, autoFix?: boolean }
   * Returns: { validation: SEOValidationResult, fixResult?: AutoFixResult }
   */
  app.post(
    "/api/seo/validate-and-fix",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const { content, pageType = "attraction", autoFix = false } = req.body;

        if (!content) {
          return res.status(400).json({ error: "Content is required" });
        }

        const validPageTypes: PageType[] = [
          "attraction",
          "hotel",
          "article",
          "dining",
          "district",
          "event",
          "itinerary",
          "landing_page",
          "case_study",
          "off_plan",
          "listicle",
          "comparison",
          "guide",
        ];

        const normalizedPageType = validPageTypes.includes(pageType) ? pageType : "attraction";

        logger.seo.info(
          `Validating SEO (autoFix: ${autoFix}) for: ${content.title?.substring(0, 50)}...`
        );

        // Initial validation
        let validation = validateSEO(content, normalizedPageType as PageType);
        let fixResult: AutoFixResult | undefined;
        let finalContent = content;

        // Auto-fix if requested and there are fixable issues
        if (autoFix && validation.autoFixableIssues.length > 0) {
          fixResult = autoFixSEO(content);
          finalContent = fixResult.articleUpdated;

          // Re-validate after fix
          validation = validateSEO(finalContent as any, normalizedPageType as PageType);

          logger.seo.info(
            `SEO Auto-fix applied: ${fixResult.fixesApplied} fixes, new score: ${validation.overallScore}%`
          );
        }

        res.json({
          validation,
          fixResult,
          content: finalContent,
        });
      } catch (error) {
        logger.seo.error("SEO validate-and-fix error", { error: String(error) });
        res.status(500).json({ error: "Failed to validate and fix SEO" });
      }
    }
  );

  /**
   * GET /api/seo/requirements
   * Get SEO requirements by page type
   */
  app.get("/api/seo/requirements", requirePermission("canEdit"), (req: Request, res: Response) => {
    try {
      const pageType = (req.query.pageType as string) || "attraction";

      // Define requirements based on the architecture document
      const requirements = {
        pageType,
        tiers: {
          tier1_critical: {
            name: "Critical",
            description: "Blocks publishing if not 100%",
            checks: [
              { name: "meta_title", requirement: "50-60 chars with primary keyword" },
              { name: "meta_description", requirement: "150-160 chars with CTA" },
              { name: "primary_keyword_defined", requirement: "Must be set" },
              { name: "primary_keyword_in_h1", requirement: "Keyword in title/H1" },
              { name: "primary_keyword_in_intro", requirement: "Keyword in first 150 words" },
              { name: "minimum_word_count", requirement: "Varies by page type" },
              { name: "h2_structure", requirement: "3-8 H2 headers" },
              { name: "hero_image_alt", requirement: "Descriptive alt text (20+ chars)" },
              { name: "all_images_alt_text", requirement: "All images need alt text" },
            ],
          },
          tier2_essential: {
            name: "Essential",
            description: "Affects ranking directly",
            checks: [
              { name: "internal_links", requirement: "5-8 internal links" },
              { name: "external_links", requirement: "1-2 authoritative sources" },
              { name: "faq_section", requirement: "6-10 FAQ items" },
              { name: "pro_tips", requirement: "3+ practical tips" },
              { name: "secondary_keywords", requirement: "3-5 keywords" },
              { name: "call_to_actions", requirement: "2+ CTAs" },
            ],
          },
          tier3_technical: {
            name: "Technical",
            description: "Professional implementation",
            checks: [
              { name: "url_structure", requirement: "Clean, descriptive URL" },
              { name: "canonical_url", requirement: "Properly set" },
              { name: "schema_markup", requirement: "Appropriate for page type" },
              { name: "open_graph_tags", requirement: "Complete OG tags" },
              { name: "breadcrumb", requirement: "Navigation with schema" },
              { name: "dates", requirement: "Published + Updated dates" },
            ],
          },
          tier4_quality: {
            name: "Quality",
            description: "Excellence differentiator",
            checks: [
              { name: "no_cliches", requirement: "Avoid overused phrases" },
              { name: "specific_prices", requirement: "Real numbers, not vague terms" },
              { name: "honest_cons", requirement: "Balanced view with downsides" },
              { name: "current_year", requirement: "2024/2025 mentioned" },
              { name: "paragraph_length", requirement: "2-4 sentences average" },
              { name: "visual_breaks", requirement: "Every 300-400 words" },
            ],
          },
        },
        minWordCounts: {
          attraction: 1500,
          hotel: 1200,
          article: 1200,
          dining: 1200,
          district: 1500,
          event: 800,
          itinerary: 1500,
          landing_page: 1000,
          case_study: 1500,
          off_plan: 1500,
          listicle: 2500,
          comparison: 2000,
          guide: 1800,
        },
        publishingGates: {
          minSeoScore: 70,
          tier1MustBe100Percent: true,
          autoFixAvailable: true,
        },
      };

      res.json(requirements);
    } catch (error) {
      logger.seo.error("SEO requirements error", { error: String(error) });
      res.status(500).json({ error: "Failed to get SEO requirements" });
    }
  });

  /**
   * POST /api/seo/can-publish
   * Quick check if content can be published
   *
   * Body: { content: ContentData, pageType?: PageType }
   * Returns: { canPublish: boolean, reasons: string[], score: number }
   */
  app.post(
    "/api/seo/can-publish",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const { content, pageType = "attraction" } = req.body;

        if (!content) {
          return res.status(400).json({ error: "Content is required" });
        }

        const result = validateSEO(content, pageType as PageType);

        res.json({
          canPublish: result.canPublish,
          reasons: result.publishBlockReasons,
          score: result.overallScore,
          tierScores: {
            tier1_critical: result.tier1Score,
            tier2_essential: result.tier2Score,
            tier3_technical: result.tier3Score,
            tier4_quality: result.tier4Score,
          },
          autoFixAvailable: result.autoFixableIssues.length > 0,
          autoFixableCount: result.autoFixableIssues.length,
        });
      } catch (error) {
        logger.seo.error("Can-publish check error", { error: String(error) });
        res.status(500).json({ error: "Failed to check publishing eligibility" });
      }
    }
  );

  /**
   * POST /api/seo/indexnow
   * Submit URLs to IndexNow for instant Bing indexing
   *
   * Body: { urls: string[] }
   * Returns: { success: boolean, submitted: number }
   */
  app.post(
    "/api/seo/indexnow",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const { urls } = req.body;

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
          return res.status(400).json({ error: "URLs array is required" });
        }

        if (urls.length > 10000) {
          return res.status(400).json({ error: "Maximum 10000 URLs per request" });
        }

        const INDEXNOW_KEY = process.env.INDEXNOW_API_KEY || "";
        if (!INDEXNOW_KEY) {
          return res.status(503).json({ error: "IndexNow API key not configured" });
        }
        const HOST = "travi.world";

        const response = await fetch("https://api.indexnow.org/indexnow", {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            host: HOST,
            key: INDEXNOW_KEY,
            keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
            urlList: urls.map(url => (url.startsWith("http") ? url : `https://${HOST}${url}`)),
          }),
        });

        if (response.ok || response.status === 200 || response.status === 202) {
          logger.seo.info(`IndexNow: Submitted ${urls.length} URLs successfully`);
          res.json({ success: true, submitted: urls.length });
        } else {
          const errorText = await response.text();
          logger.seo.error(`IndexNow submission failed: ${response.status}`, { error: errorText });
          res.status(response.status).json({
            success: false,
            error: `IndexNow API returned ${response.status}: ${errorText}`,
          });
        }
      } catch (error) {
        logger.seo.error("IndexNow submission error", { error: String(error) });
        res.status(500).json({ error: "Failed to submit to IndexNow" });
      }
    }
  );
}

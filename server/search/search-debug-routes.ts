/**
 * Search Debug Admin Routes
 *
 * Admin-only endpoints for debugging search queries.
 * Exposes internal search pipeline details for troubleshooting.
 *
 * FEATURE 3: Search Admin Debug Mode
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../security";
import {
  debugSearch,
  debugContentForQuery,
  getRankingFactorExplanations,
  type SearchDebugResponse,
} from "./search-debug";

/**
 * Feature flag for search debug mode
 */
export function isSearchDebugEnabled(): boolean {
  // Always available for admins - it's read-only diagnostic info
  return true;
}

/**
 * Register search debug admin routes
 */
export function registerSearchDebugRoutes(app: Express) {
  /**
   * GET /api/admin/search/debug
   *
   * Debug a search query - returns full pipeline analysis.
   *
   * Query params:
   * - q: Search query string (required)
   *
   * Returns:
   * - Query analysis (tokens, normalization, expansion)
   * - Intent classification
   * - Pipeline execution steps
   * - Result scoring breakdowns
   * - Recommendations for missing results
   */
  app.get("/api/admin/search/debug", requireAuth, async (req: Request, res: Response) => {
    const query = req.query.q as string;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        error: "Missing required query parameter 'q'",
        example: "/api/admin/search/debug?q=dubai hotels",
      });
    }

    if (query.length > 200) {
      return res.status(400).json({
        error: "Query too long (max 200 characters)",
      });
    }

    try {
      const debugResult = await debugSearch(query);
      res.json(debugResult);
    } catch (error) {
      res.status(500).json({
        error: "Failed to debug search query",
        query,
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/admin/search/debug/content/:contentId
   *
   * Debug why a specific content item appears (or doesn't) for a query.
   *
   * Query params:
   * - q: Search query string (required)
   *
   * Returns:
   * - Whether content was found in results
   * - Rank position if found
   * - Score breakdown
   * - Reasons for ranking
   */
  app.get(
    "/api/admin/search/debug/content/:contentId",
    requireAuth,
    async (req: Request, res: Response) => {
      const { contentId } = req.params;
      const query = req.query.q as string;

      if (!query || typeof query !== "string") {
        return res.status(400).json({
          error: "Missing required query parameter 'q'",
          example: `/api/admin/search/debug/content/${contentId}?q=dubai hotels`,
        });
      }

      if (!contentId) {
        return res.status(400).json({
          error: "Missing content ID",
        });
      }

      try {
        const debugResult = await debugContentForQuery(contentId, query);
        res.json({
          contentId,
          query,
          ...debugResult,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({
          error: "Failed to debug content for query",
          contentId,
          query,
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  /**
   * GET /api/admin/search/debug/ranking-factors
   *
   * Returns documentation of all ranking factors and their weights.
   * Useful for understanding the scoring system.
   */
  app.get("/api/admin/search/debug/ranking-factors", requireAuth, (req: Request, res: Response) => {
    const factors = getRankingFactorExplanations();
    res.json({
      factors,
      timestamp: new Date().toISOString(),
      note: "These factors are multiplied together to calculate the final adjusted score",
    });
  });

  /**
   * POST /api/admin/search/debug/compare
   *
   * Compare two search queries side by side.
   * Useful for understanding how query variations affect results.
   */
  app.post("/api/admin/search/debug/compare", requireAuth, async (req: Request, res: Response) => {
    const { query1, query2 } = req.body as { query1?: string; query2?: string };

    if (!query1 || !query2) {
      return res.status(400).json({
        error: "Missing required body parameters 'query1' and 'query2'",
        example: { query1: "dubai hotel", query2: "hotels in dubai" },
      });
    }

    try {
      const [result1, result2] = await Promise.all([debugSearch(query1), debugSearch(query2)]);

      // Calculate overlap
      const ids1 = new Set(result1.results.map(r => r.id));
      const ids2 = new Set(result2.results.map(r => r.id));
      const overlap = [...ids1].filter(id => ids2.has(id));

      res.json({
        query1: {
          query: query1,
          resultCount: result1.results.length,
          topResults: result1.results.slice(0, 5).map(r => ({
            id: r.id,
            title: r.title,
            score: r.adjustedScore,
          })),
          intent: result1.intentClassification.primary,
          durationMs: result1.totalDurationMs,
        },
        query2: {
          query: query2,
          resultCount: result2.results.length,
          topResults: result2.results.slice(0, 5).map(r => ({
            id: r.id,
            title: r.title,
            score: r.adjustedScore,
          })),
          intent: result2.intentClassification.primary,
          durationMs: result2.totalDurationMs,
        },
        comparison: {
          overlappingResults: overlap.length,
          overlapPercentage: Math.round((overlap.length / Math.max(ids1.size, ids2.size)) * 100),
          uniqueToQuery1: [...ids1].filter(id => !ids2.has(id)).length,
          uniqueToQuery2: [...ids2].filter(id => !ids1.has(id)).length,
          sameIntent: result1.intentClassification.primary === result2.intentClassification.primary,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to compare queries",
        timestamp: new Date().toISOString(),
      });
    }
  });
}

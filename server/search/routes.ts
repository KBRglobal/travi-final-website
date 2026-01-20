/**
 * Search API Routes
 * 
 * Endpoints for search, semantic search, and similar content
 */

import type { Express, Request, Response, NextFunction } from "express";
import { searchEngine } from "./index";
import { semanticSearch } from "./semantic-search";
import { intentClassifier } from "./intent-classifier";
import { queryProcessor } from "./query-processor";
import { searchIndexer } from "./indexer";
import { spellChecker } from "./spell-checker";
import { synonymExpander } from "./synonyms";
import { queryRewriter } from "./query-rewriter";
import { searchTelemetry } from "./search-telemetry";
import { queryExpander } from "./query-expander";
import { storage } from "../storage";

type AuthenticatedRequest = Request & {
  isAuthenticated(): boolean;
  user?: { claims?: { sub: string } };
};

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.isAuthenticated?.() || !authReq.user?.claims?.sub) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  
  const user = await storage.getUser(authReq.user.claims.sub);
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  
  next();
}

export function registerSearchRoutes(app: Express) {
  // ============================================================================
  // MAIN SEARCH
  // ============================================================================

  /**
   * Main search endpoint
   * GET /api/search?q=...&limit=20&page=1&type[]=hotel&locale=en
   */
  app.get("/api/search", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q || q.trim().length === 0) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const page = parseInt(req.query.page as string) || 1;
      const type = Array.isArray(req.query.type) 
        ? req.query.type as string[]
        : req.query.type 
        ? [req.query.type as string]
        : undefined;
      const locale = req.query.locale as string || undefined;

      const results = await searchEngine.search({
        q,
        limit,
        page,
        type,
        locale,
      });

      res.json(results);
    } catch (error) {
      console.error("[Search] Search error:", error);
      res.status(500).json({ 
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ============================================================================
  // SPELL CHECK & QUERY EXPANSION
  // ============================================================================

  /**
   * Spell check endpoint
   * GET /api/search/spell-check?q=burk khalifa
   * Returns: { corrected: "burj khalifa", wasChanged: true, confidence: 0.8 }
   */
  app.get("/api/search/spell-check", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q || q.trim().length === 0) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const result = await spellChecker.check(q);
      res.json(result);
    } catch (error) {
      console.error("[Search] Spell check error:", error);
      res.status(500).json({ 
        error: "Spell check failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Synonym expansion endpoint
   * GET /api/search/synonyms?term=cheap hotel
   * Returns: { expanded: ["cheap", "hotel", "budget", "affordable", ...] }
   */
  app.get("/api/search/synonyms", async (req, res) => {
    try {
      const term = req.query.term as string;
      if (!term || term.trim().length === 0) {
        return res.status(400).json({ error: "Query parameter 'term' is required" });
      }

      const locale = req.query.locale as string || 'en';
      const terms = term.split(/\s+/);
      const result = synonymExpander.expand(terms, locale);
      
      res.json(result);
    } catch (error) {
      console.error("[Search] Synonym expansion error:", error);
      res.status(500).json({ 
        error: "Synonym expansion failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Query rewrite endpoint
   * GET /api/search/rewrite?q=best hotell near marina&locale=en
   * Returns: { rewritten: "hotel marina", expanded: [...], transformations: [...] }
   */
  app.get("/api/search/rewrite", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q || q.trim().length === 0) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const locale = req.query.locale as string || 'en';
      const result = await queryRewriter.rewrite(q, locale);
      
      res.json(result);
    } catch (error) {
      console.error("[Search] Query rewrite error:", error);
      res.status(500).json({ 
        error: "Query rewrite failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ============================================================================
  // SIMILAR CONTENT
  // ============================================================================

  /**
   * Find similar content
   * GET /api/search/similar/:contentId?limit=5
   */
  app.get("/api/search/similar/:contentId", async (req, res) => {
    try {
      const { contentId } = req.params;
      const limit = parseInt(req.query.limit as string) || 5;

      const similar = await semanticSearch.findSimilar(contentId, limit);

      res.json({
        contentId,
        similar,
        count: similar.length,
      });
    } catch (error) {
      console.error("[Search] Similar content error:", error);
      res.status(500).json({ 
        error: "Failed to find similar content",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ============================================================================
  // INTENT ANALYSIS (DEBUG)
  // ============================================================================

  /**
   * Analyze query intent (for debugging/testing)
   * GET /api/search/analyze?q=...
   */
  app.get("/api/search/analyze", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query required" });
      }

      const intent = await intentClassifier.classify(query, req.query.locale as string);
      const processed = queryProcessor.process(query, req.query.locale as string);

      res.json({
        query,
        processed,
        intent,
      });
    } catch (error) {
      console.error("[Search] Analyze error:", error);
      res.status(500).json({ 
        error: "Analysis failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ============================================================================
  // INDEXING (ADMIN ONLY)
  // ============================================================================

  /**
   * Index a specific content item
   * POST /api/search/index/:contentId
   */
  app.post("/api/search/index/:contentId", async (req, res) => {
    try {
      const { contentId } = req.params;
      await searchIndexer.indexContent(contentId);
      
      res.json({ 
        success: true,
        contentId,
        message: "Content indexed successfully"
      });
    } catch (error) {
      console.error("[Search] Index error:", error);
      res.status(500).json({ 
        error: "Indexing failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Reindex all content
   * POST /api/search/reindex
   */
  app.post("/api/search/reindex", async (req, res) => {
    try {
      const result = await searchIndexer.reindexAll();
      
      res.json({ 
        success: true,
        ...result,
        message: `Reindexed ${result.indexed} items with ${result.errors} errors`
      });
    } catch (error) {
      console.error("[Search] Reindex error:", error);
      res.status(500).json({ 
        error: "Reindexing failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Remove content from index
   * DELETE /api/search/index/:contentId
   */
  app.delete("/api/search/index/:contentId", async (req, res) => {
    try {
      const { contentId } = req.params;
      await searchIndexer.removeContent(contentId);
      
      res.json({ 
        success: true,
        contentId,
        message: "Content removed from index"
      });
    } catch (error) {
      console.error("[Search] Remove from index error:", error);
      res.status(500).json({ 
        error: "Remove failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ============================================================================
  // SEARCH TELEMETRY & METRICS
  // ============================================================================

  /**
   * Search metrics endpoint (ADMIN ONLY)
   * GET /api/search/metrics
   * Returns: top queries, zero-result rate, total searches (24-hour rolling window)
   */
  app.get("/api/search/metrics", requireAdmin, async (req, res) => {
    try {
      const metrics = searchTelemetry.getMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("[Search] Metrics error:", error);
      res.status(500).json({ 
        error: "Failed to get metrics",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  /**
   * Recent search events endpoint (ADMIN ONLY - for debugging)
   * GET /api/search/metrics/events?limit=50
   */
  app.get("/api/search/metrics/events", requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const events = searchTelemetry.getRecentEvents(limit);
      res.json({ events, count: events.length });
    } catch (error) {
      console.error("[Search] Events error:", error);
      res.status(500).json({ 
        error: "Failed to get events",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ============================================================================
  // QUERY EXPANSION
  // ============================================================================

  /**
   * Query expansion endpoint
   * GET /api/search/expand?q=NYC beach hotels
   * Returns: { original, expanded, resolvedCity, synonymsApplied }
   */
  app.get("/api/search/expand", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q || q.trim().length === 0) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const expansion = queryExpander.expandQuery(q);
      res.json(expansion);
    } catch (error) {
      console.error("[Search] Expansion error:", error);
      res.status(500).json({ 
        error: "Query expansion failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}

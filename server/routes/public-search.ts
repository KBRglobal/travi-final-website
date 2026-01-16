/**
 * Public Search API Routes
 * 
 * Provides search endpoint that NEVER returns empty results
 */

import type { Express, Request, Response } from "express";
import { publicSearch, getSearchSuggestions } from "../search/search-service";

export function registerPublicSearchRoutes(app: Express): void {
  /**
   * Public Search Endpoint
   * GET /api/public/search?q=query&limit=10&types[]=destination
   * 
   * Response: { results: [...], fallback: boolean, query: string, total: number }
   * 
   * CRITICAL: This endpoint NEVER returns empty results
   * If no matches found, returns popular destinations + recent articles
   */
  app.get("/api/public/search", async (req: Request, res: Response) => {
    try {
      const query = (req.query.q as string) || "";
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      
      // Parse types array from query params
      let types: ("destination" | "hotel" | "article" | "category")[] | undefined;
      if (req.query.types) {
        const typesParam = Array.isArray(req.query.types) 
          ? req.query.types 
          : [req.query.types];
        types = typesParam.filter((t): t is "destination" | "hotel" | "article" | "category" => 
          ["destination", "hotel", "article", "category"].includes(t as string)
        ) as ("destination" | "hotel" | "article" | "category")[];
      }

      const result = await publicSearch({
        query,
        limit,
        types,
      });

      res.json(result);
    } catch (error) {
      console.error("[Public Search] Error:", error);
      res.status(500).json({ 
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
        results: [],
        fallback: true,
        query: req.query.q || "",
        total: 0,
      });
    }
  });

  /**
   * Search Suggestions Endpoint (autocomplete)
   * GET /api/public/search/suggestions?q=query&limit=5
   * 
   * Response: { suggestions: [...] }
   */
  app.get("/api/public/search/suggestions", async (req: Request, res: Response) => {
    try {
      const query = (req.query.q as string) || "";
      const limit = Math.min(parseInt(req.query.limit as string) || 5, 10);

      if (query.length < 2) {
        return res.json({ suggestions: [] });
      }

      const suggestions = await getSearchSuggestions(query, limit);

      res.json({ suggestions });
    } catch (error) {
      console.error("[Public Search] Suggestions error:", error);
      res.status(500).json({ 
        suggestions: [],
        error: "Suggestions failed"
      });
    }
  });
}

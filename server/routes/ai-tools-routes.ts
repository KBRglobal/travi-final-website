/**
 * AI Tools Routes
 * Content scoring, plagiarism detection, and visual search endpoints
 */

import type { Express, Request, Response } from "express";
import { requireAuth, type AuthRequest } from "../security";

export function registerAiToolsRoutes(app: Express): void {
  // ============================================================================
  // AI CONTENT SCORING
  // ============================================================================
  app.post("/api/ai/score-content/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentScorer } = await import("../ai/content-scorer");
      const { contentId } = req.params;
      const result = await contentScorer.scoreContent(contentId);
      if (result) {
        res.json(result);
      } else {
        res.status(500).json({ error: "Failed to score content" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to score content" });
    }
  });

  app.get("/api/ai/content-score/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentScorer } = await import("../ai/content-scorer");
      const { contentId } = req.params;
      const result = await contentScorer.getContentScore(contentId);
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: "No score found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get content score" });
    }
  });

  // ============================================================================
  // AI PLAGIARISM DETECTION
  // ============================================================================
  app.post("/api/ai/check-plagiarism/:contentId", requireAuth, async (req, res) => {
    try {
      const { plagiarismDetector } = await import("../ai/plagiarism-detector");
      const { contentId } = req.params;
      const { threshold } = req.body;
      const result = await plagiarismDetector.checkPlagiarism(contentId, threshold);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to check plagiarism" });
    }
  });

  app.post("/api/ai/compare-texts", requireAuth, async (req, res) => {
    try {
      const { plagiarismDetector } = await import("../ai/plagiarism-detector");
      const { text1, text2 } = req.body;
      const similarity = await plagiarismDetector.compareTexts(text1, text2);
      res.json({ similarity });
    } catch (error) {
      res.status(500).json({ error: "Failed to compare texts" });
    }
  });

  // ============================================================================
  // AI VISUAL SEARCH
  // ============================================================================
  app.post("/api/ai/visual-search", async (req, res) => {
    try {
      const { visualSearch } = await import("../ai/visual-search");
      const { imageUrl, limit } = req.body;
      const results = await visualSearch.searchByImage(imageUrl, limit);
      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: "Failed to perform visual search" });
    }
  });

  app.post("/api/ai/analyze-image", async (req, res) => {
    try {
      const { visualSearch } = await import("../ai/visual-search");
      const { imageUrl } = req.body;
      const analysis = await visualSearch.analyzeImage(imageUrl);
      if (analysis) {
        res.json(analysis);
      } else {
        res.status(500).json({ error: "Failed to analyze image" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });
}

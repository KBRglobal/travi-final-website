/**
 * AI Tools Routes
 * Plagiarism detection endpoints
 *
 * Note: Content scoring and visual search have been removed.
 * Use Octypo system for content generation and scoring.
 */

import type { Express, Request, Response } from "express";
import { requireAuth, type AuthRequest } from "../security";

export function registerAiToolsRoutes(app: Express): void {
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
}

/**
 * Survey Builder Routes
 * CRUD for surveys and public survey response endpoints
 */

import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requirePermission, type AuthRequest } from "../security";

export function registerSurveyRoutes(app: Express): void {
  // ============================================================================
  // SURVEY BUILDER API
  // ============================================================================

  // Get all surveys (admin)
  app.get("/api/surveys", requireAuth, async (req, res) => {
    try {
      const { status } = req.query;
      const surveys = await storage.getSurveys(status ? { status: status as string } : undefined);
      res.json(surveys);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch surveys" });
    }
  });

  // Get single survey (admin)
  app.get("/api/surveys/:id", requireAuth, async (req, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) {
        return res.status(404).json({ error: "Survey not found" });
      }
      res.json(survey);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch survey" });
    }
  });

  // Create survey
  app.post("/api/surveys", requirePermission("canCreate"), async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub;

      const { title, description, slug, status, definition, startsAt, endsAt } = req.body;

      if (!title || !slug) {
        return res.status(400).json({ error: "Title and slug are required" });
      }

      // Check slug uniqueness
      const existing = await storage.getSurveyBySlug(slug);
      if (existing) {
        return res.status(400).json({ error: "Survey with this slug already exists" });
      }

      const survey = await storage.createSurvey({
        title,
        description,
        slug,
        status: status || "draft",
        definition: definition || { questions: [] },
        authorId: userId,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      });

      res.status(201).json(survey);
    } catch (error) {
      res.status(500).json({ error: "Failed to create survey" });
    }
  });

  // Update survey
  app.patch("/api/surveys/:id", requirePermission("canEdit"), async (req, res) => {
    try {
      const { title, description, slug, status, definition, startsAt, endsAt } = req.body;

      // If slug is being changed, check uniqueness
      if (slug) {
        const existing = await storage.getSurveyBySlug(slug);
        if (existing && existing.id !== req.params.id) {
          return res.status(400).json({ error: "Survey with this slug already exists" });
        }
      }

      const survey = await storage.updateSurvey(req.params.id, {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(slug && { slug }),
        ...(status && { status }),
        ...(definition && { definition }),
        ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
        ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
      });

      if (!survey) {
        return res.status(404).json({ error: "Survey not found" });
      }

      res.json(survey);
    } catch (error) {
      res.status(500).json({ error: "Failed to update survey" });
    }
  });

  // Delete survey
  app.delete("/api/surveys/:id", requirePermission("canDelete"), async (req, res) => {
    try {
      await storage.deleteSurvey(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete survey" });
    }
  });

  // Get survey responses
  app.get("/api/surveys/:id/responses", requireAuth, async (req, res) => {
    try {
      const responses = await storage.getSurveyResponses(req.params.id);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch responses" });
    }
  });

  // Get survey analytics
  app.get("/api/surveys/:id/analytics", requireAuth, async (req, res) => {
    try {
      const analytics = await storage.getSurveyAnalytics(req.params.id);
      const survey = await storage.getSurvey(req.params.id);
      res.json({ ...analytics, survey });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Delete survey response
  app.delete(
    "/api/surveys/:surveyId/responses/:id",
    requirePermission("canDelete"),
    async (req, res) => {
      try {
        await storage.deleteSurveyResponse(req.params.id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete response" });
      }
    }
  );

  // PUBLIC: Get survey by slug (no auth required)
  app.get("/api/public/surveys/:slug", async (req, res) => {
    try {
      const survey = await storage.getSurveyBySlug(req.params.slug);

      if (!survey) {
        return res.status(404).json({ error: "Survey not found" });
      }

      // Only return active surveys
      if (survey.status !== "active") {
        return res.status(404).json({ error: "Survey is not available" });
      }

      // Check date range
      const now = new Date();
      if (survey.startsAt && now < survey.startsAt) {
        return res.status(404).json({ error: "Survey has not started yet" });
      }
      if (survey.endsAt && now > survey.endsAt) {
        return res.status(404).json({ error: "Survey has ended" });
      }

      // Return public survey data (exclude sensitive fields)
      res.json({
        id: survey.id,
        title: survey.title,
        description: survey.description,
        slug: survey.slug,
        definition: survey.definition,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch survey" });
    }
  });

  // PUBLIC: Submit survey response (no auth required)
  app.post("/api/public/surveys/:slug/responses", async (req, res) => {
    try {
      const survey = await storage.getSurveyBySlug(req.params.slug);

      if (!survey) {
        return res.status(404).json({ error: "Survey not found" });
      }

      if (survey.status !== "active") {
        return res.status(400).json({ error: "Survey is not accepting responses" });
      }

      // Check date range
      const now = new Date();
      if (survey.startsAt && now < survey.startsAt) {
        return res.status(400).json({ error: "Survey has not started yet" });
      }
      if (survey.endsAt && now > survey.endsAt) {
        return res.status(400).json({ error: "Survey has ended" });
      }

      const { answers, respondentEmail, respondentName, isComplete } = req.body;

      if (!answers || typeof answers !== "object") {
        return res.status(400).json({ error: "Answers are required" });
      }

      const response = await storage.createSurveyResponse({
        surveyId: survey.id,
        answers,
        respondentEmail,
        respondentName,
        isComplete: isComplete ?? true,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          referrer: req.get("referer"),
          completedAt: new Date().toISOString(),
        },
      });

      res.status(201).json({ success: true, responseId: response.id });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit response" });
    }
  });
}

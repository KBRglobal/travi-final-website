/**
 * Customer Journey Analytics API Routes
 */

import { Express, Request, Response } from "express";
import { customerJourney } from "./customer-journey";
import { analyticsRateLimiter } from "./security/rate-limiter";

export function registerCustomerJourneyRoutes(app: Express) {
  // -------------------------------------------------------------------------
  // POST /api/analytics/track
  // Track a single analytics event
  // -------------------------------------------------------------------------
  app.post("/api/analytics/track", analyticsRateLimiter, async (req: Request, res: Response) => {
    try {
      const event = req.body;

      // Validate required fields
      if (!event.sessionId || !event.visitorId || !event.eventType) {
        return res.status(400).json({
          error: "Missing required fields: sessionId, visitorId, eventType",
        });
      }

      // Add server-side metadata
      event.userAgent = req.headers["user-agent"];
      event.language = req.headers["accept-language"]?.split(",")[0];

      await customerJourney.trackEvent(event);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to track event" });
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/analytics/pageview
  // Track a page view
  // -------------------------------------------------------------------------
  app.post("/api/analytics/pageview", analyticsRateLimiter, async (req: Request, res: Response) => {
    try {
      const {
        sessionId,
        visitorId,
        pageUrl,
        pagePath,
        pageTitle,
        referrer,
        contentId,
        contentType,
        utmSource,
        utmMedium,
        utmCampaign,
      } = req.body;

      if (!sessionId || !visitorId || !pageUrl) {
        return res.status(400).json({
          error: "Missing required fields",
        });
      }

      await customerJourney.trackPageView({
        sessionId,
        visitorId,
        pageUrl,
        pagePath: pagePath || new URL(pageUrl).pathname,
        pageTitle,
        referrer,
        contentId,
        contentType,
        userAgent: req.headers["user-agent"] as string,
        language: req.headers["accept-language"]?.split(",")[0],
        utmSource,
        utmMedium,
        utmCampaign,
      });

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to track page view" });
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/analytics/click
  // Track a click event
  // -------------------------------------------------------------------------
  app.post("/api/analytics/click", analyticsRateLimiter, async (req: Request, res: Response) => {
    try {
      const {
        sessionId,
        visitorId,
        pageUrl,
        pagePath,
        elementId,
        elementClass,
        elementText,
        elementHref,
        clickX,
        clickY,
        eventName,
      } = req.body;

      if (!sessionId || !visitorId || !pageUrl) {
        return res.status(400).json({
          error: "Missing required fields",
        });
      }

      await customerJourney.trackClick({
        sessionId,
        visitorId,
        pageUrl,
        pagePath: pagePath || new URL(pageUrl).pathname,
        elementId,
        elementClass,
        elementText,
        elementHref,
        clickX,
        clickY,
        eventName,
      });

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to track click" });
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/analytics/cta
  // Track CTA click
  // -------------------------------------------------------------------------
  app.post("/api/analytics/cta", analyticsRateLimiter, async (req: Request, res: Response) => {
    try {
      const {
        sessionId,
        visitorId,
        pageUrl,
        pagePath,
        ctaName,
        ctaDestination,
        contentId,
        metadata,
      } = req.body;

      if (!sessionId || !visitorId || !pageUrl || !ctaName) {
        return res.status(400).json({
          error: "Missing required fields",
        });
      }

      await customerJourney.trackCtaClick({
        sessionId,
        visitorId,
        pageUrl,
        pagePath: pagePath || new URL(pageUrl).pathname,
        ctaName,
        ctaDestination,
        contentId,
        metadata,
      });

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to track CTA" });
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/analytics/scroll
  // Track scroll depth
  // -------------------------------------------------------------------------
  app.post("/api/analytics/scroll", analyticsRateLimiter, async (req: Request, res: Response) => {
    try {
      const { sessionId, visitorId, pageUrl, pagePath, scrollDepth, timeOnPage } = req.body;

      if (!sessionId || !visitorId || !pageUrl) {
        return res.status(400).json({
          error: "Missing required fields",
        });
      }

      await customerJourney.trackScroll({
        sessionId,
        visitorId,
        pageUrl,
        pagePath: pagePath || new URL(pageUrl).pathname,
        scrollDepth,
        timeOnPage,
      });

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to track scroll" });
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/analytics/conversion
  // Track conversion event
  // -------------------------------------------------------------------------
  app.post(
    "/api/analytics/conversion",
    analyticsRateLimiter,
    async (req: Request, res: Response) => {
      try {
        const {
          sessionId,
          visitorId,
          pageUrl,
          pagePath,
          conversionType,
          conversionValue,
          contentId,
          metadata,
        } = req.body;

        if (!sessionId || !visitorId || !pageUrl || !conversionType) {
          return res.status(400).json({
            error: "Missing required fields",
          });
        }

        await customerJourney.trackConversion({
          sessionId,
          visitorId,
          pageUrl,
          pagePath: pagePath || new URL(pageUrl).pathname,
          conversionType,
          conversionValue,
          contentId,
          metadata,
        });

        res.json({ success: true });
      } catch {
        res.status(500).json({ error: "Failed to track conversion" });
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /api/analytics/dashboard
  // Get analytics dashboard summary
  // -------------------------------------------------------------------------
  app.get("/api/analytics/dashboard", analyticsRateLimiter, async (req: Request, res: Response) => {
    try {
      const hours = Number.parseInt(req.query.hours as string) || 24;
      const summary = await customerJourney.getDashboardSummary(hours);
      res.json(summary);
    } catch {
      res.status(500).json({ error: "Failed to get dashboard" });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/analytics/realtime
  // Get real-time active users
  // -------------------------------------------------------------------------
  app.get("/api/analytics/realtime", analyticsRateLimiter, async (req: Request, res: Response) => {
    try {
      const minutes = Number.parseInt(req.query.minutes as string) || 5;
      const activeUsers = customerJourney.getActiveUsers(minutes);
      res.json({ activeUsers, minutes });
    } catch {
      res.status(500).json({ error: "Failed to get realtime data" });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/analytics/pages
  // Get page analytics
  // -------------------------------------------------------------------------
  app.get("/api/analytics/pages", analyticsRateLimiter, async (req: Request, res: Response) => {
    try {
      const limit = Number.parseInt(req.query.limit as string) || 50;
      const pagePath = req.query.pagePath as string;

      const analytics = await customerJourney.getPageAnalytics({
        pagePath,
        limit,
      });

      res.json(analytics);
    } catch {
      res.status(500).json({ error: "Failed to get page analytics" });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/analytics/journey/:visitorId
  // Get user journey for a specific visitor
  // -------------------------------------------------------------------------
  app.get(
    "/api/analytics/journey/:visitorId",
    analyticsRateLimiter,
    async (req: Request, res: Response) => {
      try {
        const { visitorId } = req.params;
        const sessionId = req.query.sessionId as string;

        const journey = await customerJourney.getUserJourney(visitorId, sessionId);

        if (!journey) {
          return res.status(404).json({ error: "Journey not found" });
        }

        res.json(journey);
      } catch {
        res.status(500).json({ error: "Failed to get journey" });
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /api/analytics/funnel
  // Get conversion funnel analysis
  // -------------------------------------------------------------------------
  app.post("/api/analytics/funnel", analyticsRateLimiter, async (req: Request, res: Response) => {
    try {
      const { steps } = req.body;

      if (!steps || !Array.isArray(steps)) {
        return res.status(400).json({
          error: "Missing required field: steps (array)",
        });
      }

      const funnel = await customerJourney.getConversionFunnel(steps);
      res.json(funnel);
    } catch {
      res.status(500).json({ error: "Failed to get funnel" });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/analytics/heatmap/:pagePath
  // Get click heatmap data
  // -------------------------------------------------------------------------
  app.get("/api/analytics/heatmap/*", analyticsRateLimiter, async (req: Request, res: Response) => {
    try {
      const pagePath = "/" + (req.params[0] || "");
      const heatmap = await customerJourney.getClickHeatmap(pagePath);
      res.json(heatmap);
    } catch {
      res.status(500).json({ error: "Failed to get heatmap" });
    }
  });
}

export default registerCustomerJourneyRoutes;

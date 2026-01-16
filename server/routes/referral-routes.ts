import type { Express, Request, Response } from "express";
import { db } from "../db";
import { eq, desc, sql } from "drizzle-orm";
import crypto from "crypto";
import {
  referralCodes,
  referralClicks,
  referrals,
  referralCommissions,
  insertReferralCodeSchema,
} from "@shared/schema";
import { requireAuth, requirePermission } from "../security";
import { z } from "zod";

type AuthRequest = Request & {
  user?: { claims?: { sub: string; email?: string; name?: string } };
};

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16);
}

export function registerReferralRoutes(app: Express) {
  // Register as a partner (public or authenticated)
  app.post("/api/referrals/register", async (req: Request, res: Response) => {
    try {
      const { name, email } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }

      // Check if email already has a referral code
      const existing = await db.query.referralCodes.findFirst({
        where: eq(referralCodes.name, email),
      });

      if (existing) {
        return res.status(400).json({ error: "Email already registered as a partner" });
      }

      // Generate unique code
      let code = generateReferralCode();
      let attempts = 0;
      while (attempts < 10) {
        const codeExists = await db.query.referralCodes.findFirst({
          where: eq(referralCodes.code, code),
        });
        if (!codeExists) break;
        code = generateReferralCode();
        attempts++;
      }

      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub;

      const [newCode] = await db.insert(referralCodes).values({
        code,
        name,
        description: email,
        userId: userId || null,
        commissionRate: 10,
        isActive: true,
      }).returning();

      res.status(201).json({
        success: true,
        partnerCode: newCode.code,
        referralLink: `${req.protocol}://${req.get("host")}?ref=${newCode.code}`,
      });
    } catch (error) {
      console.error("Error registering partner:", error);
      res.status(500).json({ error: "Failed to register as partner" });
    }
  });

  // Get partner dashboard stats (by code)
  app.get("/api/referrals/dashboard", async (req: Request, res: Response) => {
    try {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Partner code is required" });
      }

      const partnerCode = await db.query.referralCodes.findFirst({
        where: eq(referralCodes.code, code),
      });

      if (!partnerCode) {
        return res.status(404).json({ error: "Partner code not found" });
      }

      // Get recent clicks
      const recentClicks = await db
        .select()
        .from(referralClicks)
        .where(eq(referralClicks.referralCodeId, partnerCode.id))
        .orderBy(desc(referralClicks.createdAt))
        .limit(10);

      // Get conversions
      const conversions = await db
        .select()
        .from(referrals)
        .where(eq(referrals.referralCodeId, partnerCode.id))
        .orderBy(desc(referrals.createdAt))
        .limit(10);

      // Get commissions
      const commissions = await db
        .select()
        .from(referralCommissions)
        .where(eq(referralCommissions.referralCodeId, partnerCode.id))
        .orderBy(desc(referralCommissions.createdAt))
        .limit(10);

      res.json({
        partner: {
          code: partnerCode.code,
          name: partnerCode.name,
          commissionRate: partnerCode.commissionRate,
          isActive: partnerCode.isActive,
          createdAt: partnerCode.createdAt,
        },
        stats: {
          totalClicks: partnerCode.totalClicks || 0,
          totalSignups: partnerCode.totalSignups || 0,
          totalConversions: partnerCode.totalConversions || 0,
          totalCommission: (partnerCode.totalCommission || 0) / 100, // Convert cents to dollars
        },
        recentClicks: recentClicks.map((c) => ({
          id: c.id,
          landingPage: c.landingPage,
          createdAt: c.createdAt,
        })),
        conversions: conversions.map((c) => ({
          id: c.id,
          email: c.email,
          status: c.status,
          createdAt: c.createdAt,
        })),
        commissions: commissions.map((c) => ({
          id: c.id,
          amount: c.amount / 100,
          status: c.status,
          description: c.description,
          createdAt: c.createdAt,
        })),
        referralLink: `${req.protocol}://${req.get("host")}?ref=${partnerCode.code}`,
      });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard" });
    }
  });

  // Track a click (called on page load with ?ref= param)
  app.post("/api/referrals/track", async (req: Request, res: Response) => {
    try {
      const { code, landingPage } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Referral code is required" });
      }

      const partnerCode = await db.query.referralCodes.findFirst({
        where: eq(referralCodes.code, code),
      });

      if (!partnerCode || !partnerCode.isActive) {
        return res.status(404).json({ error: "Invalid or inactive referral code" });
      }

      const ipAddress = hashIp(req.ip || req.socket.remoteAddress || "unknown");

      // Record click
      await db.insert(referralClicks).values({
        referralCodeId: partnerCode.id,
        ipAddress,
        userAgent: req.get("user-agent") || null,
        referer: req.get("referer") || null,
        landingPage: landingPage || "/",
      });

      // Update click count
      await db
        .update(referralCodes)
        .set({
          totalClicks: sql`COALESCE(${referralCodes.totalClicks}, 0) + 1`,
          updatedAt: new Date(),
        })
        .where(eq(referralCodes.id, partnerCode.id));

      res.json({ success: true, tracked: true });
    } catch (error) {
      console.error("Error tracking click:", error);
      res.status(500).json({ error: "Failed to track click" });
    }
  });

  // Admin: Get all partners
  app.get("/api/referrals/admin", requirePermission("canAccessAffiliates"), async (req: Request, res: Response) => {
    try {
      const allPartners = await db
        .select()
        .from(referralCodes)
        .orderBy(desc(referralCodes.createdAt));

      res.json(
        allPartners.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          email: p.description,
          commissionRate: p.commissionRate,
          isActive: p.isActive,
          totalClicks: p.totalClicks || 0,
          totalSignups: p.totalSignups || 0,
          totalConversions: p.totalConversions || 0,
          totalCommission: (p.totalCommission || 0) / 100,
          createdAt: p.createdAt,
        }))
      );
    } catch (error) {
      console.error("Error fetching admin partners:", error);
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });

  // Admin: Get all clicks for a partner
  app.get("/api/referrals/admin/:code/clicks", requirePermission("canAccessAffiliates"), async (req: Request, res: Response) => {
    try {
      const partnerCode = await db.query.referralCodes.findFirst({
        where: eq(referralCodes.code, req.params.code),
      });

      if (!partnerCode) {
        return res.status(404).json({ error: "Partner not found" });
      }

      const clicks = await db
        .select()
        .from(referralClicks)
        .where(eq(referralClicks.referralCodeId, partnerCode.id))
        .orderBy(desc(referralClicks.createdAt))
        .limit(100);

      res.json(clicks);
    } catch (error) {
      console.error("Error fetching clicks:", error);
      res.status(500).json({ error: "Failed to fetch clicks" });
    }
  });

  // Admin: Get all conversions for a partner
  app.get("/api/referrals/admin/:code/conversions", requirePermission("canAccessAffiliates"), async (req: Request, res: Response) => {
    try {
      const partnerCode = await db.query.referralCodes.findFirst({
        where: eq(referralCodes.code, req.params.code),
      });

      if (!partnerCode) {
        return res.status(404).json({ error: "Partner not found" });
      }

      const conversions = await db
        .select()
        .from(referrals)
        .where(eq(referrals.referralCodeId, partnerCode.id))
        .orderBy(desc(referrals.createdAt))
        .limit(100);

      res.json(conversions);
    } catch (error) {
      console.error("Error fetching conversions:", error);
      res.status(500).json({ error: "Failed to fetch conversions" });
    }
  });

  // Admin: Update partner commission rate
  app.patch("/api/referrals/admin/:code", requirePermission("canAccessAffiliates"), async (req: Request, res: Response) => {
    try {
      const { commissionRate, isActive } = req.body;

      const partnerCode = await db.query.referralCodes.findFirst({
        where: eq(referralCodes.code, req.params.code),
      });

      if (!partnerCode) {
        return res.status(404).json({ error: "Partner not found" });
      }

      const updates: Partial<typeof referralCodes.$inferInsert> = { updatedAt: new Date() };
      
      if (typeof commissionRate === "number") {
        updates.commissionRate = Math.min(100, Math.max(0, commissionRate));
      }
      
      if (typeof isActive === "boolean") {
        updates.isActive = isActive;
      }

      const [updated] = await db
        .update(referralCodes)
        .set(updates)
        .where(eq(referralCodes.id, partnerCode.id))
        .returning();

      res.json({
        id: updated.id,
        code: updated.code,
        name: updated.name,
        commissionRate: updated.commissionRate,
        isActive: updated.isActive,
      });
    } catch (error) {
      console.error("Error updating partner:", error);
      res.status(500).json({ error: "Failed to update partner" });
    }
  });

  // Admin: Delete partner
  app.delete("/api/referrals/admin/:code", requirePermission("canDelete"), async (req: Request, res: Response) => {
    try {
      const partnerCode = await db.query.referralCodes.findFirst({
        where: eq(referralCodes.code, req.params.code),
      });

      if (!partnerCode) {
        return res.status(404).json({ error: "Partner not found" });
      }

      await db.delete(referralCodes).where(eq(referralCodes.id, partnerCode.id));

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting partner:", error);
      res.status(500).json({ error: "Failed to delete partner" });
    }
  });
}

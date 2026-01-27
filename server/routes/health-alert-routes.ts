/**
 * Health Alerts API Routes
 * Public endpoint for querying health alerts by destination
 */

import { Router } from "express";
import { db } from "../db";
import { healthAlerts, destinations } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export const healthAlertRoutes = Router();

const COUNTRY_CODE_MAPPING: Record<string, string> = {
  dubai: "AE",
  uae: "AE",
  "united-arab-emirates": "AE",
  "abu-dhabi": "AE",
  london: "GB",
  uk: "GB",
  paris: "FR",
  france: "FR",
  tokyo: "JP",
  japan: "JP",
  singapore: "SG",
  bangkok: "TH",
  thailand: "TH",
  "hong-kong": "HK",
  amsterdam: "NL",
  barcelona: "ES",
  spain: "ES",
  rome: "IT",
  italy: "IT",
  istanbul: "TR",
  turkey: "TR",
  "new-york": "US",
  usa: "US",
  "los-angeles": "US",
  miami: "US",
};

function normalizeDestinationCode(code: string): string | null {
  if (!code) return null;
  const upperCode = code.toUpperCase();
  if (upperCode.length === 2 && /^[A-Z]{2}$/.test(upperCode)) {
    return upperCode;
  }
  const lowerCode = code.toLowerCase();
  return COUNTRY_CODE_MAPPING[lowerCode] || null;
}

healthAlertRoutes.get("/health-alerts", async (req, res) => {
  try {
    const destinationCode = req.query.destination as string;
    const status = (req.query.status as string) || "active";
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    if (!destinationCode) {
      return res.status(400).json({
        success: false,
        error: "destination query parameter is required",
      });
    }

    const normalizedCode = normalizeDestinationCode(destinationCode);
    const lowerSlug = destinationCode.toLowerCase();
    const slugWithPath = `/destinations/${lowerSlug}`;

    let dest = await db
      .select({ id: destinations.id })
      .from(destinations)
      .where(eq(destinations.slug, slugWithPath))
      .limit(1);

    if (dest.length === 0) {
      dest = await db
        .select({ id: destinations.id })
        .from(destinations)
        .where(eq(destinations.id, lowerSlug))
        .limit(1);
    }

    if (dest.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: "No destination found for this country code",
      });
    }

    const conditions = [eq(healthAlerts.destinationId, dest[0].id)];
    if (status !== "all") {
      conditions.push(eq(healthAlerts.status, status as "active" | "resolved" | "monitoring"));
    }

    const alerts = await db
      .select()
      .from(healthAlerts)
      .where(and(...conditions))
      .orderBy(desc(healthAlerts.severity), desc(healthAlerts.issuedDate))
      .limit(limit);

    return res.json({
      success: true,
      data: alerts.map(formatHealthAlert),
      total: alerts.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch health alerts",
    });
  }
});

healthAlertRoutes.get("/health-alerts/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await db.select().from(healthAlerts).where(eq(healthAlerts.id, id)).limit(1);

    if (alert.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Health alert not found",
      });
    }

    return res.json({
      success: true,
      data: formatHealthAlert(alert[0]),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch health alert",
    });
  }
});

function formatHealthAlert(alert: typeof healthAlerts.$inferSelect) {
  const severityLabels: Record<string, string> = {
    low: "Low Risk",
    medium: "Moderate Risk",
    high: "High Risk",
    critical: "Critical",
  };

  const alertTypeLabels: Record<string, string> = {
    disease_outbreak: "Disease Outbreak",
    vaccination_required: "Vaccination Required",
    travel_restriction: "Travel Restriction",
    general_health: "Health Advisory",
  };

  return {
    id: alert.id,
    alertType: alert.alertType,
    alertTypeLabel: alertTypeLabels[alert.alertType] || alert.alertType,
    title: alert.title,
    description: alert.description,
    details: alert.details,
    severity: alert.severity,
    severityLabel: severityLabels[alert.severity] || alert.severity,
    status: alert.status,
    source: alert.source,
    sourceUrl: alert.sourceUrl,
    issuedDate: alert.issuedDate?.toISOString() || null,
    expiryDate: alert.expiryDate?.toISOString() || null,
  };
}

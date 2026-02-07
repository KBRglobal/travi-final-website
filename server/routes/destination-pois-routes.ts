/**
 * Destination-aware POI and Holiday API Routes
 * Maps destination slugs to TourPedia POIs and public holidays
 */
import { Router, Request, Response } from "express";
import { db } from "../db";
import { update9987TourpediaPois, update9987PublicHolidays } from "@shared/schema";
import { eq, and, sql, asc, gte, lte } from "drizzle-orm";

const router = Router();

// Destination slug to city/country mapping
const DESTINATION_MAPPING: Record<string, { city: string; countryCode: string }> = {
  barcelona: { city: "Barcelona", countryCode: "ES" },
  amsterdam: { city: "Amsterdam", countryCode: "NL" },
  berlin: { city: "Berlin", countryCode: "DE" },
  rome: { city: "Rome", countryCode: "IT" },
  paris: { city: "Paris", countryCode: "FR" },
  london: { city: "London", countryCode: "GB" },
  dubai: { city: "Dubai", countryCode: "AE" },
  "new-york": { city: "New York", countryCode: "US" },
  tokyo: { city: "Tokyo", countryCode: "JP" },
  singapore: { city: "Singapore", countryCode: "SG" },
  bangkok: { city: "Bangkok", countryCode: "TH" },
  "hong-kong": { city: "Hong Kong", countryCode: "HK" },
  istanbul: { city: "Istanbul", countryCode: "TR" },
  "las-vegas": { city: "Las Vegas", countryCode: "US" },
  "los-angeles": { city: "Los Angeles", countryCode: "US" },
  miami: { city: "Miami", countryCode: "US" },
  "abu-dhabi": { city: "Abu Dhabi", countryCode: "AE" },
};

// Helper to get destination info from slug
function getDestinationInfo(slug: string): { city: string; countryCode: string } | null {
  const normalized = slug.toLowerCase();
  return DESTINATION_MAPPING[normalized] || null;
}

// ============================================================
// GET /api/destinations/:slug/pois
// Returns POIs for a destination with optional category filter
// ============================================================
router.get("/:slug/pois", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { category, limit = "20", offset = "0" } = req.query;

    const destination = getDestinationInfo(slug);
    if (!destination) {
      return res.status(404).json({
        success: false,
        error: `Destination '${slug}' not found`,
        _meta: { availableDestinations: Object.keys(DESTINATION_MAPPING) },
      });
    }

    const conditions = [eq(update9987TourpediaPois.city, destination.city)];

    if (category && category !== "all") {
      conditions.push(eq(update9987TourpediaPois.category, category as string));
    }

    const whereClause = and(...conditions);
    const limitNum = Math.min(Number.parseInt(limit as string) || 20, 100);
    const offsetNum = Number.parseInt(offset as string) || 0;

    const [pois, countResult] = await Promise.all([
      db
        .select({
          id: update9987TourpediaPois.id,
          name: update9987TourpediaPois.name,
          category: update9987TourpediaPois.category,
          latitude: update9987TourpediaPois.latitude,
          longitude: update9987TourpediaPois.longitude,
          address: update9987TourpediaPois.address,
          city: update9987TourpediaPois.city,
          rawData: update9987TourpediaPois.rawData,
        })
        .from(update9987TourpediaPois)
        .where(whereClause)
        .orderBy(asc(update9987TourpediaPois.name))
        .limit(limitNum)
        .offset(offsetNum),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(update9987TourpediaPois)
        .where(whereClause),
    ]);

    // Transform POIs to include rating and review data from raw_data
    const enrichedPois = pois.map(poi => {
      const rawData = poi.rawData as Record<string, unknown> | null;
      return {
        id: poi.id,
        name: poi.name,
        category: poi.category,
        latitude: poi.latitude,
        longitude: poi.longitude,
        address: poi.address,
        city: poi.city,
        rating: rawData?.polarity ? Number(rawData.polarity) : null,
        reviewCount: rawData?.numReviews ? Number(rawData.numReviews) : null,
        detailsUrl: rawData?.details as string | null,
      };
    });

    res.json({
      success: true,
      data: enrichedPois,
      _meta: {
        destination: destination.city,
        countryCode: destination.countryCode,
        total: countResult[0]?.count || 0,
        limit: limitNum,
        offset: offsetNum,
        category: category || "all",
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch POIs" });
  }
});

// ============================================================
// GET /api/destinations/:slug/holidays
// Returns upcoming holidays for the destination's country (next 6 months)
// ============================================================
router.get("/:slug/holidays", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const destination = getDestinationInfo(slug);
    if (!destination) {
      return res.status(404).json({
        success: false,
        error: `Destination '${slug}' not found`,
        _meta: { availableDestinations: Object.keys(DESTINATION_MAPPING) },
      });
    }

    // Calculate date range: today to 6 months from now
    const today = new Date();
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    const startDate = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const endDate = sixMonthsLater.toISOString().split("T")[0];

    const holidays = await db
      .select({
        id: update9987PublicHolidays.id,
        name: update9987PublicHolidays.name,
        localName: update9987PublicHolidays.localName,
        date: update9987PublicHolidays.date,
        countryCode: update9987PublicHolidays.countryCode,
      })
      .from(update9987PublicHolidays)
      .where(
        and(
          eq(update9987PublicHolidays.countryCode, destination.countryCode),
          sql`${update9987PublicHolidays.date} >= ${startDate}`,
          sql`${update9987PublicHolidays.date} <= ${endDate}`
        )
      )
      .orderBy(asc(update9987PublicHolidays.date));

    res.json({
      success: true,
      data: holidays,
      _meta: {
        destination: destination.city,
        countryCode: destination.countryCode,
        dateRange: { from: startDate, to: endDate },
        total: holidays.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch holidays" });
  }
});

// ============================================================
// GET /api/destinations/:slug/poi-stats
// Returns counts of POIs by category for a destination
// ============================================================
router.get("/:slug/poi-stats", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const destination = getDestinationInfo(slug);
    if (!destination) {
      return res.status(404).json({
        success: false,
        error: `Destination '${slug}' not found`,
        _meta: { availableDestinations: Object.keys(DESTINATION_MAPPING) },
      });
    }

    const categoryStats = await db
      .select({
        category: update9987TourpediaPois.category,
        count: sql<number>`count(*)::int`,
      })
      .from(update9987TourpediaPois)
      .where(eq(update9987TourpediaPois.city, destination.city))
      .groupBy(update9987TourpediaPois.category)
      .orderBy(sql`count(*) DESC`);

    const totalCount = categoryStats.reduce((sum, cat) => sum + cat.count, 0);

    res.json({
      success: true,
      data: {
        categories: categoryStats,
        total: totalCount,
      },
      _meta: {
        destination: destination.city,
        countryCode: destination.countryCode,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch POI stats" });
  }
});

export default router;

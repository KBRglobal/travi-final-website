/**
 * External Data API Routes - Update 9987
 * Serves POIs, public holidays, countries/states for frontend display
 */
import { Router, Request, Response } from "express";
import { db } from "../db";
import {
  update9987Countries,
  update9987States,
  update9987TourpediaPois,
  update9987PublicHolidays,
} from "@shared/schema";
import { eq, and, ilike, sql, desc, asc } from "drizzle-orm";

const router = Router();

// ============================================================
// POI Explorer API
// ============================================================

// Get all unique cities with POI counts
router.get("/pois/cities", async (req: Request, res: Response) => {
  try {
    const cities = await db
      .select({
        city: update9987TourpediaPois.city,
        count: sql<number>`count(*)::int`,
      })
      .from(update9987TourpediaPois)
      .groupBy(update9987TourpediaPois.city)
      .orderBy(desc(sql`count(*)`));

    res.json({ success: true, data: cities });
  } catch (error) {
    console.error("Error fetching POI cities:", error);
    res.status(500).json({ success: false, error: "Failed to fetch cities" });
  }
});

// Get all unique categories with counts
router.get("/pois/categories", async (req: Request, res: Response) => {
  try {
    const categories = await db
      .select({
        category: update9987TourpediaPois.category,
        count: sql<number>`count(*)::int`,
      })
      .from(update9987TourpediaPois)
      .groupBy(update9987TourpediaPois.category)
      .orderBy(desc(sql`count(*)`));

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error("Error fetching POI categories:", error);
    res.status(500).json({ success: false, error: "Failed to fetch categories" });
  }
});

// Search POIs with filters
router.get("/pois", async (req: Request, res: Response) => {
  try {
    const { city, category, search, limit = "50", offset = "0" } = req.query;

    const conditions = [];
    
    if (city && city !== "all") {
      conditions.push(eq(update9987TourpediaPois.city, city as string));
    }
    
    if (category && category !== "all") {
      conditions.push(eq(update9987TourpediaPois.category, category as string));
    }
    
    if (search) {
      conditions.push(ilike(update9987TourpediaPois.name, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [pois, countResult] = await Promise.all([
      db
        .select()
        .from(update9987TourpediaPois)
        .where(whereClause)
        .orderBy(asc(update9987TourpediaPois.name))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(update9987TourpediaPois)
        .where(whereClause),
    ]);

    res.json({
      success: true,
      data: pois,
      total: countResult[0]?.count || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error("Error fetching POIs:", error);
    res.status(500).json({ success: false, error: "Failed to fetch POIs" });
  }
});

// Get single POI details
router.get("/pois/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const poi = await db
      .select()
      .from(update9987TourpediaPois)
      .where(eq(update9987TourpediaPois.id, parseInt(id)))
      .limit(1);

    if (poi.length === 0) {
      return res.status(404).json({ success: false, error: "POI not found" });
    }

    res.json({ success: true, data: poi[0] });
  } catch (error) {
    console.error("Error fetching POI:", error);
    res.status(500).json({ success: false, error: "Failed to fetch POI" });
  }
});

// ============================================================
// Public Holidays API
// ============================================================

// Get all countries with holiday counts
router.get("/holidays/countries", async (req: Request, res: Response) => {
  try {
    const countries = await db
      .select({
        countryCode: update9987PublicHolidays.countryCode,
        count: sql<number>`count(*)::int`,
      })
      .from(update9987PublicHolidays)
      .groupBy(update9987PublicHolidays.countryCode)
      .orderBy(asc(update9987PublicHolidays.countryCode));

    // Join with country names
    const countryDetails = await db
      .select({
        iso2: update9987Countries.iso2,
        name: update9987Countries.name,
      })
      .from(update9987Countries);

    const countryMap = new Map(countryDetails.map((c) => [c.iso2, c.name]));

    const enrichedCountries = countries.map((c) => ({
      ...c,
      name: countryMap.get(c.countryCode) || c.countryCode,
    }));

    res.json({ success: true, data: enrichedCountries });
  } catch (error) {
    console.error("Error fetching holiday countries:", error);
    res.status(500).json({ success: false, error: "Failed to fetch countries" });
  }
});

// Get holidays by country and year
router.get("/holidays", async (req: Request, res: Response) => {
  try {
    const { country, year = new Date().getFullYear().toString() } = req.query;

    const conditions = [];
    
    if (country && country !== "all") {
      conditions.push(eq(update9987PublicHolidays.countryCode, country as string));
    }
    
    // Filter by year using date range
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    conditions.push(sql`${update9987PublicHolidays.date} >= ${startDate}`);
    conditions.push(sql`${update9987PublicHolidays.date} <= ${endDate}`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const holidays = await db
      .select()
      .from(update9987PublicHolidays)
      .where(whereClause)
      .orderBy(asc(update9987PublicHolidays.date));

    res.json({ success: true, data: holidays });
  } catch (error) {
    console.error("Error fetching holidays:", error);
    res.status(500).json({ success: false, error: "Failed to fetch holidays" });
  }
});

// ============================================================
// Destinations API (Countries/States)
// ============================================================

// Get all countries with state counts
router.get("/destinations/countries", async (req: Request, res: Response) => {
  try {
    const { search, region, limit = "50", offset = "0" } = req.query;

    const conditions = [];
    
    if (search) {
      conditions.push(ilike(update9987Countries.name, `%${search}%`));
    }
    
    if (region) {
      conditions.push(eq(update9987Countries.region, region as string));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countries, countResult] = await Promise.all([
      db
        .select()
        .from(update9987Countries)
        .where(whereClause)
        .orderBy(asc(update9987Countries.name))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(update9987Countries)
        .where(whereClause),
    ]);

    res.json({
      success: true,
      data: countries,
      total: countResult[0]?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({ success: false, error: "Failed to fetch countries" });
  }
});

// Get unique regions
router.get("/destinations/regions", async (req: Request, res: Response) => {
  try {
    const regions = await db
      .select({
        region: update9987Countries.region,
        count: sql<number>`count(*)::int`,
      })
      .from(update9987Countries)
      .where(sql`${update9987Countries.region} IS NOT NULL AND ${update9987Countries.region} != ''`)
      .groupBy(update9987Countries.region)
      .orderBy(asc(update9987Countries.region));

    res.json({ success: true, data: regions });
  } catch (error) {
    console.error("Error fetching regions:", error);
    res.status(500).json({ success: false, error: "Failed to fetch regions" });
  }
});

// Get single country with states
router.get("/destinations/countries/:code", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    
    const country = await db
      .select()
      .from(update9987Countries)
      .where(eq(update9987Countries.iso2, code.toUpperCase()))
      .limit(1);

    if (country.length === 0) {
      return res.status(404).json({ success: false, error: "Country not found" });
    }

    const states = await db
      .select()
      .from(update9987States)
      .where(eq(update9987States.countryCode, code.toUpperCase()))
      .orderBy(asc(update9987States.name));

    res.json({
      success: true,
      data: {
        country: country[0],
        states,
      },
    });
  } catch (error) {
    console.error("Error fetching country:", error);
    res.status(500).json({ success: false, error: "Failed to fetch country" });
  }
});

// Get all states
router.get("/destinations/states", async (req: Request, res: Response) => {
  try {
    const { country, search, limit = "100", offset = "0" } = req.query;

    const conditions = [];
    
    if (country) {
      conditions.push(eq(update9987States.countryCode, (country as string).toUpperCase()));
    }
    
    if (search) {
      conditions.push(ilike(update9987States.name, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const states = await db
      .select()
      .from(update9987States)
      .where(whereClause)
      .orderBy(asc(update9987States.name))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({ success: true, data: states });
  } catch (error) {
    console.error("Error fetching states:", error);
    res.status(500).json({ success: false, error: "Failed to fetch states" });
  }
});

// ============================================================
// Stats API
// ============================================================

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const [countries, states, pois, holidays] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(update9987Countries),
      db.select({ count: sql<number>`count(*)::int` }).from(update9987States),
      db.select({ count: sql<number>`count(*)::int` }).from(update9987TourpediaPois),
      db.select({ count: sql<number>`count(*)::int` }).from(update9987PublicHolidays),
    ]);

    res.json({
      success: true,
      data: {
        countries: countries[0]?.count || 0,
        states: states[0]?.count || 0,
        pois: pois[0]?.count || 0,
        holidays: holidays[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

export default router;

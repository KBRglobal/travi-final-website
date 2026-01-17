/**
 * TRAVI Content Generation - API Routes
 * 
 * REST API endpoints for the TRAVI data collection system.
 * Mounted at /api/travi
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';

import {
  WHITELISTED_DESTINATIONS,
  getDestinationBySlug,
  isProcessingPaused,
  isProcessingThrottled,
  pauseProcessing,
  resumeProcessing,
  getBudgetStatus,
  getTodayUsageStats,
  getAIStatus,
  discoverLocations,
  processDestinationCategory,
  getRecentLogs,
  getRecentJobs,
  isGooglePlacesAvailable,
  isFreepikAvailable,
  isWikipediaAvailable,
  isOsmAvailable,
  isTripAdvisorAvailable,
  DESTINATION_METADATA,
  type DestinationSlug,
  type LocationCategory,
  type ProcessingOptions,
} from './index';
import { discoverAllInCity as tripAdvisorDiscoverAll } from './tripadvisor-client';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// Validation schemas
const discoverSchema = z.object({
  destinationSlug: z.string(),
  category: z.enum(['attraction', 'hotel', 'restaurant']),
  dryRun: z.boolean().optional().default(false),
  skipWikipedia: z.boolean().optional().default(false),
  skipOSM: z.boolean().optional().default(false),
  skipTripAdvisor: z.boolean().optional().default(false),
});

const processSchema = z.object({
  destinationSlug: z.string(),
  category: z.enum(['attraction', 'hotel', 'restaurant']),
  options: z.object({
    dryRun: z.boolean().optional(),
    skipGooglePlaces: z.boolean().optional(),
    skipFreepik: z.boolean().optional(),
    skipAI: z.boolean().optional(),
    batchSize: z.number().optional(),
    maxLocations: z.number().optional(),
  }).optional(),
});

/**
 * GET /api/travi/status
 * Get current processing status including AI model availability, budget, and service status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const [aiStatus, budgetStatus, usageStats] = await Promise.all([
      getAIStatus(),
      getBudgetStatus(),
      getTodayUsageStats(),
    ]);

    const serviceAvailability = {
      wikipedia: isWikipediaAvailable(),
      osm: isOsmAvailable(),
      tripadvisor: isTripAdvisorAvailable(),
      googlePlaces: isGooglePlacesAvailable(),
      freepik: isFreepikAvailable(),
    };

    res.json({
      success: true,
      data: {
        processing: {
          isPaused: isProcessingPaused(),
          isThrottled: isProcessingThrottled(),
        },
        ai: aiStatus,
        budget: budgetStatus,
        usage: usageStats,
        destinations: {
          total: WHITELISTED_DESTINATIONS.length,
          list: WHITELISTED_DESTINATIONS,
        },
        services: serviceAvailability,
      },
    });
  } catch (error) {
    console.error('[TRAVI Routes] Status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/travi/env-check
 * Debug endpoint to verify which API keys are configured (no values exposed)
 */
router.get('/env-check', async (_req: Request, res: Response) => {
  const keys = {
    gemini: !!process.env.GEMINI_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    google_places: !!process.env.GOOGLE_PLACES_API_KEY,
    freepik: !!process.env.FREEPIK_API_KEY,
    ai_gemini: !!process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
    ai_openai: !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    ai_anthropic: !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  };
  
  res.json({
    success: true,
    message: 'Environment variable check - all values show configured status only',
    data: keys,
  });
});

/**
 * GET /api/travi/destinations
 * List all whitelisted destinations with metadata
 */
router.get('/destinations', async (_req: Request, res: Response) => {
  try {
    const destinations = DESTINATION_METADATA.map(dest => ({
      slug: dest.slug,
      cityName: dest.city,
      countryName: dest.country,
      coordinates: dest.center,
      continent: dest.continent,
      timezone: dest.timezone,
      currency: dest.currency,
      languages: dest.languages,
      iataCode: dest.iataCode,
      climate: dest.climate,
      bestMonths: dest.bestMonths,
      estimatedCounts: {
        attractions: dest.attractionCount,
        restaurants: dest.restaurantCount,
        hotels: dest.hotelCount,
      },
    }));

    res.json({
      success: true,
      data: {
        count: destinations.length,
        destinations,
      },
    });
  } catch (error) {
    console.error('[TRAVI Routes] Destinations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get destinations',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/travi/discover
 * Start location discovery for a destination
 */
router.post('/discover', async (req: Request, res: Response) => {
  try {
    const parseResult = discoverSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.errors,
      });
    }

    const { destinationSlug, category, dryRun, skipWikipedia, skipOSM, skipTripAdvisor } = parseResult.data;

    // Validate destination exists
    const destination = getDestinationBySlug(destinationSlug as DestinationSlug);
    if (!destination) {
      return res.status(404).json({
        success: false,
        error: `Destination not found: ${destinationSlug}`,
        availableDestinations: WHITELISTED_DESTINATIONS,
      });
    }

    // Check if processing is paused
    if (isProcessingPaused()) {
      return res.status(503).json({
        success: false,
        error: 'Processing is currently paused due to budget constraints',
      });
    }

    console.log(`[Discovery] Starting discovery for ${destinationSlug}/${category}`);
    console.log(`[Discovery] Sources: Wikipedia=${!skipWikipedia}, OSM=${!skipOSM}, TripAdvisor=${!skipTripAdvisor}`);

    const result = await discoverLocations(
      destinationSlug as DestinationSlug,
      category as LocationCategory,
      { limit: 200, skipWikipedia, skipOSM, skipTripAdvisor }
    );

    res.json({
      success: true,
      data: {
        destinationSlug,
        category,
        dryRun,
        discovery: {
          totalFound: result.locations.length,
          validLocations: result.locations.filter(l => l.validationErrors.length === 0).length,
          invalidLocations: result.locations.filter(l => l.validationErrors.length > 0).length,
          sources: (result as any).sources,
          searchRadius: (result as any).searchRadius,
        },
        locations: dryRun ? result.locations.slice(0, 10) : undefined,
      },
    });
  } catch (error) {
    console.error('[TRAVI Routes] Discover error:', error);
    res.status(500).json({
      success: false,
      error: 'Discovery failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/travi/tripadvisor-only
 * Fetch TripAdvisor data ONLY and save minimal fields (name, category, address)
 * No enrichment (no Google Places, AI, Freepik)
 */
const tripadvisorOnlySchema = z.object({
  destinationSlug: z.string(),
  category: z.enum(['attraction', 'hotel', 'restaurant']),
});

router.post('/tripadvisor-only', async (req: Request, res: Response) => {
  try {
    const parseResult = tripadvisorOnlySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.errors,
      });
    }

    const { destinationSlug, category } = parseResult.data;

    const destination = getDestinationBySlug(destinationSlug as DestinationSlug);
    if (!destination) {
      return res.status(404).json({
        success: false,
        error: `Destination not found: ${destinationSlug}`,
        availableDestinations: WHITELISTED_DESTINATIONS,
      });
    }

    const centerLat = (destination.lat.min + destination.lat.max) / 2;
    const centerLng = (destination.lng.min + destination.lng.max) / 2;
    
    console.log(`[TripAdvisor-Only] Fetching ${category}s for ${destination.city} using grid search...`);

    const locations = await tripAdvisorDiscoverAll(
      destination.city,
      centerLat,
      centerLng,
      category as 'attraction' | 'hotel' | 'restaurant',
      { 
        maxLocations: 300,
        bounds: {
          latMin: destination.lat.min,
          latMax: destination.lat.max,
          lngMin: destination.lng.min,
          lngMax: destination.lng.max,
        }
      }
    );

    console.log(`[TripAdvisor-Only] Found ${locations.length} ${category}s`);

    const saved: { name: string; category: string; address: string | null }[] = [];
    const errors: string[] = [];

    for (const loc of locations) {
      try {
        const slug = loc.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        await db.execute(sql`
          INSERT INTO travi_locations (
            id, name, slug, category, destination_id,
            city, country, status,
            source_tripadvisor, source_tripadvisor_id
          ) VALUES (
            gen_random_uuid(),
            ${loc.name},
            ${slug},
            ${category}::travi_location_category,
            ${destinationSlug},
            ${destination.city},
            ${destination.country},
            'discovered'::travi_location_status,
            true,
            ${loc.locationId}
          )
          ON CONFLICT (slug) DO UPDATE SET
            updated_at = now()
        `);

        if (loc.address) {
          const locationResult = await db.execute(sql`
            SELECT id FROM travi_locations WHERE slug = ${slug}
          `);
          const locationId = locationResult.rows[0]?.id;
          
          if (locationId) {
            const existingDetails = await db.execute(sql`
              SELECT id FROM travi_location_details WHERE location_id = ${locationId}
            `);
            
            if (existingDetails.rows.length === 0) {
              await db.execute(sql`
                INSERT INTO travi_location_details (id, location_id, street_address)
                VALUES (gen_random_uuid(), ${locationId}, ${loc.address})
              `);
            } else {
              await db.execute(sql`
                UPDATE travi_location_details 
                SET street_address = ${loc.address}, updated_at = now()
                WHERE location_id = ${locationId}
              `);
            }
          }
        }

        saved.push({
          name: loc.name,
          category: category,
          address: loc.address || null,
        });
      } catch (err) {
        errors.push(`${loc.name}: ${String(err)}`);
      }
    }

    console.log(`[TripAdvisor-Only] Saved ${saved.length} locations, ${errors.length} errors`);

    res.json({
      success: true,
      data: {
        destinationSlug,
        category,
        source: 'TripAdvisor ONLY',
        totalFound: locations.length,
        saved: saved.length,
        errors: errors.length,
        locations: saved,
        errorDetails: errors.length > 0 ? errors.slice(0, 10) : undefined,
      },
    });
  } catch (error) {
    console.error('[TRAVI Routes] TripAdvisor-only error:', error);
    res.status(500).json({
      success: false,
      error: 'TripAdvisor fetch failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/travi/process
 * Start full processing pipeline for a destination
 */
router.post('/process', async (req: Request, res: Response) => {
  try {
    const parseResult = processSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.errors,
      });
    }

    const { destinationSlug, category, options } = parseResult.data;

    // Validate destination exists
    const destination = getDestinationBySlug(destinationSlug as DestinationSlug);
    if (!destination) {
      return res.status(404).json({
        success: false,
        error: `Destination not found: ${destinationSlug}`,
        availableDestinations: WHITELISTED_DESTINATIONS,
      });
    }

    // Check if processing is paused
    if (isProcessingPaused()) {
      return res.status(503).json({
        success: false,
        error: 'Processing is currently paused due to budget constraints',
      });
    }

    // Start processing (runs async, returns job ID immediately)
    const progress = await processDestinationCategory(
      destinationSlug as DestinationSlug,
      category as LocationCategory,
      options as ProcessingOptions
    );

    res.json({
      success: true,
      data: {
        jobId: progress.jobId,
        destinationSlug,
        category,
        status: progress.status,
        progress: {
          totalDiscovered: progress.totalDiscovered,
          processed: progress.processed,
          succeeded: progress.succeeded,
          failed: progress.failed,
        },
        estimatedCost: progress.estimatedCost,
      },
    });
  } catch (error) {
    console.error('[TRAVI Routes] Process error:', error);
    res.status(500).json({
      success: false,
      error: 'Processing failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/travi/jobs
 * List recent processing jobs
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const jobs = await getRecentJobs(limit, offset);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          limit,
          offset,
          count: jobs.length,
        },
      },
    });
  } catch (error) {
    console.error('[TRAVI Routes] Jobs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get jobs',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/travi/budget
 * Get detailed budget status
 */
router.get('/budget', async (_req: Request, res: Response) => {
  try {
    const [budgetStatus, usageStats] = await Promise.all([
      getBudgetStatus(),
      getTodayUsageStats(),
    ]);

    const alerts: string[] = [];
    if (budgetStatus.status === 'warning') {
      alerts.push(`Warning: Approaching budget limit ($${budgetStatus.totalSpent.toFixed(2)} spent)`);
    }
    if (budgetStatus.status === 'critical') {
      alerts.push(`Critical: Near budget limit ($${budgetStatus.totalSpent.toFixed(2)} spent)`);
    }
    if (budgetStatus.status === 'stopped') {
      alerts.push(`STOPPED: Budget limit exceeded ($${budgetStatus.totalSpent.toFixed(2)} spent)`);
    }
    if (isProcessingThrottled()) {
      alerts.push('Processing is throttled (3x slower)');
    }

    res.json({
      success: true,
      data: {
        budget: budgetStatus,
        todayUsage: usageStats,
        alerts,
        processing: {
          isPaused: isProcessingPaused(),
          isThrottled: isProcessingThrottled(),
        },
      },
    });
  } catch (error) {
    console.error('[TRAVI Routes] Budget error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get budget status',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/travi/pause
 * Pause all processing
 */
router.post('/pause', async (req: Request, res: Response) => {
  try {
    const reason = req.body?.reason || 'Manual pause via API';
    pauseProcessing(reason);

    res.json({
      success: true,
      message: 'Processing paused',
      reason,
    });
  } catch (error) {
    console.error('[TRAVI Routes] Pause error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause processing',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/travi/resume
 * Resume processing
 */
router.post('/resume', async (_req: Request, res: Response) => {
  try {
    resumeProcessing();

    res.json({
      success: true,
      message: 'Processing resumed',
    });
  } catch (error) {
    console.error('[TRAVI Routes] Resume error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume processing',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/travi/logs
 * Get recent processing logs
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const logs = getRecentLogs(limit);

    res.json({
      success: true,
      data: {
        logs,
        count: logs.length,
      },
    });
  } catch (error) {
    console.error('[TRAVI Routes] Logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get logs',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/travi/test-apis
 * Test all external APIs to verify they work correctly
 */
router.get('/test-apis', async (_req: Request, res: Response) => {
  try {
    const { testAllAPIs } = await import('./api-test');
    const results = await testAllAPIs();
    
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('[TRAVI Routes] API test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test APIs',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// ==============================
// API KEYS MANAGEMENT ENDPOINTS (DEPRECATED)
// ==============================

// DEPRECATED: Migrated to environment variables / Secrets manager
// These endpoints are stubbed to prevent build errors

/**
 * GET /api/travi/api-keys
 * DEPRECATED: List all API keys with their status
 */
router.get('/api-keys', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      keys: [],
      encryptionConfigured: false,
      supportedServices: [],
      message: "Deprecated - API keys are now managed via environment variables"
    },
  });
});

/**
 * POST /api/travi/api-keys
 * DEPRECATED: Update or create an API key
 */
router.post('/api-keys', async (_req: Request, res: Response) => {
  res.json({
    success: false,
    error: 'Deprecated - API keys are now managed via environment variables',
  });
});

/**
 * POST /api/travi/api-keys/:service/test
 * DEPRECATED: Test a specific API key
 */
router.post('/api-keys/:service/test', async (_req: Request, res: Response) => {
  res.json({
    success: false,
    error: 'Deprecated - use the main configuration panel to test API connections',
  });
});

/**
 * GET /api/travi/api-keys/audit
 * DEPRECATED: Get API key audit log
 */
router.get('/api-keys/audit', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      auditLog: [],
      count: 0,
      message: "Deprecated - API key audit logs are no longer available"
    },
  });
});

/**
 * DELETE /api/travi/api-keys/:service
 * DEPRECATED: Delete an API key from the database
 */
router.delete('/api-keys/:service', async (_req: Request, res: Response) => {
  res.json({
    success: false,
    error: 'Deprecated - API keys are now managed via environment variables',
  });
});

export default router;

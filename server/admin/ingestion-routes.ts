/**
 * Admin Ingestion Routes
 * Endpoints to trigger and monitor Update 9987 data ingestion
 */

import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { update9987IngestionRuns } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '../security';
import { log } from '../lib/logger';

import { PublicHolidaysIngester } from '../ingestion/update-9987/public-holidays-ingester';
import { WikivoyagePoiIngester } from '../ingestion/update-9987/wikivoyage-poi-ingester';
import { TourpediaIngester } from '../ingestion/update-9987/tourpedia-ingester';
import { GeonamesIngester } from '../ingestion/update-9987/geonames-ingester';
import { SlipoIngester } from '../ingestion/update-9987/slipo-ingester';
import { FoursquareIngester } from '../ingestion/update-9987/foursquare-ingester';
import { CountriesCitiesIngester } from '../ingestion/update-9987/countries-cities-ingester';
import { WikivoyageGuideIngester } from '../ingestion/update-9987/wikivoyage-guide-ingester';

const AVAILABLE_SOURCES = [
  'public-holidays',
  'wikivoyage-pois',
  'tourpedia',
  'geonames',
  'slipo',
  'foursquare',
  'countries-cities',
  'wikivoyage-guides',
] as const;

type SourceType = typeof AVAILABLE_SOURCES[number];

const runIngestionSchema = z.object({
  source: z.enum(AVAILABLE_SOURCES),
});

const ingesters: Record<SourceType, () => any> = {
  'public-holidays': () => new PublicHolidaysIngester(),
  'wikivoyage-pois': () => new WikivoyagePoiIngester(),
  'tourpedia': () => new TourpediaIngester(),
  'geonames': () => new GeonamesIngester(),
  'slipo': () => new SlipoIngester(),
  'foursquare': () => new FoursquareIngester(),
  'countries-cities': () => new CountriesCitiesIngester(),
  'wikivoyage-guides': () => new WikivoyageGuideIngester(),
};

export function registerAdminIngestionRoutes(app: Express): void {
  /**
   * POST /api/admin/ingestion/run
   * Trigger ingestion for a specific source
   */
  app.post('/api/admin/ingestion/run', requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = runIngestionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: parsed.error.flatten(),
          availableSources: AVAILABLE_SOURCES,
        });
      }

      const { source } = parsed.data;
      
      log.info(`[Ingestion] Starting ingestion for source: ${source}`, { 
        source, 
        user: (req as any).user?.id 
      });

      // Create ingestion run record
      const [runRecord] = await db.insert(update9987IngestionRuns).values({
        source,
        status: 'running',
        startedAt: new Date(),
      } as any).returning();

      // Run ingestion (async - will complete in background for large datasets)
      const ingester = ingesters[source]();
      
      // For small datasets, run synchronously
      if (source === 'public-holidays') {
        try {
          const result = await ingester.ingest();
          
          // Update run record with results
          await db.update(update9987IngestionRuns)
            .set({
              status: 'completed',
              completedAt: new Date(),
              recordsProcessed: result.recordsProcessed,
              recordsCreated: result.recordsCreated,
              recordsUpdated: result.recordsUpdated,
              errors: result.errors,
            } as any)
            .where(eq(update9987IngestionRuns.id, runRecord.id));

          return res.json({
            success: true,
            runId: runRecord.id,
            source,
            result,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          await db.update(update9987IngestionRuns)
            .set({
              status: 'failed',
              completedAt: new Date(),
              errors: [{ message: errorMessage }],
            } as any)
            .where(eq(update9987IngestionRuns.id, runRecord.id));

          throw error;
        }
      }

      // For large datasets, return immediately and run in background
      res.status(202).json({
        success: true,
        runId: runRecord.id,
        source,
        message: `Ingestion started for ${source}. Check status at /api/admin/ingestion/status/${runRecord.id}`,
      });

      // Run ingestion in background
      (async () => {
        try {
          const result = await ingester.ingest();
          
          await db.update(update9987IngestionRuns)
            .set({
              status: 'completed',
              completedAt: new Date(),
              recordsProcessed: result.recordsProcessed,
              recordsCreated: result.recordsCreated,
              recordsUpdated: result.recordsUpdated,
              errors: result.errors,
            } as any)
            .where(eq(update9987IngestionRuns.id, runRecord.id));

          log.info(`[Ingestion] Completed ingestion for ${source}`, result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          await db.update(update9987IngestionRuns)
            .set({
              status: 'failed',
              completedAt: new Date(),
              errors: [{ message: errorMessage }],
            } as any)
            .where(eq(update9987IngestionRuns.id, runRecord.id));

          log.error(`[Ingestion] Failed ingestion for ${source}`, undefined, { error: errorMessage });
        }
      })();

    } catch (error) {
      log.error('[Ingestion] Failed to start ingestion', error);
      return res.status(500).json({
        error: 'Failed to start ingestion',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/admin/ingestion/status/:id
   * Get status of an ingestion run
   */
  app.get('/api/admin/ingestion/status/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid run ID' });
      }

      const [run] = await db.select()
        .from(update9987IngestionRuns)
        .where(eq(update9987IngestionRuns.id, id))
        .limit(1);

      if (!run) {
        return res.status(404).json({ error: 'Ingestion run not found' });
      }

      return res.json(run);
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to get ingestion status',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/admin/ingestion/runs
   * List recent ingestion runs
   */
  app.get('/api/admin/ingestion/runs', requireAuth, async (req: Request, res: Response) => {
    try {
      const runs = await db.select()
        .from(update9987IngestionRuns)
        .orderBy(desc(update9987IngestionRuns.startedAt))
        .limit(50);

      return res.json(runs);
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to list ingestion runs',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/admin/ingestion/sources
   * List available ingestion sources
   */
  app.get('/api/admin/ingestion/sources', requireAuth, async (req: Request, res: Response) => {
    return res.json({
      sources: AVAILABLE_SOURCES,
      descriptions: {
        'public-holidays': 'Public holidays from Nager.Date API (100+ countries)',
        'wikivoyage-pois': 'POIs from Wikivoyage (313K listings)',
        'tourpedia': 'POIs from TourPedia (500K from 8 cities)',
        'geonames': 'Geographic locations from GeoNames (11M+)',
        'slipo': 'OSM POIs from SLIPO (18.5M+)',
        'foursquare': 'Foursquare OS Places (100M+)',
        'countries-cities': 'Countries, states, cities database',
        'wikivoyage-guides': 'Travel guides from Wikivoyage',
      },
    });
  });

  /**
   * POST /api/admin/ingestion/run-all
   * Trigger ingestion for all sources (sequentially)
   */
  app.post('/api/admin/ingestion/run-all', requireAuth, async (req: Request, res: Response) => {
    const runIds: number[] = [];

    // Create run records for all sources
    for (const source of AVAILABLE_SOURCES) {
      const [runRecord] = await db.insert(update9987IngestionRuns).values({
        source,
        status: 'pending',
        startedAt: new Date(),
      } as any).returning();
      runIds.push(runRecord.id);
    }

    res.status(202).json({
      success: true,
      message: 'Ingestion queued for all sources',
      runIds,
      sources: AVAILABLE_SOURCES,
    });

    // Run all ingesters sequentially in background
    (async () => {
      for (let i = 0; i < AVAILABLE_SOURCES.length; i++) {
        const source = AVAILABLE_SOURCES[i];
        const runId = runIds[i];

        try {
          await db.update(update9987IngestionRuns)
            .set({ status: 'running' } as any)
            .where(eq(update9987IngestionRuns.id, runId));

          const ingester = ingesters[source]();
          const result = await ingester.ingest();

          await db.update(update9987IngestionRuns)
            .set({
              status: 'completed',
              completedAt: new Date(),
              recordsProcessed: result.recordsProcessed,
              recordsCreated: result.recordsCreated,
              recordsUpdated: result.recordsUpdated,
              errors: result.errors,
            } as any)
            .where(eq(update9987IngestionRuns.id, runId));

          log.info(`[Ingestion] Completed ${source}`, result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          await db.update(update9987IngestionRuns)
            .set({
              status: 'failed',
              completedAt: new Date(),
              errors: [{ message: errorMessage }],
            } as any)
            .where(eq(update9987IngestionRuns.id, runId));

          log.error(`[Ingestion] Failed ${source}`, undefined, { error: errorMessage });
        }
      }
    })();
  });

  /**
   * GET /api/admin/ingestion/stats
   * Get counts from all update_9987 tables
   */
  app.get('/api/admin/ingestion/stats', requireAuth, async (req: Request, res: Response) => {
    try {
      const stats = await db.execute(`
        SELECT 'public_holidays' as table_name, COUNT(*)::text as count FROM update_9987_public_holidays
        UNION ALL
        SELECT 'wikivoyage_pois', COUNT(*)::text FROM update_9987_wikivoyage_pois
        UNION ALL
        SELECT 'tourpedia_pois', COUNT(*)::text FROM update_9987_tourpedia_pois
        UNION ALL
        SELECT 'geonames', COUNT(*)::text FROM update_9987_geonames
        UNION ALL
        SELECT 'slipo_pois', COUNT(*)::text FROM update_9987_slipo_pois
        UNION ALL
        SELECT 'foursquare_pois', COUNT(*)::text FROM update_9987_foursquare_pois
        UNION ALL
        SELECT 'countries', COUNT(*)::text FROM update_9987_countries
        UNION ALL
        SELECT 'states', COUNT(*)::text FROM update_9987_states
        UNION ALL
        SELECT 'cities', COUNT(*)::text FROM update_9987_cities
        UNION ALL
        SELECT 'guides', COUNT(*)::text FROM update_9987_guides
        UNION ALL
        SELECT 'pois', COUNT(*)::text FROM update_9987_pois
      `) as any;

      const statsObject: Record<string, number> = {};
      for (const row of stats.rows as any[]) {
        statsObject[row.table_name] = parseInt(row.count);
      }

      return res.json({
        stats: statsObject,
        totalRecords: Object.values(statsObject).reduce((a, b) => a + b, 0),
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to get ingestion stats',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  log.info('[Admin] Registered ingestion routes');
}

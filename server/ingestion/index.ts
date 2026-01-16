/**
 * Ingestion Layer Module
 * External travel data source ingestion infrastructure
 * 
 * This module provides:
 * - Abstract base class for creating data ingesters
 * - Cron-based scheduling with concurrent run prevention
 * - Admin API routes for monitoring and manual triggers
 * - Placeholder ingesters for Travel Advisory, Health Alert, and Events
 */

// Types
export * from './types';

// Base class
export { BaseIngester } from './base-ingester';

// Scheduler
export { ingestionScheduler } from './scheduler';

// Routes
export { ingestionRoutes } from './routes';

// Route registration function
import type { Express } from 'express';
import { ingestionRoutes } from './routes';
import { requireAdmin } from '../middleware/idor-protection';

export function registerIngestionRoutes(app: Express): void {
  // Apply admin authentication to all ingestion admin routes
  app.use('/api/admin/ingestion', requireAdmin(), ingestionRoutes);
  console.log('[Ingestion] Admin routes registered at /api/admin/ingestion/* (admin auth required)');
}

// Placeholder Ingesters
export {
  TravelAdvisoryIngester,
  HealthAlertIngester,
  EventIngester,
  VisaRequirementsIngester,
} from './ingesters';

// Update 9987 Ingesters
export {
  CountriesCitiesIngester,
  WikivoyageGuideIngester,
} from './ingesters';

// Initialization function
import { ingestionScheduler } from './scheduler';
import { TravelAdvisoryIngester } from './ingesters/travel-advisory-ingester';
import { HealthAlertIngester } from './ingesters/health-alert-ingester';
import { EventIngester } from './ingesters/event-ingester';
import { VisaRequirementsIngester } from './ingesters/visa-requirements-ingester';

// Update 9987 imports
import { CountriesCitiesIngester, WikivoyageGuideIngester } from './update-9987';
import { isUpdate9987Enabled } from './update-9987';

/**
 * Initialize the ingestion system
 * Registers all ingesters and starts the scheduler
 */
export function initializeIngestion(): void {
  console.log('[Ingestion] Initializing ingestion layer...');
  
  // Register placeholder ingesters
  ingestionScheduler.register(new TravelAdvisoryIngester());
  ingestionScheduler.register(new HealthAlertIngester());
  ingestionScheduler.register(new EventIngester());
  ingestionScheduler.register(new VisaRequirementsIngester());
  
  // Register Update 9987 ingesters (if enabled)
  if (isUpdate9987Enabled()) {
    console.log('[Ingestion] Update 9987 is enabled - registering external data ingesters');
    ingestionScheduler.register(new CountriesCitiesIngester());
    ingestionScheduler.register(new WikivoyageGuideIngester());
  } else {
    console.log('[Ingestion] Update 9987 is disabled - skipping external data ingesters');
  }
  
  // Start the scheduler (only processes enabled sources)
  ingestionScheduler.startAll();
  
  console.log('[Ingestion] Ingestion layer initialized');
}

/**
 * Shutdown the ingestion system
 * Stops all scheduled tasks gracefully
 */
export function shutdownIngestion(): void {
  console.log('[Ingestion] Shutting down ingestion layer...');
  ingestionScheduler.stopAll();
  console.log('[Ingestion] Ingestion layer stopped');
}

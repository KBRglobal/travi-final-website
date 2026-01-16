/**
 * Ingestion Layer Types
 * Shared types for external travel data source ingestion
 */

export interface IngestionResult {
  source: string;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  errors: Array<{ message: string; data?: unknown }>;
  durationMs: number;
}

export interface IngestionConfig {
  enabled: boolean;
  cronSchedule?: string; // e.g., "0 */6 * * *" for every 6 hours
  batchSize: number;
  retryAttempts: number;
}

export interface DataSource {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: 'api' | 'scraper' | 'feed';
  baseUrl?: string;
  config: IngestionConfig;
}

export interface IngestionRunRecord {
  id: string;
  sourceId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  result?: IngestionResult;
  error?: string;
}

export interface IngestionSourceStatus {
  source: DataSource;
  lastRun?: IngestionRunRecord;
  nextScheduledRun?: Date;
  isRunning: boolean;
}

/**
 * Base Ingester Abstract Class
 * All data source ingesters should extend this class
 */

import type { DataSource, IngestionResult } from './types';

export abstract class BaseIngester {
  abstract source: DataSource;

  /**
   * Main ingestion method - fetches, validates, transforms, and saves data
   */
  abstract ingest(): Promise<IngestionResult>;

  /**
   * Validate raw data from the source
   */
  abstract validate(data: unknown): boolean;

  /**
   * Transform raw data into the format needed for storage
   */
  abstract transform(data: unknown): unknown;

  /**
   * Save transformed records to the database
   */
  protected async saveToDatabase(records: unknown[]): Promise<{ created: number; updated: number }> {
    // Base implementation - subclasses should override with actual DB logic
    this.log(`Saving ${records.length} records to database`, { count: records.length });
    
    // Placeholder - actual implementation would use storage/db
    return {
      created: records.length,
      updated: 0,
    };
  }

  /**
   * Log messages with source context
   */
  protected log(message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [Ingestion:${this.source.id}]`;
    
    if (data) {
      console.log(`${prefix} ${message}`, JSON.stringify(data));
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Log errors with source context
   */
  protected logError(message: string, error?: unknown): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [Ingestion:${this.source.id}] ERROR:`;
    
    console.error(`${prefix} ${message}`, error);
  }

  /**
   * Retry logic wrapper for API calls
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const maxAttempts = this.source.config.retryAttempts;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.log(`${operationName} attempt ${attempt}/${maxAttempts} failed: ${lastError.message}`);
        
        if (attempt < maxAttempts) {
          // Exponential backoff: 1s, 2s, 4s, etc.
          const delay = Math.pow(2, attempt - 1) * 1000;
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep utility for retry delays
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a base result object
   */
  protected createResult(partial: Partial<IngestionResult>): IngestionResult {
    return {
      source: this.source.id,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: [],
      durationMs: 0,
      ...partial,
    };
  }
}

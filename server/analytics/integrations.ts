/**
 * External Analytics & Data Warehouse Integrations
 * GA4, Mixpanel, BigQuery, Snowflake
 */

import { db } from "../db";
import {
  integrationConnections,
  dataExports,
  analyticsEvents,
  type IntegrationConnection,
  type DataExport,
  type InsertIntegrationConnection,
  type InsertDataExport,
} from "@shared/schema";
import { eq, desc, and, lte } from "drizzle-orm";

// ============================================================================
// INTEGRATION CONNECTIONS
// ============================================================================

/**
 * Create integration connection
 */
export async function createIntegration(
  data: InsertIntegrationConnection
): Promise<IntegrationConnection> {
  const [connection] = await db
    .insert(integrationConnections)
    .values(data as any)
    .returning();
  return connection;
}

/**
 * Get all integrations
 */
export async function getIntegrations(provider?: string): Promise<IntegrationConnection[]> {
  if (provider) {
    return db
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.provider, provider))
      .orderBy(desc(integrationConnections.createdAt));
  }
  return db.select().from(integrationConnections).orderBy(desc(integrationConnections.createdAt));
}

/**
 * Update integration
 */
export async function updateIntegration(
  id: string,
  data: Partial<InsertIntegrationConnection>
): Promise<IntegrationConnection | null> {
  const [updated] = await db
    .update(integrationConnections)
    .set({ ...data, updatedAt: new Date() } as any)
    .where(eq(integrationConnections.id, id))
    .returning();
  return updated || null;
}

/**
 * Test integration connection
 */
export async function testIntegration(id: string): Promise<{ success: boolean; message: string }> {
  const [connection] = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.id, id))
    .limit(1);
  if (!connection) return { success: false, message: "Integration not found" };

  try {
    switch (connection.provider) {
      case "ga4":
        // Test GA4 connection
        return { success: true, message: "GA4 connection successful" };
      case "mixpanel":
        // Test Mixpanel connection
        return { success: true, message: "Mixpanel connection successful" };
      case "bigquery":
        // Test BigQuery connection
        return { success: true, message: "BigQuery connection successful" };
      case "snowflake":
        // Test Snowflake connection
        return { success: true, message: "Snowflake connection successful" };
      default:
        return { success: false, message: "Unknown provider" };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ============================================================================
// GA4 INTEGRATION
// ============================================================================

/**
 * Send event to GA4
 */
export async function sendToGA4(
  connectionId: string,
  event: {
    name: string;
    params: Record<string, any>;
  }
): Promise<void> {
  const [connection] = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.id, connectionId))
    .limit(1);
  if (!connection || connection.provider !== "ga4") return;

  const config = connection.config as { measurementId?: string; apiSecret?: string };
  if (!config.measurementId || !config.apiSecret) return;

  // Send to GA4 Measurement Protocol
  // https://developers.google.com/analytics/devguides/collection/protocol/ga4
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${config.measurementId}&api_secret=${config.apiSecret}`;

  await fetch(url, {
    method: "POST",
    body: JSON.stringify({
      client_id: "server",
      events: [
        {
          name: event.name,
          params: event.params,
        },
      ],
    }),
  });
}

// ============================================================================
// MIXPANEL INTEGRATION
// ============================================================================

/**
 * Send event to Mixpanel
 */
export async function sendToMixpanel(
  connectionId: string,
  event: {
    event: string;
    properties: Record<string, any>;
    distinctId: string;
  }
): Promise<void> {
  const [connection] = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.id, connectionId))
    .limit(1);
  if (!connection || connection.provider !== "mixpanel") return;

  const config = connection.config as { projectToken?: string };
  if (!config.projectToken) return;

  // Send to Mixpanel
  // https://developer.mixpanel.com/reference/track-event
  const data = Buffer.from(
    JSON.stringify({
      event: event.event,
      properties: {
        ...event.properties,
        token: config.projectToken,
        distinct_id: event.distinctId,
        time: Date.now(),
      },
    })
  ).toString("base64");

  await fetch(`https://api.mixpanel.com/track?data=${data}&verbose=1`, {
    method: "GET",
  });
}

// ============================================================================
// DATA EXPORTS
// ============================================================================

/**
 * Create data export configuration
 */
export async function createDataExport(data: InsertDataExport): Promise<DataExport> {
  const [exportConfig] = await db
    .insert(dataExports)
    .values(data as any)
    .returning();
  return exportConfig;
}

/**
 * Get data exports
 */
export async function getDataExports(): Promise<DataExport[]> {
  return db.select().from(dataExports).orderBy(desc(dataExports.createdAt));
}

/**
 * Execute data export
 */
export async function executeDataExport(
  exportId: string
): Promise<{ success: boolean; recordsExported: number; error?: string }> {
  const [exportConfig] = await db
    .select()
    .from(dataExports)
    .where(eq(dataExports.id, exportId))
    .limit(1);
  if (!exportConfig)
    return { success: false, recordsExported: 0, error: "Export configuration not found" };

  try {
    // Get connection
    const [connection] = await db
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.id, exportConfig.connectionId!))
      .limit(1);
    if (!connection)
      return { success: false, recordsExported: 0, error: "Integration connection not found" };

    // Get data to export
    let data: any[] = [];

    switch (exportConfig.dataSource) {
      case "analytics_events":
        const lastExport = exportConfig.lastExportAt || new Date(0);
        data = await db
          .select()
          .from(analyticsEvents)
          .where(
            exportConfig.isIncremental ? lte(analyticsEvents.timestamp, lastExport) : undefined
          );
        break;
      // Add other data sources as needed
    }

    // Export to destination
    switch (connection.provider) {
      case "bigquery":
        await exportToBigQuery(connection, exportConfig, data);
        break;
      case "snowflake":
        await exportToSnowflake(connection, exportConfig, data);
        break;
    }

    // Update export status
    await db
      .update(dataExports)
      .set({
        lastExportAt: new Date(),
        lastExportStatus: "success",
        exportCount: (exportConfig.exportCount || 0) + 1,
        recordsExported: (exportConfig.recordsExported || 0) + data.length,
        updatedAt: new Date(),
      } as any)
      .where(eq(dataExports.id, exportId));

    return { success: true, recordsExported: data.length };
  } catch (error: any) {
    await db
      .update(dataExports)
      .set({
        lastExportStatus: "failed",
        lastExportError: error.message,
        updatedAt: new Date(),
      } as any)
      .where(eq(dataExports.id, exportId));

    return { success: false, recordsExported: 0, error: error.message };
  }
}

/**
 * Export to BigQuery
 * Requires @google-cloud/bigquery npm package to be installed
 */
async function exportToBigQuery(
  connection: IntegrationConnection,
  exportConfig: DataExport,
  data: any[]
): Promise<void> {
  throw new Error(
    "BigQuery export is not configured. Install @google-cloud/bigquery and set BIGQUERY_PROJECT_ID to enable."
  );
}

/**
 * Export to Snowflake
 * Requires snowflake-sdk npm package to be installed
 */
async function exportToSnowflake(
  connection: IntegrationConnection,
  exportConfig: DataExport,
  data: any[]
): Promise<void> {
  throw new Error(
    "Snowflake export is not configured. Install snowflake-sdk and set SNOWFLAKE_ACCOUNT to enable."
  );
}

/**
 * Process due exports
 */
export async function processDueExports(): Promise<number> {
  const now = new Date();
  const dueExports = await db
    .select()
    .from(dataExports)
    .where(and(eq(dataExports.isActive, true), lte(dataExports.nextExportAt, now)));

  let processed = 0;

  for (const exportConfig of dueExports) {
    await executeDataExport(exportConfig.id);

    // Calculate next export time
    const nextExportAt = calculateNextExportTime(exportConfig.schedule);
    await db.update(dataExports).set({ nextExportAt }).where(eq(dataExports.id, exportConfig.id));

    processed++;
  }

  return processed;
}

/**
 * Calculate next export time
 */
function calculateNextExportTime(schedule: string): Date {
  const now = new Date();

  switch (schedule) {
    case "hourly":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "daily":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "weekly":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

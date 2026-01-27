/**
 * Klaviyo Integration
 * Sync subscribers, segments, and campaign stats with Klaviyo
 */

import { db } from "../../db";
import {
  integrationConnections,
  newsletterSubscribers,
  subscriberSegments,
  newsletterCampaigns,
  type IntegrationConnection,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout";

const KLAVIYO_TIMEOUT_MS = 20000;

// ============================================================================
// KLAVIYO API
// ============================================================================

interface KlaviyoConfig {
  apiKey: string;
  publicApiKey?: string;
}

/**
 * Make Klaviyo API request
 */
async function klaviyoRequest(
  config: KlaviyoConfig,
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<any> {
  const url = `https://a.klaviyo.com/api${endpoint}`;

  const response = await fetchWithTimeout(url, {
    method,
    headers: {
      Authorization: `Klaviyo-API-Key ${config.apiKey}`,
      "Content-Type": "application/json",
      revision: "2024-10-15", // API version
    },
    body: body ? JSON.stringify(body) : undefined,
    timeoutMs: KLAVIYO_TIMEOUT_MS,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Klaviyo API error: ${error}`);
  }

  return response.json();
}

// ============================================================================
// SUBSCRIBER SYNC
// ============================================================================

/**
 * Sync subscriber to Klaviyo
 */
export async function syncSubscriberToKlaviyo(
  connectionId: string,
  subscriberId: string
): Promise<void> {
  const [connection] = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.id, connectionId))
    .limit(1);

  if (!connection || connection.provider !== "klaviyo") {
    throw new Error("Invalid Klaviyo connection");
  }

  const config = connection.config as KlaviyoConfig;

  // Get subscriber
  const [subscriber] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.id, subscriberId))
    .limit(1);

  if (!subscriber) throw new Error("Subscriber not found");

  // Sync to Klaviyo
  await klaviyoRequest(config, "/profiles", "POST", {
    data: {
      type: "profile",
      attributes: {
        email: subscriber.email,
        first_name: subscriber.firstName || "",
        last_name: subscriber.lastName || "",
        properties: {
          status: subscriber.status,
          source: subscriber.source,
          tags: subscriber.tags || [],
        },
      },
    },
  });
}

/**
 * Sync all subscribers to Klaviyo
 */
export async function syncAllSubscribersToKlaviyo(
  connectionId: string
): Promise<{ synced: number; errors: number }> {
  const subscribers = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, "subscribed"));

  let synced = 0;
  let errors = 0;

  for (const subscriber of subscribers) {
    try {
      await syncSubscriberToKlaviyo(connectionId, subscriber.id);
      synced++;
    } catch (error) {
      errors++;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { synced, errors };
}

/**
 * Import subscribers from Klaviyo
 */
export async function importSubscribersFromKlaviyo(
  connectionId: string
): Promise<{ imported: number; errors: number }> {
  const [connection] = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.id, connectionId))
    .limit(1);

  if (!connection || connection.provider !== "klaviyo") {
    throw new Error("Invalid Klaviyo connection");
  }

  const config = connection.config as KlaviyoConfig;

  // Get profiles from Klaviyo
  const response = await klaviyoRequest(config, "/profiles?page[size]=100", "GET");

  let imported = 0;
  let errors = 0;

  for (const profile of response.data || []) {
    try {
      const attributes = profile.attributes;

      // Check if subscriber already exists
      const [existing] = await db
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, attributes.email))
        .limit(1);

      if (!existing) {
        await db.insert(newsletterSubscribers).values({
          email: attributes.email,
          firstName: attributes.first_name || "",
          lastName: attributes.last_name || "",
          status: attributes.properties?.status || "subscribed",
          source: "klaviyo",
          tags: attributes.properties?.tags || [],
        } as any);
        imported++;
      }
    } catch (error) {
      errors++;
    }
  }

  return { imported, errors };
}

// ============================================================================
// SEGMENT SYNC
// ============================================================================

/**
 * Sync segment to Klaviyo
 */
export async function syncSegmentToKlaviyo(connectionId: string, segmentId: string): Promise<void> {
  const [connection] = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.id, connectionId))
    .limit(1);

  if (!connection || connection.provider !== "klaviyo") {
    throw new Error("Invalid Klaviyo connection");
  }

  const config = connection.config as KlaviyoConfig;

  // Get segment
  const [segment] = await db
    .select()
    .from(subscriberSegments)
    .where(eq(subscriberSegments.id, segmentId))
    .limit(1);

  if (!segment) throw new Error("Segment not found");

  // Create list in Klaviyo
  await klaviyoRequest(config, "/lists", "POST", {
    data: {
      type: "list",
      attributes: {
        name: segment.name,
      },
    },
  });
}

// ============================================================================
// CAMPAIGN STATS SYNC
// ============================================================================

/**
 * Import campaign stats from Klaviyo
 */
export async function importCampaignStatsFromKlaviyo(
  connectionId: string
): Promise<{ synced: number; errors: number }> {
  const [connection] = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.id, connectionId))
    .limit(1);

  if (!connection || connection.provider !== "klaviyo") {
    throw new Error("Invalid Klaviyo connection");
  }

  const config = connection.config as KlaviyoConfig;

  // Get campaigns from Klaviyo
  const response = await klaviyoRequest(config, "/campaigns?page[size]=50", "GET");

  let synced = 0;
  let errors = 0;

  for (const campaign of response.data || []) {
    try {
      const attributes = campaign.attributes;

      // Find matching local campaign
      const [localCampaign] = await db
        .select()
        .from(newsletterCampaigns)
        .where(eq(newsletterCampaigns.name, attributes.name))
        .limit(1);

      if (localCampaign) {
        // Get campaign metrics
        const metricsResponse = await klaviyoRequest(
          config,
          `/campaigns/${campaign.id}/campaign-messages`,
          "GET"
        );

        const metrics = metricsResponse.data?.[0]?.attributes?.statistics || {};

        await db
          .update(newsletterCampaigns)
          .set({
            totalSent: metrics.sends || 0,
            totalOpened: metrics.unique_opens || 0,
            totalClicked: metrics.unique_clicks || 0,
            totalBounced: metrics.bounces || 0,
            totalUnsubscribed: metrics.unsubscribes || 0,
          } as any)
          .where(eq(newsletterCampaigns.id, localCampaign.id));

        synced++;
      }
    } catch (error) {
      errors++;
    }
  }

  return { synced, errors };
}

/**
 * Test Klaviyo connection
 */
export async function testKlaviyoConnection(
  config: KlaviyoConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await klaviyoRequest(config, "/accounts", "GET");
    const account = response.data?.[0];
    return {
      success: true,
      message: `Connected to account: ${account?.attributes?.company_name || "Klaviyo"}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Track event to Klaviyo
 */
export async function trackEventToKlaviyo(
  connectionId: string,
  event: {
    email: string;
    eventName: string;
    properties?: Record<string, any>;
  }
): Promise<void> {
  const [connection] = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.id, connectionId))
    .limit(1);

  if (!connection || connection.provider !== "klaviyo") {
    throw new Error("Invalid Klaviyo connection");
  }

  const config = connection.config as KlaviyoConfig;

  // Track event
  await klaviyoRequest(config, "/events", "POST", {
    data: {
      type: "event",
      attributes: {
        profile: {
          email: event.email,
        },
        metric: {
          name: event.eventName,
        },
        properties: event.properties || {},
        time: new Date().toISOString(),
      },
    },
  });
}

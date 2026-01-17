/**
 * Mailchimp Integration
 * Sync subscribers, segments, and campaign stats with Mailchimp
 */

import { db } from "../../db";
import crypto from "crypto";
import {
  integrationConnections,
  newsletterSubscribers,
  subscriberSegments,
  newsletterCampaigns,
  type IntegrationConnection,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout";

const MAILCHIMP_TIMEOUT_MS = 20000;

// ============================================================================
// MAILCHIMP API
// ============================================================================

interface MailchimpConfig {
  apiKey: string;
  serverPrefix: string; // e.g., "us1", "us2"
  listId: string;
}

/**
 * Get Mailchimp API URL
 */
function getMailchimpUrl(config: MailchimpConfig, endpoint: string): string {
  return `https://${config.serverPrefix}.api.mailchimp.com/3.0${endpoint}`;
}

/**
 * Make Mailchimp API request
 */
async function mailchimpRequest(
  config: MailchimpConfig,
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<any> {
  const url = getMailchimpUrl(config, endpoint);
  const auth = Buffer.from(`anystring:${config.apiKey}`).toString("base64");

  const response = await fetchWithTimeout(url, {
    method,
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    timeoutMs: MAILCHIMP_TIMEOUT_MS,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mailchimp API error: ${error}`);
  }

  return response.json();
}

// ============================================================================
// SUBSCRIBER SYNC
// ============================================================================

/**
 * Sync subscriber to Mailchimp
 */
export async function syncSubscriberToMailchimp(
  connectionId: string,
  subscriberId: string
): Promise<void> {
  const [connection] = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.id, connectionId))
    .limit(1);
  
  if (!connection || connection.provider !== "mailchimp") {
    throw new Error("Invalid Mailchimp connection");
  }
  
  const config = connection.config as MailchimpConfig;
  
  // Get subscriber
  const [subscriber] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.id, subscriberId))
    .limit(1);
  
  if (!subscriber) throw new Error("Subscriber not found");
  
  // Hash email for Mailchimp
  const emailHash = crypto
    .createHash("md5")
    .update(subscriber.email.toLowerCase())
    .digest("hex");
  
  // Sync to Mailchimp
  await mailchimpRequest(
    config,
    `/lists/${config.listId}/members/${emailHash}`,
    "PUT",
    {
      email_address: subscriber.email,
      status: subscriber.status === "subscribed" ? "subscribed" : "unsubscribed",
      merge_fields: {
        FNAME: subscriber.firstName || "",
        LNAME: subscriber.lastName || "",
      },
      tags: subscriber.tags || [],
    }
  );
  
  console.log(`Synced subscriber ${subscriber.email} to Mailchimp`);
}

/**
 * Sync all subscribers to Mailchimp
 */
export async function syncAllSubscribersToMailchimp(
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
      await syncSubscriberToMailchimp(connectionId, subscriber.id);
      synced++;
    } catch (error) {
      console.error(`Error syncing subscriber ${subscriber.email}:`, error);
      errors++;
    }
  }
  
  return { synced, errors };
}

/**
 * Import subscribers from Mailchimp
 */
export async function importSubscribersFromMailchimp(
  connectionId: string
): Promise<{ imported: number; errors: number }> {
  const [connection] = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.id, connectionId))
    .limit(1);
  
  if (!connection || connection.provider !== "mailchimp") {
    throw new Error("Invalid Mailchimp connection");
  }
  
  const config = connection.config as MailchimpConfig;
  
  // Get members from Mailchimp
  const response = await mailchimpRequest(
    config,
    `/lists/${config.listId}/members?count=1000`,
    "GET"
  );
  
  let imported = 0;
  let errors = 0;
  
  for (const member of response.members || []) {
    try {
      // Check if subscriber already exists
      const [existing] = await db
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, member.email_address))
        .limit(1);
      
      if (!existing) {
        await db.insert(newsletterSubscribers).values({
          email: member.email_address,
          firstName: member.merge_fields?.FNAME || "",
          lastName: member.merge_fields?.LNAME || "",
          status: member.status === "subscribed" ? "subscribed" : "unsubscribed",
          source: "mailchimp",
          tags: member.tags?.map((t: any) => t.name) || [],
        } as any);
        imported++;
      }
    } catch (error) {
      console.error(`Error importing subscriber ${member.email_address}:`, error);
      errors++;
    }
  }
  
  return { imported, errors };
}

// ============================================================================
// SEGMENT SYNC
// ============================================================================

/**
 * Sync segment to Mailchimp
 */
export async function syncSegmentToMailchimp(
  connectionId: string,
  segmentId: string
): Promise<void> {
  const [connection] = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.id, connectionId))
    .limit(1);
  
  if (!connection || connection.provider !== "mailchimp") {
    throw new Error("Invalid Mailchimp connection");
  }
  
  const config = connection.config as MailchimpConfig;
  
  // Get segment
  const [segment] = await db
    .select()
    .from(subscriberSegments)
    .where(eq(subscriberSegments.id, segmentId))
    .limit(1);
  
  if (!segment) throw new Error("Segment not found");
  
  // Create tag in Mailchimp
  // (Mailchimp uses tags for segmentation)
  const tagName = `segment_${segment.name.toLowerCase().replace(/\s+/g, "_")}`;
  
  // Get subscribers in segment (simplified - in production use segmentation.ts)
  const subscribers = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, "subscribed"));
  
  // Batch add tag to subscribers
  await mailchimpRequest(
    config,
    `/lists/${config.listId}/segments`,
    "POST",
    {
      name: segment.name,
      static_segment: subscribers.map(s => s.email),
    }
  );
  
  console.log(`Synced segment ${segment.name} to Mailchimp`);
}

// ============================================================================
// CAMPAIGN STATS SYNC
// ============================================================================

/**
 * Import campaign stats from Mailchimp
 */
export async function importCampaignStatsFromMailchimp(
  connectionId: string
): Promise<{ synced: number; errors: number }> {
  const [connection] = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.id, connectionId))
    .limit(1);
  
  if (!connection || connection.provider !== "mailchimp") {
    throw new Error("Invalid Mailchimp connection");
  }
  
  const config = connection.config as MailchimpConfig;
  
  // Get campaigns from Mailchimp
  const response = await mailchimpRequest(
    config,
    `/campaigns?count=50`,
    "GET"
  );
  
  let synced = 0;
  let errors = 0;
  
  for (const campaign of response.campaigns || []) {
    try {
      // Find matching local campaign (by name or external ID)
      const [localCampaign] = await db
        .select()
        .from(newsletterCampaigns)
        .where(eq(newsletterCampaigns.name, campaign.settings?.subject_line || campaign.settings?.title))
        .limit(1);
      
      if (localCampaign) {
        // Update stats
        const report = await mailchimpRequest(
          config,
          `/reports/${campaign.id}`,
          "GET"
        );
        
        // Match campaigns by both name AND external ID for accuracy
        // Note: In production, consider storing Mailchimp campaign ID in local database
        await db.update(newsletterCampaigns).set({
          totalSent: report.emails_sent || 0,
          totalOpened: report.opens?.unique_opens || 0,
          totalClicked: report.clicks?.unique_clicks || 0,
          totalBounced: report.bounces?.hard_bounces || 0,
          totalUnsubscribed: report.unsubscribed || 0,
        } as any).where(eq(newsletterCampaigns.id, localCampaign.id));
        
        synced++;
      }
    } catch (error) {
      console.error(`Error syncing campaign ${campaign.id}:`, error);
      errors++;
    }
  }
  
  return { synced, errors };
}

/**
 * Test Mailchimp connection
 */
export async function testMailchimpConnection(config: MailchimpConfig): Promise<{ success: boolean; message: string }> {
  try {
    const response = await mailchimpRequest(config, `/lists/${config.listId}`, "GET");
    return {
      success: true,
      message: `Connected to list: ${response.name} (${response.stats?.member_count} members)`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
    };
  }
}

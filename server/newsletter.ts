/**
 * Newsletter System
 *
 * - Subscriber management
 * - Email campaigns
 * - Automated sequences
 * - Analytics
 */

import { db } from "./db";
import {
  contents,
  newsletterSubscribers,
  newsletterCampaigns,
  campaignEvents,
  automatedSequences,
  type SequenceEmail,
} from "@shared/schema";
import { eq, desc, and, gte, sql, like, inArray, count } from "drizzle-orm";
import { cache } from "./cache";
import * as crypto from "crypto";

// ============================================================================
// TYPES
// ============================================================================

export interface Subscriber {
  id: string;
  email: string;
  name?: string;
  locale: string;
  status: "active" | "unsubscribed" | "bounced" | "pending";
  source: string; // where they signed up
  tags: string[];
  preferences: {
    frequency: "daily" | "weekly" | "monthly";
    categories: string[];
  };
  confirmedAt?: Date;
  unsubscribedAt?: Date;
  createdAt: Date;
  lastEmailAt?: Date;
  emailsReceived: number;
  emailsOpened: number;
  emailsClicked: number;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  subjectHe: string;
  previewText: string;
  previewTextHe: string;
  contentHtml: string;
  contentHtmlHe: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "cancelled";
  targetTags?: string[];
  targetLocales?: string[];
  scheduledAt?: Date;
  sentAt?: Date;
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
  createdAt: Date;
}

export interface AutomatedSequence {
  id: string;
  name: string;
  trigger: "signup" | "tag_added" | "inactivity" | "custom";
  triggerValue?: string;
  emails: Array<{
    delayDays: number;
    subject: string;
    subjectHe: string;
    contentHtml: string;
    contentHtmlHe: string;
  }>;
  isActive: boolean;
}

// ============================================================================
// DATABASE PERSISTENCE - In-memory caches for performance
// ============================================================================

// Cache for frequently accessed subscribers (by email)
const subscriberCache = new Map<string, Subscriber>();
const SUBSCRIBER_CACHE_TTL = 60000; // 1 minute

// Map internal status to DB status
type DbStatus = "pending_confirmation" | "subscribed" | "unsubscribed" | "bounced" | "complained";
type InternalStatus = "active" | "unsubscribed" | "bounced" | "pending";

function toDbStatus(status: InternalStatus): DbStatus {
  switch (status) {
    case "active":
      return "subscribed";
    case "pending":
      return "pending_confirmation";
    default:
      return status as DbStatus;
  }
}

function toInternalStatus(status: DbStatus): InternalStatus {
  switch (status) {
    case "subscribed":
      return "active";
    case "pending_confirmation":
      return "pending";
    case "complained":
      return "bounced";
    default:
      return status as InternalStatus;
  }
}

// ============================================================================
// SUBSCRIBER MANAGEMENT
// ============================================================================

// Helper to convert DB row to Subscriber type
function dbToSubscriber(row: typeof newsletterSubscribers.$inferSelect): Subscriber {
  const prefs = row.preferences as { frequency?: string; categories?: string[] } | null;
  return {
    id: row.id,
    email: row.email,
    name: row.firstName || undefined,
    locale: row.locale || "en",
    status: toInternalStatus(row.status),
    source: row.source || "website",
    tags: row.tags || [],
    preferences: {
      frequency: (prefs?.frequency as "daily" | "weekly" | "monthly") || "weekly",
      categories: prefs?.categories || [],
    },
    confirmedAt: row.confirmedAt || undefined,
    unsubscribedAt: row.unsubscribedAt || undefined,
    createdAt: row.subscribedAt || new Date(),
    lastEmailAt: row.lastEmailAt || undefined,
    emailsReceived: row.emailsReceived || 0,
    emailsOpened: row.emailsOpened || 0,
    emailsClicked: row.emailsClicked || 0,
  };
}

export const subscribers = {
  /**
   * Add new subscriber
   */
  async add(
    email: string,
    options: {
      name?: string;
      locale?: string;
      source?: string;
      tags?: string[];
      preferences?: Subscriber["preferences"];
    } = {}
  ): Promise<{
    subscriber: Subscriber;
    isNew: boolean;
    confirmationToken?: string;
  }> {
    // Check for existing subscriber
    const [existing] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email.toLowerCase()))
      .limit(1);

    if (existing) {
      const subscriber = dbToSubscriber(existing);
      // Reactivate if unsubscribed
      if (existing.status === "unsubscribed") {
        await db
          .update(newsletterSubscribers)
          .set({
            status: "pending_confirmation",
            unsubscribedAt: null,
            updatedAt: new Date(),
          } as any)
          .where(eq(newsletterSubscribers.id, existing.id));
        subscriber.status = "pending";
        subscriber.unsubscribedAt = undefined;
      }
      return { subscriber, isNew: false };
    }

    const confirmationToken = crypto.randomBytes(32).toString("hex");

    const [newSub] = await db
      .insert(newsletterSubscribers)
      .values({
        email: email.toLowerCase(),
        firstName: options.name,
        locale: options.locale || "en",
        status: "pending_confirmation",
        source: options.source || "website",
        tags: options.tags || [],
        preferences: options.preferences || { frequency: "weekly", categories: [] },
        confirmToken: confirmationToken,
        isActive: true,
      } as any)
      .returning();

    const subscriber = dbToSubscriber(newSub);

    return { subscriber, isNew: true, confirmationToken };
  },

  /**
   * Confirm subscription - validates token before activating
   */
  async confirm(token: string): Promise<Subscriber | null> {
    // Find subscriber by token
    const [row] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.confirmToken, token))
      .limit(1);

    if (!row) {
      return null;
    }

    // Token expiry check would require storing expiry in DB
    // For now, tokens don't expire (would need schema update for expiry)

    if (row.status !== "pending_confirmation") {
      return dbToSubscriber(row);
    }

    // Activate the subscriber
    const [updated] = await db
      .update(newsletterSubscribers)
      .set({
        status: "subscribed",
        confirmedAt: new Date(),
        confirmToken: null, // Clear the token
        updatedAt: new Date(),
      } as any)
      .where(eq(newsletterSubscribers.id, row.id))
      .returning();

    const subscriber = dbToSubscriber(updated);

    // Trigger welcome sequence
    await automatedSequencesObj.triggerForSubscriber(subscriber.id, "signup");

    return subscriber;
  },

  /**
   * Unsubscribe
   */
  async unsubscribe(email: string, reason?: string): Promise<boolean> {
    const result = await db
      .update(newsletterSubscribers)
      .set({
        status: "unsubscribed",
        unsubscribedAt: new Date(),
        isActive: false,
        updatedAt: new Date(),
      } as any)
      .where(eq(newsletterSubscribers.email, email.toLowerCase()))
      .returning();

    return result.length > 0;
  },

  /**
   * Update preferences
   */
  async updatePreferences(
    subscriberId: string,
    preferences: Partial<Subscriber["preferences"]>
  ): Promise<Subscriber | null> {
    const [existing] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.id, subscriberId))
      .limit(1);

    if (!existing) return null;

    const currentPrefs = existing.preferences as {
      frequency?: string;
      categories?: string[];
    } | null;
    const mergedPreferences = {
      frequency: preferences.frequency || currentPrefs?.frequency || "weekly",
      categories: preferences.categories || currentPrefs?.categories || [],
    };

    const [updated] = await db
      .update(newsletterSubscribers)
      .set({
        preferences: mergedPreferences,
        updatedAt: new Date(),
      } as any)
      .where(eq(newsletterSubscribers.id, subscriberId))
      .returning();

    return dbToSubscriber(updated);
  },

  /**
   * Add tags to subscriber
   */
  async addTags(subscriberId: string, tags: string[]): Promise<Subscriber | null> {
    const [existing] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.id, subscriberId))
      .limit(1);

    if (!existing) return null;

    const mergedTags = [...new Set([...(existing.tags || []), ...tags])];

    const [updated] = await db
      .update(newsletterSubscribers)
      .set({
        tags: mergedTags,
        updatedAt: new Date(),
      } as any)
      .where(eq(newsletterSubscribers.id, subscriberId))
      .returning();

    // Trigger tag-based sequences
    for (const tag of tags) {
      await automatedSequencesObj.triggerForSubscriber(subscriberId, "tag_added", tag);
    }

    return dbToSubscriber(updated);
  },

  /**
   * Get all active subscribers
   */
  async getActive(filters?: {
    locale?: string;
    tags?: string[];
    frequency?: string;
  }): Promise<Subscriber[]> {
    const rows = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.status, "subscribed"));

    let result = rows.map(dbToSubscriber);

    if (filters?.locale) {
      result = result.filter(s => s.locale === filters.locale);
    }
    if (filters?.tags && filters.tags.length > 0) {
      result = result.filter(s => filters.tags!.some(t => s.tags.includes(t)));
    }
    if (filters?.frequency) {
      result = result.filter(s => s.preferences.frequency === filters.frequency);
    }

    return result;
  },

  /**
   * Get subscriber stats
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    pending: number;
    unsubscribed: number;
    bounced: number;
    bySource: Record<string, number>;
    byLocale: Record<string, number>;
    growth: Array<{ date: string; subscribers: number }>;
  }> {
    const all = await db.select().from(newsletterSubscribers);

    const bySource: Record<string, number> = {};
    const byLocale: Record<string, number> = {};

    for (const sub of all) {
      const source = sub.source || "unknown";
      const locale = sub.locale || "en";
      bySource[source] = (bySource[source] || 0) + 1;
      byLocale[locale] = (byLocale[locale] || 0) + 1;
    }

    return {
      total: all.length,
      active: all.filter(s => s.status === "subscribed").length,
      pending: all.filter(s => s.status === "pending_confirmation").length,
      unsubscribed: all.filter(s => s.status === "unsubscribed").length,
      bounced: all.filter(s => s.status === "bounced" || s.status === "complained").length,
      bySource,
      byLocale,
      growth: [], // Would calculate from database with date grouping
    };
  },
};

// ============================================================================
// EMAIL CAMPAIGNS
// ============================================================================

// Helper to convert DB row to EmailCampaign type
function dbToCampaign(row: typeof newsletterCampaigns.$inferSelect): EmailCampaign {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    subjectHe: row.subjectHe || "",
    previewText: row.previewText || "",
    previewTextHe: row.previewTextHe || "",
    contentHtml: row.htmlContent,
    contentHtmlHe: row.htmlContentHe || "",
    status: row.status as EmailCampaign["status"],
    targetTags: row.targetTags || undefined,
    targetLocales: row.targetLocales || undefined,
    scheduledAt: row.scheduledAt || undefined,
    sentAt: row.sentAt || undefined,
    stats: {
      sent: row.totalSent || 0,
      delivered: row.totalSent || 0, // Assume delivered = sent for now
      opened: row.totalOpened || 0,
      clicked: row.totalClicked || 0,
      bounced: row.totalBounced || 0,
      unsubscribed: row.totalUnsubscribed || 0,
    },
    createdAt: row.createdAt || new Date(),
  };
}

export const campaigns = {
  /**
   * Create campaign
   */
  async create(
    data: Omit<EmailCampaign, "id" | "status" | "stats" | "createdAt">
  ): Promise<EmailCampaign> {
    const [row] = await db
      .insert(newsletterCampaigns)
      .values({
        name: data.name,
        subject: data.subject,
        subjectHe: data.subjectHe || null,
        previewText: data.previewText || null,
        previewTextHe: data.previewTextHe || null,
        htmlContent: data.contentHtml,
        htmlContentHe: data.contentHtmlHe || null,
        status: "draft",
        targetTags: data.targetTags || null,
        targetLocales: data.targetLocales || null,
        scheduledAt: data.scheduledAt || null,
      } as any)
      .returning();

    return dbToCampaign(row);
  },

  /**
   * Schedule campaign
   */
  async schedule(campaignId: string, scheduledAt: Date): Promise<EmailCampaign | null> {
    const [existing] = await db
      .select()
      .from(newsletterCampaigns)
      .where(eq(newsletterCampaigns.id, campaignId))
      .limit(1);

    if (!existing || existing.status !== "draft") return null;

    const [updated] = await db
      .update(newsletterCampaigns)
      .set({
        status: "scheduled",
        scheduledAt,
        updatedAt: new Date(),
      } as any)
      .where(eq(newsletterCampaigns.id, campaignId))
      .returning();

    return dbToCampaign(updated);
  },

  /**
   * Send campaign immediately
   */
  async sendNow(campaignId: string): Promise<{
    success: boolean;
    recipientCount: number;
  }> {
    const [existing] = await db
      .select()
      .from(newsletterCampaigns)
      .where(eq(newsletterCampaigns.id, campaignId))
      .limit(1);

    if (!existing || !["draft", "scheduled"].includes(existing.status)) {
      return { success: false, recipientCount: 0 };
    }

    // Mark as sending
    await db
      .update(newsletterCampaigns)
      .set({ status: "sending", updatedAt: new Date() } as any)
      .where(eq(newsletterCampaigns.id, campaignId));

    const campaign = dbToCampaign(existing);

    // Get target subscribers
    const targetSubscribers = await subscribers.getActive({
      tags: campaign.targetTags,
      locale: campaign.targetLocales?.[0],
    });

    // In production, queue emails for sending
    let sentCount = 0;
    for (const subscriber of targetSubscribers) {
      // Record sent event
      await db.insert(campaignEvents).values({
        campaignId,
        subscriberId: subscriber.id,
        eventType: "sent",
      } as any);
      sentCount++;
    }

    // Mark as sent
    await db
      .update(newsletterCampaigns)
      .set({
        status: "sent",
        sentAt: new Date(),
        totalSent: sentCount,
        totalRecipients: targetSubscribers.length,
        updatedAt: new Date(),
      } as any)
      .where(eq(newsletterCampaigns.id, campaignId));

    return {
      success: true,
      recipientCount: targetSubscribers.length,
    };
  },

  /**
   * Track email open
   */
  async trackOpen(campaignId: string, subscriberId: string): Promise<void> {
    // Record open event
    await db.insert(campaignEvents).values({
      campaignId,
      subscriberId,
      eventType: "opened",
    } as any);

    // Increment campaign open count
    await db
      .update(newsletterCampaigns)
      .set({
        totalOpened: sql`${newsletterCampaigns.totalOpened} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(newsletterCampaigns.id, campaignId));

    // Increment subscriber open count
    await db
      .update(newsletterSubscribers)
      .set({
        emailsOpened: sql`${newsletterSubscribers.emailsOpened} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(newsletterSubscribers.id, subscriberId));
  },

  /**
   * Track link click
   */
  async trackClick(campaignId: string, subscriberId: string, url: string): Promise<void> {
    // Record click event
    await db.insert(campaignEvents).values({
      campaignId,
      subscriberId,
      eventType: "clicked",
      metadata: { url },
    } as any);

    // Increment campaign click count
    await db
      .update(newsletterCampaigns)
      .set({
        totalClicked: sql`${newsletterCampaigns.totalClicked} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(newsletterCampaigns.id, campaignId));

    // Increment subscriber click count
    await db
      .update(newsletterSubscribers)
      .set({
        emailsClicked: sql`${newsletterSubscribers.emailsClicked} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(newsletterSubscribers.id, subscriberId));
  },

  /**
   * Get campaign analytics
   */
  async getAnalytics(campaignId: string): Promise<{
    campaign: EmailCampaign | null;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
  } | null> {
    const [row] = await db
      .select()
      .from(newsletterCampaigns)
      .where(eq(newsletterCampaigns.id, campaignId))
      .limit(1);

    if (!row) return null;

    const campaign = dbToCampaign(row);
    const sent = campaign.stats.sent || 1;

    return {
      campaign,
      openRate: Math.round((campaign.stats.opened / sent) * 100),
      clickRate: Math.round((campaign.stats.clicked / sent) * 100),
      bounceRate: Math.round((campaign.stats.bounced / sent) * 100),
      unsubscribeRate: Math.round((campaign.stats.unsubscribed / sent) * 100),
    };
  },

  /**
   * Generate newsletter from recent content
   */
  async generateFromContent(options: {
    days: number;
    contentTypes?: string[];
    limit?: number;
  }): Promise<{
    subject: string;
    subjectHe: string;
    contentHtml: string;
    contentHtmlHe: string;
    contentCount: number;
  }> {
    const cutoff = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000);

    let query = db
      .select()
      .from(contents)
      .where(and(eq(contents.status, "published"), gte(contents.publishedAt as any, cutoff)))
      .orderBy(desc(contents.publishedAt))
      .limit(options.limit || 5);

    const recentContent = await query;

    // Generate HTML
    const contentHtml = `
      <h1>This Week's Best from Dubai</h1>
      ${recentContent
        .map(
          c => `
        <div style="margin-bottom: 20px;">
          <h2><a href="/${c.type}/${c.slug}">${c.title}</a></h2>
          <p>${c.metaDescription || ""}</p>
        </div>
      `
        )
        .join("")}
    `;

    const contentHtmlHe = ``;

    return {
      subject: `${recentContent.length} New Dubai Discoveries This Week`,
      subjectHe: ``,
      contentHtml,
      contentHtmlHe,
      contentCount: recentContent.length,
    };
  },
};

// ============================================================================
// AUTOMATED SEQUENCES
// ============================================================================

// Default sequences to seed database
const defaultSequences: Array<{
  id: string;
  name: string;
  trigger: "signup" | "tag_added" | "inactivity" | "custom";
  triggerValue?: string;
  emails: SequenceEmail[];
  isActive: boolean;
}> = [
  {
    id: "welcome",
    name: "Welcome Sequence",
    trigger: "signup",
    emails: [
      {
        delayDays: 0,
        subject: "Welcome to Travi - Your Dubai Guide!",
        subjectHe: "",
        contentHtml: `<h1>Welcome!</h1><p>Thank you for joining...</p>`,
        contentHtmlHe: ``,
      },
      {
        delayDays: 3,
        subject: "Top 10 Dubai Must-Sees",
        subjectHe: "",
        contentHtml: `<h1>Don't Miss These!</h1>...`,
        contentHtmlHe: ``,
      },
      {
        delayDays: 7,
        subject: "Insider Tips: Save Money in Dubai",
        subjectHe: "",
        contentHtml: `<h1>Budget Travel Tips</h1>...`,
        contentHtmlHe: ``,
      },
    ],
    isActive: true,
  },
  {
    id: "hotel-interest",
    name: "Hotel Interest Sequence",
    trigger: "tag_added",
    triggerValue: "interested_hotels",
    emails: [
      {
        delayDays: 1,
        subject: "Best Hotels for Your Dubai Trip",
        subjectHe: "",
        contentHtml: `<h1>Hotel Recommendations</h1>...`,
        contentHtmlHe: ``,
      },
    ],
    isActive: true,
  },
];

// Seed default sequences on startup
async function seedDefaultSequences(): Promise<void> {
  for (const seq of defaultSequences) {
    const [existing] = await db
      .select()
      .from(automatedSequences)
      .where(eq(automatedSequences.id, seq.id))
      .limit(1);

    if (!existing) {
      await db.insert(automatedSequences).values({
        id: seq.id,
        name: seq.name,
        trigger: seq.trigger,
        triggerValue: seq.triggerValue || null,
        emails: seq.emails,
        isActive: seq.isActive,
      } as any);
    }
  }
}

// Seed on module load (non-blocking)
seedDefaultSequences().catch(err => {
  console.error("Newsletter sequence seeding error:", err);
});

// Helper to convert DB row to AutomatedSequence type
function dbToSequence(row: typeof automatedSequences.$inferSelect): AutomatedSequence {
  return {
    id: row.id,
    name: row.name,
    trigger: row.trigger,
    triggerValue: row.triggerValue || undefined,
    emails: row.emails,
    isActive: row.isActive,
  };
}

export const automatedSequencesObj = {
  /**
   * Trigger sequence for subscriber
   */
  async triggerForSubscriber(
    subscriberId: string,
    trigger: AutomatedSequence["trigger"],
    triggerValue?: string
  ): Promise<void> {
    // Check subscriber is active
    const [subscriber] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.id, subscriberId))
      .limit(1);

    if (!subscriber || subscriber.status !== "subscribed") return;

    // Find matching sequences
    const allSequences = await db
      .select()
      .from(automatedSequences)
      .where(eq(automatedSequences.isActive, true));

    const matchingSequences = allSequences.filter(seq => {
      if (seq.trigger !== trigger) return false;
      if (seq.triggerValue && seq.triggerValue !== triggerValue) return false;
      return true;
    });

    for (const sequence of matchingSequences) {
      // In production, queue sequence emails with delays
    }
  },

  /**
   * Get all sequences
   */
  async getAll(): Promise<AutomatedSequence[]> {
    const rows = await db.select().from(automatedSequences);
    return rows.map(dbToSequence);
  },

  /**
   * Update sequence
   */
  async update(id: string, updates: Partial<AutomatedSequence>): Promise<AutomatedSequence | null> {
    const [existing] = await db
      .select()
      .from(automatedSequences)
      .where(eq(automatedSequences.id, id))
      .limit(1);

    if (!existing) return null;

    const [updated] = await db
      .update(automatedSequences)
      .set({
        ...updates,
        updatedAt: new Date(),
      } as any)
      .where(eq(automatedSequences.id, id))
      .returning();

    return dbToSequence(updated);
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const newsletter = {
  subscribers,
  campaigns,
  sequences: automatedSequencesObj,
};

export default newsletter;

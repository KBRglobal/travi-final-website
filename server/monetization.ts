/**
 * Monetization Module
 *
 * - Premium content (paid articles/itineraries)
 * - Business listings (restaurants/stores pay for exposure)
 * - Lead generation dashboard (hotels/tours see their leads)
 */

import { db } from "./db";
import {
  contents,
  premiumContent as premiumContentTable,
  contentPurchases,
  businessListings as businessListingsTable,
  leads as leadsTable,
  type BusinessListing as BusinessListingRow,
  type Lead as LeadRow,
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

// Premium Content
export interface PremiumContent {
  contentId: string;
  isPremium: boolean;
  previewPercentage: number; // How much of content is free
  price: number; // In cents
  currency: string;
  accessType: "one-time" | "subscription";
  subscriptionTier?: string;
}

export interface ContentPurchase {
  id: string;
  userId: string;
  contentId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentId?: string;
  status: "pending" | "completed" | "refunded";
  createdAt: Date;
  expiresAt?: Date;
}

// Business Listings
export interface BusinessListing {
  id: string;
  businessName: string;
  businessType: "restaurant" | "hotel" | "tour" | "shop" | "service";
  contactEmail: string;
  contactPhone?: string;
  website?: string;

  // Linked content
  contentIds: string[];

  // Subscription
  tier: "basic" | "premium" | "enterprise";
  status: "active" | "pending" | "expired" | "cancelled";
  features: string[];
  monthlyPrice: number;
  startDate: Date;
  endDate?: Date;

  // Stats
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;

  // Settings
  settings: {
    showPhone: boolean;
    showEmail: boolean;
    enableLeadForm: boolean;
    enableBookingWidget: boolean;
    featuredPlacement: boolean;
  };

  createdAt: Date;
}

// Lead Generation
export interface Lead {
  id: string;
  businessId: string;
  contentId: string;
  type: "inquiry" | "booking_request" | "quote_request" | "contact";

  // Contact info
  name: string;
  email: string;
  phone?: string;

  // Details
  message?: string;
  checkIn?: Date;
  checkOut?: Date;
  guests?: number;
  budget?: string;

  // Tracking
  source: string;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  notes?: string;

  createdAt: Date;
  updatedAt?: Date;
}

// ============================================================================
// PREMIUM CONTENT (Database-backed)
// ============================================================================

export const premiumContent = {
  /**
   * Mark content as premium (persisted to DB)
   */
  async setPremium(
    contentId: string,
    options: Omit<PremiumContent, "contentId">
  ): Promise<PremiumContent> {
    const [result] = await db
      .insert(premiumContentTable)
      .values({
        contentId,
        isPremium: options.isPremium,
        previewPercentage: options.previewPercentage,
        price: options.price,
        currency: options.currency,
        accessType: options.accessType,
        subscriptionTier: options.subscriptionTier,
      } as any)
      .onConflictDoUpdate({
        target: premiumContentTable.contentId,
        set: {
          isPremium: options.isPremium,
          previewPercentage: options.previewPercentage,
          price: options.price,
          currency: options.currency,
          accessType: options.accessType,
          subscriptionTier: options.subscriptionTier,
          updatedAt: new Date(),
        } as any,
      })
      .returning();

    return {
      contentId: result.contentId,
      isPremium: result.isPremium,
      previewPercentage: result.previewPercentage,
      price: result.price,
      currency: result.currency,
      accessType: result.accessType,
      subscriptionTier: result.subscriptionTier || undefined,
    };
  },

  /**
   * Check if content is premium
   */
  async isPremium(contentId: string): Promise<PremiumContent | null> {
    const [result] = await db
      .select()
      .from(premiumContentTable)
      .where(eq(premiumContentTable.contentId, contentId));

    if (!result) return null;

    return {
      contentId: result.contentId,
      isPremium: result.isPremium,
      previewPercentage: result.previewPercentage,
      price: result.price,
      currency: result.currency,
      accessType: result.accessType,
      subscriptionTier: result.subscriptionTier || undefined,
    };
  },

  /**
   * Check if user has access to premium content
   */
  async hasAccess(userId: string, contentId: string): Promise<boolean> {
    const premium = await this.isPremium(contentId);
    if (!premium?.isPremium) return true;

    // Check for purchase in database
    const [purchase] = await db
      .select()
      .from(contentPurchases)
      .where(
        and(
          eq(contentPurchases.userId, userId),
          eq(contentPurchases.contentId, contentId),
          eq(contentPurchases.status, "completed")
        )
      )
      .limit(1);

    if (purchase) {
      // Check if expired
      if (!purchase.expiresAt || purchase.expiresAt > new Date()) {
        return true;
      }
    }

    return false;
  },

  /**
   * Purchase content (persisted to DB)
   */
  async purchase(
    userId: string,
    contentId: string,
    paymentDetails: {
      paymentMethod: string;
      paymentId?: string;
    }
  ): Promise<ContentPurchase> {
    const premium = await this.isPremium(contentId);
    if (!premium) throw new Error("Content not found");

    const expiresAt =
      premium.accessType === "subscription"
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : null;

    const [purchase] = await db
      .insert(contentPurchases)
      .values({
        userId,
        contentId,
        amount: premium.price,
        currency: premium.currency,
        paymentMethod: paymentDetails.paymentMethod,
        paymentId: paymentDetails.paymentId,
        status: "completed",
        expiresAt,
      } as any)
      .returning();

    return {
      id: purchase.id,
      userId: purchase.userId,
      contentId: purchase.contentId,
      amount: purchase.amount,
      currency: purchase.currency,
      paymentMethod: purchase.paymentMethod,
      paymentId: purchase.paymentId || undefined,
      status: purchase.status,
      createdAt: purchase.createdAt,
      expiresAt: purchase.expiresAt || undefined,
    };
  },

  /**
   * Get user's purchases
   */
  async getUserPurchases(userId: string): Promise<ContentPurchase[]> {
    const purchases = await db
      .select()
      .from(contentPurchases)
      .where(eq(contentPurchases.userId, userId))
      .orderBy(desc(contentPurchases.createdAt));

    return purchases.map(p => ({
      id: p.id,
      userId: p.userId,
      contentId: p.contentId,
      amount: p.amount,
      currency: p.currency,
      paymentMethod: p.paymentMethod,
      paymentId: p.paymentId || undefined,
      status: p.status,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt || undefined,
    }));
  },

  /**
   * Get premium content preview
   */
  async getPreview(contentId: string): Promise<{
    content: any;
    isPremium: boolean;
    previewPercentage: number;
    price: number;
    currency: string;
  }> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content)
      return { content: null, isPremium: false, previewPercentage: 100, price: 0, currency: "USD" };

    const premium = await this.isPremium(contentId);

    if (!premium?.isPremium) {
      return {
        content,
        isPremium: false,
        previewPercentage: 100,
        price: 0,
        currency: "USD",
      };
    }

    // Limit content blocks for preview
    const blocks = (content.blocks as any[]) || [];
    const previewBlocks = Math.ceil(blocks.length * (premium.previewPercentage / 100));

    return {
      content: {
        ...content,
        blocks: blocks.slice(0, previewBlocks),
        isPreview: true,
        totalBlocks: blocks.length,
        previewBlocks,
      },
      isPremium: true,
      previewPercentage: premium.previewPercentage,
      price: premium.price,
      currency: premium.currency,
    };
  },

  /**
   * Get premium content stats
   */
  async getStats(): Promise<{
    totalPremiumContent: number;
    totalRevenue: number;
    totalPurchases: number;
    topContent: Array<{ contentId: string; title: string; purchases: number; revenue: number }>;
  }> {
    // Count premium content
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(premiumContentTable)
      .where(eq(premiumContentTable.isPremium, true));

    // Get all completed purchases
    const allPurchases = await db
      .select()
      .from(contentPurchases)
      .where(eq(contentPurchases.status, "completed"));

    const totalRevenue = allPurchases.reduce((sum, p) => sum + p.amount, 0);

    // Group by content
    const byContent: Record<string, { purchases: number; revenue: number }> = {};
    for (const p of allPurchases) {
      if (!byContent[p.contentId]) {
        byContent[p.contentId] = { purchases: 0, revenue: 0 };
      }
      byContent[p.contentId].purchases++;
      byContent[p.contentId].revenue += p.amount;
    }

    const topContent = await Promise.all(
      Object.entries(byContent)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(async ([contentId, stats]) => {
          const [content] = await db
            .select({ title: contents.title })
            .from(contents)
            .where(eq(contents.id, contentId));
          return {
            contentId,
            title: content?.title || "Unknown",
            ...stats,
          };
        })
    );

    return {
      totalPremiumContent: countResult?.count || 0,
      totalRevenue,
      totalPurchases: allPurchases.length,
      topContent,
    };
  },
};

// ============================================================================
// BUSINESS LISTINGS
// ============================================================================

const businessTiers = {
  basic: {
    name: "Basic",
    monthlyPrice: 4900, // $49
    features: ["Business profile page", "Link to website", "Basic analytics"],
  },
  premium: {
    name: "Premium",
    monthlyPrice: 14900, // $149
    features: [
      "Everything in Basic",
      "Featured placement in listings",
      "Lead capture form",
      "Contact info visibility",
      "Priority support",
    ],
  },
  enterprise: {
    name: "Enterprise",
    monthlyPrice: 49900, // $499
    features: [
      "Everything in Premium",
      "Booking widget integration",
      "Custom branding",
      "API access",
      "Dedicated account manager",
      "Monthly reports",
    ],
  },
};

export const businessListings = {
  /**
   * Create business listing (persisted to DB)
   */
  async create(
    data: Omit<
      BusinessListing,
      "id" | "impressions" | "clicks" | "leads" | "conversions" | "createdAt"
    >
  ): Promise<BusinessListing> {
    const [listing] = await db
      .insert(businessListingsTable)
      .values({
        businessName: data.businessName,
        businessType: data.businessType,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        website: data.website,
        contentIds: data.contentIds,
        tier: data.tier,
        status: data.status,
        features: data.features,
        monthlyPrice: data.monthlyPrice,
        startDate: data.startDate,
        endDate: data.endDate,
        settings: data.settings,
      } as any)
      .returning();

    return this.mapToBusinessListing(listing);
  },

  /**
   * Update listing (persisted to DB)
   */
  async update(id: string, updates: Partial<BusinessListing>): Promise<BusinessListing | null> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.businessName) updateData.businessName = updates.businessName;
    if (updates.businessType) updateData.businessType = updates.businessType;
    if (updates.contactEmail) updateData.contactEmail = updates.contactEmail;
    if (updates.contactPhone !== undefined) updateData.contactPhone = updates.contactPhone;
    if (updates.website !== undefined) updateData.website = updates.website;
    if (updates.contentIds) updateData.contentIds = updates.contentIds;
    if (updates.tier) updateData.tier = updates.tier;
    if (updates.status) updateData.status = updates.status;
    if (updates.features) updateData.features = updates.features;
    if (updates.monthlyPrice !== undefined) updateData.monthlyPrice = updates.monthlyPrice;
    if (updates.endDate !== undefined) updateData.endDate = updates.endDate;
    if (updates.settings) updateData.settings = updates.settings;

    const [listing] = await db
      .update(businessListingsTable)
      .set(updateData)
      .where(eq(businessListingsTable.id, id))
      .returning();

    if (!listing) return null;
    return this.mapToBusinessListing(listing);
  },

  /**
   * Get listing by ID
   */
  async get(id: string): Promise<BusinessListing | null> {
    const [listing] = await db
      .select()
      .from(businessListingsTable)
      .where(eq(businessListingsTable.id, id));

    if (!listing) return null;
    return this.mapToBusinessListing(listing);
  },

  /**
   * Get listings by content
   */
  async getByContent(contentId: string): Promise<BusinessListing[]> {
    const listings = await db
      .select()
      .from(businessListingsTable)
      .where(eq(businessListingsTable.status, "active"));

    return listings
      .filter(l => (l.contentIds || []).includes(contentId))
      .map(l => this.mapToBusinessListing(l));
  },

  /**
   * Track impression (persisted to DB)
   */
  async trackImpression(listingId: string): Promise<void> {
    await db
      .update(businessListingsTable)
      .set({ impressions: sql`${businessListingsTable.impressions} + 1` } as any)
      .where(eq(businessListingsTable.id, listingId));
  },

  /**
   * Track click (persisted to DB)
   */
  async trackClick(listingId: string): Promise<void> {
    await db
      .update(businessListingsTable)
      .set({ clicks: sql`${businessListingsTable.clicks} + 1` } as any)
      .where(eq(businessListingsTable.id, listingId));
  },

  /**
   * Get pricing tiers
   */
  getTiers(): typeof businessTiers {
    return businessTiers;
  },

  /**
   * Get listing analytics
   */
  async getAnalytics(listingId: string): Promise<{
    listing: BusinessListing | null;
    ctr: number;
    leadConversionRate: number;
    leads: Lead[];
    impressionsByDay: Array<{ date: string; count: number }>;
  } | null> {
    const listing = await this.get(listingId);
    if (!listing) return null;

    const dbLeads = await db
      .select()
      .from(leadsTable)
      .where(eq(leadsTable.businessId, listingId))
      .orderBy(desc(leadsTable.createdAt));

    const leads = dbLeads.map(l => mapToLead(l));

    return {
      listing,
      ctr: listing.impressions > 0 ? Math.round((listing.clicks / listing.impressions) * 100) : 0,
      leadConversionRate:
        listing.leads > 0 ? Math.round((listing.conversions / listing.leads) * 100) : 0,
      leads,
      impressionsByDay: [], // Would aggregate from event tracking
    };
  },

  /**
   * Get all active listings
   */
  async getActive(filters?: { businessType?: string; tier?: string }): Promise<BusinessListing[]> {
    const conditions = [eq(businessListingsTable.status, "active")];

    if (filters?.businessType) {
      conditions.push(eq(businessListingsTable.businessType, filters.businessType as any));
    }
    if (filters?.tier) {
      conditions.push(eq(businessListingsTable.tier, filters.tier as any));
    }

    const listings = await db
      .select()
      .from(businessListingsTable)
      .where(and(...conditions));

    return listings.map(l => this.mapToBusinessListing(l));
  },

  /**
   * Helper to map DB row to BusinessListing interface
   */
  mapToBusinessListing(row: BusinessListingRow): BusinessListing {
    return {
      id: row.id,
      businessName: row.businessName,
      businessType: row.businessType,
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone || undefined,
      website: row.website || undefined,
      contentIds: row.contentIds || [],
      tier: row.tier,
      status: row.status,
      features: row.features || [],
      monthlyPrice: row.monthlyPrice,
      startDate: row.startDate,
      endDate: row.endDate || undefined,
      impressions: row.impressions,
      clicks: row.clicks,
      leads: row.leads,
      conversions: row.conversions,
      settings: row.settings || {
        showPhone: true,
        showEmail: true,
        enableLeadForm: true,
        enableBookingWidget: false,
        featuredPlacement: false,
      },
      createdAt: row.createdAt!,
    };
  },
};

// Helper function to map DB lead to Lead interface
function mapToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    businessId: row.businessId,
    contentId: row.contentId,
    type: row.type,
    name: row.name,
    email: row.email,
    phone: row.phone || undefined,
    message: row.message || undefined,
    checkIn: row.checkIn || undefined,
    checkOut: row.checkOut || undefined,
    guests: row.guests || undefined,
    budget: row.budget || undefined,
    source: row.source,
    status: row.status,
    notes: row.notes || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt || undefined,
  };
}

// ============================================================================
// LEAD GENERATION
// ============================================================================

export const leadGeneration = {
  /**
   * Submit lead (persisted to DB)
   */
  async submit(data: Omit<Lead, "id" | "status" | "createdAt">): Promise<Lead> {
    const [lead] = await db
      .insert(leadsTable)
      .values({
        businessId: data.businessId,
        contentId: data.contentId,
        type: data.type,
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        guests: data.guests,
        budget: data.budget,
        source: data.source,
        status: "new",
      } as any)
      .returning();

    // Update business lead count
    await db
      .update(businessListingsTable)
      .set({ leads: sql`${businessListingsTable.leads} + 1` } as any)
      .where(eq(businessListingsTable.id, data.businessId));

    return mapToLead(lead);
  },

  /**
   * Get leads for business
   */
  async getForBusiness(
    businessId: string,
    filters?: {
      status?: Lead["status"];
      type?: Lead["type"];
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Lead[]> {
    const conditions = [eq(leadsTable.businessId, businessId)];

    if (filters?.status) {
      conditions.push(eq(leadsTable.status, filters.status));
    }
    if (filters?.type) {
      conditions.push(eq(leadsTable.type, filters.type));
    }
    if (filters?.startDate) {
      conditions.push(gte(leadsTable.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(leadsTable.createdAt, filters.endDate));
    }

    const dbLeads = await db
      .select()
      .from(leadsTable)
      .where(and(...conditions))
      .orderBy(desc(leadsTable.createdAt));

    return dbLeads.map(l => mapToLead(l));
  },

  /**
   * Update lead status (persisted to DB)
   */
  async updateStatus(leadId: string, status: Lead["status"], notes?: string): Promise<Lead | null> {
    // Get current lead to check previous status
    const [currentLead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));

    if (!currentLead) return null;

    const wasNew = currentLead.status === "new";

    // Update lead
    const [updatedLead] = await db
      .update(leadsTable)
      .set({
        status,
        notes,
        updatedAt: new Date(),
      } as any)
      .where(eq(leadsTable.id, leadId))
      .returning();

    // Track conversion
    if (status === "converted" && wasNew) {
      await db
        .update(businessListingsTable)
        .set({ conversions: sql`${businessListingsTable.conversions} + 1` } as any)
        .where(eq(businessListingsTable.id, currentLead.businessId));
    }

    return mapToLead(updatedLead);
  },

  /**
   * Get lead dashboard for business
   */
  async getDashboard(businessId: string): Promise<{
    summary: {
      total: number;
      new: number;
      contacted: number;
      qualified: number;
      converted: number;
      lost: number;
      conversionRate: number;
    };
    recentLeads: Lead[];
    byType: Record<string, number>;
    bySource: Record<string, number>;
    trend: Array<{ date: string; leads: number }>;
  }> {
    const leads = await this.getForBusiness(businessId);

    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const statusCounts: Record<string, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      lost: 0,
    };

    for (const lead of leads) {
      byType[lead.type] = (byType[lead.type] || 0) + 1;
      bySource[lead.source] = (bySource[lead.source] || 0) + 1;
      statusCounts[lead.status]++;
    }

    const total = leads.length;
    const conversionRate = total > 0 ? Math.round((statusCounts.converted / total) * 100) : 0;

    return {
      summary: {
        total,
        new: statusCounts.new,
        contacted: statusCounts.contacted,
        qualified: statusCounts.qualified,
        converted: statusCounts.converted,
        lost: statusCounts.lost,
        conversionRate,
      },
      recentLeads: leads.slice(0, 10),
      byType,
      bySource,
      trend: [], // Would aggregate by date
    };
  },

  /**
   * Export leads as CSV
   */
  async exportCsv(businessId: string): Promise<string> {
    const leads = await this.getForBusiness(businessId);

    const headers = ["Date", "Type", "Name", "Email", "Phone", "Message", "Status"];
    const rows = leads.map(l => [
      l.createdAt.toISOString(),
      l.type,
      l.name,
      l.email,
      l.phone || "",
      (l.message || "").replaceAll('"', '""'),
      l.status,
    ]);

    return [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
  },
};

// ============================================================================
// REVENUE DASHBOARD
// ============================================================================

export const revenueDashboard = {
  /**
   * Get overall revenue stats (from database)
   */
  async getStats(): Promise<{
    totalRevenue: number;
    premiumContentRevenue: number;
    businessListingRevenue: number;
    affiliateRevenue: number;
    byMonth: Array<{ month: string; revenue: number }>;
    topSources: Array<{ source: string; revenue: number; percentage: number }>;
  }> {
    // Premium content revenue from database
    const [purchaseSum] = await db
      .select({ total: sql<number>`COALESCE(SUM(${contentPurchases.amount}), 0)::int` })
      .from(contentPurchases)
      .where(eq(contentPurchases.status, "completed"));
    const premiumRevenue = purchaseSum?.total || 0;

    // Business listing revenue (monthly price of active listings)
    const [listingSum] = await db
      .select({ total: sql<number>`COALESCE(SUM(${businessListingsTable.monthlyPrice}), 0)::int` })
      .from(businessListingsTable)
      .where(eq(businessListingsTable.status, "active"));
    const listingRevenue = listingSum?.total || 0;

    // Affiliate revenue would come from affiliate tracking system
    const affiliateRevenue = 0;

    const totalRevenue = premiumRevenue + listingRevenue + affiliateRevenue;

    return {
      totalRevenue,
      premiumContentRevenue: premiumRevenue,
      businessListingRevenue: listingRevenue,
      affiliateRevenue,
      byMonth: [], // Would aggregate by month
      topSources: [
        {
          source: "Premium Content",
          revenue: premiumRevenue,
          percentage: totalRevenue > 0 ? Math.round((premiumRevenue / totalRevenue) * 100) : 0,
        },
        {
          source: "Business Listings",
          revenue: listingRevenue,
          percentage: totalRevenue > 0 ? Math.round((listingRevenue / totalRevenue) * 100) : 0,
        },
        {
          source: "Affiliates",
          revenue: affiliateRevenue,
          percentage: totalRevenue > 0 ? Math.round((affiliateRevenue / totalRevenue) * 100) : 0,
        },
      ],
    };
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const monetization = {
  premium: premiumContent,
  listings: businessListings,
  leads: leadGeneration,
  revenue: revenueDashboard,
};

export default monetization;

/**
 * Partner Dashboard
 * 
 * Provides analytics and management tools for affiliate partners
 * - Performance metrics
 * - Click/conversion tracking
 * - Earnings reports
 * - Link management
 */

import { db } from "../db";
import { partners, payouts } from "@shared/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { commissionCalculator } from "./commission-calculator";

export interface PartnerMetrics {
  partnerId: string;
  name: string;
  status: string;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalEarnings: number;
  averageCommission: number;
  lastPayout: {
    amount: number;
    date: Date | null;
  };
  currentPeriod: {
    clicks: number;
    conversions: number;
    earnings: number;
  };
}

export interface PerformanceTrend {
  date: string;
  clicks: number;
  conversions: number;
  earnings: number;
}

export interface TopPerformer {
  partnerId: string;
  name: string;
  metric: string;
  value: number;
}

export const partnerDashboard = {
  /**
   * Get comprehensive metrics for a partner
   */
  async getPartnerMetrics(partnerId: string): Promise<PartnerMetrics | null> {
    try {
      // Fetch partner data
      const partner = await db
        .select()
        .from(partners)
        .where(eq(partners.id, partnerId))
        .limit(1);

      if (partner.length === 0) {
        return null;
      }

      const partnerData = partner[0];

      // Calculate conversion rate
      const conversionRate = partnerData.totalClicks > 0
        ? (partnerData.totalConversions / partnerData.totalClicks) * 100
        : 0;

      // Calculate average commission
      const averageCommission = partnerData.totalConversions > 0
        ? partnerData.totalEarnings / partnerData.totalConversions
        : 0;

      // Get last payout
      const lastPayouts = await db
        .select()
        .from(payouts)
        .where(
          and(
            eq(payouts.partnerId, partnerId),
            eq(payouts.status, "completed")
          )
        )
        .orderBy(desc(payouts.processedAt))
        .limit(1);

      const lastPayout = lastPayouts.length > 0
        ? {
            amount: lastPayouts[0].amount,
            date: lastPayouts[0].processedAt,
          }
        : {
            amount: 0,
            date: null,
          };

      // Current period stats (this month)
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const calculation = await commissionCalculator.calculateCommission(
        partnerId,
        monthStart,
        now
      );

      return {
        partnerId,
        name: partnerData.name,
        status: partnerData.status,
        totalClicks: partnerData.totalClicks || 0,
        totalConversions: partnerData.totalConversions || 0,
        conversionRate,
        totalEarnings: partnerData.totalEarnings || 0,
        averageCommission,
        lastPayout,
        currentPeriod: {
          clicks: calculation.breakdown.clicks,
          conversions: calculation.breakdown.conversions,
          earnings: calculation.totalCommission,
        },
      };
    } catch (error) {
      console.error("[Partner Dashboard] Error getting partner metrics:", error);
      return null;
    }
  },

  /**
   * Get performance trend over time
   */
  async getPerformanceTrend(
    partnerId: string,
    days: number = 30
  ): Promise<PerformanceTrend[]> {
    try {
      // This is a simplified version
      // In production, you'd want to store daily/hourly metrics in a separate table
      const trends: PerformanceTrend[] = [];

      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        trends.push({
          date: date.toISOString().split('T')[0],
          clicks: Math.floor(Math.random() * 100), // Mock data
          conversions: Math.floor(Math.random() * 20), // Mock data
          earnings: Math.floor(Math.random() * 1000), // Mock data
        });
      }

      return trends;
    } catch (error) {
      console.error("[Partner Dashboard] Error getting performance trend:", error);
      return [];
    }
  },

  /**
   * Get all partners ranked by performance
   */
  async getTopPerformers(metric: "clicks" | "conversions" | "earnings" = "earnings"): Promise<TopPerformer[]> {
    try {
      const allPartners = await db
        .select()
        .from(partners)
        .where(eq(partners.status, "active"))
        .limit(10);

      const performers: TopPerformer[] = allPartners.map(partner => {
        let value = 0;
        switch (metric) {
          case "clicks":
            value = partner.totalClicks || 0;
            break;
          case "conversions":
            value = partner.totalConversions || 0;
            break;
          case "earnings":
            value = partner.totalEarnings || 0;
            break;
        }

        return {
          partnerId: partner.id,
          name: partner.name,
          metric,
          value,
        };
      });

      // Sort by value descending
      performers.sort((a, b) => b.value - a.value);

      return performers.slice(0, 10);
    } catch (error) {
      console.error("[Partner Dashboard] Error getting top performers:", error);
      return [];
    }
  },

  /**
   * Get payout history for a partner
   */
  async getPayoutHistory(
    partnerId: string,
    limit: number = 10
  ): Promise<Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    method: string;
    periodStart: Date;
    periodEnd: Date;
    processedAt: Date | null;
  }>> {
    try {
      const history = await db
        .select()
        .from(payouts)
        .where(eq(payouts.partnerId, partnerId))
        .orderBy(desc(payouts.createdAt))
        .limit(limit);

      return history.map(payout => ({
        id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        method: payout.method || 'unknown',
        periodStart: payout.periodStart,
        periodEnd: payout.periodEnd,
        processedAt: payout.processedAt,
      }));
    } catch (error) {
      console.error("[Partner Dashboard] Error getting payout history:", error);
      return [];
    }
  },

  /**
   * Generate tracking link for partner
   */
  generateTrackingLink(
    partnerId: string,
    trackingCode: string,
    destinationUrl: string
  ): string {
    const baseUrl = process.env.APP_URL || "https://traviapp.com";
    return `${baseUrl}/track/${trackingCode}?dest=${encodeURIComponent(destinationUrl)}`;
  },

  /**
   * Get partner statistics summary
   */
  async getPartnerStats(partnerId: string): Promise<{
    overview: {
      totalRevenue: number;
      totalClicks: number;
      totalConversions: number;
      conversionRate: number;
    };
    thisMonth: {
      revenue: number;
      clicks: number;
      conversions: number;
    };
    lastMonth: {
      revenue: number;
      clicks: number;
      conversions: number;
    };
  }> {
    try {
      const partner = await db
        .select()
        .from(partners)
        .where(eq(partners.id, partnerId))
        .limit(1);

      if (partner.length === 0) {
        throw new Error("Partner not found");
      }

      const partnerData = partner[0];

      // Calculate this month
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthCalc = await commissionCalculator.calculateCommission(
        partnerId,
        thisMonthStart,
        now
      );

      // Calculate last month
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const lastMonthCalc = await commissionCalculator.calculateCommission(
        partnerId,
        lastMonthStart,
        lastMonthEnd
      );

      return {
        overview: {
          totalRevenue: partnerData.totalEarnings || 0,
          totalClicks: partnerData.totalClicks || 0,
          totalConversions: partnerData.totalConversions || 0,
          conversionRate: partnerData.totalClicks > 0
            ? (partnerData.totalConversions / partnerData.totalClicks) * 100
            : 0,
        },
        thisMonth: {
          revenue: thisMonthCalc.totalCommission,
          clicks: thisMonthCalc.breakdown.clicks,
          conversions: thisMonthCalc.breakdown.conversions,
        },
        lastMonth: {
          revenue: lastMonthCalc.totalCommission,
          clicks: lastMonthCalc.breakdown.clicks,
          conversions: lastMonthCalc.breakdown.conversions,
        },
      };
    } catch (error) {
      console.error("[Partner Dashboard] Error getting partner stats:", error);
      throw error;
    }
  },
};

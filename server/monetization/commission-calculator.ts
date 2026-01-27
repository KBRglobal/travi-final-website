/**
 * Commission Calculator
 *
 * Calculates commissions for affiliate partners
 * - Commission rates by tier
 * - Performance bonuses
 * - Tax calculations
 * - Payment scheduling
 */

import { db } from "../db";
import { partners, payouts } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export interface CommissionCalculation {
  partnerId: string;
  periodStart: Date;
  periodEnd: Date;
  totalSales: number;
  baseCommission: number;
  performanceBonus: number;
  totalCommission: number;
  commissionRate: number;
  breakdown: {
    clicks: number;
    conversions: number;
    conversionRate: number;
    averageOrderValue: number;
  };
}

export interface PaymentSchedule {
  partnerId: string;
  amount: number;
  currency: string;
  dueDate: Date;
  status: "pending" | "scheduled" | "processing" | "completed";
}

export const commissionCalculator = {
  /**
   * Calculate commission for a partner for a given period
   */
  async calculateCommission(
    partnerId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<CommissionCalculation> {
    try {
      // Fetch partner data
      const partner = await db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);

      if (partner.length === 0) {
        throw new Error("Partner not found");
      }

      const partnerData = partner[0];

      // Calculate totals
      const clicks = partnerData.totalClicks || 0;
      const conversions = partnerData.totalConversions || 0;
      const totalSales = partnerData.totalEarnings || 0;

      // Calculate conversion rate
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

      // Calculate average order value
      const averageOrderValue = conversions > 0 ? totalSales / conversions : 0;

      // Base commission (from total earnings)
      const baseCommission = totalSales;

      // Performance bonus (based on conversion rate and volume)
      let performanceBonus = 0;

      // Bonus for high conversion rate (>5%)
      if (conversionRate > 5) {
        performanceBonus += baseCommission * 0.1; // 10% bonus
      }

      // Volume bonus (for high sales)
      if (conversions > 100) {
        performanceBonus += baseCommission * 0.05; // 5% bonus
      } else if (conversions > 50) {
        performanceBonus += baseCommission * 0.025; // 2.5% bonus
      }

      const totalCommission = baseCommission + performanceBonus;

      return {
        partnerId,
        periodStart,
        periodEnd,
        totalSales,
        baseCommission,
        performanceBonus,
        totalCommission,
        commissionRate: partnerData.commissionRate,
        breakdown: {
          clicks,
          conversions,
          conversionRate,
          averageOrderValue,
        },
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Calculate commissions for all partners
   */
  async calculateAllCommissions(
    periodStart: Date,
    periodEnd: Date
  ): Promise<CommissionCalculation[]> {
    try {
      const activePartners = await db.select().from(partners).where(eq(partners.status, "active"));

      const calculations = await Promise.all(
        activePartners.map(partner => this.calculateCommission(partner.id, periodStart, periodEnd))
      );

      return calculations;
    } catch (error) {
      return [];
    }
  },

  /**
   * Create payout for partner
   */
  async createPayout(
    partnerId: string,
    periodStart: Date,
    periodEnd: Date,
    method: string = "bank_transfer"
  ): Promise<string | null> {
    try {
      // Calculate commission
      const calculation = await this.calculateCommission(partnerId, periodStart, periodEnd);

      if (calculation.totalCommission <= 0) {
        throw new Error("No commission to pay out");
      }

      // Minimum payout threshold ($50)
      if (calculation.totalCommission < 5000) {
        throw new Error("Commission below minimum payout threshold");
      }

      // Create payout record
      const payout = await db
        .insert(payouts)
        .values({
          partnerId,
          amount: calculation.totalCommission,
          currency: "USD",
          status: "pending",
          method,
          periodStart,
          periodEnd,
        } as any)
        .returning();

      return payout[0].id;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get pending payouts for a partner
   */
  async getPendingPayouts(partnerId: string): Promise<PaymentSchedule[]> {
    try {
      const pendingPayouts = await db
        .select()
        .from(payouts)
        .where(and(eq(payouts.partnerId, partnerId), eq(payouts.status, "pending")));

      return pendingPayouts.map(payout => ({
        partnerId: payout.partnerId,
        amount: payout.amount,
        currency: payout.currency,
        dueDate: payout.createdAt,
        status: payout.status as "pending" | "scheduled" | "processing" | "completed",
      }));
    } catch (error) {
      return [];
    }
  },

  /**
   * Process payout (mark as completed)
   */
  async processPayout(payoutId: string, referenceId: string): Promise<boolean> {
    try {
      await db
        .update(payouts)
        .set({
          status: "completed",
          referenceId,
          processedAt: new Date(),
        } as any)
        .where(eq(payouts.id, payoutId));

      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get partner earnings summary
   */
  async getEarningsSummary(
    partnerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalEarnings: number;
    paidOut: number;
    pending: number;
    nextPayout: Date | null;
  }> {
    try {
      const partner = await db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);

      if (partner.length === 0) {
        throw new Error("Partner not found");
      }

      // Get all payouts
      let payoutQuery = db.select().from(payouts).where(eq(payouts.partnerId, partnerId));

      if (startDate && endDate) {
        payoutQuery = (payoutQuery as any).where(
          and(gte(payouts.createdAt, startDate), lte(payouts.createdAt, endDate))
        );
      }

      const allPayouts = await payoutQuery;

      const paidOut = allPayouts
        .filter(p => p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0);

      const pending = allPayouts
        .filter(p => p.status === "pending")
        .reduce((sum, p) => sum + p.amount, 0);

      // Next payout date (first day of next month)
      const now = new Date();
      const nextPayout = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      return {
        totalEarnings: partner[0].totalEarnings || 0,
        paidOut,
        pending,
        nextPayout,
      };
    } catch (error) {
      return {
        totalEarnings: 0,
        paidOut: 0,
        pending: 0,
        nextPayout: null,
      };
    }
  },
};

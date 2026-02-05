import {
  eq,
  desc,
  sql,
  db,
  referralCodes,
  referralClicks,
  referrals,
  referralCommissions,
  type ReferralCode,
  type InsertReferralCode,
  type ReferralClick,
  type Referral,
  type InsertReferral,
  type ReferralCommission,
  type InsertReferralCommission,
} from "./base";

export class ReferralsStorage {
  // Referral Codes
  async getReferralCodes(): Promise<ReferralCode[]> {
    return await db.select().from(referralCodes).orderBy(desc(referralCodes.createdAt));
  }

  async getReferralCode(id: string): Promise<ReferralCode | undefined> {
    const [code] = await db.select().from(referralCodes).where(eq(referralCodes.id, id));
    return code;
  }

  async getReferralCodeByCode(code: string): Promise<ReferralCode | undefined> {
    const [result] = await db.select().from(referralCodes).where(eq(referralCodes.code, code));
    return result;
  }

  async getReferralCodesByUser(userId: string): Promise<ReferralCode[]> {
    return await db.select().from(referralCodes).where(eq(referralCodes.userId, userId));
  }

  async createReferralCode(data: InsertReferralCode): Promise<ReferralCode> {
    const [code] = await db
      .insert(referralCodes)
      .values(data as any)
      .returning();
    return code;
  }

  async updateReferralCode(
    id: string,
    data: Partial<InsertReferralCode>
  ): Promise<ReferralCode | undefined> {
    const [code] = await db
      .update(referralCodes)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(referralCodes.id, id))
      .returning();
    return code;
  }

  async deleteReferralCode(id: string): Promise<boolean> {
    await db.delete(referralCodes).where(eq(referralCodes.id, id));
    return true;
  }

  async incrementReferralCodeClicks(id: string): Promise<void> {
    await db
      .update(referralCodes)
      .set({
        totalClicks: sql`${referralCodes.totalClicks} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(referralCodes.id, id));
  }

  async incrementReferralCodeSignups(id: string): Promise<void> {
    await db
      .update(referralCodes)
      .set({
        totalSignups: sql`${referralCodes.totalSignups} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(referralCodes.id, id));
  }

  async incrementReferralCodeConversions(id: string, commissionAmount: number): Promise<void> {
    await db
      .update(referralCodes)
      .set({
        totalConversions: sql`${referralCodes.totalConversions} + 1`,
        totalCommission: sql`${referralCodes.totalCommission} + ${commissionAmount}`,
        updatedAt: new Date(),
      } as any)
      .where(eq(referralCodes.id, id));
  }

  // Referral Clicks
  async createReferralClick(data: {
    referralCodeId: string;
    ipAddress?: string;
    userAgent?: string;
    referer?: string;
    landingPage?: string;
  }): Promise<ReferralClick> {
    const [click] = await db
      .insert(referralClicks)
      .values(data as any)
      .returning();
    return click;
  }

  async getReferralClicksByCode(referralCodeId: string): Promise<ReferralClick[]> {
    return await db
      .select()
      .from(referralClicks)
      .where(eq(referralClicks.referralCodeId, referralCodeId))
      .orderBy(desc(referralClicks.createdAt));
  }

  // Referrals
  async getReferrals(referralCodeId?: string): Promise<Referral[]> {
    if (referralCodeId) {
      return await db
        .select()
        .from(referrals)
        .where(eq(referrals.referralCodeId, referralCodeId))
        .orderBy(desc(referrals.createdAt));
    }
    return await db.select().from(referrals).orderBy(desc(referrals.createdAt));
  }

  async getReferral(id: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(referrals).where(eq(referrals.id, id));
    return referral;
  }

  async getReferralBySubscriber(subscriberId: string): Promise<Referral | undefined> {
    const [referral] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.subscriberId, subscriberId));
    return referral;
  }

  async createReferral(data: InsertReferral): Promise<Referral> {
    const [referral] = await db
      .insert(referrals)
      .values(data as any)
      .returning();
    return referral;
  }

  async updateReferral(
    id: string,
    data: Partial<InsertReferral> & { convertedAt?: Date }
  ): Promise<Referral | undefined> {
    const [referral] = await db
      .update(referrals)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(referrals.id, id))
      .returning();
    return referral;
  }

  // Referral Commissions
  async getCommissions(referralCodeId?: string): Promise<ReferralCommission[]> {
    if (referralCodeId) {
      return await db
        .select()
        .from(referralCommissions)
        .where(eq(referralCommissions.referralCodeId, referralCodeId))
        .orderBy(desc(referralCommissions.createdAt));
    }
    return await db.select().from(referralCommissions).orderBy(desc(referralCommissions.createdAt));
  }

  async getCommission(id: string): Promise<ReferralCommission | undefined> {
    const [commission] = await db
      .select()
      .from(referralCommissions)
      .where(eq(referralCommissions.id, id));
    return commission;
  }

  async createCommission(data: InsertReferralCommission): Promise<ReferralCommission> {
    const [commission] = await db
      .insert(referralCommissions)
      .values(data as any)
      .returning();
    return commission;
  }

  async updateCommission(
    id: string,
    data: Partial<InsertReferralCommission> & { approvedAt?: Date; paidAt?: Date }
  ): Promise<ReferralCommission | undefined> {
    const [commission] = await db
      .update(referralCommissions)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(referralCommissions.id, id))
      .returning();
    return commission;
  }

  // Referral Analytics
  async getReferralStats(): Promise<{
    totalCodes: number;
    activeCodes: number;
    totalClicks: number;
    totalSignups: number;
    totalConversions: number;
    totalCommission: number;
    pendingCommission: number;
  }> {
    const codes = await this.getReferralCodes();
    const commissions = await this.getCommissions();

    const pendingCommission = commissions
      .filter(c => c.status === "pending")
      .reduce((sum, c) => sum + c.amount, 0);

    return {
      totalCodes: codes.length,
      activeCodes: codes.filter(c => c.isActive).length,
      totalClicks: codes.reduce((sum, c) => sum + (c.totalClicks || 0), 0),
      totalSignups: codes.reduce((sum, c) => sum + (c.totalSignups || 0), 0),
      totalConversions: codes.reduce((sum, c) => sum + (c.totalConversions || 0), 0),
      totalCommission: codes.reduce((sum, c) => sum + (c.totalCommission || 0), 0),
      pendingCommission,
    };
  }
}

export const referralsStorage = new ReferralsStorage();

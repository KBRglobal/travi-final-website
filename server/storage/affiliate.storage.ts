import { eq, desc, db, affiliateLinks, type AffiliateLink, type InsertAffiliateLink } from "./base";

export class AffiliateStorage {
  async getAffiliateLinks(contentId?: string): Promise<AffiliateLink[]> {
    if (contentId) {
      return await db.select().from(affiliateLinks).where(eq(affiliateLinks.contentId, contentId));
    }
    return await db.select().from(affiliateLinks).orderBy(desc(affiliateLinks.createdAt));
  }

  async getAffiliateLink(id: string): Promise<AffiliateLink | undefined> {
    const [link] = await db.select().from(affiliateLinks).where(eq(affiliateLinks.id, id));
    return link;
  }

  async createAffiliateLink(insertLink: InsertAffiliateLink): Promise<AffiliateLink> {
    const [link] = await db
      .insert(affiliateLinks)
      .values(insertLink as any)
      .returning();
    return link;
  }

  async updateAffiliateLink(
    id: string,
    updateData: Partial<InsertAffiliateLink>
  ): Promise<AffiliateLink | undefined> {
    const [link] = await db
      .update(affiliateLinks)
      .set(updateData as any)
      .where(eq(affiliateLinks.id, id))
      .returning();
    return link;
  }

  async deleteAffiliateLink(id: string): Promise<boolean> {
    await db.delete(affiliateLinks).where(eq(affiliateLinks.id, id));
    return true;
  }
}

export const affiliateStorage = new AffiliateStorage();

import {
  eq,
  and,
  db,
  homepagePromotions,
  type HomepagePromotion,
  type InsertHomepagePromotion,
  type HomepageSection,
} from "./base";

export class HomepageStorage {
  async getHomepagePromotionsBySection(section: HomepageSection): Promise<HomepagePromotion[]> {
    return await db
      .select()
      .from(homepagePromotions)
      .where(eq(homepagePromotions.section, section))
      .orderBy(homepagePromotions.position);
  }

  async getHomepagePromotion(id: string): Promise<HomepagePromotion | undefined> {
    const [promotion] = await db
      .select()
      .from(homepagePromotions)
      .where(eq(homepagePromotions.id, id));
    return promotion;
  }

  async createHomepagePromotion(
    insertPromotion: InsertHomepagePromotion
  ): Promise<HomepagePromotion> {
    const [promotion] = await db
      .insert(homepagePromotions)
      .values(insertPromotion as any)
      .returning();
    return promotion;
  }

  async updateHomepagePromotion(
    id: string,
    updateData: Partial<InsertHomepagePromotion>
  ): Promise<HomepagePromotion | undefined> {
    const [promotion] = await db
      .update(homepagePromotions)
      .set(updateData as any)
      .where(eq(homepagePromotions.id, id))
      .returning();
    return promotion;
  }

  async deleteHomepagePromotion(id: string): Promise<boolean> {
    await db.delete(homepagePromotions).where(eq(homepagePromotions.id, id));
    return true;
  }

  async reorderHomepagePromotions(
    section: HomepageSection,
    orderedIds: string[]
  ): Promise<boolean> {
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(homepagePromotions)
        .set({ position: i } as any)
        .where(
          and(eq(homepagePromotions.id, orderedIds[i]), eq(homepagePromotions.section, section))
        );
    }
    return true;
  }
}

export const homepageStorage = new HomepageStorage();

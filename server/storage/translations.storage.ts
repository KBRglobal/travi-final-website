import {
  eq,
  and,
  db,
  translations,
  type Translation,
  type InsertTranslation,
  type Locale,
} from "./base";

export class TranslationsStorage {
  async getAllTranslations(): Promise<Translation[]> {
    return await db.select().from(translations);
  }

  async getTranslationsByContentId(contentId: string): Promise<Translation[]> {
    return await db.select().from(translations).where(eq(translations.contentId, contentId));
  }

  async getTranslation(contentId: string, locale: Locale): Promise<Translation | undefined> {
    const [translation] = await db
      .select()
      .from(translations)
      .where(and(eq(translations.contentId, contentId), eq(translations.locale, locale as any)));
    return translation;
  }

  async getTranslationById(id: string): Promise<Translation | undefined> {
    const [translation] = await db.select().from(translations).where(eq(translations.id, id));
    return translation;
  }

  async createTranslation(insertTranslation: InsertTranslation): Promise<Translation> {
    const [translation] = await db
      .insert(translations)
      .values(insertTranslation as any)
      .returning();
    return translation;
  }

  async updateTranslation(
    id: string,
    updateData: Partial<InsertTranslation>
  ): Promise<Translation | undefined> {
    const [translation] = await db
      .update(translations)
      .set({ ...updateData, updatedAt: new Date() } as any)
      .where(eq(translations.id, id))
      .returning();
    return translation;
  }

  async deleteTranslation(id: string): Promise<boolean> {
    await db.delete(translations).where(eq(translations.id, id));
    return true;
  }
}

export const translationsStorage = new TranslationsStorage();

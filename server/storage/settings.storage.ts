import { eq, db, siteSettings, type SiteSetting, type InsertSiteSetting } from "./base";

export class SettingsStorage {
  async getSettings(): Promise<SiteSetting[]> {
    return await db.select().from(siteSettings).orderBy(siteSettings.category, siteSettings.key);
  }

  async getSetting(key: string): Promise<SiteSetting | undefined> {
    const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return setting;
  }

  async upsertSetting(
    key: string,
    value: unknown,
    category: string,
    updatedBy?: string
  ): Promise<SiteSetting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [updated] = await db
        .update(siteSettings)
        .set({ value, category, updatedBy, updatedAt: new Date() } as any)
        .where(eq(siteSettings.key, key))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(siteSettings)
      .values({ key, value, category, updatedBy } as any)
      .returning();
    return created;
  }

  async deleteSetting(key: string): Promise<boolean> {
    const result = await db.delete(siteSettings).where(eq(siteSettings.key, key));
    return (result.rowCount ?? 0) > 0;
  }
}

export const settingsStorage = new SettingsStorage();

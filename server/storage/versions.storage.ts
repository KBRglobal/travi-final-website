import {
  eq,
  desc,
  sql,
  db,
  contentVersions,
  type ContentVersion,
  type InsertContentVersion,
} from "./base";

export class VersionsStorage {
  async getContentVersions(contentId: string): Promise<ContentVersion[]> {
    return await db
      .select()
      .from(contentVersions)
      .where(eq(contentVersions.contentId, contentId))
      .orderBy(desc(contentVersions.versionNumber));
  }

  async getContentVersion(id: string): Promise<ContentVersion | undefined> {
    const [version] = await db.select().from(contentVersions).where(eq(contentVersions.id, id));
    return version;
  }

  async createContentVersion(insertVersion: InsertContentVersion): Promise<ContentVersion> {
    const [version] = await db
      .insert(contentVersions)
      .values(insertVersion as any)
      .returning();
    return version;
  }

  async getLatestVersionNumber(contentId: string): Promise<number> {
    const [result] = await db
      .select({ maxVersion: sql<number>`COALESCE(MAX(${contentVersions.versionNumber}), 0)` })
      .from(contentVersions)
      .where(eq(contentVersions.contentId, contentId));
    return result?.maxVersion ?? 0;
  }
}

export const versionsStorage = new VersionsStorage();

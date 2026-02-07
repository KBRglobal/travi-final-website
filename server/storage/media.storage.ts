import {
  eq,
  desc,
  sql,
  and,
  or,
  db,
  mediaFiles,
  contents,
  internalLinks,
  type MediaFile,
  type InsertMediaFile,
  type InternalLink,
  type InsertInternalLink,
} from "./base";

export class MediaStorage {
  // Media Files
  async getMediaFiles(): Promise<MediaFile[]> {
    return await db.select().from(mediaFiles).orderBy(desc(mediaFiles.createdAt));
  }

  async getMediaFile(id: string): Promise<MediaFile | undefined> {
    const [file] = await db.select().from(mediaFiles).where(eq(mediaFiles.id, id));
    return file;
  }

  async createMediaFile(insertFile: InsertMediaFile): Promise<MediaFile> {
    const [file] = await db
      .insert(mediaFiles)
      .values(insertFile as any)
      .returning();
    return file;
  }

  async updateMediaFile(
    id: string,
    updateData: Partial<InsertMediaFile>
  ): Promise<MediaFile | undefined> {
    const [file] = await db
      .update(mediaFiles)
      .set(updateData as any)
      .where(eq(mediaFiles.id, id))
      .returning();
    return file;
  }

  async deleteMediaFile(id: string): Promise<boolean> {
    await db.delete(mediaFiles).where(eq(mediaFiles.id, id));
    return true;
  }

  // Media Usage Check - Optimized with database-level search
  async checkMediaUsage(
    mediaUrl: string
  ): Promise<{ isUsed: boolean; usedIn: { id: string; title: string; type: string }[] }> {
    // Use database LIKE/ILIKE to search in JSON blocks - avoids full table scan in JS
    // Combine heroImage check and blocks search in single queries
    const likePattern = "%" + mediaUrl + "%";
    const results = await db
      .select({ id: contents.id, title: contents.title, type: contents.type })
      .from(contents)
      .where(
        and(
          sql`${contents.deletedAt} IS NULL`,
          or(eq(contents.heroImage, mediaUrl), sql`${contents.blocks}::text LIKE ${likePattern}`)
        )
      )
      .limit(100); // Limit results to prevent huge responses

    const usedIn = results.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type,
    }));

    return { isUsed: usedIn.length > 0, usedIn };
  }

  // Internal Links
  async getInternalLinks(contentId?: string): Promise<InternalLink[]> {
    if (contentId) {
      return await db
        .select()
        .from(internalLinks)
        .where(eq(internalLinks.sourceContentId, contentId));
    }
    return await db.select().from(internalLinks);
  }

  async createInternalLink(insertLink: InsertInternalLink): Promise<InternalLink> {
    const [link] = await db
      .insert(internalLinks)
      .values(insertLink as any)
      .returning();
    return link;
  }

  async deleteInternalLink(id: string): Promise<boolean> {
    await db.delete(internalLinks).where(eq(internalLinks.id, id));
    return true;
  }
}

export const mediaStorage = new MediaStorage();

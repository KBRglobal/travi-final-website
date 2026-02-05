import {
  eq,
  desc,
  sql,
  and,
  db,
  inArray,
  tags,
  contentTags,
  contents,
  type Tag,
  type InsertTag,
  type ContentTag,
  type InsertContentTag,
  type Content,
} from "./base";

export class TagsStorage {
  // Tags
  async getTags(): Promise<Tag[]> {
    return await db.select().from(tags).orderBy(desc(tags.usageCount), tags.name);
  }

  async getTag(id: string): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }

  async getTagBySlug(slug: string): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.slug, slug));
    return tag;
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const [newTag] = await db
      .insert(tags)
      .values(tag as any)
      .returning();
    return newTag;
  }

  async updateTag(id: string, data: Partial<InsertTag>): Promise<Tag | undefined> {
    const [tag] = await db
      .update(tags)
      .set(data as any)
      .where(eq(tags.id, id))
      .returning();
    return tag;
  }

  async deleteTag(id: string): Promise<boolean> {
    await db.delete(tags).where(eq(tags.id, id));
    return true;
  }

  // Content Tags - Fixed N+1 with batch query
  async getContentTags(contentId: string): Promise<(ContentTag & { tag?: Tag })[]> {
    const cts = await db.select().from(contentTags).where(eq(contentTags.contentId, contentId));

    if (cts.length === 0) return [];

    // Batch fetch all tags at once
    const tagIds = [...new Set(cts.map(ct => ct.tagId))];
    const allTags = await db.select().from(tags).where(inArray(tags.id, tagIds));
    const tagMap = new Map(allTags.map(t => [t.id, t]));

    return cts.map(ct => ({ ...ct, tag: tagMap.get(ct.tagId) }));
  }

  async getTagContents(tagId: string): Promise<(ContentTag & { content?: Content })[]> {
    const cts = await db.select().from(contentTags).where(eq(contentTags.tagId, tagId));

    if (cts.length === 0) return [];

    // Batch fetch all contents at once
    const contentIds = [...new Set(cts.map(ct => ct.contentId))];
    const allContents = await db.select().from(contents).where(inArray(contents.id, contentIds));
    const contentMap = new Map(allContents.map(c => [c.id, c]));

    return cts.map(ct => ({ ...ct, content: contentMap.get(ct.contentId) }));
  }

  async addContentTag(contentTag: InsertContentTag): Promise<ContentTag> {
    const [newCt] = await db
      .insert(contentTags)
      .values(contentTag as any)
      .returning();
    await this.updateTagUsageCount((contentTag as any).tagId);
    return newCt;
  }

  async removeContentTag(contentId: string, tagId: string): Promise<boolean> {
    await db
      .delete(contentTags)
      .where(and(eq(contentTags.contentId, contentId), eq(contentTags.tagId, tagId)));
    await this.updateTagUsageCount(tagId);
    return true;
  }

  async updateTagUsageCount(tagId: string): Promise<void> {
    const count = await db
      .select({ count: sql<number>`count(*)` })
      .from(contentTags)
      .where(eq(contentTags.tagId, tagId));
    await db
      .update(tags)
      .set({ usageCount: Number(count[0]?.count || 0) } as any)
      .where(eq(tags.id, tagId));
  }

  // Bulk Operations for Tags
  async bulkAddTagToContents(contentIds: string[], tagId: string): Promise<number> {
    if (contentIds.length === 0) return 0;

    // Batch check for existing tags
    const existing = await db
      .select({ contentId: contentTags.contentId })
      .from(contentTags)
      .where(and(inArray(contentTags.contentId, contentIds), eq(contentTags.tagId, tagId)));

    const existingSet = new Set(existing.map(e => e.contentId));
    const toAdd = contentIds.filter(id => !existingSet.has(id));

    if (toAdd.length === 0) return 0;

    // Batch insert all new tags at once
    await db.insert(contentTags).values(toAdd.map(contentId => ({ contentId, tagId })));

    await this.updateTagUsageCount(tagId);
    return toAdd.length;
  }

  async bulkRemoveTagFromContents(contentIds: string[], tagId: string): Promise<number> {
    const result = await db
      .delete(contentTags)
      .where(and(inArray(contentTags.contentId, contentIds), eq(contentTags.tagId, tagId)))
      .returning();
    await this.updateTagUsageCount(tagId);
    return result.length;
  }
}

export const tagsStorage = new TagsStorage();

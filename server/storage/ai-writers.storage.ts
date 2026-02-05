import {
  eq,
  desc,
  sql,
  and,
  or,
  db,
  aiWriters,
  contents,
  type AIWriter,
  type InsertAIWriter,
} from "./base";

export class AIWritersStorage {
  async getAllWriters(): Promise<
    {
      id: string;
      name: string;
      slug: string;
      avatar: string;
      nationality: string;
      age: number;
      expertise: string[];
      personality: string;
      writingStyle: string;
      shortBio: string;
      contentTypes: string[];
      languages: string[];
      isActive: boolean;
      articleCount: number;
    }[]
  > {
    // Try to fetch from database first
    const dbWriters = await db.select().from(aiWriters).orderBy(aiWriters.name);

    if (dbWriters.length > 0) {
      // Get article counts by writerId
      const articleCounts = await db
        .select({
          writerId: contents.writerId,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(contents)
        .where(and(sql`${contents.deletedAt} IS NULL`, sql`${contents.writerId} IS NOT NULL`))
        .groupBy(contents.writerId);

      const countMap = new Map(articleCounts.map(a => [a.writerId, a.count || 0]));

      return dbWriters.map(w => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        avatar: w.avatar || "",
        nationality: w.nationality || "",
        age: w.age || 0,
        expertise: w.expertise || [],
        personality: w.personality || "",
        writingStyle: w.writingStyle || "",
        shortBio: w.shortBio || "",
        contentTypes: w.contentTypes || [],
        languages: w.languages || ["en"],
        isActive: w.isActive ?? true,
        articleCount: countMap.get(w.id) || 0,
      }));
    }

    // Fallback to config if database is empty
    const { WRITERS, CATEGORY_LABELS } = await import("@shared/writers.config");
    return WRITERS.map(w => ({
      id: w.id,
      name: w.name,
      slug: w.id,
      avatar: w.avatar,
      nationality: w.nationality,
      age: w.age,
      expertise: w.expertise,
      personality: w.voice.personality,
      writingStyle: w.writingStyle.tone,
      shortBio: w.background.substring(0, 200) + "...",
      contentTypes: [CATEGORY_LABELS[w.category]],
      languages: ["en"],
      isActive: true,
      articleCount: 0,
    }));
  }

  async getWriterStats(): Promise<
    {
      writerId: string;
      name: string;
      totalAssignments: number;
      completed: number;
      isActive: boolean;
    }[]
  > {
    const dbWriters = await db.select().from(aiWriters).orderBy(aiWriters.name);

    // Get article counts by writerId
    const articleCounts = await db
      .select({
        writerId: contents.writerId,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(contents)
      .where(and(sql`${contents.deletedAt} IS NULL`, sql`${contents.writerId} IS NOT NULL`))
      .groupBy(contents.writerId);

    const countMap = new Map(articleCounts.map(a => [a.writerId, a.count || 0]));

    if (dbWriters.length > 0) {
      return dbWriters.map(w => ({
        writerId: w.id,
        name: w.name,
        totalAssignments: countMap.get(w.id) || 0,
        completed: countMap.get(w.id) || 0,
        isActive: w.isActive ?? true,
      }));
    }

    // Fallback to config
    const { WRITERS } = await import("@shared/writers.config");
    return WRITERS.map(w => ({
      writerId: w.id,
      name: w.name,
      totalAssignments: countMap.get(w.id) || 0,
      completed: countMap.get(w.id) || 0,
      isActive: true,
    }));
  }

  async getWriterBySlug(slug: string): Promise<any> {
    // Try database first
    const [dbWriter] = await db
      .select()
      .from(aiWriters)
      .where(or(eq(aiWriters.slug, slug), eq(aiWriters.id, slug)));

    if (dbWriter) {
      const articleCounts = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(contents)
        .where(and(sql`${contents.deletedAt} IS NULL`, eq(contents.writerId, dbWriter.id)));

      return {
        ...dbWriter,
        articleCount: articleCounts[0]?.count || 0,
      };
    }

    // Fallback to config
    const { WRITERS, CATEGORY_LABELS, getWriterPrompt } = await import("@shared/writers.config");
    const writer = WRITERS.find(w => w.id === slug);
    if (!writer) return undefined;

    return {
      ...writer,
      slug: writer.id,
      personality: writer.voice.personality,
      shortBio: writer.background.substring(0, 200) + "...",
      contentTypes: [CATEGORY_LABELS[writer.category]],
      languages: ["en"],
      isActive: true,
      articleCount: 0,
      systemPrompt: getWriterPrompt(writer),
    };
  }

  async seedWritersFromConfig(): Promise<number> {
    const { WRITERS, CATEGORY_LABELS } = await import("@shared/writers.config");

    let seededCount = 0;
    for (const w of WRITERS) {
      const existing = await db.select().from(aiWriters).where(eq(aiWriters.id, w.id));

      if (existing.length === 0) {
        await db.insert(aiWriters).values({
          id: w.id,
          name: w.name,
          slug: w.id,
          avatar: w.avatar,
          nationality: w.nationality,
          age: w.age,
          expertise: w.expertise,
          personality: w.voice.personality,
          writingStyle: w.writingStyle.tone,
          bio: w.background,
          shortBio: w.background.substring(0, 200) + "...",
          contentTypes: [CATEGORY_LABELS[w.category]],
          languages: ["en"],
          isActive: true,
          articleCount: 0,
        } as any);
        seededCount++;
      }
    }

    return seededCount;
  }

  async updateWriter(id: string, data: Partial<AIWriter>): Promise<AIWriter | undefined> {
    // Check if writer exists first
    const [existing] = await db.select().from(aiWriters).where(eq(aiWriters.id, id));
    if (!existing) {
      return undefined;
    }

    const updateData: Partial<AIWriter> = {};

    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.name) updateData.name = data.name;
    if (data.avatar) updateData.avatar = data.avatar;
    if (data.bio) updateData.bio = data.bio;
    if (data.shortBio) updateData.shortBio = data.shortBio;

    // Note: Using type assertion due to drizzle ORM typing limitations with partial updates
    const [updated] = await db
      .update(aiWriters)
      .set({ ...updateData, updatedAt: new Date() } as typeof aiWriters.$inferInsert)
      .where(eq(aiWriters.id, id))
      .returning();

    return updated;
  }
}

export const aiWritersStorage = new AIWritersStorage();

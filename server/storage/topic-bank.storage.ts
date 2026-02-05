import {
  eq,
  desc,
  sql,
  and,
  ilike,
  db,
  topicBank,
  keywordRepository,
  type TopicBank,
  type InsertTopicBank,
  type KeywordRepository,
  type InsertKeywordRepository,
} from "./base";

export class TopicBankStorage {
  // Topic Bank
  async getTopicBankItems(filters?: {
    category?: string;
    isActive?: boolean;
  }): Promise<TopicBank[]> {
    let query = db.select().from(topicBank);
    const conditions = [];
    if (filters?.category) {
      conditions.push(eq(topicBank.category, filters.category as any));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(topicBank.isActive, filters.isActive));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    return await query.orderBy(desc(topicBank.priority), desc(topicBank.createdAt));
  }

  async getTopicBankItem(id: string): Promise<TopicBank | undefined> {
    const [item] = await db.select().from(topicBank).where(eq(topicBank.id, id));
    return item;
  }

  async createTopicBankItem(insertItem: InsertTopicBank): Promise<TopicBank> {
    const [item] = await db
      .insert(topicBank)
      .values(insertItem as any)
      .returning();
    return item;
  }

  async updateTopicBankItem(
    id: string,
    updateData: Partial<Omit<TopicBank, "id" | "createdAt">>
  ): Promise<TopicBank | undefined> {
    const [item] = await db
      .update(topicBank)
      .set(updateData as any)
      .where(eq(topicBank.id, id))
      .returning();
    return item;
  }

  async deleteTopicBankItem(id: string): Promise<boolean> {
    await db.delete(topicBank).where(eq(topicBank.id, id));
    return true;
  }

  async incrementTopicUsage(id: string): Promise<TopicBank | undefined> {
    const [item] = await db
      .update(topicBank)
      .set({
        timesUsed: sql`${topicBank.timesUsed} + 1`,
        lastUsed: new Date(),
      } as any)
      .where(eq(topicBank.id, id))
      .returning();
    return item;
  }

  // Keywords
  async getKeywords(filters?: {
    type?: string;
    category?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<KeywordRepository[]> {
    let query = db.select().from(keywordRepository);
    const conditions = [];
    if (filters?.type) {
      conditions.push(eq(keywordRepository.type, filters.type));
    }
    if (filters?.category) {
      conditions.push(eq(keywordRepository.category, filters.category));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(keywordRepository.isActive, filters.isActive));
    }
    if (filters?.search) {
      conditions.push(ilike(keywordRepository.keyword, `%${filters.search}%`));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    return await query.orderBy(desc(keywordRepository.priority), desc(keywordRepository.createdAt));
  }

  async getKeyword(id: string): Promise<KeywordRepository | undefined> {
    const [item] = await db.select().from(keywordRepository).where(eq(keywordRepository.id, id));
    return item;
  }

  async createKeyword(insertItem: InsertKeywordRepository): Promise<KeywordRepository> {
    const [item] = await db
      .insert(keywordRepository)
      .values(insertItem as any)
      .returning();
    return item;
  }

  async updateKeyword(
    id: string,
    updateData: Partial<InsertKeywordRepository>
  ): Promise<KeywordRepository | undefined> {
    const [item] = await db
      .update(keywordRepository)
      .set({ ...updateData, updatedAt: new Date() } as any)
      .where(eq(keywordRepository.id, id))
      .returning();
    return item;
  }

  async deleteKeyword(id: string): Promise<boolean> {
    await db.delete(keywordRepository).where(eq(keywordRepository.id, id));
    return true;
  }

  async incrementKeywordUsage(id: string): Promise<KeywordRepository | undefined> {
    const [item] = await db
      .update(keywordRepository)
      .set({
        usageCount: sql`${keywordRepository.usageCount} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(keywordRepository.id, id))
      .returning();
    return item;
  }
}

export const topicBankStorage = new TopicBankStorage();

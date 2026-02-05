import {
  eq,
  desc,
  sql,
  and,
  ilike,
  inArray,
  db,
  contents,
  attractions,
  hotels,
  articles,
  events,
  itineraries,
  dining,
  districts,
  transports,
  affiliateLinks,
  translations,
  users,
  type Content,
  type InsertContent,
  type ContentWithRelations,
} from "./base";

export class ContentStorage {
  async getContents(filters?: {
    type?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Content[]> {
    // Set default limit with max cap to prevent memory issues
    const limit = Math.min(filters?.limit || 50, 200);
    const offset = filters?.offset || 0;

    let query = db.select().from(contents);

    const conditions = [];
    // Filter out soft-deleted content
    conditions.push(sql`${contents.deletedAt} IS NULL`);
    if (filters?.type) {
      conditions.push(eq(contents.type, filters.type as any));
    }
    if (filters?.status) {
      conditions.push(eq(contents.status, filters.status as any));
    }
    if (filters?.search) {
      conditions.push(ilike(contents.title, `%${filters.search}%`));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(contents.createdAt)).limit(limit).offset(offset);
  }

  async getContentsWithRelations(filters?: {
    type?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ContentWithRelations[]> {
    const baseContents = await this.getContents(filters);

    if (baseContents.length === 0) return [];

    // Collect all content IDs and author IDs for batch fetching
    const contentIds = baseContents.map(c => c.id);
    const authorIds = [...new Set(baseContents.filter(c => c.authorId).map(c => c.authorId!))];

    // Batch fetch all related data in parallel (fixes N+1 query pattern)
    const [
      attractionsData,
      hotelsData,
      articlesData,
      eventsData,
      itinerariesData,
      districtsData,
      diningData,
      transportsData,
      authorsData,
    ] = await Promise.all([
      db.select().from(attractions).where(inArray(attractions.contentId, contentIds)),
      db.select().from(hotels).where(inArray(hotels.contentId, contentIds)),
      db.select().from(articles).where(inArray(articles.contentId, contentIds)),
      db.select().from(events).where(inArray(events.contentId, contentIds)),
      db.select().from(itineraries).where(inArray(itineraries.contentId, contentIds)),
      db.select().from(districts).where(inArray(districts.contentId, contentIds)),
      db.select().from(dining).where(inArray(dining.contentId, contentIds)),
      db.select().from(transports).where(inArray(transports.contentId, contentIds)),
      authorIds.length > 0
        ? db.select().from(users).where(inArray(users.id, authorIds))
        : Promise.resolve([]),
    ]);

    // Create lookup maps for O(1) access
    const attractionsMap = new Map(attractionsData.map(a => [a.contentId, a]));
    const hotelsMap = new Map(hotelsData.map(h => [h.contentId, h]));
    const articlesMap = new Map(articlesData.map(a => [a.contentId, a]));
    const eventsMap = new Map(eventsData.map(e => [e.contentId, e]));
    const itinerariesMap = new Map(itinerariesData.map(i => [i.contentId, i]));
    const districtsMap = new Map(districtsData.map(d => [d.contentId, d]));
    const diningMap = new Map(diningData.map(d => [d.contentId, d]));
    const transportsMap = new Map(transportsData.map(t => [t.contentId, t]));
    const authorsMap = new Map(authorsData.map(a => [a.id, a]));

    // Map relations to contents
    return baseContents.map(content => {
      const result: ContentWithRelations = { ...content };

      switch (content.type) {
        case "attraction":
          result.attraction = attractionsMap.get(content.id);
          break;
        case "hotel":
          result.hotel = hotelsMap.get(content.id);
          break;
        case "article":
          result.article = articlesMap.get(content.id);
          break;
        case "event":
          result.event = eventsMap.get(content.id);
          break;
        case "itinerary":
          result.itinerary = itinerariesMap.get(content.id);
          break;
        case "district":
          result.district = districtsMap.get(content.id);
          break;
        case "dining":
          result.dining = diningMap.get(content.id);
          break;
        case "transport":
          result.transport = transportsMap.get(content.id);
          break;
      }

      if (content.authorId) {
        result.author = authorsMap.get(content.authorId);
      }

      return result;
    });
  }

  async getContent(id: string): Promise<ContentWithRelations | undefined> {
    const [content] = await db.select().from(contents).where(eq(contents.id, id));
    if (!content) return undefined;

    const result: ContentWithRelations = { ...content };

    if (content.type === "attraction") {
      const [attraction] = await db.select().from(attractions).where(eq(attractions.contentId, id));
      result.attraction = attraction;
    } else if (content.type === "hotel") {
      const [hotel] = await db.select().from(hotels).where(eq(hotels.contentId, id));
      result.hotel = hotel;
    } else if (content.type === "article") {
      const [article] = await db.select().from(articles).where(eq(articles.contentId, id));
      result.article = article;
    } else if (content.type === "event") {
      const [event] = await db.select().from(events).where(eq(events.contentId, id));
      result.event = event;
    } else if (content.type === "itinerary") {
      const [itinerary] = await db.select().from(itineraries).where(eq(itineraries.contentId, id));
      result.itinerary = itinerary;
    } else if (content.type === "dining") {
      const [diningItem] = await db.select().from(dining).where(eq(dining.contentId, id));
      result.dining = diningItem;
    } else if (content.type === "district") {
      const [district] = await db.select().from(districts).where(eq(districts.contentId, id));
      result.district = district;
    } else if (content.type === "transport") {
      const [transport] = await db.select().from(transports).where(eq(transports.contentId, id));
      result.transport = transport;
    }

    result.affiliateLinks = await db
      .select()
      .from(affiliateLinks)
      .where(eq(affiliateLinks.contentId, id));
    result.translations = await db
      .select()
      .from(translations)
      .where(eq(translations.contentId, id));

    // Fetch author if authorId exists
    if (content.authorId) {
      const [author] = await db.select().from(users).where(eq(users.id, content.authorId));
      result.author = author;
    }

    return result;
  }

  async getContentBySlug(slug: string): Promise<ContentWithRelations | undefined> {
    const [content] = await db.select().from(contents).where(eq(contents.slug, slug));
    if (!content) return undefined;

    const result: ContentWithRelations = { ...content };

    if (content.type === "attraction") {
      const [attraction] = await db
        .select()
        .from(attractions)
        .where(eq(attractions.contentId, content.id));
      result.attraction = attraction;
    } else if (content.type === "hotel") {
      const [hotel] = await db.select().from(hotels).where(eq(hotels.contentId, content.id));
      result.hotel = hotel;
    } else if (content.type === "article") {
      const [article] = await db.select().from(articles).where(eq(articles.contentId, content.id));
      result.article = article;
    } else if (content.type === "event") {
      const [event] = await db.select().from(events).where(eq(events.contentId, content.id));
      result.event = event;
    } else if (content.type === "itinerary") {
      const [itinerary] = await db
        .select()
        .from(itineraries)
        .where(eq(itineraries.contentId, content.id));
      result.itinerary = itinerary;
    } else if (content.type === "dining") {
      const [diningItem] = await db.select().from(dining).where(eq(dining.contentId, content.id));
      result.dining = diningItem;
    } else if (content.type === "district") {
      const [district] = await db
        .select()
        .from(districts)
        .where(eq(districts.contentId, content.id));
      result.district = district;
    } else if (content.type === "transport") {
      const [transport] = await db
        .select()
        .from(transports)
        .where(eq(transports.contentId, content.id));
      result.transport = transport;
    }

    result.affiliateLinks = await db
      .select()
      .from(affiliateLinks)
      .where(eq(affiliateLinks.contentId, content.id));
    result.translations = await db
      .select()
      .from(translations)
      .where(eq(translations.contentId, content.id));

    // Fetch author if authorId exists
    if (content.authorId) {
      const [author] = await db.select().from(users).where(eq(users.id, content.authorId));
      result.author = author;
    }

    return result;
  }

  async createContent(insertContent: InsertContent): Promise<Content> {
    const [content] = await db
      .insert(contents)
      .values(insertContent as any)
      .returning();
    return content;
  }

  async updateContent(
    id: string,
    updateData: Partial<InsertContent>
  ): Promise<Content | undefined> {
    const [content] = await db
      .update(contents)
      .set({ ...updateData, updatedAt: new Date() } as any)
      .where(eq(contents.id, id))
      .returning();
    return content;
  }

  async deleteContent(id: string): Promise<boolean> {
    // Soft delete - set deletedAt instead of actually deleting
    const [result] = await db
      .update(contents)
      .set({ deletedAt: new Date() } as any)
      .where(eq(contents.id, id))
      .returning();
    return !!result;
  }

  async getScheduledContentToPublish(): Promise<Content[]> {
    const now = new Date();
    return await db
      .select()
      .from(contents)
      .where(and(eq(contents.status, "scheduled"), sql`${contents.scheduledAt} <= ${now}`));
  }

  async publishScheduledContent(id: string): Promise<Content | undefined> {
    const [content] = await db
      .update(contents)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(contents.id, id))
      .returning();
    return content;
  }

  async getStats(): Promise<{
    totalContent: number;
    published: number;
    drafts: number;
    inReview: number;
    scheduled: number;
    attractions: number;
    hotels: number;
    articles: number;
    dining: number;
    events: number;
    itineraries: number;
    districts: number;
  }> {
    const allContent = await db.select().from(contents);

    return {
      totalContent: allContent.length,
      published: allContent.filter(c => c.status === "published").length,
      drafts: allContent.filter(c => c.status === "draft").length,
      inReview: allContent.filter(c => c.status === "in_review").length,
      scheduled: allContent.filter(c => c.status === "scheduled").length,
      attractions: allContent.filter(c => c.type === "attraction").length,
      hotels: allContent.filter(c => c.type === "hotel").length,
      articles: allContent.filter(c => c.type === "article").length,
      dining: allContent.filter(c => c.type === "dining").length,
      events: allContent.filter(c => c.type === "event").length,
      itineraries: allContent.filter(c => c.type === "itinerary").length,
      districts: allContent.filter(c => c.type === "district").length,
    };
  }
}

export const contentStorage = new ContentStorage();

import {
  eq,
  db,
  attractions,
  hotels,
  articles,
  events,
  itineraries,
  dining,
  districts,
  transports,
  type Attraction,
  type InsertAttraction,
  type Hotel,
  type InsertHotel,
  type Article,
  type InsertArticle,
  type Event,
  type InsertEvent,
  type Itinerary,
  type InsertItinerary,
  type Dining,
  type InsertDining,
  type District,
  type InsertDistrict,
  type Transport,
  type InsertTransport,
} from "./base";

export class ContentTypesStorage {
  // Attractions
  async getAttraction(contentId: string): Promise<Attraction | undefined> {
    const [attraction] = await db
      .select()
      .from(attractions)
      .where(eq(attractions.contentId, contentId));
    return attraction;
  }

  async createAttraction(insertAttraction: InsertAttraction): Promise<Attraction> {
    const [attraction] = await db
      .insert(attractions)
      .values(insertAttraction as any)
      .returning();
    return attraction;
  }

  async updateAttraction(
    contentId: string,
    updateData: Partial<InsertAttraction>
  ): Promise<Attraction | undefined> {
    const [attraction] = await db
      .update(attractions)
      .set(updateData as any)
      .where(eq(attractions.contentId, contentId))
      .returning();
    return attraction;
  }

  // Hotels
  async getHotel(contentId: string): Promise<Hotel | undefined> {
    const [hotel] = await db.select().from(hotels).where(eq(hotels.contentId, contentId));
    return hotel;
  }

  async createHotel(insertHotel: InsertHotel): Promise<Hotel> {
    const [hotel] = await db
      .insert(hotels)
      .values(insertHotel as any)
      .returning();
    return hotel;
  }

  async updateHotel(
    contentId: string,
    updateData: Partial<InsertHotel>
  ): Promise<Hotel | undefined> {
    const [hotel] = await db
      .update(hotels)
      .set(updateData as any)
      .where(eq(hotels.contentId, contentId))
      .returning();
    return hotel;
  }

  // Articles
  async getArticle(contentId: string): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.contentId, contentId));
    return article;
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const [article] = await db
      .insert(articles)
      .values(insertArticle as any)
      .returning();
    return article;
  }

  async updateArticle(
    contentId: string,
    updateData: Partial<InsertArticle>
  ): Promise<Article | undefined> {
    const [article] = await db
      .update(articles)
      .set(updateData as any)
      .where(eq(articles.contentId, contentId))
      .returning();
    return article;
  }

  // Events
  async getEvent(contentId: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.contentId, contentId));
    return event;
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values(insertEvent as any)
      .returning();
    return event;
  }

  async updateEvent(
    contentId: string,
    updateData: Partial<InsertEvent>
  ): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set(updateData as any)
      .where(eq(events.contentId, contentId))
      .returning();
    return event;
  }

  // Itineraries
  async getItinerary(contentId: string): Promise<Itinerary | undefined> {
    const [itinerary] = await db
      .select()
      .from(itineraries)
      .where(eq(itineraries.contentId, contentId));
    return itinerary;
  }

  async createItinerary(insertItinerary: InsertItinerary): Promise<Itinerary> {
    const [itinerary] = await db
      .insert(itineraries)
      .values(insertItinerary as any)
      .returning();
    return itinerary;
  }

  async updateItinerary(
    contentId: string,
    updateData: Partial<InsertItinerary>
  ): Promise<Itinerary | undefined> {
    const [itinerary] = await db
      .update(itineraries)
      .set(updateData as any)
      .where(eq(itineraries.contentId, contentId))
      .returning();
    return itinerary;
  }

  // Dining
  async getDining(contentId: string): Promise<Dining | undefined> {
    const [diningItem] = await db.select().from(dining).where(eq(dining.contentId, contentId));
    return diningItem;
  }

  async createDining(insertDining: InsertDining): Promise<Dining> {
    const [diningItem] = await db
      .insert(dining)
      .values(insertDining as any)
      .returning();
    return diningItem;
  }

  async updateDining(
    contentId: string,
    updateData: Partial<InsertDining>
  ): Promise<Dining | undefined> {
    const [diningItem] = await db
      .update(dining)
      .set(updateData as any)
      .where(eq(dining.contentId, contentId))
      .returning();
    return diningItem;
  }

  // Districts
  async getDistrict(contentId: string): Promise<District | undefined> {
    const [district] = await db.select().from(districts).where(eq(districts.contentId, contentId));
    return district;
  }

  async createDistrict(insertDistrict: InsertDistrict): Promise<District> {
    const [district] = await db
      .insert(districts)
      .values(insertDistrict as any)
      .returning();
    return district;
  }

  async updateDistrict(
    contentId: string,
    updateData: Partial<InsertDistrict>
  ): Promise<District | undefined> {
    const [district] = await db
      .update(districts)
      .set(updateData as any)
      .where(eq(districts.contentId, contentId))
      .returning();
    return district;
  }

  // Transports
  async getTransport(contentId: string): Promise<Transport | undefined> {
    const [transport] = await db
      .select()
      .from(transports)
      .where(eq(transports.contentId, contentId));
    return transport;
  }

  async createTransport(insertTransport: InsertTransport): Promise<Transport> {
    const [transport] = await db
      .insert(transports)
      .values(insertTransport as any)
      .returning();
    return transport;
  }

  async updateTransport(
    contentId: string,
    updateData: Partial<InsertTransport>
  ): Promise<Transport | undefined> {
    const [transport] = await db
      .update(transports)
      .set(updateData as any)
      .where(eq(transports.contentId, contentId))
      .returning();
    return transport;
  }
}

export const contentTypesStorage = new ContentTypesStorage();

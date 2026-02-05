import {
  eq,
  desc,
  sql,
  and,
  db,
  newsletterSubscribers,
  newsletterCampaigns,
  campaignEvents,
  emailTemplates,
  newsletterAbTests,
  subscriberSegments,
  segmentConditions,
  type NewsletterSubscriber,
  type InsertNewsletterSubscriber,
  type NewsletterCampaign,
  type InsertCampaign,
  type CampaignEvent,
  type InsertCampaignEvent,
  type EmailTemplate,
  type InsertEmailTemplate,
  type NewsletterAbTest,
  type InsertNewsletterAbTest,
  type SubscriberSegment,
  type InsertSubscriberSegment,
  type SegmentCondition,
  type InsertSegmentCondition,
} from "./base";

export class NewsletterStorage {
  // Newsletter Subscribers
  async getNewsletterSubscribers(filters?: { status?: string }): Promise<NewsletterSubscriber[]> {
    if (filters?.status) {
      return await db
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.status, filters.status as any))
        .orderBy(desc(newsletterSubscribers.subscribedAt));
    }
    return await db
      .select()
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.subscribedAt));
  }

  async getActiveNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return await db
      .select()
      .from(newsletterSubscribers)
      .where(
        and(
          eq(newsletterSubscribers.status, "subscribed"),
          eq(newsletterSubscribers.isActive, true)
        )
      )
      .orderBy(desc(newsletterSubscribers.subscribedAt));
  }

  async getNewsletterSubscriber(id: string): Promise<NewsletterSubscriber | undefined> {
    const [subscriber] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.id, id));
    return subscriber;
  }

  async getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined> {
    const [subscriber] = await db
      .select()
      .from(newsletterSubscribers)
      .where(sql`LOWER(${newsletterSubscribers.email}) = LOWER(${email})`);
    return subscriber;
  }

  async getNewsletterSubscriberByToken(token: string): Promise<NewsletterSubscriber | undefined> {
    const [subscriber] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.confirmToken, token));
    return subscriber;
  }

  async createNewsletterSubscriber(
    subscriber: InsertNewsletterSubscriber
  ): Promise<NewsletterSubscriber> {
    const [newSubscriber] = await db
      .insert(newsletterSubscribers)
      .values(subscriber as any)
      .returning();
    return newSubscriber;
  }

  async updateNewsletterSubscriber(
    id: string,
    data: Partial<InsertNewsletterSubscriber>
  ): Promise<NewsletterSubscriber | undefined> {
    const [subscriber] = await db
      .update(newsletterSubscribers)
      .set(data as any)
      .where(eq(newsletterSubscribers.id, id))
      .returning();
    return subscriber;
  }

  async deleteNewsletterSubscriber(id: string): Promise<boolean> {
    await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id));
    return true;
  }

  // Newsletter Campaigns
  async getCampaigns(): Promise<NewsletterCampaign[]> {
    return await db.select().from(newsletterCampaigns).orderBy(desc(newsletterCampaigns.createdAt));
  }

  async getCampaign(id: string): Promise<NewsletterCampaign | undefined> {
    const [campaign] = await db
      .select()
      .from(newsletterCampaigns)
      .where(eq(newsletterCampaigns.id, id));
    return campaign;
  }

  async createCampaign(campaign: InsertCampaign): Promise<NewsletterCampaign> {
    const [newCampaign] = await db
      .insert(newsletterCampaigns)
      .values(campaign as any)
      .returning();
    return newCampaign;
  }

  async updateCampaign(
    id: string,
    data: Partial<NewsletterCampaign>
  ): Promise<NewsletterCampaign | undefined> {
    const [campaign] = await db
      .update(newsletterCampaigns)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(newsletterCampaigns.id, id))
      .returning();
    return campaign;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    await db.delete(newsletterCampaigns).where(eq(newsletterCampaigns.id, id));
    return true;
  }

  // Campaign Events
  async createCampaignEvent(event: InsertCampaignEvent): Promise<CampaignEvent> {
    const [newEvent] = await db
      .insert(campaignEvents)
      .values(event as any)
      .returning();
    return newEvent;
  }

  async getCampaignEvents(campaignId: string): Promise<CampaignEvent[]> {
    return await db
      .select()
      .from(campaignEvents)
      .where(eq(campaignEvents.campaignId, campaignId))
      .orderBy(desc(campaignEvents.createdAt));
  }

  // Email Templates
  async getEmailTemplates(filters?: { category?: string }): Promise<EmailTemplate[]> {
    let query = db.select().from(emailTemplates);
    if (filters?.category) {
      query = query.where(eq(emailTemplates.category, filters.category)) as any;
    }
    return await query.orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db
      .insert(emailTemplates)
      .values(template as any)
      .returning();
    return newTemplate;
  }

  async updateEmailTemplate(
    id: string,
    data: Partial<InsertEmailTemplate>
  ): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .update(emailTemplates)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(emailTemplates.id, id))
      .returning();
    return template;
  }

  async deleteEmailTemplate(id: string): Promise<boolean> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
    return true;
  }

  async incrementTemplateUsageCount(id: string): Promise<void> {
    await db
      .update(emailTemplates)
      .set({ usageCount: sql`COALESCE(${emailTemplates.usageCount}, 0) + 1` } as any)
      .where(eq(emailTemplates.id, id));
  }

  // Newsletter A/B Tests
  async getNewsletterAbTests(filters?: { status?: string }): Promise<NewsletterAbTest[]> {
    let query = db.select().from(newsletterAbTests);
    if (filters?.status) {
      query = query.where(eq(newsletterAbTests.status, filters.status)) as any;
    }
    return await query.orderBy(desc(newsletterAbTests.createdAt));
  }

  async getNewsletterAbTest(id: string): Promise<NewsletterAbTest | undefined> {
    const [test] = await db.select().from(newsletterAbTests).where(eq(newsletterAbTests.id, id));
    return test;
  }

  async createNewsletterAbTest(test: InsertNewsletterAbTest): Promise<NewsletterAbTest> {
    const [newTest] = await db
      .insert(newsletterAbTests)
      .values(test as any)
      .returning();
    return newTest;
  }

  async updateNewsletterAbTest(
    id: string,
    data: Partial<NewsletterAbTest>
  ): Promise<NewsletterAbTest | undefined> {
    const [test] = await db
      .update(newsletterAbTests)
      .set(data as any)
      .where(eq(newsletterAbTests.id, id))
      .returning();
    return test;
  }

  async deleteNewsletterAbTest(id: string): Promise<boolean> {
    await db.delete(newsletterAbTests).where(eq(newsletterAbTests.id, id));
    return true;
  }

  // Subscriber Segments
  async getSubscriberSegments(): Promise<SubscriberSegment[]> {
    return await db.select().from(subscriberSegments).orderBy(desc(subscriberSegments.createdAt));
  }

  async getSubscriberSegment(id: string): Promise<SubscriberSegment | undefined> {
    const [segment] = await db
      .select()
      .from(subscriberSegments)
      .where(eq(subscriberSegments.id, id));
    return segment;
  }

  async createSubscriberSegment(segment: InsertSubscriberSegment): Promise<SubscriberSegment> {
    const [newSegment] = await db
      .insert(subscriberSegments)
      .values(segment as any)
      .returning();
    return newSegment;
  }

  async updateSubscriberSegment(
    id: string,
    data: Partial<InsertSubscriberSegment>
  ): Promise<SubscriberSegment | undefined> {
    const [segment] = await db
      .update(subscriberSegments)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(subscriberSegments.id, id))
      .returning();
    return segment;
  }

  async deleteSubscriberSegment(id: string): Promise<boolean> {
    await db.delete(subscriberSegments).where(eq(subscriberSegments.id, id));
    return true;
  }

  // Segment Conditions
  async getSegmentConditions(segmentId: string): Promise<SegmentCondition[]> {
    return await db
      .select()
      .from(segmentConditions)
      .where(eq(segmentConditions.segmentId, segmentId))
      .orderBy(segmentConditions.order);
  }

  async createSegmentCondition(condition: InsertSegmentCondition): Promise<SegmentCondition> {
    const [newCondition] = await db
      .insert(segmentConditions)
      .values(condition as any)
      .returning();
    return newCondition;
  }

  async deleteSegmentCondition(id: string): Promise<boolean> {
    await db.delete(segmentConditions).where(eq(segmentConditions.id, id));
    return true;
  }
}

export const newsletterStorage = new NewsletterStorage();

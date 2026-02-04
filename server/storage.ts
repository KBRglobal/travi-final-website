import { eq, desc, sql, and, ilike, inArray, or } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  contents,
  attractions,
  hotels,
  articles,
  events,
  itineraries,
  dining,
  districts,
  transports,
  rssFeeds,
  affiliateLinks,
  mediaFiles,
  internalLinks,
  topicBank,
  keywordRepository,
  contentVersions,
  translations,
  contentFingerprints,
  contentViews,
  auditLogs,
  rateLimits,
  newsletterSubscribers,
  contentClusters,
  clusterMembers,
  tags,
  contentTags,
  otpCodes,
  topicClusters,
  topicClusterItems,
  type User,
  type InsertUser,
  type UpsertUser,
  type Content,
  type InsertContent,
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
  type RssFeed,
  type InsertRssFeed,
  type AffiliateLink,
  type InsertAffiliateLink,
  type MediaFile,
  type InsertMediaFile,
  type InternalLink,
  type InsertInternalLink,
  type ContentWithRelations,
  type TopicBank,
  type InsertTopicBank,
  type KeywordRepository,
  type InsertKeywordRepository,
  type ContentVersion,
  type InsertContentVersion,
  type Translation,
  type InsertTranslation,
  type Locale,
  type ContentFingerprint,
  type InsertContentFingerprint,
  type HomepagePromotion,
  type InsertHomepagePromotion,
  type HomepageSection,
  type ContentView,
  type InsertContentView,
  type AuditLog,
  type InsertAuditLog,
  type NewsletterSubscriber,
  type InsertNewsletterSubscriber,
  type NewsletterCampaign,
  type InsertCampaign,
  type CampaignEvent,
  type InsertCampaignEvent,
  type ContentCluster,
  type InsertContentCluster,
  type ClusterMember,
  type InsertClusterMember,
  type Tag,
  type InsertTag,
  type ContentTag,
  type InsertContentTag,
  type OtpCode,
  type InsertOtpCode,
  type TopicCluster,
  type InsertTopicCluster,
  type TopicClusterItem,
  type InsertTopicClusterItem,
  homepagePromotions,
  newsletterCampaigns,
  campaignEvents,
  contentTemplates,
  type ContentTemplate,
  type InsertContentTemplate,
  siteSettings,
  type SiteSetting,
  type InsertSiteSetting,
  propertyLeads,
  type PropertyLead,
  type InsertPropertyLead,
  aiWriters,
  type AIWriter,
  type InsertAIWriter,
  emailTemplates,
  type EmailTemplate,
  type InsertEmailTemplate,
  newsletterAbTests,
  type NewsletterAbTest,
  type InsertNewsletterAbTest,
  subscriberSegments,
  type SubscriberSegment,
  type InsertSubscriberSegment,
  segmentConditions,
  type SegmentCondition,
  type InsertSegmentCondition,
  liveChatConversations,
  liveChatMessages,
  type LiveChatConversation,
  type InsertLiveChatConversation,
  type LiveChatMessage,
  type InsertLiveChatMessage,
  surveys,
  surveyResponses,
  type Survey,
  type InsertSurvey,
  type SurveyResponse,
  type InsertSurveyResponse,
  referralCodes,
  referralClicks,
  referrals,
  referralCommissions,
  type ReferralCode,
  type InsertReferralCode,
  type ReferralClick,
  type Referral,
  type InsertReferral,
  type ReferralCommission,
  type InsertReferralCommission,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  createUserWithPassword(userData: {
    username: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: "admin" | "editor" | "author" | "contributor" | "viewer";
    isActive?: boolean;
  }): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  upsertUser(user: UpsertUser): Promise<User>;

  getContents(filters?: { type?: string; status?: string; search?: string }): Promise<Content[]>;
  getContentsWithRelations(filters?: {
    type?: string;
    status?: string;
    search?: string;
  }): Promise<ContentWithRelations[]>;
  getContent(id: string): Promise<ContentWithRelations | undefined>;
  getContentBySlug(slug: string): Promise<ContentWithRelations | undefined>;
  createContent(content: InsertContent): Promise<Content>;
  updateContent(id: string, content: Partial<InsertContent>): Promise<Content | undefined>;
  deleteContent(id: string): Promise<boolean>;

  getAttraction(contentId: string): Promise<Attraction | undefined>;
  createAttraction(attraction: InsertAttraction): Promise<Attraction>;
  updateAttraction(
    contentId: string,
    attraction: Partial<InsertAttraction>
  ): Promise<Attraction | undefined>;

  getHotel(contentId: string): Promise<Hotel | undefined>;
  createHotel(hotel: InsertHotel): Promise<Hotel>;
  updateHotel(contentId: string, hotel: Partial<InsertHotel>): Promise<Hotel | undefined>;

  getArticle(contentId: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  updateArticle(contentId: string, article: Partial<InsertArticle>): Promise<Article | undefined>;

  getEvent(contentId: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(contentId: string, event: Partial<InsertEvent>): Promise<Event | undefined>;

  getItinerary(contentId: string): Promise<Itinerary | undefined>;
  createItinerary(itinerary: InsertItinerary): Promise<Itinerary>;
  updateItinerary(
    contentId: string,
    itinerary: Partial<InsertItinerary>
  ): Promise<Itinerary | undefined>;

  getRssFeeds(): Promise<RssFeed[]>;
  getRssFeed(id: string): Promise<RssFeed | undefined>;
  createRssFeed(feed: InsertRssFeed): Promise<RssFeed>;
  updateRssFeed(
    id: string,
    feed: Partial<InsertRssFeed> & { lastFetchedAt?: Date }
  ): Promise<RssFeed | undefined>;
  deleteRssFeed(id: string): Promise<boolean>;

  getAffiliateLinks(contentId?: string): Promise<AffiliateLink[]>;
  getAffiliateLink(id: string): Promise<AffiliateLink | undefined>;
  createAffiliateLink(link: InsertAffiliateLink): Promise<AffiliateLink>;
  updateAffiliateLink(
    id: string,
    link: Partial<InsertAffiliateLink>
  ): Promise<AffiliateLink | undefined>;
  deleteAffiliateLink(id: string): Promise<boolean>;

  getMediaFiles(): Promise<MediaFile[]>;
  getMediaFile(id: string): Promise<MediaFile | undefined>;
  createMediaFile(file: InsertMediaFile): Promise<MediaFile>;
  updateMediaFile(id: string, file: Partial<InsertMediaFile>): Promise<MediaFile | undefined>;
  deleteMediaFile(id: string): Promise<boolean>;

  getInternalLinks(contentId?: string): Promise<InternalLink[]>;
  createInternalLink(link: InsertInternalLink): Promise<InternalLink>;
  deleteInternalLink(id: string): Promise<boolean>;

  getStats(): Promise<{
    totalContent: number;
    published: number;
    drafts: number;
    inReview: number;
    attractions: number;
    hotels: number;
    articles: number;
    events: number;
    itineraries: number;
  }>;

  getTopicBankItems(filters?: { category?: string; isActive?: boolean }): Promise<TopicBank[]>;
  getTopicBankItem(id: string): Promise<TopicBank | undefined>;
  createTopicBankItem(item: InsertTopicBank): Promise<TopicBank>;
  updateTopicBankItem(
    id: string,
    data: Partial<Omit<TopicBank, "id" | "createdAt">>
  ): Promise<TopicBank | undefined>;
  deleteTopicBankItem(id: string): Promise<boolean>;
  incrementTopicUsage(id: string): Promise<TopicBank | undefined>;

  getKeywords(filters?: {
    type?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<KeywordRepository[]>;
  getKeyword(id: string): Promise<KeywordRepository | undefined>;
  createKeyword(item: InsertKeywordRepository): Promise<KeywordRepository>;
  updateKeyword(
    id: string,
    data: Partial<InsertKeywordRepository>
  ): Promise<KeywordRepository | undefined>;
  deleteKeyword(id: string): Promise<boolean>;
  incrementKeywordUsage(id: string): Promise<KeywordRepository | undefined>;

  getContentVersions(contentId: string): Promise<ContentVersion[]>;
  getContentVersion(id: string): Promise<ContentVersion | undefined>;
  createContentVersion(version: InsertContentVersion): Promise<ContentVersion>;
  getLatestVersionNumber(contentId: string): Promise<number>;

  getAllTranslations(): Promise<Translation[]>;
  getTranslationsByContentId(contentId: string): Promise<Translation[]>;
  getTranslation(contentId: string, locale: Locale): Promise<Translation | undefined>;
  getTranslationById(id: string): Promise<Translation | undefined>;
  createTranslation(translation: InsertTranslation): Promise<Translation>;
  updateTranslation(id: string, data: Partial<InsertTranslation>): Promise<Translation | undefined>;
  deleteTranslation(id: string): Promise<boolean>;

  getContentFingerprintByHash(fingerprint: string): Promise<ContentFingerprint | undefined>;
  getContentFingerprintsByFeedId(rssFeedId: string): Promise<ContentFingerprint[]>;
  createContentFingerprint(fingerprint: InsertContentFingerprint): Promise<ContentFingerprint>;
  checkDuplicateFingerprints(fingerprints: string[]): Promise<ContentFingerprint[]>;

  // Topic Clusters for RSS aggregation
  getTopicClusters(filters?: { status?: string }): Promise<TopicCluster[]>;
  getTopicCluster(id: string): Promise<TopicCluster | undefined>;
  createTopicCluster(cluster: InsertTopicCluster): Promise<TopicCluster>;
  updateTopicCluster(
    id: string,
    data: Partial<InsertTopicCluster>
  ): Promise<TopicCluster | undefined>;
  deleteTopicCluster(id: string): Promise<boolean>;
  getTopicClusterItems(clusterId: string): Promise<TopicClusterItem[]>;
  createTopicClusterItem(item: InsertTopicClusterItem): Promise<TopicClusterItem>;
  updateTopicClusterItem(
    id: string,
    data: Partial<InsertTopicClusterItem>
  ): Promise<TopicClusterItem | undefined>;
  findSimilarCluster(topic: string): Promise<TopicCluster | undefined>;

  getScheduledContentToPublish(): Promise<Content[]>;
  publishScheduledContent(id: string): Promise<Content | undefined>;

  getHomepagePromotionsBySection(section: HomepageSection): Promise<HomepagePromotion[]>;
  getHomepagePromotion(id: string): Promise<HomepagePromotion | undefined>;
  createHomepagePromotion(promotion: InsertHomepagePromotion): Promise<HomepagePromotion>;
  updateHomepagePromotion(
    id: string,
    data: Partial<InsertHomepagePromotion>
  ): Promise<HomepagePromotion | undefined>;
  deleteHomepagePromotion(id: string): Promise<boolean>;
  reorderHomepagePromotions(section: HomepageSection, orderedIds: string[]): Promise<boolean>;

  // Analytics
  getAnalyticsOverview(): Promise<{
    totalViews: number;
    viewsToday: number;
    viewsThisWeek: number;
    viewsThisMonth: number;
  }>;
  getViewsOverTime(days: number): Promise<{ date: string; views: number }[]>;
  getTopContent(
    limit: number
  ): Promise<{ id: string; title: string; type: string; viewCount: number }[]>;
  getViewsByContentType(): Promise<{ type: string; views: number }[]>;
  recordContentView(
    contentId: string,
    data?: { userAgent?: string; referrer?: string; sessionId?: string }
  ): Promise<void>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    actionType?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]>;
  getAuditLogCount(filters?: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    actionType?: string;
  }): Promise<number>;

  // Newsletter Subscribers
  getNewsletterSubscribers(filters?: { status?: string }): Promise<NewsletterSubscriber[]>;
  getActiveNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  getNewsletterSubscriber(id: string): Promise<NewsletterSubscriber | undefined>;
  getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined>;
  getNewsletterSubscriberByToken(token: string): Promise<NewsletterSubscriber | undefined>;
  createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber>;
  updateNewsletterSubscriber(
    id: string,
    data: Partial<InsertNewsletterSubscriber>
  ): Promise<NewsletterSubscriber | undefined>;
  deleteNewsletterSubscriber(id: string): Promise<boolean>;

  // Property Leads
  getPropertyLeads(filters?: { status?: string }): Promise<PropertyLead[]>;
  getPropertyLead(id: string): Promise<PropertyLead | undefined>;
  createPropertyLead(lead: InsertPropertyLead): Promise<PropertyLead>;
  updatePropertyLead(
    id: string,
    data: Partial<InsertPropertyLead>
  ): Promise<PropertyLead | undefined>;
  deletePropertyLead(id: string): Promise<boolean>;

  // Newsletter Campaigns
  getCampaigns(): Promise<NewsletterCampaign[]>;
  getCampaign(id: string): Promise<NewsletterCampaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<NewsletterCampaign>;
  updateCampaign(
    id: string,
    data: Partial<NewsletterCampaign>
  ): Promise<NewsletterCampaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;

  // Campaign Events
  createCampaignEvent(event: InsertCampaignEvent): Promise<CampaignEvent>;
  getCampaignEvents(campaignId: string): Promise<CampaignEvent[]>;

  // Email Templates
  getEmailTemplates(filters?: { category?: string }): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(
    id: string,
    data: Partial<InsertEmailTemplate>
  ): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: string): Promise<boolean>;
  incrementTemplateUsageCount(id: string): Promise<void>;

  // Newsletter A/B Tests
  getNewsletterAbTests(filters?: { status?: string }): Promise<NewsletterAbTest[]>;
  getNewsletterAbTest(id: string): Promise<NewsletterAbTest | undefined>;
  createNewsletterAbTest(test: InsertNewsletterAbTest): Promise<NewsletterAbTest>;
  updateNewsletterAbTest(
    id: string,
    data: Partial<NewsletterAbTest>
  ): Promise<NewsletterAbTest | undefined>;
  deleteNewsletterAbTest(id: string): Promise<boolean>;

  // Subscriber Segments
  getSubscriberSegments(): Promise<SubscriberSegment[]>;
  getSubscriberSegment(id: string): Promise<SubscriberSegment | undefined>;
  createSubscriberSegment(segment: InsertSubscriberSegment): Promise<SubscriberSegment>;
  updateSubscriberSegment(
    id: string,
    data: Partial<InsertSubscriberSegment>
  ): Promise<SubscriberSegment | undefined>;
  deleteSubscriberSegment(id: string): Promise<boolean>;

  // Segment Conditions
  getSegmentConditions(segmentId: string): Promise<SegmentCondition[]>;
  createSegmentCondition(condition: InsertSegmentCondition): Promise<SegmentCondition>;
  deleteSegmentCondition(id: string): Promise<boolean>;

  // Content Clusters
  getContentClusters(): Promise<ContentCluster[]>;
  getContentCluster(id: string): Promise<ContentCluster | undefined>;
  getContentClusterBySlug(slug: string): Promise<ContentCluster | undefined>;
  createContentCluster(cluster: InsertContentCluster): Promise<ContentCluster>;
  updateContentCluster(
    id: string,
    data: Partial<InsertContentCluster>
  ): Promise<ContentCluster | undefined>;
  deleteContentCluster(id: string): Promise<boolean>;

  // Cluster Members
  getClusterMembers(clusterId: string): Promise<(ClusterMember & { content?: Content })[]>;
  addClusterMember(member: InsertClusterMember): Promise<ClusterMember>;
  removeClusterMember(id: string): Promise<boolean>;
  updateClusterMemberPosition(id: string, position: number): Promise<ClusterMember | undefined>;
  getContentClusterMembership(
    contentId: string
  ): Promise<(ClusterMember & { cluster?: ContentCluster })[]>;

  // Tags
  getTags(): Promise<Tag[]>;
  getTag(id: string): Promise<Tag | undefined>;
  getTagBySlug(slug: string): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  updateTag(id: string, data: Partial<InsertTag>): Promise<Tag | undefined>;
  deleteTag(id: string): Promise<boolean>;

  // Content Tags
  getContentTags(contentId: string): Promise<(ContentTag & { tag?: Tag })[]>;
  getTagContents(tagId: string): Promise<(ContentTag & { content?: Content })[]>;
  addContentTag(contentTag: InsertContentTag): Promise<ContentTag>;
  removeContentTag(contentId: string, tagId: string): Promise<boolean>;
  updateTagUsageCount(tagId: string): Promise<void>;

  // Bulk Operations
  bulkUpdateContentStatus(ids: string[], status: string): Promise<number>;
  bulkDeleteContents(ids: string[]): Promise<number>;
  bulkAddTagToContents(contentIds: string[], tagId: string): Promise<number>;
  bulkRemoveTagFromContents(contentIds: string[], tagId: string): Promise<number>;

  // Content Templates
  getContentTemplates(): Promise<ContentTemplate[]>;
  getContentTemplate(id: string): Promise<ContentTemplate | undefined>;
  createContentTemplate(template: InsertContentTemplate): Promise<ContentTemplate>;
  updateContentTemplate(
    id: string,
    data: Partial<InsertContentTemplate>
  ): Promise<ContentTemplate | undefined>;
  deleteContentTemplate(id: string): Promise<boolean>;
  incrementTemplateUsage(id: string): Promise<void>;

  // Site Settings
  getSettings(): Promise<SiteSetting[]>;
  getSetting(key: string): Promise<SiteSetting | undefined>;
  upsertSetting(
    key: string,
    value: unknown,
    category: string,
    updatedBy?: string
  ): Promise<SiteSetting>;
  deleteSetting(key: string): Promise<boolean>;

  // Media Usage
  checkMediaUsage(
    mediaUrl: string
  ): Promise<{ isUsed: boolean; usedIn: { id: string; title: string; type: string }[] }>;

  // AI Writers
  getAllWriters(): Promise<
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
  >;
  getWriterStats(): Promise<
    {
      writerId: string;
      name: string;
      totalAssignments: number;
      completed: number;
      isActive: boolean;
    }[]
  >;
  getWriterBySlug(slug: string): Promise<AIWriter | undefined>;
  seedWritersFromConfig(): Promise<number>;
  updateWriter(id: string, data: Partial<AIWriter>): Promise<AIWriter | undefined>;

  // Live Chat Support
  getLiveChatConversations(
    status?: string
  ): Promise<(LiveChatConversation & { messages?: LiveChatMessage[] })[]>;
  getLiveChatConversation(
    id: string
  ): Promise<(LiveChatConversation & { messages: LiveChatMessage[] }) | undefined>;
  getLiveChatConversationByVisitor(visitorId: string): Promise<LiveChatConversation | undefined>;
  createLiveChatConversation(data: InsertLiveChatConversation): Promise<LiveChatConversation>;
  updateLiveChatConversation(
    id: string,
    data: Partial<InsertLiveChatConversation>
  ): Promise<LiveChatConversation | undefined>;
  getLiveChatMessages(conversationId: string, since?: Date): Promise<LiveChatMessage[]>;
  createLiveChatMessage(data: InsertLiveChatMessage): Promise<LiveChatMessage>;
  markMessagesAsRead(conversationId: string, senderType: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.email}) = LOWER(${email})`);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.username}) = LOWER(${username})`);
    return user;
  }

  async createUserWithPassword(userData: {
    username: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: "admin" | "editor" | "author" | "contributor" | "viewer";
    isActive?: boolean;
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username: userData.username,
        passwordHash: userData.passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email || `${userData.username}@local.admin`,
        role: userData.role || "editor",
        isActive: userData.isActive !== false,
      })
      .returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser as any)
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data as any)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData as any)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: (userData as any).email,
          firstName: (userData as any).firstName,
          lastName: (userData as any).lastName,
          profileImageUrl: (userData as any).profileImageUrl,
          ...((userData as any).role && { role: (userData as any).role }),
          updatedAt: new Date(),
        } as any,
      })
      .returning();
    return user;
  }

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

  // Dining CRUD
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

  // District CRUD
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

  // Transport CRUD
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

  async getRssFeeds(): Promise<RssFeed[]> {
    return await db.select().from(rssFeeds).orderBy(desc(rssFeeds.createdAt));
  }

  async getRssFeed(id: string): Promise<RssFeed | undefined> {
    const [feed] = await db.select().from(rssFeeds).where(eq(rssFeeds.id, id));
    return feed;
  }

  async createRssFeed(insertFeed: InsertRssFeed): Promise<RssFeed> {
    const [feed] = await db
      .insert(rssFeeds)
      .values(insertFeed as any)
      .returning();
    return feed;
  }

  async updateRssFeed(
    id: string,
    updateData: Partial<InsertRssFeed> & { lastFetchedAt?: Date }
  ): Promise<RssFeed | undefined> {
    const [feed] = await db
      .update(rssFeeds)
      .set(updateData as any)
      .where(eq(rssFeeds.id, id))
      .returning();
    return feed;
  }

  async deleteRssFeed(id: string): Promise<boolean> {
    await db.delete(rssFeeds).where(eq(rssFeeds.id, id));
    return true;
  }

  async getAffiliateLinks(contentId?: string): Promise<AffiliateLink[]> {
    if (contentId) {
      return await db.select().from(affiliateLinks).where(eq(affiliateLinks.contentId, contentId));
    }
    return await db.select().from(affiliateLinks).orderBy(desc(affiliateLinks.createdAt));
  }

  async getAffiliateLink(id: string): Promise<AffiliateLink | undefined> {
    const [link] = await db.select().from(affiliateLinks).where(eq(affiliateLinks.id, id));
    return link;
  }

  async createAffiliateLink(insertLink: InsertAffiliateLink): Promise<AffiliateLink> {
    const [link] = await db
      .insert(affiliateLinks)
      .values(insertLink as any)
      .returning();
    return link;
  }

  async updateAffiliateLink(
    id: string,
    updateData: Partial<InsertAffiliateLink>
  ): Promise<AffiliateLink | undefined> {
    const [link] = await db
      .update(affiliateLinks)
      .set(updateData as any)
      .where(eq(affiliateLinks.id, id))
      .returning();
    return link;
  }

  async deleteAffiliateLink(id: string): Promise<boolean> {
    await db.delete(affiliateLinks).where(eq(affiliateLinks.id, id));
    return true;
  }

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

  async getContentFingerprintByHash(fingerprint: string): Promise<ContentFingerprint | undefined> {
    const [result] = await db
      .select()
      .from(contentFingerprints)
      .where(eq(contentFingerprints.fingerprint, fingerprint));
    return result;
  }

  async getContentFingerprintsByFeedId(rssFeedId: string): Promise<ContentFingerprint[]> {
    return await db
      .select()
      .from(contentFingerprints)
      .where(eq(contentFingerprints.rssFeedId, rssFeedId));
  }

  async createContentFingerprint(
    insertFingerprint: InsertContentFingerprint
  ): Promise<ContentFingerprint> {
    const [fingerprint] = await db
      .insert(contentFingerprints)
      .values(insertFingerprint as any)
      .returning();
    return fingerprint;
  }

  async checkDuplicateFingerprints(fingerprints: string[]): Promise<ContentFingerprint[]> {
    if (fingerprints.length === 0) return [];
    const results = await db
      .select()
      .from(contentFingerprints)
      .where(sql`${contentFingerprints.fingerprint} = ANY(${fingerprints})`);
    return results;
  }

  // Topic Clusters for RSS aggregation
  async getTopicClusters(filters?: { status?: string }): Promise<TopicCluster[]> {
    if (filters?.status) {
      return await db
        .select()
        .from(topicClusters)
        .where(eq(topicClusters.status, filters.status as any))
        .orderBy(desc(topicClusters.createdAt));
    }
    return await db.select().from(topicClusters).orderBy(desc(topicClusters.createdAt));
  }

  async getTopicCluster(id: string): Promise<TopicCluster | undefined> {
    const [cluster] = await db.select().from(topicClusters).where(eq(topicClusters.id, id));
    return cluster;
  }

  async createTopicCluster(cluster: InsertTopicCluster): Promise<TopicCluster> {
    const [created] = await db
      .insert(topicClusters)
      .values(cluster as any)
      .returning();
    return created;
  }

  async updateTopicCluster(
    id: string,
    data: Partial<InsertTopicCluster>
  ): Promise<TopicCluster | undefined> {
    const [updated] = await db
      .update(topicClusters)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(topicClusters.id, id))
      .returning();
    return updated;
  }

  async deleteTopicCluster(id: string): Promise<boolean> {
    await db.delete(topicClusters).where(eq(topicClusters.id, id));
    return true;
  }

  async getTopicClusterItems(clusterId: string): Promise<TopicClusterItem[]> {
    return await db
      .select()
      .from(topicClusterItems)
      .where(eq(topicClusterItems.clusterId, clusterId));
  }

  async createTopicClusterItem(item: InsertTopicClusterItem): Promise<TopicClusterItem> {
    const [created] = await db
      .insert(topicClusterItems)
      .values(item as any)
      .returning();
    return created;
  }

  async updateTopicClusterItem(
    id: string,
    data: Partial<InsertTopicClusterItem>
  ): Promise<TopicClusterItem | undefined> {
    const [updated] = await db
      .update(topicClusterItems)
      .set(data as any)
      .where(eq(topicClusterItems.id, id))
      .returning();
    return updated;
  }

  async findSimilarCluster(topic: string): Promise<TopicCluster | undefined> {
    // Basic text similarity search - find clusters with similar topics
    const topicLower = topic.toLowerCase().trim();
    const words = topicLower
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 5);
    if (words.length === 0) return undefined;

    const clusters = await db
      .select()
      .from(topicClusters)
      .where(eq(topicClusters.status, "pending"));

    // Find cluster with highest word overlap
    let bestMatch: TopicCluster | undefined;
    let bestScore = 0;

    for (const cluster of clusters) {
      const clusterWords = cluster.topic.toLowerCase().split(/\s+/);
      let matchCount = 0;
      for (const word of words) {
        if (clusterWords.some(cw => cw.includes(word) || word.includes(cw))) {
          matchCount++;
        }
      }
      const score = matchCount / Math.max(words.length, 1);
      if (score > 0.5 && score > bestScore) {
        bestScore = score;
        bestMatch = cluster;
      }
    }

    return bestMatch;
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

  async getHomepagePromotionsBySection(section: HomepageSection): Promise<HomepagePromotion[]> {
    return await db
      .select()
      .from(homepagePromotions)
      .where(eq(homepagePromotions.section, section))
      .orderBy(homepagePromotions.position);
  }

  async getHomepagePromotion(id: string): Promise<HomepagePromotion | undefined> {
    const [promotion] = await db
      .select()
      .from(homepagePromotions)
      .where(eq(homepagePromotions.id, id));
    return promotion;
  }

  async createHomepagePromotion(
    insertPromotion: InsertHomepagePromotion
  ): Promise<HomepagePromotion> {
    const [promotion] = await db
      .insert(homepagePromotions)
      .values(insertPromotion as any)
      .returning();
    return promotion;
  }

  async updateHomepagePromotion(
    id: string,
    updateData: Partial<InsertHomepagePromotion>
  ): Promise<HomepagePromotion | undefined> {
    const [promotion] = await db
      .update(homepagePromotions)
      .set(updateData as any)
      .where(eq(homepagePromotions.id, id))
      .returning();
    return promotion;
  }

  async deleteHomepagePromotion(id: string): Promise<boolean> {
    await db.delete(homepagePromotions).where(eq(homepagePromotions.id, id));
    return true;
  }

  async reorderHomepagePromotions(
    section: HomepageSection,
    orderedIds: string[]
  ): Promise<boolean> {
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(homepagePromotions)
        .set({ position: i } as any)
        .where(
          and(eq(homepagePromotions.id, orderedIds[i]), eq(homepagePromotions.section, section))
        );
    }
    return true;
  }

  async getAnalyticsOverview(): Promise<{
    totalViews: number;
    viewsToday: number;
    viewsThisWeek: number;
    viewsThisMonth: number;
  }> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(startOfToday);
    startOfMonth.setDate(startOfMonth.getDate() - 30);

    const [totalResult] = await db
      .select({ count: sql<number>`COALESCE(SUM(${contents.viewCount}), 0)::int` })
      .from(contents);

    const [todayResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(contentViews)
      .where(sql`${contentViews.viewedAt} >= ${startOfToday}`);

    const [weekResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(contentViews)
      .where(sql`${contentViews.viewedAt} >= ${startOfWeek}`);

    const [monthResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(contentViews)
      .where(sql`${contentViews.viewedAt} >= ${startOfMonth}`);

    return {
      totalViews: totalResult?.count || 0,
      viewsToday: todayResult?.count || 0,
      viewsThisWeek: weekResult?.count || 0,
      viewsThisMonth: monthResult?.count || 0,
    };
  }

  async getViewsOverTime(days: number): Promise<{ date: string; views: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`DATE(${contentViews.viewedAt})::text`,
        views: sql<number>`COUNT(*)::int`,
      })
      .from(contentViews)
      .where(sql`${contentViews.viewedAt} >= ${startDate}`)
      .groupBy(sql`DATE(${contentViews.viewedAt})`)
      .orderBy(sql`DATE(${contentViews.viewedAt})`);

    // Fill in missing dates with 0 views
    const dateMap = new Map(results.map(r => [r.date, r.views]));
    const filledResults: { date: string; views: number }[] = [];

    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      filledResults.push({
        date: dateStr,
        views: dateMap.get(dateStr) || 0,
      });
    }

    return filledResults;
  }

  async getTopContent(
    limit: number
  ): Promise<{ id: string; title: string; type: string; viewCount: number }[]> {
    const results = await db
      .select({
        id: contents.id,
        title: contents.title,
        type: contents.type,
        viewCount: contents.viewCount,
      })
      .from(contents)
      .orderBy(desc(contents.viewCount))
      .limit(limit);

    return results.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type,
      viewCount: r.viewCount || 0,
    }));
  }

  async getViewsByContentType(): Promise<{ type: string; views: number }[]> {
    const results = await db
      .select({
        type: contents.type,
        views: sql<number>`COALESCE(SUM(${contents.viewCount}), 0)::int`,
      })
      .from(contents)
      .groupBy(contents.type);

    return results.map(r => ({
      type: r.type,
      views: r.views || 0,
    }));
  }

  async recordContentView(
    contentId: string,
    data?: { userAgent?: string; referrer?: string; sessionId?: string }
  ): Promise<void> {
    await db.transaction(async tx => {
      await tx.insert(contentViews).values({
        contentId,
        userAgent: data?.userAgent,
        referrer: data?.referrer,
        sessionId: data?.sessionId,
      } as any);

      await tx
        .update(contents)
        .set({ viewCount: sql`COALESCE(${contents.viewCount}, 0) + 1` } as any)
        .where(eq(contents.id, contentId));
    });
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db
      .insert(auditLogs)
      .values(log as any)
      .returning();
    return auditLog;
  }

  async getAuditLogs(filters?: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    actionType?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    const conditions = [];
    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters?.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType as any));
    }
    if (filters?.entityId) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }
    if (filters?.actionType) {
      conditions.push(eq(auditLogs.actionType, filters.actionType as any));
    }

    const query = db.select().from(auditLogs);

    if (conditions.length > 0) {
      return await query
        .where(and(...conditions))
        .orderBy(desc(auditLogs.timestamp))
        .limit(filters?.limit || 100)
        .offset(filters?.offset || 0);
    }

    return await query
      .orderBy(desc(auditLogs.timestamp))
      .limit(filters?.limit || 100)
      .offset(filters?.offset || 0);
  }

  async getAuditLogCount(filters?: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    actionType?: string;
  }): Promise<number> {
    const conditions = [];
    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters?.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType as any));
    }
    if (filters?.entityId) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }
    if (filters?.actionType) {
      conditions.push(eq(auditLogs.actionType, filters.actionType as any));
    }

    if (conditions.length > 0) {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(and(...conditions));
      return result[0]?.count || 0;
    }

    const result = await db.select({ count: sql<number>`count(*)::int` }).from(auditLogs);
    return result[0]?.count || 0;
  }

  // Rate Limits - for persistent rate limiting
  async getRateLimit(key: string): Promise<{ count: number; resetAt: Date } | null> {
    const [limit] = await db.select().from(rateLimits).where(eq(rateLimits.key, key));
    if (!limit) return null;
    return { count: limit.count, resetAt: limit.resetAt };
  }

  async incrementRateLimit(key: string, resetAt: Date): Promise<{ count: number; resetAt: Date }> {
    // Use upsert with increment
    const [result] = await db
      .insert(rateLimits)
      .values({ key, count: 1, resetAt, updatedAt: new Date() } as any)
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`${rateLimits.count} + 1`,
          updatedAt: new Date(),
        } as any,
      })
      .returning();
    return { count: result.count, resetAt: result.resetAt };
  }

  async resetRateLimit(key: string, resetAt: Date): Promise<void> {
    await db
      .insert(rateLimits)
      .values({ key, count: 1, resetAt, updatedAt: new Date() } as any)
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: 1,
          resetAt,
          updatedAt: new Date(),
        } as any,
      });
  }

  async cleanupExpiredRateLimits(): Promise<number> {
    const result = await db
      .delete(rateLimits)
      .where(sql`${rateLimits.resetAt} < NOW()`)
      .returning();
    return result.length;
  }

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

  // Property Leads
  async getPropertyLeads(filters?: { status?: string }): Promise<PropertyLead[]> {
    if (filters?.status) {
      return await db
        .select()
        .from(propertyLeads)
        .where(eq(propertyLeads.status, filters.status as any))
        .orderBy(desc(propertyLeads.createdAt));
    }
    return await db.select().from(propertyLeads).orderBy(desc(propertyLeads.createdAt));
  }

  async getPropertyLead(id: string): Promise<PropertyLead | undefined> {
    const [lead] = await db.select().from(propertyLeads).where(eq(propertyLeads.id, id));
    return lead;
  }

  async createPropertyLead(lead: InsertPropertyLead): Promise<PropertyLead> {
    const [newLead] = await db
      .insert(propertyLeads)
      .values(lead as any)
      .returning();
    return newLead;
  }

  async updatePropertyLead(
    id: string,
    data: Partial<InsertPropertyLead>
  ): Promise<PropertyLead | undefined> {
    const [lead] = await db
      .update(propertyLeads)
      .set(data as any)
      .where(eq(propertyLeads.id, id))
      .returning();
    return lead;
  }

  async deletePropertyLead(id: string): Promise<boolean> {
    await db.delete(propertyLeads).where(eq(propertyLeads.id, id));
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

  // Content Clusters
  async getContentClusters(): Promise<ContentCluster[]> {
    return await db.select().from(contentClusters).orderBy(desc(contentClusters.createdAt));
  }

  async getContentCluster(id: string): Promise<ContentCluster | undefined> {
    const [cluster] = await db.select().from(contentClusters).where(eq(contentClusters.id, id));
    return cluster;
  }

  async getContentClusterBySlug(slug: string): Promise<ContentCluster | undefined> {
    const [cluster] = await db.select().from(contentClusters).where(eq(contentClusters.slug, slug));
    return cluster;
  }

  async createContentCluster(cluster: InsertContentCluster): Promise<ContentCluster> {
    const [newCluster] = await db
      .insert(contentClusters)
      .values(cluster as any)
      .returning();
    return newCluster;
  }

  async updateContentCluster(
    id: string,
    data: Partial<InsertContentCluster>
  ): Promise<ContentCluster | undefined> {
    const [cluster] = await db
      .update(contentClusters)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(contentClusters.id, id))
      .returning();
    return cluster;
  }

  async deleteContentCluster(id: string): Promise<boolean> {
    await db.delete(contentClusters).where(eq(contentClusters.id, id));
    return true;
  }

  // Cluster Members - Fixed N+1 with batch query
  async getClusterMembers(clusterId: string): Promise<(ClusterMember & { content?: Content })[]> {
    const members = await db
      .select()
      .from(clusterMembers)
      .where(eq(clusterMembers.clusterId, clusterId))
      .orderBy(clusterMembers.position);

    if (members.length === 0) return [];

    // Batch fetch all contents at once
    const contentIds = [...new Set(members.map(m => m.contentId))];
    const allContents = await db.select().from(contents).where(inArray(contents.id, contentIds));
    const contentMap = new Map(allContents.map(c => [c.id, c]));

    return members.map(member => ({ ...member, content: contentMap.get(member.contentId) }));
  }

  async addClusterMember(member: InsertClusterMember): Promise<ClusterMember> {
    const [newMember] = await db
      .insert(clusterMembers)
      .values(member as any)
      .returning();
    return newMember;
  }

  async removeClusterMember(id: string): Promise<boolean> {
    await db.delete(clusterMembers).where(eq(clusterMembers.id, id));
    return true;
  }

  async updateClusterMemberPosition(
    id: string,
    position: number
  ): Promise<ClusterMember | undefined> {
    const [member] = await db
      .update(clusterMembers)
      .set({ position } as any)
      .where(eq(clusterMembers.id, id))
      .returning();
    return member;
  }

  async getContentClusterMembership(
    contentId: string
  ): Promise<(ClusterMember & { cluster?: ContentCluster })[]> {
    const members = await db
      .select()
      .from(clusterMembers)
      .where(eq(clusterMembers.contentId, contentId));

    const result: (ClusterMember & { cluster?: ContentCluster })[] = [];
    for (const member of members) {
      const [cluster] = await db
        .select()
        .from(contentClusters)
        .where(eq(contentClusters.id, member.clusterId));
      result.push({ ...member, cluster });
    }
    return result;
  }

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

  // Bulk Operations
  async bulkUpdateContentStatus(ids: string[], status: string): Promise<number> {
    const result = await db
      .update(contents)
      .set({ status: status as any, updatedAt: new Date() } as any)
      .where(inArray(contents.id, ids))
      .returning();
    return result.length;
  }

  async bulkDeleteContents(ids: string[]): Promise<number> {
    const result = await db.delete(contents).where(inArray(contents.id, ids)).returning();
    return result.length;
  }

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

  // Content Templates
  async getContentTemplates(): Promise<ContentTemplate[]> {
    return await db
      .select()
      .from(contentTemplates)
      .orderBy(desc(contentTemplates.usageCount), contentTemplates.name);
  }

  async getContentTemplate(id: string): Promise<ContentTemplate | undefined> {
    const [template] = await db.select().from(contentTemplates).where(eq(contentTemplates.id, id));
    return template;
  }

  async createContentTemplate(template: InsertContentTemplate): Promise<ContentTemplate> {
    const [newTemplate] = await db
      .insert(contentTemplates)
      .values(template as any)
      .returning();
    return newTemplate;
  }

  async updateContentTemplate(
    id: string,
    data: Partial<InsertContentTemplate>
  ): Promise<ContentTemplate | undefined> {
    const [template] = await db
      .update(contentTemplates)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(contentTemplates.id, id))
      .returning();
    return template;
  }

  async deleteContentTemplate(id: string): Promise<boolean> {
    await db.delete(contentTemplates).where(eq(contentTemplates.id, id));
    return true;
  }

  async incrementTemplateUsage(id: string): Promise<void> {
    await db
      .update(contentTemplates)
      .set({ usageCount: sql`${contentTemplates.usageCount} + 1` } as any)
      .where(eq(contentTemplates.id, id));
  }

  // Site Settings
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

  // Media Usage Check - Optimized with database-level search
  async checkMediaUsage(
    mediaUrl: string
  ): Promise<{ isUsed: boolean; usedIn: { id: string; title: string; type: string }[] }> {
    // Use database LIKE/ILIKE to search in JSON blocks - avoids full table scan in JS
    // Combine heroImage check and blocks search in single queries
    const results = await db
      .select({ id: contents.id, title: contents.title, type: contents.type })
      .from(contents)
      .where(
        and(
          sql`${contents.deletedAt} IS NULL`,
          or(
            eq(contents.heroImage, mediaUrl),
            sql`${contents.blocks}::text LIKE ${`%${mediaUrl}%`}`
          )
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

  // OTP Codes
  async createOtpCode(data: InsertOtpCode): Promise<OtpCode> {
    const [code] = await db
      .insert(otpCodes)
      .values(data as any)
      .returning();
    return code;
  }

  async getValidOtpCode(email: string, code: string): Promise<OtpCode | undefined> {
    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          sql`LOWER(${otpCodes.email}) = LOWER(${email})`,
          eq(otpCodes.code, code),
          eq(otpCodes.used, false),
          sql`${otpCodes.expiresAt} > NOW()`
        )
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    return otp;
  }

  async markOtpAsUsed(id: string): Promise<void> {
    await db
      .update(otpCodes)
      .set({ used: true } as any)
      .where(eq(otpCodes.id, id));
  }

  // AI Writers Implementation
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

  // Live Chat Support Methods
  async getLiveChatConversations(
    status?: string
  ): Promise<(LiveChatConversation & { messages?: LiveChatMessage[] })[]> {
    const conditions = [];
    if (status) {
      conditions.push(eq(liveChatConversations.status, status as any));
    }

    const conversations = await db
      .select()
      .from(liveChatConversations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(liveChatConversations.lastMessageAt));

    // Get the latest message for each conversation
    const conversationsWithMessages = await Promise.all(
      conversations.map(async conv => {
        const messages = await db
          .select()
          .from(liveChatMessages)
          .where(eq(liveChatMessages.conversationId, conv.id))
          .orderBy(desc(liveChatMessages.createdAt))
          .limit(1);
        return { ...conv, messages };
      })
    );

    return conversationsWithMessages;
  }

  async getLiveChatConversation(
    id: string
  ): Promise<(LiveChatConversation & { messages: LiveChatMessage[] }) | undefined> {
    const [conversation] = await db
      .select()
      .from(liveChatConversations)
      .where(eq(liveChatConversations.id, id));

    if (!conversation) return undefined;

    const messages = await db
      .select()
      .from(liveChatMessages)
      .where(eq(liveChatMessages.conversationId, id))
      .orderBy(liveChatMessages.createdAt);

    return { ...conversation, messages };
  }

  async getLiveChatConversationByVisitor(
    visitorId: string
  ): Promise<LiveChatConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(liveChatConversations)
      .where(
        and(
          eq(liveChatConversations.visitorId, visitorId),
          eq(liveChatConversations.status, "open")
        )
      )
      .orderBy(desc(liveChatConversations.createdAt))
      .limit(1);

    return conversation;
  }

  async createLiveChatConversation(
    data: InsertLiveChatConversation
  ): Promise<LiveChatConversation> {
    const [conversation] = await db
      .insert(liveChatConversations)
      .values(data as any)
      .returning();
    return conversation;
  }

  async updateLiveChatConversation(
    id: string,
    data: Partial<InsertLiveChatConversation>
  ): Promise<LiveChatConversation | undefined> {
    const [conversation] = await db
      .update(liveChatConversations)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(liveChatConversations.id, id))
      .returning();
    return conversation;
  }

  async getLiveChatMessages(conversationId: string, since?: Date): Promise<LiveChatMessage[]> {
    const conditions = [eq(liveChatMessages.conversationId, conversationId)];
    if (since) {
      conditions.push(sql`${liveChatMessages.createdAt} > ${since}`);
    }

    return await db
      .select()
      .from(liveChatMessages)
      .where(and(...conditions))
      .orderBy(liveChatMessages.createdAt);
  }

  async createLiveChatMessage(data: InsertLiveChatMessage): Promise<LiveChatMessage> {
    const [message] = await db
      .insert(liveChatMessages)
      .values(data as any)
      .returning();

    // Update conversation's lastMessageAt and unread count
    await db
      .update(liveChatConversations)
      .set({
        lastMessageAt: new Date(),
        unreadCount: sql`${liveChatConversations.unreadCount} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(liveChatConversations.id, (data as any).conversationId));

    return message;
  }

  async markMessagesAsRead(conversationId: string, senderType: string): Promise<void> {
    // Mark messages from the opposite sender as read
    const oppositeType = senderType === "admin" ? "visitor" : "admin";

    await db
      .update(liveChatMessages)
      .set({ isRead: true } as any)
      .where(
        and(
          eq(liveChatMessages.conversationId, conversationId),
          eq(liveChatMessages.senderType, oppositeType),
          eq((liveChatMessages as any).isRead, false)
        )
      );

    // Reset unread count
    await db
      .update(liveChatConversations)
      .set({ unreadCount: 0 } as any)
      .where(eq(liveChatConversations.id, conversationId));
  }

  // Survey Builder Methods
  async getSurveys(filters?: { status?: string }): Promise<Survey[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(surveys.status, filters.status as any));
    }

    return await db
      .select()
      .from(surveys)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(surveys.createdAt));
  }

  async getSurvey(id: string): Promise<Survey | undefined> {
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
    return survey;
  }

  async getSurveyBySlug(slug: string): Promise<Survey | undefined> {
    const [survey] = await db.select().from(surveys).where(eq(surveys.slug, slug));
    return survey;
  }

  async createSurvey(data: InsertSurvey): Promise<Survey> {
    const [survey] = await db
      .insert(surveys)
      .values(data as any)
      .returning();
    return survey;
  }

  async updateSurvey(id: string, data: Partial<InsertSurvey>): Promise<Survey | undefined> {
    const [survey] = await db
      .update(surveys)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(surveys.id, id))
      .returning();
    return survey;
  }

  async deleteSurvey(id: string): Promise<boolean> {
    const result = await db.delete(surveys).where(eq(surveys.id, id));
    return true;
  }

  // Survey Response Methods
  async getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
    return await db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.surveyId, surveyId))
      .orderBy(desc(surveyResponses.createdAt));
  }

  async getSurveyResponse(id: string): Promise<SurveyResponse | undefined> {
    const [response] = await db.select().from(surveyResponses).where(eq(surveyResponses.id, id));
    return response;
  }

  async createSurveyResponse(data: InsertSurveyResponse): Promise<SurveyResponse> {
    const [response] = await db
      .insert(surveyResponses)
      .values(data as any)
      .returning();

    // Increment response count on survey
    await db
      .update(surveys)
      .set({
        responseCount: sql`${surveys.responseCount} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(surveys.id, (data as any).surveyId));

    return response;
  }

  async updateSurveyResponse(
    id: string,
    data: Partial<InsertSurveyResponse>
  ): Promise<SurveyResponse | undefined> {
    const [response] = await db
      .update(surveyResponses)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(surveyResponses.id, id))
      .returning();
    return response;
  }

  async deleteSurveyResponse(id: string): Promise<boolean> {
    const [response] = await db.select().from(surveyResponses).where(eq(surveyResponses.id, id));
    if (response) {
      await db.delete(surveyResponses).where(eq(surveyResponses.id, id));
      // Decrement response count
      await db
        .update(surveys)
        .set({
          responseCount: sql`GREATEST(${surveys.responseCount} - 1, 0)`,
        } as any)
        .where(eq(surveys.id, response.surveyId));
    }
    return true;
  }

  async getSurveyAnalytics(surveyId: string): Promise<{
    totalResponses: number;
    completedResponses: number;
    questionAnalytics: Record<
      string,
      {
        totalAnswers: number;
        answerDistribution: Record<string, number>;
      }
    >;
  }> {
    const responses = await this.getSurveyResponses(surveyId);
    const survey = await this.getSurvey(surveyId);

    const analytics = {
      totalResponses: responses.length,
      completedResponses: responses.filter(r => r.isComplete).length,
      questionAnalytics: {} as Record<
        string,
        { totalAnswers: number; answerDistribution: Record<string, number> }
      >,
    };

    // Process each question's answers
    if (survey?.definition?.questions) {
      for (const question of survey.definition.questions) {
        const questionId = question.id;
        const answerDistribution: Record<string, number> = {};
        let totalAnswers = 0;

        for (const response of responses) {
          const answer = response.answers[questionId];
          if (answer !== undefined && answer !== null && answer !== "") {
            totalAnswers++;
            if (Array.isArray(answer)) {
              // Checkbox (multiple answers)
              for (const a of answer) {
                answerDistribution[a] = (answerDistribution[a] || 0) + 1;
              }
            } else {
              answerDistribution[answer] = (answerDistribution[answer] || 0) + 1;
            }
          }
        }

        analytics.questionAnalytics[questionId] = {
          totalAnswers,
          answerDistribution,
        };
      }
    }

    return analytics;
  }

  // ============================================
  // REFERRAL SYSTEM METHODS
  // ============================================

  // Referral Codes
  async getReferralCodes(): Promise<ReferralCode[]> {
    return await db.select().from(referralCodes).orderBy(desc(referralCodes.createdAt));
  }

  async getReferralCode(id: string): Promise<ReferralCode | undefined> {
    const [code] = await db.select().from(referralCodes).where(eq(referralCodes.id, id));
    return code;
  }

  async getReferralCodeByCode(code: string): Promise<ReferralCode | undefined> {
    const [result] = await db.select().from(referralCodes).where(eq(referralCodes.code, code));
    return result;
  }

  async getReferralCodesByUser(userId: string): Promise<ReferralCode[]> {
    return await db.select().from(referralCodes).where(eq(referralCodes.userId, userId));
  }

  async createReferralCode(data: InsertReferralCode): Promise<ReferralCode> {
    const [code] = await db
      .insert(referralCodes)
      .values(data as any)
      .returning();
    return code;
  }

  async updateReferralCode(
    id: string,
    data: Partial<InsertReferralCode>
  ): Promise<ReferralCode | undefined> {
    const [code] = await db
      .update(referralCodes)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(referralCodes.id, id))
      .returning();
    return code;
  }

  async deleteReferralCode(id: string): Promise<boolean> {
    await db.delete(referralCodes).where(eq(referralCodes.id, id));
    return true;
  }

  async incrementReferralCodeClicks(id: string): Promise<void> {
    await db
      .update(referralCodes)
      .set({
        totalClicks: sql`${referralCodes.totalClicks} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(referralCodes.id, id));
  }

  async incrementReferralCodeSignups(id: string): Promise<void> {
    await db
      .update(referralCodes)
      .set({
        totalSignups: sql`${referralCodes.totalSignups} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(referralCodes.id, id));
  }

  async incrementReferralCodeConversions(id: string, commissionAmount: number): Promise<void> {
    await db
      .update(referralCodes)
      .set({
        totalConversions: sql`${referralCodes.totalConversions} + 1`,
        totalCommission: sql`${referralCodes.totalCommission} + ${commissionAmount}`,
        updatedAt: new Date(),
      } as any)
      .where(eq(referralCodes.id, id));
  }

  // Referral Clicks
  async createReferralClick(data: {
    referralCodeId: string;
    ipAddress?: string;
    userAgent?: string;
    referer?: string;
    landingPage?: string;
  }): Promise<ReferralClick> {
    const [click] = await db
      .insert(referralClicks)
      .values(data as any)
      .returning();
    return click;
  }

  async getReferralClicksByCode(referralCodeId: string): Promise<ReferralClick[]> {
    return await db
      .select()
      .from(referralClicks)
      .where(eq(referralClicks.referralCodeId, referralCodeId))
      .orderBy(desc(referralClicks.createdAt));
  }

  // Referrals
  async getReferrals(referralCodeId?: string): Promise<Referral[]> {
    if (referralCodeId) {
      return await db
        .select()
        .from(referrals)
        .where(eq(referrals.referralCodeId, referralCodeId))
        .orderBy(desc(referrals.createdAt));
    }
    return await db.select().from(referrals).orderBy(desc(referrals.createdAt));
  }

  async getReferral(id: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(referrals).where(eq(referrals.id, id));
    return referral;
  }

  async getReferralBySubscriber(subscriberId: string): Promise<Referral | undefined> {
    const [referral] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.subscriberId, subscriberId));
    return referral;
  }

  async createReferral(data: InsertReferral): Promise<Referral> {
    const [referral] = await db
      .insert(referrals)
      .values(data as any)
      .returning();
    return referral;
  }

  async updateReferral(
    id: string,
    data: Partial<InsertReferral> & { convertedAt?: Date }
  ): Promise<Referral | undefined> {
    const [referral] = await db
      .update(referrals)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(referrals.id, id))
      .returning();
    return referral;
  }

  // Referral Commissions
  async getCommissions(referralCodeId?: string): Promise<ReferralCommission[]> {
    if (referralCodeId) {
      return await db
        .select()
        .from(referralCommissions)
        .where(eq(referralCommissions.referralCodeId, referralCodeId))
        .orderBy(desc(referralCommissions.createdAt));
    }
    return await db.select().from(referralCommissions).orderBy(desc(referralCommissions.createdAt));
  }

  async getCommission(id: string): Promise<ReferralCommission | undefined> {
    const [commission] = await db
      .select()
      .from(referralCommissions)
      .where(eq(referralCommissions.id, id));
    return commission;
  }

  async createCommission(data: InsertReferralCommission): Promise<ReferralCommission> {
    const [commission] = await db
      .insert(referralCommissions)
      .values(data as any)
      .returning();
    return commission;
  }

  async updateCommission(
    id: string,
    data: Partial<InsertReferralCommission> & { approvedAt?: Date; paidAt?: Date }
  ): Promise<ReferralCommission | undefined> {
    const [commission] = await db
      .update(referralCommissions)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(referralCommissions.id, id))
      .returning();
    return commission;
  }

  // Referral Analytics
  async getReferralStats(): Promise<{
    totalCodes: number;
    activeCodes: number;
    totalClicks: number;
    totalSignups: number;
    totalConversions: number;
    totalCommission: number;
    pendingCommission: number;
  }> {
    const codes = await this.getReferralCodes();
    const commissions = await this.getCommissions();

    const pendingCommission = commissions
      .filter(c => c.status === "pending")
      .reduce((sum, c) => sum + c.amount, 0);

    return {
      totalCodes: codes.length,
      activeCodes: codes.filter(c => c.isActive).length,
      totalClicks: codes.reduce((sum, c) => sum + (c.totalClicks || 0), 0),
      totalSignups: codes.reduce((sum, c) => sum + (c.totalSignups || 0), 0),
      totalConversions: codes.reduce((sum, c) => sum + (c.totalConversions || 0), 0),
      totalCommission: codes.reduce((sum, c) => sum + (c.totalCommission || 0), 0),
      pendingCommission,
    };
  }
}

export const storage = new DatabaseStorage();

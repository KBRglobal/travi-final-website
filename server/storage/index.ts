// Re-export all storage modules
export * from "./base";

// Import storage instances (used locally by DatabaseStorage class)
import { usersStorage } from "./users.storage";
import { contentStorage } from "./content.storage";
import { contentTypesStorage } from "./content-types.storage";
import { rssStorage } from "./rss.storage";
import { affiliateStorage } from "./affiliate.storage";
import { mediaStorage } from "./media.storage";
import { topicBankStorage } from "./topic-bank.storage";
import { versionsStorage } from "./versions.storage";
import { translationsStorage } from "./translations.storage";
import { homepageStorage } from "./homepage.storage";
import { analyticsStorage } from "./analytics.storage";
import { auditStorage } from "./audit.storage";
import { newsletterStorage } from "./newsletter.storage";
import { propertyLeadsStorage } from "./property-leads.storage";
import { clustersStorage } from "./clusters.storage";
import { tagsStorage } from "./tags.storage";
import { bulkStorage } from "./bulk.storage";
import { templatesStorage } from "./templates.storage";
import { settingsStorage } from "./settings.storage";
import { otpStorage } from "./otp.storage";
import { aiWritersStorage } from "./ai-writers.storage";
import { liveChatStorage } from "./live-chat.storage";
import { surveysStorage } from "./surveys.storage";
import { referralsStorage } from "./referrals.storage";
import { editorialPlacementsStorage } from "./editorial-placements.storage";

// Export all storage classes and instances
export { UsersStorage, usersStorage } from "./users.storage";
export { ContentStorage, contentStorage } from "./content.storage";
export { ContentTypesStorage, contentTypesStorage } from "./content-types.storage";
export { RssStorage, rssStorage } from "./rss.storage";
export { AffiliateStorage, affiliateStorage } from "./affiliate.storage";
export { MediaStorage, mediaStorage } from "./media.storage";
export { TopicBankStorage, topicBankStorage } from "./topic-bank.storage";
export { VersionsStorage, versionsStorage } from "./versions.storage";
export { TranslationsStorage, translationsStorage } from "./translations.storage";
export { HomepageStorage, homepageStorage } from "./homepage.storage";
export { AnalyticsStorage, analyticsStorage } from "./analytics.storage";
export { AuditStorage, auditStorage } from "./audit.storage";
export { NewsletterStorage, newsletterStorage } from "./newsletter.storage";
export { PropertyLeadsStorage, propertyLeadsStorage } from "./property-leads.storage";
export { ClustersStorage, clustersStorage } from "./clusters.storage";
export { TagsStorage, tagsStorage } from "./tags.storage";
export { BulkStorage, bulkStorage } from "./bulk.storage";
export { TemplatesStorage, templatesStorage } from "./templates.storage";
export { SettingsStorage, settingsStorage } from "./settings.storage";
export { OtpStorage, otpStorage } from "./otp.storage";
export { AIWritersStorage, aiWritersStorage } from "./ai-writers.storage";
export { LiveChatStorage, liveChatStorage } from "./live-chat.storage";
export { SurveysStorage, surveysStorage } from "./surveys.storage";
export { ReferralsStorage, referralsStorage } from "./referrals.storage";
export {
  EditorialPlacementsStorage,
  editorialPlacementsStorage,
} from "./editorial-placements.storage";
export { VamsStorage, vamsStorage } from "./vams.storage";

// Import schema types for IStorage interface
import type {
  User,
  InsertUser,
  UpsertUser,
  Content,
  InsertContent,
  ContentWithRelations,
  Attraction,
  InsertAttraction,
  Hotel,
  InsertHotel,
  Article,
  InsertArticle,
  Event,
  InsertEvent,
  Itinerary,
  InsertItinerary,
  RssFeed,
  InsertRssFeed,
  AffiliateLink,
  InsertAffiliateLink,
  MediaFile,
  InsertMediaFile,
  InternalLink,
  InsertInternalLink,
  TopicBank,
  InsertTopicBank,
  KeywordRepository,
  InsertKeywordRepository,
  ContentVersion,
  InsertContentVersion,
  Translation,
  InsertTranslation,
  Locale,
  ContentFingerprint,
  InsertContentFingerprint,
  TopicCluster,
  InsertTopicCluster,
  TopicClusterItem,
  InsertTopicClusterItem,
  HomepagePromotion,
  InsertHomepagePromotion,
  HomepageSection,
  AuditLog,
  InsertAuditLog,
  NewsletterSubscriber,
  InsertNewsletterSubscriber,
  NewsletterCampaign,
  InsertCampaign,
  CampaignEvent,
  InsertCampaignEvent,
  EmailTemplate,
  InsertEmailTemplate,
  NewsletterAbTest,
  InsertNewsletterAbTest,
  SubscriberSegment,
  InsertSubscriberSegment,
  SegmentCondition,
  InsertSegmentCondition,
  PropertyLead,
  InsertPropertyLead,
  ContentCluster,
  InsertContentCluster,
  ClusterMember,
  InsertClusterMember,
  Tag,
  InsertTag,
  ContentTag,
  InsertContentTag,
  ContentTemplate,
  InsertContentTemplate,
  SiteSetting,
  AIWriter,
  LiveChatConversation,
  InsertLiveChatConversation,
  LiveChatMessage,
  InsertLiveChatMessage,
} from "./base";

// IStorage interface for backward compatibility
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

  getPropertyLeads(filters?: { status?: string }): Promise<PropertyLead[]>;
  getPropertyLead(id: string): Promise<PropertyLead | undefined>;
  createPropertyLead(lead: InsertPropertyLead): Promise<PropertyLead>;
  updatePropertyLead(
    id: string,
    data: Partial<InsertPropertyLead>
  ): Promise<PropertyLead | undefined>;
  deletePropertyLead(id: string): Promise<boolean>;

  getCampaigns(): Promise<NewsletterCampaign[]>;
  getCampaign(id: string): Promise<NewsletterCampaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<NewsletterCampaign>;
  updateCampaign(
    id: string,
    data: Partial<NewsletterCampaign>
  ): Promise<NewsletterCampaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;

  createCampaignEvent(event: InsertCampaignEvent): Promise<CampaignEvent>;
  getCampaignEvents(campaignId: string): Promise<CampaignEvent[]>;

  getEmailTemplates(filters?: { category?: string }): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(
    id: string,
    data: Partial<InsertEmailTemplate>
  ): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: string): Promise<boolean>;
  incrementTemplateUsageCount(id: string): Promise<void>;

  getNewsletterAbTests(filters?: { status?: string }): Promise<NewsletterAbTest[]>;
  getNewsletterAbTest(id: string): Promise<NewsletterAbTest | undefined>;
  createNewsletterAbTest(test: InsertNewsletterAbTest): Promise<NewsletterAbTest>;
  updateNewsletterAbTest(
    id: string,
    data: Partial<NewsletterAbTest>
  ): Promise<NewsletterAbTest | undefined>;
  deleteNewsletterAbTest(id: string): Promise<boolean>;

  getSubscriberSegments(): Promise<SubscriberSegment[]>;
  getSubscriberSegment(id: string): Promise<SubscriberSegment | undefined>;
  createSubscriberSegment(segment: InsertSubscriberSegment): Promise<SubscriberSegment>;
  updateSubscriberSegment(
    id: string,
    data: Partial<InsertSubscriberSegment>
  ): Promise<SubscriberSegment | undefined>;
  deleteSubscriberSegment(id: string): Promise<boolean>;

  getSegmentConditions(segmentId: string): Promise<SegmentCondition[]>;
  createSegmentCondition(condition: InsertSegmentCondition): Promise<SegmentCondition>;
  deleteSegmentCondition(id: string): Promise<boolean>;

  getContentClusters(): Promise<ContentCluster[]>;
  getContentCluster(id: string): Promise<ContentCluster | undefined>;
  getContentClusterBySlug(slug: string): Promise<ContentCluster | undefined>;
  createContentCluster(cluster: InsertContentCluster): Promise<ContentCluster>;
  updateContentCluster(
    id: string,
    data: Partial<InsertContentCluster>
  ): Promise<ContentCluster | undefined>;
  deleteContentCluster(id: string): Promise<boolean>;

  getClusterMembers(clusterId: string): Promise<(ClusterMember & { content?: Content })[]>;
  addClusterMember(member: InsertClusterMember): Promise<ClusterMember>;
  removeClusterMember(id: string): Promise<boolean>;
  updateClusterMemberPosition(id: string, position: number): Promise<ClusterMember | undefined>;
  getContentClusterMembership(
    contentId: string
  ): Promise<(ClusterMember & { cluster?: ContentCluster })[]>;

  getTags(): Promise<Tag[]>;
  getTag(id: string): Promise<Tag | undefined>;
  getTagBySlug(slug: string): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  updateTag(id: string, data: Partial<InsertTag>): Promise<Tag | undefined>;
  deleteTag(id: string): Promise<boolean>;

  getContentTags(contentId: string): Promise<(ContentTag & { tag?: Tag })[]>;
  getTagContents(tagId: string): Promise<(ContentTag & { content?: Content })[]>;
  addContentTag(contentTag: InsertContentTag): Promise<ContentTag>;
  removeContentTag(contentId: string, tagId: string): Promise<boolean>;
  updateTagUsageCount(tagId: string): Promise<void>;

  bulkUpdateContentStatus(ids: string[], status: string): Promise<number>;
  bulkDeleteContents(ids: string[]): Promise<number>;
  bulkAddTagToContents(contentIds: string[], tagId: string): Promise<number>;
  bulkRemoveTagFromContents(contentIds: string[], tagId: string): Promise<number>;

  getContentTemplates(): Promise<ContentTemplate[]>;
  getContentTemplate(id: string): Promise<ContentTemplate | undefined>;
  createContentTemplate(template: InsertContentTemplate): Promise<ContentTemplate>;
  updateContentTemplate(
    id: string,
    data: Partial<InsertContentTemplate>
  ): Promise<ContentTemplate | undefined>;
  deleteContentTemplate(id: string): Promise<boolean>;
  incrementTemplateUsage(id: string): Promise<void>;

  getSettings(): Promise<SiteSetting[]>;
  getSetting(key: string): Promise<SiteSetting | undefined>;
  upsertSetting(
    key: string,
    value: unknown,
    category: string,
    updatedBy?: string
  ): Promise<SiteSetting>;
  deleteSetting(key: string): Promise<boolean>;

  checkMediaUsage(
    mediaUrl: string
  ): Promise<{ isUsed: boolean; usedIn: { id: string; title: string; type: string }[] }>;

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

/**
 * DatabaseStorage class that combines all storage modules
 * This maintains backward compatibility with existing code that uses `storage.methodName()`
 */
export class DatabaseStorage implements IStorage {
  // Users
  getUser = usersStorage.getUser.bind(usersStorage);
  getUserByEmail = usersStorage.getUserByEmail.bind(usersStorage);
  getUserByUsername = usersStorage.getUserByUsername.bind(usersStorage);
  getUsers = usersStorage.getUsers.bind(usersStorage);
  createUser = usersStorage.createUser.bind(usersStorage);
  createUserWithPassword = usersStorage.createUserWithPassword.bind(usersStorage);
  updateUser = usersStorage.updateUser.bind(usersStorage);
  deleteUser = usersStorage.deleteUser.bind(usersStorage);
  upsertUser = usersStorage.upsertUser.bind(usersStorage);

  // Content
  getContents = contentStorage.getContents.bind(contentStorage);
  getContentsWithRelations = contentStorage.getContentsWithRelations.bind(contentStorage);
  getContent = contentStorage.getContent.bind(contentStorage);
  getContentBySlug = contentStorage.getContentBySlug.bind(contentStorage);
  createContent = contentStorage.createContent.bind(contentStorage);
  updateContent = contentStorage.updateContent.bind(contentStorage);
  deleteContent = contentStorage.deleteContent.bind(contentStorage);
  getScheduledContentToPublish = contentStorage.getScheduledContentToPublish.bind(contentStorage);
  publishScheduledContent = contentStorage.publishScheduledContent.bind(contentStorage);
  getStats = contentStorage.getStats.bind(contentStorage);

  // Content Types
  getAttraction = contentTypesStorage.getAttraction.bind(contentTypesStorage);
  createAttraction = contentTypesStorage.createAttraction.bind(contentTypesStorage);
  updateAttraction = contentTypesStorage.updateAttraction.bind(contentTypesStorage);
  getHotel = contentTypesStorage.getHotel.bind(contentTypesStorage);
  createHotel = contentTypesStorage.createHotel.bind(contentTypesStorage);
  updateHotel = contentTypesStorage.updateHotel.bind(contentTypesStorage);
  getArticle = contentTypesStorage.getArticle.bind(contentTypesStorage);
  createArticle = contentTypesStorage.createArticle.bind(contentTypesStorage);
  updateArticle = contentTypesStorage.updateArticle.bind(contentTypesStorage);
  getEvent = contentTypesStorage.getEvent.bind(contentTypesStorage);
  createEvent = contentTypesStorage.createEvent.bind(contentTypesStorage);
  updateEvent = contentTypesStorage.updateEvent.bind(contentTypesStorage);
  getItinerary = contentTypesStorage.getItinerary.bind(contentTypesStorage);
  createItinerary = contentTypesStorage.createItinerary.bind(contentTypesStorage);
  updateItinerary = contentTypesStorage.updateItinerary.bind(contentTypesStorage);
  getDining = contentTypesStorage.getDining.bind(contentTypesStorage);
  createDining = contentTypesStorage.createDining.bind(contentTypesStorage);
  updateDining = contentTypesStorage.updateDining.bind(contentTypesStorage);
  getDistrict = contentTypesStorage.getDistrict.bind(contentTypesStorage);
  createDistrict = contentTypesStorage.createDistrict.bind(contentTypesStorage);
  updateDistrict = contentTypesStorage.updateDistrict.bind(contentTypesStorage);
  getTransport = contentTypesStorage.getTransport.bind(contentTypesStorage);
  createTransport = contentTypesStorage.createTransport.bind(contentTypesStorage);
  updateTransport = contentTypesStorage.updateTransport.bind(contentTypesStorage);

  // RSS
  getRssFeeds = rssStorage.getRssFeeds.bind(rssStorage);
  getRssFeed = rssStorage.getRssFeed.bind(rssStorage);
  createRssFeed = rssStorage.createRssFeed.bind(rssStorage);
  updateRssFeed = rssStorage.updateRssFeed.bind(rssStorage);
  deleteRssFeed = rssStorage.deleteRssFeed.bind(rssStorage);
  getContentFingerprintByHash = rssStorage.getContentFingerprintByHash.bind(rssStorage);
  getContentFingerprintsByFeedId = rssStorage.getContentFingerprintsByFeedId.bind(rssStorage);
  createContentFingerprint = rssStorage.createContentFingerprint.bind(rssStorage);
  checkDuplicateFingerprints = rssStorage.checkDuplicateFingerprints.bind(rssStorage);
  getTopicClusters = rssStorage.getTopicClusters.bind(rssStorage);
  getTopicCluster = rssStorage.getTopicCluster.bind(rssStorage);
  createTopicCluster = rssStorage.createTopicCluster.bind(rssStorage);
  updateTopicCluster = rssStorage.updateTopicCluster.bind(rssStorage);
  deleteTopicCluster = rssStorage.deleteTopicCluster.bind(rssStorage);
  getTopicClusterItems = rssStorage.getTopicClusterItems.bind(rssStorage);
  createTopicClusterItem = rssStorage.createTopicClusterItem.bind(rssStorage);
  updateTopicClusterItem = rssStorage.updateTopicClusterItem.bind(rssStorage);
  findSimilarCluster = rssStorage.findSimilarCluster.bind(rssStorage);

  // Affiliate
  getAffiliateLinks = affiliateStorage.getAffiliateLinks.bind(affiliateStorage);
  getAffiliateLink = affiliateStorage.getAffiliateLink.bind(affiliateStorage);
  createAffiliateLink = affiliateStorage.createAffiliateLink.bind(affiliateStorage);
  updateAffiliateLink = affiliateStorage.updateAffiliateLink.bind(affiliateStorage);
  deleteAffiliateLink = affiliateStorage.deleteAffiliateLink.bind(affiliateStorage);

  // Media
  getMediaFiles = mediaStorage.getMediaFiles.bind(mediaStorage);
  getMediaFile = mediaStorage.getMediaFile.bind(mediaStorage);
  createMediaFile = mediaStorage.createMediaFile.bind(mediaStorage);
  updateMediaFile = mediaStorage.updateMediaFile.bind(mediaStorage);
  deleteMediaFile = mediaStorage.deleteMediaFile.bind(mediaStorage);
  checkMediaUsage = mediaStorage.checkMediaUsage.bind(mediaStorage);
  getInternalLinks = mediaStorage.getInternalLinks.bind(mediaStorage);
  createInternalLink = mediaStorage.createInternalLink.bind(mediaStorage);
  deleteInternalLink = mediaStorage.deleteInternalLink.bind(mediaStorage);

  // Topic Bank
  getTopicBankItems = topicBankStorage.getTopicBankItems.bind(topicBankStorage);
  getTopicBankItem = topicBankStorage.getTopicBankItem.bind(topicBankStorage);
  createTopicBankItem = topicBankStorage.createTopicBankItem.bind(topicBankStorage);
  updateTopicBankItem = topicBankStorage.updateTopicBankItem.bind(topicBankStorage);
  deleteTopicBankItem = topicBankStorage.deleteTopicBankItem.bind(topicBankStorage);
  incrementTopicUsage = topicBankStorage.incrementTopicUsage.bind(topicBankStorage);
  getKeywords = topicBankStorage.getKeywords.bind(topicBankStorage);
  getKeyword = topicBankStorage.getKeyword.bind(topicBankStorage);
  createKeyword = topicBankStorage.createKeyword.bind(topicBankStorage);
  updateKeyword = topicBankStorage.updateKeyword.bind(topicBankStorage);
  deleteKeyword = topicBankStorage.deleteKeyword.bind(topicBankStorage);
  incrementKeywordUsage = topicBankStorage.incrementKeywordUsage.bind(topicBankStorage);

  // Versions
  getContentVersions = versionsStorage.getContentVersions.bind(versionsStorage);
  getContentVersion = versionsStorage.getContentVersion.bind(versionsStorage);
  createContentVersion = versionsStorage.createContentVersion.bind(versionsStorage);
  getLatestVersionNumber = versionsStorage.getLatestVersionNumber.bind(versionsStorage);

  // Translations
  getAllTranslations = translationsStorage.getAllTranslations.bind(translationsStorage);
  getTranslationsByContentId =
    translationsStorage.getTranslationsByContentId.bind(translationsStorage);
  getTranslation = translationsStorage.getTranslation.bind(translationsStorage);
  getTranslationById = translationsStorage.getTranslationById.bind(translationsStorage);
  createTranslation = translationsStorage.createTranslation.bind(translationsStorage);
  updateTranslation = translationsStorage.updateTranslation.bind(translationsStorage);
  deleteTranslation = translationsStorage.deleteTranslation.bind(translationsStorage);

  // Homepage
  getHomepagePromotionsBySection =
    homepageStorage.getHomepagePromotionsBySection.bind(homepageStorage);
  getHomepagePromotion = homepageStorage.getHomepagePromotion.bind(homepageStorage);
  createHomepagePromotion = homepageStorage.createHomepagePromotion.bind(homepageStorage);
  updateHomepagePromotion = homepageStorage.updateHomepagePromotion.bind(homepageStorage);
  deleteHomepagePromotion = homepageStorage.deleteHomepagePromotion.bind(homepageStorage);
  reorderHomepagePromotions = homepageStorage.reorderHomepagePromotions.bind(homepageStorage);

  // Analytics
  getAnalyticsOverview = analyticsStorage.getAnalyticsOverview.bind(analyticsStorage);
  getViewsOverTime = analyticsStorage.getViewsOverTime.bind(analyticsStorage);
  getTopContent = analyticsStorage.getTopContent.bind(analyticsStorage);
  getViewsByContentType = analyticsStorage.getViewsByContentType.bind(analyticsStorage);
  recordContentView = analyticsStorage.recordContentView.bind(analyticsStorage);

  // Audit
  createAuditLog = auditStorage.createAuditLog.bind(auditStorage);
  getAuditLogs = auditStorage.getAuditLogs.bind(auditStorage);
  getAuditLogCount = auditStorage.getAuditLogCount.bind(auditStorage);
  getRateLimit = auditStorage.getRateLimit.bind(auditStorage);
  incrementRateLimit = auditStorage.incrementRateLimit.bind(auditStorage);
  resetRateLimit = auditStorage.resetRateLimit.bind(auditStorage);
  cleanupExpiredRateLimits = auditStorage.cleanupExpiredRateLimits.bind(auditStorage);

  // Newsletter
  getNewsletterSubscribers = newsletterStorage.getNewsletterSubscribers.bind(newsletterStorage);
  getActiveNewsletterSubscribers =
    newsletterStorage.getActiveNewsletterSubscribers.bind(newsletterStorage);
  getNewsletterSubscriber = newsletterStorage.getNewsletterSubscriber.bind(newsletterStorage);
  getNewsletterSubscriberByEmail =
    newsletterStorage.getNewsletterSubscriberByEmail.bind(newsletterStorage);
  getNewsletterSubscriberByToken =
    newsletterStorage.getNewsletterSubscriberByToken.bind(newsletterStorage);
  createNewsletterSubscriber = newsletterStorage.createNewsletterSubscriber.bind(newsletterStorage);
  updateNewsletterSubscriber = newsletterStorage.updateNewsletterSubscriber.bind(newsletterStorage);
  deleteNewsletterSubscriber = newsletterStorage.deleteNewsletterSubscriber.bind(newsletterStorage);
  getCampaigns = newsletterStorage.getCampaigns.bind(newsletterStorage);
  getCampaign = newsletterStorage.getCampaign.bind(newsletterStorage);
  createCampaign = newsletterStorage.createCampaign.bind(newsletterStorage);
  updateCampaign = newsletterStorage.updateCampaign.bind(newsletterStorage);
  deleteCampaign = newsletterStorage.deleteCampaign.bind(newsletterStorage);
  createCampaignEvent = newsletterStorage.createCampaignEvent.bind(newsletterStorage);
  getCampaignEvents = newsletterStorage.getCampaignEvents.bind(newsletterStorage);
  getEmailTemplates = newsletterStorage.getEmailTemplates.bind(newsletterStorage);
  getEmailTemplate = newsletterStorage.getEmailTemplate.bind(newsletterStorage);
  createEmailTemplate = newsletterStorage.createEmailTemplate.bind(newsletterStorage);
  updateEmailTemplate = newsletterStorage.updateEmailTemplate.bind(newsletterStorage);
  deleteEmailTemplate = newsletterStorage.deleteEmailTemplate.bind(newsletterStorage);
  incrementTemplateUsageCount =
    newsletterStorage.incrementTemplateUsageCount.bind(newsletterStorage);
  getNewsletterAbTests = newsletterStorage.getNewsletterAbTests.bind(newsletterStorage);
  getNewsletterAbTest = newsletterStorage.getNewsletterAbTest.bind(newsletterStorage);
  createNewsletterAbTest = newsletterStorage.createNewsletterAbTest.bind(newsletterStorage);
  updateNewsletterAbTest = newsletterStorage.updateNewsletterAbTest.bind(newsletterStorage);
  deleteNewsletterAbTest = newsletterStorage.deleteNewsletterAbTest.bind(newsletterStorage);
  getSubscriberSegments = newsletterStorage.getSubscriberSegments.bind(newsletterStorage);
  getSubscriberSegment = newsletterStorage.getSubscriberSegment.bind(newsletterStorage);
  createSubscriberSegment = newsletterStorage.createSubscriberSegment.bind(newsletterStorage);
  updateSubscriberSegment = newsletterStorage.updateSubscriberSegment.bind(newsletterStorage);
  deleteSubscriberSegment = newsletterStorage.deleteSubscriberSegment.bind(newsletterStorage);
  getSegmentConditions = newsletterStorage.getSegmentConditions.bind(newsletterStorage);
  createSegmentCondition = newsletterStorage.createSegmentCondition.bind(newsletterStorage);
  deleteSegmentCondition = newsletterStorage.deleteSegmentCondition.bind(newsletterStorage);

  // Property Leads
  getPropertyLeads = propertyLeadsStorage.getPropertyLeads.bind(propertyLeadsStorage);
  getPropertyLead = propertyLeadsStorage.getPropertyLead.bind(propertyLeadsStorage);
  createPropertyLead = propertyLeadsStorage.createPropertyLead.bind(propertyLeadsStorage);
  updatePropertyLead = propertyLeadsStorage.updatePropertyLead.bind(propertyLeadsStorage);
  deletePropertyLead = propertyLeadsStorage.deletePropertyLead.bind(propertyLeadsStorage);

  // Clusters
  getContentClusters = clustersStorage.getContentClusters.bind(clustersStorage);
  getContentCluster = clustersStorage.getContentCluster.bind(clustersStorage);
  getContentClusterBySlug = clustersStorage.getContentClusterBySlug.bind(clustersStorage);
  createContentCluster = clustersStorage.createContentCluster.bind(clustersStorage);
  updateContentCluster = clustersStorage.updateContentCluster.bind(clustersStorage);
  deleteContentCluster = clustersStorage.deleteContentCluster.bind(clustersStorage);
  getClusterMembers = clustersStorage.getClusterMembers.bind(clustersStorage);
  addClusterMember = clustersStorage.addClusterMember.bind(clustersStorage);
  removeClusterMember = clustersStorage.removeClusterMember.bind(clustersStorage);
  updateClusterMemberPosition = clustersStorage.updateClusterMemberPosition.bind(clustersStorage);
  getContentClusterMembership = clustersStorage.getContentClusterMembership.bind(clustersStorage);

  // Tags
  getTags = tagsStorage.getTags.bind(tagsStorage);
  getTag = tagsStorage.getTag.bind(tagsStorage);
  getTagBySlug = tagsStorage.getTagBySlug.bind(tagsStorage);
  createTag = tagsStorage.createTag.bind(tagsStorage);
  updateTag = tagsStorage.updateTag.bind(tagsStorage);
  deleteTag = tagsStorage.deleteTag.bind(tagsStorage);
  getContentTags = tagsStorage.getContentTags.bind(tagsStorage);
  getTagContents = tagsStorage.getTagContents.bind(tagsStorage);
  addContentTag = tagsStorage.addContentTag.bind(tagsStorage);
  removeContentTag = tagsStorage.removeContentTag.bind(tagsStorage);
  updateTagUsageCount = tagsStorage.updateTagUsageCount.bind(tagsStorage);
  bulkAddTagToContents = tagsStorage.bulkAddTagToContents.bind(tagsStorage);
  bulkRemoveTagFromContents = tagsStorage.bulkRemoveTagFromContents.bind(tagsStorage);

  // Bulk
  bulkUpdateContentStatus = bulkStorage.bulkUpdateContentStatus.bind(bulkStorage);
  bulkDeleteContents = bulkStorage.bulkDeleteContents.bind(bulkStorage);

  // Templates
  getContentTemplates = templatesStorage.getContentTemplates.bind(templatesStorage);
  getContentTemplate = templatesStorage.getContentTemplate.bind(templatesStorage);
  createContentTemplate = templatesStorage.createContentTemplate.bind(templatesStorage);
  updateContentTemplate = templatesStorage.updateContentTemplate.bind(templatesStorage);
  deleteContentTemplate = templatesStorage.deleteContentTemplate.bind(templatesStorage);
  incrementTemplateUsage = templatesStorage.incrementTemplateUsage.bind(templatesStorage);

  // Settings
  getSettings = settingsStorage.getSettings.bind(settingsStorage);
  getSetting = settingsStorage.getSetting.bind(settingsStorage);
  upsertSetting = settingsStorage.upsertSetting.bind(settingsStorage);
  deleteSetting = settingsStorage.deleteSetting.bind(settingsStorage);

  // OTP
  createOtpCode = otpStorage.createOtpCode.bind(otpStorage);
  getValidOtpCode = otpStorage.getValidOtpCode.bind(otpStorage);
  markOtpAsUsed = otpStorage.markOtpAsUsed.bind(otpStorage);

  // AI Writers
  getAllWriters = aiWritersStorage.getAllWriters.bind(aiWritersStorage);
  getWriterStats = aiWritersStorage.getWriterStats.bind(aiWritersStorage);
  getWriterBySlug = aiWritersStorage.getWriterBySlug.bind(aiWritersStorage);
  seedWritersFromConfig = aiWritersStorage.seedWritersFromConfig.bind(aiWritersStorage);
  updateWriter = aiWritersStorage.updateWriter.bind(aiWritersStorage);

  // Live Chat
  getLiveChatConversations = liveChatStorage.getLiveChatConversations.bind(liveChatStorage);
  getLiveChatConversation = liveChatStorage.getLiveChatConversation.bind(liveChatStorage);
  getLiveChatConversationByVisitor =
    liveChatStorage.getLiveChatConversationByVisitor.bind(liveChatStorage);
  createLiveChatConversation = liveChatStorage.createLiveChatConversation.bind(liveChatStorage);
  updateLiveChatConversation = liveChatStorage.updateLiveChatConversation.bind(liveChatStorage);
  getLiveChatMessages = liveChatStorage.getLiveChatMessages.bind(liveChatStorage);
  createLiveChatMessage = liveChatStorage.createLiveChatMessage.bind(liveChatStorage);
  markMessagesAsRead = liveChatStorage.markMessagesAsRead.bind(liveChatStorage);

  // Surveys
  getSurveys = surveysStorage.getSurveys.bind(surveysStorage);
  getSurvey = surveysStorage.getSurvey.bind(surveysStorage);
  getSurveyBySlug = surveysStorage.getSurveyBySlug.bind(surveysStorage);
  createSurvey = surveysStorage.createSurvey.bind(surveysStorage);
  updateSurvey = surveysStorage.updateSurvey.bind(surveysStorage);
  deleteSurvey = surveysStorage.deleteSurvey.bind(surveysStorage);
  getSurveyResponses = surveysStorage.getSurveyResponses.bind(surveysStorage);
  getSurveyResponse = surveysStorage.getSurveyResponse.bind(surveysStorage);
  createSurveyResponse = surveysStorage.createSurveyResponse.bind(surveysStorage);
  updateSurveyResponse = surveysStorage.updateSurveyResponse.bind(surveysStorage);
  deleteSurveyResponse = surveysStorage.deleteSurveyResponse.bind(surveysStorage);
  getSurveyAnalytics = surveysStorage.getSurveyAnalytics.bind(surveysStorage);

  // Referrals
  getReferralCodes = referralsStorage.getReferralCodes.bind(referralsStorage);
  getReferralCode = referralsStorage.getReferralCode.bind(referralsStorage);
  getReferralCodeByCode = referralsStorage.getReferralCodeByCode.bind(referralsStorage);
  getReferralCodesByUser = referralsStorage.getReferralCodesByUser.bind(referralsStorage);
  createReferralCode = referralsStorage.createReferralCode.bind(referralsStorage);
  updateReferralCode = referralsStorage.updateReferralCode.bind(referralsStorage);
  deleteReferralCode = referralsStorage.deleteReferralCode.bind(referralsStorage);
  incrementReferralCodeClicks = referralsStorage.incrementReferralCodeClicks.bind(referralsStorage);
  incrementReferralCodeSignups =
    referralsStorage.incrementReferralCodeSignups.bind(referralsStorage);
  incrementReferralCodeConversions =
    referralsStorage.incrementReferralCodeConversions.bind(referralsStorage);
  createReferralClick = referralsStorage.createReferralClick.bind(referralsStorage);
  getReferralClicksByCode = referralsStorage.getReferralClicksByCode.bind(referralsStorage);
  getReferrals = referralsStorage.getReferrals.bind(referralsStorage);
  getReferral = referralsStorage.getReferral.bind(referralsStorage);
  getReferralBySubscriber = referralsStorage.getReferralBySubscriber.bind(referralsStorage);
  createReferral = referralsStorage.createReferral.bind(referralsStorage);
  updateReferral = referralsStorage.updateReferral.bind(referralsStorage);
  getCommissions = referralsStorage.getCommissions.bind(referralsStorage);
  getCommission = referralsStorage.getCommission.bind(referralsStorage);
  createCommission = referralsStorage.createCommission.bind(referralsStorage);
  updateCommission = referralsStorage.updateCommission.bind(referralsStorage);
  getReferralStats = referralsStorage.getReferralStats.bind(referralsStorage);

  // Editorial Placements
  getPlacementsByZone = editorialPlacementsStorage.getPlacementsByZone.bind(
    editorialPlacementsStorage
  );
  getActivePlacements = editorialPlacementsStorage.getActivePlacements.bind(
    editorialPlacementsStorage
  );
  getPlacement = editorialPlacementsStorage.getPlacement.bind(editorialPlacementsStorage);
  getPlacementByContent = editorialPlacementsStorage.getPlacementByContent.bind(
    editorialPlacementsStorage
  );
  createPlacement = editorialPlacementsStorage.createPlacement.bind(editorialPlacementsStorage);
  updatePlacement = editorialPlacementsStorage.updatePlacement.bind(editorialPlacementsStorage);
  deletePlacement = editorialPlacementsStorage.deletePlacement.bind(editorialPlacementsStorage);
  rotatePlacement = editorialPlacementsStorage.rotatePlacement.bind(editorialPlacementsStorage);
  incrementPlacementImpressions = editorialPlacementsStorage.incrementImpressions.bind(
    editorialPlacementsStorage
  );
  incrementPlacementClicks = editorialPlacementsStorage.incrementClicks.bind(
    editorialPlacementsStorage
  );
  reorderPlacements = editorialPlacementsStorage.reorderPlacements.bind(editorialPlacementsStorage);
  createRotationHistory = editorialPlacementsStorage.createRotationHistory.bind(
    editorialPlacementsStorage
  );
  getRotationHistory = editorialPlacementsStorage.getRotationHistory.bind(
    editorialPlacementsStorage
  );
  getZoneConfigs = editorialPlacementsStorage.getZoneConfigs.bind(editorialPlacementsStorage);
  getZoneConfig = editorialPlacementsStorage.getZoneConfig.bind(editorialPlacementsStorage);
  upsertZoneConfig = editorialPlacementsStorage.upsertZoneConfig.bind(editorialPlacementsStorage);
  getScheduledItems = editorialPlacementsStorage.getScheduledItems.bind(editorialPlacementsStorage);
  createScheduledItem = editorialPlacementsStorage.createScheduledItem.bind(
    editorialPlacementsStorage
  );
  updateScheduledItem = editorialPlacementsStorage.updateScheduledItem.bind(
    editorialPlacementsStorage
  );
  markScheduleExecuted = editorialPlacementsStorage.markScheduleExecuted.bind(
    editorialPlacementsStorage
  );
  deleteScheduledItem = editorialPlacementsStorage.deleteScheduledItem.bind(
    editorialPlacementsStorage
  );
  getDueScheduledItems = editorialPlacementsStorage.getDueScheduledItems.bind(
    editorialPlacementsStorage
  );
  getPlacementsNeedingRotation = editorialPlacementsStorage.getPlacementsNeedingRotation.bind(
    editorialPlacementsStorage
  );
  getExpiredPlacements = editorialPlacementsStorage.getExpiredPlacements.bind(
    editorialPlacementsStorage
  );
  getZoneStats = editorialPlacementsStorage.getZoneStats.bind(editorialPlacementsStorage);
  getTopPerformingContent = editorialPlacementsStorage.getTopPerformingContent.bind(
    editorialPlacementsStorage
  );
}

// Export singleton instance for backward compatibility
export const storage = new DatabaseStorage();

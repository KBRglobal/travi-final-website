import { lazy } from "react";

// Public Pages
export const Homepage = lazy(() => import("@/pages/homepage"));
export const Attractions = lazy(() => import("@/pages/attractions"));
export const HotelsPage = lazy(() => import("@/pages/hotels"));
export const PublicArticles = lazy(() => import("@/pages/public-articles"));
export const PublicEvents = lazy(() => import("@/pages/public-events"));
export const PublicSearch = lazy(() => import("@/pages/public-search"));
export const PublicOffPlan = lazy(() => import("@/pages/public-off-plan"));

// Glossary & Resources
export const GlossaryHub = lazy(() => import("@/pages/glossary-hub"));

// Destination Pages
export const DestinationsLanding = lazy(() => import("@/pages/destinations"));
export const DestinationPage = lazy(() => import("@/pages/destination-page"));
export const DestinationAttractions = lazy(() => import("@/pages/destination-attractions"));
export const DestinationDining = lazy(() => import("@/pages/destination-dining"));

// Other Public Pages
export const PublicShopping = lazy(() => import("@/pages/public-shopping"));
export const PublicNews = lazy(() => import("@/pages/public-news"));
export const PublicContentViewer = lazy(() => import("@/pages/public-content-viewer"));
export const PublicDocs = lazy(() => import("@/pages/public-docs"));

// Legal Pages
export const PrivacyPolicy = lazy(() => import("@/pages/privacy"));
export const TermsConditions = lazy(() => import("@/pages/terms"));
export const CookiePolicy = lazy(() => import("@/pages/cookies"));
export const SecurityPolicy = lazy(() => import("@/pages/security"));
export const AffiliateDisclosure = lazy(() => import("@/pages/affiliate-disclosure"));

// About & Contact
export const PublicAbout = lazy(() => import("@/pages/about"));
export const PublicContact = lazy(() => import("@/pages/contact"));

// Help Center
export const HelpCenterPublic = lazy(() => import("@/pages/help"));
export const HelpCategory = lazy(() => import("@/pages/help/category"));
export const HelpArticle = lazy(() => import("@/pages/help/article"));

// Survey Pages
export const PublicSurvey = lazy(() => import("@/pages/public-survey"));

// Partner Pages
export const PartnersJoin = lazy(() => import("@/pages/partners-join"));
export const PartnersDashboard = lazy(() => import("@/pages/partners-dashboard"));

// Auth Pages
export const Login = lazy(() => import("@/pages/login"));
export const AccessDenied = lazy(() => import("@/pages/access-denied"));
export const NotFound = lazy(() => import("@/pages/not-found"));

// Admin Pages
export const Dashboard = lazy(() => import("@/pages/dashboard"));
export const ContentList = lazy(() => import("@/pages/content-list"));
export const ContentEditor = lazy(() => import("@/pages/content-editor"));
export const RssFeeds = lazy(() => import("@/pages/rss-feeds"));
export const AffiliateLinks = lazy(() => import("@/pages/affiliate-links"));
export const MediaLibrary = lazy(() => import("@/pages/media-library"));
export const ImageEngine = lazy(() => import("@/pages/admin-image-engine"));
export const Settings = lazy(() => import("@/pages/settings"));
export const ContentRulesPage = lazy(() => import("@/pages/content-rules"));
export const AIArticleGenerator = lazy(() => import("@/pages/ai-article-generator"));
export const TopicBankPage = lazy(() => import("@/pages/topic-bank"));
export const KeywordsPage = lazy(() => import("@/pages/keywords"));
export const ClustersPage = lazy(() => import("@/pages/clusters"));
export const TagsPage = lazy(() => import("@/pages/tags"));
export const UsersPage = lazy(() => import("@/pages/users"));
export const HomepagePromotions = lazy(() => import("@/pages/homepage-promotions"));
export const Analytics = lazy(() => import("@/pages/analytics"));
export const AuditLogs = lazy(() => import("@/pages/audit-logs"));
export const AdminLogs = lazy(() => import("@/pages/admin-logs"));
export const NewsletterSubscribers = lazy(() => import("@/pages/newsletter-subscribers"));
export const Campaigns = lazy(() => import("@/pages/campaigns"));
export const TranslationsPage = lazy(() => import("@/pages/translations"));
export const ContentCalendarPage = lazy(() => import("@/pages/content-calendar"));
export const ContentTemplatesPage = lazy(() => import("@/pages/content-templates"));
export const SEOAuditPage = lazy(() => import("@/pages/seo-audit"));
export const AutoPilotPage = lazy(() => import("@/pages/admin/auto-pilot"));
export const SocialDashboard = lazy(() => import("@/pages/admin/social/social-dashboard"));
export const GrowthDashboard = lazy(() => import("@/pages/admin/growth-dashboard"));
export const AEODashboard = lazy(() => import("@/pages/admin/aeo-dashboard"));
export const ContentIntelligencePage = lazy(() => import("@/pages/admin/content-intelligence"));
export const AIQualityToolsPage = lazy(() => import("@/pages/admin/ai-quality-tools"));
export const DestinationIntelligencePage = lazy(() => import("@/pages/admin/destination-intelligence"));
export const DestinationsListPage = lazy(() => import("@/pages/admin/destinations/destinations-list"));
export const DestinationHubPage = lazy(() => import("@/pages/admin/destinations/destination-hub"));
export const SecurityPage = lazy(() => import("@/pages/admin/security"));
export const SiteSettingsPage = lazy(() => import("@/pages/admin/site-settings"));
export const NavigationManagerPage = lazy(() => import("@/pages/admin/navigation-manager"));
export const FooterManagerPage = lazy(() => import("@/pages/admin/footer-manager"));
export const HomepageEditorPage = lazy(() => import("@/pages/admin/homepage-editor"));
export const StaticPagesPage = lazy(() => import("@/pages/admin/static-pages"));
export const StaticPageEditorPage = lazy(() => import("@/pages/admin/static-page-editor"));
export const PageBuilderPage = lazy(() => import("@/pages/admin/page-builder"));
export const VisualEditorDashboard = lazy(() => import("@/pages/admin/visual-editor/sites-dashboard"));
export const VisualEditorSiteEditor = lazy(() => import("@/pages/admin/visual-editor/site-editor"));
export const WritersManagement = lazy(() => import("@/pages/admin/writers/WritersManagement"));
export const NewsroomDashboard = lazy(() => import("@/pages/admin/writers/NewsroomDashboard"));
export const AdminChatInbox = lazy(() => import("@/pages/admin/chat-inbox"));
export const OffPlanManagement = lazy(() => import("@/pages/admin/off-plan-management"));
export const LandingPagesManagement = lazy(() => import("@/pages/admin/landing-pages-management"));
export const DistrictsManagement = lazy(() => import("@/pages/admin/districts-management"));
export const RealEstateManagement = lazy(() => import("@/pages/admin/real-estate-management"));
export const RealEstateEditor = lazy(() => import("@/pages/admin/real-estate-editor"));

// Octopus Content Generation Engine
export const OctopusDashboard = lazy(() => import("@/pages/admin/octopus-dashboard"));

// TRAVI Content Generation Engine
export const TraviLocationsList = lazy(() => import("@/pages/admin/travi/locations-list"));
export const TraviLocationEdit = lazy(() => import("@/pages/admin/travi/location-edit"));
export const TraviLocationPreview = lazy(() => import("@/pages/admin/travi/location-preview"));
export const TraviConfiguration = lazy(() => import("@/pages/admin/travi/configuration"));
export const TraviDataCollection = lazy(() => import("@/pages/admin/travi/data-collection"));
export const TraviApiKeys = lazy(() => import("@/pages/admin/travi/api-keys"));

// Tiqets Integration Pages
export const TiqetsDashboard = lazy(() => import("@/pages/admin/tiqets/dashboard"));
export const TiqetsDestinations = lazy(() => import("@/pages/admin/tiqets/destinations"));
export const TiqetsIntegrations = lazy(() => import("@/pages/admin/tiqets/integrations"));
export const TiqetsConfiguration = lazy(() => import("@/pages/admin/tiqets/configuration"));
export const TiqetsAttractionDetail = lazy(() => import("@/pages/admin/tiqets/attraction-detail"));
export const ContentQualityDashboard = lazy(() => import("@/pages/admin/tiqets/content-quality"));

// Data Ingestion Pages
export const IngestionDashboard = lazy(() => import("@/pages/admin/ingestion/dashboard"));

// Update 9987 - External Data Pages
export const POIExplorer = lazy(() => import("@/pages/poi-explorer"));
export const PublicHolidays = lazy(() => import("@/pages/public-holidays"));
export const DestinationBrowser = lazy(() => import("@/pages/destination-browser"));
export const ExternalDataExplorer = lazy(() => import("@/pages/admin/external-data-explorer"));

// Internal Links Management
export const LinksDashboard = lazy(() => import("@/pages/admin/links/dashboard"));

// Monetization Pages
export const MonetizationPremium = lazy(() => import("@/pages/admin/monetization/premium-content"));
export const MonetizationListings = lazy(() => import("@/pages/admin/monetization/business-listings"));
export const MonetizationLeads = lazy(() => import("@/pages/admin/monetization/lead-management"));
export const MonetizationAffiliates = lazy(() => import("@/pages/admin/monetization/affiliate-dashboard"));

// Enterprise Pages
export const EnterpriseTeams = lazy(() => import("@/pages/admin/enterprise/teams"));
export const EnterpriseWorkflows = lazy(() => import("@/pages/admin/enterprise/workflows"));
export const EnterpriseWebhooks = lazy(() => import("@/pages/admin/enterprise/webhooks"));
export const EnterpriseActivity = lazy(() => import("@/pages/admin/enterprise/activity-feed"));

// Governance Pages
export const GovernanceDashboard = lazy(() => import("@/pages/admin/governance/index"));
export const GovernanceRoles = lazy(() => import("@/pages/admin/governance/roles"));
export const GovernanceUsers = lazy(() => import("@/pages/admin/governance/users"));
export const GovernancePolicies = lazy(() => import("@/pages/admin/governance/policies"));
export const GovernanceApprovals = lazy(() => import("@/pages/admin/governance/approvals"));
export const GovernanceAudit = lazy(() => import("@/pages/admin/governance/audit"));

// Advanced Analytics Pages
export const CustomerJourney = lazy(() => import("@/pages/admin/analytics/customer-journey"));
export const SemanticSearchAdmin = lazy(() => import("@/pages/admin/analytics/semantic-search"));
export const PlagiarismCheck = lazy(() => import("@/pages/admin/analytics/plagiarism-check"));
export const LiveConsole = lazy(() => import("@/pages/admin/console"));

// Survey Builder Pages
export const Surveys = lazy(() => import("@/pages/surveys"));
export const SurveyBuilder = lazy(() => import("@/pages/survey-builder"));
export const SurveyResponses = lazy(() => import("@/pages/survey-responses"));

// Referral/Affiliate Program
export const AdminReferrals = lazy(() => import("@/pages/admin/referrals"));

// QA & System Pages
export const AdminQaDashboard = lazy(() => import("@/pages/admin/qa-dashboard"));
export const SystemHealthDashboard = lazy(() => import("@/pages/admin/system-health"));
export const OperationsDashboard = lazy(() => import("@/pages/admin/operations-dashboard"));
export const IntelligenceDashboard = lazy(() => import("@/pages/admin/IntelligenceDashboard"));
export const SearchDebugPage = lazy(() => import("@/pages/admin/search-debug"));
export const ContentCalendar = lazy(() => import("@/pages/admin/Calendar"));
export const EntityMergePage = lazy(() => import("@/pages/admin/entity-merge"));

// Help Center Admin
export const HelpCenterAdmin = lazy(() => import("@/pages/admin/help"));
export const HelpArticleEditor = lazy(() => import("@/pages/admin/help/article-editor"));
export const ChangeManagement = lazy(() => import("@/pages/admin/change-management"));

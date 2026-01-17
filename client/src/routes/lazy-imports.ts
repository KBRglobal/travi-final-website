import { lazy } from "react";

// Public Pages
export const Homepage = lazy(() => import("@/pages/homepage"));
export const Attractions = lazy(() => import("@/pages/attractions"));
export const HotelsPage = lazy(() => import("@/pages/hotels"));
export const PublicArticles = lazy(() => import("@/pages/public-articles"));
export const PublicEvents = lazy(() => import("@/pages/public-events"));
export const PublicSearch = lazy(() => import("@/pages/public-search"));
export const PublicOffPlan = lazy(() => import("@/pages/public-off-plan"));

// Off-Plan Pages (not yet implemented)
// export const OffPlanInvestmentGuide = lazy(() => import("@/pages/off-plan-investment-guide"));
// export const OffPlanHowToBuy = lazy(() => import("@/pages/off-plan-how-to-buy"));
// export const OffPlanPaymentPlans = lazy(() => import("@/pages/off-plan-payment-plans"));
// export const OffPlanBest2026 = lazy(() => import("@/pages/off-plan-best-2026"));
// export const OffPlanBusinessBay = lazy(() => import("@/pages/off-plan-business-bay"));
// export const OffPlanDubaiMarina = lazy(() => import("@/pages/off-plan-dubai-marina"));
// export const OffPlanJVC = lazy(() => import("@/pages/off-plan-jvc"));
// export const OffPlanPalmJumeirah = lazy(() => import("@/pages/off-plan-palm-jumeirah"));
// export const OffPlanCreekHarbour = lazy(() => import("@/pages/off-plan-creek-harbour"));
// export const OffPlanAlFurjan = lazy(() => import("@/pages/off-plan-al-furjan"));
// export const OffPlanVillas = lazy(() => import("@/pages/off-plan-villas"));
// export const OffPlanEmaar = lazy(() => import("@/pages/off-plan-emaar"));
// export const OffPlanDamac = lazy(() => import("@/pages/off-plan-damac"));
// export const OffPlanNakheel = lazy(() => import("@/pages/off-plan-nakheel"));
// export const OffPlanMeraas = lazy(() => import("@/pages/off-plan-meraas"));
// export const OffPlanSobha = lazy(() => import("@/pages/off-plan-sobha"));
// export const OffPlanCryptoPayments = lazy(() => import("@/pages/off-plan-crypto-payments"));
// export const OffPlanUSDT = lazy(() => import("@/pages/off-plan-usdt"));
// export const OffPlanGoldenVisa = lazy(() => import("@/pages/off-plan-golden-visa"));
// export const OffPlanPostHandover = lazy(() => import("@/pages/off-plan-post-handover"));
// export const OffPlanEscrow = lazy(() => import("@/pages/off-plan-escrow"));
// export const OffPlanVsReady = lazy(() => import("@/pages/off-plan-vs-ready"));

// Comparison Pages (not yet implemented)
// export const CompareOffPlanVsReady = lazy(() => import("@/pages/compare-off-plan-vs-ready"));
// export const CompareJVCvsDubaiSouth = lazy(() => import("@/pages/compare-jvc-vs-dubai-south"));
// export const CompareEmaarVsDamac = lazy(() => import("@/pages/compare-emaar-vs-damac"));
// export const CompareDowntownVsMarina = lazy(() => import("@/pages/compare-downtown-vs-marina"));
// export const Compare6040vs8020 = lazy(() => import("@/pages/compare-60-40-vs-80-20"));
// export const CompareSobhaVsMeraas = lazy(() => import("@/pages/compare-sobha-vs-meraas"));
// export const CompareCryptoVsBankTransfer = lazy(() => import("@/pages/compare-crypto-vs-bank-transfer"));
// export const CompareBusinessBayVsJLT = lazy(() => import("@/pages/compare-business-bay-vs-jlt"));
// export const CompareNewVsResale = lazy(() => import("@/pages/compare-new-vs-resale"));
// export const CompareNakheelVsAzizi = lazy(() => import("@/pages/compare-nakheel-vs-azizi"));
// export const CompareVillaVsApartment = lazy(() => import("@/pages/compare-villa-vs-apartment"));
// export const CompareStudioVs1Bed = lazy(() => import("@/pages/compare-studio-vs-1bed"));

// Tools Pages (not yet implemented)
// export const ToolsROICalculator = lazy(() => import("@/pages/tools-roi-calculator"));
// export const ToolsPaymentCalculator = lazy(() => import("@/pages/tools-payment-calculator"));
// export const ToolsAffordabilityCalculator = lazy(() => import("@/pages/tools-affordability-calculator"));
// export const ToolsCurrencyConverter = lazy(() => import("@/pages/tools-currency-converter"));
// export const ToolsStampDutyCalculator = lazy(() => import("@/pages/tools-stamp-duty-calculator"));
// export const ToolsRentalYieldCalculator = lazy(() => import("@/pages/tools-rental-yield-calculator"));
// export const ToolsMortgageCalculator = lazy(() => import("@/pages/tools-mortgage-calculator"));

// Case Study Pages (not yet implemented)
// export const CaseStudyInvestorJVC = lazy(() => import("@/pages/case-study-investor-jvc"));
// export const CaseStudyCryptoBuyer = lazy(() => import("@/pages/case-study-crypto-buyer"));
// export const CaseStudyGoldenVisa = lazy(() => import("@/pages/case-study-golden-visa"));
// export const CaseStudyExpatFamily = lazy(() => import("@/pages/case-study-expat-family"));
// export const CaseStudyInvestorFlip = lazy(() => import("@/pages/case-study-investor-flip"));
// export const CaseStudyPortfolioDiversification = lazy(() => import("@/pages/case-study-portfolio-diversification"));
// export const CaseStudyOffPlanLaunch = lazy(() => import("@/pages/case-study-off-plan-launch"));
// export const CaseStudyRetirementPlanning = lazy(() => import("@/pages/case-study-retirement-planning"));

// Pillar Pages (not yet implemented)
// export const PillarROIRentalYields = lazy(() => import("@/pages/pillar-roi-rental-yields"));
// export const PillarLegalSecurity = lazy(() => import("@/pages/pillar-legal-security"));

// Glossary & Resources
export const GlossaryHub = lazy(() => import("@/pages/glossary-hub"));

// District Pages (not yet implemented)
// export const DistrictsGateway = lazy(() => import("@/pages/districts-gateway"));
// export const DistrictDowntownDubai = lazy(() => import("@/pages/district-downtown-dubai"));
// export const DistrictDubaiMarina = lazy(() => import("@/pages/district-dubai-marina"));
// export const DistrictJBR = lazy(() => import("@/pages/district-jbr"));
// export const DistrictPalmJumeirah = lazy(() => import("@/pages/district-palm-jumeirah"));
// export const DistrictJumeirah = lazy(() => import("@/pages/district-jumeirah"));
// export const DistrictBusinessBay = lazy(() => import("@/pages/district-business-bay"));
// export const DistrictOldDubai = lazy(() => import("@/pages/district-old-dubai"));
// export const DistrictDubaiCreekHarbour = lazy(() => import("@/pages/district-dubai-creek-harbour"));
// export const DistrictDubaiSouth = lazy(() => import("@/pages/district-dubai-south"));
// export const DistrictAlBarsha = lazy(() => import("@/pages/district-al-barsha"));
// export const DistrictDIFC = lazy(() => import("@/pages/district-difc"));
// export const DistrictDubaiHills = lazy(() => import("@/pages/district-dubai-hills"));
// export const DistrictJVC = lazy(() => import("@/pages/district-jvc"));
// export const DistrictBluewaters = lazy(() => import("@/pages/district-bluewaters-island"));
// export const DistrictInternationalCity = lazy(() => import("@/pages/district-international-city"));
// export const DistrictAlKarama = lazy(() => import("@/pages/district-al-karama"));

// Landing Pages (not yet implemented)
// export const LandingFreeDubai = lazy(() => import("@/pages/landing-free-dubai"));
// export const LandingDubaiLaws = lazy(() => import("@/pages/landing-dubai-laws"));
// export const LandingSheikhMohammed = lazy(() => import("@/pages/landing-sheikh-mohammed"));
// export const LandingDubai247 = lazy(() => import("@/pages/landing-dubai-247"));

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

import { useEffect, Suspense, lazy } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { useAnalytics } from "@/hooks/use-analytics";
import { initGA } from "@/lib/analytics";
import { Loader2 } from "lucide-react";
import { LocaleProvider } from "@/lib/i18n/LocaleRouter";
import { FavoritesProvider } from "@/hooks/use-favorites";
import { LiveEditProvider } from "@/components/live-edit";
import { CookieConsentProvider } from "@/contexts/cookie-consent-context";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { GeographicProvider } from "@/contexts/geographic-context";
import { createAliasRoutes } from "@/lib/navigation-aliases";

// Lazy load all pages for better performance
const ComingSoon = lazy(() => import("@/pages/coming-soon"));
const Homepage = lazy(() => import("@/pages/homepage"));
const Attractions = lazy(() => import("@/pages/attractions"));
const HotelsPage = lazy(() => import("@/pages/hotels"));
const HotelDetail = lazy(() => import("@/pages/hotel-detail"));
const TiqetsAttractionDetail = lazy(() => import("@/pages/attraction-detail"));
const DestinationAttractions = lazy(() => import("@/pages/destination-attractions"));
const DestinationDining = lazy(() => import("@/pages/destination-dining"));
const GlobalDining = lazy(() => import("@/pages/global-dining"));
const GlobalThingsToDo = lazy(() => import("@/pages/global-things-to-do"));
const GlobalGuides = lazy(() => import("@/pages/global-guides"));
const TravelGuidesPage = lazy(() => import("@/pages/travel-guides"));
const GuideDetailPage = lazy(() => import("@/pages/guide-detail"));
const TravelStyleArticle = lazy(() => import("@/pages/travel-style-article"));
const PublicArticles = lazy(() => import("@/pages/public-articles"));
const PublicEvents = lazy(() => import("@/pages/public-events"));
const PublicSearch = lazy(() => import("@/pages/public-search"));
const PublicOffPlan = lazy(() => import("@/pages/public-off-plan"));
const GlossaryHub = lazy(() => import("@/pages/glossary-hub"));
const RasAlKhaimahPage = lazy(() => import("@/pages/public-v2/ras-al-khaimah"));
const WynnAlMarjanGuidePage = lazy(() => import("@/pages/public-v2/guides/wynn-al-marjan-guide"));
const JebelJaisAdventureGuidePage = lazy(() => import("@/pages/public-v2/guides/jebel-jais-adventure-guide"));
const DubaiToRakTransportPage = lazy(() => import("@/pages/public-v2/guides/dubai-to-rak-transport"));
const DubaiVsRakComparisonPage = lazy(() => import("@/pages/public-v2/guides/dubai-vs-rak-comparison"));
const WhereToStayRakPage = lazy(() => import("@/pages/public-v2/guides/where-to-stay-rak"));
const RakRealEstateInvestmentPage = lazy(() => import("@/pages/public-v2/guides/rak-real-estate-investment"));
const DestinationsLanding = lazy(() => import("@/pages/destinations"));
const DestinationPage = lazy(() => import("@/pages/destination-page"));

const TraviLocationPage = lazy(() => import("@/pages/public-v2/travi-location-page"));
const PublicShopping = lazy(() => import("@/pages/public-shopping"));
const PublicNews = lazy(() => import("@/pages/public-news"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const ContentList = lazy(() => import("@/pages/content-list"));
const ContentEditor = lazy(() => import("@/pages/content-editor"));
const PublicContentViewer = lazy(() => import("@/pages/public-content-viewer"));
const PublicDocs = lazy(() => import("@/pages/public-docs"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy"));
const TermsConditions = lazy(() => import("@/pages/terms"));
const CookiePolicy = lazy(() => import("@/pages/cookies"));
const SecurityPolicy = lazy(() => import("@/pages/security"));
const AffiliateDisclosure = lazy(() => import("@/pages/affiliate-disclosure"));
const PublicAbout = lazy(() => import("@/pages/about"));
const PublicContact = lazy(() => import("@/pages/contact"));

const RssFeeds = lazy(() => import("@/pages/rss-feeds"));
const AffiliateLinks = lazy(() => import("@/pages/affiliate-links"));
const MediaLibrary = lazy(() => import("@/pages/media-library"));
const ImageEngine = lazy(() => import("@/pages/admin-image-engine"));
const Settings = lazy(() => import("@/pages/settings"));
const ContentRulesPage = lazy(() => import("@/pages/content-rules"));
const AIArticleGenerator = lazy(() => import("@/pages/ai-article-generator"));
const TopicBankPage = lazy(() => import("@/pages/topic-bank"));
const KeywordsPage = lazy(() => import("@/pages/keywords"));
const ClustersPage = lazy(() => import("@/pages/clusters"));
const TagsPage = lazy(() => import("@/pages/tags"));
const UsersPage = lazy(() => import("@/pages/users"));
const HomepagePromotions = lazy(() => import("@/pages/homepage-promotions"));
const Analytics = lazy(() => import("@/pages/analytics"));
const AuditLogs = lazy(() => import("@/pages/audit-logs"));
const AdminLogs = lazy(() => import("@/pages/admin-logs"));
const NewsletterSubscribers = lazy(() => import("@/pages/newsletter-subscribers"));
const Campaigns = lazy(() => import("@/pages/campaigns"));
const TranslationsPage = lazy(() => import("@/pages/translations"));
const ContentCalendarPage = lazy(() => import("@/pages/content-calendar"));
const ContentTemplatesPage = lazy(() => import("@/pages/content-templates"));
const SEOAuditPage = lazy(() => import("@/pages/seo-audit"));
const AutoPilotPage = lazy(() => import("@/pages/admin/auto-pilot"));
const SocialDashboard = lazy(() => import("@/pages/admin/social/social-dashboard"));
const GrowthDashboard = lazy(() => import("@/pages/admin/growth-dashboard"));
const AEODashboard = lazy(() => import("@/pages/admin/aeo-dashboard"));
const ContentIntelligencePage = lazy(() => import("@/pages/admin/content-intelligence"));
const AIQualityToolsPage = lazy(() => import("@/pages/admin/ai-quality-tools"));
const DestinationIntelligencePage = lazy(() => import("@/pages/admin/destination-intelligence"));
const DestinationsListPage = lazy(() => import("@/pages/admin/destinations/destinations-list"));
const DestinationHubPage = lazy(() => import("@/pages/admin/destinations/destination-hub"));
const SecurityPage = lazy(() => import("@/pages/admin/security"));
const SiteSettingsPage = lazy(() => import("@/pages/admin/site-settings"));
const NavigationManagerPage = lazy(() => import("@/pages/admin/navigation-manager"));
const FooterManagerPage = lazy(() => import("@/pages/admin/footer-manager"));
const HomepageEditorPage = lazy(() => import("@/pages/admin/homepage-editor"));
const StaticPagesPage = lazy(() => import("@/pages/admin/static-pages"));
const StaticPageEditorPage = lazy(() => import("@/pages/admin/static-page-editor"));
const PageBuilderPage = lazy(() => import("@/pages/admin/page-builder"));
const VisualEditorDashboard = lazy(() => import("@/pages/admin/visual-editor/sites-dashboard"));
const VisualEditorSiteEditor = lazy(() => import("@/pages/admin/visual-editor/site-editor"));
const WritersManagement = lazy(() => import("@/pages/admin/writers/WritersManagement"));
const NewsroomDashboard = lazy(() => import("@/pages/admin/writers/NewsroomDashboard"));
const AdminChatInbox = lazy(() => import("@/pages/admin/chat-inbox"));
const OffPlanManagement = lazy(() => import("@/pages/admin/off-plan-management"));
const LandingPagesManagement = lazy(() => import("@/pages/admin/landing-pages-management"));
const DistrictsManagement = lazy(() => import("@/pages/admin/districts-management"));
const RealEstateManagement = lazy(() => import("@/pages/admin/real-estate-management"));
const RealEstateEditor = lazy(() => import("@/pages/admin/real-estate-editor"));
// Octopus Content Generation Engine
const OctopusDashboard = lazy(() => import("@/pages/admin/octopus-dashboard"));

// Monetization pages
const MonetizationPremium = lazy(() => import("@/pages/admin/monetization/premium-content"));
const MonetizationListings = lazy(() => import("@/pages/admin/monetization/business-listings"));
const MonetizationLeads = lazy(() => import("@/pages/admin/monetization/lead-management"));
const MonetizationAffiliates = lazy(() => import("@/pages/admin/monetization/affiliate-dashboard"));

// Enterprise pages
const EnterpriseTeams = lazy(() => import("@/pages/admin/enterprise/teams"));
const EnterpriseWorkflows = lazy(() => import("@/pages/admin/enterprise/workflows"));
const EnterpriseWebhooks = lazy(() => import("@/pages/admin/enterprise/webhooks"));
const EnterpriseActivity = lazy(() => import("@/pages/admin/enterprise/activity-feed"));

// Governance pages (Feature flag: ENABLE_ENTERPRISE_GOVERNANCE_UI)
const GovernanceDashboard = lazy(() => import("@/pages/admin/governance/index"));
const GovernanceRoles = lazy(() => import("@/pages/admin/governance/roles"));
const GovernanceUsers = lazy(() => import("@/pages/admin/governance/users"));
const GovernancePolicies = lazy(() => import("@/pages/admin/governance/policies"));
const GovernanceApprovals = lazy(() => import("@/pages/admin/governance/approvals"));
const GovernanceAudit = lazy(() => import("@/pages/admin/governance/audit"));

// Advanced Analytics pages
const CustomerJourney = lazy(() => import("@/pages/admin/analytics/customer-journey"));
const SemanticSearchAdmin = lazy(() => import("@/pages/admin/analytics/semantic-search"));
const PlagiarismCheck = lazy(() => import("@/pages/admin/analytics/plagiarism-check"));
const LiveConsole = lazy(() => import("@/pages/admin/console"));

const Surveys = lazy(() => import("@/pages/surveys"));
const SurveyBuilder = lazy(() => import("@/pages/survey-builder"));
const SurveyResponses = lazy(() => import("@/pages/survey-responses"));
const PublicSurvey = lazy(() => import("@/pages/public-survey"));

// Update 9987 - External Data Pages
const POIExplorer = lazy(() => import("@/pages/poi-explorer"));
const PublicHolidays = lazy(() => import("@/pages/public-holidays"));
const DestinationBrowser = lazy(() => import("@/pages/destination-browser"));

const PartnersJoin = lazy(() => import("@/pages/partners-join"));
const PartnersDashboard = lazy(() => import("@/pages/partners-dashboard"));
const AdminReferrals = lazy(() => import("@/pages/admin/referrals"));
const AdminQaDashboard = lazy(() => import("@/pages/admin/qa-dashboard"));
const SystemHealthDashboard = lazy(() => import("@/pages/admin/system-health"));
const OperationsDashboard = lazy(() => import("@/pages/admin/operations-dashboard"));
const IntelligenceDashboard = lazy(() => import("@/pages/admin/IntelligenceDashboard"));
const SearchDebugPage = lazy(() => import("@/pages/admin/search-debug"));
const ContentCalendar = lazy(() => import("@/pages/admin/Calendar"));
const EntityMergePage = lazy(() => import("@/pages/admin/entity-merge"));

// Help Center
const HelpCenterAdmin = lazy(() => import("@/pages/admin/help"));
const HelpArticleEditor = lazy(() => import("@/pages/admin/help/article-editor"));
const HelpCenterPublic = lazy(() => import("@/pages/help"));
const HelpCategory = lazy(() => import("@/pages/help/category"));
const HelpArticle = lazy(() => import("@/pages/help/article"));
const ChangeManagement = lazy(() => import("@/pages/admin/change-management"));

// SEO Engine Pages
const SeoEngineDashboard = lazy(() => import("@/pages/admin/seo-engine/SeoEngineDashboard"));
const SeoEngineContentReport = lazy(() => import("@/pages/admin/seo-engine/SeoEngineContentReport"));
const SeoEngineActionsQueue = lazy(() => import("@/pages/admin/seo-engine/SeoEngineActionsQueue"));

const NotFound = lazy(() => import("@/pages/not-found"));
const Login = lazy(() => import("@/pages/login"));
const AccessDenied = lazy(() => import("@/pages/access-denied"));
const TestPage = lazy(() => import("@/pages/test"));

// Import lazy-loaded components for admin list wrappers
import * as Components from "@/routes/lazy-imports";


// Eager load AI Assistant as it's critical UI
import { AIAssistant } from "@/components/ai-assistant";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { KeyboardShortcuts, useKeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { NotificationsCenter } from "@/components/notifications-center";
import { MultiTabProvider, EditorTabBar, TabCountBadge } from "@/components/multi-tab-editor";
import { ContentExpiryAlerts } from "@/components/content-expiry-alerts";
import { ErrorBoundary } from "@/components/error-boundary";

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
      <img 
        src="/logos/Mascot_for_Dark_Background.png" 
        alt="TRAVI" 
        className="w-16 h-16 object-contain animate-bounce"
      />
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// Admin list wrappers
function AdminAttractions() {
  return <Components.ContentList type="attraction" />;
}
function AdminHotels() {
  return <Components.ContentList type="hotel" />;
}
function AdminDining() {
  return <Components.ContentList type="dining" />;
}
function AdminDistricts() {
  return <Components.ContentList type="district" />;
}
function AdminTransport() {
  return <Components.ContentList type="transport" />;
}
function AdminArticles() {
  return <Components.ContentList type="article" />;
}
function AdminEvents() {
  return <Components.ContentList type="event" />;
}
function AdminLandingPages() {
  return <Components.ContentList type="landing_page" />;
}
function AdminCaseStudies() {
  return <Components.ContentList type="case_study" />;
}
function AdminOffPlan() {
  return <Components.ContentList type="off_plan" />;
}

function AdminRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/admin" component={Components.Dashboard} />
        <Route path="/admin/attractions" component={AdminAttractions} />
        <Route path="/admin/attractions/new" component={Components.ContentEditor} />
        <Route path="/admin/attractions/:id" component={Components.ContentEditor} />
        <Route path="/admin/hotels" component={AdminHotels} />
        <Route path="/admin/hotels/new" component={Components.ContentEditor} />
        <Route path="/admin/hotels/:id" component={Components.ContentEditor} />
        <Route path="/admin/dining" component={AdminDining} />
        <Route path="/admin/dining/new" component={Components.ContentEditor} />
        <Route path="/admin/dining/:id" component={Components.ContentEditor} />
        <Route path="/admin/districts" component={Components.DistrictsManagement} />
        <Route path="/admin/districts/listings" component={AdminDistricts} />
        <Route path="/admin/districts/new" component={Components.ContentEditor} />
        <Route path="/admin/districts/:id" component={Components.ContentEditor} />
        <Route path="/admin/transport" component={AdminTransport} />
        <Route path="/admin/transport/new" component={Components.ContentEditor} />
        <Route path="/admin/transport/:id" component={Components.ContentEditor} />
        <Route path="/admin/articles" component={AdminArticles} />
        <Route path="/admin/articles/new" component={Components.ContentEditor} />
        <Route path="/admin/articles/:id" component={Components.ContentEditor} />
        <Route path="/admin/events" component={AdminEvents} />
        <Route path="/admin/events/new" component={Components.ContentEditor} />
        <Route path="/admin/events/:id" component={Components.ContentEditor} />
        <Route path="/admin/landing-pages" component={Components.LandingPagesManagement} />
        <Route path="/admin/landing-pages/listings" component={AdminLandingPages} />
        <Route path="/admin/landing-pages/new" component={Components.ContentEditor} />
        <Route path="/admin/landing-pages/:id" component={Components.ContentEditor} />
        <Route path="/admin/case-studies" component={AdminCaseStudies} />
        <Route path="/admin/case-studies/new" component={Components.ContentEditor} />
        <Route path="/admin/case-studies/:id" component={Components.ContentEditor} />
        <Route path="/admin/off-plan" component={Components.OffPlanManagement} />
        <Route path="/admin/off-plan/listings" component={AdminOffPlan} />
        <Route path="/admin/off-plan/new" component={Components.ContentEditor} />
        <Route path="/admin/off-plan/:id" component={Components.ContentEditor} />
        <Route path="/admin/real-estate" component={Components.RealEstateManagement} />
        <Route path="/admin/real-estate/:pageKey" component={Components.RealEstateEditor} />
        <Route path="/admin/rss-feeds" component={Components.RssFeeds} />
        <Route path="/admin/ai-generator" component={Components.AIArticleGenerator} />
        <Route path="/admin/topic-bank" component={Components.TopicBankPage} />
        <Route path="/admin/keywords" component={Components.KeywordsPage} />
        <Route path="/admin/clusters" component={Components.ClustersPage} />
        <Route path="/admin/tags" component={Components.TagsPage} />
        <Route path="/admin/affiliate-links" component={Components.AffiliateLinks} />
        <Route path="/admin/media" component={Components.MediaLibrary} />
        <Route path="/admin/image-engine" component={Components.ImageEngine} />
        <Route path="/admin/settings" component={Components.Settings} />
        <Route path="/admin/contents-rules" component={Components.ContentRulesPage} />
        <Route path="/admin/users" component={Components.UsersPage} />
        <Route path="/admin/homepage-promotions" component={Components.HomepagePromotions} />
        <Route path="/admin/analytics" component={Components.Analytics} />
        <Route path="/admin/audit-logs" component={Components.AuditLogs} />
        <Route path="/admin/logs" component={Components.AdminLogs} />
        <Route path="/admin/newsletter" component={Components.NewsletterSubscribers} />
        <Route path="/admin/campaigns" component={Components.Campaigns} />
        <Route path="/admin/translations" component={Components.TranslationsPage} />
        <Route path="/admin/calendar" component={Components.ContentCalendarPage} />
        <Route path="/admin/templates" component={Components.ContentTemplatesPage} />
        <Route path="/admin/seo-audit" component={Components.SEOAuditPage} />
        <Route path="/admin/auto-pilot" component={Components.AutoPilotPage} />
        <Route path="/admin/social" component={Components.SocialDashboard} />
        <Route path="/admin/growth-dashboard" component={Components.GrowthDashboard} />
        <Route path="/admin/aeo" component={Components.AEODashboard} />
        <Route path="/admin/contents-intelligence" component={Components.ContentIntelligencePage} />
        <Route path="/admin/ai-quality-tools" component={Components.AIQualityToolsPage} />
        <Route path="/admin/destination-intelligence" component={Components.DestinationIntelligencePage} />
        <Route path="/admin/destinations" component={Components.DestinationsListPage} />
        <Route path="/admin/destinations/:slug" component={Components.DestinationHubPage} />
        <Route path="/admin/security" component={Components.SecurityPage} />
        <Route path="/admin/site-settings" component={Components.SiteSettingsPage} />
        <Route path="/admin/navigation" component={Components.NavigationManagerPage} />
        <Route path="/admin/footer" component={Components.FooterManagerPage} />
        <Route path="/admin/homepage" component={Components.HomepageEditorPage} />
        <Route path="/admin/static-pages" component={Components.StaticPagesPage} />
        <Route path="/admin/static-pages/new" component={Components.StaticPageEditorPage} />
        <Route path="/admin/static-pages/edit/:id" component={Components.StaticPageEditorPage} />
        <Route path="/admin/page-builder" component={Components.PageBuilderPage} />
        <Route path="/admin/visual-editor" component={Components.VisualEditorDashboard} />
        <Route path="/admin/visual-editor/:slug" component={Components.VisualEditorSiteEditor} />
        <Route path="/admin/writers" component={Components.WritersManagement} />
        <Route path="/admin/writers/newsroom" component={Components.NewsroomDashboard} />
        <Route path="/admin/chat" component={Components.AdminChatInbox} />
        {/* Octopus Content Generation Engine */}
        <Route path="/admin/octopus" component={Components.OctopusDashboard} />
        
        {/* TRAVI Content Generation Engine */}
        <Route path="/admin/travi-generator" component={Components.TraviGeneratorDashboard} />
        <Route path="/admin/travi/locations" component={Components.TraviLocationsList} />
        <Route path="/admin/travi/locations/:id" component={Components.TraviLocationEdit} />
        <Route path="/admin/travi/locations/:id/preview" component={Components.TraviLocationPreview} />
        <Route path="/admin/travi/config" component={Components.TraviConfiguration} />
        <Route path="/admin/travi/data-collection" component={Components.TraviDataCollection} />
        <Route path="/admin/travi/api-keys" component={Components.TraviApiKeys} />
        
        {/* Tiqets Integration */}
        <Route path="/admin/tiqets" component={Components.TiqetsDashboard} />
        <Route path="/admin/tiqets/destinations" component={Components.TiqetsDestinations} />
        <Route path="/admin/tiqets/integrations" component={Components.TiqetsIntegrations} />
        <Route path="/admin/tiqets/configuration" component={Components.TiqetsConfiguration} />
        <Route path="/admin/tiqets/attractions/:id" component={Components.TiqetsAttractionDetail} />
        <Route path="/admin/tiqets/content-quality" component={Components.ContentQualityDashboard} />

        {/* Data Ingestion */}
        <Route path="/admin/ingestion" component={Components.IngestionDashboard} />

        {/* Update 9987 - External Data Pages */}
        <Route path="/admin/poi-explorer" component={Components.POIExplorer} />
        <Route path="/admin/public-holidays" component={Components.PublicHolidays} />
        <Route path="/admin/destinations-browser" component={Components.DestinationBrowser} />
        <Route path="/admin/external-data-explorer" component={Components.ExternalDataExplorer} />

        {/* Internal Links Management */}
        <Route path="/admin/links" component={Components.LinksDashboard} />

        {/* Help Center Admin */}
        <Route path="/admin/help" component={Components.HelpCenterAdmin} />
        <Route path="/admin/help/articles/new" component={Components.HelpArticleEditor} />
        <Route path="/admin/help/articles/:id" component={Components.HelpArticleEditor} />

        {/* Monetization routes */}
        <Route path="/admin/monetization/premium" component={Components.MonetizationPremium} />
        <Route path="/admin/monetization/listings" component={Components.MonetizationListings} />
        <Route path="/admin/monetization/leads" component={Components.MonetizationLeads} />
        <Route path="/admin/monetization/affiliates" component={Components.MonetizationAffiliates} />

        {/* Enterprise routes */}
        <Route path="/admin/enterprise/teams" component={Components.EnterpriseTeams} />
        <Route path="/admin/enterprise/workflows" component={Components.EnterpriseWorkflows} />
        <Route path="/admin/enterprise/webhooks" component={Components.EnterpriseWebhooks} />
        <Route path="/admin/enterprise/activity" component={Components.EnterpriseActivity} />

        {/* Governance routes (Feature flag: ENABLE_ENTERPRISE_GOVERNANCE_UI) */}
        <Route path="/admin/governance" component={Components.GovernanceDashboard} />
        <Route path="/admin/governance/roles" component={Components.GovernanceRoles} />
        <Route path="/admin/governance/users" component={Components.GovernanceUsers} />
        <Route path="/admin/governance/policies" component={Components.GovernancePolicies} />
        <Route path="/admin/governance/approvals" component={Components.GovernanceApprovals} />
        <Route path="/admin/governance/audit" component={Components.GovernanceAudit} />

        {/* Advanced Analytics routes */}
        <Route path="/admin/analytics/journey" component={Components.CustomerJourney} />
        <Route path="/admin/analytics/search" component={Components.SemanticSearchAdmin} />
        <Route path="/admin/analytics/plagiarism" component={Components.PlagiarismCheck} />
        <Route path="/admin/console" component={Components.LiveConsole} />

        {/* Survey Builder routes */}
        <Route path="/admin/surveys" component={Components.Surveys} />
        <Route path="/admin/surveys/new" component={Components.SurveyBuilder} />
        <Route path="/admin/surveys/:id" component={Components.SurveyBuilder} />
        <Route path="/admin/surveys/:id/responses" component={Components.SurveyResponses} />

        {/* Referral/Affiliate Program */}
        <Route path="/admin/referrals" component={Components.AdminReferrals} />

        {/* QA Checklist System */}
        <Route path="/admin/qa" component={Components.AdminQaDashboard} />

        {/* System Health Dashboard */}
        <Route path="/admin/system-health" component={Components.SystemHealthDashboard} />

        {/* Intelligence Dashboard */}
        <Route path="/admin/intelligence" component={Components.IntelligenceDashboard} />

        {/* Operations Dashboard */}
        <Route path="/admin/operations" component={Components.OperationsDashboard} />

        {/* Search Debug */}
        <Route path="/admin/search-debug" component={Components.SearchDebugPage} />

        {/* Scheduling Calendar */}
        <Route path="/admin/scheduling" component={Components.ContentCalendar} />

        {/* Entity Merge */}
        <Route path="/admin/entity-merge" component={Components.EntityMergePage} />
        {/* Change Management (PCMS) */}
        <Route path="/admin/changes" component={Components.ChangeManagement} />


        {/* SEO Engine */}
        <Route path="/admin/seo-engine" component={SeoEngineDashboard} />
        <Route path="/admin/seo-engine/contents" component={SeoEngineContentReport} />
        <Route path="/admin/seo-engine/actions" component={SeoEngineActionsQueue} />

        <Route component={NotFound} />

      </Switch>
    </Suspense>
  );
}

function AdminLayout() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();
  const { open: shortcutsOpen, setOpen: setShortcutsOpen } = useKeyboardShortcuts();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Force English language for admin panel
  useEffect(() => {
    import('@/lib/i18n/config').then(({ changeLanguage }) => {
      changeLanguage('en');
    });
  }, []);

  // Set noindex, nofollow meta tags for all admin pages
  useEffect(() => {
    // Helper to update or create meta tag
    const setMetaTag = (name: string, contents: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        document.head.appendChild(meta);
      }
      meta.content = contents;
    };

    // Set robots meta tag to prevent indexing
    setMetaTag("robots", "noindex, nofollow");

    // Cleanup: restore default robots tag when leaving admin
    return () => {
      const meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
      if (meta) {
        meta.content = "index, follow";
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <MultiTabProvider>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar user={user} />
          <div className="flex flex-col flex-1 min-w-0">
            <header className="flex items-center justify-between gap-4 p-3 border-b sticky top-0 z-50 bg-background">
              <div className="flex items-center gap-3">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <TabCountBadge />
              </div>
              <div className="flex items-center gap-2">
                <ContentExpiryAlerts compact />
                <NotificationsCenter />
                <ThemeToggle />
              </div>
            </header>
            <EditorTabBar />
            <main className="flex-1 overflow-auto p-6">
              <ErrorBoundary>
                <AdminRouter />
              </ErrorBoundary>
            </main>
          </div>
          <AIAssistant />
          <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
          <KeyboardShortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
        </div>
      </SidebarProvider>
    </MultiTabProvider>
  );
}

// All public routes - will be mounted with and without locale prefix
const publicRoutes = [
  { path: "/login", component: Login },
  { path: "/access-denied", component: AccessDenied },
  { path: "/coming-soon", component: ComingSoon },
  { path: "/search", component: PublicSearch },
  // Global category pages (destination-agnostic) - main navigation targets
  { path: "/hotels", component: HotelsPage },
  { path: "/hotels/:hotelId", component: HotelDetail },
  // TODO: Re-enable dining after data + UX is ready
  // TODO: Re-enable things-to-do after ingestion pipeline is complete
  // { path: "/dining", component: GlobalDining },
  // { path: "/things-to-do", component: GlobalThingsToDo },
  { path: "/guides", component: TravelGuidesPage },
  { path: "/travel-guides", component: TravelGuidesPage },
  { path: "/travel-styles/:slug", component: TravelStyleArticle },
  { path: "/guides/wynn-al-marjan-island", component: WynnAlMarjanGuidePage },
  { path: "/guides/jebel-jais-adventure", component: JebelJaisAdventureGuidePage },
  { path: "/guides/dubai-to-rak-transport", component: DubaiToRakTransportPage },
  { path: "/guides/dubai-vs-rak", component: DubaiVsRakComparisonPage },
  { path: "/guides/where-to-stay-rak", component: WhereToStayRakPage },
  { path: "/guides/rak-real-estate-investment", component: RakRealEstateInvestmentPage },
  { path: "/guides/:slug", component: GuideDetailPage },
  // Category pages with location-specific logic handled internally or via sub-paths
  { path: "/attractions", component: Attractions },
  { path: "/attractions/list/:destination", component: DestinationAttractions },
  // TODO: Re-enable dining after data + UX is ready
  // { path: "/dining/list/:destination", component: DestinationDining },
  // Blueprint URL: /:destination/attractions/:slug (e.g., /dubai/attractions/burj-khalifa)
  { path: "/:destination/attractions/:slug", component: TiqetsAttractionDetail },
  // Fallback: old URL format for backwards compatibility
  { path: "/attractions/:city/:slug", component: TiqetsAttractionDetail },
  { path: "/attractions/:destination/:attractionId", component: TiqetsAttractionDetail },
  // Detail pages for direct contents access
  { path: "/attractions/:slug", component: PublicContentViewer },
  { path: "/hotels/:slug", component: PublicContentViewer },
  // TODO: Re-enable dining after data + UX is ready
  // { path: "/dining/:slug", component: PublicContentViewer },
  // Districts now handled by DistrictsGateway and specific district pages below
  { path: "/transport/:slug", component: PublicContentViewer },
  { path: "/articles", component: PublicArticles },
  { path: "/articles/:slug", component: PublicContentViewer },
  { path: "/events", component: PublicEvents },
  { path: "/events/:slug", component: PublicContentViewer },
  // Help Center
  { path: "/help", component: HelpCenterPublic },
  { path: "/help/:slug", component: HelpCategory },
  { path: "/help/:categorySlug/:articleSlug", component: HelpArticle },
  { path: "/dubai-real-estate", component: PublicOffPlan },
  { path: "/dubai-off-plan-properties", component: PublicOffPlan },
  { path: "/glossary", component: GlossaryHub },
  // ARCHIVED: Dubai-specific routes moved to v-old folder
  // { path: "/dubai-off-plan-investment-guide", component: OffPlanInvestmentGuide },
  // { path: "/how-to-buy-dubai-off-plan", component: OffPlanHowToBuy },
  // { path: "/dubai-off-plan-payment-plans", component: OffPlanPaymentPlans },
  // { path: "/best-off-plan-projects-dubai-2026", component: OffPlanBest2026 },
  // { path: "/dubai-off-plan-business-bay", component: OffPlanBusinessBay },
  // { path: "/dubai-off-plan-marina", component: OffPlanDubaiMarina },
  // { path: "/dubai-off-plan-jvc", component: OffPlanJVC },
  // { path: "/dubai-off-plan-palm-jumeirah", component: OffPlanPalmJumeirah },
  // { path: "/dubai-off-plan-creek-harbour", component: OffPlanCreekHarbour },
  // { path: "/dubai-off-plan-al-furjan", component: OffPlanAlFurjan },
  // { path: "/dubai-off-plan-villas", component: OffPlanVillas },
  // { path: "/off-plan-emaar", component: OffPlanEmaar },
  // { path: "/off-plan-damac", component: OffPlanDamac },
  // { path: "/off-plan-nakheel", component: OffPlanNakheel },
  // { path: "/off-plan-meraas", component: OffPlanMeraas },
  // { path: "/off-plan-sobha", component: OffPlanSobha },
  // { path: "/off-plan-crypto-payments", component: OffPlanCryptoPayments },
  // { path: "/off-plan-usdt", component: OffPlanUSDT },
  // { path: "/off-plan-golden-visa", component: OffPlanGoldenVisa },
  // { path: "/off-plan-post-handover", component: OffPlanPostHandover },
  // { path: "/off-plan-escrow", component: OffPlanEscrow },
  // { path: "/off-plan-vs-ready", component: OffPlanVsReady },
  // { path: "/compare-off-plan-vs-ready", component: CompareOffPlanVsReady },
  // { path: "/compare-jvc-vs-dubai-south", component: CompareJVCvsDubaiSouth },
  // { path: "/compare-emaar-vs-damac", component: CompareEmaarVsDamac },
  // { path: "/tools-roi-calculator", component: ToolsROICalculator },
  // { path: "/tools-payment-calculator", component: ToolsPaymentCalculator },
  // { path: "/tools-affordability-calculator", component: ToolsAffordabilityCalculator },
  // { path: "/compare-downtown-vs-marina", component: CompareDowntownVsMarina },
  // { path: "/case-study-jvc-investor", component: CaseStudyInvestorJVC },
  // { path: "/case-study-crypto-buyer", component: CaseStudyCryptoBuyer },
  // { path: "/dubai-roi-rental-yields", component: PillarROIRentalYields },
  // { path: "/dubai-legal-security-guide", component: PillarLegalSecurity },
  // { path: "/case-study-golden-visa", component: CaseStudyGoldenVisa },
  // { path: "/compare-60-40-vs-80-20", component: Compare6040vs8020 },
  // { path: "/compare-sobha-vs-meraas", component: CompareSobhaVsMeraas },
  // { path: "/compare-crypto-vs-bank-transfer", component: CompareCryptoVsBankTransfer },
  // { path: "/case-study-expat-family", component: CaseStudyExpatFamily },
  // { path: "/case-study-investor-flip", component: CaseStudyInvestorFlip },
  // { path: "/tools-currency-converter", component: ToolsCurrencyConverter },
  // { path: "/compare-business-bay-vs-jlt", component: CompareBusinessBayVsJLT },
  // { path: "/compare-new-vs-resale", component: CompareNewVsResale },
  // { path: "/tools-fees-calculator", component: ToolsStampDutyCalculator },
  // { path: "/compare-nakheel-vs-azizi", component: CompareNakheelVsAzizi },
  // { path: "/compare-villa-vs-apartment", component: CompareVillaVsApartment },
  // { path: "/tools-rental-yield-calculator", component: ToolsRentalYieldCalculator },
  // { path: "/tools-mortgage-calculator", component: ToolsMortgageCalculator },
  // { path: "/compare-studio-vs-1bed", component: CompareStudioVs1Bed },
  // { path: "/case-study-portfolio-diversification", component: CaseStudyPortfolioDiversification },
  // { path: "/case-study-off-plan-launch", component: CaseStudyOffPlanLaunch },
  // { path: "/case-study-retirement-planning", component: CaseStudyRetirementPlanning },
  // { path: "/dubai/free-things-to-do", component: LandingFreeDubai },
  // { path: "/dubai/laws-for-tourists", component: LandingDubaiLaws },
  // { path: "/dubai/sheikh-mohammed-bin-rashid", component: LandingSheikhMohammed },
  // { path: "/dubai/24-hours-open", component: LandingDubai247 },
  // Shopping page
  { path: "/shopping", component: PublicShopping },
  // News portal
  { path: "/news", component: PublicNews },
  // Documentation
  { path: "/docs", component: PublicDocs },
  { path: "/docs/:path*", component: PublicDocs },
  // Legal pages - with multiple paths for flexibility
  { path: "/privacy", component: PrivacyPolicy },
  { path: "/privacy-policy", component: PrivacyPolicy },
  { path: "/terms", component: TermsConditions },
  { path: "/terms-conditions", component: TermsConditions },
  { path: "/cookie-policy", component: CookiePolicy },
  { path: "/cookies", component: CookiePolicy },
  { path: "/security", component: SecurityPolicy },
  { path: "/affiliate-disclosure", component: AffiliateDisclosure },
  // About and Contact pages
  { path: "/about", component: PublicAbout },
  { path: "/contact", component: PublicContact },
  // Public survey pages
  { path: "/survey/:slug", component: PublicSurvey },
  // Partner/Referral pages
  { path: "/partners/join", component: PartnersJoin },
  { path: "/partners/dashboard", component: PartnersDashboard },
  // Navigation compatibility aliases (fixes 404s for legacy/alternate paths)
  ...createAliasRoutes(),
 
];

// Locale codes for URL prefixes (16 languages, English is default without prefix)
const LOCALE_PREFIXES = [
  "ar", "hi",                    // Tier 1
  "zh", "ru", "ur", "fr",        // Tier 2
  "de", "fa", "bn", "fil",       // Tier 3
  "es", "tr", "it", "ja", "ko", "he"  // Tier 4
];


function PublicRouter() {
  return (
    <Switch>
      {/* TRAVI Location Pages - /en/:city/:category/:slug */}
      <Route path="/en/:city/attractions/:slug" component={TraviLocationPage} />
      <Route path="/en/:city/hotels/:slug" component={TraviLocationPage} />
      <Route path="/en/:city/restaurants/:slug" component={TraviLocationPage} />
      
      {/* Routes with locale prefix (e.g., /ar/attractions, /hi/hotels) */}
      {LOCALE_PREFIXES.map((locale) => (
        <Route key={`${locale}-home`} path={`/${locale}`} component={Components.Homepage} />
      ))}
      {LOCALE_PREFIXES.flatMap((locale) =>
        publicRoutes.map((route) => (
          <Route
            key={`${locale}-${route.path}`}
            path={`/${locale}${route.path}`}
            component={route.component}
          />
        ))
      )}

      {/* Routes without locale prefix (English default) */}
      {publicRoutes.map((route) => (
        <Route key={route.path} path={route.path} component={route.component} />
      ))}
      <Route path="/destinations" component={DestinationsLanding} />
      {/* Specific destination pages must come BEFORE the generic :slug route */}
      <Route path="/destinations/ras-al-khaimah" component={RasAlKhaimahPage} />
      <Route path="/destinations/:slug" component={DestinationPage} />
      <Redirect path="/bangkok" to="/destinations/bangkok" />
      <Redirect path="/paris" to="/destinations/paris" />
      <Redirect path="/istanbul" to="/destinations/istanbul" />
      <Redirect path="/london" to="/destinations/london" />
      <Redirect path="/new-york" to="/destinations/new-york" />
      <Redirect path="/singapore" to="/destinations/singapore" />
      <Route path="/test" component={TestPage} />
      <Route path="/" component={Homepage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith("/admin");
  const isV2Route = location.startsWith("/v2");

  // Initialize Google Analytics on app load
  useEffect(() => {
    initGA();
  }, []);

  // Track page views on route changes
  useAnalytics();

  return (
    <QueryClientProvider client={queryClient}>
      <CookieConsentProvider>
        <LocaleProvider>
          <FavoritesProvider>
            <TooltipProvider>
              <Suspense fallback={<PageLoader />}>
                {isAdminRoute ? (
                  <AdminLayout />
                ) : isV2Route ? (
                  <GeographicProvider>
                    <PublicRouterV2 />
                  </GeographicProvider>
                ) : (
                  <LiveEditProvider>
                    <PublicRouter />
                  </LiveEditProvider>
                )}
              </Suspense>
              <Toaster />
              <CookieConsentBanner />
              <PWAInstallPrompt />
            </TooltipProvider>
          </FavoritesProvider>
        </LocaleProvider>
      </CookieConsentProvider>
    </QueryClientProvider>
  );
}

export default App;

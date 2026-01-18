import { lazy, Suspense, useEffect, useState } from "react";
import { Switch, Route, Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ErrorBoundary } from "@/components/error-boundary";

const AIAssistant = lazy(() => import("@/components/ai-assistant").then(m => ({ default: m.AIAssistant })));
const CommandPalette = lazy(() => import("@/components/command-palette").then(m => ({ default: m.CommandPalette })));
const KeyboardShortcuts = lazy(() => import("@/components/keyboard-shortcuts").then(m => ({ default: m.KeyboardShortcuts })));
const NotificationsCenter = lazy(() => import("@/components/notifications-center").then(m => ({ default: m.NotificationsCenter })));
const MultiTabProvider = lazy(() => import("@/components/multi-tab-editor").then(m => ({ default: m.MultiTabProvider })));
const EditorTabBar = lazy(() => import("@/components/multi-tab-editor").then(m => ({ default: m.EditorTabBar })));
const TabCountBadge = lazy(() => import("@/components/multi-tab-editor").then(m => ({ default: m.TabCountBadge })));
const ContentExpiryAlerts = lazy(() => import("@/components/content-expiry-alerts").then(m => ({ default: m.ContentExpiryAlerts })));

const Dashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const ContentList = lazy(() => import("@/pages/content-list"));
const ContentEditor = lazy(() => import("@/pages/content-editor"));
const RssFeeds = lazy(() => import("@/pages/rss-feeds"));
const AIArticleGenerator = lazy(() => import("@/pages/ai-article-generator"));
const TopicBankPage = lazy(() => import("@/pages/topic-bank"));
const KeywordsPage = lazy(() => import("@/pages/keywords"));
const ClustersPage = lazy(() => import("@/pages/clusters"));
const TagsPage = lazy(() => import("@/pages/tags"));
const AffiliateLinks = lazy(() => import("@/pages/affiliate-links"));
const MediaLibrary = lazy(() => import("@/pages/media-library"));
const ImageEngine = lazy(() => import("@/pages/admin-image-engine"));
const Settings = lazy(() => import("@/pages/settings"));
const ContentRulesPage = lazy(() => import("@/pages/content-rules"));
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
const DistrictsManagement = lazy(() => import("@/pages/admin/districts-management"));
const LandingPagesManagement = lazy(() => import("@/pages/admin/landing-pages-management"));
const OffPlanManagement = lazy(() => import("@/pages/admin/off-plan-management"));
const RealEstateManagement = lazy(() => import("@/pages/admin/real-estate-management"));
const RealEstateEditor = lazy(() => import("@/pages/admin/real-estate-editor"));
const WritersManagement = lazy(() => import("@/pages/admin/writers/WritersManagement"));
const NewsroomDashboard = lazy(() => import("@/pages/admin/writers/NewsroomDashboard"));
const AdminChatInbox = lazy(() => import("@/pages/admin/chat-inbox"));
const OctopusDashboard = lazy(() => import("@/pages/admin/octopus-dashboard"));
const TraviGeneratorDashboard = lazy(() => import("@/pages/admin/IntelligenceDashboard"));
const TraviLocationsList = lazy(() => import("@/pages/admin/travi/locations-list"));
const TraviLocationEdit = lazy(() => import("@/pages/admin/travi/location-edit"));
const TraviLocationPreview = lazy(() => import("@/pages/admin/travi/location-preview"));
const TraviConfiguration = lazy(() => import("@/pages/admin/travi/configuration"));
const TraviDataCollection = lazy(() => import("@/pages/admin/travi/data-collection"));
const TraviApiKeys = lazy(() => import("@/pages/admin/travi/api-keys"));
const TiqetsDashboard = lazy(() => import("@/pages/admin/tiqets/dashboard"));
const TiqetsDestinations = lazy(() => import("@/pages/admin/tiqets/destinations"));
const TiqetsIntegrations = lazy(() => import("@/pages/admin/tiqets/integrations"));
const TiqetsConfiguration = lazy(() => import("@/pages/admin/tiqets/configuration"));
const TiqetsAttractionDetail = lazy(() => import("@/pages/admin/tiqets/attraction-detail"));
const TiqetsAttractionsList = lazy(() => import("@/pages/admin/tiqets-attractions-list"));
const ContentQualityDashboard = lazy(() => import("@/pages/admin/tiqets/content-quality"));
const IngestionDashboard = lazy(() => import("@/pages/admin/ingestion/dashboard"));
const POIExplorer = lazy(() => import("@/pages/poi-explorer"));
const PublicHolidays = lazy(() => import("@/pages/public-holidays"));
const DestinationBrowser = lazy(() => import("@/pages/destination-browser"));
const ExternalDataExplorer = lazy(() => import("@/pages/admin/external-data-explorer"));
const LinksDashboard = lazy(() => import("@/pages/admin/links/dashboard"));
const HelpCenterAdmin = lazy(() => import("@/pages/admin/help"));
const HelpArticleEditor = lazy(() => import("@/pages/admin/help/article-editor"));
const MonetizationPremium = lazy(() => import("@/pages/admin/monetization/premium-content"));
const MonetizationListings = lazy(() => import("@/pages/admin/monetization/business-listings"));
const MonetizationLeads = lazy(() => import("@/pages/admin/monetization/lead-management"));
const MonetizationAffiliates = lazy(() => import("@/pages/admin/monetization/affiliate-dashboard"));
const EnterpriseTeams = lazy(() => import("@/pages/admin/enterprise/teams"));
const EnterpriseWorkflows = lazy(() => import("@/pages/admin/enterprise/workflows"));
const EnterpriseWebhooks = lazy(() => import("@/pages/admin/enterprise/webhooks"));
const EnterpriseActivity = lazy(() => import("@/pages/admin/enterprise/activity-feed"));
const GovernanceDashboard = lazy(() => import("@/pages/admin/governance"));
const GovernanceRoles = lazy(() => import("@/pages/admin/governance/roles"));
const GovernanceUsers = lazy(() => import("@/pages/admin/governance/users"));
const GovernancePolicies = lazy(() => import("@/pages/admin/governance/policies"));
const GovernanceApprovals = lazy(() => import("@/pages/admin/governance/approvals"));
const GovernanceAudit = lazy(() => import("@/pages/admin/governance/audit"));
const CustomerJourney = lazy(() => import("@/pages/admin/analytics/customer-journey"));
const SemanticSearchAdmin = lazy(() => import("@/pages/admin/analytics/semantic-search"));
const PlagiarismCheck = lazy(() => import("@/pages/admin/analytics/plagiarism-check"));
const LiveConsole = lazy(() => import("@/pages/admin/console"));
const Surveys = lazy(() => import("@/pages/surveys"));
const SurveyBuilder = lazy(() => import("@/pages/survey-builder"));
const SurveyResponses = lazy(() => import("@/pages/survey-responses"));
const AdminReferrals = lazy(() => import("@/pages/admin/referrals"));
const AdminQaDashboard = lazy(() => import("@/pages/admin/qa-dashboard"));
const SystemHealthDashboard = lazy(() => import("@/pages/admin/system-health"));
const OperationsDashboard = lazy(() => import("@/pages/admin/operations-dashboard"));
const IntelligenceDashboard = lazy(() => import("@/pages/admin/IntelligenceDashboard"));
const SearchDebugPage = lazy(() => import("@/pages/admin/search-debug"));
const ContentCalendar = lazy(() => import("@/pages/admin/Calendar"));
const EntityMergePage = lazy(() => import("@/pages/admin/entity-merge"));
const ChangeManagement = lazy(() => import("@/pages/admin/change-management"));
const SeoEngineDashboard = lazy(() => import("@/pages/admin/seo-engine/SeoEngineDashboard"));
const SeoEngineContentReport = lazy(() => import("@/pages/admin/seo-engine/SeoEngineContentReport"));
const SeoEngineActionsQueue = lazy(() => import("@/pages/admin/seo-engine/SeoEngineActionsQueue"));
const NotFound = lazy(() => import("@/pages/not-found"));

function AdminPageLoader() {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function AdminContentList({ type }: { type: string }) {
  return (
    <Suspense fallback={<AdminPageLoader />}>
      <ContentList type={type} />
    </Suspense>
  );
}

function AdminRouter() {
  return (
    <Suspense fallback={<AdminPageLoader />}>
      <Switch>
        <Route path="/admin" component={Dashboard} />
        <Route path="/admin/attractions" component={TiqetsAttractionsList} />
        <Route path="/admin/tiqets/attractions/:id" component={TiqetsAttractionDetail} />
        <Route path="/admin/hotels">{() => <AdminContentList type="hotel" />}</Route>
        <Route path="/admin/hotels/new" component={ContentEditor} />
        <Route path="/admin/hotels/:id" component={ContentEditor} />
        <Route path="/admin/dining">{() => <AdminContentList type="dining" />}</Route>
        <Route path="/admin/dining/new" component={ContentEditor} />
        <Route path="/admin/dining/:id" component={ContentEditor} />
        <Route path="/admin/districts" component={DistrictsManagement} />
        <Route path="/admin/districts/listings">{() => <AdminContentList type="district" />}</Route>
        <Route path="/admin/districts/new" component={ContentEditor} />
        <Route path="/admin/districts/:id" component={ContentEditor} />
        <Route path="/admin/transport">{() => <AdminContentList type="transport" />}</Route>
        <Route path="/admin/transport/new" component={ContentEditor} />
        <Route path="/admin/transport/:id" component={ContentEditor} />
        <Route path="/admin/articles">{() => <AdminContentList type="article" />}</Route>
        <Route path="/admin/articles/new" component={ContentEditor} />
        <Route path="/admin/articles/:id" component={ContentEditor} />
        <Route path="/admin/events">{() => <AdminContentList type="event" />}</Route>
        <Route path="/admin/events/new" component={ContentEditor} />
        <Route path="/admin/events/:id" component={ContentEditor} />
        <Route path="/admin/landing-pages" component={LandingPagesManagement} />
        <Route path="/admin/landing-pages/listings">{() => <AdminContentList type="landing_page" />}</Route>
        <Route path="/admin/landing-pages/new" component={ContentEditor} />
        <Route path="/admin/landing-pages/:id" component={ContentEditor} />
        <Route path="/admin/case-studies">{() => <AdminContentList type="case_study" />}</Route>
        <Route path="/admin/case-studies/new" component={ContentEditor} />
        <Route path="/admin/case-studies/:id" component={ContentEditor} />
        <Route path="/admin/off-plan" component={OffPlanManagement} />
        <Route path="/admin/off-plan/listings">{() => <AdminContentList type="off_plan" />}</Route>
        <Route path="/admin/off-plan/new" component={ContentEditor} />
        <Route path="/admin/off-plan/:id" component={ContentEditor} />
        <Route path="/admin/real-estate" component={RealEstateManagement} />
        <Route path="/admin/real-estate/:pageKey" component={RealEstateEditor} />
        <Route path="/admin/rss-feeds" component={RssFeeds} />
        <Route path="/admin/ai-generator" component={AIArticleGenerator} />
        <Route path="/admin/topic-bank" component={TopicBankPage} />
        <Route path="/admin/keywords" component={KeywordsPage} />
        <Route path="/admin/clusters" component={ClustersPage} />
        <Route path="/admin/tags" component={TagsPage} />
        <Route path="/admin/affiliate-links" component={AffiliateLinks} />
        <Route path="/admin/media" component={MediaLibrary} />
        <Route path="/admin/image-engine" component={ImageEngine} />
        <Route path="/admin/settings" component={Settings} />
        <Route path="/admin/contents-rules" component={ContentRulesPage} />
        <Route path="/admin/users" component={UsersPage} />
        <Route path="/admin/homepage-promotions" component={HomepagePromotions} />
        <Route path="/admin/analytics" component={Analytics} />
        <Route path="/admin/audit-logs" component={AuditLogs} />
        <Route path="/admin/logs" component={AdminLogs} />
        <Route path="/admin/newsletter" component={NewsletterSubscribers} />
        <Route path="/admin/campaigns" component={Campaigns} />
        <Route path="/admin/translations" component={TranslationsPage} />
        <Route path="/admin/calendar" component={ContentCalendarPage} />
        <Route path="/admin/templates" component={ContentTemplatesPage} />
        <Route path="/admin/seo-audit" component={SEOAuditPage} />
        <Route path="/admin/auto-pilot" component={AutoPilotPage} />
        <Route path="/admin/social" component={SocialDashboard} />
        <Route path="/admin/growth-dashboard" component={GrowthDashboard} />
        <Route path="/admin/aeo" component={AEODashboard} />
        <Route path="/admin/contents-intelligence" component={ContentIntelligencePage} />
        <Route path="/admin/ai-quality-tools" component={AIQualityToolsPage} />
        <Route path="/admin/destination-intelligence" component={DestinationIntelligencePage} />
        <Route path="/admin/destinations" component={DestinationsListPage} />
        <Route path="/admin/destinations/:slug" component={DestinationHubPage} />
        <Route path="/admin/security" component={SecurityPage} />
        <Route path="/admin/site-settings" component={SiteSettingsPage} />
        <Route path="/admin/navigation" component={NavigationManagerPage} />
        <Route path="/admin/footer" component={FooterManagerPage} />
        <Route path="/admin/homepage" component={HomepageEditorPage} />
        <Route path="/admin/static-pages" component={StaticPagesPage} />
        <Route path="/admin/static-pages/new" component={StaticPageEditorPage} />
        <Route path="/admin/static-pages/edit/:id" component={StaticPageEditorPage} />
        <Route path="/admin/page-builder" component={PageBuilderPage} />
        <Route path="/admin/visual-editor" component={VisualEditorDashboard} />
        <Route path="/admin/visual-editor/:slug" component={VisualEditorSiteEditor} />
        <Route path="/admin/writers" component={WritersManagement} />
        <Route path="/admin/writers/newsroom" component={NewsroomDashboard} />
        <Route path="/admin/chat" component={AdminChatInbox} />
        <Route path="/admin/octopus" component={OctopusDashboard} />
        <Route path="/admin/travi-generator" component={TraviGeneratorDashboard} />
        <Route path="/admin/travi/locations" component={TraviLocationsList} />
        <Route path="/admin/travi/locations/:id" component={TraviLocationEdit} />
        <Route path="/admin/travi/locations/:id/preview" component={TraviLocationPreview} />
        <Route path="/admin/travi/config" component={TraviConfiguration} />
        <Route path="/admin/travi/data-collection" component={TraviDataCollection} />
        <Route path="/admin/travi/api-keys" component={TraviApiKeys} />
        <Route path="/admin/tiqets" component={TiqetsDashboard} />
        <Route path="/admin/tiqets/destinations" component={TiqetsDestinations} />
        <Route path="/admin/tiqets/integrations" component={TiqetsIntegrations} />
        <Route path="/admin/tiqets/configuration" component={TiqetsConfiguration} />
        <Route path="/admin/tiqets/attractions/:id" component={TiqetsAttractionDetail} />
        <Route path="/admin/tiqets/content-quality" component={ContentQualityDashboard} />
        <Route path="/admin/ingestion" component={IngestionDashboard} />
        <Route path="/admin/poi-explorer" component={POIExplorer} />
        <Route path="/admin/public-holidays" component={PublicHolidays} />
        <Route path="/admin/destinations-browser" component={DestinationBrowser} />
        <Route path="/admin/external-data-explorer" component={ExternalDataExplorer} />
        <Route path="/admin/links" component={LinksDashboard} />
        <Route path="/admin/help" component={HelpCenterAdmin} />
        <Route path="/admin/help/articles/new" component={HelpArticleEditor} />
        <Route path="/admin/help/articles/:id" component={HelpArticleEditor} />
        <Route path="/admin/monetization/premium" component={MonetizationPremium} />
        <Route path="/admin/monetization/listings" component={MonetizationListings} />
        <Route path="/admin/monetization/leads" component={MonetizationLeads} />
        <Route path="/admin/monetization/affiliates" component={MonetizationAffiliates} />
        <Route path="/admin/enterprise/teams" component={EnterpriseTeams} />
        <Route path="/admin/enterprise/workflows" component={EnterpriseWorkflows} />
        <Route path="/admin/enterprise/webhooks" component={EnterpriseWebhooks} />
        <Route path="/admin/enterprise/activity" component={EnterpriseActivity} />
        <Route path="/admin/governance" component={GovernanceDashboard} />
        <Route path="/admin/governance/roles" component={GovernanceRoles} />
        <Route path="/admin/governance/users" component={GovernanceUsers} />
        <Route path="/admin/governance/policies" component={GovernancePolicies} />
        <Route path="/admin/governance/approvals" component={GovernanceApprovals} />
        <Route path="/admin/governance/audit" component={GovernanceAudit} />
        <Route path="/admin/analytics/journey" component={CustomerJourney} />
        <Route path="/admin/analytics/search" component={SemanticSearchAdmin} />
        <Route path="/admin/analytics/plagiarism" component={PlagiarismCheck} />
        <Route path="/admin/console" component={LiveConsole} />
        <Route path="/admin/surveys" component={Surveys} />
        <Route path="/admin/surveys/new" component={SurveyBuilder} />
        <Route path="/admin/surveys/:id" component={SurveyBuilder} />
        <Route path="/admin/surveys/:id/responses" component={SurveyResponses} />
        <Route path="/admin/referrals" component={AdminReferrals} />
        <Route path="/admin/qa" component={AdminQaDashboard} />
        <Route path="/admin/system-health" component={SystemHealthDashboard} />
        <Route path="/admin/intelligence" component={IntelligenceDashboard} />
        <Route path="/admin/operations" component={OperationsDashboard} />
        <Route path="/admin/search-debug" component={SearchDebugPage} />
        <Route path="/admin/scheduling" component={ContentCalendar} />
        <Route path="/admin/entity-merge" component={EntityMergePage} />
        <Route path="/admin/changes" component={ChangeManagement} />
        <Route path="/admin/seo-engine" component={SeoEngineDashboard} />
        <Route path="/admin/seo-engine/contents" component={SeoEngineContentReport} />
        <Route path="/admin/seo-engine/actions" component={SeoEngineActionsQueue} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function AdminLayout() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  useEffect(() => {
    import('@/lib/i18n/config').then(({ changeLanguage }) => {
      changeLanguage('en');
    });
  }, []);

  useEffect(() => {
    const setMetaTag = (name: string, contents: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        document.head.appendChild(meta);
      }
      meta.content = contents;
    };
    setMetaTag("robots", "noindex, nofollow");
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
    <Suspense fallback={<AdminPageLoader />}>
      <MultiTabProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full bg-background">
            <AppSidebar user={user} />
            <div className="flex flex-col flex-1 min-w-0 bg-muted/30">
              <header className="flex items-center justify-between gap-4 p-3 border-b sticky top-0 z-50 bg-background">
                <div className="flex items-center gap-3">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <Suspense fallback={null}>
                    <TabCountBadge />
                  </Suspense>
                </div>
                <div className="flex items-center gap-2">
                  <Suspense fallback={null}>
                    <ContentExpiryAlerts compact />
                    <NotificationsCenter />
                  </Suspense>
                  <ThemeToggle />
                </div>
              </header>
              <Suspense fallback={null}>
                <EditorTabBar />
              </Suspense>
              <main className="flex-1 overflow-auto p-6">
                <ErrorBoundary>
                  <AdminRouter />
                </ErrorBoundary>
              </main>
            </div>
            <Suspense fallback={null}>
              <AIAssistant />
              <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
              <KeyboardShortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
            </Suspense>
          </div>
        </SidebarProvider>
      </MultiTabProvider>
    </Suspense>
  );
}

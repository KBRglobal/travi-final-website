import { lazy, Suspense, useEffect, useState } from "react";
import { Switch, Route, Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ErrorBoundary } from "@/components/error-boundary";

// ============================================================================
// Lazy-loaded Components
// ============================================================================

const AIAssistant = lazy(() =>
  import("@/components/ai-assistant").then(m => ({ default: m.AIAssistant }))
);
const CommandPalette = lazy(() =>
  import("@/components/command-palette").then(m => ({ default: m.CommandPalette }))
);
const KeyboardShortcuts = lazy(() =>
  import("@/components/keyboard-shortcuts").then(m => ({ default: m.KeyboardShortcuts }))
);
const NotificationsCenter = lazy(() =>
  import("@/components/notifications-center").then(m => ({ default: m.NotificationsCenter }))
);
const MultiTabProvider = lazy(() =>
  import("@/components/multi-tab-editor").then(m => ({ default: m.MultiTabProvider }))
);
const EditorTabBar = lazy(() =>
  import("@/components/multi-tab-editor").then(m => ({ default: m.EditorTabBar }))
);
const TabCountBadge = lazy(() =>
  import("@/components/multi-tab-editor").then(m => ({ default: m.TabCountBadge }))
);
const ContentExpiryAlerts = lazy(() =>
  import("@/components/content-expiry-alerts").then(m => ({ default: m.ContentExpiryAlerts }))
);

// ============================================================================
// Core Pages
// ============================================================================

const Dashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const NotFound = lazy(() => import("@/pages/not-found"));

// ============================================================================
// CONTENT Category Pages
// ============================================================================

// Destinations
const DestinationsListPage = lazy(() => import("@/pages/admin/destinations/destinations-list"));
const DestinationHubPage = lazy(() => import("@/pages/admin/destinations/destination-hub"));
const DestinationNewPage = lazy(() => import("@/pages/admin/destinations/destination-new"));
const DestinationsIndexEditorPage = lazy(
  () => import("@/pages/admin/destinations/destinations-index-editor")
);

// Attractions
const TiqetsAttractionsList = lazy(() => import("@/pages/admin/tiqets-attractions-list"));
const TiqetsAttractionDetail = lazy(() => import("@/pages/admin/tiqets/attraction-detail"));

// Articles & Content
const ContentList = lazy(() => import("@/pages/content-list"));
const ContentEditor = lazy(() => import("@/pages/content-editor"));

// Static Pages
const StaticPagesPage = lazy(() => import("@/pages/admin/static-pages"));
const StaticPageEditorPage = lazy(() => import("@/pages/admin/static-page-editor"));

// Media
const MediaLibrary = lazy(() => import("@/pages/media-library"));
const ImageEngine = lazy(() => import("@/pages/admin-image-engine"));

// ============================================================================
// OCTYPO Category Pages
// ============================================================================

const OctypoDashboard = lazy(() => import("@/pages/admin/octypo/dashboard"));
const OctypoAutopilot = lazy(() => import("@/pages/admin/octypo/autopilot"));
const OctypoContent = lazy(() => import("@/pages/admin/octypo/content"));
const OctypoReviewQueue = lazy(() => import("@/pages/admin/octypo/review-queue"));
const OctypoWritersRoom = lazy(() => import("@/pages/admin/octypo/writers-room"));
const OctypoAIAgents = lazy(() => import("@/pages/admin/octypo/ai-agents"));
const OctypoWorkflows = lazy(() => import("@/pages/admin/octypo/workflows"));
const OctypoEngines = lazy(() => import("@/pages/admin/octypo/engines"));
const OctypoQueueMonitor = lazy(() => import("@/pages/admin/octypo/queue-monitor"));

// ============================================================================
// ANALYTICS & SEO Category Pages
// ============================================================================

const Analytics = lazy(() => import("@/pages/analytics"));
const GrowthDashboard = lazy(() => import("@/pages/admin/growth-dashboard"));
const SeoHub = lazy(() => import("@/pages/admin/seo-hub"));
const SeoEngineDashboard = lazy(() => import("@/pages/admin/seo-engine/SeoEngineDashboard"));
const SeoEngineContentReport = lazy(
  () => import("@/pages/admin/seo-engine/SeoEngineContentReport")
);
const SeoEngineActionsQueue = lazy(() => import("@/pages/admin/seo-engine/SeoEngineActionsQueue"));
const SEOAuditPage = lazy(() => import("@/pages/seo-audit"));
const AEODashboard = lazy(() => import("@/pages/admin/aeo-dashboard"));

// ============================================================================
// SETTINGS Category Pages
// ============================================================================

const SettingsHub = lazy(() => import("@/pages/admin/settings-hub"));
const SiteSettingsPage = lazy(() => import("@/pages/admin/site-settings"));
const UsersPage = lazy(() => import("@/pages/users"));
const TraviApiKeys = lazy(() => import("@/pages/admin/travi/api-keys"));
const SecurityPage = lazy(() => import("@/pages/admin/security"));
const NavigationManagerPage = lazy(() => import("@/pages/admin/navigation-manager"));
const FooterManagerPage = lazy(() => import("@/pages/admin/footer-manager"));
const Settings = lazy(() => import("@/pages/settings"));

// ============================================================================
// OPERATIONS Category Pages
// ============================================================================

const SystemHealthDashboard = lazy(() => import("@/pages/admin/system-health"));
const AuditLogs = lazy(() => import("@/pages/audit-logs"));
const AdminLogs = lazy(() => import("@/pages/admin-logs"));
const LiveConsole = lazy(() => import("@/pages/admin/console"));
const AutonomyControlPlane = lazy(() => import("@/pages/admin/AutonomyControlPlane"));
const AIQualityTools = lazy(() => import("@/pages/admin/ai-quality-tools"));
const AlertsPage = lazy(() => import("@/pages/admin/alerts"));
const SearchDebug = lazy(() => import("@/pages/admin/search-debug"));
const ChatInbox = lazy(() => import("@/pages/admin/chat-inbox"));
const ReferralsPage = lazy(() => import("@/pages/admin/referrals"));

// ============================================================================
// Additional Pages (accessible but not in main navigation)
// ============================================================================

// Content Management
const RssFeeds = lazy(() => import("@/pages/rss-feeds"));
const ClustersPage = lazy(() => import("@/pages/clusters"));
const TagsPage = lazy(() => import("@/pages/tags"));
const ContentTemplatesPage = lazy(() => import("@/pages/content-templates"));
const PageBuilderPage = lazy(() => import("@/pages/admin/page-builder"));
const VisualEditorDashboard = lazy(() => import("@/pages/admin/visual-editor/sites-dashboard"));
const VisualEditorSiteEditor = lazy(() => import("@/pages/admin/visual-editor/site-editor"));
const HomepageEditorPage = lazy(() => import("@/pages/admin/homepage-editor"));

// AI/Writers
const WritersHub = lazy(() => import("@/pages/admin/writers-hub"));
const WritersManagement = lazy(() => import("@/pages/admin/writers/WritersManagement"));
const NewsroomDashboard = lazy(() => import("@/pages/admin/writers/NewsroomDashboard"));
const ContentIntelligencePage = lazy(() => import("@/pages/admin/content-intelligence"));
const DestinationIntelligencePage = lazy(() => import("@/pages/admin/destination-intelligence"));

// Marketing
const Campaigns = lazy(() => import("@/pages/campaigns"));
const NewsletterSubscribers = lazy(() => import("@/pages/newsletter-subscribers"));
const AffiliateLinks = lazy(() => import("@/pages/affiliate-links"));

// Enterprise & Operations
const EnterpriseTeams = lazy(() => import("@/pages/admin/enterprise/teams"));
const LinksDashboard = lazy(() => import("@/pages/admin/links/dashboard"));
const HelpCenterAdmin = lazy(() => import("@/pages/admin/help"));
const HelpArticleEditor = lazy(() => import("@/pages/admin/help/article-editor"));
const SocialDashboard = lazy(() => import("@/pages/admin/social/social-dashboard"));

// Enterprise Features
const EnterpriseWorkflows = lazy(() => import("@/pages/admin/enterprise/workflows"));
const EnterpriseWebhooks = lazy(() => import("@/pages/admin/enterprise/webhooks"));
const GovernanceHub = lazy(() => import("@/pages/admin/governance-hub"));
const GovernanceDashboard = lazy(() => import("@/pages/admin/governance"));
const GovernanceRoles = lazy(() => import("@/pages/admin/governance/roles"));
const GovernanceUsers = lazy(() => import("@/pages/admin/governance/users"));

// Integrations
const TiqetsDashboard = lazy(() => import("@/pages/admin/tiqets/dashboard"));
const TiqetsDestinations = lazy(() => import("@/pages/admin/tiqets/destinations"));
const TiqetsIntegrations = lazy(() => import("@/pages/admin/tiqets/integrations"));
const TiqetsConfiguration = lazy(() => import("@/pages/admin/tiqets/configuration"));
const ContentQualityDashboard = lazy(() => import("@/pages/admin/tiqets/content-quality"));
const IngestionDashboard = lazy(() => import("@/pages/admin/ingestion/dashboard"));
const TraviConfiguration = lazy(() => import("@/pages/admin/travi/configuration"));

// Misc
const TranslationsPage = lazy(() => import("@/pages/translations"));
const ContentCalendarPage = lazy(() => import("@/pages/content-calendar"));
const AdminQaDashboard = lazy(() => import("@/pages/admin/qa-dashboard"));

// ============================================================================
// Loader Component
// ============================================================================

function AdminPageLoader() {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--admin-text-muted))]" />
    </div>
  );
}

// ============================================================================
// Content List Wrapper
// ============================================================================

type ContentType =
  | "attraction"
  | "hotel"
  | "article"
  | "dining"
  | "district"
  | "transport"
  | "event"
  | "itinerary"
  | "landing_page"
  | "case_study"
  | "off_plan";

function AdminContentList({ type }: { type: ContentType }) {
  return (
    <Suspense fallback={<AdminPageLoader />}>
      <ContentList type={type} />
    </Suspense>
  );
}

// ============================================================================
// Router
// ============================================================================

function AdminRouter() {
  return (
    <Suspense fallback={<AdminPageLoader />}>
      <Switch>
        {/* Dashboard */}
        <Route path="/admin" component={Dashboard} />

        {/* ============== CONTENT ============== */}
        {/* Destinations */}
        <Route path="/admin/destinations" component={DestinationsListPage} />
        <Route path="/admin/destinations/new" component={DestinationNewPage} />
        <Route path="/admin/destinations/index-editor" component={DestinationsIndexEditorPage} />
        <Route path="/admin/destinations/:slug" component={DestinationHubPage} />

        {/* Attractions */}
        <Route path="/admin/attractions" component={TiqetsAttractionsList} />
        <Route path="/admin/attractions/:id" component={TiqetsAttractionDetail} />

        {/* Articles */}
        <Route path="/admin/articles">{() => <AdminContentList type="article" />}</Route>
        <Route path="/admin/articles/new" component={ContentEditor} />
        <Route path="/admin/articles/:id" component={ContentEditor} />

        {/* Static Pages */}
        <Route path="/admin/static-pages" component={StaticPagesPage} />
        <Route path="/admin/static-pages/new" component={StaticPageEditorPage} />
        <Route path="/admin/static-pages/edit/:id" component={StaticPageEditorPage} />

        {/* Media */}
        <Route path="/admin/media" component={MediaLibrary} />
        <Route path="/admin/image-engine" component={ImageEngine} />

        {/* ============== OCTYPO ============== */}
        <Route path="/admin/octypo" component={OctypoDashboard} />
        <Route path="/admin/octypo/dashboard" component={OctypoDashboard} />
        <Route path="/admin/octypo/autopilot" component={OctypoAutopilot} />
        <Route path="/admin/octypo/content" component={OctypoContent} />
        <Route path="/admin/octypo/review-queue" component={OctypoReviewQueue} />
        <Route path="/admin/octypo/writers-room" component={OctypoWritersRoom} />
        <Route path="/admin/octypo/ai-agents" component={OctypoAIAgents} />
        <Route path="/admin/octypo/workflows" component={OctypoWorkflows} />
        <Route path="/admin/octypo/engines" component={OctypoEngines} />
        <Route path="/admin/octypo/queue-monitor" component={OctypoQueueMonitor} />

        {/* ============== ANALYTICS & SEO ============== */}
        <Route path="/admin/analytics" component={Analytics} />
        <Route path="/admin/growth-dashboard" component={GrowthDashboard} />
        <Route path="/admin/seo-hub" component={SeoHub} />
        <Route path="/admin/seo-engine" component={SeoEngineDashboard} />
        <Route path="/admin/seo-engine/contents" component={SeoEngineContentReport} />
        <Route path="/admin/seo-engine/actions" component={SeoEngineActionsQueue} />
        <Route path="/admin/seo-audit" component={SEOAuditPage} />
        <Route path="/admin/aeo" component={AEODashboard} />

        {/* ============== SETTINGS ============== */}
        <Route path="/admin/settings-hub" component={SettingsHub} />
        <Route path="/admin/site-settings" component={SiteSettingsPage} />
        <Route path="/admin/settings" component={Settings} />
        <Route path="/admin/users" component={UsersPage} />
        <Route path="/admin/security" component={SecurityPage} />
        <Route path="/admin/navigation" component={NavigationManagerPage} />
        <Route path="/admin/footer" component={FooterManagerPage} />
        <Route path="/admin/travi/api-keys" component={TraviApiKeys} />
        <Route path="/admin/travi/config" component={TraviConfiguration} />

        {/* ============== OPERATIONS ============== */}
        <Route path="/admin/system-health" component={SystemHealthDashboard} />
        <Route path="/admin/audit-logs" component={AuditLogs} />
        <Route path="/admin/logs" component={AdminLogs} />
        <Route path="/admin/console" component={LiveConsole} />
        <Route path="/admin/qa" component={AdminQaDashboard} />
        <Route path="/admin/autonomy" component={AutonomyControlPlane} />
        <Route path="/admin/ai-quality" component={AIQualityTools} />
        <Route path="/admin/alerts" component={AlertsPage} />
        <Route path="/admin/search-debug" component={SearchDebug} />
        <Route path="/admin/chat-inbox" component={ChatInbox} />
        <Route path="/admin/referrals" component={ReferralsPage} />

        {/* ============== ADDITIONAL PAGES ============== */}
        {/* Content Management */}
        <Route path="/admin/clusters" component={ClustersPage} />
        <Route path="/admin/tags" component={TagsPage} />
        <Route path="/admin/templates" component={ContentTemplatesPage} />
        <Route path="/admin/rss-feeds" component={RssFeeds} />
        <Route path="/admin/page-builder" component={PageBuilderPage} />
        <Route path="/admin/visual-editor" component={VisualEditorDashboard} />
        <Route path="/admin/visual-editor/:slug" component={VisualEditorSiteEditor} />
        <Route path="/admin/homepage" component={HomepageEditorPage} />
        <Route path="/admin/calendar" component={ContentCalendarPage} />

        {/* AI/Writers */}
        <Route path="/admin/writers" component={WritersHub} />
        <Route path="/admin/contents-intelligence" component={ContentIntelligencePage} />
        <Route path="/admin/destination-intelligence" component={DestinationIntelligencePage} />

        {/* Marketing */}
        <Route path="/admin/campaigns" component={Campaigns} />
        <Route path="/admin/newsletter" component={NewsletterSubscribers} />
        <Route path="/admin/affiliate-links" component={AffiliateLinks} />
        <Route path="/admin/social" component={SocialDashboard} />
        <Route path="/admin/translations" component={TranslationsPage} />

        {/* Enterprise */}
        <Route path="/admin/enterprise/workflows" component={EnterpriseWorkflows} />
        <Route path="/admin/enterprise/webhooks" component={EnterpriseWebhooks} />
        <Route path="/admin/enterprise/teams" component={EnterpriseTeams} />
        <Route path="/admin/governance" component={GovernanceHub} />

        {/* SEO & Links */}
        <Route path="/admin/links" component={LinksDashboard} />

        {/* Help Center */}
        <Route path="/admin/help" component={HelpCenterAdmin} />
        <Route path="/admin/help/article/:id" component={HelpArticleEditor} />

        {/* Integrations */}
        <Route path="/admin/tiqets" component={TiqetsDashboard} />
        <Route path="/admin/tiqets/destinations" component={TiqetsDestinations} />
        <Route path="/admin/tiqets/integrations" component={TiqetsIntegrations} />
        <Route path="/admin/tiqets/configuration" component={TiqetsConfiguration} />
        <Route path="/admin/tiqets/attractions/:id" component={TiqetsAttractionDetail} />
        <Route path="/admin/tiqets/content-quality" component={ContentQualityDashboard} />
        <Route path="/admin/ingestion" component={IngestionDashboard} />

        {/* Fallback */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// ============================================================================
// Main Layout
// ============================================================================

export default function AdminLayout() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const style = {
    "--sidebar-width": "var(--admin-sidebar-width)",
    "--sidebar-width-icon": "var(--admin-sidebar-collapsed-width)",
  };

  useEffect(() => {
    import("@/lib/i18n/config").then(({ changeLanguage }) => {
      changeLanguage("en");
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
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--admin-bg))]">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--admin-text-muted))]" />
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
          <div className="flex h-screen w-full bg-[hsl(var(--admin-bg))]">
            <AdminSidebar user={user} />
            <div className="flex flex-col flex-1 min-w-0">
              <header
                className="flex items-center justify-between gap-4 px-4 border-b border-[hsl(var(--admin-border))] sticky top-0 z-50 bg-[hsl(var(--admin-surface))]"
                style={{ height: "var(--admin-header-height)" }}
              >
                <div className="flex items-center gap-3">
                  <SidebarTrigger
                    data-testid="button-sidebar-toggle"
                    className="h-8 w-8 text-[hsl(var(--admin-text-secondary))] hover:text-[hsl(var(--admin-text))] hover:bg-[hsl(var(--admin-surface-hover))]"
                  />
                  <Suspense fallback={null}>
                    <TabCountBadge />
                  </Suspense>
                </div>
                <div className="flex items-center gap-1.5">
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
              <main className="flex-1 overflow-auto p-5 bg-[hsl(var(--admin-bg))]">
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

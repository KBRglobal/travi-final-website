import { lazy, Suspense, useEffect, useState } from "react";
import { Switch, Route, Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { TranslatedErrorBoundary } from "@/components/error-boundary";

const CommandPalette = lazy(() =>
  import("@/components/command-palette")
    .then(m => ({ default: m.CommandPalette }))
    .catch(err => {
      console.error("[LazyLoad] Failed to load CommandPalette:", err);
      throw err;
    })
);
const KeyboardShortcuts = lazy(() =>
  import("@/components/keyboard-shortcuts")
    .then(m => ({ default: m.KeyboardShortcuts }))
    .catch(err => {
      console.error("[LazyLoad] Failed to load KeyboardShortcuts:", err);
      throw err;
    })
);
const NotificationsCenter = lazy(() =>
  import("@/components/notifications-center")
    .then(m => ({ default: m.NotificationsCenter }))
    .catch(err => {
      console.error("[LazyLoad] Failed to load NotificationsCenter:", err);
      throw err;
    })
);
const MultiTabProvider = lazy(() =>
  import("@/components/multi-tab-editor")
    .then(m => ({ default: m.MultiTabProvider }))
    .catch(err => {
      console.error("[LazyLoad] Failed to load MultiTabProvider:", err);
      throw err;
    })
);
const TabCountBadge = lazy(() =>
  import("@/components/multi-tab-editor")
    .then(m => ({ default: m.TabCountBadge }))
    .catch(err => {
      console.error("[LazyLoad] Failed to load TabCountBadge:", err);
      throw err;
    })
);

const Dashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const Settings = lazy(() => import("@/pages/settings"));
const SiteSettingsPage = lazy(() => import("@/pages/admin/site-settings"));
const HomepageEditorPage = lazy(() => import("@/pages/admin/homepage-editor"));
const DestinationsListPage = lazy(() => import("@/pages/admin/destinations/destinations-list"));
const DestinationHubPage = lazy(() => import("@/pages/admin/destinations/destination-hub"));
const DestinationNewPage = lazy(() => import("@/pages/admin/destinations/destination-new"));
const TiqetsAttractionsList = lazy(() => import("@/pages/admin/tiqets-attractions-list"));
const AttractionDetailPage = lazy(() => import("@/pages/admin/tiqets/attraction-detail"));
const OctypoDashboardNew = lazy(() => import("@/pages/admin/octypo/dashboard"));
const OctypoReviewQueue = lazy(() => import("@/pages/admin/octypo/review-queue"));
const OctypoWritersRoom = lazy(() => import("@/pages/admin/octypo/writers-room"));
const OctypoAIAgents = lazy(() => import("@/pages/admin/octypo/ai-agents"));
const OctypoWorkflows = lazy(() => import("@/pages/admin/octypo/workflows"));
const OctypoEngines = lazy(() => import("@/pages/admin/octypo/engines"));
const OctypoQueueMonitor = lazy(() => import("@/pages/admin/octypo/queue-monitor"));
const OctypoSettings = lazy(() => import("@/pages/admin/octypo/settings"));
const GatekeeperDashboard = lazy(() => import("@/pages/admin/gatekeeper/dashboard"));
const RssFeedsPage = lazy(() => import("@/pages/admin/rss-feeds"));
const NotFound = lazy(() => import("@/pages/not-found"));

function AdminPageLoader() {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function AdminRouter() {
  return (
    <Suspense fallback={<AdminPageLoader />}>
      <Switch>
        <Route path="/admin" component={Dashboard} />
        <Route path="/admin/attractions" component={TiqetsAttractionsList} />
        <Route path="/admin/attractions/:id" component={AttractionDetailPage} />
        <Route path="/admin/settings" component={Settings} />
        <Route path="/admin/site-settings" component={SiteSettingsPage} />
        <Route path="/admin/homepage" component={HomepageEditorPage} />
        <Route path="/admin/destinations" component={DestinationsListPage} />
        <Route path="/admin/destinations/new" component={DestinationNewPage} />
        <Route path="/admin/destinations/:slug" component={DestinationHubPage} />
        <Route path="/admin/octypo" component={OctypoDashboardNew} />
        <Route path="/admin/octypo/dashboard" component={OctypoDashboardNew} />
        <Route path="/admin/octypo/review-queue" component={OctypoReviewQueue} />
        <Route path="/admin/octypo/writers-room" component={OctypoWritersRoom} />
        <Route path="/admin/octypo/ai-agents" component={OctypoAIAgents} />
        <Route path="/admin/octypo/workflows" component={OctypoWorkflows} />
        <Route path="/admin/octypo/engines" component={OctypoEngines} />
        <Route path="/admin/octypo/queue-monitor" component={OctypoQueueMonitor} />
        <Route path="/admin/octypo/settings" component={OctypoSettings} />
        <Route path="/admin/gatekeeper" component={GatekeeperDashboard} />
        <Route path="/admin/gatekeeper/dashboard" component={GatekeeperDashboard} />
        <Route path="/admin/rss-feeds" component={RssFeedsPage} />
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
    import("@/lib/i18n/config")
      .then(({ changeLanguage }) => {
        changeLanguage("en");
      })
      .catch(err => {
        console.error("[AdminModule] Failed to load i18n config:", err);
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
                    <NotificationsCenter />
                  </Suspense>
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-auto p-4 md:p-6">
                <TranslatedErrorBoundary>
                  <AdminRouter />
                </TranslatedErrorBoundary>
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Suspense fallback={null}>
          <CommandPalette
            open={commandPaletteOpen}
            onOpenChange={setCommandPaletteOpen}
            onShortcutsOpen={() => setShortcutsOpen(true)}
          />
          <KeyboardShortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
        </Suspense>
      </MultiTabProvider>
    </Suspense>
  );
}

import { Suspense, lazy, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Menu, LayoutPanelTop, Shield, Key } from "lucide-react";

// Lazy load the individual settings pages
const SiteSettingsContent = lazy(() => import("./site-settings"));
const NavigationContent = lazy(() => import("./navigation-manager"));
const FooterContent = lazy(() => import("./footer-manager"));
const SecurityContent = lazy(() => import("./security"));
const ApiKeysContent = lazy(() => import("./api-keys-setup"));

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid gap-4 mt-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

const tabs = [
  { id: "site", label: "Site Config", icon: Settings },
  { id: "navigation", label: "Navigation", icon: Menu },
  { id: "footer", label: "Footer", icon: LayoutPanelTop },
  { id: "security", label: "Security", icon: Shield },
  { id: "api-keys", label: "API Keys", icon: Key },
];

export default function SettingsHub() {
  const [activeTab, setActiveTab] = useState("site");

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
      <div className="border-b border-[hsl(var(--admin-border))] bg-white">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-[hsl(var(--admin-text))]">Settings</h1>
          <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1">
            Configure your site, navigation, footer, security, and integrations
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-[hsl(var(--admin-border))] bg-white px-6">
          <TabsList className="h-12 bg-transparent gap-0 p-0">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="h-12 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2 text-[hsl(var(--admin-text-secondary))] data-[state=active]:text-[hsl(var(--admin-text))]"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <div className="p-6">
          <TabsContent value="site" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <SiteSettingsContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="navigation" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <NavigationContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="footer" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <FooterContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <SecurityContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="api-keys" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <ApiKeysContent />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

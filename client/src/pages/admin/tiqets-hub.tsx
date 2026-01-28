/**
 * Tiqets Hub
 * Consolidated interface for all Tiqets integration features.
 */

import { Suspense, lazy, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, MapPin, Ticket, Link2, Settings, CheckCircle } from "lucide-react";

// Lazy load Tiqets pages
const TiqetsDashboard = lazy(() => import("./tiqets/dashboard"));
const TiqetsDestinations = lazy(() => import("./tiqets/destinations"));
const TiqetsAttractions = lazy(() => import("./tiqets-attractions-list"));
const TiqetsIntegrations = lazy(() => import("./tiqets/integrations"));
const TiqetsConfiguration = lazy(() => import("./tiqets/configuration"));
const TiqetsContentQuality = lazy(() => import("./tiqets/content-quality"));

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid gap-4 mt-6 md:grid-cols-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "destinations", label: "Destinations", icon: MapPin },
  { id: "attractions", label: "Attractions", icon: Ticket },
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "configuration", label: "Configuration", icon: Settings },
  { id: "content-quality", label: "Content Quality", icon: CheckCircle },
];

export default function TiqetsHub() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
      <div className="border-b border-[hsl(var(--admin-border))] bg-white">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-[hsl(var(--admin-text))]">
            Tiqets Integration
          </h1>
          <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1">
            Manage Tiqets attractions, destinations, and content quality
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
          <TabsContent value="dashboard" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <TiqetsDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="destinations" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <TiqetsDestinations />
            </Suspense>
          </TabsContent>

          <TabsContent value="attractions" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <TiqetsAttractions />
            </Suspense>
          </TabsContent>

          <TabsContent value="integrations" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <TiqetsIntegrations />
            </Suspense>
          </TabsContent>

          <TabsContent value="configuration" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <TiqetsConfiguration />
            </Suspense>
          </TabsContent>

          <TabsContent value="content-quality" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <TiqetsContentQuality />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

/**
 * Enterprise Hub
 * Consolidated interface for all enterprise features.
 */

import { Suspense, lazy, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, GitBranch, Webhook } from "lucide-react";

// Lazy load enterprise pages
const EnterpriseTeams = lazy(() => import("./enterprise/teams"));
const EnterpriseWorkflows = lazy(() => import("./enterprise/workflows"));
const EnterpriseWebhooks = lazy(() => import("./enterprise/webhooks"));

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
  { id: "teams", label: "Teams", icon: Users },
  { id: "workflows", label: "Workflows", icon: GitBranch },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
];

export default function EnterpriseHub() {
  const [activeTab, setActiveTab] = useState("teams");

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
      <div className="border-b border-[hsl(var(--admin-border))] bg-white">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-[hsl(var(--admin-text))]">
            Enterprise Features
          </h1>
          <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1">
            Manage teams, workflows, and webhooks
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
          <TabsContent value="teams" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <EnterpriseTeams />
            </Suspense>
          </TabsContent>

          <TabsContent value="workflows" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <EnterpriseWorkflows />
            </Suspense>
          </TabsContent>

          <TabsContent value="webhooks" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <EnterpriseWebhooks />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

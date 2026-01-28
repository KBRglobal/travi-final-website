/**
 * Writers Hub
 * Consolidated interface for writer management and newsroom.
 */

import { Suspense, lazy, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Newspaper } from "lucide-react";

// Lazy load writers pages
const WritersManagement = lazy(() => import("./writers/WritersManagement"));
const NewsroomDashboard = lazy(() => import("./writers/NewsroomDashboard"));

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid gap-4 mt-6 md:grid-cols-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

const tabs = [
  { id: "writers", label: "Writers", icon: Users },
  { id: "newsroom", label: "Newsroom", icon: Newspaper },
];

export default function WritersHub() {
  const [activeTab, setActiveTab] = useState("writers");

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
      <div className="border-b border-[hsl(var(--admin-border))] bg-white">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-[hsl(var(--admin-text))]">
            Writers & Newsroom
          </h1>
          <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1">
            Manage writers, assignments, and newsroom operations
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
          <TabsContent value="writers" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <WritersManagement />
            </Suspense>
          </TabsContent>

          <TabsContent value="newsroom" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <NewsroomDashboard />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

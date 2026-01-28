import { Suspense, lazy, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, FileText, Bot } from "lucide-react";
import { PageSeoEditor } from "./page-seo-editor";

// Lazy load the individual SEO pages
const SeoEngineDashboard = lazy(() => import("./seo-engine/SeoEngineDashboard"));
const AeoDashboard = lazy(() => import("./aeo-dashboard"));

// PageSeoEditor wrapper for the hub (selects page to edit)
function PageSeoEditorWrapper() {
  const [selectedPath, setSelectedPath] = useState("/");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 pb-4 border-b">
        <Label className="text-sm font-medium">Page Path:</Label>
        <Input
          type="text"
          value={selectedPath}
          onChange={e => setSelectedPath(e.target.value)}
          placeholder="/destinations/dubai"
          className="w-80"
        />
      </div>
      <PageSeoEditor pagePath={selectedPath} pageLabel={selectedPath} />
    </div>
  );
}

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
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

const tabs = [
  { id: "engine", label: "SEO Engine", icon: Search },
  { id: "page-seo", label: "Page SEO", icon: FileText },
  { id: "aeo", label: "AEO (AI Engines)", icon: Bot },
];

export default function SeoHub() {
  const [activeTab, setActiveTab] = useState("engine");

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
      <div className="border-b border-[hsl(var(--admin-border))] bg-white">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-[hsl(var(--admin-text))]">
            SEO & Optimization
          </h1>
          <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1">
            Manage SEO engine, page metadata, and AI engine optimization
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
          <TabsContent value="engine" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <SeoEngineDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="page-seo" className="mt-0">
            <PageSeoEditorWrapper />
          </TabsContent>

          <TabsContent value="aeo" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <AeoDashboard />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

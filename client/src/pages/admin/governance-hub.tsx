/**
 * Governance Hub
 * Consolidated interface for all enterprise governance features.
 */

import { Suspense, lazy, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Users, FileCheck, Clock, History } from "lucide-react";

// Lazy load governance pages
const GovernanceDashboard = lazy(() => import("./governance/index"));
const GovernanceRoles = lazy(() => import("./governance/roles"));
const GovernanceUsers = lazy(() => import("./governance/users"));
const GovernancePolicies = lazy(() => import("./governance/policies"));
const GovernanceApprovals = lazy(() => import("./governance/approvals"));
const GovernanceAudit = lazy(() => import("./governance/audit"));

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
  { id: "overview", label: "Overview", icon: Shield },
  { id: "roles", label: "Roles", icon: Shield },
  { id: "users", label: "Users", icon: Users },
  { id: "policies", label: "Policies", icon: FileCheck },
  { id: "approvals", label: "Approvals", icon: Clock },
  { id: "audit", label: "Audit Log", icon: History },
];

export default function GovernanceHub() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
      <div className="border-b border-[hsl(var(--admin-border))] bg-white">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-[hsl(var(--admin-text))]">
            Enterprise Governance
          </h1>
          <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1">
            Manage roles, users, policies, approvals, and audit trails
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
          <TabsContent value="overview" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <GovernanceDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="roles" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <GovernanceRoles />
            </Suspense>
          </TabsContent>

          <TabsContent value="users" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <GovernanceUsers />
            </Suspense>
          </TabsContent>

          <TabsContent value="policies" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <GovernancePolicies />
            </Suspense>
          </TabsContent>

          <TabsContent value="approvals" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <GovernanceApprovals />
            </Suspense>
          </TabsContent>

          <TabsContent value="audit" className="mt-0">
            <Suspense fallback={<LoadingSkeleton />}>
              <GovernanceAudit />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

/**
 * SEO Engine Dashboard
 *
 * Provides an overview of the SEO Engine health and status.
 * Feature flag: ENABLE_SEO_ENGINE
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout, StatCard, AdminSection } from "@/components/admin";
import { apiRequest } from "@/lib/queryClient";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Gauge,
  Link2,
  RefreshCw,
  Search,
  Shield,
  Target,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";

interface EngineStatus {
  enabled: boolean;
  autopilotMode: "off" | "supervised" | "autonomous";
  lastPipelineRun?: string;
  lastRiskCheck?: string;
  publishingPaused: boolean;
}

interface HealthScore {
  overall: number;
  indexation: number;
  performance: number;
  contents: number;
  links: number;
}

interface RiskSummary {
  totalAlerts: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unacknowledged: number;
}

interface Opportunity {
  id: string;
  type: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "high" | "medium" | "low";
}

interface DashboardData {
  status: EngineStatus;
  health: HealthScore;
  risks: RiskSummary;
  opportunities: Opportunity[];
  flags: Record<string, boolean>;
}

export default function SeoEngineDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview");

  const { data, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ["/api/seo-engine/dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/seo-engine/dashboard");
      return res.json();
    },
    retry: false,
  });

  const { data: flags } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/seo-engine/flags"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/seo-engine/flags");
      return res.json();
    },
  });

  const isEngineEnabled = flags?.ENABLE_SEO_ENGINE ?? false;

  if (isLoading) {
    return (
      <DashboardLayout
        title="SEO Engine"
        description="Autonomous SEO Growth Operating System"
        stats={
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        }
      >
        <Skeleton className="h-96" />
      </DashboardLayout>
    );
  }

  if (!isEngineEnabled) {
    return (
      <DashboardLayout
        title="SEO Engine"
        description="Autonomous SEO Growth Operating System"
      >
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-amber-600" />
              <div>
                <h3 className="font-semibold text-amber-900">SEO Engine is Disabled</h3>
                <p className="text-sm text-amber-700">
                  The SEO Engine feature flag is currently OFF. Enable ENABLE_SEO_ENGINE to activate.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <AdminSection title="Feature Flags" description="Current flag status">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(flags || {}).map(([flag, enabled]) => (
                  <div key={flag} className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm font-mono">{flag.replace("ENABLE_SEO_", "")}</span>
                    <Badge variant={enabled ? "default" : "secondary"}>
                      {enabled ? "ON" : "OFF"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </AdminSection>
      </DashboardLayout>
    );
  }

  const statsSection = (
    <>
      <StatCard
        label="Health Score"
        value={`${data?.health?.overall || 0}%`}
        icon={<Gauge className="w-4 h-4" />}
        trend={data?.health?.overall ? { value: 5, isPositive: true } : undefined}
      />
      <StatCard
        label="Active Risks"
        value={data?.risks?.totalAlerts || 0}
        icon={<AlertTriangle className="w-4 h-4" />}
      />
      <StatCard
        label="Opportunities"
        value={data?.opportunities?.length || 0}
        icon={<Target className="w-4 h-4" />}
      />
      <StatCard
        label="Autopilot"
        value={data?.status?.autopilotMode?.toUpperCase() || "OFF"}
        icon={<Zap className="w-4 h-4" />}
      />
    </>
  );

  const actionsSection = (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => refetch()}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh
      </Button>
    </div>
  );

  return (
    <DashboardLayout
      title="SEO Engine"
      description="Autonomous SEO Growth Operating System"
      actions={actionsSection}
      stats={statsSection}
    >
      {data?.status?.publishingPaused && (
        <Card className="border-red-200 bg-red-50 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Publishing Paused</h3>
                <p className="text-sm text-red-700">
                  Publishing has been automatically paused due to critical risk alerts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="status">System Status</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Health Breakdown</CardTitle>
                <CardDescription>SEO health by category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Indexation</span>
                    <span className="text-sm font-medium">{data?.health?.indexation || 0}%</span>
                  </div>
                  <Progress value={data?.health?.indexation || 0} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Performance</span>
                    <span className="text-sm font-medium">{data?.health?.performance || 0}%</span>
                  </div>
                  <Progress value={data?.health?.performance || 0} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Content Quality</span>
                    <span className="text-sm font-medium">{data?.health?.contents || 0}%</span>
                  </div>
                  <Progress value={data?.health?.contents || 0} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Link Health</span>
                    <span className="text-sm font-medium">{data?.health?.links || 0}%</span>
                  </div>
                  <Progress value={data?.health?.links || 0} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Summary</CardTitle>
                <CardDescription>Active alerts by severity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 rounded bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="font-medium">Critical</span>
                    </div>
                    <Badge variant="destructive">{data?.risks?.critical || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-orange-50 border border-orange-200">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span className="font-medium">High</span>
                    </div>
                    <Badge className="bg-orange-500">{data?.risks?.high || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-yellow-50 border border-yellow-200">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="font-medium">Medium</span>
                    </div>
                    <Badge className="bg-yellow-500">{data?.risks?.medium || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="font-medium">Low</span>
                    </div>
                    <Badge className="bg-blue-500">{data?.risks?.low || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Risk Alerts</CardTitle>
              <CardDescription>
                {data?.risks?.unacknowledged || 0} unacknowledged alerts requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(data?.risks?.totalAlerts || 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No active risk alerts</p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  View the Risk Monitor for detailed alert information.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Opportunities</CardTitle>
              <CardDescription>High-impact SEO improvements</CardDescription>
            </CardHeader>
            <CardContent>
              {!data?.opportunities?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-2" />
                  <p>No opportunities detected yet. Run the pipeline to discover improvements.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.opportunities.slice(0, 5).map((opp) => (
                    <div key={opp.id} className="p-3 rounded border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{opp.title}</span>
                        <div className="flex gap-1">
                          <Badge variant={opp.impact === "high" ? "default" : "secondary"}>
                            {opp.impact} impact
                          </Badge>
                          <Badge variant="outline">{opp.effort} effort</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{opp.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Engine Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>SEO Engine</span>
                  <Badge variant="default">ENABLED</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Autopilot Mode</span>
                  <Badge variant={data?.status?.autopilotMode === "off" ? "secondary" : "default"}>
                    {data?.status?.autopilotMode?.toUpperCase() || "OFF"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Publishing Status</span>
                  <Badge variant={data?.status?.publishingPaused ? "destructive" : "default"}>
                    {data?.status?.publishingPaused ? "PAUSED" : "ACTIVE"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Last Run Times</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Pipeline Run
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {data?.status?.lastPipelineRun
                      ? new Date(data.status.lastPipelineRun).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Risk Check
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {data?.status?.lastRiskCheck
                      ? new Date(data.status.lastRiskCheck).toLocaleString()
                      : "Never"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Module activation status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(flags || {}).map(([flag, enabled]) => (
                  <div key={flag} className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm font-mono">{flag.replace("ENABLE_SEO_", "")}</span>
                    <Badge variant={enabled ? "default" : "secondary"}>
                      {enabled ? "ON" : "OFF"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

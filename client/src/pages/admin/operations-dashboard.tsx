import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DashboardLayout, StatCard, AdminSection } from "@/components/admin";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Server,
  Cpu,
  Clock,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Layers,
  Timer,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

const REFRESH_INTERVAL = 30000;

interface SystemLoadResponse {
  timestamp: string;
  healthy: boolean;
  queueDepth: number;
  loadTier: {
    tier: "GREEN" | "YELLOW" | "RED";
    capacity: number;
    thresholds: { greenThreshold: number; yellowThreshold: number };
    behaviors: Record<string, boolean>;
    state: {
      transitionCount: number;
      deferredTaskCount: number;
      lastTransitionAt: string;
    };
  };
  backpressure: {
    active: boolean;
    reason?: string;
    affectedProviders: string[];
  };
  providers: Array<{
    provider: string;
    available: boolean;
    load: number;
    creditUsage: {
      dailyPercent: number;
      monthlyPercent: number;
    };
  }>;
  totals: {
    requests: number;
    successes: number;
    failures: number;
    creditsUsed: number;
    avgLatencyMs: number;
  };
  warnings: string[];
}

interface ProviderHealth {
  provider: string;
  health: {
    available: boolean;
    latencyMs: number;
    successRate: number;
    lastError?: string;
  };
  credits: {
    dailyUsed: number;
    dailyLimit: number;
    monthlyUsed: number;
    monthlyLimit: number;
  };
}

interface ProvidersResponse {
  timestamp: string;
  providers: ProviderHealth[];
  observeOnlyMode: boolean;
}

interface TaskCategory {
  category: string;
  limits: {
    requestsPerHour: number;
    maxTokensPerRequest: number;
    enabled: boolean;
  };
  usage: {
    requestsThisHour: number;
    tokensThisHour: number;
    totalRequests: number;
    totalTokens: number;
    rejections: number;
    fallbacks: number;
  };
  percentUsed: number;
}

interface TasksResponse {
  timestamp: string;
  summary: {
    totalRejections: number;
    totalFallbacks: number;
  };
  categories: TaskCategory[];
}

interface Alert {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  currentValue: number;
  threshold: number;
  unit: string;
  triggeredAt: string;
  humanReadable: string;
}

interface AlertsResponse {
  timestamp: string;
  alertCount: number;
  alerts: Alert[];
  stats: {
    totalTriggered: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

interface GrowthMetricsResponse {
  contents: { thisWeek: number; thisMonth: number };
  images: { thisWeek: number; thisMonth: number };
  translations: { thisWeek: number; thisMonth: number };
  projectedGrowth: { weeklyRate: number; projectedMonthly: number };
  updatedAt: string;
}

interface AffiliateStatusResponse {
  enabled: boolean;
  masterSwitch: boolean;
  hooksSwitch: boolean;
  configValid: boolean;
  warnings: string[];
  timestamp: string;
}

interface JobMetricsResponse {
  timestamp: string;
  queueDepth: number;
  failedLast24h: number;
  avgDurationMs: number;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  jobs: Array<{
    id: string;
    type: string;
    status: string;
    currentStage: string | null;
    error: string | null;
    createdAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
    processingTimeMs: number | null;
  }>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}

function getTierColor(tier: string) {
  switch (tier) {
    case "GREEN":
      return "bg-green-500";
    case "YELLOW":
      return "bg-yellow-500";
    case "RED":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

function getTierBadgeVariant(tier: string): "default" | "secondary" | "destructive" | "outline" {
  switch (tier) {
    case "GREEN":
      return "default";
    case "YELLOW":
      return "secondary";
    case "RED":
      return "destructive";
    default:
      return "outline";
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical":
      return "text-red-600 dark:text-red-400";
    case "warning":
      return "text-yellow-600 dark:text-yellow-400";
    default:
      return "text-blue-600 dark:text-blue-400";
  }
}

function getSeverityBadgeVariant(severity: string): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case "critical":
      return "destructive";
    case "warning":
      return "secondary";
    default:
      return "outline";
  }
}

export default function OperationsDashboard() {
  const [jobsOpen, setJobsOpen] = useState(false);

  const { 
    data: systemLoad, 
    isLoading: loadingSystem, 
    refetch: refetchSystem 
  } = useQuery<SystemLoadResponse>({
    queryKey: ["/api/system/load"],
    refetchInterval: REFRESH_INTERVAL,
  });

  const { 
    data: providers, 
    isLoading: loadingProviders, 
    refetch: refetchProviders 
  } = useQuery<ProvidersResponse>({
    queryKey: ["/api/ai/metrics/providers"],
    refetchInterval: REFRESH_INTERVAL,
  });

  const { 
    data: tasks, 
    isLoading: loadingTasks, 
    refetch: refetchTasks 
  } = useQuery<TasksResponse>({
    queryKey: ["/api/ai/metrics/tasks"],
    refetchInterval: REFRESH_INTERVAL,
  });

  const { 
    data: alerts, 
    isLoading: loadingAlerts, 
    refetch: refetchAlerts 
  } = useQuery<AlertsResponse>({
    queryKey: ["/api/system/alerts"],
    refetchInterval: REFRESH_INTERVAL,
  });

  const { 
    data: growthMetrics, 
    isLoading: loadingGrowth, 
    refetch: refetchGrowth 
  } = useQuery<GrowthMetricsResponse>({
    queryKey: ["/api/admin/growth/metrics"],
    refetchInterval: REFRESH_INTERVAL,
  });

  const { 
    data: affiliateStatus, 
    isLoading: loadingAffiliate, 
    refetch: refetchAffiliate 
  } = useQuery<AffiliateStatusResponse>({
    queryKey: ["/api/admin/affiliate/status"],
    refetchInterval: REFRESH_INTERVAL,
  });

  const { 
    data: jobMetrics, 
    isLoading: loadingJobs, 
    refetch: refetchJobs 
  } = useQuery<JobMetricsResponse>({
    queryKey: ["/api/admin/jobs/recent"],
    refetchInterval: REFRESH_INTERVAL,
  });

  useEffect(() => {
    refetchSystem();
    refetchProviders();
    refetchTasks();
    refetchAlerts();
    refetchGrowth();
    refetchAffiliate();
    refetchJobs();
  }, []);

  const isLoading = loadingSystem || loadingProviders || loadingTasks || loadingAlerts || loadingGrowth || loadingJobs;

  if (isLoading && !systemLoad) {
    return (
      <DashboardLayout
        title="Operations Dashboard"
        description="Read-only monitoring of all operational metrics"
      >
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  const tier = systemLoad?.loadTier?.tier || "GREEN";
  const capacity = systemLoad?.loadTier?.capacity || 0;
  const alertCount = alerts?.alertCount || 0;
  const successRate = systemLoad?.totals?.requests 
    ? Math.round((systemLoad.totals.successes / systemLoad.totals.requests) * 100) 
    : 100;

  const queueDepth = jobMetrics?.queueDepth || 0;
  const failedLast24h = jobMetrics?.failedLast24h || 0;
  const avgDurationMs = jobMetrics?.avgDurationMs || 0;
  const aiRejectsLast24h = tasks?.summary?.totalRejections || 0;

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed": return "default";
      case "failed": return "destructive";
      case "pending": return "outline";
      default: return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600 dark:text-green-400";
      case "failed": return "text-red-600 dark:text-red-400";
      case "pending": return "text-muted-foreground";
      default: return "text-yellow-600 dark:text-yellow-400";
    }
  };

  return (
    <DashboardLayout
      title="Operations Dashboard"
      description="Read-only monitoring of all operational metrics"
      actions={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4" />
          <span data-testid="text-refresh-interval">Auto-refreshes every 30s</span>
          {systemLoad?.timestamp && (
            <span data-testid="text-last-updated">
              | Last: {new Date(systemLoad.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      }
      stats={
        <>
          <div data-testid="stat-queue-depth">
            <StatCard
              label="Job Queue Depth"
              value={queueDepth}
              icon={<Layers className="h-4 w-4" />}
            />
          </div>
          <div data-testid="stat-jobs-failed">
            <StatCard
              label="Jobs Failed (24h)"
              value={failedLast24h}
              icon={<XCircle className="h-4 w-4" />}
            />
          </div>
          <div data-testid="stat-avg-duration">
            <StatCard
              label="Avg Job Duration"
              value={formatDuration(avgDurationMs)}
              icon={<Timer className="h-4 w-4" />}
            />
          </div>
          <div data-testid="stat-ai-rejects">
            <StatCard
              label="AI Rejects (24h)"
              value={aiRejectsLast24h}
              icon={<Ban className="h-4 w-4" />}
            />
          </div>
          <div data-testid="stat-load-tier">
            <StatCard
              label="Load Tier"
              value={tier}
              icon={<Server className="h-4 w-4" />}
            />
          </div>
          <div data-testid="stat-capacity">
            <StatCard
              label="Current Load"
              value={`${Math.round(capacity)}%`}
              icon={<Cpu className="h-4 w-4" />}
            />
          </div>
          <div data-testid="stat-alerts">
            <StatCard
              label="Active Alerts"
              value={alertCount}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </div>
          <div data-testid="stat-success-rate">
            <StatCard
              label="Success Rate"
              value={`${successRate}%`}
              icon={<Activity className="h-4 w-4" />}
            />
          </div>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-system-status">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="w-4 h-4" />
              System Status
            </CardTitle>
            <Badge 
              variant={getTierBadgeVariant(tier)}
              data-testid="badge-load-tier"
            >
              {tier}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">System Capacity</span>
                <span className="font-medium" data-testid="text-capacity-percent">{Math.round(capacity)}%</span>
              </div>
              <Progress 
                value={capacity} 
                className={cn("h-2", capacity >= 80 ? "[&>div]:bg-red-500" : capacity >= 50 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Queue Depth</p>
                <p className="text-lg font-semibold" data-testid="text-queue-depth">
                  {systemLoad?.queueDepth || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Avg Latency</p>
                <p className="text-lg font-semibold" data-testid="text-avg-latency">
                  {systemLoad?.totals?.avgLatencyMs || 0}ms
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Requests</p>
                <p className="text-lg font-semibold" data-testid="text-total-requests">
                  {systemLoad?.totals?.requests?.toLocaleString() || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Backpressure</p>
                <div className="flex items-center gap-1">
                  {systemLoad?.backpressure?.active ? (
                    <XCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                  <span className="text-sm" data-testid="text-backpressure-status">
                    {systemLoad?.backpressure?.active ? "Active" : "None"}
                  </span>
                </div>
              </div>
            </div>

            {systemLoad?.warnings && systemLoad.warnings.length > 0 && (
              <div className="mt-4 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">Warnings</p>
                <ul className="text-xs space-y-1">
                  {systemLoad.warnings.map((warning, idx) => (
                    <li key={idx} className="text-muted-foreground" data-testid={`text-warning-${idx}`}>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-ai-providers">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4" />
              AI Providers
            </CardTitle>
            {providers?.observeOnlyMode && (
              <Badge variant="outline" data-testid="badge-observe-mode">Observe Only</Badge>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[220px]">
              <div className="space-y-3">
                {providers?.providers?.map((provider) => (
                  <div 
                    key={provider.provider} 
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    data-testid={`provider-row-${provider.provider}`}
                  >
                    <div className="flex items-center gap-2">
                      {provider.health.available ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-medium text-sm">{provider.provider}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span data-testid={`provider-latency-${provider.provider}`}>
                        {provider.health.latencyMs}ms
                      </span>
                      <span data-testid={`provider-success-${provider.provider}`}>
                        {Math.round(provider.health.successRate)}%
                      </span>
                      <span data-testid={`provider-daily-usage-${provider.provider}`}>
                        {provider.credits.dailyUsed}/{provider.credits.dailyLimit} daily
                      </span>
                    </div>
                  </div>
                ))}
                {(!providers?.providers || providers.providers.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No providers available</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card data-testid="card-active-alerts">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Active Alerts
            </CardTitle>
            <Badge 
              variant={alertCount > 0 ? "destructive" : "outline"}
              data-testid="badge-alert-count"
            >
              {alertCount}
            </Badge>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[220px]">
              <div className="space-y-2">
                {alerts?.alerts && alerts.alerts.length > 0 ? (
                  alerts.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-md border bg-muted/30"
                      data-testid={`alert-row-${alert.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-medium text-sm", getSeverityColor(alert.severity))}>
                              {alert.title}
                            </span>
                            <Badge 
                              variant={getSeverityBadgeVariant(alert.severity)} 
                              className="text-[10px] px-1.5 py-0"
                              data-testid={`alert-severity-${alert.id}`}
                            >
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1" data-testid={`alert-message-${alert.id}`}>
                            {alert.humanReadable || alert.message}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(alert.triggeredAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
                    <p className="text-sm font-medium" data-testid="text-no-alerts">No Active Alerts</p>
                    <p className="text-xs text-muted-foreground">All systems operating normally</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card data-testid="card-task-usage">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Task Usage by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[220px]">
              <div className="space-y-3">
                {tasks?.categories?.map((cat) => (
                  <div key={cat.category} data-testid={`task-category-${cat.category}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{cat.category}</span>
                      <span className="text-xs text-muted-foreground">
                        {cat.usage.requestsThisHour}/{cat.limits.requestsPerHour} this hour
                      </span>
                    </div>
                    <Progress 
                      value={cat.percentUsed} 
                      className={cn("h-1.5", cat.percentUsed >= 90 ? "[&>div]:bg-red-500" : cat.percentUsed >= 70 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500")}
                    />
                    <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground">
                      <span>Total: {cat.usage.totalRequests.toLocaleString()}</span>
                      <span>Rejections: {cat.usage.rejections}</span>
                      <span>Fallbacks: {cat.usage.fallbacks}</span>
                    </div>
                  </div>
                ))}
                {(!tasks?.categories || tasks.categories.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No task data available</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card data-testid="card-growth-loops">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Growth Loops
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1" data-testid="growth-contents">
                <p className="text-xs text-muted-foreground">Content</p>
                <p className="text-lg font-semibold">{growthMetrics?.contents?.thisWeek || 0}</p>
                <p className="text-[10px] text-muted-foreground">this week</p>
              </div>
              <div className="space-y-1" data-testid="growth-images">
                <p className="text-xs text-muted-foreground">Images</p>
                <p className="text-lg font-semibold">{growthMetrics?.images?.thisWeek || 0}</p>
                <p className="text-[10px] text-muted-foreground">this week</p>
              </div>
              <div className="space-y-1" data-testid="growth-translations">
                <p className="text-xs text-muted-foreground">Translations</p>
                <p className="text-lg font-semibold">{growthMetrics?.translations?.thisWeek || 0}</p>
                <p className="text-[10px] text-muted-foreground">this week</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Projected Monthly Growth</p>
                  <p className="text-lg font-semibold" data-testid="text-projected-growth">
                    {growthMetrics?.projectedGrowth?.projectedMonthly || 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Weekly Rate</p>
                  <p className="text-lg font-semibold" data-testid="text-weekly-rate">
                    {growthMetrics?.projectedGrowth?.weeklyRate || 0}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-revenue-affiliates">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Revenue / Affiliates
            </CardTitle>
            {affiliateStatus?.enabled ? (
              <Badge variant="default" data-testid="badge-affiliate-enabled">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground" data-testid="badge-affiliate-disabled">
                Not Active
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Monetization</p>
                  <div className="flex items-center gap-1">
                    {affiliateStatus?.masterSwitch ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm" data-testid="text-monetization-status">
                      {affiliateStatus?.masterSwitch ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Affiliate Hooks</p>
                  <div className="flex items-center gap-1">
                    {affiliateStatus?.hooksSwitch ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm" data-testid="text-hooks-status">
                      {affiliateStatus?.hooksSwitch ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Configuration</p>
                <div className="flex items-center gap-1">
                  {affiliateStatus?.configValid ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="text-sm" data-testid="text-config-status">
                    {affiliateStatus?.configValid ? "Valid" : "Issues Detected"}
                  </span>
                </div>
              </div>

              {affiliateStatus?.warnings && affiliateStatus.warnings.length > 0 && (
                <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                  <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">Warnings</p>
                  <ul className="text-xs space-y-1">
                    {affiliateStatus.warnings.map((warning, idx) => (
                      <li key={idx} className="text-muted-foreground" data-testid={`text-affiliate-warning-${idx}`}>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!affiliateStatus?.enabled && (
                <div className="pt-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    Set ENABLE_MONETIZATION=true and ENABLE_AFFILIATE_HOOKS=true to activate
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Collapsible open={jobsOpen} onOpenChange={setJobsOpen}>
          <Card data-testid="card-recent-jobs">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Recent Jobs
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" data-testid="badge-jobs-count">
                    {jobMetrics?.jobs?.length || 0} jobs
                  </Badge>
                  <Button variant="ghost" size="icon">
                    {jobsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="table-recent-jobs">
                      <thead>
                        <tr className="border-b text-muted-foreground text-left">
                          <th className="pb-2 font-medium">ID</th>
                          <th className="pb-2 font-medium">Type</th>
                          <th className="pb-2 font-medium">Status</th>
                          <th className="pb-2 font-medium">Stage</th>
                          <th className="pb-2 font-medium">Duration</th>
                          <th className="pb-2 font-medium">Error</th>
                          <th className="pb-2 font-medium">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobMetrics?.jobs?.map((job) => (
                          <tr 
                            key={job.id} 
                            className="border-b border-muted/50"
                            data-testid={`job-row-${job.id}`}
                          >
                            <td className="py-2 font-mono text-xs">
                              {job.id.substring(0, 8)}...
                            </td>
                            <td className="py-2 text-muted-foreground">
                              {job.type}
                            </td>
                            <td className="py-2">
                              <Badge 
                                variant={getStatusBadgeVariant(job.status)} 
                                className={cn("text-xs", getStatusColor(job.status))}
                                data-testid={`job-status-${job.id}`}
                              >
                                {job.status}
                              </Badge>
                            </td>
                            <td className="py-2 text-muted-foreground text-xs">
                              {job.currentStage || "-"}
                            </td>
                            <td className="py-2 text-xs">
                              {job.processingTimeMs ? formatDuration(job.processingTimeMs) : "-"}
                            </td>
                            <td className="py-2 max-w-[200px]">
                              {job.error ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs text-red-600 dark:text-red-400 truncate block cursor-help">
                                      {job.error.substring(0, 30)}...
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[400px]">
                                    <p className="text-xs whitespace-pre-wrap">{job.error}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-2 text-xs text-muted-foreground">
                              {job.createdAt 
                                ? new Date(job.createdAt).toLocaleString() 
                                : "-"}
                            </td>
                          </tr>
                        ))}
                        {(!jobMetrics?.jobs || jobMetrics.jobs.length === 0) && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-muted-foreground">
                              No recent jobs found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </DashboardLayout>
  );
}

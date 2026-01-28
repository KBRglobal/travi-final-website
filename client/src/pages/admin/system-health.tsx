import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  recentFallbacks: Array<{
    taskId: string;
    category: string;
    reason: string;
    originalProvider: string;
    fallbackProvider: string;
    timestamp: string;
  }>;
}

interface SystemLoadResponse {
  timestamp: string;
  healthy: boolean;
  queueDepth: number;
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
  creditCounters: {
    totalDailyUsed: number;
    totalMonthlyUsed: number;
  };
  warnings: string[];
}

const REFRESH_INTERVAL = 30000;

export default function SystemHealthDashboard() {
  const {
    data: providers,
    isLoading: loadingProviders,
    refetch: refetchProviders,
  } = useQuery<ProvidersResponse>({
    queryKey: ["/api/ai/metrics/providers"],
    refetchInterval: REFRESH_INTERVAL,
  });

  const {
    data: tasks,
    isLoading: loadingTasks,
    refetch: refetchTasks,
  } = useQuery<TasksResponse>({
    queryKey: ["/api/ai/metrics/tasks"],
    refetchInterval: REFRESH_INTERVAL,
  });

  const {
    data: systemLoad,
    isLoading: loadingSystem,
    refetch: refetchSystem,
  } = useQuery<SystemLoadResponse>({
    queryKey: ["/api/system/load"],
    refetchInterval: REFRESH_INTERVAL,
  });

  useEffect(() => {
    refetchProviders();
    refetchTasks();
    refetchSystem();
  }, []);

  const isLoading = loadingProviders || loadingTasks || loadingSystem;

  const getStatusColor = (available: boolean) =>
    available ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
      <div className="border-b border-[hsl(var(--admin-border))] bg-white">
        <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-xl font-semibold text-[hsl(var(--admin-text))]"
              data-testid="text-page-title"
            >
              System Health
            </h1>
            <p
              className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1"
              data-testid="text-page-description"
            >
              Read-only monitoring of AI providers and system metrics
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--admin-text-secondary))]">
            <RefreshCw className="w-4 h-4" />
            <span data-testid="text-refresh-info">Auto-refreshes every 30s</span>
            {systemLoad?.timestamp && (
              <span data-testid="text-last-updated">
                Last: {new Date(systemLoad.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {systemLoad && (
          <Card
            className={cn(systemLoad.healthy ? "border-green-500/30" : "border-red-500/30")}
            data-testid="card-system-status"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5" />
                System Status
              </CardTitle>
              <Badge
                variant={systemLoad.healthy ? "default" : "destructive"}
                data-testid="badge-system-health"
              >
                {systemLoad.healthy ? "Healthy" : "Degraded"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-semibold" data-testid="text-total-requests">
                    {systemLoad.totals.requests.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-semibold" data-testid="text-success-rate">
                    {systemLoad.totals.requests > 0
                      ? Math.round((systemLoad.totals.successes / systemLoad.totals.requests) * 100)
                      : 0}
                    %
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Avg Latency</p>
                  <p className="text-2xl font-semibold" data-testid="text-avg-latency">
                    {systemLoad.totals.avgLatencyMs}ms
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Queue Depth</p>
                  <p className="text-2xl font-semibold" data-testid="text-queue-depth">
                    {systemLoad.queueDepth}
                  </p>
                </div>
              </div>

              {systemLoad.backpressure.active && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-700 dark:text-yellow-300">
                      Backpressure Active
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {systemLoad.backpressure.reason}
                    </p>
                    {systemLoad.backpressure.affectedProviders.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Affected: {systemLoad.backpressure.affectedProviders.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {systemLoad.warnings.length > 0 && (
                <div className="mt-4 space-y-2">
                  {systemLoad.warnings.map((warning, i) => (
                    <div
                      key={i}
                      className="p-2 bg-muted/50 rounded text-sm text-muted-foreground flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      {warning}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading && !providers
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))
            : providers?.providers.map(provider => (
                <Card key={provider.provider} data-testid={`card-provider-${provider.provider}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      {provider.provider}
                    </CardTitle>
                    <div className={getStatusColor(provider.health.available)}>
                      {provider.health.available ? (
                        <CheckCircle2
                          className="w-5 h-5"
                          data-testid={`icon-provider-available-${provider.provider}`}
                        />
                      ) : (
                        <XCircle
                          className="w-5 h-5"
                          data-testid={`icon-provider-unavailable-${provider.provider}`}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Latency</p>
                        <p
                          className="font-medium"
                          data-testid={`text-latency-${provider.provider}`}
                        >
                          {provider.health.latencyMs}ms
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Success Rate</p>
                        <p
                          className="font-medium"
                          data-testid={`text-success-${provider.provider}`}
                        >
                          {Math.round(provider.health.successRate * 100)}%
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Daily Credits</span>
                        <span data-testid={`text-daily-credits-${provider.provider}`}>
                          {provider.credits.dailyUsed.toLocaleString()} /{" "}
                          {provider.credits.dailyLimit.toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={
                          provider.credits.dailyLimit > 0
                            ? (provider.credits.dailyUsed / provider.credits.dailyLimit) * 100
                            : 0
                        }
                        className="h-2"
                        data-testid={`progress-daily-${provider.provider}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Monthly Credits</span>
                        <span data-testid={`text-monthly-credits-${provider.provider}`}>
                          {provider.credits.monthlyUsed.toLocaleString()} /{" "}
                          {provider.credits.monthlyLimit.toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={
                          provider.credits.monthlyLimit > 0
                            ? (provider.credits.monthlyUsed / provider.credits.monthlyLimit) * 100
                            : 0
                        }
                        className="h-2"
                        data-testid={`progress-monthly-${provider.provider}`}
                      />
                    </div>

                    {provider.health.lastError && (
                      <p
                        className="text-xs text-red-600 dark:text-red-400 truncate"
                        title={provider.health.lastError}
                      >
                        Last error: {provider.health.lastError}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
        </div>

        {tasks && (
          <Card data-testid="card-task-metrics">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Task Governance
              </CardTitle>
              <CardDescription>Per-category usage limits and fallback tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                  <span className="text-sm text-muted-foreground">Total Rejections:</span>
                  <span className="font-semibold" data-testid="text-total-rejections">
                    {tasks.summary.totalRejections}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                  <span className="text-sm text-muted-foreground">Total Fallbacks:</span>
                  <span className="font-semibold" data-testid="text-total-fallbacks">
                    {tasks.summary.totalFallbacks}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {tasks.categories.map(cat => (
                  <div
                    key={cat.category}
                    className="p-4 border rounded-md space-y-3"
                    data-testid={`row-category-${cat.category}`}
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cat.category}</span>
                        <Badge
                          variant={cat.limits.enabled ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {cat.limits.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {cat.usage.requestsThisHour} / {cat.limits.requestsPerHour} requests/hr
                      </div>
                    </div>

                    <Progress
                      value={cat.percentUsed}
                      className={cn("h-2", getProgressColor(cat.percentUsed))}
                      data-testid={`progress-category-${cat.category}`}
                    />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Requests</p>
                        <p className="font-medium">{cat.usage.totalRequests.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Tokens</p>
                        <p className="font-medium">{cat.usage.totalTokens.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Rejections</p>
                        <p className="font-medium">{cat.usage.rejections}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fallbacks</p>
                        <p className="font-medium">{cat.usage.fallbacks}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {tasks.recentFallbacks.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Recent Fallbacks
                  </h4>
                  <div className="space-y-2">
                    {tasks.recentFallbacks.slice(0, 5).map((fb, i) => (
                      <div
                        key={i}
                        className="p-3 bg-muted/50 rounded text-sm flex flex-wrap items-center gap-2"
                        data-testid={`row-fallback-${i}`}
                      >
                        <Badge variant="outline">{fb.category}</Badge>
                        <span className="text-muted-foreground">{fb.originalProvider}</span>
                        <span className="text-muted-foreground">→</span>
                        <span>{fb.fallbackProvider}</span>
                        <span className="text-muted-foreground ml-auto text-xs">
                          {new Date(fb.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {systemLoad?.providers && (
          <Card data-testid="card-provider-load">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Provider Load Distribution
              </CardTitle>
              <CardDescription>Current load and credit usage per provider</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemLoad.providers.map(p => (
                  <div
                    key={p.provider}
                    className="flex items-center gap-4"
                    data-testid={`row-provider-load-${p.provider}`}
                  >
                    <div className="w-24 flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          p.available ? "bg-green-500" : "bg-red-500"
                        )}
                      />
                      <span className="font-medium text-sm">{p.provider}</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Load: {p.load}%</span>
                        <span>
                          Daily: {p.creditUsage.dailyPercent}% | Monthly:{" "}
                          {p.creditUsage.monthlyPercent}%
                        </span>
                      </div>
                      <Progress value={p.load} className={cn("h-1.5", getProgressColor(p.load))} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Daily Credits Used</p>
                  <p className="text-xl font-semibold" data-testid="text-total-daily-credits">
                    {systemLoad.creditCounters.totalDailyUsed.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Monthly Credits Used</p>
                  <p className="text-xl font-semibold" data-testid="text-total-monthly-credits">
                    {systemLoad.creditCounters.totalMonthlyUsed.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {providers?.observeOnlyMode && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-md flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Credit Guard is in observe-only mode. No requests are being blocked.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

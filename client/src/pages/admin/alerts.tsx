import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Bell,
  CheckCircle2,
  Clock,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Alert {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  detectedAt: string;
  resolvedAt: string | null;
  metadata: Record<string, unknown>;
  isActive: boolean;
}

interface AlertStats {
  total: number;
  active: number;
  bySeverity: Record<string, number>;
  oldestUnresolved: string | null;
  lastDetectionRun: string | null;
}

interface EngineStatus {
  enabled: boolean;
  running: boolean;
  lastDetectionRun: string | null;
  ruleCount: number;
}

interface AlertsResponse {
  enabled: boolean;
  alerts: Alert[];
}

interface StatsResponse {
  enabled: boolean;
  stats: AlertStats | null;
  engine: EngineStatus;
}

const severityConfig = {
  low: { icon: Bell, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30", badge: "default" },
  medium: { icon: AlertCircle, color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-900/30", badge: "secondary" },
  high: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30", badge: "destructive" },
  critical: { icon: AlertOctagon, color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30", badge: "destructive" },
} as const;

export default function AlertsDashboard() {
  const { toast } = useToast();

  const { data: activeAlertsData, isLoading: loadingActive, refetch: refetchActive } = useQuery<AlertsResponse>({
    queryKey: ["/api/admin/alerts/active"],
    refetchInterval: 30000,
  });

  const { data: statsData, isLoading: loadingStats, refetch: refetchStats } = useQuery<StatsResponse>({
    queryKey: ["/api/admin/alerts/stats"],
    refetchInterval: 30000,
  });

  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest("POST", `/api/admin/alerts/${alertId}/resolve`);
    },
    onSuccess: () => {
      toast({ title: "Alert resolved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts/stats"] });
    },
    onError: () => {
      toast({ title: "Failed to resolve alert", variant: "destructive" });
    },
  });

  const handleRefresh = () => {
    refetchActive();
    refetchStats();
  };

  if (!statsData?.enabled) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alerting System
            </CardTitle>
            <CardDescription>
              The alerting system is not enabled. Set ENABLE_ALERTING_SYSTEM=true to activate.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const alerts = activeAlertsData?.alerts || [];
  const stats = statsData?.stats;
  const engine = statsData?.engine;

  return (
    <div className="p-6 space-y-6" data-testid="alerts-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">System Alerts</h1>
          <p className="text-muted-foreground">
            Operational alerting and failure detection
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loadingActive || loadingStats}
          data-testid="button-refresh-alerts"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", (loadingActive || loadingStats) && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Alerts</CardDescription>
            <CardTitle className="text-2xl" data-testid="text-active-count">
              {loadingStats ? <Skeleton className="h-8 w-12" /> : stats?.active || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critical</CardDescription>
            <CardTitle className="text-2xl text-red-500" data-testid="text-critical-count">
              {loadingStats ? <Skeleton className="h-8 w-12" /> : stats?.bySeverity?.critical || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High</CardDescription>
            <CardTitle className="text-2xl text-orange-500" data-testid="text-high-count">
              {loadingStats ? <Skeleton className="h-8 w-12" /> : stats?.bySeverity?.high || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Engine Status</CardDescription>
            <CardTitle className="text-lg flex items-center gap-2" data-testid="text-engine-status">
              {loadingStats ? (
                <Skeleton className="h-6 w-20" />
              ) : engine?.running ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Running
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Stopped
                </>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {engine?.lastDetectionRun && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Last detection run: {formatDistanceToNow(new Date(engine.lastDetectionRun))} ago
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>
            Alerts that require attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingActive ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-alerts">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No active alerts</p>
              <p className="text-sm">All systems are operating normally</p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="alerts-list">
              {alerts.map((alert) => {
                const config = severityConfig[alert.severity];
                const Icon = config.icon;
                return (
                  <div
                    key={alert.id}
                    className={cn("p-4 rounded-lg border flex items-start gap-4", config.bg)}
                    data-testid={`alert-item-${alert.id}`}
                  >
                    <Icon className={cn("h-5 w-5 mt-0.5", config.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={config.badge as any} className="text-xs">
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium">{alert.type}</span>
                      </div>
                      <p className="text-sm mb-1">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        Detected {formatDistanceToNow(new Date(alert.detectedAt))} ago
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveMutation.mutate(alert.id)}
                      disabled={resolveMutation.isPending}
                      data-testid={`button-resolve-${alert.id}`}
                    >
                      Resolve
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

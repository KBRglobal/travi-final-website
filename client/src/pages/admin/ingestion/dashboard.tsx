import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Database,
  Loader2,
  Play,
  RefreshCw,
  Shield,
  Activity,
  Pause,
  CheckCircle2,
  XCircle,
  Globe,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface IngestionSourceStatus {
  source: string;
  displayName: string;
  description: string;
  isRunning: boolean;
  lastRun: string | null;
  lastSuccess: string | null;
  lastError: string | null;
  errorMessage: string | null;
  recordCount: number;
  schedule: string;
  nextRun: string | null;
  enabled: boolean;
}

interface IngestionStatusResponse {
  success: boolean;
  data: IngestionSourceStatus[];
  timestamp: string;
}

const SOURCE_ICONS: Record<string, typeof Shield> = {
  "travel-advisory": Shield,
  "health-alert": AlertTriangle,
  "events": Calendar,
  "visa-requirements": Globe,
};

const SOURCE_COLORS: Record<string, string> = {
  "travel-advisory": "text-blue-500",
  "health-alert": "text-red-500",
  "events": "text-purple-500",
  "visa-requirements": "text-green-500",
};

export default function IngestionDashboard() {
  const { toast } = useToast();

  const { data, isLoading, refetch, isRefetching } = useQuery<IngestionStatusResponse>({
    queryKey: ["/api/admin/ingestion/status"],
    refetchInterval: 10000,
  });

  const triggerIngestionMutation = useMutation({
    mutationFn: async (source: string) => {
      const response = await apiRequest("POST", `/api/admin/ingestion/${source}/run`);
      return response.json();
    },
    onSuccess: (result, source) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ingestion/status"] });
      toast({
        title: "Ingestion Started",
        description: `${source} ingestion has been triggered successfully`,
      });
    },
    onError: (error: Error, source) => {
      toast({
        title: "Failed to Start Ingestion",
        description: error.message || `Could not trigger ${source} ingestion`,
        variant: "destructive",
      });
    },
  });

  const sources = data?.data || [];
  const totalSources = sources.length;
  const runningSources = sources.filter((s) => s.isRunning).length;
  const healthySources = sources.filter((s) => !s.lastError || s.lastSuccess).length;
  const totalRecords = sources.reduce((sum, s) => sum + (s.recordCount || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-main" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Data Ingestion
          </h1>
          <p className="text-muted-foreground">
            Manage external travel data sources for advisories, health alerts, and events
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="button-refresh-status"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-sources-total">
              {totalSources}
            </div>
            <p className="text-xs text-muted-foreground">
              {healthySources} healthy, {runningSources} running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-jobs">
              {runningSources}
            </div>
            <p className="text-xs text-muted-foreground">Currently processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-records">
              {totalRecords.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Across all sources</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Health Status</CardTitle>
            {healthySources === totalSources ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-health-status">
              {totalSources > 0 ? Math.round((healthySources / totalSources) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Sources operating normally</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
          <CardDescription>
            Configure and monitor external data ingestion pipelines
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Data Sources Configured</p>
              <p className="text-sm mt-1">
                Data sources will appear here once ingesters are registered with the scheduler
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sources.map((source) => {
                const Icon = SOURCE_ICONS[source.source] || Database;
                const iconColor = SOURCE_COLORS[source.source] || "text-muted-foreground";
                const isTriggering = triggerIngestionMutation.isPending && 
                  triggerIngestionMutation.variables === source.source;

                return (
                  <div
                    key={source.source}
                    className="flex items-center justify-between gap-4 p-4 border rounded-md"
                    data-testid={`source-card-${source.source}`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`p-2 rounded-md bg-muted ${iconColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium" data-testid={`text-source-name-${source.source}`}>
                            {source.displayName}
                          </h3>
                          {source.isRunning ? (
                            <Badge variant="default" className="bg-blue-500">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Running
                            </Badge>
                          ) : source.lastError && !source.lastSuccess ? (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Check className="h-3 w-3 mr-1" />
                              Ready
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {source.description}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {source.lastRun
                              ? `Last run ${formatDistanceToNow(new Date(source.lastRun), { addSuffix: true })}`
                              : "Never run"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            {source.recordCount.toLocaleString()} records
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Schedule: {source.schedule}
                          </span>
                        </div>
                        {source.errorMessage && (
                          <div className="mt-2 p-2 bg-destructive/10 text-destructive text-xs rounded">
                            {source.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => triggerIngestionMutation.mutate(source.source)}
                        disabled={source.isRunning || isTriggering}
                        data-testid={`button-run-${source.source}`}
                      >
                        {isTriggering ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How Data Ingestion Works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              The ingestion system automatically fetches data from external sources on a schedule.
              Each source has its own refresh interval optimized for data freshness.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Travel Advisories - Government travel warnings and safety notices</li>
              <li>Health Alerts - WHO and CDC health advisories for destinations</li>
              <li>Events - Local events, festivals, and happenings in each city</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual Trigger</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              You can manually trigger an ingestion job at any time by clicking the play button
              next to each data source. This is useful for:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Testing new data source configurations</li>
              <li>Forcing an immediate refresh after external data changes</li>
              <li>Debugging ingestion issues</li>
            </ul>
            <p className="text-xs mt-2">
              Note: Only one ingestion job can run per source at a time.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

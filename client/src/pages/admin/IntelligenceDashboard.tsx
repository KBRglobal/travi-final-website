/**
 * Intelligence Dashboard
 *
 * Admin page showing system health, scores, and blocking issues.
 *
 * PHASE 17: Admin Intelligence & Visibility Layer
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  FileText,
  Cpu,
  XCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types matching backend responses
interface HealthScore {
  score: number;
  explanation: string;
  topIssue: string | null;
}

interface BlockingIssue {
  issue: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
  suggestedAction: string;
}

interface DashboardResponse {
  generatedAt: string;
  featureEnabled: boolean;
  snapshot: {
    contents: {
      total: number;
      published: number;
      draft: number;
      withoutEntities: number;
      notIndexed: number;
      withoutAeoCapsule: number;
    };
    searchHealth: {
      indexedCount: number;
      zeroResultSearches24h: number;
      fallbackRatePercent: string;
    };
    aiActivity: {
      jobsExecuted: Record<string, number>;
      jobsFailed: Record<string, number>;
    };
    systemWarnings: {
      stalledJobs: number;
      retryingJobs: number;
      disabledFeatureFlags: string[];
    };
  };
  scores: {
    contents: HealthScore;
    search: HealthScore;
    ai: HealthScore;
  };
  issues: BlockingIssue[];
}

function ScoreCard({
  title,
  icon: Icon,
  score,
  loading,
}: {
  title: string;
  icon: React.ElementType;
  score?: HealthScore;
  loading: boolean;
}) {
  const getScoreColor = (value: number) => {
    if (value >= 80) return "text-green-600 dark:text-green-400";
    if (value >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBg = (value: number) => {
    if (value >= 80) return "bg-green-100 dark:bg-green-900/30";
    if (value >= 50) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-16 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const scoreValue = score?.score ?? 0;

  return (
    <Card className={cn("transition-colors", getScoreBg(scoreValue))}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-4xl font-bold mb-1", getScoreColor(scoreValue))}>
          {scoreValue}
        </div>
        <p className="text-sm text-muted-foreground">{score?.explanation}</p>
        {score?.topIssue && (
          <div className="mt-2 flex items-start gap-2 text-sm text-orange-600 dark:text-orange-400">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{score.topIssue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IssuesTable({ issues, loading }: { issues: BlockingIssue[]; loading: boolean }) {
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!issues || issues.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
        <p>No blocking issues detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {issues.map((issue, index) => (
        <div
          key={index}
          className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getSeverityBadge(issue.severity)}
              <span className="font-medium truncate">{issue.issue}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Count: <span className="font-medium">{issue.count}</span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              <Info className="h-3 w-3 inline mr-1" />
              {issue.suggestedAction}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SnapshotStats({ snapshot, loading }: { snapshot?: DashboardResponse['snapshot']; loading: boolean }) {
  if (loading || !snapshot) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: "Total Content",
      value: snapshot.contents.total,
      subtext: `${snapshot.contents.published} published`,
    },
    {
      label: "Search Indexed",
      value: snapshot.searchHealth.indexedCount,
      subtext: `${snapshot.contents.notIndexed} not indexed`,
    },
    {
      label: "Zero-Result Searches",
      value: snapshot.searchHealth.zeroResultSearches24h,
      subtext: "Last 24 hours",
    },
    {
      label: "System Warnings",
      value: snapshot.systemWarnings.stalledJobs + snapshot.systemWarnings.retryingJobs,
      subtext: `${snapshot.systemWarnings.stalledJobs} stalled, ${snapshot.systemWarnings.retryingJobs} retrying`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{stat.subtext}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function IntelligenceDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery<DashboardResponse>({
    queryKey: ["/api/admin/intelligence/dashboard"],
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Intelligence Dashboard</h1>
          <p className="text-muted-foreground">
            System health metrics and blocking issues
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.generatedAt && (
            <span className="text-sm text-muted-foreground">
              Updated: {new Date(data.generatedAt).toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", (isLoading || isRefreshing) && "animate-spin")} />
            Refresh Snapshot
          </Button>
        </div>
      </div>

      {/* Feature Flag Warning */}
      {data && !data.featureEnabled && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Intelligence Coverage Feature Disabled</span>
            </div>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Set <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">ENABLE_INTELLIGENCE_COVERAGE=true</code> to enable full functionality.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Health Score Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Health Scores</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ScoreCard
            title="Content Health"
            icon={FileText}
            score={data?.scores.contents}
            loading={isLoading}
          />
          <ScoreCard
            title="Search Health"
            icon={Search}
            score={data?.scores.search}
            loading={isLoading}
          />
          <ScoreCard
            title="AI Health"
            icon={Cpu}
            score={data?.scores.ai}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Snapshot Statistics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Live Snapshot</h2>
        <SnapshotStats snapshot={data?.snapshot} loading={isLoading} />
      </div>

      {/* Blocking Issues Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Blocking Issues</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Issues Requiring Attention</CardTitle>
            <CardDescription>
              Issues are sorted by severity. Address high-severity items first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IssuesTable issues={data?.issues || []} loading={isLoading} />
          </CardContent>
        </Card>
      </div>

      {/* Manual Test Checklist (visible in dev) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Manual Test Checklist</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>- Empty DB: Should show 0 values, no crashes</p>
            <p>- Partial data: Should show "unknown" for missing fields</p>
            <p>- Failures present: Should show in issues table</p>
            <p>- Feature flag OFF: Should show warning banner</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

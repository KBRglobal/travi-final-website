/**
 * Admin Dashboard - Main entry point for TRAVI CMS admin panel
 * 
 * Displays overview stats, activity feed, and quick actions for admins.
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FileText,
  Globe,
  Sparkles,
  HardDrive,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Newspaper,
  Bot,
  Search,
  Languages,
  BarChart3,
  Download,
  RefreshCw,
  MapPin,
  User,
  Settings,
  Zap,
  Activity,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface DashboardStats {
  contents: {
    total: number;
    attractions: number;
    articles: number;
    destinations: number;
    pages: number;
  };
  status: {
    published: number;
    draft: number;
  };
  languages: {
    active: number;
    total: number;
  };
  healthScore: number;
  aiGeneration: {
    completed: number;
    pending: number;
    failed: number;
  };
  storage: {
    used: number;
    total: number;
    unit: string;
  };
}

interface ActivityItem {
  id: string;
  type: "content_created" | "content_edited" | "content_published" | "ai_generated" | "user_login" | "system_event";
  description: string;
  timestamp: string;
  user: {
    name: string;
    avatar?: string;
  };
  metadata?: {
    contentType?: string;
    contentTitle?: string;
  };
}

const mockStats: DashboardStats = {
  contents: {
    total: 2847,
    attractions: 1256,
    articles: 892,
    destinations: 245,
    pages: 454,
  },
  status: {
    published: 2134,
    draft: 713,
  },
  languages: {
    active: 30,
    total: 30,
  },
  healthScore: 87,
  aiGeneration: {
    completed: 1523,
    pending: 47,
    failed: 12,
  },
  storage: {
    used: 12.4,
    total: 50,
    unit: "GB",
  },
};

const mockActivity: ActivityItem[] = [
  {
    id: "1",
    type: "content_published",
    description: "Published 'Top 10 Attractions in Dubai 2026'",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    user: { name: "Sarah Chen", avatar: "" },
    metadata: { contentType: "article", contentTitle: "Top 10 Attractions in Dubai 2026" },
  },
  {
    id: "2",
    type: "ai_generated",
    description: "AI generated content for 'Barcelona Travel Guide'",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    user: { name: "Octopus AI", avatar: "" },
    metadata: { contentType: "destination", contentTitle: "Barcelona Travel Guide" },
  },
  {
    id: "3",
    type: "content_edited",
    description: "Updated pricing for 'Burj Khalifa At The Top'",
    timestamp: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
    user: { name: "Michael Torres", avatar: "" },
    metadata: { contentType: "attraction", contentTitle: "Burj Khalifa At The Top" },
  },
  {
    id: "4",
    type: "user_login",
    description: "Admin logged in from Tel Aviv, Israel",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    user: { name: "David Levy", avatar: "" },
  },
  {
    id: "5",
    type: "content_created",
    description: "Created new attraction 'Gardens by the Bay'",
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    user: { name: "Emma Wilson", avatar: "" },
    metadata: { contentType: "attraction", contentTitle: "Gardens by the Bay" },
  },
  {
    id: "6",
    type: "system_event",
    description: "SEO audit completed - 23 issues found",
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    user: { name: "System", avatar: "" },
  },
  {
    id: "7",
    type: "ai_generated",
    description: "Bulk translation completed for 15 articles (Hebrew)",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    user: { name: "Octopus AI", avatar: "" },
  },
  {
    id: "8",
    type: "content_published",
    description: "Published 'Tokyo Nightlife Guide 2026'",
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    user: { name: "Sarah Chen", avatar: "" },
    metadata: { contentType: "article", contentTitle: "Tokyo Nightlife Guide 2026" },
  },
];

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-full" />
      </CardContent>
    </Card>
  );
}

function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
}) {
  if (loading) return <StatsCardSkeleton />;

  return (
    <Card data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs mt-1",
            trend.positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            <TrendingUp className={cn("h-3 w-3", !trend.positive && "rotate-180")} />
            <span>{trend.positive ? "+" : ""}{trend.value}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HealthScoreCard({ score, loading }: { score: number; loading?: boolean }) {
  if (loading) return <StatsCardSkeleton />;

  const getScoreColor = (value: number) => {
    if (value >= 80) return "text-green-600 dark:text-green-400";
    if (value >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card data-testid="card-health-score">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Content Health</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", getScoreColor(score))}>
          {score}%
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          SEO, completeness & freshness
        </p>
      </CardContent>
    </Card>
  );
}

function AIGenerationCard({
  stats,
  loading,
}: {
  stats: DashboardStats["aiGeneration"];
  loading?: boolean;
}) {
  if (loading) return <StatsCardSkeleton />;

  return (
    <Card data-testid="card-ai-generation">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">AI Generation</CardTitle>
        <Sparkles className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.completed.toLocaleString()}</div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1 text-xs">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span className="text-muted-foreground">{stats.completed}</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3 text-yellow-500" />
            <span className="text-muted-foreground">{stats.pending}</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <AlertCircle className="h-3 w-3 text-red-500" />
            <span className="text-muted-foreground">{stats.failed}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StorageCard({
  storage,
  loading,
}: {
  storage: DashboardStats["storage"];
  loading?: boolean;
}) {
  if (loading) return <StatsCardSkeleton />;

  const usagePercent = Math.round((storage.used / storage.total) * 100);

  return (
    <Card data-testid="card-storage">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Storage Usage</CardTitle>
        <HardDrive className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {storage.used} {storage.unit}
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{usagePercent}% used</span>
            <span>{storage.total} {storage.unit} total</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-yellow-500" : "bg-primary"
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getActivityIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "content_created":
      return <Plus className="h-4 w-4 text-green-500" />;
    case "content_edited":
      return <FileText className="h-4 w-4 text-blue-500" />;
    case "content_published":
      return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case "ai_generated":
      return <Sparkles className="h-4 w-4 text-purple-500" />;
    case "user_login":
      return <User className="h-4 w-4 text-muted-foreground" />;
    case "system_event":
      return <Settings className="h-4 w-4 text-orange-500" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
}

function getActivityBadgeVariant(type: ActivityItem["type"]): "default" | "secondary" | "outline" {
  switch (type) {
    case "content_published":
      return "default";
    case "ai_generated":
      return "secondary";
    default:
      return "outline";
  }
}

function ActivityFeed({
  activities,
  loading,
}: {
  activities: ActivityItem[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <ActivityItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 rounded-lg border-b border-border/50 last:border-b-0"
          data-testid={`activity-item-${activity.id}`}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
            <AvatarFallback className="text-xs">
              {activity.user.name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {getActivityIcon(activity.type)}
              <span className="text-sm">{activity.description}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </span>
              <span className="text-xs text-muted-foreground">by {activity.user.name}</span>
            </div>
          </div>
          {activity.metadata?.contentType && (
            <Badge variant={getActivityBadgeVariant(activity.type)} className="shrink-0">
              {activity.metadata.contentType}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

const quickActions = [
  {
    label: "Create Attraction",
    icon: MapPin,
    href: "/admin/attractions/new",
    testId: "button-create-attraction",
  },
  {
    label: "Create Article",
    icon: Newspaper,
    href: "/admin/articles/new",
    testId: "button-create-article",
  },
  {
    label: "Generate with AI",
    icon: Bot,
    href: "/admin/octopus",
    testId: "button-generate-ai",
  },
  {
    label: "Run SEO Audit",
    icon: Search,
    href: "/admin/seo-audit",
    testId: "button-seo-audit",
  },
  {
    label: "Bulk Translate",
    icon: Languages,
    href: "/admin/translations",
    testId: "button-bulk-translate",
  },
  {
    label: "View Analytics",
    icon: BarChart3,
    href: "/admin/analytics",
    testId: "button-view-analytics",
  },
];

export default function AdminDashboard() {
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/analytics/stats"],
    staleTime: 60000,
  });

  const { data: activityData, isLoading: activityLoading, refetch: refetchActivity } = useQuery<ActivityItem[]>({
    queryKey: ["/api/admin/activity-feed"],
    staleTime: 30000,
  });

  const stats = statsData || mockStats;
  const activities = activityData || mockActivity;
  const isStatsLoading = statsLoading && !statsData;
  const isActivityLoading = activityLoading && !activityData;

  const handleRefresh = () => {
    refetchStats();
    refetchActivity();
  };

  return (
    <div className="p-6 space-y-6" data-testid="admin-dashboard">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back to TRAVI CMS
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={statsLoading || activityLoading}
          data-testid="button-refresh-dashboard"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", (statsLoading || activityLoading) && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatsCard
            title="Total Content"
            value={stats.contents.total.toLocaleString()}
            icon={FileText}
            description={`${stats.contents.attractions} attractions, ${stats.contents.articles} articles`}
            loading={isStatsLoading}
          />
          <StatsCard
            title="Published vs Draft"
            value={`${stats.status.published} / ${stats.status.draft}`}
            icon={CheckCircle2}
            description={`${Math.round((stats.status.published / stats.contents.total) * 100)}% published`}
            loading={isStatsLoading}
          />
          <StatsCard
            title="Active Languages"
            value={`${stats.languages.active} / ${stats.languages.total}`}
            icon={Globe}
            description="Full multilingual coverage"
            loading={isStatsLoading}
          />
          <HealthScoreCard score={stats.healthScore} loading={isStatsLoading} />
          <AIGenerationCard stats={stats.aiGeneration} loading={isStatsLoading} />
          <StorageCard storage={stats.storage} loading={isStatsLoading} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest content changes and system events
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto px-6 pb-4">
                <ActivityFeed activities={activities} loading={isActivityLoading} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Common tasks for content management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.href}
                    variant="ghost"
                    className="w-full justify-start gap-3"
                    asChild
                    data-testid={action.testId}
                  >
                    <Link href={action.href}>
                      <action.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{action.label}</span>
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

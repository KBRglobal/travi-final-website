/**
 * Admin Dashboard - Main entry point for TRAVI CMS admin panel
 *
 * Displays overview stats, activity feed, quick actions, and notifications.
 * According to spec: Stats Cards, Activity Feed, Quick Actions Grid, Notifications Panel
 */

import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Globe,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Bot,
  RefreshCw,
  MapPin,
  User,
  Users,
  Settings,
  Zap,
  Activity,
  Layers,
  Image,
  Bell,
  ClipboardList,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Info,
  Heart,
  Database,
  Server,
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
  media: {
    images: number;
    videos: number;
    storageUsed: string;
  };
  users: {
    total: number;
    online: number;
  };
  pendingTasks: {
    review: number;
    scheduled: number;
    aiQueue: number;
  };
  status: {
    published: number;
    draft: number;
  };
  aiGeneration: {
    completed: number;
    pending: number;
    failed: number;
  };
}

interface ActivityItem {
  id: string;
  type:
    | "content_created"
    | "content_edited"
    | "content_published"
    | "ai_generated"
    | "user_login"
    | "system_event";
  description: string;
  timestamp: string;
  user: {
    name: string;
    avatar?: string;
  };
  metadata?: {
    contentType?: string;
    contentTitle?: string;
    entityLink?: string;
  };
}

interface Notification {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

interface SystemHealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  checks?: {
    database?: {
      status: "healthy" | "warning" | "unhealthy";
      latency?: number;
      message?: string;
    };
    memory?: {
      status: "healthy" | "warning" | "unhealthy";
      usage?: number;
      message?: string;
    };
  };
}

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

function ClickableStatsCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
  href,
}: Readonly<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  loading?: boolean;
  href?: string;
}>) {
  const [, setLocation] = useLocation();

  if (loading) return <StatsCardSkeleton />;

  const handleClick = () => {
    if (href) {
      setLocation(href);
    }
  };

  return (
    <Card
      data-testid={`card-stat-${title.toLowerCase().replaceAll(/\s+/g, "-")}`}
      className={cn("transition-all", href && "cursor-pointer hover-elevate")}
      onClick={href ? handleClick : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {href && (
          <div className="flex items-center gap-1 text-xs text-primary mt-2">
            <span>View details</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SystemHealthCard({
  health,
  loading,
}: Readonly<{
  health?: SystemHealthResponse;
  loading?: boolean;
}>) {
  if (loading) return <StatsCardSkeleton />;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-500";
      case "warning":
      case "degraded":
        return "text-yellow-500";
      case "unhealthy":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return "default";
      case "degraded":
        return "secondary";
      case "unhealthy":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card data-testid="card-system-health">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">System Health</CardTitle>
        <Heart
          className={cn(
            "h-4 w-4",
            health ? getStatusColor(health.status) : "text-muted-foreground"
          )}
        />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant={
              health
                ? (getStatusBadge(health.status) as
                    | "default"
                    | "secondary"
                    | "destructive"
                    | "outline")
                : "outline"
            }
          >
            {health?.status?.toUpperCase() ?? "UNKNOWN"}
          </Badge>
        </div>
        {health && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <Server className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Uptime: {formatUptime(health.uptime)}</span>
            </div>
            {health.checks?.database && (
              <div className="flex items-center gap-2 text-xs">
                <Database
                  className={cn("h-3 w-3", getStatusColor(health.checks.database.status))}
                />
                <span className="text-muted-foreground">
                  DB: {health.checks.database.latency ?? 0}ms
                </span>
              </div>
            )}
            {health.checks?.memory && (
              <div className="flex items-center gap-2 text-xs">
                <Activity className={cn("h-3 w-3", getStatusColor(health.checks.memory.status))} />
                <span className="text-muted-foreground">
                  Memory: {health.checks.memory.usage ?? 0}%
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AIGenerationCard({
  stats,
  loading,
}: Readonly<{
  stats?: DashboardStats["aiGeneration"];
  loading?: boolean;
}>) {
  if (loading) return <StatsCardSkeleton />;

  return (
    <Card data-testid="card-ai-generation">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">AI Generation</CardTitle>
        <Sparkles className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats?.completed?.toLocaleString() ?? "N/A"}</div>
        {stats && (
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span className="text-muted-foreground">{stats.completed} completed</span>
            </div>
            {stats.failed > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <AlertCircle className="h-3 w-3 text-red-500" />
                <span className="text-muted-foreground">{stats.failed} failed</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// REMOVED: StorageCard - no real storage tracking exists

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
}: Readonly<{ activities?: ActivityItem[]; loading?: boolean }>) {
  if (loading) {
    return (
      <div className="space-y-1">
        {[1, 2, 3, 4, 5].map(i => (
          <ActivityItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No recent activity</p>
        <p className="text-xs mt-1">
          Activity will appear here when content is created or modified
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map(activity => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 rounded-lg border-b border-border/50 last:border-b-0 hover-elevate cursor-pointer"
          data-testid={`activity-item-${activity.id}`}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
            <AvatarFallback className="text-xs">
              {activity.user.name
                .split(" ")
                .map(n => n[0])
                .join("")}
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
            {activity.metadata?.entityLink && (
              <Link
                href={activity.metadata.entityLink}
                className="text-xs text-primary mt-1 inline-flex items-center gap-1"
              >
                View <ArrowRight className="h-3 w-3" />
              </Link>
            )}
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

function NotificationItem({ notification }: Readonly<{ notification: Notification }>) {
  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg border-b border-border/50 last:border-b-0",
        !notification.read && "bg-muted/30"
      )}
    >
      <div className="flex items-start gap-2">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{notification.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
}

function NotificationsPanel({
  notifications,
  loading,
}: Readonly<{
  notifications?: Notification[];
  loading?: boolean;
}>) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No notifications</p>
        <p className="text-xs mt-1">System alerts will appear here</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-1">
        {notifications.map(notification => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </div>
    </ScrollArea>
  );
}

const quickActions = [
  {
    label: "Destinations",
    icon: Globe,
    href: "/admin/destinations",
    testId: "button-destinations",
    description: "Manage destinations",
  },
  {
    label: "Attractions",
    icon: MapPin,
    href: "/admin/attractions",
    testId: "button-attractions",
    description: "Manage attractions content",
  },
  {
    label: "Octypo Engine",
    icon: Bot,
    href: "/admin/octypo",
    testId: "button-run-octypo",
    description: "AI content generation",
  },
  {
    label: "Homepage Editor",
    icon: FileText,
    href: "/admin/homepage",
    testId: "button-homepage",
    description: "Edit homepage sections",
  },
  {
    label: "Site Settings",
    icon: Settings,
    href: "/admin/site-settings",
    testId: "button-site-settings",
    description: "Configure site options",
  },
];

export default function AdminDashboard() {
  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/analytics/stats"],
    staleTime: 60000,
  });

  const {
    data: activityData,
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = useQuery<ActivityItem[]>({
    queryKey: ["/api/admin/activity-feed"],
    staleTime: 30000,
  });

  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    refetch: refetchNotifications,
  } = useQuery<Notification[]>({
    queryKey: ["/api/admin/notifications"],
    staleTime: 30000,
  });

  // Query real system health endpoint
  const {
    data: healthData,
    isLoading: healthLoading,
    refetch: refetchHealth,
  } = useQuery<SystemHealthResponse>({
    queryKey: ["/api/health"],
    staleTime: 30000,
  });

  const stats = statsData;
  const activities = activityData;
  const notifications = notificationsData;
  const health = healthData;
  const isStatsLoading = statsLoading;
  const isActivityLoading = activityLoading;
  const isHealthLoading = healthLoading;

  const handleRefresh = () => {
    refetchStats();
    refetchActivity();
    refetchNotifications();
    refetchHealth();
  };

  // Only use real pending tasks count (drafts awaiting review)
  const totalPendingTasks = stats?.pendingTasks?.review || 0;

  return (
    <div className="p-6 space-y-6" data-testid="admin-dashboard">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back to TRAVI CMS</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={statsLoading || activityLoading}
          data-testid="button-refresh-dashboard"
        >
          <RefreshCw
            className={cn("h-4 w-4 mr-2", (statsLoading || activityLoading) && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* Stats Cards Row - REAL DATA ONLY */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Total Content - REAL: aggregate of all content types */}
          <ClickableStatsCard
            title="Total Content"
            value={stats?.contents?.total?.toLocaleString() ?? "N/A"}
            icon={FileText}
            description={
              stats?.contents
                ? `${stats.contents.attractions} attractions, ${stats.contents.destinations} destinations, ${stats.contents.articles} articles`
                : undefined
            }
            loading={isStatsLoading}
            href="/admin/contents-intelligence"
          />

          {/* Media Assets - REAL: queries images table only */}
          <ClickableStatsCard
            title="Images"
            value={stats?.media?.images?.toLocaleString() ?? "N/A"}
            icon={Image}
            description="Total images in media library"
            loading={isStatsLoading}
            href="/admin/media"
          />

          {/* Active Users - REAL: queries users table */}
          <ClickableStatsCard
            title="Registered Users"
            value={stats?.users?.total?.toString() ?? "N/A"}
            icon={Users}
            description="Total registered users"
            loading={isStatsLoading}
            href="/admin/users"
          />

          {/* Pending Tasks - REAL: queries draft content */}
          <ClickableStatsCard
            title="Pending Review"
            value={totalPendingTasks.toString()}
            icon={ClipboardList}
            description={
              stats?.pendingTasks ? `${stats.pendingTasks.review} drafts to review` : undefined
            }
            loading={isStatsLoading}
            href="/admin/seo-engine/actions"
          />

          {/* AI Generation - REAL: queries ai_generation_logs + tiqets */}
          <AIGenerationCard stats={stats?.aiGeneration} loading={isStatsLoading} />
        </div>
      </div>

      {/* Secondary Stats Row - REAL DATA ONLY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Published vs Draft - REAL: queries contents by status */}
        <ClickableStatsCard
          title="Published vs Draft"
          value={
            stats?.status
              ? `${stats.status.published} published / ${stats.status.draft} drafts`
              : "N/A"
          }
          icon={CheckCircle2}
          description={
            stats?.status && stats?.contents?.total && stats.contents.total > 0
              ? `${Math.round((stats.status.published / stats.contents.total) * 100)}% published`
              : undefined
          }
          loading={isStatsLoading}
        />

        {/* Attractions Count - REAL: from contents table */}
        <ClickableStatsCard
          title="Attractions"
          value={stats?.contents?.attractions?.toLocaleString() ?? "N/A"}
          icon={MapPin}
          description="Total attractions in system"
          loading={isStatsLoading}
          href="/admin/attractions"
        />

        {/* System Health - REAL: from /api/health endpoint */}
        <SystemHealthCard health={health} loading={isHealthLoading} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed - 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest content changes and system events</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] px-6 pb-4">
                <ActivityFeed activities={activities} loading={isActivityLoading} />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Actions & Notifications */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks for content management</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {quickActions.map(action => (
                  <Button
                    key={action.href}
                    variant="ghost"
                    className="w-full justify-start gap-3 h-auto py-3"
                    asChild
                    data-testid={action.testId}
                  >
                    <Link href={action.href}>
                      <action.icon className="h-4 w-4 text-muted-foreground" />
                      <div className="text-left">
                        <span className="block">{action.label}</span>
                        <span className="text-xs text-muted-foreground">{action.description}</span>
                      </div>
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notifications Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>System alerts and updates</CardDescription>
            </CardHeader>
            <CardContent className="p-0 px-4 pb-4">
              <NotificationsPanel notifications={notifications} loading={notificationsLoading} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* REMOVED: Storage Card - no real storage tracking exists */}
    </div>
  );
}

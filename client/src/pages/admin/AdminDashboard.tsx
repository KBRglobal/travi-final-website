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
  RefreshCw,
  MapPin,
  User,
  Users,
  Settings,
  Zap,
  Activity,
  Layers,
  Image,
  Video,
  Bell,
  ClipboardList,
  Server,
  Eye,
  ArrowRight,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Info,
  ImagePlus,
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
  traffic: {
    today: number;
    pageViews: number;
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
  systemHealth: {
    status: "healthy" | "degraded" | "critical";
    apiUptime: number;
    errors: number;
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
  trend,
  loading,
  href,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
  href?: string;
}) {
  const [, setLocation] = useLocation();
  
  if (loading) return <StatsCardSkeleton />;

  const handleClick = () => {
    if (href) {
      setLocation(href);
    }
  };

  return (
    <Card 
      data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, "-")}`}
      className={cn(
        "transition-all",
        href && "cursor-pointer hover-elevate"
      )}
      onClick={href ? handleClick : undefined}
    >
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
  loading 
}: { 
  health?: DashboardStats["systemHealth"]; 
  loading?: boolean;
}) {
  if (loading) return <StatsCardSkeleton />;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "healthy": return "text-green-600 dark:text-green-400";
      case "degraded": return "text-yellow-600 dark:text-yellow-400";
      case "critical": return "text-red-600 dark:text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "healthy": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "degraded": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "critical": return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <Server className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <Card data-testid="card-system-health">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">System Health</CardTitle>
        <Server className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          {getStatusIcon(health?.status)}
          <span className={cn("text-2xl font-bold capitalize", getStatusColor(health?.status))}>
            {health?.status || "N/A"}
          </span>
        </div>
        {health && (
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{health.apiUptime}% uptime</span>
            <span>{health.errors} errors</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HealthScoreCard({ score, loading }: { score?: number; loading?: boolean }) {
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
        <div className={cn("text-2xl font-bold", score != null ? getScoreColor(score) : "text-muted-foreground")}>
          {score != null ? `${score}%` : "N/A"}
        </div>
        {score != null && (
          <p className="text-xs text-muted-foreground mt-1">
            SEO, completeness & freshness
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AIGenerationCard({
  stats,
  loading,
}: {
  stats?: DashboardStats["aiGeneration"];
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
        <div className="text-2xl font-bold">{stats?.completed?.toLocaleString() ?? "N/A"}</div>
        {stats && (
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
        )}
      </CardContent>
    </Card>
  );
}

function StorageCard({
  storage,
  loading,
}: {
  storage?: DashboardStats["storage"];
  loading?: boolean;
}) {
  if (loading) return <StatsCardSkeleton />;

  const usagePercent = storage ? Math.round((storage.used / storage.total) * 100) : 0;

  return (
    <Card data-testid="card-storage">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Storage Usage</CardTitle>
        <HardDrive className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {storage ? `${storage.used} ${storage.unit}` : "N/A"}
        </div>
        {storage && (
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
        )}
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
  activities?: ActivityItem[];
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

  if (!activities || activities.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No recent activity</p>
        <p className="text-xs mt-1">Activity will appear here when content is created or modified</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 rounded-lg border-b border-border/50 last:border-b-0 hover-elevate cursor-pointer"
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
            {activity.metadata?.entityLink && (
              <Link href={activity.metadata.entityLink} className="text-xs text-primary mt-1 inline-flex items-center gap-1">
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

function NotificationItem({ notification }: { notification: Notification }) {
  const getIcon = () => {
    switch (notification.type) {
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error": return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
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
  loading 
}: { 
  notifications?: Notification[]; 
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map((i) => (
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
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </div>
    </ScrollArea>
  );
}

const quickActions = [
  {
    label: "New Article",
    icon: Newspaper,
    href: "/admin/articles/new",
    testId: "button-new-article",
    description: "Create article with AI",
  },
  {
    label: "New Destination",
    icon: Globe,
    href: "/admin/destinations/new",
    testId: "button-new-destination",
    description: "Add destination",
  },
  {
    label: "Generate Images",
    icon: ImagePlus,
    href: "/admin/images/generate",
    testId: "button-generate-images",
    description: "Open AI image generator",
  },
  {
    label: "Run Octopus",
    icon: Bot,
    href: "/admin/octopus",
    testId: "button-run-octopus",
    description: "Start content generation",
  },
  {
    label: "View Analytics",
    icon: BarChart3,
    href: "/admin/analytics",
    testId: "button-view-analytics",
    description: "Open analytics",
  },
  {
    label: "Manage Queue",
    icon: ClipboardList,
    href: "/admin/queue",
    testId: "button-manage-queue",
    description: "Review pending items",
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

  const { data: notificationsData, isLoading: notificationsLoading, refetch: refetchNotifications } = useQuery<Notification[]>({
    queryKey: ["/api/admin/notifications"],
    staleTime: 30000,
  });

  const stats = statsData;
  const activities = activityData;
  const notifications = notificationsData;
  const isStatsLoading = statsLoading;
  const isActivityLoading = activityLoading;

  const handleRefresh = () => {
    refetchStats();
    refetchActivity();
    refetchNotifications();
  };

  const totalPendingTasks = (stats?.pendingTasks?.review || 0) + 
                            (stats?.pendingTasks?.scheduled || 0) + 
                            (stats?.pendingTasks?.aiQueue || 0);

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

      {/* Stats Cards Row - According to Spec */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Total Content */}
          <ClickableStatsCard
            title="Total Content"
            value={stats?.contents?.total?.toLocaleString() ?? "N/A"}
            icon={FileText}
            description={stats?.contents ? `${stats.contents.destinations} destinations, ${stats.contents.articles} articles` : undefined}
            loading={isStatsLoading}
            href="/admin/content"
          />
          
          {/* Media Assets */}
          <ClickableStatsCard
            title="Media Assets"
            value={stats?.media ? `${stats.media.images + stats.media.videos}` : "N/A"}
            icon={Image}
            description={stats?.media ? `${stats.media.images} images, ${stats.media.videos} videos` : undefined}
            loading={isStatsLoading}
            href="/admin/media"
          />
          
          {/* Active Users */}
          <ClickableStatsCard
            title="Active Users"
            value={stats?.users ? `${stats.users.online} / ${stats.users.total}` : "N/A"}
            icon={Users}
            description={stats?.users ? `${stats.users.online} online` : undefined}
            loading={isStatsLoading}
            href="/admin/users"
          />
          
          {/* Today's Traffic */}
          <ClickableStatsCard
            title="Today's Traffic"
            value={stats?.traffic?.today?.toLocaleString() ?? "N/A"}
            icon={Eye}
            description={stats?.traffic ? `${stats.traffic.pageViews} page views` : undefined}
            loading={isStatsLoading}
            href="/admin/analytics"
          />
          
          {/* Pending Tasks */}
          <ClickableStatsCard
            title="Pending Tasks"
            value={totalPendingTasks.toString()}
            icon={ClipboardList}
            description={stats?.pendingTasks ? `${stats.pendingTasks.review} review, ${stats.pendingTasks.scheduled} scheduled` : undefined}
            loading={isStatsLoading}
            href="/admin/queue"
          />
          
          {/* System Health */}
          <SystemHealthCard health={stats?.systemHealth} loading={isStatsLoading} />
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ClickableStatsCard
          title="Published vs Draft"
          value={stats?.status ? `${stats.status.published} / ${stats.status.draft}` : "N/A"}
          icon={CheckCircle2}
          description={stats?.status && stats?.contents?.total ? `${Math.round((stats.status.published / stats.contents.total) * 100)}% published` : undefined}
          loading={isStatsLoading}
          href="/admin/content"
        />
        <ClickableStatsCard
          title="Active Languages"
          value={stats?.languages ? `${stats.languages.active} / ${stats.languages.total}` : "N/A"}
          icon={Globe}
          description={stats?.languages ? "Full multilingual coverage" : undefined}
          loading={isStatsLoading}
          href="/admin/translations"
        />
        <HealthScoreCard score={stats?.healthScore} loading={isStatsLoading} />
        <AIGenerationCard stats={stats?.aiGeneration} loading={isStatsLoading} />
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
              <CardDescription>
                Latest content changes and system events
              </CardDescription>
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
              <CardDescription>
                System alerts and updates
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 px-4 pb-4">
              <NotificationsPanel notifications={notifications} loading={notificationsLoading} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Storage Card at bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StorageCard storage={stats?.storage} loading={isStatsLoading} />
      </div>
    </div>
  );
}

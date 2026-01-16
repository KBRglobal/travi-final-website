import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle,
  Globe,
  FileText,
  Rss,
  CalendarClock,
  TrendingDown,
  Eye,
  Languages,
  X,
  Info,
} from "lucide-react";
import type { ContentWithRelations } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// API notification from server
interface ApiNotification {
  id: string;
  type: "info" | "warning" | "success" | "error";
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: ApiNotification[];
  unreadCount: number;
}

interface Notification {
  id: string;
  type: "info" | "warning" | "success" | "action";
  icon: React.ElementType;
  title: string;
  description: string;
  time: Date;
  link?: string;
  read?: boolean;
  isApiNotification?: boolean;
}

export function NotificationsCenter() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Fetch user notifications from API
  const { data: apiNotifications } = useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications"],
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch data needed for system-generated notifications
  const { data: contents = [] } = useQuery<ContentWithRelations[]>({
    queryKey: ["/api/contents"],
  });

  const { data: rssStats } = useQuery<{ pendingCount: number }>({
    queryKey: ["/api/rss-feeds/stats"],
  });

  const { data: attentionItems } = useQuery<{
    lowSeo: ContentWithRelations[];
    noViews: ContentWithRelations[];
    scheduledToday: ContentWithRelations[];
  }>({
    queryKey: ["/api/contents/attention"],
  });

  // Mutation to mark a notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/notifications/${id}/read`, { method: "PATCH" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Mutation to mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/notifications/mark-all-read", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Get icon for API notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning": return AlertTriangle;
      case "success": return CheckCircle;
      case "error": return AlertTriangle;
      default: return Info;
    }
  };

  // Generate notifications based on system state + API notifications
  const notifications = useMemo<Notification[]>(() => {
    const items: Notification[] = [];
    const now = new Date();

    // Add API notifications first (from database)
    if (apiNotifications?.notifications) {
      apiNotifications.notifications.forEach((apiNotif) => {
        items.push({
          id: apiNotif.id,
          type: apiNotif.type === "error" ? "warning" : apiNotif.type as "info" | "warning" | "success",
          icon: getNotificationIcon(apiNotif.type),
          title: apiNotif.title,
          description: apiNotif.message,
          time: new Date(apiNotif.createdAt),
          link: apiNotif.link || undefined,
          read: apiNotif.isRead,
          isApiNotification: true,
        });
      });
    }

    // Scheduled contents notifications
    if (attentionItems?.scheduledToday?.length) {
      attentionItems.scheduledToday.forEach((item) => {
        items.push({
          id: `scheduled-${item.id}`,
          type: "info",
          icon: CalendarClock,
          title: "Content scheduled for today",
          description: item.title || "Untitled contents",
          time: item.scheduledAt ? new Date(item.scheduledAt) : now,
          link: `/admin/${item.type}s/${item.id}`,
        });
      });
    }

    // Low SEO score alerts
    if (attentionItems?.lowSeo?.length) {
      const critical = attentionItems.lowSeo.filter(
        (c) => c.seoScore !== null && c.seoScore < 50
      );
      if (critical.length > 0) {
        items.push({
          id: "low-seo-critical",
          type: "warning",
          icon: TrendingDown,
          title: `${critical.length} pages with critical SEO issues`,
          description: "These published pages have SEO scores below 50",
          time: now,
          link: "/admin/analytics",
        });
      }
    }

    // No views on published contents
    if (attentionItems?.noViews?.length && attentionItems.noViews.length > 5) {
      items.push({
        id: "no-views",
        type: "warning",
        icon: Eye,
        title: `${attentionItems.noViews.length} pages with no traffic`,
        description: "Published contents with less than 10 views",
        time: now,
        link: "/admin/analytics",
      });
    }

    // RSS pending articles
    if (rssStats?.pendingCount && rssStats.pendingCount > 0) {
      items.push({
        id: "rss-pending",
        type: "action",
        icon: Rss,
        title: `${rssStats.pendingCount} RSS articles pending`,
        description: "New articles from RSS feeds need review",
        time: now,
        link: "/admin/rss-feeds",
      });
    }

    // Draft contents that's been sitting for a while
    const oldDrafts = contents.filter((c) => {
      if (c.status !== "draft") return false;
      const updatedAt = c.updatedAt ? new Date(c.updatedAt) : null;
      if (!updatedAt) return false;
      const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 7;
    });

    if (oldDrafts.length > 0) {
      items.push({
        id: "old-drafts",
        type: "info",
        icon: FileText,
        title: `${oldDrafts.length} drafts need attention`,
        description: "Drafts not updated in over a week",
        time: now,
      });
    }

    // In-review contents waiting for approval
    const inReview = contents.filter((c) => c.status === "in_review");
    if (inReview.length > 0) {
      items.push({
        id: "in-review",
        type: "action",
        icon: Clock,
        title: `${inReview.length} items awaiting review`,
        description: "Content submitted for approval",
        time: now,
      });
    }

    // Sort by time, most recent first
    return items.sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [contents, rssStats, attentionItems, apiNotifications]);

  // Unread count - check both local state and API read status
  const unreadCount = notifications.filter((n) => {
    if (n.isApiNotification) {
      return !n.read;
    }
    return !localReadIds.has(n.id);
  }).length;

  // Mark as read - use API for API notifications, local state for system notifications
  const markAsRead = (id: string, isApiNotification?: boolean) => {
    if (isApiNotification) {
      markAsReadMutation.mutate(id);
    } else {
      setLocalReadIds((prev) => new Set([...prev, id]));
    }
  };

  // Mark all as read
  const markAllAsRead = () => {
    // Mark API notifications via API
    markAllAsReadMutation.mutate();
    // Mark local notifications
    setLocalReadIds(new Set(notifications.filter(n => !n.isApiNotification).map((n) => n.id)));
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id, notification.isApiNotification);
    if (notification.link) {
      setOpen(false);
      navigate(notification.link);
    }
  };

  // Filter by type
  const getIconColor = (type: Notification["type"]) => {
    switch (type) {
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "success":
        return "text-green-600 bg-green-100";
      case "action":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:max-w-[400px]">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} new</Badge>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="all" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="actions" className="flex-1">Actions</TabsTrigger>
            <TabsTrigger value="alerts" className="flex-1">Alerts</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-200px)] mt-4">
            <TabsContent value="all" className="mt-0">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No notifications</p>
                  <p className="text-sm mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => {
                    const Icon = notification.icon;
                    const isUnread = notification.isApiNotification
                      ? !notification.read
                      : !localReadIds.has(notification.id);

                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          isUnread
                            ? "bg-muted/50 hover:bg-muted"
                            : "hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex gap-3">
                          <div
                            className={`p-2 rounded-lg shrink-0 ${getIconColor(
                              notification.type
                            )}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4
                                className={`text-sm ${
                                  isUnread ? "font-medium" : ""
                                }`}
                              >
                                {notification.title}
                              </h4>
                              {isUnread && (
                                <div className="h-2 w-2 bg-primary rounded-full shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {notification.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTime(notification.time)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="actions" className="mt-0">
              {notifications.filter((n) => n.type === "action").length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No pending actions</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications
                    .filter((n) => n.type === "action")
                    .map((notification) => {
                      const Icon = notification.icon;
                      const isUnread = notification.isApiNotification
                        ? !notification.read
                        : !localReadIds.has(notification.id);

                      return (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            isUnread
                              ? "bg-muted/50 hover:bg-muted"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 shrink-0">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium">
                                {notification.title}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {notification.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="alerts" className="mt-0">
              {notifications.filter((n) => n.type === "warning").length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No alerts</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications
                    .filter((n) => n.type === "warning")
                    .map((notification) => {
                      const Icon = notification.icon;

                      return (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className="w-full text-left p-3 rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex gap-3">
                            <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600 shrink-0">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium">
                                {notification.title}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {notification.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

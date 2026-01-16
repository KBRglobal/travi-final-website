import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, FileText, Users, Settings, Shield, 
  Plus, Pencil, Trash2, Eye, CheckCircle2, Clock, Lightbulb 
} from "lucide-react";

interface ActivityEvent {
  id: string;
  type: string;
  action: string;
  entityType: string;
  entityId: string;
  entityTitle?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

interface ActivityStats {
  totalToday: number;
  contentChanges: number;
  userActions: number;
  systemEvents: number;
}

export default function ActivityFeedPage() {
  const { data: activities, isLoading } = useQuery<ActivityEvent[]>({
    queryKey: ["/api/enterprise/activities"],
  });

  const { data: stats } = useQuery<ActivityStats>({
    queryKey: ["/api/enterprise/activities/stats"],
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create":
        return <Plus className="h-4 w-4 text-green-600" />;
      case "update":
        return <Pencil className="h-4 w-4 text-blue-600" />;
      case "delete":
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case "view":
        return <Eye className="h-4 w-4 text-gray-600" />;
      case "publish":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case "contents":
        return <FileText className="h-4 w-4" />;
      case "user":
        return <Users className="h-4 w-4" />;
      case "settings":
        return <Settings className="h-4 w-4" />;
      case "security":
        return <Shield className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="heading-activity">
          <Activity className="h-8 w-8 text-primary" />
          Activity Feed
        </h1>
        <p className="text-muted-foreground mt-1">
          Real-time log of all actions in your CMS
        </p>
        <div className="mt-4 p-4 bg-muted rounded-lg border">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            How It Works / איך זה עובד
          </h3>
          <p className="text-sm text-muted-foreground">
            Every action in the CMS is logged here: contents edits, user logins, settings changes, and more.
            Use this for <strong>auditing</strong>, <strong>debugging</strong>, and monitoring team activity.
            <br />
            <span className="text-xs opacity-70">
              (כל פעולה במערכת נרשמת כאן: עריכות תוכן, כניסות משתמשים, שינויי הגדרות.)
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Today's Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-today-activity">
              {stats?.totalToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Content Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-contents-changes">
              {stats?.contentChanges || 0}
            </div>
            <p className="text-xs text-muted-foreground">Creates, edits, deletes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-user-actions">
              {stats?.userActions || 0}
            </div>
            <p className="text-xs text-muted-foreground">Logins, profile updates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600" data-testid="text-system-events">
              {stats?.systemEvents || 0}
            </div>
            <p className="text-xs text-muted-foreground">Automations, jobs</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Timeline of actions across the CMS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="contents">Content</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <ScrollArea className="h-[400px]">
                {activities?.length ? (
                  <div className="space-y-4">
                    {activities.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-4 p-4 border rounded-lg"
                        data-testid={`activity-${event.id}`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {event.userName?.charAt(0) || event.userEmail?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            {getActionIcon(event.action)}
                            <span className="font-medium">
                              {event.userName || event.userEmail || "System"}
                            </span>
                            <span className="text-muted-foreground">{event.action}</span>
                            {getEntityIcon(event.entityType)}
                            <span className="text-muted-foreground">{event.entityType}</span>
                          </div>
                          {event.entityTitle && (
                            <p className="text-sm text-muted-foreground">
                              "{event.entityTitle}"
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <Badge variant="outline">{event.entityType}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No activity recorded yet</p>
                    <p className="text-sm">Actions will appear here as users interact with the CMS</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

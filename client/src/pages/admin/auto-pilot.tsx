import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Zap,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Languages,
  FileText,
  TrendingUp,
  Star,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Lightbulb,
  Layers,
  Check,
  Globe,
  Search,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AutoPilotStatus {
  isRunning: boolean;
  lastRun: string | null;
  nextScheduledRun: string | null;
  tasksCompleted: number;
  tasksScheduled: number;
  recentErrors: number;
}

interface ScheduledContent {
  id: string;
  title: string;
  type: string;
  scheduledAt: string;
}

export default function AutoPilotPage() {
  const { toast } = useToast();

  const { data: status, isLoading: statusLoading } = useQuery<AutoPilotStatus>({
    queryKey: ["/api/auto-pilot/status"],
  });

  const { data: scheduledData } = useQuery<{ count: number; items: ScheduledContent[] }>({
    queryKey: ["/api/auto-pilot/scheduled"],
  });

  const { data: dailyReport } = useQuery({
    queryKey: ["/api/auto-pilot/reports/daily"],
  });

  const runHourlyMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auto-pilot/run/hourly"),
    onSuccess: () => {
      toast({ title: "Hourly tasks triggered", description: "Running in background..." });
      queryClient.invalidateQueries({ queryKey: ["/api/auto-pilot"] });
    },
    onError: () => toast({ title: "Failed to run hourly tasks", variant: "destructive" }),
  });

  const runDailyMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auto-pilot/run/daily"),
    onSuccess: () => {
      toast({ title: "Daily tasks triggered", description: "Running in background..." });
      queryClient.invalidateQueries({ queryKey: ["/api/auto-pilot"] });
    },
    onError: () => toast({ title: "Failed to run daily tasks", variant: "destructive" }),
  });

  const processScheduledMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auto-pilot/scheduled/process"),
    onSuccess: () => {
      toast({ title: "Processing scheduled contents" });
      queryClient.invalidateQueries({ queryKey: ["/api/auto-pilot/scheduled"] });
    },
    onError: () => toast({ title: "Failed to process scheduled contents", variant: "destructive" }),
  });

  // Bulk Operations Mutations - apiRequest returns Response, need to parse JSON
  const bulkApproveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auto-pilot/bulk/approve");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Bulk Approval Complete",
        description: `${data?.approved || 0} of ${data?.total || 0} items approved`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contents"] });
    },
    onError: () => toast({ title: "Bulk approval failed", variant: "destructive" }),
  });

  const bulkTranslateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auto-pilot/bulk/translate");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Bulk Translation Started",
        description: `Translating ${data?.queued || 0} items to 17 languages`,
      });
    },
    onError: () => toast({ title: "Bulk translation failed", variant: "destructive" }),
  });

  const bulkQualityCheckMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auto-pilot/bulk/quality-check");
      return res.json();
    },
    onSuccess: (data: any) => {
      const issues = data?.issueCount || 0;
      const checked = data?.checked || 0;
      toast({
        title: "Quality Check Complete",
        description: `Analyzed ${checked} items. ${issues > 0 ? `Found ${issues} items with issues.` : "All contents passed."}`,
      });
    },
    onError: () => toast({ title: "Quality check failed", variant: "destructive" }),
  });

  const bulkSeoRefreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auto-pilot/bulk/seo-refresh");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "SEO Refresh Complete",
        description: `Found ${data?.needsRefresh || 0} items needing SEO improvements`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contents"] });
    },
    onError: () => toast({ title: "SEO refresh failed", variant: "destructive" }),
  });

  if (statusLoading) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            Auto-Pilot Control Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated contents publishing, translations, and maintenance
          </p>
        </div>
        <Badge variant={status?.isRunning ? "default" : "secondary"} className="text-sm">
          {status?.isRunning ? "System Active" : "System Idle"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Tasks Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-tasks-completed">
              {status?.tasksCompleted || 0}
            </div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-tasks-scheduled">
              {scheduledData?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">Content items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last Run
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {status?.lastRun ? new Date(status.lastRun).toLocaleString() : "Never"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {status?.recentErrors && status.recentErrors > 0 ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Recent Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-errors">
              {status?.recentErrors || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Manual Triggers
            </CardTitle>
            <CardDescription>
              Run automation tasks manually for testing or immediate execution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => runHourlyMutation.mutate()}
              disabled={runHourlyMutation.isPending}
              className="w-full justify-start"
              variant="outline"
              data-testid="button-run-hourly"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${runHourlyMutation.isPending ? "animate-spin" : ""}`}
              />
              Run Hourly Tasks
            </Button>
            <Button
              onClick={() => runDailyMutation.mutate()}
              disabled={runDailyMutation.isPending}
              className="w-full justify-start"
              variant="outline"
              data-testid="button-run-daily"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Run Daily Tasks
            </Button>
            <Button
              onClick={() => processScheduledMutation.mutate()}
              disabled={processScheduledMutation.isPending}
              className="w-full justify-start"
              variant="outline"
              data-testid="button-process-scheduled"
            >
              <FileText className="mr-2 h-4 w-4" />
              Process Scheduled Content
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Bulk AI Operations
            </CardTitle>
            <CardDescription>
              Run AI-powered operations across multiple contents items
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => bulkApproveMutation.mutate()}
              disabled={bulkApproveMutation.isPending}
              className="w-full justify-start"
              variant="outline"
              data-testid="button-bulk-approve"
            >
              {bulkApproveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Bulk Approve (in_review items)
            </Button>
            <Button
              onClick={() => bulkTranslateMutation.mutate()}
              disabled={bulkTranslateMutation.isPending}
              className="w-full justify-start"
              variant="outline"
              data-testid="button-bulk-translate"
            >
              {bulkTranslateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Globe className="mr-2 h-4 w-4" />
              )}
              Bulk Translate to All Languages
            </Button>
            <Button
              onClick={() => bulkQualityCheckMutation.mutate()}
              disabled={bulkQualityCheckMutation.isPending}
              className="w-full justify-start"
              variant="outline"
              data-testid="button-bulk-quality"
            >
              {bulkQualityCheckMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Run Quality Check on All Content
            </Button>
            <Button
              onClick={() => bulkSeoRefreshMutation.mutate()}
              disabled={bulkSeoRefreshMutation.isPending}
              className="w-full justify-start"
              variant="outline"
              data-testid="button-bulk-seo"
            >
              {bulkSeoRefreshMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              AI Regenerate SEO Fields
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Content
            </CardTitle>
            <CardDescription>Content items queued for automatic publishing</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {scheduledData?.items && scheduledData.items.length > 0 ? (
                <div className="space-y-2">
                  {scheduledData.items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                      data-testid={`scheduled-item-${item.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.scheduledAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline">{item.type}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No scheduled contents</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Quality Score Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            AI Content Quality Scores
          </CardTitle>
          <CardDescription>Quality analysis for recently AI-generated contents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-muted rounded-lg border">
            <h3 className="font-medium flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              How It Works
            </h3>
            <p className="text-sm text-muted-foreground">
              Each AI-generated article receives a quality score based on SEO compliance,
              readability, link density, and content guidelines. Articles scoring below 70% are
              flagged for review.
            </p>
          </div>
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {/* Mock quality score data */}
              {[
                {
                  title: "Ultimate Guide to Burj Khalifa 2024",
                  score: 92,
                  seo: 95,
                  readability: 89,
                  links: 88,
                  writer: "Travel Expert AI",
                },
                {
                  title: "Dubai Mall Shopping Experience",
                  score: 87,
                  seo: 90,
                  readability: 85,
                  links: 82,
                  writer: "Local Guide AI",
                },
                {
                  title: "Desert Safari Adventures",
                  score: 78,
                  seo: 82,
                  readability: 75,
                  links: 70,
                  writer: "Adventure Writer AI",
                },
                {
                  title: "Palm Jumeirah Hotels Review",
                  score: 65,
                  seo: 60,
                  readability: 70,
                  links: 65,
                  writer: "Hospitality AI",
                  flagged: true,
                },
                {
                  title: "Dubai Marina Nightlife Guide",
                  score: 84,
                  seo: 88,
                  readability: 80,
                  links: 82,
                  writer: "Lifestyle AI",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${item.flagged ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" : ""}`}
                  data-testid={`quality-item-${idx}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">by {item.writer}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.flagged && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-500">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Review Needed
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        <Star
                          className={`h-4 w-4 ${item.score >= 80 ? "text-green-500" : item.score >= 70 ? "text-yellow-500" : "text-red-500"}`}
                        />
                        <span
                          className={`text-lg font-bold ${item.score >= 80 ? "text-green-600" : item.score >= 70 ? "text-yellow-600" : "text-red-600"}`}
                        >
                          {item.score}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">SEO</span>
                        <span className="font-medium">{item.seo}%</span>
                      </div>
                      <Progress value={item.seo} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">Readability</span>
                        <span className="font-medium">{item.readability}%</span>
                      </div>
                      <Progress value={item.readability} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">Links</span>
                        <span className="font-medium">{item.links}%</span>
                      </div>
                      <Progress value={item.links} className="h-1.5" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button variant="outline" size="sm" data-testid={`button-review-${idx}`}>
                      <Eye className="h-3 w-3 mr-1" />
                      Review
                    </Button>
                    <Button variant="ghost" size="sm" data-testid={`button-approve-${idx}`}>
                      <ThumbsUp className="h-3 w-3 mr-1" />
                      Approve
                    </Button>
                    <Button variant="ghost" size="sm" data-testid={`button-reject-${idx}`}>
                      <ThumbsDown className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Daily Report Summary
          </CardTitle>
          <CardDescription>Automated daily insights and activity summary</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyReport ? (
            <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto max-h-[300px]">
              {JSON.stringify(dailyReport, null, 2)}
            </pre>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No report available yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

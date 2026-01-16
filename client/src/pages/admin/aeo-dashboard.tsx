import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DashboardLayout, StatCard, AdminSection } from "@/components/admin";
import {
  Activity,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  MessageSquare,
  MousePointerClick,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

interface AEODashboardData {
  overview: {
    totalCitations: number;
    totalClickThroughs: number;
    totalConversions: number;
    totalRevenue: number;
    avgPosition: number;
  };
  byPlatform: Array<{
    platform: string;
    citations: number;
    clickThroughs: number;
    conversions: number;
    conversionRate: number;
  }>;
  topContent: Array<{
    contentId: string;
    title: string;
    citations: number;
    clickThroughs: number;
  }>;
  topQueries: Array<{
    query: string;
    count: number;
    platform: string;
  }>;
  crawlerActivity: Array<{
    crawler: string;
    visits: number;
    lastVisit: string;
  }>;
  trends: Array<{
    date: string;
    citations: number;
    clickThroughs: number;
  }>;
}

interface CapsuleStats {
  total: number;
  approved: number;
  pendingApproval: number;
  averageQuality: number;
  byLocale: Record<string, number>;
}

interface CrawlerStats {
  byCrawler: Array<{ crawler: string; count: number; percentage: number }>;
  byPath: Array<{ path: string; count: number }>;
  byStatus: Array<{ status: number; count: number }>;
  avgResponseTime: number;
  totalVisits: number;
}

interface ContentWithoutCapsule {
  id: string;
  title: string;
  type: string;
  slug: string;
  publishedAt: string | null;
}

const PLATFORM_CONFIG: Record<string, { icon: React.ReactNode; color: string; name: string }> = {
  chatgpt: { icon: <BrainCircuit className="w-4 h-4" />, color: "bg-green-500", name: "ChatGPT" },
  perplexity: { icon: <Search className="w-4 h-4" />, color: "bg-blue-500", name: "Perplexity" },
  google_aio: { icon: <Globe className="w-4 h-4" />, color: "bg-red-500", name: "Google AI" },
  claude: { icon: <Sparkles className="w-4 h-4" />, color: "bg-orange-500", name: "Claude" },
  bing_chat: { icon: <MessageSquare className="w-4 h-4" />, color: "bg-cyan-500", name: "Bing Chat" },
  gemini: { icon: <Bot className="w-4 h-4" />, color: "bg-[#6443F4]", name: "Gemini" },
};

export default function AEODashboard() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("30");
  const [selectedTab, setSelectedTab] = useState("overview");

  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery<AEODashboardData>({
    queryKey: ["/api/aeo/dashboard", dateRange],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/aeo/dashboard?days=${dateRange}`);
      return res.json();
    },
  });

  const { data: capsuleStats, isLoading: capsuleLoading } = useQuery<CapsuleStats>({
    queryKey: ["/api/aeo/capsules/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/aeo/capsules/stats");
      return res.json();
    },
  });

  const { data: crawlerStats, isLoading: crawlerLoading } = useQuery<CrawlerStats>({
    queryKey: ["/api/aeo/crawlers", dateRange],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/aeo/crawlers?days=${dateRange}`);
      return res.json();
    },
  });

  const { data: contentNeedingCapsules } = useQuery<{ contents: ContentWithoutCapsule[]; total: number }>({
    queryKey: ["/api/aeo/contents/missing-capsules"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/aeo/contents/missing-capsules?limit=20");
      return res.json();
    },
  });

  const batchGenerateMutation = useMutation({
    mutationFn: async (contentIds: string[]) => {
      const res = await apiRequest("POST", "/api/aeo/capsules/batch", {
        contentIds,
        locale: "en",
        skipExisting: true,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Batch generation complete",
        description: `Generated ${data.success} capsules, ${data.skipped} skipped, ${data.failed} failed`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/aeo/capsules/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aeo/contents/missing-capsules"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate capsules",
        variant: "destructive",
      });
    },
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (dashboardLoading) {
    return (
      <DashboardLayout
        title="Answer Engine Optimization"
        description="AI-powered contents optimization for search"
        stats={
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        }
      >
        <Skeleton className="h-96" />
      </DashboardLayout>
    );
  }

  const statsSection = (
    <>
      <StatCard
        label="Citations"
        value={formatNumber(dashboardData?.overview.totalCitations || 0)}
        icon={<MessageSquare className="w-4 h-4" />}
      />
      <StatCard
        label="Click-throughs"
        value={formatNumber(dashboardData?.overview.totalClickThroughs || 0)}
        icon={<MousePointerClick className="w-4 h-4" />}
      />
      <StatCard
        label="Conversions"
        value={formatNumber(dashboardData?.overview.totalConversions || 0)}
        icon={<Target className="w-4 h-4" />}
      />
      <StatCard
        label="Revenue"
        value={formatCurrency(dashboardData?.overview.totalRevenue || 0)}
        icon={<TrendingUp className="w-4 h-4" />}
      />
    </>
  );

  const actionsSection = (
    <div className="flex items-center gap-2">
      <Select value={dateRange} onValueChange={setDateRange}>
        <SelectTrigger className="w-32" data-testid="select-date-range">
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={() => refetchDashboard()} data-testid="button-refresh">
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh
      </Button>
    </div>
  );

  return (
    <DashboardLayout
      title="Answer Engine Optimization"
      description="AI-powered contents optimization for search"
      actions={actionsSection}
      stats={statsSection}
    >
      <AdminSection>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList data-testid="tabs-aeo">
            <TabsTrigger value="overview" data-testid="tab-platform-performance">Platform Performance</TabsTrigger>
            <TabsTrigger value="capsules" data-testid="tab-capsules">Answer Capsules</TabsTrigger>
            <TabsTrigger value="crawlers" data-testid="tab-crawlers">AI Crawlers</TabsTrigger>
            <TabsTrigger value="queries" data-testid="tab-queries">Top Queries</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Platform</CardTitle>
                  <CardDescription>Citations and conversions per AI platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData?.byPlatform.map((platform) => {
                      const config = PLATFORM_CONFIG[platform.platform] || {
                        icon: <Bot className="w-4 h-4" />,
                        color: "bg-gray-500",
                        name: platform.platform,
                      };
                      return (
                        <div key={platform.platform} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${config.color} text-white`}>
                              {config.icon}
                            </div>
                            <div>
                              <p className="font-medium">{config.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {platform.citations} citations
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{platform.clickThroughs} clicks</p>
                            <p className="text-sm text-muted-foreground">
                              {platform.conversionRate.toFixed(1)}% CVR
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {(!dashboardData?.byPlatform || dashboardData.byPlatform.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">No platform data yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Cited Content</CardTitle>
                  <CardDescription>Most frequently cited by AI platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardData?.topContent.slice(0, 8).map((contents, index) => (
                      <div key={contents.contentId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="w-6 h-6 flex items-center justify-center rounded-full">
                            {index + 1}
                          </Badge>
                          <p className="font-medium truncate max-w-[200px]">{contents.title}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{contents.citations}</p>
                          <p className="text-xs text-muted-foreground">{contents.clickThroughs} clicks</p>
                        </div>
                      </div>
                    ))}
                    {(!dashboardData?.topContent || dashboardData.topContent.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">No cited contents yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="capsules" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Capsule Statistics</CardTitle>
                  <CardDescription>Answer capsule coverage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Total Capsules</span>
                    <Badge variant="secondary">{capsuleStats?.total || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Approved
                    </span>
                    <Badge variant="default">{capsuleStats?.approved || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      Pending
                    </span>
                    <Badge variant="outline">{capsuleStats?.pendingApproval || 0}</Badge>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span>Average Quality</span>
                      <span className="font-bold">{capsuleStats?.averageQuality || 0}%</span>
                    </div>
                    <Progress value={capsuleStats?.averageQuality || 0} />
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle>Content Without Capsules</CardTitle>
                    <CardDescription>
                      {contentNeedingCapsules?.total || 0} pages need optimization
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      const ids = contentNeedingCapsules?.contents.slice(0, 10).map(c => c.id) || [];
                      if (ids.length > 0) {
                        batchGenerateMutation.mutate(ids);
                      }
                    }}
                    disabled={batchGenerateMutation.isPending || !contentNeedingCapsules?.contents?.length}
                    data-testid="button-generate-capsules"
                  >
                    {batchGenerateMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Generate Top 10
                      </>
                    )}
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {contentNeedingCapsules?.contents.map((contents) => (
                        <div
                          key={contents.id}
                          className="flex items-center justify-between p-2 rounded border"
                          data-testid={`contents-item-${contents.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{contents.type}</Badge>
                            <span className="truncate max-w-[300px]">{contents.title}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => batchGenerateMutation.mutate([contents.id])}
                            disabled={batchGenerateMutation.isPending}
                            data-testid={`button-generate-${contents.id}`}
                          >
                            <Sparkles className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {(!contentNeedingCapsules?.contents || contentNeedingCapsules.contents.length === 0) && (
                        <p className="text-center text-muted-foreground py-8">
                          All published contents has capsules
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="crawlers" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Crawler Activity</CardTitle>
                  <CardDescription>AI bot visits in the last {dateRange} days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {crawlerStats?.byCrawler.map((crawler) => {
                      const config = Object.values(PLATFORM_CONFIG).find(
                        (p) => p.name.toLowerCase().includes(crawler.crawler.toLowerCase())
                      ) || { icon: <Bot className="w-4 h-4" />, color: "bg-gray-500", name: crawler.crawler };

                      return (
                        <div key={crawler.crawler} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded ${config.color} text-white`}>
                                {config.icon}
                              </div>
                              <span className="font-medium">{crawler.crawler}</span>
                            </div>
                            <span>{formatNumber(crawler.count)} visits</span>
                          </div>
                          <Progress value={crawler.percentage} />
                        </div>
                      );
                    })}
                    {(!crawlerStats?.byCrawler || crawlerStats.byCrawler.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">No crawler activity recorded</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Crawler Statistics</CardTitle>
                  <CardDescription>Performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted">
                      <p className="text-3xl font-bold">{formatNumber(crawlerStats?.totalVisits || 0)}</p>
                      <p className="text-sm text-muted-foreground">Total Visits</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted">
                      <p className="text-3xl font-bold">{crawlerStats?.avgResponseTime || 0}ms</p>
                      <p className="text-sm text-muted-foreground">Avg Response Time</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium mb-2">Response Status</p>
                    <div className="space-y-2">
                      {crawlerStats?.byStatus.map((status) => (
                        <div key={status.status} className="flex items-center justify-between">
                          <Badge variant={status.status === 200 ? "default" : status.status >= 400 ? "destructive" : "secondary"}>
                            {status.status}
                          </Badge>
                          <span>{status.count} requests</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="font-medium mb-2">Top Crawled Paths</p>
                    <div className="space-y-1">
                      {crawlerStats?.byPath.slice(0, 5).map((path) => (
                        <div key={path.path} className="flex items-center justify-between text-sm">
                          <span className="truncate max-w-[200px]">/{path.path}</span>
                          <span className="text-muted-foreground">{path.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="queries" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Queries</CardTitle>
                <CardDescription>Most common queries that cited your contents</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Query</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData?.topQueries.map((query, index) => {
                      const config = PLATFORM_CONFIG[query.platform] || {
                        icon: <Bot className="w-4 h-4" />,
                        color: "bg-gray-500",
                        name: query.platform,
                      };
                      return (
                        <TableRow key={`${query.query}-${index}`}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="max-w-[400px] truncate">{query.query}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              {config.icon}
                              {config.name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{query.count}</TableCell>
                        </TableRow>
                      );
                    })}
                    {(!dashboardData?.topQueries || dashboardData.topQueries.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No queries recorded yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </AdminSection>

      <AdminSection title="Recent AI Crawler Activity" description="Latest visits from AI platform crawlers">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              {dashboardData?.crawlerActivity.slice(0, 5).map((activity) => {
                const config = Object.values(PLATFORM_CONFIG).find(
                  (p) => p.name.toLowerCase().includes(activity.crawler.toLowerCase())
                ) || { icon: <Bot className="w-4 h-4" />, color: "bg-gray-500", name: activity.crawler };

                return (
                  <div
                    key={activity.crawler}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`crawler-activity-${activity.crawler}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${config.color} text-white`}>
                        {config.icon}
                      </div>
                      <div>
                        <p className="font-medium">{activity.crawler}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.visits} visits
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Last visit: {new Date(activity.lastVisit).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              {(!dashboardData?.crawlerActivity || dashboardData.crawlerActivity.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No crawler activity recorded yet. AI crawlers will appear here when they visit your site.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </AdminSection>
    </DashboardLayout>
  );
}

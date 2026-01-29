import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  TrendingUp,
  Target,
  AlertCircle,
  Calendar,
  Search,
  Lightbulb,
  BarChart3,
  Network,
  Link2,
  ExternalLink,
  ArrowRight,
  Pencil,
  Sparkles,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface ContentGap {
  contentId: string;
  contentType: string;
  title: string;
  gaps: Array<{
    type: string;
    priority: "high" | "medium" | "low";
    suggestion: string;
  }>;
}

interface WatchlistItem {
  contentId: string;
  contentType: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  lastChecked: string;
}

interface EventItem {
  id: string;
  contentType: string;
  title: string;
  status: "upcoming" | "ongoing" | "past";
  needsUpdate: boolean;
}

// Helper function to build the correct editor path based on contents type
function getEditorPath(contentId: string, contentType: string): string {
  const typeToRoute: Record<string, string> = {
    attraction: "attractions",
    hotel: "hotels",
    article: "articles",
    dining: "dining",
    district: "districts",
    transport: "transport",
    event: "events",
    itinerary: "itineraries",
    landing_page: "landing-pages",
    case_study: "case-studies",
    off_plan: "off-plan",
  };
  const routeSegment = typeToRoute[contentType] || "articles";
  return `/admin/${routeSegment}/${contentId}`;
}

export default function ContentIntelligencePage() {
  const [, navigate] = useLocation();

  const { data: gapsData, isLoading: gapsLoading } = useQuery<{
    contents: ContentGap[];
    stats: { contentWithGaps: number; totalGaps: number; highPriorityGaps: number };
  }>({
    queryKey: ["/api/intelligence/gaps"],
  });

  const { data: watchlistData, isLoading: watchlistLoading } = useQuery<{
    items: WatchlistItem[];
    stats: { total: number; highPriority: number; mediumPriority: number };
  }>({
    queryKey: ["/api/intelligence/watchlist"],
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery<{
    events: EventItem[];
    stats: { total: number; upcoming: number; ongoing: number; past: number; needsUpdate: number };
  }>({
    queryKey: ["/api/intelligence/events"],
  });

  const { data: clustersData } = useQuery({
    queryKey: ["/api/intelligence/clusters/areas"],
  });

  const { data: internalLinksData, isLoading: linksLoading } = useQuery<{
    totalLinks: number;
    brokenLinks: Array<{ id: string; source: string; target: string; reason: string }>;
    orphanPages: Array<{ id: string; title: string; type: string; slug: string }>;
    stats: { total: number; broken: number; orphans: number };
  }>({
    queryKey: ["/api/intelligence/internal-links"],
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  const isLoading = gapsLoading || watchlistLoading || eventsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
      <div className="border-b border-[hsl(var(--admin-border))] bg-white">
        <div className="px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[hsl(var(--admin-text))]">
              Content Intelligence
            </h1>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1">
              AI-powered insights for contents optimization and gap analysis
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate("/admin/ai-article-generator")}
              data-testid="button-generate-article"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Article
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/contents/new")}
              data-testid="button-create-contents"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Content
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="p-4 bg-muted rounded-lg border">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            How It Works
          </h3>
          <p className="text-sm text-muted-foreground">
            This system analyzes your published content and identifies opportunities for
            improvement. It detects <strong>content gaps</strong> (missing topics), tracks{" "}
            <strong>volatile data</strong> (prices, hours that may need updates), monitors{" "}
            <strong>events</strong> to keep content fresh, and suggests{" "}
            <strong>topic clusters</strong> for better SEO structure. The more content you publish,
            the smarter the analysis becomes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Content Gaps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-gaps">
                {gapsData?.stats?.totalGaps || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {gapsData?.stats?.highPriorityGaps || 0} high priority
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Watchlist Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-watchlist-total">
                {watchlistData?.stats?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {watchlistData?.stats?.highPriority || 0} need attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Events Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-events-total">
                {eventsData?.stats?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {eventsData?.stats?.needsUpdate || 0} need update
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Network className="h-4 w-4" />
                Topic Clusters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-clusters-count">
                {(clustersData as any)?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">Detected areas</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="gaps" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="gaps" className="gap-2" data-testid="tab-contents-gaps">
              <Search className="h-4 w-4" />
              Content Gaps
            </TabsTrigger>
            <TabsTrigger value="internal-links" className="gap-2" data-testid="tab-internal-links">
              <Link2 className="h-4 w-4" />
              Internal Links
            </TabsTrigger>
            <TabsTrigger value="watchlist" className="gap-2" data-testid="tab-watchlist">
              <AlertCircle className="h-4 w-4" />
              Watchlist
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2" data-testid="tab-events">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger
              value="recommendations"
              className="gap-2"
              data-testid="tab-recommendations"
            >
              <Lightbulb className="h-4 w-4" />
              Recommendations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gaps">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  SERP Gap Analysis
                </CardTitle>
                <CardDescription>
                  Missing topics and contents opportunities based on search trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {gapsData?.contents && gapsData.contents.length > 0 ? (
                    <div className="space-y-4">
                      {gapsData.contents.map(item => (
                        <div key={item.contentId} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <h4 className="font-medium">{item.title}</h4>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  navigate(getEditorPath(item.contentId, item.contentType))
                                }
                                data-testid={`button-edit-${item.contentId}`}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {item.gaps.map((gap, idx) => (
                              <div
                                key={idx}
                                className="flex items-start justify-between gap-4 text-sm"
                              >
                                <div className="flex-1">
                                  <Badge variant="outline" className="mr-2">
                                    {gap.type}
                                  </Badge>
                                  <span className="text-muted-foreground">{gap.suggestion}</span>
                                </div>
                                {getPriorityBadge(gap.priority)}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No contents gaps detected</p>
                      <p className="text-sm mt-2 max-w-md mx-auto">
                        Gap analysis works best with published contents. As you publish more
                        articles, attractions, and hotels, the system will identify missing topics
                        and SEO opportunities.
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="internal-links">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{internalLinksData?.stats?.total ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Total Internal Links</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-red-600">
                    {internalLinksData?.stats?.broken ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Broken Links</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-amber-600">
                    {internalLinksData?.stats?.orphans ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Orphan Pages</p>
                </CardContent>
              </Card>
            </div>

            {(internalLinksData?.brokenLinks?.length ?? 0) > 0 && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Broken Links
                  </CardTitle>
                  <CardDescription>
                    Internal links pointing to content that no longer exists
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {internalLinksData?.brokenLinks?.map((link, idx) => (
                        <div
                          key={link.id}
                          className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted border-l-4 border-l-red-500"
                          data-testid={`broken-link-${idx}`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{link.source}</p>
                              <p className="text-xs text-muted-foreground">
                                Target: {link.target} — {link.reason}
                              </p>
                            </div>
                          </div>
                          <Badge variant="destructive">Broken</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Orphan Pages
                </CardTitle>
                <CardDescription>
                  Published content with no inbound internal links — consider adding links to
                  improve discoverability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {linksLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-14 w-full" />
                        ))}
                      </div>
                    ) : (internalLinksData?.orphanPages?.length ?? 0) === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No orphan pages found</p>
                        <p className="text-sm mt-1">All published content has inbound links</p>
                      </div>
                    ) : (
                      internalLinksData?.orphanPages?.map((page, idx) => (
                        <div
                          key={page.id}
                          className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted border-l-4 border-l-amber-500"
                          data-testid={`orphan-page-${idx}`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{page.title}</p>
                              <p className="text-xs text-muted-foreground">{page.slug}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline">{page.type}</Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(getEditorPath(page.id, page.type))}
                              data-testid={`button-edit-orphan-${idx}`}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="watchlist">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Price & Hours Watchlist
                </CardTitle>
                <CardDescription>
                  Content with volatile data that may need frequent updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {watchlistData?.items && watchlistData.items.length > 0 ? (
                    <div className="space-y-3">
                      {watchlistData.items.map(item => (
                        <div
                          key={item.contentId}
                          className="flex items-center justify-between gap-4 p-3 rounded-lg border"
                          data-testid={`watchlist-item-${item.contentId}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-sm text-muted-foreground">{item.reason}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getPriorityBadge(item.priority)}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(getEditorPath(item.contentId, item.contentType))
                              }
                              data-testid={`button-edit-watchlist-${item.contentId}`}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No items on watchlist</p>
                      <p className="text-sm mt-2 max-w-md mx-auto">
                        The watchlist tracks contents with prices, opening hours, or other data that
                        changes frequently. When you add attractions or hotels with pricing info,
                        they'll appear here for monitoring.
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Event Calendar Sync
                </CardTitle>
                <CardDescription>Track events and ensure contents stays up-to-date</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {eventsData?.events && eventsData.events.length > 0 ? (
                    <div className="space-y-3">
                      {eventsData.events.map(event => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between gap-4 p-3 rounded-lg border"
                          data-testid={`event-item-${event.id}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{event.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{event.status}</Badge>
                              {event.needsUpdate && (
                                <Badge variant="destructive">Needs Update</Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(getEditorPath(event.id, event.contentType))}
                            data-testid={`button-edit-event-${event.id}`}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No events tracked</p>
                      <p className="text-sm mt-2 max-w-md mx-auto">
                        Events are automatically detected from your contents. Articles about
                        festivals, exhibitions, or time-limited attractions will appear here so you
                        can update them when dates change.
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Next Best Article Recommendations
                </CardTitle>
                <CardDescription>
                  AI-powered suggestions for your next contents pieces
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">AI-Powered Content Suggestions</p>
                  <p className="text-sm mt-2 max-w-md mx-auto">
                    Based on your existing contents and topic clusters, this feature suggests what
                    articles to write next for maximum SEO impact. Recommendations improve as you
                    add more contents.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

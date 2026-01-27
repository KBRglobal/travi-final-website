import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Route,
  Users,
  Eye,
  MousePointer,
  Timer,
  ArrowRight,
  TrendingUp,
  Target,
  Lightbulb,
  Map,
} from "lucide-react";

interface JourneyStats {
  totalVisitors: number;
  avgPagesPerSession: number;
  avgSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
}

interface JourneyPath {
  path: string[];
  count: number;
  conversionRate: number;
}

interface ContentPerformance {
  contentId: string;
  title: string;
  type: string;
  views: number;
  avgTimeOnPage: number;
  exitRate: number;
  nextPages: Array<{ title: string; count: number }>;
}

export default function CustomerJourneyPage() {
  const { data: stats, isLoading } = useQuery<JourneyStats>({
    queryKey: ["/api/analytics/journey/stats"],
  });

  const { data: paths } = useQuery<JourneyPath[]>({
    queryKey: ["/api/analytics/journey/paths"],
  });

  const { data: contents } = useQuery<ContentPerformance[]>({
    queryKey: ["/api/analytics/journey/contents"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="heading-journey">
          <Route className="h-8 w-8 text-primary" />
          Customer Journey
        </h1>
        <p className="text-muted-foreground mt-1">Understand how visitors navigate your contents</p>
        <div className="mt-4 p-4 bg-muted rounded-lg border">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            How It Works
          </h3>
          <p className="text-sm text-muted-foreground">
            Track the <strong>path visitors take</strong> through your content. See which articles
            lead to bookings, identify drop-off points, and optimize your content funnel for maximum
            conversions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Visitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-visitors">
              {(stats?.totalVisitors || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Pages/Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pages-session">
              {(stats?.avgPagesPerSession || 0).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Session Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-duration">
              {Math.floor((stats?.avgSessionDuration || 0) / 60)}m{" "}
              {(stats?.avgSessionDuration || 0) % 60}s
            </div>
            <p className="text-xs text-muted-foreground">Average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MousePointer className="h-4 w-4" />
              Bounce Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600" data-testid="text-bounce-rate">
              {(stats?.bounceRate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Single-page visits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-conversion">
              {(stats?.conversionRate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Goal completion</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Top Conversion Paths
            </CardTitle>
            <CardDescription>Most successful visitor journeys</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              {paths?.length ? (
                <div className="space-y-4">
                  {paths.map((path, idx) => (
                    <div key={idx} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {path.path.map((step, stepIdx) => (
                          <div key={stepIdx} className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {step}
                            </Badge>
                            {stepIdx < path.path.length - 1 && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {path.count.toLocaleString()} visitors
                        </span>
                        <div className="flex items-center gap-2">
                          <Progress value={path.conversionRate} className="w-24 h-2" />
                          <span className="text-sm font-medium">
                            {path.conversionRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No journey data yet</p>
                  <p className="text-sm">Paths will appear as visitors navigate your contents</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Content Performance
            </CardTitle>
            <CardDescription>How individual pages contribute to the journey</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              {contents?.length ? (
                <div className="space-y-3">
                  {contents.map(item => (
                    <div
                      key={item.contentId}
                      className="p-3 border rounded-lg"
                      data-testid={`journey-contents-${item.contentId}`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium truncate flex-1">{item.title}</h4>
                        <Badge variant="secondary">{item.type}</Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Views:</span>
                          <span className="ml-1 font-medium">{item.views.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg time:</span>
                          <span className="ml-1 font-medium">
                            {Math.floor(item.avgTimeOnPage / 60)}m
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Exit:</span>
                          <span className="ml-1 font-medium">{item.exitRate.toFixed(0)}%</span>
                        </div>
                      </div>
                      {item.nextPages?.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Next:{" "}
                          {item.nextPages
                            .slice(0, 2)
                            .map(p => p.title)
                            .join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No contents performance data</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

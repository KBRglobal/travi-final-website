import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Redirect } from "wouter";
import {
  Eye,
  TrendingUp,
  Calendar,
  BarChart3,
  FileText,
  MapPin,
  Building2,
  Utensils,
  Bus,
  CalendarDays,
  Map,
  Compass,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Link } from "wouter";

interface AnalyticsOverview {
  totalViews: number;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
}

interface ViewsOverTime {
  date: string;
  views: number;
}

interface TopContent {
  id: string;
  title: string;
  type: string;
  viewCount: number;
}

interface ViewsByType {
  type: string;
  views: number;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const TYPE_ICONS: Record<string, typeof FileText> = {
  article: FileText,
  attraction: MapPin,
  hotel: Building2,
  dining: Utensils,
  transport: Bus,
  event: CalendarDays,
  district: Map,
  itinerary: Compass,
};

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface PermissionsResponse {
  role?: string;
  permissions?: {
    canViewAnalytics?: boolean;
    [key: string]: boolean | undefined;
  };
  // Support flat permissions for backward compatibility
  canViewAnalytics?: boolean;
  [key: string]: boolean | string | { [key: string]: boolean | undefined } | undefined;
}

// Helper to extract canViewAnalytics from response
function getCanViewAnalytics(response: PermissionsResponse | undefined): boolean {
  if (!response) return false;
  // Handle nested permissions object from API
  if (response.permissions?.canViewAnalytics !== undefined) {
    return response.permissions.canViewAnalytics === true;
  }
  // Handle flat permissions for backward compatibility
  return response.canViewAnalytics === true;
}

export default function Analytics() {
  const { data: permissionsResponse, isLoading: permissionsLoading } = useQuery<PermissionsResponse>({
    queryKey: ["/api/user/permissions"],
  });

  const canViewAnalytics = getCanViewAnalytics(permissionsResponse);

  const { data: overview, isLoading: overviewLoading } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/analytics/overview"],
    enabled: canViewAnalytics,
  });

  const { data: viewsOverTime, isLoading: viewsLoading } = useQuery<ViewsOverTime[]>({
    queryKey: ["/api/analytics/views-over-time?days=30"],
    enabled: canViewAnalytics,
  });

  const { data: topContent, isLoading: topLoading } = useQuery<TopContent[]>({
    queryKey: ["/api/analytics/top-contents?limit=10"],
    enabled: canViewAnalytics,
  });

  const { data: viewsByType, isLoading: typeLoading } = useQuery<ViewsByType[]>({
    queryKey: ["/api/analytics/by-contents-type"],
    enabled: canViewAnalytics,
  });

  // Redirect if user doesn't have permission
  if (!permissionsLoading && permissionsResponse && !canViewAnalytics) {
    return <Redirect to="/access-denied" />;
  }

  const chartData = viewsOverTime?.map((v) => ({
    date: formatDate(v.date),
    views: v.views,
  })) || [];

  const pieData = viewsByType?.filter(v => v.views > 0).map((v, i) => ({
    name: v.type.charAt(0).toUpperCase() + v.type.slice(1),
    value: v.views,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold" data-testid="text-analytics-title">Analytics</h1>
        <p className="text-muted-foreground">
          Track your contents performance and visitor engagement
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewLoading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-views">
                  {formatNumber(overview?.totalViews || 0)}
                </div>
                <p className="text-xs text-muted-foreground">All time page views</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-views-today">
                  {formatNumber(overview?.viewsToday || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Views today</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-views-week">
                  {formatNumber(overview?.viewsThisWeek || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-views-month">
                  {formatNumber(overview?.viewsThisMonth || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Views Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {viewsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No view data available yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Content</CardTitle>
          </CardHeader>
          <CardContent>
            {topLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : topContent && topContent.length > 0 ? (
              <div className="space-y-3">
                {topContent.map((contents, index) => {
                  const Icon = TYPE_ICONS[contents.type] || FileText;
                  return (
                    <Link
                      key={contents.id}
                      href={`/admin/${contents.type}s/${contents.id}`}
                      className="flex items-center gap-3 p-2 -mx-2 rounded-md hover-elevate"
                      data-testid={`link-top-contents-${contents.id}`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded bg-muted text-sm font-medium">
                        {index + 1}
                      </div>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{contents.title}</div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {contents.type}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium">
                        {formatNumber(contents.viewCount)}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No contents views yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Views by Content Type</CardTitle>
          </CardHeader>
          <CardContent>
            {typeLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : pieData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.fill }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {entry.name} ({formatNumber(entry.value)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No view data by type available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

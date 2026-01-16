import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Link2, MousePointer, TrendingUp, ExternalLink, Lightbulb, BarChart3 } from "lucide-react";

interface AffiliateStats {
  totalClicks: number;
  totalConversions: number;
  totalCommission: number;
  conversionRate: number;
  topProviders: Array<{
    provider: string;
    clicks: number;
    conversions: number;
    commission: number;
  }>;
}

export default function AffiliateDashboardPage() {
  const { data: stats, isLoading } = useQuery<AffiliateStats>({
    queryKey: ["/api/monetization/affiliates/stats"],
  });

  const { data: links } = useQuery<any[]>({
    queryKey: ["/api/affiliate-links"],
  });

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
        <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="heading-affiliates">
          <DollarSign className="h-8 w-8 text-primary" />
          Affiliate Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Track affiliate link performance and commissions
        </p>
        <div className="mt-4 p-4 bg-muted rounded-lg border">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            How It Works / איך זה עובד
          </h3>
          <p className="text-sm text-muted-foreground">
            Affiliate links are <strong>automatically inserted</strong> into your contents based on type 
            (hotels → Booking.com, attractions → GetYourGuide, dining → TripAdvisor).
            Track clicks, conversions, and earned commissions here.
            <br />
            <span className="text-xs opacity-70">
              (לינקים שותפים מוכנסים אוטומטית לתוכן לפי סוג. עקוב אחרי קליקים והמרות כאן.)
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MousePointer className="h-4 w-4" />
              Total Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-affiliate-clicks">
              {(stats?.totalClicks || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Affiliate link clicks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-conversions">
              {stats?.totalConversions || 0}
            </div>
            <p className="text-xs text-muted-foreground">Successful bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600" data-testid="text-commission">
              ${((stats?.totalCommission || 0) / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-affiliate-rate">
              {(stats?.conversionRate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Click to conversion</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Affiliate Providers
            </CardTitle>
            <CardDescription>
              Performance breakdown by provider
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topProviders?.length ? (
                stats.topProviders.map((provider) => (
                  <div key={provider.provider} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{provider.provider}</span>
                      <span className="text-sm text-muted-foreground">
                        ${(provider.commission / 100).toFixed(2)}
                      </span>
                    </div>
                    <Progress 
                      value={(provider.clicks / (stats.totalClicks || 1)) * 100} 
                      className="h-2" 
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{provider.clicks.toLocaleString()} clicks</span>
                      <span>{provider.conversions} conversions</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No affiliate data yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Active Affiliate Links
            </CardTitle>
            <CardDescription>
              Links currently embedded in your contents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {links?.length ? (
                <div className="space-y-3">
                  {links.slice(0, 10).map((link: any) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{link.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge variant={link.isActive ? "default" : "secondary"}>
                          {link.provider}
                        </Badge>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No affiliate links configured</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

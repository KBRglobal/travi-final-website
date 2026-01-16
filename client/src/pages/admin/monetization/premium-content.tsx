import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, DollarSign, Eye, Lock, TrendingUp, Users, Lightbulb } from "lucide-react";

interface PremiumStats {
  totalPremiumContent: number;
  totalPurchases: number;
  totalRevenue: number;
  conversionRate: number;
}

export default function PremiumContentPage() {
  const { data: stats, isLoading } = useQuery<PremiumStats>({
    queryKey: ["/api/monetization/premium/stats"],
  });

  const { data: premiumContent } = useQuery<any[]>({
    queryKey: ["/api/monetization/premium/contents"],
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
        <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="heading-premium-contents">
          <Crown className="h-8 w-8 text-primary" />
          Premium Content
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage paid contents, subscriptions, and access control
        </p>
        <div className="mt-4 p-4 bg-muted rounded-lg border">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            How It Works / איך זה עובד
          </h3>
          <p className="text-sm text-muted-foreground">
            Mark contents as <strong>premium</strong> to require payment before access. 
            Set a preview percentage to show readers a teaser, then prompt them to purchase.
            Supports one-time purchases and subscription tiers.
            <br />
            <span className="text-xs opacity-70">
              (סמן תוכן כפרימיום כדי לדרוש תשלום. הגדר אחוז תצוגה מקדימה כדי להציג טעימה לפני הרכישה.)
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Premium Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-premium-count">
              {stats?.totalPremiumContent || 0}
            </div>
            <p className="text-xs text-muted-foreground">Articles behind paywall</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-purchases-count">
              {stats?.totalPurchases || 0}
            </div>
            <p className="text-xs text-muted-foreground">All-time purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-revenue">
              ${((stats?.totalRevenue || 0) / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
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
            <div className="text-2xl font-bold" data-testid="text-conversion-rate">
              {(stats?.conversionRate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Preview to purchase</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Premium Content List</CardTitle>
          <CardDescription>
            Toggle premium status and configure pricing for your contents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {premiumContent?.length ? (
              <div className="space-y-4">
                {premiumContent.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`premium-item-${item.id}`}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Preview: {item.previewPercentage}% | Price: ${(item.price / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={item.isPremium ? "default" : "secondary"}>
                        {item.isPremium ? "Premium" : "Free"}
                      </Badge>
                      <Switch checked={item.isPremium} data-testid={`switch-premium-${item.id}`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No premium contents configured yet</p>
                <p className="text-sm">Mark articles as premium in the contents editor</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

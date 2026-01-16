import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Store, Building2, Eye, MousePointer, Users, Plus, Lightbulb } from "lucide-react";

interface ListingStats {
  totalListings: number;
  activeListings: number;
  totalImpressions: number;
  totalClicks: number;
}

export default function BusinessListingsPage() {
  const { data: stats, isLoading } = useQuery<ListingStats>({
    queryKey: ["/api/monetization/listings/stats"],
  });

  const { data: listings } = useQuery<any[]>({
    queryKey: ["/api/monetization/listings"],
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="heading-business-listings">
            <Store className="h-8 w-8 text-primary" />
            Business Listings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage paid business placements and featured listings
          </p>
        </div>
        <Button data-testid="button-add-listing">
          <Plus className="h-4 w-4 mr-2" />
          Add Listing
        </Button>
      </div>

      <div className="p-4 bg-muted rounded-lg border">
        <h3 className="font-medium flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          How It Works / איך זה עובד
        </h3>
        <p className="text-sm text-muted-foreground">
          Businesses pay for <strong>featured placement</strong> in your contents. 
          Track impressions, clicks, and leads generated. Offer tiers: Basic, Premium, Enterprise.
          <br />
          <span className="text-xs opacity-70">
            (עסקים משלמים על מיקום מודגש בתוכן שלך. עקוב אחרי חשיפות, קליקים ולידים שנוצרו.)
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-listings">
              {stats?.totalListings || 0}
            </div>
            <p className="text-xs text-muted-foreground">Registered businesses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Store className="h-4 w-4" />
              Active Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-active-listings">
              {stats?.activeListings || 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently paying</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Impressions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-impressions">
              {(stats?.totalImpressions || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MousePointer className="h-4 w-4" />
              Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-clicks">
              {(stats?.totalClicks || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total clicks</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Business Listings</CardTitle>
          <CardDescription>
            Businesses with active subscriptions and their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {listings?.length ? (
              <div className="space-y-4">
                {listings.map((listing: any) => (
                  <div
                    key={listing.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`listing-${listing.id}`}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{listing.businessName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {listing.businessType} | {listing.impressions.toLocaleString()} views | {listing.clicks} clicks
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={listing.tier === "enterprise" ? "default" : listing.tier === "premium" ? "secondary" : "outline"}>
                        {listing.tier}
                      </Badge>
                      <Badge variant={listing.status === "active" ? "default" : "secondary"}>
                        {listing.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No business listings yet</p>
                <p className="text-sm">Add businesses to feature in your contents</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

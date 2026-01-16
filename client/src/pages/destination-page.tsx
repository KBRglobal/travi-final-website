/**
 * Dynamic Destination Page
 * Factory pattern page using DestinationPageTemplate for all 16 destinations.
 * Single route handles: abu-dhabi, amsterdam, bangkok, barcelona, dubai, 
 * hong-kong, istanbul, las-vegas, london, los-angeles, miami, new-york, 
 * paris, rome, singapore, tokyo
 */

import { useEffect } from "react";
import { useParams } from "wouter";
import { DestinationPageTemplate } from "@/components/destination";
import { getDestinationBySlug, DESTINATION_SLUGS } from "@/data/destinations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MapPin, ArrowLeft } from "lucide-react";

export default function DestinationPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  
  // Scroll to top when navigating to a destination page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);
  
  // Get destination data from factory
  const destinationData = slug ? getDestinationBySlug(slug) : undefined;
  
  // 404 handling for invalid slugs
  if (!destinationData) {
    return (
      <main className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card/80 backdrop-blur-md border border-border/30 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Destination Not Found</h1>
            <p className="text-muted-foreground mb-6">
              We couldn't find the destination you're looking for. 
              Please check the URL or explore our other destinations.
            </p>
            <div className="space-y-3">
              <Link href="/destinations">
                <Button className="w-full">
                  <MapPin className="w-4 h-4 mr-2" />
                  Browse All Destinations
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
            
            {/* Show available destinations for debugging */}
            <div className="mt-8 pt-6 border-t">
              <p className="text-xs text-muted-foreground mb-3">
                Available destinations:
              </p>
              <div className="flex flex-wrap gap-1 justify-center">
                {DESTINATION_SLUGS.map((destSlug) => (
                  <Link key={destSlug} href={`/destinations/${destSlug}`}>
                    <span className="text-xs text-primary hover:underline">
                      {destSlug}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }
  
  return <DestinationPageTemplate data={destinationData} />;
}

/**
 * TopPOIs Component - Restaurants from TourPedia
 * Displays top restaurants for destinations with TourPedia data.
 * NOTE: Hotels section disabled - no hotel content in CMS yet
 */

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, MapPin, UtensilsCrossed } from "lucide-react";
// NOTE: Building2 icon removed - hotels section disabled, no hotel content in CMS yet
import { staggerContainer, staggerItem } from "@/lib/animations";

interface POI {
  id: number;
  name: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string;
}

interface POIResponse {
  success: boolean;
  data: POI[];
  _meta: {
    destination: string;
    countryCode: string;
    total: number;
    limit: number;
    offset: number;
    category: string;
  };
}

interface TopPOIsProps {
  destinationId: string;
  destinationName: string;
}

const DESTINATIONS_WITH_TOURPEDIA = ["barcelona", "amsterdam"];

export function TopPOIs({ destinationId, destinationName }: TopPOIsProps) {
  const hasTourPediaData = DESTINATIONS_WITH_TOURPEDIA.includes(destinationId.toLowerCase());

  // NOTE: Hotels query disabled - no hotel content in CMS yet
  // const { data: hotelsData, isLoading: hotelsLoading } = useQuery<POIResponse>({
  //   queryKey: ["/api/destinations", destinationId, "pois", "accommodation"],
  //   queryFn: async () => {
  //     const res = await fetch(`/api/destinations/${destinationId}/pois?category=accommodation&limit=6`);
  //     if (!res.ok) throw new Error("Failed to fetch hotels");
  //     return res.json();
  //   },
  //   enabled: hasTourPediaData,
  // });

  const { data: restaurantsData, isLoading: restaurantsLoading } = useQuery<POIResponse>({
    queryKey: ["/api/destinations", destinationId, "pois", "restaurant"],
    queryFn: async () => {
      const res = await fetch(`/api/destinations/${destinationId}/pois?category=restaurant&limit=6`);
      if (!res.ok) throw new Error("Failed to fetch restaurants");
      return res.json();
    },
    enabled: hasTourPediaData,
  });

  if (!hasTourPediaData) {
    return null;
  }

  const restaurants = restaurantsData?.data || [];
  const isLoading = restaurantsLoading;

  if (!isLoading && restaurants.length === 0) {
    return null;
  }

  return (
    <section 
      className="relative py-16 md:py-24 bg-transparent"
      data-testid="section-top-pois"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* NOTE: Hotels section disabled - no hotel content in CMS yet */}

        {(isLoading || restaurants.length > 0) && (
          <POISection
            title={`Where to Eat in ${destinationName}`}
            subtitle="Explore the best dining experiences"
            icon={<UtensilsCrossed className="w-4 h-4" />}
            pois={restaurants}
            isLoading={restaurantsLoading}
            viewAllLink={`/destinations/${destinationId}/dining`}
            viewAllText="View All Restaurants"
            testIdPrefix="restaurant"
          />
        )}
      </div>
    </section>
  );
}

interface POISectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  pois: POI[];
  isLoading: boolean;
  viewAllLink: string;
  viewAllText: string;
  testIdPrefix: string;
}

function POISection({
  title,
  subtitle,
  icon,
  pois,
  isLoading,
  viewAllLink,
  viewAllText,
  testIdPrefix,
}: POISectionProps) {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="text-center mb-10 md:mb-12"
      >
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-[0.15em] uppercase bg-primary/10 text-primary mb-4">
          {icon}
          {testIdPrefix === "hotel" ? "Accommodations" : "Dining"}
        </span>
        <h2 
          className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          {title}
        </h2>
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
          {subtitle}
        </p>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {pois.map((poi) => (
            <motion.div key={poi.id} variants={staggerItem}>
              <Card 
                className="h-full hover-elevate transition-all duration-300"
                data-testid={`${testIdPrefix}-poi-${poi.id}`}
              >
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2">
                    {poi.name}
                  </h3>
                  {poi.address && (
                    <div className="flex items-start gap-2 text-muted-foreground text-sm">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span className="line-clamp-2">{poi.address}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        viewport={{ once: true }}
        className="text-center mt-10 md:mt-12"
      >
        <Link href={viewAllLink}>
          <Button size="lg" className="group/btn" data-testid={`btn-view-all-${testIdPrefix}s`}>
            {viewAllText}
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}

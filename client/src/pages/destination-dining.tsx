import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Utensils,
  MapPin,
  ChevronRight,
  Loader2,
  ExternalLink,
  Filter,
  UtensilsCrossed,
  Star,
} from "lucide-react";

interface POI {
  id: number;
  name: string;
  category: string;
  latitude: string;
  longitude: string;
  address: string | null;
  city: string;
  rating: number | null;
  reviewCount: number | null;
  detailsUrl: string | null;
}

interface POIsResponse {
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

interface POIStatsResponse {
  success: boolean;
  data: {
    categories: Array<{ category: string; count: number }>;
    total: number;
  };
  _meta: {
    destination: string;
    countryCode: string;
  };
}

const DESTINATION_NAMES: Record<string, { name: string; country: string }> = {
  "barcelona": { name: "Barcelona", country: "Spain" },
  "amsterdam": { name: "Amsterdam", country: "Netherlands" },
  "berlin": { name: "Berlin", country: "Germany" },
  "rome": { name: "Rome", country: "Italy" },
  "paris": { name: "Paris", country: "France" },
  "london": { name: "London", country: "United Kingdom" },
  "dubai": { name: "Dubai", country: "United Arab Emirates" },
  "new-york": { name: "New York", country: "United States" },
  "tokyo": { name: "Tokyo", country: "Japan" },
  "singapore": { name: "Singapore", country: "Singapore" },
  "bangkok": { name: "Bangkok", country: "Thailand" },
  "hong-kong": { name: "Hong Kong", country: "China" },
  "istanbul": { name: "Istanbul", country: "Turkey" },
  "las-vegas": { name: "Las Vegas", country: "United States" },
  "los-angeles": { name: "Los Angeles", country: "United States" },
  "miami": { name: "Miami", country: "United States" },
  "abu-dhabi": { name: "Abu Dhabi", country: "United Arab Emirates" },
};

const DESTINATION_HERO_IMAGES: Record<string, string> = {
  "barcelona": "https://images.unsplash.com/photo-1504674900769-7c73f6f57eae?w=1600",
  "amsterdam": "https://images.unsplash.com/photo-1567182478838-f9157c1a9d5d?w=1600",
  "berlin": "https://images.unsplash.com/photo-1503899036078-e64fe4ce0b0d?w=1600",
  "rome": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1600",
  "paris": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1600",
  "london": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1600",
  "dubai": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1600",
  "new-york": "https://images.unsplash.com/photo-1504674900769-7c73f6f57eae?w=1600",
  "tokyo": "https://images.unsplash.com/photo-1567182478838-f9157c1a9d5d?w=1600",
  "singapore": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1600",
  "bangkok": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1600",
  "hong-kong": "https://images.unsplash.com/photo-1504674900769-7c73f6f57eae?w=1600",
  "istanbul": "https://images.unsplash.com/photo-1503899036078-e64fe4ce0b0d?w=1600",
  "las-vegas": "https://images.unsplash.com/photo-1545565572-cfd2b32f2b5e?w=1600",
  "los-angeles": "https://images.unsplash.com/photo-1504674900769-7c73f6f57eae?w=1600",
  "miami": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1600",
  "abu-dhabi": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1600",
};

function slugToCityName(slug: string): string {
  const destinationInfo = DESTINATION_NAMES[slug];
  if (destinationInfo) {
    return destinationInfo.name;
  }
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

export default function DestinationDiningPage() {
  const { slug } = useParams<{ slug: string }>();
  const [categoryFilter, setCategoryFilter] = useState<string>("restaurant");
  const [page, setPage] = useState(0);
  const limit = 20;

  const destinationInfo = slug ? DESTINATION_NAMES[slug] : null;
  const cityName = slug ? slugToCityName(slug) : "";
  const heroImage = slug ? DESTINATION_HERO_IMAGES[slug] : "https://images.unsplash.com/photo-1504674900769-7c73f6f57eae?w=1600";

  const { data: statsData, isLoading: statsLoading } = useQuery<POIStatsResponse>({
    queryKey: ["/api/destinations", slug, "poi-stats"],
    queryFn: async () => {
      const response = await fetch(`/api/destinations/${slug}/poi-stats`);
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: !!slug,
  });

  const { data: poisData, isLoading: poisLoading } = useQuery<POIsResponse>({
    queryKey: ["/api/destinations", slug, "pois", { category: categoryFilter, limit, offset: page * limit }],
    queryFn: async () => {
      const params = new URLSearchParams({
        category: categoryFilter,
        limit: String(limit),
        offset: String(page * limit),
      });
      const response = await fetch(`/api/destinations/${slug}/pois?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch restaurants");
      return response.json();
    },
    enabled: !!slug,
  });

  const totalItems = poisData?._meta?.total || 0;
  const totalPages = Math.ceil(totalItems / limit);
  const restaurantCount = statsData?.data?.categories?.find(c => c.category === "restaurant")?.count || 0;

  if (!slug) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNav />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-3xl font-bold mb-4">Destination Not Found</h1>
          <p className="text-muted-foreground mb-8">Please select a valid destination.</p>
          <Button asChild>
            <Link href="/destinations">Browse Destinations</Link>
          </Button>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Where to Eat in {cityName} - Restaurants & Dining | TRAVI</title>
        <meta name="description" content={`Discover ${restaurantCount}+ restaurants and dining options in ${cityName}. Find the best places to eat for your trip.`} />
        <link rel="canonical" href={`https://travi.world/destinations/${slug}/dining`} />
      </Helmet>

      <PublicNav />

      <section 
        className="relative w-full min-h-[50vh] md:min-h-[55vh]"
        data-testid="section-dining-hero"
      >
        <div className="absolute inset-0">
          <img 
            src={heroImage}
            alt={`${cityName} restaurants`}
            className="w-full h-full object-cover"
            loading="eager"
            {...{ fetchpriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
        </div>
        
        <div className="relative container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12 flex flex-col justify-end min-h-[50vh] md:min-h-[55vh]">
          <nav 
            className="flex items-center gap-2 text-white/70 text-sm mb-6"
            data-testid="breadcrumbs"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/destinations" className="hover:text-white transition-colors">Destinations</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href={`/destinations/${slug}`} className="hover:text-white transition-colors">{cityName}</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium">Dining</span>
          </nav>
          
          <h1 
            className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
            style={{ fontFamily: 'Chillax, sans-serif' }}
            data-testid="heading-dining"
          >
            Where to Eat in {cityName}
          </h1>
          
          <p className="text-lg md:text-xl text-white/90 max-w-3xl mb-6">
            {statsLoading ? "Loading..." : `${restaurantCount} restaurants and dining options in ${cityName}`}
          </p>

          <div className="flex flex-wrap gap-3">
            <Badge className="bg-white/20 backdrop-blur-md text-white border-0 px-4 py-2">
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              {restaurantCount} Restaurants
            </Badge>
            {destinationInfo && (
              <Badge className="bg-white/20 backdrop-blur-md text-white border-0 px-4 py-2">
                <MapPin className="w-4 h-4 mr-2" />
                {destinationInfo.country}
              </Badge>
            )}
          </div>
        </div>
      </section>

      <section className="py-8 md:py-10 bg-muted/30" data-testid="section-stats">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#6443F4]/10 flex items-center justify-center">
                    <Utensils className="w-6 h-6 text-[#6443F4]" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Restaurants</p>
                    <p className="text-2xl font-bold" data-testid="text-restaurant-count">
                      {restaurantCount.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {statsData?.data?.categories?.filter(c => c.category !== "restaurant").slice(0, 3).map((cat) => (
                <Card key={cat.category}>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground capitalize">{cat.category}</p>
                      <p className="text-2xl font-bold">{cat.count.toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-8 md:py-12 bg-background" data-testid="section-filters">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h2 
                className="text-2xl md:text-3xl font-bold text-foreground"
                style={{ fontFamily: 'Chillax, sans-serif' }}
              >
                Browse Restaurants
              </h2>
              <p className="text-muted-foreground mt-1">
                {totalItems > 0 
                  ? `Showing ${page * limit + 1}-${Math.min((page + 1) * limit, totalItems)} of ${totalItems} results`
                  : "No results found"}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filter:</span>
              </div>
              <Select 
                value={categoryFilter} 
                onValueChange={(value) => {
                  setCategoryFilter(value);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-48" data-testid="select-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All POIs</SelectItem>
                  <SelectItem value="restaurant">Restaurants Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {poisLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#6443F4]" data-testid="loader-dining" />
            </div>
          ) : poisData?.data && poisData.data.length > 0 ? (
            <>
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {poisData.data.map((poi) => (
                  <motion.div key={poi.id} variants={fadeInUp}>
                    <Card 
                      className="group overflow-hidden hover:shadow-lg transition-all duration-300"
                      data-testid={`card-restaurant-${poi.id}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-foreground line-clamp-2 group-hover:text-[#6443F4] transition-colors">
                              {poi.name}
                            </h3>
                            {poi.address && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2 flex items-start gap-1">
                                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{poi.address}</span>
                              </p>
                            )}
                          </div>
                          <div className="w-10 h-10 rounded-full bg-[#6443F4]/10 flex items-center justify-center shrink-0">
                            <Utensils className="w-5 h-5 text-[#6443F4]" />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                          {poi.rating && (
                            <Badge 
                              className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                            >
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              {poi.rating}/10
                              {poi.reviewCount && (
                                <span className="ml-1 opacity-75">({poi.reviewCount})</span>
                              )}
                            </Badge>
                          )}
                          <Badge 
                            className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                          >
                            <Utensils className="w-3 h-3 mr-1" />
                            <span className="capitalize">{poi.category}</span>
                          </Badge>
                          <Badge variant="secondary">
                            <MapPin className="w-3 h-3 mr-1" />
                            {poi.city}
                          </Badge>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            asChild
                          >
                            <a
                              href={`https://www.google.com/maps?q=${poi.latitude},${poi.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid={`link-map-${poi.id}`}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View on Map
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-8" data-testid="pagination">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    data-testid="button-prev-page"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16" data-testid="empty-state">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <UtensilsCrossed className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 
                className="text-2xl font-bold text-foreground mb-2"
                style={{ fontFamily: 'Chillax, sans-serif' }}
              >
                No Restaurants Found
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We don't have restaurant data for {cityName} yet. Try selecting a different category or check back soon.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCategoryFilter("all")}
                  data-testid="button-show-all"
                >
                  Show All POIs
                </Button>
                <Button asChild className="bg-[#6443F4] hover:bg-[#5339D9]">
                  <Link href="/destinations">Browse Destinations</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-12 md:py-16 bg-muted/30" data-testid="section-explore-more">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 
              className="text-2xl md:text-3xl font-bold text-foreground mb-2"
              style={{ fontFamily: 'Chillax, sans-serif' }}
            >
              Explore More in {cityName}
            </h2>
            <p className="text-muted-foreground">
              Discover hotels, attractions, and more
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/destinations/${slug}/hotels`}>
                <Star className="w-4 h-4 mr-2" />
                View Hotels
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/destinations/${slug}`}>
                <MapPin className="w-4 h-4 mr-2" />
                Destination Guide
              </Link>
            </Button>
            <Button asChild className="bg-[#6443F4] hover:bg-[#5339D9] rounded-xl">
              <Link href="/dining">
                <Utensils className="w-4 h-4 mr-2" />
                Browse All Restaurants
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

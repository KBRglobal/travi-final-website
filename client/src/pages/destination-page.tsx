/**
 * Dynamic Destination Page
 * Fetches destination data from API and merges with placeholder content.
 * DATABASE is single source of truth for: hero, mood, SEO, featured sections
 * Static fallbacks only for placeholder content (FAQs, experiences, etc.)
 */

import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DestinationPageTemplate } from "@/components/destination";
import { getDestinationBySlug } from "@/data/destinations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MapPin, ArrowLeft, Loader2 } from "lucide-react";
import type { DestinationPageData } from "@/types/destination";

interface APIDestinationData {
  id: string;
  name: string;
  country: string;
  slug: string;
  summary: string | null;
  cardImage: string | null;
  cardImageAlt: string | null;
  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    images: Array<{ filename: string; url: string; alt: string; order: number }>;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    canonicalUrl: string;
    ogImage: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
  };
  featuredAttractions: any[];
  featuredAreas: any[];
  featuredHighlights: any[];
  mood: {
    primaryColor: string;
    gradientFrom: string;
    gradientTo: string;
    vibe: string;
    tagline: string;
  };
}

export default function DestinationPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  
  // Scroll to top when navigating to a destination page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);
  
  // Fetch destination data from API (DATABASE as single source of truth)
  const { data: apiData, isLoading, error } = useQuery<APIDestinationData>({
    queryKey: ['/api/public/destinations', slug],
    enabled: !!slug,
  });
  
  // Get static placeholder data for FAQs, experiences, etc.
  const staticData = slug ? getDestinationBySlug(slug) : undefined;
  
  // Show loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading destination...</p>
        </div>
      </main>
    );
  }
  
  // 404 handling - API is single source of truth
  if (!apiData) {
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
                <Button className="w-full" data-testid="button-browse-destinations">
                  <MapPin className="w-4 h-4 mr-2" />
                  Browse All Destinations
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full" data-testid="button-back-home">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }
  
  // Merge API data (database) with static placeholder data
  // DATABASE is source of truth for: hero, mood, SEO, featured sections
  // Static data provides: FAQs, experiences, neighborhoods, transport, etc.
  // CRITICAL: No static fallbacks for database-managed fields - API must provide complete data
  const mergedData: DestinationPageData = {
    // Core identity from API/database
    id: apiData?.id || slug || '',
    name: apiData?.name || '',
    country: apiData?.country || '',
    
    // Mood/theme from DATABASE ONLY (API provides defaults for null fields)
    mood: {
      primaryColor: apiData?.mood?.primaryColor || "#1E40AF",
      gradientFrom: apiData?.mood?.gradientFrom || "rgba(0,0,0,0.6)",
      gradientTo: apiData?.mood?.gradientTo || "rgba(0,0,0,0.3)",
      vibe: (apiData?.mood?.vibe || "cultural") as any,
      tagline: apiData?.mood?.tagline || "",
    },
    
    // Hero data from DATABASE ONLY (API provides defaults for null fields)
    hero: {
      title: apiData?.hero?.title || "",
      subtitle: apiData?.hero?.subtitle || "",
      ctaText: apiData?.hero?.ctaText || "Start Exploring",
      ctaLink: apiData?.hero?.ctaLink || `/destinations/${slug}/attractions`,
      imageUrl: apiData?.hero?.images?.[0]?.url || "",
      imageAlt: apiData?.hero?.images?.[0]?.alt || "",
      images: apiData?.hero?.images || [],
    },
    
    // SEO from DATABASE ONLY (API provides defaults for null fields)
    seo: {
      metaTitle: apiData?.seo?.metaTitle || "",
      metaDescription: apiData?.seo?.metaDescription || "",
      canonicalUrl: apiData?.seo?.canonicalUrl || `https://travi.world/destinations/${slug}`,
      ogImage: apiData?.seo?.ogImage || null,
      lastUpdated: new Date().toISOString(),
    },
    
    // Featured sections from DATABASE
    featuredAttractions: apiData?.featuredAttractions || [],
    featuredAreas: apiData?.featuredAreas || [],
    featuredHighlights: apiData?.featuredHighlights || [],
    
    // Placeholder content from static file (to be migrated later)
    quickFacts: staticData?.quickFacts || [],
    experiences: staticData?.experiences || [],
    neighborhoods: staticData?.neighborhoods || [],
    seasons: staticData?.seasons || [],
    transport: staticData?.transport || [],
    faqs: staticData?.faqs || [],
    cta: staticData?.cta || {
      headline: `Start planning your trip to ${apiData?.name || ''}`,
      subheadline: 'Discover amazing experiences and create unforgettable memories.',
      buttonText: 'Plan Your Trip',
      buttonLink: `/destinations/${slug}/attractions`,
    },
  };
  
  return <DestinationPageTemplate data={mergedData} />;
}

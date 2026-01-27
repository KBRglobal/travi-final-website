/**
 * DestinationPageTemplate Component - PREMIUM LANDING PAGE
 * Main template combining all destination sections.
 * REDESIGNED: Visual storytelling first, editorial magazine style.
 * Each destination page = standalone premium landing experience.
 */

import { Helmet } from "react-helmet-async";
import { SEOHead } from "@/components/seo-head";
import { PublicFooter } from "@/components/public-footer";
import { SkipLink } from "@/components/ui/skip-link";
import { DestinationHero } from "./DestinationHero";
import { DestinationNav } from "./DestinationNav";
import { EditorialAttractions } from "./EditorialAttractions";
import { FeaturedAttractions } from "./FeaturedSections";
import { TopPOIs } from "./top-pois";
import { EditorialNews } from "./EditorialNews";
import { UpcomingEvents } from "./upcoming-events";
import { UpcomingHolidays } from "./upcoming-holidays";
import { SafetyBanner } from "./safety-banner";
import { QuickInfoRail } from "./quick-info-rail";
import { BestTimeToVisit } from "./BestTimeToVisit";
import { GettingAround } from "./GettingAround";
import { DestinationFAQ } from "./DestinationFAQ";
import { DestinationCTA } from "./DestinationCTA";
import { CategoryBentoGrid } from "@/components/category-bento-grid";
import { usePublicDestination } from "@/hooks/use-public-destination";
import { useQuery } from "@tanstack/react-query";
import type { DestinationPageData, SeasonInfo } from "@/types/destination";

interface DestinationPageTemplateProps {
  data: DestinationPageData;
}

interface SeasonsApiResponse {
  destinationId: string;
  seasons: Array<{
    name: string;
    months: string;
    weatherDescription: string;
    crowdLevel: "Low" | "Medium" | "High";
    recommendation: string;
    avgTemp: number;
    avgPrecip: number;
    avgSunshineHours: number;
  }>;
  generatedBy: string;
  updatedAt: string;
}

export function DestinationPageTemplate({ data }: DestinationPageTemplateProps) {
  const currentYear = new Date().getFullYear();

  // Fetch featured attractions from API (CMS data from database)
  const { data: apiData } = usePublicDestination(data.id);
  const featuredAttractions = apiData?.featuredAttractions || [];
  const hasCMSAttractions = featuredAttractions.some(a => a.isActive && a.image);

  // Fetch real climate data from Open-Meteo (stored in database)
  const { data: seasonsData } = useQuery<SeasonsApiResponse>({
    queryKey: [`/api/public/destinations/${data.id}/seasons`],
    staleTime: 1000 * 60 * 60 * 24,
  });

  // Transform API seasons data to SeasonInfo format
  const apiSeasons: SeasonInfo[] | null =
    seasonsData?.seasons?.map(s => ({
      name: s.name,
      months: s.months,
      weather: s.weatherDescription,
      crowds: s.crowdLevel,
      recommendation: s.recommendation,
      imageUrl: "",
      colorAccent: "",
    })) || null;

  return (
    <>
      <SkipLink />

      {/* SEO Meta Tags */}
      <SEOHead
        title={data.seo.metaTitle}
        description={data.seo.metaDescription}
        canonicalPath={data.seo.canonicalUrl}
        ogImage={data.seo.ogImage || undefined}
      />

      <Helmet>
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={data.seo.canonicalUrl} />
        <meta property="og:title" content={data.seo.metaTitle} />
        <meta property="og:description" content={data.seo.metaDescription} />
        {data.seo.ogImage && <meta property="og:image" content={data.seo.ogImage} />}
        <meta property="og:url" content={data.seo.canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* TravelDestination Schema.org structured data - Enhanced with City */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["TouristDestination", "City"],
            "@id": `${data.seo.canonicalUrl}#destination`,
            name: data.name,
            description: data.seo.metaDescription,
            url: data.seo.canonicalUrl,
            image: data.seo.ogImage || undefined,
            containedInPlace: {
              "@type": "Country",
              name: data.country,
            },
            touristType: [
              "Adventure travelers",
              "Leisure travelers",
              "Business travelers",
              "Family travelers",
              "Solo travelers",
            ],
            isAccessibleForFree: true,
            publicAccess: true,
          })}
        </script>

        {/* Place Schema for geographic entity */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Place",
            "@id": `${data.seo.canonicalUrl}#place`,
            name: data.name,
            description: `Travel guide and information about ${data.name}, ${data.country}`,
            url: data.seo.canonicalUrl,
            address: {
              "@type": "PostalAddress",
              addressLocality: data.name,
              addressCountry: data.country,
            },
          })}
        </script>

        {/* BreadcrumbList Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://travi.world",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Destinations",
                item: "https://travi.world/destinations",
              },
              {
                "@type": "ListItem",
                position: 3,
                name: data.name,
                item: data.seo.canonicalUrl,
              },
            ],
          })}
        </script>
      </Helmet>

      {/* 
        PREMIUM LANDING PAGE STRUCTURE:
        1. Cinematic Hero - Full-bleed immersive with transparent overlay
        2. Visual Highlights - Immediate wow moment, 3 large blocks
        3. Editorial Attractions - Magazine-style, images lead
        4. Editorial News - Media site style with featured headlines
        5. Best Time to Visit - When to go
        6. Getting Around - Transportation info
        7. FAQ - Common questions
        8. CTA - Call to action
      */}
      {/* Sticky Navigation with Back Button */}
      <DestinationNav destinationName={data.name} destinationSlug={data.id} />

      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen bg-transparent"
        data-testid={`destination-page-${data.id}`}
      >
        {/* 1. HERO SECTION - Cinematic immersive experience */}
        <DestinationHero {...data.hero} destinationName={data.name} mood={data.mood} />

        {/* SAFETY BANNER - Health alerts and travel advisories */}
        <SafetyBanner destinationCode={data.id} destinationName={data.name} />

        {/* 2. CATEGORY BENTO GRID - Explore section with new category images */}
        <CategoryBentoGrid destinationSlug={data.id} destinationName={data.name} />

        {/* 3. ATTRACTIONS - Uses CMS data if available, else fallback to static */}
        <div id="attractions" className="scroll-mt-24">
          {hasCMSAttractions ? (
            <FeaturedAttractions
              attractions={featuredAttractions}
              destinationName={data.name}
              destinationId={data.id}
            />
          ) : (
            <EditorialAttractions
              experiences={data.experiences}
              destinationName={data.name}
              destinationSlug={data.id}
            />
          )}
        </div>

        {/* 4b. TOP POIs - Restaurants from TourPedia (barcelona, amsterdam) */}
        {/* NOTE: Hotels section disabled - no hotel content in CMS yet */}
        <div id="restaurants" className="scroll-mt-24">
          <TopPOIs destinationId={data.id} destinationName={data.name} />
        </div>

        {/* 5. EDITORIAL NEWS - Magazine/media style headlines */}
        <div id="news" className="scroll-mt-24">
          <EditorialNews destinationName={data.name} destinationSlug={data.id} />
        </div>

        {/* 6. UPCOMING EVENTS - Travel intelligence events from database */}
        <div id="events" className="scroll-mt-24">
          <UpcomingEvents
            destinationId={data.id}
            destinationName={data.name}
            limit={4}
            showViewAll={true}
          />
        </div>

        {/* 7. UPCOMING HOLIDAYS - Public holidays for destination country */}
        <div id="holidays" className="scroll-mt-24">
          <UpcomingHolidays destinationId={data.id} destinationName={data.name} limit={4} />
        </div>

        {/* TRAVEL ESSENTIALS - Visa requirements and entry info */}
        <div id="travel-essentials" className="scroll-mt-24">
          <section className="py-16 bg-card/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-foreground mb-8">
                Travel Essentials for {data.name}
              </h2>
              <QuickInfoRail destinationCode={data.id} destinationName={data.name} />
            </div>
          </section>
        </div>

        {/* 7. Best Time to Visit Section - Only renders when real climate data exists */}
        {apiSeasons && apiSeasons.length > 0 && (
          <div id="best-time" className="scroll-mt-24">
            <BestTimeToVisit seasons={apiSeasons} destinationName={data.name} />
          </div>
        )}

        {/* 8. Getting Around Section */}
        <div id="getting-around" className="scroll-mt-24">
          <GettingAround destinationSlug={data.id} destinationName={data.name} />
        </div>

        {/* 9. FAQ Section */}
        <div id="faq" className="scroll-mt-24">
          <DestinationFAQ faqs={data.faqs} destinationName={data.name} />
        </div>

        {/* 10. Bottom CTA Section */}
        <DestinationCTA cta={data.cta} destinationName={data.name} />

        {/* Last Updated Footer */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Last updated:{" "}
            {new Date(data.seo.lastUpdated).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            | {data.name} Travel Guide {currentYear}
          </p>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}

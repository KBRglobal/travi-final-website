import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, ArrowRight, Globe, MapPinned } from "lucide-react";
import { SEOHead } from "@/components/seo-head";
import { Helmet } from "react-helmet-async";
import { PublicFooter } from "@/components/public-footer";
import { SkipLink } from "@/components/ui/skip-link";
import {
  SplitHero,
  CategoriesSection,
  FAQSection,
  LoadingScreen,
  TraviMascotHelper,
  HomepageHeader,
  AnimatedSection,
  NewsletterSection,
  EditorialHero,
  EditorialSecondary,
  EditorialNewsGrid,
  TrendingSection,
} from "@/components/homepage";
import {
  SITE_URL,
  SITE_NAME,
  CURRENT_YEAR,
  FALLBACK_DESTINATIONS,
  FALLBACK_EXPERIENCE_CATEGORIES,
  FALLBACK_REGION_LINKS,
  getIconComponent,
  heroAnimationStyles,
  type HomepageConfig,
  type ExperienceCategory,
  type RegionLink,
  type FeaturedDestination,
} from "@/components/homepage/homepage-data";
import { useQuery } from "@tanstack/react-query";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function Homepage() {
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();
  const { t } = useTranslation();
  const { locale, isRTL, localePath } = useLocale();

  const { data: config, isLoading } = useQuery<HomepageConfig>({
    queryKey: ["/api/public/homepage-config"],
  });

  const { data: siteStats } = useQuery<{
    destinations: number;
    attractions: number;
    publishedContent: number;
  }>({
    queryKey: ["/api/public/stats"],
  });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (location.startsWith("/sv/") || location.startsWith("/bn/")) {
      const cleanPath = location.replace(/^\/(sv|bn)/, "") || "/";
      window.location.replace(cleanPath);
    }
  }, [location]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  const sections = config?.sections || {};
  const cta = config?.cta;
  const seoMeta = config?.seoMeta;

  const featuredDestinations = config?.featuredDestinations?.length
    ? config.featuredDestinations
    : FALLBACK_DESTINATIONS;
  const experienceCategories = config?.experienceCategories?.length
    ? config.experienceCategories
    : FALLBACK_EXPERIENCE_CATEGORIES;
  const regionLinks = config?.regionLinks?.length ? config.regionLinks : FALLBACK_REGION_LINKS;

  const experienceSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Travel Styles",
    description: "Explore destinations by travel experience type",
    numberOfItems: experienceCategories.length,
    itemListElement: experienceCategories.map((cat: ExperienceCategory, i: number) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "TouristTrip",
        name: cat.name,
        description: cat.description,
        url: `${SITE_URL}${cat.href}`,
        image: cat.image ? `${SITE_URL}${cat.image}` : undefined,
      },
    })),
  });

  const pageTitle =
    seoMeta?.metaTitle ||
    `${SITE_NAME} - Travel Guides for 17 Destinations | Hotels, Attractions & Things to Do ${CURRENT_YEAR}`;
  const pageDescription =
    seoMeta?.metaDescription ||
    `Your complete travel guide for 17 destinations worldwide. Expert reviews of 3,000+ hotels, attractions, restaurants, and activities. Plan your trip with ${SITE_NAME} - updated daily.`;

  return (
    <>
      <SkipLink />
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        canonicalPath="/"
        ogImage={`${SITE_URL}/ogImage.jpg`}
      />

      <Helmet>
        <meta name="twitter:site" content="@travi_world" />
      </Helmet>

      <SubtleSkyBackground />

      <div className="min-h-screen relative">
        <HomepageHeader isScrolled={isScrolled} />

        <div>
          {/* HERO */}
          <SplitHero
            currentIndex={currentHeroIndex}
            onIndexChange={setCurrentHeroIndex}
            siteStats={siteStats}
          />

          {/* EDITORIAL HERO */}
          <EditorialHero />

          {/* EDITORIAL SECONDARY */}
          <EditorialSecondary />

          {/* TRENDING */}
          <TrendingSection />

          {/* CATEGORIES */}
          <CategoriesSection />

          {/* POPULAR DESTINATIONS */}
          <AnimatedSection
            className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950"
            ariaLabel="Popular travel destinations"
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 sm:mb-14 gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-3 font-chillax">
                    {sections["destinations"]?.title ||
                      t("home.destinationsSection.title", "Explore Popular Destinations")}
                  </h2>
                  <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
                    {sections["destinations"]?.subtitle ||
                      t(
                        "home.destinationsSection.subtitle",
                        "Discover travel guides for destinations around the world"
                      )}
                  </p>
                </div>
                <Link
                  href={localePath("/destinations")}
                  className="hidden sm:inline-flex items-center gap-2 text-[#6443F4] font-semibold hover:gap-3 transition-all"
                  title="View all travel destinations"
                >
                  {t("home.destinationsSection.viewAll", "View All")}{" "}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {featuredDestinations
                  .slice(0, 8)
                  .map((dest: FeaturedDestination, index: number) => (
                    <article
                      key={dest.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <Link
                        href={dest.slug || `/destinations/${dest.id}`}
                        title={`${dest.name} Travel Guide - Hotels, Attractions & Things to Do`}
                      >
                        <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white dark:bg-slate-900 h-full">
                          <div className="relative h-48 sm:h-56 overflow-hidden bg-slate-100 dark:bg-slate-800">
                            {dest.cardImage ? (
                              <img
                                src={dest.cardImage}
                                alt={
                                  dest.cardImageAlt ||
                                  `${dest.name} travel guide - top attractions and hotels`
                                }
                                title={`${dest.name}, ${dest.country} - Travel Guide`}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                loading="lazy"
                                width={400}
                                height={300}
                                decoding="async"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <MapPinned
                                  className="w-12 h-12 text-slate-300"
                                  aria-hidden="true"
                                />
                              </div>
                            )}
                            <div
                              className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                              aria-hidden="true"
                            />
                            <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                              <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-slate-900 text-xs font-medium px-3 py-1.5 rounded-full">
                                <MapPin className="w-3 h-3" aria-hidden="true" />{" "}
                                {t("home.destinationsSection.exploreGuide", "Explore Guide")}
                              </span>
                            </div>
                          </div>
                          <CardContent className="p-4 sm:p-5">
                            <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg mb-1">
                              {dest.name}
                            </h3>
                            <p className="text-sm text-slate-500">{dest.country}</p>
                          </CardContent>
                        </Card>
                      </Link>
                    </article>
                  ))}
              </div>

              <div className="text-center mt-8 sm:hidden">
                <Button
                  className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white gap-2"
                  asChild
                >
                  <Link href={localePath("/destinations")} title="Browse all travel destinations">
                    {t("home.destinationsSection.viewAllDestinations", "View All Destinations")}{" "}
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </AnimatedSection>

          {/* EDITORIAL NEWS GRID */}
          <EditorialNewsGrid />

          {/* EXPERIENCE CATEGORIES */}
          <AnimatedSection
            className="py-16 md:py-24 px-4 sm:px-6 lg:px-8"
            ariaLabel="Travel style categories"
          >
            <Helmet>
              <script type="application/ld+json">{experienceSchema}</script>
            </Helmet>

            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-10 sm:mb-14">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4 font-chillax">
                  {sections["experience_categories"]?.title ||
                    t("home.experiencesSection.title", "Find Your Perfect Travel Style")}
                </h2>
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  {sections["experience_categories"]?.subtitle ||
                    t(
                      "home.experiencesSection.subtitle",
                      "Explore destinations by travel experience"
                    )}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {experienceCategories.map((category: ExperienceCategory, index: number) => {
                  const IconComponent = getIconComponent(category.icon || null);
                  return (
                    <article
                      key={category.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <Link
                        href={category.href || `/${category.slug}`}
                        title={`${category.name} - Complete Travel Guide ${CURRENT_YEAR}`}
                      >
                        <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 bg-white dark:bg-slate-900 h-full">
                          <div className="relative h-40 sm:h-48 overflow-hidden">
                            {category.image ? (
                              <img
                                src={category.image}
                                alt={
                                  category.imageAlt ||
                                  `${category.name} travel experiences and destinations`
                                }
                                title={category.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                loading="lazy"
                                width={400}
                                height={250}
                                decoding="async"
                              />
                            ) : (
                              <div className="h-full bg-[#6443F4] flex items-center justify-center">
                                <IconComponent
                                  className="w-16 h-16 text-white/90 group-hover:scale-110 transition-transform"
                                  aria-hidden="true"
                                />
                              </div>
                            )}
                            <div
                              className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"
                              aria-hidden="true"
                            />
                            <div className="absolute bottom-4 left-4 right-4">
                              <h3 className="text-lg sm:text-xl font-bold text-white mb-1 font-chillax">
                                {category.name}
                              </h3>
                              <p className="text-sm text-white/80 line-clamp-2">
                                {category.description}
                              </p>
                            </div>
                          </div>
                          <CardContent className="p-4 flex items-center justify-between">
                            <span className="text-sm font-medium text-[#6443F4]">
                              {t("home.experiencesSection.exploreGuides", "Explore guides")}
                            </span>
                            <ArrowRight
                              className="w-4 h-4 text-[#6443F4] group-hover:translate-x-1 transition-transform"
                              aria-hidden="true"
                            />
                          </CardContent>
                        </Card>
                      </Link>
                    </article>
                  );
                })}
              </div>
            </div>
          </AnimatedSection>

          {/* FAQ SECTION */}
          <FAQSection />

          {/* NEWSLETTER */}
          <NewsletterSection
            config={
              cta
                ? {
                    eyebrow: cta.eyebrow || undefined,
                    headline: cta.headline,
                    subheadline: cta.subheadline || undefined,
                    placeholder: cta.inputPlaceholder || undefined,
                    buttonText: cta.buttonText || undefined,
                    backgroundImage: cta.backgroundImage || undefined,
                  }
                : undefined
            }
          />

          {/* REGIONS */}
          <AnimatedSection
            className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900"
            ariaLabel="Browse destinations by region"
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-10 sm:mb-14">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4 font-chillax">
                  {sections["region_links"]?.title ||
                    t("home.regionsSection.title", "Explore by Region")}
                </h2>
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
                  {sections["region_links"]?.subtitle ||
                    t("home.regionsSection.subtitle", "Browse destinations by geographic region")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {regionLinks.map((region: RegionLink, index: number) => (
                  <div
                    key={region.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm p-6 h-full">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 font-chillax">
                        <Globe className="w-5 h-5 text-[#6443F4]" aria-hidden="true" />
                        {region.name}
                      </h3>
                      <ul className="space-y-1">
                        {region.destinations.map(
                          (dest: { name: string; slug: string }, i: number) => (
                            <li key={i}>
                              <Link
                                href={dest.slug.startsWith("/") ? dest.slug : `/${dest.slug}`}
                                className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:text-[#6443F4] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
                                title={`${dest.name} Travel Guide`}
                              >
                                <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                                {dest.name}
                              </Link>
                            </li>
                          )
                        )}
                      </ul>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* MASCOT */}
          <TraviMascotHelper />
        </div>

        <PublicFooter />
      </div>
    </>
  );
}

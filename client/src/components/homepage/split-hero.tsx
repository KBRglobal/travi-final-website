import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight, Star, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import {
  heroAnimationStyles,
  HERO_DESTINATIONS,
  ALL_DESTINATIONS_SEO,
  SITE_URL,
  SITE_NAME,
  CURRENT_YEAR,
} from "./homepage-data";

export function SplitHero({
  currentIndex,
  onIndexChange,
  siteStats,
}: {
  currentIndex: number;
  onIndexChange: (idx: number) => void;
  siteStats?: { destinations: number; attractions: number };
}) {
  const { t } = useTranslation();
  const { localePath } = useLocale();
  const [isAnimating, setIsAnimating] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setPrefersReducedMotion(
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    );
  }, []);
  const dest = HERO_DESTINATIONS[currentIndex];

  useEffect(() => {
    const nextIndex = (currentIndex + 1) % HERO_DESTINATIONS.length;
    const img = new Image();
    img.src = HERO_DESTINATIONS[nextIndex].image;
  }, [currentIndex]);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        onIndexChange((currentIndex + 1) % HERO_DESTINATIONS.length);
        setIsAnimating(false);
      }, 500);
    }, 5000);
    return () => clearInterval(timer);
  }, [currentIndex, onIndexChange]);

  const goTo = (index: number): void => {
    if (index !== currentIndex && !isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        onIndexChange(index);
        setIsAnimating(false);
      }, 500);
    }
  };

  const websiteSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: ["TRAVI", "TRAVI Travel Guide", "TRAVI Travel"],
    url: SITE_URL,
    description:
      "Comprehensive travel information for 17 destinations worldwide with detailed guides for 3,000+ attractions, hotels, restaurants, and activities.",
    inLanguage: "en-US",
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  });

  const organizationSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.png`,
      width: 512,
      height: 512,
    },
    image: `${SITE_URL}/ogImage.jpg`,
    description:
      "Your trusted travel resource for 17 destinations worldwide with 3,000+ attractions, hotels, and restaurants reviewed.",
    foundingDate: "2021",
    sameAs: [
      "https://www.instagram.com/travi_world",
      "https://www.tiktok.com/@travi.world",
      "https://www.facebook.com/traviapp",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "support@travi.world",
      contactType: "customer support",
    },
  });

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
    ],
  });

  const destinationsListSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Featured Travel Destinations",
    description: "Popular travel destinations covered by TRAVI World",
    numberOfItems: HERO_DESTINATIONS.length,
    itemListElement: HERO_DESTINATIONS.map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "TouristDestination",
        name: d.name,
        description: `${d.tagline} - Complete travel guide for ${d.name}, ${d.country}`,
        url: `${SITE_URL}/destinations/${d.slug}`,
        image: `${SITE_URL}${d.image}`,
        containedInPlace: {
          "@type": "Country",
          name: d.country,
        },
      },
    })),
  });

  const collectionPageSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/#webpage`,
    url: SITE_URL,
    name: `${SITE_NAME} - Travel Guides for Hotels, Attractions & Things to Do`,
    description:
      "Your complete travel guide for 17 destinations worldwide. Expert information about hotels, attractions, restaurants, and activities for 3,000+ places.",
    isPartOf: {
      "@id": `${SITE_URL}/#website`,
    },
    about: {
      "@type": "Thing",
      name: "Travel Information",
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: 16,
      name: "Travel Destinations",
    },
  });

  return (
    <section
      className="relative bg-white dark:bg-slate-950 min-h-screen flex items-center pt-32 pb-16 lg:pt-40 lg:pb-24 px-4 sm:px-6 md:px-12 lg:px-16 overflow-hidden"
      data-testid="hero-section"
      aria-label="Welcome to TRAVI World - Your trusted travel resource"
    >
      <style>{heroAnimationStyles}</style>

      <Helmet>
        <link rel="preload" as="image" href="/hero/dubai-hero.webp" fetchPriority="high" />
        <script type="application/ld+json">{websiteSchema}</script>
        <script type="application/ld+json">{organizationSchema}</script>
        <script type="application/ld+json">{breadcrumbSchema}</script>
        <script type="application/ld+json">{destinationsListSchema}</script>
        <script type="application/ld+json">{collectionPageSchema}</script>
      </Helmet>

      {/* Decorative blobs */}
      <div
        className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-300/20 via-pink-200/10 to-transparent rounded-full blur-3xl pointer-events-none blob-animate-1"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-200/30 via-purple-100/20 to-transparent rounded-full blur-3xl pointer-events-none blob-animate-2"
        aria-hidden="true"
      />

      {/* Rotating gradient ring */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rotate-slow opacity-10 dark:opacity-20 pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="w-full h-full rounded-full border-[40px] border-transparent"
          style={{ borderTopColor: "hsl(var(--travi-purple))", borderRightColor: "#F24294" }}
        />
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between w-full max-w-7xl mx-auto gap-8 lg:gap-16 relative z-10">
        {/* Left Content */}
        <div className="flex-1 max-w-xl text-center lg:text-left">
          <div className="mb-6">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-md">
              <span className="w-2.5 h-2.5 rounded-full bg-travi-purple" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("home.hero.badge", { count: siteStats?.destinations || 17 })}
              </span>
            </div>
          </div>

          <h1 className="mb-6">
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-2 font-chillax">
              {t("home.hero.headlinePart1")}
            </span>
            <span className="relative inline-block">
              <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.1] tracking-tight animated-gradient-text font-chillax">
                {t("home.hero.headlinePart2")}
              </span>
              <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-travi-purple via-[#8B5CF6] to-[#F24294] rounded-full opacity-80" />
            </span>
          </h1>

          <p
            id="hero-description"
            className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-8 font-light leading-relaxed max-w-lg mx-auto lg:mx-0"
            dangerouslySetInnerHTML={{
              __html: t("home.hero.description", {
                destinations: `<span class="font-medium text-slate-700 dark:text-slate-300">${siteStats?.destinations || 17}</span>`,
                attractions: `<span class="font-medium text-slate-700 dark:text-slate-300">${(siteStats?.attractions || 3000).toLocaleString()}</span>`,
              }),
            }}
          />

          {/* Stats */}
          <dl className="flex flex-wrap justify-center lg:justify-start items-center gap-4 sm:gap-6 md:gap-8 mb-8">
            {[
              {
                num: `${(siteStats?.attractions || 3000).toLocaleString()}+`,
                label: t("home.stats.attractions"),
                srLabel: t("home.srLabel.attractions", { count: siteStats?.attractions || 3000 }),
              },
              {
                num: String(siteStats?.destinations || 17),
                label: t("home.stats.destinations"),
                srLabel: t("home.srLabel.destinations", { count: siteStats?.destinations || 17 }),
              },
              {
                num: "17+",
                label: t("home.stats.languages"),
                srLabel: t("home.srLabel.languages"),
              },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-4 sm:gap-6 md:gap-8">
                <div className="text-center lg:text-left">
                  <dt className="sr-only">{stat.srLabel}</dt>
                  <dd className="text-2xl sm:text-3xl md:text-4xl font-medium text-slate-900 dark:text-white font-chillax">
                    {stat.num}
                  </dd>
                  <div
                    className="text-[10px] sm:text-[11px] text-slate-400 tracking-wider mt-1"
                    aria-hidden="true"
                  >
                    {stat.label}
                  </div>
                </div>
                {i < 2 && (
                  <div
                    className="hidden sm:block w-px h-10 sm:h-12 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700 to-transparent"
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </dl>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <Link href={localePath("/destinations")}>
              <Button
                className="rounded-full bg-gradient-to-r from-travi-purple to-[#8B5CF6] hover:opacity-90 text-white px-8 py-6 text-base font-semibold shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
                aria-describedby="hero-description"
              >
                {t("home.cta.exploreDestinations")}
                <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
              </Button>
            </Link>
            <Link href={localePath("/guides")}>
              <Button
                variant="outline"
                className="rounded-full bg-white hover:bg-slate-50 text-slate-700 px-8 py-6 text-base font-medium border-2 border-slate-200 hover:border-slate-300 transition-colors duration-200"
              >
                {t("common.viewAll")}
              </Button>
            </Link>
          </div>

          {/* Dots */}
          <div
            className="flex gap-2 mt-8 justify-center lg:justify-start"
            role="tablist"
            aria-label={t("home.hero.carouselLabel")}
          >
            {HERO_DESTINATIONS.map((d, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                role="tab"
                aria-selected={currentIndex === i}
                aria-label={t("home.hero.viewDestination", { name: d.name, tagline: d.tagline })}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border-none cursor-pointer"
              >
                <span
                  className={cn(
                    "h-2.5 rounded-full transition-all duration-500 block",
                    currentIndex === i
                      ? "w-8 bg-gradient-to-r from-travi-purple to-[#8B5CF6]"
                      : "w-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300"
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right Image */}
        <div className="flex-1 w-full max-w-md lg:max-w-lg relative mt-8 lg:mt-0">
          <div
            className="absolute -inset-4 bg-gradient-to-r from-travi-purple/20 via-[#F24294]/10 to-travi-purple/20 rounded-[2rem] blur-xl opacity-60"
            aria-hidden="true"
          />

          <div
            className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/20"
            role="tabpanel"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                className="absolute inset-0"
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.05 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.7 }}
              >
                <img
                  src={dest.image}
                  alt={dest.alt}
                  title={dest.title}
                  className="w-full h-full object-cover"
                  width={800}
                  height={1000}
                  loading={currentIndex === 0 ? "eager" : "lazy"}
                  decoding="async"
                  {...({
                    fetchpriority: currentIndex === 0 ? "high" : "auto",
                  } as React.ImgHTMLAttributes<HTMLImageElement>)}
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
                  aria-hidden="true"
                />
              </motion.div>
            </AnimatePresence>

            {/* Location badge */}
            <div
              className={cn(
                "absolute bottom-6 left-6 right-6 transition-all duration-500",
                isAnimating ? "opacity-0 translate-y-5" : "opacity-100 translate-y-0"
              )}
            >
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-travi-purple to-[#8B5CF6] flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                    <MapPin className="w-5 h-5 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {dest.name}, {dest.country}
                    </div>
                    <div className="text-sm text-slate-500">{dest.tagline}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Popular badge */}
            <div className="absolute top-6 right-6 inline-flex items-center gap-2 bg-white/95 dark:bg-slate-800 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg shadow-purple-500/10 border border-travi-purple/20 float-badge">
              <div className="relative flex items-center justify-center">
                <span className="absolute w-2.5 h-2.5 rounded-full bg-travi-purple animate-ping opacity-75" />
                <span className="relative w-2 h-2 rounded-full bg-travi-purple" />
              </div>
              <span className="text-xs font-semibold text-travi-purple">
                {t("home.popular", "Popular")}
              </span>
            </div>
          </div>

          {/* Floating cards */}
          <div className="absolute -left-4 top-1/4 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-3 hidden lg:block border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md">
                <Ticket className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-slate-900 dark:text-white">
                  {t("home.floatingCards.tours", "500+ Tours")}
                </div>
                <div className="text-slate-500">
                  {t("home.floatingCards.available", "Available")}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -right-2 bottom-1/3 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-3 hidden lg:block border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                <Star className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-slate-900 dark:text-white">
                  {t("home.floatingCards.rating", "4.9 Rating")}
                </div>
                <div className="text-slate-500">{t("home.floatingCards.reviews", "Reviews")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden SEO navigation */}
      <nav className="sr-only" aria-label="All destination guides">
        <h2>Complete Travel Guides for All {ALL_DESTINATIONS_SEO.length} Destinations</h2>
        <ul>
          {ALL_DESTINATIONS_SEO.map(d => (
            <li key={d.slug}>
              <a href={localePath(`/destinations/${d.slug}`)}>
                {d.name}, {d.country} - Complete Travel Guide {CURRENT_YEAR} with Hotels,
                Attractions, Restaurants and Things to Do
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

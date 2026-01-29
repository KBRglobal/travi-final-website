import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  ArrowRight,
  Camera,
  Newspaper,
  BookOpen,
  Compass,
  ChevronDown,
  Heart,
  Sparkles,
  Tent,
  Baby,
  Wallet,
  Backpack,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";
import { SkipLink } from "@/components/ui/skip-link";
import { useIsDesktop } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/lib/i18n/LocaleProvider";

import { SITE_URL } from "@/lib/constants";
const SITE_NAME = "TRAVI World";
const CURRENT_YEAR = new Date().getFullYear();

// Note: All UI strings including DESTINATIONS, CATEGORY_CARDS, EXPERIENCE_CATEGORIES, and FAQ_ITEMS
// are now defined inline within their respective components with localized strings via t() calls

// SEO destination list with IDs matching destinations.cities.* translation keys
const ALL_DESTINATIONS_SEO = [
  { id: "abuDhabi", slug: "abu-dhabi" },
  { id: "amsterdam", slug: "amsterdam" },
  { id: "bangkok", slug: "bangkok" },
  { id: "barcelona", slug: "barcelona" },
  { id: "dubai", slug: "dubai" },
  { id: "hongKong", slug: "hong-kong" },
  { id: "istanbul", slug: "istanbul" },
  { id: "lasVegas", slug: "las-vegas" },
  { id: "london", slug: "london" },
  { id: "losAngeles", slug: "los-angeles" },
  { id: "miami", slug: "miami" },
  { id: "newYork", slug: "new-york" },
  { id: "paris", slug: "paris" },
  { id: "rome", slug: "rome" },
  { id: "singapore", slug: "singapore" },
  { id: "tokyo", slug: "tokyo" },
];

function HeroSection() {
  const isDesktop = useIsDesktop();
  const { t } = useTranslation();
  const { locale, localePath } = useLocale();

  const langCode = locale === "en" ? "en-US" : locale;

  const websiteSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: t("home.hero.pageDescription"),
    inLanguage: langCode,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  });

  const organizationSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png`, width: 512, height: 512 },
    description: t("home.hero.orgDescription"),
  });

  const faqItems = [
    { q: t("home.faq.whatIsTravi"), a: t("home.faq.whatIsTraviAnswer") },
    { q: t("home.faq.howManyDestinations"), a: t("home.faq.howManyDestinationsAnswer") },
    { q: t("home.faq.isFree"), a: t("home.faq.isFreeAnswer") },
    { q: t("home.faq.updateFrequency"), a: t("home.faq.updateFrequencyAnswer") },
  ];

  const faqSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(faq => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  });

  return (
    <section
      className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white dark:bg-slate-950"
      data-testid="hero-section"
      aria-label={t("home.hero.welcomeAriaLabel")}
    >
      <Helmet>
        <title>{t("home.hero.pageTitle") + " | " + CURRENT_YEAR}</title>
        <meta name="description" content={t("home.hero.pageDescription")} />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:title" content={t("home.hero.pageTitle")} />
        <meta property="og:description" content={t("home.hero.pageDescription")} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${SITE_URL}/ogImage.jpg`} />
        {isDesktop && (
          <link rel="preload" as="image" href="/hero/travi-world-mascot-globe-city-sunset.jpeg" />
        )}
        <script type="application/ld+json">{websiteSchema}</script>
        <script type="application/ld+json">{organizationSchema}</script>
        <script type="application/ld+json">{faqSchema}</script>
      </Helmet>

      <div className="flex flex-col lg:flex-row items-center justify-between w-full max-w-7xl mx-auto gap-8 lg:gap-16">
        <div className="flex-1 max-w-xl text-center lg:text-start">
          <div className="mb-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white dark:bg-slate-800 shadow-md border border-[#6443F4]/20">
              <Globe className="w-4 h-4 text-[#6443F4]" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("home.hero.badge")}
              </span>
            </div>
          </div>

          <h1 className="mb-6">
            <span
              className="block text-4xl sm:text-5xl lg:text-6xl font-semibold text-slate-900 dark:text-white leading-tight"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            >
              {t("home.hero.headlinePart1")}
            </span>
            <span className="relative inline-block">
              <span
                className="block text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight bg-gradient-to-r from-[#6443F4] via-[#8B5CF6] to-[#F24294] bg-clip-text text-transparent"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                {t("home.hero.headlinePart2")}
              </span>
              <span className="absolute -bottom-2 start-0 w-full h-1 bg-gradient-to-r from-[#6443F4] to-[#F24294] rounded-full" />
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
            {t("home.hero.descriptionPart1")}{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {t("home.stats.destinationsCountWithLabel", { count: 17 })}
            </span>{" "}
            {t("home.hero.descriptionPart2")}{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {t("home.stats.attractionsCountWithLabel", { count: 3000 })}
            </span>
            .
          </p>

          <dl className="flex flex-wrap justify-center lg:justify-start items-center gap-6 mb-8">
            {[
              { num: t("home.stats.attractionsNum"), label: t("home.stats.attractions") },
              { num: t("home.stats.destinationsNum"), label: t("home.stats.destinations") },
              { num: t("home.stats.languagesNum"), label: t("home.stats.languages") },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-6">
                <div className="text-center lg:text-start">
                  <dd
                    className="text-2xl sm:text-3xl font-medium text-slate-900 dark:text-white"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    {stat.num}
                  </dd>
                  <dt className="text-[10px] text-slate-400 tracking-wider mt-1">{stat.label}</dt>
                </div>
                {i < 2 && (
                  <div className="hidden sm:block w-px h-10 bg-slate-200 dark:bg-slate-700" />
                )}
              </div>
            ))}
          </dl>

          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <Link href={localePath("/destinations")}>
              <Button
                className="rounded-full bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] hover:opacity-90 text-white px-8 py-6 text-base font-semibold shadow-lg"
                data-testid="button-explore-destinations"
              >
                {t("home.cta.exploreDestinations")}
                <ArrowRight className="ms-2 w-5 h-5 rtl:rotate-180" />
              </Button>
            </Link>
            <Link href={localePath("/guides")}>
              <Button
                variant="outline"
                className="rounded-full bg-white hover:bg-slate-50 text-slate-700 px-8 py-6 text-base font-medium border-2 border-slate-200"
                data-testid="button-view-guides"
              >
                {t("home.cta.viewGuides")}
              </Button>
            </Link>
          </div>
        </div>

        {isDesktop && (
          <div className="flex-1 w-full max-w-md lg:max-w-lg relative mt-8 lg:mt-0">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="/hero/travi-world-mascot-globe-city-sunset.jpeg"
                alt={t("home.mascotAlt")}
                title={t("home.mascotTitle")}
                className="w-full h-full object-cover"
                width={600}
                height={750}
                loading="eager"
                decoding="async"
                {...({ fetchpriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              <div className="absolute bottom-6 start-6 end-6">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6443F4] to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {t("home.hero.worldwide")}
                      </div>
                      <div className="text-sm text-slate-500">{t("home.hero.exploreWorld")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <nav
        className="sr-only"
        aria-label={t("home.sections.allDestinationsTitle", { count: ALL_DESTINATIONS_SEO.length })}
      >
        <h2>{t("home.sections.allDestinationsTitle", { count: ALL_DESTINATIONS_SEO.length })}</h2>
        <ul>
          {ALL_DESTINATIONS_SEO.map(d => (
            <li key={d.slug}>
              <a href={localePath(`/destinations/${d.slug}`)}>
                {t("home.sections.completeGuide", {
                  name: t(`destinations.cities.${d.id}.name`),
                  country: t(`destinations.cities.${d.id}.country`),
                })}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

function DestinationsSection() {
  const { t } = useTranslation();
  const { localePath } = useLocale();

  const destinations = [
    { id: "dubai", slug: "/destinations/dubai", cardImage: "/cards/dubai.webp" },
    { id: "london", slug: "/destinations/london", cardImage: "/cards/london.webp" },
    { id: "paris", slug: "/destinations/paris", cardImage: "/cards/paris.webp" },
    { id: "newYork", slug: "/destinations/new-york", cardImage: "/cards/new-york.webp" },
    { id: "tokyo", slug: "/destinations/tokyo", cardImage: "/cards/tokyo.webp" },
    { id: "singapore", slug: "/destinations/singapore", cardImage: "/cards/singapore.webp" },
    { id: "barcelona", slug: "/destinations/barcelona", cardImage: "/cards/barcelona.webp" },
    { id: "bangkok", slug: "/destinations/bangkok", cardImage: "/cards/bangkok.webp" },
  ];

  return (
    <section
      className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900"
      aria-label={t("home.sections.destinations")}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-full mb-4">
            <MapPin className="w-4 h-4 text-[#6443F4]" />
            <span className="text-xs font-semibold tracking-wide text-[#6443F4] uppercase">
              {t("home.sections.destinations")}
            </span>
          </div>
          <h2
            className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          >
            {t("home.hero.exploreWorld")}
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t("home.sections.destinationsDesc")}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {destinations.map(dest => (
            <Link key={dest.id} href={localePath(dest.slug)}>
              <article
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
                data-testid={`card-destination-${dest.id}`}
              >
                <img
                  src={dest.cardImage}
                  alt={t(`destinations.cities.${dest.id}.cardAlt`)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  width={300}
                  height={400}
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 start-4 end-4">
                  <h3 className="font-bold text-white text-lg">
                    {t(`destinations.cities.${dest.id}.name`)}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {t(`destinations.cities.${dest.id}.country`)}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href={localePath("/destinations")}>
            <Button
              variant="outline"
              className="rounded-full px-8 py-5"
              data-testid="button-view-all-destinations"
            >
              {t("destinations.hero.exploreAll")}
              <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function CategoriesSection() {
  const { t } = useTranslation();
  const { localePath } = useLocale();

  const categoryCards = [
    {
      id: 2,
      icon: Camera,
      titleKey: "home.categories.attractions",
      descKey: "home.categories.attractionsDesc",
      linkUrl: "/attractions",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      iconBg: "bg-amber-500",
    },
    {
      id: 3,
      icon: Newspaper,
      titleKey: "home.categories.news",
      descKey: "home.categories.newsDesc",
      linkUrl: "/news",
      bgColor: "bg-violet-50 dark:bg-violet-950/30",
      iconBg: "bg-violet-500",
    },
    {
      id: 4,
      icon: BookOpen,
      titleKey: "home.categories.guides",
      descKey: "home.categories.guidesDesc",
      linkUrl: "/guides",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
      iconBg: "bg-indigo-500",
    },
  ];

  return (
    <section
      className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8"
      aria-label={t("home.sections.categories")}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-full mb-4">
            <Compass className="w-4 h-4 text-[#6443F4]" />
            <span className="text-xs font-semibold tracking-wide text-[#6443F4] uppercase">
              {t("home.sections.categories")}
            </span>
          </div>
          <h2
            className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          >
            {t("home.sections.categories")}
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t("home.sections.categoriesDesc")}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {categoryCards.map(card => {
            const IconComponent = card.icon;
            const title = t(card.titleKey);
            return (
              <Link key={card.id} href={localePath(card.linkUrl)}>
                <article
                  className={cn(
                    "group relative p-6 rounded-2xl transition-all duration-300 cursor-pointer h-full hover:shadow-xl hover:-translate-y-1",
                    card.bgColor
                  )}
                  data-testid={`card-category-${title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110",
                      card.iconBg
                    )}
                  >
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3
                    className="font-bold text-slate-900 dark:text-white text-lg mb-1"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    {title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t(card.descKey)}</p>
                  <div className="flex items-center gap-1 mt-3 text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-[#6443F4] transition-colors">
                    <span>{t("destinations.card.explore")}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition-transform" />
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TravelStylesSection() {
  const { t } = useTranslation();
  const { localePath } = useLocale();

  const experienceCategories = [
    {
      id: 1,
      nameKey: "home.experiences.luxury",
      descKey: "home.experiences.luxuryDesc",
      slug: "luxury",
      image: "/experiences/experiences-luxury-resort-infinity-pool.webp",
      imageAlt: "Luxury resort with infinity pool overlooking ocean",
      icon: Sparkles,
      href: "/travel-styles/luxury-travel-complete-guide",
    },
    {
      id: 2,
      nameKey: "home.experiences.adventure",
      descKey: "home.experiences.adventureDesc",
      slug: "adventure",
      image: "/experiences/experiences-adventure-hiker-mountain-trail-snowy-peaks.webp",
      imageAlt: "Hiker on mountain trail with snowy peaks",
      icon: Tent,
      href: "/travel-styles/adventure-outdoors-complete-guide",
    },
    {
      id: 3,
      nameKey: "home.experiences.family",
      descKey: "home.experiences.familyDesc",
      slug: "family",
      image: "/experiences/picnic-modern-architecture-outdoor-activity.webp",
      imageAlt: "Family enjoying outdoor picnic activity",
      icon: Baby,
      href: "/travel-styles/family-travel-complete-guide",
    },
    {
      id: 4,
      nameKey: "home.experiences.budget",
      descKey: "home.experiences.budgetDesc",
      slug: "budget",
      image: "/experiences/solo-travel-backpack-map-camera-desert-architecture.webp",
      imageAlt: "Budget travel backpack with map and camera",
      icon: Wallet,
      href: "/travel-styles/budget-travel-complete-guide",
    },
    {
      id: 5,
      nameKey: "home.experiences.romance",
      descKey: "home.experiences.romanceDesc",
      slug: "romance",
      image: "/experiences/romantic-couple-beach-sunset-modern-architecture.webp",
      imageAlt: "Romantic couple watching sunset on beach",
      icon: Heart,
      href: "/travel-styles/honeymoon-romance-complete-guide",
    },
    {
      id: 6,
      nameKey: "home.experiences.solo",
      descKey: "home.experiences.soloDesc",
      slug: "solo",
      image: "/experiences/solo-traveler-canoe-mountain-lake-archway-reflection.webp",
      imageAlt: "Solo traveler in canoe on peaceful mountain lake",
      icon: Backpack,
      href: "/travel-styles/solo-travel-complete-guide",
    },
  ];

  return (
    <section
      className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900"
      aria-label={t("home.sections.experiences")}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          >
            {t("home.sections.experiences")}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t("home.sections.experiencesDesc")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {experienceCategories.map(category => {
            const IconComponent = category.icon;
            const name = t(category.nameKey);
            return (
              <article key={category.id}>
                <Link
                  href={localePath(category.href)}
                  title={`${name} - Complete Travel Guide ${CURRENT_YEAR}`}
                >
                  <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-slate-800 h-full">
                    <div className="relative h-40 sm:h-48 overflow-hidden">
                      {category.image ? (
                        <img
                          src={category.image}
                          alt={category.imageAlt}
                          title={name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
                      <div className="absolute bottom-4 start-4 end-4">
                        <h3
                          className="text-lg sm:text-xl font-bold text-white mb-1"
                          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                        >
                          {name}
                        </h3>
                        <p className="text-sm text-white/80 line-clamp-2">{t(category.descKey)}</p>
                      </div>
                    </div>
                    <CardContent className="p-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-[#6443F4]">
                        {t("destinations.card.explore")} {t("nav.guides").toLowerCase()}
                      </span>
                      <ArrowRight
                        className="w-4 h-4 text-[#6443F4] group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition-transform"
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
    </section>
  );
}

function FAQSection() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqItems = [
    { q: t("home.faq.whatIsTravi"), a: t("home.faq.whatIsTraviAnswer") },
    { q: t("home.faq.howManyDestinations"), a: t("home.faq.howManyDestinationsAnswer") },
    { q: t("home.faq.isFree"), a: t("home.faq.isFreeAnswer") },
    { q: t("home.faq.updateFrequency"), a: t("home.faq.updateFrequencyAnswer") },
  ];

  return (
    <section
      className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950"
      aria-label={t("home.faq.title")}
    >
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          >
            {t("home.faq.title")}
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400">{t("home.faq.subtitle")}</p>
        </div>

        <div className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
          {faqItems.map((faq, index) => (
            <div
              key={index}
              className="bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
              itemScope
              itemProp="mainEntity"
              itemType="https://schema.org/Question"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 text-start flex items-center justify-between gap-4 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                aria-expanded={openIndex === index}
                data-testid={`button-faq-${index}`}
              >
                <h3
                  className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white pe-4"
                  itemProp="name"
                >
                  {faq.q}
                </h3>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-slate-500 flex-shrink-0 transition-transform duration-300",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-all duration-300 ease-out",
                  openIndex === index ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
                itemScope
                itemProp="acceptedAnswer"
                itemType="https://schema.org/Answer"
              >
                <div className="overflow-hidden">
                  <p
                    className="px-6 pb-5 text-slate-600 dark:text-slate-400 leading-relaxed"
                    itemProp="text"
                  >
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterSectionLite() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      setIsSubmitted(true);
    }
  };

  return (
    <section
      className="relative py-20 overflow-hidden"
      data-testid="newsletter-section"
      aria-label={t("newsletter.title")}
    >
      <div className="absolute inset-0 z-0">
        <img
          src="/newsletter/home-newsletter-duck-surfing-wave.webp"
          alt=""
          className="w-full h-full object-cover"
          width={1920}
          height={600}
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <div className="max-w-xl ms-0 md:ms-8 lg:ms-16">
          <div
            className="rounded-3xl p-8 md:p-10"
            style={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.4)",
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-sm font-semibold tracking-widest uppercase text-slate-700">
                {t("newsletter.badge")}
              </span>
            </div>

            <h2
              className="text-2xl sm:text-3xl font-bold text-center mb-3 text-slate-800"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            >
              {t("newsletter.title")}
            </h2>

            <p className="text-center text-slate-600 mb-8">{t("newsletter.description")}</p>

            {!isSubmitted ? (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3"
                data-testid="newsletter-form"
              >
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t("newsletter.emailPlaceholder")}
                  className="flex-1 h-12 px-5 text-base rounded-full bg-white/80 border border-slate-200 focus:border-[#6443F4] focus:ring-2 focus:ring-[#6443F4]/20 outline-none transition-colors"
                  data-testid="input-newsletter-email"
                />
                <Button
                  type="submit"
                  className="h-12 px-8 rounded-full text-base font-semibold bg-[#6443F4] hover:bg-[#5539d4] text-white"
                  data-testid="button-newsletter-subscribe"
                >
                  {t("newsletter.subscribe")}
                </Button>
              </form>
            ) : (
              <div className="text-center py-4" data-testid="newsletter-success">
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500/20 text-green-700 font-medium">
                  {t("newsletter.success")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomepageFast() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <SkipLink />
      <PublicNav variant="default" />
      <main id="main-content">
        <HeroSection />
        <DestinationsSection />
        <CategoriesSection />
        <TravelStylesSection />
        <FAQSection />
        <NewsletterSectionLite />
      </main>
      <PublicFooter />
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Globe, Languages, Sparkles, ArrowRight, Search } from "lucide-react";
import { SEOHead } from "@/components/seo-head";
import { Helmet } from "react-helmet-async";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "ar", label: "Arabic", nativeName: "العربية" },
  { code: "de", label: "German", nativeName: "Deutsch" },
  { code: "es", label: "Spanish", nativeName: "Español" },
  { code: "fr", label: "French", nativeName: "Français" },
  { code: "he", label: "Hebrew", nativeName: "Hebrew" },
  { code: "hi", label: "Hindi", nativeName: "हिन्दी" },
  { code: "it", label: "Italian", nativeName: "Italiano" },
  { code: "ja", label: "Japanese", nativeName: "日本語" },
  { code: "ko", label: "Korean", nativeName: "한국어" },
  { code: "pt", label: "Portuguese", nativeName: "Português" },
  { code: "ru", label: "Russian", nativeName: "Русский" },
  { code: "tr", label: "Turkish", nativeName: "Türkçe" },
  { code: "zh", label: "Chinese", nativeName: "中文" },
  { code: "nl", label: "Dutch", nativeName: "Nederlands" },
  { code: "pl", label: "Polish", nativeName: "Polski" },
  { code: "sv", label: "Swedish", nativeName: "Svenska" },
  { code: "el", label: "Greek", nativeName: "Ελληνικά" },
  { code: "fi", label: "Finnish", nativeName: "Suomi" },
  { code: "ro", label: "Romanian", nativeName: "Română" },
  { code: "uk", label: "Ukrainian", nativeName: "Українська" },
  { code: "vi", label: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "th", label: "Thai", nativeName: "ไทย" },
  { code: "id", label: "Indonesian", nativeName: "Indonesia" },
];

interface Guide {
  id: number;
  slug: string;
  title: string;
  summary: string;
  locale: string;
  availableLocales: string[];
  destinationType: string | null;
  publishedAt: string | null;
  sourceUrl?: string;
}

interface GuidesResponse {
  guides: Guide[];
  total: number;
  locale: string;
  limit: number;
  offset: number;
}

// Hero animation styles (matching attractions.tsx)
const heroAnimationStyles = `
  .animated-gradient-text {
    background: linear-gradient(
      135deg,
      #6443F4 0%,
      #8B5CF6 30%,
      #F24294 70%,
      #6443F4 100%
    );
    background-size: 300% 300%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradient-flow 6s ease infinite;
  }

  .bento-card {
    border-radius: 1.5rem;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .thumb-item {
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .thumb-item:hover, .thumb-item.active {
    transform: scale(1.05);
  }
`;

// Hero guide destinations for the interactive card gallery
const HERO_GUIDES = [
  {
    name: "Paris",
    city: "France",
    tagline: "Art & Romance",
    image: "/cards/paris.webp",
    alt: "Paris travel guide - Eiffel Tower and city skyline",
    title: "Paris Travel Guide",
    loading: "eager" as const,
    fetchPriority: "high" as const,
  },
  {
    name: "Dubai",
    city: "UAE",
    tagline: "Luxury & Sun",
    image: "/cards/dubai.webp",
    alt: "Dubai travel guide - Burj Khalifa and downtown skyline",
    title: "Dubai Travel Guide",
  },
  {
    name: "Tokyo",
    city: "Japan",
    tagline: "Culture & Tech",
    image: "/cards/tokyo.webp",
    alt: "Tokyo travel guide - cityscape and temples",
    title: "Tokyo Travel Guide",
  },
  {
    name: "New York",
    city: "USA",
    tagline: "City Explorer",
    image: "/cards/new-york.webp",
    alt: "New York travel guide - Manhattan skyline",
    title: "New York Travel Guide",
  },
  {
    name: "London",
    city: "UK",
    tagline: "Royal Heritage",
    image: "/cards/london.webp",
    alt: "London travel guide - Big Ben and Thames",
    title: "London Travel Guide",
  },
];

// Enhanced guide card with premium styling
function GuideCard({ guide, locale, index }: { guide: Guide; locale: string; index: number }) {
  const destinationId = guide.slug.replace("-travel-guide", "");
  const cardImage = `/cards/${destinationId}.webp`;
  const guideUrl = `/guides/${guide.slug}?locale=${locale}`;
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.6,
        delay: shouldReduceMotion ? 0 : index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link href={guideUrl}>
        <div
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20"
          data-testid={`guide-card-${guide.slug}`}
        >
          {/* Image container with parallax hover effect */}
          <div className="relative h-56 overflow-hidden">
            <img
              src={cardImage}
              alt={`${guide.title} - comprehensive travel guide with local tips and recommendations`}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              width={800}
              height={600}
              loading="lazy"
              decoding="async"
              onError={e => {
                const target = e.currentTarget;
                const fallbackUrl =
                  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop&q=80";
                if (!target.dataset.fallbackApplied) {
                  target.dataset.fallbackApplied = "true";
                  target.src = fallbackUrl;
                }
              }}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-80" />

            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#6443F4]/20 via-transparent to-[#E84C9A]/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h3 className="text-xl font-bold text-white drop-shadow-lg mb-1">
                {guide.title.replace(" Travel Guide", "")}
              </h3>
              <p className="text-sm text-white/80">Complete Travel Guide</p>
            </div>

            {/* Language badge */}
            {guide.availableLocales.length > 1 && (
              <Badge className="absolute top-4 right-4 bg-white/95 text-slate-700 backdrop-blur-sm border-0 shadow-lg">
                <Languages className="h-3 w-3 mr-1.5" aria-hidden="true" />
                {guide.availableLocales.length} languages
              </Badge>
            )}
          </div>

          {/* Content section */}
          <div className="p-5">
            <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
              {guide.summary ||
                `Discover everything you need to know about ${guide.title.replace(" Travel Guide", "")} - local tips, attractions, and insider recommendations.`}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>In-depth Guide</span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-purple-600 font-medium text-sm transition-all duration-300 group-hover:gap-2">
                <span>Explore</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </div>
          </div>

          {/* Bottom accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6443F4] to-[#E84C9A] transform scale-x-0 transition-transform duration-500 origin-left group-hover:scale-x-100" />
        </div>
      </Link>
    </motion.div>
  );
}

// Featured guide spotlight card
function FeaturedGuideCard({ guide, locale }: { guide: Guide; locale: string }) {
  const destinationId = guide.slug.replace("-travel-guide", "");
  const cardImage = `/cards/${destinationId}.webp`;
  const guideUrl = `/guides/${guide.slug}?locale=${locale}`;

  return (
    <Link href={guideUrl}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white shadow-2xl"
        data-testid={`featured-guide-${guide.slug}`}
      >
        <div className="grid md:grid-cols-2">
          {/* Image side */}
          <div className="relative h-64 md:h-96 overflow-hidden">
            <img
              src={cardImage}
              alt={`${guide.title} - featured travel destination guide`}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              width={1200}
              height={900}
              loading="lazy"
              decoding="async"
              onError={e => {
                const target = e.currentTarget;
                const fallbackUrl =
                  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&h=900&fit=crop&q=80";
                if (!target.dataset.fallbackApplied) {
                  target.dataset.fallbackApplied = "true";
                  target.src = fallbackUrl;
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/30 md:to-white" />

            {/* Floating badge */}
            <Badge className="absolute top-4 left-4 bg-gradient-to-r from-[#6443F4] to-[#E84C9A] text-white border-0 shadow-lg">
              <Sparkles className="h-3 w-3 mr-1.5" />
              Featured Guide
            </Badge>
          </div>

          {/* Content side */}
          <div className="p-8 md:p-10 flex flex-col justify-center">
            <div className="mb-4">
              <span className="text-sm font-medium text-purple-600 uppercase tracking-wider">
                Destination Spotlight
              </span>
            </div>

            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">{guide.title}</h3>

            <p className="text-slate-600 mb-6 leading-relaxed">
              {guide.summary ||
                `Your comprehensive guide to exploring ${guide.title.replace(" Travel Guide", "")}. Discover hidden gems, local favorites, and essential travel tips.`}
            </p>

            <div className="flex items-center gap-4 mb-6">
              {guide.availableLocales.length > 1 && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Languages className="h-4 w-4" />
                  <span>Available in {guide.availableLocales.length} languages</span>
                </div>
              )}
            </div>

            <Button
              className="w-fit bg-gradient-to-r from-[#6443F4] to-[#E84C9A] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              data-testid={`read-featured-guide-${guide.slug}`}
            >
              Read Full Guide
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function TravelGuidesPage() {
  const [location] = useLocation();
  const [selectedLocale, setSelectedLocale] = useState("en");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const dest = HERO_GUIDES[currentIndex];
  const goTo = (i: number) => setCurrentIndex(i);

  const { data, isLoading, error } = useQuery<GuidesResponse>({
    queryKey: ["/api/public/guides", selectedLocale],
    queryFn: async () => {
      const response = await fetch(`/api/public/guides?locale=${selectedLocale}&limit=50`);
      if (!response.ok) throw new Error("Failed to fetch guides");
      return response.json();
    },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(globalThis.location.search);
    const localeParam = urlParams.get("locale");
    if (localeParam && SUPPORTED_LANGUAGES.some(l => l.code === localeParam)) {
      setSelectedLocale(localeParam);
    }
  }, []);

  // Filter guides by search query
  const filteredGuides =
    data?.guides.filter(
      guide =>
        guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.summary?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  // Get featured guide (first one or random)
  const featuredGuide = filteredGuides[0];
  const otherGuides = filteredGuides.slice(1);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Travel Guides",
    description: "Comprehensive travel guides for destinations worldwide",
    numberOfItems: data?.guides.length || 0,
    itemListElement:
      data?.guides.map((guide, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "TravelGuide",
          name: guide.title,
          description: guide.summary,
          url: `https://travi.world/guides/${guide.slug}`,
          inLanguage: guide.locale,
        },
      })) || [],
  };

  return (
    <>
      <style>{heroAnimationStyles}</style>
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <SEOHead
          title="Travel Guides | TRAVI - Complete Destination Guides"
          description="Explore comprehensive travel guides for destinations worldwide. Get insider tips, local recommendations, and everything you need for your next adventure."
          canonicalPath="/guides"
          keywords={[
            "travel guides",
            "destination guides",
            "travel tips",
            "city guides",
            "vacation planning",
          ]}
        />

        <Helmet>
          <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
        </Helmet>

        <PublicNav />

        {/* Split-Screen Immersive Hero - Matching attractions.tsx style */}
        <section
          className="relative min-h-screen bg-slate-50 dark:bg-slate-950"
          data-testid="hero-section"
          aria-label="Explore travel guides for destinations worldwide"
        >
          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {/* Morphing blobs - adapted for dark mode */}
            <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-purple-200/40 via-pink-100/30 to-purple-100/40 dark:from-purple-900/30 dark:via-pink-900/20 dark:to-purple-900/30 morph-blob blur-3xl" />
            <div
              className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-blue-100/30 via-purple-100/20 to-pink-100/30 dark:from-blue-900/20 dark:via-purple-900/15 dark:to-pink-900/20 morph-blob blur-3xl"
              style={{ animationDelay: "-4s" }}
            />

            {/* Rotating gradient ring - opacity adjusted for dark mode */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rotate-slow opacity-10 dark:opacity-20">
              <div
                className="w-full h-full rounded-full border-[40px] border-transparent"
                style={{ borderTopColor: "#6443F4", borderRightColor: "#F24294" }}
              />
            </div>

            {/* Grid dots - adjusted for dark mode */}
            <div
              className="absolute inset-0 opacity-[0.03] dark:opacity-[0.08]"
              style={{
                backgroundImage: "radial-gradient(#6443F4 1px, transparent 1px)",
                backgroundSize: "30px 30px",
              }}
            />
          </div>

          <div className="relative z-10 min-h-screen flex items-center pt-32 pb-16 lg:pt-40 lg:pb-24">
            <div className="max-w-[90rem] mx-auto w-full">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                {/* Left Side - Content */}
                <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24">
                  {/* Top Badge - Blue dot style */}
                  <motion.div
                    className="mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                  >
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 shadow-lg shadow-[#6443F4]/10 border border-[#6443F4]/20">
                      <div className="relative flex items-center justify-center">
                        <span className="absolute w-3 h-3 rounded-full bg-[#6443F4] animate-ping opacity-75" />
                        <span className="relative w-2.5 h-2.5 rounded-full bg-[#6443F4]" />
                      </div>
                      <span
                        className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                        data-testid="badge-guides-count"
                      >
                        <span className="text-[#6443F4]">
                          {data?.total ? `${data.total}+` : "50+"}
                        </span>{" "}
                        guides in{" "}
                        <span className="text-[#6443F4]">{SUPPORTED_LANGUAGES.length}</span>{" "}
                        languages
                      </span>
                    </div>
                  </motion.div>

                  {/* Main Headline - SEO focused with underline accent */}
                  <motion.h1
                    className="mb-6"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  >
                    <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-2 font-chillax">
                      Travel
                    </span>
                    <span className="relative inline-block">
                      <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.1] tracking-tight animated-gradient-text font-chillax">
                        Guides
                      </span>
                      {/* Gradient underline accent */}
                      <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-[#6443F4] via-[#8B5CF6] to-[#F24294] rounded-full opacity-80" />
                    </span>
                  </motion.h1>

                  {/* Subtitle */}
                  <motion.p
                    className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-8 font-light leading-relaxed max-w-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.35 }}
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      In-depth travel guides
                    </span>{" "}
                    for Paris, Dubai, Tokyo, and top destinations worldwide. Local tips, hidden
                    gems, and insider recommendations.
                  </motion.p>

                  {/* Inline Stats Row (attractions pattern) */}
                  <motion.dl
                    className="flex flex-wrap justify-center lg:justify-start items-center gap-4 sm:gap-6 md:gap-8 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    {[
                      {
                        num: data?.total ? `${data.total}+` : "50+",
                        label: "GUIDES",
                        srLabel: `Over ${data?.total || 50} travel guides`,
                      },
                      {
                        num: `${SUPPORTED_LANGUAGES.length}`,
                        label: "LANGUAGES",
                        srLabel: `${SUPPORTED_LANGUAGES.length} languages`,
                      },
                      { num: "4.9", label: "RATING", srLabel: "4.9 star rating" },
                    ].map((stat, i) => (
                      <div key={stat.srLabel} className="flex items-center gap-4 sm:gap-6 md:gap-8">
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
                  </motion.dl>

                  {/* Search Bar with Button */}
                  <motion.div
                    className="relative max-w-xl w-full mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.55 }}
                  >
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#6443F4] via-[#8B5CF6] to-[#F24294] rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
                    <div className="relative flex items-center bg-white dark:bg-slate-800 backdrop-blur-xl rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                      <Search className="w-5 h-5 text-[#6443F4] ml-5 shrink-0" aria-hidden="true" />
                      <Input
                        type="text"
                        placeholder="Search Paris, Dubai, Tokyo guides..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="flex-1 h-14 md:h-16 border-0 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-0 text-base md:text-lg"
                        data-testid="search-guides-input"
                        aria-label="Search travel guides by destination"
                      />
                      <Button
                        onClick={() => {
                          const el = document.getElementById("guides-grid");
                          el?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="mr-2 md:mr-3 rounded-lg bg-[#6443F4] text-white"
                        data-testid="button-hero-search"
                        aria-label="Search guides"
                      >
                        Search
                      </Button>
                    </div>
                  </motion.div>

                  {/* Carousel Dots */}
                  <motion.div
                    className="flex gap-2 mt-8 justify-center lg:justify-start"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.7 }}
                    role="tablist"
                    aria-label="Guide carousel navigation"
                  >
                    {HERO_GUIDES.map((d, i) => (
                      <button
                        key={d.name}
                        onClick={() => goTo(i)}
                        role="tab"
                        aria-selected={currentIndex === i}
                        aria-label={`View ${d.name} guide`}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border-none cursor-pointer"
                      >
                        <span
                          className={cn(
                            "h-2.5 rounded-full transition-all duration-500 block",
                            currentIndex === i
                              ? "w-8 bg-gradient-to-r from-[#6443F4] to-[#8B5CF6]"
                              : "w-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300"
                          )}
                        />
                      </button>
                    ))}
                  </motion.div>
                </div>

                {/* Right Side - Bento Grid Gallery */}
                <div className="relative px-6 sm:px-12 lg:px-8 lg:pr-12 xl:pr-16">
                  <motion.div
                    className="relative w-full max-w-lg mx-auto flex flex-col lg:h-[65vh] lg:min-h-[500px]"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    {/* Main Featured Image */}
                    <div
                      className="bento-card relative flex-1 min-h-0 group bg-white dark:bg-slate-900 shadow-lg dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:shadow-[#6443F4]/15 hover:-translate-y-2 rounded-2xl overflow-hidden"
                      role="region"
                      aria-label="Featured guide"
                    >
                      <AnimatePresence mode="wait">
                        <motion.img
                          key={currentIndex}
                          src={dest.image}
                          alt={dest.alt}
                          title={dest.title}
                          width={1200}
                          height={1600}
                          className="w-full h-full object-cover"
                          initial={{ opacity: 0, scale: 1.1 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.7 }}
                          loading={dest.loading || "lazy"}
                          {...(dest.fetchPriority && { fetchpriority: dest.fetchPriority })}
                        />
                      </AnimatePresence>

                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />

                      {/* Content overlay */}
                      <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between">
                        {/* Top Row */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md shadow-lg">
                            <span className="font-semibold text-slate-800">{dest.tagline}</span>
                          </div>
                          <motion.div
                            className="relative px-4 py-2 rounded-full bg-gradient-to-r from-[#6443F4] to-[#F24294] text-white text-sm font-semibold shadow-lg"
                            animate={{ scale: [1, 1.02, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            In-Depth
                          </motion.div>
                        </div>

                        {/* Bottom Content */}
                        <div>
                          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-chillax">
                            {dest.name}
                          </h3>
                          <p className="text-white/80 mb-4">{dest.city} Travel Guide</p>
                          <Link
                            href={`/guides/${dest.name.toLowerCase().replace(" ", "-")}-travel-guide?locale=${selectedLocale}`}
                          >
                            <Button
                              className="rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 px-6"
                              data-testid={`button-read-${dest.name.toLowerCase()}-guide`}
                            >
                              Read Guide
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Thumbnail Navigation */}
                    <div
                      className="flex gap-2 mt-4 justify-center"
                      role="tablist"
                      aria-label="Guide thumbnail navigation"
                    >
                      {HERO_GUIDES.map((guide, i) => (
                        <button
                          key={guide.name}
                          onClick={() => goTo(i)}
                          role="tab"
                          aria-selected={currentIndex === i}
                          aria-label={`View ${guide.name} guide`}
                          className={cn(
                            "w-14 h-14 min-w-[44px] min-h-[44px] rounded-lg overflow-hidden border-2 transition-all duration-300",
                            currentIndex === i
                              ? "border-[#6443F4] ring-2 ring-[#6443F4]/30 scale-110"
                              : "border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100"
                          )}
                        >
                          <img
                            src={guide.image}
                            alt={`${guide.name} travel guide thumbnail`}
                            className="w-full h-full object-cover"
                            width={56}
                            height={56}
                            loading="lazy"
                            decoding="async"
                          />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="relative bg-white dark:bg-slate-950 py-16">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 pb-24">
            {isLoading ? (
              <div className="space-y-8">
                {/* Featured skeleton */}
                <Skeleton className="h-96 w-full rounded-3xl" />
                {/* Grid skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {Array.from({ length: 6 }, (_, i) => `gs-${i}`).map(id => (
                    <div key={id} className="rounded-2xl overflow-hidden bg-white shadow-lg">
                      <Skeleton className="h-56 w-full" />
                      <div className="p-5 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : error ? (
              <Card className="p-12 text-center bg-white shadow-xl rounded-3xl">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Guides</h3>
                <p className="text-slate-600 mb-6">
                  We encountered an issue loading the travel guides. Please try again.
                </p>
                <Button
                  onClick={() => globalThis.location.reload()}
                  className="bg-gradient-to-r from-[#6443F4] to-[#E84C9A] text-white"
                >
                  Refresh Page
                </Button>
              </Card>
            ) : filteredGuides.length === 0 ? (
              <Card className="p-12 text-center bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-xl rounded-3xl">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-[#6443F4]/20 to-[#E84C9A]/20 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {searchQuery ? "No Guides Found" : "Guides Coming Soon"}
                </h3>
                <p className="text-slate-600 mb-6">
                  {searchQuery
                    ? `No guides match "${searchQuery}". Try a different search term.`
                    : "Travel guides are being prepared. Check back soon for comprehensive destination guides!"}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery("")}
                    data-testid="clear-search-button"
                  >
                    Clear Search
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-16">
                {/* Featured Guide Spotlight */}
                {featuredGuide && (
                  <div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="mb-8"
                    >
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">Featured Guide</h2>
                      <p className="text-slate-600">
                        Start your exploration with our top recommended destination
                      </p>
                    </motion.div>
                    <FeaturedGuideCard guide={featuredGuide} locale={selectedLocale} />
                  </div>
                )}

                {/* All Guides Grid */}
                {otherGuides.length > 0 && (
                  <div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="mb-8 flex items-center justify-between"
                    >
                      <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">All Destinations</h2>
                        <p className="text-slate-600">
                          Explore {otherGuides.length} comprehensive travel guides
                        </p>
                      </div>
                      <Badge variant="outline" className="hidden sm:flex">
                        <Globe className="h-3 w-3 mr-1.5" />
                        {data?.total || 0} Total Guides
                      </Badge>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {otherGuides.map((guide, index) => (
                        <GuideCard
                          key={guide.id}
                          guide={guide}
                          locale={selectedLocale}
                          index={index}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}

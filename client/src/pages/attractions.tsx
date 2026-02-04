import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import {
  Search,
  MapPin,
  Star,
  Clock,
  ChevronDown,
  Ticket,
  TrendingUp,
  Globe2,
  ArrowRight,
  Sparkles,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface SearchResult {
  type: "city" | "attraction";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  image?: string;
  rating?: number;
  duration?: string;
  price?: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface Destination {
  slug: string;
  name: string;
  country: string;
  image: string;
  count: number;
}

interface DestinationsApiResponse {
  destinations: Destination[];
  total: number;
}

const BASE_URL = "https://travi.world";
const CANONICAL_URL = `${BASE_URL}/attractions`;

/**
 * SEO CONTENT EXCEPTIONS - INTENTIONALLY NOT LOCALIZED
 *
 * The following content remains hardcoded in English for SEO optimization:
 * - HERO_ATTRACTIONS: Attraction names, cities, taglines, categories (proper nouns + rich snippets)
 * - POPULAR_SEARCHES: Search terms matching tourist query patterns
 * - FAQ_DATA: Question/answer pairs for FAQ schema markup
 * - JSON-LD structured data: Schema.org markup for search engines
 * - sr-only navigation (bottom of page): Hidden SEO-optimized anchor text for crawlers
 *
 * Rationale: Attraction names are proper nouns that tourists search for in English globally.
 * Schema.org structured data requires consistent language for search engine indexing.
 */
const HERO_ATTRACTIONS = [
  {
    name: "Eiffel Tower",
    city: "Paris",
    slug: "paris",
    image: "/attractions-hero/eiffel-tower-paris-attraction.webp",
    tagline: "Skip the Line Access",
    category: "Landmark",
    alt: "Eiffel Tower in Paris - Iconic iron landmark and top tourist attraction in France with 7M+ annual visitors",
    title: "Eiffel Tower Paris",
    price: "$35",
    loading: "eager" as const,
    fetchPriority: "high" as const,
  },
  {
    name: "Colosseum",
    city: "Rome",
    slug: "rome",
    image: "/attractions-hero/colosseum-rome-attraction.webp",
    tagline: "Underground & Arena Floor",
    category: "Historic Site",
    alt: "Colosseum in Rome - Ancient Roman amphitheater and UNESCO World Heritage Site, Italy's top attraction",
    title: "Colosseum Rome",
    price: "$65",
    loading: "lazy" as const,
  },
  {
    name: "Burj Khalifa",
    city: "Dubai",
    slug: "dubai",
    image: "/attractions-hero/burj-khalifa-dubai-attraction.webp",
    tagline: "At The Top Experience",
    category: "Observation Deck",
    alt: "Burj Khalifa in Dubai - World's tallest building at 828 meters, top attraction in United Arab Emirates",
    title: "Burj Khalifa Dubai",
    price: "$45",
    loading: "lazy" as const,
  },
  {
    name: "Tower of London",
    city: "London",
    slug: "london",
    image: "/attractions-hero/tower-of-london-london-attraction.webp",
    tagline: "Crown Jewels Exhibition",
    category: "Castle",
    alt: "Tower of London - Historic royal palace and UNESCO World Heritage Site, top attraction in England",
    title: "Tower of London",
    price: "$38",
    loading: "lazy" as const,
  },
  {
    name: "Statue of Liberty",
    city: "New York",
    slug: "new-york",
    image: "/attractions-hero/statue-of-liberty-new-york-attraction.webp",
    tagline: "Pedestal & Crown Access",
    category: "Monument",
    alt: "Statue of Liberty in New York - Iconic American symbol and UNESCO World Heritage Site, top US attraction",
    title: "Statue of Liberty New York",
    price: "$24",
    loading: "lazy" as const,
  },
  {
    name: "Sagrada Familia",
    city: "Barcelona",
    slug: "barcelona",
    image: "/attractions-hero/sagrada-familia-barcelona-attraction.webp",
    tagline: "Tower Access Included",
    category: "Basilica",
    alt: "Sagrada Familia in Barcelona - Gaudi's masterpiece basilica and UNESCO World Heritage Site, top Spain attraction",
    title: "Sagrada Familia Barcelona",
    price: "$47",
    loading: "lazy" as const,
  },
  {
    name: "teamLab Borderless",
    city: "Tokyo",
    slug: "tokyo",
    image: "/attractions-hero/teamlab-borderless-tokyo-attraction.webp",
    tagline: "Digital Art Museum",
    category: "Museum",
    alt: "teamLab Borderless in Tokyo - Interactive digital art museum with immersive installations, top Japan attraction",
    title: "teamLab Borderless Tokyo",
    price: "$32",
    loading: "lazy" as const,
  },
  {
    name: "Gardens by the Bay",
    city: "Singapore",
    slug: "singapore",
    image: "/attractions-hero/gardens-by-the-bay-singapore-attraction.webp",
    tagline: "Cloud Forest & Flower Dome",
    category: "Gardens",
    alt: "Gardens by the Bay in Singapore - Futuristic nature park with Supertrees and Cloud Forest, top Singapore attraction",
    title: "Gardens by the Bay Singapore",
    price: "$22",
    loading: "lazy" as const,
  },
];

const ATTRACTION_TYPES = [
  { id: "all", labelKey: "attractions.types.all", searchTerm: "" },
  { id: "museum", labelKey: "attractions.types.museums", searchTerm: "museum" },
  { id: "landmark", labelKey: "attractions.types.landmarks", searchTerm: "landmark" },
  { id: "tour", labelKey: "attractions.types.tours", searchTerm: "tour" },
  { id: "theme-park", labelKey: "attractions.types.themeParks", searchTerm: "theme park" },
  { id: "show", labelKey: "attractions.types.shows", searchTerm: "show" },
];

const POPULAR_SEARCHES = [
  "Eiffel Tower tickets",
  "Vatican Museums skip the line",
  "Burj Khalifa observation deck",
  "Louvre Museum entry",
  "Colosseum underground tour",
  "Tower of London Crown Jewels",
];

// FAQ focused on real tourist search queries
const FAQ_DATA: FAQItem[] = [
  {
    question: "How do I skip the line at the Eiffel Tower?",
    answer:
      "Book skip-the-line tickets in advance online. Timed entry tickets let you bypass the main queue and go directly to security. Summit tickets (top floor) have shorter lines than 2nd floor. Early morning (9-10am) or evening visits after 6pm are least crowded. We recommend booking 1-2 weeks ahead during peak season (June-August).",
  },
  {
    question: "What's the best time to visit the Colosseum in Rome?",
    answer:
      "Early morning (8:30am opening) or late afternoon (after 3pm) have the shortest queues. Underground and arena floor tours require advance booking and sell out weeks ahead. Avoid midday (11am-2pm) when cruise ship groups arrive. November-March is low season with fewer crowds. The Roman Forum and Palatine Hill are included with your Colosseum ticket.",
  },
  {
    question: "Do I need to book Burj Khalifa tickets in advance?",
    answer:
      "Yes, especially for sunset slots (5-7pm) which sell out days ahead. 'At The Top' (124th floor) is the standard experience at $45. 'At The Top SKY' (148th floor) costs $95 but includes refreshments and a dedicated lounge. Prime time tickets cost 25% more. Book 3-5 days ahead for weekends and holidays.",
  },
  {
    question: "How much do attraction tickets usually cost?",
    answer:
      "Prices vary by attraction: Major landmarks like Eiffel Tower or Colosseum cost $30-50. Museums range $15-30. Theme parks like Universal or Disney are $80-150. Guided tours typically $40-100. Booking online in advance often saves 10-20% compared to walk-up prices, plus you skip the ticket queue.",
  },
  {
    question: "Can I get a refund if I can't make my booking?",
    answer:
      "Most attractions offer free cancellation up to 24-48 hours before your visit. Look for 'Free Cancellation' badges when booking. Some special experiences (underground tours, VIP access) may have stricter policies. We recommend booking refundable tickets when possible, especially during uncertain travel periods.",
  },
  {
    question: "What attractions are best for families with kids?",
    answer:
      "Theme parks (Universal Studios, Disneyland, Legoland) are top family choices. Interactive museums like teamLab Borderless Tokyo and Science Museums are hits with all ages. Zoo and aquarium experiences work well. Skip long walking tours for young children. Look for 'family-friendly' filters and check age recommendations before booking.",
  },
];

const heroAnimationStyles = `
  @keyframes gradient-flow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes morph {
    0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
    50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
  }

  @keyframes rotate-slow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

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

  .morph-blob {
    animation: morph 8s ease-in-out infinite;
  }

  .rotate-slow {
    animation: rotate-slow 20s linear infinite;
  }

  .decorative-line {
    background: linear-gradient(90deg, transparent, #6443F4, #F24294, transparent);
    height: 2px;
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

function usePreferredMotion() {
  const prefersReducedMotion = useReducedMotion();
  return !prefersReducedMotion;
}

function DestinationChip({ destination, index }: { destination: Destination; index: number }) {
  const { t } = useTranslation();
  const shouldAnimate = usePreferredMotion();
  const { localePath } = useLocale();

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, scale: 0.8, y: 20 } : {}}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.05, duration: 0.4, ease: "easeOut" }}
      whileHover={shouldAnimate ? { scale: 1.05, y: -4 } : {}}
    >
      <Link href={localePath(`/attractions/list/${destination.slug}`)}>
        <div
          className="flex items-center gap-2.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-100 dark:border-slate-700 rounded-full pl-1.5 pr-4 py-1.5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 transition-all duration-300 hover:shadow-xl hover:border-[#6443F4]/30 cursor-pointer group"
          data-testid={`chip-destination-${destination.slug}`}
        >
          <img
            src={destination.image}
            alt={t("attractions.thingsToDoIn", {
              name: `${destination.name}, ${destination.country}`,
            })}
            title={`${destination.name} attractions`}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-[#6443F4]/20 group-hover:ring-[#6443F4]/50 transition-all"
            loading="lazy"
          />
          <div className="flex flex-col">
            <span className="text-slate-900 dark:text-white font-medium text-sm leading-tight">
              {destination.name}
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[10px] leading-tight">
              {t("attractions.chip.thingsToDo", { count: destination.count })}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Attractions() {
  const { t } = useTranslation();
  const { localePath } = useLocale();
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState("all");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const { data: destinationsData, isLoading: isLoadingDestinations } =
    useQuery<DestinationsApiResponse>({
      queryKey: ["/api/public/attraction-destinations"],
    });

  const destinations = destinationsData?.destinations ?? [];
  const totalAttractions = destinationsData?.total ?? 0;

  // Hero carousel state - matching homepage pattern
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const dest = HERO_ATTRACTIONS[currentIndex];
  const shouldAnimate = usePreferredMotion();

  // Preload next image
  useEffect(() => {
    const nextIndex = (currentIndex + 1) % HERO_ATTRACTIONS.length;
    const img = new Image();
    img.src = HERO_ATTRACTIONS[nextIndex].image;
  }, [currentIndex]);

  // Auto-rotation with animation timing - respects reduced motion
  useEffect(() => {
    if (!shouldAnimate) return;

    let animationTimeout: NodeJS.Timeout;
    const timer = setInterval(() => {
      setIsAnimating(true);
      animationTimeout = setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % HERO_ATTRACTIONS.length);
        setIsAnimating(false);
      }, 500);
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(animationTimeout);
    };
  }, [shouldAnimate]);

  const goTo = (index: number): void => {
    if (index !== currentIndex && !isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(index);
        setIsAnimating(false);
      }, 500);
    }
  };

  // SEO-focused title and description
  const pageTitle =
    "Things to Do & Attractions – Eiffel Tower, Colosseum, Burj Khalifa & More | TRAVI";
  const pageDescription = `Book skip-the-line tickets to top attractions worldwide. Eiffel Tower, Colosseum, Burj Khalifa, Statue of Liberty and ${totalAttractions > 0 ? `${totalAttractions.toLocaleString()}+` : "thousands of"} experiences. Best prices guaranteed.`;

  const runSearch = useCallback(
    async (value: string) => {
      if (value.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      const next: SearchResult[] = [];

      destinations
        .filter(
          d =>
            d.name.toLowerCase().includes(value.toLowerCase()) ||
            d.country.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 3)
        .forEach(d =>
          next.push({
            type: "city",
            id: d.slug,
            title: `Things to do in ${d.name}`,
            subtitle: `${d.country} - ${d.count} attractions`,
            href: `/attractions/list/${d.slug}`,
            image: d.image,
          })
        );

      try {
        const res = await fetch(
          `/api/public/tiqets/attractions?search=${encodeURIComponent(value)}&limit=8`
        );
        if (res.ok) {
          const data = await res.json();
          interface AttractionSearchResult {
            id: string;
            title: string;
            cityName: string;
            slug: string;
            tiqetsImages?: Array<{ medium?: string }>;
            tiqetsRating?: string | number;
            duration?: string;
            priceFrom?: number;
          }
          data.attractions?.forEach((a: AttractionSearchResult) => {
            next.push({
              type: "attraction",
              id: a.id,
              title: a.title,
              subtitle: a.cityName,
              href: `/${a.cityName.toLowerCase().replace(/\s+/g, "-")}/attractions/${a.slug}`,
              image: a.tiqetsImages?.[0]?.medium,
              rating: a.tiqetsRating ? Number(a.tiqetsRating) : undefined,
              duration: a.duration,
              price: a.priceFrom ? `From $${a.priceFrom}` : undefined,
            });
          });
        }
      } catch (error) {
        console.error(error);
      }

      setResults(next);
      setLoading(false);
    },
    [destinations]
  );

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const schemaData = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": CANONICAL_URL,
          url: CANONICAL_URL,
          name: pageTitle,
          description: pageDescription,
          inLanguage: "en",
        },
        {
          "@type": "FAQPage",
          "@id": `${CANONICAL_URL}#faq`,
          mainEntity: FAQ_DATA.map(faq => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        },
        ...(destinations.length > 0
          ? [
              {
                "@type": "ItemList",
                "@id": `${CANONICAL_URL}#destinations`,
                name: "Top Destinations for Attractions & Things to Do",
                itemListElement: destinations.map((d, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  item: {
                    "@type": "TouristDestination",
                    name: `Things to do in ${d.name}`,
                    description: `Explore attractions and experiences in ${d.name}, ${d.country}`,
                    url: `${BASE_URL}/attractions/${d.slug}`,
                  },
                })),
              },
            ]
          : []),
        {
          "@type": "ItemList",
          "@id": `${CANONICAL_URL}#featured-attractions`,
          name: "Featured Attractions Worldwide",
          itemListElement: HERO_ATTRACTIONS.map((a, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "TouristAttraction",
              name: a.name,
              description: a.title,
              image: `${BASE_URL}${a.image}`,
              isAccessibleForFree: false,
              publicAccess: true,
              touristType: ["Leisure", "Family", "Cultural"],
            },
          })),
        },
      ],
    }),
    [pageTitle, pageDescription, destinations]
  );

  return (
    <>
      <style>{heroAnimationStyles}</style>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={CANONICAL_URL} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Things to Do & Attractions – Skip-the-Line Tickets Worldwide"
        />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={CANONICAL_URL} />
        <meta
          property="og:image"
          content={`${BASE_URL}/attractions-hero/eiffel-tower-paris-attraction.webp`}
        />
        <meta
          property="og:image:alt"
          content="Eiffel Tower Paris - Skip-the-line tickets to top attractions worldwide"
        />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Things to Do & Attractions Worldwide" />
        <meta
          name="twitter:description"
          content="Skip-the-line tickets to Eiffel Tower, Colosseum, Burj Khalifa and more"
        />

        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      <SubtleSkyBackground />
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <PublicNav />

        <main className="relative">
          {/* Split-Screen Immersive Hero */}
          <section
            className="relative min-h-screen bg-slate-50 dark:bg-slate-950"
            data-testid="hero-section"
            aria-label={t("attractions.hero.sectionLabel")}
          >
            {/* Background Elements */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              aria-hidden="true"
            >
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
                    {/* Top Badge */}
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
                          data-testid="badge-attractions-count"
                        >
                          <span className="text-[#6443F4]">
                            {totalAttractions > 0 ? `${totalAttractions.toLocaleString()}+` : ""}
                          </span>{" "}
                          {totalAttractions > 0
                            ? t("attractions.hero.badge", {
                                count: totalAttractions,
                                cities: destinations.length,
                              })
                            : t("attractions.hero.badgeThousands")}
                        </span>
                      </div>
                    </motion.div>

                    {/* Main Headline - SEO focused */}
                    <motion.h1
                      className="mb-6"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    >
                      <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-2 font-chillax">
                        {t("attractions.hero.headlinePart1")}
                      </span>
                      <span className="relative inline-block">
                        <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.1] tracking-tight animated-gradient-text font-chillax">
                          {t("attractions.hero.headlinePart2")}
                        </span>
                        {/* Gradient underline accent */}
                        <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-[#6443F4] via-[#8B5CF6] to-[#F24294] rounded-full opacity-80" />
                      </span>
                    </motion.h1>

                    {/* Subtitle - Tourist focused */}
                    <motion.p
                      className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-8 font-light leading-relaxed max-w-lg"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.35 }}
                      dangerouslySetInnerHTML={{ __html: t("attractions.hero.description") }}
                    />

                    {/* Inline Stats Row (Homepage pattern) */}
                    <motion.dl
                      className="flex flex-wrap justify-center lg:justify-start items-center gap-4 sm:gap-6 md:gap-8 mb-8"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.5 }}
                    >
                      {[
                        {
                          num:
                            totalAttractions > 0
                              ? `${(totalAttractions / 1000).toFixed(1)}K+`
                              : "--",
                          label: t("attractions.stats.attractions"),
                          srLabel: t("attractions.srLabel.attractions", {
                            count: totalAttractions,
                          }),
                        },
                        {
                          num: destinations.length > 0 ? `${destinations.length}` : "--",
                          label: t("attractions.stats.cities"),
                          srLabel: t("attractions.srLabel.cities", { count: destinations.length }),
                        },
                        {
                          num: "4.9",
                          label: t("attractions.stats.rating"),
                          srLabel: t("attractions.srLabel.rating", { rating: 4.9 }),
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
                    </motion.dl>

                    {/* Search Bar */}
                    <motion.div
                      className="relative max-w-xl w-full mb-8"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.55 }}
                    >
                      <div className="absolute -inset-1 bg-gradient-to-r from-[#6443F4] via-[#8B5CF6] to-[#F24294] rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
                      <div className="relative flex items-center bg-white dark:bg-slate-800 backdrop-blur-xl rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <Search
                          className="w-5 h-5 text-[#6443F4] ml-5 shrink-0"
                          aria-hidden="true"
                        />
                        <Input
                          type="text"
                          placeholder={t("attractions.hero.searchPlaceholder")}
                          value={query}
                          onChange={e => setQuery(e.target.value)}
                          className="flex-1 h-14 md:h-16 border-0 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-0 text-base md:text-lg"
                          data-testid="input-hero-search"
                          aria-label={t("attractions.hero.searchAriaLabel")}
                        />
                        <Button
                          onClick={() =>
                            query.length >= 2 && navigate(`/search?q=${encodeURIComponent(query)}`)
                          }
                          className="mr-2 md:mr-3 rounded-lg bg-[#6443F4] text-white"
                          data-testid="button-hero-search"
                          aria-label={t("attractions.hero.searchButtonAriaLabel")}
                        >
                          {t("attractions.hero.searchButton")}
                        </Button>
                      </div>

                      {/* Search Results Dropdown */}
                      <AnimatePresence>
                        {results.length > 0 && query.length >= 2 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 max-h-[400px] overflow-y-auto"
                            data-testid="search-results-dropdown"
                          >
                            {results.map(result => (
                              <Link key={`${result.type}-${result.id}`} href={result.href}>
                                <div
                                  className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
                                  data-testid={`card-result-${result.type}-${result.id}`}
                                >
                                  {result.image && (
                                    <img
                                      src={result.image}
                                      alt={result.title}
                                      className="w-14 h-14 rounded-lg object-cover"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      {result.type === "city" ? (
                                        <MapPin className="w-4 h-4 text-[#6443F4]" />
                                      ) : (
                                        <Ticket className="w-4 h-4 text-[#F24294]" />
                                      )}
                                      <span
                                        className="font-medium text-slate-900 dark:text-white truncate"
                                        data-testid={`text-result-${result.id}`}
                                      >
                                        {result.title}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                      {result.subtitle}
                                    </p>
                                    {result.rating && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                        <span className="text-xs text-slate-600 dark:text-slate-300">
                                          {result.rating.toFixed(1)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-slate-400" />
                                </div>
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Popular Searches - Real tourist queries */}
                    <motion.div
                      className="flex flex-wrap gap-2 mb-8"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.58 }}
                    >
                      <span className="text-sm text-slate-400">
                        {t("attractions.search.popular")}
                      </span>
                      {POPULAR_SEARCHES.slice(0, 4).map(search => (
                        <button
                          key={search}
                          onClick={() => setQuery(search)}
                          className="px-3 py-1 text-sm rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#6443F4]/10 hover:text-[#6443F4] transition-colors"
                        >
                          {search}
                        </button>
                      ))}
                    </motion.div>

                    {/* CTA Buttons */}
                    <motion.div
                      className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                    >
                      <Link href={localePath("/attractions/list/paris")}>
                        <Button
                          className="rounded-full bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] hover:opacity-90 text-white px-8 py-6 text-base font-semibold shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
                          data-testid="button-explore-paris"
                          aria-label={t("attractions.search.thingsToDoIn", { city: "Paris" })}
                        >
                          {t("attractions.search.thingsToDoIn", { city: "Paris" })}
                          <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
                        </Button>
                      </Link>
                      <Link href="#browse-by-destination">
                        <Button
                          variant="outline"
                          className="rounded-full bg-white hover:bg-slate-50 text-slate-700 px-8 py-6 text-base font-medium border-2 border-slate-200 hover:border-slate-300 transition-colors duration-200"
                          data-testid="button-browse-destinations"
                          aria-label={t("attractions.sections.allDestinations")}
                        >
                          <Globe className="w-5 h-5 mr-2 text-[#6443F4]" />
                          {t("attractions.sections.allDestinations")}
                        </Button>
                      </Link>
                    </motion.div>

                    {/* Carousel Dots (Homepage pattern) */}
                    <motion.div
                      className="flex gap-2 mt-8 justify-center lg:justify-start"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.7 }}
                      role="tablist"
                      aria-label={t("attractions.search.ariaCarouselNav")}
                    >
                      {HERO_ATTRACTIONS.map((d, i) => (
                        <button
                          key={i}
                          onClick={() => goTo(i)}
                          role="tab"
                          aria-selected={currentIndex === i}
                          aria-label={t("attractions.search.ariaViewInCity", {
                            name: d.name,
                            city: d.city,
                          })}
                          className={cn(
                            "h-2.5 rounded-full border-none cursor-pointer transition-all duration-500",
                            currentIndex === i
                              ? "w-8 bg-gradient-to-r from-[#6443F4] to-[#8B5CF6]"
                              : "w-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300"
                          )}
                        />
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
                        className="bento-card relative flex-1 min-h-0 group bg-white dark:bg-slate-900 shadow-lg dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:shadow-[#6443F4]/15 hover:-translate-y-2"
                        role="region"
                        aria-label={t("attractions.gallery.ariaFeaturedAttraction")}
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
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              <span className="font-bold text-slate-800">4.8</span>
                              <span className="text-slate-500 text-sm">(47K+ reviews)</span>
                            </div>
                            <motion.div
                              className="relative px-4 py-2 rounded-full bg-gradient-to-r from-[#6443F4] to-[#F24294] text-white text-sm font-semibold shadow-lg"
                              animate={{ scale: [1, 1.02, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              {t("attractions.gallery.skipTheLine")}
                            </motion.div>
                          </div>

                          {/* Bottom Content */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: isAnimating ? 0 : 1, y: isAnimating ? 20 : 0 }}
                            transition={{ duration: 0.5 }}
                          >
                            {/* Location */}
                            <div className="flex items-center gap-2 text-white/80 mb-3">
                              <MapPin className="w-5 h-5" />
                              <span className="font-medium">{dest.city}</span>
                            </div>

                            {/* Title */}
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                              {dest.name}
                            </h2>

                            {/* SEO subtitle */}
                            <p className="text-white/70 text-sm mb-4">{dest.tagline}</p>

                            {/* Info Row */}
                            <div className="flex flex-wrap items-center gap-4 mb-6">
                              <div className="flex items-center gap-2 text-white/80">
                                <Clock className="w-5 h-5" />
                                <span>{t("attractions.gallery.duration")}</span>
                              </div>
                              <div className="flex items-center gap-2 text-white/80">
                                <Ticket className="w-5 h-5" />
                                <span>{dest.category}</span>
                              </div>
                            </div>

                            {/* Price and CTA */}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-white/60 text-sm">
                                  {t("attractions.gallery.priceFrom")}
                                </span>
                                <span className="text-3xl font-bold text-white ml-2">
                                  {dest.price}
                                </span>
                              </div>
                              <Link href={localePath(`/attractions/list/${dest.slug}`)}>
                                <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-slate-900 font-bold hover:bg-[#6443F4]/10 hover:text-[#6443F4] transition-all shadow-xl hover:shadow-2xl hover:scale-105 transform">
                                  {t("attractions.gallery.bookTickets")}
                                  <ArrowRight className="w-5 h-5" />
                                </button>
                              </Link>
                            </div>
                          </motion.div>
                        </div>
                      </div>

                      {/* Thumbnail Strip */}
                      <div
                        className="mt-4 flex justify-center gap-3 p-3 rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-xl dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700 flex-shrink-0"
                        role="tablist"
                        aria-label={t("attractions.gallery.ariaThumbnails")}
                      >
                        {HERO_ATTRACTIONS.slice(0, 5).map((attraction, i) => (
                          <button
                            key={i}
                            onClick={() => goTo(i)}
                            className={cn(
                              "thumb-item w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden ring-2 ring-offset-2 dark:ring-offset-slate-800 shadow-sm hover:shadow-lg hover:shadow-[#6443F4]/20",
                              currentIndex === i
                                ? "ring-[#6443F4] active"
                                : "ring-transparent hover:ring-[#6443F4]/50"
                            )}
                            data-testid={`thumbnail-${i}`}
                            role="tab"
                            aria-selected={currentIndex === i}
                            aria-label={t("attractions.gallery.ariaTicketsIn", {
                              name: attraction.name,
                              city: attraction.city,
                            })}
                          >
                            <img
                              src={attraction.image}
                              alt={`${attraction.name} ${attraction.city}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>

                      {/* Floating Info Cards */}
                      <motion.div
                        className="absolute -left-6 top-1/4 hidden lg:block"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                      >
                        <motion.div
                          className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xl border border-slate-100 dark:border-slate-700"
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center">
                              <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 dark:text-white">
                                {t("attractions.gallery.freeCancellation")}
                              </div>
                              <div className="text-sm text-slate-500">
                                {t("attractions.gallery.freeCancellationDesc")}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>

                      <motion.div
                        className="absolute -right-4 top-1/3 hidden xl:block"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 1 }}
                      >
                        <motion.div
                          className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xl border border-slate-100 dark:border-slate-700"
                          animate={{ y: [0, 10, 0] }}
                          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6443F4] to-[#8B5CF6] flex items-center justify-center">
                              <Ticket className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 dark:text-white">
                                {t("attractions.gallery.mobileTickets")}
                              </div>
                              <div className="text-sm text-slate-500">
                                {t("attractions.gallery.instantDelivery")}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Browse by Destination */}
          <section id="browse-by-destination" className="py-20 px-6 bg-white dark:bg-slate-950">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex items-center justify-between mb-10"
              >
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    {t("attractions.browse.title")}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-2">
                    {t("attractions.browse.desc")}
                  </p>
                </div>
                <Link href={localePath("/destinations")}>
                  <Button
                    variant="outline"
                    className="hidden sm:flex items-center gap-2 border-[#6443F4] text-[#6443F4] hover:bg-[#6443F4]/10"
                    data-testid="button-view-all-destinations"
                  >
                    {t("attractions.sections.allDestinations")}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </motion.div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {isLoadingDestinations ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-lg">
                      <Skeleton className="aspect-[4/3] w-full" />
                    </div>
                  ))
                ) : destinations.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <Globe className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">
                      {t("attractions.browse.noDestinations")}
                    </p>
                  </div>
                ) : (
                  destinations.map((dest, i) => (
                    <motion.div
                      key={dest.slug}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link href={localePath(`/attractions/list/${dest.slug}`)}>
                        <Card
                          className="group overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border-0"
                          data-testid={`destination-card-${dest.slug}`}
                        >
                          <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#6443F4]/20 to-[#8B5CF6]/20">
                            <img
                              src={dest.image}
                              alt={`Things to do in ${dest.name}, ${dest.country}`}
                              title={`${dest.name} attractions`}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              loading="lazy"
                              onError={e => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                              <h3 className="text-xl font-bold text-white">{dest.name}</h3>
                              <p className="text-white/80 text-sm flex items-center gap-1 mt-1">
                                <Ticket className="w-3.5 h-3.5" />
                                {t("attractions.browse.thingsToDo", { count: dest.count })}
                              </p>
                              <p className="text-white/60 text-xs mt-1">{dest.country}</p>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="mt-6 text-center sm:hidden">
                <Link href={localePath("/destinations")}>
                  <Button
                    variant="outline"
                    className="border-[#6443F4] text-[#6443F4] hover:bg-[#6443F4]/10"
                    data-testid="button-view-all-destinations-mobile"
                  >
                    {t("attractions.sections.allDestinations")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Features / Why Book Section */}
          <section className="py-16 px-6 bg-slate-50 dark:bg-slate-900/50">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <Badge className="mb-4 bg-[#6443F4]/10 text-[#6443F4] border-0">
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                  {t("attractions.sections.whyBookBadge")}
                </Badge>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                  {t("attractions.sections.whyBookTitle")}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-xl mx-auto">
                  {t("attractions.sections.whyBookDesc")}
                </p>
              </motion.div>

              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {ATTRACTION_TYPES.map(type => (
                  <Button
                    key={type.id}
                    variant={activeType === type.id ? "default" : "outline"}
                    className={cn(
                      "rounded-full",
                      activeType === type.id
                        ? "bg-[#6443F4] hover:bg-[#5539d4] text-white"
                        : "border-slate-300 dark:border-slate-600 hover:border-[#6443F4] hover:text-[#6443F4]"
                    )}
                    onClick={() => {
                      setActiveType(type.id);
                      if (type.searchTerm) {
                        setQuery(type.searchTerm);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      } else {
                        setQuery("");
                        setResults([]);
                      }
                    }}
                    data-testid={`filter-type-${type.id}`}
                  >
                    {t(type.labelKey)}
                  </Button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    titleKey: "attractions.features.skipTheLine",
                    descKey: "attractions.features.skipTheLineDesc",
                    icon: Ticket,
                    color: "bg-[#6443F4]",
                  },
                  {
                    titleKey: "attractions.features.mobileTickets",
                    descKey: "attractions.features.mobileTicketsDesc",
                    icon: Sparkles,
                    color: "bg-[#8B5CF6]",
                  },
                  {
                    titleKey: "attractions.features.freeCancellation",
                    descKey: "attractions.features.freeCancellationDesc",
                    icon: Globe2,
                    color: "bg-emerald-500",
                  },
                ].map((feature, i) => (
                  <motion.div
                    key={feature.titleKey}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="p-6 h-full bg-white dark:bg-slate-800 border-0 shadow-lg">
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                          feature.color
                        )}
                      >
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        {t(feature.titleKey)}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400">{t(feature.descKey)}</p>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ Section - Tourist focused questions */}
          <section className="py-20 px-6 bg-white dark:bg-slate-950">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                  {t("attractions.sections.faq")}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  {t("attractions.sections.faqDesc")}
                </p>
              </motion.div>

              <div className="space-y-4">
                {FAQ_DATA.map((faq, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      className={cn(
                        "overflow-hidden transition-all duration-300 border-0 shadow-md",
                        expandedFaq === i && "shadow-lg ring-2 ring-[#6443F4]/20"
                      )}
                    >
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                        className="w-full flex items-center justify-between p-6 text-left"
                        data-testid={`faq-question-${i}`}
                      >
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white pr-4">
                          {faq.question}
                        </h3>
                        <ChevronDown
                          className={cn(
                            "w-5 h-5 text-[#6443F4] transition-transform flex-shrink-0",
                            expandedFaq === i && "rotate-180"
                          )}
                        />
                      </button>
                      <AnimatePresence>
                        {expandedFaq === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="px-6 pb-6">
                              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                {faq.answer}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Internal Links Section - Important for SEO */}
          <section className="py-10 px-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                {t("attractions.exploreLinks.title")}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Link
                  href={localePath("/destinations")}
                  className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  <Globe className="w-5 h-5 text-[#6443F4]" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("attractions.sections.allDestinations")}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
                </Link>
                <Link
                  href={localePath("/articles")}
                  className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  <TrendingUp className="w-5 h-5 text-[#6443F4]" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("attractions.exploreLinks.travelNews")}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
                </Link>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 px-6 bg-gradient-to-br from-[#6443F4] via-[#8B5CF6] to-[#6443F4]">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  {t("attractions.cta.title")}
                </h2>
                <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                  {t("attractions.cta.desc")}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href={localePath("/attractions/list/paris")}>
                    <Button
                      size="lg"
                      className="bg-white text-[#6443F4] hover:bg-white/90 font-semibold px-8"
                      data-testid="button-paris-attractions"
                    >
                      <Ticket className="w-5 h-5 mr-2" />
                      {t("attractions.cta.parisAttractions")}
                    </Button>
                  </Link>
                  <Link href={localePath("/attractions/list/rome")}>
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white text-white hover:bg-white/10 font-semibold px-8"
                      data-testid="button-rome-attractions"
                    >
                      <Ticket className="w-5 h-5 mr-2" />
                      {t("attractions.cta.romeAttractions")}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <PublicFooter />
      </div>

      {/* Hidden SEO Navigation - Crawlable links for search engines */}
      <nav className="sr-only" aria-label="All attraction destinations">
        <h2>Things to Do by Destination</h2>
        <ul>
          {destinations.map(dest => (
            <li key={dest.slug}>
              <a href={localePath(`/attractions/list/${dest.slug}`)}>
                Things to do in {dest.name}, {dest.country} | {dest.count} attractions
              </a>
            </li>
          ))}
        </ul>

        <h3>Featured Attractions</h3>
        <ul>
          {HERO_ATTRACTIONS.map(attraction => (
            <li key={attraction.name}>
              <a href={localePath(`/attractions/${attraction.slug}`)}>
                {attraction.title} - {attraction.tagline} in {attraction.city}
              </a>
            </li>
          ))}
        </ul>

        <h3>Related Travel Guides</h3>
        <ul>
          <li>
            <a href={localePath("/destinations")}>Complete Travel Guides by City</a>
          </li>
          <li>
            <a href={localePath("/articles")}>Latest Travel News and Tips</a>
          </li>
        </ul>
      </nav>
    </>
  );
}

// Data Source: Tiqets Database API
// Structure ready for: attractions, hotels, restaurants
// Status: Live - Tiqets Integration

import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  MapPin,
  Star,
  Clock,
  Users,
  X,
  ChevronRight,
  ChevronLeft,
  Ticket,
  Building2,
  Camera,
  TreePine,
  Music,
  Landmark,
  Sparkles,
  Lightbulb,
  Waves,
  Ship,
  Mountain,
  Calendar,
  Train,
  CreditCard,
  Eye,
  ArrowUp,
  HelpCircle,
  Loader2,
  Globe2,
} from "lucide-react";
import { motion } from "framer-motion";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";

interface TiqetsImage {
  large?: string;
  medium?: string;
  small?: string;
  extra_large?: string;
  alt_text?: string;
}

interface TiqetsApiAttraction {
  id: string;
  tiqetsId: string;
  title: string;
  slug: string;
  seoSlug?: string;
  cityName: string;
  venueName: string;
  duration: string;
  productUrl: string;
  status: string;
  tiqetsImages?: TiqetsImage[];
  tiqetsRating?: string;
  tiqetsReviewCount?: number;
}

interface TiqetsApiResponse {
  attractions: TiqetsApiAttraction[];
  total: number;
  cities: string[];
}

const DESTINATION_HERO_IMAGES: Record<string, string> = {};

interface DestinationMetadata {
  slug: string;
  name: string;
  country: string;
  image?: string;
  summary?: string;
  attractionCount?: number;
}

const DESTINATION_ANSWER_CAPSULES: Record<string, { question: string; answer: string }> = {};

const DESTINATION_FAQS: Record<string, { question: string; answer: string }[]> = {};

const DEFAULT_TIPS: { title: string; icon: string; content: string }[] = [];

interface Attraction {
  id: string;
  slug?: string;
  seoSlug?: string;
  name: string;
  nameLocal?: string;
  image: string;
  category: string;
  district?: string;
  duration: string;
  rating: number;
  reviewCount: number;
  description: string;
  audience: string[];
  tags: string[];
  status?: string;
  topRank?: number;
}

interface DestinationData {
  slug: string;
  name: string;
  nameLocal: string;
  country: string;
  heroImage: string;
  totalAttractions: number;
  answerCapsule: {
    question: string;
    answer: string;
  };
  categoryStats: {
    category: string;
    categoryKey: string;
    count: number;
    topAttraction: string;
    avgDuration: string;
  }[];
  attractions: Attraction[];
  top10: Attraction[];
  tips: {
    title: string;
    icon: string;
    content: string;
  }[];
  faq: {
    question: string;
    answer: string;
  }[];
}

const CATEGORY_DURATION_DEFAULTS: Record<string, string> = {
  "observation-deck": "1-2 hours",
  landmark: "2-3 hours",
  museum: "2-3 hours",
  aquarium: "2-3 hours",
  "desert-safari": "5-6 hours",
  experience: "2-3 hours",
  "water-park": "4-6 hours",
  "theme-park": "Full day",
  cruise: "1-2 hours",
  show: "2-3 hours",
  tour: "3-4 hours",
  zoo: "3-4 hours",
  garden: "1-2 hours",
  church: "1 hour",
  neighborhood: "2-3 hours",
  entertainment: "2-3 hours",
};

const CATEGORY_LABELS: Record<string, string> = {
  "observation-deck": "Observation Decks",
  landmark: "Landmarks",
  museum: "Museums",
  aquarium: "Aquariums",
  "desert-safari": "Desert Safaris",
  experience: "Experiences",
  "water-park": "Water Parks",
  "theme-park": "Theme Parks",
  cruise: "Cruises",
  show: "Shows",
  tour: "Tours",
  zoo: "Zoos & Wildlife",
  garden: "Gardens",
  church: "Churches",
  neighborhood: "Neighborhoods",
  entertainment: "Entertainment",
};

const heroAnimationStyles = `
  .hero-gradient-text {
    background: linear-gradient(
      135deg,
      #6443F4 0%,
      #8B5CF6 20%,
      #A78BFA 40%,
      #6443F4 60%,
      #8B5CF6 80%,
      #6443F4 100%
    );
    background-size: 300% 300%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradient-flow 6s ease infinite;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

function slugToCityName(slug: string): string {
  return slug
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function parseDuration(duration: string): string {
  if (!duration || duration === "00:00") return "2-3 hours";
  const [hours, minutes] = duration.split(":").map(Number);
  const totalMinutes = (hours || 0) * 60 + (minutes || 0);

  if (totalMinutes < 60) return "30 min - 1 hour";
  if (totalMinutes <= 120) return "1-2 hours";
  if (totalMinutes <= 180) return "2-3 hours";
  if (totalMinutes <= 240) return "3-4 hours";
  if (totalMinutes <= 360) return "4-6 hours";
  return "Full day";
}

function inferCategory(title: string, venueName: string): string {
  const combined = `${title} ${venueName}`.toLowerCase();

  if (combined.includes("museum")) return "museum";
  if (combined.includes("tower") || combined.includes("observation") || combined.includes("view"))
    return "observation-deck";
  if (combined.includes("aquarium") || combined.includes("sea life")) return "aquarium";
  if (combined.includes("zoo") || combined.includes("safari") || combined.includes("wildlife"))
    return "zoo";
  if (combined.includes("theme park") || combined.includes("amusement")) return "theme-park";
  if (combined.includes("water park")) return "water-park";
  if (combined.includes("cruise") || combined.includes("boat")) return "cruise";
  if (combined.includes("show") || combined.includes("theatre") || combined.includes("theater"))
    return "show";
  if (combined.includes("tour") || combined.includes("walking")) return "tour";
  if (combined.includes("garden") || combined.includes("park") || combined.includes("botanical"))
    return "garden";
  if (
    combined.includes("church") ||
    combined.includes("cathedral") ||
    combined.includes("mosque") ||
    combined.includes("temple")
  )
    return "church";
  if (combined.includes("palace") || combined.includes("castle") || combined.includes("fort"))
    return "landmark";

  return "experience";
}

function transformApiResponse(
  apiResponse: TiqetsApiResponse,
  slug: string,
  destinationMeta: DestinationMetadata | null
): DestinationData | null {
  if (!apiResponse || !apiResponse.attractions || apiResponse.attractions.length === 0) {
    return null;
  }

  const destinationInfo = destinationMeta || {
    name: slugToCityName(slug),
    country: "Unknown",
  };

  const transformedAttractions: Attraction[] = apiResponse.attractions.map((a, index) => {
    const category = inferCategory(a.title, a.venueName);
    const tiqetsImages = a.tiqetsImages || [];
    const image = tiqetsImages[0]?.large || tiqetsImages[0]?.medium || "/placeholder-image.svg";
    return {
      id: a.id,
      slug: a.slug,
      seoSlug: a.seoSlug,
      name: a.title,
      image,
      category,
      duration: parseDuration(a.duration),
      rating: a.tiqetsRating ? parseFloat(a.tiqetsRating) : 4.5,
      reviewCount: a.tiqetsReviewCount || 100,
      description: a.venueName || `Experience ${a.title} in ${a.cityName}`,
      audience: ["families", "couples", "solo"],
      tags: [],
      status: a.status,
      topRank: index < 10 ? index + 1 : undefined,
    };
  });

  const categoryGroups: Record<string, Attraction[]> = {};
  transformedAttractions.forEach(a => {
    if (!categoryGroups[a.category]) {
      categoryGroups[a.category] = [];
    }
    categoryGroups[a.category].push(a);
  });

  const categoryStats = Object.entries(categoryGroups)
    .map(([cat, attractions]) => {
      const topAttraction = attractions[0];
      return {
        category: CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
        categoryKey: cat,
        count: attractions.length,
        topAttraction: topAttraction?.name || "",
        avgDuration: CATEGORY_DURATION_DEFAULTS[cat] || "2-3 hours",
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const top10 = transformedAttractions
    .filter(a => a.topRank)
    .sort((a, b) => (a.topRank || 99) - (b.topRank || 99));

  return {
    slug,
    name: destinationInfo.name,
    nameLocal: destinationInfo.name,
    country: destinationInfo.country,
    heroImage:
      DESTINATION_HERO_IMAGES[slug] ||
      "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1600",
    totalAttractions: apiResponse.total || transformedAttractions.length,
    answerCapsule: DESTINATION_ANSWER_CAPSULES[slug] || {
      question: `What are the best attractions in ${destinationInfo.name}?`,
      answer: `${destinationInfo.name} offers a variety of world-class attractions for visitors of all interests.`,
    },
    categoryStats,
    attractions: transformedAttractions,
    top10,
    tips: DEFAULT_TIPS,
    faq: DESTINATION_FAQS[slug] || [
      {
        question: `How many days do I need in ${destinationInfo.name}?`,
        answer: `Plan 3-5 days to see the major attractions in ${destinationInfo.name}.`,
      },
      {
        question: `What are the best attractions in ${destinationInfo.name}?`,
        answer: `The top attractions include museums, landmarks, and unique local experiences.`,
      },
      {
        question: `Do I need to book tickets in advance?`,
        answer: `Yes, advance booking is recommended for popular attractions to skip the lines.`,
      },
    ],
  };
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "museum":
      return Building2;
    case "landmark":
      return Landmark;
    case "observation-deck":
      return Eye;
    case "theme-park":
      return Sparkles;
    case "water-park":
      return Waves;
    case "aquarium":
      return Waves;
    case "zoo":
      return TreePine;
    case "tour":
      return Camera;
    case "cruise":
      return Ship;
    case "show":
      return Music;
    case "experience":
      return Sparkles;
    case "desert-safari":
      return Mountain;
    case "church":
      return Building2;
    case "garden":
      return TreePine;
    case "neighborhood":
      return MapPin;
    case "entertainment":
      return Music;
    default:
      return Sparkles;
  }
}

function getTipIcon(icon: string) {
  switch (icon) {
    case "ticket":
      return Ticket;
    case "calendar":
      return Calendar;
    case "train":
      return Train;
    case "credit-card":
      return CreditCard;
    default:
      return Lightbulb;
  }
}

function matchesDuration(attractionDuration: string, filter: string): boolean {
  if (filter === "all") return true;
  const hours = attractionDuration.toLowerCase();
  if (filter === "short") return hours.includes("1 hour") || hours.includes("30 min");
  if (filter === "medium")
    return hours.includes("1-2") || hours.includes("2-3") || hours.includes("2 hour");
  if (filter === "long")
    return (
      hours.includes("3-4") ||
      hours.includes("4-6") ||
      hours.includes("full day") ||
      hours.includes("3+")
    );
  return true;
}

function DestinationAttractionsPage() {
  const { destination } = useParams<{ destination: string }>();
  const { localePath } = useLocale();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const cityName = destination ? slugToCityName(destination) : "";

  const { data: destinationsApiResponse } = useQuery<{
    destinations: DestinationMetadata[];
    total: number;
  }>({
    queryKey: ["/api/public/attraction-destinations"],
    staleTime: 1000 * 60 * 10,
  });

  const destinationMeta = useMemo(() => {
    if (!destination || !destinationsApiResponse?.destinations) return null;
    return destinationsApiResponse.destinations.find(d => d.slug === destination) || null;
  }, [destination, destinationsApiResponse]);

  const {
    data: apiResponse,
    isLoading,
    error,
  } = useQuery<TiqetsApiResponse>({
    queryKey: ["/api/public/tiqets/attractions", { city: cityName, limit: 50 }],
    queryFn: async () => {
      const params = new URLSearchParams({ city: cityName, limit: "50" });
      const response = await fetch(`/api/public/tiqets/attractions?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch attractions");
      }
      return response.json();
    },
    enabled: !!destination && !!cityName,
  });

  const data = useMemo(() => {
    if (!destination || !apiResponse) return null;
    return transformApiResponse(apiResponse, destination, destinationMeta);
  }, [destination, apiResponse, destinationMeta]);

  const filteredAttractions = useMemo(() => {
    if (!data) return [];
    return data.attractions.filter(attraction => {
      if (categoryFilter !== "all" && attraction.category !== categoryFilter) return false;
      return true;
    });
  }, [data, categoryFilter]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = 350;
      carouselRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const currentYear = new Date().getFullYear();

  if (isLoading) {
    return (
      <>
        <style>{heroAnimationStyles}</style>
        <div className="min-h-screen bg-white dark:bg-slate-950">
          <SubtleSkyBackground />
          <PublicNav />

          <main className="relative z-10">
            <section
              className="relative pt-24 pb-16 md:pt-32 md:pb-24"
              data-testid="section-loading-hero"
            >
              <div className="container mx-auto px-4 md:px-6 lg:px-8">
                <nav
                  className="flex items-center gap-2 text-slate-500 text-sm mb-8"
                  data-testid="breadcrumbs-loading"
                >
                  <Link href={localePath("/")} className="hover:text-[#6443F4] transition-colors">
                    Home
                  </Link>
                  <ChevronRight className="w-4 h-4" />
                  <Link
                    href={localePath("/attractions")}
                    className="hover:text-[#6443F4] transition-colors"
                  >
                    Attractions
                  </Link>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-slate-900 dark:text-white font-medium">{cityName}</span>
                </nav>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                  <span className="hero-gradient-text">{cityName}</span>
                  <span className="text-slate-900 dark:text-white"> Attractions</span>
                </h1>
              </div>
            </section>

            <section className="py-16 md:py-24">
              <div className="container mx-auto px-4 md:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto text-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-24 h-24 rounded-full bg-[#6443F4]/10 flex items-center justify-center mx-auto mb-8"
                  >
                    <Loader2 className="w-12 h-12 text-[#6443F4] animate-spin" />
                  </motion.div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
                    Loading Attractions
                  </h2>
                  <p className="text-lg text-slate-600 dark:text-slate-400">
                    Fetching the best attractions in {cityName}...
                  </p>
                </div>
              </div>
            </section>
          </main>

          <PublicFooter />
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <style>{heroAnimationStyles}</style>
        <div className="min-h-screen bg-white dark:bg-slate-950">
          <SubtleSkyBackground />
          <PublicNav />

          <main className="relative z-10">
            <section
              className="relative pt-24 pb-16 md:pt-32 md:pb-24"
              data-testid="section-error-hero"
            >
              <div className="container mx-auto px-4 md:px-6 lg:px-8">
                <nav
                  className="flex items-center gap-2 text-slate-500 text-sm mb-8"
                  data-testid="breadcrumbs-error"
                >
                  <Link href={localePath("/")} className="hover:text-[#6443F4] transition-colors">
                    Home
                  </Link>
                  <ChevronRight className="w-4 h-4" />
                  <Link
                    href={localePath("/attractions")}
                    className="hover:text-[#6443F4] transition-colors"
                  >
                    Attractions
                  </Link>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-slate-900 dark:text-white font-medium">{cityName}</span>
                </nav>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                  <span className="hero-gradient-text">{cityName}</span>
                  <span className="text-slate-900 dark:text-white"> Attractions</span>
                </h1>
              </div>
            </section>

            <section className="py-16 md:py-24">
              <div className="container mx-auto px-4 md:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto text-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-24 h-24 rounded-full bg-[#6443F4]/10 flex items-center justify-center mx-auto mb-8"
                  >
                    <MapPin className="w-12 h-12 text-[#6443F4]" />
                  </motion.div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
                    No Attractions Found
                  </h2>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                    We don't have attraction data for {cityName} yet. Check back soon or explore
                    other destinations.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => (window.location.href = localePath("/attractions"))}
                      data-testid="button-browse-destinations"
                    >
                      Browse All Destinations
                    </Button>
                    <Button
                      onClick={() => (window.location.href = localePath("/"))}
                      className="bg-[#6443F4] hover:bg-[#5539d4]"
                      data-testid="button-return-home"
                    >
                      Return Home
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </main>

          <PublicFooter />
        </div>
      </>
    );
  }

  const clearFilters = () => {
    setCategoryFilter("all");
  };

  const hasActiveFilters = categoryFilter !== "all";

  const getCategoryCount = (category: string) => {
    if (category === "all") return data.attractions.length;
    return data.attractions.filter(a => a.category === category).length;
  };

  const pageTitle = `${data.name} Attractions: Complete Guide ${currentYear} | TRAVI`;
  const pageDescription = `Discover ${data.totalAttractions}+ attractions in ${data.name}. Find museums, landmarks, tours, theme parks and hidden gems. Skip-the-line tickets and insider tips.`;
  const canonicalUrl = `https://travi.world/attractions/list/${data.slug}`;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map(item => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://travi.world" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Attractions",
        item: "https://travi.world/attractions",
      },
      { "@type": "ListItem", position: 3, name: `${data.name} Attractions`, item: canonicalUrl },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Top Attractions in ${data.name}`,
    itemListElement: data.top10.slice(0, 10).map((attraction, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "TouristAttraction",
        name: attraction.name,
        description: attraction.description,
        image: attraction.image,
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: attraction.rating,
          reviewCount: attraction.reviewCount,
        },
      },
    })),
  };

  const ogImage = data.top10[0]?.image || data.attractions[0]?.image || "/placeholder-image.svg";

  return (
    <>
      <style>{heroAnimationStyles}</style>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="TRAVI" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@traviworld" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-white dark:bg-slate-950">
        <SubtleSkyBackground />
        <PublicNav />

        <main className="relative z-10">
          {/* Hero Section with TRAVI Purple Design */}
          <section
            className="relative pt-24 pb-16 md:pt-32 md:pb-24"
            data-testid="section-destination-hero"
          >
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              {/* Breadcrumbs */}
              <motion.nav
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2 text-slate-500 text-sm mb-8"
                data-testid="breadcrumbs"
                aria-label="Breadcrumb"
              >
                <Link
                  href={localePath("/")}
                  className="hover:text-[#6443F4] transition-colors"
                  data-testid="link-breadcrumb-home"
                >
                  Home
                </Link>
                <ChevronRight className="w-4 h-4" />
                <Link
                  href={localePath("/attractions")}
                  className="hover:text-[#6443F4] transition-colors"
                  data-testid="link-breadcrumb-attractions"
                >
                  Attractions
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-slate-900 dark:text-white font-medium">{data.name}</span>
              </motion.nav>

              {/* Hero Title with Animated Gradient */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="max-w-4xl"
              >
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
                  data-testid="heading-destination"
                >
                  <span className="hero-gradient-text">{data.name}</span>
                  <span className="text-slate-900 dark:text-white"> Attractions</span>
                </h1>

                <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl">
                  Discover {data.totalAttractions}+ things to do in {data.name} — from iconic
                  landmarks to hidden gems
                </p>

                {/* Stats Display */}
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#6443F4]/10 border border-[#6443F4]/20">
                    <Ticket className="w-5 h-5 text-[#6443F4]" />
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {data.totalAttractions}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">Attractions</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#6443F4]/10 border border-[#6443F4]/20">
                    <Globe2 className="w-5 h-5 text-[#6443F4]" />
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {data.categoryStats.length}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">Categories</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#6443F4]/10 border border-[#6443F4]/20">
                    <MapPin className="w-5 h-5 text-[#6443F4]" />
                    <span className="text-slate-600 dark:text-slate-400">{data.country}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Answer Capsule Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="py-8 md:py-12"
            data-testid="section-answer-capsule"
          >
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <Card className="max-w-4xl mx-auto bg-gradient-to-br from-[#6443F4]/5 to-white dark:from-slate-800 dark:to-slate-900 border border-[#6443F4]/20 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#6443F4]/10 flex items-center justify-center">
                      <HelpCircle className="w-6 h-6 text-[#6443F4]" />
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-3">
                        {data.answerCapsule.question}
                      </h2>
                      <p className="text-slate-700 dark:text-slate-300 text-base md:text-lg leading-relaxed">
                        {data.answerCapsule.answer}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          {/* Category Stats Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="py-8 md:py-10"
            data-testid="section-quick-stats"
          >
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-6">
                {data.name} Attractions by Category
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {data.categoryStats.map((stat, index) => {
                  const CategoryIcon = getCategoryIcon(stat.categoryKey);
                  return (
                    <motion.button
                      key={stat.categoryKey}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setCategoryFilter(stat.categoryKey)}
                      className={`flex-shrink-0 flex items-center gap-3 px-5 py-4 rounded-xl border-2 transition-all duration-200 ${
                        categoryFilter === stat.categoryKey
                          ? "border-[#6443F4] bg-[#6443F4]/10"
                          : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-[#6443F4]/50 hover:shadow-md"
                      }`}
                      data-testid={`stat-card-${stat.categoryKey}`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          categoryFilter === stat.categoryKey
                            ? "bg-[#6443F4] text-white"
                            : "bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        <CategoryIcon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                          {stat.count}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {stat.category}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.section>

          {/* Sticky Filter Bar */}
          <section
            className="py-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-y border-slate-200 dark:border-slate-700 sticky top-0 z-50"
            data-testid="section-filters"
          >
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    categoryFilter === "all"
                      ? "bg-[#6443F4] text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-[#6443F4]/10 hover:text-[#6443F4]"
                  }`}
                  data-testid="filter-chip-all"
                >
                  <Sparkles className="w-4 h-4" />
                  All
                  <span className="ml-1 opacity-80">{getCategoryCount("all")}</span>
                </button>

                {data.categoryStats.slice(0, 5).map(stat => {
                  const CategoryIcon = getCategoryIcon(stat.categoryKey);
                  return (
                    <button
                      key={stat.categoryKey}
                      onClick={() => setCategoryFilter(stat.categoryKey)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        categoryFilter === stat.categoryKey
                          ? "bg-[#6443F4] text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-[#6443F4]/10 hover:text-[#6443F4]"
                      }`}
                      data-testid={`filter-chip-${stat.categoryKey}`}
                    >
                      <CategoryIcon className="w-4 h-4" />
                      {stat.category}
                      <span className="ml-1 opacity-80">{stat.count}</span>
                    </button>
                  );
                })}

                <div className="flex items-center gap-3 ml-auto">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {filteredAttractions.length} of {data.attractions.length}
                  </span>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#6443F4] hover:bg-[#6443F4]/10 rounded-full transition-colors"
                      data-testid="button-clear-filters"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Top 10 Carousel Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="py-10 md:py-14 bg-gradient-to-br from-[#6443F4]/5 via-transparent to-[#8B5CF6]/5"
            data-testid="section-top10"
          >
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                  Top 10 Must-Visit in {data.name}
                </h2>
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => scrollCarousel("left")}
                    className="rounded-full border-[#6443F4]/30 hover:border-[#6443F4] hover:bg-[#6443F4]/10"
                    data-testid="carousel-left"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => scrollCarousel("right")}
                    className="rounded-full border-[#6443F4]/30 hover:border-[#6443F4] hover:bg-[#6443F4]/10"
                    data-testid="carousel-right"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div
                ref={carouselRef}
                className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
              >
                {data.top10.map((attraction, index) => (
                  <motion.a
                    key={attraction.id}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    href={localePath(
                      `/${data.slug}/attractions/${attraction.seoSlug || attraction.slug || attraction.id}`
                    )}
                    className="flex-shrink-0 w-[300px] md:w-[340px] group"
                    data-testid={`top10-card-${attraction.id}`}
                  >
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
                      <img
                        src={attraction.image}
                        alt={`${attraction.name} - top attraction`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        width={400}
                        height={300}
                        loading="lazy"
                        decoding="async"
                        onError={e => {
                          (e.target as HTMLImageElement).src = "/cards/paris.webp";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                      <div
                        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-[#6443F4] text-white font-bold flex items-center justify-center text-lg shadow-lg"
                        aria-hidden="true"
                      >
                        #{index + 1}
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
                          {attraction.name}
                        </h3>
                        <p className="text-sm text-white/80 line-clamp-2">
                          {attraction.description}
                        </p>
                      </div>
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Attractions Grid Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="py-10 md:py-14"
            id="section-attractions-grid"
            data-testid="section-attractions-grid"
          >
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-8">
                All Attractions in {data.name}
              </h2>

              {filteredAttractions.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#6443F4]/10 flex items-center justify-center">
                    <HelpCircle className="w-8 h-8 text-[#6443F4]" />
                  </div>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
                    No attractions match your filters
                  </p>
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    className="border-[#6443F4] text-[#6443F4] hover:bg-[#6443F4]/10"
                    data-testid="button-clear-filters-empty"
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAttractions.map((attraction, index) => {
                    const CategoryIcon = getCategoryIcon(attraction.category);
                    return (
                      <motion.div
                        key={attraction.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: (index % 6) * 0.05 }}
                      >
                        <Card
                          className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-slate-800"
                          data-category={attraction.category}
                          data-testid={`card-attraction-${attraction.id}`}
                        >
                          <div className="aspect-[16/10] relative overflow-hidden">
                            <img
                              src={attraction.image}
                              alt={`${attraction.name} - attraction to visit`}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              width={400}
                              height={250}
                              loading="lazy"
                              decoding="async"
                              onError={e => {
                                (e.target as HTMLImageElement).src = "/cards/paris.webp";
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                              {attraction.topRank && (
                                <Badge className="bg-[#6443F4] text-white border-0 font-bold">
                                  TOP {attraction.topRank}
                                </Badge>
                              )}
                              <Badge className="bg-[#6443F4]/10 text-[#6443F4] border border-[#6443F4]/20 backdrop-blur-sm">
                                <CategoryIcon className="w-3 h-3 mr-1" />
                                {CATEGORY_LABELS[attraction.category] || attraction.category}
                              </Badge>
                            </div>

                            <div className="absolute bottom-3 left-3 right-3">
                              <h3 className="text-xl font-bold text-white leading-tight">
                                {attraction.name}
                              </h3>
                              {attraction.nameLocal && (
                                <span className="text-sm text-white/80">
                                  ({attraction.nameLocal})
                                </span>
                              )}
                            </div>
                          </div>

                          <CardContent className="p-5">
                            <div className="flex items-center gap-4 mb-3">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-[#6443F4] fill-[#6443F4]" />
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {attraction.rating}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 text-sm">
                                  ({(attraction.reviewCount / 1000).toFixed(1)}k reviews)
                                </span>
                              </div>
                            </div>

                            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-4">
                              {attraction.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 mb-4">
                              <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                                <Clock className="w-4 h-4" />
                                {attraction.duration}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                                <Users className="w-4 h-4" />
                                Families, Couples
                              </div>
                            </div>

                            <a
                              href={localePath(
                                `/${data.slug}/attractions/${attraction.seoSlug || attraction.slug || attraction.id}`
                              )}
                              className="flex items-center gap-1 text-[#6443F4] font-medium hover:underline transition-colors group/link"
                              data-testid={`link-details-${attraction.id}`}
                            >
                              View Details
                              <ChevronRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                            </a>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.section>

          {/* Tips Section */}
          {data.tips.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="py-10 md:py-14 bg-gradient-to-br from-[#6443F4]/5 via-transparent to-[#8B5CF6]/5"
              data-testid="section-tips"
            >
              <div className="container mx-auto px-4 md:px-6 lg:px-8">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-8">
                  Tips for Visiting {data.name} Attractions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                  {data.tips.map((tip, index) => {
                    const TipIcon = getTipIcon(tip.icon);
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card
                          className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
                          data-testid={`tip-card-${index}`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#6443F4]/10 flex items-center justify-center">
                              <TipIcon className="w-6 h-6 text-[#6443F4]" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                                {tip.title}
                              </h3>
                              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                {tip.content}
                              </p>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          )}

          {/* FAQ Accordion Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="py-10 md:py-14"
            data-testid="section-faq"
          >
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-8">
                Frequently Asked Questions
              </h2>
              <div className="max-w-3xl">
                <Accordion type="single" collapsible className="space-y-3">
                  {data.faq.map((item, index) => (
                    <AccordionItem
                      key={index}
                      value={`faq-${index}`}
                      className="bg-gradient-to-br from-[#6443F4]/5 to-white dark:from-slate-800 dark:to-slate-900 rounded-xl border border-[#6443F4]/10 px-6 overflow-hidden"
                      data-testid={`faq-item-${index}`}
                    >
                      <AccordionTrigger className="text-left py-5 hover:no-underline group">
                        <span className="font-semibold text-slate-900 dark:text-white pr-4 group-hover:text-[#6443F4] transition-colors">
                          {item.question}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-5 text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </motion.section>

          {/* CTA Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="py-16 md:py-20 bg-gradient-to-br from-[#6443F4] via-[#8B5CF6] to-[#6443F4]"
            data-testid="section-cta"
          >
            <div className="container mx-auto px-4 md:px-6 lg:px-8 text-center">
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
                Ready to Explore {data.name}?
              </h2>
              <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
                Book skip-the-line tickets and save time at {data.name}'s top attractions
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-white text-[#6443F4] hover:bg-white/90 font-semibold"
                  onClick={() =>
                    document
                      .getElementById("section-attractions-grid")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  data-testid="button-browse-attractions"
                >
                  <Ticket className="w-5 h-5 mr-2" />
                  Browse All Attractions
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                  onClick={() => (window.location.href = localePath(`/destinations/${data.slug}`))}
                  data-testid="button-explore-destination"
                >
                  Explore {data.name}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </motion.section>
        </main>

        <PublicFooter />

        {/* Back to Top Button */}
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-[#6443F4] text-white shadow-lg hover:bg-[#5539d4] transition-all duration-300 flex items-center justify-center z-50"
            aria-label="Back to top"
            data-testid="button-back-to-top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </div>
    </>
  );
}

export default DestinationAttractionsPage;

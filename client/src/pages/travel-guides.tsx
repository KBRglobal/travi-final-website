import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Globe, Languages, ChevronRight, Map, Compass, Sparkles, Star, Clock, Users, ArrowRight, Search } from "lucide-react";
import { SEOHead } from "@/components/seo-head";
import { Helmet } from "react-helmet-async";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "ar", label: "Arabic", nativeName: "العربية" },
  { code: "de", label: "German", nativeName: "Deutsch" },
  { code: "es", label: "Spanish", nativeName: "Español" },
  { code: "fr", label: "French", nativeName: "Français" },
  { code: "he", label: "Hebrew", nativeName: "עברית" },
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

// Hero video for travel guides
const heroVideoUrl = "https://videos.pexels.com/video-files/3015510/3015510-uhd_2560_1440_24fps.mp4";

// Floating destination images for parallax effect with reliable fallbacks
const floatingDestinations = [
  { 
    name: "Dubai", 
    image: "/cards/dubai.webp", 
    fallback: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=200&h=200&fit=crop&q=80",
    x: 10, 
    y: 20 
  },
  { 
    name: "Paris", 
    image: "/cards/paris.webp", 
    fallback: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=200&h=200&fit=crop&q=80",
    x: 75, 
    y: 30 
  },
  { 
    name: "Tokyo", 
    image: "/cards/tokyo.webp", 
    fallback: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=200&h=200&fit=crop&q=80",
    x: 15, 
    y: 65 
  },
  { 
    name: "New York", 
    image: "/cards/new-york.webp", 
    fallback: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=200&h=200&fit=crop&q=80",
    x: 80, 
    y: 70 
  },
];

// Stats for the hero section
const heroStats = [
  { icon: Map, value: "50+", label: "Destinations" },
  { icon: Languages, value: "24", label: "Languages" },
  { icon: Users, value: "1M+", label: "Travelers Helped" },
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
        ease: [0.22, 1, 0.36, 1]
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
              alt={guide.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                const target = e.currentTarget;
                const fallbackUrl = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop&q=80";
                if (!target.dataset.fallbackApplied) {
                  target.dataset.fallbackApplied = "true";
                  target.src = fallbackUrl;
                }
              }}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0A1F] via-[#0B0A1F]/40 to-transparent opacity-80" />
            
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#6443F4]/30 via-transparent to-[#E84C9A]/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            
            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h3 className="text-xl font-bold text-white drop-shadow-lg mb-1">
                {guide.title.replace(" Travel Guide", "")}
              </h3>
              <p className="text-sm text-white/80">Complete Travel Guide</p>
            </div>
            
            {/* Language badge */}
            {guide.availableLocales.length > 1 && (
              <Badge 
                className="absolute top-4 right-4 bg-white/95 text-slate-700 backdrop-blur-sm border-0 shadow-lg"
              >
                <Languages className="h-3 w-3 mr-1.5" />
                {guide.availableLocales.length} languages
              </Badge>
            )}
          </div>
          
          {/* Content section */}
          <div className="p-5">
            <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
              {guide.summary || `Discover everything you need to know about ${guide.title.replace(" Travel Guide", "")} - local tips, attractions, and insider recommendations.`}
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
              alt={guide.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                const target = e.currentTarget;
                const fallbackUrl = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&h=900&fit=crop&q=80";
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
            
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              {guide.title}
            </h3>
            
            <p className="text-slate-600 mb-6 leading-relaxed">
              {guide.summary || `Your comprehensive guide to exploring ${guide.title.replace(" Travel Guide", "")}. Discover hidden gems, local favorites, and essential travel tips.`}
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
  const heroRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const smoothHeroY = useSpring(heroY, { stiffness: 100, damping: 30 });

  const { data, isLoading, error } = useQuery<GuidesResponse>({
    queryKey: ["/api/public/guides", selectedLocale],
    queryFn: async () => {
      const response = await fetch(`/api/public/guides?locale=${selectedLocale}&limit=50`);
      if (!response.ok) throw new Error("Failed to fetch guides");
      return response.json();
    },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const localeParam = urlParams.get("locale");
    if (localeParam && SUPPORTED_LANGUAGES.some(l => l.code === localeParam)) {
      setSelectedLocale(localeParam);
    }
  }, []);

  const handleLocaleChange = (locale: string) => {
    setSelectedLocale(locale);
    const newUrl = `${location.split("?")[0]}?locale=${locale}`;
    window.history.replaceState({}, "", newUrl);
  };

  // Filter guides by search query
  const filteredGuides = data?.guides.filter(guide => 
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
    itemListElement: data?.guides.map((guide, index) => ({
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
    <div className="min-h-screen bg-[#0B0A1F]">
      <SEOHead
        title="Travel Guides | TRAVI - Complete Destination Guides"
        description="Explore comprehensive travel guides for destinations worldwide. Get insider tips, local recommendations, and everything you need for your next adventure."
        canonicalPath="/guides"
        keywords={["travel guides", "destination guides", "travel tips", "city guides", "vacation planning"]}
      />

      <Helmet>
        <link rel="canonical" href="https://travi.world/guides" />
        {SUPPORTED_LANGUAGES.map(lang => (
          <link
            key={lang.code}
            rel="alternate"
            hrefLang={lang.code}
            href={`https://travi.world/guides?locale=${lang.code}`}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href="https://travi.world/guides" />
        <script type="application/ld+json">
          {JSON.stringify(itemListSchema)}
        </script>
      </Helmet>

      <PublicNav />

      {/* Cinematic Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden">
        {/* Video Background */}
        <motion.div 
          className="absolute inset-0"
          style={{ y: shouldReduceMotion ? 0 : smoothHeroY }}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            poster="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&h=1080&fit=crop&q=80"
          >
            <source src={heroVideoUrl} type="video/mp4" />
          </video>
          {/* Dark overlay with gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0A1F]/80 via-[#0B0A1F]/60 to-[#0B0A1F]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0A1F]/90 via-transparent to-[#0B0A1F]/60" />
        </motion.div>

        {/* Floating destination chips with parallax */}
        {!shouldReduceMotion && floatingDestinations.map((dest, i) => (
          <motion.div
            key={dest.name}
            className="absolute hidden lg:block"
            style={{ 
              left: `${dest.x}%`, 
              top: `${dest.y}%`,
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.2, duration: 0.8 }}
          >
            <div className="group relative">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/30 shadow-xl backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:border-white/60">
                <img 
                  src={dest.image} 
                  alt={dest.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== dest.fallback) {
                      target.src = dest.fallback;
                    }
                  }}
                />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-slate-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {dest.name}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Hero Content */}
        <motion.div 
          className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 pt-32"
          style={{ opacity: shouldReduceMotion ? 1 : heroOpacity }}
        >
          <div className="max-w-3xl">
            {/* Category label */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-6 bg-gradient-to-r from-[#6443F4]/20 to-[#E84C9A]/20 text-white border border-white/20 backdrop-blur-sm px-4 py-2">
                <Compass className="h-4 w-4 mr-2" />
                TRAVEL GUIDES
              </Badge>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
              style={{ fontFamily: "'Chillax', sans-serif", letterSpacing: "-0.03em" }}
            >
              Your Journey
              <br />
              <span className="bg-gradient-to-r from-[#6443F4] via-[#A78BFA] to-[#E84C9A] bg-clip-text text-transparent">
                Starts Here
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-lg md:text-xl text-white/80 mb-8 max-w-xl leading-relaxed"
            >
              Comprehensive destination guides crafted by travel experts. 
              Discover local insights, hidden gems, and everything you need 
              to plan your perfect adventure.
            </motion.p>

            {/* Search and language selector */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 mb-10"
            >
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                <Input
                  type="text"
                  placeholder="Search destinations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl backdrop-blur-md focus:bg-white/20 focus:border-white/40 transition-all"
                  data-testid="search-guides-input"
                />
              </div>
              
              <Select value={selectedLocale} onValueChange={handleLocaleChange}>
                <SelectTrigger 
                  className="w-48 h-14 bg-white/10 border-white/20 text-white rounded-xl backdrop-blur-md"
                  data-testid="language-selector"
                >
                  <Globe className="h-4 w-4 mr-2 text-white/60" />
                  <SelectValue>
                    {SUPPORTED_LANGUAGES.find(l => l.code === selectedLocale)?.nativeName || "English"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.nativeName} ({lang.label})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-wrap gap-8"
            >
              {heroStats.map((stat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <stat.icon className="h-5 w-5 text-white/80" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-sm text-white/60">{stat.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2"
          >
            <motion.div className="w-1.5 h-2.5 bg-white/60 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* Content Section */}
      <section className="relative bg-gradient-to-b from-[#0B0A1F] via-slate-50 to-white">
        {/* Transition gradient */}
        <div className="h-32 bg-gradient-to-b from-[#0B0A1F] to-slate-50" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pb-24">
          {isLoading ? (
            <div className="space-y-8">
              {/* Featured skeleton */}
              <Skeleton className="h-96 w-full rounded-3xl" />
              {/* Grid skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden bg-white shadow-lg">
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
              <p className="text-slate-600 mb-6">We encountered an issue loading the travel guides. Please try again.</p>
              <Button 
                onClick={() => window.location.reload()}
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
                  : "Travel guides are being prepared. Check back soon for comprehensive destination guides!"
                }
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
                    <p className="text-slate-600">Start your exploration with our top recommended destination</p>
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
  );
}

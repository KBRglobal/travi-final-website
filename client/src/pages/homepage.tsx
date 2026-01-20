import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, Instagram, Menu, X, ArrowRight, Globe, Star, Calendar,
  Sparkles, Tent, Baby, Wallet, Heart, Backpack,
  Hotel, Landmark, UtensilsCrossed, Ticket, Rss, Map, MapPinned,
  Bed, Camera, Coffee, Compass, Newspaper, BookOpen,
  ChevronDown
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { SiTiktok } from "react-icons/si";
import { SEOHead } from "@/components/seo-head";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import { PublicFooter } from "@/components/public-footer";
import { SkipLink } from "@/components/ui/skip-link";
import { LiveChatWidget } from "@/components/live-chat-widget";
import { NewsletterSection } from "@/components/homepage/NewsletterSection";
import { useQuery } from "@tanstack/react-query";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/lib/i18n/LocaleRouter";

import { Logo, Mascot } from "@/components/logo";

// ============================================
// SEO CONSTANTS - UPDATED FOR BETTER RANKINGS
// ============================================
const SITE_URL = "https://travi.world";
const SITE_NAME = "TRAVI World";
const CURRENT_YEAR = new Date().getFullYear();

// ============================================
// ANIMATION STYLES
// ============================================
const heroAnimationStyles = `
  @keyframes gradient-flow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes rotate-slow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes blob-pulse-1 {
    0%, 100% { transform: scale(1); opacity: 0.3; }
    50% { transform: scale(1.1); opacity: 0.4; }
  }

  @keyframes blob-pulse-2 {
    0%, 100% { transform: scale(1); opacity: 0.25; }
    50% { transform: scale(1.15); opacity: 0.35; }
  }

  @keyframes float-badge {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  @keyframes loading-pulse {
    0%, 100% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.1) rotate(5deg); }
  }

  @keyframes fade-in-up {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes bounce-in {
    0% { opacity: 0; transform: scale(0.8) translateY(50px); }
    50% { transform: scale(1.05) translateY(-5px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }

  .blob-animate-1 {
    animation: blob-pulse-1 8s ease-in-out infinite;
  }

  .blob-animate-2 {
    animation: blob-pulse-2 10s ease-in-out 1s infinite;
  }

  .float-badge {
    animation: float-badge 2s ease-in-out infinite;
  }

  .loading-pulse {
    animation: loading-pulse 2s ease-in-out infinite;
  }

  .animate-fade-in-up {
    animation: fade-in-up 0.5s ease-out both;
  }

  .animate-bounce-in {
    animation: bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
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

  .rotate-slow {
    animation: rotate-slow 20s linear infinite;
  }
`;

// ============================================
// SUPPORTED LANGUAGES - ONLY ACTIVE ONES
// Keep only languages that have actual translated content
// ============================================
const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', active: true },
  // TEMPORARILY DISABLED - Re-enable when translations are ready:
  // { code: 'ar', label: 'العربية', active: false },
  // { code: 'he', label: 'עברית', active: false },
  // { code: 'es', label: 'Español', active: false },
  // { code: 'fr', label: 'Français', active: false },
  // { code: 'de', label: 'Deutsch', active: false },
  // { code: 'it', label: 'Italiano', active: false },
  // { code: 'pt', label: 'Português', active: false },
  // { code: 'ru', label: 'Русский', active: false },
  // { code: 'ja', label: '日本語', active: false },
  // { code: 'ko', label: '한국어', active: false },
  // { code: 'zh', label: '中文', active: false },
  // { code: 'th', label: 'ไทย', active: false },
  // { code: 'tr', label: 'Türkçe', active: false },
  // { code: 'nl', label: 'Nederlands', active: false },
  // { code: 'pl', label: 'Polski', active: false },
  // { code: 'vi', label: 'Tiếng Việt', active: false },
].filter(lang => lang.active);

// ============================================
// FAQ DATA - OPTIMIZED FOR FEATURED SNIPPETS
// ============================================
const FAQ_ITEMS = [
  {
    q: "What is TRAVI World?",
    a: "TRAVI World is a comprehensive travel information platform covering 17 destinations worldwide with detailed guides for 3,000+ attractions, hotels, restaurants, and activities. Our multilingual platform is updated daily, with additional languages rolling out."
  },
  {
    q: "How many destinations does TRAVI cover?",
    a: "TRAVI World covers 17 major travel destinations including Dubai, Paris, Tokyo, New York, Barcelona, Singapore, London, Bangkok, Abu Dhabi, Amsterdam, Hong Kong, Istanbul, Las Vegas, Los Angeles, Miami, and Rome."
  },
  {
    q: "Is TRAVI World content available in multiple languages?",
    a: "Yes, TRAVI World is a multilingual platform with additional languages rolling out. We're expanding support to include Arabic, Hebrew, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Thai, Turkish, Dutch, Polish, and Vietnamese."
  },
  {
    q: "What type of travel information does TRAVI provide?",
    a: "TRAVI provides comprehensive information about hotels and accommodation, tourist attractions and landmarks, restaurants and dining options, activities and tours, travel news and updates, and complete destination guides with tickets, opening hours, and visitor tips."
  },
  {
    q: "Is TRAVI World free to use?",
    a: "Yes, TRAVI World is completely free to use. Browse thousands of travel guides, attraction reviews, hotel recommendations, and restaurant suggestions at no cost."
  },
  {
    q: "How often is TRAVI World content updated?",
    a: "TRAVI World content is updated daily with the latest travel news, new attraction reviews, and updated information about hotels and restaurants across all 17 destinations."
  }
];

// ============================================
// DATA
// ============================================
const HERO_DESTINATIONS = [
  { name: "Dubai", country: "United Arab Emirates", slug: "dubai", image: "/hero/dubai-hero.webp", tagline: "City of Dreams", alt: "TRAVI travel mascot character exploring Dubai's iconic Burj Khalifa tower and spectacular Downtown Dubai skyline in the United Arab Emirates", title: "Dubai Travel Guide - Attractions, Hotels & Things to Do" },
  { name: "Paris", country: "France", slug: "paris", image: "/hero/paris-hero.webp", tagline: "City of Light", alt: "TRAVI travel mascot character standing at the magnificent Eiffel Tower in Paris France with panoramic city views", title: "Paris Travel Guide - Museums, Landmarks & Cuisine" },
  { name: "Tokyo", country: "Japan", slug: "tokyo", image: "/hero/tokyo-hero.webp", tagline: "Tradition Meets Future", alt: "TRAVI travel mascot character amid Tokyo's vibrant neon-lit Shibuya streets and traditional temples", title: "Tokyo Travel Guide - Culture, Food & Technology" },
  { name: "New York", country: "United States", slug: "new-york", image: "/hero/new-york-hero.webp", tagline: "City That Never Sleeps", alt: "TRAVI travel mascot character in New York City with iconic Manhattan skyline and Statue of Liberty", title: "New York Travel Guide - Broadway, Museums & Landmarks" },
  { name: "Barcelona", country: "Spain", slug: "barcelona", image: "/hero/barcelona-hero.webp", tagline: "Art & Architecture", alt: "TRAVI travel mascot character exploring Barcelona's stunning Gaudi architecture and Mediterranean beaches", title: "Barcelona Travel Guide - Gaudi, Beaches & Tapas" },
  { name: "Singapore", country: "Singapore", slug: "singapore", image: "/hero/singapore-hero.webp", tagline: "Garden City", alt: "TRAVI travel mascot character at Singapore's futuristic Marina Bay Sands and Gardens by the Bay", title: "Singapore Travel Guide - Gardens, Food & Shopping" },
  { name: "London", country: "United Kingdom", slug: "london", image: "/hero/london-hero.webp", tagline: "Royal Heritage", alt: "TRAVI travel mascot character visiting London's historic Big Ben, Tower Bridge and Buckingham Palace", title: "London Travel Guide - Royal Palaces, Museums & Theater" },
  { name: "Bangkok", country: "Thailand", slug: "bangkok", image: "/hero/bangkok-hero.webp", tagline: "Land of Smiles", alt: "TRAVI travel mascot character exploring Bangkok's ornate Buddhist temples and vibrant street markets", title: "Bangkok Travel Guide - Temples, Markets & Street Food" },
];

const ALL_DESTINATIONS_SEO = [
  { name: "Abu Dhabi", slug: "abu-dhabi", country: "UAE" },
  { name: "Amsterdam", slug: "amsterdam", country: "Netherlands" },
  { name: "Bangkok", slug: "bangkok", country: "Thailand" },
  { name: "Barcelona", slug: "barcelona", country: "Spain" },
  { name: "Dubai", slug: "dubai", country: "UAE" },
  { name: "Hong Kong", slug: "hong-kong", country: "China" },
  { name: "Istanbul", slug: "istanbul", country: "Turkey" },
  { name: "Las Vegas", slug: "las-vegas", country: "USA" },
  { name: "London", slug: "london", country: "UK" },
  { name: "Los Angeles", slug: "los-angeles", country: "USA" },
  { name: "Miami", slug: "miami", country: "USA" },
  { name: "New York", slug: "new-york", country: "USA" },
  { name: "Paris", slug: "paris", country: "France" },
  { name: "Rome", slug: "rome", country: "Italy" },
  { name: "Singapore", slug: "singapore", country: "Singapore" },
  { name: "Tokyo", slug: "tokyo", country: "Japan" },
];

const NAV_ITEMS = [
  { label: "Destinations", href: "/destinations", title: "Browse All Travel Destinations" },
  { label: "Hotels", href: "/hotels", title: "Find Hotels & Accommodation" },
  { label: "Attractions", href: "/attractions", title: "Discover Tourist Attractions" },
  { label: "Guides", href: "/guides", title: "Travel Guides & Tips" },
  { label: "News", href: "/news", title: "Latest Travel News" },
];

// ============================================
// COLORFUL CATEGORIES - WITH SEO DESCRIPTIONS
// ============================================
const CATEGORY_CARDS = [
  { 
    id: 1, 
    icon: Bed, 
    title: "Hotels", 
    subtitle: "Find your perfect stay",
    description: "Compare hotels, resorts, and accommodation options across 17 destinations worldwide",
    linkUrl: "/hotels",
    gradient: "from-blue-500 to-cyan-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    iconBg: "bg-blue-500",
    hoverGlow: "hover:shadow-blue-500/25"
  },
  { 
    id: 2, 
    icon: Camera, 
    title: "Attractions", 
    subtitle: "Discover must-see places",
    description: "Explore 3,000+ tourist attractions with reviews, tickets, and visitor tips",
    linkUrl: "/attractions",
    gradient: "from-amber-500 to-orange-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    iconBg: "bg-amber-500",
    hoverGlow: "hover:shadow-amber-500/25"
  },
  { 
    id: 3, 
    icon: Newspaper, 
    title: "Travel News", 
    subtitle: "Latest travel updates",
    description: "Stay informed with daily travel news, tips, and destination updates",
    linkUrl: "/news",
    gradient: "from-violet-500 to-purple-400",
    bgColor: "bg-violet-50 dark:bg-violet-950/30",
    iconBg: "bg-violet-500",
    hoverGlow: "hover:shadow-violet-500/25"
  },
  { 
    id: 4, 
    icon: BookOpen, 
    title: "Travel Guides", 
    subtitle: "Complete destination guides",
    description: "In-depth travel guides with local tips, itineraries, and recommendations",
    linkUrl: "/guides",
    gradient: "from-indigo-500 to-blue-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    iconBg: "bg-indigo-500",
    hoverGlow: "hover:shadow-indigo-500/25"
  },
];

const FALLBACK_EXPERIENCE_CATEGORIES = [
  { id: 1, name: "Luxury Travel", description: "Premium travel experiences and exclusive destinations", slug: "luxury", image: "/experiences/experiences-luxury-resort-infinity-pool.webp", imageAlt: "Luxury resort with infinity pool overlooking ocean", icon: "Sparkles", href: "/travel-styles/luxury-travel-complete-guide" },
  { id: 2, name: "Adventure & Outdoors", description: "Thrilling outdoor experiences and adventures", slug: "adventure", image: "/experiences/experiences-adventure-hiker-mountain-trail-snowy-peaks.webp", imageAlt: "Hiker on mountain trail with snowy peaks", icon: "Tent", href: "/travel-styles/adventure-outdoors-complete-guide" },
  { id: 3, name: "Family Travel", description: "Family-friendly destinations and activities", slug: "family", image: "/experiences/picnic-modern-architecture-outdoor-activity.webp", imageAlt: "Family enjoying outdoor picnic activity", icon: "Baby", href: "/travel-styles/family-travel-complete-guide" },
  { id: 4, name: "Budget Travel", description: "Affordable travel options and destinations", slug: "budget", image: "/experiences/solo-travel-backpack-map-camera-desert-architecture.webp", imageAlt: "Budget travel backpack with map and camera", icon: "Wallet", href: "/travel-styles/budget-travel-complete-guide" },
  { id: 5, name: "Honeymoon & Romance", description: "Romantic getaways and honeymoon destinations", slug: "romance", image: "/experiences/romantic-couple-beach-sunset-modern-architecture.webp", imageAlt: "Romantic couple watching sunset on beach", icon: "Heart", href: "/travel-styles/honeymoon-romance-complete-guide" },
  { id: 6, name: "Solo Travel", description: "Perfect destinations for solo travelers", slug: "solo", image: "/experiences/solo-traveler-canoe-mountain-lake-archway-reflection.webp", imageAlt: "Solo traveler in canoe on peaceful mountain lake", icon: "Backpack", href: "/travel-styles/solo-travel-complete-guide" },
];

const FALLBACK_DESTINATIONS = [
  { id: "dubai", name: "Dubai", country: "UAE", slug: "/destinations/dubai", cardImage: "/cards/dubai.webp", cardImageAlt: "Dubai skyline with Burj Khalifa tower at sunset" },
  { id: "london", name: "London", country: "United Kingdom", slug: "/destinations/london", cardImage: "/cards/london.webp", cardImageAlt: "London Big Ben and Houses of Parliament" },
  { id: "paris", name: "Paris", country: "France", slug: "/destinations/paris", cardImage: "/cards/paris.webp", cardImageAlt: "Paris Eiffel Tower illuminated at sunset" },
  { id: "new-york", name: "New York", country: "USA", slug: "/destinations/new-york", cardImage: "/cards/new-york.webp", cardImageAlt: "New York Manhattan skyline with Empire State Building" },
  { id: "tokyo", name: "Tokyo", country: "Japan", slug: "/destinations/tokyo", cardImage: "/cards/tokyo.webp", cardImageAlt: "Tokyo Shibuya crossing neon lights at night" },
  { id: "singapore", name: "Singapore", country: "Singapore", slug: "/destinations/singapore", cardImage: "/cards/singapore.webp", cardImageAlt: "Singapore Marina Bay Sands and Gardens by the Bay" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", slug: "/destinations/bangkok", cardImage: "/cards/bangkok.webp", cardImageAlt: "Bangkok Grand Palace temple at sunrise" },
  { id: "istanbul", name: "Istanbul", country: "Turkey", slug: "/destinations/istanbul", cardImage: "/cards/istanbul.webp", cardImageAlt: "Istanbul Blue Mosque and Hagia Sophia" },
];

const FALLBACK_REGION_LINKS = [
  { id: 1, name: "Europe", destinations: [{ name: "London", slug: "/destinations/london" }, { name: "Paris", slug: "/destinations/paris" }, { name: "Barcelona", slug: "/destinations/barcelona" }, { name: "Rome", slug: "/destinations/rome" }, { name: "Amsterdam", slug: "/destinations/amsterdam" }] },
  { id: 2, name: "Asia", destinations: [{ name: "Tokyo", slug: "/destinations/tokyo" }, { name: "Singapore", slug: "/destinations/singapore" }, { name: "Bangkok", slug: "/destinations/bangkok" }, { name: "Hong Kong", slug: "/destinations/hong-kong" }] },
  { id: 3, name: "Middle East", destinations: [{ name: "Dubai", slug: "/destinations/dubai" }, { name: "Abu Dhabi", slug: "/destinations/abu-dhabi" }, { name: "Istanbul", slug: "/destinations/istanbul" }] },
];

const ICON_MAP: Record<string, any> = {
  Hotel, Landmark, UtensilsCrossed, Ticket, Rss, Map, Sparkles, Tent, Baby, Wallet, Heart, Backpack,
};

function getIconComponent(iconName: string | null) {
  if (!iconName) return Map;
  return ICON_MAP[iconName] || Map;
}

// ============================================
// INTERFACES
// ============================================
interface HomepageConfig {
  sections: Record<string, any>;
  quickCategories: any[];
  experienceCategories: any[];
  regionLinks: any[];
  cta: any;
  seoMeta: any;
  featuredDestinations: any[];
  featuredArticles: any[];
}

// ============================================
// LOADING COMPONENT
// ============================================
function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-950">
      <style>{heroAnimationStyles}</style>
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-4 loading-pulse">
          <Mascot size={96} variant="light-bg" />
        </div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">{t("common.loading")}</p>
      </div>
    </div>
  );
}

// ============================================
// ANIMATED SECTION - CSS-based (no framer-motion for performance)
// ============================================
function AnimatedSection({ children, className, delay = 0, ariaLabel }: { children: React.ReactNode; className?: string; delay?: number; ariaLabel?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-100px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={cn(
        className,
        "transition-all duration-700 ease-out",
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"
      )}
      style={{ transitionDelay: `${delay}s` }}
      aria-label={ariaLabel}
    >
      {children}
    </section>
  );
}

// ============================================
// HERO SECTION WITH OPTIMIZED SCHEMA
// ============================================
function SplitHero({ currentIndex, onIndexChange, siteStats }: { currentIndex: number; onIndexChange: (idx: number) => void; siteStats?: { destinations: number; attractions: number } }) {
  const { t } = useTranslation();
  const [isAnimating, setIsAnimating] = useState(false);
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

  // OPTIMIZED Schema Data - More specific and complete
  const websiteSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    "name": SITE_NAME,
    "alternateName": ["TRAVI", "TRAVI Travel Guide", "TRAVI Travel"],
    "url": SITE_URL,
    "description": "Comprehensive travel information for 17 destinations worldwide with detailed guides for 3,000+ attractions, hotels, restaurants, and activities.",
    "inLanguage": "en-US",
    "publisher": {
      "@id": `${SITE_URL}/#organization`
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${SITE_URL}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  });

  const organizationSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    "name": SITE_NAME,
    "url": SITE_URL,
    "logo": {
      "@type": "ImageObject",
      "url": `${SITE_URL}/logo.png`,
      "width": 512,
      "height": 512
    },
    "image": `${SITE_URL}/ogImage.jpg`,
    "description": "Your trusted travel resource for 17 destinations worldwide with 3,000+ attractions, hotels, and restaurants reviewed.",
    "foundingDate": "2021",
    "sameAs": [
      "https://www.instagram.com/travi_world",
      "https://www.tiktok.com/@travi.world",
      "https://www.facebook.com/traviapp"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "support@travi.world",
      "contactType": "customer support"
    }
  });

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [{
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": SITE_URL
    }]
  });

  const destinationsListSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Featured Travel Destinations",
    "description": "Popular travel destinations covered by TRAVI World",
    "numberOfItems": HERO_DESTINATIONS.length,
    "itemListElement": HERO_DESTINATIONS.map((d, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "TouristDestination",
        "name": d.name,
        "description": `${d.tagline} - Complete travel guide for ${d.name}, ${d.country}`,
        "url": `${SITE_URL}/destinations/${d.slug}`,
        "image": `${SITE_URL}${d.image}`,
        "containedInPlace": {
          "@type": "Country",
          "name": d.country
        }
      }
    }))
  });

  // CollectionPage schema for better homepage recognition
  const collectionPageSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/#webpage`,
    "url": SITE_URL,
    "name": `${SITE_NAME} - Travel Guides for Hotels, Attractions & Things to Do`,
    "description": "Your complete travel guide for 17 destinations worldwide. Expert information about hotels, attractions, restaurants, and activities for 3,000+ places.",
    "isPartOf": {
      "@id": `${SITE_URL}/#website`
    },
    "about": {
      "@type": "Thing",
      "name": "Travel Information"
    },
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": 16,
      "name": "Travel Destinations"
    }
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

      {/* Decorative blobs - CSS animated for performance */}
      <div 
        className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-300/20 via-pink-200/10 to-transparent rounded-full blur-3xl pointer-events-none blob-animate-1"
        aria-hidden="true"
      />
      <div 
        className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-200/30 via-purple-100/20 to-transparent rounded-full blur-3xl pointer-events-none blob-animate-2"
        aria-hidden="true"
      />

      {/* Rotating gradient ring - centered 1000px (UI Standard) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rotate-slow opacity-10 dark:opacity-20 pointer-events-none" aria-hidden="true">
        <div className="w-full h-full rounded-full border-[40px] border-transparent" style={{ borderTopColor: '#6443F4', borderRightColor: '#F24294' }} />
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between w-full max-w-7xl mx-auto gap-8 lg:gap-16 relative z-10">
        {/* Left Content */}
        <div className="flex-1 max-w-xl text-center lg:text-left">
          {/* Badge - UI Standard (white bg + shadow-lg + animated dot) */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-md">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6443F4]" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("home.hero.badge", { count: siteStats?.destinations || 17 })}
              </span>
            </div>
          </div>

          {/* Gradient Headline */}
          <h1 className="mb-6">
            <span 
              className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-2" 
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            >
              {t("home.hero.headlinePart1")}
            </span>
            <span className="relative inline-block">
              <span 
                className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.1] tracking-tight animated-gradient-text"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                {t("home.hero.headlinePart2")}
              </span>
              {/* Gradient underline accent */}
              <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-[#6443F4] via-[#8B5CF6] to-[#F24294] rounded-full opacity-80" />
            </span>
          </h1>

          <p 
            id="hero-description"
            className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-8 font-light leading-relaxed max-w-lg mx-auto lg:mx-0"
            dangerouslySetInnerHTML={{
              __html: t("home.hero.description", {
                destinations: `<span class="font-medium text-slate-700 dark:text-slate-300">${siteStats?.destinations || 17}</span>`,
                attractions: `<span class="font-medium text-slate-700 dark:text-slate-300">${(siteStats?.attractions || 3000).toLocaleString()}</span>`
              })
            }}
          />

          {/* Stats */}
          <dl className="flex flex-wrap justify-center lg:justify-start items-center gap-4 sm:gap-6 md:gap-8 mb-8">
            {[
              { num: `${(siteStats?.attractions || 3000).toLocaleString()}+`, label: t("home.stats.attractions"), srLabel: t("home.srLabel.attractions", { count: (siteStats?.attractions || 3000).toLocaleString() }) },
              { num: String(siteStats?.destinations || 17), label: t("home.stats.destinations"), srLabel: t("home.srLabel.destinations", { count: siteStats?.destinations || 17 }) },
              { num: '17+', label: t("home.stats.languages"), srLabel: t("home.srLabel.languages") }
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-4 sm:gap-6 md:gap-8">
                <div className="text-center lg:text-left">
                  <dt className="sr-only">{stat.srLabel}</dt>
                  <dd className="text-2xl sm:text-3xl md:text-4xl font-medium text-slate-900 dark:text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    {stat.num}
                  </dd>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 tracking-wider mt-1" aria-hidden="true">{stat.label}</div>
                </div>
                {i < 2 && <div className="hidden sm:block w-px h-10 sm:h-12 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700 to-transparent" aria-hidden="true" />}
              </div>
            ))}
          </dl>

          {/* Simple CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <Link href="/destinations">
              <Button 
                className="rounded-full bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] hover:opacity-90 text-white px-8 py-6 text-base font-semibold shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
                aria-describedby="hero-description"
              >
                {t("home.cta.exploreDestinations")}
                <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/guides">
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
                className={cn(
                  "h-2.5 rounded-full border-none cursor-pointer transition-all duration-500",
                  currentIndex === i 
                    ? "w-8 bg-gradient-to-r from-[#6443F4] to-[#8B5CF6]" 
                    : "w-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300"
                )}
              />
            ))}
          </div>
        </div>

        {/* Right Image */}
        <div className="flex-1 w-full max-w-md lg:max-w-lg relative mt-8 lg:mt-0">
          <div className="absolute -inset-4 bg-gradient-to-r from-[#6443F4]/20 via-[#F24294]/10 to-[#6443F4]/20 rounded-[2rem] blur-xl opacity-60" aria-hidden="true" />

          <div 
            className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/20"
            role="tabpanel"
          >
            {/* Keep AnimatePresence for image carousel - necessary for UX */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.7 }}
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
                  {...{ fetchpriority: currentIndex === 0 ? "high" : "auto" } as React.ImgHTMLAttributes<HTMLImageElement>}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" aria-hidden="true" />
              </motion.div>
            </AnimatePresence>

            {/* Location badge - CSS transitions for performance */}
            <div 
              className={cn(
                "absolute bottom-6 left-6 right-6 transition-all duration-500",
                isAnimating ? "opacity-0 translate-y-5" : "opacity-100 translate-y-0"
              )}
            >
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6443F4] to-[#8B5CF6] flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                    <MapPin className="w-5 h-5 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{dest.name}, {dest.country}</div>
                    <div className="text-sm text-slate-500">{dest.tagline}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Popular badge - CSS animated for performance */}
            <div className="absolute top-6 right-6 inline-flex items-center gap-2 bg-white/95 dark:bg-slate-800 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg shadow-purple-500/10 border border-[#6443F4]/20 float-badge">
              <div className="relative flex items-center justify-center">
                <span className="absolute w-2.5 h-2.5 rounded-full bg-[#6443F4] animate-ping opacity-75" />
                <span className="relative w-2 h-2 rounded-full bg-[#6443F4]" />
              </div>
              <span className="text-xs font-semibold text-[#6443F4]">Popular</span>
            </div>
          </div>

          {/* Floating cards - static for performance */}
          <div className="absolute -left-4 top-1/4 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-3 hidden lg:block border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md">
                <Ticket className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-slate-900 dark:text-white">500+ Tours</div>
                <div className="text-slate-500">Available</div>
              </div>
            </div>
          </div>

          <div className="absolute -right-2 bottom-1/3 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-3 hidden lg:block border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                <Star className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-slate-900 dark:text-white">4.9 Rating</div>
                <div className="text-slate-500">Reviews</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden SEO navigation - IMPROVED with more context */}
      <nav className="sr-only" aria-label="All destination guides">
        <h2>Complete Travel Guides for All {ALL_DESTINATIONS_SEO.length} Destinations</h2>
        <ul>
          {ALL_DESTINATIONS_SEO.map((d) => (
            <li key={d.slug}>
              <a href={`/destinations/${d.slug}`}>
                {d.name}, {d.country} - Complete Travel Guide {CURRENT_YEAR} with Hotels, Attractions, Restaurants and Things to Do
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

// ============================================
// CATEGORIES SECTION WITH IMPROVED SCHEMA
// ============================================
function CategoriesSection() {
  const categoriesSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Travel Categories",
    "description": "Browse travel information by category on TRAVI World",
    "numberOfItems": CATEGORY_CARDS.length,
    "itemListElement": CATEGORY_CARDS.map((cat, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "Service",
        "name": cat.title,
        "description": cat.description,
        "url": `${SITE_URL}${cat.linkUrl}`,
        "provider": {
          "@type": "Organization",
          "name": SITE_NAME
        }
      }
    }))
  });

  return (
    <AnimatedSection className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8" ariaLabel="Browse travel categories">
      <Helmet>
        <script type="application/ld+json">{categoriesSchema}</script>
      </Helmet>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-full mb-4">
            <Compass className="w-4 h-4 text-[#6443F4]" aria-hidden="true" />
            <span className="text-xs font-semibold tracking-wide text-[#6443F4] uppercase">Browse Travel Categories</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
            Explore by Type
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Find exactly what you're looking for with our curated travel categories
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {CATEGORY_CARDS.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <Link href={card.linkUrl} title={card.description}>
                  <article className={cn(
                    "group relative p-6 rounded-2xl transition-all duration-300 cursor-pointer h-full",
                    "hover:shadow-2xl hover:-translate-y-2",
                    card.bgColor,
                    card.hoverGlow
                  )}>
                    {/* Icon */}
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                      card.iconBg
                    )}>
                      <IconComponent className="w-7 h-7 text-white" aria-hidden="true" />
                    </div>

                    {/* Content */}
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                      {card.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                      {card.subtitle}
                    </p>

                    {/* Arrow */}
                    <div className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      <span>Explore</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </div>

                    {/* Decorative gradient line */}
                    <div className={cn(
                      "absolute bottom-0 left-4 right-4 h-1 rounded-full bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                      card.gradient
                    )} aria-hidden="true" />
                  </article>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </AnimatedSection>
  );
}

// ============================================
// FAQ SECTION - OPTIMIZED FOR FEATURED SNIPPETS
// ============================================
function FAQSection() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  });

  return (
    <AnimatedSection className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950" ariaLabel="Frequently asked questions about TRAVI World">
      <Helmet>
        <script type="application/ld+json">{faqSchema}</script>
      </Helmet>

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
            {t("home.sections.faq")}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
            {t("home.sections.faqDesc")}
          </p>
        </div>

        <div className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
          {FAQ_ITEMS.map((faq, index) => (
            <div
              key={index}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
              itemScope
              itemProp="mainEntity"
              itemType="https://schema.org/Question"
            >
              <div 
                className="bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                  aria-expanded={openIndex === index}
                >
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white pr-4" itemProp="name">
                    {faq.q}
                  </h3>
                  <ChevronDown 
                    className={cn(
                      "w-5 h-5 text-slate-500 flex-shrink-0 transition-transform duration-300",
                      openIndex === index && "rotate-180"
                    )} 
                    aria-hidden="true"
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
                    <p className="px-6 pb-5 text-slate-600 dark:text-slate-400 leading-relaxed" itemProp="text">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

// ============================================
// MAIN COMPONENT - WITH SEO IMPROVEMENTS
// ============================================
export default function Homepage() {
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { t } = useTranslation();
  const { locale, isRTL, localePath } = useLocale();

  const { data: config, isLoading } = useQuery<HomepageConfig>({
    queryKey: ['/api/public/homepage-config'],
  });

  // Fetch dynamic stats from API
  const { data: siteStats } = useQuery<{ destinations: number; attractions: number; publishedContent: number }>({
    queryKey: ['/api/public/stats'],
  });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Redirect duplicate language paths to main path
  useEffect(() => {
    if (location.startsWith('/sv/') || location.startsWith('/bn/')) {
      const cleanPath = location.replace(/^\/(sv|bn)/, '') || '/';
      window.location.replace(cleanPath);
    }
  }, [location]);

  // Show loading screen
  if (isLoading) {
    return <LoadingScreen />;
  }

  const sections = config?.sections || {};
  const cta = config?.cta;
  const seoMeta = config?.seoMeta;

  const featuredDestinations = config?.featuredDestinations?.length ? config.featuredDestinations : FALLBACK_DESTINATIONS;
  const experienceCategories = config?.experienceCategories?.length ? config.experienceCategories : FALLBACK_EXPERIENCE_CATEGORIES;
  const regionLinks = config?.regionLinks?.length ? config.regionLinks : FALLBACK_REGION_LINKS;

  // Experience categories schema
  const experienceSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Travel Styles",
    "description": "Explore destinations by travel experience type",
    "numberOfItems": experienceCategories.length,
    "itemListElement": experienceCategories.map((cat: any, i: number) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "TouristTrip",
        "name": cat.name,
        "description": cat.description,
        "url": `${SITE_URL}${cat.href}`,
        "image": cat.image ? `${SITE_URL}${cat.image}` : undefined
      }
    }))
  });

  // UNIQUE, KEYWORD-RICH META TITLE & DESCRIPTION
  const pageTitle = seoMeta?.metaTitle || `${SITE_NAME} - Travel Guides for 17 Destinations | Hotels, Attractions & Things to Do ${CURRENT_YEAR}`;
  const pageDescription = seoMeta?.metaDescription || `Your complete travel guide for 17 destinations worldwide. Expert reviews of 3,000+ hotels, attractions, restaurants, and activities. Plan your trip with ${SITE_NAME} - updated daily.`;

  return (
    <>
      <SkipLink />
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        canonicalPath="/"
        ogImage={`${SITE_URL}/ogImage.jpg`}
      />

      {/* CRITICAL: Canonical tag and proper hreflang for ONLY active languages */}
      <Helmet>
        {/* Canonical - always point to main URL */}
        <link rel="canonical" href={SITE_URL} />

        {/* hreflang - ONLY EN is live, other languages coming soon */}
        <link rel="alternate" hrefLang="x-default" href={SITE_URL} />
        <link rel="alternate" hrefLang="en" href={SITE_URL} />

        {/* Additional meta tags for better SEO */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@travi_world" />
      </Helmet>

      <SubtleSkyBackground />

      <div className="min-h-screen relative">
        {/* HEADER */}
        <header 
          className={cn("fixed top-0 left-0 right-0 z-50 transition-all duration-300", isScrolled ? "bg-[#6443F4] shadow-lg" : "bg-[#6443F4]")}
          role="banner"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              <Logo variant="dark-bg" height={40} linkTo="/" />

              <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
                {NAV_ITEMS.map((item) => (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    title={item.title}
                    className="px-4 py-2 text-sm font-medium rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3">
                  <a 
                    href="https://www.instagram.com/travi_world" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-[#E4405F] hover:bg-white/20 transition-all"
                    aria-label="Follow TRAVI on Instagram"
                    title="Follow TRAVI World on Instagram"
                  >
                    <Instagram className="w-4 h-4" aria-hidden="true" />
                  </a>
                  <a 
                    href="https://www.tiktok.com/@travi.world" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all"
                    aria-label="Follow TRAVI on TikTok"
                    title="Follow TRAVI World on TikTok"
                  >
                    <SiTiktok className="w-4 h-4" aria-hidden="true" />
                  </a>
                </div>

                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="lg:hidden rounded-full text-white/70 hover:text-white hover:bg-white/10"
                      aria-label="Open menu"
                    >
                      <Menu className="w-5 h-5" aria-hidden="true" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[300px] border-0 bg-[#6443F4]">
                    <SheetHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/10">
                      <SheetTitle>
                        <Logo variant="dark-bg" height={40} linkTo={null} />
                      </SheetTitle>
                      <SheetClose asChild>
                        <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10 rounded-full" aria-label="Close menu">
                          <X className="w-5 h-5" aria-hidden="true" />
                        </Button>
                      </SheetClose>
                    </SheetHeader>
                    <nav className="mt-6 space-y-1" aria-label="Mobile navigation">
                      {NAV_ITEMS.map((item) => (
                        <Link 
                          key={item.href} 
                          href={item.href} 
                          onClick={() => setMobileMenuOpen(false)} 
                          className="flex items-center py-3 px-4 rounded-xl text-base font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                          title={item.title}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </nav>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" role="main" tabIndex={-1}>
          {/* HERO */}
          <SplitHero currentIndex={currentHeroIndex} onIndexChange={setCurrentHeroIndex} siteStats={siteStats} />

          {/* CATEGORIES */}
          <CategoriesSection />

          {/* POPULAR DESTINATIONS */}
          <AnimatedSection className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950" ariaLabel="Popular travel destinations">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 sm:mb-14 gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-3" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    {sections['destinations']?.title || "Explore Popular Destinations"}
                  </h2>
                  <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
                    {sections['destinations']?.subtitle || "Discover travel guides for destinations around the world"}
                  </p>
                </div>
                <Link href="/destinations" className="hidden sm:inline-flex items-center gap-2 text-[#6443F4] font-semibold hover:gap-3 transition-all" title="View all travel destinations">
                  View All <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {featuredDestinations.slice(0, 8).map((dest: any, index: number) => (
                  <article key={dest.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                    <Link href={dest.slug || `/destinations/${dest.id}`} title={`${dest.name} Travel Guide - Hotels, Attractions & Things to Do`}>
                      <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white dark:bg-slate-900 h-full">
                        <div className="relative h-48 sm:h-56 overflow-hidden bg-slate-100 dark:bg-slate-800">
                          {dest.cardImage ? (
                            <img 
                              src={dest.cardImage} 
                              alt={dest.cardImageAlt || `${dest.name} travel guide - top attractions and hotels`} 
                              title={`${dest.name}, ${dest.country} - Travel Guide`}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                              loading="lazy"
                              width={400}
                              height={300}
                              decoding="async"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><MapPinned className="w-12 h-12 text-slate-300" aria-hidden="true" /></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
                          <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                            <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-slate-900 text-xs font-medium px-3 py-1.5 rounded-full">
                              <MapPin className="w-3 h-3" aria-hidden="true" /> Explore Guide
                            </span>
                          </div>
                        </div>
                        <CardContent className="p-4 sm:p-5">
                          <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg mb-1">{dest.name}</h3>
                          <p className="text-sm text-slate-500">{dest.country}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  </article>
                ))}
              </div>

              <div className="text-center mt-8 sm:hidden">
                <Button className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white gap-2" asChild>
                  <Link href="/destinations" title="Browse all travel destinations">View All Destinations <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
                </Button>
              </div>
            </div>
          </AnimatedSection>

          {/* EXPERIENCE CATEGORIES */}
          <AnimatedSection className="py-16 md:py-24 px-4 sm:px-6 lg:px-8" ariaLabel="Travel style categories">
            <Helmet>
              <script type="application/ld+json">{experienceSchema}</script>
            </Helmet>

            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-10 sm:mb-14">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                  {sections['experience_categories']?.title || "Find Your Perfect Travel Style"}
                </h2>
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  {sections['experience_categories']?.subtitle || "Explore destinations by travel experience"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {experienceCategories.map((category: any, index: number) => {
                  const IconComponent = getIconComponent(category.icon);
                  return (
                    <article key={category.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                      <Link href={category.href || `/${category.slug}`} title={`${category.name} - Complete Travel Guide ${CURRENT_YEAR}`}>
                        <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 bg-white dark:bg-slate-900 h-full">
                          <div className="relative h-40 sm:h-48 overflow-hidden">
                            {category.image ? (
                              <img 
                                src={category.image} 
                                alt={category.imageAlt || `${category.name} travel experiences and destinations`} 
                                title={category.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                loading="lazy"
                                width={400}
                                height={250}
                                decoding="async"
                              />
                            ) : (
                              <div className="h-full bg-[#6443F4] flex items-center justify-center">
                                <IconComponent className="w-16 h-16 text-white/90 group-hover:scale-110 transition-transform" aria-hidden="true" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" aria-hidden="true" />
                            <div className="absolute bottom-4 left-4 right-4">
                              <h3 className="text-lg sm:text-xl font-bold text-white mb-1" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{category.name}</h3>
                              <p className="text-sm text-white/80 line-clamp-2">{category.description}</p>
                            </div>
                          </div>
                          <CardContent className="p-4 flex items-center justify-between">
                            <span className="text-sm font-medium text-[#6443F4]">Explore guides</span>
                            <ArrowRight className="w-4 h-4 text-[#6443F4] group-hover:translate-x-1 transition-transform" aria-hidden="true" />
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
            config={cta ? {
              eyebrow: cta.eyebrow || undefined,
              headline: cta.headline,
              subheadline: cta.subheadline || undefined,
              placeholder: cta.inputPlaceholder || undefined,
              buttonText: cta.buttonText || undefined,
              backgroundImage: cta.backgroundImage || undefined,
            } : undefined}
          />

          {/* REGIONS */}
          <AnimatedSection className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900" ariaLabel="Browse destinations by region">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-10 sm:mb-14">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                  {sections['region_links']?.title || "Explore by Region"}
                </h2>
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
                  {sections['region_links']?.subtitle || "Browse destinations by geographic region"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {regionLinks.map((region: any, index: number) => (
                  <div key={region.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm p-6 h-full">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                        <Globe className="w-5 h-5 text-[#6443F4]" aria-hidden="true" />
                        {region.name}
                      </h3>
                      <ul className="space-y-1">
                        {region.destinations.map((dest: any, i: number) => (
                          <li key={i}>
                            <Link 
                              href={dest.slug.startsWith('/') ? dest.slug : `/${dest.slug}`} 
                              className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:text-[#6443F4] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
                              title={`${dest.name} Travel Guide`}
                            >
                              <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                              {dest.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* MASCOT */}
          <TraviMascotHelper />
        </main>

        <PublicFooter />
      </div>
    </>
  );
}

// ============================================
// MASCOT HELPER
// ============================================
function TraviMascotHelper() {
  const [isVisible, setIsVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <>
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-center gap-1 animate-bounce-in">
        <button
          onClick={() => setIsChatOpen(true)}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#6443F4] to-[#8B5CF6] p-0.5 sm:p-1 shadow-lg shadow-[#6443F4]/30 overflow-hidden transition-all hover:shadow-xl hover:scale-105 active:scale-95"
          aria-label="Open chat with TRAVI assistant"
          title="Chat with TRAVI travel assistant"
        >
          <Mascot size={64} variant="light-bg" />
        </button>
        <span className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-slate-800/90 px-2 py-0.5 rounded-full shadow-sm">
          Chat with us
        </span>
      </div>

      <LiveChatWidget isOpen={isChatOpen} onOpenChange={setIsChatOpen} showFloatingButton={false} />
    </>
  );
}
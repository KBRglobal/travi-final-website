import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  MapPin, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  Globe, 
  Plane, 
  Star, 
  Sparkles, 
  ArrowRight, 
  RefreshCw,
  Building2,
  Landmark,
  TreePalm,
  Building,
  ChevronDown,
  Check
} from "lucide-react";
import { SEOHead } from "@/components/seo-head";
import { motion, useScroll, useTransform, useInView, AnimatePresence, useReducedMotion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { cn } from "@/lib/utils";
import { HERO_VERSIONS, HeroVersionKey } from "@/components/destinations-hero-versions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  .animated-gradient-text {
    background: linear-gradient(
      135deg,
      #6443F4 0%,
      #8B5CF6 20%,
      #A78BFA 40%,
      #F24294 60%,
      #8B5CF6 80%,
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

interface HeroDestination {
  id: string;
  name: string;
  slug: string;
  country: string;
  image: string;
  heroImage?: string;
  fallback: string;
}

const HERO_DESTINATIONS: HeroDestination[] = [
  { id: "dubai", name: "Dubai", slug: "dubai", country: "UAE", image: "/cards/dubai.webp", heroImage: "/destination-hero/dubai-destination-hero.jpeg", fallback: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=100&h=100&fit=crop" },
  { id: "paris", name: "Paris", slug: "paris", country: "France", image: "/cards/paris.webp", heroImage: "/destination-hero/paris-destination-hero.jpeg", fallback: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=100&h=100&fit=crop" },
  { id: "tokyo", name: "Tokyo", slug: "tokyo", country: "Japan", image: "/cards/tokyo.webp", heroImage: "/destination-hero/tokyo-destination-hero.jpeg", fallback: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=100&h=100&fit=crop" },
  { id: "new-york", name: "New York", slug: "new-york", country: "USA", image: "/cards/new-york.webp", heroImage: "/destination-hero/new-york-destination-hero.jpeg", fallback: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=100&h=100&fit=crop" },
  { id: "singapore", name: "Singapore", slug: "singapore", country: "Singapore", image: "/cards/singapore.webp", heroImage: "/destination-hero/singapore-destination-hero.jpeg", fallback: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=100&h=100&fit=crop" },
  { id: "london", name: "London", slug: "london", country: "UK", image: "/cards/london.webp", heroImage: "/destination-hero/london-destination-hero.jpeg", fallback: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=100&h=100&fit=crop" },
  { id: "bangkok", name: "Bangkok", slug: "bangkok", country: "Thailand", image: "/cards/bangkok.webp", fallback: "https://images.unsplash.com/photo-1508009603885-50cf7c8dd0d5?w=100&h=100&fit=crop" },
  { id: "barcelona", name: "Barcelona", slug: "barcelona", country: "Spain", image: "/cards/barcelona.webp", heroImage: "/destination-hero/barcelona-destination-hero.jpeg", fallback: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=100&h=100&fit=crop" },
  { id: "amsterdam", name: "Amsterdam", slug: "amsterdam", country: "Netherlands", image: "/cards/amsterdam.webp", fallback: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=100&h=100&fit=crop" },
  { id: "abu-dhabi", name: "Abu Dhabi", slug: "abu-dhabi", country: "UAE", image: "/cards/abu-dhabi.webp", fallback: "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=100&h=100&fit=crop" },
  { id: "hong-kong", name: "Hong Kong", slug: "hong-kong", country: "China", image: "/cards/hong-kong.webp", fallback: "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=100&h=100&fit=crop" },
  { id: "istanbul", name: "Istanbul", slug: "istanbul", country: "Turkey", image: "/cards/istanbul.webp", fallback: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=100&h=100&fit=crop" },
  { id: "rome", name: "Rome", slug: "rome", country: "Italy", image: "/cards/rome.webp", heroImage: "/destination-hero/rome-destination-hero.jpeg", fallback: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=100&h=100&fit=crop" },
  { id: "las-vegas", name: "Las Vegas", slug: "las-vegas", country: "USA", image: "/cards/las-vegas.webp", fallback: "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=100&h=100&fit=crop" },
  { id: "miami", name: "Miami", slug: "miami", country: "USA", image: "/cards/miami.webp", fallback: "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=100&h=100&fit=crop" },
  { id: "los-angeles", name: "Los Angeles", slug: "los-angeles", country: "USA", image: "/cards/los-angeles.webp", fallback: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=100&h=100&fit=crop" },
];

interface Destination {
  id: string;
  name: string;
  country: string;
  region: string;
  flightTime: string;
  rating: number;
  description: string;
  image: string;
  imageAlt: string;
  heroImage?: string;
  heroImageAlt?: string;
  href: string;
  featured: boolean;
  hiddenGem?: boolean;
  geo: { lat: number; lng: number };
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'he', label: 'עברית' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'th', label: 'ไทย' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'vi', label: 'Tiếng Việt' },
];

const DESTINATIONS: Destination[] = [
  {
    id: "abu-dhabi",
    name: "Abu Dhabi",
    country: "UAE",
    region: "Middle East",
    flightTime: "0h",
    rating: 4.8,
    description: "Abu Dhabi blends Arabian heritage with futuristic luxury across Sheikh Zayed Grand Mosque, Louvre Abu Dhabi, and Yas Island. Average 330 days of sunshine annually make year-round travel possible. Luxury travelers find 5-star resorts starting at $180/night, while families enjoy Ferrari World and Warner Bros. theme parks. Cultural immersion meets modern comfort in the UAE's capital.",
    image: "/cards/abu-dhabi.webp",
    imageAlt: "Abu Dhabi Sheikh Zayed Grand Mosque",
    href: "/destinations/abu-dhabi",
    featured: true,
    geo: { lat: 24.4539, lng: 54.3773 }
  },
  {
    id: "amsterdam",
    name: "Amsterdam",
    country: "Netherlands",
    region: "Europe",
    flightTime: "7h",
    rating: 4.7,
    description: "Amsterdam's 165 canals and 1,281 bridges create Europe's most walkable capital, where 17th-century canal houses meet world-class museums. The Van Gogh Museum and Anne Frank House attract 6M+ visitors annually. Solo travelers love the bike-friendly infrastructure (880,000 bicycles), while couples find romantic canal cruises and tulip-filled Keukenhof Gardens. Best visited April-September for outdoor cafe culture.",
    image: "/cards/amsterdam.webp",
    imageAlt: "Amsterdam canals",
    href: "/destinations/amsterdam",
    featured: false,
    geo: { lat: 52.3676, lng: 4.9041 }
  },
  {
    id: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    region: "Asia",
    flightTime: "6h",
    rating: 4.6,
    description: "Bangkok combines ornate temples like Wat Arun and Grand Palace with vibrant street food markets across 50+ districts. Budget travelers thrive here with $25-35/day costs, Michelin-starred street food at $2, and hostels from $8/night. The BTS Skytrain makes navigation simple despite 11M population density. Experience authentic Thai culture, rooftop bars, and floating markets 90 minutes from beaches.",
    image: "/cards/bangkok.webp",
    imageAlt: "Bangkok temples and cityscape",
    href: "/destinations/bangkok",
    featured: true,
    geo: { lat: 13.7563, lng: 100.5018 }
  },
  {
    id: "barcelona",
    name: "Barcelona",
    country: "Spain",
    region: "Europe",
    flightTime: "7h",
    rating: 4.8,
    description: "Barcelona showcases Antoni Gaudí's surreal architecture across Sagrada Familia, Park Güell, and Casa Batlló, drawing 30M+ visitors yearly. The Gothic Quarter's medieval streets contrast with Barceloneta Beach's Mediterranean coastline. Adventure travelers hike Montjuïc, families explore CosmoCaixa science museum, and foodies tour La Boqueria Market's 200+ stalls. Peak season June-August; shoulder months offer 30% savings.",
    image: "/cards/barcelona.webp",
    imageAlt: "Barcelona Sagrada Familia",
    heroImage: "/destination-hero/barcelona-destination-hero.jpeg",
    heroImageAlt: "Sagrada Familia basilica with colorful spires framed by modern architectural elements - Barcelona travel destination",
    href: "/destinations/barcelona",
    featured: false,
    geo: { lat: 41.3851, lng: 2.1734 }
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    region: "Middle East",
    flightTime: "0h",
    rating: 4.9,
    description: "Dubai dominates luxury travel with Burj Khalifa (world's tallest at 828m), Palm Jumeirah artificial islands, and Dubai Mall's 1,200+ stores. Winter months (November-March) offer perfect 24°C weather versus 40°C+ summers. Families love indoor skiing at Ski Dubai, while honeymooners book desert safaris and 7-star Burj Al Arab. Tax-free shopping and Arabic hospitality meet ultra-modern infrastructure.",
    image: "/cards/dubai.webp",
    imageAlt: "Dubai skyline at sunset",
    heroImage: "/destination-hero/dubai-destination-hero.jpeg",
    heroImageAlt: "Burj Khalifa towering above Dubai skyline with modern curved architecture at sunset - Dubai luxury destination",
    href: "/destinations/dubai",
    featured: true,
    geo: { lat: 25.2048, lng: 55.2708 }
  },
  {
    id: "ras-al-khaimah",
    name: "Ras Al Khaimah",
    country: "UAE",
    region: "Middle East",
    flightTime: "0h",
    rating: 4.7,
    description: "Ras Al Khaimah offers the UAE's most diverse landscape: Jebel Jais (UAE's highest peak at 1,934m), pristine beaches on Al Marjan Island, and ancient archaeological sites dating back 7,000 years. Adventure seekers fly on Jais Flight (world's longest zipline at 2.83km), while luxury travelers anticipate Wynn Al Marjan Island opening Spring 2027. Just 45 minutes from Dubai with no tourist crowds.",
    image: "/cards/ras-al-khaimah.webp",
    imageAlt: "Ras Al Khaimah mountains and coastline",
    href: "/destinations/ras-al-khaimah",
    featured: false,
    hiddenGem: true,
    geo: { lat: 25.7895, lng: 55.9432 }
  },
  {
    id: "hong-kong",
    name: "Hong Kong",
    country: "China",
    region: "Asia",
    flightTime: "8h",
    rating: 4.7,
    description: "Hong Kong packs Victoria Peak panoramas, Star Ferry harbor crossings, and 260+ outlying islands into 1,104 km². The world's most vertical city blends Cantonese dim sum tradition with Michelin-starred innovation (68 starred restaurants). Solo travelers navigate easily via bilingual MTR system, while adventure seekers hike Dragon's Back trail rated Asia's best urban hike. Budget-friendly dai pai dongs serve $5 meals.",
    image: "/cards/hong-kong.webp",
    imageAlt: "Hong Kong skyline",
    href: "/destinations/hong-kong",
    featured: false,
    geo: { lat: 22.3193, lng: 114.1694 }
  },
  {
    id: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    region: "Europe",
    flightTime: "4h",
    rating: 4.7,
    description: "Istanbul straddles two continents where Hagia Sophia, Blue Mosque, and Topkapi Palace showcase 2,600 years of history. The Grand Bazaar's 4,000+ shops and Bosphorus strait cruises attract 15M+ annual visitors. Budget travelers find authentic Turkish cuisine at $3-5 per meal, while couples enjoy rooftop restaurants overlooking minarets at sunset. October-November and April-May offer ideal weather.",
    image: "/cards/istanbul.webp",
    imageAlt: "Istanbul Blue Mosque",
    href: "/destinations/istanbul",
    featured: false,
    geo: { lat: 41.0082, lng: 28.9784 }
  },
  {
    id: "las-vegas",
    name: "Las Vegas",
    country: "USA",
    region: "Americas",
    flightTime: "16h",
    rating: 4.5,
    description: "Las Vegas delivers 24/7 entertainment across the Strip's mega-resorts, world-class shows, and casinos drawing 40M+ visitors yearly. Beyond gambling, families explore Grand Canyon day trips (2 hours), Cirque du Soleil performances, and themed hotels like Venetian's indoor canals. Budget-conscious travelers find $49/night midweek rates and $15 buffets, while luxury seekers book Bellagio fountains-view suites.",
    image: "/cards/las-vegas.webp",
    imageAlt: "Las Vegas Strip",
    href: "/destinations/las-vegas",
    featured: false,
    geo: { lat: 36.1699, lng: -115.1398 }
  },
  {
    id: "london",
    name: "London",
    country: "UK",
    region: "Europe",
    flightTime: "7h",
    rating: 4.8,
    description: "London combines royal history at Buckingham Palace and Tower of London with 170+ museums (most free entry). The Tube's 11 lines connect 33 boroughs across this global financial hub of 9M residents. Culture seekers visit British Museum's 8M artifacts and West End's 40+ theatres, while families enjoy Harry Potter Warner Bros. Studio tours. Typical costs: £20-30 daily Tube pass, £15-25 pub meals.",
    image: "/cards/london.webp",
    imageAlt: "London Big Ben",
    heroImage: "/destination-hero/london-destination-hero.jpeg",
    heroImageAlt: "Tower of London medieval fortress with stone turrets and colorful contemporary elements - London historic destination",
    href: "/destinations/london",
    featured: true,
    geo: { lat: 51.5074, lng: -0.1278 }
  },
  {
    id: "los-angeles",
    name: "Los Angeles",
    country: "USA",
    region: "Americas",
    flightTime: "16h",
    rating: 4.6,
    description: "Los Angeles sprawls across 503 square miles blending Hollywood's entertainment industry, Santa Monica's beaches, and Getty Center's art collections. Year-round 22°C averages enable outdoor exploration of Griffith Observatory, Venice Beach boardwalk, and Rodeo Drive luxury shopping. Families prioritize Universal Studios and Disneyland (1 hour south), while adventure travelers hike Runyon Canyon's celebrity-favorite trails.",
    image: "/cards/los-angeles.webp",
    imageAlt: "Los Angeles Hollywood sign",
    href: "/destinations/los-angeles",
    featured: false,
    geo: { lat: 34.0522, lng: -118.2437 }
  },
  {
    id: "miami",
    name: "Miami",
    country: "USA",
    region: "Americas",
    flightTime: "15h",
    rating: 4.6,
    description: "Miami merges Art Deco architecture in South Beach, Latin American culture in Little Havana, and Everglades National Park's unique ecosystem 45 minutes west. Winter months (December-April) attract snowbirds with 24°C perfect beach weather versus humid 32°C summers. Cruise travelers use Miami as Caribbean gateway (world's busiest port), while nightlife seekers explore Wynwood Walls street art and Ocean Drive clubs.",
    image: "/cards/miami.webp",
    imageAlt: "Miami Beach skyline",
    href: "/destinations/miami",
    featured: false,
    geo: { lat: 25.7617, lng: -80.1918 }
  },
  {
    id: "new-york",
    name: "New York",
    country: "USA",
    region: "Americas",
    flightTime: "14h",
    rating: 4.9,
    description: "New York City concentrates Statue of Liberty, Central Park, and Empire State Building across 5 boroughs hosting 8.3M residents and 66M annual tourists. The 24/7 subway system connects 472 stations, making car-free exploration possible. Broadway's 41 theatres, MoMA's modern art, and 73 Michelin-starred restaurants cater to culture and food lovers. Budget: $33 weekly MetroCard, $15-20 pizza/deli meals.",
    image: "/cards/new-york.webp",
    imageAlt: "New York City skyline",
    heroImage: "/destination-hero/new-york-destination-hero.jpeg",
    heroImageAlt: "Statue of Liberty with torch and crown against Manhattan skyline and colorful modern frames - New York iconic destination",
    href: "/destinations/new-york",
    featured: true,
    geo: { lat: 40.7128, lng: -74.0060 }
  },
  {
    id: "paris",
    name: "Paris",
    country: "France",
    region: "Europe",
    flightTime: "7h",
    rating: 4.9,
    description: "Paris epitomizes romance with the Eiffel Tower, Louvre's 35,000 artworks, and Montmartre's cobblestone streets across 20 arrondissements. The world's most-visited city (19M tourists pre-pandemic) offers 130+ museums, 450+ parks, and 40,000+ restaurants including 119 Michelin-starred establishments. Honeymooners cruise the Seine, families explore Disneyland Paris (40 min by RER), and budget travelers use €22.80 weekly Navigo metro passes.",
    image: "/cards/paris.webp",
    imageAlt: "Eiffel Tower Paris",
    heroImage: "/destination-hero/paris-destination-hero.jpeg",
    heroImageAlt: "Eiffel Tower framed by colorful geometric sculptures and classic Parisian buildings - Paris romantic destination",
    href: "/destinations/paris",
    featured: true,
    geo: { lat: 48.8566, lng: 2.3522 }
  },
  {
    id: "rome",
    name: "Rome",
    country: "Italy",
    region: "Europe",
    flightTime: "6h",
    rating: 4.8,
    description: "Rome preserves 2,800 years of history through the Colosseum, Vatican Museums' Sistine Chapel, and Trevi Fountain across its ancient seven hills. As Italy's capital (2.8M residents), it draws 10M+ annual visitors to 900+ churches, 280 fountains, and archaeological sites like the Roman Forum. Culture enthusiasts find Renaissance art everywhere, while foodies tour Trastevere's authentic trattorias serving €10-15 pasta.",
    image: "/cards/rome.webp",
    imageAlt: "Rome Colosseum",
    heroImage: "/destination-hero/rome-destination-hero.jpeg",
    heroImageAlt: "Ancient Colosseum with iconic arches and weathered stone texture at golden hour - Rome historic destination",
    href: "/destinations/rome",
    featured: false,
    geo: { lat: 41.9028, lng: 12.4964 }
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    region: "Asia",
    flightTime: "7h",
    rating: 4.8,
    description: "Singapore packs Gardens by the Bay's Supertrees, Marina Bay Sands' rooftop infinity pool, and 16 Michelin-starred hawker stalls into 278 square miles. This ultra-modern city-state blends Chinese, Malay, and Indian cultures across neighborhoods like Chinatown and Little India. Families love Universal Studios and Night Safari, while foodies explore 100+ hawker centers with $3-5 meals. Year-round 27°C tropical climate.",
    image: "/cards/singapore.webp",
    imageAlt: "Singapore Marina Bay",
    heroImage: "/destination-hero/singapore-destination-hero.jpeg",
    heroImageAlt: "Marina Bay Sands with Supertrees at Gardens by the Bay during golden hour - Singapore modern destination",
    href: "/destinations/singapore",
    featured: true,
    geo: { lat: 1.3521, lng: 103.8198 }
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    region: "Asia",
    flightTime: "10h",
    rating: 4.9,
    description: "Tokyo juxtaposes ancient Senso-ji Temple with Shibuya Crossing's neon chaos across 23 wards hosting 14M residents. The world's most Michelin-starred city (203 total) ranges from $200 kaiseki to $8 ramen perfection. JR Pass enables easy travel to Mount Fuji (2 hours) and Kyoto (2.5 hours). Families enjoy Disneyland Tokyo and teamLab Borderless digital art, while solo travelers navigate safely via English-signage subways.",
    image: "/cards/tokyo.webp",
    imageAlt: "Tokyo skyline",
    heroImage: "/destination-hero/tokyo-destination-hero.jpeg",
    heroImageAlt: "Vibrant neon koi fish floating through modern colorful architecture with water reflections - Tokyo futuristic destination",
    href: "/destinations/tokyo",
    featured: true,
    geo: { lat: 35.6762, lng: 139.6503 }
  },
];

const REGIONS = [
  { id: "middle-east", name: "Middle East", icon: Building2 },
  { id: "europe", name: "Europe", icon: Landmark },
  { id: "asia", name: "Asia", icon: TreePalm },
  { id: "americas", name: "Americas", icon: Building },
];

const FEATURED_DESTINATIONS = DESTINATIONS.filter(d => d.featured);

const DESTINATIONS_FAQ = [
  {
    q: "How many destinations does TRAVI cover?",
    a: "TRAVI covers 17 major travel destinations across 4 regions: Middle East (Dubai, Abu Dhabi, Ras Al Khaimah), Europe (London, Paris, Barcelona, Amsterdam, Rome, Istanbul), Asia (Tokyo, Singapore, Bangkok, Hong Kong), and Americas (New York, Los Angeles, Miami, Las Vegas)."
  },
  {
    q: "What information is included in TRAVI destination guides?",
    a: "Each destination guide includes flight times from Dubai, user ratings, detailed descriptions covering attractions, accommodation options, local cuisine, transportation tips, and practical travel information. Guides feature 3,000+ attractions across all destinations."
  },
  {
    q: "Which is the highest rated destination on TRAVI?",
    a: "Dubai, Paris, Tokyo, and New York share the highest rating of 4.9 stars. These destinations offer exceptional experiences across luxury travel, cultural attractions, dining, and entertainment options."
  },
  {
    q: "Can I filter destinations by region?",
    a: "Yes, TRAVI allows filtering destinations by 4 regions: Middle East, Europe, Asia, and Americas. You can also search destinations by name or country using the search bar."
  },
  {
    q: "What are the featured destinations on TRAVI?",
    a: "TRAVI's featured destinations include Abu Dhabi, Bangkok, Dubai, London, New York, Paris, Singapore, and Tokyo. These handpicked destinations offer exceptional experiences for travelers with diverse interests from luxury to budget travel."
  }
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
  },
};

function usePreferredMotion() {
  const prefersReducedMotion = useReducedMotion();
  return !prefersReducedMotion;
}

function DestinationChip({ destination, index }: { destination: typeof HERO_DESTINATIONS[0], index: number }) {
  const shouldAnimate = usePreferredMotion();
  
  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, scale: 0.8, y: 20 } : {}}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.05, duration: 0.4, ease: "easeOut" }}
      whileHover={shouldAnimate ? { scale: 1.05, y: -4 } : {}}
    >
      <Link href={`/destinations/${destination.slug}`}>
        <div 
          className="flex items-center gap-2.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-100 dark:border-slate-700 rounded-full pl-1.5 pr-4 py-1.5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 transition-all duration-300 hover:shadow-xl hover:border-[#6443F4]/30 cursor-pointer group"
          data-testid={`chip-destination-${destination.id}`}
        >
          <img 
            src={destination.image} 
            alt={destination.name}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-[#6443F4]/20 group-hover:ring-[#6443F4]/50 transition-all"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== destination.fallback) {
                target.src = destination.fallback;
              }
            }}
          />
          <div className="flex flex-col">
            <span className="text-slate-900 dark:text-white font-medium text-sm leading-tight">{destination.name}</span>
            <span className="text-slate-500 dark:text-slate-400 text-[10px] leading-tight">{destination.country}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function LightHero() {
  const shouldAnimate = usePreferredMotion();
  const destinationCount = DESTINATIONS.length;
  const continentCount = new Set(DESTINATIONS.map(d => d.region)).size;

  return (
    <section 
      className="relative bg-white dark:bg-slate-950 min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 md:px-12 lg:px-16 overflow-hidden"
      data-testid="destinations-hero"
      aria-label="Destinations overview"
    >
      <style>{heroAnimationStyles}</style>
      
      <SubtleSkyBackground className="absolute inset-0 pointer-events-none" />
      
      <motion.div 
        className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-300/20 via-pink-200/10 to-transparent rounded-full blur-3xl pointer-events-none"
        animate={shouldAnimate ? { scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] } : {}}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      />
      <motion.div 
        className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-200/30 via-purple-100/20 to-transparent rounded-full blur-3xl pointer-events-none"
        animate={shouldAnimate ? { scale: [1, 1.15, 1], opacity: [0.25, 0.35, 0.25] } : {}}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        aria-hidden="true"
      />

      {/* Rotating gradient ring */}
      <div className="absolute top-1/2 right-0 translate-x-1/3 -translate-y-1/2 w-[800px] h-[800px] rotate-slow opacity-10 dark:opacity-15 pointer-events-none" aria-hidden="true">
        <div className="w-full h-full rounded-full border-[30px] border-transparent" style={{ borderTopColor: '#6443F4', borderRightColor: '#F24294' }} />
      </div>

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          <div className="flex-1 max-w-xl text-center lg:text-left">
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full mb-6 border border-purple-100/50 dark:border-purple-800/30"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Globe className="w-4 h-4 text-[#6443F4]" aria-hidden="true" />
              <span className="text-xs font-semibold tracking-wide text-[#6443F4] uppercase">
                {destinationCount} Destinations Worldwide
              </span>
            </motion.div>

            <motion.h1 
              className="mb-6"
              initial={shouldAnimate ? { opacity: 0, y: 30 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              data-testid="destinations-page-h1"
            >
              <span 
                className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-2" 
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                Discover
              </span>
              <span 
                className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.1] tracking-tight animated-gradient-text"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                World-Class
              </span>
              <span 
                className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white leading-[1.1] tracking-tight" 
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                Destinations
              </span>
            </motion.h1>

            <motion.p 
              className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-8 font-light leading-relaxed max-w-lg mx-auto lg:mx-0"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              data-testid="destinations-page-intro"
            >
              Curated travel guides with local expertise for the world's most captivating cities. From iconic landmarks to hidden gems.
            </motion.p>

            <motion.dl 
              className="flex flex-wrap justify-center lg:justify-start items-center gap-4 sm:gap-6 md:gap-8 mb-8"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              {[
                { num: destinationCount.toString(), label: 'DESTINATIONS', icon: MapPin },
                { num: continentCount.toString(), label: 'REGIONS', icon: Globe },
                { num: '3,000+', label: 'ATTRACTIONS', icon: Star }
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-4 sm:gap-6 md:gap-8">
                  <div className="text-center lg:text-left flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6443F4]/10 to-[#E84C9A]/10 flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-[#6443F4]" />
                    </div>
                    <div>
                      <dd className="text-2xl sm:text-3xl font-medium text-slate-900 dark:text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                        {stat.num}
                      </dd>
                      <div className="text-[10px] sm:text-[11px] text-slate-400 tracking-wider">{stat.label}</div>
                    </div>
                  </div>
                  {i < 2 && <div className="hidden sm:block w-px h-10 sm:h-12 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700 to-transparent" aria-hidden="true" />}
                </div>
              ))}
            </motion.dl>

            <motion.div 
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Link href="#explore-destinations">
                <Button 
                  className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white px-8 py-6 text-base font-medium shadow-lg shadow-purple-500/20 transition-colors duration-200"
                  data-testid="button-explore-destinations"
                >
                  Explore All Destinations
                  <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
                </Button>
              </Link>
            </motion.div>
          </div>

          <div className="flex-1 w-full max-w-2xl">
            <motion.div 
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
              initial={shouldAnimate ? { opacity: 0 } : {}}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {HERO_DESTINATIONS.map((dest, idx) => (
                <DestinationChip key={dest.id} destination={dest} index={idx} />
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % FEATURED_DESTINATIONS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const goTo = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goPrev = () => goTo((currentIndex - 1 + FEATURED_DESTINATIONS.length) % FEATURED_DESTINATIONS.length);
  const goNext = () => goTo((currentIndex + 1) % FEATURED_DESTINATIONS.length);

  return (
    <div className="relative group" role="region" aria-label="Featured destinations carousel" aria-roledescription="carousel">
      <div className="overflow-hidden rounded-3xl shadow-2xl shadow-slate-300/50 dark:shadow-slate-900/60">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="relative aspect-[2.2/1] w-full"
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${currentIndex + 1} of ${FEATURED_DESTINATIONS.length}: ${FEATURED_DESTINATIONS[currentIndex].name}`}
          >
            <img
              src={FEATURED_DESTINATIONS[currentIndex].image}
              alt={`${FEATURED_DESTINATIONS[currentIndex].name} travel guide - ${FEATURED_DESTINATIONS[currentIndex].imageAlt}`}
              className="w-full h-full object-cover"
              width={1200}
              height={550}
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B0A1F]/80 via-[#0B0A1F]/40 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-xl px-6 sm:px-10 md:px-14">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Badge className="mb-4 bg-gradient-to-r from-[#6443F4] to-[#E84C9A] text-white border-0 text-xs px-4 py-1.5 font-medium shadow-lg">
                    <Star className="w-3 h-3 mr-1.5 fill-current" aria-hidden="true" />
                    Featured Destination
                  </Badge>
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  {FEATURED_DESTINATIONS[currentIndex].name}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-3 text-white/80 text-sm sm:text-base mb-6"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#E84C9A]" aria-hidden="true" />
                    {FEATURED_DESTINATIONS[currentIndex].country}
                  </span>
                  <span className="opacity-50" aria-hidden="true">|</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Plane className="w-4 h-4 text-[#E84C9A]" aria-hidden="true" />
                    {FEATURED_DESTINATIONS[currentIndex].flightTime} from Dubai
                  </span>
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Link href={FEATURED_DESTINATIONS[currentIndex].href}>
                    <Button className="rounded-xl bg-gradient-to-r from-[#6443F4] to-[#E84C9A] hover:opacity-90 text-white px-6 py-2.5 text-sm font-medium shadow-lg transition-all duration-300 hover:scale-[1.02]">
                      Explore {FEATURED_DESTINATIONS[currentIndex].name}
                      <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 flex items-center gap-2.5">
        <Button
          size="icon"
          variant="ghost"
          onClick={goPrev}
          className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/25 hover:bg-white/25 transition-all duration-200"
          aria-label="Previous destination"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </Button>
        <div className="flex gap-1.5 px-2" role="tablist" aria-label="Carousel navigation">
          {FEATURED_DESTINATIONS.map((dest, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                idx === currentIndex 
                  ? "w-7 bg-gradient-to-r from-[#6443F4] to-[#E84C9A]" 
                  : "w-2 bg-white/50 hover:bg-white/70"
              )}
              role="tab"
              aria-selected={idx === currentIndex}
              aria-label={`Go to ${dest.name}`}
              data-testid={`carousel-dot-${idx}`}
            />
          ))}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={goNext}
          className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/25 hover:bg-white/25 transition-all duration-200"
          aria-label="Next destination"
        >
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function DestinationCard({ destination, index }: { destination: typeof DESTINATIONS[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group h-full"
      data-testid={`destination-card-${destination.id}`}
    >
      <Link href={destination.href}>
        <Card className="h-full overflow-hidden border-0 bg-white dark:bg-slate-800/60 shadow-lg hover:shadow-2xl dark:shadow-slate-900/40 transition-all duration-400 group-hover:-translate-y-1.5 rounded-2xl">
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={destination.image}
              alt={`${destination.name} ${destination.country} - ${destination.imageAlt}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              width={400}
              height={300}
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0A1F]/70 via-[#0B0A1F]/20 to-transparent" />

            <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
              <div className="flex gap-2">
                <Badge className="bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-white backdrop-blur-sm border-0 text-xs px-2.5 py-1 shadow-sm font-medium">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500 mr-1" aria-hidden="true" />
                  {destination.rating}
                </Badge>
                {(destination as any).hiddenGem && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white backdrop-blur-sm border-0 text-xs px-2.5 py-1 shadow-sm font-medium">
                    <Sparkles className="w-3 h-3 mr-1" aria-hidden="true" />
                    Hidden Gem
                  </Badge>
                )}
              </div>
              <Badge className="bg-gradient-to-r from-[#6443F4]/95 to-[#E84C9A]/95 text-white backdrop-blur-sm border-0 text-xs px-2.5 py-1 shadow-sm font-medium">
                <Plane className="w-3 h-3 mr-1" aria-hidden="true" />
                {destination.flightTime}
              </Badge>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center gap-1.5 text-white/85 text-xs mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#E84C9A]" aria-hidden="true" />
                <span>{destination.country}</span>
              </div>
              <h3 
                className="text-xl sm:text-2xl font-bold text-white leading-tight"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                {destination.name}
              </h3>
            </div>
          </div>

          <CardContent className="p-4 bg-white dark:bg-slate-800/80">
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
              {destination.description.slice(0, 90)}...
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {destination.region}
              </span>
              <span className="flex items-center text-[#6443F4] font-medium text-sm transition-all duration-300 group-hover:gap-1.5">
                Explore
                <ArrowRight className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform duration-300" aria-hidden="true" />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.article>
  );
}

function RegionSection({ region, destinations }: { region: string; destinations: typeof DESTINATIONS }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const regionData = REGIONS.find(r => r.name === region);
  const IconComponent = regionData?.icon || Globe;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6 }}
      className="mb-14"
    >
      <div className="flex items-center gap-3 mb-6">
        <div 
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6443F4] to-[#E84C9A] flex items-center justify-center shadow-lg shadow-purple-500/20"
        >
          <IconComponent className="w-6 h-6 text-white" aria-hidden="true" />
        </div>
        <div>
          <h3 
            className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-tight"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          >
            {region}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {destinations.length} {destinations.length === 1 ? 'destination' : 'destinations'}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {destinations.map((dest, idx) => (
          <DestinationCard key={dest.id} destination={dest} index={idx} />
        ))}
      </div>
    </motion.div>
  );
}

function DestinationsFAQ() {
  return (
    <section 
      className="py-20 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900/70" 
      data-testid="faq-section"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 
            id="faq-heading"
            className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          >
            Frequently Asked Questions
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            Everything you need to know about TRAVI destination guides
          </p>
        </motion.div>

        <div className="space-y-4">
          {DESTINATIONS_FAQ.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-700/50"
            >
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                {faq.q}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {faq.a}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-slate-950">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mx-auto mb-4">
          <Globe className="w-8 h-8 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        </div>
        <h2 
          className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          Unable to Load Destinations
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          We're having trouble loading destination data. Please try again later.
        </p>
        <Button 
          onClick={onRetry}
          className="rounded-xl bg-gradient-to-r from-[#6443F4] to-[#E84C9A] hover:opacity-90 text-white px-6 shadow-lg"
        >
          <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
          Refresh Page
        </Button>
      </div>
    </div>
  );
}

export default function DestinationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [heroVersion, setHeroVersion] = useState<HeroVersionKey>("V12");

  const destinationCount = DESTINATIONS.length;
  const regionCount = new Set(DESTINATIONS.map(d => d.region)).size;

  useEffect(() => {
    try {
      if (!DESTINATIONS || DESTINATIONS.length === 0) {
        throw new Error("No destinations data available");
      }
    } catch (error) {
      console.error("Destinations page error:", error);
      setHasError(true);
    }
  }, []);

  if (hasError) {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

  const filteredDestinations = DESTINATIONS.filter(dest => {
    const matchesSearch = dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dest.country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = !selectedRegion || dest.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  const groupedDestinations = REGIONS.map(region => ({
    region: region.name,
    destinations: filteredDestinations.filter(d => d.region === region.name)
  })).filter(group => group.destinations.length > 0);

  return (
    <>
      <SEOHead
        title="16 Destination Guides - Travel Tips for Dubai, Paris, Tokyo & More | TRAVI"
        description="Explore TRAVI's expert travel guides for 16 destinations worldwide including Dubai, Paris, Tokyo, New York, London, Singapore. 3,000+ attractions, local insights, flight times, ratings in 17 languages."
        canonicalPath="/destinations"
      />

      <Helmet>
        <meta name="robots" content="index, follow" />
        <meta name="keywords" content="travel destinations, city guides, Dubai travel, Paris travel, Tokyo travel, destination guides, travel planning, world destinations" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="16 Destination Guides | TRAVI" />
        <meta name="twitter:description" content="Expert travel guides for destinations worldwide. 3,000+ attractions in 17 languages." />

        <link rel="alternate" hrefLang="x-default" href="https://travi.world/destinations" />
        {SUPPORTED_LANGUAGES.map(lang => (
          <link key={lang.code} rel="alternate" hrefLang={lang.code} href={`https://travi.world/${lang.code}/destinations`} />
        ))}

        <link 
          rel="preload" 
          as="image" 
          href={FEATURED_DESTINATIONS[0].image}
        />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "TRAVI",
            "url": "https://travi.world",
            "logo": "https://travi.world/logo.png",
            "description": "Human Decision Intelligence Company providing comprehensive travel guides for 16 destinations worldwide",
            "foundingDate": "2024",
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "Customer Service",
              "availableLanguage": SUPPORTED_LANGUAGES.map(l => l.code)
            },
            "sameAs": [
              "https://www.instagram.com/travi_world",
              "https://www.tiktok.com/@travi.world"
            ]
          })}
        </script>

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Travi World-Class Destinations",
            "description": "Handpicked travel experiences, insider tips, and comprehensive guides to help you discover extraordinary places",
            "numberOfItems": DESTINATIONS.length,
            "itemListElement": DESTINATIONS.map((dest, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "TouristDestination",
                "@id": `https://travi.world${dest.href}`,
                "name": dest.name,
                "description": dest.description,
                "url": `https://travi.world${dest.href}`,
                "image": `https://travi.world${dest.heroImage || dest.image}`,
                "geo": {
                  "@type": "GeoCoordinates",
                  "latitude": dest.geo.lat,
                  "longitude": dest.geo.lng
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": dest.rating,
                  "bestRating": 5,
                  "worstRating": 1
                },
                "touristType": [
                  "Adventure Seekers",
                  "Luxury Travelers",
                  "Family Vacationers",
                  "Solo Travel"
                ]
              }
            }))
          })}
        </script>

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://travi.world"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Destinations",
                "item": "https://travi.world/destinations"
              }
            ]
          })}
        </script>

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": DESTINATIONS_FAQ.map(faq => ({
              "@type": "Question",
              "name": faq.q,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.a
              }
            }))
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-white dark:bg-slate-950">
        <PublicNav variant="default" />

        {/* Version Selector - Fixed position for easy switching */}
        <div className="fixed bottom-6 right-6 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white shadow-xl shadow-purple-500/30 px-4"
                data-testid="button-version-selector"
              >
                <span className="mr-2">Design: {heroVersion}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
              {(Object.keys(HERO_VERSIONS) as HeroVersionKey[]).map((key) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setHeroVersion(key)}
                  className={cn(
                    "flex items-center justify-between cursor-pointer",
                    heroVersion === key && "bg-purple-50 dark:bg-purple-900/20"
                  )}
                  data-testid={`select-version-${key}`}
                >
                  <div>
                    <div className="font-medium">{key} - {HERO_VERSIONS[key].name}</div>
                    <div className="text-xs text-slate-500">{HERO_VERSIONS[key].description}</div>
                  </div>
                  {heroVersion === key && <Check className="w-4 h-4 text-[#6443F4]" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <main>
          {/* Dynamic Hero based on selected version */}
          {(() => {
            const HeroComponent = HERO_VERSIONS[heroVersion].component;
            return <HeroComponent destinationCount={destinationCount} regionCount={regionCount} />;
          })()}

          <section 
            id="explore-destinations"
            className="py-20 px-4 sm:px-6 bg-white dark:bg-slate-950"
            data-testid="destinations-content"
          >
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-12"
              >
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
                  <div>
                    <h2 
                      className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3"
                      style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                    >
                      Featured Destinations
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-base max-w-xl">
                      Handpicked destinations with exceptional experiences, local insights, and everything you need to plan your perfect trip.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="search"
                        placeholder="Search destinations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 h-11 w-full sm:w-64 rounded-xl border-slate-200 dark:border-slate-700 focus:border-[#6443F4] focus:ring-[#6443F4]/20"
                        data-testid="input-search-destinations"
                      />
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      <Button
                        variant={selectedRegion === null ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedRegion(null)}
                        className={cn(
                          "rounded-full whitespace-nowrap",
                          selectedRegion === null 
                            ? "bg-gradient-to-r from-[#6443F4] to-[#E84C9A] text-white border-0" 
                            : "border-slate-200 dark:border-slate-700"
                        )}
                        data-testid="filter-all-regions"
                      >
                        All Regions
                      </Button>
                      {REGIONS.map((region) => {
                        const IconComponent = region.icon;
                        return (
                          <Button
                            key={region.id}
                            variant={selectedRegion === region.name ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedRegion(region.name)}
                            className={cn(
                              "rounded-full whitespace-nowrap",
                              selectedRegion === region.name 
                                ? "bg-gradient-to-r from-[#6443F4] to-[#E84C9A] text-white border-0" 
                                : "border-slate-200 dark:border-slate-700"
                            )}
                            data-testid={`filter-region-${region.id}`}
                          >
                            <IconComponent className="w-3.5 h-3.5 mr-1.5" />
                            {region.name}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <FeaturedCarousel />
              </motion.div>

              <div className="mt-16">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-10"
                >
                  <h2 
                    className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    All Destinations
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    {filteredDestinations.length} destinations found
                  </p>
                </motion.div>

                {groupedDestinations.length > 0 ? (
                  groupedDestinations.map((group) => (
                    <RegionSection 
                      key={group.region} 
                      region={group.region} 
                      destinations={group.destinations} 
                    />
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mx-auto mb-4">
                      <Globe className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      No destinations found
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      Try adjusting your search or filter criteria
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedRegion(null);
                      }}
                      className="rounded-full"
                      data-testid="button-clear-filters"
                    >
                      Clear Filters
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </section>

          <DestinationsFAQ />
        </main>

        <PublicFooter />
      </div>
    </>
  );
}

import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPin, ChevronRight, ChevronLeft, Search, Globe, Plane, Star, Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import { SEOHead } from "@/components/seo-head";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { cn } from "@/lib/utils";

// ============================================
// ANIMATION STYLES (from Homepage)
// ============================================
const heroAnimationStyles = `
  @keyframes gradient-flow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
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
    display: inline-block;
    padding-top: 0.1em;
    padding-bottom: 0.05em;
  }
`;

// ============================================
// SUPPORTED LANGUAGES (for hreflang)
// ============================================
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

const DESTINATIONS = [
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
    href: "/destinations/dubai",
    featured: true,
    geo: { lat: 25.2048, lng: 55.2708 }
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
    href: "/destinations/tokyo",
    featured: true,
    geo: { lat: 35.6762, lng: 139.6503 }
  },
];

const REGIONS = [
  { id: "middle-east", name: "Middle East", icon: "🕌" },
  { id: "europe", name: "Europe", icon: "🏰" },
  { id: "asia", name: "Asia", icon: "🏯" },
  { id: "americas", name: "Americas", icon: "🗽" },
];

const FEATURED_DESTINATIONS = DESTINATIONS.filter(d => d.featured);

// FAQ Data for AEO
const DESTINATIONS_FAQ = [
  {
    q: "How many destinations does TRAVI cover?",
    a: "TRAVI covers 16 major travel destinations across 4 regions: Middle East (Dubai, Abu Dhabi), Europe (London, Paris, Barcelona, Amsterdam, Rome, Istanbul), Asia (Tokyo, Singapore, Bangkok, Hong Kong), and Americas (New York, Los Angeles, Miami, Las Vegas)."
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
      <div className="overflow-hidden rounded-2xl shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60">
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
              alt={`${FEATURED_DESTINATIONS[currentIndex].name} travel guide - ${FEATURED_DESTINATIONS[currentIndex].imageAlt} with ${FEATURED_DESTINATIONS[currentIndex].rating} star rating`}
              className="w-full h-full object-cover"
              width={1200}
              height={550}
              loading="eager"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-xl px-6 sm:px-10 md:px-14">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Badge className="mb-3 bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] text-white border-0 text-xs px-3 py-1.5 font-medium shadow-lg shadow-purple-500/20">
                    <Star className="w-3 h-3 mr-1.5 fill-current" aria-hidden="true" />
                    Featured Destination
                  </Badge>
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  {FEATURED_DESTINATIONS[currentIndex].name}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-2 text-white/75 text-sm sm:text-base mb-5"
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm">
                    <MapPin className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                  </span>
                  <span>{FEATURED_DESTINATIONS[currentIndex].country}</span>
                  <span className="mx-1.5 opacity-50" aria-hidden="true">•</span>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm">
                    <Plane className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                  </span>
                  <span>{FEATURED_DESTINATIONS[currentIndex].flightTime} from Dubai</span>
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Link href={FEATURED_DESTINATIONS[currentIndex].href}>
                    <Button className="rounded-full bg-[#F24294] hover:bg-[#d93982] text-white px-6 py-2.5 text-sm font-medium shadow-lg shadow-pink-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/30 hover:scale-[1.02]">
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

      {/* Navigation Controls */}
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
                  ? "w-7 bg-gradient-to-r from-[#6443F4] to-[#8B5CF6]" 
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
        <Card className="h-full overflow-hidden border-0 bg-white dark:bg-slate-800/60 shadow-md hover:shadow-xl dark:shadow-slate-900/40 transition-all duration-400 group-hover:-translate-y-1">
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={destination.image}
              alt={`${destination.name} ${destination.country} - ${destination.imageAlt} - Rated ${destination.rating} stars`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              width={400}
              height={300}
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

            {/* Badges - Improved with gradient styling */}
            <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
              <Badge className="bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-white backdrop-blur-sm border-0 text-xs px-2.5 py-1 shadow-sm font-medium">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 mr-1.5">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                </span>
                {destination.rating}
              </Badge>
              <Badge className="bg-gradient-to-r from-[#6443F4]/95 to-[#8B5CF6]/95 text-white backdrop-blur-sm border-0 text-xs px-2.5 py-1 shadow-sm font-medium">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 mr-1.5">
                  <Plane className="w-2.5 h-2.5" aria-hidden="true" />
                </span>
                {destination.flightTime}
              </Badge>
            </div>

            {/* Destination Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center gap-1.5 text-white/85 text-xs mb-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 backdrop-blur-sm">
                  <MapPin className="w-3 h-3" aria-hidden="true" />
                </span>
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
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
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
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6443F4] to-[#8B5CF6] flex items-center justify-center text-2xl shadow-lg shadow-purple-500/20"
          aria-hidden="true"
        >
          {regionData?.icon}
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

// FAQ Component for AEO
function DestinationsFAQ() {
  return (
    <section 
      className="py-14 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900/70" 
      data-testid="faq-section"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
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

        <div className="space-y-3">
          {DESTINATIONS_FAQ.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white dark:bg-slate-800/80 rounded-xl p-5 shadow-sm border border-slate-200/80 dark:border-slate-700/50"
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

// Error State Component
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
          className="rounded-full bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] hover:from-[#5539d4] hover:to-[#7c4ee6] text-white px-6 shadow-lg shadow-purple-500/20"
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
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  const destinationCount = DESTINATIONS.length;
  const continentCount = new Set(DESTINATIONS.map(d => d.region)).size;

  // Error boundary check
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
      <style>{heroAnimationStyles}</style>

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

        {/* hreflang tags for all 17 languages */}
        <link rel="alternate" hrefLang="x-default" href="https://travi.world/destinations" />
        {SUPPORTED_LANGUAGES.map(lang => (
          <link key={lang.code} rel="alternate" hrefLang={lang.code} href={`https://travi.world/${lang.code}/destinations`} />
        ))}

        {/* Preload critical images */}
        <link 
          rel="preload" 
          as="image" 
          href={FEATURED_DESTINATIONS[0].image}
          fetchPriority="high"
        />

        {/* Organization Schema */}
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

        {/* Enhanced ItemList Schema with TouristDestination */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Travel Destination Guides",
            "description": "Expert travel guides for 16 cities worldwide with 3,000+ attractions",
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
                "image": `https://travi.world${dest.image}`,
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

        {/* BreadcrumbList Schema */}
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

        {/* FAQ Schema */}
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

      <div className="min-h-screen bg-white dark:bg-slate-950 relative">
        <SubtleSkyBackground />
        <PublicNav variant="default" />

        <main className="relative z-10">
          {/* Hero Section */}
          <section 
            ref={heroRef}
            className="pt-28 pb-12 px-4 sm:px-6 relative overflow-hidden"
            data-testid="destinations-hero"
            aria-label="Destinations overview and search"
          >
            {/* Animated decorative blobs (from Homepage) */}
            <motion.div 
              className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-300/20 via-pink-200/10 to-transparent rounded-full blur-3xl pointer-events-none"
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            />
            <motion.div 
              className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-200/30 via-purple-100/20 to-transparent rounded-full blur-3xl pointer-events-none"
              animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.35, 0.25] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              aria-hidden="true"
            />

            <div className="max-w-6xl mx-auto relative">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="text-center mb-10"
              >
                {/* Eyebrow Badge - Improved styling */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={heroInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full mb-6 border border-purple-100/50 dark:border-purple-800/30"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#6443F4] to-[#8B5CF6] flex items-center justify-center">
                    <Globe className="w-3 h-3 text-white" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold tracking-wide text-[#6443F4] uppercase">
                    Your Trusted Travel Resource
                  </span>
                </motion.div>

                {/* Main Heading with Animated Gradient Text */}
                <h1 
                  className="mb-5"
                  data-testid="destinations-page-h1"
                >
                  <span 
                    className="block text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 dark:text-white leading-[1.15] tracking-tight"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    Discover
                  </span>
                  <span 
                    className="block text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.2] tracking-tight animated-gradient-text py-1"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    Amazing Destinations
                  </span>
                </h1>

                {/* Subtitle */}
                <p 
                  className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed"
                  data-testid="destinations-page-intro"
                >
                  In-depth travel guides with local expertise for the world's most captivating cities. 
                  From iconic landmarks to hidden gems.
                </p>

                {/* Stats Row - Improved icon containers */}
                <motion.dl
                  initial={{ opacity: 0, y: 20 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-8 mb-8"
                >
                  {[
                    { value: destinationCount, label: "DESTINATIONS", icon: MapPin, gradient: "from-blue-500 to-cyan-400" },
                    { value: continentCount, label: "REGIONS", icon: Globe, gradient: "from-emerald-500 to-teal-400" },
                    { value: "3,000+", label: "ATTRACTIONS", icon: Star, gradient: "from-amber-500 to-orange-400" },
                    { value: "17", label: "LANGUAGES", icon: Sparkles, gradient: "from-violet-500 to-purple-400" },
                  ].map((stat, idx) => (
                    <div key={stat.label} className="flex items-center gap-4 sm:gap-6 md:gap-8">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={heroInView ? { opacity: 1, scale: 1 } : {}}
                        transition={{ duration: 0.4, delay: 0.4 + idx * 0.08 }}
                        className="flex flex-col items-center"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center mb-2 shadow-lg",
                          `bg-gradient-to-br ${stat.gradient}`
                        )}>
                          <stat.icon className="w-5 h-5 text-white" aria-hidden="true" />
                        </div>
                        <dt className="sr-only">{stat.label}</dt>
                        <dd 
                          className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white"
                          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                        >
                          {stat.value}
                        </dd>
                        <div className="text-[10px] text-slate-400 tracking-wider mt-0.5" aria-hidden="true">
                          {stat.label}
                        </div>
                      </motion.div>
                      {idx < 3 && (
                        <div 
                          className="hidden sm:block w-px h-12 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700 to-transparent" 
                          aria-hidden="true" 
                        />
                      )}
                    </div>
                  ))}
                </motion.dl>

                {/* Answer Capsule for AEO */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="max-w-2xl mx-auto mb-8 p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200/80 dark:border-slate-700/50 text-left shadow-sm"
                >
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                    What makes TRAVI destination guides unique?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    TRAVI combines AI-powered personalization with local expertise across 16 destinations, 
                    offering detailed guides for 3,000+ attractions in 17 languages. Each destination guide 
                    includes real user ratings, flight times from Dubai, and curated experiences for all 
                    travel styles from luxury to budget.
                  </p>
                </motion.div>

                {/* Search Input */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="max-w-md mx-auto mb-6"
                >
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#8B5CF6] flex items-center justify-center shadow-md shadow-purple-500/20">
                      <Search className="w-4 h-4 text-white" aria-hidden="true" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Search destinations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search destinations by name or country"
                      aria-describedby="search-help"
                      className="w-full pl-14 pr-4 py-3 h-14 rounded-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg shadow-slate-200/40 dark:shadow-slate-900/40 focus:ring-2 focus:ring-[#6443F4] focus:border-transparent placeholder:text-slate-400 text-sm"
                      data-testid="input-search-destinations"
                    />
                    <p id="search-help" className="sr-only">
                      Search for destinations by typing city name or country
                    </p>
                  </div>
                </motion.div>

                {/* Region Filters - Improved button styling */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={heroInView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  role="group"
                  aria-label="Filter destinations by region"
                  className="flex flex-wrap justify-center gap-2"
                >
                  <Button
                    variant={selectedRegion === null ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "rounded-full text-sm h-10 px-5 font-medium transition-all duration-300",
                      selectedRegion === null 
                        ? "bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] hover:from-[#5539d4] hover:to-[#7c4ee6] text-white shadow-lg shadow-purple-500/20" 
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-[#6443F4]/50"
                    )}
                    onClick={() => setSelectedRegion(null)}
                    aria-pressed={selectedRegion === null}
                    data-testid="filter-all"
                  >
                    All Regions
                  </Button>
                  {REGIONS.map((region) => (
                    <Button
                      key={region.id}
                      variant={selectedRegion === region.name ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "rounded-full text-sm h-10 px-5 font-medium transition-all duration-300",
                        selectedRegion === region.name 
                          ? "bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] hover:from-[#5539d4] hover:to-[#7c4ee6] text-white shadow-lg shadow-purple-500/20" 
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-[#6443F4]/50"
                      )}
                      onClick={() => setSelectedRegion(region.name)}
                      aria-pressed={selectedRegion === region.name}
                      data-testid={`filter-${region.id}`}
                    >
                      <span className="mr-2 text-base" aria-hidden="true">{region.icon}</span>
                      {region.name}
                    </Button>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* Featured Carousel Section */}
          <section 
            className="py-12 px-4 sm:px-6" 
            data-testid="featured-carousel-section"
            aria-label="Featured travel destinations carousel"
          >
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="flex items-center justify-between mb-6"
              >
                <div>
                  <h2 
                    className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    Featured Destinations
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Handpicked experiences for unforgettable journeys
                  </p>
                </div>
              </motion.div>
              <FeaturedCarousel />
            </div>
          </section>

          {/* Destinations by Region */}
          <section 
            className="py-12 px-4 sm:px-6 bg-slate-50/70 dark:bg-slate-900/50" 
            data-testid="destinations-by-region"
            aria-label="Destinations organized by geographic region"
          >
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="mb-10 text-center"
              >
                <h2 
                  className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  Explore by Region
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
                  From the ancient wonders of Europe to the vibrant cultures of Asia, 
                  find your next adventure organized by region.
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-14"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-8 h-8 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    No destinations found
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                    Try adjusting your search or filter criteria
                  </p>
                  <Button
                    className="rounded-full bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] hover:from-[#5539d4] hover:to-[#7c4ee6] text-white text-sm px-5 shadow-lg shadow-purple-500/20"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedRegion(null);
                    }}
                  >
                    Clear Filters
                  </Button>
                </motion.div>
              )}
            </div>
          </section>

          {/* FAQ Section for AEO */}
          <DestinationsFAQ />

          {/* CTA Section */}
          <section className="py-16 sm:py-20 px-4 sm:px-6 relative overflow-hidden" data-testid="cta-section">
            <div className="absolute inset-0 bg-gradient-to-r from-[#6443F4] to-[#8B5CF6]" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAtMzBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6TTYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6TTYgNGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-15" aria-hidden="true" />

            <div className="max-w-3xl mx-auto text-center relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 
                  className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  Ready to Start Your Journey?
                </h2>
                <p className="text-white/85 text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
                  Join millions of travelers who trust TRAVI for authentic travel experiences 
                  and expert local insights.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/destinations/dubai">
                    <Button 
                      size="lg" 
                      className="rounded-full bg-white text-[#6443F4] hover:bg-white/95 px-7 font-semibold shadow-lg shadow-black/15 h-11"
                    >
                      Explore Dubai
                      <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="rounded-full border-2 border-white/80 text-white bg-transparent hover:bg-white/10 px-7 font-semibold h-11"
                    >
                      Back to Home
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <PublicFooter />
      </div>

      {/* Hidden SEO Navigation - Enhanced with Region Grouping */}
      <nav className="sr-only" aria-label="Complete destination navigation">
        <h2>All Travel Destinations by Region</h2>

        {REGIONS.map(region => (
          <section key={region.id}>
            <h3>{region.name} Destinations</h3>
            <ul>
              {DESTINATIONS
                .filter(d => d.region === region.name)
                .map(dest => (
                  <li key={dest.id}>
                    <a href={dest.href}>
                      {dest.name} Travel Guide - {dest.rating} stars - {dest.flightTime} from Dubai | 
                      Best attractions, hotels, restaurants in {dest.country}
                    </a>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </nav>
    </>
  );
}
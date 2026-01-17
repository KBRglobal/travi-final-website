import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, useInView, AnimatePresence, useReducedMotion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Helmet } from "react-helmet-async";
import { 
  Star, MapPin, Globe, Crown, Sparkles, Building2, Award, 
  Wifi, Car, Utensils, Dumbbell, Waves, Bed, ArrowRight,
  Search, Coffee, Plane, Heart, Shield, Clock, Users, TrendingUp
} from "lucide-react";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { cn } from "@/lib/utils";
import { MultiDestinationInsights, DESTINATIONS_WITH_GUIDES } from "@/components/guide-insights";

// ============================================
// ANIMATION STYLES (matching Attractions page)
// ============================================
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



// ============================================
// DATA - Enhanced with SEO-focused descriptions
// ============================================
const HOTEL_DESTINATIONS = [
  { 
    slug: "dubai", 
    name: "Dubai", 
    country: "UAE",
    region: "Middle East",
    hotelCount: "800+",
    priceRange: "$50-$2,000",
    image: "/cards/dubai.webp",
    imageAlt: "Luxury 5-star hotels along Dubai Marina with Burj Khalifa and Palm Jumeirah views",
    seoDescription: "Best hotels in Dubai near Burj Khalifa, Palm Jumeirah and Dubai Marina",
    featured: true
  },
  { 
    slug: "abu-dhabi", 
    name: "Abu Dhabi", 
    country: "UAE",
    region: "Middle East",
    hotelCount: "400+",
    priceRange: "$45-$1,500",
    image: "/cards/abu-dhabi.webp",
    imageAlt: "Beach resorts and luxury hotels near Louvre Abu Dhabi and Yas Island",
    seoDescription: "Top-rated Abu Dhabi hotels near Louvre Museum, Yas Island and Corniche Beach",
    featured: true
  },
  { 
    slug: "london", 
    name: "London", 
    country: "UK",
    region: "Europe",
    hotelCount: "1,200+",
    priceRange: "$60-$3,000",
    image: "/cards/london.webp",
    imageAlt: "Historic hotels near Big Ben, Buckingham Palace and Tower Bridge in Central London",
    seoDescription: "Where to stay in London - hotels near Big Ben, Westminster and Covent Garden",
    featured: true
  },
  { 
    slug: "paris", 
    name: "Paris", 
    country: "France",
    region: "Europe",
    hotelCount: "1,000+",
    priceRange: "$70-$2,500",
    image: "/cards/paris.webp",
    imageAlt: "Boutique hotels and luxury accommodations near Eiffel Tower and Champs-Élysées",
    seoDescription: "Best Paris hotels with Eiffel Tower views, near Louvre and Champs-Élysées",
    featured: true
  },
  { 
    slug: "new-york", 
    name: "New York", 
    country: "USA",
    region: "Americas",
    hotelCount: "1,500+",
    priceRange: "$80-$3,500",
    image: "/cards/new-york.webp",
    imageAlt: "Manhattan hotels near Times Square, Central Park and Empire State Building NYC",
    seoDescription: "NYC hotels in Manhattan near Times Square, Central Park and Broadway",
    featured: true
  },
  { 
    slug: "tokyo", 
    name: "Tokyo", 
    country: "Japan",
    region: "Asia",
    hotelCount: "900+",
    priceRange: "$40-$2,000",
    image: "/cards/tokyo.webp",
    imageAlt: "Hotels in Shinjuku, Shibuya and Ginza districts with Tokyo Tower and Mount Fuji views",
    seoDescription: "Best Tokyo hotels in Shinjuku, Shibuya, Ginza near Tokyo Tower and Sensoji Temple",
    featured: true
  },
  { 
    slug: "singapore", 
    name: "Singapore", 
    country: "Singapore",
    region: "Asia",
    hotelCount: "600+",
    priceRange: "$50-$1,800",
    image: "/cards/singapore.webp",
    imageAlt: "Marina Bay Sands area hotels with infinity pool views and Gardens by the Bay",
    seoDescription: "Singapore hotels near Marina Bay Sands, Sentosa Island and Orchard Road",
    featured: false
  },
  { 
    slug: "bangkok", 
    name: "Bangkok", 
    country: "Thailand",
    region: "Asia",
    hotelCount: "850+",
    priceRange: "$25-$800",
    image: "/cards/bangkok.webp",
    imageAlt: "Riverside hotels along Chao Phraya near Grand Palace and Wat Arun temple",
    seoDescription: "Cheap and luxury Bangkok hotels near Grand Palace, Khao San Road and Sukhumvit",
    featured: false
  },
  { 
    slug: "barcelona", 
    name: "Barcelona", 
    country: "Spain",
    region: "Europe",
    hotelCount: "650+",
    priceRange: "$40-$1,200",
    image: "/cards/barcelona.webp",
    imageAlt: "Beachfront hotels on Barceloneta and accommodations near Sagrada Familia and La Rambla",
    seoDescription: "Barcelona hotels near Sagrada Familia, La Rambla, Gothic Quarter and beach",
    featured: false
  },
  { 
    slug: "rome", 
    name: "Rome", 
    country: "Italy",
    region: "Europe",
    hotelCount: "750+",
    priceRange: "$50-$1,500",
    image: "/cards/rome.webp",
    imageAlt: "Historic hotels near Colosseum, Vatican City, Trevi Fountain and Spanish Steps",
    seoDescription: "Best Rome hotels near Colosseum, Vatican, Trevi Fountain and Trastevere",
    featured: false
  },
  { 
    slug: "amsterdam", 
    name: "Amsterdam", 
    country: "Netherlands",
    region: "Europe",
    hotelCount: "500+",
    priceRange: "$55-$1,000",
    image: "/cards/amsterdam.webp",
    imageAlt: "Canal-side boutique hotels in Jordaan and city center near Anne Frank House",
    seoDescription: "Amsterdam hotels on canals near Rijksmuseum, Anne Frank House and Red Light District",
    featured: false
  },
  { 
    slug: "hong-kong", 
    name: "Hong Kong", 
    country: "China",
    region: "Asia",
    hotelCount: "550+",
    priceRange: "$50-$1,800",
    image: "/cards/hong-kong.webp",
    imageAlt: "Victoria Harbour hotels with skyline views in Tsim Sha Tsui and Central district",
    seoDescription: "Hong Kong hotels with harbour views in Kowloon, Central and Causeway Bay",
    featured: false
  },
  { 
    slug: "istanbul", 
    name: "Istanbul", 
    country: "Turkey",
    region: "Europe",
    hotelCount: "700+",
    priceRange: "$30-$600",
    image: "/cards/istanbul.webp",
    imageAlt: "Bosphorus view hotels in Sultanahmet near Blue Mosque, Hagia Sophia and Grand Bazaar",
    seoDescription: "Istanbul hotels in Sultanahmet near Blue Mosque, Hagia Sophia and Taksim Square",
    featured: false
  },
  { 
    slug: "las-vegas", 
    name: "Las Vegas", 
    country: "USA",
    region: "Americas",
    hotelCount: "450+",
    priceRange: "$40-$2,000",
    image: "/cards/las-vegas.webp",
    imageAlt: "Casino resort hotels on Las Vegas Strip including Bellagio, Venetian and Caesars Palace",
    seoDescription: "Las Vegas Strip hotels and resorts - Bellagio, Venetian, MGM Grand and Caesars Palace",
    featured: false
  },
  { 
    slug: "los-angeles", 
    name: "Los Angeles", 
    country: "USA",
    region: "Americas",
    hotelCount: "700+",
    priceRange: "$60-$2,500",
    image: "/cards/los-angeles.webp",
    imageAlt: "Hotels in Hollywood, Beverly Hills, Santa Monica beach and near Universal Studios LA",
    seoDescription: "LA hotels in Hollywood, Beverly Hills, Santa Monica and near Disneyland",
    featured: false
  },
  { 
    slug: "miami", 
    name: "Miami", 
    country: "USA",
    region: "Americas",
    hotelCount: "600+",
    priceRange: "$55-$1,500",
    image: "/cards/miami.webp",
    imageAlt: "Art Deco beachfront hotels on Miami Beach, South Beach and Brickell downtown area",
    seoDescription: "Miami Beach hotels in South Beach, Ocean Drive and downtown Brickell",
    featured: false
  },
];

const REGIONS = [
  { id: "middle-east", name: "Middle East", icon: "🕌" },
  { id: "europe", name: "Europe", icon: "🏰" },
  { id: "asia", name: "Asia", icon: "🏯" },
  { id: "americas", name: "Americas", icon: "🗽" },
];

const AMENITY_CATEGORIES = [
  { 
    icon: Wifi, 
    label: "High-Speed WiFi",
    description: "Complimentary internet",
    gradient: "from-blue-500 to-cyan-400"
  },
  { 
    icon: Car, 
    label: "Valet Parking",
    description: "24/7 parking service",
    gradient: "from-slate-500 to-slate-400"
  },
  { 
    icon: Utensils, 
    label: "Fine Dining",
    description: "Michelin-starred options",
    gradient: "from-amber-500 to-orange-400"
  },
  { 
    icon: Dumbbell, 
    label: "Fitness Center",
    description: "State-of-the-art equipment",
    gradient: "from-red-500 to-rose-400"
  },
  { 
    icon: Waves, 
    label: "Pool & Spa",
    description: "Luxury wellness facilities",
    gradient: "from-cyan-500 to-teal-400"
  },
  { 
    icon: Coffee, 
    label: "Concierge",
    description: "24/7 personal service",
    gradient: "from-violet-500 to-purple-400"
  },
];

const HOTEL_CATEGORIES = [
  {
    stars: 5,
    title: "Luxury & 5-Star",
    subtitle: "World-Class Excellence",
    description: "Exceptional properties offering unparalleled luxury, personalized service, Michelin-starred dining, and extraordinary experiences.",
    icon: Crown,
    features: ["Butler Service", "Spa & Wellness", "Fine Dining", "Premium Suites"],
    gradient: "from-amber-400 to-yellow-500"
  },
  {
    stars: 4,
    title: "Premium & 4-Star",
    subtitle: "Superior Comfort",
    description: "Outstanding hotels delivering excellent amenities, attentive service, and memorable stays at great value.",
    icon: Award,
    features: ["Room Service", "Fitness Center", "Restaurant", "Pool Access"],
    gradient: "from-violet-500 to-purple-400"
  },
  {
    stars: 3,
    title: "Mid-Range & Boutique",
    subtitle: "Quality & Value",
    description: "Well-appointed hotels offering comfortable accommodations, essential amenities, and convenient locations.",
    icon: Building2,
    features: ["Free WiFi", "Daily Housekeeping", "24/7 Reception", "Central Location"],
    gradient: "from-blue-500 to-cyan-400"
  },
  {
    stars: 2,
    title: "Budget-Friendly",
    subtitle: "Smart Savings",
    description: "Clean and comfortable options perfect for budget-conscious travelers who want quality basics.",
    icon: Bed,
    features: ["Clean Rooms", "WiFi Access", "Great Value", "Local Experience"],
    gradient: "from-emerald-500 to-teal-400"
  }
];

// FAQ for AEO - Focused on real tourist search queries
const HOTELS_FAQ = [
  {
    q: "What are the best areas to stay in Dubai for tourists?",
    a: "For first-time visitors, Downtown Dubai near Burj Khalifa offers iconic views and easy metro access. Dubai Marina is perfect for beach lovers with walkable restaurants and nightlife. Palm Jumeirah has the most luxurious beach resorts. JBR (Jumeirah Beach Residence) is ideal for families with its beachfront promenade."
  },
  {
    q: "How much does a hotel cost per night in Paris?",
    a: "Paris hotel prices vary by neighborhood and season. Budget hostels start around €40-60/night, mid-range 3-star hotels €100-180/night, and luxury 5-star hotels €400-1,000+/night. The Marais and Latin Quarter offer good value, while hotels near the Eiffel Tower and Champs-Élysées are pricier."
  },
  {
    q: "Where should I stay in Tokyo for first time visitors?",
    a: "Shinjuku is best for nightlife, shopping and transport connections. Shibuya suits young travelers wanting trendy shops and cafes. Ginza offers upscale shopping and dining. Asakusa provides traditional atmosphere near Sensoji Temple. All areas have excellent metro access to Tokyo's top attractions."
  },
  {
    q: "What is the cheapest city for hotels in Europe?",
    a: "Istanbul offers the best value with quality hotels from $30-50/night in central areas like Sultanahmet. Lisbon, Budapest, and Prague also offer excellent rates compared to Western Europe. Barcelona and Rome are mid-range, while London and Paris are typically the most expensive European capitals."
  },
  {
    q: "Are hotels cheaper if you book directly or through booking sites?",
    a: "Booking directly with hotels often provides best rate guarantees, loyalty points, and flexible cancellation. However, comparison sites help find deals across multiple properties. For luxury hotels, booking direct usually offers room upgrades and amenities. Budget hotels often have the same prices everywhere."
  },
  {
    q: "What hotels in New York have the best views of Central Park?",
    a: "The Ritz-Carlton New York and Mandarin Oriental offer stunning Central Park views from higher floors. The Plaza Hotel is iconic with park-facing suites. JW Marriott Essex House and Park Lane Hotel provide more affordable options with park views. Book park-view rooms specifically as not all rooms face the park."
  }
];

// ============================================
// COMPONENTS
// ============================================

function HotelDestinationCard({ destination, index }: { destination: typeof HOTEL_DESTINATIONS[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group h-full"
      data-testid={`hotel-card-${destination.slug}`}
    >
      <Link href={`/hotels/${destination.slug}`}>
        <Card className="h-full overflow-hidden border-0 bg-white dark:bg-slate-800/60 shadow-md hover:shadow-xl dark:shadow-slate-900/40 transition-all duration-400 group-hover:-translate-y-1">
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={destination.image}
              alt={destination.imageAlt}
              title={`${destination.name} Hotels - ${destination.seoDescription}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              width={400}
              height={300}
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

            {/* Badges */}
            <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
              <Badge className="bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-white backdrop-blur-sm border-0 text-xs px-2.5 py-1 shadow-sm font-medium">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 mr-1.5">
                  <Building2 className="w-2.5 h-2.5 text-emerald-600" aria-hidden="true" />
                </span>
                {destination.hotelCount} hotels
              </Badge>
              {destination.featured && (
                <Badge className="bg-gradient-to-r from-amber-500/95 to-yellow-500/95 text-white backdrop-blur-sm border-0 text-xs px-2.5 py-1 shadow-sm font-medium">
                  <Star className="w-3 h-3 mr-1 fill-current" aria-hidden="true" />
                  Top Destination
                </Badge>
              )}
            </div>

            {/* Destination Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center gap-1.5 text-white/85 text-xs mb-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 backdrop-blur-sm">
                  <MapPin className="w-3 h-3" aria-hidden="true" />
                </span>
                <span>{destination.country}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                {destination.name} Hotels
              </h3>
            </div>
          </div>

          <CardContent className="p-4 bg-white dark:bg-slate-800/80">
            {/* SEO-focused description */}
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
              {destination.seoDescription}
            </p>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {destination.region}
              </span>
              <span className="text-xs font-semibold text-[#6443F4]">
                From {destination.priceRange.split('-')[0]}/night
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={cn(
                      "w-3 h-3",
                      i < 4 ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"
                    )} 
                    aria-hidden="true" 
                  />
                ))}
                <span className="text-xs text-slate-500 ml-1">& up</span>
              </div>
              <span className="flex items-center text-[#6443F4] font-medium text-sm transition-all duration-300 group-hover:gap-1.5">
                View Hotels
                <ArrowRight className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform duration-300" aria-hidden="true" />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.article>
  );
}

function RegionSection({ region, destinations }: { region: string; destinations: typeof HOTEL_DESTINATIONS }) {
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
          <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
            Best Hotels in {region}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {destinations.length} popular {destinations.length === 1 ? 'destination' : 'destinations'} for travelers
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {destinations.map((dest, idx) => (
          <HotelDestinationCard key={dest.slug} destination={dest} index={idx} />
        ))}
      </div>
    </motion.div>
  );
}

function HotelsFAQ() {
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
          >
            Hotel Booking Tips & Travel Advice
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            Answers to common questions about where to stay worldwide
          </p>
        </motion.div>

        <div className="space-y-3">
          {HOTELS_FAQ.map((faq, i) => (
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

export default function GlobalHotels() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  const totalHotels = HOTEL_DESTINATIONS.reduce((sum, d) => {
    const count = parseInt(d.hotelCount.replace(/[^0-9]/g, ''));
    return sum + count;
  }, 0);

  const filteredDestinations = HOTEL_DESTINATIONS.filter(dest => {
    const matchesSearch = dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dest.country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = !selectedRegion || dest.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  const groupedDestinations = REGIONS.map(region => ({
    region: region.name,
    destinations: filteredDestinations.filter(d => d.region === region.name)
  })).filter(group => group.destinations.length > 0);

  // Hero carousel state - matching attractions pattern
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const dest = HOTEL_DESTINATIONS[currentIndex];
  const shouldAnimate = usePreferredMotion();

  // Preload next image
  useEffect(() => {
    const nextIndex = (currentIndex + 1) % HOTEL_DESTINATIONS.length;
    const img = new Image();
    img.src = HOTEL_DESTINATIONS[nextIndex].image;
  }, [currentIndex]);

  // Auto-rotation with animation timing - respects reduced motion
  useEffect(() => {
    if (!shouldAnimate) return;

    let animationTimeout: NodeJS.Timeout;
    const timer = setInterval(() => {
      setIsAnimating(true);
      animationTimeout = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % HOTEL_DESTINATIONS.length);
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

  return (
    <>
      <style>{heroAnimationStyles}</style>

      <Helmet>
        {/* Primary SEO - Tourist-focused, not brand-focused */}
        <title>Best Hotels Worldwide – Dubai, Paris, London & More | TRAVI</title>
        <meta name="description" content="Find the best hotels near top attractions in Dubai, Paris, London, New York, Tokyo and more. Compare 10,000+ hotels from $25/night budget stays to luxury 5-star resorts with real reviews." />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />

        {/* Open Graph for social sharing */}
        <meta property="og:title" content="Best Hotels in Dubai, Paris, London & Tokyo - Compare 10,000+ Properties" />
        <meta property="og:description" content="Find where to stay in the world's top destinations. Hotels near Burj Khalifa, Eiffel Tower, Times Square and more from $25/night." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://travi.world/hotels" />
        <meta property="og:image" content="https://travi.world/cards/dubai.webp" />
        <meta property="og:image:alt" content="Luxury hotels in Dubai with Burj Khalifa skyline" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Best Hotels in Dubai, Paris, London & Tokyo" />
        <meta name="twitter:description" content="Compare 10,000+ hotels in 16 destinations. From $25/night." />
        <meta name="twitter:image" content="https://travi.world/cards/dubai.webp" />

        <link rel="canonical" href="https://travi.world/hotels" />

        {/* Preload critical images */}

        {/* WebPage Schema - Main entity */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Best Hotels Worldwide - Dubai, Paris, London, Tokyo & More",
            "description": "Find the best hotels near top attractions in 16 destinations worldwide",
            "url": "https://travi.world/hotels",
            "isPartOf": {
              "@type": "WebSite",
              "name": "TRAVI Travel Guide",
              "url": "https://travi.world"
            },
            "about": {
              "@type": "Thing",
              "name": "Hotels and Accommodations"
            },
            "mentions": HOTEL_DESTINATIONS.map(dest => ({
              "@type": "City",
              "name": dest.name,
              "containedInPlace": {
                "@type": "Country",
                "name": dest.country
              }
            }))
          })}
        </script>

        {/* ItemList Schema - Hotel destinations */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Best Hotel Destinations Worldwide",
            "description": "Top 16 cities for hotels - Dubai, Paris, London, New York, Tokyo and more",
            "numberOfItems": HOTEL_DESTINATIONS.length,
            "itemListElement": HOTEL_DESTINATIONS.map((dest, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "TouristDestination",
                "@id": `https://travi.world/hotels/${dest.slug}`,
                "name": `${dest.name} Hotels`,
                "description": dest.seoDescription,
                "url": `https://travi.world/hotels/${dest.slug}`,
                "image": `https://travi.world${dest.image}`,
                "touristType": ["Leisure", "Business", "Family"],
                "containedInPlace": {
                  "@type": "Country",
                  "name": dest.country
                }
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
              { "@type": "ListItem", "position": 1, "name": "Travel Guide", "item": "https://travi.world" },
              { "@type": "ListItem", "position": 2, "name": "Hotels", "item": "https://travi.world/hotels" }
            ]
          })}
        </script>

        {/* FAQ Schema - Real tourist questions */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": HOTELS_FAQ.map(faq => ({
              "@type": "Question",
              "name": faq.q,
              "acceptedAnswer": { "@type": "Answer", "text": faq.a }
            }))
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-white dark:bg-slate-950 relative">
        <SubtleSkyBackground />
        <PublicNav variant="default" />

        <main className="relative z-10">
          {/* Split-Screen Immersive Hero */}
          <section 
            ref={heroRef}
            className="relative min-h-screen bg-slate-50 dark:bg-slate-950"
            data-testid="section-hotels-hero"
            aria-label="Find hotels in top destinations worldwide"
          >
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
              {/* Morphing blobs */}
              <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-purple-200/40 via-pink-100/30 to-purple-100/40 dark:from-purple-900/30 dark:via-pink-900/20 dark:to-purple-900/30 morph-blob blur-3xl" />
              <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-blue-100/30 via-purple-100/20 to-pink-100/30 dark:from-blue-900/20 dark:via-purple-900/15 dark:to-pink-900/20 morph-blob blur-3xl" style={{ animationDelay: '-4s' }} />

              {/* Rotating gradient ring */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rotate-slow opacity-10 dark:opacity-20">
                <div className="w-full h-full rounded-full border-[40px] border-transparent" style={{ borderTopColor: '#6443F4', borderRightColor: '#F24294' }} />
              </div>

              {/* Grid dots pattern */}
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(#6443F4 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            </div>

              <div className="relative z-10 min-h-screen flex items-center pt-32 pb-16 lg:pt-40 lg:pb-24">
              <div className="max-w-[90rem] mx-auto w-full">
                <div className="grid lg:grid-cols-2 gap-8 items-center">

                  {/* Left Side - Content - Text first on mobile (order-1) */}
                  <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 order-1">

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
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300" data-testid="badge-hotels-count">
                          Compare <span className="text-[#6443F4]">{totalHotels.toLocaleString()}+</span> hotels in 16 cities
                        </span>
                      </div>
                    </motion.div>

                    {/* Main Headline - SEO focused on tourist searches */}
                    <motion.h1 
                      className="mb-6"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    >
                      <span 
                        className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-2"
                        style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                      >
                        Where to Stay
                      </span>
                      <span className="relative inline-block">
                        <span 
                          className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.1] tracking-tight animated-gradient-text"
                          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                        >
                          Worldwide
                        </span>
                        {/* Gradient underline accent */}
                        <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-[#6443F4] via-[#8B5CF6] to-[#F24294] rounded-full opacity-80" />
                      </span>
                    </motion.h1>

                    {/* Subtitle - Tourist focused */}
                    <motion.p 
                      className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mb-8"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.35 }}
                    >
                      Find <span className="text-slate-800 dark:text-slate-200 font-semibold">hotels near top attractions</span> in Dubai, Paris, London, Tokyo and 12 more destinations.
                    </motion.p>

                    {/* Search Bar */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.5 }}
                      className="relative mb-8"
                    >
                      <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                        <div className="absolute left-5 w-10 h-10 rounded-xl bg-gradient-to-br from-[#6443F4] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-[#6443F4]/30" aria-hidden="true">
                          <Search className="w-5 h-5 text-white" />
                        </div>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search city or country (e.g. Dubai, Japan)"
                          className="w-full pl-20 pr-28 py-5 text-lg bg-transparent border-0 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0 rounded-2xl"
                          data-testid="input-search-hotels"
                          aria-label="Search hotels by city or country"
                          role="searchbox"
                        />
                        <button 
                          className="absolute right-3 px-6 py-3 rounded-full bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] text-white font-semibold hover:opacity-90 transition-all shadow-lg shadow-[#6443F4]/30"
                          onClick={() => searchQuery && navigate(`/hotels?search=${encodeURIComponent(searchQuery)}`)}
                          data-testid="button-search"
                          aria-label="Search hotels"
                        >
                          Search
                        </button>
                      </div>
                    </motion.div>

                    {/* Quick Tags - Popular destinations people search for */}
                    <motion.div 
                      className="flex flex-wrap gap-2 mb-10"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.55 }}
                    >
                      <span className="text-sm text-slate-400">Popular:</span>
                      {[
                        { name: 'Dubai', slug: 'dubai', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300' },
                        { name: 'Paris', slug: 'paris', color: 'bg-pink-50 text-pink-700 hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-300' },
                        { name: 'London', slug: 'london', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300' },
                        { name: 'New York', slug: 'new-york', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300' },
                      ].map((tag) => (
                        <Link key={tag.name} href={`/hotels/${tag.slug}`}>
                          <button 
                            className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors ${tag.color}`}
                            data-testid={`trending-tag-${tag.slug}`}
                          >
                            Hotels in {tag.name}
                          </button>
                        </Link>
                      ))}
                    </motion.div>

                    {/* Stats Row */}
                    <motion.div 
                      className="grid grid-cols-3 gap-4 mb-10"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                    >
                      <div className="text-center p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur border border-white dark:border-slate-700 shadow-sm">
                        <div className="text-3xl font-black text-slate-900 dark:text-white">10K+</div>
                        <div className="text-sm text-slate-500 font-medium">Hotels</div>
                      </div>
                      <div className="text-center p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur border border-white dark:border-slate-700 shadow-sm">
                        <div className="text-3xl font-black text-slate-900 dark:text-white">16</div>
                        <div className="text-sm text-slate-500 font-medium">Cities</div>
                      </div>
                      <div className="text-center p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur border border-white dark:border-slate-700 shadow-sm">
                        <div className="text-3xl font-black text-slate-900 dark:text-white">$25</div>
                        <div className="text-sm text-slate-500 font-medium">From/night</div>
                      </div>
                    </motion.div>

                    {/* CTA Buttons */}
                    <motion.div 
                      className="flex flex-col sm:flex-row gap-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.65 }}
                    >
                      <Link href="/hotels/dubai">
                        <Button 
                          className="rounded-full bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] hover:opacity-90 text-white px-8 py-6 text-base font-semibold shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
                          data-testid="button-explore-dubai"
                          aria-label="Browse hotels in Dubai"
                        >
                          Hotels in Dubai
                          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                        </Button>
                      </Link>
                      <Link href="#destinations">
                        <Button 
                          variant="outline"
                          className="rounded-full px-8 py-6 text-base font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                          data-testid="button-browse-all"
                          aria-label="View all hotel destinations"
                        >
                          <Globe className="w-5 h-5 text-[#6443F4] mr-2" aria-hidden="true" />
                          All 16 Destinations
                        </Button>
                      </Link>
                    </motion.div>
                  </div>

                  {/* Right Side - Bento Grid Gallery - Second on mobile (order-2) */}
                  <div className="relative px-6 sm:px-12 lg:px-8 lg:pr-12 xl:pr-16 order-2">
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
                        aria-label="Featured hotel destination"
                      >
                        <AnimatePresence mode="wait">
                          <motion.img 
                            key={currentIndex}
                            src={dest.image} 
                            alt={dest.imageAlt}
                            title={dest.seoDescription}
                            className="w-full h-full object-cover"
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.7 }}
                            loading={currentIndex === 0 ? "eager" : "lazy"}
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
                              <span className="text-slate-500 text-sm">(12K+ reviews)</span>
                            </div>
                            {dest.featured && (
                              <motion.div 
                                className="relative px-4 py-2 rounded-full bg-gradient-to-r from-[#6443F4] to-[#F24294] text-white text-sm font-semibold shadow-lg"
                                animate={{ scale: [1, 1.02, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                Top Destination
                              </motion.div>
                            )}
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
                              <span className="font-medium">{dest.country}</span>
                            </div>

                            {/* Title */}
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">Hotels in {dest.name}</h2>

                            {/* SEO Description */}
                            <p className="text-white/70 text-sm mb-4 line-clamp-2">{dest.seoDescription}</p>

                            {/* Info Row */}
                            <div className="flex flex-wrap items-center gap-4 mb-6">
                              <div className="flex items-center gap-2 text-white/80">
                                <Building2 className="w-5 h-5" />
                                <span>{dest.hotelCount} properties</span>
                              </div>
                              <div className="flex items-center gap-2 text-white/80">
                                <Crown className="w-5 h-5" />
                                <span>Budget to Luxury</span>
                              </div>
                            </div>

                            {/* Price and CTA */}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-white/60 text-sm">From</span>
                                <span className="text-3xl font-bold text-white ml-2">{dest.priceRange.split('-')[0]}</span>
                                <span className="text-white/60 text-sm">/night</span>
                              </div>
                              <Link href={`/hotels/${dest.slug}`}>
                                <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-slate-900 font-bold hover:bg-[#6443F4]/10 hover:text-[#6443F4] transition-all shadow-xl hover:shadow-2xl hover:scale-105 transform">
                                  View Hotels
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
                        aria-label="Hotel destination thumbnails"
                      >
                        {HOTEL_DESTINATIONS.slice(0, 5).map((destination, i) => (
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
                            aria-label={`View hotels in ${destination.name}`}
                          >
                            <img 
                              src={destination.image} 
                              alt={`${destination.name} hotels`} 
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
                              <Shield className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 dark:text-white">Best Price Match</div>
                              <div className="text-sm text-slate-500">Compare all sites</div>
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
                              <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 dark:text-white">Free Cancellation</div>
                              <div className="text-sm text-slate-500">On most bookings</div>
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

          {/* Hotel Categories Section */}
          <section id="hotel-categories" className="py-12 px-4 sm:px-6 bg-white dark:bg-slate-950" data-testid="hotel-categories">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-10"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
                  Hotels for Every Budget
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
                  From $25/night hostels to $2,000/night luxury suites - find your perfect stay
                </p>
              </motion.div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {HOTEL_CATEGORIES.map((category, idx) => (
                  <motion.div
                    key={category.stars}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="p-5 h-full bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/50 shadow-sm hover:shadow-lg transition-all duration-300">
                      <div className="flex flex-col h-full">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg mb-4",
                          `bg-gradient-to-br ${category.gradient}`
                        )}>
                          <category.icon className="w-6 h-6 text-white" aria-hidden="true" />
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={cn(
                                "w-3.5 h-3.5",
                                i < category.stars ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"
                              )} 
                              aria-hidden="true" 
                            />
                          ))}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                          {category.title}
                        </h3>
                        <p className="text-xs text-[#6443F4] font-medium mb-2">{category.subtitle}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 flex-1">
                          {category.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {category.features.map((feature, i) => (
                            <Badge 
                              key={i}
                              className="bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-0 text-[10px] px-2 py-0.5"
                            >
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Amenities Section */}
          <section className="py-12 px-4 sm:px-6 bg-slate-50/70 dark:bg-slate-900/50" data-testid="amenities-section">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-10"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
                  What to Expect From Hotels
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
                  Common amenities available at hotels in our destinations
                </p>
              </motion.div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {AMENITY_CATEGORIES.map((amenity, idx) => (
                  <motion.div
                    key={amenity.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex flex-col items-center p-4 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-md",
                      `bg-gradient-to-br ${amenity.gradient}`
                    )}>
                      <amenity.icon className="w-6 h-6 text-white" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                      {amenity.label}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
                      {amenity.description}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Hotels by Region - Main destinations section */}
          <section 
            id="destinations"
            className="py-12 px-4 sm:px-6 bg-white dark:bg-slate-950" 
            data-testid="hotels-by-region"
          >
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-10 text-center"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
                  Find Hotels by Destination
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
                  Browse hotels in Dubai, Paris, London, New York and 12 more popular cities
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
                    <Building2 className="w-8 h-8 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
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

          {/* Guide Insights Section - Where to Stay tips from travel guides */}
          <MultiDestinationInsights
            destinations={[...DESTINATIONS_WITH_GUIDES].slice(0, 6)}
            sectionType="sleep"
            title="Where to Stay: Local Tips"
          />

          {/* FAQ Section - Tourist-focused questions */}
          <HotelsFAQ />

          {/* Internal Links Section - Important for SEO */}
          <section className="py-10 px-4 sm:px-6 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Explore More Travel Guides
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/attractions" className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Sparkles className="w-5 h-5 text-[#6443F4]" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tourist Attractions</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
                </Link>
                <Link href="/restaurants" className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Utensils className="w-5 h-5 text-[#6443F4]" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Best Restaurants</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
                </Link>
                <Link href="/destinations" className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Globe className="w-5 h-5 text-[#6443F4]" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">All Destinations</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
                </Link>
                <Link href="/articles" className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <TrendingUp className="w-5 h-5 text-[#6443F4]" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Travel News</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
                </Link>
              </div>
            </div>
          </section>

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
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to Book Your Hotel?
                </h2>
                <p className="text-white/85 text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
                  Compare prices and find the best deals on hotels in Dubai, Paris, London and more top destinations.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/hotels/dubai">
                    <Button 
                      size="lg" 
                      className="rounded-full bg-white text-[#6443F4] hover:bg-white/95 px-7 font-semibold shadow-lg shadow-black/15 h-11"
                    >
                      Hotels in Dubai
                      <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                    </Button>
                  </Link>
                  <Link href="/hotels/paris">
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="rounded-full border-2 border-white/80 text-white bg-transparent hover:bg-white/10 px-7 font-semibold h-11"
                    >
                      Hotels in Paris
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
      <nav className="sr-only" aria-label="All hotel destinations">
        <h2>Hotels in Popular Destinations Worldwide</h2>
        {REGIONS.map(region => (
          <section key={region.id}>
            <h3>Hotels in {region.name}</h3>
            <ul>
              {HOTEL_DESTINATIONS
                .filter(d => d.region === region.name)
                .map(dest => (
                  <li key={dest.slug}>
                    <a href={`/hotels/${dest.slug}`}>
                      Hotels in {dest.name} - {dest.seoDescription} | 
                      {dest.hotelCount} properties from {dest.priceRange}/night
                    </a>
                  </li>
                ))}
            </ul>
          </section>
        ))}

        <h3>Related Travel Guides</h3>
        <ul>
          <li><a href="/attractions">Tourist Attractions Worldwide</a></li>
          <li><a href="/restaurants">Best Restaurants in Top Destinations</a></li>
          <li><a href="/destinations">Complete Travel Guides by City</a></li>
          <li><a href="/articles">Latest Travel News and Tips</a></li>
        </ul>
      </nav>
    </>
  );
}
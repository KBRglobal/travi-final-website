// Data Source: TripAdvisor API (pending integration)
// Structure ready for: restaurants, cuisines, dining experiences
// Status: Awaiting API credentials

import { useState, useRef, type FormEvent } from "react";
import { Link } from "wouter";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { motion, useInView } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { cn } from "@/lib/utils";
import { 
  UtensilsCrossed, MapPin, Search, ChevronLeft, ChevronRight,
  Star, Quote, Heart, Users, Briefcase, User, UsersRound,
  Globe, Clock, Shirt, Languages, Mail, ArrowRight,
  Sparkles, Award, ThumbsUp, Flame, Cherry, Coffee, Wine, 
  IceCream, ShoppingBasket, Utensils, CheckCircle, Compass, BookOpen
} from "lucide-react";
import { MultiDestinationInsights, DESTINATIONS_WITH_GUIDES } from "@/components/guide-insights";

// ============================================
// ANIMATION STYLES (matching other pages)
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
// CONSTANTS
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

// ============================================
// DATA
// ============================================
const DINING_DESTINATIONS = [
  { 
    slug: "dubai", 
    name: "Dubai", 
    country: "UAE",
    region: "Middle East",
    restaurantCount: 450,
    topCuisine: "Middle Eastern",
    image: "/cards/dubai.webp",
    imageAlt: "Dubai dining scene",
    featured: true
  },
  { 
    slug: "abu-dhabi", 
    name: "Abu Dhabi", 
    country: "UAE",
    region: "Middle East",
    restaurantCount: 280,
    topCuisine: "Arabic",
    image: "/cards/abu-dhabi.webp",
    imageAlt: "Abu Dhabi restaurants",
    featured: true
  },
  { 
    slug: "london", 
    name: "London", 
    country: "UK",
    region: "Europe",
    restaurantCount: 850,
    topCuisine: "British & International",
    image: "/cards/london.webp",
    imageAlt: "London dining",
    featured: true
  },
  { 
    slug: "paris", 
    name: "Paris", 
    country: "France",
    region: "Europe",
    restaurantCount: 920,
    topCuisine: "French",
    image: "/cards/paris.webp",
    imageAlt: "Paris French cuisine",
    featured: true
  },
  { 
    slug: "new-york", 
    name: "New York", 
    country: "USA",
    region: "Americas",
    restaurantCount: 1100,
    topCuisine: "American & World",
    image: "/cards/new-york.webp",
    imageAlt: "New York City dining",
    featured: true
  },
  { 
    slug: "tokyo", 
    name: "Tokyo", 
    country: "Japan",
    region: "Asia",
    restaurantCount: 780,
    topCuisine: "Japanese",
    image: "/cards/tokyo.webp",
    imageAlt: "Tokyo Japanese cuisine",
    featured: true
  },
  { 
    slug: "singapore", 
    name: "Singapore", 
    country: "Singapore",
    region: "Asia",
    restaurantCount: 520,
    topCuisine: "Asian Fusion",
    image: "/cards/singapore.webp",
    imageAlt: "Singapore food scene",
    featured: false
  },
  { 
    slug: "bangkok", 
    name: "Bangkok", 
    country: "Thailand",
    region: "Asia",
    restaurantCount: 680,
    topCuisine: "Thai",
    image: "/cards/bangkok.webp",
    imageAlt: "Bangkok street food",
    featured: false
  },
  { 
    slug: "barcelona", 
    name: "Barcelona", 
    country: "Spain",
    region: "Europe",
    restaurantCount: 560,
    topCuisine: "Spanish & Tapas",
    image: "/cards/barcelona.webp",
    imageAlt: "Barcelona tapas",
    featured: false
  },
  { 
    slug: "rome", 
    name: "Rome", 
    country: "Italy",
    region: "Europe",
    restaurantCount: 720,
    topCuisine: "Italian",
    image: "/cards/rome.webp",
    imageAlt: "Rome Italian dining",
    featured: false
  },
  { 
    slug: "amsterdam", 
    name: "Amsterdam", 
    country: "Netherlands",
    region: "Europe",
    restaurantCount: 380,
    topCuisine: "Dutch & International",
    image: "/cards/amsterdam.webp",
    imageAlt: "Amsterdam restaurants",
    featured: false
  },
  { 
    slug: "hong-kong", 
    name: "Hong Kong", 
    country: "China",
    region: "Asia",
    restaurantCount: 620,
    topCuisine: "Cantonese",
    image: "/cards/hong-kong.webp",
    imageAlt: "Hong Kong dim sum",
    featured: false
  },
  { 
    slug: "istanbul", 
    name: "Istanbul", 
    country: "Turkey",
    region: "Europe",
    restaurantCount: 480,
    topCuisine: "Turkish",
    image: "/cards/istanbul.webp",
    imageAlt: "Istanbul Turkish cuisine",
    featured: false
  },
  { 
    slug: "las-vegas", 
    name: "Las Vegas", 
    country: "USA",
    region: "Americas",
    restaurantCount: 420,
    topCuisine: "Celebrity Chef",
    image: "/cards/las-vegas.webp",
    imageAlt: "Las Vegas fine dining",
    featured: false
  },
  { 
    slug: "los-angeles", 
    name: "Los Angeles", 
    country: "USA",
    region: "Americas",
    restaurantCount: 580,
    topCuisine: "Californian",
    image: "/cards/los-angeles.webp",
    imageAlt: "Los Angeles dining",
    featured: false
  },
  { 
    slug: "miami", 
    name: "Miami", 
    country: "USA",
    region: "Americas",
    restaurantCount: 390,
    topCuisine: "Latin & Seafood",
    image: "/cards/miami.webp",
    imageAlt: "Miami waterfront dining",
    featured: false
  },
];

const REGIONS = [
  { id: "middle-east", name: "Middle East", icon: "🕌" },
  { id: "europe", name: "Europe", icon: "🏰" },
  { id: "asia", name: "Asia", icon: "🏯" },
  { id: "americas", name: "Americas", icon: "🗽" },
];

const CUISINE_CATEGORIES = [
  { 
    icon: Flame, 
    label: "Fine Dining",
    description: "Michelin-starred experiences",
    count: "800+",
    gradient: "from-amber-500 to-orange-400"
  },
  { 
    icon: UtensilsCrossed, 
    label: "Local Favorites",
    description: "Authentic local cuisine",
    count: "2,500+",
    gradient: "from-emerald-500 to-teal-400"
  },
  { 
    icon: Coffee, 
    label: "Cafés & Brunch",
    description: "Coffee and morning bites",
    count: "1,800+",
    gradient: "from-amber-600 to-yellow-500"
  },
  { 
    icon: Wine, 
    label: "Bars & Lounges",
    description: "Cocktails and nightlife",
    count: "1,200+",
    gradient: "from-purple-500 to-pink-400"
  },
  { 
    icon: ShoppingBasket, 
    label: "Street Food",
    description: "Best food markets",
    count: "950+",
    gradient: "from-red-500 to-orange-400"
  },
  { 
    icon: IceCream, 
    label: "Desserts",
    description: "Sweet treats worldwide",
    count: "650+",
    gradient: "from-pink-500 to-rose-400"
  },
];

const DINING_EXPERIENCES = [
  {
    id: "romantic",
    label: "Romantic",
    icon: Heart,
    experiences: [
      { name: "Candlelit Terraces", count: "280+", description: "Sunset views & intimate settings" },
      { name: "Private Dining", count: "150+", description: "Exclusive chef's table experiences" },
      { name: "Rooftop Romance", count: "95+", description: "City lights & starlit dinners" },
    ]
  },
  {
    id: "family",
    label: "Family",
    icon: Users,
    experiences: [
      { name: "Kid-Friendly Menus", count: "620+", description: "Fun dishes for little ones" },
      { name: "Garden Restaurants", count: "340+", description: "Space for the whole family" },
      { name: "Interactive Dining", count: "180+", description: "Cook-at-table experiences" },
    ]
  },
  {
    id: "business",
    label: "Business",
    icon: Briefcase,
    experiences: [
      { name: "Private Rooms", count: "420+", description: "Confidential meeting spaces" },
      { name: "Wine Cellars", count: "180+", description: "Impress your clients" },
      { name: "Power Lunch Spots", count: "560+", description: "Quick & professional" },
    ]
  },
  {
    id: "solo",
    label: "Solo",
    icon: User,
    experiences: [
      { name: "Counter Dining", count: "890+", description: "Chef's table & bar seats" },
      { name: "Tasting Menus", count: "340+", description: "Culinary journeys for one" },
      { name: "Reading-Friendly", count: "450+", description: "Quiet, contemplative spaces" },
    ]
  },
  {
    id: "group",
    label: "Group",
    icon: UsersRound,
    experiences: [
      { name: "Large Tables", count: "520+", description: "Celebrations & gatherings" },
      { name: "Sharing Menus", count: "680+", description: "Family-style feasting" },
      { name: "Event Spaces", count: "290+", description: "Private parties & occasions" },
    ]
  },
];

const INSIDER_TIPS = [
  {
    icon: Clock,
    title: "Best Times to Book",
    gradient: "from-blue-500 to-cyan-400",
    tips: [
      "Reserve 2-4 weeks ahead for popular spots",
      "Tuesday & Wednesday offer best availability",
      "Lunch seatings often have shorter waits"
    ]
  },
  {
    icon: Shirt,
    title: "Dress Code Guide",
    gradient: "from-violet-500 to-purple-400",
    tips: [
      "Smart casual is the global standard",
      "Fine dining: jacket often required",
      "Beach destinations: resort elegant"
    ]
  },
  {
    icon: Languages,
    title: "Local Customs",
    gradient: "from-emerald-500 to-teal-400",
    tips: [
      "Tipping: 15-20% US, service included in Europe",
      "Japan: Never tip, it's considered rude",
      "Middle East: Generous hospitality expected"
    ]
  },
];

// FAQ for AEO
const DINING_FAQ = [
  {
    q: "How do I find the best restaurants on TRAVI?",
    a: "TRAVI curates restaurants across 17 destinations with over 9,000 dining options. Filter by cuisine type, dining experience (romantic, family, business), price range, and location. Each listing includes ratings, reviews, and insider tips from local experts."
  },
  {
    q: "What types of dining experiences does TRAVI cover?",
    a: "From Michelin-starred fine dining to authentic street food, TRAVI covers 6 main categories: Fine Dining (800+), Local Favorites (2,500+), Cafés & Brunch (1,800+), Bars & Lounges (1,200+), Street Food (950+), and Desserts (650+)."
  },
  {
    q: "Which cities have the best restaurant scenes on TRAVI?",
    a: "New York leads with 1,100+ restaurants, followed by Paris (920+), London (850+), Tokyo (780+), and Rome (720+). Each destination offers unique culinary experiences from local cuisine to international flavors."
  },
  {
    q: "Can I find restaurants for special occasions?",
    a: "Yes! TRAVI categorizes restaurants by occasion: Romantic (candlelit terraces, private dining), Family (kid-friendly, garden restaurants), Business (private rooms, wine cellars), Solo (counter dining, tasting menus), and Group (large tables, event spaces)."
  }
];

// ============================================
// COMPONENTS
// ============================================

function DiningDestinationCard({ destination, index }: { destination: typeof DINING_DESTINATIONS[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group h-full"
      data-testid={`dining-card-${destination.slug}`}
    >
      <Link href={localePath(`/dining/${destination.slug}`)}>
        <Card className="h-full overflow-hidden border-0 bg-white dark:bg-slate-800/60 shadow-md hover:shadow-xl dark:shadow-slate-900/40 transition-all duration-400 group-hover:-translate-y-1">
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={destination.image}
              alt={`${destination.name} restaurants - ${destination.imageAlt}`}
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
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-100 mr-1.5">
                  <UtensilsCrossed className="w-2.5 h-2.5 text-orange-600" aria-hidden="true" />
                </span>
                {destination.restaurantCount} Restaurants
              </Badge>
              {destination.featured && (
                <Badge className="bg-gradient-to-r from-orange-500/95 to-amber-500/95 text-white backdrop-blur-sm border-0 text-xs px-2.5 py-1 shadow-sm font-medium">
                  <Star className="w-3 h-3 mr-1 fill-current" aria-hidden="true" />
                  Featured
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
              <h3 
                className="text-xl sm:text-2xl font-bold text-white leading-tight"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                {destination.name}
              </h3>
            </div>
          </div>

          <CardContent className="p-4 bg-white dark:bg-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {destination.region}
              </span>
              <span className="text-xs font-semibold text-orange-600">
                {destination.topCuisine}
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
                <span className="text-xs text-slate-500 ml-1">4.0+ rated</span>
              </div>
              <span className="flex items-center text-orange-600 font-medium text-sm transition-all duration-300 group-hover:gap-1.5">
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

function RegionSection({ region, destinations }: { region: string; destinations: typeof DINING_DESTINATIONS }) {
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
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-2xl shadow-lg shadow-orange-500/20"
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
          <DiningDestinationCard key={dest.slug} destination={dest} index={idx} />
        ))}
      </div>
    </motion.div>
  );
}

function DiningFAQ() {
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
            Everything you need to know about dining with TRAVI
          </p>
        </motion.div>

        <div className="space-y-3">
          {DINING_FAQ.map((faq, i) => (
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

export default function GlobalDining() {
  const { localePath } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [cuisineFilter, setCuisineFilter] = useState("all");
  const [activeExperience, setActiveExperience] = useState("romantic");
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const totalRestaurants = DINING_DESTINATIONS.reduce((sum, d) => sum + d.restaurantCount, 0);

  const filteredDestinations = DINING_DESTINATIONS.filter(dest => {
    const matchesSearch = dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dest.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dest.topCuisine.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = !selectedRegion || dest.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  const groupedDestinations = REGIONS.map(region => ({
    region: region.name,
    destinations: filteredDestinations.filter(d => d.region === region.name)
  })).filter(group => group.destinations.length > 0);

  const cuisineOptions = [
    { value: "all", label: "All Cuisines" },
    { value: "italian", label: "Italian" },
    { value: "japanese", label: "Japanese" },
    { value: "french", label: "French" },
    { value: "thai", label: "Thai" },
    { value: "mexican", label: "Mexican" },
    { value: "middle-eastern", label: "Middle Eastern" },
  ];

  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      toast({
        title: "Subscribed!",
        description: "Welcome to our culinary community. Check your inbox for delicious updates.",
      });
      setEmail("");
    } else {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <style>{heroAnimationStyles}</style>

      <Helmet>
        <title>Dining Guide Worldwide - 9,000+ Restaurants in 17 Destinations | TRAVI</title>
        <meta name="description" content="Discover 9,000+ curated restaurants across 17 destinations. From Michelin-starred fine dining to authentic street food in Paris, Tokyo, New York, and more." />
        <meta name="keywords" content="restaurants worldwide, fine dining, best restaurants, food guide, Paris restaurants, Tokyo dining, New York restaurants, street food" />
        <meta name="robots" content="index, follow" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Dining Guide Worldwide | TRAVI" />
        <meta name="twitter:description" content="9,000+ restaurants across 17 destinations." />
        <link rel="canonical" href="https://travi.world/dining" />

        {/* Preload critical images */}
        <link rel="preload" as="image" href="/cards/paris.webp" fetchPriority="high" />

        {/* hreflang tags */}
        <link rel="alternate" hrefLang="x-default" href="https://travi.world/dining" />
        {SUPPORTED_LANGUAGES.map(lang => (
          <link key={lang.code} rel="alternate" hrefLang={lang.code} href={`https://travi.world/${lang.code}/dining`} />
        ))}

        {/* Organization Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "TRAVI",
            "url": "https://travi.world",
            "logo": "https://travi.world/logo.png"
          })}
        </script>

        {/* ItemList Schema - Enhanced */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Dining Destinations",
            "description": "Discover 9,000+ restaurants across 17 destinations worldwide",
            "numberOfItems": DINING_DESTINATIONS.length,
            "itemListElement": DINING_DESTINATIONS.map((dest, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "FoodEstablishment",
                "@id": `https://travi.world/dining/${dest.slug}`,
                "name": `${dest.name} Restaurants`,
                "description": `${dest.restaurantCount} restaurants in ${dest.name}, ${dest.country}. Top cuisine: ${dest.topCuisine}`,
                "url": `https://travi.world/dining/${dest.slug}`,
                "image": `https://travi.world${dest.image}`,
                "servesCuisine": dest.topCuisine
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
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://travi.world" },
              { "@type": "ListItem", "position": 2, "name": "Dining", "item": "https://travi.world/dining" }
            ]
          })}
        </script>

        {/* FAQ Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": DINING_FAQ.map(faq => ({
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
          {/* Hero Section */}
          <section 
            ref={heroRef}
            className="pt-28 pb-12 px-4 sm:px-6 relative overflow-hidden"
            data-testid="dining-hero"
            aria-label="Dining guide overview"
          >
            {/* Animated decorative blobs */}
            <motion.div 
              className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-br from-orange-300/20 via-amber-200/10 to-transparent rounded-full blur-3xl pointer-events-none"
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            />
            <motion.div 
              className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-red-200/30 via-orange-100/20 to-transparent rounded-full blur-3xl pointer-events-none"
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
                {/* Eyebrow Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={heroInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-full mb-6 border border-orange-100/50 dark:border-orange-800/30"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    <UtensilsCrossed className="w-3 h-3 text-white" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold tracking-wide text-orange-700 dark:text-orange-400 uppercase">
                    Global Dining Guide
                  </span>
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#6443F4] to-[#8B5CF6] flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white" aria-hidden="true" />
                  </div>
                </motion.div>

                {/* Main Heading with Animated Gradient */}
                <h1 className="mb-5" data-testid="dining-page-h1">
                  <span 
                    className="block text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 dark:text-white leading-[1.15] tracking-tight"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    Taste the
                  </span>
                  <span 
                    className="block text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.2] tracking-tight animated-gradient-text py-1"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    World
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
                  Discover extraordinary culinary experiences curated by local experts 
                  across 17 destinations worldwide.
                </p>

                {/* Stats Row */}
                <motion.dl
                  initial={{ opacity: 0, y: 20 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-8 mb-8"
                >
                  {[
                    { value: `${(totalRestaurants / 1000).toFixed(0)}K+`, label: "RESTAURANTS", icon: UtensilsCrossed, gradient: "from-orange-500 to-amber-400" },
                    { value: "16", label: "DESTINATIONS", icon: Globe, gradient: "from-blue-500 to-cyan-400" },
                    { value: "4.5", label: "AVG RATING", icon: Star, gradient: "from-amber-500 to-yellow-400" },
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
                    What makes TRAVI dining guides unique?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    TRAVI curates {totalRestaurants.toLocaleString()}+ restaurants across 17 destinations, from Michelin-starred 
                    fine dining to authentic street food. Each listing is reviewed by local experts with 
                    insider tips on best times to visit, dress codes, and local customs. Find the perfect 
                    spot for any occasion - romantic dinners, family gatherings, or business meetings.
                  </p>
                </motion.div>

                {/* Search Bar */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="max-w-2xl mx-auto mb-6"
                >
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border border-slate-200 dark:border-slate-700">
                    <div className="relative flex-1">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20">
                        <Search className="w-4 h-4 text-white" aria-hidden="true" />
                      </div>
                      <Input
                        type="text"
                        placeholder="Search restaurants, cuisines, or cities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search restaurants"
                        className="w-full pl-14 pr-4 py-3 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 border-0 focus-visible:ring-2 focus-visible:ring-orange-500/30"
                      />
                    </div>
                    <select
                      value={cuisineFilter}
                      onChange={(e) => setCuisineFilter(e.target.value)}
                      className="h-12 px-4 rounded-xl border-0 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-orange-500/30 outline-none"
                    >
                      {cuisineOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <Button 
                      className="px-6 py-3 h-12 text-white font-semibold rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25"
                    >
                      <Search className="w-4 h-4 mr-2" aria-hidden="true" />
                      Explore
                    </Button>
                  </div>
                </motion.div>

                {/* Region Filters */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={heroInView ? { opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  role="group"
                  aria-label="Filter restaurants by region"
                  className="flex flex-wrap justify-center gap-2"
                >
                  <Button
                    variant={selectedRegion === null ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "rounded-full text-sm h-10 px-5 font-medium transition-all duration-300",
                      selectedRegion === null 
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20" 
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-orange-500/50"
                    )}
                    onClick={() => setSelectedRegion(null)}
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
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20" 
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-orange-500/50"
                      )}
                      onClick={() => setSelectedRegion(region.name)}
                    >
                      <span className="mr-2 text-base" aria-hidden="true">{region.icon}</span>
                      {region.name}
                    </Button>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* Cuisine Categories Section */}
          <section className="py-12 px-4 sm:px-6 bg-white dark:bg-slate-950" data-testid="cuisine-categories">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-10"
              >
                <h2 
                  className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  Culinary Categories
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
                  From Michelin stars to street food, explore every dining experience
                </p>
              </motion.div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {CUISINE_CATEGORIES.map((category, idx) => (
                  <motion.div
                    key={category.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-md transition-transform duration-300 group-hover:scale-110",
                      `bg-gradient-to-br ${category.gradient}`
                    )}>
                      <category.icon className="w-6 h-6 text-white" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                      {category.label}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
                      {category.description}
                    </span>
                    <Badge className="mt-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-0 text-[10px]">
                      {category.count}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Dining Experiences Toggle */}
          <section className="py-12 px-4 sm:px-6 bg-slate-50/70 dark:bg-slate-900/50" data-testid="dining-experiences">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-10"
              >
                <h2 
                  className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  Find Your Vibe
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
                  Perfect spots for every occasion, curated just for you
                </p>
              </motion.div>

              <Tabs value={activeExperience} onValueChange={setActiveExperience} className="w-full">
                <TabsList className="w-full flex justify-center bg-white dark:bg-slate-800 rounded-full p-2 shadow-sm border border-slate-200 dark:border-slate-700 mb-8 max-w-2xl mx-auto">
                  {DINING_EXPERIENCES.map((exp) => (
                    <TabsTrigger 
                      key={exp.id}
                      value={exp.id}
                      className="flex-1 flex items-center justify-center gap-2 rounded-full px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white transition-all"
                    >
                      <exp.icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{exp.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {DINING_EXPERIENCES.map((exp) => (
                  <TabsContent key={exp.id} value={exp.id} className="mt-0">
                    <div className="grid md:grid-cols-3 gap-5">
                      {exp.experiences.map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <Card className="p-5 bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{item.name}</h3>
                              <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-0 text-xs">
                                {item.count}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </section>

          {/* Restaurants by Region */}
          <section 
            className="py-12 px-4 sm:px-6 bg-white dark:bg-slate-950" 
            data-testid="restaurants-by-region"
          >
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-10 text-center"
              >
                <h2 
                  className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  Browse by Destination
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
                  Explore culinary scenes in your favorite cities
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
                    <UtensilsCrossed className="w-8 h-8 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    No destinations found
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                    Try adjusting your search or filter criteria
                  </p>
                  <Button
                    className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm px-5 shadow-lg shadow-orange-500/20"
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

          {/* Insider Tips Section */}
          <section className="py-12 px-4 sm:px-6 bg-slate-50/70 dark:bg-slate-900/50" data-testid="insider-tips">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-10"
              >
                <h2 
                  className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  Insider Dining Tips
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
                  Navigate global dining culture like a seasoned traveler
                </p>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-5">
                {INSIDER_TIPS.map((tip, idx) => (
                  <motion.div
                    key={tip.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="p-6 h-full bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg",
                        `bg-gradient-to-br ${tip.gradient}`
                      )}>
                        <tip.icon className="w-6 h-6 text-white" aria-hidden="true" />
                      </div>
                      <h3 
                        className="text-lg font-bold text-slate-900 dark:text-white mb-4"
                        style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                      >
                        {tip.title}
                      </h3>
                      <ul className="space-y-3">
                        {tip.tips.map((item, j) => (
                          <li key={j} className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                            <span className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Guide Insights Section - Where to Eat tips from travel guides */}
          <MultiDestinationInsights
            destinations={[...DESTINATIONS_WITH_GUIDES].slice(0, 6)}
            sectionType="eat"
            title="Where to Eat: Insider Tips"
          />

          {/* FAQ Section */}
          <DiningFAQ />

          {/* Newsletter CTA */}
          <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white dark:bg-slate-950" data-testid="newsletter-section">
            <div className="max-w-6xl mx-auto">
              <div className="relative rounded-3xl overflow-hidden">
                <div className="absolute inset-0">
                  <img 
                    src="/cards/barcelona.webp"
                    alt="Restaurant ambiance"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-900/60" />
                </div>

                <div className="relative px-8 lg:px-16 py-16 lg:py-20">
                  <div className="max-w-xl">
                    <Badge className="mb-6 bg-white/10 text-white border-white/20">
                      <Mail className="w-3.5 h-3.5 mr-1.5" />
                      Newsletter
                    </Badge>

                    <h2 
                      className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4"
                      style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                    >
                      Get Exclusive<br />Dining Guides
                    </h2>

                    <p className="text-base sm:text-lg text-white/80 mb-8">
                      Join 50,000+ food lovers receiving curated restaurant picks, 
                      chef interviews, and hidden gem discoveries.
                    </p>

                    <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 px-5 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 focus:border-white focus:ring-white/30 rounded-full"
                      />
                      <Button 
                        type="submit"
                        className="h-12 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-full font-semibold shadow-lg"
                      >
                        Subscribe
                        <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                      </Button>
                    </form>

                    <p className="mt-4 text-sm text-white/60">
                      By subscribing, you agree to our privacy policy. Unsubscribe anytime.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 sm:py-20 px-4 sm:px-6 relative overflow-hidden" data-testid="cta-section">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500" />
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
                  Ready to Explore?
                </h2>
                <p className="text-white/85 text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
                  Discover extraordinary culinary experiences in your next destination.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href={localePath("/dining")}>
                    <Button 
                      size="lg" 
                      className="rounded-full bg-white text-orange-600 hover:bg-white/95 px-7 font-semibold shadow-lg shadow-black/15 h-11"
                    >
                      <UtensilsCrossed className="w-4 h-4 mr-2" aria-hidden="true" />
                      Browse Restaurants
                      <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                    </Button>
                  </Link>
                  <Link href={localePath("/destinations")}>
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="rounded-full border-2 border-white/80 text-white bg-transparent hover:bg-white/10 px-7 font-semibold h-11"
                    >
                      View Destinations
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <PublicFooter />
      </div>

      {/* Hidden SEO Navigation */}
      <nav className="sr-only" aria-label="Complete dining destinations navigation">
        <h2>All Dining Destinations by Region</h2>
        {REGIONS.map(region => (
          <section key={region.id}>
            <h3>{region.name} Restaurants</h3>
            <ul>
              {DINING_DESTINATIONS
                .filter(d => d.region === region.name)
                .map(dest => (
                  <li key={dest.slug}>
                    <a href={localePath(`/dining/${dest.slug}`)}>
                      {dest.name} Restaurants - {dest.restaurantCount} dining options | 
                      Top cuisine: {dest.topCuisine} in {dest.country}
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
import { useState, useRef } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Helmet } from "react-helmet-async";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SITE_URL } from "@/lib/constants";
import {
  Star,
  MapPin,
  Globe,
  Crown,
  Sparkles,
  Building2,
  Award,
  Wifi,
  Car,
  Utensils,
  Dumbbell,
  Waves,
  Bed,
  ArrowRight,
  Search,
  Coffee,
  Plane,
  Heart,
  Shield,
  Clock,
  Users,
} from "lucide-react";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { cn } from "@/lib/utils";

// ============================================
// ANIMATION STYLES (matching Destinations page)
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
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "he", label: "Hebrew" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
  { code: "th", label: "ไทย" },
  { code: "tr", label: "Türkçe" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "vi", label: "Tiếng Việt" },
];

// ============================================
// DATA
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
    imageAlt: "Dubai hotels skyline",
    featured: true,
  },
  {
    slug: "abu-dhabi",
    name: "Abu Dhabi",
    country: "UAE",
    region: "Middle East",
    hotelCount: "400+",
    priceRange: "$45-$1,500",
    image: "/cards/abu-dhabi.webp",
    imageAlt: "Abu Dhabi resorts",
    featured: true,
  },
  {
    slug: "london",
    name: "London",
    country: "UK",
    region: "Europe",
    hotelCount: "1,200+",
    priceRange: "$60-$3,000",
    image: "/cards/london.webp",
    imageAlt: "London hotels",
    featured: true,
  },
  {
    slug: "paris",
    name: "Paris",
    country: "France",
    region: "Europe",
    hotelCount: "1,000+",
    priceRange: "$70-$2,500",
    image: "/cards/paris.webp",
    imageAlt: "Paris boutique hotels",
    featured: true,
  },
  {
    slug: "new-york",
    name: "New York",
    country: "USA",
    region: "Americas",
    hotelCount: "1,500+",
    priceRange: "$80-$3,500",
    image: "/cards/new-york.webp",
    imageAlt: "New York City hotels",
    featured: true,
  },
  {
    slug: "tokyo",
    name: "Tokyo",
    country: "Japan",
    region: "Asia",
    hotelCount: "900+",
    priceRange: "$40-$2,000",
    image: "/cards/tokyo.webp",
    imageAlt: "Tokyo hotels",
    featured: true,
  },
  {
    slug: "singapore",
    name: "Singapore",
    country: "Singapore",
    region: "Asia",
    hotelCount: "600+",
    priceRange: "$50-$1,800",
    image: "/cards/singapore.webp",
    imageAlt: "Singapore Marina Bay hotels",
    featured: false,
  },
  {
    slug: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    region: "Asia",
    hotelCount: "850+",
    priceRange: "$25-$800",
    image: "/cards/bangkok.webp",
    imageAlt: "Bangkok riverside hotels",
    featured: false,
  },
  {
    slug: "barcelona",
    name: "Barcelona",
    country: "Spain",
    region: "Europe",
    hotelCount: "650+",
    priceRange: "$40-$1,200",
    image: "/cards/barcelona.webp",
    imageAlt: "Barcelona beachfront hotels",
    featured: false,
  },
  {
    slug: "rome",
    name: "Rome",
    country: "Italy",
    region: "Europe",
    hotelCount: "750+",
    priceRange: "$50-$1,500",
    image: "/cards/rome.webp",
    imageAlt: "Rome historic hotels",
    featured: false,
  },
  {
    slug: "amsterdam",
    name: "Amsterdam",
    country: "Netherlands",
    region: "Europe",
    hotelCount: "500+",
    priceRange: "$55-$1,000",
    image: "/cards/amsterdam.webp",
    imageAlt: "Amsterdam canal hotels",
    featured: false,
  },
  {
    slug: "hong-kong",
    name: "Hong Kong",
    country: "China",
    region: "Asia",
    hotelCount: "550+",
    priceRange: "$50-$1,800",
    image: "/cards/hong-kong.webp",
    imageAlt: "Hong Kong harbor hotels",
    featured: false,
  },
  {
    slug: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    region: "Europe",
    hotelCount: "700+",
    priceRange: "$30-$600",
    image: "/cards/istanbul.webp",
    imageAlt: "Istanbul Bosphorus hotels",
    featured: false,
  },
  {
    slug: "las-vegas",
    name: "Las Vegas",
    country: "USA",
    region: "Americas",
    hotelCount: "450+",
    priceRange: "$40-$2,000",
    image: "/cards/las-vegas.webp",
    imageAlt: "Las Vegas Strip hotels",
    featured: false,
  },
  {
    slug: "los-angeles",
    name: "Los Angeles",
    country: "USA",
    region: "Americas",
    hotelCount: "700+",
    priceRange: "$60-$2,500",
    image: "/cards/los-angeles.webp",
    imageAlt: "Los Angeles hotels",
    featured: false,
  },
  {
    slug: "miami",
    name: "Miami",
    country: "USA",
    region: "Americas",
    hotelCount: "600+",
    priceRange: "$55-$1,500",
    image: "/cards/miami.webp",
    imageAlt: "Miami Beach hotels",
    featured: false,
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
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    icon: Car,
    label: "Valet Parking",
    description: "24/7 parking service",
    gradient: "from-slate-500 to-slate-400",
  },
  {
    icon: Utensils,
    label: "Fine Dining",
    description: "Michelin-starred options",
    gradient: "from-amber-500 to-orange-400",
  },
  {
    icon: Dumbbell,
    label: "Fitness Center",
    description: "State-of-the-art equipment",
    gradient: "from-red-500 to-rose-400",
  },
  {
    icon: Waves,
    label: "Pool & Spa",
    description: "Luxury wellness facilities",
    gradient: "from-cyan-500 to-teal-400",
  },
  {
    icon: Coffee,
    label: "Concierge",
    description: "24/7 personal service",
    gradient: "from-violet-500 to-purple-400",
  },
];

const HOTEL_CATEGORIES = [
  {
    stars: 5,
    title: "Luxury & 5-Star",
    subtitle: "World-Class Excellence",
    description:
      "Exceptional properties offering unparalleled luxury, personalized service, Michelin-starred dining, and extraordinary experiences.",
    icon: Crown,
    features: ["Butler Service", "Spa & Wellness", "Fine Dining", "Premium Suites"],
    gradient: "from-amber-400 to-yellow-500",
  },
  {
    stars: 4,
    title: "Premium & 4-Star",
    subtitle: "Superior Comfort",
    description:
      "Outstanding hotels delivering excellent amenities, attentive service, and memorable stays at great value.",
    icon: Award,
    features: ["Room Service", "Fitness Center", "Restaurant", "Pool Access"],
    gradient: "from-violet-500 to-purple-400",
  },
  {
    stars: 3,
    title: "Mid-Range & Boutique",
    subtitle: "Quality & Value",
    description:
      "Well-appointed hotels offering comfortable accommodations, essential amenities, and convenient locations.",
    icon: Building2,
    features: ["Free WiFi", "Daily Housekeeping", "24/7 Reception", "Central Location"],
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    stars: 2,
    title: "Budget-Friendly",
    subtitle: "Smart Savings",
    description:
      "Clean and comfortable options perfect for budget-conscious travelers who want quality basics.",
    icon: Bed,
    features: ["Clean Rooms", "WiFi Access", "Great Value", "Local Experience"],
    gradient: "from-emerald-500 to-teal-400",
  },
];

// FAQ for AEO
const HOTELS_FAQ = [
  {
    q: "What types of hotels does TRAVI feature?",
    a: "TRAVI features a comprehensive range of accommodations across 17 destinations worldwide - from budget-friendly options and boutique hotels to premium 4-star properties and luxury 5-star resorts. Our directory includes over 10,000 verified properties to suit every travel style and budget.",
  },
  {
    q: "Which destinations have the most hotels on TRAVI?",
    a: "New York leads with 900+ properties, followed by London (800+), Paris (700+), and Tokyo (600+). Dubai and Singapore offer exceptional variety from ultra-luxury resorts to affordable city hotels. Each destination features options across all price ranges.",
  },
  {
    q: "How can I find hotels within my budget on TRAVI?",
    a: "TRAVI displays price ranges for each destination (e.g., $80-$2,000/night) and categorizes hotels from budget-friendly to luxury. You can filter by destination, region, and soon by specific amenities and star ratings to find your perfect match.",
  },
  {
    q: "How does TRAVI verify hotel quality?",
    a: "TRAVI integrates with TripAdvisor's verified review system and displays real guest ratings. We provide detailed information on amenities, location, and pricing so you can make informed decisions regardless of your budget.",
  },
];

// ============================================
// COMPONENTS
// ============================================

function HotelDestinationCard({
  destination,
  index,
}: {
  destination: (typeof HOTEL_DESTINATIONS)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const { localePath } = useLocale();

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group h-full"
      data-testid={`hotel-card-${destination.slug}`}
    >
      <Link href={localePath(`/hotels/${destination.slug}`)}>
        <Card className="h-full overflow-hidden border-0 bg-white dark:bg-slate-800/60 shadow-lg hover:shadow-2xl dark:shadow-slate-900/50 transition-all duration-500 group-hover:-translate-y-2">
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={destination.image}
              alt={`${destination.name} luxury hotels - ${destination.imageAlt}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
              width={400}
              height={300}
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Badges - enhanced */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <Badge className="bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-white backdrop-blur-md border-0 text-xs px-3 py-1.5 shadow-lg font-semibold">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 mr-2">
                  <Building2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                </span>
                {destination.hotelCount}
              </Badge>
              {destination.featured && (
                <Badge className="bg-gradient-to-r from-amber-500/95 to-yellow-500/95 text-white backdrop-blur-md border-0 text-xs px-3 py-1.5 shadow-lg font-semibold">
                  <Star className="w-3.5 h-3.5 mr-1.5 fill-current" aria-hidden="true" />
                  Featured
                </Badge>
              )}
            </div>

            {/* Destination Info Overlay - enhanced */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-2 text-white/90 text-xs mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white/25 backdrop-blur-sm">
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
                <span className="font-medium">{destination.country}</span>
              </div>
              <h3
                className="text-2xl sm:text-3xl font-bold text-white leading-tight drop-shadow-lg"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                {destination.name}
              </h3>
            </div>
          </div>

          <CardContent className="p-5 bg-white dark:bg-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {destination.region}
              </span>
              <span className="text-sm font-bold text-[#6443F4]">
                {destination.priceRange}/night
              </span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-3.5 h-3.5",
                      i < 4 ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"
                    )}
                    aria-hidden="true"
                  />
                ))}
                <span className="text-xs text-slate-500 ml-1.5 font-medium">& up</span>
              </div>
              <span className="flex items-center text-[#6443F4] font-semibold text-sm transition-all duration-300 group-hover:gap-2">
                View Hotels
                <ArrowRight
                  className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform duration-300"
                  aria-hidden="true"
                />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.article>
  );
}

function RegionSection({
  region,
  destinations,
}: {
  region: string;
  destinations: typeof HOTEL_DESTINATIONS;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const regionData = REGIONS.find(r => r.name === region);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.8 }}
      className="mb-16"
    >
      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6443F4] to-[#8B5CF6] flex items-center justify-center text-3xl shadow-xl shadow-purple-500/30"
          aria-hidden="true"
        >
          {regionData?.icon}
        </div>
        <div>
          <h3
            className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight mb-1"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          >
            {region}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
            {destinations.length} {destinations.length === 1 ? "destination" : "destinations"}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
      className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/50 dark:from-slate-900/50 dark:via-slate-950 dark:to-slate-900/50"
      data-testid="faq-section"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <h2
            id="faq-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          >
            Frequently Asked Questions
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg leading-relaxed">
            Everything you need to know about TRAVI hotels
          </p>
        </motion.div>

        <div className="space-y-4">
          {HOTELS_FAQ.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 shadow-lg border-2 border-slate-100 dark:border-slate-700/50 hover:border-[#6443F4]/30 dark:hover:border-[#6443F4]/30 hover:shadow-xl transition-all duration-300"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{faq.q}</h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });
  const { localePath } = useLocale();

  const totalHotels = HOTEL_DESTINATIONS.reduce((sum, d) => {
    const count = parseInt(d.hotelCount.replace(/[^0-9]/g, ""));
    return sum + count;
  }, 0);

  const filteredDestinations = HOTEL_DESTINATIONS.filter(dest => {
    const matchesSearch =
      dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = !selectedRegion || dest.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  const groupedDestinations = REGIONS.map(region => ({
    region: region.name,
    destinations: filteredDestinations.filter(d => d.region === region.name),
  })).filter(group => group.destinations.length > 0);

  return (
    <>
      <style>{heroAnimationStyles}</style>

      <Helmet>
        <title>Test Page | TRAVI</title>
        <meta name="description" content="Internal test page - not for public use" />
        <meta name="keywords" content="test, internal" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Hotels Worldwide | TRAVI" />
        <meta
          name="twitter:description"
          content="10,000+ hotels across 17 destinations. From budget to luxury."
        />
        <link rel="canonical" href={`${SITE_URL}/hotels`} />

        {/* Preload critical images */}
        <link rel="preload" as="image" href="/cards/dubai.webp" fetchPriority="high" />

        {/* hreflang tags */}
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/hotels`} />
        {SUPPORTED_LANGUAGES.map(lang => (
          <link
            key={lang.code}
            rel="alternate"
            hrefLang={lang.code}
            href={`${SITE_URL}/${lang.code}/hotels`}
          />
        ))}

        {/* Organization Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "TRAVI",
            url: SITE_URL,
            logo: `${SITE_URL}/logo.png`,
          })}
        </script>

        {/* ItemList Schema - Enhanced */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Hotel Destinations",
            description: "Browse 10,000+ hotels across 17 destinations worldwide",
            numberOfItems: HOTEL_DESTINATIONS.length,
            itemListElement: HOTEL_DESTINATIONS.map((dest, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "LodgingBusiness",
                "@id": `${SITE_URL}/hotels/${dest.slug}`,
                name: `${dest.name} Hotels`,
                description: `${dest.hotelCount} hotels in ${dest.name}, ${dest.country}`,
                url: `${SITE_URL}/hotels/${dest.slug}`,
                image: `${SITE_URL}${dest.image}`,
                priceRange: dest.priceRange,
                amenityFeature: [
                  { "@type": "LocationFeatureSpecification", name: "Free WiFi", value: true },
                  { "@type": "LocationFeatureSpecification", name: "Fitness Center", value: true },
                  { "@type": "LocationFeatureSpecification", name: "Pool", value: true },
                  { "@type": "LocationFeatureSpecification", name: "Spa", value: true },
                  { "@type": "LocationFeatureSpecification", name: "Restaurant", value: true },
                  { "@type": "LocationFeatureSpecification", name: "Concierge", value: true },
                ],
              },
            })),
          })}
        </script>

        {/* BreadcrumbList Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              {
                "@type": "ListItem",
                position: 2,
                name: "Hotels",
                item: `${SITE_URL}/hotels`,
              },
            ],
          })}
        </script>

        {/* FAQ Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: HOTELS_FAQ.map(faq => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
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
            className="pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden"
            data-testid="hotels-hero"
            aria-label="Hotels overview"
          >
            {/* Animated decorative blobs - enhanced */}
            <motion.div
              className="absolute top-10 right-[-200px] w-[700px] h-[700px] bg-gradient-to-br from-amber-400/15 via-yellow-300/10 to-transparent rounded-full blur-3xl pointer-events-none"
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.2, 0.35, 0.2],
                x: [0, 20, 0],
                y: [0, -20, 0],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            />
            <motion.div
              className="absolute bottom-[-100px] left-[-100px] w-[600px] h-[600px] bg-gradient-to-tr from-purple-400/20 via-pink-300/15 to-transparent rounded-full blur-3xl pointer-events-none"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.4, 0.2],
                x: [0, -20, 0],
                y: [0, 20, 0],
              }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              aria-hidden="true"
            />
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/10 via-cyan-300/5 to-transparent rounded-full blur-3xl pointer-events-none"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.15, 0.25, 0.15],
                rotate: [0, 90, 0],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              aria-hidden="true"
            />

            <div className="max-w-7xl mx-auto relative">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-center mb-12"
              >
                {/* Eyebrow Badge - enhanced */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={heroInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.6, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
                  className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full mb-8 border border-purple-100/50 dark:border-purple-800/30 shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6443F4] to-[#8B5CF6] flex items-center justify-center shadow-md">
                    <Building2 className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-bold tracking-wider text-[#6443F4] uppercase">
                    Curated Hotels Worldwide
                  </span>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#F24294] to-[#8B5CF6] flex items-center justify-center shadow-md">
                    <Sparkles className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                  </div>
                </motion.div>

                {/* Main Heading with Animated Gradient - enhanced spacing */}
                <h1 className="mb-7" data-testid="hotels-page-h1">
                  <span
                    className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-2"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    Luxury Hotels
                  </span>
                  <span
                    className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.1] tracking-tight animated-gradient-text py-2"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    Worldwide
                  </span>
                </h1>

                {/* Subtitle - enhanced */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed"
                >
                  Discover exceptional 4 and 5-star properties across 17 destinations. Curated
                  luxury accommodations for unforgettable stays.
                </motion.p>

                {/* Stats Row - enhanced visual hierarchy */}
                <motion.dl
                  initial={{ opacity: 0, y: 30 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="flex flex-wrap justify-center items-center gap-6 sm:gap-10 md:gap-14 mb-14"
                >
                  {[
                    {
                      value: "10,000+",
                      label: "HOTELS",
                      icon: Building2,
                      gradient: "from-emerald-500 to-teal-400",
                    },
                    {
                      value: "16",
                      label: "DESTINATIONS",
                      icon: Globe,
                      gradient: "from-blue-500 to-cyan-400",
                    },
                    {
                      value: "All",
                      label: "CATEGORIES",
                      icon: Star,
                      gradient: "from-amber-500 to-yellow-400",
                    },
                    {
                      value: "17",
                      label: "LANGUAGES",
                      icon: Sparkles,
                      gradient: "from-violet-500 to-purple-400",
                    },
                  ].map((stat, idx) => (
                    <div key={stat.label} className="flex items-center gap-6 sm:gap-10 md:gap-14">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={heroInView ? { opacity: 1, scale: 1 } : {}}
                        transition={{
                          duration: 0.5,
                          delay: 0.5 + idx * 0.1,
                          ease: [0.34, 1.56, 0.64, 1],
                        }}
                        className="flex flex-col items-center"
                      >
                        <div
                          className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg",
                            `bg-gradient-to-br ${stat.gradient}`
                          )}
                        >
                          <stat.icon className="w-7 h-7 text-white" aria-hidden="true" />
                        </div>
                        <dt className="sr-only">{stat.label}</dt>
                        <dd
                          className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-1"
                          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                        >
                          {stat.value}
                        </dd>
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wider">
                          {stat.label}
                        </div>
                      </motion.div>
                      {idx < 3 && (
                        <div
                          className="hidden sm:block w-px h-16 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-600 to-transparent"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  ))}
                </motion.dl>

                {/* Answer Capsule for AEO - enhanced visual */}
                <motion.div
                  initial={{ opacity: 0, y: 25 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="max-w-3xl mx-auto mb-10 p-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-700/50 text-left shadow-xl hover:shadow-2xl transition-shadow duration-300"
                >
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2.5 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#8B5CF6] flex items-center justify-center shadow-md">
                      <Shield className="w-4 h-4 text-white" aria-hidden="true" />
                    </div>
                    What makes TRAVI hotel listings unique?
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                    TRAVI features a comprehensive collection of hotels across 17 destinations
                    worldwide, from budget-friendly options to luxury 5-star resorts. With over
                    10,000 properties offering diverse amenities including spa facilities, dining
                    options, and exceptional guest experiences, you'll find the perfect stay for any
                    budget and travel style.
                  </p>
                </motion.div>

                {/* Search Input - enhanced */}
                <motion.div
                  initial={{ opacity: 0, y: 25 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  className="max-w-xl mx-auto mb-8"
                >
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-gradient-to-br from-[#6443F4] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:shadow-xl group-hover:shadow-purple-500/40 transition-all duration-300">
                      <Search className="w-5 h-5 text-white" aria-hidden="true" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Search hotel destinations..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      aria-label="Search hotel destinations"
                      className="w-full pl-[4.5rem] pr-6 py-4 h-16 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 hover:shadow-2xl focus:shadow-2xl focus:ring-2 focus:ring-[#6443F4]/50 focus:border-[#6443F4] placeholder:text-slate-400 text-base transition-all duration-300"
                    />
                  </div>
                </motion.div>

                {/* Region Filters - enhanced */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  role="group"
                  aria-label="Filter hotels by region"
                  className="flex flex-wrap justify-center gap-3"
                >
                  <Button
                    variant={selectedRegion === null ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "rounded-full text-sm h-11 px-6 font-semibold transition-all duration-300",
                      selectedRegion === null
                        ? "bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] hover:from-[#5539d4] hover:to-[#7c4ee6] text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105"
                        : "border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-[#6443F4]/50 hover:scale-105"
                    )}
                    onClick={() => setSelectedRegion(null)}
                  >
                    All Regions
                  </Button>
                  {REGIONS.map(region => (
                    <Button
                      key={region.id}
                      variant={selectedRegion === region.name ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "rounded-full text-sm h-11 px-6 font-semibold transition-all duration-300",
                        selectedRegion === region.name
                          ? "bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] hover:from-[#5539d4] hover:to-[#7c4ee6] text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105"
                          : "border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-[#6443F4]/50 hover:scale-105"
                      )}
                      onClick={() => setSelectedRegion(region.name)}
                    >
                      <span className="mr-2 text-base" aria-hidden="true">
                        {region.icon}
                      </span>
                      {region.name}
                    </Button>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* Hotel Categories Section - enhanced */}
          <section
            className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-white via-slate-50/50 to-white dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-950"
            data-testid="hotel-categories"
          >
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="text-center mb-14"
              >
                <h2
                  className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  Hotels for Every Budget
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                  From budget-friendly stays to luxury resorts, find your perfect accommodation
                </p>
              </motion.div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {HOTEL_CATEGORIES.map((category, idx) => (
                  <motion.div
                    key={category.stars}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.12, duration: 0.6 }}
                  >
                    <Card className="p-6 h-full bg-white dark:bg-slate-800/60 border-2 border-slate-100 dark:border-slate-700/50 shadow-lg hover:shadow-2xl hover:border-[#6443F4]/30 dark:hover:border-[#6443F4]/30 transition-all duration-500 hover:-translate-y-1 group">
                      <div className="flex flex-col h-full">
                        <div
                          className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl mb-5 transition-transform duration-300 group-hover:scale-110",
                            `bg-gradient-to-br ${category.gradient}`
                          )}
                        >
                          <category.icon className="w-7 h-7 text-white" aria-hidden="true" />
                        </div>
                        <div className="flex items-center gap-1.5 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "w-4 h-4 transition-all duration-300",
                                i < category.stars
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-300 dark:text-slate-600"
                              )}
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                        <h3
                          className="text-xl font-bold text-slate-900 dark:text-white mb-2"
                          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                        >
                          {category.title}
                        </h3>
                        <p className="text-sm text-[#6443F4] font-semibold mb-3">
                          {category.subtitle}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 flex-1 leading-relaxed">
                          {category.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {category.features.map((feature, i) => (
                            <Badge
                              key={i}
                              className="bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-0 text-xs px-2.5 py-1"
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

          {/* Amenities Section - enhanced */}
          <section
            className="py-16 sm:py-20 px-4 sm:px-6 bg-white dark:bg-slate-950"
            data-testid="amenities-section"
          >
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="text-center mb-14"
              >
                <h2
                  className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  Premium Amenities
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                  Every hotel we feature includes these essential luxury amenities
                </p>
              </motion.div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
                {AMENITY_CATEGORIES.map((amenity, idx) => (
                  <motion.div
                    key={amenity.label}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.08, duration: 0.6 }}
                    className="flex flex-col items-center p-5 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-800/60 dark:to-slate-800/40 rounded-2xl border-2 border-slate-100 dark:border-slate-700/50 shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-1 group"
                  >
                    <div
                      className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110",
                        `bg-gradient-to-br ${amenity.gradient}`
                      )}
                    >
                      <amenity.icon className="w-7 h-7 text-white" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white text-center mb-1.5">
                      {amenity.label}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400 text-center leading-relaxed">
                      {amenity.description}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Hotels by Region - enhanced */}
          <section
            className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/50 dark:from-slate-900/50 dark:via-slate-950 dark:to-slate-900/50"
            data-testid="hotels-by-region"
          >
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="mb-14 text-center"
              >
                <h2
                  className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  Browse Hotels by Destination
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                  Find your perfect luxury stay across our curated destinations
                </p>
              </motion.div>

              {groupedDestinations.length > 0 ? (
                groupedDestinations.map(group => (
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
                    <Building2
                      className="w-8 h-8 text-slate-400 dark:text-slate-500"
                      aria-hidden="true"
                    />
                  </div>
                  <h3
                    className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
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

          {/* FAQ Section */}
          <HotelsFAQ />

          {/* CTA Section - enhanced */}
          <section
            className="py-20 sm:py-24 px-4 sm:px-6 relative overflow-hidden"
            data-testid="cta-section"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#6443F4] via-[#8B5CF6] to-[#F24294]" />
            <div
              className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAtMzBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6TTYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6TTYgNGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"
              aria-hidden="true"
            />

            {/* Animated gradient blobs */}
            <motion.div
              className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                x: [0, 50, 0],
                y: [0, 30, 0],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            />
            <motion.div
              className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.3, 1],
                x: [0, -50, 0],
                y: [0, -30, 0],
              }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              aria-hidden="true"
            />

            <div className="max-w-4xl mx-auto text-center relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <h2
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  Find Your Perfect Stay
                </h2>
                <p className="text-white/90 text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
                  Explore our curated collection of luxury hotels and discover exceptional
                  accommodations worldwide.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link href={localePath("/hotels/dubai")}>
                    <Button
                      size="lg"
                      className="rounded-full bg-white text-[#6443F4] hover:bg-white/95 hover:scale-105 px-8 py-6 text-base font-bold shadow-2xl shadow-black/20 h-auto transition-all duration-300"
                    >
                      Explore Dubai Hotels
                      <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
                    </Button>
                  </Link>
                  <Link href={localePath("/destinations")}>
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full border-2 border-white/90 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:scale-105 px-8 py-6 text-base font-bold h-auto transition-all duration-300"
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
      <nav className="sr-only" aria-label="Complete hotel destinations navigation">
        <h2>All Hotel Destinations by Region</h2>
        {REGIONS.map(region => (
          <section key={region.id}>
            <h3>{region.name} Hotels</h3>
            <ul>
              {HOTEL_DESTINATIONS.filter(d => d.region === region.name).map(dest => (
                <li key={dest.slug}>
                  <a href={localePath(`/hotels/${dest.slug}`)}>
                    {dest.name} Hotels - {dest.hotelCount} properties from budget to luxury |
                    {dest.priceRange}/night in {dest.country}
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

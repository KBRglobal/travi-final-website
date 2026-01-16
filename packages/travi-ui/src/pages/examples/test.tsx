import { useState, useRef } from "react";
import { Link } from "wouter";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Helmet } from "react-helmet-async";
import {
  Compass, Mountain, Palette, Users, UtensilsCrossed, Camera, Sparkles,
  Clock, ArrowRight, ChevronRight, Star, Search, MapPin, Calendar,
  Zap, Heart, Ticket, Map, Globe, Timer, ChevronDown, Shield,
  CheckCircle2, Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

// ============================================
// ANIMATION STYLES (Teal/Cyan Primary Brand)
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
      #0EA5E9 0%,
      #06B6D4 25%,
      #14B8A6 50%,
      #0891B2 75%,
      #0EA5E9 100%
    );
    background-size: 300% 300%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradient-flow 6s ease infinite;
    display: inline-block;
    line-height: 1.2;
    padding-bottom: 0.1em;
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

// ============================================
// FAQ DATA
// ============================================
const FAQ_ITEMS = [
  {
    q: "What types of activities can I find on TRAVI?",
    a: "TRAVI offers 2,500+ curated activities across 16 destinations including guided tours, adventure experiences, cultural immersions, food tours, family activities, photography tours, and nightlife experiences. From desert safaris in Dubai to museum tours in Paris, we cover every type of travel experience."
  },
  {
    q: "How do skip-the-line tickets work?",
    a: "Skip-the-line tickets give you priority access to popular attractions, bypassing regular queues. After booking, you'll receive a mobile ticket with a designated entry time. Simply show your ticket at the priority entrance and walk right in, saving hours of waiting time."
  },
  {
    q: "What is the cancellation policy for activities?",
    a: "Most activities on TRAVI offer free cancellation up to 24 hours before the scheduled start time. Some experiences may have different policies which are clearly displayed during booking. We recommend checking the specific terms for each activity."
  },
  {
    q: "Which destinations have the most activities?",
    a: "Our top destinations by activity count are New York (400+ activities), Paris (380+), London (350+), Tokyo (320+), and Dubai (280+). Each destination offers unique experiences from local cuisine tours to iconic landmark visits."
  }
];

// ============================================
// DATA
// ============================================
const ACTIVITY_DESTINATIONS = [
  { slug: "dubai", name: "Dubai", country: "UAE", region: "Middle East", activityCount: 280, topActivity: "Desert Safari", image: "/cards/dubai.webp" },
  { slug: "abu-dhabi", name: "Abu Dhabi", country: "UAE", region: "Middle East", activityCount: 120, topActivity: "Louvre Tour", image: "/cards/abu-dhabi.webp" },
  { slug: "paris", name: "Paris", country: "France", region: "Europe", activityCount: 380, topActivity: "Louvre Museum", image: "/cards/paris.webp" },
  { slug: "london", name: "London", country: "UK", region: "Europe", activityCount: 350, topActivity: "Tower of London", image: "/cards/london.webp" },
  { slug: "barcelona", name: "Barcelona", country: "Spain", region: "Europe", activityCount: 220, topActivity: "Sagrada Familia", image: "/cards/barcelona.webp" },
  { slug: "rome", name: "Rome", country: "Italy", region: "Europe", activityCount: 290, topActivity: "Colosseum Tour", image: "/cards/rome.webp" },
  { slug: "amsterdam", name: "Amsterdam", country: "Netherlands", region: "Europe", activityCount: 180, topActivity: "Canal Cruise", image: "/cards/amsterdam.webp" },
  { slug: "istanbul", name: "Istanbul", country: "Turkey", region: "Europe", activityCount: 190, topActivity: "Hagia Sophia", image: "/cards/istanbul.webp" },
  { slug: "tokyo", name: "Tokyo", country: "Japan", region: "Asia", activityCount: 320, topActivity: "Street Food Tour", image: "/cards/tokyo.webp" },
  { slug: "singapore", name: "Singapore", country: "Singapore", region: "Asia", activityCount: 200, topActivity: "Gardens by the Bay", image: "/cards/singapore.webp" },
  { slug: "bangkok", name: "Bangkok", country: "Thailand", region: "Asia", activityCount: 240, topActivity: "Temple Tour", image: "/cards/bangkok.webp" },
  { slug: "hong-kong", name: "Hong Kong", country: "China", region: "Asia", activityCount: 180, topActivity: "Victoria Peak", image: "/cards/hong-kong.webp" },
  { slug: "new-york", name: "New York", country: "USA", region: "Americas", activityCount: 400, topActivity: "Statue of Liberty", image: "/cards/new-york.webp" },
  { slug: "los-angeles", name: "Los Angeles", country: "USA", region: "Americas", activityCount: 210, topActivity: "Hollywood Tour", image: "/cards/los-angeles.webp" },
  { slug: "las-vegas", name: "Las Vegas", country: "USA", region: "Americas", activityCount: 170, topActivity: "Grand Canyon", image: "/cards/las-vegas.webp" },
  { slug: "miami", name: "Miami", country: "USA", region: "Americas", activityCount: 150, topActivity: "Everglades Tour", image: "/cards/miami.webp" },
];

const REGIONS = [
  { name: "Middle East", icon: "🕌", count: 2 },
  { name: "Europe", icon: "🏰", count: 6 },
  { name: "Asia", icon: "🏯", count: 4 },
  { name: "Americas", icon: "🗽", count: 4 },
];

const ACTIVITY_CATEGORIES = [
  { id: "all", name: "All Activities", icon: Compass },
  { id: "adventure", name: "Adventures", icon: Mountain },
  { id: "culture", name: "Culture & Arts", icon: Palette },
  { id: "family", name: "Family Fun", icon: Users },
  { id: "food", name: "Food Tours", icon: UtensilsCrossed },
  { id: "photography", name: "Photo Spots", icon: Camera },
  { id: "tours", name: "Guided Tours", icon: Map },
];

const ACTIVITY_BENEFITS = [
  { icon: Zap, title: "Skip the Line", description: "Priority access to all attractions", gradient: "from-amber-500 to-orange-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { icon: CheckCircle2, title: "Instant Confirmation", description: "Tickets delivered to your phone", gradient: "from-emerald-500 to-teal-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { icon: Calendar, title: "Free Cancellation", description: "Up to 24 hours before", gradient: "from-cyan-500 to-blue-400", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  { icon: Globe, title: "Local Experts", description: "Guides who know every corner", gradient: "from-teal-500 to-cyan-400", bg: "bg-teal-50 dark:bg-teal-950/30" },
  { icon: Shield, title: "Best Price Guarantee", description: "Find it cheaper? We'll match it", gradient: "from-rose-500 to-pink-400", bg: "bg-rose-50 dark:bg-rose-950/30" },
  { icon: Star, title: "Curated Selection", description: "Only top-rated experiences", gradient: "from-sky-500 to-cyan-400", bg: "bg-sky-50 dark:bg-sky-950/30" },
];

const FEATURED_COLLECTIONS = [
  { id: "adventure", title: "Adventure Seekers", description: "Thrilling experiences for the bold", count: 450, image: "/experiences/experiences-adventure-hiker-mountain-trail-snowy-peaks.webp", icon: Mountain },
  { id: "culture", title: "Cultural Immersion", description: "Deep dive into local heritage", count: 380, image: "/cards/tokyo.webp", icon: Palette },
  { id: "family", title: "Family Favorites", description: "Fun for all ages", count: 520, image: "/experiences/picnic-modern-architecture-outdoor-activity.webp", icon: Users },
  { id: "foodie", title: "Foodie Trails", description: "Culinary adventures", count: 290, image: "/cards/paris.webp", icon: UtensilsCrossed },
];

// ============================================
// COMPONENTS
// ============================================
function AnimatedSection({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function DestinationCard({ destination, index }: { destination: typeof ACTIVITY_DESTINATIONS[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="group"
    >
      <Link href={`/things-to-do/${destination.slug}`}>
        <Card className="overflow-hidden border-0 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white dark:bg-slate-900 h-full">
          <div className="relative h-48 sm:h-56 overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img
              src={destination.image}
              alt={`Things to do in ${destination.name}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
              width={400}
              height={300}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            <div className="absolute top-3 left-3">
              <Badge className="bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-white backdrop-blur-sm border-0 text-xs px-2.5 py-1 shadow-sm">
                <Ticket className="w-3 h-3 mr-1.5 text-cyan-600 dark:text-cyan-400" />
                {destination.activityCount}+ Activities
              </Badge>
            </div>

            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center gap-1.5 text-white/80 text-xs mb-1">
                <MapPin className="w-3 h-3" />
                {destination.country}
              </div>
              <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                {destination.name}
              </h3>
            </div>
          </div>

          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">{destination.region}</span>
              <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Top: {destination.topActivity}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Zap className="w-3 h-3 text-amber-500" />
                Skip-the-line available
              </div>
              <span className="flex items-center text-cyan-600 dark:text-cyan-400 font-medium text-sm group-hover:gap-1.5 transition-all">
                Explore
                <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.article>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <AnimatedSection className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
            Frequently Asked Questions
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Everything you need to know about booking activities
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white pr-4">
                    {faq.q}
                  </h3>
                  <ChevronDown className={cn(
                    "w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0 transition-transform duration-300",
                    openIndex === index && "rotate-180 text-cyan-600"
                  )} />
                </button>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="px-6 pb-5 text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function GlobalThingsToDo() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const totalActivities = ACTIVITY_DESTINATIONS.reduce((sum, d) => sum + d.activityCount, 0);

  const filteredDestinations = ACTIVITY_DESTINATIONS.filter(dest => {
    const matchesRegion = !selectedRegion || dest.region === selectedRegion;
    const matchesSearch = !searchQuery ||
      dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.country.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRegion && matchesSearch;
  });

  const organizationSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "TRAVI World",
    "url": "https://travi.world",
    "logo": "https://travi.world/logo.png"
  });

  const itemListSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Things To Do Destinations",
    "description": `Discover ${totalActivities.toLocaleString()}+ activities across 16 destinations worldwide`,
    "numberOfItems": ACTIVITY_DESTINATIONS.length,
    "itemListElement": ACTIVITY_DESTINATIONS.map((dest, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "TouristDestination",
        "name": `Things to do in ${dest.name}`,
        "description": `${dest.activityCount}+ activities in ${dest.name}, ${dest.country}`,
        "url": `https://travi.world/things-to-do/${dest.slug}`
      }
    }))
  });

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://travi.world" },
      { "@type": "ListItem", "position": 2, "name": "Things To Do", "item": "https://travi.world/things-to-do" }
    ]
  });

  const faqSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": { "@type": "Answer", "text": faq.a }
    }))
  });

  return (
    <>
      <Helmet>
        <title>Things To Do Worldwide - {totalActivities.toLocaleString()}+ Activities in 16 Destinations | TRAVI</title>
        <meta name="description" content={`Discover ${totalActivities.toLocaleString()}+ curated activities across 16 destinations. Book skip-the-line tours, adventures, cultural experiences, and family activities with instant confirmation.`} />
        <link rel="canonical" href="https://travi.world/things-to-do" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content={`Things To Do Worldwide - ${totalActivities.toLocaleString()}+ Activities | TRAVI`} />
        <meta property="og:description" content="Book skip-the-line tours, adventures, and experiences across 16 destinations." />
        <meta property="og:url" content="https://travi.world/things-to-do" />
        <meta property="og:image" content="https://travi.world/cards/dubai.webp" />

        <link rel="preload" as="image" href="/cards/dubai.webp" />

        <link rel="alternate" hrefLang="x-default" href="https://travi.world/things-to-do" />
        {SUPPORTED_LANGUAGES.map(lang => (
          <link key={lang.code} rel="alternate" hrefLang={lang.code} href={`https://travi.world/${lang.code}/things-to-do`} />
        ))}

        <script type="application/ld+json">{organizationSchema}</script>
        <script type="application/ld+json">{itemListSchema}</script>
        <script type="application/ld+json">{breadcrumbSchema}</script>
        <script type="application/ld+json">{faqSchema}</script>
      </Helmet>

      <style>{heroAnimationStyles}</style>
      <SubtleSkyBackground />
      <PublicNav />

      <main id="main-content" className="min-h-screen">
        {/* ==================== HERO SECTION ==================== */}
        <section className="relative bg-white dark:bg-slate-950 pt-28 pb-16 md:pt-32 md:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <motion.div
            className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-br from-cyan-300/20 via-teal-200/10 to-transparent rounded-full blur-3xl pointer-events-none"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-sky-200/30 via-cyan-100/20 to-transparent rounded-full blur-3xl pointer-events-none"
            animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.35, 0.25] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 rounded-full mb-8 border border-cyan-200/50 dark:border-cyan-800/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-semibold tracking-wide text-cyan-700 dark:text-cyan-300 uppercase">
                  Your Trusted Travel Resource
                </span>
              </motion.div>

              <motion.h1
                className="mb-8"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <span
                  className="block text-4xl sm:text-5xl md:text-6xl font-semibold text-slate-900 dark:text-white leading-[1.15] tracking-tight mb-3"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  Things to Do That
                </span>
                <span
                  className="block text-4xl sm:text-5xl md:text-6xl font-semibold leading-[1.15] tracking-tight animated-gradient-text"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  Inspire Wonder
                </span>
              </motion.h1>

              <motion.p
                className="text-base sm:text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed max-w-xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                Curated activities and unforgettable experiences in <span className="font-semibold text-slate-700 dark:text-slate-300">16 destinations</span> worldwide.
                From desert safaris to museum tours, discover your next adventure.
              </motion.p>

              <motion.dl
                className="flex flex-wrap items-center justify-center gap-6 md:gap-8 mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                {[
                  { num: `${(totalActivities/1000).toFixed(1)}K+`, label: 'ACTIVITIES', icon: Compass, gradient: 'from-cyan-500 to-teal-400' },
                  { num: '16', label: 'DESTINATIONS', icon: Globe, gradient: 'from-sky-500 to-cyan-400' },
                  { num: '4.8', label: 'AVG RATING', icon: Star, gradient: 'from-amber-500 to-orange-400' },
                  { num: '17', label: 'LANGUAGES', icon: Sparkles, gradient: 'from-teal-500 to-emerald-400' }
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                      stat.gradient
                    )}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <dd className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                        {stat.num}
                      </dd>
                      <dt className="text-[10px] text-slate-400 dark:text-slate-500 tracking-wider uppercase">{stat.label}</dt>
                    </div>
                  </div>
                ))}
              </motion.dl>

              <motion.div
                className="relative max-w-md mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-md">
                  <Search className="w-4 h-4 text-white" />
                </div>
                <Input
                  type="text"
                  placeholder="Search destinations, activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-14 pr-4 py-6 rounded-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 text-base"
                />
              </motion.div>

              <motion.div
                className="flex flex-wrap justify-center gap-2 mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <button
                  onClick={() => setSelectedRegion(null)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    !selectedRegion
                      ? "bg-cyan-600 dark:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  All Regions
                </button>
                {REGIONS.map(region => (
                  <button
                    key={region.name}
                    onClick={() => setSelectedRegion(selectedRegion === region.name ? null : region.name)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                      selectedRegion === region.name
                        ? "bg-cyan-600 dark:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                  >
                    <span>{region.icon}</span>
                    {region.name}
                  </button>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ==================== BENEFITS SECTION ==================== */}
        <AnimatedSection className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-full mb-4"
              >
                <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-semibold tracking-wide text-cyan-700 dark:text-cyan-300 uppercase">Why Book With TRAVI</span>
              </motion.div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                Your Adventure, Simplified
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {ACTIVITY_BENEFITS.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className={cn(
                    "group p-5 rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                    benefit.bg
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br transition-transform group-hover:scale-110",
                    benefit.gradient
                  )}>
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{benefit.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* ==================== FEATURED COLLECTIONS ==================== */}
        <AnimatedSection className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 dark:bg-teal-900/20 rounded-full mb-4"
                >
                  <Compass className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-xs font-semibold tracking-wide text-teal-700 dark:text-teal-300 uppercase">Curated Collections</span>
                </motion.div>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                  Explore Your Way
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 lg:gap-6">
              <div className="col-span-12 lg:col-span-7 flex flex-col gap-4 lg:gap-6 lg:h-[584px]">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="flex-[2.5]"
                >
                  <Link href={`/things-to-do/collection/${FEATURED_COLLECTIONS[0].id}`}>
                    <div className="group relative h-full min-h-[300px] rounded-3xl overflow-hidden cursor-pointer">
                      <img
                        src={FEATURED_COLLECTIONS[0].image}
                        alt={FEATURED_COLLECTIONS[0].title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-10">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-5">
                          {(() => { const Icon = FEATURED_COLLECTIONS[0].icon; return <Icon className="w-7 h-7 text-white" />; })()}
                        </div>
                        <h3 className="text-2xl lg:text-3xl font-bold text-white mb-3" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                          {FEATURED_COLLECTIONS[0].title}
                        </h3>
                        <p className="text-white/80 text-lg mb-4">{FEATURED_COLLECTIONS[0].description}</p>
                        <Badge className="bg-white/20 backdrop-blur-md text-white border-0 px-4 py-2 rounded-full">
                          <Ticket className="w-4 h-4 mr-2" />
                          {FEATURED_COLLECTIONS[0].count} experiences
                        </Badge>
                      </div>
                    </div>
                  </Link>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="flex-1"
                >
                  <Link href={`/things-to-do/collection/${FEATURED_COLLECTIONS[3].id}`}>
                    <div className="group relative h-full min-h-[140px] rounded-2xl overflow-hidden cursor-pointer">
                      <img
                        src={FEATURED_COLLECTIONS[3].image}
                        alt={FEATURED_COLLECTIONS[3].title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-transparent" />
                      <div className="absolute inset-0 p-5 flex items-center gap-5">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                          {(() => { const Icon = FEATURED_COLLECTIONS[3].icon; return <Icon className="w-6 h-6 text-white" />; })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-white mb-1" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                            {FEATURED_COLLECTIONS[3].title}
                          </h3>
                          <p className="text-white/70 text-sm">{FEATURED_COLLECTIONS[3].count} experiences</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </div>

              <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 lg:gap-6 lg:h-[584px]">
                {FEATURED_COLLECTIONS.slice(1, 3).map((collection, index) => (
                  <motion.div
                    key={collection.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: (index + 1) * 0.1 }}
                    className="flex-1"
                  >
                    <Link href={`/things-to-do/collection/${collection.id}`}>
                      <div className="group relative h-full min-h-[200px] rounded-2xl overflow-hidden cursor-pointer">
                        <img
                          src={collection.image}
                          alt={collection.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-transparent" />
                        <div className="absolute inset-0 p-5 flex items-center gap-5">
                          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                            {(() => { const Icon = collection.icon; return <Icon className="w-6 h-6 text-white" />; })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white mb-1" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                              {collection.title}
                            </h3>
                            <p className="text-white/70 text-sm">{collection.count} experiences</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ==================== DESTINATIONS GRID ==================== */}
        <AnimatedSection className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                  {selectedRegion ? `${selectedRegion} Destinations` : "All Destinations"}
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  {filteredDestinations.length} {filteredDestinations.length === 1 ? 'destination' : 'destinations'} with {filteredDestinations.reduce((sum, d) => sum + d.activityCount, 0).toLocaleString()}+ activities
                </p>
              </div>
              <Link href="/destinations" className="hidden sm:inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-semibold hover:gap-3 transition-all">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredDestinations.map((dest, index) => (
                <DestinationCard key={dest.slug} destination={dest} index={index} />
              ))}
            </div>

            {filteredDestinations.length === 0 && (
              <div className="text-center py-16">
                <Compass className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-xl text-slate-500 mb-4">No destinations found</p>
                <Button variant="outline" className="rounded-full" onClick={() => { setSelectedRegion(null); setSearchQuery(""); }}>
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </AnimatedSection>

        {/* ==================== FAQ SECTION ==================== */}
        <FAQSection />

        {/* ==================== CTA SECTION ==================== */}
        <AnimatedSection className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-cyan-600 to-teal-500 rounded-3xl p-8 md:p-12 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                  Ready for Your Next Adventure?
                </h2>
                <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                  Join 100,000+ travelers who plan their trips with TRAVI
                </p>
                <Link href="/destinations">
                  <Button className="bg-white text-cyan-600 hover:bg-white/90 rounded-full px-8 py-6 text-base font-medium shadow-xl">
                    Start Exploring
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      </main>

      <PublicFooter />

      <nav className="sr-only" aria-label="Complete activities navigation">
        <h2>All Activity Destinations by Region</h2>
        {REGIONS.map(region => (
          <section key={region.name}>
            <h3>{region.name} Activities</h3>
            <ul>
              {ACTIVITY_DESTINATIONS.filter(d => d.region === region.name).map(dest => (
                <li key={dest.slug}>
                  <a href={`/things-to-do/${dest.slug}`}>
                    Things to do in {dest.name} - {dest.activityCount}+ activities including tours, adventures, and cultural experiences in {dest.country}
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
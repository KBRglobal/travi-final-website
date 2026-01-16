import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { 
  Search, MapPin, Star, Clock, X, Filter, ChevronDown, 
  UtensilsCrossed, TrendingUp, Globe2, ArrowRight, Sparkles, Utensils, Wine, ChefHat
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";

interface SearchResult {
  type: "city" | "restaurant";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  image?: string;
  rating?: number;
  cuisine?: string;
  price?: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

const BASE_URL = "https://travi.world";
const CANONICAL_URL = `${BASE_URL}/dining`;

const DESTINATIONS = [
  { slug: "dubai", name: "Dubai", country: "UAE", count: 186, image: "/hero/dubai-hero.webp" },
  { slug: "london", name: "London", country: "UK", count: 324, image: "/hero/london-hero.webp" },
  { slug: "paris", name: "Paris", country: "France", count: 412, image: "/hero/paris-hero.webp" },
  { slug: "rome", name: "Rome", country: "Italy", count: 289, image: "/hero/rome-hero.webp" },
  { slug: "new-york", name: "New York", country: "USA", count: 356, image: "/hero/new-york-hero.webp" },
  { slug: "barcelona", name: "Barcelona", country: "Spain", count: 198, image: "/hero/barcelona-hero.webp" },
  { slug: "tokyo", name: "Tokyo", country: "Japan", count: 467, image: "/hero/tokyo-hero.webp" },
  { slug: "singapore", name: "Singapore", country: "Singapore", count: 234, image: "/hero/singapore-hero.webp" },
];

const HERO_RESTAURANTS = [
  { name: "Nobu", city: "Dubai", slug: "dubai", image: "/hero/dubai-hero.webp", tagline: "Japanese-Peruvian Fusion", category: "Fine Dining", alt: "Nobu Dubai restaurant interior", title: "Nobu Dubai Reservations" },
  { name: "Le Jules Verne", city: "Paris", slug: "paris", image: "/hero/paris-hero.webp", tagline: "Eiffel Tower Dining", category: "French Cuisine", alt: "Le Jules Verne restaurant with Eiffel Tower views", title: "Le Jules Verne Paris" },
  { name: "Dinner by Heston", city: "London", slug: "london", image: "/hero/london-hero.webp", tagline: "Historic British Cuisine", category: "Michelin Star", alt: "Dinner by Heston Blumenthal interior", title: "Dinner by Heston Reservations" },
  { name: "Sukiyabashi Jiro", city: "Tokyo", slug: "tokyo", image: "/hero/tokyo-hero.webp", tagline: "World's Best Sushi", category: "Sushi Omakase", alt: "Sukiyabashi Jiro sushi counter", title: "Sukiyabashi Jiro Tokyo" },
  { name: "Eleven Madison Park", city: "New York", slug: "new-york", image: "/hero/new-york-hero.webp", tagline: "Plant-Based Fine Dining", category: "Contemporary", alt: "Eleven Madison Park dining room", title: "Eleven Madison Park NYC" },
  { name: "El Celler de Can Roca", city: "Barcelona", slug: "barcelona", image: "/hero/barcelona-hero.webp", tagline: "Three Michelin Stars", category: "Catalan Cuisine", alt: "El Celler de Can Roca tasting menu", title: "El Celler de Can Roca Reservations" },
  { name: "Osteria Francescana", city: "Rome", slug: "rome", image: "/hero/rome-hero.webp", tagline: "Modern Italian Art", category: "Italian Fine Dining", alt: "Osteria Francescana signature dishes", title: "Osteria Francescana Reservations" },
  { name: "Odette", city: "Singapore", slug: "singapore", image: "/hero/singapore-hero.webp", tagline: "Modern French", category: "Three Michelin Stars", alt: "Odette Singapore elegant dining", title: "Odette Singapore Reservations" },
];

const CUISINE_TYPES = [
  { id: "all", label: "All Cuisines", searchTerm: "" },
  { id: "fine-dining", label: "Fine Dining", searchTerm: "fine dining" },
  { id: "street-food", label: "Street Food", searchTerm: "street food" },
  { id: "rooftop", label: "Rooftop", searchTerm: "rooftop" },
  { id: "michelin", label: "Michelin Star", searchTerm: "michelin" },
  { id: "local", label: "Local Cuisine", searchTerm: "local" },
];

const diningCategories = [
  { id: "all", label: "All Restaurants", icon: Utensils },
  { id: "fine-dining", label: "Fine Dining", icon: ChefHat },
  { id: "casual", label: "Casual Dining", icon: UtensilsCrossed },
  { id: "street-food", label: "Street Food", icon: Sparkles },
  { id: "bars", label: "Bars & Lounges", icon: Wine },
];

const FAQ_DATA: FAQItem[] = [
  {
    question: "What are the best restaurants worldwide?",
    answer: "The world's best restaurants include Noma in Copenhagen, El Celler de Can Roca in Spain, Eleven Madison Park in New York, and Sukiyabashi Jiro in Tokyo. These establishments offer exceptional culinary experiences and world-class service.",
  },
  {
    question: "How do I book a table at a Michelin-starred restaurant?",
    answer: "Most Michelin-starred restaurants require reservations weeks or months in advance. TRAVI offers easy booking for top restaurants worldwide, with instant confirmation and flexible cancellation on select venues.",
  },
  {
    question: "What should I know about dining etiquette abroad?",
    answer: "Dining customs vary by country. In Japan, it's polite to say 'itadakimasu' before eating. In France, keep hands on the table. In the Middle East, use your right hand. TRAVI provides cultural tips for each destination.",
  },
  {
    question: "Can I find restaurants with dietary accommodations?",
    answer: "Yes, TRAVI highlights restaurants offering vegetarian, vegan, gluten-free, and halal options. Use our dietary filters to find the perfect dining experience for your needs.",
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

export default function Dining() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState("all");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const currentYear = new Date().getFullYear();
  const totalRestaurants = DESTINATIONS.reduce((sum, d) => sum + d.count, 0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const restaurant = HERO_RESTAURANTS[currentIndex];
  const shouldAnimate = usePreferredMotion();

  useEffect(() => {
    const nextIndex = (currentIndex + 1) % HERO_RESTAURANTS.length;
    const img = new Image();
    img.src = HERO_RESTAURANTS[nextIndex].image;
  }, [currentIndex]);

  useEffect(() => {
    if (!shouldAnimate) return;
    
    let animationTimeout: NodeJS.Timeout;
    const timer = setInterval(() => {
      setIsAnimating(true);
      animationTimeout = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % HERO_RESTAURANTS.length);
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

  const pageTitle = `Find Restaurants & Dining Experiences Worldwide ${currentYear} | TRAVI`;
  const pageDescription = `Discover ${totalRestaurants.toLocaleString()}+ restaurants worldwide. Book tables at Michelin-starred restaurants, street food spots and fine dining experiences across ${DESTINATIONS.length} destinations.`;

  const runSearch = useCallback(async (value: string) => {
    if (value.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const next: SearchResult[] = [];

    DESTINATIONS.filter(
      (d) =>
        d.name.toLowerCase().includes(value.toLowerCase()) ||
        d.country.toLowerCase().includes(value.toLowerCase())
    )
      .slice(0, 3)
      .forEach((d) =>
        next.push({
          type: "city",
          id: d.slug,
          title: d.name,
          subtitle: `${d.country} - ${d.count} restaurants`,
          href: `/dining/list/${d.slug}`,
          image: d.image,
        })
      );

    try {
      const res = await fetch(
        `/api/contents?type=dining&status=published&search=${encodeURIComponent(value)}&limit=8`
      );
      if (res.ok) {
        const data = await res.json();
        data?.forEach((r: any) => {
          next.push({
            type: "restaurant",
            id: r.id,
            title: r.title,
            subtitle: r.destination?.name || "Restaurant",
            href: `/dining/${r.slug}`,
            image: r.heroImage,
            rating: 4.8,
            cuisine: r.cuisine || "International",
            price: "From $75",
          });
        });
      }
    } catch {}

    setResults(next);
    setLoading(false);
  }, []);

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
          mainEntity: FAQ_DATA.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        },
        {
          "@type": "ItemList",
          "@id": `${CANONICAL_URL}#destinations`,
          name: "Popular Destinations for Dining",
          itemListElement: DESTINATIONS.map((d, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Restaurant",
              name: d.name,
              url: `${BASE_URL}/dining/list/${d.slug}`,
            },
          })),
        },
      ],
    }),
    [pageTitle, pageDescription]
  );

  return (
    <>
      <style>{heroAnimationStyles}</style>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={CANONICAL_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={CANONICAL_URL} />
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      <SubtleSkyBackground />
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <PublicNav />

        <main className="relative">
          <section 
            className="relative min-h-screen bg-slate-50 dark:bg-slate-950"
            data-testid="section-dining-hero"
            aria-label="Discover world-class dining"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
              <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-purple-200/40 via-pink-100/30 to-purple-100/40 dark:from-purple-900/30 dark:via-pink-900/20 dark:to-purple-900/30 morph-blob blur-3xl" />
              <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-blue-100/30 via-purple-100/20 to-pink-100/30 dark:from-blue-900/20 dark:via-purple-900/15 dark:to-pink-900/20 morph-blob blur-3xl" style={{ animationDelay: '-4s' }} />
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rotate-slow opacity-10 dark:opacity-20">
                <div className="w-full h-full rounded-full border-[40px] border-transparent" style={{ borderTopColor: '#6443F4', borderRightColor: '#F24294' }} />
              </div>

              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(#6443F4 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            </div>

            <div className="relative z-10 min-h-screen flex items-center py-16">
              <div className="max-w-[90rem] mx-auto w-full">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  
                  <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24">
                    
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
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300" data-testid="badge-dining-count">
                          Trusted by <span className="text-[#6443F4]">{totalRestaurants.toLocaleString()}+</span> food lovers worldwide
                        </span>
                      </div>
                    </motion.div>

                    <motion.h1 
                      className="mb-6"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    >
                      <span className="block text-5xl sm:text-6xl lg:text-6xl xl:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
                        Culinary
                      </span>
                      <span className="block text-5xl sm:text-6xl lg:text-6xl xl:text-7xl font-black leading-[1.1] tracking-tight animated-gradient-text">
                        Excellence
                      </span>
                      <span className="block text-5xl sm:text-6xl lg:text-6xl xl:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
                        Awaits
                      </span>
                    </motion.h1>

                    <motion.div 
                      className="decorative-line w-24 mb-6"
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                    />

                    <motion.p 
                      className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mb-8"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.35 }}
                    >
                      Discover exceptional restaurants and culinary experiences. 
                      <span className="text-slate-800 dark:text-slate-200 font-semibold"> Reserve your table</span> at the world's finest dining destinations.
                    </motion.p>

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
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Where do you want to dine?"
                          className="w-full pl-20 pr-28 py-5 text-lg bg-transparent border-0 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0 rounded-2xl"
                          data-testid="input-search-dining"
                          aria-label="Search restaurants, cities, or cuisines"
                          role="searchbox"
                        />
                        <button 
                          className="absolute right-3 px-6 py-3 rounded-xl bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] text-white font-semibold hover:from-[#5539d4] hover:to-[#7c4deb] transition-all shadow-lg shadow-[#6443F4]/30"
                          onClick={() => query && navigate(`/dining/list?search=${encodeURIComponent(query)}`)}
                          data-testid="button-search"
                          aria-label="Search for restaurants"
                        >
                          Search
                        </button>
                      </div>

                      <AnimatePresence>
                        {(loading || results.length > 0) && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
                          >
                            {loading ? (
                              <div className="p-6 text-center text-slate-500">
                                <div className="w-6 h-6 border-2 border-[#6443F4] border-t-transparent rounded-full animate-spin mx-auto" />
                              </div>
                            ) : (
                              <div className="max-h-[400px] overflow-y-auto" role="listbox" aria-label="Search results">
                                {results.map((r) => (
                                  <button
                                    key={r.id}
                                    onClick={() => navigate(r.href)}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                                    data-testid={`search-result-${r.id}`}
                                    role="option"
                                    aria-label={`View ${r.title} in ${r.subtitle}`}
                                  >
                                    {r.image && (
                                      <img
                                        src={r.image}
                                        alt={r.title}
                                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                                        {r.title}
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                                        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                                        {r.subtitle}
                                      </div>
                                      {(r.rating || r.price) && (
                                        <div className="flex items-center gap-3 mt-1.5">
                                          {r.rating && (
                                            <span className="flex items-center gap-1 text-sm">
                                              <Star className="w-3.5 h-3.5 text-[#6443F4] fill-[#6443F4]" aria-hidden="true" />
                                              {r.rating.toFixed(1)}
                                            </span>
                                          )}
                                          {r.price && (
                                            <span className="text-sm text-[#6443F4] font-medium">
                                              {r.price}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-slate-400" aria-hidden="true" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    <motion.div 
                      className="flex flex-wrap gap-2 mb-10"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.55 }}
                    >
                      <span className="text-sm text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4" aria-hidden="true" />
                        Trending:
                      </span>
                      {["Fine Dining", "Street Food", "Rooftop", "Michelin Star"].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            setQuery(tag);
                            runSearch(tag);
                          }}
                          className="px-4 py-1.5 text-sm rounded-full bg-white dark:bg-slate-800 hover:bg-[#6443F4]/10 dark:hover:bg-[#6443F4]/20 border border-slate-200 dark:border-slate-700 hover:border-[#6443F4]/30 text-slate-700 dark:text-slate-300 transition-all"
                          data-testid={`tag-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </motion.div>

                    <motion.div 
                      className="grid grid-cols-3 gap-4 mb-10"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                    >
                      <div className="text-center p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur border border-white dark:border-slate-700 shadow-sm">
                        <div className="text-3xl font-black text-slate-900 dark:text-white">{(totalRestaurants / 1000).toFixed(1)}K+</div>
                        <div className="text-sm text-slate-500 font-medium">Restaurants</div>
                      </div>
                      <div className="text-center p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur border border-white dark:border-slate-700 shadow-sm">
                        <div className="text-3xl font-black text-slate-900 dark:text-white">{DESTINATIONS.length}+</div>
                        <div className="text-sm text-slate-500 font-medium">Cities</div>
                      </div>
                      <div className="text-center p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur border border-white dark:border-slate-700 shadow-sm">
                        <div className="text-3xl font-black text-slate-900 dark:text-white">4.9</div>
                        <div className="text-sm text-slate-500 font-medium">Rating</div>
                      </div>
                    </motion.div>

                    <motion.div 
                      className="flex flex-col sm:flex-row gap-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.65 }}
                    >
                      <Link href="/destinations">
                        <Button 
                          className="group rounded-full bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] hover:opacity-90 text-white text-base font-semibold shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30"
                          size="lg"
                          data-testid="button-explore-dining"
                          aria-label="Start exploring restaurants worldwide"
                        >
                          Start Exploring
                          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                        </Button>
                      </Link>
                      <Link href="#browse-by-category">
                        <Button 
                          variant="outline"
                          size="lg"
                          className="rounded-full border-2 border-slate-200 dark:border-slate-600 hover:border-[#6443F4] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-lg"
                          data-testid="button-browse-categories"
                          aria-label="View cuisine categories"
                        >
                          <Sparkles className="w-5 h-5 text-[#6443F4] mr-2" aria-hidden="true" />
                          View Categories
                        </Button>
                      </Link>
                    </motion.div>
                  </div>

                  <div className="relative px-6 sm:px-12 lg:px-8 lg:pr-12 xl:pr-16">
                    <motion.div 
                      className="relative w-full max-w-lg mx-auto flex flex-col lg:h-[65vh] lg:min-h-[500px]"
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                    >
                      
                      <div 
                        className="bento-card relative flex-1 min-h-0 group bg-white dark:bg-slate-900 shadow-lg dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:shadow-[#6443F4]/15 hover:-translate-y-2"
                        role="region"
                        aria-label="Featured restaurant gallery"
                      >
                        <AnimatePresence mode="wait">
                          <motion.img 
                            key={currentIndex}
                            src={restaurant.image} 
                            alt={restaurant.alt}
                            title={restaurant.title}
                            className="w-full h-full object-cover"
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.7 }}
                            loading={currentIndex === 0 ? "eager" : "lazy"}
                          />
                        </AnimatePresence>
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />
                        
                        <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md shadow-lg">
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              <span className="font-bold text-slate-800">4.9</span>
                              <span className="text-slate-500 text-sm">(8K+ reviews)</span>
                            </div>
                            <motion.div 
                              className="relative px-4 py-2 rounded-full bg-gradient-to-r from-[#6443F4] to-[#F24294] text-white text-sm font-semibold shadow-lg"
                              animate={{ scale: [1, 1.02, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              Featured
                            </motion.div>
                          </div>
                          
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: isAnimating ? 0 : 1, y: isAnimating ? 20 : 0 }}
                            transition={{ duration: 0.5 }}
                          >
                            <div className="flex items-center gap-2 text-white/80 mb-3">
                              <MapPin className="w-5 h-5" />
                              <span className="font-medium">{restaurant.city}</span>
                            </div>
                            
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{restaurant.name}</h2>
                            
                            <div className="flex flex-wrap items-center gap-4 mb-6">
                              <div className="flex items-center gap-2 text-white/80">
                                <ChefHat className="w-5 h-5" />
                                <span>{restaurant.category}</span>
                              </div>
                              <div className="flex items-center gap-2 text-white/80">
                                <UtensilsCrossed className="w-5 h-5" />
                                <span>{restaurant.tagline}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-white/60 text-sm">From</span>
                                <span className="text-3xl font-bold text-white ml-2">$75</span>
                                <span className="text-white/60 text-sm">/person</span>
                              </div>
                              <Link href={`/destinations/${restaurant.slug}/dining`}>
                                <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-slate-900 font-bold hover:bg-[#6443F4]/10 hover:text-[#6443F4] transition-all shadow-xl hover:shadow-2xl hover:scale-105 transform">
                                  Book Now
                                  <ArrowRight className="w-5 h-5" />
                                </button>
                              </Link>
                            </div>
                          </motion.div>
                        </div>
                      </div>

                      <div 
                        className="mt-4 flex justify-center gap-3 p-3 rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-xl dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700 flex-shrink-0"
                        role="tablist"
                        aria-label="Restaurant carousel thumbnails"
                      >
                        {HERO_RESTAURANTS.slice(0, 5).map((r, i) => (
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
                            aria-label={`View ${r.name} in ${r.city}`}
                          >
                            <img 
                              src={r.image} 
                              alt={`${r.name} thumbnail`} 
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>

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
                              <Clock className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 dark:text-white">Instant Confirmation</div>
                              <div className="text-sm text-slate-500">Real-time availability</div>
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
                              <UtensilsCrossed className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 dark:text-white">Table Reservations</div>
                              <div className="text-sm text-slate-500">Guaranteed seating</div>
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

          <section id="browse-by-category" className="py-20 px-6 bg-white dark:bg-slate-950" data-testid="section-dining-categories">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex items-center justify-between mb-10"
              >
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Browse by Category
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Find your ideal dining experience by cuisine type
                  </p>
                </div>
                <Link href="/dining/all">
                  <Button 
                    variant="outline" 
                    className="hidden sm:flex items-center gap-2 border-[#6443F4] text-[#6443F4] hover:bg-[#6443F4]/10"
                    data-testid="button-view-all-dining"
                  >
                    View All Restaurants
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex flex-wrap justify-center gap-4 mb-12"
              >
                {diningCategories.map((category) => (
                  <button
                    key={category.id}
                    className="group flex items-center gap-3 bg-white dark:bg-slate-800 hover:bg-[#6443F4]/10 dark:hover:bg-[#6443F4]/20 border border-slate-200 dark:border-slate-700 hover:border-[#6443F4]/40 rounded-full px-6 py-3 transition-all duration-300 shadow-sm"
                    data-testid={`filter-category-${category.id}`}
                  >
                    <category.icon className="w-5 h-5 text-[#6443F4]" />
                    <span className="text-slate-700 dark:text-white font-medium">{category.label}</span>
                  </button>
                ))}
              </motion.div>
            </div>
          </section>

          <section className="py-20 px-6 bg-slate-50 dark:bg-slate-900/50">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex items-center justify-between mb-10"
              >
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Browse by Destination
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Explore restaurants in the world's most delicious cities
                  </p>
                </div>
                <Link href="/destinations">
                  <Button 
                    variant="outline" 
                    className="hidden sm:flex items-center gap-2 border-[#6443F4] text-[#6443F4] hover:bg-[#6443F4]/10"
                    data-testid="button-view-all-destinations"
                  >
                    View All Destinations
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </motion.div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {DESTINATIONS.map((dest, i) => (
                  <motion.div
                    key={dest.slug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link href={`/dining/list/${dest.slug}`}>
                      <Card 
                        className="group overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border-0"
                        data-testid={`destination-card-${dest.slug}`}
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#6443F4]/20 to-[#8B5CF6]/20">
                          <img
                            src={dest.image}
                            alt={`${dest.name} restaurants`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="text-xl font-bold text-white">
                              {dest.name}
                            </h3>
                            <p className="text-white/80 text-sm flex items-center gap-1 mt-1">
                              <Utensils className="w-3.5 h-3.5" />
                              {dest.country} - {dest.count} restaurants
                            </p>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 text-center sm:hidden">
                <Link href="/destinations">
                  <Button 
                    variant="outline" 
                    className="border-[#6443F4] text-[#6443F4] hover:bg-[#6443F4]/10"
                    data-testid="button-view-all-destinations-mobile"
                  >
                    View All Destinations
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <section className="py-16 px-6 bg-white dark:bg-slate-950">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <Badge className="mb-4 bg-[#6443F4]/10 text-[#6443F4] border-0">
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                  Why Choose TRAVI
                </Badge>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  Your Culinary Companion
                </h2>
                <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  Experience the difference with our curated selection and exceptional dining experiences
                </p>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: ChefHat, title: "Curated Selection", description: "Hand-picked restaurants from local experts" },
                  { icon: Star, title: "Verified Reviews", description: "Real reviews from verified diners" },
                  { icon: Clock, title: "Instant Booking", description: "Real-time availability and confirmation" },
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6443F4]/20 to-[#8B5CF6]/20 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-[#6443F4]" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-16 px-6 bg-slate-50 dark:bg-slate-900/50">
            <div className="max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  Frequently Asked Questions
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Everything you need to know about dining reservations
                </p>
              </motion.div>

              <div className="space-y-4">
                {FAQ_DATA.map((faq, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      className="w-full flex items-center justify-between p-6 text-left"
                      data-testid={`faq-question-${i}`}
                    >
                      <span className="font-semibold text-slate-900 dark:text-white">{faq.question}</span>
                      <ArrowRight className={cn(
                        "w-5 h-5 text-slate-400 transition-transform",
                        expandedFaq === i && "rotate-90"
                      )} />
                    </button>
                    <AnimatePresence>
                      {expandedFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="px-6 pb-6 text-slate-600 dark:text-slate-400">
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-32 relative overflow-hidden" data-testid="section-cta">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-[#0B0A1F] dark:via-[#1a1033] dark:to-[#0B0A1F]" />
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#6443F4]/30 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#F24294]/30 rounded-full blur-3xl" />
            </div>
            
            <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <Badge className="mb-6 bg-white/10 text-white border-white/20">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Start Your Culinary Journey
                </Badge>
                <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                  Ready to Discover Your Next <br />
                  <span className="animated-gradient-text">Favorite Restaurant?</span>
                </h2>
                <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
                  Join thousands of food lovers who trust TRAVI to find the world's best dining experiences.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/destinations">
                    <Button 
                      size="lg" 
                      className="bg-white text-slate-900 hover:bg-white/90 px-8 py-6 text-lg rounded-xl"
                      data-testid="button-cta-explore"
                    >
                      Explore Restaurants
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/guides">
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl"
                      data-testid="button-cta-guides"
                    >
                      Read Food Guides
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}

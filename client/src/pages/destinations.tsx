import { useState, useRef } from "react";
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
  Sparkles, 
  ArrowRight, 
  RefreshCw,
  Loader2
} from "lucide-react";
// SEO is now fully controlled via database - no SEOHead component needed
import { motion, useInView, AnimatePresence, useReducedMotion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { cn } from "@/lib/utils";
import { DestinationsHero } from "@/components/destinations-hero";
import { useQuery } from "@tanstack/react-query";

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

interface APIDestination {
  id: string;
  name: string;
  country: string;
  slug: string;
  destinationLevel: string | null;
  cardImage: string | null;
  cardImageAlt: string | null;
  summary: string | null;
  heroImage: string | null;
  heroImageAlt: string | null;
  moodVibe: string | null;
  moodTagline: string | null;
  moodPrimaryColor: string | null;
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

const DESTINATIONS_FAQ = [
  {
    q: "How many destinations does TRAVI cover?",
    a: "TRAVI covers major travel destinations across the Middle East, Europe, Asia, and Americas with comprehensive guides for each location."
  },
  {
    q: "What information is included in TRAVI destination guides?",
    a: "Each destination guide includes detailed descriptions covering attractions, accommodation options, local cuisine, transportation tips, and practical travel information."
  },
  {
    q: "Can I search for destinations?",
    a: "Yes, TRAVI allows searching destinations by name or country using the search bar on the destinations page."
  },
  {
    q: "What are the featured destinations on TRAVI?",
    a: "TRAVI's featured destinations are handpicked locations offering exceptional experiences for travelers with diverse interests from luxury to budget travel."
  }
];

function usePreferredMotion() {
  const prefersReducedMotion = useReducedMotion();
  return !prefersReducedMotion;
}

function DestinationChip({ destination, index }: { destination: APIDestination, index: number }) {
  const shouldAnimate = usePreferredMotion();
  
  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, scale: 0.8, y: 20 } : {}}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.05, duration: 0.4, ease: "easeOut" }}
      whileHover={shouldAnimate ? { scale: 1.05, y: -4 } : {}}
    >
      <Link href={`/destinations/${destination.id}`}>
        <div 
          className="flex items-center gap-2.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-100 dark:border-slate-700 rounded-full pl-1.5 pr-4 py-1.5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 transition-all duration-300 hover:shadow-xl hover:border-[#6443F4]/30 cursor-pointer group"
          data-testid={`chip-destination-${destination.id}`}
        >
          <img 
            src={destination.cardImage || `/cards/${destination.id}.webp`} 
            alt={destination.name}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-[#6443F4]/20 group-hover:ring-[#6443F4]/50 transition-all"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://placehold.co/100x100/6443F4/white?text=${destination.name.charAt(0)}`;
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

function LightHero({ destinations }: { destinations: APIDestination[] }) {
  const shouldAnimate = usePreferredMotion();
  const destinationCount = destinations.length;
  const countryCount = new Set(destinations.map(d => d.country)).size;

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
                { num: countryCount.toString(), label: 'COUNTRIES', icon: Globe },
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
                  {i < 1 && <div className="hidden sm:block w-px h-10 sm:h-12 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700 to-transparent" aria-hidden="true" />}
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
              {destinations.slice(0, 16).map((dest, idx) => (
                <DestinationChip key={dest.id} destination={dest} index={idx} />
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedCarousel({ destinations }: { destinations: APIDestination[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const featuredDestinations = destinations.slice(0, 8);

  useState(() => {
    if (!isAutoPlaying || featuredDestinations.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredDestinations.length);
    }, 4000);
    return () => clearInterval(timer);
  });

  if (featuredDestinations.length === 0) return null;

  const goTo = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goPrev = () => goTo((currentIndex - 1 + featuredDestinations.length) % featuredDestinations.length);
  const goNext = () => goTo((currentIndex + 1) % featuredDestinations.length);

  const current = featuredDestinations[currentIndex];

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
            aria-label={`Slide ${currentIndex + 1} of ${featuredDestinations.length}: ${current.name}`}
          >
            <img
              src={current.heroImage || current.cardImage || `/cards/${current.id}.webp`}
              alt={`${current.name} travel guide - ${current.cardImageAlt || current.name}`}
              className="w-full h-full object-cover"
              width={1200}
              height={550}
              loading="eager"
              {...{ fetchpriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>}
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
                    <Sparkles className="w-3 h-3 mr-1.5 fill-current" aria-hidden="true" />
                    {current.moodVibe || "Destination"}
                  </Badge>
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  {current.name}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-3 text-white/80 text-sm sm:text-base mb-6"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#E84C9A]" aria-hidden="true" />
                    {current.country}
                  </span>
                  {current.moodTagline && (
                    <>
                      <span className="opacity-50" aria-hidden="true">|</span>
                      <span className="text-white/70">{current.moodTagline}</span>
                    </>
                  )}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Link href={`/destinations/${current.id}`}>
                    <Button className="rounded-xl bg-gradient-to-r from-[#6443F4] to-[#E84C9A] hover:opacity-90 text-white px-6 py-2.5 text-sm font-medium shadow-lg transition-all duration-300 hover:scale-[1.02]">
                      Explore {current.name}
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
          {featuredDestinations.map((dest, idx) => (
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

function DestinationCard({ destination, index }: { destination: APIDestination; index: number }) {
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
      <Link href={`/destinations/${destination.id}`}>
        <Card className="h-full overflow-hidden border-0 bg-white dark:bg-slate-800/60 shadow-lg hover:shadow-2xl dark:shadow-slate-900/40 transition-all duration-400 group-hover:-translate-y-1.5 rounded-2xl">
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={destination.cardImage || `/cards/${destination.id}.webp`}
              alt={`${destination.name} ${destination.country} - ${destination.cardImageAlt || destination.name}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              width={400}
              height={300}
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0A1F]/70 via-[#0B0A1F]/20 to-transparent" />

            <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
              <div className="flex gap-2">
                {destination.moodVibe && (
                  <Badge className="bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-white backdrop-blur-sm border-0 text-xs px-2.5 py-1 shadow-sm font-medium capitalize">
                    {destination.moodVibe}
                  </Badge>
                )}
              </div>
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
              {destination.summary || destination.moodTagline || `Explore ${destination.name}`}
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {destination.destinationLevel || "City"}
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

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-slate-950">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6443F4] to-[#E84C9A] flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Loader2 className="w-8 h-8 text-white animate-spin" aria-hidden="true" />
        </div>
        <h2 
          className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          Loading Destinations
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Fetching the latest destination data...
        </p>
      </div>
    </div>
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

function EmptyState() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-slate-950">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mx-auto mb-4">
          <Globe className="w-8 h-8 text-slate-400" aria-hidden="true" />
        </div>
        <h2 
          className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          No Destinations Available
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          No destinations are currently available. Please check back later.
        </p>
      </div>
    </div>
  );
}

interface PageSeoData {
  pagePath: string;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  robotsMeta: string | null;
  jsonLdSchema: any;
}

export default function DestinationsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: destinations, isLoading: destinationsLoading, isError, refetch } = useQuery<APIDestination[]>({
    queryKey: ["/api/public/destinations"],
  });

  const { data: pageSeo, isLoading: seoLoading } = useQuery<PageSeoData>({
    queryKey: ["/api/public/page-seo", "/destinations"],
    queryFn: async () => {
      const res = await fetch("/api/public/page-seo/destinations");
      return res.json();
    },
    staleTime: 30000, // Cache SEO for 30 seconds to avoid flashing
  });

  // Wait for both destinations AND SEO data to load
  if (destinationsLoading || seoLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (!destinations || destinations.length === 0) {
    return <EmptyState />;
  }

  const filteredDestinations = destinations.filter(dest => {
    const matchesSearch = dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dest.country.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const destinationCount = destinations.length;
  const countryCount = new Set(destinations.map(d => d.country)).size;

  return (
    <>
      {/* SEO from database - NO FALLBACKS, NO COUNT-BASED TITLES */}
      <Helmet>
        {pageSeo?.metaTitle && <title>{pageSeo.metaTitle}</title>}
        {pageSeo?.metaDescription && <meta name="description" content={pageSeo.metaDescription} />}
        {pageSeo?.canonicalUrl && <link rel="canonical" href={pageSeo.canonicalUrl} />}
        {pageSeo?.robotsMeta && <meta name="robots" content={pageSeo.robotsMeta} />}
        
        {/* Open Graph from database */}
        {pageSeo?.ogTitle && <meta property="og:title" content={pageSeo.ogTitle} />}
        {pageSeo?.ogDescription && <meta property="og:description" content={pageSeo.ogDescription} />}
        {pageSeo?.ogImage && <meta property="og:image" content={pageSeo.ogImage} />}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageSeo?.canonicalUrl || "https://travi.world/destinations"} />
        
        {/* Twitter Card - derived from OG if available */}
        <meta name="twitter:card" content="summary_large_image" />
        {pageSeo?.ogTitle && <meta name="twitter:title" content={pageSeo.ogTitle} />}
        {pageSeo?.ogDescription && <meta name="twitter:description" content={pageSeo.ogDescription} />}
        {pageSeo?.ogImage && <meta name="twitter:image" content={pageSeo.ogImage} />}

        {/* Hreflang tags */}
        <link rel="alternate" hrefLang="x-default" href="https://travi.world/destinations" />
        {SUPPORTED_LANGUAGES.map(lang => (
          <link key={lang.code} rel="alternate" hrefLang={lang.code} href={`https://travi.world/${lang.code}/destinations`} />
        ))}

        {/* Preload first destination image if available */}
        {destinations[0]?.cardImage && (
          <link 
            rel="preload" 
            as="image" 
            href={destinations[0].cardImage}
          />
        )}

        {/* JSON-LD from database - admin-controlled structured data */}
        {pageSeo?.jsonLdSchema && (
          <script type="application/ld+json">
            {JSON.stringify(pageSeo.jsonLdSchema)}
          </script>
        )}
      </Helmet>

      <div className="min-h-screen bg-white dark:bg-slate-950">
        <PublicNav variant="default" />

        <main>
          <DestinationsHero destinationCount={destinationCount} regionCount={countryCount} />

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
                  </div>
                </div>

                <FeaturedCarousel destinations={destinations} />
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

                {filteredDestinations.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredDestinations.map((dest, idx) => (
                      <DestinationCard key={dest.id} destination={dest} index={idx} />
                    ))}
                  </div>
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
                      Try adjusting your search criteria
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery("")}
                      className="rounded-full"
                      data-testid="button-clear-filters"
                    >
                      Clear Search
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

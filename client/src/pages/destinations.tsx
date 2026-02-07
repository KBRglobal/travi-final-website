import { useState, useRef } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
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
  Loader2,
} from "lucide-react";
import { motion, useInView, AnimatePresence, useReducedMotion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { cn } from "@/lib/utils";
import { DestinationsHero } from "@/components/destinations-hero";
import { useQuery } from "@tanstack/react-query";

const heroAnimationStyles = `
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

// Use canonical locale list from shared schema for complete hreflang coverage
import { SUPPORTED_LOCALES as SCHEMA_LOCALES } from "@shared/schema";
const SUPPORTED_LANGUAGES = SCHEMA_LOCALES.map(l => ({ code: l.code, label: l.nativeName }));

const FAQ_KEYS = ["1", "2", "3", "4"] as const;

function usePreferredMotion() {
  const prefersReducedMotion = useReducedMotion();
  return !prefersReducedMotion;
}

function DestinationChip({ destination, index }: { destination: APIDestination; index: number }) {
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
            alt={`${destination.name} travel destination`}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-[#6443F4]/20 group-hover:ring-[#6443F4]/50 transition-all"
            width={36}
            height={36}
            loading="lazy"
            decoding="async"
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.src = `https://placehold.co/100x100/6443F4/white?text=${destination.name.charAt(0)}`;
            }}
          />
          <div className="flex flex-col">
            <span className="text-slate-900 dark:text-white font-medium text-sm leading-tight">
              {destination.name}
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[10px] leading-tight">
              {destination.country}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function LightHero({ destinations }: { destinations: APIDestination[] }) {
  const { t } = useTranslation();
  const shouldAnimate = usePreferredMotion();
  const destinationCount = destinations.length;
  const countryCount = new Set(destinations.map(d => d.country)).size;

  return (
    <section
      className="relative bg-white dark:bg-slate-950 min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 md:px-12 lg:px-16 overflow-hidden"
      data-testid="destinations-hero"
      aria-label={t("destinations.hero.ariaLabel")}
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

      <div
        className="absolute top-1/2 right-0 translate-x-1/3 -translate-y-1/2 w-[800px] h-[800px] rotate-slow opacity-10 dark:opacity-15 pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="w-full h-full rounded-full border-[30px] border-transparent"
          style={{ borderTopColor: "#6443F4", borderRightColor: "#F24294" }}
        />
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
                {t("destinations.hero.badge", { count: destinationCount })}
              </span>
            </motion.div>

            <motion.h1
              className="mb-6"
              initial={shouldAnimate ? { opacity: 0, y: 30 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              data-testid="destinations-page-h1"
            >
              <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-2 font-chillax">
                {t("destinations.hero.discover")}
              </span>
              <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.1] tracking-tight animated-gradient-text font-chillax">
                {t("destinations.hero.worldClass")}
              </span>
              <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white leading-[1.1] tracking-tight font-chillax">
                {t("destinations.hero.destinations")}
              </span>
            </motion.h1>

            <motion.p
              className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-8 font-light leading-relaxed max-w-lg mx-auto lg:mx-0"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              data-testid="destinations-page-intro"
            >
              {t("destinations.hero.description")}
            </motion.p>

            <motion.dl
              className="flex flex-wrap justify-center lg:justify-start items-center gap-4 sm:gap-6 md:gap-8 mb-8"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              {[
                {
                  num: destinationCount.toString(),
                  label: t("destinations.stats.destinations"),
                  icon: MapPin,
                },
                {
                  num: countryCount.toString(),
                  label: t("destinations.stats.countries"),
                  icon: Globe,
                },
              ].map((stat, i) => (
                <div key={stat.label} className="flex items-center gap-4 sm:gap-6 md:gap-8">
                  <div className="text-center lg:text-left flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6443F4]/10 to-[#E84C9A]/10 flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-[#6443F4]" aria-hidden="true" />
                    </div>
                    <div>
                      <dt className="sr-only">{stat.label}</dt>
                      <dd className="text-2xl sm:text-3xl font-medium text-slate-900 dark:text-white font-chillax">
                        {stat.num}
                      </dd>
                      <div
                        className="text-[10px] sm:text-[11px] text-slate-400 tracking-wider"
                        aria-hidden="true"
                      >
                        {stat.label}
                      </div>
                    </div>
                  </div>
                  {i < 1 && (
                    <div
                      className="hidden sm:block w-px h-10 sm:h-12 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700 to-transparent"
                      aria-hidden="true"
                    />
                  )}
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
                  {t("destinations.hero.exploreAll")}
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
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const featuredDestinations = destinations.slice(0, 8);

  useState(() => {
    if (!isAutoPlaying || featuredDestinations.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % featuredDestinations.length);
    }, 4000);
    return () => clearInterval(timer);
  });

  if (featuredDestinations.length === 0) return null;

  const goTo = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goPrev = () =>
    goTo((currentIndex - 1 + featuredDestinations.length) % featuredDestinations.length);
  const goNext = () => goTo((currentIndex + 1) % featuredDestinations.length);

  const current = featuredDestinations[currentIndex];

  return (
    <div
      className="relative group"
      role="region"
      aria-label={t("destinations.carousel.label")}
      aria-roledescription="carousel"
    >
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
            aria-label={t("destinations.carousel.slideOf", {
              current: currentIndex + 1,
              total: featuredDestinations.length,
              name: current.name,
            })}
          >
            <img
              src={current.heroImage || current.cardImage || `/cards/${current.id}.webp`}
              alt={
                current.cardImageAlt ||
                t("destinations.card.travelGuideAlt", { name: current.name })
              }
              className="w-full h-full object-cover"
              width={1200}
              height={550}
              loading="eager"
              {...({ fetchpriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>)}
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
                    {current.moodVibe || t("destinations.card.destination")}
                  </Badge>
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 font-chillax"
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
                      <span className="opacity-50" aria-hidden="true">
                        |
                      </span>
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
                      {t("destinations.card.explore")} {current.name}
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
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/15 backdrop-blur-md text-white border border-white/25 hover:bg-white/25 transition-all duration-200"
          aria-label={t("destinations.carousel.previous")}
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </Button>
        <div
          className="flex gap-1.5 px-2"
          role="tablist"
          aria-label={t("destinations.carousel.label")}
        >
          {featuredDestinations.map((dest, idx) => (
            <button
              key={dest.name}
              onClick={() => goTo(idx)}
              className={cn(
                "min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-all duration-300"
              )}
              role="tab"
              aria-selected={idx === currentIndex}
              aria-label={t("destinations.carousel.goTo", { name: dest.name })}
              data-testid={`carousel-dot-${idx}`}
            >
              <span
                className={cn(
                  "h-2 rounded-full transition-all duration-300 block",
                  idx === currentIndex
                    ? "w-7 bg-gradient-to-r from-[#6443F4] to-[#E84C9A]"
                    : "w-2 bg-white/50 hover:bg-white/70"
                )}
              />
            </button>
          ))}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={goNext}
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/15 backdrop-blur-md text-white border border-white/25 hover:bg-white/25 transition-all duration-200"
          aria-label={t("destinations.carousel.next")}
        >
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function DestinationCard({ destination, index }: { destination: APIDestination; index: number }) {
  const { t } = useTranslation();
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
              <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight font-chillax">
                {destination.name}
              </h3>
            </div>
          </div>

          <CardContent className="p-4 bg-white dark:bg-slate-800/80">
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
              {destination.summary ||
                destination.moodTagline ||
                t("destinations.card.exploreFallback", { name: destination.name })}
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {destination.destinationLevel || t("destinations.card.defaultLevel")}
              </span>
              <span className="flex items-center text-[#6443F4] font-medium text-sm transition-all duration-300 group-hover:gap-1.5">
                {t("destinations.card.explore")}
                <ArrowRight
                  className="w-3.5 h-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform duration-300"
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

function DestinationsFAQ() {
  const { t } = useTranslation();

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
            className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3 font-chillax"
          >
            {t("destinations.faq.title")}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            {t("destinations.faq.subtitle")}
          </p>
        </motion.div>

        <div className="space-y-4">
          {FAQ_KEYS.map((key, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-700/50"
            >
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                {t(`destinations.faq.q${key}`)}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t(`destinations.faq.a${key}`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LoadingState() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-slate-950">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6443F4] to-[#E84C9A] flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Loader2 className="w-8 h-8 text-white animate-spin" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-chillax">
          {t("destinations.loading.title")}
        </h2>
        <p className="text-slate-600 dark:text-slate-400">{t("destinations.loading.message")}</p>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-slate-950">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mx-auto mb-4">
          <Globe className="w-8 h-8 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-chillax">
          {t("destinations.error.title")}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">{t("destinations.error.message")}</p>
        <Button
          onClick={onRetry}
          className="rounded-xl bg-gradient-to-r from-[#6443F4] to-[#E84C9A] hover:opacity-90 text-white px-6 shadow-lg"
        >
          <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
          {t("destinations.error.refresh")}
        </Button>
      </div>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-slate-950">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mx-auto mb-4">
          <Globe className="w-8 h-8 text-slate-400" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-chillax">
          {t("destinations.empty.title")}
        </h2>
        <p className="text-slate-600 dark:text-slate-400">{t("destinations.empty.message")}</p>
      </div>
    </div>
  );
}

interface JsonLdSchema {
  "@context"?: string;
  "@type"?: string;
  "@id"?: string;
  [key: string]: unknown;
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
  jsonLdSchema: JsonLdSchema | null;
}

export default function DestinationsPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: destinations,
    isLoading: destinationsLoading,
    isError,
    refetch,
  } = useQuery<APIDestination[]>({
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
    const matchesSearch =
      dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
        <link rel="canonical" href={pageSeo?.canonicalUrl || "https://travi.world/destinations"} />
        <meta name="robots" content={pageSeo?.robotsMeta || "index, follow"} />

        {/* Open Graph from database */}
        {pageSeo?.ogTitle && <meta property="og:title" content={pageSeo.ogTitle} />}
        {pageSeo?.ogDescription && (
          <meta property="og:description" content={pageSeo.ogDescription} />
        )}
        {pageSeo?.ogImage && <meta property="og:image" content={pageSeo.ogImage} />}
        <meta property="og:type" content="website" />
        <meta
          property="og:url"
          content={pageSeo?.canonicalUrl || "https://travi.world/destinations"}
        />

        {/* Twitter Card - derived from OG if available */}
        <meta name="twitter:card" content="summary_large_image" />
        {pageSeo?.ogTitle && <meta name="twitter:title" content={pageSeo.ogTitle} />}
        {pageSeo?.ogDescription && (
          <meta name="twitter:description" content={pageSeo.ogDescription} />
        )}
        {pageSeo?.ogImage && <meta name="twitter:image" content={pageSeo.ogImage} />}

        {/* Hreflang tags - English at root, others at /{locale}/destinations */}
        <link rel="alternate" hrefLang="x-default" href="https://travi.world/destinations" />
        {SUPPORTED_LANGUAGES.map(lang => (
          <link
            key={lang.code}
            rel="alternate"
            hrefLang={lang.code}
            href={
              lang.code === "en"
                ? "https://travi.world/destinations"
                : `https://travi.world/${lang.code}/destinations`
            }
          />
        ))}

        {/* Preload first destination image if available */}
        {destinations[0]?.cardImage && (
          <link rel="preload" as="image" href={destinations[0].cardImage} />
        )}

        {/* JSON-LD from database - admin-controlled structured data */}
        {pageSeo?.jsonLdSchema && (
          <script type="application/ld+json">{JSON.stringify(pageSeo.jsonLdSchema)}</script>
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
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3 font-chillax">
                      {t("destinations.sections.featured")}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-base max-w-xl">
                      {t("destinations.sections.featuredDesc")}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="search"
                        placeholder={t("destinations.search.placeholder")}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
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
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2 font-chillax">
                    {t("destinations.sections.all")}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    {t("destinations.sections.count", { count: filteredDestinations.length })}
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
                      {t("destinations.search.noResults")}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      {t("destinations.search.tryAdjusting")}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery("")}
                      className="rounded-full"
                      data-testid="button-clear-filters"
                    >
                      {t("destinations.search.clearSearch")}
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

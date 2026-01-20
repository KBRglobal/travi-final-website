import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { 
  MapPin, ArrowRight, Compass, Building2, Heart, BookOpen
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface HeroSlide {
  id: string;
  destinationId: string;
  filename: string;
  alt: string;
  order: number;
  isActive: boolean;
  cityType?: string;
  travelStyle?: string;
  secondaryBadge?: string;
  destination?: {
    id: string;
    name: string;
    slug: string;
    country: string;
  };
}

interface HeroConfig {
  heroSlides: HeroSlide[];
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroDescription: string | null;
  heroCTAText: string | null;
  heroCTALink: string | null;
}

interface DisplayDestination {
  id: string;
  name: string;
  slug: string;
  country: string;
  heroImage: string;
  alt: string;
  cityType: string;
  travelStyle: string;
  secondaryBadge: string;
}

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
    background: linear-gradient(135deg, #6443F4 0%, #8B5CF6 30%, #F24294 70%, #6443F4 100%);
    background-size: 300% 300%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradient-flow 6s ease infinite;
  }
  .rotate-slow { animation: rotate-slow 20s linear infinite; }
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

interface DestinationsHeroProps {
  destinationCount: number;
  regionCount: number;
}

export function DestinationsHero({ destinationCount, regionCount }: DestinationsHeroProps) {
  const { t } = useTranslation();
  const shouldAnimate = usePreferredMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const { data: heroConfig } = useQuery<HeroConfig>({
    queryKey: ["/api/public/destinations-index/hero"],
  });
  
  const displayDestinations = useMemo<DisplayDestination[]>(() => {
    if (heroConfig?.heroSlides && heroConfig.heroSlides.length > 0) {
      return heroConfig.heroSlides
        .filter((slide) => slide.filename && slide.isActive)
        .map((slide) => {
          const destName = slide.destination?.name || t("destinations.card.destination");
          return {
            id: slide.destination?.id || slide.destinationId,
            name: destName,
            slug: slide.destination?.slug || "",
            country: slide.destination?.country || "",
            heroImage: slide.filename,
            alt: slide.alt || t("destinations.card.travelGuideAlt", { name: destName }),
            cityType: slide.cityType || "",
            travelStyle: slide.travelStyle || "",
            secondaryBadge: slide.secondaryBadge || "",
          };
        });
    }
    return [];
  }, [heroConfig, t]);
  
  // Database-driven only - no fallback text per CMS contract
  const heroTitle = heroConfig?.heroTitle ?? null;
  const heroSubtitle = heroConfig?.heroSubtitle ?? null;
  const heroDescription = heroConfig?.heroDescription ?? null;
  const heroCTAText = heroConfig?.heroCTAText ?? null;
  const heroCTALink = heroConfig?.heroCTALink ?? null;
  
  // Check if we have any content to display
  const hasHeroContent = heroTitle || heroSubtitle || heroDescription;
  
  const hasSlides = displayDestinations.length > 0;
  const dest = hasSlides ? displayDestinations[currentIndex] : null;

  useEffect(() => {
    if (!hasSlides || displayDestinations.length <= 1) return;
    const nextIndex = (currentIndex + 1) % displayDestinations.length;
    const nextImage = displayDestinations[nextIndex]?.heroImage;
    if (nextImage) {
      const img = new Image();
      img.src = nextImage;
    }
  }, [currentIndex, displayDestinations, hasSlides]);

  useEffect(() => {
    if (!shouldAnimate || !hasSlides) return;
    
    let animationTimeout: NodeJS.Timeout;
    const timer = setInterval(() => {
      setIsAnimating(true);
      animationTimeout = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % displayDestinations.length);
        setIsAnimating(false);
      }, 500);
    }, 5000);
    
    return () => {
      clearInterval(timer);
      clearTimeout(animationTimeout);
    };
  }, [shouldAnimate, displayDestinations.length, hasSlides]);

  const goTo = (index: number): void => {
    if (index !== currentIndex && !isAnimating && hasSlides) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(index);
        setIsAnimating(false);
      }, 500);
    }
  };

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-[#6443F4]/5 to-[#8B5CF6]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-[#8B5CF6]/5 to-[#6443F4]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-purple-100/20 to-transparent rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rotate-slow opacity-10 dark:opacity-20" aria-hidden="true">
          <div className="w-full h-full rounded-full border-[40px] border-transparent" style={{ borderTopColor: '#6443F4', borderRightColor: '#F24294' }} />
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-12 lg:gap-16 items-center">
          {/* Left content - Text first on mobile (order-1), left on desktop (lg:order-1) */}
          <div className="text-left order-1 lg:order-1" data-testid="destinations-hero-content">
            <motion.div 
              className="mb-8"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 shadow-lg shadow-[#6443F4]/10 border border-[#6443F4]/20">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-3 h-3 rounded-full bg-[#6443F4] animate-ping opacity-75" />
                  <span className="relative w-2.5 h-2.5 rounded-full bg-[#6443F4]" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300" data-testid="badge-destinations-count">
                  {t("destinations.hero.trustedBy", { count: destinationCount })}
                </span>
              </div>
            </motion.div>
            
            {(heroTitle || heroSubtitle) && (
              <motion.h1 
                className="mb-6" 
                initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.1 }}
              >
                {heroTitle && (
                  <span 
                    className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-2"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    {heroTitle}
                  </span>
                )}
                {heroSubtitle && (
                  <span className="relative inline-block">
                    <span 
                      className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.1] tracking-tight animated-gradient-text"
                      style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                    >
                      {heroSubtitle}
                    </span>
                    <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-[#6443F4] via-[#8B5CF6] to-[#F24294] rounded-full opacity-80" />
                  </span>
                )}
              </motion.h1>
            )}
            
            {heroDescription && (
              <motion.p 
                className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-md leading-relaxed"
                initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.2 }}
              >
                {heroDescription}
              </motion.p>
            )}
            
            <motion.div 
              className="flex flex-wrap gap-4 mb-10" 
              initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3 }}
            >
              {heroCTAText && heroCTALink && (
                <Link href={heroCTALink}>
                  <Button className="rounded-full bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] hover:opacity-90 text-white px-8 py-6 text-base font-semibold shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30">
                    <Compass className="w-5 h-5 mr-2" />
                    {heroCTAText}
                  </Button>
                </Link>
              )}
              <Link href="/travel-guides">
                <Button variant="outline" className="rounded-full px-6 py-6 text-base font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <BookOpen className="w-5 h-5 mr-2" />
                  {t("destinations.hero.travelGuides")}
                </Button>
              </Link>
            </motion.div>
            
            <motion.div 
              className="flex items-center gap-8"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.4 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{destinationCount}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{t("destinations.stats.destinations")}</div>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{regionCount}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{t("destinations.stats.regions")}</div>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>17</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{t("destinations.stats.languages")}</div>
              </div>
            </motion.div>
          </div>

          {/* Right - Gallery - Second on mobile (order-2), right on desktop (lg:order-2) */}
          {hasSlides && dest && (
            <div className="order-2 lg:order-2 relative px-2 sm:px-4 lg:px-0" data-testid="destinations-hero-gallery">
              <motion.div 
                className="relative w-full max-w-lg mx-auto flex flex-col lg:h-[65vh] lg:min-h-[500px]"
                initial={shouldAnimate ? { opacity: 0, x: 40 } : {}}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                
                <div 
                  className="bento-card relative flex-1 min-h-[300px] lg:min-h-0 group bg-white dark:bg-slate-900 shadow-lg dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-[#6443F4]/15 hover:-translate-y-2 transition-all duration-400"
                  role="region"
                  aria-label="Featured destination gallery"
                >
                  <AnimatePresence mode="wait">
                    <motion.img 
                      key={currentIndex}
                      src={dest.heroImage} 
                      alt={dest.alt}
                      title={`Explore ${dest.name}`}
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7 }}
                      loading={currentIndex === 0 ? "eager" : "lazy"}
                      fetchPriority={currentIndex === 0 ? "high" : "auto"}
                    />
                  </AnimatePresence>
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />
                  
                  <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      {dest.cityType && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md shadow-lg">
                          <Building2 className="w-4 h-4 text-[#6443F4]" />
                          <span className="font-bold text-slate-800">{dest.cityType}</span>
                        </div>
                      )}
                      {dest.travelStyle && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md shadow-lg">
                          <Heart className="w-4 h-4 text-[#F24294]" />
                          <span className="font-medium text-slate-700">{dest.travelStyle}</span>
                        </div>
                      )}
                    </div>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: isAnimating ? 0 : 1, y: isAnimating ? 20 : 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="flex items-center gap-2 text-white/80 mb-3">
                        <MapPin className="w-5 h-5" />
                        <span className="font-medium">{dest.country}</span>
                      </div>
                      
                      <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{dest.name}</h2>
                      
                      {dest.secondaryBadge && (
                        <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white/90 text-sm mb-6">
                          {dest.secondaryBadge}
                        </span>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white/60 text-sm">{t("destinations.hero.explore")}</span>
                          <span className="text-2xl font-bold text-white ml-2">{dest.name}</span>
                        </div>
                        <Link href={`/destinations/${dest.slug}`}>
                          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-bold hover:bg-[#6443F4]/10 hover:text-[#6443F4] transition-all shadow-xl hover:shadow-2xl hover:scale-105 transform">
                            {t("destinations.hero.discoverButton")}
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </Link>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {displayDestinations.length > 1 && (
                  <div 
                    className="mt-4 flex justify-center gap-3 p-3 rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-xl dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700 flex-shrink-0"
                    role="tablist"
                    aria-label="Destination carousel thumbnails"
                  >
                    {displayDestinations.slice(0, 5).map((destination, i) => (
                      <button 
                        key={i}
                        onClick={() => goTo(i)} 
                        className={cn(
                          "thumb-item w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden ring-2 ring-offset-2 dark:ring-offset-slate-800 shadow-sm hover:shadow-lg hover:shadow-[#6443F4]/20 transition-all",
                          currentIndex === i 
                            ? "ring-[#6443F4] active" 
                            : "ring-transparent hover:ring-[#6443F4]/50"
                        )}
                        data-testid={`thumbnail-${i}`}
                        role="tab"
                        aria-selected={currentIndex === i}
                        aria-label={`View ${destination.name}, ${destination.country}`}
                      >
                        <img 
                          src={destination.heroImage} 
                          alt={`${destination.alt || destination.name} - thumbnail`} 
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}

              </motion.div>
            </div>
          )}
          
          {/* Placeholder when no slides are configured */}
          {!hasSlides && (
            <div className="order-2 lg:order-2 relative px-2 sm:px-4 lg:px-0" data-testid="destinations-hero-placeholder">
              <motion.div 
                className="relative w-full max-w-lg mx-auto flex flex-col lg:h-[65vh] lg:min-h-[500px]"
                initial={shouldAnimate ? { opacity: 0, x: 40 } : {}}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <div 
                  className="bento-card relative flex-1 min-h-[300px] lg:min-h-0 group bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden flex items-center justify-center"
                  role="region"
                  aria-label="Featured destination placeholder"
                >
                  <div className="text-center p-8">
                    <Compass className="w-16 h-16 text-[#6443F4]/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      {t("destinations.hero.explorePlaceholder")}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-500 max-w-xs">
                      {t("destinations.hero.browseCollection")}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

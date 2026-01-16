import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Globe, Star, ArrowRight, Plane, Compass, Camera, 
  Briefcase, Map, Heart, Sparkles, Building2, TreePalm, BookOpen, Clock, Ticket
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { cn } from "@/lib/utils";

const HERO_DESTINATIONS = [
  { id: "dubai", name: "Dubai", slug: "dubai", country: "UAE", image: "/cards/dubai.webp", heroImage: "/destination-hero/dubai-destination-hero.jpeg", fallback: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop", cityType: "Global Travel Hub", travelStyle: "Luxury & Modern City", secondaryBadge: "Nov–Mar" },
  { id: "paris", name: "Paris", slug: "paris", country: "France", image: "/cards/paris.webp", heroImage: "/destination-hero/paris-destination-hero.jpeg", fallback: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop", cityType: "Historic Capital", travelStyle: "Culture & Romance", secondaryBadge: "3–5 days" },
  { id: "tokyo", name: "Tokyo", slug: "tokyo", country: "Japan", image: "/cards/tokyo.webp", heroImage: "/destination-hero/tokyo-destination-hero.jpeg", fallback: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop", cityType: "Mega City", travelStyle: "Tradition Meets Future", secondaryBadge: "Mar–Apr, Oct–Nov" },
  { id: "new-york", name: "New York", slug: "new-york", country: "USA", image: "/cards/new-york.webp", heroImage: "/destination-hero/new-york-destination-hero.jpeg", fallback: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop", cityType: "Global Metropolis", travelStyle: "Cultural Capital", secondaryBadge: "4–6 days" },
  { id: "london", name: "London", slug: "london", country: "UK", image: "/cards/london.webp", heroImage: "/destination-hero/london-destination-hero.jpeg", fallback: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop", cityType: "Historic Global Capital", travelStyle: "World Financial Center", secondaryBadge: "May–Sep" },
  { id: "singapore", name: "Singapore", slug: "singapore", country: "Singapore", image: "/cards/singapore.webp", heroImage: "/destination-hero/singapore-destination-hero.jpeg", fallback: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&h=300&fit=crop", cityType: "Smart City", travelStyle: "Southeast Asia Hub", secondaryBadge: "2–4 days" },
  { id: "barcelona", name: "Barcelona", slug: "barcelona", country: "Spain", image: "/cards/barcelona.webp", heroImage: "/destination-hero/barcelona-destination-hero.jpeg", fallback: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=300&fit=crop", cityType: "Architecture Capital", travelStyle: "Mediterranean City", secondaryBadge: "Apr–Jun, Sep" },
];

const heroAnimationStyles = `
  @keyframes gradient-flow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  @keyframes float-slow {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-15px) rotate(5deg); }
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
  .float-animation { animation: float 4s ease-in-out infinite; }
  .float-slow { animation: float-slow 6s ease-in-out infinite; }
  .rotate-slow { animation: rotate-slow 20s linear infinite; }
`;

function usePreferredMotion() {
  const prefersReducedMotion = useReducedMotion();
  return !prefersReducedMotion;
}

interface HeroProps {
  destinationCount: number;
  regionCount: number;
}

function HeroTitle() {
  return (
    <>
      <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-2" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
        Discover World-Class
      </span>
      <span className="relative inline-block">
        <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.1] tracking-tight animated-gradient-text" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
          Destinations
        </span>
        {/* Gradient underline accent */}
        <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-[#6443F4] via-[#8B5CF6] to-[#F24294] rounded-full opacity-80" />
      </span>
    </>
  );
}

function HeroSubtitle() {
  return (
    <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 font-light leading-relaxed max-w-lg">
      Curated travel guides with local expertise for the world's most captivating cities. From iconic landmarks to hidden gems.
    </p>
  );
}

function HeroStats({ destinationCount, regionCount }: HeroProps) {
  const stats = [
    { num: destinationCount.toString(), label: 'DESTINATIONS', icon: MapPin },
    { num: regionCount.toString(), label: 'REGIONS', icon: Globe },
    { num: '3,000+', label: 'ATTRACTIONS', icon: Star }
  ];
  return (
    <div className="flex flex-wrap items-center gap-6 sm:gap-8">
      {stats.map((stat, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6443F4]/10 to-[#8B5CF6]/10 flex items-center justify-center">
            <stat.icon className="w-5 h-5 text-[#6443F4]" />
          </div>
          <div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{stat.num}</div>
            <div className="text-[10px] text-slate-400 tracking-wider">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HeroButtons() {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Link href="#explore-destinations">
        <Button className="rounded-full bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] hover:opacity-90 text-white px-8 py-6 text-base font-medium shadow-lg shadow-purple-500/20" data-testid="button-explore-destinations">
          Explore All Destinations
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </Link>
      <Link href="/guides">
        <Button variant="outline" className="rounded-full border-slate-200 dark:border-slate-700 px-8 py-6 text-base">
          View Guides
        </Button>
      </Link>
    </div>
  );
}

function DecorativeDots() {
  return (
    <>
      <div className="absolute top-20 left-10 w-3 h-3 rounded-full bg-[#6443F4]/30" />
      <div className="absolute top-40 right-20 w-2 h-2 rounded-full bg-[#8B5CF6]/40" />
      <div className="absolute bottom-32 left-1/4 w-4 h-4 rounded-full bg-purple-300/30" />
      <div className="absolute top-1/3 right-1/3 w-2 h-2 rounded-full bg-pink-300/50" />
      <div className="absolute bottom-20 right-10 w-3 h-3 rounded-full bg-[#6443F4]/20" />
    </>
  );
}

function DecorativeIcons() {
  const shouldAnimate = usePreferredMotion();
  return (
    <>
      <motion.div 
        className="absolute top-24 left-8 text-[#6443F4]/20"
        animate={shouldAnimate ? { y: [0, -10, 0], rotate: [0, 10, 0] } : {}}
        transition={{ duration: 5, repeat: Infinity }}
      >
        <Plane className="w-8 h-8" />
      </motion.div>
      <motion.div 
        className="absolute top-40 right-12 text-[#8B5CF6]/20"
        animate={shouldAnimate ? { y: [0, -8, 0] } : {}}
        transition={{ duration: 4, repeat: Infinity, delay: 1 }}
      >
        <Compass className="w-6 h-6" />
      </motion.div>
      <motion.div 
        className="absolute bottom-40 left-16 text-purple-300/30"
        animate={shouldAnimate ? { y: [0, -12, 0], rotate: [0, -5, 0] } : {}}
        transition={{ duration: 6, repeat: Infinity, delay: 0.5 }}
      >
        <Camera className="w-7 h-7" />
      </motion.div>
      <motion.div 
        className="absolute bottom-32 right-20 text-[#6443F4]/15"
        animate={shouldAnimate ? { y: [0, -6, 0] } : {}}
        transition={{ duration: 4.5, repeat: Infinity, delay: 2 }}
      >
        <Briefcase className="w-6 h-6" />
      </motion.div>
    </>
  );
}

export function HeroV1({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();
  const arcPositions = [
    { x: 15, y: 25, delay: 0 },
    { x: 5, y: 50, delay: 0.1 },
    { x: 15, y: 75, delay: 0.2 },
    { x: 75, y: 15, delay: 0.3 },
    { x: 85, y: 40, delay: 0.4 },
    { x: 80, y: 65, delay: 0.5 },
  ];

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 md:px-12 lg:px-16 overflow-hidden bg-white dark:bg-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>
      <SubtleSkyBackground className="absolute inset-0 pointer-events-none" />
      <DecorativeDots />
      <DecorativeIcons />

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="relative min-h-[600px]">
          {arcPositions.map((pos, idx) => (
            <motion.div
              key={idx}
              className="absolute hidden lg:block"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              initial={shouldAnimate ? { opacity: 0, scale: 0.8 } : {}}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: pos.delay + 0.3, duration: 0.5 }}
              whileHover={shouldAnimate ? { scale: 1.08, y: -5 } : {}}
            >
              <Link href={`/destinations/${HERO_DESTINATIONS[idx]?.slug}`}>
                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-full pl-2 pr-5 py-2 shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-2xl transition-all">
                  <img 
                    src={HERO_DESTINATIONS[idx]?.fallback} 
                    alt={HERO_DESTINATIONS[idx]?.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-[#6443F4]/20"
                  />
                  <span className="font-medium text-slate-900 dark:text-white">{HERO_DESTINATIONS[idx]?.name}</span>
                </div>
              </Link>
            </motion.div>
          ))}

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-2xl px-4">
              <motion.div 
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full mb-6 border border-purple-100/50"
                initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
                animate={{ opacity: 1, y: 0 }}
              >
                <Globe className="w-4 h-4 text-[#6443F4]" />
                <span className="text-xs font-semibold tracking-wide text-[#6443F4] uppercase">{destinationCount} Destinations Worldwide</span>
              </motion.div>
              <motion.h1 
                className="mb-6"
                initial={shouldAnimate ? { opacity: 0, y: 30 } : {}}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <HeroTitle />
              </motion.h1>
              <motion.div 
                className="mb-8 flex justify-center"
                initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <HeroSubtitle />
              </motion.div>
              <motion.div 
                className="flex justify-center mb-10"
                initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <HeroButtons />
              </motion.div>
              <motion.div 
                className="flex justify-center"
                initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <HeroStats destinationCount={destinationCount} regionCount={regionCount} />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HeroV2({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();
  const cardPositions = [
    { x: 5, y: 20, rotate: -8, delay: 0 },
    { x: 12, y: 55, rotate: 5, delay: 0.1 },
    { x: 2, y: 75, rotate: -3, delay: 0.2 },
    { x: 70, y: 15, rotate: 6, delay: 0.15 },
    { x: 78, y: 45, rotate: -5, delay: 0.25 },
    { x: 72, y: 72, rotate: 8, delay: 0.3 },
  ];

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 md:px-12 lg:px-16 overflow-hidden bg-white dark:bg-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>
      <SubtleSkyBackground className="absolute inset-0 pointer-events-none" />
      <DecorativeDots />

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="relative min-h-[600px]">
          {cardPositions.map((pos, idx) => (
            <motion.div
              key={idx}
              className="absolute hidden lg:block"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, rotate: `${pos.rotate}deg` }}
              initial={shouldAnimate ? { opacity: 0, scale: 0.8, y: 30 } : {}}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: pos.delay + 0.3, duration: 0.6 }}
              whileHover={shouldAnimate ? { scale: 1.05, rotate: 0, y: -10, zIndex: 50 } : {}}
            >
              <Link href={`/destinations/${HERO_DESTINATIONS[idx]?.slug}`}>
                <div className="w-40 h-52 rounded-2xl overflow-hidden shadow-2xl shadow-slate-300/50 dark:shadow-slate-900/70 cursor-pointer group">
                  <img 
                    src={HERO_DESTINATIONS[idx]?.fallback} 
                    alt={HERO_DESTINATIONS[idx]?.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white font-medium">{HERO_DESTINATIONS[idx]?.name}</div>
                </div>
              </Link>
            </motion.div>
          ))}

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-2xl px-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-3xl p-10">
              <motion.h1 className="mb-6" initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} animate={{ opacity: 1, y: 0 }}>
                <HeroTitle />
              </motion.h1>
              <motion.div className="mb-8" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <HeroSubtitle />
              </motion.div>
              <motion.div className="flex justify-center mb-8" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <HeroButtons />
              </motion.div>
              <motion.div className="flex justify-center" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <HeroStats destinationCount={destinationCount} regionCount={regionCount} />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HeroV3({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 overflow-hidden bg-white dark:bg-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>
      <SubtleSkyBackground className="absolute inset-0 pointer-events-none" />
      <DecorativeDots />

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <motion.h1 className="mb-6" initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} animate={{ opacity: 1, y: 0 }}>
            <HeroTitle />
          </motion.h1>
          <motion.div className="flex justify-center mb-8" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Link href="#explore-destinations">
              <Button className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white px-8 py-6 text-base font-medium shadow-lg" data-testid="button-explore-destinations">
                Explore Destinations <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
          <motion.div className="flex justify-center" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <HeroStats destinationCount={destinationCount} regionCount={regionCount} />
          </motion.div>
        </div>

        <motion.div 
          className="flex justify-center gap-4 overflow-x-auto pb-4"
          initial={shouldAnimate ? { opacity: 0, y: 40 } : {}}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {HERO_DESTINATIONS.slice(0, 6).map((dest, idx) => (
            <Link key={dest.id} href={`/destinations/${dest.slug}`}>
              <motion.div 
                className="flex-shrink-0 w-32 sm:w-40"
                whileHover={shouldAnimate ? { y: -10, scale: 1.02 } : {}}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="h-64 sm:h-80 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 cursor-pointer group">
                  <img 
                    src={dest.fallback} 
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <span className="text-white font-semibold text-lg">{dest.name}</span>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export function HeroV4({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();
  const gradients = [
    "from-blue-500 to-purple-600",
    "from-purple-500 to-pink-500",
    "from-red-400 to-pink-500",
    "from-emerald-400 to-cyan-500",
    "from-violet-500 to-purple-500",
    "from-orange-400 to-rose-500",
  ];

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 md:px-12 overflow-hidden bg-white dark:bg-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>
      <SubtleSkyBackground className="absolute inset-0 pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full mb-6"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
              animate={{ opacity: 1, y: 0 }}
            >
              <Globe className="w-4 h-4 text-[#6443F4]" />
              <span className="text-xs font-semibold tracking-wide text-[#6443F4] uppercase">{destinationCount} Destinations Worldwide</span>
            </motion.div>
            <motion.h1 className="mb-6" initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <HeroTitle />
            </motion.h1>
            <motion.div className="mb-8" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <HeroSubtitle />
            </motion.div>
            <motion.div className="mb-10" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <HeroButtons />
            </motion.div>
            <motion.div initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <HeroStats destinationCount={destinationCount} regionCount={regionCount} />
            </motion.div>
          </div>

          <motion.div 
            className="grid grid-cols-3 gap-3"
            initial={shouldAnimate ? { opacity: 0, x: 50 } : {}}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {HERO_DESTINATIONS.slice(0, 6).map((dest, idx) => (
              <Link key={dest.id} href={`/destinations/${dest.slug}`}>
                <motion.div 
                  className={cn("relative h-40 rounded-2xl overflow-hidden cursor-pointer group bg-gradient-to-br", gradients[idx])}
                  whileHover={shouldAnimate ? { scale: 1.05, y: -5 } : {}}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="text-white font-semibold text-sm">{dest.name}</div>
                    <div className="text-white/70 text-xs">{dest.country}</div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function HeroV5({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();
  const cardPositions = [
    { x: 50, y: 5, rotate: -5, scale: 0.9, delay: 0.1 },
    { x: 35, y: 25, rotate: 3, scale: 1, delay: 0.15 },
    { x: 60, y: 35, rotate: -3, scale: 0.95, delay: 0.2 },
    { x: 45, y: 55, rotate: 5, scale: 1, delay: 0.25 },
    { x: 70, y: 60, rotate: -8, scale: 0.9, delay: 0.3 },
    { x: 55, y: 78, rotate: 6, scale: 0.95, delay: 0.35 },
  ];

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 md:px-12 overflow-hidden bg-white dark:bg-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>
      <SubtleSkyBackground className="absolute inset-0 pointer-events-none" />
      <DecorativeIcons />

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="relative min-h-[700px]">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 max-w-lg z-20">
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full mb-6"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
              animate={{ opacity: 1, y: 0 }}
            >
              <Globe className="w-4 h-4 text-[#6443F4]" />
              <span className="text-xs font-semibold tracking-wide text-[#6443F4] uppercase">{destinationCount} Destinations</span>
            </motion.div>
            <motion.h1 className="mb-6" initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <HeroTitle />
            </motion.h1>
            <motion.div className="mb-8" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <HeroSubtitle />
            </motion.div>
            <motion.div className="mb-10" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <HeroButtons />
            </motion.div>
            <motion.div initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <HeroStats destinationCount={destinationCount} regionCount={regionCount} />
            </motion.div>
          </div>

          {cardPositions.map((pos, idx) => (
            <motion.div
              key={idx}
              className="absolute hidden lg:block"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, rotate: `${pos.rotate}deg`, scale: pos.scale }}
              initial={shouldAnimate ? { opacity: 0, scale: 0.8, y: 30 } : {}}
              animate={{ opacity: 1, scale: pos.scale, y: 0 }}
              transition={{ delay: pos.delay + 0.3, duration: 0.6 }}
              whileHover={shouldAnimate ? { scale: 1.05, rotate: 0, y: -10, zIndex: 50 } : {}}
            >
              <Link href={`/destinations/${HERO_DESTINATIONS[idx]?.slug}`}>
                <div className="w-44 bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-slate-300/40 dark:shadow-slate-900/60 cursor-pointer border border-slate-100 dark:border-slate-700">
                  <div className="relative h-32">
                    <img src={HERO_DESTINATIONS[idx]?.fallback} alt={HERO_DESTINATIONS[idx]?.name} className="w-full h-full object-cover" />
                    <Badge className="absolute top-2 left-2 bg-[#6443F4] text-white text-[10px]">Popular</Badge>
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{HERO_DESTINATIONS[idx]?.name}</div>
                    <div className="text-xs text-slate-500">{HERO_DESTINATIONS[idx]?.country}</div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HeroV6({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();
  const leftCards = HERO_DESTINATIONS.slice(0, 3);
  const rightCards = HERO_DESTINATIONS.slice(3, 6);

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 overflow-hidden bg-white dark:bg-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>
      <SubtleSkyBackground className="absolute inset-0 pointer-events-none" />
      <DecorativeDots />

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-[1fr_2fr_1fr] gap-8 items-center min-h-[600px]">
          <div className="hidden lg:flex flex-col gap-4">
            {leftCards.map((dest, idx) => (
              <motion.div
                key={dest.id}
                initial={shouldAnimate ? { opacity: 0, x: -50 } : {}}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                whileHover={shouldAnimate ? { scale: 1.05, x: 10 } : {}}
                style={{ rotate: `${(idx - 1) * 3}deg` }}
              >
                <Link href={`/destinations/${dest.slug}`}>
                  <div className="relative h-36 rounded-2xl overflow-hidden shadow-xl cursor-pointer group">
                    <img src={dest.fallback} alt={dest.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 text-white font-semibold">{dest.name}</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <motion.h1 className="mb-6" initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} animate={{ opacity: 1, y: 0 }}>
              <HeroTitle />
            </motion.h1>
            <motion.div className="mb-8 flex justify-center" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <HeroSubtitle />
            </motion.div>
            <motion.div className="flex justify-center mb-10" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <HeroButtons />
            </motion.div>
            <motion.div className="flex justify-center" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <HeroStats destinationCount={destinationCount} regionCount={regionCount} />
            </motion.div>
          </div>

          <div className="hidden lg:flex flex-col gap-4">
            {rightCards.map((dest, idx) => (
              <motion.div
                key={dest.id}
                initial={shouldAnimate ? { opacity: 0, x: 50 } : {}}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                whileHover={shouldAnimate ? { scale: 1.05, x: -10 } : {}}
                style={{ rotate: `${(idx - 1) * -3}deg` }}
              >
                <Link href={`/destinations/${dest.slug}`}>
                  <div className="relative h-36 rounded-2xl overflow-hidden shadow-xl cursor-pointer group">
                    <img src={dest.fallback} alt={dest.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 text-white font-semibold">{dest.name}</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HeroV7({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-0 overflow-hidden bg-white dark:bg-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>
      <SubtleSkyBackground className="absolute inset-0 pointer-events-none" />
      <DecorativeIcons />

      <div className="w-full max-w-7xl mx-auto relative z-10 px-4 sm:px-6 pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            <motion.h1 className="mb-6" initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} animate={{ opacity: 1, y: 0 }}>
              <HeroTitle />
            </motion.h1>
            <motion.div className="mb-8" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <HeroSubtitle />
            </motion.div>
            <motion.div className="mb-10" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <HeroButtons />
            </motion.div>
            <motion.div initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <HeroStats destinationCount={destinationCount} regionCount={regionCount} />
            </motion.div>
          </div>

          <motion.div 
            className="flex flex-wrap gap-3 justify-center lg:justify-end"
            initial={shouldAnimate ? { opacity: 0, y: 30 } : {}}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {HERO_DESTINATIONS.slice(0, 8).map((dest, idx) => (
              <motion.div
                key={dest.id}
                whileHover={shouldAnimate ? { scale: 1.08, y: -5 } : {}}
                initial={shouldAnimate ? { opacity: 0, scale: 0.8 } : {}}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + idx * 0.05 }}
              >
                <Link href={`/destinations/${dest.slug}`}>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-full pl-1.5 pr-4 py-1.5 shadow-lg border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-xl transition-all">
                    <img src={dest.fallback} alt={dest.name} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <div className="font-medium text-sm text-slate-900 dark:text-white">{dest.name}</div>
                      <div className="text-[10px] text-slate-500">{dest.country}</div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32">
        <svg viewBox="0 0 1440 120" fill="none" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0,60 C360,120 1080,0 1440,60 L1440,120 L0,120 Z" fill="url(#wave-gradient)" />
          <defs>
            <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6443F4" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#6443F4" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </section>
  );
}

export function HeroV8({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 overflow-hidden bg-white dark:bg-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>
      <SubtleSkyBackground className="absolute inset-0 pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <motion.h1 className="mb-6" initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} animate={{ opacity: 1, y: 0 }}>
            <HeroTitle />
          </motion.h1>
          <motion.div className="flex justify-center mb-8" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <HeroSubtitle />
          </motion.div>
        </div>

        <motion.div 
          className="relative h-80 mb-12"
          initial={shouldAnimate ? { opacity: 0 } : {}}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: "1000px" }}>
            {HERO_DESTINATIONS.slice(0, 6).map((dest, idx) => {
              const angle = (idx - activeIdx) * 60;
              const isActive = idx === activeIdx;
              return (
                <motion.div
                  key={dest.id}
                  className="absolute cursor-pointer"
                  style={{
                    transform: `rotateY(${angle}deg) translateZ(200px)`,
                    zIndex: isActive ? 10 : 1,
                  }}
                  animate={{
                    opacity: isActive ? 1 : 0.5,
                    scale: isActive ? 1.1 : 0.8,
                  }}
                  onClick={() => setActiveIdx(idx)}
                  whileHover={!isActive ? { scale: 0.85 } : {}}
                >
                  <Link href={`/destinations/${dest.slug}`}>
                    <div className="w-48 h-64 rounded-2xl overflow-hidden shadow-2xl">
                      <img src={dest.fallback} alt={dest.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 text-white">
                        <div className="font-semibold text-lg">{dest.name}</div>
                        <div className="text-sm opacity-80">{dest.country}</div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <div className="flex justify-center gap-2 mb-10">
          {HERO_DESTINATIONS.slice(0, 6).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                idx === activeIdx ? "bg-[#6443F4] w-6" : "bg-slate-300 dark:bg-slate-600"
              )}
            />
          ))}
        </div>

        <motion.div 
          className="flex justify-center gap-4 mb-8"
          initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <HeroButtons />
        </motion.div>

        <motion.div 
          className="flex justify-center"
          initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <HeroStats destinationCount={destinationCount} regionCount={regionCount} />
        </motion.div>
      </div>
    </section>
  );
}

export function HeroV9({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();
  const masonryItems = [
    { dest: HERO_DESTINATIONS[0], height: "h-48", span: "col-span-1" },
    { dest: HERO_DESTINATIONS[1], height: "h-64", span: "col-span-1" },
    { dest: HERO_DESTINATIONS[2], height: "h-40", span: "col-span-1" },
    { dest: HERO_DESTINATIONS[3], height: "h-56", span: "col-span-1" },
    { dest: HERO_DESTINATIONS[4], height: "h-44", span: "col-span-1" },
    { dest: HERO_DESTINATIONS[5], height: "h-52", span: "col-span-1" },
  ];

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 md:px-12 overflow-hidden bg-white dark:bg-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>
      <SubtleSkyBackground className="absolute inset-0 pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full mb-6"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
              animate={{ opacity: 1, y: 0 }}
            >
              <Globe className="w-4 h-4 text-[#6443F4]" />
              <span className="text-xs font-semibold tracking-wide text-[#6443F4] uppercase">{destinationCount} Destinations</span>
            </motion.div>
            <motion.h1 className="mb-6" initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <HeroTitle />
            </motion.h1>
            <motion.div className="mb-8" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <HeroSubtitle />
            </motion.div>
            <motion.div className="mb-10" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <HeroButtons />
            </motion.div>
            <motion.div initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <HeroStats destinationCount={destinationCount} regionCount={regionCount} />
            </motion.div>
          </div>

          <motion.div 
            className="columns-2 gap-4 space-y-4"
            initial={shouldAnimate ? { opacity: 0, x: 50 } : {}}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {masonryItems.map((item, idx) => (
              <motion.div
                key={item.dest.id}
                className="break-inside-avoid mb-4"
                whileHover={shouldAnimate ? { scale: 1.03, y: -5 } : {}}
                initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.08 }}
              >
                <Link href={`/destinations/${item.dest.slug}`}>
                  <div className={cn("relative rounded-2xl overflow-hidden shadow-lg cursor-pointer group", item.height)}>
                    <img src={item.dest.fallback} alt={item.dest.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <div className="text-white font-semibold">{item.dest.name}</div>
                      <div className="text-white/70 text-sm">{item.dest.country}</div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function HeroV10({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();

  return (
    <section className="relative min-h-screen flex flex-col pt-24 pb-16 overflow-hidden bg-white dark:bg-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>
      <SubtleSkyBackground className="absolute inset-0 pointer-events-none" />
      <DecorativeDots />

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6">
        <div className="text-center max-w-2xl">
          <motion.h1 className="mb-6" initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} animate={{ opacity: 1, y: 0 }}>
            <HeroTitle />
          </motion.h1>
          <motion.div className="mb-8 flex justify-center" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <HeroSubtitle />
          </motion.div>
          <motion.div className="flex justify-center mb-10" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <HeroButtons />
          </motion.div>
          <motion.div className="flex justify-center" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <HeroStats destinationCount={destinationCount} regionCount={regionCount} />
          </motion.div>
        </div>
      </div>

      <motion.div 
        className="relative mt-auto"
        initial={shouldAnimate ? { opacity: 0, y: 50 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex gap-4 overflow-x-auto px-6 pb-6 scrollbar-hide">
          {HERO_DESTINATIONS.map((dest, idx) => (
            <motion.div
              key={dest.id}
              className="flex-shrink-0"
              whileHover={shouldAnimate ? { scale: 1.05, y: -10 } : {}}
              initial={shouldAnimate ? { opacity: 0, x: 50 } : {}}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + idx * 0.05 }}
            >
              <Link href={`/destinations/${dest.slug}`}>
                <div className="w-40 h-24 rounded-xl overflow-hidden shadow-lg cursor-pointer group relative">
                  <img src={dest.fallback} alt={dest.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-2 left-2 text-white text-sm font-medium">{dest.name}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

export function HeroV11({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();
  const polaroidPositions = [
    { x: 8, y: 20, rotate: -12 },
    { x: 18, y: 50, rotate: 8 },
    { x: 5, y: 70, rotate: -5 },
    { x: 68, y: 15, rotate: 10 },
    { x: 78, y: 45, rotate: -8 },
    { x: 70, y: 72, rotate: 15 },
  ];

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-950 dark:to-slate-900" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="relative min-h-[600px]">
          {polaroidPositions.map((pos, idx) => (
            <motion.div
              key={idx}
              className="absolute hidden lg:block"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              initial={shouldAnimate ? { opacity: 0, scale: 0.8, rotate: 0 } : {}}
              animate={{ opacity: 1, scale: 1, rotate: pos.rotate }}
              transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
              whileHover={shouldAnimate ? { scale: 1.1, rotate: 0, zIndex: 50 } : {}}
            >
              <Link href={`/destinations/${HERO_DESTINATIONS[idx]?.slug}`}>
                <div className="bg-white p-2 pb-8 shadow-xl cursor-pointer" style={{ transform: `rotate(${pos.rotate}deg)` }}>
                  <img src={HERO_DESTINATIONS[idx]?.fallback} alt={HERO_DESTINATIONS[idx]?.name} className="w-32 h-32 object-cover" />
                  <div className="text-center mt-2 font-handwriting text-slate-700">{HERO_DESTINATIONS[idx]?.name}</div>
                </div>
              </Link>
            </motion.div>
          ))}

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-2xl px-4">
              <motion.h1 className="mb-6" initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} animate={{ opacity: 1, y: 0 }}>
                <HeroTitle />
              </motion.h1>
              <motion.div className="mb-8 flex justify-center" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <HeroSubtitle />
              </motion.div>
              <motion.div className="flex justify-center mb-10" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <HeroButtons />
              </motion.div>
              <motion.div className="flex justify-center" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <HeroStats destinationCount={destinationCount} regionCount={regionCount} />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HeroV12({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const dest = HERO_DESTINATIONS[currentIndex];

  // Preload next image
  useEffect(() => {
    const nextIndex = (currentIndex + 1) % HERO_DESTINATIONS.length;
    const img = new Image();
    img.src = HERO_DESTINATIONS[nextIndex].fallback;
  }, [currentIndex]);

  // Auto-rotation with animation timing - respects reduced motion
  useEffect(() => {
    if (!shouldAnimate) return;
    
    let animationTimeout: NodeJS.Timeout;
    const timer = setInterval(() => {
      setIsAnimating(true);
      animationTimeout = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % HERO_DESTINATIONS.length);
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
    <section className="relative min-h-screen flex items-center pt-20 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>
      
      {/* Subtle decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-[#6443F4]/5 to-[#8B5CF6]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-[#8B5CF6]/5 to-[#6443F4]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-purple-100/20 to-transparent rounded-full" />
        {/* Rotating gradient ring - centered 1000px (UI Standard) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rotate-slow opacity-10 dark:opacity-20" aria-hidden="true">
          <div className="w-full h-full rounded-full border-[40px] border-transparent" style={{ borderTopColor: '#6443F4', borderRightColor: '#F24294' }} />
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div className="text-left order-2 lg:order-1">
            {/* Badge - UI Standard (white bg + shadow-lg + animated dot) */}
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
                  Trusted by <span className="text-[#6443F4]">{destinationCount}</span> destinations worldwide
                </span>
              </div>
            </motion.div>
            
            {/* H1 - UI Standard (2 lines, Chillax font, gradient word + underline) */}
            <motion.h1 
              className="mb-6" 
              initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1 }}
            >
              <span 
                className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-2"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                Discover World-Class
              </span>
              <span className="relative inline-block">
                <span 
                  className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.1] tracking-tight animated-gradient-text"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  Destinations
                </span>
                {/* Gradient underline accent */}
                <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-[#6443F4] via-[#8B5CF6] to-[#F24294] rounded-full opacity-80" />
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-md leading-relaxed"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }}
            >
              Handpicked travel experiences, insider tips, and comprehensive guides to help you discover extraordinary places.
            </motion.p>
            
            <motion.div 
              className="flex flex-wrap gap-4 mb-10" 
              initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3 }}
            >
              <Link href="#explore-destinations">
                <Button className="rounded-full bg-gradient-to-r from-[#6443F4] to-[#8B5CF6] hover:opacity-90 text-white px-8 py-6 text-base font-semibold shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30">
                  <Compass className="w-5 h-5 mr-2" />
                  Start Exploring
                </Button>
              </Link>
              <Link href="/travel-guides">
                <Button variant="outline" className="rounded-full px-6 py-6 text-base font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Travel Guides
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
                <div className="text-sm text-slate-500 dark:text-slate-400">Destinations</div>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{regionCount}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Regions</div>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>17</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Languages</div>
              </div>
            </motion.div>
          </div>

          {/* Right - Single Card Gallery with Carousel */}
          <div className="order-1 lg:order-2 relative px-2 sm:px-4 lg:px-0">
            <motion.div 
              className="relative w-full max-w-lg mx-auto flex flex-col lg:h-[65vh] lg:min-h-[500px]"
              initial={shouldAnimate ? { opacity: 0, x: 40 } : {}}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              
              {/* Main Featured Image */}
              <div 
                className="bento-card relative flex-1 min-h-0 group bg-white dark:bg-slate-900 shadow-lg dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-[#6443F4]/15 hover:-translate-y-2 transition-all duration-400"
                role="region"
                aria-label="Featured destination gallery"
              >
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={currentIndex}
                    src={dest.heroImage || dest.fallback} 
                    alt={`${dest.name} - ${dest.country}`}
                    title={`Explore ${dest.name}`}
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
                  {/* Top Row - City Type & Travel Style Badges */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md shadow-lg">
                      <Building2 className="w-4 h-4 text-[#6443F4]" />
                      <span className="font-bold text-slate-800">{dest.cityType}</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md shadow-lg">
                      <Heart className="w-4 h-4 text-[#F24294]" />
                      <span className="font-medium text-slate-700">{dest.travelStyle}</span>
                    </div>
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
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{dest.name}</h2>
                    
                    {/* Secondary Badge - Single optional badge */}
                    {dest.secondaryBadge && (
                      <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white/90 text-sm mb-6">
                        {dest.secondaryBadge}
                      </span>
                    )}
                    
                    {/* CTA */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white/60 text-sm">Explore</span>
                        <span className="text-2xl font-bold text-white ml-2">{dest.name}</span>
                      </div>
                      <Link href={`/destinations/${dest.slug}`}>
                        <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-bold hover:bg-[#6443F4]/10 hover:text-[#6443F4] transition-all shadow-xl hover:shadow-2xl hover:scale-105 transform">
                          Discover
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
                aria-label="Destination carousel thumbnails"
              >
                {HERO_DESTINATIONS.slice(0, 5).map((destination, i) => (
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
                      src={destination.heroImage || destination.fallback} 
                      alt={`${destination.name} thumbnail`} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>

            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HeroV13({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();
  const mapMarkers = [
    { dest: HERO_DESTINATIONS[0], x: 65, y: 35 },
    { dest: HERO_DESTINATIONS[1], x: 48, y: 28 },
    { dest: HERO_DESTINATIONS[2], x: 82, y: 32 },
    { dest: HERO_DESTINATIONS[3], x: 25, y: 35 },
    { dest: HERO_DESTINATIONS[4], x: 78, y: 55 },
    { dest: HERO_DESTINATIONS[5], x: 50, y: 30 },
  ];

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <motion.h1 className="mb-6" initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} animate={{ opacity: 1, y: 0 }}>
            <HeroTitle />
          </motion.h1>
          <motion.div className="flex justify-center mb-8" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <HeroSubtitle />
          </motion.div>
          <motion.div className="flex justify-center mb-8" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <HeroButtons />
          </motion.div>
        </div>

        <motion.div 
          className="relative h-80 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-xl"
          initial={shouldAnimate ? { opacity: 0, y: 30 } : {}}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-purple-100/50 dark:from-blue-900/20 dark:to-purple-900/20" />
          <Map className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 text-slate-300 dark:text-slate-600" />
          
          {mapMarkers.map((marker, idx) => (
            <motion.div
              key={idx}
              className="absolute"
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
              initial={shouldAnimate ? { opacity: 0, scale: 0 } : {}}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + idx * 0.1, type: "spring" }}
              whileHover={{ scale: 1.2, zIndex: 50 }}
            >
              <Link href={`/destinations/${marker.dest.slug}`}>
                <div className="relative cursor-pointer group">
                  <div className="w-4 h-4 bg-[#6443F4] rounded-full animate-pulse" />
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-lg shadow-lg p-2 whitespace-nowrap">
                    <div className="font-medium text-sm">{marker.dest.name}</div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          className="flex justify-center mt-10"
          initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <HeroStats destinationCount={destinationCount} regionCount={regionCount} />
        </motion.div>
      </div>
    </section>
  );
}

export function HeroV14({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 md:px-12 overflow-hidden bg-white dark:bg-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>
      <SubtleSkyBackground className="absolute inset-0 pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            <motion.h1 className="mb-6" initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} animate={{ opacity: 1, y: 0 }}>
              <HeroTitle />
            </motion.h1>
            <motion.div className="mb-8" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <HeroSubtitle />
            </motion.div>
            <motion.div className="mb-10" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <HeroButtons />
            </motion.div>
            <motion.div initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <HeroStats destinationCount={destinationCount} regionCount={regionCount} />
            </motion.div>
          </div>

          <motion.div 
            className="relative h-96 flex items-center justify-center"
            initial={shouldAnimate ? { opacity: 0 } : {}}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
          >
            {HERO_DESTINATIONS.slice(0, 6).map((dest, idx) => {
              const baseRotate = (idx - 2.5) * 15;
              const expandedOffset = (idx - 2.5) * 80;
              
              return (
                <motion.div
                  key={dest.id}
                  className="absolute w-40 h-56 rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
                  style={{ zIndex: 6 - Math.abs(idx - 2.5) }}
                  animate={{
                    rotate: expanded ? 0 : baseRotate,
                    x: expanded ? expandedOffset : 0,
                    y: expanded ? 0 : Math.abs(idx - 2.5) * 10,
                    scale: expanded ? 1 : 1 - Math.abs(idx - 2.5) * 0.05,
                  }}
                  transition={{ type: "spring", stiffness: 200 }}
                  whileHover={{ scale: 1.1, zIndex: 50 }}
                >
                  <Link href={`/destinations/${dest.slug}`}>
                    <img src={dest.fallback} alt={dest.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 text-white font-semibold">{dest.name}</div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function HeroV15({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();
  const featured = HERO_DESTINATIONS[0];
  const others = HERO_DESTINATIONS.slice(1, 7);

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 md:px-12 overflow-hidden bg-white dark:bg-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>
      <SubtleSkyBackground className="absolute inset-0 pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full mb-6"
            initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
            animate={{ opacity: 1, y: 0 }}
          >
            <Globe className="w-4 h-4 text-[#6443F4]" />
            <span className="text-xs font-semibold tracking-wide text-[#6443F4] uppercase">{destinationCount} Destinations Worldwide</span>
          </motion.div>
          <motion.h1 className="mb-6" initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <HeroTitle />
          </motion.h1>
          <motion.div className="flex justify-center mb-8" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <HeroSubtitle />
          </motion.div>
        </div>

        <motion.div 
          className="grid lg:grid-cols-[1.5fr_1fr] gap-6"
          initial={shouldAnimate ? { opacity: 0, y: 30 } : {}}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link href={`/destinations/${featured.slug}`}>
            <motion.div 
              className="relative h-80 lg:h-96 rounded-3xl overflow-hidden shadow-2xl cursor-pointer group"
              whileHover={shouldAnimate ? { scale: 1.02 } : {}}
            >
              <img src={featured.fallback} alt={featured.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <Badge className="bg-[#6443F4] text-white mb-3">Featured</Badge>
                <h3 className="text-3xl font-bold text-white mb-1">{featured.name}</h3>
                <p className="text-white/80">{featured.country}</p>
              </div>
            </motion.div>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            {others.map((dest, idx) => (
              <Link key={dest.id} href={`/destinations/${dest.slug}`}>
                <motion.div 
                  className="relative h-[calc(50%-6px)] min-h-[120px] rounded-2xl overflow-hidden shadow-lg cursor-pointer group"
                  whileHover={shouldAnimate ? { scale: 1.05 } : {}}
                  initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : {}}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + idx * 0.05 }}
                >
                  <img src={dest.fallback} alt={dest.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 text-white font-medium text-sm">{dest.name}</div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        <motion.div 
          className="flex justify-center mt-10 gap-4"
          initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <HeroButtons />
        </motion.div>

        <motion.div 
          className="flex justify-center mt-8"
          initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <HeroStats destinationCount={destinationCount} regionCount={regionCount} />
        </motion.div>
      </div>
    </section>
  );
}

export function HeroV16({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();
  const layers = [
    { dest: HERO_DESTINATIONS[0], z: 0, scale: 1, blur: 0, x: 60, y: 30 },
    { dest: HERO_DESTINATIONS[1], z: -50, scale: 0.9, blur: 1, x: 75, y: 45 },
    { dest: HERO_DESTINATIONS[2], z: -100, scale: 0.8, blur: 2, x: 55, y: 55 },
    { dest: HERO_DESTINATIONS[3], z: -150, scale: 0.7, blur: 3, x: 70, y: 25 },
  ];

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 md:px-12 overflow-hidden bg-white dark:bg-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>
      <SubtleSkyBackground className="absolute inset-0 pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="relative min-h-[600px]">
          <div className="max-w-lg relative z-20">
            <motion.h1 className="mb-6" initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} animate={{ opacity: 1, y: 0 }}>
              <HeroTitle />
            </motion.h1>
            <motion.div className="mb-8" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <HeroSubtitle />
            </motion.div>
            <motion.div className="mb-10" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <HeroButtons />
            </motion.div>
            <motion.div initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <HeroStats destinationCount={destinationCount} regionCount={regionCount} />
            </motion.div>
          </div>

          {layers.map((layer, idx) => (
            <motion.div
              key={idx}
              className="absolute hidden lg:block"
              style={{ 
                left: `${layer.x}%`, 
                top: `${layer.y}%`,
                zIndex: 10 - idx,
                filter: `blur(${layer.blur}px)`,
              }}
              initial={shouldAnimate ? { opacity: 0, scale: 0.5, x: 100 } : {}}
              animate={{ opacity: 1 - idx * 0.15, scale: layer.scale, x: 0 }}
              transition={{ delay: 0.3 + idx * 0.15, duration: 0.8 }}
              whileHover={shouldAnimate && idx === 0 ? { scale: 1.05 } : {}}
            >
              <Link href={`/destinations/${layer.dest.slug}`}>
                <div className="w-48 h-64 rounded-2xl overflow-hidden shadow-2xl cursor-pointer">
                  <img src={layer.dest.fallback} alt={layer.dest.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white font-semibold">{layer.dest.name}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HeroV17({ destinationCount, regionCount }: HeroProps) {
  const shouldAnimate = usePreferredMotion();

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 px-4 sm:px-6 md:px-12 overflow-hidden bg-white dark:bg-slate-950" data-testid="destinations-hero">
      <style>{heroAnimationStyles}</style>
      <SubtleSkyBackground className="absolute inset-0 pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full mb-6"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : {}}
              animate={{ opacity: 1, y: 0 }}
            >
              <Globe className="w-4 h-4 text-[#6443F4]" />
              <span className="text-xs font-semibold tracking-wide text-[#6443F4] uppercase">{destinationCount} Destinations</span>
            </motion.div>
            <motion.h1 className="mb-6" initial={shouldAnimate ? { opacity: 0, y: 30 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <HeroTitle />
            </motion.h1>
            <motion.div className="mb-8" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <HeroSubtitle />
            </motion.div>
            <motion.div className="mb-10" initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <HeroButtons />
            </motion.div>
            <motion.div initial={shouldAnimate ? { opacity: 0, y: 20 } : {}} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <HeroStats destinationCount={destinationCount} regionCount={regionCount} />
            </motion.div>
          </div>

          <motion.div 
            className="grid grid-cols-4 gap-2"
            initial={shouldAnimate ? { opacity: 0, x: 50 } : {}}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {HERO_DESTINATIONS.slice(0, 8).map((dest, idx) => {
              const row = Math.floor(idx / 4);
              const isOffset = row % 2 === 1;
              
              return (
                <motion.div
                  key={dest.id}
                  className={cn("aspect-square", isOffset && idx % 4 === 0 && "ml-6")}
                  style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
                  whileHover={shouldAnimate ? { scale: 1.1, zIndex: 50 } : {}}
                  initial={shouldAnimate ? { opacity: 0, scale: 0.8 } : {}}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                >
                  <Link href={`/destinations/${dest.slug}`}>
                    <div className="w-full h-full relative cursor-pointer group">
                      <img src={dest.fallback} alt={dest.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white font-semibold text-sm text-center">{dest.name}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export const HERO_VERSIONS = {
  V1: { component: HeroV1, name: "Arc Bubbles", description: "Floating destination bubbles in an arc pattern" },
  V2: { component: HeroV2, name: "Scattered Cards", description: "Photo cards scattered with deep shadows" },
  V3: { component: HeroV3, name: "Vertical Strips", description: "Vertical photo strips in a row" },
  V4: { component: HeroV4, name: "Gradient Grid", description: "Colorful gradient cards in bento grid" },
  V5: { component: HeroV5, name: "Phone Cards", description: "Phone-style cards scattered diagonally" },
  V6: { component: HeroV6, name: "Left-Right", description: "Photos floating on both sides" },
  V7: { component: HeroV7, name: "Wavy Bottom", description: "Gradient wave with scattered pills" },
  V8: { component: HeroV8, name: "3D Carousel", description: "Circular carousel with 3D rotation" },
  V9: { component: HeroV9, name: "Masonry", description: "Pinterest-style masonry layout" },
  V10: { component: HeroV10, name: "Filmstrip", description: "Horizontal scrolling filmstrip" },
  V11: { component: HeroV11, name: "Polaroid", description: "Tilted polaroid-style photos" },
  V12: { component: HeroV12, name: "Magazine", description: "Magazine cover collage layout" },
  V13: { component: HeroV13, name: "Map Markers", description: "Interactive map with markers" },
  V14: { component: HeroV14, name: "Fan Cards", description: "Stacked cards that fan out" },
  V15: { component: HeroV15, name: "Split Feature", description: "Large feature + smaller grid" },
  V16: { component: HeroV16, name: "Parallax Depth", description: "Floating cards with parallax" },
  V17: { component: HeroV17, name: "Hexagon Grid", description: "Hexagonal honeycomb layout" },
};

export type HeroVersionKey = keyof typeof HERO_VERSIONS;

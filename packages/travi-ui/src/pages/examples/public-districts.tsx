import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, Map, Clock, Sun, Sunset, Moon, Sparkles, Building, UtensilsCrossed, Compass, Waves, Briefcase, Landmark, TrendingUp, ChevronRight, Coffee, Wine, PartyPopper, ArrowRight, Star, Flame, Heart, Zap, Users } from "lucide-react";
import { motion } from "framer-motion";
import type { Content } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useMemo, useRef, useEffect } from "react";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import CategoryTemplate from "./category-template";

const defaultImages = [
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=1000&fit=crop",
  "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&h=1000&fit=crop",
  "https://images.unsplash.com/photo-1526495124232-a04e1849168c?w=800&h=1000&fit=crop",
  "https://images.unsplash.com/photo-1546412414-e1885259563a?w=800&h=1000&fit=crop",
];

const districtCharacters = {
  beach: { color: "#0EA5E9", bgClass: "from-sky-500 to-cyan-400", icon: Waves, label: "Beach & Waterfront" },
  business: { color: "#6443F4", bgClass: "from-[#6443F4] to-[#6443F4]/80", icon: Briefcase, label: "Business Hub" },
  heritage: { color: "#D97706", bgClass: "from-amber-500 to-yellow-500", icon: Landmark, label: "Heritage & Culture" },
  luxury: { color: "#6443F4", bgClass: "from-[#6443F4] to-[#6443F4]/80", icon: Sparkles, label: "Luxury Living" },
  family: { color: "#10B981", bgClass: "from-emerald-500 to-green-500", icon: Users, label: "Family Friendly" },
  nightlife: { color: "#6443F4", bgClass: "from-[#6443F4] to-blue-600", icon: PartyPopper, label: "Nightlife" },
};

const districtData: Record<string, { character: keyof typeof districtCharacters; isHot: boolean; stats: { restaurants: number; attractions: number; hotels: number } }> = {
  "downtown-dubai": { character: "luxury", isHot: true, stats: { restaurants: 156, attractions: 45, hotels: 32 } },
  "dubai-marina": { character: "beach", isHot: true, stats: { restaurants: 128, attractions: 28, hotels: 24 } },
  "palm-jumeirah": { character: "luxury", isHot: true, stats: { restaurants: 89, attractions: 22, hotels: 18 } },
  "jbr": { character: "beach", isHot: false, stats: { restaurants: 67, attractions: 15, hotels: 12 } },
  "old-dubai": { character: "heritage", isHot: false, stats: { restaurants: 95, attractions: 38, hotels: 15 } },
  "business-bay": { character: "business", isHot: true, stats: { restaurants: 112, attractions: 18, hotels: 28 } },
};

const vibeQuiz = [
  { vibe: "Beach Lover", icon: Waves, color: "#0EA5E9", districts: ["Dubai Marina", "JBR", "Palm Jumeirah"] },
  { vibe: "Culture Explorer", icon: Landmark, color: "#D97706", districts: ["Old Dubai", "Al Karama", "Al Fahidi"] },
  { vibe: "Luxury Seeker", icon: Sparkles, color: "#6443F4", districts: ["Downtown", "Palm Jumeirah", "DIFC"] },
  { vibe: "Foodie", icon: UtensilsCrossed, color: "#10B981", districts: ["Al Karama", "Business Bay", "JBR"] },
  { vibe: "Nightlife Fan", icon: PartyPopper, color: "#6366F1", districts: ["Dubai Marina", "Business Bay", "DIFC"] },
  { vibe: "Family Fun", icon: Heart, color: "#F43F5E", districts: ["Dubai Hills", "Al Barsha", "JVC"] },
];

const timelineActivities = [
  {
    time: "morning",
    icon: Sun,
    label: "Morning",
    gradient: "from-amber-400 via-orange-400 to-rose-400",
    activities: [
      { district: "Palm Jumeirah", activity: "Sunrise yoga at Atlantis Beach", icon: Sparkles },
      { district: "Old Dubai", activity: "Traditional breakfast at Al Fanar", icon: Coffee },
      { district: "Downtown", activity: "Early visit to Dubai Mall", icon: Building },
    ],
  },
  {
    time: "afternoon",
    icon: Sunset,
    label: "Afternoon",
    gradient: "from-[#6443F4] to-[#6443F4]/70",
    activities: [
      { district: "Dubai Marina", activity: "Yacht cruise & lunch", icon: Waves },
      { district: "DIFC", activity: "Art galleries & rooftop dining", icon: Sparkles },
      { district: "JBR", activity: "Beach walk & The Walk shops", icon: UtensilsCrossed },
    ],
  },
  {
    time: "evening",
    icon: Moon,
    label: "Evening",
    gradient: "from-[#6443F4] to-[#6443F4]/70",
    activities: [
      { district: "Downtown", activity: "Dubai Fountain show", icon: Star },
      { district: "Business Bay", activity: "Rooftop cocktails with skyline views", icon: Wine },
      { district: "Marina", activity: "Dinner at pier restaurants", icon: PartyPopper },
    ],
  },
];

function AnimatedCounter({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { rootMargin: "-100px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;

    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isInView, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

function VibeQuizSection({ selectedVibe, onSelectVibe }: { selectedVibe: string | null; onSelectVibe: (vibe: string) => void }) {
  return (
    <section 
      className="relative py-16 overflow-hidden bg-gradient-to-br from-background via-muted/30 to-background"
      data-testid="vibe-quiz-section"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-[140px]">
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="mb-4 bg-gradient-to-r from-[#6443F4] to-[#6443F4] text-white border-0">
            <Compass className="w-3 h-3 mr-1" />
            Find Your Vibe
          </Badge>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            What's Your <span className="text-[#6443F4]">Dubai Vibe?</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We'll recommend the perfect neighborhoods for you
          </p>
        </motion.div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {vibeQuiz.map((option, idx) => {
            const Icon = option.icon;
            const isSelected = selectedVibe === option.vibe;
            
            return (
              <motion.button
                key={option.vibe}
                data-testid={`vibe-button-${option.vibe.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => onSelectVibe(option.vibe)}
                className={cn(
                  "relative group p-4 md:p-6 rounded-[16px] text-center transition-all duration-300",
                  "border-2",
                  isSelected 
                    ? "border-transparent shadow-xl"
                    : "bg-card border-border/50 hover:border-[#6443F4]/50"
                )}
                style={isSelected ? { backgroundColor: option.color } : {}}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div 
                  className={cn(
                    "w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mx-auto mb-3 transition-all duration-300",
                    isSelected ? "bg-white/20" : "bg-muted"
                  )}
                  style={!isSelected ? { backgroundColor: `${option.color}20` } : {}}
                >
                  <Icon 
                    className="w-6 h-6 md:w-7 md:h-7" 
                    style={{ color: isSelected ? "white" : option.color }}
                  />
                </motion.div>
                
                <h3 className={cn(
                  "font-heading font-bold text-sm md:text-base",
                  isSelected ? "text-white" : "text-foreground"
                )}>
                  {option.vibe}
                </h3>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TimelineSection() {
  return (
    <section className="py-16 bg-background" data-testid="timeline-section">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-[140px]">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
            <Clock className="w-3 h-3 mr-1" />
            Perfect Day Planner
          </Badge>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Experience Dubai <span className="text-amber-500">All Day</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover the best activities across Dubai's neighborhoods from morning to night
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {timelineActivities.map((period, periodIdx) => {
            const PeriodIcon = period.icon;
            return (
              <motion.div
                key={period.time}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: periodIdx * 0.2 }}
              >
                <Card className="p-6 h-full">
                  <div className={cn(
                    "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4",
                    period.gradient
                  )}>
                    <PeriodIcon className="w-7 h-7 text-white" />
                  </div>
                  
                  <h3 className="font-heading text-xl font-bold text-foreground mb-4">
                    {period.label}
                  </h3>

                  <div className="space-y-4">
                    {period.activities.map((activity, actIdx) => {
                      const ActivityIcon = activity.icon;
                      return (
                        <motion.div
                          key={actIdx}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: periodIdx * 0.2 + actIdx * 0.1 }}
                          className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover-elevate"
                          data-testid={`timeline-activity-${activity.district.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6443F4] to-[#6443F4] flex items-center justify-center shrink-0">
                            <ActivityIcon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{activity.district}</div>
                            <div className="text-xs text-muted-foreground">{activity.activity}</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DistrictStatsSection() {
  const totalStats = useMemo(() => {
    return Object.values(districtData).reduce(
      (acc, d) => ({
        restaurants: acc.restaurants + d.stats.restaurants,
        attractions: acc.attractions + d.stats.attractions,
        hotels: acc.hotels + d.stats.hotels,
      }),
      { restaurants: 0, attractions: 0, hotels: 0 }
    );
  }, []);

  return (
    <section 
      className="py-16 bg-gradient-to-br from-[#6443F4]/10 via-[#6443F4]/10 to-[#6443F4]/10"
      data-testid="district-stats-section"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-[140px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div 
            className="text-center p-8 rounded-2xl bg-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Building className="w-10 h-10 text-[#6443F4] mx-auto mb-4" />
            <div className="text-4xl font-bold text-foreground mb-2">
              <AnimatedCounter end={totalStats.attractions} />
            </div>
            <div className="text-muted-foreground">Attractions</div>
          </motion.div>

          <motion.div 
            className="text-center p-8 rounded-2xl bg-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <UtensilsCrossed className="w-10 h-10 text-[#F4C542] mx-auto mb-4" />
            <div className="text-4xl font-bold text-foreground mb-2">
              <AnimatedCounter end={totalStats.restaurants} />
            </div>
            <div className="text-muted-foreground">Restaurants</div>
          </motion.div>

          <motion.div 
            className="text-center p-8 rounded-2xl bg-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <MapPin className="w-10 h-10 text-[#6443F4] mx-auto mb-4" />
            <div className="text-4xl font-bold text-foreground mb-2">
              <AnimatedCounter end={totalStats.hotels} />
            </div>
            <div className="text-muted-foreground">Hotels</div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default function PublicDistricts() {
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);

  return (
    <CategoryTemplate
      categoryType="districts"
      seoConfig={{
        title: "Dubai Neighborhoods & Districts | Travi - Dubai Travel Guide",
        description: "Explore Dubai's diverse neighborhoods. From Palm Jumeirah to Downtown, find the perfect district for your lifestyle or travel."
      }}
    >
      <DistrictStatsSection />
      <VibeQuizSection selectedVibe={selectedVibe} onSelectVibe={setSelectedVibe} />
      <TimelineSection />
    </CategoryTemplate>
  );
}

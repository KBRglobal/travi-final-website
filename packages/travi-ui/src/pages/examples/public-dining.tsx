import { Link } from "wouter";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Utensils, ArrowRight, ChefHat, Wine,
  Globe, Award, Sparkles, Waves, Coffee, Fish,
  UtensilsCrossed, Beef, Calendar, TreePalm, Flame,
  IceCream, Salad, Star, TrendingUp, DollarSign,
  Clock, Phone, Cake, Soup, Pizza, Cookie
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import CategoryTemplate from "./category-template";

interface ApiDining {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  status: string;
  type: string;
  dining?: {
    cuisine?: string;
    location?: string;
    priceRange?: string;
  };
}

async function fetchDining(): Promise<ApiDining[]> {
  const response = await fetch("/api/public/contents?type=dining&limit=100");
  if (!response.ok) throw new Error("Failed to fetch dining");
  return response.json();
}

const cravingOptions = [
  {
    id: "sweet",
    label: "Something Sweet",
    description: "Decadent desserts & pastries",
    icon: IceCream,
    gradient: "from-[#6443F4] to-[#6443F4]",
  },
  {
    id: "spicy",
    label: "Spicy Adventure",
    description: "Asian, Indian & bold flavors",
    icon: Flame,
    gradient: "from-orange-500 via-red-500 to-amber-500",
  },
  {
    id: "fresh",
    label: "Fresh & Light",
    description: "Mediterranean & healthy",
    icon: Salad,
    gradient: "from-emerald-400 via-teal-400 to-cyan-400",
  },
  {
    id: "comfort",
    label: "Comfort Food",
    description: "Burgers, pasta & soul food",
    icon: Soup,
    gradient: "from-amber-400 via-orange-400 to-yellow-400",
  },
  {
    id: "fine",
    label: "Fine Dining",
    description: "Michelin stars & luxury",
    icon: Award,
    gradient: "from-[#6443F4] via-[#6443F4] to-[#5339D9]",
  },
];

const uniqueExperiences = [
  {
    name: "Dinner in the Sky",
    location: "Various Locations, Dubai",
    description: "Experience gourmet dining suspended 50 meters in the air by a crane.",
    highlight: "Suspended 50m in the Air",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop",
    icon: Sparkles,
    cuisine: "International",
    priceLevel: 4,
  },
  {
    name: "At.mosphere",
    location: "Burj Khalifa, 122nd Floor",
    description: "Dine at the world's highest restaurant, perched 442 meters above ground.",
    highlight: "World's Highest Restaurant",
    image: "https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=800&h=600&fit=crop",
    icon: Award,
    cuisine: "European",
    priceLevel: 4,
  },
  {
    name: "Ossiano",
    location: "Atlantis, The Palm",
    description: "Immerse yourself in an underwater wonderland surrounded by marine life.",
    highlight: "Underwater Dining with Sharks",
    image: "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&h=600&fit=crop",
    icon: Fish,
    cuisine: "Seafood",
    priceLevel: 4,
  },
  {
    name: "Al Mahara",
    location: "Burj Al Arab",
    description: "Arrive via a simulated submarine ride to this legendary underwater restaurant.",
    highlight: "Burj Al Arab Aquarium",
    image: "https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=800&h=600&fit=crop",
    icon: Waves,
    cuisine: "Seafood",
    priceLevel: 4,
  },
];

const todaysSpecials = [
  { name: "Wagyu Tasting Menu", restaurant: "Nobu Dubai", price: "AED 850" },
  { name: "Sunset Seafood Platter", restaurant: "Pierchic", price: "AED 650" },
  { name: "Chef's Omakase", restaurant: "Zuma", price: "AED 750" },
  { name: "Royal Afternoon Tea", restaurant: "Burj Al Arab", price: "AED 550" },
];

function PriceLevel({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5" data-testid="price-level">
      {[1, 2, 3, 4].map((i) => (
        <DollarSign
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i <= level ? "text-[hsl(var(--orange))]" : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

function CravingSelector({ selectedCraving, onSelectCraving }: { selectedCraving: string | null; onSelectCraving: (craving: string) => void }) {
  const { isRTL } = useLocale();
  
  return (
    <section 
      className="relative py-16 overflow-hidden bg-slate-50 dark:bg-slate-900"
      data-testid="craving-selector-section"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-[140px]">
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="mb-4 bg-[#6443F4]/10 text-[#6443F4] border-0 rounded-full">
            <ChefHat className="w-3 h-3 mr-1" />
            What Are You Craving?
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
            Find Your <span className="text-[#6443F4]">Flavor</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tell us what you're in the mood for
          </p>
        </motion.div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {cravingOptions.map((craving, idx) => {
            const Icon = craving.icon;
            const isSelected = selectedCraving === craving.id;
            
            return (
              <motion.button
                key={craving.id}
                data-testid={`craving-button-${craving.id}`}
                onClick={() => onSelectCraving(craving.id)}
                className={cn(
                  "relative group p-5 md:p-6 rounded-[20px] text-center transition-all duration-300",
                  "border-2",
                  isSelected 
                    ? "bg-[#6443F4] border-transparent shadow-xl"
                    : "bg-card border-border/50 hover:border-[#6443F4]/50"
                )}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div 
                  className={cn(
                    "w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-all duration-300",
                    isSelected 
                      ? "bg-white/20" 
                      : "bg-[#6443F4]"
                  )}
                >
                  <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </motion.div>
                
                <h3 
                  className={cn(
                    "font-bold text-base md:text-lg mb-1",
                    isSelected ? "text-white" : "text-foreground"
                  )}
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  {craving.label}
                </h3>
                <p className={cn(
                  "text-xs md:text-sm",
                  isSelected ? "text-white/80" : "text-muted-foreground"
                )}>
                  {craving.description}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function UniqueExperiencesSection() {
  const { isRTL, localePath } = useLocale();

  return (
    <section className="py-16 bg-background" data-testid="unique-experiences-section">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-[140px]">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge className="mb-4 bg-[#6443F4]/10 text-[#6443F4] border-0 rounded-full">
            <Award className="w-3 h-3 mr-1" />
            Bucket List Experiences
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
            Unique <span className="text-[#6443F4]">Dining Experiences</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Once-in-a-lifetime culinary adventures only in Dubai
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {uniqueExperiences.map((experience, index) => {
            const ExperienceIcon = experience.icon;
            return (
              <motion.div
                key={experience.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                data-testid={`experience-${experience.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Card className="group overflow-hidden hover-elevate">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={experience.image}
                      alt={experience.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    
                    <div className={cn("absolute top-4", isRTL ? "right-4" : "left-4")}>
                      <Badge className="bg-[#6443F4]/90 text-white border-0">
                        <ExperienceIcon className="w-3 h-3 me-1" />
                        {experience.highlight}
                      </Badge>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h3 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{experience.name}</h3>
                      <div className="flex items-center gap-2 text-white/80 text-sm">
                        <MapPin className="w-4 h-4" />
                        {experience.location}
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{experience.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{experience.cuisine}</Badge>
                        <PriceLevel level={experience.priceLevel} />
                      </div>
                      <Button size="sm" variant="ghost" className="gap-1">
                        Book Now
                        <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
                      </Button>
                    </div>
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

function TodaysSpecialsMarquee() {
  const { isRTL } = useLocale();

  return (
    <div className="relative bg-[#6443F4] py-3 overflow-hidden" data-testid="todays-specials-marquee">
      <div className="flex items-center">
        <motion.div
          className="flex items-center gap-12 whitespace-nowrap"
          animate={{ x: isRTL ? ["0%", "50%"] : ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          {[...todaysSpecials, ...todaysSpecials].map((special, i) => (
            <div key={i} className="flex items-center gap-4">
              <ChefHat className="w-4 h-4 text-white/80" />
              <span className="font-semibold text-white">{special.name}</span>
              <span className="text-white/70">at {special.restaurant}</span>
              <span className="font-bold text-white">{special.price}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export default function PublicDining() {
  const [selectedCraving, setSelectedCraving] = useState<string | null>(null);

  return (
    <CategoryTemplate
      categoryType="dining"
      seoConfig={{
        title: "Dubai's Best Restaurants & Dining Experiences 2025 | Travi",
        description: "Discover Dubai's culinary scene: 1000+ restaurants, 100+ cuisines, sky dining at Burj Khalifa, underwater restaurants at Atlantis. From Michelin stars to street food."
      }}
    >
      <TodaysSpecialsMarquee />
      <CravingSelector selectedCraving={selectedCraving} onSelectCraving={setSelectedCraving} />
      <UniqueExperiencesSection />
    </CategoryTemplate>
  );
}

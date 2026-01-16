import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Building2, Waves, Briefcase, Users, Heart,
  Sparkles, Award, Crown, Plane, Palmtree, Building,
  Umbrella, Utensils, Dumbbell, Car, Wifi, Coffee,
  Sun, Moon, TreePalm, Baby, MapPin, TrendingUp, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import CategoryTemplate from "./category-template";
import { useDestinationContext } from "@/hooks/use-destination-context";

interface ApiHotel {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  status: string;
  type: string;
  hotel?: {
    location?: string;
    starRating?: number;
    amenities?: string[];
  };
}

async function fetchHotels(): Promise<ApiHotel[]> {
  const response = await fetch("/api/public/contents?type=hotel&limit=100");
  if (!response.ok) throw new Error("Failed to fetch hotels");
  return response.json();
}

const featuredHotels = [
  {
    name: "Atlantis The Palm",
    tagline: "World-Famous Underwater Suites",
    description: "Experience the legendary underwater suites where floor-to-ceiling windows reveal the wonders of the Ambassador Lagoon.",
    image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=900&h=600&fit=crop",
    features: ["Underwater Suites", "Aquaventure Waterpark", "The Lost Chambers"],
    rating: 5,
    area: "Palm Jumeirah",
    vibe: "family"
  },
  {
    name: "Burj Al Arab",
    tagline: "The World's Most Luxurious Hotel",
    description: "The iconic sail-shaped silhouette defines Dubai's skyline. Every suite offers unparalleled luxury with 24-hour butler service.",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&h=600&fit=crop",
    features: ["Butler Service", "Helipad", "Private Beach"],
    rating: 7,
    area: "Jumeirah",
    vibe: "romance"
  },
  {
    name: "Address Downtown",
    tagline: "Burj Khalifa at Your Doorstep",
    description: "Wake up to unobstructed views of the world's tallest building. Steps from Dubai Mall and the Dubai Fountain.",
    image: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=900&h=600&fit=crop",
    features: ["Burj Khalifa Views", "Dubai Mall Access", "Rooftop Pool"],
    rating: 5,
    area: "Downtown Dubai",
    vibe: "city"
  },
  {
    name: "One&Only Royal Mirage",
    tagline: "Arabian Palace Experience",
    description: "A palatial retreat set in 65 acres of landscaped gardens. Experience authentic Arabian hospitality.",
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=900&h=600&fit=crop",
    features: ["Private Beach", "Oriental Hammam", "Lush Gardens"],
    rating: 5,
    area: "The Palm",
    vibe: "beach"
  },
];

const vibeOptions = [
  { 
    id: "beach", 
    label: "Beach Life", 
    icon: Sun,
    gradient: "from-cyan-400 to-blue-500",
    glowColor: "shadow-cyan-400/50",
    description: "Sun, sand & luxury"
  },
  { 
    id: "city", 
    label: "City Views", 
    icon: Building2,
    gradient: "from-[#6443F4] to-[#6443F4]/80",
    glowColor: "shadow-[#6443F4]/50",
    description: "Skyline panoramas"
  },
  { 
    id: "romance", 
    label: "Romance", 
    icon: Heart,
    gradient: "from-[#6443F4] to-rose-500",
    glowColor: "shadow-[#6443F4]/50",
    description: "Intimate escapes"
  },
  { 
    id: "family", 
    label: "Family Fun", 
    icon: Users,
    gradient: "from-[#F4C542] to-amber-500",
    glowColor: "shadow-[#F4C542]/50",
    description: "Adventure awaits"
  }
];

const trendingDeals = [
  "Atlantis Royal - 30% Off Weekend Stays",
  "Burj Al Arab - Complimentary Spa Package",
  "Address Downtown - Free Dubai Mall Credit",
  "One&Only - Private Beach Cabana Included",
];

function FloatingSparkle({ delay = 0, size = "w-2 h-2", position }: { delay?: number; size?: string; position: string }) {
  return (
    <motion.div
      className={cn("absolute", position)}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: [0, 1, 0],
        scale: [0.5, 1.2, 0.5],
        rotate: [0, 180, 360]
      }}
      transition={{
        duration: 3,
        delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <Star className={cn(size, "text-[#6443F4] fill-[#6443F4]")} />
    </motion.div>
  );
}

function TrendingMarquee() {
  const { isRTL } = useLocale();
  
  return (
    <div 
      className="relative overflow-hidden bg-gradient-to-r from-[#6443F4] via-[#6443F4] to-[#6443F4] py-3"
      data-testid="trending-marquee"
    >
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{
          x: isRTL ? ["0%", "50%"] : ["0%", "-50%"]
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        {[...trendingDeals, ...trendingDeals].map((deal, idx) => (
          <div key={idx} className="flex items-center gap-3 text-white">
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium text-sm">{deal}</span>
            <Star className="w-3 h-3 fill-[#6443F4] text-[#6443F4]" />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function VibeSelector({ selectedVibe, onSelectVibe }: { selectedVibe: string | null; onSelectVibe: (vibe: string) => void }) {
  const { isRTL } = useLocale();
  
  return (
    <section 
      className="relative py-16 overflow-hidden bg-gradient-to-br from-background via-muted/30 to-background"
      data-testid="vibe-selector-section"
    >
      <FloatingSparkle delay={0} position="top-8 left-[10%]" />
      <FloatingSparkle delay={1} position="top-16 right-[15%]" size="w-3 h-3" />
      
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-[140px]">
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="mb-4 bg-gradient-to-r from-[#6443F4] to-[#6443F4] text-white border-0">
            <Sparkles className="w-3 h-3 mr-1" />
            Find Your Perfect Stay
          </Badge>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Choose Your <span className="text-[#6443F4]">Vibe</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            What kind of Dubai hotel experience are you dreaming of?
          </p>
        </motion.div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {vibeOptions.map((vibe, idx) => {
            const Icon = vibe.icon;
            const isSelected = selectedVibe === vibe.id;
            
            return (
              <motion.button
                key={vibe.id}
                data-testid={`vibe-button-${vibe.id}`}
                onClick={() => onSelectVibe(vibe.id)}
                className={cn(
                  "relative group p-6 md:p-8 rounded-[20px] text-center transition-all duration-300",
                  "border-2",
                  isSelected 
                    ? `bg-gradient-to-br ${vibe.gradient} border-transparent shadow-xl ${vibe.glowColor}`
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
                    "w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300",
                    isSelected 
                      ? "bg-white/20" 
                      : `bg-gradient-to-br ${vibe.gradient}`
                  )}
                >
                  <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </motion.div>
                
                <h3 className={cn(
                  "font-heading font-bold text-lg md:text-xl mb-1",
                  isSelected ? "text-white" : "text-foreground"
                )}>
                  {vibe.label}
                </h3>
                <p className={cn(
                  "text-sm",
                  isSelected ? "text-white/80" : "text-muted-foreground"
                )}>
                  {vibe.description}
                </p>
                
                {isSelected && (
                  <motion.div 
                    className="absolute -top-2 -right-2"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <Star className="w-4 h-4 fill-[#6443F4] text-[#6443F4]" />
                    </div>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturedHotelsSection({ selectedVibe }: { selectedVibe: string | null }) {
  const { isRTL, localePath } = useLocale();
  
  const filteredHotels = selectedVibe 
    ? featuredHotels.filter(h => h.vibe === selectedVibe)
    : featuredHotels;

  return (
    <section className="py-16 bg-background" data-testid="featured-hotels-section">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-[140px]">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Featured <span className="text-[#6443F4]">Hotels</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Handpicked luxury accommodations for unforgettable Dubai experiences
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AnimatePresence mode="wait">
            {filteredHotels.map((hotel, index) => (
              <motion.div
                key={hotel.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                data-testid={`featured-hotel-${hotel.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Card className="group overflow-hidden hover-elevate">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={hotel.image}
                      alt={hotel.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    
                    <div className={cn("absolute top-4 flex items-center gap-2", isRTL ? "right-4" : "left-4")}>
                      <Badge className="bg-[#F4C542]/90 text-white border-0">
                        <Star className="w-3 h-3 fill-current me-1" />
                        {hotel.rating === 7 ? "7-Star" : `${hotel.rating}-Star`}
                      </Badge>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h3 className="font-heading text-xl font-bold text-white mb-1">{hotel.name}</h3>
                      <p className="text-white/80 text-sm">{hotel.tagline}</p>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{hotel.description}</p>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <MapPin className="w-4 h-4" />
                      <span>{hotel.area}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {hotel.features.slice(0, 3).map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export default function PublicHotels() {
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const { isDubai } = useDestinationContext();

  // Destination-aware SEO
  const seoTitle = isDubai 
    ? "Dubai Luxury Hotels & Resorts 2026 | Beach, City & Family | Travi"
    : "Luxury Hotels & Resorts 2026 | Worldwide Guide | Travi";
  const seoDescription = isDubai
    ? "Find the perfect Dubai hotel - from iconic 7-star Burj Al Arab to beach resorts on Palm Jumeirah. Compare 500+ luxury hotels with exclusive deals."
    : "Find the perfect hotel - from luxury beach resorts to city center accommodations. Compare hotels worldwide with expert reviews.";

  return (
    <CategoryTemplate
      categoryType="hotels"
      seoConfig={{
        title: seoTitle,
        description: seoDescription
      }}
    >
      <TrendingMarquee />
      <VibeSelector selectedVibe={selectedVibe} onSelectVibe={setSelectedVibe} />
      <FeaturedHotelsSection selectedVibe={selectedVibe} />
    </CategoryTemplate>
  );
}

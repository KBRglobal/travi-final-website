import { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { PublicLayout } from "@/components/public-layout";
import { SEOHead } from "@/components/seo-head";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { 
  Compass, Mountain, Palette, Users, UtensilsCrossed, Camera, Sparkles,
  Clock, ArrowRight, ChevronRight, Star, Search, MapPin, Calendar,
  Zap, Sun, Heart, Ticket, Map, Send, Play, Globe, Timer, Plane
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";

interface Activity {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  duration: string;
  location: string;
  image: string;
  rating: number;
  reviews: number;
  price: string;
  featured?: boolean;
}

const activityCategories = [
  { id: "all", name: "All Activities", icon: Compass, color: "#6443F4", bgColor: "bg-[#6443F4]" },
  { id: "adventure", name: "Adventures", icon: Mountain, color: "#6443F4", bgColor: "bg-[#6443F4]" },
  { id: "culture", name: "Culture & Arts", icon: Palette, color: "#6443F4", bgColor: "bg-[#6443F4]" },
  { id: "family", name: "Family Fun", icon: Users, color: "#6443F4", bgColor: "bg-[#6443F4]" },
  { id: "dining", name: "Food & Dining", icon: UtensilsCrossed, color: "#6443F4", bgColor: "bg-[#6443F4]" },
  { id: "photography", name: "Photo Spots", icon: Camera, color: "#6443F4", bgColor: "bg-[#6443F4]" },
  { id: "tours", name: "Guided Tours", icon: Map, color: "#6443F4", bgColor: "bg-[#6443F4]" }
];

const locationFilters = [
  { id: "all", name: "All Locations" },
  { id: "dubai", name: "Dubai", lat: 25.2, lng: 55.3, image: "/cards/dubai.webp" },
  { id: "paris", name: "Paris", lat: 48.9, lng: 2.4, image: "/cards/paris.webp" },
  { id: "tokyo", name: "Tokyo", lat: 35.7, lng: 139.7, image: "/cards/tokyo.webp" },
  { id: "new-york", name: "New York", lat: 40.7, lng: -74.0, image: "/cards/new-york.webp" },
  { id: "london", name: "London", lat: 51.5, lng: -0.1, image: "/cards/london.webp" },
  { id: "singapore", name: "Singapore", lat: 1.3, lng: 103.8, image: "/cards/singapore.webp" }
];

const featuredCollections = [
  {
    id: "adventure-seekers",
    title: "Adventure Seekers",
    description: "Thrilling experiences for the bold traveler",
    image: "/cards/dubai.webp",
    activityCount: 24,
    icon: Mountain
  },
  {
    id: "cultural-immersion",
    title: "Cultural Immersion",
    description: "Deep dive into local traditions and heritage",
    image: "/cards/tokyo.webp",
    activityCount: 18,
    icon: Palette
  },
  {
    id: "family-favorites",
    title: "Family Favorites",
    description: "Fun activities the whole family will love",
    image: "/cards/london.webp",
    activityCount: 32,
    icon: Users
  },
  {
    id: "foodie-trails",
    title: "Foodie Trails",
    description: "Culinary adventures and local flavors",
    image: "/cards/paris.webp",
    activityCount: 28,
    icon: UtensilsCrossed
  }
];

const allActivities: Activity[] = [
  {
    id: "1",
    title: "Desert Safari with Sunset BBQ Dinner",
    description: "Experience the thrill of dune bashing followed by a magical sunset in the desert with traditional entertainment and BBQ feast.",
    category: "adventure",
    categoryLabel: "Adventure",
    duration: "6 hours",
    location: "Dubai",
    image: "/cards/dubai.webp",
    rating: 4.9,
    reviews: 2847,
    price: "From $89",
    featured: true
  },
  {
    id: "2",
    title: "Private Louvre Museum Guided Tour",
    description: "Skip the lines and explore the world's largest art museum with an expert art historian guide.",
    category: "culture",
    categoryLabel: "Culture & Arts",
    duration: "3 hours",
    location: "Paris",
    image: "/cards/paris.webp",
    rating: 4.8,
    reviews: 1523,
    price: "From $149"
  },
  {
    id: "3",
    title: "Tokyo Street Food Walking Tour",
    description: "Discover hidden culinary gems in Tokyo's vibrant neighborhoods with a local foodie guide.",
    category: "dining",
    categoryLabel: "Food & Dining",
    duration: "4 hours",
    location: "Tokyo",
    image: "/cards/tokyo.webp",
    rating: 4.9,
    reviews: 987,
    price: "From $75"
  },
  {
    id: "4",
    title: "Statue of Liberty & Ellis Island Tour",
    description: "Explore America's most iconic monument with ferry access and guided historical commentary.",
    category: "tours",
    categoryLabel: "Guided Tours",
    duration: "5 hours",
    location: "New York",
    image: "/cards/new-york.webp",
    rating: 4.7,
    reviews: 3421,
    price: "From $45"
  },
  {
    id: "5",
    title: "London Eye & Thames River Cruise",
    description: "Combine the iconic London Eye experience with a scenic cruise along the River Thames.",
    category: "family",
    categoryLabel: "Family Fun",
    duration: "3 hours",
    location: "London",
    image: "/cards/london.webp",
    rating: 4.6,
    reviews: 2156,
    price: "From $55"
  },
  {
    id: "6",
    title: "Gardens by the Bay Night Show",
    description: "Witness the spectacular light and sound show at Singapore's iconic Supertree Grove.",
    category: "photography",
    categoryLabel: "Photo Spots",
    duration: "2 hours",
    location: "Singapore",
    image: "/cards/singapore.webp",
    rating: 4.8,
    reviews: 1876,
    price: "From $28"
  },
  {
    id: "7",
    title: "Burj Khalifa At The Top Experience",
    description: "Ascend to the world's tallest building and enjoy panoramic views from the 148th floor.",
    category: "adventure",
    categoryLabel: "Adventure",
    duration: "2 hours",
    location: "Dubai",
    image: "/cards/dubai.webp",
    rating: 4.9,
    reviews: 4532,
    price: "From $65",
    featured: true
  },
  {
    id: "8",
    title: "Seine River Dinner Cruise",
    description: "Romantic evening cruise with gourmet French cuisine and stunning views of illuminated Paris.",
    category: "dining",
    categoryLabel: "Food & Dining",
    duration: "3 hours",
    location: "Paris",
    image: "/cards/paris.webp",
    rating: 4.7,
    reviews: 1245,
    price: "From $125"
  },
  {
    id: "9",
    title: "Central Park Bike Tour",
    description: "Explore Manhattan's green oasis on two wheels with stops at iconic landmarks.",
    category: "family",
    categoryLabel: "Family Fun",
    duration: "2 hours",
    location: "New York",
    image: "/cards/new-york.webp",
    rating: 4.6,
    reviews: 892,
    price: "From $35"
  },
  {
    id: "10",
    title: "Westminster Abbey & Tower of London",
    description: "Discover centuries of British royal history with expert-guided tours of iconic landmarks.",
    category: "culture",
    categoryLabel: "Culture & Arts",
    duration: "6 hours",
    location: "London",
    image: "/cards/london.webp",
    rating: 4.7,
    reviews: 1876,
    price: "From $85"
  },
  {
    id: "11",
    title: "Marina Bay Sands Skypark",
    description: "Access the iconic infinity pool viewpoint with stunning city and harbor panoramas.",
    category: "photography",
    categoryLabel: "Photo Spots",
    duration: "1 hour",
    location: "Singapore",
    image: "/cards/singapore.webp",
    rating: 4.5,
    reviews: 2341,
    price: "From $23"
  },
  {
    id: "12",
    title: "Tsukiji Outer Market Food Tour",
    description: "Sample the freshest seafood and traditional Japanese delicacies at Tokyo's famous market.",
    category: "dining",
    categoryLabel: "Food & Dining",
    duration: "3 hours",
    location: "Tokyo",
    image: "/cards/tokyo.webp",
    rating: 4.8,
    reviews: 654,
    price: "From $95"
  }
];

const durationTiers = [
  { id: "quick", label: "Quick Escape", time: "1-2 hours", icon: Zap, color: "#6443F4" },
  { id: "half-day", label: "Half Day", time: "3-4 hours", icon: Timer, color: "#6443F4" },
  { id: "full-day", label: "Full Day", time: "5-6 hours", icon: Sun, color: "#6443F4" },
  { id: "multi-day", label: "Epic Journey", time: "6+ hours", icon: Plane, color: "#6443F4" }
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

export default function GlobalThingsToDo() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const { scrollYProgress } = useScroll();
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  const filteredActivities = allActivities.filter(activity => {
    const matchesCategory = selectedCategory === "all" || activity.category === selectedCategory;
    const matchesLocation = selectedLocation === "all" || activity.location.toLowerCase().replace(" ", "-") === selectedLocation;
    const matchesSearch = !searchQuery || 
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesLocation && matchesSearch;
  });

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }
    setIsSubscribing(true);
    await new Promise(r => setTimeout(r, 1000));
    toast({ title: "Welcome aboard!", description: "You're now subscribed to activity updates." });
    setEmail("");
    setIsSubscribing(false);
  };

  const getActivitiesByDuration = (tierId: string) => {
    const hours = allActivities.map(a => parseInt(a.duration));
    switch(tierId) {
      case "quick": return allActivities.filter(a => parseInt(a.duration) <= 2);
      case "half-day": return allActivities.filter(a => parseInt(a.duration) >= 3 && parseInt(a.duration) <= 4);
      case "full-day": return allActivities.filter(a => parseInt(a.duration) >= 5 && parseInt(a.duration) <= 6);
      case "multi-day": return allActivities.filter(a => parseInt(a.duration) > 6);
      default: return allActivities;
    }
  };

  return (
    <PublicLayout>
      <SEOHead
        title="Things to Do Worldwide - Tours, Activities & Experiences | TRAVI"
        description="Discover curated tours, activities and unique experiences across Dubai, Paris, Tokyo, New York, London and Singapore. Desert safaris, museum tours, street food walks and family adventures."
        canonicalPath="/things-to-do"
      />
      <SubtleSkyBackground />
      
      {/* Hero Section */}
      <section ref={heroRef} className="relative bg-white dark:bg-slate-950 py-20 lg:py-28 overflow-hidden" data-testid="hero-things-to-do">
        <div className="absolute top-10 right-10 w-64 h-64 rounded-full border-2 border-[#6443F4]/10 dark:border-[#6443F4]/20" />
        <div className="absolute bottom-20 left-20 w-40 h-40 rounded-full border-2 border-[#6443F4]/5 dark:border-[#6443F4]/10" />
        <div className="absolute top-1/2 right-1/4 w-3 h-3 rounded-full bg-[#6443F4]" />
        <div className="absolute top-1/3 left-1/4 w-2 h-2 rounded-full bg-[#6443F4]/60" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-4 px-4 py-1.5 bg-[#6443F4]/10 text-[#6443F4] border-0 rounded-full" data-testid="badge-discover">
                <Sparkles className="w-3 h-3 mr-2" />
                Discover Experiences
              </Badge>
              <h1 
                className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight" 
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                data-testid="hero-headline"
              >
                Things to Do That <span className="text-[#6443F4]">Inspire</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                Curated activities and unforgettable experiences in destinations worldwide.
              </p>
              
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search activities, tours, experiences..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-6 rounded-full border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 text-base dark:text-white dark:placeholder:text-slate-500"
                  data-testid="input-search"
                />
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ duration: 0.6, delay: 0.2 }} 
              className="grid grid-cols-2 gap-4"
            >
              {allActivities.filter(a => a.featured).concat(allActivities.slice(2, 4)).slice(0, 4).map((activity, i) => (
                <div 
                  key={activity.id + '-' + i} 
                  className={`bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${i === 1 ? 'translate-y-6' : ''} ${i === 3 ? 'translate-y-4' : ''}`}
                  data-testid={`card-hero-float-${i}`}
                >
                  <img src={activity.image} alt={activity.title} className="w-full h-24 object-cover rounded-xl mb-3" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">{activity.title}</h3>
                  <div className="flex items-center gap-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3 h-3" />
                    {activity.location}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Category Pills */}
      <section className="sticky top-0 z-40 py-5 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800" data-testid="section-category-pills">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <motion.div 
            className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            data-testid="category-pills-container"
          >
            {activityCategories.map((category, index) => {
              const IconComponent = category.icon;
              const isActive = selectedCategory === category.id;
              return (
                <motion.button
                  key={category.id}
                  variants={scaleIn}
                  onClick={() => setSelectedCategory(category.id)}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-shrink-0 flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-medium transition-all duration-300 relative overflow-visible ${
                    isActive 
                      ? "bg-[#6443F4] text-white shadow-lg" 
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md"
                  }`}
                  style={isActive ? { boxShadow: `0 8px 24px -4px rgba(100, 67, 244, 0.4)` } : {}}
                  data-testid={`button-category-${category.id}`}
                >
                  <motion.div
                    animate={isActive ? { rotate: [0, -10, 10, 0] } : {}}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#6443F4]'}`} />
                  </motion.div>
                  <span>{category.name}</span>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Activity Categories - Bento-style asymmetric grid */}
      <section className="py-20 lg:py-28 bg-slate-50 dark:bg-slate-900" data-testid="section-activity-categories">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <motion.div 
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 px-4 py-1.5 bg-[#6443F4]/10 text-[#6443F4] border-0 rounded-full" data-testid="badge-explore">
              <Compass className="w-3 h-3 mr-2" />
              Curated Collections
            </Badge>
            <h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-[-0.02em]"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              data-testid="heading-activity-categories"
            >
              Explore Your Way
            </h2>
          </motion.div>

          {/* Bento Grid Layout */}
          <motion.div 
            className="grid grid-cols-12 gap-4 lg:gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {/* Large featured card */}
            <motion.div variants={fadeInUp} className="col-span-12 lg:col-span-7 row-span-2">
              {(() => {
                const MainIcon = featuredCollections[0].icon;
                return (
                  <Link href={`/things-to-do/collection/${featuredCollections[0].id}`}>
                    <div 
                      className="group relative h-full min-h-[400px] lg:min-h-[500px] rounded-3xl overflow-hidden cursor-pointer"
                      data-testid={`card-collection-${featuredCollections[0].id}`}
                    >
                      <motion.img 
                        src={featuredCollections[0].image}
                        alt={featuredCollections[0].title}
                        className="absolute inset-0 w-full h-full object-cover"
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.7 }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-10">
                        <motion.div 
                          className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-5"
                          whileHover={{ rotate: 10, scale: 1.1 }}
                        >
                          <MainIcon className="w-7 h-7 text-white" />
                        </motion.div>
                        <h3 className="text-2xl lg:text-3xl font-bold text-white mb-3 group-hover:translate-x-2 transition-transform duration-300" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                          {featuredCollections[0].title}
                        </h3>
                        <p className="text-white/80 text-lg mb-4 max-w-md">{featuredCollections[0].description}</p>
                        <div className="flex items-center gap-4">
                          <Badge className="bg-white/20 backdrop-blur-md text-white border-0 px-4 py-2 rounded-full">
                            <Ticket className="w-4 h-4 mr-2" />
                            {featuredCollections[0].activityCount} experiences
                          </Badge>
                          <motion.div 
                            className="flex items-center gap-2 text-white/80 group-hover:text-white"
                            whileHover={{ x: 5 }}
                          >
                            Explore <ArrowRight className="w-4 h-4" />
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })()}
            </motion.div>

            {/* Stacked cards on the right */}
            {featuredCollections.slice(1).map((collection, index) => {
              const IconComponent = collection.icon;
              return (
                <motion.div 
                  key={collection.id} 
                  variants={fadeInUp}
                  className="col-span-12 sm:col-span-6 lg:col-span-5"
                >
                  <Link href={`/things-to-do/collection/${collection.id}`}>
                    <motion.div 
                      className="group relative h-40 lg:h-[156px] rounded-2xl overflow-hidden cursor-pointer"
                      whileHover={{ y: -4 }}
                      data-testid={`card-collection-${collection.id}`}
                    >
                      <img 
                        src={collection.image}
                        alt={collection.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-transparent" />
                      <div className="absolute inset-0 p-5 flex items-center gap-5">
                        <motion.div 
                          className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0"
                          whileHover={{ rotate: -10 }}
                        >
                          <IconComponent className="w-6 h-6 text-white" />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-white mb-1 group-hover:translate-x-1 transition-transform" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                            {collection.title}
                          </h3>
                          <p className="text-white/70 text-sm line-clamp-1">{collection.description}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                            <ChevronRight className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Featured Activities */}
      <section className="py-20 lg:py-28 bg-white dark:bg-slate-950 overflow-hidden" data-testid="section-featured-activities">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <motion.div 
            className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div>
              <h2 
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-[-0.02em]"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                data-testid="heading-featured-activities"
              >
                {selectedCategory === "all" ? "Must-Do Experiences" : activityCategories.find(c => c.id === selectedCategory)?.name}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {filteredActivities.length} handpicked {filteredActivities.length === 1 ? "activity" : "activities"}
              </p>
            </div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6443F4]/20"
              data-testid="select-location"
            >
              {locationFilters.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </motion.div>
        </div>

        {filteredActivities.length > 0 ? (
          <>
            {/* Horizontal scroll gallery */}
            <div className="relative">
              <motion.div 
                className="flex gap-6 overflow-x-auto scrollbar-hide px-6 lg:px-12 pb-4 snap-x snap-mandatory"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
              >
                {filteredActivities.map((activity, index) => (
                  <motion.div 
                    key={activity.id} 
                    variants={fadeInUp}
                    className="flex-shrink-0 w-[85vw] sm:w-[400px] lg:w-[450px] snap-start"
                  >
                    <Link href={`/things-to-do/${activity.id}`}>
                      <motion.div 
                        className="group relative rounded-3xl overflow-hidden cursor-pointer bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50"
                        whileHover={{ y: -8 }}
                        transition={{ duration: 0.3 }}
                        data-testid={`card-activity-${activity.id}`}
                      >
                        {/* Image with play button overlay */}
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <motion.img 
                            src={activity.image}
                            alt={activity.title}
                            className="w-full h-full object-cover"
                            whileHover={{ scale: 1.08 }}
                            transition={{ duration: 0.6 }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          {/* Floating play button */}
                          <motion.div 
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            initial={false}
                          >
                            <motion.div 
                              className="w-16 h-16 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-xl"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Play className="w-6 h-6 text-[#6443F4] ml-1" />
                            </motion.div>
                          </motion.div>

                          {/* Top badges */}
                          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                            <Badge 
                              className="bg-[#6443F4]/10 backdrop-blur-md border-0 shadow-lg px-3 py-1.5 text-[#6443F4] rounded-full"
                            >
                              {activity.categoryLabel}
                            </Badge>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-md text-slate-700 shadow-lg">
                              <Clock className="w-3.5 h-3.5" />
                              {activity.duration}
                            </div>
                          </div>

                          {activity.featured && (
                            <motion.div 
                              className="absolute bottom-4 left-4 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#6443F4] text-white shadow-lg"
                              animate={{ scale: [1, 1.02, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                              Editor's Pick
                            </motion.div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-6">
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
                            <MapPin className="w-4 h-4 text-[#6443F4]" />
                            {activity.location}
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 line-clamp-2 group-hover:text-[#6443F4] transition-colors leading-tight">
                            {activity.title}
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 text-sm mb-5 line-clamp-2 leading-relaxed">
                            {activity.description}
                          </p>
                          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-[#F4C542] text-[#F4C542]" />
                                <span className="font-bold text-slate-900 dark:text-white">{activity.rating}</span>
                              </div>
                              <span className="text-slate-400 dark:text-slate-500 text-sm">({activity.reviews.toLocaleString()} reviews)</span>
                            </div>
                            <span className="text-lg font-bold text-[#6443F4]">{activity.price}</span>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              {/* Scroll indicator dots */}
              <div className="flex justify-center gap-2 mt-6">
                {filteredActivities.slice(0, 5).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-[#6443F4]' : 'bg-slate-200 dark:bg-slate-700'}`} />
                ))}
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 lg:px-12 mt-10">
              <motion.div 
                className="flex justify-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <Button 
                  className="bg-[#6443F4] hover:bg-[#5339D9] text-white rounded-full px-8 gap-2 shadow-lg shadow-[#6443F4]/20"
                  data-testid="button-load-more"
                >
                  View All Activities
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
          </>
        ) : (
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-3xl" data-testid="empty-activities-state">
              <motion.div 
                className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Compass className="w-10 h-10 text-slate-400 dark:text-slate-500" />
              </motion.div>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-4">No activities found matching your filters</p>
              <Button 
                variant="outline"
                className="rounded-full"
                onClick={() => { setSelectedCategory("all"); setSelectedLocation("all"); setSearchQuery(""); }}
                data-testid="button-clear-filters"
              >
                Clear all filters
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* By Location */}
      <section className="py-20 lg:py-28 bg-slate-50 dark:bg-slate-900" data-testid="section-by-location">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <motion.div 
            className="mb-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 px-4 py-1.5 bg-[#6443F4]/10 text-[#6443F4] border-0 rounded-full" data-testid="badge-destinations">
              <Globe className="w-3 h-3 mr-2" />
              Global Destinations
            </Badge>
            <h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-[-0.02em]"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              data-testid="heading-by-location"
            >
              Pick Your Playground
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Every destination has its own magic. Where will your adventure begin?
            </p>
          </motion.div>

          {/* Interactive Location Grid */}
          <motion.div 
            className="relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {/* Connecting lines decoration */}
            <div className="absolute inset-0 pointer-events-none hidden lg:block">
              <svg className="w-full h-full" viewBox="0 0 1200 400" fill="none">
                <path d="M100,200 Q300,100 500,200 T900,200" stroke="#6443F4" strokeWidth="1" strokeDasharray="8,8" opacity="0.2" />
                <path d="M200,300 Q400,200 600,300 T1000,300" stroke="#6443F4" strokeWidth="1" strokeDasharray="8,8" opacity="0.2" />
              </svg>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
              {locationFilters.filter(l => l.id !== "all").map((location, index) => {
                const locationActivities = allActivities.filter(a => a.location.toLowerCase().replace(" ", "-") === location.id);
                const isHovered = hoveredLocation === location.id;
                return (
                  <motion.div 
                    key={location.id} 
                    variants={fadeInUp}
                    onHoverStart={() => setHoveredLocation(location.id)}
                    onHoverEnd={() => setHoveredLocation(null)}
                  >
                    <Link href={`/destinations/${location.id}/things-to-do`}>
                      <motion.div 
                        className="group relative cursor-pointer"
                        whileHover={{ scale: 1.05, zIndex: 10 }}
                        data-testid={`card-location-${location.id}`}
                      >
                        {/* Location card */}
                        <div className="relative overflow-hidden rounded-2xl aspect-[3/4]">
                          <img 
                            src={(location as any).image || `/cards/dubai.webp`}
                            alt={location.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />
                          
                          {/* Floating pin */}
                          <motion.div 
                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#6443F4] flex items-center justify-center shadow-lg"
                            animate={isHovered ? { y: [0, -5, 0] } : {}}
                            transition={{ duration: 0.5, repeat: isHovered ? Infinity : 0 }}
                          >
                            <MapPin className="w-5 h-5 text-white" />
                          </motion.div>

                          {/* Content */}
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="text-lg font-bold text-white mb-1" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{location.name}</h3>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-white/80 text-sm">
                                <Ticket className="w-3.5 h-3.5" />
                                {locationActivities.length} activities
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Hover expansion */}
                        <motion.div 
                          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 rounded-full px-4 py-2 shadow-xl opacity-0 group-hover:opacity-100 group-hover:bottom-[-36px] transition-all duration-300 whitespace-nowrap"
                        >
                          <span className="text-sm font-medium text-[#6443F4]">Explore {location.name}</span>
                        </motion.div>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* By Duration */}
      <section className="py-20 lg:py-28 bg-white dark:bg-slate-950" data-testid="section-by-duration">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <motion.div 
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 px-4 py-1.5 bg-[#6443F4]/10 text-[#6443F4] border-0 rounded-full" data-testid="badge-duration">
              <Timer className="w-3 h-3 mr-2" />
              Time Well Spent
            </Badge>
            <h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-[-0.02em]"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              data-testid="heading-by-duration"
            >
              How Much Time Do You Have?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
              From quick escapes to epic adventures, find the perfect experience for your schedule
            </p>
          </motion.div>

          {/* Duration Timeline */}
          <motion.div 
            className="relative mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {/* Timeline bar */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 rounded-full -translate-y-1/2 hidden lg:block" />
            <div className="absolute top-1/2 left-0 h-1 bg-[#6443F4] rounded-full -translate-y-1/2 hidden lg:block" style={{ width: '100%' }} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
              {durationTiers.map((tier, index) => {
                const IconComponent = tier.icon;
                const isSelected = selectedDuration === tier.id;
                const tierActivities = getActivitiesByDuration(tier.id);
                return (
                  <motion.div 
                    key={tier.id} 
                    variants={fadeInUp}
                    className="relative"
                  >
                    <motion.button
                      onClick={() => setSelectedDuration(isSelected ? null : tier.id)}
                      className={`w-full p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                        isSelected 
                          ? 'border-[#6443F4] bg-[#6443F4]/10 shadow-xl' 
                          : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-lg'
                      }`}
                      style={isSelected ? { 
                        boxShadow: `0 12px 40px -8px rgba(100, 67, 244, 0.3)`
                      } : {}}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      data-testid={`button-duration-${tier.id}`}
                    >
                      {/* Timeline dot */}
                      <div className="hidden lg:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <motion.div 
                          className="w-5 h-5 rounded-full border-4 border-white dark:border-slate-950 bg-[#6443F4]"
                          animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                          transition={{ duration: 0.5, repeat: isSelected ? Infinity : 0 }}
                        />
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                        <motion.div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#6443F4]/10"
                          animate={isSelected ? { rotate: [0, 10, -10, 0] } : {}}
                          transition={{ duration: 0.5 }}
                        >
                          <IconComponent className="w-6 h-6 text-[#6443F4]" />
                        </motion.div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{tier.label}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">{tier.time}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{tierActivities.length} activities</span>
                        <motion.div
                          animate={{ x: isSelected ? 5 : 0 }}
                        >
                          <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        </motion.div>
                      </div>
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Selected duration activities */}
          {selectedDuration && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 lg:p-8"
            >
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {getActivitiesByDuration(selectedDuration).slice(0, 6).map((activity) => (
                  <Link key={activity.id} href={`/things-to-do/${activity.id}`}>
                    <motion.div 
                      className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      whileHover={{ x: 4 }}
                      data-testid={`card-duration-activity-${activity.id}`}
                    >
                      <img src={activity.image} alt={activity.title} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-[#6443F4] transition-colors line-clamp-1">{activity.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                          <Clock className="w-3.5 h-3.5" />
                          {activity.duration}
                          <span className="mx-1">|</span>
                          <MapPin className="w-3.5 h-3.5" />
                          {activity.location}
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Planning Tools */}
      <section className="py-20 lg:py-28 bg-slate-50 dark:bg-slate-900" data-testid="section-planning-tools">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 px-4 py-1.5 bg-[#6443F4]/10 text-[#6443F4] border-0 rounded-full">
              <Sparkles className="w-3 h-3 mr-2" />
              Smart Planning
            </Badge>
            <h2 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-[-0.02em]"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            >
              Your Adventure Toolkit
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            {/* AI Trip Planner Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="group relative"
            >
              <motion.div
                className="relative bg-[#6443F4] rounded-3xl p-8 lg:p-10 overflow-hidden cursor-pointer"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
                data-testid="card-trip-planner"
              >
                {/* Animated background elements */}
                <motion.div 
                  className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl"
                  animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
                  transition={{ duration: 8, repeat: Infinity }}
                />
                <motion.div 
                  className="absolute bottom-0 left-0 w-60 h-60 bg-white/5 rounded-full blur-2xl"
                  animate={{ x: [0, -10, 0], y: [0, 10, 0] }}
                  transition={{ duration: 6, repeat: Infinity }}
                />

                <div className="relative z-10">
                  <motion.div 
                    className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6"
                    whileHover={{ rotate: 15, scale: 1.1 }}
                  >
                    <Calendar className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>AI Trip Planner</h3>
                  <p className="text-white/80 text-lg mb-8 max-w-md">
                    Let AI craft your perfect itinerary based on your interests, budget, and travel style.
                  </p>
                  
                  {/* Interactive tags */}
                  <div className="flex flex-wrap gap-2 mb-8">
                    {["Family Trip", "Adventure", "Romantic", "Solo"].map((tag) => (
                      <motion.span 
                        key={tag}
                        className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm border border-white/20"
                        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.2)" }}
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </div>

                  <Button 
                    className="bg-white text-[#6443F4] hover:bg-white/90 rounded-full px-8 gap-2 shadow-xl" 
                    data-testid="button-start-planning"
                  >
                    Start Planning
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            </motion.div>

            {/* Activity Bundles Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="group relative"
            >
              <motion.div
                className="relative bg-white dark:bg-slate-800 rounded-3xl p-8 lg:p-10 border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden cursor-pointer h-full"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
                data-testid="card-activity-bundles"
              >
                {/* Decorative gradient */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#6443F4]/10 to-transparent rounded-bl-full" />

                <div className="relative z-10">
                  <motion.div 
                    className="w-16 h-16 rounded-2xl bg-[#6443F4]/10 flex items-center justify-center mb-6"
                    whileHover={{ rotate: -15, scale: 1.1 }}
                  >
                    <Ticket className="w-8 h-8 text-[#6443F4]" />
                  </motion.div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>Activity Bundles</h3>
                    <Badge className="bg-[#6443F4]/10 text-[#6443F4] border-0 rounded-full">Save 30%</Badge>
                  </div>
                  
                  <p className="text-slate-600 dark:text-slate-400 text-lg mb-8">
                    Bundle experiences and save big. Curated combinations for every destination.
                  </p>
                  
                  {/* Bundle previews */}
                  <div className="space-y-3 mb-8">
                    {[
                      { name: "Dubai Explorer", count: 5, savings: "$45" },
                      { name: "Paris Romance", count: 4, savings: "$38" },
                      { name: "Tokyo Adventure", count: 6, savings: "$52" }
                    ].map((bundle) => (
                      <motion.div 
                        key={bundle.name}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700 group/item"
                        whileHover={{ x: 4, backgroundColor: "#f1f5f9" }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-600 flex items-center justify-center shadow-sm">
                            <Ticket className="w-5 h-5 text-[#6443F4]" />
                          </div>
                          <div>
                            <span className="font-medium text-slate-900 dark:text-white">{bundle.name}</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">{bundle.count} activities</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-[#6443F4]/10 text-[#6443F4] border-[#6443F4]/20 rounded-full">
                          Save {bundle.savings}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>

                  <Button 
                    variant="outline" 
                    className="rounded-full px-8 gap-2 border-[#6443F4] text-[#6443F4] hover:bg-[#6443F4] hover:text-white" 
                    data-testid="button-view-bundles"
                  >
                    View All Bundles
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 lg:py-28 bg-white dark:bg-slate-950 relative overflow-hidden" data-testid="section-newsletter">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div 
            className="absolute top-20 left-10 w-72 h-72 bg-[#6443F4]/5 rounded-full blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-96 h-96 bg-[#6443F4]/5 rounded-full blur-3xl"
            animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
            transition={{ duration: 12, repeat: Infinity }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="bg-slate-900 dark:bg-slate-800 rounded-[2rem] lg:rounded-[3rem] p-8 lg:p-16 overflow-hidden">
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#6443F4]/20 via-transparent to-[#6443F4]/20" />
              
              {/* Animated lines */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div 
                  className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent"
                  animate={{ y: [-500, 500] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
                <motion.div 
                  className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-white/5 to-transparent"
                  animate={{ y: [500, -500] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                />
              </div>

              <div className="relative z-10 max-w-2xl mx-auto text-center">
                <motion.div 
                  className="w-20 h-20 rounded-2xl bg-[#6443F4] flex items-center justify-center mx-auto mb-8 shadow-2xl"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <Heart className="w-10 h-10 text-white" />
                </motion.div>
                
                <h2 
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  data-testid="heading-newsletter"
                >
                  Never Miss an <span className="text-[#6443F4]">Adventure</span>
                </h2>
                
                <p className="text-lg lg:text-xl text-white/70 mb-10">
                  Join 50,000+ explorers getting weekly inspiration, exclusive deals, and insider tips.
                </p>

                <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                  <div className="relative flex-1">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-full px-6 py-7 border-0 bg-white/10 backdrop-blur-md text-white placeholder:text-white/50 focus:bg-white/20 focus:ring-2 focus:ring-[#6443F4]/50"
                      data-testid="input-newsletter-email"
                    />
                  </div>
                  <Button 
                    type="submit"
                    disabled={isSubscribing}
                    className="bg-[#6443F4] hover:bg-[#5339D9] text-white rounded-full px-8 py-7 gap-2 shadow-xl shadow-[#6443F4]/20"
                    data-testid="button-subscribe"
                  >
                    {isSubscribing ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                        <Send className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <>
                        Subscribe
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>

                <p className="text-sm text-white/40 mt-6">
                  No spam, ever. Unsubscribe anytime.
                </p>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-6 mt-10">
                  <div className="flex items-center gap-2 text-white/50 text-sm">
                    <Star className="w-4 h-4 fill-[#F4C542] text-[#F4C542]" />
                    50K+ Subscribers
                  </div>
                  <div className="w-px h-4 bg-white/20" />
                  <div className="flex items-center gap-2 text-white/50 text-sm">
                    <Heart className="w-4 h-4 text-[#6443F4]" />
                    Weekly Updates
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}

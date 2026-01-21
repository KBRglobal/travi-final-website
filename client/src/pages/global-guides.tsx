import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { 
  BookOpen, Map, Compass, Mountain, Palmtree, Camera, Utensils,
  Clock, ArrowRight, ChevronRight, Quote, MapPin, Sparkles, Send,
  Heart, Zap, Coffee, Sun, Users, Feather, Globe, Play, ChevronLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { SEOHead } from "@/components/seo-head";

const travelerArchetypes = [
  { id: "adventure", name: "Adventure Seeker", icon: Mountain, color: "#6443F4", description: "Thrilling experiences and adrenaline rushes" },
  { id: "culture", name: "Culture Explorer", icon: Camera, color: "#6443F4", description: "Art, history, and local traditions" },
  { id: "relaxation", name: "Relaxation Guru", icon: Sun, color: "#F4C542", description: "Wellness retreats and peaceful escapes" },
  { id: "foodie", name: "Culinary Nomad", icon: Utensils, color: "#02A65C", description: "Local flavors and gastronomic adventures" },
  { id: "budget", name: "Smart Traveler", icon: Zap, color: "#6443F4", description: "Maximum experience, minimal budget" },
  { id: "solo", name: "Solo Explorer", icon: Compass, color: "#6443F4", description: "Independent journeys and self-discovery" }
];

const journeyMilestones = [
  { id: 1, title: "Dream", subtitle: "Discover inspiration", icon: Sparkles, guides: ["Destination Guides", "Photo Essays"] },
  { id: 2, title: "Plan", subtitle: "Map your journey", icon: Map, guides: ["Trip Planning", "Visa Requirements"] },
  { id: 3, title: "Prepare", subtitle: "Get ready to go", icon: BookOpen, guides: ["Packing Lists", "Safety Tips"] },
  { id: 4, title: "Experience", subtitle: "Live the adventure", icon: Heart, guides: ["Local Insights", "Hidden Gems"] },
  { id: 5, title: "Share", subtitle: "Tell your story", icon: Feather, guides: ["Travel Writing", "Photography"] }
];

const ideaLabCards = [
  { id: 1, title: "48 Hours in Tokyo", category: "Weekend Escapes", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=400&fit=crop&q=80" },
  { id: 2, title: "Hidden Beaches of Portugal", category: "Off the Beaten Path", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop&q=80" },
  { id: 3, title: "Budget Backpacking Europe", category: "Smart Travel", image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=400&fit=crop&q=80" },
  { id: 4, title: "Solo Safari Adventure", category: "Bucket List", image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&h=400&fit=crop&q=80" },
  { id: 5, title: "Parisian Food Tour", category: "Culinary", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop&q=80" },
  { id: 6, title: "Northern Lights Chase", category: "Nature & Wonder", image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600&h=400&fit=crop&q=80" }
];

const editorialSpreads = [
  {
    id: 1,
    headline: "The Art of Slow Travel",
    pullQuote: "When we stop counting countries and start collecting moments, travel transforms from a checklist into a meditation.",
    author: "Isabella Chen",
    authorRole: "Editor-in-Chief",
    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&h=800&fit=crop&q=80",
    content: "In an age of weekend city-hopping and Instagram-driven itineraries, there's a growing movement of travelers choosing depth over breadth. They're staying longer, wandering slower, and discovering that the most profound travel experiences often happen when we have nowhere to be."
  },
  {
    id: 2,
    headline: "Solo Travel Revolution",
    pullQuote: "The journey you take alone is often the one that leads you back to yourself.",
    author: "Marcus Webb",
    authorRole: "Travel Philosophy Editor",
    image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&h=800&fit=crop&q=80",
    content: "Solo travel isn't about being alone—it's about being free. Free to change plans on a whim, to follow curiosity down cobblestone alleys, and to discover capabilities you never knew you possessed. This is the decade of the independent explorer."
  }
];

const featuredWriters = [
  { id: 1, name: "Dr. Elena Vasquez", specialty: "Cultural Anthropology", bio: "Former National Geographic explorer, now crafting guides that bridge cultures and continents.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&q=80", articles: 47 },
  { id: 2, name: "James Nakamura", specialty: "Adventure & Outdoors", bio: "Mountain guide turned travel writer, documenting trails less traveled across six continents.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&q=80", articles: 32 },
  { id: 3, name: "Amara Okonkwo", specialty: "Budget & Solo Travel", bio: "Backpacked 60 countries on $30/day. Now sharing secrets of smart, sustainable travel.", avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&q=80", articles: 89 },
  { id: 4, name: "Pierre Dubois", specialty: "Culinary Journeys", bio: "Michelin-trained chef exploring street food scenes from Bangkok to Buenos Aires.", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&q=80", articles: 56 }
];

const galleryImages = [
  { id: 1, src: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop&q=80", location: "Tokyo, Japan", category: "City" },
  { id: 2, src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80", location: "Swiss Alps", category: "Mountains" },
  { id: 3, src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80", location: "Maldives", category: "Beach" },
  { id: 4, src: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop&q=80", location: "Paris, France", category: "City" },
  { id: 5, src: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=600&fit=crop&q=80", location: "Kenya", category: "Safari" },
  { id: 6, src: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&h=600&fit=crop&q=80", location: "Norway", category: "Nature" }
];

const mapDestinations = [
  { id: 1, name: "Paris", x: 48, y: 28, guides: 24 },
  { id: 2, name: "Tokyo", x: 85, y: 35, guides: 18 },
  { id: 3, name: "New York", x: 25, y: 32, guides: 31 },
  { id: 4, name: "Dubai", x: 58, y: 40, guides: 15 },
  { id: 5, name: "Sydney", x: 88, y: 72, guides: 12 },
  { id: 6, name: "Cape Town", x: 52, y: 75, guides: 8 },
  { id: 7, name: "Rio", x: 32, y: 65, guides: 11 },
  { id: 8, name: "Bangkok", x: 75, y: 45, guides: 22 }
];

export default function GlobalGuides() {
  const { t } = useTranslation();
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [currentIdeaIndex, setCurrentIdeaIndex] = useState(0);
  const [hoveredDestination, setHoveredDestination] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const { scrollYProgress: galleryScrollProgress } = useScroll({
    target: galleryRef,
    offset: ["start end", "end start"]
  });

  const heroImageY = useTransform(heroScrollProgress, [0, 1], [0, 150]);
  const heroTextY = useTransform(heroScrollProgress, [0, 1], [0, 50]);
  const heroOpacity = useTransform(heroScrollProgress, [0, 0.5], [1, 0]);
  const galleryX = useTransform(galleryScrollProgress, [0, 1], [0, -200]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIdeaIndex((prev) => (prev + 1) % ideaLabCards.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast({ title: t("guides.newsletter.invalidEmail"), variant: "destructive" });
      return;
    }
    setIsSubscribing(true);
    await new Promise(r => setTimeout(r, 1000));
    toast({ title: t("guides.newsletter.successTitle"), description: t("guides.newsletter.successDesc") });
    setEmail("");
    setIsSubscribing(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <SEOHead
        title="Travel Guides & Destination Stories - Curated Travel Content | TRAVI"
        description="Discover curated travel guides, destination stories and local insights. From cultural experiences to adventure trips, explore the world with TRAVI's travel intelligence."
        canonicalPath="/guides"
      />
      <SubtleSkyBackground />
      <PublicNav variant="transparent" />

      <main>
        {/* SECTION 1: Editorial Split-Screen Hero */}
        <section ref={heroRef} className="relative min-h-screen bg-white dark:bg-slate-950 overflow-hidden pt-20" data-testid="hero-editorial-split">
          <div className="grid lg:grid-cols-2 min-h-screen">
            {/* Left: Full-bleed Image */}
            <motion.div 
              className="relative h-[50vh] lg:h-auto lg:min-h-screen overflow-hidden"
              style={{ y: heroImageY }}
            >
              <img 
                src="/attached_assets/travi-rowing-a-vintage-wooden-boat-across-serene_1767571913591.webp"
                alt="Travi mascot rowing a vintage wooden boat across a serene mountain lake"
                className="absolute inset-0 w-full h-full object-cover"
                data-testid="hero-image"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/20 dark:to-slate-950/20 lg:to-white dark:lg:to-slate-950" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent lg:from-transparent" />
              
              <motion.div 
                className="absolute bottom-8 left-8 lg:bottom-16 lg:left-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <Badge className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-[#6443F4] border-0 px-4 py-2 text-sm font-medium" data-testid="badge-issue">
                  <Sparkles className="w-4 h-4 me-2 rtl:rotate-0" />
                  {t("guides.hero.issueBadge")}
                </Badge>
              </motion.div>
            </motion.div>

            {/* Right: Editorial Content */}
            <motion.div 
              className="flex flex-col justify-center px-8 lg:px-16 xl:px-24 py-16 lg:py-24 bg-white dark:bg-slate-950 relative"
              style={{ y: heroTextY, opacity: heroOpacity }}
            >
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full border border-[#6443F4]/10 dark:border-[#6443F4]/20 -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-slate-50 dark:bg-slate-900 translate-y-1/2 -translate-x-1/2" />
              
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="text-[#6443F4] text-sm font-semibold tracking-[0.2em] uppercase mb-6" data-testid="text-category-label">
                  {t("guides.hero.categoryLabel")}
                </p>
                <h1 
                  className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-slate-900 dark:text-slate-100 leading-[1.05] tracking-[-0.03em] mb-8"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  data-testid="hero-headline"
                >
                  {t("guides.hero.headlinePart1")}
                  <br />
                  <span className="text-[#6443F4]">
                    {t("guides.hero.headlinePart2")}
                  </span>
                </h1>
                <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-10 max-w-lg" data-testid="hero-description">
                  {t("guides.hero.description")}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white px-8 h-14 text-base gap-3"
                    data-testid="button-start-journey"
                  >
                    <Play className="w-5 h-5 rtl:rotate-180" />
                    {t("guides.hero.startJourney")}
                  </Button>
                  <Button 
                    variant="outline"
                    className="rounded-full px-8 h-14 text-base border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    data-testid="button-browse-collection"
                  >
                    {t("guides.hero.browseCollection")}
                  </Button>
                </div>

                <div className="flex items-center gap-8 mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
                  <div data-testid="stat-guides">
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">200+</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("guides.stats.guides")}</p>
                  </div>
                  <div className="w-px h-12 bg-slate-200 dark:bg-slate-700" />
                  <div data-testid="stat-destinations">
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">16</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("guides.stats.destinations")}</p>
                  </div>
                  <div className="w-px h-12 bg-slate-200 dark:bg-slate-700" />
                  <div data-testid="stat-writers">
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">17</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("guides.stats.languages")}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 2: Curated Journey Timeline */}
        <section className="py-24 lg:py-32 bg-slate-50 dark:bg-slate-900 overflow-hidden" data-testid="section-journey-timeline">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-4 px-4 py-1.5 bg-[#6443F4]/10 dark:bg-[#6443F4]/20 text-[#6443F4] border-0" data-testid="badge-journey">
                <Compass className="w-3 h-3 me-2" />
                {t("guides.journey.badge")}
              </Badge>
              <h2 
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-[-0.02em]"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                data-testid="heading-journey"
              >
                {t("guides.journey.title")}
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                {t("guides.journey.subtitle")}
              </p>
            </motion.div>

            {/* Horizontal Timeline */}
            <div className="relative" data-testid="timeline-container">
              {/* Timeline Line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#6443F4]/20 dark:bg-[#6443F4]/30 rounded-full transform -translate-y-1/2 hidden lg:block" />
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-4">
                {journeyMilestones.map((milestone, index) => {
                  const IconComponent = milestone.icon;
                  return (
                    <motion.div
                      key={milestone.id}
                      className="relative flex flex-col items-center"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      data-testid={`milestone-${milestone.id}`}
                    >
                      {/* Milestone Circle */}
                      <div className="relative z-10 w-20 h-20 rounded-full bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/60 dark:shadow-slate-900/60 flex items-center justify-center mb-4 border-4 border-white dark:border-slate-800">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[#6443F4]/10 dark:bg-[#6443F4]/20">
                          <IconComponent className="w-6 h-6 text-[#6443F4]" />
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="text-center">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{milestone.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{milestone.subtitle}</p>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {milestone.guides.map((guide, gIndex) => (
                            <span 
                              key={gIndex}
                              className="text-xs px-2 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                            >
                              {guide}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: Idea Lab Carousel */}
        <section className="py-24 lg:py-32 bg-white dark:bg-slate-950 relative overflow-hidden" data-testid="section-idea-lab">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
            <motion.div
              className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div>
                <Badge className="mb-4 px-4 py-1.5 bg-[#6443F4]/10 dark:bg-[#6443F4]/20 text-[#6443F4] border-0" data-testid="badge-idea-lab">
                  <Sparkles className="w-3 h-3 me-2" />
                  {t("guides.ideaLab.badge")}
                </Badge>
                <h2 
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 tracking-[-0.02em]"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  data-testid="heading-idea-lab"
                >
                  {t("guides.ideaLab.title")}
                </h2>
              </div>
              <div className="flex gap-3">
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="rounded-full border-slate-300 dark:border-slate-700"
                  onClick={() => setCurrentIdeaIndex(prev => (prev - 1 + ideaLabCards.length) % ideaLabCards.length)}
                  data-testid="button-idea-prev"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="rounded-full border-slate-300 dark:border-slate-700"
                  onClick={() => setCurrentIdeaIndex(prev => (prev + 1) % ideaLabCards.length)}
                  data-testid="button-idea-next"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>

            {/* Carousel */}
            <div className="relative h-[400px] lg:h-[500px]" data-testid="carousel-container">
              <AnimatePresence mode="popLayout">
                {ideaLabCards.map((card, index) => {
                  const offset = (index - currentIdeaIndex + ideaLabCards.length) % ideaLabCards.length;
                  const isActive = offset === 0;
                  const isNext = offset === 1;
                  const isPrev = offset === ideaLabCards.length - 1;
                  const isVisible = isActive || isNext || isPrev || offset === 2;
                  
                  if (!isVisible) return null;

                  return (
                    <motion.div
                      key={card.id}
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0, scale: 0.8, x: 300 }}
                      animate={{
                        opacity: isActive ? 1 : isNext ? 0.7 : isPrev ? 0.7 : 0.4,
                        scale: isActive ? 1 : 0.85,
                        x: isActive ? 0 : isNext ? 320 : isPrev ? -320 : 600,
                        zIndex: isActive ? 30 : isNext || isPrev ? 20 : 10
                      }}
                      exit={{ opacity: 0, scale: 0.8, x: -300 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      data-testid={`idea-card-${card.id}`}
                    >
                      <div className="relative w-full max-w-lg h-80 lg:h-96 rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/20 dark:shadow-slate-900/40">
                        <img 
                          src={card.image}
                          alt={card.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                        
                        {/* Card Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-8">
                          <div className="bg-white/20 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-white/30 dark:border-slate-700/50">
                            <span className="text-white/80 text-sm font-medium tracking-wide uppercase">
                              {card.category}
                            </span>
                            <h3 
                              className="text-2xl lg:text-3xl font-bold text-white mt-2 leading-tight"
                              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                            >
                              {card.title}
                            </h3>
                            <Button 
                              className="mt-4 rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white px-6 gap-2"
                            >
                              {t("guides.ideaLab.readGuide")} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Progress Dots */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
                {ideaLabCards.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIdeaIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentIdeaIndex 
                        ? 'w-8 bg-[#6443F4]' 
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    data-testid={`dot-${index}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: Traveler Archetype Selector */}
        <section className="py-24 lg:py-32 bg-slate-50 dark:bg-slate-900" data-testid="section-archetype-selector">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Badge className="mb-4 px-4 py-1.5 bg-[#6443F4]/10 dark:bg-[#6443F4]/20 text-[#6443F4] border-0" data-testid="badge-archetype">
                <Users className="w-3 h-3 me-2" />
                {t("guides.archetype.badge")}
              </Badge>
              <h2 
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-[-0.02em]"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                data-testid="heading-archetype"
              >
                {t("guides.archetype.title")}
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                {t("guides.archetype.subtitle")}
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" data-testid="archetype-grid">
              {travelerArchetypes.map((archetype, index) => {
                const IconComponent = archetype.icon;
                const isSelected = selectedArchetype === archetype.id;
                
                return (
                  <motion.button
                    key={archetype.id}
                    onClick={() => setSelectedArchetype(isSelected ? null : archetype.id)}
                    className={`relative p-6 rounded-2xl text-center transition-all duration-300 ${
                      isSelected 
                        ? 'bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 scale-105' 
                        : 'bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700'
                    }`}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    data-testid={`archetype-${archetype.id}`}
                  >
                    {isSelected && (
                      <div 
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: archetype.color }}
                      >
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    <div 
                      className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-all ${
                        isSelected ? '' : 'bg-slate-100 dark:bg-slate-700'
                      }`}
                      style={{ backgroundColor: isSelected ? `${archetype.color}15` : undefined }}
                    >
                      <IconComponent 
                        className="w-7 h-7 transition-colors"
                        style={{ color: isSelected ? archetype.color : undefined }}
                      />
                    </div>
                    <h3 className={`font-semibold mb-1 transition-colors ${isSelected ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                      {archetype.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {archetype.description}
                    </p>
                  </motion.button>
                );
              })}
            </div>

            {selectedArchetype && (
              <motion.div 
                className="mt-12 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                data-testid="archetype-cta"
              >
                <Button 
                  className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white px-8 gap-2"
                  data-testid="button-view-personalized"
                >
                  {t("guides.archetype.viewGuides", { type: t(`guides.archetypes.${selectedArchetype}.name`) })}
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Button>
              </motion.div>
            )}
          </div>
        </section>

        {/* SECTION 5: Editorial Spreads */}
        <section className="py-24 lg:py-32 bg-white dark:bg-slate-950" data-testid="section-editorial-spreads">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <motion.div
              className="mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Badge className="mb-4 px-4 py-1.5 bg-[#6443F4]/10 dark:bg-[#6443F4]/20 text-[#6443F4] border-0" data-testid="badge-editorial">
                <Feather className="w-3 h-3 me-2" />
                {t("guides.editorial.badge")}
              </Badge>
              <h2 
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 tracking-[-0.02em]"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                data-testid="heading-editorial"
              >
                {t("guides.editorial.title")}
              </h2>
            </motion.div>

            {editorialSpreads.map((spread, index) => (
              <motion.div
                key={spread.id}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-16 mb-24 last:mb-0 ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                data-testid={`spread-${spread.id}`}
              >
                {/* Image Side */}
                <div className={`relative ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/10 dark:shadow-slate-900/30">
                    <img 
                      src={spread.image}
                      alt={spread.headline}
                      className="w-full aspect-[4/3] object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent" />
                  </div>
                  {/* Decorative Element */}
                  <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-2xl bg-[#6443F4]/10 dark:bg-[#6443F4]/20 -z-10" />
                </div>

                {/* Content Side */}
                <div className={`flex flex-col justify-center ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <h3 
                    className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-6 leading-tight tracking-[-0.02em]"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    {spread.headline}
                  </h3>

                  {/* Pull Quote */}
                  <div className="relative pl-6 py-4 mb-8 border-l-4 border-[#6443F4]">
                    <Quote className="absolute -left-5 -top-2 w-10 h-10 text-[#6443F4]/20" />
                    <p className="text-xl lg:text-2xl text-slate-700 dark:text-slate-300 italic leading-relaxed">
                      "{spread.pullQuote}"
                    </p>
                  </div>

                  <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                    {spread.content}
                  </p>

                  <div className="flex items-center gap-4 flex-wrap">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-[#6443F4]/10 text-[#6443F4] font-semibold">
                        {spread.author.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{spread.author}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{spread.authorRole}</p>
                    </div>
                    <Link href={`/guides/editorial/${spread.id}`} className="ms-auto">
                      <Button variant="outline" className="rounded-full gap-2 border-slate-300 dark:border-slate-700" data-testid={`button-read-${spread.id}`}>
                        {t("guides.editorial.readFull")} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* SECTION 6: Immersive Gallery with Parallax */}
        <section ref={galleryRef} className="py-24 lg:py-32 bg-slate-900 dark:bg-slate-950 overflow-hidden" data-testid="section-immersive-gallery">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Badge className="mb-4 px-4 py-1.5 bg-white/10 text-white border-0" data-testid="badge-gallery">
                <Camera className="w-3 h-3 me-2" />
                {t("guides.gallery.badge")}
              </Badge>
              <h2 
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-[-0.02em]"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                data-testid="heading-gallery"
              >
                {t("guides.gallery.title")}
              </h2>
            </motion.div>
          </div>

          {/* Parallax Gallery Strip */}
          <motion.div 
            className="flex gap-6 pl-6"
            style={{ x: galleryX }}
            data-testid="gallery-strip"
          >
            {galleryImages.concat(galleryImages).map((image, index) => (
              <motion.div
                key={`${image.id}-${index}`}
                className="relative flex-shrink-0 w-80 lg:w-96 rounded-2xl overflow-hidden group cursor-pointer"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: (index % 6) * 0.1 }}
                data-testid={`gallery-image-${index}`}
              >
                <img 
                  src={image.src}
                  alt={image.location}
                  className="w-full aspect-[3/4] object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <Badge className="mb-3 bg-white/20 backdrop-blur-sm text-white border-0">
                    {image.category}
                  </Badge>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                    <MapPin className="w-4 h-4 text-[#6443F4]" />
                    {image.location}
                  </h3>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* SECTION 7: Writer's Picks */}
        <section className="py-24 lg:py-32 bg-white dark:bg-slate-950" data-testid="section-writers-picks">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Badge className="mb-4 px-4 py-1.5 bg-[#6443F4]/10 dark:bg-[#6443F4]/20 text-[#6443F4] border-0" data-testid="badge-writers">
                <Feather className="w-3 h-3 me-2" />
                {t("guides.writers.badge")}
              </Badge>
              <h2 
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-[-0.02em]"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                data-testid="heading-writers"
              >
                {t("guides.writers.title")}
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                {t("guides.writers.subtitle")}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8" data-testid="writers-grid">
              {featuredWriters.map((writer, index) => (
                <motion.div
                  key={writer.id}
                  className="group text-center"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  data-testid={`writer-${writer.id}`}
                >
                  {/* Large Portrait */}
                  <div className="relative mb-6">
                    <div className="w-40 h-40 mx-auto rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 group-hover:shadow-2xl transition-shadow duration-300">
                      <img 
                        src={writer.avatar}
                        alt={writer.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-[#6443F4] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                      {t("guides.writers.articleCount", { count: writer.articles })}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>{writer.name}</h3>
                  <p className="text-sm font-medium text-[#6443F4] mb-3">{writer.specialty}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{writer.bio}</p>
                  
                  <Button 
                    variant="ghost" 
                    className="mt-4 text-[#6443F4] rounded-full gap-1"
                    data-testid={`button-writer-${writer.id}`}
                  >
                    {t("guides.writers.viewProfile")} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 8: Interactive Destination Map */}
        <section className="py-24 lg:py-32 bg-slate-50 dark:bg-slate-900" data-testid="section-destination-map">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <motion.div
              className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div>
                <Badge className="mb-4 px-4 py-1.5 bg-[#6443F4]/10 dark:bg-[#6443F4]/20 text-[#6443F4] border-0" data-testid="badge-map">
                  <Globe className="w-3 h-3 me-2" />
                  {t("guides.map.badge")}
                </Badge>
                <h2 
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 tracking-[-0.02em]"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  data-testid="heading-map"
                >
                  {t("guides.map.title")}
                </h2>
              </div>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md">
                {t("guides.map.subtitle")}
              </p>
            </motion.div>

            {/* Interactive Map */}
            <motion.div 
              className="relative bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 border border-slate-100 dark:border-slate-700"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              data-testid="map-container"
            >
              <div className="relative aspect-[2/1] bg-slate-50 dark:bg-slate-800/50">
                {/* Simplified World Map Background */}
                <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 50">
                  <path d="M10,25 Q20,20 30,22 T50,20 T70,25 T90,22" fill="none" stroke="#6443F4" strokeWidth="0.3" />
                  <path d="M15,30 Q25,28 35,32 T55,28 T75,32" fill="none" stroke="#6443F4" strokeWidth="0.3" />
                  <ellipse cx="30" cy="30" rx="8" ry="5" fill="#6443F4" opacity="0.1" />
                  <ellipse cx="50" cy="28" rx="12" ry="8" fill="#6443F4" opacity="0.1" />
                  <ellipse cx="80" cy="35" rx="10" ry="6" fill="#6443F4" opacity="0.1" />
                </svg>

                {/* Destination Markers */}
                {mapDestinations.map((dest) => (
                  <motion.button
                    key={dest.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${dest.x}%`, top: `${dest.y}%` }}
                    onMouseEnter={() => setHoveredDestination(dest.name)}
                    onMouseLeave={() => setHoveredDestination(null)}
                    whileHover={{ scale: 1.2 }}
                    data-testid={`marker-${dest.name.toLowerCase().replace(' ', '-')}`}
                  >
                    <div className={`relative w-4 h-4 rounded-full transition-all duration-300 ${
                      hoveredDestination === dest.name 
                        ? 'bg-[#6443F4] shadow-lg shadow-[#6443F4]/40' 
                        : 'bg-[#6443F4] shadow-lg shadow-[#6443F4]/30'
                    }`}>
                      <div className="absolute inset-0 rounded-full bg-current animate-ping opacity-30" />
                    </div>
                    
                    {/* Tooltip */}
                    <AnimatePresence>
                      {hoveredDestination === dest.name && (
                        <motion.div
                          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-20"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                        >
                          <div className="bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-xl shadow-xl whitespace-nowrap">
                            <p className="font-semibold">{dest.name}</p>
                            <p className="text-xs text-slate-400">{t("guides.map.guidesAvailable", { count: dest.guides })}</p>
                          </div>
                          <div className="w-3 h-3 bg-slate-900 dark:bg-slate-700 transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                ))}
              </div>

              {/* Map Legend */}
              <div className="absolute bottom-6 start-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#6443F4]" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">{t("guides.map.legendDestination")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#6443F4]" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">{t("guides.map.legendHighlighted")}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 9: Newsletter CTA */}
        <section className="py-24 lg:py-32 bg-white dark:bg-slate-950" data-testid="section-newsletter">
          <div className="max-w-4xl mx-auto px-6 lg:px-12">
            <motion.div
              className="relative bg-slate-50 dark:bg-slate-900 rounded-3xl p-10 md:p-16 overflow-hidden border border-slate-200 dark:border-slate-800"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              data-testid="newsletter-card"
            >
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#6443F4]/5 dark:bg-[#6443F4]/10 -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[#6443F4]/5 dark:bg-[#6443F4]/10 translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative z-10 text-center">
                <Badge className="mb-6 px-4 py-1.5 bg-[#6443F4]/10 dark:bg-[#6443F4]/20 text-[#6443F4] border-0" data-testid="badge-newsletter">
                  <Sparkles className="w-3 h-3 me-2" />
                  {t("guides.newsletter.badge")}
                </Badge>
                <h2 
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6 tracking-[-0.02em]"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  data-testid="heading-newsletter"
                >
                  {t("guides.newsletter.title")}
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-10" data-testid="text-newsletter">
                  {t("guides.newsletter.description")}
                </p>

                <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("guides.newsletter.placeholder")}
                    className="flex-1 px-6 py-4 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6443F4] focus:border-transparent"
                    data-testid="input-newsletter-email"
                  />
                  <Button 
                    type="submit"
                    disabled={isSubscribing}
                    className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white px-8 py-4 gap-2"
                    data-testid="button-subscribe"
                  >
                    {isSubscribing ? t("guides.newsletter.subscribing") : t("guides.newsletter.subscribe")}
                    <Send className="w-4 h-4 rtl:rotate-180" />
                  </Button>
                </form>

                <p className="text-sm text-slate-500 dark:text-slate-500 mt-6">
                  {t("guides.newsletter.joinCount")}
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

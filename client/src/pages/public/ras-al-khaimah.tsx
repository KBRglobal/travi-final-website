/**
 * Ras Al Khaimah - Hidden Gem Destination Page
 * Premium design showcasing UAE's emerging travel destination
 * Features: Wynn Casino tracker, interactive zones, desert-inspired palette
 */

import { motion, useScroll, useTransform } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { useState, useRef } from "react";
import {
  Mountain,
  Waves,
  Building2,
  Calendar,
  Clock,
  Star,
  ChevronDown,
  Plane,
  Hotel,
  Sparkles,
  Sun,
  Tent,
  Trophy,
  Compass,
  ArrowRight,
} from "lucide-react";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// RAK-specific color palette: Desert sand, turquoise, gold
const RAK_COLORS = {
  sand: "hsl(35, 45%, 85%)",
  desert: "hsl(28, 55%, 65%)",
  turquoise: "hsl(175, 65%, 45%)",
  gold: "hsl(45, 85%, 55%)",
  deepBlue: "hsl(210, 65%, 25%)",
};

// Wynn Casino project status - accurate data from official sources
const WYNN_STATUS = {
  name: "Wynn Al Marjan Island",
  status: "Under Construction",
  expectedOpening: "Spring 2027",
  progress: 70, // Tower topped out December 2025
  investment: "$5.1 billion",
  features: [
    "First licensed casino in UAE",
    "1,530 rooms & suites",
    "194,000 sq ft gaming floor",
    "22 dining venues",
    "3.6-hectare pool complex",
    "Championship golf course",
  ],
};

// Interactive zones data
const ZONES = [
  {
    id: "al-marjan",
    name: "Al Marjan Island",
    subtitle: "The Future of Entertainment",
    icon: Waves,
    color: "from-cyan-500 to-blue-600",
    description:
      "A cluster of 4 coral-shaped islands featuring the upcoming Wynn Resort, luxury hotels, and pristine beaches.",
    highlights: ["Wynn Al Marjan Island", "Beach Clubs", "Luxury Resorts", "Water Sports"],
    image: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&h=600&fit=crop",
  },
  {
    id: "jebel-jais",
    name: "Jebel Jais",
    subtitle: "Adventure Awaits",
    icon: Mountain,
    color: "from-amber-500 to-orange-600",
    description:
      "UAE's highest peak at 1,934m, home to the world's longest zipline and breathtaking hiking trails.",
    highlights: ["World's Longest Zipline", "Mountain Hiking", "1484 Restaurant", "Stargazing"],
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop",
  },
  {
    id: "city-dunes",
    name: "City & Desert",
    subtitle: "Heritage Meets Adventure",
    icon: Tent,
    color: "from-orange-400 to-amber-600",
    description:
      "Explore ancient forts, traditional souks, and experience authentic desert glamping under the stars.",
    highlights: ["Dhayah Fort", "Traditional Souks", "Desert Glamping", "Dune Bashing"],
    image: "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=800&h=600&fit=crop",
  },
];

// Featured articles - links to actual guide pages
const FEATURED_ARTICLES = [
  {
    title: "Wynn Al Marjan Island: Complete 2027 Guide",
    category: "Casino & Entertainment",
    readTime: "11 min read",
    href: "/guides/wynn-al-marjan-island",
    image: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600&h=400&fit=crop",
  },
  {
    title: "Jebel Jais Adventure Guide: Zipline, Hiking & Hidden Gems",
    category: "Adventure",
    readTime: "8 min read",
    href: "/guides/jebel-jais-adventure",
    image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=400&fit=crop",
  },
  {
    title: "Where to Stay in RAK 2026: Best Hotels & Resorts",
    category: "Accommodation",
    readTime: "7 min read",
    href: "/guides/where-to-stay-rak",
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=400&fit=crop",
  },
  {
    title: "Dubai to RAK: The Complete Transport Guide",
    category: "Logistics",
    readTime: "5 min read",
    href: "/guides/dubai-to-rak-transport",
    image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=400&fit=crop",
  },
  {
    title: "Dubai vs Ras Al Khaimah: 2026 Holiday Comparison",
    category: "Comparison",
    readTime: "6 min read",
    href: "/guides/dubai-vs-rak",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop",
  },
  {
    title: "RAK Real Estate: Investment Guide for 2026",
    category: "Investment",
    readTime: "9 min read",
    href: "/guides/rak-real-estate-investment",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop",
  },
];

// FAQ data - accurate information from official sources
const FAQ_DATA = [
  {
    question: "When will the Wynn Casino open in Ras Al Khaimah?",
    answer:
      "Wynn Al Marjan Island is scheduled to open in Spring 2027 (Q1 expected). The 70-story tower topped out in December 2025 at 283 meters. This $5.1 billion project will feature 1,530 rooms, a 194,000 sq ft gaming floor, and 22 dining venues.",
  },
  {
    question: "Is gambling legal in Ras Al Khaimah?",
    answer:
      "Yes. The General Commercial Gaming Regulatory Authority (GCGRA) issued Wynn Resorts the UAE's first commercial gaming license in October 2024. Entry is restricted to adults 21 years and older. Tourists enter freely while UAE residents may face additional entry protocols similar to Singapore's model.",
  },
  {
    question: "How do I get from Dubai to Ras Al Khaimah?",
    answer:
      "RAK is 45-60 minutes from Dubai. Options: RAK Shuttle (AED 30-40, pre-book online, stops at major resorts), public bus from Dubai Union Station (AED 20-27, every hour), taxi (AED 250-300), or rental car via E311 highway. Careem and Uber work in RAK.",
  },
  {
    question: "What is the Jebel Jais Zipline?",
    answer:
      "Jais Flight is the world's longest zipline at 2.83km, flying at speeds up to 160 km/h superman-style. Located on UAE's highest peak (1,934m), it's 10°C cooler than sea level. Pro tip: Book the 9:00 AM slot to fly through morning mist above the clouds.",
  },
  {
    question: "Is Ras Al Khaimah cheaper than Dubai?",
    answer:
      "Yes! 5-star hotel nights cost $200-550 in RAK vs $450-1,200+ in Dubai. Dinner for two runs $60-90 vs $100-150. RAK specializes in All-Inclusive packages that save families 30-40% compared to Dubai. Warning: Prices are climbing due to Wynn hype - 2026 may be the last year for 'hidden gem' prices.",
  },
];

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

export default function RasAlKhaimahPage() {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);

  return (
    <>
      <Helmet>
        <title>Ras Al Khaimah 2026: The Ultimate Guide to UAE's Hidden Gem | TRAVI</title>
        <meta
          name="description"
          content="Discover Ras Al Khaimah - home to the upcoming Wynn Casino, world's longest zipline, and pristine beaches. Your complete guide to UAE's emerging luxury destination."
        />
        <meta
          name="keywords"
          content="Ras Al Khaimah, RAK, Wynn Casino UAE, Jebel Jais, Al Marjan Island, UAE travel, Dubai alternative"
        />
        <meta property="og:title" content="Ras Al Khaimah 2026: UAE's Hidden Gem" />
        <meta
          property="og:description"
          content="Complete guide to Ras Al Khaimah - Wynn Casino, adventure activities, and luxury escapes."
        />
        <link rel="canonical" href="https://travi.world/destinations/ras-al-khaimah" />
      </Helmet>

      <div data-testid="page-ras-al-khaimah" className="min-h-screen bg-white dark:bg-slate-950">
        <SubtleSkyBackground />
        <PublicNav variant="transparent" />

        {/* Hero Section - Cinematic Desert Vibes */}
        <section ref={heroRef} className="relative min-h-[90vh] overflow-hidden">
          {/* Background Image with Parallax */}
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: "url('/cards/ras-al-khaimah.webp')",
              }}
            />
            {/* Gradient Overlay - Desert sunset colors */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />
            <div className="absolute inset-0 bg-gradient-to-r from-amber-900/30 via-transparent to-cyan-900/20" />
          </motion.div>

          {/* Hero Content */}
          <div className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] px-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-4"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 text-amber-200 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                Hidden Gem of the Emirates
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 font-chillax"
            >
              Ras Al Khaimah
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl md:text-2xl text-white/90 max-w-3xl mb-4"
            >
              Where mountains meet the sea, and ancient heritage meets the future of entertainment
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-lg text-amber-300/90 font-medium mb-8"
            >
              Home to UAE's First Licensed Casino • World's Longest Zipline • Untouched Natural
              Beauty
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap gap-4 justify-center"
            >
              <Button
                size="lg"
                data-testid="button-explore-rak"
                className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xl shadow-amber-500/25 px-8"
              >
                Explore RAK
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                data-testid="button-wynn-updates"
                variant="outline"
                className="rounded-full border-white/30 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 px-8"
              >
                Wynn Casino Updates
              </Button>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-white/60"
              >
                <ChevronDown className="w-8 h-8" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Wynn Project Status Tracker */}
        <section className="py-16 px-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle at 2px 2px, gold 1px, transparent 0)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>

          <div className="max-w-5xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <div
                data-testid="badge-wynn-tracker"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-4"
              >
                <Building2 className="w-4 h-4" />
                Live Project Tracker
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 font-chillax">
                {WYNN_STATUS.name}
              </h2>
              <p className="text-slate-400">The First Licensed Casino in the UAE</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl"
            >
              {/* Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-amber-400 font-semibold">{WYNN_STATUS.status}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Expected Opening:{" "}
                    <span className="text-white font-semibold">{WYNN_STATUS.expectedOpening}</span>
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>Construction Progress</span>
                  <span className="text-amber-400 font-bold">{WYNN_STATUS.progress}%</span>
                </div>
                <div
                  data-testid="progress-bar-wynn"
                  className="h-3 bg-slate-700 rounded-full overflow-hidden"
                >
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${WYNN_STATUS.progress}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 rounded-full"
                  />
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {WYNN_STATUS.features.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    data-testid={`wynn-feature-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-2 text-slate-300"
                  >
                    <Star className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Interactive Zones Map */}
        <section className="py-20 px-6 bg-white dark:bg-slate-950">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 font-chillax">
                Explore Three Distinct Worlds
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                From island luxury to mountain adventures and desert heritage, RAK offers diverse
                experiences
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {ZONES.map((zone, idx) => (
                <motion.div
                  key={zone.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.15 }}
                  className="group"
                >
                  <Card
                    data-testid={`card-zone-${zone.id}`}
                    className={`overflow-hidden cursor-pointer transition-all duration-500 h-full border-0 shadow-xl hover:shadow-2xl ${
                      selectedZone === zone.id ? "ring-2 ring-amber-500" : ""
                    }`}
                    onClick={() => setSelectedZone(selectedZone === zone.id ? null : zone.id)}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={zone.image}
                        alt={zone.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div
                        className={`absolute inset-0 bg-gradient-to-t ${zone.color} opacity-60 mix-blend-multiply`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <zone.icon className="w-5 h-5 text-white" />
                          <span className="text-white/80 text-sm">{zone.subtitle}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white font-chillax">{zone.name}</h3>
                      </div>
                    </div>

                    <CardContent className="p-6 bg-white dark:bg-slate-900">
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                        {zone.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {zone.highlights.map((highlight, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Articles Grid */}
        <section className="py-20 px-6 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 font-chillax">
                Essential RAK Guides
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                In-depth articles to help you plan your perfect trip
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {FEATURED_ARTICLES.map((article, idx) => (
                <motion.article
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="group"
                >
                  <Link href={article.href} data-testid={`link-article-${idx}`}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer h-full">
                      <div className="relative aspect-[3/2] overflow-hidden">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-amber-600 dark:text-amber-400 text-xs font-semibold">
                            {article.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{article.readTime}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Info Section */}
        <section className="py-16 px-6 bg-gradient-to-br from-amber-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
          <div className="max-w-5xl mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Plane, label: "From Dubai", value: "1 Hour Drive", color: "text-cyan-600" },
                { icon: Sun, label: "Best Season", value: "Oct - Apr", color: "text-amber-600" },
                {
                  icon: Hotel,
                  label: "Avg. Hotel",
                  value: "30% < Dubai",
                  color: "text-emerald-600",
                },
                {
                  icon: Trophy,
                  label: "Activities",
                  value: "50+ Unique",
                  color: "text-primary",
                },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  data-testid={`stat-card-${idx}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg text-center"
                >
                  <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">{stat.label}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-6 bg-white dark:bg-slate-950">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 font-chillax">
                Frequently Asked Questions
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Everything you need to know about Ras Al Khaimah
              </p>
            </motion.div>

            <Accordion type="single" collapsible className="space-y-4">
              {FAQ_DATA.map((faq, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <AccordionItem
                    value={`faq-${idx}`}
                    data-testid={`faq-item-${idx}`}
                    className="bg-slate-50 dark:bg-slate-900 rounded-xl px-6 border-0"
                  >
                    <AccordionTrigger className="text-left text-slate-900 dark:text-white hover:no-underline py-5">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-slate-600 dark:text-slate-400 pb-5">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                backgroundSize: "30px 30px",
              }}
            />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 font-chillax">
                Ready to Discover RAK?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Start planning your adventure to UAE's most exciting emerging destination
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button
                  size="lg"
                  data-testid="button-browse-hotels"
                  className="rounded-full bg-white text-amber-600 hover:bg-white/90 shadow-xl px-8"
                >
                  <Hotel className="w-5 h-5 mr-2" />
                  Browse Hotels
                </Button>
                <Button
                  size="lg"
                  data-testid="button-explore-attractions"
                  variant="outline"
                  className="rounded-full border-white/50 text-white bg-white/10 hover:bg-white/20 px-8"
                >
                  <Compass className="w-5 h-5 mr-2" />
                  Explore Attractions
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Bus, Star, MapPin, ArrowLeft, Search } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import type { Content } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

const defaultPlaceholderImages = [
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1494515843206-f3117d3f51b7?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=400&fit=crop",
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

function TransportCard({ contents, index }: { contents: Content; index: number }) {
  const imageUrl = contents.heroImage || defaultPlaceholderImages[index % defaultPlaceholderImages.length];
  
  return (
    <motion.div variants={fadeInUp}>
      <Link href={`/transport/${contents.slug}`}>
        <Card className="group overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer">
          <div className="aspect-[16/10] overflow-hidden">
            <img 
              src={imageUrl} 
              alt={contents.heroImageAlt || contents.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            />
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-[#6443F4] text-[#6443F4]" />
                <span className="font-medium">4.6</span>
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Dubai, UAE
              </span>
            </div>
            <h3 
              className="font-semibold text-lg text-slate-900 dark:text-slate-100 line-clamp-2 mb-2 group-hover:text-[#6443F4] transition-colors"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            >
              {contents.title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
              {contents.metaDescription || "Get around Dubai with ease using this transport option."}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Transport Guide</span>
              <span className="font-bold text-[#6443F4]">Learn More</span>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

function TransportCardSkeleton() {
  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md animate-pulse">
      <div className="aspect-[16/10] bg-slate-200 dark:bg-slate-800" />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2 w-3/4" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-1" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-4" />
        <div className="flex items-center justify-between">
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    </Card>
  );
}

function PlaceholderTransportCard({ index }: { index: number }) {
  const placeholderData = [
    { title: "Dubai Metro", desc: "Fast, efficient rail system connecting major destinations across the city" },
    { title: "Dubai Tram", desc: "Modern tram service along Dubai Marina and JBR" },
    { title: "Dubai Taxi", desc: "Reliable taxi services available 24/7 across the emirate" },
    { title: "RTA Bus Network", desc: "Comprehensive bus routes covering all areas of Dubai" },
  ];
  const data = placeholderData[index % placeholderData.length];
  const imageUrl = defaultPlaceholderImages[index % defaultPlaceholderImages.length];
  
  return (
    <motion.div variants={fadeInUp}>
      <Card className="group overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer">
        <div className="aspect-[16/10] overflow-hidden">
          <img 
            src={imageUrl} 
            alt={data.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          />
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium">4.7</span>
            </span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              Dubai, UAE
            </span>
          </div>
          <h3 
            className="font-semibold text-lg text-slate-900 dark:text-slate-100 line-clamp-2 mb-2 group-hover:text-[#6443F4] transition-colors"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          >
            {data.title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
            {data.desc}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">Transport Guide</span>
            <span className="font-bold text-[#6443F4]">Learn More</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default function PublicTransport() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: allContent, isLoading } = useQuery<Content[]>({
    queryKey: ["/api/contents?status=published"],
  });

  const transportItems = allContent?.filter(c => c.type === "transport") || [];
  const filteredTransport = searchQuery 
    ? transportItems.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : transportItems;

  return (
    <div className="bg-white dark:bg-slate-950 min-h-screen relative">
      <SubtleSkyBackground />
      <PublicNav variant="transparent" />

      <section className="pt-32 pb-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link href="/" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-[#6443F4] mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#6443F4]/10 dark:bg-[#6443F4]/20 flex items-center justify-center">
                <Bus className="w-8 h-8 text-[#6443F4]" />
              </div>
              <div>
                <h1 
                  className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100"
                  style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                >
                  Getting Around Dubai
                </h1>
                <p className="text-slate-600 dark:text-slate-400">Your complete guide to Dubai transportation</p>
              </div>
            </div>
            
            <div className="mt-8 max-w-xl">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-2 flex items-center gap-2 shadow-lg border border-slate-200 dark:border-slate-800">
                <Search className="w-5 h-5 text-slate-400 ml-3" />
                <input
                  type="text"
                  placeholder="Search transport options..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  data-testid="input-search-transport"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <p className="text-slate-500 dark:text-slate-400">
              {isLoading ? "Loading..." : `${filteredTransport.length} transport options found`}
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {isLoading ? (
              [0, 1, 2, 3, 4, 5].map((index) => (
                <TransportCardSkeleton key={index} />
              ))
            ) : filteredTransport.length > 0 ? (
              filteredTransport.map((item, index) => (
                <TransportCard key={item.id} contents={item} index={index} />
              ))
            ) : (
              [0, 1, 2, 3].map((index) => (
                <PlaceholderTransportCard key={index} index={index} />
              ))
            )}
          </motion.div>
        </div>
      </section>

      <section className="py-12 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="p-8 bg-slate-900 dark:bg-slate-800 border-0 text-white">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 
                    className="text-2xl font-bold mb-2"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    Plan Your Dubai Trip
                  </h3>
                  <p className="text-white/80">Calculate costs, find events, and explore more</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/tools/budget">
                    <Button className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white" data-testid="link-budget">
                      Budget Calculator
                    </Button>
                  </Link>
                  <Link href="/tools/currency">
                    <Button variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10" data-testid="link-currency">
                      Currency Converter
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

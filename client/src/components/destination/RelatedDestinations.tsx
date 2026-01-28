/**
 * RelatedDestinations Component
 * Shows links to other destinations for internal linking and SEO.
 */

import { Link } from "wouter";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, Globe } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface RelatedDestinationsProps {
  currentDestination: string;
  currentCountry?: string;
}

// Destination data for internal linking
const DESTINATIONS = [
  { id: "dubai", name: "Dubai", country: "UAE", region: "Middle East" },
  { id: "abu-dhabi", name: "Abu Dhabi", country: "UAE", region: "Middle East" },
  { id: "paris", name: "Paris", country: "France", region: "Europe" },
  { id: "london", name: "London", country: "UK", region: "Europe" },
  { id: "barcelona", name: "Barcelona", country: "Spain", region: "Europe" },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", region: "Europe" },
  { id: "rome", name: "Rome", country: "Italy", region: "Europe" },
  { id: "istanbul", name: "Istanbul", country: "Turkey", region: "Europe" },
  { id: "tokyo", name: "Tokyo", country: "Japan", region: "Asia" },
  { id: "singapore", name: "Singapore", country: "Singapore", region: "Asia" },
  { id: "bangkok", name: "Bangkok", country: "Thailand", region: "Asia" },
  { id: "hong-kong", name: "Hong Kong", country: "China", region: "Asia" },
  { id: "new-york", name: "New York", country: "USA", region: "Americas" },
  { id: "los-angeles", name: "Los Angeles", country: "USA", region: "Americas" },
  { id: "miami", name: "Miami", country: "USA", region: "Americas" },
  { id: "las-vegas", name: "Las Vegas", country: "USA", region: "Americas" },
];

export function RelatedDestinations({
  currentDestination,
  currentCountry,
}: RelatedDestinationsProps) {
  const { localePath } = useLocale();

  // Find current destination data
  const current = DESTINATIONS.find(
    d =>
      d.id === currentDestination.toLowerCase() ||
      d.name.toLowerCase() === currentDestination.toLowerCase()
  );

  // Get related destinations - prioritize same country/region
  const getRelatedDestinations = () => {
    const others = DESTINATIONS.filter(d => d.id !== current?.id);

    // Same country first
    const sameCountry = others.filter(d => d.country === current?.country);

    // Same region second
    const sameRegion = others.filter(
      d => d.region === current?.region && d.country !== current?.country
    );

    // Different regions
    const otherRegions = others.filter(d => d.region !== current?.region);

    // Combine and limit
    return [...sameCountry, ...sameRegion, ...otherRegions].slice(0, 6);
  };

  const relatedDestinations = getRelatedDestinations();

  if (relatedDestinations.length === 0) return null;

  return (
    <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2
                className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                Explore Other Destinations
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Discover more amazing places around the world
              </p>
            </div>
            <Link
              href={localePath("/destinations")}
              className="hidden sm:flex items-center gap-2 text-[#6443F4] hover:text-[#5539d4] font-medium transition-colors"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Destination Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {relatedDestinations.map((dest, index) => (
              <motion.div
                key={dest.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link href={localePath(`/destinations/${dest.id}`)}>
                  <div
                    className={cn(
                      "group relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
                      "hover:border-[#6443F4]/50 hover:shadow-lg transition-all duration-300 cursor-pointer"
                    )}
                  >
                    {/* Image */}
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={`/cards/${dest.id}.webp`}
                        alt={`${dest.name} travel guide`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={e => {
                          (e.target as HTMLImageElement).src =
                            `https://placehold.co/400x300/6443F4/white?text=${dest.name}`;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="font-semibold text-white text-sm mb-0.5">{dest.name}</h3>
                      <div className="flex items-center gap-1 text-white/80 text-xs">
                        <MapPin className="w-3 h-3" />
                        <span>{dest.country}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Mobile View All Link */}
          <div className="mt-6 text-center sm:hidden">
            <Link
              href={localePath("/destinations")}
              className="inline-flex items-center gap-2 text-[#6443F4] hover:text-[#5539d4] font-medium transition-colors"
            >
              <Globe className="w-4 h-4" />
              View all destinations
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

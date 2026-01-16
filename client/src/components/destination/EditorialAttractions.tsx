/**
 * EditorialAttractions Section - Premium Editorial Style
 * Large images with minimal text, feels like a travel magazine feature.
 * Images lead, text supports - NOT UI widgets or card grids.
 */

import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Clock } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/animations";
import type { Experience } from "@/types/destination";

interface EditorialAttractionsProps {
  experiences: Experience[];
  destinationName: string;
  destinationSlug: string;
}

export function EditorialAttractions({ 
  experiences, 
  destinationName,
  destinationSlug 
}: EditorialAttractionsProps) {
  if (!experiences || experiences.length === 0) {
    return null;
  }

  const featuredAttraction = experiences[0];
  const secondaryAttractions = experiences.slice(1, 5);

  return (
    <section 
      className="relative py-16 md:py-24 bg-transparent"
      data-testid="section-editorial-attractions"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full text-xs font-semibold tracking-[0.15em] uppercase bg-primary/10 text-primary mb-4">
            Must-See Attractions
          </span>
          <h2 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          >
            Explore {destinationName}
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
            Iconic landmarks and hidden gems that define the soul of {destinationName}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative group overflow-hidden rounded-xl lg:rounded-2xl min-h-[400px] md:min-h-[500px] lg:min-h-full"
          >
            <img
              src={featuredAttraction.imageUrl || `/cards/${destinationSlug}.webp`}
              alt={featuredAttraction.imageAlt || featuredAttraction.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            
            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 lg:p-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm text-white border border-white/20">
                  <MapPin className="w-3 h-3" />
                  Featured
                </span>
                {featuredAttraction.duration && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm text-white border border-white/20">
                    <Clock className="w-3 h-3" />
                    {featuredAttraction.duration}
                  </span>
                )}
              </div>
              <h3 
                className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3"
                style={{ 
                  fontFamily: "'Chillax', var(--font-sans)",
                  textShadow: "0 2px 20px rgba(0,0,0,0.5)"
                }}
                data-testid={`attraction-featured-${featuredAttraction.id}`}
              >
                {featuredAttraction.title}
              </h3>
              <p 
                className="text-white/85 text-base md:text-lg mb-6 max-w-lg line-clamp-3"
                style={{ textShadow: "0 1px 10px rgba(0,0,0,0.4)" }}
              >
                {featuredAttraction.description}
              </p>
              <Button 
                variant="outline" 
                className="w-fit bg-white/10 backdrop-blur-sm border-white/30 text-white group/btn"
              >
                Discover More
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </div>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 gap-4 md:gap-6"
          >
            {secondaryAttractions.map((attraction, index) => (
              <motion.div
                key={attraction.id}
                variants={staggerItem}
                className="relative group overflow-hidden rounded-lg lg:rounded-xl min-h-[200px] md:min-h-[240px]"
              >
                <img
                  src={attraction.imageUrl || `/cards/${destinationSlug}.webp`}
                  alt={attraction.imageAlt || attraction.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                
                <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-5">
                  <h4 
                    className="text-base md:text-lg font-bold text-white mb-1 line-clamp-2"
                    style={{ textShadow: "0 1px 10px rgba(0,0,0,0.5)" }}
                    data-testid={`attraction-secondary-${attraction.id}`}
                  >
                    {attraction.title}
                  </h4>
                  {attraction.duration && (
                    <span className="text-white/70 text-xs md:text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {attraction.duration}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-10 md:mt-14"
        >
          <Link href={`/destinations/${destinationSlug}/attractions`}>
            <Button size="lg" className="group/btn">
              View All Attractions
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

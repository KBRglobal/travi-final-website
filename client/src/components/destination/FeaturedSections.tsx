/**
 * Featured Sections Components - Image-led destination contents
 * CMS Contract: "No image = No section" - components only render with valid imagery
 */

import { Link } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Star, ArrowRight, Camera } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { editorialStagger, revealFromBlur } from "@/lib/animations";
import type { FeaturedAttraction, FeaturedArea, FeaturedHighlight } from "@shared/schema";

interface FeaturedAttractionsProps {
  attractions: FeaturedAttraction[];
  destinationName: string;
  destinationId?: string;
}

interface FeaturedAreasProps {
  areas: FeaturedArea[];
  destinationName: string;
}

interface FeaturedHighlightsProps {
  highlights: FeaturedHighlight[];
  destinationName: string;
}

/**
 * Featured Attractions Section
 * Displays top attractions with images, titles, and optional descriptions
 * CMS Contract: Only renders if at least one active attraction has an image
 */
export function FeaturedAttractions({ attractions, destinationName, destinationId }: FeaturedAttractionsProps) {
  const activeAttractions = attractions
    .filter(a => a.isActive && a.image)
    .sort((a, b) => a.order - b.order);
  
  if (activeAttractions.length === 0) return null;
  
  return (
    <section className="py-20 px-4" data-testid="section-featured-attractions">
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={revealFromBlur}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Top Attractions in {destinationName}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover the must-see experiences and iconic landmarks
          </p>
        </motion.div>
        
        <motion.div
          variants={editorialStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {activeAttractions.map((attraction) => (
            <motion.div key={attraction.id} variants={revealFromBlur}>
              <AttractionCard attraction={attraction} />
            </motion.div>
          ))}
        </motion.div>

        {destinationId && (
          <motion.div
            variants={revealFromBlur}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mt-10"
          >
            <Link href={`/destinations/${destinationId}/attractions`}>
              <Button 
                className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white px-8"
                data-testid="button-see-more-attractions"
              >
                See More Attractions
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}

function AttractionCard({ attraction }: { attraction: FeaturedAttraction }) {
  const contents = (
    <Card className="overflow-hidden group cursor-pointer hover-elevate" data-testid={`card-attraction-${attraction.id}`}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={attraction.image}
          alt={attraction.imageAlt}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-semibold text-white mb-1">{attraction.title}</h3>
          {attraction.shortDescription && (
            <p className="text-sm text-white/80 line-clamp-2">{attraction.shortDescription}</p>
          )}
        </div>
      </div>
    </Card>
  );
  
  if (attraction.slug) {
    return <Link href={attraction.slug}>{contents}</Link>;
  }
  
  return contents;
}

/**
 * Featured Areas Section (Where to Stay)
 * Displays areas with vibe imagery and accommodation information
 * CMS Contract: Only renders if at least one active area has an image
 */
export function FeaturedAreas({ areas, destinationName }: FeaturedAreasProps) {
  const activeAreas = areas
    .filter(a => a.isActive && a.image)
    .sort((a, b) => a.order - b.order);
  
  if (activeAreas.length === 0) return null;
  
  return (
    <section className="py-20 px-4 bg-muted/30" data-testid="section-featured-areas">
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={revealFromBlur}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Where to Stay in {destinationName}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore different neighborhoods and find your perfect base
          </p>
        </motion.div>
        
        <motion.div
          variants={editorialStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {activeAreas.map((area) => (
            <motion.div key={area.id} variants={revealFromBlur}>
              <AreaCard area={area} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function AreaCard({ area }: { area: FeaturedArea }) {
  return (
    <Card className="overflow-hidden group hover-elevate" data-testid={`card-area-${area.id}`}>
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={area.image}
          alt={area.imageAlt}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute top-4 right-4 flex gap-2">
          <Badge variant="secondary" className="bg-white/90 text-foreground">
            {area.vibe}
          </Badge>
          {area.priceLevel && (
            <Badge variant="outline" className="bg-white/90 text-foreground border-white/50">
              {area.priceLevel}
            </Badge>
          )}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <MapPin className="w-4 h-4" />
            <span>Neighborhood</span>
          </div>
          <h3 className="text-xl font-semibold text-white">{area.name}</h3>
        </div>
      </div>
      {area.shortDescription && (
        <div className="p-4">
          <p className="text-sm text-muted-foreground">{area.shortDescription}</p>
        </div>
      )}
    </Card>
  );
}

/**
 * Featured Highlights Section
 * Displays stunning visual highlights with captions
 * CMS Contract: Only renders if at least one active highlight has an image
 */
export function FeaturedHighlights({ highlights, destinationName }: FeaturedHighlightsProps) {
  const activeHighlights = highlights
    .filter(h => h.isActive && h.image)
    .sort((a, b) => a.order - b.order);
  
  if (activeHighlights.length === 0) return null;
  
  return (
    <section className="py-20 px-4" data-testid="section-featured-highlights">
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={revealFromBlur}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Visual Highlights of {destinationName}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stunning moments captured from around the destination
          </p>
        </motion.div>
        
        {/* Masonry-style grid for visual impact */}
        <motion.div
          variants={editorialStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {activeHighlights.map((highlight, index) => (
            <motion.div 
              key={highlight.id} 
              variants={revealFromBlur}
              className={index === 0 ? "col-span-2 row-span-2" : ""}
            >
              <HighlightCard highlight={highlight} isLarge={index === 0} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function HighlightCard({ highlight, isLarge }: { highlight: FeaturedHighlight; isLarge?: boolean }) {
  const contents = (
    <div 
      className="relative overflow-hidden rounded-lg group cursor-pointer h-full"
      data-testid={`card-highlight-${highlight.id}`}
    >
      <div className={`relative ${isLarge ? 'aspect-square' : 'aspect-[4/5]'} overflow-hidden`}>
        <img
          src={highlight.image}
          alt={highlight.imageAlt}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="flex items-center gap-2 text-white/80 text-xs mb-1">
            <Camera className="w-3 h-3" />
            <span>Highlight</span>
          </div>
          <h3 className={`font-semibold text-white ${isLarge ? 'text-lg' : 'text-sm'}`}>{highlight.title}</h3>
          {highlight.caption && (
            <p className="text-xs text-white/80 mt-1 line-clamp-2">{highlight.caption}</p>
          )}
        </div>
      </div>
    </div>
  );
  
  if (highlight.linkUrl) {
    return <Link href={highlight.linkUrl}>{contents}</Link>;
  }
  
  return contents;
}

/**
 * Hook to check if any featured sections have contents
 * Useful for conditional rendering of section dividers
 */
export function hasFeaturedContent(
  attractions: FeaturedAttraction[],
  areas: FeaturedArea[],
  highlights: FeaturedHighlight[]
): boolean {
  const hasAttractions = attractions.some(a => a.isActive && a.image);
  const hasAreas = areas.some(a => a.isActive && a.image);
  const hasHighlights = highlights.some(h => h.isActive && h.image);
  
  return hasAttractions || hasAreas || hasHighlights;
}

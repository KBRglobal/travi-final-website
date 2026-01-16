/**
 * VisualHighlights Section - Asymmetric Gallery Design
 * Clean, premium layout with visual hierarchy.
 * Primary block on left (2 rows), secondary blocks stacked on right.
 * Less cluttered, more breathing room, still impactful.
 */

import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

interface HighlightBlock {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
  link: string;
  linkText: string;
}

interface VisualHighlightsProps {
  destinationName: string;
  destinationSlug: string;
  blocks?: HighlightBlock[];
}

export function VisualHighlights({ 
  destinationName, 
  destinationSlug,
  blocks 
}: VisualHighlightsProps) {
  const defaultBlocks: HighlightBlock[] = [
    {
      id: "attractions",
      title: "Iconic Attractions",
      subtitle: `Must-see landmarks of ${destinationName}`,
      imageUrl: `/destinations-hero/${destinationSlug}/attractions-highlight.webp`,
      imageAlt: `Top attractions in ${destinationName}`,
      link: `/destinations/${destinationSlug}/attractions`,
      linkText: "Explore",
    },
    {
      id: "culture",
      title: "Culture & Lifestyle",
      subtitle: `Local traditions and experiences`,
      imageUrl: `/destinations-hero/${destinationSlug}/culture-highlight.webp`,
      imageAlt: `Culture and lifestyle in ${destinationName}`,
      link: `/destinations/${destinationSlug}/culture`,
      linkText: "Discover",
    },
    {
      id: "food",
      title: "Food & Dining",
      subtitle: `Authentic culinary delights`,
      imageUrl: `/destinations-hero/${destinationSlug}/food-highlight.webp`,
      imageAlt: `Food and dining in ${destinationName}`,
      link: `/destinations/${destinationSlug}/dining`,
      linkText: "Taste",
    },
  ];

  const highlightBlocks = blocks && blocks.length > 0 ? blocks : defaultBlocks;
  const [primary, secondary, tertiary] = highlightBlocks;

  return (
    <section 
      className="relative pt-12 md:pt-16 pb-12 md:pb-16 px-4 md:px-6 lg:px-8"
      data-testid="section-visual-highlights"
    >
      <div className="max-w-6xl mx-auto">
        {/* Symmetric Grid: Equal height columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          
          {/* Primary Block - Left side, full height */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: "-50px" }}
          >
            <Link href={primary.link}>
              <div className="relative group h-[400px] md:h-[500px] lg:h-[520px] rounded-3xl overflow-hidden shadow-xl">
                <img
                  src={primary.imageUrl}
                  alt={primary.imageAlt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `/cards/${destinationSlug}.webp`;
                  }}
                />
                
                {/* Subtle gradient overlay - bottom only */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                
                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                  <h3 
                    className="text-2xl md:text-3xl font-semibold text-white mb-2"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                    data-testid="highlight-title-attractions"
                  >
                    {primary.title}
                  </h3>
                  <p className="text-white/80 text-sm mb-3 max-w-xs">
                    {primary.subtitle}
                  </p>
                  <span className="inline-flex items-center text-white text-sm font-medium group-hover:gap-2 transition-all">
                    {primary.linkText}
                    <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Right side - Two stacked blocks with equal combined height */}
          <div className="flex flex-col gap-4 md:gap-5">
            {/* Secondary Block - Top Right */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true, margin: "-50px" }}
              className="flex-1"
            >
              <Link href={secondary.link}>
                <div className="relative group h-[190px] md:h-[240px] lg:h-[250px] rounded-3xl overflow-hidden shadow-xl">
                  <img
                    src={secondary.imageUrl}
                    alt={secondary.imageAlt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `/cards/${destinationSlug}.webp`;
                    }}
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  
                  <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
                    <h3 
                      className="text-lg md:text-xl font-semibold text-white mb-1"
                      style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                      data-testid="highlight-title-culture"
                    >
                      {secondary.title}
                    </h3>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white/75 text-xs md:text-sm line-clamp-1">{secondary.subtitle}</p>
                      <ArrowRight className="w-4 h-4 text-white/75 flex-shrink-0 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Tertiary Block - Bottom Right */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true, margin: "-50px" }}
              className="flex-1"
            >
              <Link href={tertiary.link}>
                <div className="relative group h-[190px] md:h-[240px] lg:h-[250px] rounded-3xl overflow-hidden shadow-xl">
                  <img
                    src={tertiary.imageUrl}
                    alt={tertiary.imageAlt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `/cards/${destinationSlug}.webp`;
                    }}
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  
                  <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
                    <h3 
                      className="text-lg md:text-xl font-semibold text-white mb-1"
                      style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                      data-testid="highlight-title-food"
                    >
                      {tertiary.title}
                    </h3>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white/75 text-xs md:text-sm line-clamp-1">{tertiary.subtitle}</p>
                      <ArrowRight className="w-4 h-4 text-white/75 flex-shrink-0 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}

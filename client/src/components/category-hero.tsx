import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowRight, LucideIcon } from "lucide-react";

interface CategoryHeroProps {
  label: string;
  headline: string;
  description: string;
  primaryCta: {
    text: string;
    href: string;
  };
  secondaryCta?: {
    text: string;
    href: string;
  };
  image: string;
  imageAlt: string;
  accentColor: string;
  accentColorLight: string;
  icon: LucideIcon;
  stats?: Array<{
    value: string;
    label: string;
  }>;
  updatedDate?: string;
}

export function CategoryHero({
  label,
  headline,
  description,
  primaryCta,
  secondaryCta,
  image,
  imageAlt,
  accentColor,
  accentColorLight,
  icon: Icon,
  stats,
  updatedDate,
}: CategoryHeroProps) {
  return (
    <section
      className="relative min-h-[420px] sm:min-h-[480px] lg:min-h-[560px] flex items-center overflow-hidden bg-[#1e1b4b]"
      aria-labelledby="category-hero-heading"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <div className="absolute inset-0 bg-[#6443F4]/10" />
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Column - Left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl"
          >
            {/* Category Label */}
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: `${accentColor}20`,
                  border: `1px solid ${accentColor}40`,
                }}
                aria-hidden="true"
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: accentColor }} />
              </div>
              <span
                className="text-xs sm:text-sm font-semibold tracking-[0.15em] sm:tracking-[0.2em] uppercase"
                style={{ color: accentColor }}
                data-testid="hero-label"
              >
                {label}
              </span>
            </div>

            {/* Headline - Professional proportions with better mobile sizing */}
            <h1
              id="category-hero-heading"
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 leading-[1.15] tracking-[-0.02em]"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              data-testid="hero-headline"
            >
              {headline}
            </h1>

            {/* Description - Better line length for readability */}
            <p
              className="text-base sm:text-lg lg:text-xl text-white/80 mb-6 sm:mb-8 leading-relaxed max-w-[65ch]"
              data-testid="hero-description"
            >
              {description}
            </p>

            {/* CTAs - Min 44px touch targets for mobile */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <Link href={primaryCta.href}>
                <Button
                  size="lg"
                  className="min-h-[44px] px-6 sm:px-8 text-white border-0 bg-[#6443F4] hover:bg-[#5539d4] transition-colors cursor-pointer"
                  data-testid="button-primary-cta"
                >
                  {primaryCta.text}
                  <ArrowRight
                    className="ml-2 w-4 h-4 rtl:ml-0 rtl:mr-2 rtl:rotate-180"
                    aria-hidden="true"
                  />
                </Button>
              </Link>
              {secondaryCta && (
                <Link href={secondaryCta.href}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="min-h-[44px] px-6 sm:px-8 border-white/30 text-white hover:bg-white/10 transition-colors cursor-pointer"
                    data-testid="button-secondary-cta"
                  >
                    {secondaryCta.text}
                  </Button>
                </Link>
              )}
            </div>

            {/* Meta Info */}
            {updatedDate && <p className="text-sm text-white/60">Last updated: {updatedDate}</p>}
          </motion.div>

          {/* Image Column - Right */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="relative aspect-[4/3] lg:aspect-[3/4] rounded-2xl overflow-hidden">
              {/* Image */}
              <img src={image} alt={imageAlt} className="w-full h-full object-cover" />

              {/* Overlay */}
              <div className="absolute inset-0 bg-[#6443F4]/10" />

              {/* Stats Chips */}
              {stats && stats.length > 0 && (
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                  {stats.map((stat, index) => (
                    <Badge
                      key={index}
                      className="px-3 py-2 text-sm font-medium backdrop-blur-md"
                      style={{
                        background: "rgba(255, 255, 255, 0.15)",
                        border: `1px solid ${accentColor}50`,
                        color: "white",
                      }}
                      data-testid={`stat-chip-${index}`}
                    >
                      <span className="font-bold mr-1" style={{ color: accentColor }}>
                        {stat.value}
                      </span>
                      {stat.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

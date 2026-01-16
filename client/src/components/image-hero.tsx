import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface ImageHeroProps {
  backgroundImage: string;
  headline: string;
  subheadline?: string;
  badge?: string;
  ctaText?: string;
  ctaHref?: string;
  alignment?: "left" | "center" | "right";
  height?: "small" | "medium" | "large" | "full";
  overlay?: "light" | "medium" | "heavy";
  className?: string;
}

export function ImageHero({
  backgroundImage,
  headline,
  subheadline,
  badge,
  ctaText,
  ctaHref,
  alignment = "center",
  height = "large",
  overlay = "medium",
  className = "",
}: ImageHeroProps) {
  const heightClasses = {
    small: "min-h-[300px]",
    medium: "min-h-[450px]",
    large: "min-h-[600px]",
    full: "min-h-screen",
  };

  const alignmentClasses = {
    left: "items-start text-left",
    center: "items-center text-center",
    right: "items-end text-right",
  };

  const overlayOpacities = {
    light: "from-black/30 via-black/20 to-transparent",
    medium: "from-black/60 via-black/40 to-black/20",
    heavy: "from-black/80 via-black/60 to-black/40",
  };

  return (
    <section
      className={`relative w-full ${heightClasses[height]} flex flex-col justify-end ${className}`}
      data-testid="image-hero"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
        data-testid="hero-background"
      />
      
      <div
        className={`absolute inset-0 bg-gradient-to-t ${overlayOpacities[overlay]}`}
        data-testid="hero-overlay"
      />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full pb-16 lg:pb-24">
        <div className={`flex flex-col gap-4 ${alignmentClasses[alignment]}`}>
          {badge && (
            <Badge 
              variant="secondary" 
              className="bg-white/20 text-white border-white/30 backdrop-blur-sm"
              data-testid="hero-badge"
            >
              {badge}
            </Badge>
          )}
          
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight max-w-4xl"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            data-testid="hero-headline"
          >
            {headline}
          </h1>
          
          {subheadline && (
            <p 
              className="text-lg md:text-xl text-white/90 max-w-2xl leading-relaxed"
              data-testid="hero-subheadline"
            >
              {subheadline}
            </p>
          )}
          
          {ctaText && ctaHref && (
            <div className="mt-4">
              <Link href={ctaHref}>
                <Button 
                  size="lg" 
                  className="bg-white text-gray-900 hover:bg-white/90 font-medium"
                  data-testid="hero-cta"
                >
                  {ctaText}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

interface CompactHeroProps {
  backgroundImage: string;
  title: string;
  subtitle?: string;
  className?: string;
}

export function CompactHero({
  backgroundImage,
  title,
  subtitle,
  className = "",
}: CompactHeroProps) {
  return (
    <section
      className={`relative w-full min-h-[280px] flex flex-col justify-end ${className}`}
      data-testid="compact-hero"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full pb-10">
        <h1 
          className="text-3xl md:text-4xl font-bold text-white tracking-tight"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          data-testid="compact-hero-title"
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-white/80 text-lg" data-testid="compact-hero-subtitle">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}

import { LucideIcon, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export interface DubaiHeroBadge {
  label?: string;
  text?: string; // Backward-compatible alias for label
  icon?: LucideIcon;
  variant?: "default" | "outline" | "highlight" | "secondary";
}

export interface DubaiHeroProps {
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  backgroundImage?: string; // Backward-compatible alias for image
  imageAlt?: string;
  badges?: DubaiHeroBadge[];
  topBadge?: string;
  ctaLabel?: string;
  ctaIcon?: LucideIcon;
  onCtaClick?: () => void;
  checkmarks?: string[];
  showScrollIndicator?: boolean;
  minHeight?: string;
  overlay?: "dark" | "light" | "gradient";
  stats?: Array<{ label: string; value: string }>; // Backward-compatible for templates using stats
}

export function DubaiHero({
  title,
  subtitle,
  description,
  image,
  backgroundImage,
  imageAlt,
  badges,
  topBadge,
  ctaLabel,
  ctaIcon: CtaIcon,
  onCtaClick,
  checkmarks,
  showScrollIndicator = true,
  minHeight = "85vh",
  overlay = "gradient",
}: DubaiHeroProps) {
  const heroImage = image || backgroundImage;
  const overlayClasses = {
    dark: "bg-black/70",
    light: "bg-black/40",
    gradient: "bg-gradient-to-t from-black/90 via-black/50 to-black/30",
  };

  return (
    <section 
      className="relative flex items-center justify-center overflow-hidden"
      style={{ minHeight }}
    >
      {heroImage && (
        <div className="absolute inset-0">
          <img 
            src={heroImage}
            alt={imageAlt || title}
            className="w-full h-full object-cover"
            loading="eager"
            {...{ fetchpriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>}
          />
          <div className={`absolute inset-0 ${overlayClasses[overlay]}`} />
        </div>
      )}
      
      {!heroImage && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-primary/80" />
      )}
      
      <motion.div 
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {topBadge && (
          <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm mb-6 text-sm px-4 py-1.5">
            {topBadge}
          </Badge>
        )}

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 tracking-tight">
          {title}
        </h1>

        {subtitle && (
          <h2 className="text-xl sm:text-2xl md:text-3xl text-white/90 mb-6 font-light max-w-3xl mx-auto">
            {subtitle}
          </h2>
        )}

        {description && (
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            {description}
          </p>
        )}

        {badges && badges.length > 0 && (
          <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
            {badges.map((badge, index) => {
              const Icon = badge.icon;
              const badgeText = badge.text || badge.label || "";
              const variantClasses = {
                default: "bg-white/10 text-white border-white/30",
                outline: "bg-white/10 text-white border-white/30",
                highlight: "bg-amber-500/20 text-amber-300 border-amber-500/30",
                secondary: "bg-white/20 text-white border-white/40",
              };
              return (
                <Badge 
                  key={index}
                  variant="outline" 
                  className={`${variantClasses[badge.variant || "default"]} backdrop-blur-sm px-4 py-2`}
                >
                  {Icon && <Icon className="w-4 h-4 mr-2" />}
                  {badgeText}
                </Badge>
              );
            })}
          </div>
        )}
        
        {ctaLabel && (
          <Button
            size="lg"
            className="text-lg px-8 py-6 rounded-full shadow-2xl"
            onClick={onCtaClick}
            data-testid="button-dubai-hero-cta"
          >
            {CtaIcon && <CtaIcon className="w-5 h-5 mr-2" />}
            {ctaLabel}
          </Button>
        )}

        {checkmarks && checkmarks.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 mt-8 text-white/80 text-sm">
            {checkmarks.map((item, index) => (
              <span key={index} className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {item}
              </span>
            ))}
          </div>
        )}
      </motion.div>
      
      {showScrollIndicator && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-8 h-8 text-white/60" />
        </div>
      )}
    </section>
  );
}

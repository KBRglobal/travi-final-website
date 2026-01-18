import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export interface DubaiCTAProps {
  title: string;
  subtitle?: string;
  description?: string;
  primaryLabel: string;
  primaryIcon?: LucideIcon;
  onPrimaryClick?: () => void;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryIcon?: LucideIcon;
  onSecondaryClick?: () => void;
  secondaryHref?: string;
  badges?: string[];
  variant?: "default" | "gradient" | "image";
  backgroundImage?: string;
}

export function DubaiCTA({
  title,
  subtitle,
  description,
  primaryLabel,
  primaryIcon: PrimaryIcon,
  onPrimaryClick,
  primaryHref,
  secondaryLabel,
  secondaryIcon: SecondaryIcon,
  onSecondaryClick,
  secondaryHref,
  badges,
  variant = "default",
  backgroundImage,
}: DubaiCTAProps) {
  const bgClasses = {
    default: "bg-primary text-primary-foreground",
    gradient: "bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground",
    image: "text-white",
  };

  const PrimaryButton = (
    <Button
      size="lg"
      className={variant === "default" || variant === "gradient" 
        ? "bg-white text-primary hover:bg-white/90 px-8 py-6 text-lg rounded-full shadow-lg"
        : "px-8 py-6 text-lg rounded-full shadow-2xl"
      }
      onClick={onPrimaryClick}
      data-testid="button-dubai-cta-primary"
    >
      {PrimaryIcon && <PrimaryIcon className="w-5 h-5 mr-2" />}
      {primaryLabel}
    </Button>
  );

  const SecondaryButton = secondaryLabel && (
    <Button
      size="lg"
      variant="outline"
      className={variant === "default" || variant === "gradient"
        ? "border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-full"
        : "border-white/30 text-white hover:bg-white/10 backdrop-blur-sm px-8 py-6 text-lg rounded-full"
      }
      onClick={onSecondaryClick}
      data-testid="button-dubai-cta-secondary"
    >
      {SecondaryIcon && <SecondaryIcon className="w-5 h-5 mr-2" />}
      {secondaryLabel}
    </Button>
  );

  return (
    <section className={`py-20 relative overflow-hidden ${bgClasses[variant]}`}>
      {variant === "image" && backgroundImage && (
        <>
          <div className="absolute inset-0">
            <img 
              src={backgroundImage}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/80" />
        </>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {badges && badges.length > 0 && (
            <div className="flex justify-center gap-2 mb-6 flex-wrap">
              {badges.map((badge, index) => (
                <Badge 
                  key={index}
                  variant="outline"
                  className="bg-white/10 border-white/30 text-inherit backdrop-blur-sm"
                >
                  {badge}
                </Badge>
              ))}
            </div>
          )}

          {subtitle && (
            <p className="text-lg opacity-90 mb-2">{subtitle}</p>
          )}

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {title}
          </h2>

          {description && (
            <p className="text-lg opacity-80 mb-8 max-w-2xl mx-auto">
              {description}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {primaryHref ? (
              <a href={primaryHref}>{PrimaryButton}</a>
            ) : (
              PrimaryButton
            )}
            
            {secondaryLabel && (
              secondaryHref ? (
                <a href={secondaryHref}>{SecondaryButton}</a>
              ) : (
                SecondaryButton
              )
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

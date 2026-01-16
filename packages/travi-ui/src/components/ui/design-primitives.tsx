import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";
import { forwardRef } from "react";

/**
 * TRAVI Design System Primitives
 * These components enforce consistent typography and styling across the entire site.
 * 
 * Typography: Chillax for headlines, Satoshi (default) for body
 * Primary CTA: Solid purple (#6443F4) with rounded-full
 * Backgrounds: Clean white/slate with SubtleSkyBackground
 */

// Chillax font style object for headlines
export const CHILLAX_FONT = { fontFamily: "'Chillax', var(--font-sans)" } as const;

// Primary brand color
export const BRAND_PURPLE = "#6443F4";
export const BRAND_PURPLE_HOVER = "#5539d4";

// Headline component with Chillax font
interface HeadlineProps {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  children: React.ReactNode;
  className?: string;
}

export function Headline({ as: Component = "h2", children, className }: HeadlineProps) {
  return (
    <Component 
      className={cn("font-semibold text-slate-900 dark:text-white", className)}
      style={CHILLAX_FONT}
    >
      {children}
    </Component>
  );
}

// Primary CTA Button - solid purple, rounded-full
export const PrimaryButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          "rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white border-0",
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
PrimaryButton.displayName = "PrimaryButton";

// Secondary Button - outline style with purple border
export const SecondaryButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="outline"
        className={cn(
          "rounded-full border-[#6443F4] text-[#6443F4] hover:bg-[#6443F4] hover:text-white",
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
SecondaryButton.displayName = "SecondaryButton";

// Section wrapper with consistent background
interface PageSectionProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "alt";
}

export function PageSection({ children, className, variant = "default" }: PageSectionProps) {
  return (
    <section
      className={cn(
        "py-16 md:py-24",
        variant === "default" 
          ? "bg-white dark:bg-slate-950" 
          : "bg-slate-50 dark:bg-slate-900",
        className
      )}
    >
      {children}
    </section>
  );
}

// Consistent tagline/slogan - use this across all pages
export const BRAND_TAGLINE = "Your Trusted Travel Resource";
export const BRAND_DESCRIPTION = "Comprehensive travel information for 16 destinations worldwide";

// Hero eyebrow text style
export function EyebrowText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      "text-xs font-medium tracking-[3px] text-slate-400 dark:text-slate-500 uppercase",
      className
    )}>
      {children}
    </span>
  );
}

// Section header with consistent styling
interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}

export function SectionHeader({ eyebrow, title, subtitle, centered = true, className }: SectionHeaderProps) {
  return (
    <div className={cn(
      "mb-12",
      centered && "text-center",
      className
    )}>
      {eyebrow && (
        <div className="flex items-center gap-3 mb-4 justify-center">
          <span className="text-[#6443F4] text-xs" aria-hidden="true">◆</span>
          <EyebrowText>{eyebrow}</EyebrowText>
        </div>
      )}
      <Headline 
        as="h2" 
        className="text-3xl sm:text-4xl md:text-5xl mb-4"
      >
        {title}
      </Headline>
      {subtitle && (
        <p className={cn(
          "text-lg text-slate-600 dark:text-slate-400",
          centered && "max-w-2xl mx-auto"
        )}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

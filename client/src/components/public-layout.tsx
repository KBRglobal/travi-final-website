import { Link } from "wouter";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { LiveChatWidget } from "@/components/live-chat-widget";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* =============================================================================
   PageContainer - Main layout wrapper with nav and footer
============================================================================= */

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  navVariant?: "default" | "transparent";
  /** When navVariant is "transparent", specify if hero background is light or dark */
  navTone?: "light" | "dark";
}

export function PageContainer({
  children,
  className,
  navVariant = "default",
  navTone = "dark",
}: Readonly<PageContainerProps>) {
  const { isRTL } = useLocale();

  return (
    <div
      className={cn("min-h-screen flex flex-col", className)}
      dir={isRTL ? "rtl" : "ltr"}
      data-testid="page-container"
    >
      <PublicNav variant={navVariant} transparentTone={navTone} />
      <main className="flex-1" data-testid="page-main">
        {children}
      </main>
      <PublicFooter />
      <LiveChatWidget showFloatingButton={false} />
    </div>
  );
}

// Alias for backwards compatibility
export const PublicLayout = PageContainer;

/* =============================================================================
   Section - Consistent section spacing and optional title
============================================================================= */

interface SectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  variant?: "default" | "alternate" | "gradient";
  className?: string;
  id?: string;
}

export function Section({
  children,
  title,
  subtitle,
  variant = "default",
  className,
  id,
}: Readonly<SectionProps>) {
  const { isRTL } = useLocale();

  const variantClasses = {
    default: "bg-background",
    alternate: "bg-muted/50",
    gradient:
      "bg-gradient-to-br from-travi-purple/5 via-travi-purple/5 to-[#F4C542]/5 dark:from-travi-purple/10 dark:via-travi-purple/10 dark:to-[#F4C542]/10",
  };

  return (
    <section
      id={id}
      className={cn("py-[60px]", variantClasses[variant], className)}
      dir={isRTL ? "rtl" : "ltr"}
      data-testid={`section-${id || "default"}`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-[140px]">
        {/* Section Header */}
        {(title || subtitle) && (
          <div className="mb-10" data-testid="section-header">
            {title && (
              <h2
                className="font-heading text-2xl md:text-3xl lg:text-[32px] font-bold text-foreground leading-tight"
                data-testid="section-title"
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className="mt-3 text-base md:text-lg text-muted-foreground max-w-2xl"
                data-testid="section-subtitle"
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Section Content */}
        {children}
      </div>
    </section>
  );
}

/* =============================================================================
   ContentCard - Unified card styling for contents items
============================================================================= */

interface ContentCardProps {
  image?: string;
  title: string;
  description?: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline";
  href?: string;
  className?: string;
  aspectRatio?: "square" | "video" | "portrait";
  showGradientOverlay?: boolean;
}

export function ContentCard({
  image,
  title,
  description,
  badge,
  badgeVariant = "default",
  href,
  className,
  aspectRatio = "video",
  showGradientOverlay = true,
}: Readonly<ContentCardProps>) {
  const { localePath, isRTL } = useLocale();

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
  };

  const cardContent = (
    <Card
      className={cn(
        "group overflow-visible bg-card rounded-[16px] p-0 shadow-[var(--shadow-level-1)] hover-elevate transition-all duration-300",
        className
      )}
      data-testid={`contents-card-${title.toLowerCase().replaceAll(/\s+/g, "-")}`}
    >
      {/* Image Container */}
      {image && (
        <div
          className={cn("relative overflow-hidden rounded-t-[16px]", aspectClasses[aspectRatio])}
        >
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            width={400}
            height={300}
            loading="lazy"
            decoding="async"
            data-testid="contents-card-image"
          />
          {/* Gradient Overlay for image cards */}
          {showGradientOverlay && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
          )}
          {/* Badge on image */}
          {badge && (
            <div className={cn("absolute top-3", isRTL ? "right-3" : "left-3")}>
              <Badge variant={badgeVariant} className="text-xs" data-testid="contents-card-badge">
                {badge}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-5" data-testid="contents-card-body">
        <h3
          className="font-heading text-lg font-semibold text-foreground leading-tight mb-2 line-clamp-2"
          data-testid="contents-card-title"
        >
          {title}
        </h3>
        {description && (
          <p
            className="text-sm text-muted-foreground line-clamp-2"
            data-testid="contents-card-description"
          >
            {description}
          </p>
        )}
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link
        href={localePath(href)}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6443F4] rounded-[16px]"
        data-testid={`contents-card-link-${title.toLowerCase().replaceAll(/\s+/g, "-")}`}
      >
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

/* =============================================================================
   CategoryGrid - Responsive grid layout for contents cards
============================================================================= */

interface CategoryGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function CategoryGrid({ children, columns = 3, className }: Readonly<CategoryGridProps>) {
  const columnClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <div
      className={cn("grid gap-[30px]", columnClasses[columns], className)}
      data-testid="category-grid"
    >
      {children}
    </div>
  );
}

/* =============================================================================
   ContentSection - Combines Section with CategoryGrid for common patterns
============================================================================= */

interface ContentSectionProps {
  title?: string;
  subtitle?: string;
  variant?: "default" | "alternate" | "gradient";
  columns?: 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function ContentSection({
  title,
  subtitle,
  variant = "default",
  columns = 3,
  children,
  className,
  id,
}: Readonly<ContentSectionProps>) {
  return (
    <Section title={title} subtitle={subtitle} variant={variant} className={className} id={id}>
      <CategoryGrid columns={columns}>{children}</CategoryGrid>
    </Section>
  );
}

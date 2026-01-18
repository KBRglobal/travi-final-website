import { ReactNode } from "react";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { SEOHead } from "@/components/seo-head";
import { Breadcrumbs, BreadcrumbItem } from "@/components/breadcrumbs";
import { useLocale } from "@/lib/i18n/LocaleRouter";

interface DubaiPageLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  heroSection?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  canonicalPath?: string;
  ogImage?: string;
  keywords?: string[];
  noIndex?: boolean;
  showBreadcrumbs?: boolean;
  containerClassName?: string;
}

export function DubaiPageLayout({
  title,
  description,
  children,
  heroSection,
  breadcrumbs = [],
  canonicalPath,
  ogImage,
  keywords,
  noIndex = false,
  showBreadcrumbs = true,
  containerClassName = "",
}: DubaiPageLayoutProps) {
  const { isRTL } = useLocale();

  const defaultBreadcrumbs: BreadcrumbItem[] = [
    { label: "Home", labelHe: "בית", href: "/" },
    { label: "Dubai", labelHe: "דובאי", href: "/destinations/dubai" },
  ];

  const allBreadcrumbs = [...defaultBreadcrumbs, ...breadcrumbs];

  return (
    <div 
      className="min-h-screen flex flex-col bg-background"
      dir={isRTL ? "rtl" : "ltr"}
      data-testid="dubai-page-layout"
    >
      <SEOHead
        title={`${title} | Dubai Travel Guide | TRAVI`}
        description={description}
        canonicalPath={canonicalPath}
        ogImage={ogImage}
        keywords={keywords}
        noIndex={noIndex}
      />

      <PublicNav />

      {heroSection && (
        <div data-testid="dubai-hero-section">
          {heroSection}
        </div>
      )}

      <main className="flex-1">
        {showBreadcrumbs && allBreadcrumbs.length > 1 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-4">
            <Breadcrumbs 
              items={allBreadcrumbs.slice(2)}
              showHome={true}
              showDestination={true}
              className="text-sm"
            />
          </div>
        )}

        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${heroSection ? 'py-8' : 'pt-24 pb-12'} ${containerClassName}`}>
          {children}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

interface DubaiHeroProps {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  overlayOpacity?: number;
  children?: ReactNode;
}

export function DubaiHero({
  title,
  subtitle,
  backgroundImage = "/destinations-hero/dubai/dubai/dubai-hero-burj-khalifa-palms-sunset.webp",
  overlayOpacity = 0.5,
  children,
}: DubaiHeroProps) {
  return (
    <div 
      className="relative min-h-[40vh] md:min-h-[50vh] flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${backgroundImage})` }}
      data-testid="dubai-hero"
    >
      <div 
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity }}
        aria-hidden="true"
      />
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 pt-20">
        <h1 
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          data-testid="dubai-hero-title"
        >
          {title}
        </h1>
        {subtitle && (
          <p 
            className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto"
            data-testid="dubai-hero-subtitle"
          >
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

interface DubaiSectionProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function DubaiSection({
  title,
  subtitle,
  children,
  className = "",
}: DubaiSectionProps) {
  return (
    <section className={`py-8 md:py-12 ${className}`} data-testid="dubai-section">
      {(title || subtitle) && (
        <div className="mb-6 md:mb-8">
          {title && (
            <h2 
              className="text-2xl md:text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              data-testid="dubai-section-title"
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-2 text-muted-foreground" data-testid="dubai-section-subtitle">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

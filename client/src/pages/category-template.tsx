import { useState, useMemo, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Search,
  Filter,
  Grid,
  List,
  Loader2,
  MapPin,
  Star,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  X,
} from "lucide-react";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import {
  PageBuilderLiveEditProvider,
  useLiveEdit,
  useIsPageBuilderEditMode,
} from "@/components/page-builder/live-edit-provider";
import { PageBuilderEditableWrapper } from "@/components/page-builder/editable-wrapper";
import {
  HeroSection,
  IntroTextSection,
  CTASection,
  FAQSection,
  ContentGridSection,
} from "@/components/page-builder/section-renderers";
import type { PageSection, Content } from "@shared/schema";

export type CategoryType = "hotels" | "dining" | "shopping" | "districts";

interface CategoryTemplateProps {
  categoryType: CategoryType;
  children?: ReactNode;
  customFilters?: ReactNode;
  customContentGrid?: ReactNode;
  seoConfig?: {
    title: string;
    description: string;
    ogTitle?: string;
    ogDescription?: string;
  };
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const categoryConfig: Record<
  CategoryType,
  {
    contentType: string;
    defaultTitle: string;
    defaultTitleHe: string;
    defaultSubtitle: string;
    defaultSubtitleHe: string;
    defaultImage: string;
    filters: Array<{ id: string; label: string; labelHe: string; options: string[] }>;
  }
> = {
  hotels: {
    contentType: "hotel",
    defaultTitle: "Dubai Hotels & Resorts",
    defaultTitleHe: "מלונות ואתרי נופש בדובאי",
    defaultSubtitle: "Discover world-class accommodations in the heart of Dubai",
    defaultSubtitleHe: "גלו אירוח ברמה עולמית בלב דובאי",
    defaultImage: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1920&h=1080&fit=crop",
    filters: [
      { id: "area", label: "Area", labelHe: "אזור", options: ["All", "Palm Jumeirah", "Downtown", "Marina", "JBR"] },
      { id: "rating", label: "Rating", labelHe: "דירוג", options: ["All", "5 Star", "4 Star", "3 Star"] },
      { id: "vibe", label: "Vibe", labelHe: "אווירה", options: ["All", "Beach", "City", "Romance", "Family"] },
    ],
  },
  dining: {
    contentType: "dining",
    defaultTitle: "Dubai Restaurants & Dining",
    defaultTitleHe: "מסעדות ואוכל בדובאי",
    defaultSubtitle: "From Michelin stars to street food, explore Dubai's culinary scene",
    defaultSubtitleHe: "מכוכבי מישלן ועד אוכל רחוב, גלו את הסצנה הקולינרית של דובאי",
    defaultImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&h=1080&fit=crop",
    filters: [
      { id: "cuisine", label: "Cuisine", labelHe: "מטבח", options: ["All", "Arabic", "Indian", "European", "Asian"] },
      { id: "price", label: "Price", labelHe: "מחיר", options: ["All", "$$$$", "$$$", "$$", "$"] },
      { id: "location", label: "Location", labelHe: "מיקום", options: ["All", "Downtown", "Marina", "DIFC", "JBR"] },
    ],
  },
  shopping: {
    contentType: "shopping",
    defaultTitle: "Dubai Shopping & Malls",
    defaultTitleHe: "קניות וקניונים בדובאי",
    defaultSubtitle: "Experience world-class shopping from mega malls to traditional souks",
    defaultSubtitleHe: "חוו קניות ברמה עולמית ממגה מולים ועד שווקים מסורתיים",
    defaultImage: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1920&h=1080&fit=crop",
    filters: [
      { id: "type", label: "Type", labelHe: "סוג", options: ["All", "Malls", "Souks", "Outlets"] },
      { id: "area", label: "Area", labelHe: "אזור", options: ["All", "Downtown", "Deira", "Marina"] },
    ],
  },
  districts: {
    contentType: "district",
    defaultTitle: "Dubai Districts & Neighborhoods",
    defaultTitleHe: "שכונות ואזורים בדובאי",
    defaultSubtitle: "Explore Dubai's diverse neighborhoods and find your perfect spot",
    defaultSubtitleHe: "גלו את השכונות המגוונות של דובאי ומצאו את המקום המושלם",
    defaultImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&h=1080&fit=crop",
    filters: [
      { id: "character", label: "Character", labelHe: "אופי", options: ["All", "Beach", "Business", "Heritage", "Luxury"] },
      { id: "vibe", label: "Vibe", labelHe: "אווירה", options: ["All", "Family", "Nightlife", "Quiet"] },
    ],
  },
};

async function fetchPageSections(categoryType: CategoryType): Promise<PageSection[]> {
  const response = await fetch(`/api/page-builder/public/${categoryType}`);
  if (!response.ok) {
    return [];
  }
  return response.json();
}

async function fetchContents(contentType: string): Promise<Content[]> {
  const response = await fetch(`/api/public/contents?type=${contentType}&limit=50`);
  if (!response.ok) return [];
  return response.json();
}

function SectionRenderer({
  section,
  isEditMode,
}: {
  section: PageSection;
  isEditMode: boolean;
}) {
  const renderSection = () => {
    switch (section.sectionType) {
      case "hero":
        return <HeroSection section={section} />;
      case "intro_text":
        return <IntroTextSection section={section} />;
      case "cta":
        return <CTASection section={section} />;
      case "faq":
        return <FAQSection section={section} />;
      case "content_grid":
        return <ContentGridSection section={section} />;
      default:
        return null;
    }
  };

  if (!section.isVisible && !isEditMode) return null;

  if (isEditMode) {
    return (
      <PageBuilderEditableWrapper section={section}>
        {renderSection()}
      </PageBuilderEditableWrapper>
    );
  }

  return renderSection();
}

function DefaultHero({
  config,
  locale,
  isRTL,
}: {
  config: typeof categoryConfig.hotels;
  locale: string;
  isRTL: boolean;
}) {
  const title = locale === "he" ? config.defaultTitleHe : config.defaultTitle;
  const subtitle = locale === "he" ? config.defaultSubtitleHe : config.defaultSubtitle;

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      className="relative min-h-[500px] md:min-h-[600px] flex items-center justify-center overflow-hidden"
      data-testid="category-hero"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${config.defaultImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      <div className={cn("relative z-10 container mx-auto px-4 py-16 md:py-24", isRTL && "text-right")}>
        <motion.div variants={staggerContainer} className="max-w-3xl mx-auto text-center space-y-6">
          <motion.h1
            variants={fadeInUp}
            className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white"
          >
            {title}
          </motion.h1>
          <motion.p variants={fadeInUp} className="text-lg md:text-xl max-w-2xl mx-auto text-white/90">
            {subtitle}
          </motion.p>
        </motion.div>
      </div>
    </motion.section>
  );
}

function FilterBar({
  filters,
  selectedFilters,
  onFilterChange,
  searchQuery,
  onSearchChange,
  locale,
  isRTL,
}: {
  filters: typeof categoryConfig.hotels.filters;
  selectedFilters: Record<string, string>;
  onFilterChange: (filterId: string, value: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  locale: string;
  isRTL: boolean;
}) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeInUp}
      className="py-6 bg-muted/30 sticky top-16 z-40 backdrop-blur-md border-b"
      data-testid="category-filter-bar"
    >
      <div className="container mx-auto px-4">
        <div className={cn("flex flex-col md:flex-row gap-4 items-stretch md:items-center", isRTL && "md:flex-row-reverse")}>
          <div className="relative flex-1 max-w-md">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
            <Input
              type="text"
              placeholder={locale === "he" ? "חיפוש..." : "Search..."}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={cn("w-full", isRTL ? "pr-10" : "pl-10")}
              data-testid="input-search"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className={cn("absolute top-1/2 -translate-y-1/2 h-6 w-6", isRTL ? "left-2" : "right-2")}
                onClick={() => onSearchChange("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className={cn("flex flex-wrap gap-3", isRTL && "flex-row-reverse")}>
            {filters.map((filter) => (
              <Select
                key={filter.id}
                value={selectedFilters[filter.id] || "All"}
                onValueChange={(value) => onFilterChange(filter.id, value)}
              >
                <SelectTrigger className="w-[140px]" data-testid={`filter-${filter.id}`}>
                  <SelectValue placeholder={locale === "he" ? filter.labelHe : filter.label} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function ContentCard({ contents, localePath, isRTL }: { contents: Content; localePath: (path: string) => string; isRTL: boolean }) {
  const config = categoryConfig[contents.type as CategoryType] || categoryConfig.hotels;
  const image = contents.featuredImage || contents.heroImage || config.defaultImage;
  const href = localePath(`/${contents.type}s/${contents.slug}`);

  return (
    <Link href={href}>
      <motion.div
        variants={fadeInUp}
        className="h-full"
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className="h-full overflow-hidden group hover-elevate transition-all duration-300"
          data-testid={`contents-card-${contents.slug}`}
        >
          <div className="aspect-[4/3] overflow-hidden relative">
            <img
              src={image}
              alt={contents.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {contents.hotel?.starRating && (
              <div className={cn("absolute top-3 flex items-center gap-1", isRTL ? "right-3" : "left-3")}>
                <Badge className="bg-[#F4C542]/90 text-white border-0">
                  <Star className="w-3 h-3 me-1 fill-current" />
                  {contents.hotel.starRating}
                </Badge>
              </div>
            )}
          </div>
          <CardContent className={cn("p-4 space-y-2", isRTL && "text-right")}>
            <h3 className="font-heading font-bold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {contents.title}
            </h3>
            {contents.excerpt && (
              <p className="text-sm text-muted-foreground line-clamp-2">{contents.excerpt}</p>
            )}
            {(contents.hotel?.location || contents.dining?.location) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{contents.hotel?.location || contents.dining?.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              <span>{isRTL ? "קרא עוד" : "Learn more"}</span>
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}

function ContentGrid({
  contents,
  isLoading,
  localePath,
  isRTL,
  locale,
}: {
  contents: Content[];
  isLoading: boolean;
  localePath: (path: string) => string;
  isRTL: boolean;
  locale: string;
}) {
  if (isLoading) {
    return (
      <section className="py-16" data-testid="contents-grid-loading">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[4/3]" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (contents.length === 0) {
    return (
      <section className="py-16" data-testid="contents-grid-empty">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-lg">
            {locale === "he" ? "לא נמצאו תוצאות" : "No results found"}
          </p>
        </div>
      </section>
    );
  }

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={staggerContainer}
      className="py-16"
      data-testid="contents-grid"
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {contents.map((contents) => (
            <ContentCard key={contents.id} contents={contents} localePath={localePath} isRTL={isRTL} />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function DefaultCTA({ locale, isRTL }: { locale: string; isRTL: boolean }) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeInUp}
      className="py-16 md:py-24 relative overflow-hidden"
      data-testid="category-cta"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80" />
      <div className="container mx-auto px-4 relative z-10">
        <div className={cn("max-w-3xl mx-auto text-center space-y-6", isRTL && "text-right")}>
          <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold text-white">
            {locale === "he" ? "מוכנים לתכנן את הטיול שלכם?" : "Ready to Plan Your Trip?"}
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-white/90">
            {locale === "he"
              ? "צרו קשר עם צוות המומחים שלנו לתכנון חופשה מושלמת"
              : "Contact our expert team to plan your perfect Dubai experience"}
          </motion.p>
          <motion.div variants={fadeInUp}>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/contact">
                {locale === "he" ? "צרו קשר" : "Get in Touch"}
                {isRTL ? <ArrowLeft className="w-4 h-4 ms-2" /> : <ArrowRight className="w-4 h-4 ms-2" />}
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

function CategoryPageContent({
  categoryType,
  sections,
  isLoading: sectionsLoading,
  customFilters,
  customContentGrid,
}: {
  categoryType: CategoryType;
  sections: PageSection[];
  isLoading: boolean;
  customFilters?: ReactNode;
  customContentGrid?: ReactNode;
}) {
  const { locale, isRTL, localePath } = useLocale();
  const isEditMode = useIsPageBuilderEditMode();
  const config = categoryConfig[categoryType];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});

  const { data: contents = [], isLoading: contentsLoading } = useQuery({
    queryKey: [`/api/public/contents`, config.contentType],
    queryFn: () => fetchContents(config.contentType),
    staleTime: 5 * 60 * 1000,
  });

  const filteredContents = useMemo(() => {
    let result = contents;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.excerpt?.toLowerCase().includes(query) ||
          c.metaDescription?.toLowerCase().includes(query)
      );
    }

    Object.entries(selectedFilters).forEach(([filterId, value]) => {
      if (value && value !== "All") {
        result = result.filter((c) => {
          const fieldValue =
            (c as any)[filterId] ||
            (c as any).hotel?.[filterId] ||
            (c as any).dining?.[filterId] ||
            (c as any).district?.[filterId];
          return fieldValue?.toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    return result;
  }, [contents, searchQuery, selectedFilters]);

  const handleFilterChange = (filterId: string, value: string) => {
    setSelectedFilters((prev) => ({ ...prev, [filterId]: value }));
  };

  const heroSection = sections.find((s) => s.sectionType === "hero");
  const introSection = sections.find((s) => s.sectionType === "intro_text");
  const ctaSection = sections.find((s) => s.sectionType === "cta");
  const faqSection = sections.find((s) => s.sectionType === "faq");
  const contentGridSection = sections.find((s) => s.sectionType === "content_grid");

  return (
    <>
      {heroSection ? (
        <SectionRenderer section={heroSection} isEditMode={isEditMode} />
      ) : (
        <DefaultHero config={config} locale={locale} isRTL={isRTL} />
      )}

      {introSection && <SectionRenderer section={introSection} isEditMode={isEditMode} />}

      {customFilters || (
        <FilterBar
          filters={config.filters}
          selectedFilters={selectedFilters}
          onFilterChange={handleFilterChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          locale={locale}
          isRTL={isRTL}
        />
      )}

      {customContentGrid || (
        contentGridSection ? (
          <SectionRenderer section={contentGridSection} isEditMode={isEditMode} />
        ) : (
          <ContentGrid
            contents={filteredContents}
            isLoading={contentsLoading}
            localePath={localePath}
            isRTL={isRTL}
            locale={locale}
          />
        )
      )}

      {ctaSection ? (
        <SectionRenderer section={ctaSection} isEditMode={isEditMode} />
      ) : (
        <DefaultCTA locale={locale} isRTL={isRTL} />
      )}

      {faqSection && <SectionRenderer section={faqSection} isEditMode={isEditMode} />}
    </>
  );
}

export default function CategoryTemplate({
  categoryType,
  children,
  customFilters,
  customContentGrid,
  seoConfig,
}: CategoryTemplateProps) {
  const { locale, isRTL } = useLocale();
  const { user } = useAuth();
  const config = categoryConfig[categoryType];

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: [`/api/page-builder/public/${categoryType}`],
    queryFn: () => fetchPageSections(categoryType),
    staleTime: 5 * 60 * 1000,
  });

  const defaultSeo = {
    title: locale === "he" ? config.defaultTitleHe : config.defaultTitle,
    description: locale === "he" ? config.defaultSubtitleHe : config.defaultSubtitle,
    ogTitle: locale === "he" ? config.defaultTitleHe : config.defaultTitle,
    ogDescription: locale === "he" ? config.defaultSubtitleHe : config.defaultSubtitle,
  };

  const heroSection = sections.find((s) => s.sectionType === "hero");
  const canonicalPath = `/${categoryType}`;
  const canonicalUrl = locale === "en" 
    ? `https://travi.world${canonicalPath}` 
    : `https://travi.world/${locale}${canonicalPath}`;

  const seo = {
    title:
      seoConfig?.title ||
      (heroSection && (locale === "he" ? heroSection.titleHe : heroSection.title)) ||
      defaultSeo.title,
    description:
      seoConfig?.description ||
      (heroSection && (locale === "he" ? heroSection.subtitleHe : heroSection.subtitle)) ||
      defaultSeo.description,
    ogTitle:
      seoConfig?.ogTitle ||
      (heroSection && (locale === "he" ? heroSection.titleHe : heroSection.title)) ||
      defaultSeo.ogTitle,
    ogDescription:
      seoConfig?.ogDescription ||
      (heroSection && (locale === "he" ? heroSection.subtitleHe : heroSection.subtitle)) ||
      defaultSeo.ogDescription,
    ogType: "website" as const,
    canonicalUrl,
  };

  useDocumentMeta(seo);

  const canEdit = Boolean(user && ["admin", "editor"].includes(user.role));
  const pageId = `category-${categoryType}`;

  return (
    <div className={cn("min-h-screen flex flex-col")} dir={isRTL ? "rtl" : "ltr"}>
      <PublicNav variant="transparent" transparentTone="dark" />

      <main className="flex-1">
        {canEdit ? (
          <PageBuilderLiveEditProvider pageId={pageId} sections={sections}>
            <CategoryPageContent
              categoryType={categoryType}
              sections={sections}
              isLoading={sectionsLoading}
              customFilters={customFilters}
              customContentGrid={customContentGrid}
            />
            {children}
          </PageBuilderLiveEditProvider>
        ) : (
          <>
            <CategoryPageContent
              categoryType={categoryType}
              sections={sections}
              isLoading={sectionsLoading}
              customFilters={customFilters}
              customContentGrid={customContentGrid}
            />
            {children}
          </>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}

export { categoryConfig };

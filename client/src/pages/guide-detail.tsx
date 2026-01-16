import { useState, useEffect, useMemo, useRef } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import DOMPurify from "dompurify";
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from "framer-motion";
import { 
  BookOpen, Globe, MapPin, ChevronRight, Languages, Calendar, 
  Plane, Train, Bus, Map, Utensils, Wine, Bed, ShoppingBag,
  Camera, Shield, Wifi, Clock, ChevronUp, Home, ArrowLeft,
  Hotel, Ticket, Star, FileText, Layers, RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SEOHead } from "@/components/seo-head";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { AnimatedSection } from "@/components/destination/AnimatedSection";
import { cn } from "@/lib/utils";

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "ar", label: "Arabic", nativeName: "العربية" },
  { code: "de", label: "German", nativeName: "Deutsch" },
  { code: "es", label: "Spanish", nativeName: "Español" },
  { code: "fr", label: "French", nativeName: "Français" },
  { code: "he", label: "Hebrew", nativeName: "עברית" },
  { code: "hi", label: "Hindi", nativeName: "हिन्दी" },
  { code: "it", label: "Italian", nativeName: "Italiano" },
  { code: "ja", label: "Japanese", nativeName: "日本語" },
  { code: "ko", label: "Korean", nativeName: "한국어" },
  { code: "pt", label: "Portuguese", nativeName: "Português" },
  { code: "ru", label: "Russian", nativeName: "Русский" },
  { code: "tr", label: "Turkish", nativeName: "Türkçe" },
  { code: "zh", label: "Chinese", nativeName: "中文" },
  { code: "nl", label: "Dutch", nativeName: "Nederlands" },
  { code: "pl", label: "Polish", nativeName: "Polski" },
];

interface GuideSection {
  level: number;
  heading: string;
  content: string;
}

interface GuideSeoData {
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string | null;
  secondaryKeywords: string[];
}

interface GuideFaq {
  question: string;
  answer: string;
}

interface GuideImage {
  id: string;
  url: string;
  altText: string;
  credit: string;
  section: string;
}

interface BestTimeToVisit {
  summary: string;
  months?: Array<{ month: string; rating: string; notes: string }>;
}

interface GuideDetail {
  id: number;
  slug: string;
  title: string;
  summary: string;
  sections: GuideSection[];
  locale: string;
  availableLocales: string[];
  destinationType: string | null;
  publishedAt: string | null;
  sourceUrl?: string;
  lastFetched?: string;
  schemaOrg?: object;
  originalContent?: string | null;
  rewrittenContent?: string | null;
  seo?: GuideSeoData;
  faqs?: GuideFaq[];
  images?: GuideImage[];
  schemaMarkup?: {
    travelGuide?: object;
    faqPage?: object;
    breadcrumbList?: object;
    touristDestination?: object;
  } | null;
  ogTags?: Record<string, string> | null;
  quickFacts?: Record<string, string> | null;
  bestTimeToVisit?: BestTimeToVisit | null;
}

interface Holiday {
  id: number;
  name: string;
  localName?: string;
  date: string;
  countryCode: string;
  type?: string;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  "understand": <BookOpen className="h-5 w-5" />,
  "get in": <Plane className="h-5 w-5" />,
  "get around": <Bus className="h-5 w-5" />,
  "see": <Camera className="h-5 w-5" />,
  "do": <Star className="h-5 w-5" />,
  "buy": <ShoppingBag className="h-5 w-5" />,
  "eat": <Utensils className="h-5 w-5" />,
  "drink": <Wine className="h-5 w-5" />,
  "sleep": <Bed className="h-5 w-5" />,
  "stay safe": <Shield className="h-5 w-5" />,
  "connect": <Wifi className="h-5 w-5" />,
  "respect": <Globe className="h-5 w-5" />,
  "cope": <Shield className="h-5 w-5" />,
  "go next": <Map className="h-5 w-5" />,
};

function getSectionIcon(heading: string): React.ReactNode {
  const lowerHeading = heading.toLowerCase();
  for (const [key, icon] of Object.entries(SECTION_ICONS)) {
    if (lowerHeading.includes(key)) {
      return icon;
    }
  }
  return <BookOpen className="h-5 w-5" />;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function ReadingProgressBar() {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  if (prefersReducedMotion) {
    return (
      <div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6443F4] to-[#E84C9A] z-[100]"
        data-testid="reading-progress-bar"
      />
    );
  }

  return (
    <motion.div 
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6443F4] to-[#E84C9A] origin-left z-[100]"
      style={{ scaleX }}
      data-testid="reading-progress-bar"
    />
  );
}

const FALLBACK_HERO_IMAGE = "/cards/dubai.webp";

function CinematicHero({
  heroImage,
  title,
  summary,
  sectionsCount,
  lastUpdated,
  availableLocales,
  isLoading,
  destinationName,
}: {
  heroImage: string;
  title: string;
  summary: string;
  sectionsCount: number;
  lastUpdated?: string;
  availableLocales?: string[];
  isLoading: boolean;
  destinationName: string;
}) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const heroY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], prefersReducedMotion ? [1, 1] : [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [1, 1] : [1, 1.1]);

  const estimatedReadingTime = Math.max(5, sectionsCount * 3);
  const formattedDate = lastUpdated 
    ? new Date(lastUpdated).toLocaleDateString("en", { month: "short", year: "numeric" })
    : null;

  const effectiveHeroImage = (!heroImage || imageError) ? FALLBACK_HERO_IMAGE : heroImage;

  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
    
    if (!heroImage) {
      setImageError(true);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setImageError(false);
    };
    img.onerror = () => {
      setImageError(true);
      setImageLoaded(false);
    };
    img.src = heroImage;
  }, [heroImage]);

  return (
    <section 
      ref={heroRef}
      className="relative h-[50vh] md:h-[60vh] min-h-[400px] flex items-end overflow-hidden"
      data-testid="section-hero"
    >
      <motion.div 
        className="absolute inset-0"
        style={{ 
          y: heroY,
          scale: heroScale,
        }}
      >
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${effectiveHeroImage})` }}
        />
      </motion.div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0A1F] via-[#0B0A1F]/60 to-transparent" />
      
      <motion.div 
        className="relative z-10 max-w-7xl mx-auto px-6 pb-8 md:pb-12 w-full"
        style={{ opacity: heroOpacity }}
      >
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-48 bg-white/20" />
            <Skeleton className="h-14 w-96 bg-white/20" />
            <Skeleton className="h-6 w-64 bg-white/20" />
          </div>
        ) : (
          <>
            <nav aria-label="Breadcrumb" className="mb-4 md:mb-6">
              <ol className="flex items-center gap-2 text-sm text-white/70 flex-wrap">
                <li>
                  <Link href="/" className="hover:text-white transition-colors flex items-center gap-1" data-testid="breadcrumb-home">
                    <Home className="h-3.5 w-3.5" />
                    Home
                  </Link>
                </li>
                <ChevronRight className="h-3.5 w-3.5" />
                <li>
                  <Link href="/guides" className="hover:text-white transition-colors" data-testid="breadcrumb-guides">
                    Travel Guides
                  </Link>
                </li>
                <ChevronRight className="h-3.5 w-3.5" />
                <li className="text-white font-medium truncate max-w-[200px]" data-testid="breadcrumb-current">
                  {destinationName}
                </li>
              </ol>
            </nav>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge className="bg-gradient-to-r from-[#6443F4] to-[#E84C9A] text-white border-0">
                <BookOpen className="h-3 w-3 mr-1" />
                Travel Guide
              </Badge>
              {availableLocales && availableLocales.length > 1 && (
                <Badge variant="secondary" className="bg-white/10 text-white border-0 backdrop-blur-md">
                  <Languages className="h-3 w-3 mr-1" />
                  {availableLocales.length} languages
                </Badge>
              )}
            </div>
            
            <h1 
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg"
              style={{ 
                fontFamily: "'Chillax', var(--font-sans)",
                background: "linear-gradient(135deg, #FFFFFF 0%, #E84C9A 50%, #6443F4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
              data-testid="hero-title"
            >
              {title}
            </h1>
            
            <p className="text-base md:text-lg text-white/80 max-w-2xl line-clamp-2 mb-6">
              {summary}
            </p>

            <div className="flex flex-wrap items-center gap-4 md:gap-6">
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Clock className="h-4 w-4 text-[#E84C9A]" />
                <span>{estimatedReadingTime} min read</span>
              </div>
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Layers className="h-4 w-4 text-[#6443F4]" />
                <span>{sectionsCount} sections</span>
              </div>
              {formattedDate && (
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <RefreshCw className="h-4 w-4 text-[#E84C9A]" />
                  <span>Updated {formattedDate}</span>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </section>
  );
}

function ContentSection({ section, index }: { section: GuideSection; index: number }) {
  const sanitizedContent = useMemo(() => {
    return DOMPurify.sanitize(section.content, {
      ADD_TAGS: ["iframe"],
      ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling"],
    });
  }, [section.content]);

  const sectionId = slugify(section.heading);

  return (
    <AnimatedSection 
      delay={index * 0.05}
      className="mb-12"
      data-testid={`section-${sectionId}`}
    >
      <div id={sectionId} className="scroll-mt-32">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#6443F4]/20 to-[#E84C9A]/20 text-[#6443F4]">
            {getSectionIcon(section.heading)}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
            {section.heading}
          </h2>
        </div>
        <div 
          className="prose prose-slate prose-lg max-w-none dark:prose-invert
            prose-headings:font-semibold prose-headings:text-slate-800 dark:prose-headings:text-white
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
            prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-3
            prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed
            prose-a:text-[#6443F4] prose-a:no-underline hover:prose-a:underline
            prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-li:marker:text-[#E84C9A]
            prose-strong:text-slate-800 dark:prose-strong:text-white
            prose-blockquote:border-l-[#6443F4] prose-blockquote:bg-[#6443F4]/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
            prose-table:border prose-table:border-slate-200 dark:prose-table:border-slate-700 prose-table:rounded-lg prose-table:overflow-hidden
            prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:p-3 prose-th:text-left prose-th:font-semibold
            prose-td:p-3 prose-td:border-t prose-td:border-slate-200 dark:prose-td:border-slate-700"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      </div>
    </AnimatedSection>
  );
}

function TableOfContents({ 
  sections, 
  activeSection,
  scrollProgress,
}: { 
  sections: GuideSection[]; 
  activeSection: string;
  scrollProgress: number;
}) {
  const activeIndex = sections.findIndex(s => slugify(s.heading) === activeSection);
  const progressPercent = sections.length > 0 
    ? Math.max(0, Math.min(100, ((activeIndex + 1) / sections.length) * 100))
    : 0;

  return (
    <div 
      className="bg-white/70 dark:bg-[#0B0A1F]/70 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-xl sticky top-28 overflow-hidden"
      data-testid="table-of-contents"
    >
      <div className="p-4 border-b border-slate-200/50 dark:border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#6443F4]" />
            Contents
          </h3>
          <span className="text-xs font-medium text-[#6443F4]">
            {Math.round(scrollProgress * 100)}%
          </span>
        </div>
        <div className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-[#6443F4] to-[#E84C9A] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
      
      <ScrollArea className="h-[calc(100vh-320px)]">
        <nav className="p-3 space-y-1">
          {sections.map((section, index) => {
            const sectionId = slugify(section.heading);
            const isActive = activeSection === sectionId;
            const isPast = activeIndex > index;
            
            return (
              <a
                key={`${sectionId}-${index}`}
                href={`#${sectionId}`}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 text-sm rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-gradient-to-r from-[#6443F4]/10 to-[#E84C9A]/10 text-[#6443F4] font-medium border border-[#6443F4]/20" 
                    : isPast
                    ? "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                )}
                data-testid={`toc-link-${sectionId}`}
              >
                <span className={cn(
                  "flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-all",
                  isActive 
                    ? "bg-gradient-to-r from-[#6443F4] to-[#E84C9A] text-white"
                    : isPast
                    ? "bg-[#6443F4]/20 text-[#6443F4]"
                    : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 group-hover:bg-[#6443F4]/20 group-hover:text-[#6443F4]"
                )}>
                  {index + 1}
                </span>
                <span className="truncate">{section.heading}</span>
              </a>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}

function HolidaysSection({ countryCode, destinationName }: { countryCode: string; destinationName: string }) {
  const { data: holidays, isLoading } = useQuery<Holiday[]>({
    queryKey: ["/api/public/holidays", countryCode],
    queryFn: async () => {
      const response = await fetch(`/api/public/holidays/${countryCode}?upcoming=true&limit=6`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.holidays || [];
    },
    enabled: !!countryCode,
  });

  if (isLoading || !holidays || holidays.length === 0) return null;

  return (
    <AnimatedSection className="mb-12" data-testid="section-holidays">
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-amber-900 dark:text-amber-100">
            <Calendar className="h-5 w-5" />
            Best Time to Visit {destinationName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-amber-800 dark:text-amber-200 mb-4">
            Plan your trip around these upcoming holidays and events:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {holidays.map((holiday, index) => (
              <div 
                key={`${holiday.id || holiday.date}-${index}`} 
                className="flex items-center gap-3 p-3 bg-white/70 dark:bg-white/10 rounded-lg border border-amber-100 dark:border-amber-700/50"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 dark:bg-amber-800/50 rounded-lg flex flex-col items-center justify-center">
                  <span className="text-xs text-amber-600 dark:text-amber-300 font-medium">
                    {new Date(holiday.date).toLocaleDateString("en", { month: "short" })}
                  </span>
                  <span className="text-lg font-bold text-amber-900 dark:text-amber-100">
                    {new Date(holiday.date).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 dark:text-white truncate">{holiday.name}</h4>
                  {holiday.localName && holiday.localName !== holiday.name && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{holiday.localName}</p>
                  )}
                </div>
                {holiday.type && (
                  <Badge variant="secondary" className="text-xs">
                    {holiday.type}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AnimatedSection>
  );
}

function FAQsSection({ faqs, destinationName }: { faqs: GuideFaq[]; destinationName: string }) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <AnimatedSection className="mb-12" data-testid="section-faqs">
      <Card className="bg-gradient-to-br from-slate-50 to-[#6443F4]/5 dark:from-slate-800/50 dark:to-[#6443F4]/10 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-slate-900 dark:text-white">
            <BookOpen className="h-5 w-5 text-[#6443F4]" />
            Frequently Asked Questions about {destinationName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-white/5 rounded-lg p-4 border border-slate-100 dark:border-white/10 shadow-sm"
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
              >
                <h3 
                  className="font-semibold text-slate-900 dark:text-white mb-2 flex items-start gap-2"
                  itemProp="name"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-[#6443F4] to-[#E84C9A] text-white text-sm flex items-center justify-center font-bold">
                    Q
                  </span>
                  {faq.question}
                </h3>
                <div 
                  itemScope 
                  itemProp="acceptedAnswer" 
                  itemType="https://schema.org/Answer"
                >
                  <p 
                    className="text-slate-600 dark:text-slate-300 leading-relaxed pl-8"
                    itemProp="text"
                  >
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AnimatedSection>
  );
}

function QuickFactsSection({ quickFacts, destinationName }: { quickFacts: Record<string, string>; destinationName: string }) {
  if (!quickFacts || Object.keys(quickFacts).length === 0) return null;

  const factIcons: Record<string, React.ReactNode> = {
    currency: <ShoppingBag className="h-4 w-4" />,
    language: <Languages className="h-4 w-4" />,
    timezone: <Clock className="h-4 w-4" />,
    visa: <Globe className="h-4 w-4" />,
    electricity: <Wifi className="h-4 w-4" />,
    population: <Globe className="h-4 w-4" />,
    climate: <Calendar className="h-4 w-4" />,
    capital: <MapPin className="h-4 w-4" />,
  };

  return (
    <AnimatedSection className="mb-12" data-testid="section-quick-facts">
      <Card className="bg-gradient-to-br from-[#6443F4]/5 to-[#E84C9A]/5 dark:from-[#6443F4]/10 dark:to-[#E84C9A]/10 border-[#6443F4]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-[#6443F4] dark:text-[#E84C9A]">
            <Globe className="h-5 w-5" />
            Quick Facts: {destinationName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(quickFacts).map(([key, value]) => (
              <div 
                key={key}
                className="bg-white/80 dark:bg-white/5 rounded-lg p-3 border border-[#6443F4]/10"
              >
                <div className="flex items-center gap-2 text-[#6443F4] mb-1">
                  {factIcons[key.toLowerCase()] || <Globe className="h-4 w-4" />}
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {key.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-slate-900 dark:text-white font-medium text-sm">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AnimatedSection>
  );
}

function BestTimeToVisitSection({ 
  bestTimeToVisit, 
  destinationName 
}: { 
  bestTimeToVisit: BestTimeToVisit; 
  destinationName: string;
}) {
  if (!bestTimeToVisit) return null;

  const getRatingColor = (rating: string) => {
    const r = rating.toLowerCase();
    if (r === 'excellent' || r === 'best') return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    if (r === 'good') return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    if (r === 'fair' || r === 'average') return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  };

  return (
    <AnimatedSection className="mb-12" data-testid="section-best-time">
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-amber-900 dark:text-amber-100">
            <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Best Time to Visit {destinationName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bestTimeToVisit.summary && (
            <p className="text-amber-800 dark:text-amber-200 mb-4 leading-relaxed">
              {bestTimeToVisit.summary}
            </p>
          )}
          {bestTimeToVisit.months && bestTimeToVisit.months.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {bestTimeToVisit.months.map((month) => (
                <div 
                  key={month.month}
                  className="bg-white/80 dark:bg-white/10 rounded-lg p-3 border border-amber-100 dark:border-amber-700/50"
                >
                  <div className="font-semibold text-slate-900 dark:text-white mb-1">{month.month}</div>
                  <Badge className={cn("text-xs mb-2", getRatingColor(month.rating))}>
                    {month.rating}
                  </Badge>
                  {month.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">{month.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AnimatedSection>
  );
}

function AffiliateCTA({ destinationName, destinationSlug }: { destinationName: string; destinationSlug: string }) {
  return (
    <AnimatedSection className="mb-12" data-testid="section-cta">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-[#6443F4] to-[#0B0A1F] border-0 text-white overflow-hidden group hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Hotel className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">Find Hotels in {destinationName}</h3>
                <p className="text-white/80 text-sm mb-4">
                  Compare prices from 100+ booking sites and find the best deals.
                </p>
                <Link href={`/destinations/${destinationSlug}/hotels`}>
                  <Button 
                    variant="secondary" 
                    className="bg-white text-[#6443F4] hover:bg-white/90"
                    data-testid="cta-hotels"
                  >
                    Browse Hotels <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#E84C9A] to-[#6443F4] border-0 text-white overflow-hidden group hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Ticket className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">Tours & Attractions</h3>
                <p className="text-white/80 text-sm mb-4">
                  Skip-the-line tickets and guided tours for top attractions.
                </p>
                <Link href={`/destinations/${destinationSlug}`}>
                  <Button 
                    variant="secondary" 
                    className="bg-white text-[#E84C9A] hover:bg-white/90"
                    data-testid="cta-attractions"
                  >
                    Explore <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AnimatedSection>
  );
}

function LanguageSelector({ 
  availableLocales, 
  currentLocale, 
  onLocaleChange 
}: { 
  availableLocales: string[]; 
  currentLocale: string; 
  onLocaleChange: (locale: string) => void;
}) {
  const availableLanguages = SUPPORTED_LANGUAGES.filter(lang => 
    availableLocales.includes(lang.code)
  );

  if (availableLanguages.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      <Select value={currentLocale} onValueChange={onLocaleChange}>
        <SelectTrigger className="w-[160px] bg-white/90 dark:bg-white/10 backdrop-blur-sm border-slate-200 dark:border-white/20" data-testid="language-selector">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableLanguages.map(lang => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.nativeName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 500);
    };
    window.addEventListener("scroll", toggleVisibility, { passive: true });
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  if (!isVisible) return null;

  return (
    <Button
      size="icon"
      className="fixed bottom-8 right-8 z-50 rounded-full shadow-lg bg-gradient-to-r from-[#6443F4] to-[#E84C9A] hover:opacity-90"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      data-testid="scroll-to-top"
    >
      <ChevronUp className="h-5 w-5" />
    </Button>
  );
}

export default function GuideDetailPage() {
  const [, params] = useRoute("/guides/:slug");
  const { slug = "" } = params ?? {};
  const [locale, setLocale] = useState("en");
  const [activeSection, setActiveSection] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const destinationId = slug.replace("-travel-guide", "");
  const destinationName = destinationId
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const { data: guide, isLoading, error } = useQuery<GuideDetail>({
    queryKey: ["/api/public/guides", slug, locale],
    queryFn: async () => {
      const response = await fetch(`/api/public/guides/${slug}?locale=${locale}`);
      if (!response.ok) throw new Error("Guide not found");
      return response.json();
    },
    enabled: !!slug,
  });

  const sanitizedOriginalContent = useMemo(() => {
    const contentToDisplay = guide?.rewrittenContent || guide?.originalContent;
    if (!contentToDisplay) return null;
    return DOMPurify.sanitize(contentToDisplay, {
      ADD_TAGS: ["iframe", "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td", "dl", "dt", "dd"],
      ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "class"],
    });
  }, [guide?.originalContent, guide?.rewrittenContent]);

  const countryCodeMap: Record<string, string> = {
    dubai: "AE",
    "abu-dhabi": "AE",
    london: "GB",
    paris: "FR",
    tokyo: "JP",
    bangkok: "BK",
    singapore: "SG",
    "new-york": "US",
    "las-vegas": "US",
    "los-angeles": "US",
    miami: "US",
    istanbul: "TR",
    rome: "IT",
    barcelona: "ES",
    amsterdam: "NL",
    "hong-kong": "HK",
  };
  const countryCode = countryCodeMap[destinationId] || "";

  const heroImage = `/cards/${destinationId}.webp`;

  useEffect(() => {
    if (!contentRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );

    const sections = contentRef.current.querySelectorAll("[id]");
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [guide?.sections]);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? window.scrollY / totalHeight : 0;
      setScrollProgress(Math.min(1, Math.max(0, progress)));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const seoTitle = guide?.seo?.metaTitle || guide?.title || `${destinationName} Travel Guide`;
  const seoDescription = guide?.seo?.metaDescription || guide?.summary || `Complete travel guide to ${destinationName}. Everything you need to know about visiting ${destinationName}.`;

  const schemaOrg = guide?.schemaOrg || {
    "@context": "https://schema.org",
    "@type": "TravelGuide",
    name: seoTitle,
    description: seoDescription,
    url: `https://travi.world/guides/${slug}`,
    inLanguage: locale,
    publisher: {
      "@type": "Organization",
      name: "TRAVI",
      url: "https://travi.world",
    },
    about: {
      "@type": "Place",
      name: destinationName,
    },
  };

  const faqSchema = guide?.faqs && guide.faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  } : null;

  const sectionsCount = guide?.sections?.length || 0;

  if (error) {
    return (
      <>
        <PublicNav />
        <main className="min-h-screen pt-32 pb-16 px-6 bg-white dark:bg-[#0B0A1F]">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Guide Not Found</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Sorry, we couldn't find a travel guide for this destination.
            </p>
            <Link href="/guides">
              <Button data-testid="back-to-guides">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Browse All Guides
              </Button>
            </Link>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <ReadingProgressBar />
      
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalPath={`/guides/${slug}`}
        ogImage={heroImage}
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(schemaOrg)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://travi.world" },
              { "@type": "ListItem", position: 2, name: "Travel Guides", item: "https://travi.world/guides" },
              { "@type": "ListItem", position: 3, name: seoTitle, item: `https://travi.world/guides/${slug}` },
            ],
          })}
        </script>
        {faqSchema && (
          <script type="application/ld+json">
            {JSON.stringify(faqSchema)}
          </script>
        )}
      </Helmet>

      <PublicNav />

      <main className="min-h-screen bg-white dark:bg-[#0B0A1F]" data-testid={`guide-page-${slug}`}>
        <CinematicHero
          heroImage={heroImage}
          title={guide?.title || `${destinationName} Travel Guide`}
          summary={guide?.summary || `Everything you need to know about visiting ${destinationName}`}
          sectionsCount={sectionsCount}
          lastUpdated={guide?.lastFetched}
          availableLocales={guide?.availableLocales}
          isLoading={isLoading}
          destinationName={destinationName}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col lg:flex-row justify-end items-start lg:items-center gap-4 mb-8">
            {guide?.availableLocales && (
              <LanguageSelector
                availableLocales={guide.availableLocales}
                currentLocale={locale}
                onLocaleChange={setLocale}
              />
            )}
          </div>

          <div className="flex gap-8">
            <aside className="hidden lg:block w-72 flex-shrink-0">
              {guide?.sections && guide.sections.length > 0 && (
                <TableOfContents 
                  sections={guide.sections} 
                  activeSection={activeSection}
                  scrollProgress={scrollProgress}
                />
              )}
            </aside>

            <div className="flex-1 min-w-0" ref={contentRef}>
              {isLoading ? (
                <div className="space-y-8">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-4">
                      <Skeleton className="h-8 w-64" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {guide?.quickFacts && (
                    <QuickFactsSection quickFacts={guide.quickFacts} destinationName={destinationName} />
                  )}

                  {guide?.bestTimeToVisit && (
                    <BestTimeToVisitSection bestTimeToVisit={guide.bestTimeToVisit} destinationName={destinationName} />
                  )}

                  {!guide?.bestTimeToVisit && countryCode && (
                    <HolidaysSection countryCode={countryCode} destinationName={destinationName} />
                  )}

                  <AffiliateCTA destinationName={destinationName} destinationSlug={destinationId} />

                  {sanitizedOriginalContent ? (
                    <AnimatedSection className="mb-12" data-testid="section-original-content">
                      <div 
                        className="prose prose-slate prose-lg max-w-none dark:prose-invert
                          prose-headings:font-semibold prose-headings:text-slate-800 dark:prose-headings:text-white
                          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
                          prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-3
                          prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed
                          prose-a:text-[#6443F4] prose-a:no-underline hover:prose-a:underline
                          prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-li:marker:text-[#E84C9A]
                          prose-strong:text-slate-800 dark:prose-strong:text-white
                          prose-blockquote:border-l-[#6443F4] prose-blockquote:bg-[#6443F4]/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
                          prose-table:border prose-table:border-slate-200 dark:prose-table:border-slate-700 prose-table:rounded-lg prose-table:overflow-hidden
                          prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:p-3 prose-th:text-left prose-th:font-semibold
                          prose-td:p-3 prose-td:border-t prose-td:border-slate-200 dark:prose-td:border-slate-700"
                        dangerouslySetInnerHTML={{ __html: sanitizedOriginalContent }}
                      />
                    </AnimatedSection>
                  ) : (
                    guide?.sections?.map((section, index) => (
                      <ContentSection key={index} section={section} index={index} />
                    ))
                  )}

                  {guide?.faqs && guide.faqs.length > 0 && (
                    <FAQsSection faqs={guide.faqs} destinationName={destinationName} />
                  )}

                  {guide?.sourceUrl && (
                    <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Guide content sourced from{" "}
                        <a 
                          href={guide.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#6443F4] hover:underline"
                        >
                          Wikivoyage
                        </a>
                        , a free travel guide that anyone can edit.
                      </p>
                      {guide.lastFetched && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Last updated: {new Date(guide.lastFetched).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
      <ScrollToTop />
    </>
  );
}

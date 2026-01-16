import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import DOMPurify from "isomorphic-dompurify";
import { 
  BookOpen, Bed, Utensils, Camera, ShoppingBag, MapPin, 
  Plane, Train, ArrowRight, Sparkles, Globe
} from "lucide-react";

type SectionType = "sleep" | "eat" | "see" | "do" | "buy" | "drink" | "get-in" | "get-around";

// Destinations that have imported travel guide content
// Update this list as more guides are imported
export const DESTINATIONS_WITH_GUIDES = [
  { slug: "dubai", name: "Dubai" },
  { slug: "abu-dhabi", name: "Abu Dhabi" },
  { slug: "london", name: "London" },
  { slug: "bangkok", name: "Bangkok" },
  { slug: "barcelona", name: "Barcelona" },
  { slug: "amsterdam", name: "Amsterdam" },
  { slug: "bali", name: "Bali" },
  { slug: "hong-kong", name: "Hong Kong" },
  { slug: "istanbul", name: "Istanbul" },
  { slug: "las-vegas", name: "Las Vegas" },
  { slug: "los-angeles", name: "Los Angeles" },
] as const;

interface GuideInsightsProps {
  destinationSlug: string;
  destinationName: string;
  sectionType: SectionType;
  title?: string;
  maxHeight?: string;
  showViewGuide?: boolean;
  locale?: string;
}

interface SectionData {
  slug: string;
  destinationTitle: string;
  sectionType: string;
  locale: string;
  section: {
    heading: string;
    content: string;
    level: number;
  } | null;
  relatedSections: Array<{
    heading: string;
    content: string;
    level: number;
  }>;
  sourceUrl: string;
}

const SECTION_ICONS: Record<SectionType, typeof BookOpen> = {
  sleep: Bed,
  eat: Utensils,
  see: Camera,
  do: Sparkles,
  buy: ShoppingBag,
  drink: Utensils,
  "get-in": Plane,
  "get-around": Train,
};

const SECTION_TITLES: Record<SectionType, string> = {
  sleep: "Where to Stay",
  eat: "Where to Eat",
  see: "What to See",
  do: "Things to Do",
  buy: "Shopping Guide",
  drink: "Nightlife & Bars",
  "get-in": "Getting There",
  "get-around": "Getting Around",
};

function sanitizeAndTruncateHTML(html: string, maxLength: number = 600): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'a', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
  
  const text = clean.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return clean;
  
  const truncatedText = text.slice(0, maxLength);
  const lastSpace = truncatedText.lastIndexOf(' ');
  return `<p>${truncatedText.slice(0, lastSpace > 0 ? lastSpace : maxLength)}...</p>`;
}

function GuideInsightsSkeleton() {
  return (
    <Card className="overflow-hidden border-l-4 border-l-primary/50">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

export function GuideInsights({
  destinationSlug,
  destinationName,
  sectionType,
  title,
  maxHeight = "280px",
  showViewGuide = true,
  locale = "en",
}: GuideInsightsProps) {
  const { data, isLoading, error } = useQuery<SectionData>({
    queryKey: ["/api/public/destination-content", destinationSlug, "section", sectionType, locale],
    queryFn: async () => {
      const response = await fetch(
        `/api/public/destination-content/${destinationSlug}/section/${sectionType}?locale=${locale}`
      );
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch section");
      }
      return response.json();
    },
    enabled: !!destinationSlug,
    staleTime: 1000 * 60 * 30,
  });

  if (isLoading) {
    return <GuideInsightsSkeleton />;
  }

  if (error || !data || !data?.section) {
    return null;
  }

  const Icon = SECTION_ICONS[sectionType] || BookOpen;
  const displayTitle = title || `${SECTION_TITLES[sectionType]} in ${destinationName}`;
  const truncatedContent = sanitizeAndTruncateHTML(data.section.content);
  const guideSlug = data.slug || `${destinationSlug}-travel-guide`;

  return (
    <Card 
      className="overflow-hidden border-l-4 border-l-primary hover-elevate transition-all"
      data-testid={`guide-insights-${destinationSlug}-${sectionType}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight">{displayTitle}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <BookOpen className="h-2.5 w-2.5 mr-1" />
                  From Travel Guide
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Globe className="h-2.5 w-2.5 mr-1" />
                  {locale.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        <ScrollArea style={{ maxHeight }} className="pr-4">
          <div 
            className="prose prose-sm prose-slate max-w-none text-muted-foreground 
                       prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-a:text-primary
                       prose-strong:text-foreground prose-headings:text-foreground"
            dangerouslySetInnerHTML={{ __html: truncatedContent }}
          />
          <ScrollBar orientation="vertical" />
        </ScrollArea>

        {showViewGuide && (
          <div className="mt-4 pt-3 border-t flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Read the full guide for more details
            </p>
            <Link href={`/guides/${guideSlug}?locale=${locale}`}>
              <Button variant="ghost" size="sm" className="text-primary" data-testid={`view-guide-${destinationSlug}`}>
                View Full Guide
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface GuideInsightsCarouselProps {
  destinationSlug: string;
  destinationName: string;
  sections?: SectionType[];
  locale?: string;
}

export function GuideInsightsCarousel({
  destinationSlug,
  destinationName,
  sections = ["sleep", "eat", "see", "do"],
  locale = "en",
}: GuideInsightsCarouselProps) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4">
        {sections.map((sectionType) => (
          <div key={sectionType} className="w-[350px] flex-shrink-0">
            <GuideInsights
              destinationSlug={destinationSlug}
              destinationName={destinationName}
              sectionType={sectionType}
              locale={locale}
              maxHeight="200px"
            />
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

interface MultiDestinationInsightsProps {
  destinations: Array<{ slug: string; name: string }>;
  sectionType: SectionType;
  locale?: string;
  title?: string;
}

export function MultiDestinationInsights({
  destinations,
  sectionType,
  locale = "en",
  title,
}: MultiDestinationInsightsProps) {
  const Icon = SECTION_ICONS[sectionType] || BookOpen;
  const sectionTitle = SECTION_TITLES[sectionType];

  return (
    <section className="py-12 bg-card/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {title || `${sectionTitle} Insider Tips`}
            </h2>
            <p className="text-sm text-muted-foreground">
              Local insights from our travel guides
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.slice(0, 6).map((dest) => (
            <GuideInsights
              key={dest.slug}
              destinationSlug={dest.slug}
              destinationName={dest.name}
              sectionType={sectionType}
              locale={locale}
              maxHeight="180px"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

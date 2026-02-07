/**
 * EditorialNewsGrid Component
 *
 * Displays a grid of news articles from the homepage_featured editorial zone.
 * 4x2 grid layout with cards.
 */

import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Clock, ArrowRight, Newspaper, TrendingUp } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { formatDistanceToNow } from "date-fns";

interface PlacementContent {
  id: string;
  title: string;
  slug: string;
  type: string;
  cardImage: string | null;
  heroImage: string | null;
  summary: string | null;
  publishedAt: string | null;
}

interface EditorialPlacement {
  id: string;
  zone: string;
  position: number;
  priority: string;
  isBreaking: boolean;
  isFeatured: boolean;
  headline: string;
  image: string | null;
  excerpt: string | null;
  content: PlacementContent;
}

function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/3] bg-travi-sand dark:bg-card rounded-lg mb-3" />
      <div className="h-4 bg-travi-sand dark:bg-card rounded w-3/4 mb-2" />
      <div className="h-3 bg-travi-sand dark:bg-card rounded w-1/2" />
    </div>
  );
}

function NewsCard({ placement }: { placement: EditorialPlacement }) {
  const contentUrl = `/${placement.content.type}/${placement.content.slug}`;
  const image = placement.image || placement.content.heroImage || placement.content.cardImage;
  const publishedAt = placement.content.publishedAt
    ? formatDistanceToNow(new Date(placement.content.publishedAt), { addSuffix: true })
    : null;

  return (
    <Link href={contentUrl} className="group block">
      <article className="h-full bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">
        <div className="relative aspect-[4/3] overflow-hidden">
          <SafeImage
            src={image}
            alt={placement.headline}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Badges */}
          {placement.isBreaking && (
            <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
              BREAKING
            </div>
          )}
          {placement.isFeatured && !placement.isBreaking && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5" />
              FEATURED
            </div>
          )}
        </div>

        <div className="p-4">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {placement.content.type}
          </span>

          <h3 className="font-semibold text-sm text-foreground line-clamp-2 mt-1 group-hover:text-primary transition-colors">
            {placement.headline}
          </h3>

          {publishedAt && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
              <Clock className="w-3 h-3" />
              <span>{publishedAt}</span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

export function EditorialNewsGrid() {
  const {
    data: placements,
    isLoading,
    error,
  } = useQuery<EditorialPlacement[]>({
    queryKey: ["editorial-featured"],
    queryFn: async () => {
      const res = await fetch("/api/public/placements/homepage_featured");
      if (!res.ok) throw new Error("Failed to fetch featured placements");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  if (error || (!isLoading && (!placements || placements.length === 0))) {
    return null;
  }

  return (
    <section
      className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-travi-cream dark:bg-card/50"
      data-testid="editorial-news-grid"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Newspaper className="w-5 h-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">Latest Stories</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Travel News & Updates
            </h2>
          </div>
          <Link
            href="/news"
            className="hidden md:inline-flex items-center gap-2 text-primary hover:gap-3 transition-all font-medium"
          >
            View all news <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {placements.slice(0, 8).map(placement => (
              <NewsCard key={placement.id} placement={placement} />
            ))}
          </div>
        )}

        {/* Mobile CTA */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            View all news <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

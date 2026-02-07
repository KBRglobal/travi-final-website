/**
 * EditorialNews Component
 *
 * Displays news articles relevant to a destination in a magazine-style layout.
 * Fetches placements from the editorial system for the destination_news zone.
 */

import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, Newspaper, TrendingUp } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { formatDistanceToNow } from "date-fns";

interface EditorialNewsProps {
  destinationName: string;
  destinationSlug: string;
}

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

interface NewsPlacement {
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

function NewsCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-video bg-muted rounded-lg mb-3" />
      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
      <div className="h-3 bg-muted rounded w-1/2" />
    </div>
  );
}

function NewsCard({ placement }: Readonly<{ placement: NewsPlacement }>) {
  const contentUrl = `/${placement.content.type}/${placement.content.slug}`;
  const image = placement.image || placement.content.heroImage || placement.content.cardImage;
  const publishedAt = placement.content.publishedAt
    ? formatDistanceToNow(new Date(placement.content.publishedAt), { addSuffix: true })
    : null;

  return (
    <Link href={contentUrl} className="group block">
      <article className="h-full">
        <div className="relative aspect-video rounded-lg overflow-hidden mb-3">
          <SafeImage
            src={image}
            alt={placement.headline}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {placement.isBreaking && (
            <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
              BREAKING
            </div>
          )}
          {placement.isFeatured && !placement.isBreaking && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              FEATURED
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {placement.headline}
          </h3>

          {placement.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-2">{placement.excerpt}</p>
          )}

          {publishedAt && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{publishedAt}</span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

function FeaturedNewsCard({ placement }: Readonly<{ placement: NewsPlacement }>) {
  const contentUrl = `/${placement.content.type}/${placement.content.slug}`;
  const image = placement.image || placement.content.heroImage || placement.content.cardImage;
  const publishedAt = placement.content.publishedAt
    ? formatDistanceToNow(new Date(placement.content.publishedAt), { addSuffix: true })
    : null;

  return (
    <Link href={contentUrl} className="group block">
      <article className="relative h-full min-h-[400px] rounded-xl overflow-hidden">
        <SafeImage
          src={image}
          alt={placement.headline}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-6">
          {placement.isBreaking && (
            <div className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded mb-3">
              BREAKING NEWS
            </div>
          )}
          {placement.isFeatured && !placement.isBreaking && (
            <div className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded mb-3">
              <TrendingUp className="w-3 h-3" />
              FEATURED
            </div>
          )}

          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 line-clamp-3 group-hover:underline underline-offset-2">
            {placement.headline}
          </h3>

          {placement.excerpt && (
            <p className="text-white/80 line-clamp-2 mb-4">{placement.excerpt}</p>
          )}

          <div className="flex items-center justify-between">
            {publishedAt && (
              <div className="flex items-center gap-1 text-sm text-white/70">
                <Clock className="w-4 h-4" />
                <span>{publishedAt}</span>
              </div>
            )}
            <span className="inline-flex items-center gap-2 text-white font-medium group-hover:gap-3 transition-all">
              Read more <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function EditorialNews({ destinationName, destinationSlug }: Readonly<EditorialNewsProps>) {
  const {
    data: placements,
    isLoading,
    error,
  } = useQuery<NewsPlacement[]>({
    queryKey: ["destination-news", destinationSlug],
    queryFn: async () => {
      const res = await fetch(
        `/api/public/placements/destination_news?destinationId=${destinationSlug}`
      );
      if (!res.ok) throw new Error("Failed to fetch news");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  // Don't render if no news available
  if (error || (!isLoading && (!placements || placements.length === 0))) {
    return null;
  }

  const featuredPlacement = placements?.[0];
  const otherPlacements = placements?.slice(1, 5) || [];

  return (
    <section className="py-16 bg-muted/30" data-testid="editorial-news">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Newspaper className="w-5 h-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">Latest News</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              News from {destinationName}
            </h2>
          </div>
          <Link
            href={`/news?destination=${destinationSlug}`}
            className="hidden md:inline-flex items-center gap-2 text-primary hover:gap-3 transition-all font-medium"
          >
            View all news <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="animate-pulse">
              <div className="h-[400px] bg-muted rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <NewsCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {/* News Grid */}
        {!isLoading && placements && placements.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Featured Article (Large) */}
            {featuredPlacement && <FeaturedNewsCard placement={featuredPlacement} />}

            {/* Other Articles Grid */}
            {otherPlacements.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {otherPlacements.map(placement => (
                  <NewsCard key={placement.id} placement={placement} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mobile View All Link */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href={`/news?destination=${destinationSlug}`}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            View all {destinationName} news <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

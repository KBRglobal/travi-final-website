/**
 * EditorialSecondary Component
 *
 * Displays 3 secondary articles from the homepage_secondary editorial zone.
 * Horizontal layout beneath the hero.
 */

import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Clock, TrendingUp } from "lucide-react";
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
      <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-xl mb-4" />
      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2" />
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
    </div>
  );
}

function SecondaryCard({ placement }: { placement: EditorialPlacement }) {
  const contentUrl = `/${placement.content.type}/${placement.content.slug}`;
  const image = placement.image || placement.content.heroImage || placement.content.cardImage;
  const publishedAt = placement.content.publishedAt
    ? formatDistanceToNow(new Date(placement.content.publishedAt), { addSuffix: true })
    : null;

  return (
    <Link href={contentUrl} className="group block">
      <article className="h-full">
        <div className="relative aspect-video rounded-xl overflow-hidden mb-4">
          <SafeImage
            src={image}
            alt={placement.headline}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Badges */}
          {placement.isBreaking && (
            <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
              BREAKING
            </div>
          )}
          {placement.isFeatured && !placement.isBreaking && (
            <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              FEATURED
            </div>
          )}
        </div>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            {placement.content.type}
          </span>

          <h3 className="font-bold text-lg text-foreground line-clamp-2 group-hover:text-primary transition-colors">
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

export function EditorialSecondary() {
  const {
    data: placements,
    isLoading,
    error,
  } = useQuery<EditorialPlacement[]>({
    queryKey: ["editorial-secondary"],
    queryFn: async () => {
      const res = await fetch("/api/public/placements/homepage_secondary");
      if (!res.ok) throw new Error("Failed to fetch secondary placements");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  if (error || (!isLoading && (!placements || placements.length === 0))) {
    return null;
  }

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8" data-testid="editorial-secondary">
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {placements.slice(0, 3).map(placement => (
              <SecondaryCard key={placement.id} placement={placement} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

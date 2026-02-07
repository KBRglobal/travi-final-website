/**
 * TrendingSection Component
 *
 * Displays trending articles from the trending editorial zone.
 * Horizontal scrollable strip with numbered items.
 */

import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, ArrowRight } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";

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

function TrendingItem({ placement, index }: { placement: EditorialPlacement; index: number }) {
  const contentUrl = `/${placement.content.type}/${placement.content.slug}`;
  const image = placement.image || placement.content.heroImage || placement.content.cardImage;

  return (
    <Link href={contentUrl} className="group flex-shrink-0 w-72 md:w-80">
      <article className="flex gap-4 items-start">
        {/* Number */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-lg font-bold text-primary">{index + 1}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {placement.content.type}
          </span>
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors mt-1">
            {placement.headline}
          </h3>
        </div>

        {/* Thumbnail */}
        {image && (
          <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden">
            <SafeImage
              src={image}
              alt={placement.headline}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </article>
    </Link>
  );
}

export function TrendingSection() {
  const {
    data: placements,
    isLoading,
    error,
  } = useQuery<EditorialPlacement[]>({
    queryKey: ["editorial-trending"],
    queryFn: async () => {
      const res = await fetch("/api/public/placements/trending");
      if (!res.ok) throw new Error("Failed to fetch trending");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  if (error || (!isLoading && (!placements || placements.length === 0))) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="py-6 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse flex gap-8 overflow-hidden">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="flex-shrink-0 w-72 h-16 bg-slate-200 dark:bg-slate-800 rounded"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6 border-y border-border bg-card" data-testid="trending-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          {/* Label */}
          <div className="flex-shrink-0 flex items-center gap-2 text-primary">
            <TrendingUp className="w-5 h-5" />
            <span className="font-bold uppercase tracking-wide text-sm">Trending</span>
          </div>

          {/* Scrollable items */}
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-8">
              {placements.slice(0, 5).map((placement, index) => (
                <TrendingItem key={placement.id} placement={placement} index={index} />
              ))}
            </div>
          </div>

          {/* See more */}
          <Link
            href="/news?sort=trending"
            className="hidden md:flex flex-shrink-0 items-center gap-1 text-primary text-sm font-medium hover:gap-2 transition-all"
          >
            More <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * EditorialHero Component
 *
 * Displays the main hero article from the homepage_hero editorial zone.
 * Full-width cinematic display with large image and prominent headline.
 */

import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Clock, TrendingUp, ArrowRight } from "lucide-react";
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

function HeroSkeleton() {
  return (
    <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] animate-pulse bg-slate-200 dark:bg-slate-800 rounded-2xl" />
  );
}

export function EditorialHero() {
  const {
    data: placements,
    isLoading,
    error,
  } = useQuery<EditorialPlacement[]>({
    queryKey: ["editorial-hero"],
    queryFn: async () => {
      const res = await fetch("/api/public/placements/homepage_hero");
      if (!res.ok) throw new Error("Failed to fetch hero");
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
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <HeroSkeleton />
        </div>
      </section>
    );
  }

  const hero = placements[0];
  if (!hero) return null;

  const contentUrl = `/${hero.content.type}/${hero.content.slug}`;
  const image = hero.image || hero.content.heroImage || hero.content.cardImage;
  const publishedAt = hero.content.publishedAt
    ? formatDistanceToNow(new Date(hero.content.publishedAt), { addSuffix: true })
    : null;

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8" data-testid="editorial-hero">
      <div className="max-w-7xl mx-auto">
        <Link href={contentUrl} className="group block">
          <article className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] rounded-2xl overflow-hidden">
            <SafeImage
              src={image}
              alt={hero.headline}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 lg:p-14">
              <div className="max-w-3xl">
                {/* Badges */}
                <div className="flex items-center gap-3 mb-4">
                  {hero.isBreaking && (
                    <span className="inline-flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full animate-pulse">
                      BREAKING NEWS
                    </span>
                  )}
                  {hero.isFeatured && !hero.isBreaking && (
                    <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full">
                      <TrendingUp className="w-3 h-3" />
                      FEATURED
                    </span>
                  )}
                  <span className="text-white/60 text-sm uppercase tracking-wide">
                    {hero.content.type}
                  </span>
                </div>

                {/* Headline */}
                <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 leading-tight group-hover:underline underline-offset-4 decoration-2">
                  {hero.headline}
                </h2>

                {/* Excerpt */}
                {hero.excerpt && (
                  <p className="text-lg md:text-xl text-white/80 mb-6 line-clamp-2 max-w-2xl">
                    {hero.excerpt}
                  </p>
                )}

                {/* Meta */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-white/60">
                    {publishedAt && (
                      <span className="flex items-center gap-1.5 text-sm">
                        <Clock className="w-4 h-4" />
                        {publishedAt}
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-2 text-white font-medium group-hover:gap-3 transition-all">
                    Read Full Story <ArrowRight className="w-5 h-5" />
                  </span>
                </div>
              </div>
            </div>
          </article>
        </Link>
      </div>
    </section>
  );
}

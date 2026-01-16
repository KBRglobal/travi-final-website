import { Link } from "wouter";
import { Star, Heart, MapPin, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface GridItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  href: string;
  rating?: number;
  category?: string;
  location?: string;
  badge?: string;
  type: "attraction" | "restaurant" | "hotel" | "article";
}

interface BentoResultsGridProps {
  items: GridItem[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

function LargeCard({ item }: { item: GridItem }) {
  return (
    <Link href={item.href}>
      <Card
        className="group overflow-hidden cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-2xl h-full min-h-[320px] md:min-h-[400px] relative"
        data-testid={`bento-card-large-${item.id}`}
      >
        <div className="absolute inset-0">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>

        <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {item.badge && (
              <Badge
                variant="secondary"
                className="bg-[#6443F4] text-white border-0"
              >
                {item.badge}
              </Badge>
            )}
            {item.category && (
              <Badge
                variant="secondary"
                className="bg-white/90 backdrop-blur-sm text-foreground border-0"
              >
                {item.category}
              </Badge>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 rounded-full shrink-0"
            onClick={(e) => e.preventDefault()}
          >
            <Heart className="w-4 h-4" />
          </Button>
        </div>

        <CardContent className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="space-y-3">
            {item.rating && (
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-[#F4C542] text-[#F4C542]" />
                <span className="text-white font-medium text-sm">
                  {item.rating.toFixed(1)}
                </span>
              </div>
            )}
            <h3 
              className="text-xl md:text-2xl lg:text-3xl font-bold text-white line-clamp-2"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            >
              {item.title}
            </h3>
            <p className="text-white/80 text-sm md:text-base line-clamp-2">
              {item.subtitle}
            </p>
            {item.location && (
              <div className="flex items-center gap-1.5 text-white/60 text-sm">
                <MapPin className="w-3.5 h-3.5" />
                {item.location}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function SmallCard({ item }: { item: GridItem }) {
  return (
    <Link href={item.href}>
      <Card
        className="group overflow-hidden cursor-pointer border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-xl h-full"
        data-testid={`bento-card-small-${item.id}`}
      >
        <div className="aspect-[4/3] relative overflow-hidden">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {item.category && (
            <div className="absolute top-3 left-3">
              <Badge
                variant="secondary"
                className="bg-white/90 backdrop-blur-sm text-foreground border-0 text-xs"
              >
                {item.category}
              </Badge>
            </div>
          )}

          {item.badge && (
            <div className="absolute top-3 right-3">
              <Badge
                variant="secondary"
                className="bg-[#6443F4]/90 text-white border-0 text-xs"
              >
                {item.badge}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-2">
          <h3 
            className="font-semibold text-base line-clamp-2 group-hover:text-[#6443F4] transition-colors"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          >
            {item.title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2">
            {item.subtitle}
          </p>
          <div className="flex items-center justify-between gap-2 pt-1">
            {item.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-[#F4C542] text-[#F4C542]" />
                <span className="text-sm font-medium">
                  {item.rating.toFixed(1)}
                </span>
              </div>
            )}
            {item.location && (
              <div className="flex items-center gap-1 text-muted-foreground text-xs truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{item.location}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 lg:row-span-2">
          <Skeleton className="w-full h-[320px] md:h-[400px] rounded-2xl" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="lg:col-span-1">
            <Skeleton className="w-full aspect-[4/3] rounded-xl" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BentoResultsGrid({
  items,
  isLoading,
  onLoadMore,
  hasMore,
  loadingMore,
}: BentoResultsGridProps) {
  if (isLoading) {
    return (
      <section
        className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12"
        data-testid="section-bento-grid-loading"
      >
        <LoadingSkeleton />
      </section>
    );
  }

  if (!items.length) {
    return (
      <section
        className="container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-24 text-center"
        data-testid="section-bento-grid-empty"
      >
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <MapPin className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 
            className="text-xl font-semibold"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          >
            No results found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your filters or search terms to find what you're looking for.
          </p>
        </div>
      </section>
    );
  }

  const renderBentoPattern = () => {
    const rows: JSX.Element[] = [];
    let index = 0;

    while (index < items.length) {
      const rowItems = items.slice(index, index + 5);
      const isEvenRow = Math.floor(index / 5) % 2 === 0;

      if (rowItems.length >= 5) {
        rows.push(
          <div
            key={`row-${index}`}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6"
          >
            {isEvenRow ? (
              <>
                <div className="lg:col-span-2 lg:row-span-2 sm:col-span-2">
                  <LargeCard item={rowItems[0]} />
                </div>
                {rowItems.slice(1, 5).map((item) => (
                  <div key={item.id} className="lg:col-span-1">
                    <SmallCard item={item} />
                  </div>
                ))}
              </>
            ) : (
              <>
                {rowItems.slice(0, 4).map((item, i) => (
                  <div
                    key={item.id}
                    className={`lg:col-span-1 ${i < 2 ? "" : "lg:col-start-auto"}`}
                  >
                    <SmallCard item={item} />
                  </div>
                ))}
                <div className="lg:col-span-2 lg:row-span-2 sm:col-span-2 lg:col-start-4 lg:row-start-1">
                  <LargeCard item={rowItems[4]} />
                </div>
              </>
            )}
          </div>
        );
      } else {
        rows.push(
          <div
            key={`row-${index}`}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {rowItems.map((item) => (
              <div key={item.id}>
                <SmallCard item={item} />
              </div>
            ))}
          </div>
        );
      }

      index += 5;
    }

    return rows;
  };

  return (
    <section
      className="py-8 md:py-12"
      data-testid="section-bento-grid"
    >
      <div className="space-y-8 md:space-y-12">{renderBentoPattern()}</div>

      {hasMore && onLoadMore && (
        <div className="mt-12 text-center">
          <Button
            onClick={onLoadMore}
            disabled={loadingMore}
            variant="outline"
            className="gap-2 px-8 rounded-full border-[#6443F4] text-[#6443F4] hover:bg-[#6443F4]/10"
            data-testid="load-more-button"
          >
            {loadingMore ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Load More
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </section>
  );
}

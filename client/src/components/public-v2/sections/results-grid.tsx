import type { ReactNode } from "react";
import { Link } from "wouter";
import { Star, Heart, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type ResultsLayout = "grid" | "list" | "magazine";

interface ResultsGridProps {
  items: ReactNode | null;
  layout: ResultsLayout;
  isLoading?: boolean;
}

function LoadingGrid({ layout }: { layout: ResultsLayout }) {
  const count = layout === "list" ? 4 : 8;
  
  if (layout === "magazine") {
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
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === "list") {
    return (
      <div className="flex flex-col gap-4 md:gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="w-32 h-24 md:w-48 md:h-32 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className="w-full aspect-[4/3] rounded-xl" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ResultsGrid({ items, layout, isLoading }: ResultsGridProps) {
  if (isLoading) {
    return (
      <section 
        className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12"
        data-testid="section-results-grid-loading"
      >
        <LoadingGrid layout={layout} />
      </section>
    );
  }

  if (!items) {
    return null;
  }

  const getGridClass = () => {
    switch (layout) {
      case "list":
        return "flex flex-col gap-4 md:gap-6";
      case "magazine":
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6";
      case "grid":
      default:
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6";
    }
  };

  return (
    <section 
      className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12"
      data-testid="section-results-grid"
    >
      <div className={getGridClass()}>
        {items}
      </div>
    </section>
  );
}

interface MagazineCardProps {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  href: string;
  rating?: number;
  category?: string;
  location?: string;
  badge?: string;
  size?: "large" | "small";
}

export function MagazineCard({
  id,
  title,
  subtitle,
  imageUrl,
  href,
  rating,
  category,
  location,
  badge,
  size = "small",
}: MagazineCardProps) {
  if (size === "large") {
    return (
      <Link href={href}>
        <Card
          className="group overflow-hidden cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-2xl h-full min-h-[320px] md:min-h-[400px] relative"
          data-testid={`magazine-card-large-${id}`}
        >
          <div className="absolute inset-0">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>

          <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {badge && (
                <Badge variant="secondary" className="bg-[#6443F4] text-white border-0">
                  {badge}
                </Badge>
              )}
              {category && (
                <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-foreground border-0">
                  {category}
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
              {rating && (
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-[#F4C542] text-[#F4C542]" />
                  <span className="text-white font-medium text-sm">{rating.toFixed(1)}</span>
                </div>
              )}
              <h3 
                className="text-xl md:text-2xl lg:text-3xl font-bold text-white line-clamp-2"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                {title}
              </h3>
              <p className="text-white/80 text-sm md:text-base line-clamp-2">{subtitle}</p>
              {location && (
                <div className="flex items-center gap-1.5 text-white/60 text-sm">
                  <MapPin className="w-3.5 h-3.5" />
                  {location}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={href}>
      <Card
        className="group overflow-hidden cursor-pointer border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-xl h-full"
        data-testid={`magazine-card-small-${id}`}
      >
        <div className="aspect-[4/3] relative overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {category && (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-foreground border-0 text-xs">
                {category}
              </Badge>
            </div>
          )}

          {badge && (
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-[#6443F4]/90 text-white border-0 text-xs">
                {badge}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-2">
          <h3 
            className="font-semibold text-base line-clamp-2 group-hover:text-[#6443F4] transition-colors"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          >
            {title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2">{subtitle}</p>
          <div className="flex items-center justify-between gap-2 pt-1">
            {rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-[#F4C542] text-[#F4C542]" />
                <span className="text-sm font-medium">{rating.toFixed(1)}</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-1 text-muted-foreground text-xs truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

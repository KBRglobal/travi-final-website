import { Link } from "wouter";
import { ArrowRight, Star, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FeaturedItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  href: string;
  rating?: number;
  badge?: string;
  location?: string;
}

interface FeaturedSectionProps {
  title: string;
  subtitle?: string;
  items: FeaturedItem[];
  viewAllHref?: string;
}

export function FeaturedSection({
  title,
  subtitle,
  items,
  viewAllHref,
}: FeaturedSectionProps) {
  if (!items.length) return null;

  return (
    <section
      className="container mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16"
      data-testid="section-featured"
    >
      <div className="flex items-end justify-between gap-4 mb-8 md:mb-10 flex-wrap">
        <div className="space-y-2">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            data-testid="featured-title"
          >
            <span className="brand-gradient-text">{title}</span>
          </h2>
          {subtitle && (
            <p className="text-muted-foreground text-base md:text-lg max-w-xl">
              {subtitle}
            </p>
          )}
        </div>
        {viewAllHref && (
          <Button
            variant="ghost"
            className="gap-2 text-muted-foreground hover:text-foreground"
            asChild
            data-testid="featured-view-all"
          >
            <Link href={viewAllHref}>
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {items.slice(0, 2).map((item, index) => (
          <Link key={item.id} href={item.href}>
            <Card
              className="group overflow-hidden cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-2xl h-[320px] md:h-[400px] lg:h-[480px] relative"
              data-testid={`featured-card-${item.id}`}
            >
              <div className="absolute inset-0">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading={index === 0 ? "eager" : "lazy"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              </div>

              <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
                {item.badge && (
                  <Badge
                    variant="secondary"
                    className="bg-[#6443F4] text-white border-0"
                  >
                    {item.badge}
                  </Badge>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 rounded-full ml-auto"
                  onClick={(e) => e.preventDefault()}
                  data-testid={`favorite-${item.id}`}
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
                    <p className="text-white/60 text-sm">{item.location}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

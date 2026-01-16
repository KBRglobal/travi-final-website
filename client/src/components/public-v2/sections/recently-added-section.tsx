import { Link } from "wouter";
import { ArrowRight, Clock, Star, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RecentItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  href: string;
  addedDate: string;
  category?: string;
  rating?: number;
}

interface RecentlyAddedSectionProps {
  title?: string;
  items: RecentItem[];
  viewAllHref?: string;
}

export function RecentlyAddedSection({
  title = "Recently Added",
  items,
  viewAllHref,
}: RecentlyAddedSectionProps) {
  if (!items.length) return null;

  return (
    <section
      className="container mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16"
      data-testid="section-recently-added"
    >
      <div className="flex items-end justify-between gap-4 mb-8 md:mb-10 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-[#F4C542] to-[#6443F4]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            data-testid="recently-added-title"
          >
            {title}
          </h2>
        </div>
        {viewAllHref && (
          <Button
            variant="ghost"
            className="gap-2 text-muted-foreground hover:text-foreground"
            asChild
            data-testid="recently-added-view-all"
          >
            <Link href={viewAllHref}>
              See All New <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {items.slice(0, 8).map((item) => (
          <Link key={item.id} href={item.href}>
            <Card
              className="group overflow-hidden cursor-pointer border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-xl h-full"
              data-testid={`recent-card-${item.id}`}
            >
              <div className="aspect-[16/10] relative overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="absolute top-3 left-3">
                  <Badge
                    variant="secondary"
                    className="bg-[#F4C542] text-foreground border-0 font-medium text-xs"
                  >
                    New
                  </Badge>
                </div>

                {item.category && (
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant="secondary"
                      className="bg-white/90 backdrop-blur-sm text-foreground border-0 text-xs"
                    >
                      {item.category}
                    </Badge>
                  </div>
                )}
              </div>

              <CardContent className="p-4 md:p-5 space-y-2">
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
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">{item.addedDate}</span>
                  </div>
                  {item.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#F4C542] text-[#F4C542]" />
                      <span className="text-sm font-medium">
                        {item.rating.toFixed(1)}
                      </span>
                    </div>
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

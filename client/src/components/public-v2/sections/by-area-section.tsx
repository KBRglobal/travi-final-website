import { Link } from "wouter";
import { ArrowRight, MapPin, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AreaGroup {
  id: string;
  name: string;
  slug: string;
  itemCount: number;
  imageUrl: string;
  href: string;
  description?: string;
}

interface ByAreaSectionProps {
  title?: string;
  subtitle?: string;
  areas: AreaGroup[];
  viewAllHref?: string;
}

export function ByAreaSection({
  title = "Explore by Area",
  subtitle,
  areas,
  viewAllHref,
}: ByAreaSectionProps) {
  if (!areas.length) return null;

  return (
    <section
      className="container mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16"
      data-testid="section-by-area"
    >
      <div className="flex items-end justify-between gap-4 mb-8 md:mb-10 flex-wrap">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#6443F4]">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              data-testid="by-area-title"
            >
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-muted-foreground text-base md:text-lg max-w-xl ml-12">
              {subtitle}
            </p>
          )}
        </div>
        {viewAllHref && (
          <Button
            variant="ghost"
            className="gap-2 text-muted-foreground hover:text-foreground"
            asChild
            data-testid="by-area-view-all"
          >
            <Link href={viewAllHref}>
              All Areas <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {areas.slice(0, 10).map((area) => (
          <Link key={area.id} href={area.href}>
            <Card
              className="group overflow-hidden cursor-pointer border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-xl h-full"
              data-testid={`area-card-${area.slug}`}
            >
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={area.imageUrl}
                  alt={area.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 
                    className="font-semibold text-base md:text-lg text-white line-clamp-1 mb-1"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    {area.name}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {area.itemCount} {area.itemCount === 1 ? "place" : "places"}
                  </p>
                </div>

                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="p-1.5 rounded-full bg-white/20 backdrop-blur-sm">
                    <ChevronRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

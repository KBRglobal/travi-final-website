import { Link } from "wouter";
import { MapPin, Utensils, Palette, ArrowRight } from "lucide-react";
import { getDestinationCategoryConfig, type CategoryImage } from "@/data/destinationCategoryImages";
import { SafeImage } from "./ui/safe-image";

interface CategoryBentoGridProps {
  destinationSlug: string;
  destinationName: string;
  className?: string;
}

function getCategoryIcon(category: CategoryImage["category"]) {
  switch (category) {
    case "attractions":
      return <MapPin className="w-5 h-5" />;
    case "food":
      return <Utensils className="w-5 h-5" />;
    case "culture":
      return <Palette className="w-5 h-5" />;
  }
}

function getCategoryLink(destinationSlug: string, category: CategoryImage["category"]) {
  switch (category) {
    case "attractions":
      return `/${destinationSlug}/attractions`;
    case "food":
      return `/${destinationSlug}/dining`;
    case "culture":
      return `/${destinationSlug}/culture`;
  }
}

export function CategoryBentoGrid({ destinationSlug, destinationName, className = "" }: CategoryBentoGridProps) {
  const config = getDestinationCategoryConfig(destinationSlug);

  if (!config || config.images.length < 3) {
    return null;
  }

  const [attractionImage, foodImage, cultureImage] = config.images;

  return (
    <section className={`py-16 ${className}`} data-testid="category-bento-grid">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Explore {destinationName}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover the best attractions, food experiences, and cultural highlights
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto">
          <Link 
            href={getCategoryLink(destinationSlug, attractionImage.category)}
            className="group relative block h-[400px] lg:h-[520px] rounded-xl overflow-hidden hover-elevate"
            data-testid={`category-card-${attractionImage.category}`}
          >
            <SafeImage
              src={attractionImage.path}
              alt={attractionImage.alt}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-center gap-2 text-white/80 mb-2">
                {getCategoryIcon(attractionImage.category)}
                <span className="text-sm font-medium uppercase tracking-wide">
                  {attractionImage.categoryLabel}
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {destinationName} Attractions
              </h3>
              <p className="text-white/80 text-sm md:text-base mb-4 line-clamp-2">
                Explore iconic landmarks and must-see destinations
              </p>
              <span className="inline-flex items-center gap-2 text-white font-medium group-hover:gap-3 transition-all">
                Explore <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>

          <div className="flex flex-col gap-4">
            <Link 
              href={getCategoryLink(destinationSlug, foodImage.category)}
              className="group relative block h-[200px] lg:h-[254px] rounded-xl overflow-hidden hover-elevate"
              data-testid={`category-card-${foodImage.category}`}
            >
              <SafeImage
                src={foodImage.path}
                alt={foodImage.alt}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-center gap-2 text-white/80 mb-1">
                  {getCategoryIcon(foodImage.category)}
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {foodImage.categoryLabel}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">
                  {destinationName} Dining
                </h3>
                <span className="inline-flex items-center gap-2 text-white/90 text-sm font-medium group-hover:gap-3 transition-all">
                  Discover <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>

            <Link 
              href={getCategoryLink(destinationSlug, cultureImage.category)}
              className="group relative block h-[200px] lg:h-[254px] rounded-xl overflow-hidden hover-elevate"
              data-testid={`category-card-${cultureImage.category}`}
            >
              <SafeImage
                src={cultureImage.path}
                alt={cultureImage.alt}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-center gap-2 text-white/80 mb-1">
                  {getCategoryIcon(cultureImage.category)}
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {cultureImage.categoryLabel}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">
                  {destinationName} Culture
                </h3>
                <span className="inline-flex items-center gap-2 text-white/90 text-sm font-medium group-hover:gap-3 transition-all">
                  Explore <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

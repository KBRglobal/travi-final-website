import { useState } from "react";
import { Search, MapPin, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CategoryHeroSectionProps {
  categoryName: string;
  categoryDescription: string;
  itemCount: number;
  heroImageUrl: string;
  categorySlug: string;
  onSearch?: (query: string) => void;
}

export function CategoryHeroSection({
  categoryName,
  categoryDescription,
  itemCount,
  heroImageUrl,
  categorySlug,
  onSearch,
}: CategoryHeroSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    onSearch?.(searchQuery);
  };

  return (
    <section
      className="relative w-full min-h-[50vh] md:min-h-[60vh] lg:min-h-[70vh] overflow-hidden"
      data-testid={`category-hero-${categorySlug}`}
    >
      <div className="absolute inset-0">
        <img
          src={heroImageUrl}
          alt={`${categoryName} category`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30" />
      </div>

      <div className="relative container mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16 lg:py-20 flex flex-col justify-end min-h-[50vh] md:min-h-[60vh] lg:min-h-[70vh]">
        <div className="max-w-4xl space-y-6 md:space-y-8">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge
              variant="secondary"
              className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1"
              data-testid="category-count-badge"
            >
              <Sparkles className="w-3 h-3 mr-1.5" />
              {itemCount} {itemCount === 1 ? "Place" : "Places"}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1"
            >
              <MapPin className="w-3 h-3 mr-1.5" />
              Explore All Areas
            </Badge>
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            data-testid="category-title"
          >
            <span className="text-white">
              {categoryName}
            </span>
          </h1>

          <p
            className="text-lg md:text-xl text-white/90 max-w-2xl leading-relaxed"
            data-testid="category-description"
          >
            {categoryDescription}
          </p>

          <div className="relative max-w-2xl group" data-testid="category-search">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#6443F4] via-[#6443F4] to-[#F4C542] rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative flex items-center bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden">
              <Search className="w-5 h-5 text-[#6443F4] ml-5 shrink-0" />
              <Input
                type="text"
                placeholder={`Search ${categoryName.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 h-14 md:h-16 border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-0 text-base md:text-lg"
                data-testid="category-search-input"
              />
              <Button
                onClick={handleSearch}
                className="mr-2 md:mr-3 rounded-lg px-4 md:px-6 h-10 md:h-12 bg-[#6443F4] hover:bg-[#5339D9] text-white font-medium"
                data-testid="category-search-button"
              >
                Explore
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

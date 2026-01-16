import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles } from "lucide-react";

interface RecommendationItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  heroImage?: string | null;
  metaDescription?: string | null;
  category?: string;
}

interface TraviRecommendsProps {
  recommendations: RecommendationItem[];
  className?: string;
}

const placeholderImages = [
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1526495124232-a04e1849168c?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1546412414-e1885259563a?w=400&h=300&fit=crop",
];

const typeColors: Record<string, string> = {
  attraction: "bg-info",
  hotel: "bg-[#F4C542]",
  article: "bg-travi-green",
  dining: "bg-[#6443F4]",
  district: "bg-[#6443F4]",
};

export function TraviRecommends({ recommendations, className = "" }: TraviRecommendsProps) {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const displayItems = recommendations.slice(0, 4);

  return (
    <section
      className={`py-16 lg:py-20 bg-gradient-to-br from-[#6443F4]/5 via-slate-50/30 to-slate-50/30 dark:from-[#6443F4]/10 dark:via-slate-950/10 dark:to-slate-950/10 ${className}`}
      data-testid="travi-recommends-section"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-[#F4C542]" />
            <span className="text-[#F4C542] font-medium text-sm uppercase tracking-wider">
              Curated for You
            </span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
            Travi{" "}
            <span
              className="italic font-normal text-[#6443F4]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Recommends
            </span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Handpicked experiences and destinations you'll love
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayItems.map((item, index) => (
            <Link
              key={item.id}
              href={`/${item.type}/${item.slug}`}
              data-testid={`recommendation-card-${item.id}`}
            >
              <article className="group cursor-pointer">
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-4">
                  <img
                    src={item.heroImage || placeholderImages[index % placeholderImages.length]}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="absolute top-3 left-3">
                    <Badge
                      className={`${typeColors[item.type] || "bg-[#6443F4]"} text-white border-0 text-xs`}
                    >
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Badge>
                  </div>
                </div>

                <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-[#6443F4] transition-colors">
                  {item.title}
                </h3>

                {item.metaDescription && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {item.metaDescription}
                  </p>
                )}

                <div className="mt-3 flex items-center gap-1 text-sm text-[#6443F4] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore
                  <ArrowRight className="w-4 h-4" />
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

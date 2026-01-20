import { Link } from "wouter";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ArticleHeroProps {
  title: string;
  heroImage: string;
  heroImageAlt?: string;
  category?: string;
  publishedAt?: Date | string | null;
  keywords?: string[];
  backHref?: string;
  writerName?: string;
  writerAvatar?: string;
}

export function ArticleHero({
  title,
  heroImage,
  heroImageAlt,
  category,
  publishedAt,
  keywords = [],
  backHref = "/articles",
  writerName,
  writerAvatar,
}: ArticleHeroProps) {
  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <section
      className="relative w-full min-h-[60vh] lg:min-h-[70vh] flex flex-col"
      data-testid="article-hero"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
        data-testid="article-hero-image"
      >
        <img
          src={heroImage}
          alt={heroImageAlt || title}
          className="w-full h-full object-cover"
          loading="eager"
          {...{ fetchpriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>}
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20" />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="p-6 lg:p-8">
          <Link href={backHref}>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/90 hover:text-white hover:bg-white/10 gap-2"
              data-testid="button-back-to-articles"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Articles
            </Button>
          </Link>
        </div>

        <div className="mt-auto p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {category && (
                <Badge
                  className="bg-travi-green text-white border-0 px-3 py-1"
                  data-testid="article-hero-category"
                >
                  {category}
                </Badge>
              )}
              {formattedDate && (
                <div
                  className="flex items-center gap-2 text-white/80 text-sm"
                  data-testid="article-hero-date"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{formattedDate}</span>
                </div>
              )}
              {writerName && (
                <div
                  className="flex items-center gap-2 text-white/80 text-sm"
                  data-testid="article-hero-writer"
                >
                  {writerAvatar && (
                    <img
                      src={writerAvatar}
                      alt={writerName}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span>By {writerName}</span>
                </div>
              )}
            </div>

            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6"
              data-testid="article-hero-title"
            >
              {title}
            </h1>

            {keywords.length > 0 && (
              <div
                className="flex flex-wrap items-center gap-2"
                data-testid="article-hero-keywords"
              >
                <Tag className="w-4 h-4 text-white/60" />
                {keywords.slice(0, 5).map((keyword, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-white/10 text-white/90 border-white/20 backdrop-blur-sm text-xs"
                    data-testid={`article-keyword-${index}`}
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

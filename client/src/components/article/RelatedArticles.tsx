import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowRight, BookOpen } from "lucide-react";

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  heroImage?: string | null;
  metaDescription?: string | null;
  publishedAt?: Date | string | null;
  category?: string;
}

interface RelatedArticlesProps {
  articles: RelatedArticle[];
  currentArticleId?: string;
  className?: string;
}

const placeholderImages = [
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1526495124232-a04e1849168c?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1546412414-e1885259563a?w=600&h=400&fit=crop",
];

function formatDate(dateString?: Date | string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RelatedArticles({
  articles,
  currentArticleId,
  className = "",
}: RelatedArticlesProps) {
  const filteredArticles = articles
    .filter((article) => article.id !== currentArticleId)
    .slice(0, 4);

  if (filteredArticles.length === 0) {
    return null;
  }

  return (
    <section
      className={`py-16 lg:py-20 bg-background ${className}`}
      data-testid="related-articles-section"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-travi-green" />
              <span className="text-travi-green font-medium text-sm uppercase tracking-wider">
                Keep Reading
              </span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Related{" "}
              <span
                className="italic font-normal text-[#6443F4]"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Articles
              </span>
            </h2>
          </div>

          <Link
            href="/articles"
            className="hidden sm:flex items-center gap-2 text-[#6443F4] font-medium hover:underline underline-offset-4"
            data-testid="link-view-all-articles"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredArticles.map((article, index) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              data-testid={`related-article-card-${article.id}`}
            >
              <article className="group cursor-pointer h-full flex flex-col">
                <div className="relative aspect-[16/10] rounded-lg overflow-hidden mb-4">
                  <img
                    src={article.heroImage || placeholderImages[index % placeholderImages.length]}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  
                  {article.publishedAt && (
                    <div className="absolute top-3 right-3">
                      <Badge
                        variant="secondary"
                        className="bg-white/90 dark:bg-card/90 text-foreground backdrop-blur-sm text-xs gap-1"
                      >
                        <Calendar className="w-3 h-3" />
                        {formatDate(article.publishedAt)}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col">
                  {article.category && (
                    <span className="text-xs font-medium uppercase tracking-wider text-travi-green mb-2">
                      {article.category}
                    </span>
                  )}

                  <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-[#6443F4] transition-colors mb-2">
                    {article.title}
                  </h3>

                  {article.metaDescription && (
                    <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                      {article.metaDescription}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-1 text-sm text-[#6443F4] font-medium">
                    Read More
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        <div className="sm:hidden mt-8 text-center">
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 text-[#6443F4] font-medium hover:underline underline-offset-4"
            data-testid="link-view-all-articles-mobile"
          >
            View All Articles
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

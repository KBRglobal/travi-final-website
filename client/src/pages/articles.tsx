import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { ContentWithRelations } from "@shared/schema";
import { PublicNav } from "@/components/public-nav";
import { CompactHero } from "@/components/image-hero";
import { FeaturedCard, EditorialCard, SectionHeader } from "@/components/editorial-cards";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Clock, Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const heroImage = "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&h=600&fit=crop";

const placeholderImages = [
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1526495124232-a04e1849168c?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1546412414-e1885259563a?w=800&h=600&fit=crop",
];

function ArticleCardSkeleton() {
  return (
    <div className="flex gap-4 animate-pulse" aria-hidden="true">
      <div className="w-24 h-24 bg-muted rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-16 bg-muted rounded" />
        <div className="h-5 w-full bg-muted rounded" />
        <div className="h-3 w-24 bg-muted rounded" />
      </div>
    </div>
  );
}

function formatDate(dateString?: string | Date | null): string {
  if (!dateString) return "Recent";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Articles() {
  useDocumentMeta({
    title: "Dubai Travel Guides & News | Travi",
    description: "Expert insights, travel tips, and the latest news about Dubai. Discover insider guides, cultural features, and practical advice for your Dubai journey.",
    ogTitle: "Dubai Travel Stories - Travi",
    ogDescription: "Expert insights and travel guides for your Dubai adventure.",
  });

  const { data: articles = [], isLoading } = useQuery<ContentWithRelations[]>({
    queryKey: ["/api/contents?type=article&status=published"],
  });

  const featuredArticle = articles[0];
  const secondaryArticles = articles.slice(1, 4);
  const remainingArticles = articles.slice(4);

  return (
    <div className="bg-background min-h-screen">
      <PublicNav />

      <main>
        <CompactHero
          backgroundImage={heroImage}
          title="Dubai News"
          subtitle="Expert insights, tips, and guides for your Dubai journey"
        />

        <section className="py-12 lg:py-16" data-testid="section-articles-list">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            {isLoading ? (
              <div className="space-y-12">
                <div className="aspect-[21/9] bg-muted rounded-lg animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-4 animate-pulse">
                      <div className="aspect-[16/10] bg-muted rounded-lg" />
                      <div className="h-5 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-2xl font-semibold text-foreground mb-2">No news available yet</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We're crafting insightful travel stories. Check back soon for expert guides and tips.
                </p>
              </div>
            ) : (
              <>
                {featuredArticle && (
                  <div className="mb-16">
                    <FeaturedCard
                      title={featuredArticle.title}
                      description={featuredArticle.metaDescription || "Discover insights and tips for your Dubai adventure"}
                      image={featuredArticle.heroImage || placeholderImages[0]}
                      href={`/articles/${featuredArticle.slug}`}
                      category="Featured"
                      categoryColor="bg-[#02A65C]"
                      date={formatDate(featuredArticle.createdAt)}
                    />
                  </div>
                )}

                {secondaryArticles.length > 0 && (
                  <div className="mb-16">
                    <SectionHeader
                      title="Latest Stories"
                      subtitle="Fresh perspectives on Dubai travel"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {secondaryArticles.map((article, index) => (
                        <EditorialCard
                          key={article.id}
                          title={article.title}
                          excerpt={article.metaDescription || undefined}
                          image={article.heroImage || placeholderImages[(index + 1) % 4]}
                          href={`/articles/${article.slug}`}
                          category="News"
                          categoryColor="text-[#02A65C]"
                          date={formatDate(article.createdAt)}
                          readTime="5 min read"
                          size="medium"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {remainingArticles.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2">
                      <h3 className="text-xl font-semibold text-foreground mb-6 pb-3 border-b">
                        More Stories
                      </h3>
                      <div className="divide-y">
                        {remainingArticles.map((article, index) => (
                          <Link key={article.id} href={`/articles/${article.slug}`}>
                            <article 
                              className="group py-6 first:pt-0 last:pb-0 cursor-pointer"
                              data-testid={`card-article-${article.id}`}
                            >
                              <div className="flex gap-6">
                                <div className="hidden sm:block shrink-0 w-40 lg:w-48">
                                  <div className="relative aspect-[16/10] rounded-lg overflow-hidden">
                                    <img
                                      src={article.heroImage || placeholderImages[index % 4]}
                                      alt={article.heroImageAlt || article.title}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      loading="lazy"
                                    />
                                  </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-medium uppercase tracking-wider text-[#02A65C] mb-2 block">
                                    Article
                                  </span>
                                  
                                  <h4 className="text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2">
                                    {article.title}
                                  </h4>
                                  
                                  {article.metaDescription && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                      {article.metaDescription}
                                    </p>
                                  )}
                                  
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(article.createdAt)}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      5 min read
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </article>
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-6 pb-3 border-b">
                        Categories
                      </h3>
                      <div className="space-y-3">
                        {['Travel Tips', 'Culture', 'Food & Dining', 'Adventure', 'Nightlife', 'Shopping'].map((cat) => (
                          <Link 
                            key={cat}
                            href={`/articles?category=${cat.toLowerCase().replace(/\s+/g, '-')}`}
                            className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                          >
                            <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                              {cat}
                            </span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </Link>
                        ))}
                      </div>

                      <div className="mt-8 p-6 rounded-lg bg-gradient-to-br from-[#02A65C] to-[#1ed47f]">
                        <h4 className="text-white font-semibold mb-2">Subscribe to our newsletter</h4>
                        <p className="text-white/80 text-sm mb-4">
                          Get the latest travel tips and stories delivered to your inbox.
                        </p>
                        <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
                          <input
                            type="email"
                            placeholder="Your email"
                            className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 outline-none focus:border-white/40 text-sm"
                            data-testid="input-sidebar-newsletter"
                          />
                          <button 
                            type="submit"
                            className="w-full px-4 py-2.5 rounded-lg bg-white text-[#02A65C] font-medium text-sm hover:bg-white/90 transition-colors"
                            data-testid="button-sidebar-subscribe"
                          >
                            Subscribe
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <footer className="py-8 border-t bg-muted/30">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center text-sm text-muted-foreground">
            <p>Travi - Your Dubai Travel Companion</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

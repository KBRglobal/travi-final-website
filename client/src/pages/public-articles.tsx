import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import {
  Search, Clock, ChevronRight, ArrowRight,
  Newspaper, Globe, User, BookOpen, Sparkles,
  TrendingUp, Filter, X
} from "lucide-react";
import type { ContentWithRelations } from "@shared/schema";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { useState, useMemo, useRef } from "react";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { LazyImage } from "@/components/ui/lazy-image";
import { FavoriteButton } from "@/components/ui/favorite-button";

const defaultImages = [
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1526495124232-a04e1849168c?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1546412414-e1885259563a?w=800&h=600&fit=crop",
];

const categoryFilters = [
  { id: "all", label: "All Stories", icon: Globe },
  { id: "news", label: "News", icon: Newspaper },
  { id: "guides", label: "Guides", icon: BookOpen },
  { id: "insights", label: "Insights", icon: TrendingUp },
  { id: "featured", label: "Featured", icon: Sparkles },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  },
};

function usePreferredMotion() {
  const prefersReducedMotion = useReducedMotion();
  return !prefersReducedMotion;
}

function FeaturedArticleCard({ 
  contents, 
  t, 
  localePath 
}: { 
  contents: ContentWithRelations; 
  t: (key: string) => string; 
  localePath: (path: string) => string;
}) {
  const shouldAnimate = usePreferredMotion();
  const imageUrl = contents.heroImage || defaultImages[0];
  const category = contents.article?.category || "news";
  const readTime = getReadTime(contents);
  const date = getArticleDate(contents);
  
  const cardContent = (
    <Link href={localePath(`/articles/${contents.slug}`)}>
      <div
        className="group relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 h-full min-h-[400px] md:min-h-[500px] cursor-pointer"
        data-testid={`card-featured-article-${contents.slug}`}
      >
        <div className="absolute inset-0 overflow-hidden">
          <LazyImage
            src={imageUrl}
            alt={contents.heroImageAlt || contents.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0A1F] via-[#0B0A1F]/60 to-transparent" />
        </div>
        
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-[#6443F4]/20 to-[#E84C9A]/10" />
        
        <FavoriteButton
          id={String(contents.id)}
          type="article"
          title={contents.title}
          image={imageUrl}
          slug={contents.slug}
          className="absolute top-4 right-4 z-20 bg-white/20 backdrop-blur-md hover:bg-white/30 border border-white/20"
        />

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-10">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#6443F4] to-[#E84C9A] text-white">
              {t(`articlesPage.categories.${category}`) || t("articlesPage.categories.news")}
            </span>
            <span className="text-white/70 text-sm">{date}</span>
            <span className="text-white/70 text-sm flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {readTime}
            </span>
          </div>
          
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 line-clamp-3 group-hover:text-white/90 transition-colors" style={{ fontFamily: "'Chillax', var(--font-sans)", letterSpacing: '-0.02em' }}>
            {contents.title}
          </h2>
          
          {contents.metaDescription && (
            <p className="text-white/70 text-base md:text-lg line-clamp-2 mb-4">
              {contents.metaDescription}
            </p>
          )}
          
          <div className="flex items-center gap-2 text-[#E84C9A] font-medium group-hover:gap-3 transition-all">
            <span>{t("articlesPage.readMore") || "Read Story"}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6443F4] to-[#E84C9A] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      </div>
    </Link>
  );

  if (!shouldAnimate) return cardContent;

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-50px" }}
      variants={scaleIn}
      className="col-span-1 md:col-span-2 row-span-1 md:row-span-2"
    >
      {cardContent}
    </motion.div>
  );
}

function ArticleCard({ 
  contents, 
  index, 
  t, 
  localePath,
  variant = "default"
}: { 
  contents: ContentWithRelations; 
  index: number; 
  t: (key: string) => string; 
  localePath: (path: string) => string;
  variant?: "default" | "compact";
}) {
  const shouldAnimate = usePreferredMotion();
  const imageUrl = contents.heroImage || defaultImages[index % defaultImages.length];
  const category = contents.article?.category || "news";
  const readTime = getReadTime(contents);
  const date = getArticleDate(contents);
  
  const cardContent = (
    <Link href={localePath(`/articles/${contents.slug}`)}>
      <Card
        className="group overflow-hidden border-0 bg-white dark:bg-slate-900/50 dark:backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer h-full rounded-2xl relative"
        data-testid={`card-article-${contents.slug}`}
      >
        <div className={`relative overflow-hidden ${variant === "compact" ? "aspect-[16/10]" : "aspect-video"}`}>
          <LazyImage
            src={imageUrl}
            alt={contents.heroImageAlt || contents.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          
          <FavoriteButton
            id={String(contents.id)}
            type="article"
            title={contents.title}
            image={imageUrl}
            slug={contents.slug}
            className="absolute top-3 right-3 bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800"
          />
          
          <div className="absolute bottom-3 left-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-[#6443F4] to-[#E84C9A] text-white shadow-lg">
              {t(`articlesPage.categories.${category}`) || t("articlesPage.categories.news")}
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3 mb-3 text-sm text-muted-foreground">
            <span>{date}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {readTime}
            </span>
          </div>
          
          <h3 className="font-bold text-foreground text-lg leading-snug line-clamp-2 group-hover:text-[#6443F4] dark:group-hover:text-[#E84C9A] transition-colors mb-2" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
            {contents.title}
          </h3>
          
          {contents.metaDescription && variant !== "compact" && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {contents.metaDescription}
            </p>
          )}
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#6443F4] to-[#E84C9A] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      </Card>
    </Link>
  );

  if (!shouldAnimate) return cardContent;

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-30px" }}
      variants={fadeInUp}
      custom={index}
    >
      {cardContent}
    </motion.div>
  );
}

function getArticleDate(contents: ContentWithRelations) {
  return contents.publishedAt 
    ? format(new Date(contents.publishedAt), "MMM d, yyyy")
    : contents.createdAt 
      ? format(new Date(contents.createdAt), "MMM d, yyyy")
      : "Recent";
}

function getReadTime(contents: ContentWithRelations) {
  const blocks = contents.blocks as Array<{type: string, contents?: {text?: string}}> | null;
  if (!blocks) return "5 min";
  const textContent = blocks
    .filter(b => b.type === "text")
    .map(b => b.contents?.text || "")
    .join(" ");
  const wordCount = textContent.split(/\s+/).length;
  const minutes = Math.max(3, Math.ceil(wordCount / 200));
  return `${minutes} min`;
}

export default function PublicArticles() {
  const { t, isRTL, localePath } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const shouldAnimate = usePreferredMotion();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useDocumentMeta({
    title: t("articlesPage.metaTitle"),
    description: t("articlesPage.metaDescription"),
    ogTitle: t("articlesPage.ogTitle"),
    ogDescription: t("articlesPage.ogDescription"),
    ogType: "website",
  });

  const { data: allContent, isLoading } = useQuery<ContentWithRelations[]>({
    queryKey: ["/api/public/contents?includeExtensions=true"],
  });

  const articles = allContent?.filter(c => c.type === "article") || [];

  const filteredArticles = useMemo(() => {
    let result = articles;
    
    if (activeCategory !== "all") {
      result = result.filter(a => {
        const category = a.article?.category || "news";
        return category === activeCategory;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.metaDescription?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [articles, searchQuery, activeCategory]);

  const featuredArticle = filteredArticles[0];
  const remainingArticles = filteredArticles.slice(1);
  const bentoArticles = remainingArticles.slice(0, 4);
  const gridArticles = remainingArticles.slice(4);

  const heroContent = (
    <>
      <div className="mb-6">
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white/90 text-sm font-medium">
          <Newspaper className="w-4 h-4 text-[#E84C9A]" />
          Travel Stories & Insights
        </span>
      </div>
      
      <h1 
        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
        style={{ fontFamily: "'Chillax', var(--font-sans)", letterSpacing: '-0.03em' }}
        data-testid="heading-articles-hero"
      >
        <span className="text-white">Latest</span>{" "}
        <span className="bg-gradient-to-r from-[#6443F4] via-[#E84C9A] to-[#6443F4] bg-clip-text text-transparent">
          Travel Stories
        </span>
      </h1>
      
      <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">
        {t("articlesPage.pageSubtitle") || "Discover curated travel insights, destination guides, and expert tips to inspire your next adventure."}
      </p>

      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
          <div className="flex items-center">
            <Search className={`w-5 h-5 text-white/50 absolute ${isRTL ? "right-5" : "left-5"}`} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={t("articlesPage.searchPlaceholder") || "Search stories..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`flex-1 bg-transparent outline-none py-4 text-white placeholder:text-white/40 ${isRTL ? "pr-14 pl-12" : "pl-14 pr-12"}`}
              data-testid="input-search-articles"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={`absolute ${isRTL ? "left-4" : "right-4"} p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors`}
                data-testid="button-clear-search-input"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        {categoryFilters.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-r from-[#6443F4] to-[#E84C9A] text-white shadow-lg shadow-[#6443F4]/25"
                  : "bg-white/10 backdrop-blur-sm text-white/80 hover:bg-white/20 border border-white/10"
              }`}
              data-testid={`button-category-${cat.id}`}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="bg-background min-h-screen flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
      <PublicNav />

      <section 
        className="relative min-h-[70vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden bg-[#0B0A1F]"
        data-testid="section-articles-hero"
      >
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&h=1080&fit=crop"
            alt="Travel landscape"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0A1F]/80 via-[#0B0A1F]/70 to-[#0B0A1F]" />
        </div>
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#6443F4]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#E84C9A]/15 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-16 md:py-24">
          {shouldAnimate ? (
            <motion.div
              initial="hidden"
              animate="show"
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp}>{heroContent}</motion.div>
            </motion.div>
          ) : (
            heroContent
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 -mt-8 relative z-20">
        <Breadcrumbs />
      </div>

      <main className="flex-1 py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-1" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                {searchQuery ? t("articlesPage.searchResults") : t("articlesPage.latestArticles")}
              </h2>
              <p className="text-muted-foreground">
                {isLoading ? t("articlesPage.loading") : t("articlesPage.articlesFound").replace("{count}", String(filteredArticles.length))}
              </p>
            </div>
            
            {(searchQuery || activeCategory !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
                className="gap-2"
                data-testid="button-clear-filters"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </Button>
            )}
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-video bg-muted rounded-2xl mb-3" />
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-full" />
                </div>
              ))}
            </div>
          ) : filteredArticles.length > 0 ? (
            <>
              {featuredArticle && (
                <section className="mb-12" data-testid="section-bento-grid">
                  {shouldAnimate ? (
                    <motion.div
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true }}
                      variants={staggerContainer}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
                    >
                      <FeaturedArticleCard 
                        contents={featuredArticle} 
                        t={t} 
                        localePath={localePath} 
                      />
                      
                      <div className="flex flex-col gap-4 md:gap-6">
                        {bentoArticles.slice(0, 2).map((article, index) => (
                          <ArticleCard 
                            key={article.id} 
                            contents={article} 
                            index={index + 1} 
                            t={t} 
                            localePath={localePath}
                            variant="compact"
                          />
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      <div className="col-span-1 md:col-span-2 row-span-1 md:row-span-2">
                        <FeaturedArticleCard 
                          contents={featuredArticle} 
                          t={t} 
                          localePath={localePath} 
                        />
                      </div>
                      
                      <div className="flex flex-col gap-4 md:gap-6">
                        {bentoArticles.slice(0, 2).map((article, index) => (
                          <ArticleCard 
                            key={article.id} 
                            contents={article} 
                            index={index + 1} 
                            t={t} 
                            localePath={localePath}
                            variant="compact"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {bentoArticles.length > 2 && (
                <section className="mb-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {bentoArticles.slice(2).map((article, index) => (
                      <ArticleCard 
                        key={article.id} 
                        contents={article} 
                        index={index + 3} 
                        t={t} 
                        localePath={localePath}
                      />
                    ))}
                  </div>
                </section>
              )}

              {gridArticles.length > 0 && (
                <section data-testid="section-articles-grid">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    <span className="text-muted-foreground text-sm font-medium px-4">More Stories</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  </div>
                  
                  {shouldAnimate ? (
                    <motion.div
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true }}
                      variants={staggerContainer}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                      {gridArticles.map((article, index) => (
                        <ArticleCard 
                          key={article.id} 
                          contents={article} 
                          index={index + 5} 
                          t={t} 
                          localePath={localePath} 
                        />
                      ))}
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {gridArticles.map((article, index) => (
                        <ArticleCard 
                          key={article.id} 
                          contents={article} 
                          index={index + 5} 
                          t={t} 
                          localePath={localePath} 
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6443F4]/10 to-[#E84C9A]/10 flex items-center justify-center mx-auto mb-6">
                <Newspaper className="w-10 h-10 text-[#6443F4]" />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                {t("articlesPage.noArticlesFound")}
              </h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                {searchQuery ? t("articlesPage.tryDifferentSearch") : t("articlesPage.articlesWillAppear")}
              </p>
              {(searchQuery || activeCategory !== "all") && (
                <Button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                  className="bg-gradient-to-r from-[#6443F4] to-[#E84C9A] text-white hover:opacity-90"
                  data-testid="button-clear-search"
                >
                  {t("articlesPage.clearSearch")}
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

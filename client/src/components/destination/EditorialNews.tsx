/**
 * EditorialNews Section - Magazine-Style News Layout
 * Resembles a real media/news site, NOT small boxed tiles.
 * Featured image + headline in editorial style.
 */

import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Clock, Newspaper } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  imageAlt: string;
  publishedAt: string;
  readTime: string;
  category: string;
  slug: string;
}

interface EditorialNewsProps {
  articles?: NewsArticle[];
  destinationName: string;
  destinationSlug: string;
}

export function EditorialNews({ 
  articles,
  destinationName,
  destinationSlug 
}: EditorialNewsProps) {
  const placeholderArticles: NewsArticle[] = [
    {
      id: "1",
      title: `What's New in ${destinationName}: Latest Travel Updates`,
      excerpt: `Discover the latest developments, new attractions, and travel tips for visiting ${destinationName} this season.`,
      imageUrl: `/cards/${destinationSlug}.webp`,
      imageAlt: `Travel news about ${destinationName}`,
      publishedAt: new Date().toISOString(),
      readTime: "5 min read",
      category: "Travel News",
      slug: `/news/${destinationSlug}-travel-updates`,
    },
    {
      id: "2",
      title: `Hidden Gems: Secret Spots in ${destinationName}`,
      excerpt: `Beyond the tourist trail - explore the local favorites and hidden corners of ${destinationName}.`,
      imageUrl: `/cards/${destinationSlug}.webp`,
      imageAlt: `Hidden gems in ${destinationName}`,
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      readTime: "7 min read",
      category: "Guides",
      slug: `/guides/${destinationSlug}-hidden-gems`,
    },
    {
      id: "3",
      title: `Best Time to Visit ${destinationName} in 2025`,
      excerpt: `Planning your trip? Here's everything you need to know about the perfect time to explore ${destinationName}.`,
      imageUrl: `/cards/${destinationSlug}.webp`,
      imageAlt: `When to visit ${destinationName}`,
      publishedAt: new Date(Date.now() - 172800000).toISOString(),
      readTime: "4 min read",
      category: "Planning",
      slug: `/guides/${destinationSlug}-best-time-visit`,
    },
  ];

  const displayArticles = articles && articles.length > 0 ? articles : placeholderArticles;
  const featuredArticle = displayArticles[0];
  const sideArticles = displayArticles.slice(1, 3);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <section 
      className="relative py-16 md:py-24 bg-transparent"
      data-testid="section-editorial-news"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full text-xs font-semibold tracking-[0.15em] uppercase bg-primary/10 text-primary mb-4">
            <Newspaper className="w-3 h-3 inline mr-1" />
            Latest Updates
          </span>
          <h2 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          >
            {destinationName} News
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
            Stay informed with the latest travel updates and insider tips
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="lg:col-span-3 relative group overflow-hidden rounded-xl lg:rounded-2xl min-h-[400px] md:min-h-[500px]"
          >
            <Link href={featuredArticle.slug}>
              <img
                src={featuredArticle.imageUrl}
                alt={featuredArticle.imageAlt}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              
              <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 lg:p-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                    {featuredArticle.category}
                  </span>
                  <span className="flex items-center gap-1 text-white/70 text-xs">
                    <Calendar className="w-3 h-3" />
                    {formatDate(featuredArticle.publishedAt)}
                  </span>
                  <span className="flex items-center gap-1 text-white/70 text-xs">
                    <Clock className="w-3 h-3" />
                    {featuredArticle.readTime}
                  </span>
                </div>
                <h3 
                  className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 group-hover:underline decoration-2 underline-offset-4"
                  style={{ 
                    fontFamily: "'Chillax', var(--font-sans)",
                    textShadow: "0 2px 20px rgba(0,0,0,0.5)"
                  }}
                  data-testid="news-featured-title"
                >
                  {featuredArticle.title}
                </h3>
                <p 
                  className="text-white/85 text-base md:text-lg max-w-2xl line-clamp-2"
                  style={{ textShadow: "0 1px 10px rgba(0,0,0,0.4)" }}
                >
                  {featuredArticle.excerpt}
                </p>
              </div>
            </Link>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="lg:col-span-2 flex flex-col gap-6"
          >
            {sideArticles.map((article) => (
              <motion.div
                key={article.id}
                variants={staggerItem}
                className="relative group overflow-hidden rounded-xl min-h-[200px] md:min-h-[240px] flex-1"
              >
                <Link href={article.slug}>
                  <img
                    src={article.imageUrl}
                    alt={article.imageAlt}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  
                  <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/90 text-primary-foreground">
                        {article.category}
                      </span>
                      <span className="text-white/60 text-[10px]">
                        {formatDate(article.publishedAt)}
                      </span>
                    </div>
                    <h4 
                      className="text-lg md:text-xl font-bold text-white line-clamp-2 group-hover:underline decoration-1 underline-offset-2"
                      style={{ textShadow: "0 1px 10px rgba(0,0,0,0.5)" }}
                      data-testid={`news-article-${article.id}`}
                    >
                      {article.title}
                    </h4>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-10 md:mt-14"
        >
          <Link href={`/news?destination=${destinationSlug}`}>
            <Button size="lg" variant="outline" className="group/btn">
              Read More News
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Clock, ChevronRight, TrendingUp, Mail, ArrowRight,
  Globe, Eye, Search, Bell, Zap, Briefcase, Cpu,
  Theater, Plane, MessageSquare, Loader2, MapPin,
  Radio, User, Quote
} from "lucide-react";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContentWithRelations } from "@shared/schema";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

const defaultImages = [
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop",
];

function extractTrendingTopics(articles: ContentWithRelations[]): { term: string; count: number }[] {
  const wordFreq = new Map<string, number>();
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once', 'new', 'first', 'last', 'long', 'great', 'little', 'own', 'after', 'before', 'about', 'into']);
  
  articles.forEach(article => {
    const words = article.title.toLowerCase().split(/\s+/);
    words.forEach(word => {
      const clean = word.replace(/[^a-z]/g, '');
      if (clean.length > 3 && !stopWords.has(clean)) {
        wordFreq.set(clean, (wordFreq.get(clean) || 0) + 1);
      }
    });
  });
  
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([term, count]) => ({ term: term.charAt(0).toUpperCase() + term.slice(1), count }));
}

const NEWS_CATEGORIES = [
  { id: "world", name: "World", icon: Globe },
  { id: "business", name: "Business", icon: Briefcase },
  { id: "culture", name: "Culture", icon: Theater },
  { id: "travel", name: "Travel", icon: Plane },
  { id: "tech", name: "Tech", icon: Cpu },
  { id: "opinion", name: "Opinion", icon: MessageSquare },
];

const DESTINATION_TO_REGION: Record<string, { region: string; code: string }> = {
  'dubai': { region: 'Middle East', code: 'ME' },
  'abu-dhabi': { region: 'Middle East', code: 'ME' },
  'ras-al-khaimah': { region: 'Middle East', code: 'ME' },
  'tokyo': { region: 'Asia Pacific', code: 'AP' },
  'bangkok': { region: 'Asia Pacific', code: 'AP' },
  'singapore': { region: 'Asia Pacific', code: 'AP' },
  'paris': { region: 'Europe', code: 'EU' },
  'london': { region: 'Europe', code: 'EU' },
  'istanbul': { region: 'Europe', code: 'EU' },
  'new-york': { region: 'Americas', code: 'NA' },
  'los-angeles': { region: 'Americas', code: 'NA' },
  'miami': { region: 'Americas', code: 'NA' },
};

const KEYWORD_TO_REGION: Array<{ keywords: string[]; region: string; code: string }> = [
  { keywords: ['japan', 'tokyo', 'osaka', 'kyoto', 'japanese'], region: 'Asia Pacific', code: 'AP' },
  { keywords: ['china', 'beijing', 'shanghai', 'chinese'], region: 'Asia Pacific', code: 'AP' },
  { keywords: ['thailand', 'bangkok', 'thai'], region: 'Asia Pacific', code: 'AP' },
  { keywords: ['singapore', 'singaporean'], region: 'Asia Pacific', code: 'AP' },
  { keywords: ['korea', 'seoul', 'korean'], region: 'Asia Pacific', code: 'AP' },
  { keywords: ['india', 'mumbai', 'delhi', 'indian'], region: 'Asia Pacific', code: 'AP' },
  { keywords: ['australia', 'sydney', 'melbourne'], region: 'Asia Pacific', code: 'AP' },
  { keywords: ['dubai', 'uae', 'abu dhabi', 'emirates', 'emirati'], region: 'Middle East', code: 'ME' },
  { keywords: ['saudi', 'riyadh', 'jeddah'], region: 'Middle East', code: 'ME' },
  { keywords: ['qatar', 'doha'], region: 'Middle East', code: 'ME' },
  { keywords: ['israel', 'tel aviv', 'jerusalem'], region: 'Middle East', code: 'ME' },
  { keywords: ['france', 'paris', 'french'], region: 'Europe', code: 'EU' },
  { keywords: ['uk', 'london', 'britain', 'british', 'england'], region: 'Europe', code: 'EU' },
  { keywords: ['germany', 'berlin', 'munich', 'german'], region: 'Europe', code: 'EU' },
  { keywords: ['italy', 'rome', 'milan', 'italian'], region: 'Europe', code: 'EU' },
  { keywords: ['spain', 'madrid', 'barcelona', 'spanish'], region: 'Europe', code: 'EU' },
  { keywords: ['portugal', 'lisbon'], region: 'Europe', code: 'EU' },
  { keywords: ['usa', 'america', 'american', 'u.s.', 'united states'], region: 'Americas', code: 'NA' },
  { keywords: ['new york', 'los angeles', 'miami', 'california', 'texas'], region: 'Americas', code: 'NA' },
  { keywords: ['canada', 'toronto', 'vancouver', 'canadian'], region: 'Americas', code: 'NA' },
  { keywords: ['mexico', 'cancun', 'mexican'], region: 'Americas', code: 'NA' },
  { keywords: ['brazil', 'rio', 'sao paulo'], region: 'Americas', code: 'NA' },
  { keywords: ['africa', 'egypt', 'cairo', 'morocco', 'south africa', 'kenya'], region: 'Africa', code: 'AF' },
];

function detectRegionFromContent(title: string, destinationId?: string | null): { region: string; code: string } {
  if (destinationId && DESTINATION_TO_REGION[destinationId]) {
    return DESTINATION_TO_REGION[destinationId];
  }
  
  const titleLower = title.toLowerCase();
  for (const entry of KEYWORD_TO_REGION) {
    if (entry.keywords.some(kw => titleLower.includes(kw))) {
      return { region: entry.region, code: entry.code };
    }
  }
  
  return { region: 'Global', code: 'GL' };
}

function getRegionsFromArticles(articles: ContentWithRelations[]): { name: string; articles: number; code: string }[] {
  const regionMap = new Map<string, { count: number; code: string }>();
  
  articles.forEach(article => {
    const destId = article.article?.destinationId || null;
    const { region, code } = detectRegionFromContent(article.title, destId);
    
    const existing = regionMap.get(region);
    if (existing) {
      existing.count++;
    } else {
      regionMap.set(region, { count: 1, code });
    }
  });
  
  return Array.from(regionMap.entries())
    .map(([name, data]) => ({ name, articles: data.count, code: data.code }))
    .sort((a, b) => b.articles - a.articles)
    .slice(0, 6);
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

function getArticleDate(content: ContentWithRelations): string {
  return content.publishedAt
    ? format(new Date(content.publishedAt), "MMM d, yyyy")
    : content.createdAt
      ? format(new Date(content.createdAt), "MMM d, yyyy")
      : "Recent";
}

function getTimeAgo(content: ContentWithRelations): string {
  const date = content.publishedAt || content.createdAt;
  if (!date) return "Just now";
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getReadTime(content: ContentWithRelations): string {
  const blocks = content.blocks as Array<{ type: string; contents?: { text?: string } }> | null;
  if (!blocks) return "5 min read";
  const textContent = blocks
    .filter((b) => b.type === "text")
    .map((b) => b.contents?.text || "")
    .join(" ");
  const wordCount = textContent.split(/\s+/).length;
  const minutes = Math.max(3, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}

function getCategoryColor(category?: string | null): string {
  const colors: Record<string, string> = {
    world: "bg-[#6443F4]",
    business: "bg-emerald-600",
    culture: "bg-amber-600",
    travel: "bg-sky-600",
    tech: "bg-[#6443F4]",
    opinion: "bg-rose-600",
    news: "bg-[#6443F4]",
  };
  return colors[category?.toLowerCase() || "news"] || "bg-[#6443F4]";
}

function getBreakingNews(articles: ContentWithRelations[]): string[] {
  return articles.slice(0, 8).map((a) => a.title);
}

export default function PublicNews() {
  const { localePath } = useLocale();
  const [email, setEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const { toast } = useToast();

  useDocumentMeta({
    title: "Global News | Breaking World News, Business & Culture | 2026",
    description:
      "Stay informed with breaking international news, business insights, cultural stories, and expert analysis. Your trusted source for global journalism.",
    ogTitle: "Global News | Breaking International Coverage 2026",
    ogDescription:
      "Breaking news and in-depth coverage of world events, business, culture, travel, and opinion from trusted journalists worldwide.",
    ogType: "website",
  });

  const { data: allContent, isLoading } = useQuery<ContentWithRelations[]>({
    queryKey: ["/api/public/contents?includeExtensions=true"],
  });

  const subscribeMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest("POST", "/api/newsletter/subscribe", { email });
    },
    onSuccess: () => {
      toast({
        title: "Subscribed!",
        description: "Please check your email to confirm your subscription.",
      });
      setEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      subscribeMutation.mutate(email);
    } else {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast({
        title: "Search",
        description: `Searching for "${searchQuery}"...`,
      });
    }
  };

  const articles = useMemo(() => {
    let published =
      allContent?.filter((c) => c.type === "article" && c.status === "published") || [];
    
    if (activeCategory !== "all") {
      published = published.filter((c) => 
        c.article?.category?.toLowerCase() === activeCategory.toLowerCase()
      );
    }
    
    return published.sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [allContent, activeCategory]);

  const heroArticle = articles[0];
  const secondaryHeroArticles = articles.slice(1, 4);
  const topStories = articles.slice(4, 12);
  const opinionArticles = articles.slice(12, 15);
  const liveUpdates = articles.slice(0, 10);
  const regionalArticles = articles.slice(15, 25);
  const breakingNews = useMemo(() => getBreakingNews(articles), [articles]);
  const trendingTopics = useMemo(() => extractTrendingTopics(articles), [articles]);
  const regions = useMemo(() => getRegionsFromArticles(articles), [articles]);

  const totalStories = articles.length;
  const totalCategories = NEWS_CATEGORIES.length;
  const totalRegions = regions.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white" data-testid="news-loading">
        <div className="h-10 bg-slate-900" />
        <div className="bg-white border-b border-slate-200 py-4">
          <div className="max-w-7xl mx-auto px-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <Skeleton className="aspect-[16/9] w-full rounded-md" />
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="overflow-hidden bg-white p-0">
                    <Skeleton className="aspect-[16/10] w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            <div className="lg:col-span-4 space-y-4">
              <Skeleton className="h-64 w-full rounded-md" />
              <Skeleton className="h-48 w-full rounded-md" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="news-portal">
      <PublicNav />
      
      <div className="bg-slate-900 text-white mt-20" data-testid="breaking-news-ticker">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center h-10">
            <div className="flex-shrink-0 bg-[#6443F4] h-full px-4 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <Zap className="w-3.5 h-3.5" />
              <span className="text-xs font-bold tracking-wide uppercase">Breaking</span>
            </div>
            <div className="overflow-hidden flex-1 px-4">
              <div className="animate-marquee whitespace-nowrap flex items-center gap-8">
                {[...breakingNews, ...breakingNews].map((news, i) => (
                  <span key={i} className="text-sm flex items-center gap-3">
                    <span className="w-1 h-1 rounded-full bg-white/50" />
                    {news}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <header className="bg-white border-b border-slate-200" data-testid="news-header">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-6">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight" style={{ fontFamily: "'Chillax', var(--font-sans)" }} data-testid="text-portal-title">
                Global News
              </h1>
              <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
                <span className="font-medium">{format(new Date(), "EEEE")}</span>
                <span className="text-slate-300">|</span>
                <span>{format(new Date(), "MMMM d, yyyy")}</span>
                <span className="text-slate-300">|</span>
                <span className="text-[#6443F4] font-medium">International Edition</span>
              </div>
            </div>
            <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search news, topics, regions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-50 border-slate-200 focus:bg-white"
                  data-testid="input-search"
                />
              </div>
              <Button type="submit" className="bg-[#6443F4] text-white" data-testid="button-search">
                Search
              </Button>
            </form>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="hidden sm:flex border-slate-200 gap-2" data-testid="button-subscribe-header">
                <Mail className="w-4 h-4" />
                Subscribe
              </Button>
              <Button variant="ghost" size="icon" data-testid="button-notifications">
                <Bell className="w-5 h-5 text-slate-600" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm" data-testid="nav-categories">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-hide">
            <Button
              variant={activeCategory === "all" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "font-medium whitespace-nowrap",
                activeCategory === "all" ? "bg-[#6443F4] text-white" : "text-slate-700"
              )}
              onClick={() => setActiveCategory("all")}
              data-testid="button-category-all"
            >
              All News
            </Button>
            {NEWS_CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "gap-1.5 whitespace-nowrap",
                  activeCategory === cat.id ? "bg-[#6443F4] text-white" : "text-slate-600"
                )}
                onClick={() => setActiveCategory(cat.id)}
                data-testid={`button-category-${cat.id}`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8" data-testid="news-main">
        <section className="grid lg:grid-cols-12 gap-6 mb-12" data-testid="section-hero">
          <div className="lg:col-span-8">
            {heroArticle && (
              <Link href={localePath(`/articles/${heroArticle.slug}`)}>
                <article className="group cursor-pointer relative overflow-hidden rounded-lg" data-testid="card-hero-article">
                  <div className="aspect-[16/9] relative">
                    <img
                      src={heroArticle.heroImage || defaultImages[0]}
                      alt={heroArticle.heroImageAlt || heroArticle.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                      <Badge className="bg-[#6443F4] text-white border-0 mb-3" data-testid="badge-top-story">
                        Top Story
                      </Badge>
                      <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: "'Chillax', var(--font-sans)" }} data-testid="text-hero-headline">
                        {heroArticle.title}
                      </h2>
                      <p className="text-white/80 text-sm md:text-base lg:text-lg line-clamp-2 mb-4 max-w-3xl" data-testid="text-hero-excerpt">
                        {heroArticle.metaDescription}
                      </p>
                      <div className="flex items-center gap-4 text-white/70 text-sm flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <User className="w-4 h-4" />
                          Editorial Team
                        </span>
                        <span>{getArticleDate(heroArticle)}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {getReadTime(heroArticle)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {formatViews(heroArticle.viewCount || 0)} views
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            )}
          </div>

          <aside className="lg:col-span-4 space-y-4" data-testid="sidebar-secondary-stories">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                <TrendingUp className="w-4 h-4 text-[#6443F4]" />
                Also Today
              </h3>
            </div>
            <div className="space-y-4">
              {secondaryHeroArticles.map((article, idx) => (
                <Link key={article.id} href={localePath(`/articles/${article.slug}`)}>
                  <Card className="group cursor-pointer overflow-hidden bg-white p-0" data-testid={`card-secondary-${idx + 1}`}>
                    <div className="flex">
                      <div className="w-28 h-24 flex-shrink-0">
                        <img
                          src={article.heroImage || defaultImages[(idx + 1) % 6]}
                          alt={article.heroImageAlt || article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 p-3 min-w-0">
                        <Badge variant="secondary" className={`${getCategoryColor(article.article?.category)} text-white border-0 text-[10px] mb-1.5`}>
                          {article.article?.category || "News"}
                        </Badge>
                        <h4 className="font-semibold text-slate-900 text-sm line-clamp-2 group-hover:text-[#6443F4] transition-colors">
                          {article.title}
                        </h4>
                        <span className="text-xs text-slate-500 mt-1 block">{getTimeAgo(article)}</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </aside>
        </section>

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-12">
            <section data-testid="section-top-stories">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                  <Globe className="w-5 h-5 text-[#6443F4]" />
                  Top Stories
                </h2>
                <Button variant="ghost" size="sm" className="text-[#6443F4]" data-testid="link-view-all-top">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                {topStories.slice(0, 2).map((article, idx) => (
                  <Link key={article.id} href={localePath(`/articles/${article.slug}`)}>
                    <Card className="group cursor-pointer overflow-hidden bg-white p-0 h-full" data-testid={`card-top-large-${idx + 1}`}>
                      <div className="relative aspect-[16/10]">
                        <img
                          src={article.heroImage || defaultImages[(idx + 2) % 6]}
                          alt={article.heroImageAlt || article.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-3 left-3">
                          <Badge className={`${getCategoryColor(article.article?.category)} text-white border-0`}>
                            {article.article?.category || "World"}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-slate-900 text-lg mb-2 group-hover:text-[#6443F4] transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                        <p className="text-slate-600 text-sm line-clamp-2 mb-3">{article.metaDescription}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{getArticleDate(article)}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {formatViews(article.viewCount || 0)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
              <div className="grid md:grid-cols-3 gap-4 mt-5">
                {topStories.slice(2, 8).map((article, idx) => (
                  <Link key={article.id} href={localePath(`/articles/${article.slug}`)}>
                    <Card className="group cursor-pointer overflow-hidden bg-white p-0 h-full" data-testid={`card-top-small-${idx + 1}`}>
                      <div className="relative aspect-[4/3]">
                        <img
                          src={article.heroImage || defaultImages[(idx + 4) % 6]}
                          alt={article.heroImageAlt || article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <Badge variant="outline" className="text-[10px] mb-2 border-slate-200 text-slate-600">
                          {article.article?.category || "News"}
                        </Badge>
                        <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 group-hover:text-[#6443F4] transition-colors">
                          {article.title}
                        </h3>
                        <span className="text-xs text-slate-500 mt-2 block">{getTimeAgo(article)}</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>

            <section data-testid="section-opinion">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                  <MessageSquare className="w-5 h-5 text-[#6443F4]" />
                  Opinion & Analysis
                </h2>
                <Button variant="ghost" size="sm" className="text-[#6443F4]" data-testid="link-view-all-opinion">
                  More Opinion <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="grid md:grid-cols-3 gap-5">
                {opinionArticles.map((article, idx) => (
                  <Link key={article.id} href={localePath(`/articles/${article.slug}`)}>
                    <Card className="group cursor-pointer bg-white p-5 h-full border-l-4 border-l-[#6443F4]" data-testid={`card-opinion-${idx + 1}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-slate-100 text-slate-600 text-sm font-medium">
                            {article.title.split(' ').slice(0, 2).map(w => w[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-slate-900 text-sm">{article.article?.category || "Editorial"}</div>
                          <div className="text-xs text-slate-500">{getReadTime(article)}</div>
                        </div>
                      </div>
                      <Quote className="w-6 h-6 text-[#6443F4]/30 mb-2" />
                      <h3 className="font-semibold text-slate-900 text-base mb-3 group-hover:text-[#6443F4] transition-colors line-clamp-3">
                        {article.title}
                      </h3>
                      <p className="text-slate-600 text-sm line-clamp-2 italic">{article.metaDescription}</p>
                      <span className="text-xs text-slate-400 mt-3 block">{getArticleDate(article)}</span>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>

            <section data-testid="section-regional">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                  <Globe className="w-5 h-5 text-[#6443F4]" />
                  Worldwide Coverage
                </h2>
              </div>
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-[#6443F4] to-cyan-600 p-6">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 left-8 w-32 h-32 rounded-full border border-white/20" />
                  <div className="absolute top-12 right-16 w-48 h-48 rounded-full border border-white/10" />
                  <div className="absolute bottom-8 left-1/4 w-24 h-24 rounded-full border border-white/15" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">Your Window to the World</h3>
                      <p className="text-white/70 text-sm">News from every corner of the globe</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-6">
                    {[
                      { name: 'Asia Pacific', code: 'AP', color: 'from-rose-500 to-orange-500' },
                      { name: 'Europe', code: 'EU', color: 'from-blue-500 to-indigo-500' },
                      { name: 'Americas', code: 'NA', color: 'from-emerald-500 to-teal-500' },
                      { name: 'Middle East', code: 'ME', color: 'from-amber-500 to-yellow-500' },
                      { name: 'Africa', code: 'AF', color: 'from-purple-500 to-pink-500' },
                    ].map((r) => {
                      const regionData = regions.find(reg => reg.code === r.code);
                      const count = regionData?.articles || 0;
                      return (
                        <div
                          key={r.code}
                          className="group cursor-pointer bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center hover:bg-white/20 transition-all hover:scale-105"
                          data-testid={`card-region-${r.code.toLowerCase()}`}
                        >
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${r.color} mx-auto mb-2 flex items-center justify-center shadow-lg`}>
                            <span className="text-white font-bold text-xs">{r.code}</span>
                          </div>
                          <h4 className="font-semibold text-white text-xs mb-0.5">{r.name}</h4>
                          <span className="text-white/60 text-[10px]">{count > 0 ? `${count} stories` : 'Coming soon'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="lg:col-span-4 space-y-8" data-testid="sidebar-main">
            <section className="bg-white rounded-lg p-5 border border-slate-200" data-testid="section-live-updates">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <Radio className="w-4 h-4 text-[#6443F4]" />
                  Live Updates
                </h3>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {liveUpdates.map((article, idx) => (
                  <Link key={article.id} href={localePath(`/articles/${article.slug}`)}>
                    <div className="group cursor-pointer p-3 rounded-md hover:bg-slate-50 transition-colors border-l-2 border-l-transparent hover:border-l-[#6443F4]" data-testid={`live-update-${idx + 1}`}>
                      <span className="text-[10px] text-[#6443F4] font-semibold uppercase tracking-wide">{getTimeAgo(article)}</span>
                      <h4 className="text-sm text-slate-900 font-medium mt-1 line-clamp-2 group-hover:text-[#6443F4] transition-colors">
                        {article.title}
                      </h4>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-lg p-5 border border-slate-200" data-testid="section-trending">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
                <TrendingUp className="w-4 h-4 text-[#6443F4]" />
                Trending Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {trendingTopics.length > 0 ? trendingTopics.map((topic, idx) => (
                  <Badge
                    key={topic.term}
                    variant="outline"
                    className="cursor-pointer border-slate-200 text-slate-700 hover:border-[#6443F4] hover:text-[#6443F4] transition-colors text-xs py-1.5"
                    data-testid={`badge-trending-${idx + 1}`}
                  >
                    {topic.term}
                    <span className="ml-1.5 text-slate-400">{topic.count}</span>
                  </Badge>
                )) : (
                  <span className="text-slate-500 text-sm">No trending topics yet. Check back soon!</span>
                )}
              </div>
            </section>

            <section className="bg-[#6443F4] rounded-lg p-6" data-testid="section-newsletter">
              <Mail className="w-10 h-10 text-white/80 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>Stay Informed</h3>
              <p className="text-white/80 text-sm mb-5">
                Get the day's top stories delivered to your inbox every morning. Join 50,000+ readers.
              </p>
              <form onSubmit={handleSubscribe} className="space-y-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                  data-testid="input-newsletter-email"
                />
                <Button
                  type="submit"
                  className="w-full bg-white text-[#6443F4] font-semibold"
                  disabled={subscribeMutation.isPending}
                  data-testid="button-subscribe"
                >
                  {subscribeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Subscribe Free <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </form>
              <p className="text-white/60 text-xs mt-3 text-center">No spam. Unsubscribe anytime.</p>
            </section>
          </aside>
        </div>
      </main>

      <PublicFooter />

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 45s linear infinite;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

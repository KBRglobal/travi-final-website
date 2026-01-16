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

const defaultImages = [
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop",
];

const TRENDING_TOPICS = [
  { term: "Global economy outlook 2026", count: 24 },
  { term: "AI regulation updates", count: 18 },
  { term: "Climate summit results", count: 15 },
  { term: "Tech layoffs analysis", count: 12 },
  { term: "Travel restrictions update", count: 9 },
  { term: "Renewable energy", count: 8 },
  { term: "Digital currency", count: 7 },
  { term: "Space exploration", count: 6 },
];

const NEWS_CATEGORIES = [
  { id: "world", name: "World", icon: Globe },
  { id: "business", name: "Business", icon: Briefcase },
  { id: "culture", name: "Culture", icon: Theater },
  { id: "travel", name: "Travel", icon: Plane },
  { id: "tech", name: "Tech", icon: Cpu },
  { id: "opinion", name: "Opinion", icon: MessageSquare },
];

const REGIONS = [
  { name: "Americas", articles: 24, code: "NA" },
  { name: "Europe", articles: 31, code: "EU" },
  { name: "Asia Pacific", articles: 28, code: "AP" },
  { name: "Middle East", articles: 16, code: "ME" },
  { name: "Africa", articles: 12, code: "AF" },
];

const OPINION_AUTHORS = [
  { name: "Sarah Mitchell", role: "Economics Editor", avatar: "SM" },
  { name: "James Chen", role: "Tech Columnist", avatar: "JC" },
  { name: "Maria Santos", role: "Culture Critic", avatar: "MS" },
];

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

  const totalStories = articles.length;
  const totalCategories = NEWS_CATEGORIES.length;
  const totalRegions = REGIONS.length;

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
      <div className="bg-slate-900 text-white" data-testid="breaking-news-ticker">
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
                            {OPINION_AUTHORS[idx % 3].avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-slate-900 text-sm">{OPINION_AUTHORS[idx % 3].name}</div>
                          <div className="text-xs text-slate-500">{OPINION_AUTHORS[idx % 3].role}</div>
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
                  <MapPin className="w-5 h-5 text-[#6443F4]" />
                  Regional Coverage
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {REGIONS.map((region) => (
                  <Card
                    key={region.name}
                    className="group cursor-pointer bg-white p-4 text-center hover:border-[#6443F4]/30 transition-colors"
                    data-testid={`card-region-${region.code.toLowerCase()}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#6443F4] mx-auto mb-3 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{region.code}</span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm mb-1">{region.name}</h4>
                    <span className="text-xs text-slate-500">{region.articles} stories</span>
                  </Card>
                ))}
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
                {TRENDING_TOPICS.map((topic, idx) => (
                  <Badge
                    key={topic.term}
                    variant="outline"
                    className="cursor-pointer border-slate-200 text-slate-700 hover:border-[#6443F4] hover:text-[#6443F4] transition-colors text-xs py-1.5"
                    data-testid={`badge-trending-${idx + 1}`}
                  >
                    {topic.term}
                    <span className="ml-1.5 text-slate-400">{topic.count}</span>
                  </Badge>
                ))}
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

      <footer className="bg-slate-900 text-white mt-12" data-testid="news-footer">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid md:grid-cols-4 gap-6 text-center mb-8" data-testid="footer-stats">
            <div className="p-4">
              <div className="text-3xl font-bold text-[#6443F4]" style={{ fontFamily: "'Chillax', var(--font-sans)" }} data-testid="stat-total-stories">{totalStories}</div>
              <div className="text-sm text-slate-400">Total Stories</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-[#6443F4]" style={{ fontFamily: "'Chillax', var(--font-sans)" }} data-testid="stat-categories">{totalCategories}</div>
              <div className="text-sm text-slate-400">News Categories</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }} data-testid="stat-regions">{totalRegions}</div>
              <div className="text-sm text-slate-400">Regions Covered</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-emerald-500" style={{ fontFamily: "'Chillax', var(--font-sans)" }} data-testid="stat-updates">24/7</div>
              <div className="text-sm text-slate-400">Live Updates</div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-lg font-bold mb-4 text-white" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>Global News</h3>
                <p className="text-slate-400 text-sm">
                  Your trusted source for international news, business insights, and cultural stories from around the world.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Sections</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  {NEWS_CATEGORIES.map((cat) => (
                    <li key={cat.id}>
                      <span className="hover:text-white transition-colors cursor-pointer">{cat.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Company</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><span className="hover:text-white transition-colors cursor-pointer">About Us</span></li>
                  <li><span className="hover:text-white transition-colors cursor-pointer">Contact</span></li>
                  <li><span className="hover:text-white transition-colors cursor-pointer">Careers</span></li>
                  <li><span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Connect</h4>
                <div className="flex gap-3">
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" data-testid="link-social-twitter">
                    <span className="sr-only">Twitter</span>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </Button>
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" data-testid="link-social-linkedin">
                    <span className="sr-only">LinkedIn</span>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} Global News. All rights reserved.</p>
          </div>
        </div>
      </footer>

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

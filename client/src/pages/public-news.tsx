import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Search,
  Filter,
  Globe,
  MapPin,
  Clock,
  ArrowRight,
  Newspaper,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Region definitions with destinations
const REGIONS = {
  all: { name: "All Regions", icon: Globe, destinations: [] },
  uae: {
    name: "UAE",
    icon: MapPin,
    destinations: ["dubai", "abu-dhabi", "ras-al-khaimah"]
  },
  europe: {
    name: "Europe",
    icon: MapPin,
    destinations: ["london", "paris", "barcelona", "rome", "amsterdam"]
  },
  asia: {
    name: "Asia",
    icon: MapPin,
    destinations: ["tokyo", "singapore", "bangkok", "hong-kong"]
  },
  usa: {
    name: "USA",
    icon: MapPin,
    destinations: ["new-york", "las-vegas", "los-angeles", "miami"]
  },
  turkey: {
    name: "Turkey",
    icon: MapPin,
    destinations: ["istanbul"]
  },
};

// Destination display names
const DESTINATION_NAMES: Record<string, string> = {
  "dubai": "Dubai",
  "abu-dhabi": "Abu Dhabi",
  "ras-al-khaimah": "Ras Al Khaimah",
  "london": "London",
  "paris": "Paris",
  "barcelona": "Barcelona",
  "rome": "Rome",
  "amsterdam": "Amsterdam",
  "tokyo": "Tokyo",
  "singapore": "Singapore",
  "bangkok": "Bangkok",
  "hong-kong": "Hong Kong",
  "new-york": "New York",
  "las-vegas": "Las Vegas",
  "los-angeles": "Los Angeles",
  "miami": "Miami",
  "istanbul": "Istanbul",
};

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  news: "bg-blue-100 text-blue-800",
  hotels: "bg-purple-100 text-purple-800",
  food: "bg-orange-100 text-orange-800",
  attractions: "bg-green-100 text-green-800",
  events: "bg-pink-100 text-pink-800",
  tips: "bg-yellow-100 text-yellow-800",
  transport: "bg-gray-100 text-gray-800",
  shopping: "bg-red-100 text-red-800",
};

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  category?: string;
  destinationId?: string;
  heroImage?: string;
  publishedAt?: string;
  createdAt: string;
  author?: string;
  readingTime?: number;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

function ArticleCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  const destinationName = article.destinationId ? DESTINATION_NAMES[article.destinationId] : null;
  const categoryColor = article.category ? CATEGORY_COLORS[article.category] || CATEGORY_COLORS.news : CATEGORY_COLORS.news;

  if (featured) {
    return (
      <Link href={`/article/${article.slug}`}>
        <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer h-full">
          <div className="relative h-64 md:h-80 overflow-hidden">
            {article.heroImage ? (
              <img
                src={article.heroImage}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Newspaper className="w-16 h-16 text-white/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-center gap-2 mb-3">
                {article.category && (
                  <Badge className={`${categoryColor} text-xs font-medium`}>
                    {article.category}
                  </Badge>
                )}
                {destinationName && (
                  <Badge variant="outline" className="bg-white/20 text-white border-white/30 text-xs">
                    <MapPin className="w-3 h-3 mr-1" />
                    {destinationName}
                  </Badge>
                )}
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2 line-clamp-2 group-hover:text-blue-200 transition-colors">
                {article.title}
              </h3>
              {article.excerpt && (
                <p className="text-white/80 text-sm line-clamp-2 mb-3">
                  {article.excerpt}
                </p>
              )}
              <div className="flex items-center gap-4 text-white/60 text-xs">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(article.publishedAt || article.createdAt)}
                </span>
                {article.readingTime && (
                  <span>{article.readingTime} min read</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/article/${article.slug}`}>
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer h-full flex flex-col">
        <div className="relative h-48 overflow-hidden">
          {article.heroImage ? (
            <img
              src={article.heroImage}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Newspaper className="w-10 h-10 text-gray-400" />
            </div>
          )}
          {destinationName && (
            <Badge
              variant="secondary"
              className="absolute top-3 left-3 bg-white/90 text-gray-800 text-xs"
            >
              <MapPin className="w-3 h-3 mr-1" />
              {destinationName}
            </Badge>
          )}
        </div>
        <CardContent className="p-4 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            {article.category && (
              <Badge className={`${categoryColor} text-xs font-medium`}>
                {article.category}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(article.publishedAt || article.createdAt)}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors flex-1">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
            {article.readingTime && (
              <span>{article.readingTime} min read</span>
            )}
            <span className="flex items-center gap-1 text-blue-600 font-medium group-hover:gap-2 transition-all">
              Read more <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ArticleCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <CardContent className="p-4">
        <div className="flex gap-2 mb-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

export default function PublicNews() {
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedDestination, setSelectedDestination] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 12;

  // Fetch articles
  const { data: articlesData, isLoading } = useQuery({
    queryKey: ["/api/contents", { type: "article", status: "published", category: "news" }],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: "article",
        status: "published",
        limit: "100",
      });
      const res = await fetch(`/api/contents?${params}`);
      if (!res.ok) throw new Error("Failed to fetch articles");
      return res.json();
    },
  });

  const articles: Article[] = articlesData?.contents || [];

  // Filter articles based on selections
  const filteredArticles = useMemo(() => {
    let result = articles;

    // Filter by region
    if (selectedRegion !== "all") {
      const regionDestinations = REGIONS[selectedRegion as keyof typeof REGIONS]?.destinations || [];
      result = result.filter(article =>
        article.destinationId && regionDestinations.includes(article.destinationId)
      );
    }

    // Filter by destination
    if (selectedDestination !== "all") {
      result = result.filter(article => article.destinationId === selectedDestination);
    }

    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter(article => article.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.excerpt?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [articles, selectedRegion, selectedDestination, selectedCategory, searchQuery]);

  // Paginate articles
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * articlesPerPage;
    return filteredArticles.slice(start, start + articlesPerPage);
  }, [filteredArticles, currentPage]);

  const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);

  // Get available destinations based on selected region
  const availableDestinations = useMemo(() => {
    if (selectedRegion === "all") {
      return Object.keys(DESTINATION_NAMES);
    }
    return REGIONS[selectedRegion as keyof typeof REGIONS]?.destinations || [];
  }, [selectedRegion]);

  // Featured articles (latest 3)
  const featuredArticles = articles.slice(0, 3);

  // Handle region change
  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    setSelectedDestination("all");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Newspaper className="w-8 h-8" />
              <span className="text-blue-200 font-medium">Travel News Portal</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Latest Travel News & Updates
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Stay updated with the latest travel news, hotel openings, destination guides,
              and insider tips from around the world.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search news articles..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-12 pr-4 py-6 text-lg bg-white text-gray-900 border-0 rounded-full shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      {featuredArticles.length > 0 && !searchQuery && selectedRegion === "all" && (
        <section className="container mx-auto px-4 md:px-6 -mt-12 relative z-10 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} featured />
            ))}
          </div>
        </section>
      )}

      {/* Filters & Content */}
      <section className="container mx-auto px-4 md:px-6 py-8">
        {/* Region Tabs */}
        <Tabs value={selectedRegion} onValueChange={handleRegionChange} className="mb-8">
          <TabsList className="flex flex-wrap justify-center gap-2 bg-transparent h-auto p-0">
            {Object.entries(REGIONS).map(([key, region]) => {
              const Icon = region.icon;
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2 rounded-full border border-gray-200 data-[state=active]:border-blue-600"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {region.name}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-white rounded-xl shadow-sm border">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filters:</span>
          </div>

          {/* Destination Filter */}
          <Select value={selectedDestination} onValueChange={(v) => { setSelectedDestination(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Destinations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Destinations</SelectItem>
              {availableDestinations.map((dest) => (
                <SelectItem key={dest} value={dest}>
                  {DESTINATION_NAMES[dest]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="news">News</SelectItem>
              <SelectItem value="hotels">Hotels</SelectItem>
              <SelectItem value="food">Food</SelectItem>
              <SelectItem value="attractions">Attractions</SelectItem>
              <SelectItem value="events">Events</SelectItem>
              <SelectItem value="tips">Tips</SelectItem>
            </SelectContent>
          </Select>

          {/* Results count */}
          <div className="ml-auto text-sm text-muted-foreground">
            {filteredArticles.length} article{filteredArticles.length !== 1 ? "s" : ""} found
          </div>
        </div>

        {/* Articles Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        ) : paginatedArticles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="icon"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No articles found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters or search query
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRegion("all");
                setSelectedDestination("all");
                setSelectedCategory("all");
                setSearchQuery("");
                setCurrentPage(1);
              }}
            >
              Clear all filters
            </Button>
          </div>
        )}
      </section>

      {/* Trending Topics */}
      <section className="bg-gray-50 py-12 mt-8">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-2xl font-bold">Trending Destinations</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(DESTINATION_NAMES).map(([id, name]) => (
              <Button
                key={id}
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setSelectedDestination(id);
                  setSelectedRegion("all");
                  setCurrentPage(1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <MapPin className="w-4 h-4 mr-1" />
                {name}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="container mx-auto px-4 md:px-6 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Never Miss a Travel Update
          </h2>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            Subscribe to our newsletter and get the latest travel news,
            exclusive deals, and insider tips delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
            />
            <Button className="bg-white text-blue-600 hover:bg-blue-50">
              Subscribe
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

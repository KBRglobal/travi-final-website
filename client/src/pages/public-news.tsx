import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Search,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  Globe2,
  Plane,
  Building2,
  Utensils,
  Ticket,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SEOHead } from "@/components/seo-head";
import { PublicFooter } from "@/components/public-footer";
import { Logo } from "@/components/logo";

// ============================================
// CONSTANTS
// ============================================

const REGIONS = {
  all: {
    name: "All",
    nameHe: "הכל",
    destinations: [] as string[],
    image: "",
  },
  uae: {
    name: "UAE",
    nameHe: "איחוד האמירויות",
    destinations: ["dubai", "abu-dhabi", "ras-al-khaimah"],
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80",
  },
  europe: {
    name: "Europe",
    nameHe: "אירופה",
    destinations: ["london", "paris", "barcelona", "rome", "amsterdam"],
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=80",
  },
  asia: {
    name: "Asia",
    nameHe: "אסיה",
    destinations: ["tokyo", "singapore", "bangkok", "hong-kong"],
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=80",
  },
  usa: {
    name: "USA",
    nameHe: 'ארה"ב',
    destinations: ["new-york", "las-vegas", "los-angeles", "miami"],
    image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400&q=80",
  },
  turkey: {
    name: "Turkey",
    nameHe: "טורקיה",
    destinations: ["istanbul"],
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400&q=80",
  },
};

const DESTINATIONS: Record<string, { name: string; nameHe: string; image: string }> = {
  dubai: {
    name: "Dubai",
    nameHe: "דובאי",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80",
  },
  "abu-dhabi": {
    name: "Abu Dhabi",
    nameHe: "אבו דאבי",
    image: "https://images.unsplash.com/photo-1558452919-08ae4aea8e29?w=600&q=80",
  },
  "ras-al-khaimah": {
    name: "Ras Al Khaimah",
    nameHe: "ראס אל ח'ימה",
    image: "https://images.unsplash.com/photo-1582672060674-bc2bd808a8c5?w=600&q=80",
  },
  london: {
    name: "London",
    nameHe: "לונדון",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80",
  },
  paris: {
    name: "Paris",
    nameHe: "פריז",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
  },
  barcelona: {
    name: "Barcelona",
    nameHe: "ברצלונה",
    image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&q=80",
  },
  rome: {
    name: "Rome",
    nameHe: "רומא",
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80",
  },
  amsterdam: {
    name: "Amsterdam",
    nameHe: "אמסטרדם",
    image: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600&q=80",
  },
  tokyo: {
    name: "Tokyo",
    nameHe: "טוקיו",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
  },
  singapore: {
    name: "Singapore",
    nameHe: "סינגפור",
    image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&q=80",
  },
  bangkok: {
    name: "Bangkok",
    nameHe: "בנגקוק",
    image: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600&q=80",
  },
  "hong-kong": {
    name: "Hong Kong",
    nameHe: "הונג קונג",
    image: "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=600&q=80",
  },
  "new-york": {
    name: "New York",
    nameHe: "ניו יורק",
    image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&q=80",
  },
  "las-vegas": {
    name: "Las Vegas",
    nameHe: "לאס וגאס",
    image: "https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?w=600&q=80",
  },
  "los-angeles": {
    name: "Los Angeles",
    nameHe: "לוס אנג'לס",
    image: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=600&q=80",
  },
  miami: {
    name: "Miami",
    nameHe: "מיאמי",
    image: "https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=600&q=80",
  },
  istanbul: {
    name: "Istanbul",
    nameHe: "איסטנבול",
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&q=80",
  },
};

const CATEGORIES = [
  { id: "all", name: "All", nameHe: "הכל", icon: Globe2 },
  { id: "news", name: "News", nameHe: "חדשות", icon: TrendingUp },
  { id: "hotels", name: "Hotels", nameHe: "מלונות", icon: Building2 },
  { id: "food", name: "Food", nameHe: "אוכל", icon: Utensils },
  { id: "attractions", name: "Attractions", nameHe: "אטרקציות", icon: Ticket },
  { id: "tips", name: "Tips", nameHe: "טיפים", icon: Sparkles },
];

// ============================================
// TYPES
// ============================================

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

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ============================================
// COMPONENTS
// ============================================

function HeroSection({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        {/* Navigation */}
        <nav className="flex items-center justify-between mb-16">
          <Link href="/">
            <Logo className="h-10 w-auto cursor-pointer" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/destinations" className="text-white/80 hover:text-white transition-colors">
              Destinations
            </Link>
            <Link href="/guides" className="text-white/80 hover:text-white transition-colors">
              Guides
            </Link>
            <Link href="/attractions" className="text-white/80 hover:text-white transition-colors">
              Attractions
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <Plane className="w-4 h-4 text-purple-300" />
                <span className="text-sm font-medium text-white/90">Travel News Portal</span>
              </div>
            </div>

            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Discover the World's
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
                Latest Stories
              </span>
            </h1>

            <p className="text-xl text-white/70 mb-10 max-w-2xl leading-relaxed">
              Stay ahead with curated travel news, destination guides, hotel openings, and insider
              tips from our global network of travel experts.
            </p>

            {/* Search */}
            <div className="relative max-w-xl">
              <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-2xl" />
              <div className="relative flex items-center">
                <Search className="absolute left-5 w-5 h-5 text-white/50" />
                <Input
                  type="text"
                  placeholder="Search destinations, topics, or articles..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-5 py-7 text-lg bg-transparent border-white/20 text-white placeholder:text-white/40 rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-3 gap-8 mt-16 max-w-2xl"
        >
          {[
            { value: "17+", label: "Destinations" },
            { value: "54", label: "News Sources" },
            { value: "24/7", label: "Updates" },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-white/50">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function RegionFilter({
  selectedRegion,
  onRegionChange,
}: {
  selectedRegion: string;
  onRegionChange: (region: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {Object.entries(REGIONS).map(([key, region]) => (
        <button
          key={key}
          onClick={() => onRegionChange(key)}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer",
            selectedRegion === key
              ? "bg-primary text-white shadow-lg shadow-primary/25"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300"
          )}
        >
          {key !== "all" && region.image && (
            <img
              src={region.image}
              alt={region.name}
              className="w-5 h-5 rounded-full object-cover"
              width={20}
              height={20}
              loading="lazy"
              decoding="async"
            />
          )}
          {region.name}
        </button>
      ))}
    </div>
  );
}

function CategoryFilter({
  selectedCategory,
  onCategoryChange,
}: {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {CATEGORIES.map(category => {
        const Icon = category.icon;
        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer",
              selectedCategory === category.id
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Icon className="w-4 h-4" />
            {category.name}
          </button>
        );
      })}
    </div>
  );
}

function FeaturedArticle({ article }: { article: Article }) {
  const destination = article.destinationId ? DESTINATIONS[article.destinationId] : null;

  return (
    <Link href={`/article/${article.slug}`}>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative h-[500px] rounded-3xl overflow-hidden cursor-pointer"
      >
        {/* Image */}
        <div className="absolute inset-0">
          {article.heroImage ? (
            <img
              src={article.heroImage}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              width={1200}
              height={500}
              loading="eager"
              decoding="async"
            />
          ) : destination?.image ? (
            <img
              src={destination.image}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              width={1200}
              height={500}
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600" />
          )}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
          <div className="flex items-center gap-3 mb-4">
            {article.category && (
              <Badge className="bg-white/20 backdrop-blur-sm text-white border-0 text-xs uppercase tracking-wider">
                {article.category}
              </Badge>
            )}
            {destination && (
              <Badge
                variant="outline"
                className="bg-white/10 backdrop-blur-sm text-white border-white/30 text-xs"
              >
                <MapPin className="w-3 h-3 mr-1" />
                {destination.name}
              </Badge>
            )}
          </div>

          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4 leading-tight group-hover:text-purple-200 transition-colors">
            {article.title}
          </h2>

          {article.excerpt && (
            <p className="text-white/70 text-lg line-clamp-2 mb-6 max-w-2xl">{article.excerpt}</p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-white/60 text-sm">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatTimeAgo(article.publishedAt || article.createdAt)}
              </span>
              {article.readingTime && <span>{article.readingTime} min read</span>}
            </div>

            <span className="flex items-center gap-2 text-white font-medium group-hover:gap-3 transition-all">
              Read Story <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}

function ArticleCard({ article, index = 0 }: { article: Article; index?: number }) {
  const destination = article.destinationId ? DESTINATIONS[article.destinationId] : null;

  return (
    <Link href={`/article/${article.slug}`}>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col"
      >
        {/* Image */}
        <div className="relative h-52 overflow-hidden">
          {article.heroImage ? (
            <img
              src={article.heroImage}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              width={600}
              height={400}
              loading="lazy"
              decoding="async"
            />
          ) : destination?.image ? (
            <img
              src={destination.image}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              width={600}
              height={400}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Globe2 className="w-12 h-12 text-gray-300" aria-hidden="true" />
            </div>
          )}

          {/* Destination Badge */}
          {destination && (
            <div className="absolute top-4 left-4">
              <Badge className="bg-white/95 text-gray-800 shadow-sm border-0 text-xs font-medium">
                <MapPin className="w-3 h-3 mr-1 text-primary" />
                {destination.name}
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col">
          {/* Meta */}
          <div className="flex items-center gap-2 mb-3">
            {article.category && (
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                {article.category}
              </span>
            )}
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">
              {formatTimeAgo(article.publishedAt || article.createdAt)}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors flex-1">
            {article.title}
          </h3>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-4">{article.excerpt}</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
            {article.readingTime && (
              <span className="text-xs text-gray-400">{article.readingTime} min read</span>
            )}
            <span className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
              Read <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}

function ArticleCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
      <Skeleton className="h-52 w-full" />
      <div className="p-5">
        <div className="flex gap-2 mb-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

function DestinationCard({
  destId,
  onClick,
  articleCount,
}: {
  destId: string;
  onClick: () => void;
  articleCount: number;
}) {
  const destination = DESTINATIONS[destId];
  if (!destination) return null;

  return (
    <button
      onClick={onClick}
      className="group relative h-32 rounded-2xl overflow-hidden cursor-pointer"
    >
      <img
        src={destination.image}
        alt={`${destination.name} travel news`}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        width={400}
        height={128}
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20 group-hover:from-black/80 transition-colors" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="font-semibold text-lg">{destination.name}</span>
        {articleCount > 0 && <span className="text-xs text-white/70">{articleCount} articles</span>}
      </div>
    </button>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20"
    >
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Globe2 className="w-12 h-12 text-gray-300" />
      </div>
      <h3 className="text-2xl font-semibold text-gray-800 mb-3">No articles found</h3>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        We couldn't find any articles matching your criteria. Try adjusting your filters or check
        back later for new content.
      </p>
      <Button onClick={onClear} size="lg" className="rounded-full px-8">
        <X className="w-4 h-4 mr-2" />
        Clear all filters
      </Button>
    </motion.div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PublicNews() {
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedDestination, setSelectedDestination] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 12;

  // Fetch articles
  const { data: articlesData, isLoading } = useQuery({
    queryKey: ["/api/contents", { type: "article", status: "published" }],
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

  const articles: Article[] = Array.isArray(articlesData) ? articlesData : [];

  // Filter articles
  const filteredArticles = useMemo(() => {
    let result = articles;

    if (selectedRegion !== "all") {
      const regionDestinations =
        REGIONS[selectedRegion as keyof typeof REGIONS]?.destinations || [];
      result = result.filter(
        article => article.destinationId && regionDestinations.includes(article.destinationId)
      );
    }

    if (selectedDestination !== "all") {
      result = result.filter(article => article.destinationId === selectedDestination);
    }

    if (selectedCategory !== "all") {
      result = result.filter(article => article.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        article =>
          article.title.toLowerCase().includes(query) ||
          article.excerpt?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [articles, selectedRegion, selectedDestination, selectedCategory, searchQuery]);

  // Pagination
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * articlesPerPage;
    return filteredArticles.slice(start, start + articlesPerPage);
  }, [filteredArticles, currentPage]);

  const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);

  // Featured article
  const featuredArticle = articles[0];
  const regularArticles = paginatedArticles.filter(a => a.id !== featuredArticle?.id);

  // Available destinations
  const availableDestinations = useMemo(() => {
    if (selectedRegion === "all") {
      return Object.keys(DESTINATIONS);
    }
    return REGIONS[selectedRegion as keyof typeof REGIONS]?.destinations || [];
  }, [selectedRegion]);

  // Article counts by destination
  const articleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    articles.forEach(a => {
      if (a.destinationId) {
        counts[a.destinationId] = (counts[a.destinationId] || 0) + 1;
      }
    });
    return counts;
  }, [articles]);

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    setSelectedDestination("all");
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedRegion("all");
    setSelectedDestination("all");
    setSelectedCategory("all");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedRegion !== "all" ||
    selectedDestination !== "all" ||
    selectedCategory !== "all" ||
    searchQuery !== "";

  return (
    <>
      <SEOHead
        title="Travel News & Stories | TRAVI"
        description="Stay updated with the latest travel news, destination guides, hotel openings, and insider tips from around the world."
        canonicalPath="/news"
      />

      <div className="min-h-screen bg-gray-50">
        {/* Hero */}
        <HeroSection
          searchQuery={searchQuery}
          setSearchQuery={q => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
        />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12">
          {/* Filters */}
          <div className="mb-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <RegionFilter selectedRegion={selectedRegion} onRegionChange={handleRegionChange} />

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear filters
                </Button>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CategoryFilter
                selectedCategory={selectedCategory}
                onCategoryChange={c => {
                  setSelectedCategory(c);
                  setCurrentPage(1);
                }}
              />

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Filter className="w-4 h-4" />
                <span>{filteredArticles.length} articles</span>
              </div>
            </div>
          </div>

          {/* Featured + Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredArticles.length > 0 ? (
            <div className="space-y-12">
              {/* Featured Article */}
              {!hasActiveFilters && featuredArticle && (
                <FeaturedArticle article={featuredArticle} />
              )}

              {/* Articles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(hasActiveFilters ? paginatedArticles : regularArticles).map((article, index) => (
                  <ArticleCard key={article.id} article={article} index={index} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-8">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-full"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center gap-1">
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
                          variant={currentPage === pageNum ? "default" : "ghost"}
                          size="icon"
                          onClick={() => setCurrentPage(pageNum)}
                          className="rounded-full w-10 h-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-full"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <EmptyState onClear={clearFilters} />
          )}

          {/* Explore Destinations */}
          <section className="mt-20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-heading text-3xl font-bold text-gray-900 mb-2">
                  Explore Destinations
                </h2>
                <p className="text-gray-500">Browse news by your favorite travel destinations</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {availableDestinations.slice(0, 12).map(destId => (
                <DestinationCard
                  key={destId}
                  destId={destId}
                  articleCount={articleCounts[destId] || 0}
                  onClick={() => {
                    setSelectedDestination(destId);
                    setSelectedRegion("all");
                    setCurrentPage(1);
                    window.scrollTo({ top: 300, behavior: "smooth" });
                  }}
                />
              ))}
            </div>
          </section>

          {/* Newsletter */}
          <section className="mt-20 mb-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-purple-600 to-primary p-10 md:p-16">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

              <div className="relative max-w-2xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm mb-6">
                  <Sparkles className="w-4 h-4" />
                  <span>Join 50,000+ travelers</span>
                </div>

                <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
                  Never Miss a Story
                </h2>
                <p className="text-white/80 text-lg mb-8">
                  Get the latest travel news, exclusive deals, and insider tips delivered straight
                  to your inbox every week.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl h-12"
                  />
                  <Button
                    size="lg"
                    className="bg-white text-primary hover:bg-white/90 rounded-xl h-12 px-8 font-semibold"
                  >
                    Subscribe
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}

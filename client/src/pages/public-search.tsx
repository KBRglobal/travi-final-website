import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Search, MapPin, Building2, Mountain, BookOpen, UtensilsCrossed, Map, Train, Sparkles, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { useDebounce } from "@/hooks/use-debounce";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { SEOHead } from "@/components/seo-head";

interface SearchResult {
  contentId: string;
  title: string;
  contentType: string;
  metaDescription: string | null;
  url: string;
  image: string | null;
  score: number;
  highlights?: string[];
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  query: string;
  intent?: {
    type: string;
    confidence: number;
  };
  searchTime: number;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } }
};

const defaultPlaceholderImages = [
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1526495124232-a04e1849168c?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1546412414-e1885259563a?w=600&h=400&fit=crop",
];

function getTypeIcon(type: string) {
  switch (type) {
    case 'hotel': return Building2;
    case 'attraction': return Mountain;
    case 'article': return BookOpen;
    case 'dining': return UtensilsCrossed;
    case 'district': return Map;
    case 'transport': return Train;
    default: return MapPin;
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'hotel': return 'bg-[#6443F4]/10 text-[#6443F4]';
    case 'attraction': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400';
    case 'article': return 'bg-[#02A65C]/10 text-[#02A65C]';
    case 'dining': return 'bg-[#6443F4]/10 text-[#6443F4]';
    case 'district': return 'bg-[#6443F4]/10 text-[#6443F4]';
    case 'transport': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400';
    default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
  }
}

function getContentPath(type: string, slug: string) {
  switch (type) {
    case 'dining': return `/dining/${slug}`;
    case 'district': return `/districts/${slug}`;
    case 'transport': return `/transport/${slug}`;
    default: return `/${type}s/${slug}`;
  }
}

function SearchResultCard({ result, index }: { result: SearchResult; index: number }) {
  const { localePath } = useLocale();
  const imageUrl = result.image || defaultPlaceholderImages[index % defaultPlaceholderImages.length];
  const TypeIcon = getTypeIcon(result.contentType);
  const contentPath = result.url || getContentPath(result.contentType, result.contentId);
  const typeColorClass = getTypeColor(result.contentType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={localePath(contentPath)}>
        <Card 
          className="group overflow-visible bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row"
          data-testid={`search-result-${result.contentId}`}
        >
          <div className="sm:w-56 md:w-64 aspect-video sm:aspect-auto sm:h-44 overflow-hidden rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none shrink-0">
            <img
              src={imageUrl}
              alt={result.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge 
                variant="secondary" 
                className={`text-xs font-medium capitalize ${typeColorClass}`}
              >
                <TypeIcon className="w-3 h-3 mr-1" />
                {result.contentType}
              </Badge>
              {result.score > 0.8 && (
                <Badge variant="outline" className="text-xs text-[#6443F4] border-[#6443F4]/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Best Match
                </Badge>
              )}
            </div>
            <h3 
              className="font-semibold text-lg text-slate-900 dark:text-white line-clamp-2 mb-2 group-hover:text-[#6443F4] transition-colors"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            >
              {result.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 flex-1">
              {result.metaDescription || "Explore this amazing destination and its unique experiences."}
            </p>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

function SearchResultSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl animate-pulse flex flex-col sm:flex-row bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <div className="sm:w-56 md:w-64 aspect-video sm:aspect-auto sm:h-44 bg-slate-100 dark:bg-slate-800 shrink-0 rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none" />
      <div className="p-5 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" />
          <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" />
        </div>
        <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-3/4 mb-2" />
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full mb-1" />
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
      </div>
    </Card>
  );
}

export default function PublicSearch() {
  const { t, locale, isRTL, localePath } = useLocale();
  const searchParams = useSearch();
  const urlParams = new URLSearchParams(searchParams);
  const initialQuery = urlParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: searchResponse, isLoading, isFetching } = useQuery<SearchResponse>({
    queryKey: ["/api/public/search", debouncedQuery, locale],
    queryFn: async () => {
      if (!debouncedQuery.trim()) {
        return { results: [], total: 0, page: 1, limit: 20, query: "", searchTime: 0 };
      }
      const params = new URLSearchParams({
        q: debouncedQuery,
        limit: "20",
        ...(locale && { locale }),
      });
      const response = await fetch(`/api/public/search?${params}`);
      if (!response.ok) {
        throw new Error("Search failed");
      }
      return response.json();
    },
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 30000,
  });

  const searchResults = searchResponse?.results || [];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <SEOHead
        title="Search | TRAVI World"
        description="Search for attractions, guides, destinations and travel experiences worldwide"
        canonicalPath="/search"
        noIndex={true}
      />
      <SubtleSkyBackground />
      <PublicNav variant="transparent" />

      <section 
        className="pt-32 pb-12"
        data-testid="section-search-hero"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <motion.div 
            className="text-center mb-8"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.h1 
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3"
              style={{ fontFamily: "'Chillax', var(--font-sans)" }}
            >
              {t('search.pageTitle')}
            </motion.h1>
            <motion.p 
              variants={fadeInUp}
              className="text-slate-600 dark:text-slate-300 text-lg"
            >
              {t('search.searchIn') || "Find attractions, hotels, restaurants, and more"}
            </motion.p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-2 flex items-center gap-2 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex-1 flex items-center gap-3 px-4">
              <Search className="w-5 h-5 text-[#6443F4] shrink-0" aria-hidden="true" />
              <input
                type="text"
                placeholder={t('nav.searchPlaceholder') || "Search attractions, guides, destinations..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none py-3 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 text-base"
                data-testid="input-search"
                autoFocus
              />
            </div>
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSearchQuery("")}
                className="text-slate-600 dark:text-slate-400"
                data-testid="button-clear-search"
              >
                {t('common.clear') || "Clear"}
              </Button>
            )}
          </motion.div>

          {searchResponse?.intent && searchResponse.intent.confidence > 0.7 && (
            <motion.div 
              className="flex items-center justify-center gap-2 mt-4 text-sm text-[#6443F4]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('search.aiPowered') || "AI-powered smart search"}</span>
            </motion.div>
          )}
        </div>
      </section>

      <section className="py-12 bg-white dark:bg-slate-950">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          {!searchQuery.trim() ? (
            <motion.div 
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Search className="w-10 h-10 text-slate-400 dark:text-slate-500" />
              </div>
              <h2 
                className="text-xl font-semibold text-slate-900 dark:text-white mb-2"
                style={{ fontFamily: "'Chillax', var(--font-sans)" }}
              >
                {t('search.startSearching') || "Start Searching"}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                {t('search.enterQuery') || "Enter a search term to find attractions, guides, destinations and more."}
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
                <Link href={localePath("/hotels")}>
                  <Button variant="outline" className="gap-2 rounded-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    <Building2 className="w-4 h-4" />
                    {t('nav.hotels')}
                  </Button>
                </Link>
                <Link href={localePath("/attractions")}>
                  <Button variant="outline" className="gap-2 rounded-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    <Mountain className="w-4 h-4" />
                    {t('nav.attractions')}
                  </Button>
                </Link>
                <Link href={localePath("/guides")}>
                  <Button variant="outline" className="gap-2 rounded-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    <BookOpen className="w-4 h-4" />
                    {t('nav.guides')}
                  </Button>
                </Link>
                <Link href={localePath("/destinations")}>
                  <Button variant="outline" className="gap-2 rounded-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    <Map className="w-4 h-4" />
                    Destinations
                  </Button>
                </Link>
              </div>

              <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Popular destinations</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[
                    { name: "Paris", slug: "paris" },
                    { name: "Rome", slug: "rome" },
                    { name: "London", slug: "london" },
                    { name: "Barcelona", slug: "barcelona" },
                    { name: "Dubai", slug: "dubai" },
                    { name: "Tokyo", slug: "tokyo" },
                    { name: "New York", slug: "new-york" },
                    { name: "Amsterdam", slug: "amsterdam" },
                  ].map((dest) => (
                    <Link key={dest.slug} href={localePath(`/attractions/list/${dest.slug}`)}>
                      <Badge 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-[#6443F4]/10 hover:text-[#6443F4] transition-colors px-3 py-1.5"
                        data-testid={`badge-destination-${dest.slug}`}
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        {dest.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <p className="text-slate-600 dark:text-slate-400">
                  {isLoading || isFetching ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-[#6443F4] border-t-transparent rounded-full animate-spin" />
                      {t('common.loading') || "Searching..."}
                    </span>
                  ) : (
                    <>
                      <span className="font-semibold text-slate-900 dark:text-white">{searchResponse?.total || 0}</span>
                      {' '}{t('search.results') || "results for"}{' '}
                      <span className="font-semibold text-slate-900 dark:text-white">"{debouncedQuery}"</span>
                      {searchResponse?.searchTime && (
                        <span className="text-xs ml-2 text-slate-500 dark:text-slate-500">
                          ({searchResponse.searchTime}ms)
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>

              {isLoading ? (
                <div className="space-y-6">
                  {[0, 1, 2].map((index) => (
                    <SearchResultSkeleton key={index} />
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-6">
                  {searchResults.map((result, index) => (
                    <SearchResultCard key={result.contentId} result={result} index={index} />
                  ))}
                </div>
              ) : (
                <motion.div 
                  className="text-center py-16"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <SearchX className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                  </div>
                  <h2 
                    className="text-xl font-semibold text-slate-900 dark:text-white mb-2"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    {t('search.noResults') || "No results found"}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                    {t('search.tryAgain') || "Try adjusting your search terms or browse our categories below."}
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
                    <Link href={localePath("/attractions")}>
                      <Button variant="outline" className="gap-2 rounded-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        <Mountain className="w-4 h-4" />
                        {t('nav.attractions')}
                      </Button>
                    </Link>
                    <Link href={localePath("/guides")}>
                      <Button variant="outline" className="gap-2 rounded-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        <BookOpen className="w-4 h-4" />
                        {t('nav.guides')}
                      </Button>
                    </Link>
                    <Link href={localePath("/destinations")}>
                      <Button variant="outline" className="gap-2 rounded-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        <Map className="w-4 h-4" />
                        Destinations
                      </Button>
                    </Link>
                  </div>

                  <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Or try a popular destination</p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {[
                        { name: "Paris", slug: "paris" },
                        { name: "Rome", slug: "rome" },
                        { name: "London", slug: "london" },
                        { name: "Barcelona", slug: "barcelona" },
                        { name: "Dubai", slug: "dubai" },
                        { name: "Tokyo", slug: "tokyo" },
                      ].map((dest) => (
                        <Link key={dest.slug} href={localePath(`/attractions/list/${dest.slug}`)}>
                          <Badge 
                            variant="secondary" 
                            className="cursor-pointer hover:bg-[#6443F4]/10 hover:text-[#6443F4] transition-colors px-3 py-1.5"
                          >
                            <MapPin className="w-3 h-3 mr-1" />
                            {dest.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

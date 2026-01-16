import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpCircle, Search, FolderOpen, FileText, ChevronRight } from "lucide-react";

interface HelpCategory {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
}

interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  categoryId: string;
}

interface SearchResult {
  articles: HelpArticle[];
  total: number;
  query: string;
}

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categoriesData, isLoading: loadingCategories, error } = useQuery<{
    categories: HelpCategory[];
  }>({
    queryKey: ["/api/help"],
  });

  const { data: searchData, isLoading: searching } = useQuery<SearchResult>({
    queryKey: ["/api/help/search", searchQuery],
    queryFn: () =>
      fetch(`/api/help/search?q=${encodeURIComponent(searchQuery)}`)
        .then((res) => res.json()),
    enabled: searchQuery.length >= 2,
  });

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <HelpCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Help Center</h1>
          <p className="text-muted-foreground">Help center is currently unavailable.</p>
        </div>
      </div>
    );
  }

  const categories = categoriesData?.categories || [];
  const showSearch = searchQuery.length >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-2xl mx-auto text-center">
            <HelpCircle className="h-12 w-12 mx-auto text-primary mb-4" />
            <h1 className="text-3xl md:text-4xl font-bold mb-4">How can we help?</h1>
            <p className="text-muted-foreground mb-8">
              Search our help center or browse categories below
            </p>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for help..."
                className="pl-10 h-12 text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Search Results */}
        {showSearch && (
          <div className="max-w-3xl mx-auto mb-12">
            <h2 className="text-lg font-semibold mb-4">
              {searching ? "Searching..." : `Search results for "${searchQuery}"`}
            </h2>

            {searching ? (
              <div className="space-y-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : searchData?.articles.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No articles found for "{searchQuery}"
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {searchData?.articles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/help/article/${article.slug}`}
                  >
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardContent className="py-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{article.title}</h3>
                          {article.summary && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {article.summary}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories */}
        {!showSearch && (
          <>
            {loadingCategories ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No help articles yet</h2>
                <p className="text-muted-foreground">Check back later for help contents.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
                {categories.map((category) => (
                  <Link key={category.id} href={`/help/${category.slug}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FolderOpen className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{category.title}</CardTitle>
                            {category.description && (
                              <CardDescription className="mt-1">
                                {category.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center text-sm text-primary">
                          Browse articles
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

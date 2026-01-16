import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Radar, Search, FileText, Database, Sparkles, 
  RefreshCw, Lightbulb, TrendingUp, Link2 
} from "lucide-react";

interface SearchStats {
  totalEmbeddings: number;
  lastIndexed?: string;
  indexSize: string;
  avgQueryTime: number;
}

interface SearchResult {
  contentId: string;
  title: string;
  type: string;
  similarity: number;
  snippet: string;
}

interface RelatedContent {
  contentId: string;
  title: string;
  relatedTo: string[];
  similarity: number;
}

export default function SemanticSearchPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const { data: stats, isLoading } = useQuery<SearchStats>({
    queryKey: ["/api/analytics/semantic/stats"],
  });

  const { data: relatedContent } = useQuery<RelatedContent[]>({
    queryKey: ["/api/analytics/semantic/related"],
  });

  const searchMutation = useMutation({
    mutationFn: (query: string) => 
      apiRequest("POST", "/api/analytics/semantic/search", { query }),
    onSuccess: (data: any) => {
      setSearchResults(data.results || []);
    },
    onError: () => {
      toast({ title: "Search failed", variant: "destructive" });
    },
  });

  const reindexMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/analytics/semantic/reindex"),
    onSuccess: () => {
      toast({ title: "Reindexing started" });
    },
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="heading-semantic-search">
            <Radar className="h-8 w-8 text-primary" />
            Semantic Search
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered contents search and discovery
          </p>
        </div>
        <Button 
          variant="outline"
          onClick={() => reindexMutation.mutate()}
          disabled={reindexMutation.isPending}
          data-testid="button-reindex-all"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reindex All
        </Button>
      </div>

      <div className="p-4 bg-muted rounded-lg border">
        <h3 className="font-medium flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          How It Works / איך זה עובד
        </h3>
        <p className="text-sm text-muted-foreground">
          Semantic search uses <strong>AI embeddings</strong> to understand the meaning of your contents.
          Find related articles even if they don't share exact keywords. 
          Automatically suggest internal links and discover contents gaps.
          <br />
          <span className="text-xs opacity-70">
            (חיפוש סמנטי משתמש בבינה מלאכותית כדי להבין את המשמעות של התוכן שלך.)
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4" />
              Indexed Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-embeddings-count">
              {stats?.totalEmbeddings || 0}
            </div>
            <p className="text-xs text-muted-foreground">Articles with embeddings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Index Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-index-size">
              {stats?.indexSize || "0 MB"}
            </div>
            <p className="text-xs text-muted-foreground">Vector database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Query Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-query-time">
              {stats?.avgQueryTime || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">Response speed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Last Indexed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold" data-testid="text-last-indexed">
              {stats?.lastIndexed ? new Date(stats.lastIndexed).toLocaleDateString() : "Never"}
            </div>
            <p className="text-xs text-muted-foreground">Last update</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Semantic Search Test
          </CardTitle>
          <CardDescription>
            Try a natural language search across your contents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search your contents using natural language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              data-testid="input-semantic-search"
            />
            <Button 
              onClick={handleSearch}
              disabled={searchMutation.isPending}
              data-testid="button-search"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-3">
              {searchResults.map((result) => (
                <div
                  key={result.contentId}
                  className="p-4 border rounded-lg"
                  data-testid={`search-result-${result.contentId}`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{result.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{result.type}</Badge>
                      <Badge variant="outline">
                        {(result.similarity * 100).toFixed(0)}% match
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {result.snippet}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Content Relationships
          </CardTitle>
          <CardDescription>
            Automatically discovered connections between your contents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {relatedContent?.length ? (
              <div className="space-y-3">
                {relatedContent.map((item) => (
                  <div
                    key={item.contentId}
                    className="p-3 border rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{item.title}</h4>
                      <Badge variant="outline">
                        {(item.similarity * 100).toFixed(0)}% related
                      </Badge>
                    </div>
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {item.relatedTo?.slice(0, 3).map((related, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {related}
                        </Badge>
                      ))}
                      {(item.relatedTo?.length || 0) > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{(item.relatedTo?.length || 0) - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Radar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No contents relationships detected</p>
                <p className="text-sm">Index your contents to discover connections</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

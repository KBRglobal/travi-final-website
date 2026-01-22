import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, ChevronRight, FolderOpen } from "lucide-react";

interface HelpCategory {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  articles: HelpArticle[];
  articleCount: number;
}

interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
}

export default function HelpCategory() {
  const { localePath } = useLocale();
  const [, params] = useRoute("/help/:slug");
  const { slug = "" } = params ?? {};

  const { data, isLoading, error } = useQuery<{ category: HelpCategory }>({
    queryKey: ["/api/help/category", slug],
    queryFn: () => fetch(`/api/help/category/${slug}`).then((res) => {
      if (!res.ok) throw new Error("Category not found");
      return res.json();
    }),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-6 w-96 mb-8" />
        <div className="space-y-3 max-w-3xl">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  if (error || !data?.category) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Category not found</h1>
          <p className="text-muted-foreground mb-4">
            The category you're looking for doesn't exist.
          </p>
          <Button asChild>
            <Link href={localePath("/help")}>Back to Help Center</Link>
          </Button>
        </div>
      </div>
    );
  }

  const category = data.category;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-4 py-8">
          <Link href={localePath("/help")} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Help Center
          </Link>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <FolderOpen className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{category.title}</h1>
              {category.description && (
                <p className="text-muted-foreground mt-1">{category.description}</p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {category.articleCount} {category.articleCount === 1 ? "article" : "articles"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Articles */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl">
          {category.articles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-lg font-medium mb-2">No articles yet</h2>
                <p className="text-muted-foreground">
                  This category doesn't have any published articles yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {category.articles.map((article) => (
                <Link
                  key={article.id}
                  href={localePath(`/help/${category.slug}/${article.slug}`)}
                >
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="py-4 flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <h3 className="font-medium">{article.title}</h3>
                          {article.summary && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {article.summary}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

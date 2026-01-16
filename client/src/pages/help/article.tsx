import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Clock } from "lucide-react";

interface HelpCategory {
  id: string;
  slug: string;
  title: string;
}

interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  blocks: Array<{ id?: string; type: string; data: Record<string, unknown> }>;
  updatedAt: string;
  category: HelpCategory;
}

export default function HelpArticle() {
  const [, params] = useRoute("/help/:categorySlug/:articleSlug");
  const { categorySlug, articleSlug } = params || {};

  const { data, isLoading, error } = useQuery<{ article: HelpArticle }>({
    queryKey: ["/api/help/article", categorySlug, articleSlug],
    queryFn: () =>
      fetch(`/api/help/category/${categorySlug}/article/${articleSlug}`).then((res) => {
        if (!res.ok) throw new Error("Article not found");
        return res.json();
      }),
    enabled: !!categorySlug && !!articleSlug,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-10 w-2/3 mb-4" />
        <Skeleton className="h-4 w-48 mb-8" />
        <div className="space-y-4 max-w-3xl">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (error || !data?.article) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Article not found</h1>
          <p className="text-muted-foreground mb-4">
            The article you're looking for doesn't exist.
          </p>
          <Button asChild>
            <Link href="/help">Back to Help Center</Link>
          </Button>
        </div>
      </div>
    );
  }

  const article = data.article;
  const updatedDate = new Date(article.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/help" className="hover:text-foreground">
              Help Center
            </Link>
            <span>/</span>
            <Link href={`/help/${article.category.slug}`} className="hover:text-foreground">
              {article.category.title}
            </Link>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold">{article.title}</h1>

          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Updated {updatedDate}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl">
          <Card>
            <CardContent className="py-8">
              {article.summary && (
                <p className="text-lg text-muted-foreground mb-6 pb-6 border-b">
                  {article.summary}
                </p>
              )}

              {/* Render blocks */}
              <div className="prose prose-slate max-w-none">
                {article.blocks.map((block, index) => (
                  <RenderBlock key={block.id || index} block={block} />
                ))}
              </div>

              {article.blocks.length === 0 && (
                <p className="text-muted-foreground">
                  This article doesn't have any contents yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="mt-8">
            <Link
              href={`/help/${article.category.slug}`}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {article.category.title}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple block renderer
function RenderBlock({ block }: { block: { type: string; data: Record<string, unknown> } }) {
  switch (block.type) {
    case "paragraph":
    case "text":
      return <p>{String(block.data.text || "")}</p>;

    case "header":
    case "heading": {
      const level = (block.data.level as number) || 2;
      const text = String(block.data.text || "");
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      return <Tag>{text}</Tag>;
    }

    case "list": {
      const items = (block.data.items as string[]) || [];
      const style = block.data.style as string;
      const ListTag = style === "ordered" ? "ol" : "ul";
      return (
        <ListTag>
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ListTag>
      );
    }

    case "quote":
      return (
        <blockquote>
          <p>{String(block.data.text || "")}</p>
          {block.data.caption && (
            <cite>{String(block.data.caption)}</cite>
          )}
        </blockquote>
      );

    case "code":
      return (
        <pre>
          <code>{String(block.data.code || "")}</code>
        </pre>
      );

    case "image":
      return (
        <figure>
          <img
            src={String(block.data.url || block.data.file?.url || "")}
            alt={String(block.data.caption || "")}
          />
          {block.data.caption && (
            <figcaption>{String(block.data.caption)}</figcaption>
          )}
        </figure>
      );

    default:
      // Fallback for unknown block types
      if (block.data.text) {
        return <p>{String(block.data.text)}</p>;
      }
      return null;
  }
}

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface HelpCategory {
  id: string;
  slug: string;
  title: string;
}

interface HelpArticle {
  id: string;
  categoryId: string;
  slug: string;
  title: string;
  summary: string | null;
  blocks: Array<{ id?: string; type: string; data: Record<string, unknown> }>;
  metaTitle: string | null;
  metaDescription: string | null;
  status: "draft" | "published";
  locale: string;
  order: number;
}

export default function HelpArticleEditor() {
  const [, params] = useRoute("/admin/help/articles/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = params?.id === "new";
  const articleId = isNew ? null : params?.id;

  const [formData, setFormData] = useState({
    categoryId: "",
    title: "",
    slug: "",
    summary: "",
    contents: "", // Simple text contents for blocks
    metaTitle: "",
    metaDescription: "",
    order: 0,
  });

  // Fetch categories
  const { data: categoriesData, isLoading: loadingCategories } = useQuery<{ categories: HelpCategory[] }>({
    queryKey: ["/api/admin/help/categories"],
  });

  // Fetch article if editing
  const { data: articleData, isLoading: loadingArticle } = useQuery<{ article: HelpArticle }>({
    queryKey: ["/api/admin/help/articles", articleId],
    enabled: !!articleId,
  });

  // Load article data into form
  useEffect(() => {
    if (articleData?.article) {
      const article = articleData.article;
      // Extract text contents from blocks
      const textContent = article.blocks
        ?.filter((b) => b.type === "paragraph" || b.type === "text")
        .map((b) => (b.data as { text?: string }).text || "")
        .join("\n\n") || "";

      setFormData({
        categoryId: article.categoryId,
        title: article.title,
        slug: article.slug,
        summary: article.summary || "",
        contents: textContent,
        metaTitle: article.metaTitle || "",
        metaDescription: article.metaDescription || "",
        order: article.order,
      });
    }
  }, [articleData]);

  // Create mutation
  const createArticle = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("/api/admin/help/articles", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (response: { article: HelpArticle }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/articles"] });
      toast({ title: "Article created" });
      navigate(`/admin/help/articles/${response.article.id}`);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Update mutation
  const updateArticle = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest(`/api/admin/help/articles/${articleId}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/articles"] });
      toast({ title: "Article saved" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Publish/Unpublish mutations
  const publishArticle = useMutation({
    mutationFn: () => apiRequest(`/api/admin/help/articles/${articleId}/publish`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/articles", articleId] });
      toast({ title: "Article published" });
    },
  });

  const unpublishArticle = useMutation({
    mutationFn: () => apiRequest(`/api/admin/help/articles/${articleId}/unpublish`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/articles", articleId] });
      toast({ title: "Article unpublished" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert contents to blocks
    const blocks = formData.contents.split("\n\n").filter(Boolean).map((text, index) => ({
      id: `block-${index}`,
      type: "paragraph",
      data: { text },
    }));

    const data = {
      categoryId: formData.categoryId,
      title: formData.title,
      slug: formData.slug,
      summary: formData.summary || null,
      blocks,
      metaTitle: formData.metaTitle || null,
      metaDescription: formData.metaDescription || null,
      order: formData.order,
    };

    if (isNew) {
      createArticle.mutate(data);
    } else {
      updateArticle.mutate(data);
    }
  };

  const categories = categoriesData?.categories || [];
  const article = articleData?.article;
  const isLoading = loadingCategories || (!isNew && loadingArticle);
  const isSaving = createArticle.isPending || updateArticle.isPending;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/help">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">
            {isNew ? "New Article" : "Edit Article"}
          </h1>
        </div>
        {!isNew && article && (
          <div className="flex items-center gap-2">
            {article.status === "draft" ? (
              <Button
                variant="outline"
                onClick={() => publishArticle.mutate()}
                disabled={publishArticle.isPending}
              >
                <Eye className="h-4 w-4 mr-2" />
                Publish
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => unpublishArticle.mutate()}
                disabled={unpublishArticle.isPending}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Unpublish
              </Button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="How to get started"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Summary</Label>
                  <Textarea
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="Brief description of this article"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contents">Content</Label>
                  <Textarea
                    id="contents"
                    value={formData.contents}
                    onChange={(e) => setFormData({ ...formData, contents: e.target.value })}
                    placeholder="Write your article contents here. Separate paragraphs with blank lines."
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate paragraphs with blank lines
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="getting-started"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order">Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    value={formData.metaTitle}
                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                    placeholder="Custom page title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={formData.metaDescription}
                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                    placeholder="Custom page description"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Article"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

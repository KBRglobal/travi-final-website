import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  FileText,
  FolderOpen,
  Eye,
  EyeOff,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface HelpCategory {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  locale: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface HelpArticle {
  id: string;
  categoryId: string;
  slug: string;
  title: string;
  summary: string | null;
  status: "draft" | "published";
  viewCount: number;
  locale: string;
  createdAt: string;
  updatedAt: string;
  category?: HelpCategory;
}

interface HelpStats {
  totalCategories: number;
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  publishedPercent: number;
  topViewedArticles: Array<{
    id: string;
    title: string;
    viewCount: number;
    categoryTitle: string;
  }>;
}

export default function HelpCenterAdmin() {
  const [activeTab, setActiveTab] = useState("articles");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<HelpCategory | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data
  const {
    data: categoriesData,
    isLoading: loadingCategories,
    isError: categoriesError,
  } = useQuery<{ categories: HelpCategory[] }>({
    queryKey: ["/api/admin/help/categories"],
    retry: false,
  });

  const {
    data: articlesData,
    isLoading: loadingArticles,
    isError: articlesError,
  } = useQuery<{ articles: HelpArticle[] }>({
    queryKey: ["/api/admin/help/articles"],
    retry: false,
  });

  const { data: statsData } = useQuery<{ stats: HelpStats }>({
    queryKey: ["/api/admin/help/stats"],
    retry: false,
  });

  // Mutations
  const createCategory = useMutation({
    mutationFn: (data: Partial<HelpCategory>) =>
      apiRequest("/api/admin/help/categories", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/stats"] });
      setCategoryDialogOpen(false);
      toast({ title: "Category created" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, ...data }: Partial<HelpCategory> & { id: string }) =>
      apiRequest(`/api/admin/help/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/categories"] });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      toast({ title: "Category updated" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/help/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/stats"] });
      toast({ title: "Category deleted" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const publishArticle = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/help/articles/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/stats"] });
      toast({ title: "Article published" });
    },
  });

  const unpublishArticle = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/help/articles/${id}/unpublish`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/stats"] });
      toast({ title: "Article unpublished" });
    },
  });

  const deleteArticle = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/help/articles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/stats"] });
      toast({ title: "Article deleted" });
    },
  });

  const categories = categoriesData?.categories || [];
  const articles = articlesData?.articles || [];
  const stats = statsData?.stats;

  if (categoriesError || articlesError) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Help Center
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The Help Center module is not enabled. Set{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-sm">ENABLE_HELP_CENTER=true</code>{" "}
              in your environment variables to activate this feature.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingCategories || loadingArticles) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <HelpCircle className="h-6 w-6" />
            Help Center
          </h1>
          <p className="text-muted-foreground">Manage help categories and articles</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href="/help" target="_blank" rel="noopener">
              <Eye className="h-4 w-4 mr-2" />
              View Public
            </a>
          </Button>
          <Button asChild>
            <Link href="/admin/help/articles/new">
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCategories}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Articles</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalArticles}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.publishedPercent}%</div>
              <p className="text-xs text-muted-foreground">{stats.publishedArticles} articles</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Drafts</CardTitle>
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draftArticles}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Articles Tab */}
        <TabsContent value="articles" className="space-y-4">
          {articles.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No articles yet</h3>
                <p className="text-muted-foreground mb-4">Create your first help article</p>
                <Button asChild>
                  <Link href="/admin/help/articles/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Article
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {articles.map(article => (
                <Card key={article.id}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/help/articles/${article.id}`}
                          className="font-medium hover:underline"
                        >
                          {article.title}
                        </Link>
                        <Badge variant={article.status === "published" ? "default" : "secondary"}>
                          {article.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {article.category?.title || "No category"} &middot; {article.viewCount}{" "}
                        views
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {article.status === "draft" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => publishArticle.mutate(article.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Publish
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unpublishArticle.mutate(article.id)}
                        >
                          <EyeOff className="h-4 w-4 mr-1" />
                          Unpublish
                        </Button>
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/help/articles/${article.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete article?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteArticle.mutate(article.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Dialog
              open={categoryDialogOpen}
              onOpenChange={open => {
                setCategoryDialogOpen(open);
                if (!open) setEditingCategory(null);
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
                </DialogHeader>
                <CategoryForm
                  category={editingCategory}
                  onSubmit={data => {
                    if (editingCategory) {
                      updateCategory.mutate({ id: editingCategory.id, ...data });
                    } else {
                      createCategory.mutate(data);
                    }
                  }}
                  isLoading={createCategory.isPending || updateCategory.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>

          {categories.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No categories yet</h3>
                <p className="text-muted-foreground">Create categories to organize your articles</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {categories.map(category => (
                <Card key={category.id}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{category.title}</span>
                        {!category.isActive && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">/{category.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingCategory(category);
                          setCategoryDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete category?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will also delete all articles in this category.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteCategory.mutate(category.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Viewed Articles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.topViewedArticles.length === 0 ? (
                <p className="text-muted-foreground">No article views yet</p>
              ) : (
                <div className="space-y-4">
                  {stats?.topViewedArticles.map((article, index) => (
                    <div key={article.id} className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-muted-foreground w-8">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{article.title}</p>
                        <p className="text-sm text-muted-foreground">{article.categoryTitle}</p>
                      </div>
                      <Badge variant="secondary">{article.viewCount} views</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Category Form Component
function CategoryForm({
  category,
  onSubmit,
  isLoading,
}: {
  category: HelpCategory | null;
  onSubmit: (data: Partial<HelpCategory>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: category?.title || "",
    slug: category?.slug || "",
    description: category?.description || "",
    order: category?.order || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={e => setFormData({ ...formData, slug: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="order">Order</Label>
        <Input
          id="order"
          type="number"
          value={formData.order}
          onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Saving..." : category ? "Update Category" : "Create Category"}
      </Button>
    </form>
  );
}

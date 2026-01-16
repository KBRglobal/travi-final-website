import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Edit2, 
  Eye, 
  Trash2, 
  MoreVertical, 
  FileText, 
  Calendar,
  Globe,
  Layout,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface EditablePage {
  id: string;
  slug: string;
  pageType: string;
  title: string;
  titleHe: string | null;
  metaTitle: string | null;
  metaTitleHe: string | null;
  metaDescription: string | null;
  metaDescriptionHe: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastEditedBy: string | null;
}

const PAGE_TYPES = [
  { value: "home", label: "Home Page" },
  { value: "category", label: "Category Page" },
  { value: "landing", label: "Landing Page" },
  { value: "static", label: "Static Page" },
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function SitesDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletingPage, setDeletingPage] = useState<EditablePage | null>(null);
  const [newPage, setNewPage] = useState({
    title: "",
    titleHe: "",
    slug: "",
    pageType: "landing",
  });

  const { data: pages, isLoading } = useQuery<EditablePage[]>({
    queryKey: ["/api/page-builder/pages"],
  });

  const createPageMutation = useMutation({
    mutationFn: async (data: typeof newPage) => {
      return apiRequest("POST", "/api/page-builder/pages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages"] });
      toast({ title: "Page created successfully" });
      setShowCreateDialog(false);
      setNewPage({ title: "", titleHe: "", slug: "", pageType: "landing" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/page-builder/pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages"] });
      toast({ title: "Page deleted" });
      setDeletingPage(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleTitleChange = (title: string) => {
    setNewPage((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const handleCreatePage = () => {
    if (!newPage.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    createPageMutation.mutate(newPage);
  };

  const handleEditPage = (page: EditablePage) => {
    setLocation(`/admin/visual-editor/${page.slug}`);
  };

  const handlePreviewPage = (page: EditablePage) => {
    setLocation(`/admin/visual-editor/${page.slug}?preview=true`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Layout className="h-8 w-8 text-primary" />
            Visual Editor
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your site pages with drag-and-drop editing
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-new-site">
          <Plus className="h-4 w-4 mr-2" />
          Create New Site
        </Button>
      </div>

      {(!pages || pages.length === 0) ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Pages Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first page to get started with the visual editor
            </p>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first-page">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pages.map((page) => (
            <Card key={page.id} className="overflow-visible hover-elevate" data-testid={`card-page-${page.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg truncate" data-testid={`text-title-${page.id}`}>
                    {page.title}
                  </CardTitle>
                  <CardDescription className="truncate" data-testid={`text-slug-${page.id}`}>
                    /{page.slug}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-menu-${page.id}`}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditPage(page)} data-testid={`menu-edit-${page.id}`}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePreviewPage(page)} data-testid={`menu-preview-${page.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setDeletingPage(page)} 
                      className="text-destructive"
                      data-testid={`menu-delete-${page.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={page.isPublished ? "default" : "secondary"} data-testid={`badge-status-${page.id}`}>
                    {page.isPublished ? (
                      <>
                        <Globe className="h-3 w-3 mr-1" />
                        Published
                      </>
                    ) : (
                      "Draft"
                    )}
                  </Badge>
                  <Badge variant="outline">{page.pageType}</Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span data-testid={`text-updated-${page.id}`}>
                    Edited {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1" 
                    onClick={() => handleEditPage(page)}
                    data-testid={`button-edit-${page.id}`}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePreviewPage(page)}
                    data-testid={`button-preview-${page.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDeletingPage(page)}
                    data-testid={`button-delete-${page.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
            <DialogDescription>
              Add a new page to your site. You can customize it with the visual editor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Page Title (English)</Label>
              <Input
                id="title"
                value={newPage.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g., About Us"
                data-testid="input-page-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="titleHe">Page Title (Hebrew)</Label>
              <Input
                id="titleHe"
                value={newPage.titleHe}
                onChange={(e) => setNewPage((prev) => ({ ...prev, titleHe: e.target.value }))}
                placeholder="e.g., אודותינו"
                dir="rtl"
                data-testid="input-page-title-he"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={newPage.slug}
                onChange={(e) => setNewPage((prev) => ({ ...prev, slug: generateSlug(e.target.value) }))}
                placeholder="about-us"
                data-testid="input-page-slug"
              />
              <p className="text-xs text-muted-foreground">
                URL: yoursite.com/{newPage.slug || "page-slug"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Page Type</Label>
              <Select 
                value={newPage.pageType} 
                onValueChange={(value) => setNewPage((prev) => ({ ...prev, pageType: value }))}
              >
                <SelectTrigger data-testid="select-page-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePage} 
              disabled={createPageMutation.isPending}
              data-testid="button-confirm-create"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingPage} onOpenChange={() => setDeletingPage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPage?.title}"? This action cannot be undone.
              All sections within this page will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPage && deletePageMutation.mutate(deletingPage.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, Plus, Trash2, Edit2, Lightbulb, Eye, Globe
} from "lucide-react";
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

interface StaticPageBlock {
  id: string;
  type: string;
  data: unknown;
}

interface StaticPage {
  id: string;
  slug: string;
  title: string;
  titleHe: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  contents: string | null;
  contentHe: string | null;
  blocks: StaticPageBlock[];
  isActive: boolean;
  showInFooter: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function StaticPagesPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [deletePageId, setDeletePageId] = useState<string | null>(null);

  const { data: pages, isLoading } = useQuery<StaticPage[]>({
    queryKey: ["/api/site-config/pages"],
  });

  const deletePageMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/site-config/pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-config/pages"] });
      toast({ title: "Page deleted" });
      setDeletePageId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          Static Pages
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage static pages like Terms of Service, Privacy Policy, About, and Contact
        </p>
        
        <div className="mt-4 p-4 bg-muted rounded-lg border">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            איך זה עובד / How It Works
          </h3>
          <p className="text-sm text-muted-foreground mb-2" dir="rtl">
            דפים סטטיים הם דפי מידע קבועים כמו תנאי שימוש, מדיניות פרטיות, אודות ויצירת קשר.
            ניתן לערוך את התוכן בעברית ובאנגלית ולקבוע אם הדף יופיע בפוטר.
          </p>
          <p className="text-sm text-muted-foreground">
            Static pages are fixed information pages like Terms of Service, Privacy Policy, About, and Contact.
            You can edit contents in both Hebrew and English and choose whether to show them in the footer.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => navigate("/admin/static-pages/new")} data-testid="button-create-page">
          <Plus className="h-4 w-4 mr-2" />
          Create Page
        </Button>
      </div>

      {(!pages || pages.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Static Pages</h3>
            <p className="text-muted-foreground mb-4">
              Create pages like Terms of Service, Privacy Policy, etc.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Card key={page.id} className="hover-elevate">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{page.title}</CardTitle>
                  <div className="flex items-center gap-1">
                    {page.isActive ? (
                      <Badge className="bg-green-500/10 text-green-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </div>
                </div>
                {page.titleHe && (
                  <p className="text-sm text-muted-foreground" dir="rtl">{page.titleHe}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <span>/{page.slug}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {page.showInFooter && (
                      <Badge variant="outline">Shows in footer</Badge>
                    )}
                    {page.blocks && page.blocks.length > 0 && (
                      <Badge variant="outline">{page.blocks.length} blocks</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/static-pages/edit/${page.id}`)}
                      data-testid={`button-edit-page-${page.slug}`}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletePageId(page.id)}
                      data-testid={`button-delete-page-${page.slug}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deletePageId} onOpenChange={() => setDeletePageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this page? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePageId && deletePageMutation.mutate(deletePageId)}
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

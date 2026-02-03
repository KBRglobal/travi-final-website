import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ContentItem {
  id: string;
  title: string;
  type: string;
  status: string;
  seoScore: number;
  wordCount: number;
  writerId: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
}

interface ContentResponse {
  content: ContentItem[];
  total: number;
  limit: number;
  offset: number;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "published":
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Published
        </Badge>
      );
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "in_review":
      return (
        <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
          Needs Review
        </Badge>
      );
    case "approved":
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          Approved
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-6 w-[300px]" />
          <Skeleton className="h-6 w-[80px]" />
          <Skeleton className="h-6 w-[100px]" />
          <Skeleton className="h-6 w-[100px]" />
          <Skeleton className="h-6 w-[80px]" />
          <Skeleton className="h-6 w-[100px]" />
          <Skeleton className="h-6 w-[100px]" />
        </div>
      ))}
    </div>
  );
}

export default function OctypoContentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newContent, setNewContent] = useState({
    title: "",
    type: "article",
    description: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createContentMutation = useMutation({
    mutationFn: (data: typeof newContent) =>
      apiRequest("/api/contents", { method: "POST", body: data }),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/octypo/content"] });
      toast({ title: "Content created", description: "New content has been created as draft." });
      setIsCreateDialogOpen(false);
      setNewContent({ title: "", type: "article", description: "" });
      if (response?.id) {
        setLocation(`/admin/contents/${response.id}/edit`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const {
    data: contentData,
    isLoading,
    error,
    refetch,
  } = useQuery<ContentResponse>({
    queryKey: ["/api/octypo/content"],
  });
  const content = contentData?.content || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/contents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/octypo/content"] });
      toast({ title: "Content deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesType = typeFilter === "all" || item.type?.toLowerCase() === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalResults = filteredContent.length;

  const handleView = (id: string) => {
    setLocation(`/admin/contents/${id}`);
  };

  const handleEdit = (id: string) => {
    setLocation(`/admin/contents/${id}/edit`);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this content?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6" data-testid="octypo-content-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">
            Content
          </h1>
          <p className="text-muted-foreground">Manage and monitor your AI-generated content</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-content">
          <Plus className="h-4 w-4 mr-2" />
          Create Content
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load content. Please try again.
            <Button variant="link" className="ml-2 p-0 h-auto" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_review">Needs Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Writer</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContent.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {content.length === 0
                          ? "No content found. Create your first piece of content to get started."
                          : "No content matches your filters."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContent.map(item => (
                      <TableRow key={item.id} data-testid={`row-content-${item.id}`}>
                        <TableCell>
                          <span className="font-medium">{item.title}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.type || "Article"}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">{item.writerId || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={item.seoScore || 0} className="w-16 h-2" />
                            <span className="text-sm font-medium">{item.seoScore || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {formatDate(item.updatedAt || item.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleView(item.id)}
                              data-testid={`button-view-${item.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item.id)}
                              data-testid={`button-edit-${item.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${item.id}`}
                            >
                              {deleteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  Showing 1 to {totalResults} of {contentData?.total || totalResults} results
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="default" size="sm" data-testid="button-page-1">
                    1
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    onClick={() => setCurrentPage(p => p + 1)}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Content</DialogTitle>
            <DialogDescription>
              Create a new content item. It will be saved as a draft.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter content title..."
                value={newContent.title}
                onChange={e => setNewContent({ ...newContent, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={newContent.type}
                onValueChange={v => setNewContent({ ...newContent, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the content..."
                value={newContent.description}
                onChange={e => setNewContent({ ...newContent, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createContentMutation.mutate(newContent)}
              disabled={!newContent.title || createContentMutation.isPending}
            >
              {createContentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

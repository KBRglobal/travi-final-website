import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useUrlState } from "@/hooks/use-url-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column, type Action } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { ContentTypeBadge } from "@/components/contents-type-badge";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Plus,
  Search,
  MapPin,
  Building2,
  FileText,
  Filter,
  X,
  UtensilsCrossed,
  Map as MapIcon,
  Train,
  Calendar,
  Route,
  Tag,
  Trash2,
  Download,
  ChevronDown,
  AlertTriangle,
  Megaphone,
  FileBarChart2,
  Building,
  LayoutGrid,
  List,
  Kanban,
  Sparkles,
  Loader2,
} from "lucide-react";
import { ContentKanban } from "@/components/contents-kanban";
import type { ContentWithRelations, Tag as TagType } from "@shared/schema";

interface DeleteWarning {
  id: string;
  title: string;
  status: string;
  reason: string;
}

interface ContentListProps {
  type: "attraction" | "hotel" | "article" | "dining" | "district" | "transport" | "event" | "itinerary" | "landing_page" | "case_study" | "off_plan";
}

const typeConfig = {
  attraction: {
    title: "Attractions",
    singular: "Attraction",
    icon: MapPin,
    basePath: "/admin/attractions",
    wordTarget: "~1950 words",
  },
  hotel: {
    title: "Hotels",
    singular: "Hotel",
    icon: Building2,
    basePath: "/admin/hotels",
    wordTarget: "~3000 words",
  },
  article: {
    title: "News",
    singular: "News Article",
    icon: FileText,
    basePath: "/admin/articles",
    wordTarget: "~1200-2000 words",
  },
  dining: {
    title: "Dining",
    singular: "Restaurant",
    icon: UtensilsCrossed,
    basePath: "/admin/dining",
    wordTarget: "~1500 words",
  },
  district: {
    title: "Districts",
    singular: "District",
    icon: MapIcon,
    basePath: "/admin/districts",
    wordTarget: "~2000 words",
  },
  transport: {
    title: "Transport",
    singular: "Transport",
    icon: Train,
    basePath: "/admin/transport",
    wordTarget: "~1200 words",
  },
  event: {
    title: "Events",
    singular: "Event",
    icon: Calendar,
    basePath: "/admin/events",
    wordTarget: "~800 words",
  },
  itinerary: {
    title: "Itineraries",
    singular: "Itinerary",
    icon: Route,
    basePath: "/admin/itineraries",
    wordTarget: "~1500 words",
  },
  landing_page: {
    title: "Landing Pages",
    singular: "Landing Page",
    icon: Megaphone,
    basePath: "/admin/landing-pages",
    wordTarget: "~1800-2500 words",
  },
  case_study: {
    title: "Case Studies",
    singular: "Case Study",
    icon: FileBarChart2,
    basePath: "/admin/case-studies",
    wordTarget: "~2000-3000 words",
  },
  off_plan: {
    title: "Off-Plan Properties",
    singular: "Off-Plan Property",
    icon: Building,
    basePath: "/admin/off-plan",
    wordTarget: "~2500-3500 words",
  },
};

export default function ContentList({ type }: ContentListProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const config = typeConfig[type];

  // URL-synced filter state - persists across page refreshes and enables shareable links
  const [urlState, setUrlState] = useUrlState({
    search: "",
    status: "all",
    view: "table",
  });

  const searchQuery = urlState.search;
  const statusFilter = urlState.status;
  const viewMode = urlState.view as "table" | "kanban";

  const setSearchQuery = (value: string) => setUrlState({ search: value });
  const setStatusFilter = (value: string) => setUrlState({ status: value });
  const setViewMode = (value: "table" | "kanban") => setUrlState({ view: value });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteWarnings, setDeleteWarnings] = useState<DeleteWarning[]>([]);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);

  const { data: contents, isLoading } = useQuery<ContentWithRelations[]>({
    queryKey: [`/api/contents?type=${type}`],
  });

  const { data: writersData } = useQuery<{ writers: Array<{ id: string; name: string; avatar: string }> }>({
    queryKey: ["/api/writers"],
  });

  const writersMap = new Map(writersData?.writers?.map(w => [w.id, w]) || []);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/contents/${id}`);
    },
    // Optimistic update: remove item immediately
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [`/api/contents?type=${type}`] });
      const previousContents = queryClient.getQueryData<ContentWithRelations[]>([`/api/contents?type=${type}`]);
      queryClient.setQueryData<ContentWithRelations[]>(
        [`/api/contents?type=${type}`],
        (old) => old?.filter((item) => item.id !== id) ?? []
      );
      return { previousContents };
    },
    onSuccess: () => {
      toast({
        title: "Content deleted",
        description: "The contents has been deleted successfully.",
      });
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousContents) {
        queryClient.setQueryData([`/api/contents?type=${type}`], context.previousContents);
      }
      toast({
        title: "Error",
        description: "Failed to delete contents. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contents?type=${type}`] });
    },
  });

  const { data: tags } = useQuery<TagType[]>({ queryKey: ["/api/tags"] });

  const bulkStatusMutation = useMutation({
    mutationFn: async (data: { ids: string[]; status: string }) => {
      await apiRequest("POST", "/api/contents/bulk-status", data);
    },
    // Optimistic update: change status immediately
    onMutate: async (data: { ids: string[]; status: string }) => {
      await queryClient.cancelQueries({ queryKey: [`/api/contents?type=${type}`] });
      const previousContents = queryClient.getQueryData<ContentWithRelations[]>([`/api/contents?type=${type}`]);
      queryClient.setQueryData<ContentWithRelations[]>(
        [`/api/contents?type=${type}`],
        (old) =>
          old?.map((item) =>
            data.ids.includes(item.id)
              ? { ...item, status: data.status as ContentWithRelations["status"] }
              : item
          ) ?? []
      );
      return { previousContents };
    },
    onSuccess: () => {
      setSelectedIds([]);
      toast({ title: "Status updated", description: "Selected items have been updated." });
    },
    onError: (_err, _data, context) => {
      if (context?.previousContents) {
        queryClient.setQueryData([`/api/contents?type=${type}`], context.previousContents);
      }
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contents?type=${type}`] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await apiRequest("POST", "/api/contents/bulk-delete", { ids });
    },
    // Optimistic update: remove items immediately
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: [`/api/contents?type=${type}`] });
      const previousContents = queryClient.getQueryData<ContentWithRelations[]>([`/api/contents?type=${type}`]);
      queryClient.setQueryData<ContentWithRelations[]>(
        [`/api/contents?type=${type}`],
        (old) => old?.filter((item) => !ids.includes(item.id)) ?? []
      );
      return { previousContents };
    },
    onSuccess: () => {
      setSelectedIds([]);
      toast({ title: "Deleted", description: "Selected items have been deleted." });
    },
    onError: (_err, _ids, context) => {
      if (context?.previousContents) {
        queryClient.setQueryData([`/api/contents?type=${type}`], context.previousContents);
      }
      toast({ title: "Error", description: "Failed to delete items.", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contents?type=${type}`] });
    },
  });

  const bulkAddTagMutation = useMutation({
    mutationFn: async (data: { ids: string[]; tagId: string }) => {
      await apiRequest("POST", "/api/contents/bulk-add-tag", data);
    },
    onSuccess: () => {
      setSelectedIds([]);
      toast({ title: "Tag added", description: "Tag has been added to selected items." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add tag.", variant: "destructive" });
    },
  });

  const bulkRemoveTagMutation = useMutation({
    mutationFn: async (data: { ids: string[]; tagId: string }) => {
      await apiRequest("POST", "/api/contents/bulk-remove-tag", data);
    },
    onSuccess: () => {
      setSelectedIds([]);
      toast({ title: "Tag removed", description: "Tag has been removed from selected items." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove tag.", variant: "destructive" });
    },
  });

  const handleBulkDeleteClick = async () => {
    if (selectedIds.length === 0) return;
    
    setIsCheckingDelete(true);
    try {
      const response = await apiRequest("POST", "/api/contents/bulk-delete-check", { ids: selectedIds });
      const data = await response.json();
      
      if (data.warnings && data.warnings.length > 0) {
        setDeleteWarnings(data.warnings);
        setShowDeleteWarning(true);
      } else {
        bulkDeleteMutation.mutate(selectedIds);
      }
    } catch (error) {
      bulkDeleteMutation.mutate(selectedIds);
    } finally {
      setIsCheckingDelete(false);
    }
  };

  const handleConfirmDelete = () => {
    setShowDeleteWarning(false);
    setDeleteWarnings([]);
    bulkDeleteMutation.mutate(selectedIds);
  };

  const handleCancelDelete = () => {
    setShowDeleteWarning(false);
    setDeleteWarnings([]);
  };

  const filteredContents = contents?.filter((contents) => {
    const matchesSearch = contents.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contents.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || contents.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) ?? [];

  const columns: Column<ContentWithRelations>[] = [
    {
      key: "title",
      header: "Title",
      cell: (item) => (
        <div className="max-w-md">
          <div className="font-medium truncate">{item.title}</div>
          <div className="text-xs text-muted-foreground font-mono">/{item.slug}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "writer",
      header: "Writer",
      cell: (item) => {
        const writer = item.writerId ? writersMap.get(item.writerId) : null;
        return writer ? (
          <div className="flex items-center gap-2">
            <img
              src={writer.avatar}
              alt={writer.name}
              className="w-5 h-5 rounded-full"
            />
            <span className="text-sm text-muted-foreground truncate max-w-[120px]">{writer.name}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        );
      },
    },
    {
      key: "wordCount",
      header: "Words",
      cell: (item) => (
        <span className="text-sm text-muted-foreground">{item.wordCount ?? 0}</span>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      cell: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "-"}
        </span>
      ),
    },
  ];

  const actions: Action<ContentWithRelations>[] = [
    {
      label: "Edit",
      onClick: (item) => navigate(`${config.basePath}/${item.id}`),
    },
    {
      label: "Preview",
      onClick: (item) => {
        const pathMap: Record<string, string> = {
          attraction: "attractions",
          hotel: "hotels",
          article: "articles",
          dining: "dining",
          district: "districts",
          transport: "transport",
          event: "events",
          itinerary: "itineraries",
          landing_page: "landing",
          case_study: "case-studies",
          off_plan: "off-plan",
        };
        window.open(`/${pathMap[type]}/${item.slug}`, "_blank");
      },
    },
    {
      label: "Delete",
      onClick: (item) => {
        if (confirm("Are you sure you want to delete this contents?")) {
          deleteMutation.mutate(item.id);
        }
      },
      variant: "destructive",
    },
  ];

  const handleClearFilters = () => {
    setUrlState({ search: "", status: "all" });
  };

  const hasFilters = searchQuery || statusFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{config.title}</h1>
          <p className="text-muted-foreground">
            Manage your {config.title.toLowerCase()} pages ({config.wordTarget})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid={`button-magic-ai-${type}`}>
                <Sparkles className="h-4 w-4 text-purple-500" />
                Magic AI
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => navigate(`${config.basePath}/new?ai=true`)}
                data-testid={`menu-item-magic-generate-${type}`}
              >
                <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                Generate New {config.singular}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled
                className="text-muted-foreground"
                data-testid="menu-item-magic-bulk-translate"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Bulk Translations (Coming Soon)
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled
                className="text-muted-foreground"
                data-testid="menu-item-magic-bulk-images"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Bulk Images (Coming Soon)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href={`${config.basePath}/new`}>
            <Button data-testid={`button-new-${type}`}>
              <Plus className="h-4 w-4 mr-2" />
              New {config.singular}
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${config.title.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="icon" onClick={handleClearFilters} data-testid="button-clear-filters">
                  <X className="h-4 w-4" />
                </Button>
              )}
              <div className="border-l pl-2 ml-2 flex items-center gap-1">
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("table")}
                  data-testid="button-view-table"
                  title="Table view"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "kanban" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("kanban")}
                  data-testid="button-view-kanban"
                  title="Kanban view"
                >
                  <Kanban className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-muted rounded-md mb-4" data-testid="bulk-actions-toolbar">
              <span className="text-sm font-medium">{selectedIds.length} selected</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-bulk-status">
                    Status <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {["draft", "in_review", "approved", "scheduled", "published"].map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: s })}
                      data-testid={`menu-item-status-${s}`}
                    >
                      {s.replace("_", " ")}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-bulk-add-tag">
                    <Tag className="mr-1 h-4 w-4" /> Add Tag
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {tags?.length === 0 && (
                    <DropdownMenuItem disabled>No tags available</DropdownMenuItem>
                  )}
                  {tags?.map((tag) => (
                    <DropdownMenuItem
                      key={tag.id}
                      onClick={() => bulkAddTagMutation.mutate({ ids: selectedIds, tagId: tag.id })}
                      data-testid={`menu-item-add-tag-${tag.id}`}
                    >
                      {tag.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-bulk-remove-tag">
                    <X className="mr-1 h-4 w-4" /> Remove Tag
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {tags?.length === 0 && (
                    <DropdownMenuItem disabled>No tags available</DropdownMenuItem>
                  )}
                  {tags?.map((tag) => (
                    <DropdownMenuItem
                      key={tag.id}
                      onClick={() => bulkRemoveTagMutation.mutate({ ids: selectedIds, tagId: tag.id })}
                      data-testid={`menu-item-remove-tag-${tag.id}`}
                    >
                      {tag.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/api/contents/export?ids=${selectedIds.join(",")}&format=csv`)}
                data-testid="button-bulk-export"
              >
                <Download className="mr-1 h-4 w-4" /> Export
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDeleteClick}
                disabled={isCheckingDelete || bulkDeleteMutation.isPending}
                data-testid="button-bulk-delete"
              >
                <Trash2 className="mr-1 h-4 w-4" /> {isCheckingDelete ? "Checking..." : "Delete"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                data-testid="button-clear-selection"
              >
                Clear
              </Button>
            </div>
          )}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-4 border-b last:border-0">
                  <Skeleton className="h-5 w-5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : filteredContents.length === 0 ? (
            <EmptyState
              icon={config.icon}
              title={`No ${config.title.toLowerCase()} found`}
              description={
                hasFilters
                  ? "Try adjusting your search or filters"
                  : `Create your first ${config.singular.toLowerCase()} to get started`
              }
              actionLabel={hasFilters ? "Clear filters" : `Create ${config.singular}`}
              onAction={hasFilters ? handleClearFilters : () => navigate(`${config.basePath}/new`)}
            />
          ) : viewMode === "kanban" ? (
            <ContentKanban
              contents={filteredContents}
              type={type}
              basePath={config.basePath}
            />
          ) : (
            <DataTable
              data={filteredContents}
              columns={columns}
              actions={actions}
              selectable
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              getItemId={(item) => item.id}
              pageSize={10}
              onRowClick={(item) => navigate(`${config.basePath}/${item.id}`)}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
        <AlertDialogContent data-testid="dialog-delete-warning">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Warning: Published or Scheduled Content
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  The following items are published or scheduled and deleting them will remove them from the public site:
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {deleteWarnings.map((warning) => (
                    <div
                      key={warning.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                      data-testid={`warning-item-${warning.id}`}
                    >
                      <span className="font-medium truncate flex-1 mr-2">{warning.title}</span>
                      <StatusBadge status={warning.status as "draft" | "in_review" | "approved" | "scheduled" | "published"} />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete {deleteWarnings.length === selectedIds.length 
                    ? "all" 
                    : `${deleteWarnings.length} of ${selectedIds.length}`} selected items?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

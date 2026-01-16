import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  ClipboardList,
  MoreVertical,
  Edit,
  Trash2,
  BarChart3,
  ExternalLink,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import type { Survey } from "@shared/schema";

export default function SurveysPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: surveys, isLoading } = useQuery<Survey[]>({
    queryKey: ["/api/surveys", statusFilter],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/surveys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      toast({ title: "Survey deleted successfully" });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete survey", variant: "destructive" });
    },
  });

  const filteredSurveys = surveys?.filter((survey) => {
    const matchesSearch = survey.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || survey.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      active: "default",
      closed: "outline",
      archived: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const copyPublicLink = (slug: string) => {
    const url = `${window.location.origin}/survey/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Surveys</h1>
          <p className="text-muted-foreground">Create and manage surveys to collect user feedback</p>
        </div>
        <Button onClick={() => navigate("/admin/surveys/new")} data-testid="button-create-survey">
          <Plus className="mr-2 h-4 w-4" />
          Create Survey
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search surveys..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-surveys"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSurveys?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No surveys found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {search || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first survey to start collecting feedback"}
            </p>
            {!search && statusFilter === "all" && (
              <Button onClick={() => navigate("/admin/surveys/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Survey
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSurveys?.map((survey) => (
            <Card key={survey.id} className="hover-elevate" data-testid={`card-survey-${survey.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div className="space-y-1 flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{survey.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(survey.status)}
                    <span className="text-sm text-muted-foreground">
                      {survey.responseCount || 0} responses
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-menu-${survey.id}`}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/admin/surveys/${survey.id}`)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/admin/surveys/${survey.id}/responses`)}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Responses
                    </DropdownMenuItem>
                    {survey.status === "active" && (
                      <>
                        <DropdownMenuItem onClick={() => copyPublicLink(survey.slug)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`/survey/${survey.slug}`, "_blank")}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Preview
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteId(survey.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                {survey.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {survey.description}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  Created {format(new Date(survey.createdAt!), "MMM d, yyyy")}
                </div>
                {(survey.definition as any)?.questions?.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {(survey.definition as any).questions.length} questions
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Survey?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the survey and all its responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

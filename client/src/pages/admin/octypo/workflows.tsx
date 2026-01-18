import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Filter,
  Eye,
  XCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface Workflow {
  id: string;
  contentTitle: string;
  contentId: string | null;
  status: string;
  currentStep: string;
  steps: string[];
  completedSteps: number;
  totalSteps: number;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  writerId: string | null;
}

interface WorkflowsResponse {
  workflows: Workflow[];
  summary: {
    completed: number;
    running: number;
    pending: number;
    avgCompletionTime: number;
  };
}

function formatDuration(ms: number | null): string {
  if (!ms) return "-";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusBadge(status: string) {
  const normalizedStatus = status.toLowerCase();
  switch (normalizedStatus) {
    case "in_progress":
    case "running":
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Running</Badge>;
    case "completed":
    case "approved":
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "cancelled":
      return <Badge variant="outline">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function isRunningOrPending(status: string): boolean {
  const s = status.toLowerCase();
  return s === "running" || s === "in_progress" || s === "pending";
}

export default function OctypoWorkflowsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: workflowsData, isLoading, refetch } = useQuery<WorkflowsResponse>({
    queryKey: ['/api/octypo/workflows'],
  });
  
  const workflows = workflowsData?.workflows || [];
  const summary = workflowsData?.summary || { total: 0, running: 0, completed: 0, pending: 0 };

  const cancelWorkflowMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/octypo/workflows/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/octypo/workflows'] });
      toast({ title: "Workflow cancelled" });
    },
    onError: () => {
      toast({ title: "Failed to cancel workflow", variant: "destructive" });
    },
  });

  const retryWorkflowMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/octypo/workflows/${id}/retry`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/octypo/workflows'] });
      toast({ title: "Workflow retried" });
    },
    onError: () => {
      toast({ title: "Failed to retry workflow", variant: "destructive" });
    },
  });

  const filteredWorkflows = workflows.filter((workflow) => {
    if (statusFilter === "all") return true;
    const normalizedStatus = workflow.status.toLowerCase();
    if (statusFilter === "running") {
      return normalizedStatus === "running" || normalizedStatus === "in_progress";
    }
    if (statusFilter === "completed") {
      return normalizedStatus === "completed" || normalizedStatus === "approved";
    }
    return normalizedStatus === statusFilter;
  });

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="octypo-workflows-page">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Workflows</h1>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="octypo-workflows-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Workflows</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          data-testid="button-refresh"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>Running: <strong className="text-foreground">{summary.running}</strong></span>
          <span>Completed: <strong className="text-foreground">{summary.completed}</strong></span>
          <span>Pending: <strong className="text-foreground">{summary.pending}</strong></span>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {filteredWorkflows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No workflows found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow ID</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Step</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkflows.map((workflow) => (
                  <TableRow key={workflow.id} data-testid={`row-workflow-${workflow.id}`}>
                    <TableCell>
                      <span className="font-mono text-sm">{workflow.id.slice(0, 8)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{workflow.contentTitle}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(workflow.status)}</TableCell>
                    <TableCell>
                      <span className="text-muted-foreground capitalize">{workflow.currentStep}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{formatDate(workflow.startedAt)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{formatDuration(workflow.duration)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          data-testid={`button-view-${workflow.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isRunningOrPending(workflow.status) && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive"
                            onClick={() => cancelWorkflowMutation.mutate(workflow.id)}
                            disabled={cancelWorkflowMutation.isPending}
                            data-testid={`button-cancel-${workflow.id}`}
                          >
                            {cancelWorkflowMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {workflow.status.toLowerCase() === "failed" && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => retryWorkflowMutation.mutate(workflow.id)}
                            disabled={retryWorkflowMutation.isPending}
                            data-testid={`button-retry-${workflow.id}`}
                          >
                            {retryWorkflowMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

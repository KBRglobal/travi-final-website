import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

interface Workflow {
  id: string;
  workflowId: string;
  content: string;
  status: "Running" | "Completed" | "Failed" | "Pending" | "Cancelled";
  currentStep: string;
  started: string;
  duration: string;
}

const mockWorkflows: Workflow[] = [
  {
    id: "1",
    workflowId: "WF-001",
    content: "Tel Aviv Beach Guide",
    status: "Running",
    currentStep: "Content Generation",
    started: "Jan 18, 9:45 PM",
    duration: "2m 30s",
  },
  {
    id: "2",
    workflowId: "WF-002",
    content: "Jerusalem Restaurants",
    status: "Completed",
    currentStep: "Published",
    started: "Jan 18, 9:30 PM",
    duration: "5m 12s",
  },
  {
    id: "3",
    workflowId: "WF-003",
    content: "Haifa Museum Tour",
    status: "Pending",
    currentStep: "Waiting",
    started: "Jan 18, 9:50 PM",
    duration: "-",
  },
  {
    id: "4",
    workflowId: "WF-004",
    content: "Dead Sea Hotels",
    status: "Failed",
    currentStep: "Image Fetching",
    started: "Jan 18, 9:20 PM",
    duration: "1m 45s",
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "Running":
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{status}</Badge>;
    case "Completed":
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{status}</Badge>;
    case "Failed":
      return <Badge variant="destructive">{status}</Badge>;
    case "Pending":
      return <Badge variant="secondary">{status}</Badge>;
    case "Cancelled":
      return <Badge variant="outline">{status}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function OctypoWorkflowsPage() {
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredWorkflows = mockWorkflows.filter((workflow) => {
    if (statusFilter === "all") return true;
    return workflow.status.toLowerCase() === statusFilter;
  });

  return (
    <div className="space-y-6" data-testid="octypo-workflows-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Workflows</h1>
      </div>

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

      <Card>
        <CardContent className="pt-6">
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
                    <span className="font-mono text-sm">{workflow.workflowId}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{workflow.content}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(workflow.status)}</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{workflow.currentStep}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{workflow.started}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{workflow.duration}</span>
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
                      {(workflow.status === "Running" || workflow.status === "Pending") && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive"
                          data-testid={`button-cancel-${workflow.id}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

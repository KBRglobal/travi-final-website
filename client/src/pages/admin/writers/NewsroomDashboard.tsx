/**
 * Virtual Newsroom Dashboard
 *
 * Overview of the entire writing operation
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Users,
  FileText,
  Calendar,
  Plus,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { AssignmentDialog } from "@/components/writers/AssignmentDialog";

interface Assignment {
  id: string;
  writerId: string;
  contentType: string;
  topic: string;
  status: string;
  matchScore: number;
  priority: string;
  createdAt: string;
  dueDate?: string;
}

interface WriterStats {
  writerId: string;
  name: string;
  totalAssignments: number;
  completed: number;
  isActive: boolean;
}

export default function NewsroomDashboard() {
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);

  // Fetch writer stats
  const { data: statsData } = useQuery({
    queryKey: ["writer-stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/writers/stats");
      return response.json() as Promise<{ stats: WriterStats[] }>;
    },
  });

  // Fetch all writers for display
  const { data: writersData } = useQuery({
    queryKey: ["writers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/writers");
      return response.json() as Promise<{ writers: any[]; total: number }>;
    },
  });

  const stats = statsData?.stats || [];
  const writers = writersData?.writers || [];

  // Fetch recent assignments from API
  const { data: assignmentsData } = useQuery({
    queryKey: ["writer-assignments"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/writers/assignments?limit=20");
      return response.json() as Promise<{ assignments: Assignment[]; total: number }>;
    },
  });

  const recentAssignments = assignmentsData?.assignments || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "review":
        return "outline";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "default";
      case "normal":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const getWriterById = (id: string) => {
    return writers.find(w => w.id === id);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/writers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Virtual Newsroom</h1>
            <p className="text-muted-foreground">Real-time overview of your AI writing operation</p>
          </div>
        </div>
        <Button
          onClick={() => setAssignmentDialogOpen(true)}
          data-testid="button-create-assignment"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Assignment
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Active Writers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.filter(s => s.isActive).length}</div>
            <p className="text-xs text-muted-foreground">of {stats.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.reduce((sum, s) => sum + s.totalAssignments, 0)}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.reduce((sum, s) => sum + s.completed, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Articles published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.length > 0
                ? Math.round(
                    (stats.reduce((sum, s) => sum + s.completed, 0) /
                      stats.reduce((sum, s) => sum + s.totalAssignments, 0)) *
                      100
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Overall performance</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Writer Workload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Writer Workload
            </CardTitle>
            <CardDescription>Current assignments per writer</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {stats.map(stat => {
                  const writer = getWriterById(stat.writerId);
                  if (!writer) return null;

                  const pending = stat.totalAssignments - stat.completed;
                  const completionRate =
                    stat.totalAssignments > 0
                      ? Math.round((stat.completed / stat.totalAssignments) * 100)
                      : 0;

                  return (
                    <div
                      key={stat.writerId}
                      className="flex items-center gap-4 p-3 rounded-lg border"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={writer.avatar} alt={writer.name} />
                        <AvatarFallback>
                          {writer.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{writer.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{stat.completed} completed</span>
                          <span>•</span>
                          <span>{pending} pending</span>
                          <span>•</span>
                          <span>{completionRate}% rate</span>
                        </div>
                      </div>
                      {!stat.isActive && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Assignments
            </CardTitle>
            <CardDescription>Latest contents assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {recentAssignments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No assignments yet</p>
                  <p className="text-sm mt-2">Create your first assignment to get started</p>
                  <Button className="mt-4" onClick={() => setAssignmentDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Assignment
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentAssignments.map(assignment => {
                    const writer = getWriterById(assignment.writerId);
                    return (
                      <div key={assignment.id} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium line-clamp-1">{assignment.topic}</h4>
                            <p className="text-sm text-muted-foreground">
                              {writer?.name || "Unknown Writer"}
                            </p>
                          </div>
                          <Badge variant={getStatusColor(assignment.status)}>
                            {assignment.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant={getPriorityColor(assignment.priority)}>
                            {assignment.priority}
                          </Badge>
                          <Badge variant="outline">{assignment.contentType}</Badge>
                          {assignment.dueDate && (
                            <span className="text-muted-foreground">
                              Due: {new Date(assignment.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Assignment Dialog */}
      <AssignmentDialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen} />
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Workflow,
  Plus,
  CheckCircle2,
  Clock,
  Users,
  ArrowRight,
  Lightbulb,
  GitBranch,
} from "lucide-react";

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  steps: Array<{
    name: string;
    type: string;
    assignees: string[];
  }>;
  isActive: boolean;
  contentTypes: string[];
}

interface WorkflowInstance {
  id: string;
  templateId: string;
  contentId: string;
  contentTitle: string;
  currentStep: number;
  status: string;
  createdAt: string;
}

export default function WorkflowsPage() {
  const { data: templates, isLoading } = useQuery<WorkflowTemplate[]>({
    queryKey: ["/api/enterprise/workflows/templates"],
  });

  const { data: instances } = useQuery<WorkflowInstance[]>({
    queryKey: ["/api/enterprise/workflows/instances"],
  });

  const pendingCount = instances?.filter(i => i.status === "pending").length || 0;
  const completedCount = instances?.filter(i => i.status === "completed").length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold flex items-center gap-3"
            data-testid="heading-workflows"
          >
            <Workflow className="h-8 w-8 text-primary" />
            Workflows
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure approval workflows and contents review processes
          </p>
        </div>
        <Button data-testid="button-create-workflow">
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      <div className="p-4 bg-muted rounded-lg border">
        <h3 className="font-medium flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          How It Works
        </h3>
        <p className="text-sm text-muted-foreground">
          Workflows define the <strong>approval process</strong> for content. Set up multi-step
          reviews: Writer to Editor to SEO Review to Publish. Each step can require approval from
          specific users or team members.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Workflow Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-templates-count">
              {templates?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Configured workflows</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600" data-testid="text-pending-approvals">
              {pendingCount}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
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
            <div
              className="text-2xl font-bold text-green-600"
              data-testid="text-completed-workflows"
            >
              {completedCount}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Workflow Templates</CardTitle>
            <CardDescription>
              Reusable approval processes for different contents types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {templates?.length ? (
                <div className="space-y-4">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className="p-4 border rounded-lg space-y-3"
                      data-testid={`workflow-template-${template.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {template.description || "No description"}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {template.steps?.map((step, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {step.name}
                            </Badge>
                            {idx < (template.steps?.length || 0) - 1 && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {template.contentTypes?.map(type => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No workflows configured</p>
                  <p className="text-sm">Create a workflow template to get started</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Workflow Instances</CardTitle>
            <CardDescription>Content currently in approval process</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {instances?.filter(i => i.status !== "completed").length ? (
                <div className="space-y-3">
                  {instances
                    .filter(i => i.status !== "completed")
                    .map(instance => (
                      <div
                        key={instance.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                        data-testid={`workflow-instance-${instance.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{instance.contentTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            Step {instance.currentStep + 1} | Started{" "}
                            {new Date(instance.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={instance.status === "pending" ? "secondary" : "default"}>
                          {instance.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending approvals</p>
                  <p className="text-sm">All contents has been reviewed</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

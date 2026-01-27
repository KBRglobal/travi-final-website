import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Webhook,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Lightbulb,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggered?: string;
  successCount: number;
  failureCount: number;
}

interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  status: "success" | "failed";
  responseCode?: number;
  timestamp: string;
}

export default function WebhooksPage() {
  const { toast } = useToast();

  const { data: webhooks, isLoading } = useQuery<WebhookConfig[]>({
    queryKey: ["/api/enterprise/webhooks"],
  });

  const { data: logs } = useQuery<WebhookLog[]>({
    queryKey: ["/api/enterprise/webhooks/logs"],
  });

  const testWebhookMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/enterprise/webhooks/${id}/test`),
    onSuccess: () => {
      toast({ title: "Test webhook sent" });
      queryClient.invalidateQueries({ queryKey: ["/api/enterprise/webhooks"] });
    },
    onError: () => {
      toast({ title: "Webhook test failed", variant: "destructive" });
    },
  });

  const totalSuccess = webhooks?.reduce((sum, w) => sum + w.successCount, 0) || 0;
  const totalFailure = webhooks?.reduce((sum, w) => sum + w.failureCount, 0) || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="heading-webhooks">
            <Webhook className="h-8 w-8 text-primary" />
            Webhooks
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect your CMS to external services with webhooks
          </p>
        </div>
        <Button data-testid="button-add-webhook">
          <Plus className="h-4 w-4 mr-2" />
          Add Webhook
        </Button>
      </div>

      <div className="p-4 bg-muted rounded-lg border">
        <h3 className="font-medium flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          How It Works
        </h3>
        <p className="text-sm text-muted-foreground">
          Webhooks send <strong>real-time notifications</strong> to external services when events
          occur. For example: notify Slack when content is published, sync to a headless CMS, or
          trigger CI/CD pipelines.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Total Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-webhooks-count">
              {webhooks?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Configured endpoints</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Send className="h-4 w-4" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-active-webhooks">
              {webhooks?.filter(w => w.isActive).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently enabled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-success-count">
              {totalSuccess.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Deliveries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-failure-count">
              {totalFailure}
            </div>
            <p className="text-xs text-muted-foreground">Failed deliveries</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configured Webhooks</CardTitle>
            <CardDescription>Endpoints receiving event notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              {webhooks?.length ? (
                <div className="space-y-4">
                  {webhooks.map(webhook => (
                    <div
                      key={webhook.id}
                      className="p-4 border rounded-lg space-y-3"
                      data-testid={`webhook-${webhook.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{webhook.name}</h4>
                        <Switch
                          checked={webhook.isActive}
                          data-testid={`switch-webhook-${webhook.id}`}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        {webhook.url}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {webhook.events?.map(event => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {webhook.successCount} success / {webhook.failureCount} failed
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => testWebhookMutation.mutate(webhook.id)}
                          disabled={testWebhookMutation.isPending}
                          data-testid={`button-test-webhook-${webhook.id}`}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Test
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No webhooks configured</p>
                  <p className="text-sm">Add a webhook to connect external services</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Deliveries</CardTitle>
            <CardDescription>Latest webhook delivery attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              {logs?.length ? (
                <div className="space-y-2">
                  {logs.slice(0, 20).map(log => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {log.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{log.event}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {log.responseCode && (
                        <Badge variant={log.status === "success" ? "secondary" : "destructive"}>
                          {log.responseCode}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No delivery logs yet</p>
                  <p className="text-sm">Logs will appear when webhooks are triggered</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

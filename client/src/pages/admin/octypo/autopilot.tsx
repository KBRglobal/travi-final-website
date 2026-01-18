import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Play,
  Square,
  Zap,
  FileText,
  Languages,
  CheckCircle2,
  ListTodo,
  Upload,
  Globe,
  Clock,
  Loader2,
  TrendingUp,
  Rss,
  Database,
} from "lucide-react";

interface AutopilotStatus {
  running: boolean;
  mode: string;
  startedAt: string | null;
  lastCompleted: string | null;
  stats: {
    contentGeneratedToday: number;
    translationsToday: number;
    publishedToday: number;
    tasksCompletedToday: number;
    imagesProcessedToday: number;
    errorsToday: number;
    failedQueueSize: number;
    successRate: number;
    concurrency: number;
  };
  uptime: number;
}

interface AutopilotConfig {
  autoExplodeContent: boolean;
  autoTranslate: boolean;
  autoFetchImages: boolean;
  autoPublish: boolean;
  rssIngestion: boolean;
  googleDriveSync: boolean;
}

interface PipelineStage {
  id: string;
  name: string;
  status: string;
  itemsProcessed: number;
  itemsPending: number;
  lastRun: string | null;
  avgProcessingTime: number;
  errorRate: number;
}

interface PipelineData {
  pipeline: PipelineStage[];
}

const configMetadata: Record<string, { name: string; description: string }> = {
  autoExplodeContent: { name: "Auto Explode Content", description: "Automatically extract entities and generate new pages" },
  autoTranslate: { name: "Auto Translate", description: "Translate content to target languages automatically" },
  autoFetchImages: { name: "Auto Fetch Images", description: "Find and attach relevant images to content" },
  autoPublish: { name: "Auto Publish", description: "Publish approved content without manual intervention" },
  rssIngestion: { name: "RSS Ingestion", description: "Monitor RSS feeds for new content" },
  googleDriveSync: { name: "Google Drive Sync", description: "Sync documents from Google Drive" },
};

function getPipelineIcon(id: string) {
  switch (id) {
    case "content-generation":
      return Database;
    case "failed-retry":
      return Rss;
    default:
      return Database;
  }
}

export default function OctypoAutopilotPage() {
  const [explodeUrl, setExplodeUrl] = useState("");
  const [isExploding, setIsExploding] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: autopilotStatus, isLoading: isLoadingStatus } = useQuery<AutopilotStatus>({
    queryKey: ['/api/octypo/autopilot/status'],
  });

  const { data: autopilotConfig, isLoading: isLoadingConfig } = useQuery<AutopilotConfig>({
    queryKey: ['/api/octypo/autopilot/config'],
  });

  const { data: pipelineData, isLoading: isLoadingPipeline } = useQuery<PipelineData>({
    queryKey: ['/api/octypo/autopilot/pipeline'],
  });

  const startMutation = useMutation({
    mutationFn: (mode: string) => apiRequest('/api/octypo/autopilot/start', { 
      method: 'POST',
      body: JSON.stringify({ mode })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/octypo/autopilot/status'] });
      toast({ title: "Autopilot started" });
    },
    onError: () => {
      toast({ title: "Failed to start autopilot", variant: "destructive" });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => apiRequest('/api/octypo/autopilot/stop', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/octypo/autopilot/status'] });
      toast({ title: "Autopilot stopped" });
    },
    onError: () => {
      toast({ title: "Failed to stop autopilot", variant: "destructive" });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: (updates: Record<string, boolean>) => apiRequest('/api/octypo/autopilot/config', { 
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/octypo/autopilot/config'] });
      toast({ title: "Config updated" });
    },
    onError: () => {
      toast({ title: "Failed to update config", variant: "destructive" });
    },
  });

  const autopilotActive = autopilotStatus?.running ?? false;
  const stats = autopilotStatus?.stats ?? {
    contentGeneratedToday: 0,
    translationsToday: 0,
    publishedToday: 0,
    tasksCompletedToday: 0,
  };

  const handleToggleAutopilot = () => {
    if (autopilotActive) {
      stopMutation.mutate();
    } else {
      startMutation.mutate('full');
    }
  };

  const handleToggleConfig = (key: string, currentValue: boolean) => {
    updateConfigMutation.mutate({ [key]: !currentValue });
  };

  const handleExplode = () => {
    if (!explodeUrl) return;
    setIsExploding(true);
    setTimeout(() => setIsExploding(false), 2000);
  };

  const pipeline = pipelineData?.pipeline ?? [];
  const pendingTasks = pipeline.reduce((acc, p) => acc + p.itemsPending, 0);
  const runningTasks = pipeline.filter(p => p.status === 'running').length;

  const isToggling = startMutation.isPending || stopMutation.isPending;

  return (
    <div className="space-y-6" data-testid="octypo-autopilot-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Autopilot Control</h1>
          <p className="text-muted-foreground">Autonomous content generation and management</p>
        </div>
        <Button 
          size="lg"
          className={autopilotActive ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
          onClick={handleToggleAutopilot}
          disabled={isToggling || isLoadingStatus}
          data-testid="button-toggle-autopilot"
        >
          {isToggling ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : autopilotActive ? (
            <>
              <Square className="h-4 w-4 mr-2" />
              Stop Autopilot
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Start Autopilot
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {isLoadingStatus ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <>
            <div className={`h-2 w-2 rounded-full ${autopilotActive ? "bg-green-500" : "bg-gray-400"}`} />
            <span className="text-muted-foreground">
              Autopilot {autopilotActive ? "Running" : "Stopped"}
            </span>
            <span className="text-muted-foreground">Mode: {autopilotStatus?.mode ?? 'full'}</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Content Generated</CardTitle>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4 text-blue-500" />
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingStatus ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold" data-testid="text-content-generated">{stats.contentGeneratedToday}</div>
            )}
            <p className="text-xs text-muted-foreground">today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Translations</CardTitle>
            <div className="flex items-center gap-1">
              <Languages className="h-4 w-4 text-purple-500" />
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingStatus ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold" data-testid="text-translations">{stats.translationsToday}</div>
            )}
            <p className="text-xs text-muted-foreground">today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingStatus ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold" data-testid="text-published">{stats.publishedToday}</div>
            )}
            <p className="text-xs text-muted-foreground">today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasks Completed</CardTitle>
            <div className="flex items-center gap-1">
              <ListTodo className="h-4 w-4 text-orange-500" />
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingStatus ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold" data-testid="text-tasks-completed">{stats.tasksCompletedToday}</div>
            )}
            <p className="text-xs text-muted-foreground">today</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <CardTitle>Explode Content from URL</CardTitle>
            </div>
            <CardDescription>Enter a URL to extract entities and generate content automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/article"
                value={explodeUrl}
                onChange={(e) => setExplodeUrl(e.target.value)}
                className="flex-1"
                data-testid="input-explode-url"
              />
              <Button 
                onClick={handleExplode}
                disabled={!explodeUrl || isExploding}
                data-testid="button-explode"
              >
                {isExploding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Explode
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-500" />
              <CardTitle>Upload Document</CardTitle>
            </div>
            <CardDescription>Upload a document to extract entities and generate content.</CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              data-testid="dropzone-upload"
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drop files here or <span className="text-primary">browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports PDF, DOCX, TXT, MD
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>Automation Pipeline Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingPipeline ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : pipeline.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No pipeline stages available</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {pipeline.map((stage) => {
                const Icon = getPipelineIcon(stage.id);
                return (
                  <div 
                    key={stage.id}
                    className="border rounded-lg p-4 flex items-start justify-between"
                    data-testid={`pipeline-${stage.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{stage.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {stage.itemsProcessed} processed, {stage.itemsPending} pending
                        </p>
                      </div>
                    </div>
                    <div className={`h-2 w-2 rounded-full mt-1 ${
                      stage.status === "running" ? "bg-green-500" : 
                      stage.status === "error" ? "bg-red-500" : "bg-gray-400"
                    }`} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-purple-500" />
              <CardTitle>Task Queue</CardTitle>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {pendingTasks} pending
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-4 w-4" />
                {runningTasks} running
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingPipeline ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : pipeline.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No active tasks</p>
          ) : (
            <div className="space-y-4">
              {pipeline.map((stage) => (
                <div 
                  key={stage.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                  data-testid={`task-${stage.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      stage.status === "running" ? "text-blue-500 bg-blue-500" :
                      stage.status === "pending" ? "text-yellow-500 bg-yellow-500" :
                      "text-green-500 bg-green-500"
                    }`} />
                    <div>
                      <p className="font-medium">{stage.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {stage.itemsPending > 0 ? `${stage.itemsPending} items pending` : 'Idle'}
                      </p>
                    </div>
                  </div>
                  {stage.itemsProcessed > 0 && stage.itemsPending > 0 && (
                    <div className="flex items-center gap-2 w-32">
                      <span className="text-sm text-muted-foreground">
                        {Math.round((stage.itemsProcessed / (stage.itemsProcessed + stage.itemsPending)) * 100)}%
                      </span>
                      <Progress 
                        value={(stage.itemsProcessed / (stage.itemsProcessed + stage.itemsPending)) * 100} 
                        className="h-2 flex-1" 
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>Autopilot Configuration</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingConfig ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : autopilotConfig ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(autopilotConfig).map(([key, enabled]) => {
                const meta = configMetadata[key];
                if (!meta) return null;
                return (
                  <div 
                    key={key}
                    className="flex items-start gap-4"
                    data-testid={`config-${key}`}
                  >
                    <Switch
                      id={key}
                      checked={enabled}
                      onCheckedChange={() => handleToggleConfig(key, enabled)}
                      disabled={updateConfigMutation.isPending}
                      data-testid={`switch-${key}`}
                    />
                    <div className="flex-1">
                      <Label htmlFor={key} className="font-medium cursor-pointer">
                        {meta.name}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Failed to load configuration</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

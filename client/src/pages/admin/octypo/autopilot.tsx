import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Image,
  Clock,
  Loader2,
  TrendingUp,
  Rss,
  Database,
} from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  type: string;
  progress: number;
  status: "running" | "pending" | "completed";
}

interface PipelineItem {
  id: string;
  name: string;
  icon: typeof Rss;
  status: "active" | "idle" | "error";
  count?: number;
}

interface ConfigOption {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const mockTasks: TaskItem[] = [
  { id: "1", title: "Barcelona Travel Guide", type: "Entity Extraction", progress: 65, status: "running" },
  { id: "2", title: "Tokyo Hotels Article", type: "Translation - Japanese, Korean", progress: 30, status: "running" },
  { id: "3", title: "Paris Restaurants", type: "Image Fetching", progress: 0, status: "pending" },
  { id: "4", title: "Santorini Attractions", type: "Content Generation", progress: 0, status: "pending" },
];

const mockPipelines: PipelineItem[] = [
  { id: "1", name: "RSS Ingestion", icon: Rss, status: "active" },
  { id: "2", name: "Entity Extraction", icon: Database, status: "active" },
  { id: "3", name: "Translation", icon: Languages, status: "idle", count: 0 },
  { id: "4", name: "Image Fetching", icon: Image, status: "idle" },
];

const mockConfig: ConfigOption[] = [
  { id: "auto-explode", name: "Auto Explode Content", description: "Automatically extract entities and generate new pages", enabled: false },
  { id: "auto-translate", name: "Auto Translate", description: "Translate content to target languages automatically", enabled: false },
  { id: "auto-fetch-images", name: "Auto Fetch Images", description: "Find and attach relevant images to content", enabled: false },
  { id: "auto-publish", name: "Auto Publish", description: "Publish approved content without manual intervention", enabled: false },
  { id: "rss-ingestion", name: "RSS Ingestion", description: "Monitor RSS feeds for new content", enabled: false },
  { id: "google-drive-sync", name: "Google Drive Sync", description: "Sync documents from Google Drive", enabled: false },
];

function getTaskStatusColor(status: string) {
  switch (status) {
    case "running":
      return "text-blue-500";
    case "pending":
      return "text-yellow-500";
    case "completed":
      return "text-green-500";
    default:
      return "text-muted-foreground";
  }
}

export default function OctypoAutopilotPage() {
  const [autopilotActive, setAutopilotActive] = useState(false);
  const [explodeUrl, setExplodeUrl] = useState("");
  const [isExploding, setIsExploding] = useState(false);
  const [config, setConfig] = useState(mockConfig);

  const stats = {
    contentGenerated: 0,
    translations: 0,
    published: 0,
    tasksCompleted: 0,
  };

  const pendingTasks = mockTasks.filter(t => t.status === "pending").length;
  const runningTasks = mockTasks.filter(t => t.status === "running").length;

  const toggleConfig = (id: string) => {
    setConfig(prev => prev.map(c => 
      c.id === id ? { ...c, enabled: !c.enabled } : c
    ));
  };

  const handleExplode = () => {
    if (!explodeUrl) return;
    setIsExploding(true);
    setTimeout(() => setIsExploding(false), 2000);
  };

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
          onClick={() => setAutopilotActive(!autopilotActive)}
          data-testid="button-toggle-autopilot"
        >
          {autopilotActive ? (
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
        <div className={`h-2 w-2 rounded-full ${autopilotActive ? "bg-green-500" : "bg-gray-400"}`} />
        <span className="text-muted-foreground">
          Autopilot {autopilotActive ? "Running" : "Stopped"}
        </span>
        <span className="text-muted-foreground">Mode:</span>
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
            <div className="text-3xl font-bold" data-testid="text-content-generated">{stats.contentGenerated}</div>
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
            <div className="text-3xl font-bold" data-testid="text-translations">{stats.translations}</div>
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
            <div className="text-3xl font-bold" data-testid="text-published">{stats.published}</div>
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
            <div className="text-3xl font-bold" data-testid="text-tasks-completed">{stats.tasksCompleted}</div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockPipelines.map((pipeline) => (
              <div 
                key={pipeline.id}
                className="border rounded-lg p-4 flex items-start justify-between"
                data-testid={`pipeline-${pipeline.id}`}
              >
                <div className="flex items-start gap-3">
                  <pipeline.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{pipeline.name}</p>
                    {pipeline.count !== undefined && (
                      <p className="text-xs text-muted-foreground">{pipeline.count} languages</p>
                    )}
                  </div>
                </div>
                <div className={`h-2 w-2 rounded-full mt-1 ${
                  pipeline.status === "active" ? "bg-green-500" : 
                  pipeline.status === "error" ? "bg-red-500" : "bg-gray-400"
                }`} />
              </div>
            ))}
          </div>
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
          <div className="space-y-4">
            {mockTasks.map((task) => (
              <div 
                key={task.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
                data-testid={`task-${task.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${getTaskStatusColor(task.status)}`} />
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.type}</p>
                  </div>
                </div>
                {task.progress > 0 && (
                  <div className="flex items-center gap-2 w-32">
                    <span className="text-sm text-muted-foreground">{task.progress}%</span>
                    <Progress value={task.progress} className="h-2 flex-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {config.map((option) => (
              <div 
                key={option.id}
                className="flex items-start gap-4"
                data-testid={`config-${option.id}`}
              >
                <Switch
                  id={option.id}
                  checked={option.enabled}
                  onCheckedChange={() => toggleConfig(option.id)}
                  data-testid={`switch-${option.id}`}
                />
                <div className="flex-1">
                  <Label htmlFor={option.id} className="font-medium cursor-pointer">
                    {option.name}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

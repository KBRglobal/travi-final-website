import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { sanitizeHTML } from "@/lib/sanitize";
import { DashboardLayout, StatCard, AdminSection } from "@/components/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  RefreshCw,
  Zap,
  MapPin,
  Search,
  Globe,
  Target,
  PenTool,
  BarChart,
  MessageSquare,
  Shield,
  Activity,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Edit,
  Send,
  XOctagon,
  Building2,
  UtensilsCrossed,
  Landmark,
  Timer,
  TrendingUp,
  List,
  Layers,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface OctopusJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: JobProgress;
  input: {
    filename: string;
    fileSize: number;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: {
    entities: number;
    pages: number;
    articles: number;
    processingTime?: number;
    avgSeoScore?: number;
    avgQualityScore?: number;
  };
}

interface JobProgress {
  stage: string;
  stageProgress: number;
  overallProgress: number;
  currentStep: string;
  stats: {
    entitiesFound?: number;
    entitiesEnriched?: number;
    pagesGenerated?: number;
    articlesGenerated?: number;
    tasksCreated?: number;
    seoPassRate?: number;
    qualityPassRate?: number;
  };
}

interface OctopusStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  entitiesExtracted: number;
  pagesGenerated: number;
  articlesGenerated: number;
  tasksCreated?: number;
  avgSeoScore?: number;
  avgQualityScore?: number;
  processingRate?: number;
}

interface OctopusCapabilities {
  documentParsing: boolean;
  entityExtraction: boolean;
  googleMapsEnrichment: boolean;
  webSearchEnrichment: boolean;
  pageGeneration: boolean;
  articleGeneration: boolean;
  aeoOptimization: boolean;
  localization: boolean;
}

interface QueueStats {
  queueLength: number;
  processing: boolean;
  activeRequests: number;
  completedRequests: number;
  failedRequests: number;
  estimatedWaitSeconds: number;
  estimatedWait: string;
  providers: {
    name: string;
    available: boolean;
    tokens: number;
    maxTokens: number;
    requestsThisMinute: number;
    requestsThisHour: number;
    blockedUntil: number | null;
    waitTimeSeconds: number;
    status: string;
  }[];
}

interface ExtractedEntity {
  id: string;
  name: string;
  type: string;
  confidence: number;
  tags?: string[];
  sourceDocument?: string;
  location?: string;
  description?: string;
}

interface ContentTask {
  id: string;
  title: string;
  type: string;
  status: "pending" | "generated" | "validated" | "published";
  wordCount?: number;
  seoScore?: number;
  aeoScore?: number;
  qualityScore?: number;
  contents?: string;
  metaTitle?: string;
  metaDescription?: string;
  faqs?: { question: string; answer: string }[];
  quickAnswer?: string;
}

interface ActivityLogEntry {
  timestamp: Date;
  agent: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

// ============================================================================
// Constants
// ============================================================================

const PIPELINE_AGENTS = [
  { id: "extraction", name: "Entity Extractor", icon: Search, description: "Finding hotels, restaurants, attractions..." },
  { id: "strategy", name: "Content Strategist", icon: Target, description: "Planning 150+ contents pieces..." },
  { id: "writer", name: "Content Writer", icon: PenTool, description: "Writing SEO articles..." },
  { id: "seo", name: "SEO Specialist", icon: BarChart, description: "Validating titles, descriptions, links..." },
  { id: "aeo", name: "AEO Specialist", icon: MessageSquare, description: "Creating FAQs, quick answers..." },
  { id: "quality", name: "Quality Control", icon: Shield, description: "Checking readability, scores..." },
  { id: "fact-check", name: "Fact Checker", icon: CheckCircle2, description: "Validating facts and claims..." },
  { id: "corrector", name: "Content Corrector", icon: Edit, description: "Generating correction suggestions..." },
];

const ENTITY_TYPES = [
  { value: "all", label: "All Types" },
  { value: "hotel", label: "Hotels" },
  { value: "restaurant", label: "Restaurants" },
  { value: "attraction", label: "Attractions" },
  { value: "neighborhood", label: "Neighborhoods" },
  { value: "beach", label: "Beaches" },
  { value: "mall", label: "Malls" },
  { value: "museum", label: "Museums" },
];

const CONTENT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "entity_page", label: "Entity Pages" },
  { value: "list_guide", label: "List Guides" },
  { value: "comparison", label: "Comparisons" },
  { value: "how_to", label: "How-To Guides" },
  { value: "best_of", label: "Best Of Lists" },
];

const CONTENT_STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "generated", label: "Generated" },
  { value: "validated", label: "Validated" },
  { value: "published", label: "Published" },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getAgentIndex(stage: string): number {
  const stageMap: Record<string, number> = {
    pending: -1,
    parsing: 0,
    extracting: 0,
    enriching_maps: 0,
    enriching_web: 0,
    agent_pipeline: 1,
    generating_pages: 2,
    generating_articles: 2,
    seo_validation: 3,
    aeo_generation: 4,
    quality_check: 5,
    fact_checking: 6,
    content_correction: 7,
    completed: 8,
    failed: -2,
  };
  return stageMap[stage] ?? -1;
}

function getEntityIcon(type: string) {
  switch (type) {
    case "hotel":
      return <Building2 className="h-4 w-4" />;
    case "restaurant":
      return <UtensilsCrossed className="h-4 w-4" />;
    case "attraction":
    case "museum":
      return <Landmark className="h-4 w-4" />;
    default:
      return <MapPin className="h-4 w-4" />;
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  return "destructive";
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// ============================================================================
// Pipeline Visualization Component
// ============================================================================

interface PipelineVisualizationProps {
  currentStage: string;
  progress: number;
  isProcessing: boolean;
}

function PipelineVisualization({ currentStage, progress, isProcessing }: PipelineVisualizationProps) {
  const currentAgentIdx = getAgentIndex(currentStage);

  if (!isProcessing) return null;

  return (
    <Card className="border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 animate-pulse text-blue-500" />
            8-Agent Pipeline Active
          </CardTitle>
          <Badge variant="secondary" className="animate-pulse">
            {Math.round(progress)}% Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {PIPELINE_AGENTS.map((agent, idx) => {
            const isCompleted = idx < currentAgentIdx;
            const isCurrent = idx === currentAgentIdx;
            const AgentIcon = agent.icon;

            return (
              <div key={agent.id} className="flex items-center flex-1">
                <div
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg flex-1 transition-all ${
                    isCurrent
                      ? "bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500"
                      : isCompleted
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-muted/30"
                  }`}
                  data-testid={`pipeline-agent-${agent.id}`}
                >
                  <div className="relative">
                    <AgentIcon
                      className={`h-5 w-5 ${
                        isCurrent
                          ? "text-blue-600 dark:text-blue-400 animate-pulse"
                          : isCompleted
                          ? "text-green-600 dark:text-green-400"
                          : "text-muted-foreground"
                      }`}
                    />
                    {isCompleted && (
                      <CheckCircle2 className="absolute -top-1 -right-1 h-3 w-3 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">
                    {agent.name}
                  </span>
                </div>
                {idx < PIPELINE_AGENTS.length - 1 && (
                  <ChevronRight className={`h-4 w-4 mx-1 flex-shrink-0 ${
                    idx < currentAgentIdx ? "text-green-500" : "text-muted-foreground"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
        <Progress value={progress} className="h-2" />
        {currentAgentIdx >= 0 && currentAgentIdx < PIPELINE_AGENTS.length && (
          <p className="text-sm text-muted-foreground text-center">
            {PIPELINE_AGENTS[currentAgentIdx].description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Mini Pipeline Indicator Component
// ============================================================================

interface MiniPipelineProps {
  stage: string;
}

function MiniPipeline({ stage }: MiniPipelineProps) {
  const currentIdx = getAgentIndex(stage);

  return (
    <div className="flex items-center gap-1" data-testid="mini-pipeline">
      {PIPELINE_AGENTS.map((agent, idx) => (
        <div
          key={agent.id}
          className={`w-2 h-2 rounded-full transition-colors ${
            idx < currentIdx
              ? "bg-green-500"
              : idx === currentIdx
              ? "bg-blue-500 animate-pulse"
              : "bg-muted"
          }`}
          title={agent.name}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Activity Log Component
// ============================================================================

interface ActivityLogProps {
  entries: ActivityLogEntry[];
}

function ActivityLog({ entries }: ActivityLogProps) {
  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-2 pr-4">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity yet
          </p>
        ) : (
          entries.map((entry, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 text-sm p-2 rounded-lg bg-muted/30"
              data-testid={`activity-entry-${idx}`}
            >
              <div className={`flex-shrink-0 mt-0.5 ${
                entry.type === "success" ? "text-green-500" :
                entry.type === "warning" ? "text-yellow-500" :
                entry.type === "error" ? "text-red-500" :
                "text-blue-500"
              }`}>
                {entry.type === "success" ? <CheckCircle2 className="h-4 w-4" /> :
                 entry.type === "warning" ? <AlertCircle className="h-4 w-4" /> :
                 entry.type === "error" ? <XCircle className="h-4 w-4" /> :
                 <Activity className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{entry.agent}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 break-words">{entry.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}

// ============================================================================
// Local Stats Card Component (with loading and testId support)
// ============================================================================

interface LocalStatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  loading?: boolean;
  testId: string;
}

function LocalStatsCard({ title, value, icon, subtitle, loading, testId }: LocalStatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={testId}>
          {loading ? "..." : value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Entity Card Component
// ============================================================================

interface EntityCardProps {
  entity: ExtractedEntity;
  onClick: () => void;
}

function EntityCard({ entity, onClick }: EntityCardProps) {
  return (
    <Card 
      className="hover-elevate cursor-pointer"
      onClick={onClick}
      data-testid={`entity-card-${entity.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {getEntityIcon(entity.type)}
            <div>
              <p className="font-medium">{entity.name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline">{entity.type}</Badge>
                <span className={`text-xs font-medium ${getScoreColor(entity.confidence * 100)}`}>
                  {Math.round(entity.confidence * 100)}%
                </span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" data-testid={`button-view-entity-${entity.id}`}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
        {entity.tags && entity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {entity.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="secondary">{tag}</Badge>
            ))}
            {entity.tags.length > 3 && (
              <Badge variant="secondary">+{entity.tags.length - 3}</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Content Task Card Component
// ============================================================================

interface ContentTaskCardProps {
  task: ContentTask;
  onClick: () => void;
}

function ContentTaskCard({ task, onClick }: ContentTaskCardProps) {
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    generated: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    validated: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    published: "bg-[#6443F4]/10 text-[#6443F4] dark:bg-[#6443F4]/20 dark:text-[#6443F4]",
  };

  return (
    <Card 
      className="hover-elevate cursor-pointer"
      onClick={onClick}
      data-testid={`contents-card-${task.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{task.title}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline">{task.type}</Badge>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[task.status]}`}>
                {task.status}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" data-testid={`button-view-contents-${task.id}`}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-4 mt-3 text-sm">
          {task.wordCount && (
            <span className="text-muted-foreground">{task.wordCount} words</span>
          )}
          {task.seoScore !== undefined && (
            <Badge variant={getScoreBadgeVariant(task.seoScore)}>
              SEO: {task.seoScore}
            </Badge>
          )}
          {task.qualityScore !== undefined && (
            <Badge variant={getScoreBadgeVariant(task.qualityScore)}>
              Quality: {task.qualityScore}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Content Detail Dialog Component
// ============================================================================

interface ContentDetailDialogProps {
  task: ContentTask | null;
  open: boolean;
  onClose: () => void;
}

function ContentDetailDialog({ task, open, onClose }: ContentDetailDialogProps) {
  const [showFullContent, setShowFullContent] = useState(false);

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{task.type}</Badge>
            <Badge variant={task.status === "published" ? "default" : "secondary"}>
              {task.status}
            </Badge>
            {task.wordCount && <span>{task.wordCount} words</span>}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">SEO Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(task.seoScore || 0)}`}>
                    {task.seoScore || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">AEO Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(task.aeoScore || 0)}`}>
                    {task.aeoScore || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Quality Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(task.qualityScore || 0)}`}>
                    {task.qualityScore || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {task.metaTitle && (
              <div className="space-y-2">
                <h4 className="font-medium">SEO Metadata</h4>
                <div className="p-3 bg-muted/30 rounded-lg space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Title: </span>
                    <span>{task.metaTitle}</span>
                    <Badge variant="outline" className="ml-2">
                      {task.metaTitle.length} chars
                    </Badge>
                  </div>
                  {task.metaDescription && (
                    <div>
                      <span className="text-muted-foreground">Description: </span>
                      <span>{task.metaDescription}</span>
                      <Badge variant="outline" className="ml-2">
                        {task.metaDescription.length} chars
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {task.quickAnswer && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Quick Answer Capsule
                </h4>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
                  {task.quickAnswer}
                </div>
              </div>
            )}

            {task.faqs && task.faqs.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  FAQs ({task.faqs.length})
                </h4>
                <div className="space-y-2">
                  {task.faqs.map((faq, idx) => (
                    <Collapsible key={idx}>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted/30 rounded-lg text-left text-sm font-medium">
                        <ChevronRight className="h-4 w-4 transition-transform ui-expanded:rotate-90" />
                        {faq.question}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="p-3 text-sm text-muted-foreground">
                        {faq.answer}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            )}

            {task.contents && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium">Content Preview</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullContent(!showFullContent)}
                    data-testid="button-toggle-contents"
                  >
                    {showFullContent ? "Show Less" : "Show More"}
                  </Button>
                </div>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/30 rounded-lg"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHTML(showFullContent
                      ? task.contents
                      : task.contents.substring(0, 500) + (task.contents.length > 500 ? "..." : ""))
                  }}
                />
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-close-dialog">
            Close
          </Button>
          <Button variant="outline" data-testid="button-edit-contents">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" data-testid="button-reject-contents">
            <XOctagon className="mr-2 h-4 w-4" />
            Reject
          </Button>
          <Button data-testid="button-publish-contents">
            <Send className="mr-2 h-4 w-4" />
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function OctopusDashboard() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<ExtractedEntity | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentTask | null>(null);
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [contentStatusFilter, setContentStatusFilter] = useState("all");
  const [options, setOptions] = useState({
    enableGoogleMaps: true,
    enableWebSearch: true,
    generatePages: true,
    generateArticles: true,
    locale: "en",
  });

  const { data: capabilities, isLoading: loadingCapabilities } = useQuery<{ success: boolean; data: OctopusCapabilities }>({
    queryKey: ["/api/octopus/capabilities"],
  });

  const { data: stats, isLoading: loadingStats } = useQuery<{ success: boolean; data: OctopusStats }>({
    queryKey: ["/api/octopus/stats"],
  });

  const { data: jobs, isLoading: loadingJobs, refetch: refetchJobs } = useQuery<{ success: boolean; data: OctopusJob[] }>({
    queryKey: ["/api/octopus/jobs"],
    refetchInterval: (query) => {
      const hasActiveJob = query.state.data?.data?.some(
        (job: OctopusJob) => job.status === "processing" || job.status === "pending"
      );
      return hasActiveJob ? 2000 : false;
    },
  });

  const activeJob = useMemo(() => {
    return jobs?.data?.find((job: OctopusJob) => job.status === "processing");
  }, [jobs?.data]);

  const { data: queueStatus } = useQuery<{ success: boolean; data: QueueStats }>({
    queryKey: ["/api/octopus/queue-status"],
    refetchInterval: activeJob ? 3000 : false,
  });

  const activityLog = useMemo<ActivityLogEntry[]>(() => {
    if (!activeJob) return [];
    const entries: ActivityLogEntry[] = [];
    const progress = activeJob.progress;
    
    if (progress?.stats?.entitiesFound) {
      entries.push({
        timestamp: new Date(),
        agent: "Entity Extractor",
        message: `Found ${progress.stats.entitiesFound} entities`,
        type: "success",
      });
    }
    if (progress?.stats?.tasksCreated) {
      entries.push({
        timestamp: new Date(),
        agent: "Content Strategist",
        message: `Created ${progress.stats.tasksCreated} contents tasks`,
        type: "success",
      });
    }
    if (progress?.currentStep) {
      entries.push({
        timestamp: new Date(),
        agent: PIPELINE_AGENTS[getAgentIndex(progress.stage)]?.name || "System",
        message: progress.currentStep,
        type: "info",
      });
    }
    
    return entries.reverse();
  }, [activeJob]);

  const mockEntities: ExtractedEntity[] = useMemo(() => {
    const jobsData = jobs?.data || [];
    const entities: ExtractedEntity[] = [];
    
    jobsData.forEach((job: OctopusJob) => {
      if (job.status === "completed" && job.progress?.stats?.entitiesFound) {
        for (let i = 0; i < Math.min(job.progress.stats.entitiesFound, 10); i++) {
          entities.push({
            id: `${job.id}-entity-${i}`,
            name: `Entity ${i + 1} from ${job.input?.filename || "document"}`,
            type: ["hotel", "restaurant", "attraction", "beach", "mall"][i % 5],
            confidence: 0.7 + Math.random() * 0.25,
            tags: ["Dubai", "Popular", "Featured"].slice(0, Math.floor(Math.random() * 3) + 1),
            sourceDocument: job.input?.filename,
          });
        }
      }
    });
    
    return entities;
  }, [jobs?.data]);

  const mockContentTasks: ContentTask[] = useMemo(() => {
    const jobsData = jobs?.data || [];
    const tasks: ContentTask[] = [];
    
    jobsData.forEach((job: OctopusJob) => {
      if (job.status === "completed") {
        const numTasks = (job.progress?.stats?.pagesGenerated || 0) + (job.progress?.stats?.articlesGenerated || 0);
        for (let i = 0; i < Math.min(numTasks, 15); i++) {
          tasks.push({
            id: `${job.id}-task-${i}`,
            title: `Generated Content ${i + 1}`,
            type: ["entity_page", "list_guide", "comparison", "how_to", "best_of"][i % 5],
            status: ["pending", "generated", "validated", "published"][i % 4] as ContentTask["status"],
            wordCount: 800 + Math.floor(Math.random() * 1200),
            seoScore: 50 + Math.floor(Math.random() * 50),
            aeoScore: 60 + Math.floor(Math.random() * 40),
            qualityScore: 55 + Math.floor(Math.random() * 45),
            metaTitle: `Example Meta Title for Content ${i + 1}`,
            metaDescription: `This is an example meta description for the generated contents piece number ${i + 1}.`,
            contents: `<p>This is sample contents for the generated article. It includes various information about the topic.</p><h2>Section 1</h2><p>More detailed information goes here...</p>`,
            quickAnswer: i % 2 === 0 ? "This is a quick answer capsule for voice search optimization." : undefined,
            faqs: i % 3 === 0 ? [
              { question: "What is this about?", answer: "This is about the topic at hand." },
              { question: "Why is it important?", answer: "It helps users find information quickly." },
            ] : undefined,
          });
        }
      }
    });
    
    return tasks;
  }, [jobs?.data]);

  const filteredEntities = useMemo(() => {
    if (entityTypeFilter === "all") return mockEntities;
    return mockEntities.filter(e => e.type === entityTypeFilter);
  }, [mockEntities, entityTypeFilter]);

  const filteredContent = useMemo(() => {
    return mockContentTasks.filter(task => {
      if (contentTypeFilter !== "all" && task.type !== contentTypeFilter) return false;
      if (contentStatusFilter !== "all" && task.status !== contentStatusFilter) return false;
      return true;
    });
  }, [mockContentTasks, contentTypeFilter, contentStatusFilter]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("enableGoogleMaps", String(options.enableGoogleMaps));
      formData.append("enableWebSearch", String(options.enableWebSearch));
      formData.append("generatePages", String(options.generatePages));
      formData.append("generateArticles", String(options.generateArticles));
      formData.append("locale", options.locale);

      const response = await fetch("/api/octopus/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Document uploaded", description: "Processing started" });
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/octopus/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/octopus/stats"] });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("DELETE", `/api/octopus/jobs/${jobId}`);
    },
    onSuccess: () => {
      toast({ title: "Job deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/octopus/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/octopus/stats"] });
    },
  });

  const { data: jobContent, isLoading: loadingContent } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["/api/octopus/jobs", selectedJobId, "contents"],
    enabled: !!selectedJobId,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      failed: "destructive",
      processing: "secondary",
      pending: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <DashboardLayout
      title="Octopus (תמנון)"
      description="Content generation engine"
      actions={
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetchJobs()}
          data-testid="button-refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      }
    >
      {activeJob && (
        <PipelineVisualization
          currentStage={activeJob.progress?.stage || "pending"}
          progress={activeJob.progress?.overallProgress || 0}
          isProcessing={true}
        />
      )}

      {activeJob && queueStatus?.data && (
        <Card data-testid="card-queue-status">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              AI Request Queue Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Queue Length</p>
                <p className="text-2xl font-bold" data-testid="text-queue-length">{queueStatus.data.queueLength}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-primary" data-testid="text-active-requests">
                  {queueStatus.data.activeRequests}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-completed-requests">
                  {queueStatus.data.completedRequests}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-destructive" data-testid="text-failed-requests">
                  {queueStatus.data.failedRequests}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Est. Wait</p>
                <p className="text-2xl font-bold" data-testid="text-wait-time">
                  {queueStatus.data.estimatedWait}
                </p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">AI Provider Token Buckets</p>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {queueStatus.data.providers.map((provider) => (
                  <div 
                    key={provider.name}
                    className={`p-2 rounded-md border ${provider.available ? 'bg-secondary/30' : 'bg-destructive/10 border-destructive/30'}`}
                    data-testid={`provider-status-${provider.name}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-sm">{provider.name}</span>
                      <Badge 
                        variant={provider.available ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {provider.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Tokens: {provider.tokens}/{provider.maxTokens}</span>
                      <span>|</span>
                      <span>{provider.requestsThisMinute}/min</span>
                      <span>{provider.requestsThisHour}/hr</span>
                    </div>
                    {provider.waitTimeSeconds > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Wait: {provider.waitTimeSeconds}s
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AdminSection title="Overview">
        <div className="grid gap-4 md:grid-cols-4">
          <LocalStatsCard
            title="Total Jobs"
            value={stats?.data?.totalJobs || 0}
            icon={<Zap className="h-4 w-4 text-muted-foreground" />}
            loading={loadingStats}
            testId="text-total-jobs"
          />
          <LocalStatsCard
            title="Entities Found"
            value={stats?.data?.entitiesExtracted || 0}
            icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
            loading={loadingStats}
            testId="text-entities"
          />
          <LocalStatsCard
            title="Content Tasks"
            value={stats?.data?.tasksCreated || mockContentTasks.length}
            icon={<List className="h-4 w-4 text-muted-foreground" />}
            loading={loadingStats}
            testId="text-tasks"
          />
          <LocalStatsCard
            title="Pages Generated"
            value={stats?.data?.pagesGenerated || 0}
            icon={<FileText className="h-4 w-4 text-muted-foreground" />}
            loading={loadingStats}
            testId="text-pages"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <LocalStatsCard
            title="Articles Created"
            value={stats?.data?.articlesGenerated || 0}
            icon={<Globe className="h-4 w-4 text-muted-foreground" />}
            loading={loadingStats}
            testId="text-articles"
          />
          <LocalStatsCard
            title="Avg SEO Score"
            value={stats?.data?.avgSeoScore ? `${stats.data.avgSeoScore}%` : "N/A"}
            icon={<BarChart className="h-4 w-4 text-muted-foreground" />}
            loading={loadingStats}
            testId="text-avg-seo"
          />
          <LocalStatsCard
            title="Avg Quality Score"
            value={stats?.data?.avgQualityScore ? `${stats.data.avgQualityScore}%` : "N/A"}
            icon={<Shield className="h-4 w-4 text-muted-foreground" />}
            loading={loadingStats}
            testId="text-avg-quality"
          />
          <LocalStatsCard
            title="Processing Rate"
            value={stats?.data?.processingRate ? `${stats.data.processingRate}/min` : "N/A"}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            loading={loadingStats}
            testId="text-processing-rate"
          />
        </div>
      </AdminSection>

      <AdminSection>
        <Tabs defaultValue="upload" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="upload" data-testid="tab-upload">Upload Document</TabsTrigger>
          <TabsTrigger value="jobs" data-testid="tab-jobs">Processing Jobs</TabsTrigger>
          <TabsTrigger value="pipeline" data-testid="tab-pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="entities" data-testid="tab-entities">Entities</TabsTrigger>
          <TabsTrigger value="contents" data-testid="tab-contents">Content</TabsTrigger>
          <TabsTrigger value="capabilities" data-testid="tab-capabilities">Capabilities</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Research Document</CardTitle>
              <CardDescription>
                Upload PDF, DOCX, DOC, or TXT files containing research about destinations, attractions, hotels, restaurants, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document">Select Document</Label>
                <Input
                  id="document"
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileChange}
                  data-testid="input-file"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Processing Options</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="google-maps" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Google Maps Enrichment
                    </Label>
                    <Switch
                      id="google-maps"
                      checked={options.enableGoogleMaps}
                      onCheckedChange={(checked) => setOptions({ ...options, enableGoogleMaps: checked })}
                      data-testid="switch-google-maps"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="web-search" className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Web Search Enrichment
                    </Label>
                    <Switch
                      id="web-search"
                      checked={options.enableWebSearch}
                      onCheckedChange={(checked) => setOptions({ ...options, enableWebSearch: checked })}
                      data-testid="switch-web-search"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="pages" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Generate Entity Pages
                    </Label>
                    <Switch
                      id="pages"
                      checked={options.generatePages}
                      onCheckedChange={(checked) => setOptions({ ...options, generatePages: checked })}
                      data-testid="switch-pages"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="articles" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Generate Articles
                    </Label>
                    <Switch
                      id="articles"
                      checked={options.generateArticles}
                      onCheckedChange={(checked) => setOptions({ ...options, generateArticles: checked })}
                      data-testid="switch-articles"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
                className="w-full"
                data-testid="button-upload"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Start Processing
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Processing Jobs</CardTitle>
              <CardDescription>
                View and manage document processing jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingJobs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : !jobs?.data?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  No jobs yet. Upload a document to get started.
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4 pr-4">
                    {jobs.data.map((job: OctopusJob) => (
                      <Collapsible key={job.id}>
                        <div
                          className="p-4 border rounded-lg space-y-3"
                          data-testid={`job-${job.id}`}
                        >
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(job.status)}
                              <div>
                                <p className="font-medium">{job.input?.filename || "Document"}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(job.createdAt).toLocaleString()}
                                  </span>
                                  <MiniPipeline stage={job.progress?.stage || job.status} />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              {getStatusBadge(job.status)}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteMutation.mutate(job.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-${job.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {job.progress && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="text-muted-foreground">
                                  {job.progress.currentStep}
                                </span>
                                <span className="font-medium">
                                  {Math.round(job.progress.overallProgress || 0)}%
                                </span>
                              </div>
                              <Progress value={job.progress.overallProgress || 0} className="h-1" />
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                {job.progress.stats?.entitiesFound !== undefined && job.progress.stats.entitiesFound > 0 && (
                                  <Badge variant="outline">
                                    {job.progress.stats.entitiesFound} entities
                                  </Badge>
                                )}
                                {job.progress.stats?.tasksCreated !== undefined && job.progress.stats.tasksCreated > 0 && (
                                  <Badge variant="outline">
                                    {job.progress.stats.tasksCreated} tasks
                                  </Badge>
                                )}
                                {job.progress.stats?.pagesGenerated !== undefined && job.progress.stats.pagesGenerated > 0 && (
                                  <Badge variant="outline">
                                    {job.progress.stats.pagesGenerated} pages
                                  </Badge>
                                )}
                                {job.progress.stats?.articlesGenerated !== undefined && job.progress.stats.articlesGenerated > 0 && (
                                  <Badge variant="outline">
                                    {job.progress.stats.articlesGenerated} articles
                                  </Badge>
                                )}
                                {job.progress.stats?.seoPassRate !== undefined && (
                                  <Badge variant={getScoreBadgeVariant(job.progress.stats.seoPassRate)}>
                                    SEO: {job.progress.stats.seoPassRate}%
                                  </Badge>
                                )}
                                {job.progress.stats?.qualityPassRate !== undefined && (
                                  <Badge variant={getScoreBadgeVariant(job.progress.stats.qualityPassRate)}>
                                    Quality: {job.progress.stats.qualityPassRate}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {job.completedAt && job.startedAt && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Timer className="h-4 w-4" />
                              <span>
                                Processing time: {formatDuration(new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime())}
                              </span>
                            </div>
                          )}

                          {job.status === "failed" && job.error && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-500">
                                <AlertCircle className="mr-2 h-4 w-4" />
                                View Error Details
                                <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                          )}
                          
                          <CollapsibleContent>
                            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                              {job.error}
                            </div>
                          </CollapsibleContent>
                          
                          {job.status === "completed" && (
                            <div className="flex gap-2 pt-2 border-t flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedJobId(job.id)}
                                data-testid={`button-view-contents-${job.id}`}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                View Generated Content
                              </Button>
                            </div>
                          )}
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Pipeline Status
                </CardTitle>
                <CardDescription>
                  Current 6-agent pipeline progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeJob ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">Current Stage</span>
                      <Badge>{activeJob.progress?.stage || "pending"}</Badge>
                    </div>
                    <Progress value={activeJob.progress?.overallProgress || 0} />
                    <div className="space-y-2">
                      {PIPELINE_AGENTS.map((agent, idx) => {
                        const currentIdx = getAgentIndex(activeJob.progress?.stage || "pending");
                        const isCompleted = idx < currentIdx;
                        const isCurrent = idx === currentIdx;
                        const AgentIcon = agent.icon;

                        return (
                          <div
                            key={agent.id}
                            className={`flex items-center gap-3 p-2 rounded-lg ${
                              isCurrent ? "bg-blue-50 dark:bg-blue-950/30" :
                              isCompleted ? "bg-green-50 dark:bg-green-950/30" :
                              "bg-muted/30"
                            }`}
                          >
                            <AgentIcon className={`h-4 w-4 ${
                              isCurrent ? "text-blue-600" :
                              isCompleted ? "text-green-600" :
                              "text-muted-foreground"
                            }`} />
                            <span className="flex-1">{agent.name}</span>
                            {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                            {isCurrent && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No active pipeline. Upload a document to start processing.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activity Log
                </CardTitle>
                <CardDescription>
                  Real-time processing updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityLog entries={activityLog} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="entities">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Extracted Entities</CardTitle>
                  <CardDescription>
                    All entities found from processed documents
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-entity-type">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEntities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No entities found. Process a document to extract entities.
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pr-4">
                    {filteredEntities.map((entity) => (
                      <EntityCard
                        key={entity.id}
                        entity={entity}
                        onClick={() => setSelectedEntity(entity)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Generated Content</CardTitle>
                  <CardDescription>
                    All contents tasks from the pipeline
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-contents-type">
                      <SelectValue placeholder="Content type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={contentStatusFilter} onValueChange={setContentStatusFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-contents-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredContent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No contents found. Process a document to generate contents.
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="grid gap-4 md:grid-cols-2 pr-4">
                    {filteredContent.map((task) => (
                      <ContentTaskCard
                        key={task.id}
                        task={task}
                        onClick={() => setSelectedContent(task)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capabilities">
          <Card>
            <CardHeader>
              <CardTitle>System Capabilities</CardTitle>
              <CardDescription>
                Available features and their configuration status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCapabilities ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(capabilities?.data || {}).map(([key, enabled]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2 p-3 border rounded-lg"
                    >
                      <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                      <Badge variant={enabled ? "default" : "secondary"}>
                        {enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </AdminSection>

      <AdminSection>
        <div dir="rtl" className="bg-muted/50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">איך זה עובד / How It Works</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>העלה מסמך מחקר (PDF, Word, או טקסט) המכיל מידע על יעדים</li>
          <li>המערכת מחלצת אוטומטית ישויות (מלונות, מסעדות, אטרקציות)</li>
          <li>כל ישות מועשרת במידע מ-Google Maps וחיפוש אינטרנט</li>
          <li>נוצרים דפים ומאמרים אופטימיזציים ל-SEO ו-AEO</li>
          <li>בדיקת איכות אוטומטית לפני פרסום</li>
        </ol>
        </div>
      </AdminSection>

      <Dialog open={!!selectedJobId} onOpenChange={(open) => !open && setSelectedJobId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Generated Content</DialogTitle>
            <DialogDescription>
              Content generated from document processing
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            {loadingContent ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !jobContent?.data ? (
              <div className="text-center py-8 text-muted-foreground">
                No contents available for this job
              </div>
            ) : (
              <div className="space-y-6">
                {jobContent.data.pages?.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Generated Pages ({jobContent.data.pages.length})</h3>
                    {jobContent.data.pages.map((page: any, index: number) => (
                      <Card key={page.id || index}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{page.title}</CardTitle>
                          <CardDescription>
                            Type: {page.type} | Slug: {page.slug}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">
                            {page.metaDescription || page.description}
                          </p>
                          {page.contents && (
                            <Collapsible>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="mr-2 h-4 w-4" />
                                  Show Content
                                  <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div
                                  className="prose prose-sm dark:prose-invert max-w-none border-t pt-2 mt-2"
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeHTML(typeof page.contents === 'string'
                                      ? page.contents.substring(0, 1000) + (page.contents.length > 1000 ? "..." : "")
                                      : JSON.stringify(page.contents).substring(0, 1000) + "...")
                                  }}
                                />
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                          <div className="flex gap-2 mt-3 flex-wrap">
                            <Badge variant="outline">{page.wordCount || 0} words</Badge>
                            {page.seoScore && (
                              <Badge variant={getScoreBadgeVariant(page.seoScore)}>
                                SEO: {page.seoScore}%
                              </Badge>
                            )}
                            {page.qualityScore && (
                              <Badge variant={getScoreBadgeVariant(page.qualityScore)}>
                                Quality: {page.qualityScore}%
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {jobContent.data.articles?.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Generated Articles ({jobContent.data.articles.length})</h3>
                    {jobContent.data.articles.map((article: any, index: number) => (
                      <Card key={article.id || index}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{article.title}</CardTitle>
                          <CardDescription>
                            Type: {article.type} | Category: {article.category}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {article.excerpt || article.metaDescription}
                          </p>
                          <div className="flex gap-2 mt-3 flex-wrap">
                            <Badge variant="outline">{article.wordCount || 0} words</Badge>
                            {article.seoScore && (
                              <Badge variant={getScoreBadgeVariant(article.seoScore)}>
                                SEO: {article.seoScore}%
                              </Badge>
                            )}
                            {article.qualityScore && (
                              <Badge variant={getScoreBadgeVariant(article.qualityScore)}>
                                Quality: {article.qualityScore}%
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEntity} onOpenChange={(open) => !open && setSelectedEntity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEntity && getEntityIcon(selectedEntity.type)}
              {selectedEntity?.name}
            </DialogTitle>
            <DialogDescription>
              Entity details
            </DialogDescription>
          </DialogHeader>
          {selectedEntity && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{selectedEntity.type}</Badge>
                <Badge variant={getScoreBadgeVariant(selectedEntity.confidence * 100)}>
                  {Math.round(selectedEntity.confidence * 100)}% confidence
                </Badge>
              </div>
              {selectedEntity.description && (
                <p className="text-sm text-muted-foreground">{selectedEntity.description}</p>
              )}
              {selectedEntity.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  {selectedEntity.location}
                </div>
              )}
              {selectedEntity.tags && selectedEntity.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedEntity.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              )}
              {selectedEntity.sourceDocument && (
                <p className="text-xs text-muted-foreground">
                  Source: {selectedEntity.sourceDocument}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ContentDetailDialog
        task={selectedContent}
        open={!!selectedContent}
        onClose={() => setSelectedContent(null)}
      />
    </DashboardLayout>
  );
}

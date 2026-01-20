import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column, type Action } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUrlState } from "@/hooks/use-url-state";
import {
  Bot,
  PenTool,
  Shield,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Star,
  Users,
  FileText,
  Activity,
  Zap,
} from "lucide-react";

interface OctypoStats {
  totalAttractions: number;
  pendingContent: number;
  generatedContent: number;
  writerAgentCount: number;
  validatorAgentCount: number;
  avgQualityScore: number;
}

interface WriterAgent {
  id: string;
  name: string;
  specialty: string;
  expertise: string[];
  contentCount: number;
}

interface ValidatorAgent {
  id: string;
  name: string;
  specialty: string;
}

interface QueueItem {
  id: number;
  title: string;
  cityName: string;
  primaryCategory: string | null;
  priceFrom: number | null;
  rating: number | null;
  reviewCount: number | null;
}

interface JobItem {
  id: number;
  title: string;
  cityName: string;
  status: string | null;
  qualityScore: number | null;
  quality108: any | null;
  writerUsed: string | null;
  generatedAt: string | null;
  processingTimeMs: number | null;
}

const writerIcons: Record<string, typeof PenTool> = {
  'writer-sarah': Star,
  'writer-omar': Zap,
  'writer-fatima': Star,
  'writer-michael': Users,
  'writer-rebecca': Users,
  'writer-ahmed': FileText,
  'writer-david': MapPin,
  'writer-layla': Sparkles,
};

const validatorSpecialtyLabels: Record<string, string> = {
  'Fact Checking & Accuracy': 'Fact Checking',
  'Data & Technical Validation': 'Data Validation',
  'Legal & Copyright Compliance': 'Legal',
  'Style & Tone Validation': 'Style',
  'Cultural Sensitivity': 'Cultural',
  'Safety & Accessibility': 'Safety',
};

export default function OctypoDashboard() {
  const { toast } = useToast();
  const [urlState, setUrlState] = useUrlState({ tab: "overview" });
  const activeTab = urlState.tab || "overview";
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<OctypoStats>({
    queryKey: ["/api/octypo/stats"],
  });

  const { data: writersData, isLoading: writersLoading } = useQuery<WriterAgent[]>({
    queryKey: ["/api/octypo/agents/writers"],
  });

  const { data: validatorsData, isLoading: validatorsLoading } = useQuery<ValidatorAgent[]>({
    queryKey: ["/api/octypo/agents/validators"],
  });

  const { data: queueData, isLoading: queueLoading } = useQuery<{ queue: QueueItem[]; total: number }>({
    queryKey: ["/api/octypo/queue"],
    enabled: activeTab === "queue",
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery<{ jobs: JobItem[] }>({
    queryKey: ["/api/octypo/jobs/recent"],
    enabled: activeTab === "jobs",
  });

  const generateMutation = useMutation({
    mutationFn: async (attractionId: number) => {
      return apiRequest(`/api/octypo/generate/${attractionId}`, { method: "POST" }) as Promise<{ qualityScore?: number }>;
    },
    onSuccess: (data) => {
      toast({
        title: "Content Generated",
        description: `Quality Score: ${data.qualityScore?.toFixed(1) || 'N/A'}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/octypo/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/octypo/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/octypo/jobs/recent"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setGeneratingId(null);
    },
  });

  const handleGenerate = (attractionId: number) => {
    setGeneratingId(attractionId);
    generateMutation.mutate(attractionId);
  };

  const queueColumns: Column<QueueItem>[] = [
    {
      key: "title",
      header: "Attraction",
      cell: (item) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{item.title}</span>
          <span className="text-xs text-muted-foreground">{item.cityName}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (item) => (
        <Badge variant="secondary" className="text-xs">
          {item.primaryCategory || "General"}
        </Badge>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      cell: (item) => (
        <div className="flex items-center gap-1">
          {item.rating && (
            <>
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              <span className="text-sm">{Number(item.rating).toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">
                ({item.reviewCount?.toLocaleString() || 0})
              </span>
            </>
          )}
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      cell: (item) => (
        <span className="text-sm">
          {item.priceFrom ? `$${Number(item.priceFrom).toFixed(0)}` : "-"}
        </span>
      ),
    },
  ];

  const queueActions: Action<QueueItem>[] = [
    {
      label: "Generate Content",
      onClick: (item) => handleGenerate(item.id),
    },
  ];

  const jobColumns: Column<JobItem>[] = [
    {
      key: "title",
      header: "Attraction",
      cell: (item) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{item.title}</span>
          <span className="text-xs text-muted-foreground">{item.cityName}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => {
        const status = item.status || "pending";
        const statusConfig: Record<string, { icon: typeof CheckCircle2; className: string }> = {
          completed: { icon: CheckCircle2, className: "text-green-600" },
          failed: { icon: AlertCircle, className: "text-destructive" },
          pending: { icon: Clock, className: "text-muted-foreground" },
        };
        const config = statusConfig[status] || statusConfig.pending;
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-1.5">
            <Icon className={`h-4 w-4 ${config.className}`} />
            <span className="capitalize text-sm">{status}</span>
          </div>
        );
      },
    },
    {
      key: "qualityScore",
      header: "Quality Score",
      cell: (item) => (
        <span className="text-sm font-medium">
          {item.qualityScore ? `${Number(item.qualityScore).toFixed(1)}` : "-"}
        </span>
      ),
    },
    {
      key: "writerUsed",
      header: "Writer",
      cell: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.writerUsed || "-"}
        </span>
      ),
    },
    {
      key: "processingTime",
      header: "Time",
      cell: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.processingTimeMs ? `${(item.processingTimeMs / 1000).toFixed(1)}s` : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6" data-testid="octypo-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Octypo Engine</h1>
          <p className="text-muted-foreground">AI Content Generation System</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attractions</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-attractions">
                {stats?.totalAttractions?.toLocaleString() || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Content</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-pending-content">
                {stats?.pendingContent?.toLocaleString() || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Generated Content</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-generated-content">
                {stats?.generatedContent?.toLocaleString() || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
            <Sparkles className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-avg-quality">
                {stats?.avgQualityScore?.toFixed(1) || "0.0"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setUrlState({ tab: v })}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Bot className="h-4 w-4 me-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="queue" data-testid="tab-queue">
            <Clock className="h-4 w-4 me-2" />
            Queue
          </TabsTrigger>
          <TabsTrigger value="jobs" data-testid="tab-jobs">
            <Activity className="h-4 w-4 me-2" />
            Jobs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Writer Agents ({writersData?.length || 0})
            </h2>
            {writersLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {writersData?.map((writer) => {
                  const IconComponent = writerIcons[writer.id] || User;
                  return (
                    <Card key={writer.id} data-testid={`card-writer-${writer.id}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{writer.name}</CardTitle>
                            <CardDescription className="text-xs line-clamp-1">
                              {writer.specialty}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {writer.expertise?.slice(0, 3).map((exp) => (
                            <Badge key={exp} variant="outline" className="text-xs">
                              {exp}
                            </Badge>
                          ))}
                          {(writer.expertise?.length || 0) > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{writer.expertise.length - 3}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Validator Agents ({validatorsData?.length || 0})
            </h2>
            {validatorsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {validatorsData?.map((validator) => (
                  <Card key={validator.id} data-testid={`card-validator-${validator.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary">
                          <Shield className="h-5 w-5 text-secondary-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{validator.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {validatorSpecialtyLabels[validator.specialty] || validator.specialty}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="queue" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Content Generation Queue
              </CardTitle>
              <CardDescription>
                {queueData?.total?.toLocaleString() || 0} attractions pending content generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <DataTable
                  data={queueData?.queue || []}
                  columns={queueColumns}
                  actions={queueActions}
                  getItemId={(item) => String(item.id)}
                  emptyMessage="No attractions pending content generation"
                  pageSize={20}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Generation Jobs
              </CardTitle>
              <CardDescription>
                Latest content generation results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <DataTable
                  data={jobsData?.jobs || []}
                  columns={jobColumns}
                  getItemId={(item) => String(item.id)}
                  emptyMessage="No generation jobs yet"
                  pageSize={20}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

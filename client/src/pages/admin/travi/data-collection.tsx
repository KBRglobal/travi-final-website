import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  DollarSign,
  MapPin,
  Building2,
  Utensils,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  Database,
  Zap,
  Clock,
  TrendingUp,
  RefreshCw,
  Eye,
} from "lucide-react";

interface TraviStatus {
  aiModels: {
    gemini: { available: boolean };
    openai: { available: boolean };
    anthropic: { available: boolean };
  };
  budgetStatus: {
    level: "ok" | "warning" | "critical" | "stopped";
    message: string;
    todaySpend: number;
    budgetLimit: number;
  };
  usageStats: {
    requestsToday: number;
    totalTokens: number;
    estimatedCost: number;
  };
  destinationCount: number;
  serviceAvailability: {
    wikipedia: boolean;
    osm: boolean;
    tripadvisor: boolean;
    googlePlaces: boolean;
    freepik: boolean;
  };
}

interface ApiStatusResponse {
  success: boolean;
  data: {
    processing: { isPaused: boolean; isThrottled: boolean };
    ai: {
      available: boolean;
      models: {
        gemini?: { available: boolean; rateLimit?: number; used?: number };
        gpt?: { available: boolean; rateLimit?: number; used?: number };
        claude?: { available: boolean; rateLimit?: number; used?: number };
        openai?: { available: boolean };
        anthropic?: { available: boolean };
      };
    };
    budget: {
      status: string;
      totalSpent: number;
      dailyLimit?: number;
      remainingBudget?: number;
      message?: string;
    };
    usage: Array<{ service: string; requests: number; tokens: number; cost: number }> | TraviStatus["usageStats"];
    destinations: { total: number; list: unknown[] };
    services: Partial<TraviStatus["serviceAvailability"]>;
  };
}

interface ApiDestinationsResponse {
  success: boolean;
  data: {
    count: number;
    destinations: Destination[];
  };
}

interface ApiJobsResponse {
  success: boolean;
  data: {
    jobs: ProcessingJob[];
    pagination: { limit: number; offset: number; count: number };
  };
}

interface ApiBudgetResponse {
  success: boolean;
  data: {
    budget: {
      status: string;
      totalSpent: number;
      dailyLimit: number;
    };
    todayUsage: TraviStatus["usageStats"];
    alerts: string[];
    processing: { isPaused: boolean; isThrottled: boolean };
  };
}

interface Destination {
  slug: string;
  cityName: string;
  countryName: string;
  latitude: number;
  longitude: number;
  continent: string;
  timezone: string;
  currency: string;
}

interface DiscoveryResult {
  destination: string;
  category: string;
  dryRun: boolean;
  locations: number;
  stats: {
    wikipediaCount: number;
    osmCount: number;
    tripAdvisorCount: number;
    mergedCount: number;
  };
  attribution: string[];
}

interface ProcessingJob {
  jobId: string;
  state: "running" | "paused" | "completed" | "failed";
  progress: {
    processed: number;
    total: number;
    failed: number;
  };
  destination: string;
  category: string;
  startedAt: string;
  lastUpdate: string;
}

interface BudgetDetails {
  currentSpend: number;
  budgetLimit: number;
  budgetStatus: {
    level: string;
    message: string;
  };
  alerts: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
  usageByService: Record<string, { requests: number; cost: number }>;
}

const categoryIcons = {
  attraction: Compass,
  hotel: Building2,
  restaurant: Utensils,
};

export default function TraviDataCollection() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<"attraction" | "hotel" | "restaurant">("attraction");
  const [dryRun, setDryRun] = useState(true);
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<ApiStatusResponse, Error, TraviStatus>({
    queryKey: ["/api/travi/status"],
    refetchInterval: 10000,
    select: (response): TraviStatus => {
      const d = response.data;
      const models = d.ai?.models ?? {};
      const usageArray = Array.isArray(d.usage) ? d.usage : [];
      const totalTokens = usageArray.reduce((sum, u) => sum + (u.tokens ?? 0), 0);
      const totalCost = usageArray.reduce((sum, u) => sum + (u.cost ?? 0), 0);
      const totalRequests = usageArray.reduce((sum, u) => sum + (u.requests ?? 0), 0);
      
      return {
        aiModels: {
          gemini: { available: models.gemini?.available ?? false },
          openai: { available: models.gpt?.available ?? models.openai?.available ?? false },
          anthropic: { available: models.claude?.available ?? models.anthropic?.available ?? false },
        },
        budgetStatus: {
          level: (d.budget?.status as TraviStatus["budgetStatus"]["level"]) ?? "ok",
          message: d.budget?.message ?? "",
          todaySpend: d.budget?.totalSpent ?? 0,
          budgetLimit: d.budget?.dailyLimit ?? d.budget?.remainingBudget ?? 1000,
        },
        usageStats: { 
          requestsToday: totalRequests, 
          totalTokens, 
          estimatedCost: totalCost 
        },
        destinationCount: d.destinations?.total ?? 0,
        serviceAvailability: {
          wikipedia: d.services?.wikipedia ?? false,
          osm: d.services?.osm ?? false,
          tripadvisor: d.services?.tripadvisor ?? false,
          googlePlaces: d.services?.googlePlaces ?? false,
          freepik: d.services?.freepik ?? false,
        },
      };
    },
  });

  const { data: destinations, isLoading: destLoading } = useQuery<ApiDestinationsResponse, Error, Destination[]>({
    queryKey: ["/api/travi/destinations"],
    select: (response) => response.data?.destinations ?? [],
  });

  const { data: jobs, refetch: refetchJobs } = useQuery<ApiJobsResponse, Error, ProcessingJob[]>({
    queryKey: ["/api/travi/jobs"],
    refetchInterval: 5000,
    select: (response) => response.data?.jobs ?? [],
  });

  const { data: budget, refetch: refetchBudget } = useQuery<ApiBudgetResponse, Error, BudgetDetails>({
    queryKey: ["/api/travi/budget"],
    refetchInterval: 15000,
    select: (response): BudgetDetails => {
      const d = response.data;
      return {
        currentSpend: d.budget?.totalSpent ?? 0,
        budgetLimit: d.budget?.dailyLimit ?? 50,
        budgetStatus: {
          level: d.budget?.status ?? "ok",
          message: d.alerts?.[0] ?? "",
        },
        alerts: d.alerts?.map((msg) => ({ type: "info", message: msg, timestamp: new Date().toISOString() })) ?? [],
        usageByService: {},
      };
    },
  });

  const discoverMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/travi/discover", {
        destinationSlug: selectedDestination,
        category: selectedCategory,
        dryRun,
      });
      return response.json();
    },
    onSuccess: (apiResponse) => {
      const d = apiResponse.data;
      const result: DiscoveryResult = {
        destination: d.destinationSlug,
        category: d.category,
        dryRun: d.dryRun,
        locations: d.discovery?.totalFound ?? 0,
        stats: {
          wikipediaCount: d.discovery?.sources?.wikipedia ?? 0,
          osmCount: d.discovery?.sources?.osm ?? 0,
          tripAdvisorCount: d.discovery?.sources?.tripadvisor ?? 0,
          mergedCount: d.discovery?.validLocations ?? 0,
        },
        attribution: d.discovery?.sources 
          ? Object.entries(d.discovery.sources)
              .filter(([_, count]) => (count as number) > 0)
              .map(([source]) => {
                if (source === 'wikipedia') return 'Wikipedia (CC BY-SA 3.0)';
                if (source === 'osm') return 'OpenStreetMap (ODbL)';
                if (source === 'tripadvisor') return 'TripAdvisor (names only, no pricing)';
                return source;
              })
          : [],
      };
      setDiscoveryResult(result);
      toast({
        title: `Discovery ${dryRun ? "(Preview)" : ""} Complete`,
        description: `Found ${result.locations} locations`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Discovery Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const processMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/travi/process", {
        destinationSlug: selectedDestination,
        category: selectedCategory,
      });
    },
    onSuccess: () => {
      toast({ title: "Processing Started", description: "Job is now running in the background" });
      refetchJobs();
    },
    onError: (error: Error) => {
      toast({ title: "Process Failed", description: error.message, variant: "destructive" });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/travi/pause"),
    onSuccess: () => {
      toast({ title: "Processing Paused" });
      refetchStatus();
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/travi/resume"),
    onSuccess: () => {
      toast({ title: "Processing Resumed" });
      refetchStatus();
    },
  });

  const isProcessing = jobs?.some((j) => j.state === "running") ?? false;
  const isPaused = status?.budgetStatus.level === "stopped";
  const CategoryIcon = categoryIcons[selectedCategory];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/travi")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Data Collection</h1>
              <p className="text-muted-foreground text-sm">
                Collect locations from Wikipedia, OSM, TripAdvisor, and enrich with Google Places
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchStatus();
                refetchJobs();
                refetchBudget();
              }}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Discovery Settings
                </CardTitle>
                <CardDescription>
                  Configure and run location discovery for a destination
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Destination</Label>
                    <Select
                      value={selectedDestination}
                      onValueChange={setSelectedDestination}
                    >
                      <SelectTrigger data-testid="select-destination">
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations?.map((d) => (
                          <SelectItem key={d.slug} value={d.slug}>
                            <span className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {d.cityName}, {d.countryName}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={(v) => setSelectedCategory(v as typeof selectedCategory)}
                    >
                      <SelectTrigger data-testid="select-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="attraction">
                          <span className="flex items-center gap-2">
                            <Compass className="h-3 w-3" />
                            Attractions
                          </span>
                        </SelectItem>
                        <SelectItem value="hotel">
                          <span className="flex items-center gap-2">
                            <Building2 className="h-3 w-3" />
                            Hotels (4-5 star only)
                          </span>
                        </SelectItem>
                        <SelectItem value="restaurant">
                          <span className="flex items-center gap-2">
                            <Utensils className="h-3 w-3" />
                            Restaurants
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="p-3 bg-muted/50 border border-border rounded-md mb-4">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <span>All content complies with data source terms</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>No prices displayed</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>TripAdvisor: names & coordinates only</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="dry-run"
                      checked={dryRun}
                      onCheckedChange={setDryRun}
                      data-testid="switch-dryrun"
                    />
                    <Label htmlFor="dry-run" className="cursor-pointer">
                      Preview mode (no data saved)
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => discoverMutation.mutate()}
                      disabled={!selectedDestination || discoverMutation.isPending}
                      data-testid="button-discover"
                    >
                      {discoverMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Discover Locations
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => processMutation.mutate()}
                      disabled={!selectedDestination || processMutation.isPending || isProcessing}
                      data-testid="button-process"
                    >
                      {processMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Full Processing
                    </Button>
                  </div>
                </div>

                {discoveryResult && (
                  <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Discovery Results {discoveryResult.dryRun && "(Preview)"}
                      </h4>
                      <Badge variant="secondary">{discoveryResult.locations} locations</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div className="flex justify-between p-2 bg-background rounded">
                        <span className="text-muted-foreground">Wikipedia</span>
                        <span className="font-mono">{discoveryResult.stats.wikipediaCount}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-background rounded">
                        <span className="text-muted-foreground">OSM</span>
                        <span className="font-mono">{discoveryResult.stats.osmCount}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-background rounded">
                        <span className="text-muted-foreground">TripAdvisor</span>
                        <span className="font-mono">{discoveryResult.stats.tripAdvisorCount}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-background rounded">
                        <span className="text-muted-foreground">Merged</span>
                        <span className="font-mono">{discoveryResult.stats.mergedCount}</span>
                      </div>
                    </div>

                    {discoveryResult.attribution.length > 0 && (
                      <div className="space-y-2 pt-2 border-t">
                        <h5 className="text-sm font-medium flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Data Attribution (Required)
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {discoveryResult.attribution.map((source, idx) => (
                            <Badge 
                              key={idx} 
                              variant={source.includes('TripAdvisor') ? 'outline' : 'secondary'}
                              className={source.includes('TripAdvisor') ? 'border-amber-500 text-amber-600' : ''}
                            >
                              {source}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-700 dark:text-amber-400">
                            TripAdvisor Legal Notice
                          </p>
                          <p className="text-muted-foreground mt-1">
                            TripAdvisor data is used for <strong>location names and coordinates only</strong>. 
                            No pricing, reviews, ratings, or images from TripAdvisor will be displayed or stored.
                            This complies with TripAdvisor Content API terms of service.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Active Jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!jobs || jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No active or recent jobs</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {jobs.map((job) => {
                        const JobIcon = categoryIcons[job.category as keyof typeof categoryIcons] || Compass;
                        const progress = job.progress.total > 0
                          ? Math.round((job.progress.processed / job.progress.total) * 100)
                          : 0;

                        return (
                          <div
                            key={job.jobId}
                            className="p-3 border rounded-lg space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <JobIcon className="h-4 w-4" />
                                <span className="font-medium">{job.destination}</span>
                                <Badge variant="outline" className="text-xs">
                                  {job.category}
                                </Badge>
                              </div>
                              <Badge
                                variant={
                                  job.state === "running"
                                    ? "default"
                                    : job.state === "completed"
                                    ? "secondary"
                                    : job.state === "failed"
                                    ? "destructive"
                                    : "outline"
                                }
                              >
                                {job.state}
                              </Badge>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>
                                {job.progress.processed} / {job.progress.total} processed
                                {job.progress.failed > 0 && (
                                  <span className="text-destructive ml-2">
                                    ({job.progress.failed} failed)
                                  </span>
                                )}
                              </span>
                              <span>{progress}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Budget Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {statusLoading ? (
                  <Skeleton className="h-24" />
                ) : status ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Today's Spend</span>
                        <span className="font-mono font-medium">
                          ${status.budgetStatus.todaySpend.toFixed(2)}
                        </span>
                      </div>
                      <Progress
                        value={(status.budgetStatus.todaySpend / status.budgetStatus.budgetLimit) * 100}
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>$0</span>
                        <span>${status.budgetStatus.budgetLimit}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          status.budgetStatus.level === "ok"
                            ? "secondary"
                            : status.budgetStatus.level === "warning"
                            ? "outline"
                            : "destructive"
                        }
                      >
                        {status.budgetStatus.level.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {status.budgetStatus.message}
                      </span>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Requests</p>
                        <p className="font-mono">{status.usageStats.requestsToday}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Tokens</p>
                        <p className="font-mono">
                          {(status.usageStats.totalTokens / 1000).toFixed(1)}K
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Unable to load budget status</p>
                )}

                <div className="flex gap-2 pt-2">
                  {isProcessing && !isPaused && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => pauseMutation.mutate()}
                      disabled={pauseMutation.isPending}
                      data-testid="button-pause"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Pause All
                    </Button>
                  )}
                  {isPaused && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => resumeMutation.mutate()}
                      disabled={resumeMutation.isPending}
                      data-testid="button-resume"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Service Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-8" />
                    ))}
                  </div>
                ) : status ? (
                  <div className="space-y-2">
                    {Object.entries(status.serviceAvailability).map(([service, available]) => (
                      <div
                        key={service}
                        className="flex items-center justify-between p-2 rounded-md bg-muted"
                      >
                        <span className="capitalize">{service}</span>
                        {available ? (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Unavailable
                          </Badge>
                        )}
                      </div>
                    ))}

                    <Separator className="my-3" />

                    <h4 className="text-sm font-medium mb-2">AI Models</h4>
                    {Object.entries(status.aiModels).map(([model, info]) => (
                      <div
                        key={model}
                        className="flex items-center justify-between p-2 rounded-md bg-muted"
                      >
                        <span className="capitalize">{model}</span>
                        {info.available ? (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Ready
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            No Key
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Unable to load service status</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Legal Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>No prices displayed anywhere</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>TripAdvisor: Location discovery only (no images/reviews)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Freepik images with photographer attribution</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Wikipedia CC BY-SA 3.0 attribution</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>OpenStreetMap ODbL attribution</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

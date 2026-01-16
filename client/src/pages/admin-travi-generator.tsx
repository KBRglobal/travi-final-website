import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Play,
  Pause,
  Square,
  RefreshCw,
  DollarSign,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Destination {
  slug: string;
  city: string;
  country: string;
}

interface BudgetStatus {
  totalSpent: number;
  status: "ok" | "warning" | "critical" | "stopped";
  remainingBudget: number;
  alertMessage?: string;
}

interface StatsResponse {
  budget: BudgetStatus;
  today: {
    cost: number;
    requests: number;
    success: number;
    failed: number;
  };
  processingStatus: "running" | "paused" | "idle";
  runningJobsCount: number;
  destinations: Destination[];
}

interface Job {
  id: string;
  type: string;
  status: "pending" | "running" | "paused" | "completed" | "failed" | "budget_exceeded";
  totalItems: number;
  processedItems: number;
  successCount: number;
  failedCount: number;
  startedAt: string | null;
  completedAt: string | null;
}

interface JobsResponse {
  jobs: Job[];
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface LogsResponse {
  logs: LogEntry[];
}

const statusConfig = {
  running: { color: "bg-blue-500", label: "Running" },
  completed: { color: "bg-green-500", label: "Completed" },
  failed: { color: "bg-red-500", label: "Failed" },
  paused: { color: "bg-yellow-500", label: "Paused" },
  budget_exceeded: { color: "bg-orange-500", label: "Budget Exceeded" },
  pending: { color: "bg-slate-400", label: "Pending" },
} as const;

const budgetStatusConfig = {
  ok: { color: "text-green-600", bg: "bg-green-50", label: "OK" },
  warning: { color: "text-yellow-600", bg: "bg-yellow-50", label: "Warning ($100+)" },
  critical: { color: "text-orange-600", bg: "bg-orange-50", label: "Critical ($500+)" },
  stopped: { color: "text-red-600", bg: "bg-red-50", label: "STOPPED ($1000+)" },
} as const;

export default function AdminTraviGenerator() {
  const { toast } = useToast();
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [dryRun, setDryRun] = useState(false);
  const [batchSize, setBatchSize] = useState("10");
  const [maxLocations, setMaxLocations] = useState("100");

  const { data: statsData, isLoading: loadingStats, refetch: refetchStats } = useQuery<StatsResponse>({
    queryKey: ["/api/admin/travi/stats"],
    refetchInterval: 10000,
  });

  const { data: jobsData, isLoading: loadingJobs, refetch: refetchJobs } = useQuery<JobsResponse>({
    queryKey: ["/api/admin/travi/jobs"],
    refetchInterval: 5000,
  });

  const { data: logsData } = useQuery<LogsResponse>({
    queryKey: ["/api/admin/travi/logs"],
    refetchInterval: 3000,
  });

  const processMutation = useMutation({
    mutationFn: async (data: { destination: string; category: string; dryRun: boolean; batchSize: number; maxLocations: number }) => {
      return apiRequest("POST", "/api/admin/travi/process", data);
    },
    onSuccess: (response: any) => {
      toast({ title: "Processing started", description: response.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/travi/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/travi/jobs"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to start processing", description: error.message, variant: "destructive" });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/travi/pause"),
    onSuccess: () => {
      toast({ title: "Processing paused" });
      refetchStats();
    },
    onError: () => {
      toast({ title: "Failed to pause", variant: "destructive" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/travi/resume"),
    onSuccess: () => {
      toast({ title: "Processing resumed" });
      refetchStats();
    },
    onError: () => {
      toast({ title: "Failed to resume", variant: "destructive" });
    },
  });

  const handleStartProcessing = () => {
    if (!selectedDestination || !selectedCategory) {
      toast({ title: "Please select destination and category", variant: "destructive" });
      return;
    }
    processMutation.mutate({
      destination: selectedDestination,
      category: selectedCategory,
      dryRun,
      batchSize: parseInt(batchSize) || 10,
      maxLocations: parseInt(maxLocations) || 100,
    });
  };

  const handleRefresh = () => {
    refetchStats();
    refetchJobs();
  };

  const budget = statsData?.budget;
  const budgetConfig = budget ? budgetStatusConfig[budget.status] : budgetStatusConfig.ok;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen" data-testid="travi-generator-dashboard">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
            TRAVI Content Generator
          </h1>
          <p className="text-muted-foreground">
            AI-powered content generation for attractions, hotels, and restaurants
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loadingStats || loadingJobs}
          data-testid="button-refresh"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", (loadingStats || loadingJobs) && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
            <CardDescription>Processing Status</CardDescription>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center gap-2" data-testid="text-processing-status">
                {statsData?.processingStatus === "running" && (
                  <>
                    <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-lg font-semibold text-blue-600">Running</span>
                  </>
                )}
                {statsData?.processingStatus === "paused" && (
                  <>
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span className="text-lg font-semibold text-yellow-600">Paused</span>
                  </>
                )}
                {statsData?.processingStatus === "idle" && (
                  <>
                    <div className="h-3 w-3 rounded-full bg-slate-400" />
                    <span className="text-lg font-semibold text-slate-600">Idle</span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
            <CardDescription>Today&apos;s Locations</CardDescription>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div data-testid="text-today-locations">
                <span className="text-2xl font-bold">{statsData?.today.success || 0}</span>
                <span className="text-sm text-muted-foreground ml-2">
                  ({statsData?.today.failed || 0} failed)
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
            <CardDescription>Today&apos;s Cost</CardDescription>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <span className="text-2xl font-bold" data-testid="text-today-cost">
                ${(statsData?.today.cost || 0).toFixed(2)}
              </span>
            )}
          </CardContent>
        </Card>

        <Card className={cn("bg-white", budgetConfig.bg)}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
            <CardDescription>Budget Status</CardDescription>
            {budget?.status === "ok" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {budget?.status === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
            {budget?.status === "critical" && <AlertTriangle className="h-4 w-4 text-orange-500" />}
            {budget?.status === "stopped" && <XCircle className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div data-testid="text-budget-status">
                <span className={cn("text-lg font-semibold", budgetConfig.color)}>
                  {budgetConfig.label}
                </span>
                <p className="text-sm text-muted-foreground">
                  ${budget?.totalSpent.toFixed(2) || "0.00"} / $1000
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Processing Controls */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
            Processing Controls
          </CardTitle>
          <CardDescription>Start content generation for destinations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Select
                value={selectedDestination}
                onValueChange={setSelectedDestination}
              >
                <SelectTrigger id="destination" data-testid="select-destination">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {statsData?.destinations?.map((dest) => (
                    <SelectItem key={dest.slug} value={dest.slug}>
                      {dest.city}, {dest.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger id="category" data-testid="select-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attraction">Attractions</SelectItem>
                  <SelectItem value="hotel">Hotels</SelectItem>
                  <SelectItem value="restaurant">Restaurants</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batchSize">Batch Size</Label>
              <Input
                id="batchSize"
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                min={1}
                max={50}
                data-testid="input-batch-size"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxLocations">Max Locations</Label>
              <Input
                id="maxLocations"
                type="number"
                value={maxLocations}
                onChange={(e) => setMaxLocations(e.target.value)}
                min={1}
                max={500}
                data-testid="input-max-locations"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch
                id="dryRun"
                checked={dryRun}
                onCheckedChange={setDryRun}
                data-testid="switch-dry-run"
              />
              <Label htmlFor="dryRun" className="text-sm">
                Dry Run (no database writes)
              </Label>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleStartProcessing}
                disabled={processMutation.isPending || !selectedDestination || !selectedCategory}
                className="bg-[#6443F4] hover:bg-[#5338d9]"
                data-testid="button-start"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Processing
              </Button>

              {statsData?.processingStatus === "running" ? (
                <Button
                  variant="outline"
                  onClick={() => pauseMutation.mutate()}
                  disabled={pauseMutation.isPending}
                  data-testid="button-pause"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => resumeMutation.mutate()}
                  disabled={resumeMutation.isPending || statsData?.processingStatus !== "paused"}
                  data-testid="button-resume"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending || statsData?.processingStatus !== "running"}
                data-testid="button-stop"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Section */}
      {jobsData?.jobs?.filter(j => j.status === "running").map((job) => (
        <Card key={job.id} className="bg-white border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              Current Job: {job.type}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>
                  {job.processedItems} / {job.totalItems || "?"} locations
                </span>
              </div>
              <Progress
                value={job.totalItems ? (job.processedItems / job.totalItems) * 100 : 0}
                className="h-2"
                data-testid={`progress-job-${job.id}`}
              />
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600">
                <CheckCircle2 className="h-4 w-4 inline mr-1" />
                {job.successCount} success
              </span>
              <span className="text-red-600">
                <XCircle className="h-4 w-4 inline mr-1" />
                {job.failedCount} failed
              </span>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Processing Logs */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Processing Logs
          </CardTitle>
          <CardDescription>Real-time log output (last 20 messages)</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="bg-slate-900 rounded-md p-4 h-64 overflow-y-auto font-mono text-xs"
            data-testid="log-output"
          >
            {!logsData?.logs?.length ? (
              <div className="text-slate-500 text-center py-8">
                No log entries yet. Start processing to see logs.
              </div>
            ) : (
              logsData.logs.map((log, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "py-1",
                    log.level === "error" && "text-red-400",
                    log.level === "warn" && "text-yellow-400",
                    log.level === "info" && "text-green-400"
                  )}
                >
                  <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{" "}
                  <span className={cn(
                    "uppercase font-semibold",
                    log.level === "error" && "text-red-500",
                    log.level === "warn" && "text-yellow-500",
                    log.level === "info" && "text-blue-400"
                  )}>
                    [{log.level}]
                  </span>{" "}
                  <span className="text-slate-300">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Jobs Table */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle style={{ fontFamily: "'Chillax', var(--font-sans)" }}>
            Recent Jobs
          </CardTitle>
          <CardDescription>History of content generation jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingJobs ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : jobsData?.jobs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2" />
              <p>No jobs yet</p>
              <p className="text-sm">Start processing to see jobs here</p>
            </div>
          ) : (
            <Table data-testid="table-jobs">
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Success / Failed</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobsData?.jobs?.map((job) => {
                  const config = statusConfig[job.status] || statusConfig.pending;
                  return (
                    <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                      <TableCell className="font-mono text-xs">
                        {job.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{job.type}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("text-white", config.color)}
                        >
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {job.processedItems} / {job.totalItems || "-"}
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600">{job.successCount}</span>
                        {" / "}
                        <span className="text-red-600">{job.failedCount}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {job.startedAt
                          ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })
                          : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

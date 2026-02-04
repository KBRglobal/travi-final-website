import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  Timer,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Provider {
  name: string;
  available: boolean;
  tokens: number;
  maxTokens: number;
  requestsThisMinute: number;
  requestsThisHour: number;
  blockedUntil: string | null;
  waitTimeSeconds: number;
  status: string;
}

interface AIQueueStatus {
  queue: {
    length: number;
    processing: boolean;
    activeRequests: number;
    completedRequests: number;
    failedRequests: number;
  };
  providers: Provider[];
  estimatedWait: string;
  estimatedWaitSeconds: number;
}

interface Job {
  id: string;
  type: string;
  status: string;
  priority: number;
  retries: number;
  maxRetries: number;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface JobQueueStatus {
  stats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  };
  recentJobs: Job[];
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ready: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    limited: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    blocked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    pending: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    processing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return colors[status] || "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
}

export default function OctypoQueueMonitorPage() {
  const {
    data: aiQueue,
    isLoading: aiLoading,
    refetch: refetchAI,
  } = useQuery<AIQueueStatus>({
    queryKey: ["/api/octypo/ai-queue/status"],
    refetchInterval: 3000,
  });

  const {
    data: jobQueue,
    isLoading: jobLoading,
    refetch: refetchJob,
  } = useQuery<JobQueueStatus>({
    queryKey: ["/api/octypo/job-queue/status"],
    refetchInterval: 5000,
  });

  const handleRefresh = () => {
    refetchAI();
    refetchJob();
  };

  const totalProviderTokens = aiQueue?.providers.reduce((sum, p) => sum + p.tokens, 0) || 0;
  const maxProviderTokens = aiQueue?.providers.reduce((sum, p) => sum + p.maxTokens, 0) || 1;
  const tokenUtilization = ((maxProviderTokens - totalProviderTokens) / maxProviderTokens) * 100;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Queue Monitor
          </h1>
          <p className="text-muted-foreground">
            Real-time view of AI request queues and background jobs
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          data-testid="button-refresh-queues"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              AI Request Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Queue Length</div>
                    <div className="text-2xl font-bold">{aiQueue?.queue.length || 0}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Active Requests</div>
                    <div className="text-2xl font-bold">{aiQueue?.queue.activeRequests || 0}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Completed</div>
                    <div className="text-2xl font-bold text-green-600">
                      {aiQueue?.queue.completedRequests || 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Failed</div>
                    <div className="text-2xl font-bold text-red-600">
                      {aiQueue?.queue.failedRequests || 0}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Token Utilization</span>
                    <span>{tokenUtilization.toFixed(1)}%</span>
                  </div>
                  <Progress value={tokenUtilization} className="h-2" />
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="h-4 w-4" />
                  Estimated Wait: {aiQueue?.estimatedWait || "0 seconds"}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              Background Job Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {jobLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Pending</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {jobQueue?.stats.pending || 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Processing</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {jobQueue?.stats.processing || 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Completed</div>
                    <div className="text-2xl font-bold text-green-600">
                      {jobQueue?.stats.completed || 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Failed</div>
                    <div className="text-2xl font-bold text-red-600">
                      {jobQueue?.stats.failed || 0}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Total Jobs: {jobQueue?.stats.total || 0}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider Rate Limits</CardTitle>
        </CardHeader>
        <CardContent>
          {aiLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Req/Min</TableHead>
                  <TableHead className="text-right">Req/Hour</TableHead>
                  <TableHead>Wait Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(aiQueue?.providers || []).map(provider => (
                  <TableRow key={provider.name} data-testid={`row-provider-${provider.name}`}>
                    <TableCell className="font-medium capitalize">{provider.name}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(provider.status)}>
                        {provider.status === "ready" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {provider.status === "limited" && <Clock className="h-3 w-3 mr-1" />}
                        {provider.status === "blocked" && <XCircle className="h-3 w-3 mr-1" />}
                        {provider.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono">{provider.tokens}</span>
                      <span className="text-muted-foreground">/{provider.maxTokens}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {provider.requestsThisMinute}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {provider.requestsThisHour}
                    </TableCell>
                    <TableCell>
                      {provider.waitTimeSeconds > 0 ? (
                        <span className="text-yellow-600">{provider.waitTimeSeconds}s</span>
                      ) : (
                        <span className="text-green-600">Ready</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (jobQueue?.recentJobs || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No jobs in queue</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(jobQueue?.recentJobs || []).map(job => (
                  <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                    <TableCell className="font-mono text-sm">{job.id.slice(0, 8)}...</TableCell>
                    <TableCell>{job.type}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{job.priority}</TableCell>
                    <TableCell>
                      {job.retries}/{job.maxRetries}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(job.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

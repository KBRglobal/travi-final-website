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
  Cpu,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  Server,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Engine {
  id: string;
  name: string;
  provider: string;
  model: string;
  isHealthy: boolean;
  errorCount: number;
  successCount: number;
  lastError: string | null;
  lastUsed: string | null;
}

interface EngineStats {
  total: number;
  healthy: number;
  unhealthy: number;
  byProvider: Record<string, number>;
  performance: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
  };
}

interface EnginesResponse {
  engines: Engine[];
  stats: {
    total: number;
    healthy: number;
    unhealthy: number;
    byProvider: Record<string, number>;
  };
}

function getProviderColor(provider: string): string {
  const colors: Record<string, string> = {
    anthropic: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    openai: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    openrouter: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    gemini: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    groq: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    deepseek: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    mistral: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    together: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    perplexity: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    kimi: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return colors[provider] || "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
}

export default function OctypoEnginesPage() {
  const { data: enginesData, isLoading, refetch } = useQuery<EnginesResponse>({
    queryKey: ['/api/octypo/engines'],
    refetchInterval: 10000,
  });

  const { data: statsData } = useQuery<EngineStats>({
    queryKey: ['/api/octypo/engines/stats'],
    refetchInterval: 10000,
  });

  const engines = enginesData?.engines || [];
  const stats = statsData || enginesData?.stats;

  const groupedEngines = engines.reduce((acc, engine) => {
    const provider = engine.provider;
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(engine);
    return acc;
  }, {} as Record<string, Engine[]>);

  const healthPercent = stats ? (stats.healthy / stats.total) * 100 : 100;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="h-6 w-6" />
            AI Engines Dashboard
          </h1>
          <p className="text-muted-foreground">
            {stats?.total || 0} engines across {Object.keys(stats?.byProvider || {}).length} providers
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          data-testid="button-refresh-engines"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Engines</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {Object.keys(stats?.byProvider || {}).length} providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.healthy || 0}</div>
            <Progress value={healthPercent} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Unhealthy</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.unhealthy || 0}</div>
            <p className="text-xs text-muted-foreground">
              {((stats?.unhealthy || 0) / (stats?.total || 1) * 100).toFixed(1)}% failure rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Zap className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.performance?.successRate || 100}%</div>
            <p className="text-xs text-muted-foreground">
              {statsData?.performance?.totalRequests || 0} total requests
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(stats?.byProvider || {}).map(([provider, count]) => (
          <Card key={provider}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Badge className={getProviderColor(provider)}>{provider}</Badge>
                <span className="text-2xl font-bold">{count}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Loading engines...</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedEngines).map(([provider, providerEngines]) => (
          <Card key={provider}>
            <CardHeader className="flex flex-row items-center gap-2">
              <Badge className={getProviderColor(provider)}>{provider}</Badge>
              <CardTitle className="text-lg capitalize">{provider} Engines</CardTitle>
              <span className="ml-auto text-muted-foreground">{providerEngines.length} engines</span>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Engine ID</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Success</TableHead>
                    <TableHead className="text-right">Errors</TableHead>
                    <TableHead>Last Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providerEngines.map((engine) => (
                    <TableRow key={engine.id} data-testid={`row-engine-${engine.id}`}>
                      <TableCell className="font-mono text-sm">{engine.id}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{engine.model}</TableCell>
                      <TableCell>
                        {engine.isHealthy ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Healthy
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Error
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {engine.successCount}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {engine.errorCount}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {engine.lastUsed 
                          ? new Date(engine.lastUsed).toLocaleTimeString() 
                          : "Never"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

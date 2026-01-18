import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Globe,
  RefreshCw,
  Plus,
  Search,
  AlertTriangle,
  TrendingUp,
  Heart,
  DollarSign,
  MoreHorizontal,
  Trash2,
  Eye,
  Play,
  Square,
  Bot,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Destination {
  id: string;
  name: string;
  status: string;
  health: number;
  coverage: number;
  budgetToday: number;
  budgetLimit: number;
  alerts: number;
  contentCount: number;
  totalAttractions: number;
  avgQuality: number;
}

interface StatsData {
  totalAttractions: number;
  pendingContent: number;
  generatedContent: number;
  writerAgentCount: number;
  validatorAgentCount: number;
  avgQualityScore: number;
}

interface AutopilotData {
  running: boolean;
  mode: string;
  stats: {
    contentGeneratedToday: number;
    translationsToday: number;
    publishedToday: number;
    tasksCompletedToday: number;
    imagesProcessedToday: number;
    errorsToday: number;
  };
}

interface EngineStats {
  total: number;
  healthy: number;
  unhealthy: number;
  byProvider: Record<string, number>;
}

interface AIQueueStatus {
  queue: {
    length: number;
    activeRequests: number;
    completedRequests: number;
  };
  providers: Array<{
    name: string;
    available: boolean;
    status: string;
  }>;
}

function getStatusColor(status: string) {
  switch (status) {
    case "Running":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "Growing":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "Initializing":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "New":
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function OctypoDashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: destinationsData, isLoading, refetch } = useQuery<{ destinations: Destination[] }>({
    queryKey: ['/api/octypo/destinations'],
  });

  const { data: statsData } = useQuery<StatsData>({
    queryKey: ['/api/octypo/stats'],
  });

  const { data: autopilotData } = useQuery<AutopilotData>({
    queryKey: ['/api/octypo/autopilot/status'],
  });

  const { data: engineStats } = useQuery<EngineStats>({
    queryKey: ['/api/octypo/engines/stats'],
    refetchInterval: 30000,
  });

  const { data: aiQueueStatus } = useQuery<AIQueueStatus>({
    queryKey: ['/api/octypo/ai-queue/status'],
    refetchInterval: 10000,
  });

  const startAutopilot = useMutation({
    mutationFn: () => apiRequest('/api/octypo/autopilot/start', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/octypo/autopilot/status'] });
      toast({ title: "Autopilot Started", description: "Content generation is now running." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start autopilot.", variant: "destructive" });
    },
  });

  const stopAutopilot = useMutation({
    mutationFn: () => apiRequest('/api/octypo/autopilot/stop', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/octypo/autopilot/status'] });
      toast({ title: "Autopilot Stopped", description: "Content generation has been paused." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to stop autopilot.", variant: "destructive" });
    },
  });

  const destinations = destinationsData?.destinations || [];
  const totalSites = statsData?.totalAttractions || destinations.length;
  const generatedContent = statsData?.generatedContent || 0;
  const writerAgentCount = statsData?.writerAgentCount || 0;
  const validatorAgentCount = statsData?.validatorAgentCount || 0;
  const healthySites = destinations.filter(d => d.health >= 70).length;
  const totalAlerts = destinations.reduce((sum, d) => sum + d.alerts, 0);
  const spendToday = destinations.reduce((sum, d) => sum + d.budgetToday, 0);
  const isAutopilotRunning = autopilotData?.running || false;

  const filteredDestinations = destinations.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesHealth = healthFilter === "all" || 
      (healthFilter === "healthy" && d.health >= 70) ||
      (healthFilter === "warning" && d.health >= 50 && d.health < 70) ||
      (healthFilter === "critical" && d.health < 50);
    return matchesSearch && matchesStatus && matchesHealth;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-state">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading destinations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="octypo-dashboard-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Destinations</h1>
          <p className="text-muted-foreground">Manage your autonomous tourism sites</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 border rounded-md px-3 py-1.5">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Autopilot:</span>
            {isAutopilotRunning ? (
              <>
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Running
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => stopAutopilot.mutate()}
                  disabled={stopAutopilot.isPending}
                  data-testid="button-stop-autopilot"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              </>
            ) : (
              <>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                  Stopped
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => startAutopilot.mutate()}
                  disabled={startAutopilot.isPending}
                  data-testid="button-start-autopilot"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Start
                </Button>
              </>
            )}
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading} data-testid="button-refresh">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button data-testid="button-new-destination">
            <Plus className="h-4 w-4 mr-2" />
            New Destination
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Attractions</CardTitle>
            <Globe className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-sites">{totalSites}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Generated</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600" data-testid="text-generated">{generatedContent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Healthy</CardTitle>
            <Heart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-healthy">
              <span className="text-blue-600">{healthySites}</span>
              <span className="text-muted-foreground">/{destinations.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Writers</CardTitle>
            <Bot className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600" data-testid="text-writers">{writerAgentCount}</div>
            <p className="text-xs text-muted-foreground">{validatorAgentCount} validators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600" data-testid="text-alerts">{totalAlerts}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            AI Infrastructure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10">
              <div className="text-2xl font-bold text-purple-600" data-testid="text-engines-total">
                {engineStats?.total || 0}
              </div>
              <div className="text-xs text-muted-foreground">AI Engines</div>
            </div>
            <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10">
              <div className="text-2xl font-bold text-green-600" data-testid="text-engines-healthy">
                {engineStats?.healthy || 0}
              </div>
              <div className="text-xs text-muted-foreground">Healthy</div>
            </div>
            <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10">
              <div className="text-2xl font-bold" data-testid="text-providers">
                {Object.keys(engineStats?.byProvider || {}).length}
              </div>
              <div className="text-xs text-muted-foreground">Providers</div>
            </div>
            <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10">
              <div className="text-2xl font-bold text-blue-600" data-testid="text-queue-length">
                {aiQueueStatus?.queue?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Queue Length</div>
            </div>
            <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10">
              <div className="text-2xl font-bold text-cyan-600" data-testid="text-active-providers">
                {aiQueueStatus?.providers?.filter(p => p.available).length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Active Providers</div>
            </div>
            <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10">
              <div className="text-2xl font-bold text-emerald-600" data-testid="text-completed-requests">
                {aiQueueStatus?.queue?.completedRequests || 0}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(engineStats?.byProvider || {}).slice(0, 6).map(([provider, count]) => (
              <Badge key={provider} variant="outline" className="capitalize">
                {provider}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search destinations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="growing">Growing</SelectItem>
                  <SelectItem value="initializing">Initializing</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                </SelectContent>
              </Select>
              <Select value={healthFilter} onValueChange={setHealthFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-health">
                  <SelectValue placeholder="All Health" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Health</SelectItem>
                  <SelectItem value="healthy">Healthy (≥70%)</SelectItem>
                  <SelectItem value="warning">Warning (50-70%)</SelectItem>
                  <SelectItem value="critical">Critical (&lt;50%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredDestinations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="empty-state">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No destinations found</p>
              <p className="text-sm">Try adjusting your filters or add a new destination.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destination</TableHead>
                  <TableHead>Health ↓</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Alerts</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDestinations.map((destination) => (
                  <TableRow key={destination.id} data-testid={`row-destination-${destination.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 bg-primary">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {destination.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{destination.name}</div>
                          <div className="text-xs text-muted-foreground">{destination.totalAttractions} attractions</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{destination.health}%</span>
                        <Progress 
                          value={destination.health} 
                          className="w-16 h-2"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(destination.status)}>
                        {destination.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{destination.coverage}%</span>
                        <Progress value={destination.coverage} className="w-16 h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{destination.contentCount}</span>
                        <span className="text-xs text-muted-foreground">
                          Avg: {destination.avgQuality.toFixed(1)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {destination.alerts > 0 ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {destination.alerts}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${destination.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem data-testid={`action-view-${destination.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            data-testid={`action-delete-${destination.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

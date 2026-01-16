import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Search,
  RefreshCw,
  Download,
  Trash2,
  Server,
  Image,
  Rss,
  FileText,
  Shield,
  Zap,
  BarChart3,
  Loader2,
  CheckCircle,
  Clock,
  Database,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

type LogLevel = "error" | "warn" | "info" | "debug";
type LogCategory = "system" | "ai" | "images" | "storage" | "rss" | "contents" | "auth" | "http" | "autopilot" | "dev" | "server" | "database";

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  rawMessage?: string;
  details?: Record<string, unknown>;
}

interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Record<LogCategory, number>;
  recentErrors: number;
}

const categoryIcons: Record<LogCategory, typeof Server> = {
  system: Server,
  ai: Zap,
  images: Image,
  storage: Database,
  rss: Rss,
  contents: FileText,
  auth: Shield,
  http: BarChart3,
  autopilot: Clock,
  dev: Bug,
  server: Server,
  database: Database,
};

const categoryLabels: Record<LogCategory, string> = {
  system: "System",
  ai: "AI",
  images: "Images",
  storage: "Storage",
  rss: "RSS",
  contents: "Content",
  auth: "Auth",
  http: "HTTP",
  autopilot: "AutoPilot",
  dev: "Dev",
  server: "Server",
  database: "Database",
};

const levelColors: Record<LogLevel, string> = {
  error: "text-red-400",
  warn: "text-yellow-400",
  info: "text-cyan-400",
  debug: "text-gray-400",
};

const levelLabels: Record<LogLevel, string> = {
  error: "ERROR",
  warn: "WARN",
  info: "INFO",
  debug: "DEBUG",
};

const levelIcons: Record<LogLevel, typeof AlertCircle> = {
  error: AlertCircle,
  warn: AlertTriangle,
  info: Info,
  debug: Bug,
};

function LogEntryItem({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const timestamp = new Date(log.timestamp);
  const timeStr = timestamp.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  const dateStr = timestamp.toLocaleDateString('en-US', { 
    month: 'short', 
    day: '2-digit' 
  });

  return (
    <div
      className="font-mono text-sm cursor-pointer hover:bg-white/5 px-2 py-1 rounded transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <span className="text-gray-500 shrink-0">{dateStr} {timeStr}</span>
        <span className={`shrink-0 font-bold w-14 ${levelColors[log.level]}`}>
          [{levelLabels[log.level]}]
        </span>
        <span className="text-[#6443F4] shrink-0 w-24">
          [{categoryLabels[log.category].toUpperCase()}]
        </span>
        <span className="text-gray-200 break-words flex-1">{log.message}</span>
      </div>
      {expanded && log.details && (
        <pre className="mt-1 ml-[168px] pl-2 border-l-2 border-gray-600 text-gray-400 text-xs overflow-auto max-h-40">
          {JSON.stringify(log.details, null, 2)}
        </pre>
      )}
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, description }: {
  title: string;
  value: number;
  icon: typeof Server;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminLogs() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | "all">("all");
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch logs
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["/api/admin/logs", selectedCategory, selectedLevel, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedLevel !== "all") params.set("level", selectedLevel);
      if (searchQuery) params.set("search", searchQuery);
      params.set("limit", "200");

      const res = await apiRequest("GET", `/api/admin/logs?${params.toString()}`);
      return res.json();
    },
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/logs/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/logs/stats");
      return res.json() as Promise<LogStats>;
    },
    refetchInterval: autoRefresh ? 10000 : false,
  });

  // Clear logs mutation
  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/admin/logs");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs/stats"] });
    },
  });

  // Export logs
  const handleExport = () => {
    const params = new URLSearchParams();
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (selectedLevel !== "all") params.set("level", selectedLevel);
    window.open(`/api/admin/logs/export?${params.toString()}`, "_blank");
  };

  const logs = logsData?.logs || [];

  // Filter logs by category for tabs
  const filteredLogs = useMemo(() => {
    if (selectedCategory === "all") return logs;
    return logs.filter((log: LogEntry) => log.category === selectedCategory);
  }, [logs, selectedCategory]);

  const categories: (LogCategory | "all")[] = [
    "all",
    "system",
    "server",
    "http",
    "autopilot",
    "ai",
    "rss",
    "contents",
    "auth",
    "images",
    "storage",
    "database",
    "dev",
  ];

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">System Logs</h1>
          <p className="text-muted-foreground">Monitor system activity and errors</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto" : "Manual"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearLogsMutation.mutate()}
            disabled={clearLogsMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total Logs"
            value={stats.total}
            icon={Server}
          />
          <StatsCard
            title="Recent Errors"
            value={stats.recentErrors}
            icon={AlertCircle}
            description="Last hour"
          />
          <StatsCard
            title="Warnings"
            value={stats.byLevel.warn}
            icon={AlertTriangle}
          />
          <StatsCard
            title="Info"
            value={stats.byLevel.info}
            icon={Info}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={selectedLevel}
          onValueChange={(v) => setSelectedLevel(v as LogLevel | "all")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="error">Errors</SelectItem>
            <SelectItem value="warning">Warnings</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as LogCategory | "all")}>
        <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
          {categories.map((cat) => {
            const count = cat === "all"
              ? stats?.total || 0
              : stats?.byCategory[cat as LogCategory] || 0;
            const Icon = cat === "all" ? Server : categoryIcons[cat as LogCategory];

            return (
              <TabsTrigger
                key={cat}
                value={cat}
                className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {cat === "all" ? "All" : categoryLabels[cat as LogCategory]}
                </span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-0">
          <div className="rounded-lg border bg-[#1a1a2e] text-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-[#16162a] border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="font-mono text-sm text-gray-400 ml-2">
                  {selectedCategory === "all" ? "system-logs" : `${selectedCategory}-logs`} — {filteredLogs.length} entries
                </span>
              </div>
              <span className="font-mono text-xs text-gray-500">
                {autoRefresh ? "LIVE" : "PAUSED"}
              </span>
            </div>
            <div className="p-2">
              {logsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500 font-mono text-center px-4">
                  <Server className="h-10 w-10 text-gray-600 mb-3" />
                  <p className="text-gray-400 font-medium">No logs recorded yet</p>
                  <p className="text-sm mt-2 max-w-md text-gray-500">
                    System logs capture server activity including API requests, AI operations, RSS processing, and errors. 
                    Logs will appear automatically as the system processes requests.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-0.5 pr-4">
                    {filteredLogs.map((log: LogEntry) => (
                      <LogEntryItem key={log.id} log={log} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

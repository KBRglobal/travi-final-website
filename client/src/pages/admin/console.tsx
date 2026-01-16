import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Terminal, RefreshCw, Trash2, Download, Lightbulb, 
  AlertTriangle, Info, CheckCircle2, XCircle, Clock,
  Play, Pause, Filter
} from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

interface SystemStatus {
  database: "connected" | "disconnected" | "error";
  objectStorage: "connected" | "disconnected" | "error";
  aiServices: "connected" | "disconnected" | "error";
  scheduler: "running" | "stopped" | "error";
  memory: number;
  uptime: number;
}

export default function LiveConsolePage() {
  const [isLive, setIsLive] = useState(true);
  const [showLevels, setShowLevels] = useState({
    info: true,
    warn: true,
    error: true,
    debug: false,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: logs, isLoading, refetch } = useQuery<LogEntry[]>({
    queryKey: ["/api/system/logs"],
    refetchInterval: isLive ? 3000 : false,
  });

  const { data: status } = useQuery<SystemStatus>({
    queryKey: ["/api/system/status"],
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (isLive && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isLive]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "warn":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "debug":
        return <Terminal className="h-4 w-4 text-gray-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "info":
        return "text-blue-600";
      case "warn":
        return "text-amber-600";
      case "error":
        return "text-red-600";
      case "debug":
        return "text-gray-500";
      default:
        return "text-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
      case "running":
        return <Badge className="bg-green-500">Connected</Badge>;
      case "disconnected":
      case "stopped":
        return <Badge variant="secondary">Disconnected</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredLogs = logs?.filter(log => showLevels[log.level as keyof typeof showLevels]) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="heading-console">
            <Terminal className="h-8 w-8 text-primary" />
            Live Console
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time system logs and monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isLive ? (
              <Pause className="h-4 w-4 text-green-600" />
            ) : (
              <Play className="h-4 w-4 text-muted-foreground" />
            )}
            <Switch
              checked={isLive}
              onCheckedChange={setIsLive}
              data-testid="switch-live"
            />
            <Label className={isLive ? "text-green-600" : "text-muted-foreground"}>
              {isLive ? "Live" : "Paused"}
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-logs">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg border">
        <h3 className="font-medium flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          How It Works / איך זה עובד
        </h3>
        <p className="text-sm text-muted-foreground">
          Monitor <strong>real-time system activity</strong>: AI generation, RSS imports, scheduled tasks, errors, and more.
          Use this to debug issues and ensure everything is running smoothly.
          <br />
          <span className="text-xs opacity-70">
            (עקוב אחרי פעילות המערכת בזמן אמת: יצירת AI, ייבוא RSS, משימות מתוזמנות ושגיאות.)
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Database
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            {getStatusBadge(status?.database || "disconnected")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Object Storage
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            {getStatusBadge(status?.objectStorage || "disconnected")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              AI Services
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            {getStatusBadge(status?.aiServices || "disconnected")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold" data-testid="text-uptime">
              {status?.uptime ? `${Math.floor(status.uptime / 3600)}h ${Math.floor((status.uptime % 3600) / 60)}m` : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                System Logs
              </CardTitle>
              <CardDescription>
                {filteredLogs.length} entries shown
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1">
                  <Button
                    variant={showLevels.info ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowLevels(prev => ({ ...prev, info: !prev.info }))}
                    data-testid="button-filter-info"
                  >
                    Info
                  </Button>
                  <Button
                    variant={showLevels.warn ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowLevels(prev => ({ ...prev, warn: !prev.warn }))}
                    data-testid="button-filter-warn"
                  >
                    Warn
                  </Button>
                  <Button
                    variant={showLevels.error ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowLevels(prev => ({ ...prev, error: !prev.error }))}
                    data-testid="button-filter-error"
                  >
                    Error
                  </Button>
                  <Button
                    variant={showLevels.debug ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowLevels(prev => ({ ...prev, debug: !prev.debug }))}
                    data-testid="button-filter-debug"
                  >
                    Debug
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] font-mono text-sm" ref={scrollRef}>
            <div className="space-y-1 bg-slate-950 dark:bg-slate-900 p-4 rounded-lg text-slate-100">
              {filteredLogs.length ? (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 py-1 border-b border-slate-800 ${getLevelColor(log.level)}`}
                    data-testid={`log-entry-${log.id}`}
                  >
                    <span className="text-slate-500 text-xs">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    {getLevelIcon(log.level)}
                    <span className="text-slate-400">[{log.source}]</span>
                    <span className="flex-1">{log.message}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No logs to display</p>
                  <p className="text-sm">Logs will appear as the system processes requests</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

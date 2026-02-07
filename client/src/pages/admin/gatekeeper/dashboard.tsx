/**
 * Gatekeeper Command Center
 * Editorial control dashboard for autonomous content selection
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Zap,
  Target,
  Brain,
  Shield,
  Activity,
  BarChart3,
  RefreshCw,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface KPIs {
  processed24h: number;
  skipped24h: number;
  approved24h: number;
  queued24h: number;
  avgScore24h: number;
  pendingReview: number;
  filterRate: number;
  seoAccuracy: number;
  duplicatesBlocked: number;
  enginesHealthy: number;
  enginesTotal: number;
}

interface QueueItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  category: string;
  total_score: number;
  seo_score: number;
  aeo_score: number;
  virality_score: number;
  decision: string;
  tier: string;
  estimated_value: string;
  estimated_cost: string;
  reasoning: string;
  writer_id: string;
  writer_name: string;
  keywords: string[];
  status: string;
  created_at: string;
}

interface ValueMatrix {
  quickWins: QueueItem[];
  strategicInvestments: QueueItem[];
  gapFillers: QueueItem[];
  skip: QueueItem[];
}

interface BiasAlert {
  type: string;
  severity: string;
  message: string;
}

interface SourceBiasData {
  source: string;
  approval_rate: string | number;
  total?: number;
}

interface CategoryBiasData {
  category: string;
  total: number;
  approved: number;
  avg_score: number;
  approval_rate: string | number;
}

interface BiasAnalysis {
  source?: SourceBiasData[];
  geographic?: CategoryBiasData[];
}

interface ValueMatrixSummary {
  quickWins: number;
  strategicInvestments: number;
  gapFillers: number;
  skip: number;
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: Readonly<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
}>) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div
            className={`p-3 rounded-full ${(() => {
              if (trend === "up") return "bg-green-100 text-green-600";
              if (trend === "down") return "bg-red-100 text-red-600";
              return "bg-muted text-muted-foreground";
            })()}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreBadge({ score, label }: Readonly<{ score: number; label: string }>) {
  let color: string;
  if (score >= 70) color = "bg-green-100 text-green-700";
  else if (score >= 50) color = "bg-yellow-100 text-yellow-700";
  else color = "bg-red-100 text-red-700";
  return (
    <div className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
      {label}: {score}
    </div>
  );
}

function TierBadge({ tier }: Readonly<{ tier: string }>) {
  const config: Record<string, { color: string; label: string }> = {
    S1: { color: "bg-red-500", label: "S1 Critical" },
    S2: { color: "bg-yellow-500", label: "S2 Important" },
    S3: { color: "bg-blue-500", label: "S3 Standard" },
  };
  const { color, label } = config[tier] || { color: "bg-gray-500", label: tier };
  return <Badge className={`${color} text-white`}>{label}</Badge>;
}

function DecisionBadge({ decision }: Readonly<{ decision: string }>) {
  const config: Record<
    string,
    { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
  > = {
    write: { icon: CheckCircle2, color: "text-green-600", label: "Write" },
    skip: { icon: XCircle, color: "text-red-600", label: "Skip" },
    queue: { icon: Clock, color: "text-yellow-600", label: "Queue" },
  };
  const { icon: Icon, color, label } = config[decision] || config.skip;
  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export default function GatekeeperDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [queueFilter, setQueueFilter] = useState("all");

  // Fetch KPIs
  const { data: kpisData, isLoading: kpisLoading } = useQuery<{ kpis: KPIs }>({
    queryKey: ["/api/admin/gatekeeper/dashboard/kpis"],
    refetchInterval: 30000, // Refresh every 30s
  });

  // Fetch Value Matrix
  const { data: matrixData } = useQuery<{ matrix: ValueMatrix; summary: ValueMatrixSummary }>({
    queryKey: ["/api/admin/gatekeeper/dashboard/value-matrix"],
  });

  // Fetch Queue
  const { data: queueData, isLoading: queueLoading } = useQuery<{
    items: QueueItem[];
    total: number;
  }>({
    queryKey: ["/api/admin/gatekeeper/dashboard/queue", queueFilter],
  });

  // Fetch Bias Analysis
  const { data: biasData } = useQuery<{
    biasAnalysis: BiasAnalysis;
    alerts: BiasAlert[];
    overallHealth: string;
  }>({
    queryKey: ["/api/admin/gatekeeper/dashboard/bias-check"],
  });

  // Override mutation
  const overrideMutation = useMutation({
    mutationFn: async ({ itemId, newDecision }: { itemId: string; newDecision: string }) => {
      const response = await apiRequest("POST", "/api/admin/gatekeeper/dashboard/override", {
        itemId,
        newDecision,
        reason: "Editor override from dashboard",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Decision overridden", description: "The item has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gatekeeper/dashboard"] });
    },
    onError: error => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const kpis = kpisData?.kpis;
  const matrix = matrixData?.matrix;
  const queue = queueData?.items || [];
  const biasAlerts = biasData?.alerts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gatekeeper Command Center</h1>
          <p className="text-muted-foreground">Autonomous content selection & editorial control</p>
        </div>
        <div className="flex items-center gap-2">
          {biasData?.overallHealth === "healthy" ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Shield className="h-4 w-4 mr-1" />
              No Bias Detected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              <AlertTriangle className="h-4 w-4 mr-1" />
              {biasAlerts.length} Alerts
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPIs Row */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {["k1", "k2", "k3", "k4", "k5", "k6"].map(id => (
            <Card key={id} className="animate-pulse">
              <CardContent className="pt-6 h-24 bg-muted" />
            </Card>
          ))}
        </div>
      ) : (
        kpis && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <KPICard title="Processed (24h)" value={kpis.processed24h} icon={Activity} />
            <KPICard
              title="Filter Rate"
              value={`${kpis.filterRate}%`}
              subtitle={`${kpis.skipped24h} skipped`}
              icon={Filter}
              trend={kpis.filterRate > 60 ? "up" : "neutral"}
            />
            <KPICard
              title="Approved"
              value={kpis.approved24h}
              subtitle="Ready to write"
              icon={CheckCircle2}
              trend="up"
            />
            <KPICard
              title="Pending Review"
              value={kpis.pendingReview}
              icon={Clock}
              trend={kpis.pendingReview > 10 ? "down" : "neutral"}
            />
            <KPICard
              title="SEO Accuracy"
              value={`${kpis.seoAccuracy}%`}
              icon={Target}
              trend={kpis.seoAccuracy >= 70 ? "up" : "down"}
            />
            <KPICard
              title="Engines"
              value={`${kpis.enginesHealthy}/${kpis.enginesTotal}`}
              subtitle="Healthy"
              icon={Brain}
              trend={kpis.enginesHealthy === kpis.enginesTotal ? "up" : "down"}
            />
          </div>
        )
      )}

      {/* Main Content */}
      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">
            <Clock className="h-4 w-4 mr-2" />
            Editorial Queue
          </TabsTrigger>
          <TabsTrigger value="matrix">
            <BarChart3 className="h-4 w-4 mr-2" />
            Value Matrix
          </TabsTrigger>
          <TabsTrigger value="bias">
            <Shield className="h-4 w-4 mr-2" />
            Bias Detection
          </TabsTrigger>
        </TabsList>

        {/* Editorial Queue Tab */}
        <TabsContent value="queue" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Editorial Queue</CardTitle>
                  <CardDescription>
                    Items evaluated by Gatekeeper with SEO/AEO scores and recommendations
                  </CardDescription>
                </div>
                <Select value={queueFilter} onValueChange={setQueueFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Scores</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Writer</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queue.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="max-w-xs">
                          <div>
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.reasoning}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.source}</Badge>
                        </TableCell>
                        <TableCell>
                          <TierBadge tier={item.tier} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <ScoreBadge score={item.seo_score || 0} label="SEO" />
                            <ScoreBadge score={item.aeo_score || 0} label="AEO" />
                            <ScoreBadge score={item.virality_score || 0} label="VIR" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <DecisionBadge decision={item.decision} />
                          <p className="text-xs text-muted-foreground mt-1">
                            Score: {item.total_score}/100
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{item.writer_name || "-"}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {item.decision === "skip" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  overrideMutation.mutate({
                                    itemId: item.id,
                                    newDecision: "write",
                                  })
                                }
                              >
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                            )}
                            {item.decision === "write" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  overrideMutation.mutate({
                                    itemId: item.id,
                                    newDecision: "skip",
                                  })
                                }
                              >
                                <ThumbsDown className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" asChild>
                              <a href={item.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {queue.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No items in queue
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Value Matrix Tab */}
        <TabsContent value="matrix" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Quick Wins */}
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <Zap className="h-5 w-5" />
                  Quick Wins
                </CardTitle>
                <CardDescription>High value, low cost - publish immediately</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-700">
                  {matrixData?.summary?.quickWins || 0}
                </p>
                <div className="mt-4 space-y-2">
                  {matrix?.quickWins?.slice(0, 3).map(item => (
                    <div key={item.id} className="text-sm p-2 bg-white rounded">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-muted-foreground">Score: {item.total_score}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Strategic Investments */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Target className="h-5 w-5" />
                  Strategic Investments
                </CardTitle>
                <CardDescription>High value, high cost - deep analysis needed</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-700">
                  {matrixData?.summary?.strategicInvestments || 0}
                </p>
                <div className="mt-4 space-y-2">
                  {matrix?.strategicInvestments?.slice(0, 3).map(item => (
                    <div key={item.id} className="text-sm p-2 bg-white rounded">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-muted-foreground">Score: {item.total_score}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gap Fillers */}
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-700">
                  <Clock className="h-5 w-5" />
                  Gap Fillers
                </CardTitle>
                <CardDescription>Medium value, low cost - publish if capacity</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-700">
                  {matrixData?.summary?.gapFillers || 0}
                </p>
              </CardContent>
            </Card>

            {/* Skip */}
            <Card className="border-gray-200 bg-gray-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-700">
                  <XCircle className="h-5 w-5" />
                  Skip
                </CardTitle>
                <CardDescription>Low value, high cost - don't waste resources</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-700">{matrixData?.summary?.skip || 0}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bias Detection Tab */}
        <TabsContent value="bias" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Bias Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {biasAlerts.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>No algorithmic bias detected</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {biasAlerts.map((alert, i) => (
                      <div
                        key={`${alert.type}-${alert.severity}-${i}`}
                        className={`p-3 rounded-lg ${
                          alert.severity === "critical"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        <p className="font-medium capitalize">{alert.type} Bias</p>
                        <p className="text-sm">{alert.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Source Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Source Approval Rates</CardTitle>
                <CardDescription>Approval rate by content source (last 30 days)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {biasData?.biasAnalysis?.source?.slice(0, 5).map((source: SourceBiasData) => (
                    <div key={source.source}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{source.source}</span>
                        <span>{source.approval_rate}%</span>
                      </div>
                      <Progress value={Number(source.approval_rate)} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Category Analysis</CardTitle>
                <CardDescription>Approval rates by content category</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Avg Score</TableHead>
                      <TableHead>Approval Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {biasData?.biasAnalysis?.geographic?.map((cat: CategoryBiasData) => (
                      <TableRow key={cat.category}>
                        <TableCell className="font-medium">{cat.category}</TableCell>
                        <TableCell>{cat.total}</TableCell>
                        <TableCell>{cat.approved}</TableCell>
                        <TableCell>{Math.round(cat.avg_score)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={Number(cat.approval_rate)} className="w-20" />
                            <span>{cat.approval_rate}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

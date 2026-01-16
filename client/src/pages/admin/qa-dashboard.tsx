import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Circle,
  AlertCircle,
  HelpCircle,
  Play,
  ClipboardCheck,
  BarChart3,
  History,
  Plus,
  FileText,
  Bug,
  Settings,
  ChevronRight,
  Search,
  Filter,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface QaCategory {
  id: string;
  key: string;
  name: string;
  nameHe: string;
  icon: string;
  description: string;
  items: QaChecklistItem[];
}

interface QaChecklistItem {
  id: string;
  categoryId: string;
  key: string;
  name: string;
  nameHe: string;
  description: string;
  descriptionHe: string;
  severity: "critical" | "high" | "medium" | "low";
  checkGuidelines?: string;
}

interface QaRun {
  id: string;
  name: string;
  description?: string;
  status: "in_progress" | "completed" | "abandoned";
  environment: string;
  version?: string;
  branch?: string;
  totalItems: number;
  passedItems: number;
  failedItems: number;
  skippedItems: number;
  score: number;
  startedAt: string;
  completedAt?: string;
  user?: { name: string; username: string };
  results?: QaCheckResult[];
}

interface QaCheckResult {
  id: string;
  runId: string;
  itemId: string;
  status: "not_checked" | "passed" | "failed" | "not_applicable" | "needs_review";
  notes?: string;
  evidence?: string;
  checkedAt?: string;
  item?: QaChecklistItem & { category: QaCategory };
}

interface QaStats {
  totalRuns: number;
  completedRuns: number;
  openIssues: number;
  averageScore: number;
  recentRuns: QaRun[];
}

const STATUS_CONFIG = {
  not_checked: { icon: Circle, color: "text-gray-400", bg: "bg-gray-100", label: "Not Checked" },
  passed: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100", label: "Passed" },
  failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-100", label: "Failed" },
  not_applicable: { icon: HelpCircle, color: "text-gray-500", bg: "bg-gray-100", label: "N/A" },
  needs_review: { icon: AlertCircle, color: "text-yellow-600", bg: "bg-yellow-100", label: "Review" },
};

const SEVERITY_CONFIG = {
  critical: { color: "bg-red-500", label: "Critical" },
  high: { color: "bg-orange-500", label: "High" },
  medium: { color: "bg-yellow-500", label: "Medium" },
  low: { color: "bg-blue-500", label: "Low" },
};

export default function QaDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [newRunDialogOpen, setNewRunDialogOpen] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [newRunData, setNewRunData] = useState({
    name: "",
    description: "",
    environment: "development",
    version: "",
    branch: "",
  });

  // Queries
  const { data: stats, isLoading: loadingStats } = useQuery<QaStats>({
    queryKey: ["/api/qa/stats"],
  });

  const { data: categories, isLoading: loadingCategories } = useQuery<QaCategory[]>({
    queryKey: ["/api/qa/categories"],
  });

  const { data: runs, isLoading: loadingRuns } = useQuery<QaRun[]>({
    queryKey: ["/api/qa/runs"],
  });

  const { data: activeRun, isLoading: loadingActiveRun } = useQuery<QaRun>({
    queryKey: ["/api/qa/runs", activeRunId],
    enabled: !!activeRunId,
  });

  // Mutations
  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/qa/seed", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/qa/stats"] });
      toast({ title: "QA checklist data seeded successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to seed QA data", variant: "destructive" });
    },
  });

  const createRunMutation = useMutation({
    mutationFn: async (data: typeof newRunData) => {
      const res = await apiRequest("POST", "/api/qa/runs", data);
      return res.json();
    },
    onSuccess: (run: QaRun) => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa/runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/qa/stats"] });
      setNewRunDialogOpen(false);
      setActiveRunId(run.id);
      setActiveTab("run");
      toast({ title: "QA run started!" });
    },
    onError: () => {
      toast({ title: "Failed to create QA run", variant: "destructive" });
    },
  });

  const updateResultMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const res = await apiRequest("PATCH", `/api/qa/results/${id}`, { status, notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa/runs", activeRunId] });
    },
  });

  const completeRunMutation = useMutation({
    mutationFn: async (runId: string) => {
      const res = await apiRequest("POST", `/api/qa/runs/${runId}/complete`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa/runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/qa/runs", activeRunId] });
      queryClient.invalidateQueries({ queryKey: ["/api/qa/stats"] });
      toast({ title: "QA run completed!" });
    },
  });

  // Group results by category for display
  const groupedResults = activeRun?.results?.reduce((acc, result) => {
    const categoryId = result.item?.category?.id || "unknown";
    if (!acc[categoryId]) {
      acc[categoryId] = {
        category: result.item?.category,
        results: [],
      };
    }
    acc[categoryId].results.push(result);
    return acc;
  }, {} as Record<string, { category?: QaCategory; results: QaCheckResult[] }>) || {};

  // Filter results
  const filterResults = (results: QaCheckResult[]) => {
    return results.filter((r) => {
      const matchesSearch = !searchQuery ||
        r.item?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.item?.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity = severityFilter === "all" || r.item?.severity === severityFilter;
      return matchesSearch && matchesSeverity;
    });
  };

  // Calculate progress for active run
  const checkedCount = activeRun?.results?.filter(r => r.status !== "not_checked").length || 0;
  const totalCount = activeRun?.totalItems || 0;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  if (loadingCategories || loadingStats) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show seed button if no categories exist
  if (!categories || categories.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">QA Checklist System</CardTitle>
            <CardDescription>
              Initialize the QA checklist with comprehensive testing categories covering all aspects of your system.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><span>🧩</span> Component Communication</div>
              <div className="flex items-center gap-2"><span>🌐</span> Frontend/Backend</div>
              <div className="flex items-center gap-2"><span>🔐</span> Authentication</div>
              <div className="flex items-center gap-2"><span>🛂</span> Authorization</div>
              <div className="flex items-center gap-2"><span>🗄️</span> Data & Persistence</div>
              <div className="flex items-center gap-2"><span>🔒</span> Security</div>
              <div className="flex items-center gap-2"><span>📊</span> Observability</div>
              <div className="flex items-center gap-2"><span>⚡</span> Performance</div>
              <div className="flex items-center gap-2"><span>☁️</span> Infrastructure</div>
              <div className="flex items-center gap-2"><span>🔁</span> CI/CD</div>
              <div className="flex items-center gap-2"><span>🧪</span> Testing Strategy</div>
              <div className="flex items-center gap-2"><span>🧯</span> Reliability</div>
              <div className="flex items-center gap-2"><span>📚</span> Documentation</div>
              <div className="flex items-center gap-2"><span>🧠</span> Governance</div>
            </div>
            <Button
              size="lg"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="mt-4"
            >
              {seedMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ClipboardCheck className="mr-2 h-4 w-4" />
              )}
              Initialize QA Checklist (180+ Items)
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">QA Checklist Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive system quality assurance</p>
        </div>
        <Button onClick={() => setNewRunDialogOpen(true)}>
          <Play className="mr-2 h-4 w-4" />
          Start New QA Run
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRuns || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.completedRuns || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.openIssues || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageScore || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="checklist">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Checklist
          </TabsTrigger>
          <TabsTrigger value="run" disabled={!activeRunId}>
            <Play className="mr-2 h-4 w-4" />
            Active Run
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Categories Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Checklist Categories</CardTitle>
                <CardDescription>{categories?.length} categories with {categories?.reduce((sum, c) => sum + c.items.length, 0)} total items</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {categories?.map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{cat.icon}</span>
                          <div>
                            <div className="font-medium">{cat.name}</div>
                            <div className="text-sm text-muted-foreground">{cat.nameHe}</div>
                          </div>
                        </div>
                        <Badge variant="secondary">{cat.items.length} items</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recent Runs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent QA Runs</CardTitle>
                <CardDescription>Latest quality assurance test runs</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {stats?.recentRuns && stats.recentRuns.length > 0 ? (
                    <div className="space-y-3">
                      {stats.recentRuns.map((run) => (
                        <div
                          key={run.id}
                          className="p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => {
                            setActiveRunId(run.id);
                            setActiveTab("run");
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{run.name}</div>
                            <Badge variant={run.status === "completed" ? "default" : "secondary"}>
                              {run.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Score: {run.score}%</span>
                            <span>Passed: {run.passedItems}</span>
                            <span>Failed: {run.failedItems}</span>
                          </div>
                          <Progress value={run.score} className="mt-2 h-2" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                      <ClipboardCheck className="h-12 w-12 mb-2 opacity-50" />
                      <p>No QA runs yet</p>
                      <Button variant="ghost" onClick={() => setNewRunDialogOpen(true)}>
                        Start your first run
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complete QA Checklist</CardTitle>
              <CardDescription>All categories and items in the QA checklist</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {categories?.map((cat) => (
                  <AccordionItem key={cat.id} value={cat.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{cat.icon}</span>
                        <div className="text-left">
                          <div className="font-medium">{cat.name}</div>
                          <div className="text-sm text-muted-foreground font-normal">{cat.nameHe}</div>
                        </div>
                        <Badge variant="outline" className="ml-4">{cat.items.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {cat.items.map((item) => (
                          <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                            <Badge className={cn("mt-0.5", SEVERITY_CONFIG[item.severity].color)}>
                              {SEVERITY_CONFIG[item.severity].label}
                            </Badge>
                            <div className="flex-1">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">{item.nameHe}</div>
                              <div className="text-sm mt-1">{item.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Run Tab */}
        <TabsContent value="run" className="space-y-4">
          {loadingActiveRun ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activeRun ? (
            <>
              {/* Run Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{activeRun.name}</CardTitle>
                      <CardDescription>
                        {activeRun.environment} | Started {new Date(activeRun.startedAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={activeRun.status === "completed" ? "default" : "secondary"}>
                        {activeRun.status}
                      </Badge>
                      {activeRun.status === "in_progress" && (
                        <Button onClick={() => completeRunMutation.mutate(activeRun.id)}>
                          Complete Run
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-4 text-center mb-4">
                    <div>
                      <div className="text-2xl font-bold">{activeRun.totalItems}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{activeRun.passedItems}</div>
                      <div className="text-sm text-muted-foreground">Passed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{activeRun.failedItems}</div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-500">{activeRun.skippedItems}</div>
                      <div className="text-sm text-muted-foreground">Skipped</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{activeRun.score}%</div>
                      <div className="text-sm text-muted-foreground">Score</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{checkedCount} / {totalCount} checked</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>
                </CardContent>
              </Card>

              {/* Filters */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Check Items by Category */}
              <Accordion type="multiple" className="w-full">
                {Object.entries(groupedResults).map(([categoryId, { category, results }]) => {
                  const filteredResults = filterResults(results);
                  if (filteredResults.length === 0) return null;

                  const categoryPassed = filteredResults.filter(r => r.status === "passed").length;
                  const categoryFailed = filteredResults.filter(r => r.status === "failed").length;

                  return (
                    <AccordionItem key={categoryId} value={categoryId}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{category?.icon}</span>
                            <div className="text-left">
                              <div className="font-medium">{category?.name}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              {categoryPassed} passed
                            </Badge>
                            {categoryFailed > 0 && (
                              <Badge variant="outline" className="bg-red-50 text-red-700">
                                {categoryFailed} failed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {filteredResults.map((result) => {
                            const StatusIcon = STATUS_CONFIG[result.status].icon;
                            return (
                              <div
                                key={result.id}
                                className={cn(
                                  "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                                  STATUS_CONFIG[result.status].bg
                                )}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge className={cn("shrink-0", SEVERITY_CONFIG[result.item?.severity || "medium"].color)}>
                                      {SEVERITY_CONFIG[result.item?.severity || "medium"].label}
                                    </Badge>
                                    <span className="font-medium">{result.item?.name}</span>
                                    <span className="text-sm text-muted-foreground">({result.item?.nameHe})</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{result.item?.description}</p>
                                  {result.notes && (
                                    <p className="text-sm mt-2 p-2 bg-muted rounded">{result.notes}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <TooltipProvider>
                                    {(["passed", "failed", "not_applicable", "needs_review"] as const).map((status) => {
                                      const config = STATUS_CONFIG[status];
                                      const Icon = config.icon;
                                      return (
                                        <Tooltip key={status}>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="icon"
                                              variant={result.status === status ? "default" : "outline"}
                                              className={cn(
                                                "h-8 w-8",
                                                result.status === status && config.bg
                                              )}
                                              onClick={() => updateResultMutation.mutate({
                                                id: result.id,
                                                status,
                                              })}
                                              disabled={activeRun.status === "completed"}
                                            >
                                              <Icon className={cn("h-4 w-4", result.status === status ? config.color : "")} />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>{config.label}</TooltipContent>
                                        </Tooltip>
                                      );
                                    })}
                                  </TooltipProvider>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <ClipboardCheck className="h-12 w-12 mb-2 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No active run selected</p>
                <Button variant="ghost" onClick={() => setNewRunDialogOpen(true)}>
                  Start a new QA run
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QA Run History</CardTitle>
              <CardDescription>All past QA runs and their results</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRuns ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : runs && runs.length > 0 ? (
                <div className="space-y-3">
                  {runs.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => {
                        setActiveRunId(run.id);
                        setActiveTab("run");
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{run.name}</span>
                          <Badge variant={run.status === "completed" ? "default" : "secondary"}>
                            {run.status}
                          </Badge>
                          <Badge variant="outline">{run.environment}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Started: {new Date(run.startedAt).toLocaleString()}
                          {run.completedAt && ` | Completed: ${new Date(run.completedAt).toLocaleString()}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-lg font-bold">{run.score}%</div>
                          <div className="text-xs text-muted-foreground">
                            {run.passedItems}/{run.totalItems} passed
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <History className="h-12 w-12 mb-2 opacity-50" />
                  <p>No QA runs yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Run Dialog */}
      <Dialog open={newRunDialogOpen} onOpenChange={setNewRunDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New QA Run</DialogTitle>
            <DialogDescription>
              Create a new quality assurance testing session
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Run Name</label>
              <Input
                placeholder="e.g., Pre-release QA - v2.0"
                value={newRunData.name}
                onChange={(e) => setNewRunData({ ...newRunData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="Notes about this QA run..."
                value={newRunData.description}
                onChange={(e) => setNewRunData({ ...newRunData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Environment</label>
                <Select
                  value={newRunData.environment}
                  onValueChange={(value) => setNewRunData({ ...newRunData, environment: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Version (optional)</label>
                <Input
                  placeholder="e.g., 2.0.0"
                  value={newRunData.version}
                  onChange={(e) => setNewRunData({ ...newRunData, version: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Branch (optional)</label>
              <Input
                placeholder="e.g., main, release/2.0"
                value={newRunData.branch}
                onChange={(e) => setNewRunData({ ...newRunData, branch: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRunDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createRunMutation.mutate(newRunData)}
              disabled={createRunMutation.isPending || !newRunData.name}
            >
              {createRunMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Start Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

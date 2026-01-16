import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DashboardLayout, StatCard, AdminSection } from "@/components/admin";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  BarChart3,
  Settings,
  Plus,
  Trash2,
  Play,
  Ban,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const REFRESH_INTERVAL = 30000;

interface DashboardData {
  status: {
    level: "healthy" | "warning" | "critical";
    enabled: boolean;
    degradedMode: boolean;
    lastUpdated: string;
  };
  decisions: {
    lastHour: { total: number; allowed: number; warned: number; blocked: number; blockRate: number };
    lastDay: { total: number; allowed: number; warned: number; blocked: number; blockRate: number };
  };
  budgets: Array<{
    feature: string;
    period: string;
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
    isExhausted: boolean;
  }>;
  topOffenders: Array<{
    targetKey: string;
    feature: string;
    blockedCount: number;
    lastBlocked: string;
  }>;
  activeOverrides: number;
  policyCount: number;
}

interface Override {
  id: string;
  targetKey: string;
  feature: string;
  reason: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  active: boolean;
}

interface Policy {
  id: string;
  name: string;
  description?: string;
  target: { type: string; feature?: string };
  enabled: boolean;
  priority: number;
  allowedActions: string[];
  blockedActions: string[];
  budgetLimits: Array<{ period: string; maxActions: number; maxAiSpend: number }>;
  approvalLevel: string;
}

export default function AutonomyControlPlane() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [simulateDialogOpen, setSimulateDialogOpen] = useState(false);

  // Fetch dashboard data
  const { data: dashboard, isLoading: dashboardLoading, refetch } = useQuery<DashboardData>({
    queryKey: ["/api/admin/autonomy/control-plane/dashboard"],
    refetchInterval: REFRESH_INTERVAL,
  });

  // Fetch overrides
  const { data: overridesData } = useQuery<{ overrides: Override[] }>({
    queryKey: ["/api/admin/autonomy/control-plane/overrides"],
    refetchInterval: REFRESH_INTERVAL,
  });

  // Fetch policies
  const { data: policiesData } = useQuery<{ policies: Policy[] }>({
    queryKey: ["/api/admin/autonomy/control-plane/policies"],
  });

  // Create override mutation
  const createOverrideMutation = useMutation({
    mutationFn: async (data: { targetKey: string; feature: string; reason: string; ttlMinutes: number }) => {
      return apiRequest("POST", "/api/admin/autonomy/control-plane/override", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/autonomy/control-plane/overrides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/autonomy/control-plane/dashboard"] });
      setOverrideDialogOpen(false);
      toast({ title: "Override created", description: "The override is now active." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Revoke override mutation
  const revokeOverrideMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/autonomy/control-plane/overrides/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/autonomy/control-plane/overrides"] });
      toast({ title: "Override revoked" });
    },
  });

  // Reset budget mutation
  const resetBudgetMutation = useMutation({
    mutationFn: async (data: { targetKey: string; period?: string; reason: string }) => {
      return apiRequest("POST", "/api/admin/autonomy/control-plane/budgets/reset", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/autonomy/control-plane/dashboard"] });
      toast({ title: "Budget reset successfully" });
    },
  });

  const getStatusIcon = (level: string) => {
    switch (level) {
      case "healthy": return <ShieldCheck className="h-5 w-5 text-green-500" />;
      case "warning": return <ShieldAlert className="h-5 w-5 text-yellow-500" />;
      case "critical": return <Shield className="h-5 w-5 text-red-500" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (level: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      healthy: "default",
      warning: "secondary",
      critical: "destructive",
    };
    return <Badge variant={variants[level] || "outline"}>{level.toUpperCase()}</Badge>;
  };

  return (
    <DashboardLayout
      title="Autonomy Control Plane"
      description="Policy enforcement, risk budgets, and override management"
    >
      {/* Status Banner */}
      {dashboard && (
        <Alert className={cn(
          "mb-6",
          dashboard.status.level === "critical" && "border-red-500 bg-red-50",
          dashboard.status.level === "warning" && "border-yellow-500 bg-yellow-50",
        )}>
          <div className="flex items-center gap-2">
            {getStatusIcon(dashboard.status.level)}
            <AlertTitle className="mb-0">
              System Status: {getStatusBadge(dashboard.status.level)}
            </AlertTitle>
          </div>
          <AlertDescription className="mt-2 flex items-center gap-4">
            <span>Enforcement: {dashboard.status.enabled ? "Active" : "Disabled"}</span>
            <span>Degraded Mode: {dashboard.status.degradedMode ? "Enabled" : "Disabled"}</span>
            <span>{dashboard.activeOverrides} active overrides</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Decisions (1h)"
              value={dashboard?.decisions.lastHour.total || 0}
              icon={<Activity className="h-5 w-5" />}
              description={`${dashboard?.decisions.lastHour.blocked || 0} blocked`}
            />
            <StatCard
              title="Block Rate (1h)"
              value={`${(dashboard?.decisions.lastHour.blockRate || 0).toFixed(1)}%`}
              icon={<Ban className="h-5 w-5" />}
              description={dashboard?.decisions.lastHour.blockRate > 20 ? "Above threshold" : "Normal"}
            />
            <StatCard
              title="Active Policies"
              value={dashboard?.policyCount || 0}
              icon={<Shield className="h-5 w-5" />}
            />
            <StatCard
              title="Active Overrides"
              value={dashboard?.activeOverrides || 0}
              icon={<Zap className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Budget Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" /> Budget Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {dashboard?.budgets.slice(0, 8).map((budget, i) => (
                    <div key={i} className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{budget.feature} ({budget.period})</span>
                        <span className={cn(
                          budget.isExhausted && "text-red-500",
                          budget.percentUsed > 80 && !budget.isExhausted && "text-yellow-500"
                        )}>
                          {budget.used}/{budget.limit}
                        </span>
                      </div>
                      <Progress
                        value={budget.percentUsed}
                        className={cn(
                          budget.isExhausted && "[&>div]:bg-red-500",
                          budget.percentUsed > 80 && !budget.isExhausted && "[&>div]:bg-yellow-500"
                        )}
                      />
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Top Offenders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Top Blocked Targets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {dashboard?.topOffenders.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No blocked operations in the last 24 hours</p>
                  ) : (
                    dashboard?.topOffenders.map((offender, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium text-sm">{offender.targetKey}</p>
                          <p className="text-xs text-muted-foreground">{offender.feature}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive">{offender.blockedCount} blocks</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(offender.lastBlocked).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Policies</CardTitle>
              <CardDescription>Manage enforcement policies for different features and scopes</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {policiesData?.policies.map((policy) => (
                  <div key={policy.id} className="border rounded-lg p-4 mb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{policy.name}</h4>
                        <p className="text-sm text-muted-foreground">{policy.description}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant={policy.enabled ? "default" : "secondary"}>
                            {policy.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                          <Badge variant="outline">Priority: {policy.priority}</Badge>
                          <Badge variant="outline">{policy.target.type}</Badge>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 text-sm">
                      <span className="text-muted-foreground">Limits: </span>
                      {policy.budgetLimits.map((limit, i) => (
                        <span key={i} className="mr-2">
                          {limit.period}: {limit.maxActions} actions
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budgets Tab */}
        <TabsContent value="budgets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Management</CardTitle>
              <CardDescription>View and reset budget counters by feature and period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboard?.budgets.map((budget, i) => (
                  <Card key={i} className={cn(budget.isExhausted && "border-red-500")}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex justify-between">
                        <span>{budget.feature}</span>
                        <Badge variant="outline">{budget.period}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Progress value={budget.percentUsed} className="mb-2" />
                      <div className="flex justify-between text-sm">
                        <span>{budget.used} used</span>
                        <span>{budget.remaining} remaining</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-3"
                        onClick={() => resetBudgetMutation.mutate({
                          targetKey: `feature:${budget.feature}`,
                          period: budget.period,
                          reason: "Manual reset from control plane",
                        })}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" /> Reset
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Decisions Tab */}
        <TabsContent value="decisions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Decision Log</CardTitle>
                <CardDescription>Recent policy evaluation decisions</CardDescription>
              </div>
              <Dialog open={simulateDialogOpen} onOpenChange={setSimulateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Play className="h-4 w-4 mr-1" /> Simulate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Simulate Policy Evaluation</DialogTitle>
                  </DialogHeader>
                  <SimulateForm onClose={() => setSimulateDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <DecisionLog />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overrides Tab */}
        <TabsContent value="overrides" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Overrides</CardTitle>
                <CardDescription>Temporary policy overrides with TTL</CardDescription>
              </div>
              <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-1" /> Create Override
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Override</DialogTitle>
                  </DialogHeader>
                  <OverrideForm
                    onSubmit={(data) => createOverrideMutation.mutate(data)}
                    isLoading={createOverrideMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {overridesData?.overrides.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No active overrides</p>
                ) : (
                  overridesData?.overrides.map((override) => (
                    <div key={override.id} className="border rounded-lg p-4 mb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={override.active ? "default" : "secondary"}>
                              {override.active ? "Active" : "Expired"}
                            </Badge>
                            <span className="font-medium">{override.feature}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{override.targetKey}</p>
                          <p className="text-sm mt-2">{override.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            Expires: {new Date(override.expiresAt).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            By: {override.createdBy}
                          </p>
                          {override.active && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="mt-2"
                              onClick={() => revokeOverrideMutation.mutate(override.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

// Override Form Component
function OverrideForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: { targetKey: string; feature: string; reason: string; ttlMinutes: number }) => void;
  isLoading: boolean;
}) {
  const [targetKey, setTargetKey] = useState("");
  const [feature, setFeature] = useState("");
  const [reason, setReason] = useState("");
  const [ttlMinutes, setTtlMinutes] = useState(60);

  const features = [
    "chat", "octopus", "search", "aeo", "translation", "images",
    "content_enrichment", "seo_optimization", "internal_linking",
    "background_job", "publishing"
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label>Target Key</Label>
        <Input
          placeholder="e.g., feature:chat or entity:contents:123"
          value={targetKey}
          onChange={(e) => setTargetKey(e.target.value)}
        />
      </div>
      <div>
        <Label>Feature</Label>
        <Select value={feature} onValueChange={setFeature}>
          <SelectTrigger>
            <SelectValue placeholder="Select feature" />
          </SelectTrigger>
          <SelectContent>
            {features.map((f) => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Reason (min 10 characters)</Label>
        <Textarea
          placeholder="Explain why this override is needed..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <div>
        <Label>TTL (minutes)</Label>
        <Select value={ttlMinutes.toString()} onValueChange={(v) => setTtlMinutes(parseInt(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15">15 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="60">1 hour</SelectItem>
            <SelectItem value="120">2 hours</SelectItem>
            <SelectItem value="480">8 hours</SelectItem>
            <SelectItem value="1440">24 hours</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button
          onClick={() => onSubmit({ targetKey, feature, reason, ttlMinutes })}
          disabled={!targetKey || !feature || reason.length < 10 || isLoading}
        >
          {isLoading ? "Creating..." : "Create Override"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// Simulate Form Component
function SimulateForm({ onClose }: { onClose: () => void }) {
  const [feature, setFeature] = useState("");
  const [action, setAction] = useState("ai_generate");
  const [targetKey, setTargetKey] = useState("");
  const [result, setResult] = useState<any>(null);

  const simulateMutation = useMutation({
    mutationFn: async (data: { feature: string; action: string; targetKey?: string }) => {
      const response = await apiRequest("POST", "/api/admin/autonomy/control-plane/simulate", data);
      return response.json();
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const features = [
    "chat", "octopus", "search", "aeo", "translation", "images",
    "content_enrichment", "seo_optimization", "publishing"
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label>Feature</Label>
        <Select value={feature} onValueChange={setFeature}>
          <SelectTrigger>
            <SelectValue placeholder="Select feature" />
          </SelectTrigger>
          <SelectContent>
            {features.map((f) => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Action</Label>
        <Input value={action} onChange={(e) => setAction(e.target.value)} />
      </div>
      <div>
        <Label>Target Key (optional)</Label>
        <Input value={targetKey} onChange={(e) => setTargetKey(e.target.value)} />
      </div>

      {result && (
        <Alert className={cn(
          result.decision === "ALLOW" && "border-green-500",
          result.decision === "WARN" && "border-yellow-500",
          result.decision === "BLOCK" && "border-red-500",
        )}>
          <AlertTitle>
            Decision: <Badge variant={result.decision === "BLOCK" ? "destructive" : "default"}>
              {result.decision}
            </Badge>
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-2 text-sm">
              {result.reasons?.map((r: any, i: number) => (
                <li key={i}>{r.code}: {r.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button
          onClick={() => simulateMutation.mutate({ feature, action, targetKey: targetKey || undefined })}
          disabled={!feature || simulateMutation.isPending}
        >
          {simulateMutation.isPending ? "Simulating..." : "Run Simulation"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// Decision Log Component
function DecisionLog() {
  const { data } = useQuery<{ decisions: any[] }>({
    queryKey: ["/api/admin/autonomy/control-plane/decisions"],
    refetchInterval: REFRESH_INTERVAL,
  });

  if (!data?.decisions?.length) {
    return <p className="text-muted-foreground text-center py-8">No recent decisions</p>;
  }

  return (
    <ScrollArea className="h-96">
      {data.decisions.map((decision, i) => (
        <div key={i} className="border-b py-3 last:border-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                {decision.decision === "ALLOW" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {decision.decision === "WARN" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                {decision.decision === "BLOCK" && <XCircle className="h-4 w-4 text-red-500" />}
                <Badge variant={decision.decision === "BLOCK" ? "destructive" : "outline"}>
                  {decision.decision}
                </Badge>
                <span className="font-medium">{decision.feature || "unknown"}</span>
              </div>
              <p className="text-sm text-muted-foreground">{decision.targetKey}</p>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(decision.evaluatedAt).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </ScrollArea>
  );
}

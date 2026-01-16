/**
 * Production Change Management System (PCMS) Admin Dashboard
 *
 * "Terraform plan/apply" for contents & intelligence.
 * List plans, view diffs, approve, apply, and rollback changes.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  DashboardLayout,
  StatCard,
  AdminSection,
  AdminEmptyState,
  AdminTableSkeleton,
} from "@/components/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  GitBranch,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  Eye,
  RotateCcw,
  Zap,
  FileText,
  Shield,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

interface ChangePlan {
  id: string;
  name: string;
  description?: string;
  scope: string;
  status: string;
  riskLevel: string;
  createdAt: string;
  createdByUserId?: string;
  impactSummary?: {
    contentAffected: number;
    entitiesAffected: number;
    linksAffected: number;
    warnings: string[];
  };
  approvedAt?: string;
  approvedByUserId?: string;
}

interface ChangeStats {
  enabled: boolean;
  applyEnabled: boolean;
  rollbackEnabled: boolean;
  dryRunEnabled: boolean;
  totalPlans: number;
  byStatus: Record<string, number>;
  recentActivity: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText },
  submitted: { label: "Submitted", variant: "outline", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle },
  applying: { label: "Applying...", variant: "outline", icon: Loader2 },
  completed: { label: "Completed", variant: "default", icon: CheckCircle },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
  rolled_back: { label: "Rolled Back", variant: "secondary", icon: RotateCcw },
  cancelled: { label: "Cancelled", variant: "secondary", icon: XCircle },
};

const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-green-600" },
  medium: { label: "Medium", color: "text-yellow-600" },
  high: { label: "High", color: "text-orange-600" },
  critical: { label: "Critical", color: "text-red-600" },
};

export default function ChangeManagementDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<ChangePlan | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: "approve" | "apply" | "rollback" | "dryrun" | null;
    plan: ChangePlan | null;
  }>({ type: null, plan: null });
  const [notes, setNotes] = useState("");

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<ChangeStats>({
    queryKey: ["/api/admin/changes/stats"],
  });

  // Fetch plans
  const { data: plansData, isLoading: plansLoading } = useQuery<{ plans: ChangePlan[]; total: number }>({
    queryKey: ["/api/admin/changes"],
  });

  // Action mutations
  const approveMutation = useMutation({
    mutationFn: async ({ planId, notes }: { planId: string; notes?: string }) => {
      const res = await fetch(`/api/admin/changes/${planId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Approval failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Plan Approved", description: "The plan is now ready for execution." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/changes"] });
      setActionDialog({ type: null, plan: null });
    },
    onError: (err: Error) => {
      toast({ title: "Approval Failed", description: err.message, variant: "destructive" });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/admin/changes/${planId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ batchSize: 20 }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Apply failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Execution Started",
        description: data.executionId
          ? `Execution queued. ID: ${data.executionId}`
          : "Plan is being applied.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/changes"] });
      setActionDialog({ type: null, plan: null });
    },
    onError: (err: Error) => {
      toast({ title: "Execution Failed", description: err.message, variant: "destructive" });
    },
  });

  const dryRunMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/admin/changes/${planId}/dry-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Dry run failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Dry Run Complete",
        description: data.success
          ? `${data.changesWouldApply} changes would apply successfully.`
          : `Dry run found issues. Check the plan details.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/changes"] });
      setActionDialog({ type: null, plan: null });
    },
    onError: (err: Error) => {
      toast({ title: "Dry Run Failed", description: err.message, variant: "destructive" });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async ({ planId, reason }: { planId: string; reason?: string }) => {
      const res = await fetch(`/api/admin/changes/${planId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason, async: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Rollback failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Rollback Started",
        description: data.executionId
          ? `Rollback queued. ID: ${data.executionId}`
          : "Plan is being rolled back.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/changes"] });
      setActionDialog({ type: null, plan: null });
    },
    onError: (err: Error) => {
      toast({ title: "Rollback Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleAction = () => {
    if (!actionDialog.plan) return;

    switch (actionDialog.type) {
      case "approve":
        approveMutation.mutate({ planId: actionDialog.plan.id, notes });
        break;
      case "apply":
        applyMutation.mutate(actionDialog.plan.id);
        break;
      case "dryrun":
        dryRunMutation.mutate(actionDialog.plan.id);
        break;
      case "rollback":
        rollbackMutation.mutate({ planId: actionDialog.plan.id, reason: notes });
        break;
    }
  };

  const plans = plansData?.plans || [];

  return (
    <DashboardLayout
      title="Change Management"
      description="Production Change Management System - Safe, auditable, reversible bulk changes"
      icon={<GitBranch className="h-6 w-6" />}
    >
      {/* Feature Status */}
      {stats && !stats.enabled && (
        <Card className="bg-yellow-50 border-yellow-200 mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              <span>Change Management is disabled. Set ENABLE_CHANGE_MANAGEMENT=true to enable.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Plans"
          value={stats?.totalPlans || 0}
          icon={<GitBranch className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Pending Approval"
          value={stats?.byStatus?.submitted || 0}
          icon={<Clock className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Ready to Apply"
          value={stats?.byStatus?.approved || 0}
          icon={<Zap className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Recent Activity"
          value={stats?.recentActivity || 0}
          description="Last 24 hours"
          icon={<RefreshCw className="h-5 w-5" />}
          loading={statsLoading}
        />
      </div>

      {/* Feature Flags Status */}
      <AdminSection title="System Status" className="mb-6">
        <div className="flex flex-wrap gap-3">
          <Badge variant={stats?.enabled ? "default" : "secondary"}>
            PCMS: {stats?.enabled ? "Enabled" : "Disabled"}
          </Badge>
          <Badge variant={stats?.applyEnabled ? "default" : "secondary"}>
            Apply: {stats?.applyEnabled ? "Enabled" : "Disabled"}
          </Badge>
          <Badge variant={stats?.rollbackEnabled ? "default" : "secondary"}>
            Rollback: {stats?.rollbackEnabled ? "Enabled" : "Disabled"}
          </Badge>
          <Badge variant={stats?.dryRunEnabled ? "default" : "secondary"}>
            Dry-Run: {stats?.dryRunEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </AdminSection>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Change Plans</CardTitle>
          <CardDescription>
            Review, approve, and apply changes to your contents and intelligence systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Plans</TabsTrigger>
              <TabsTrigger value="pending">Pending Approval</TabsTrigger>
              <TabsTrigger value="approved">Ready to Apply</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <PlansTable
                plans={plans}
                loading={plansLoading}
                onViewPlan={(plan) => setSelectedPlan(plan)}
                onAction={(type, plan) => setActionDialog({ type, plan })}
                stats={stats}
              />
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              <PlansTable
                plans={plans.filter((p) => p.status === "submitted")}
                loading={plansLoading}
                onViewPlan={(plan) => setSelectedPlan(plan)}
                onAction={(type, plan) => setActionDialog({ type, plan })}
                stats={stats}
              />
            </TabsContent>

            <TabsContent value="approved" className="mt-4">
              <PlansTable
                plans={plans.filter((p) => p.status === "approved")}
                loading={plansLoading}
                onViewPlan={(plan) => setSelectedPlan(plan)}
                onAction={(type, plan) => setActionDialog({ type, plan })}
                stats={stats}
              />
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              <PlansTable
                plans={plans.filter((p) => ["completed", "failed", "rolled_back"].includes(p.status))}
                loading={plansLoading}
                onViewPlan={(plan) => setSelectedPlan(plan)}
                onAction={(type, plan) => setActionDialog({ type, plan })}
                stats={stats}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.type !== null}
        onOpenChange={(open) => !open && setActionDialog({ type: null, plan: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "approve" && "Approve Plan"}
              {actionDialog.type === "apply" && "Apply Plan"}
              {actionDialog.type === "dryrun" && "Run Dry-Run"}
              {actionDialog.type === "rollback" && "Rollback Plan"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === "approve" && "Approve this plan for execution."}
              {actionDialog.type === "apply" && "Apply all changes in this plan to production."}
              {actionDialog.type === "dryrun" && "Simulate execution without making changes."}
              {actionDialog.type === "rollback" && "Revert all applied changes from this plan."}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.plan && (
            <div className="py-4 space-y-4">
              <div>
                <span className="text-sm font-medium">Plan:</span>{" "}
                <span className="text-sm">{actionDialog.plan.name}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Scope:</span>{" "}
                <Badge variant="outline">{actionDialog.plan.scope}</Badge>
              </div>
              {actionDialog.plan.impactSummary && (
                <div>
                  <span className="text-sm font-medium">Impact:</span>{" "}
                  <span className="text-sm text-muted-foreground">
                    {actionDialog.plan.impactSummary.contentAffected} contents items,{" "}
                    {actionDialog.plan.impactSummary.entitiesAffected} entities
                  </span>
                </div>
              )}

              {(actionDialog.type === "approve" || actionDialog.type === "rollback") && (
                <div>
                  <label className="text-sm font-medium">
                    {actionDialog.type === "approve" ? "Approval Notes" : "Rollback Reason"}
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      actionDialog.type === "approve"
                        ? "Optional notes about this approval..."
                        : "Reason for rollback..."
                    }
                    className="mt-1"
                  />
                </div>
              )}

              {actionDialog.type === "apply" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-yellow-800 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>This will apply changes to production. Make sure you've run a dry-run first.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ type: null, plan: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={
                approveMutation.isPending ||
                applyMutation.isPending ||
                dryRunMutation.isPending ||
                rollbackMutation.isPending
              }
              variant={actionDialog.type === "rollback" ? "destructive" : "default"}
            >
              {(approveMutation.isPending ||
                applyMutation.isPending ||
                dryRunMutation.isPending ||
                rollbackMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionDialog.type === "approve" && "Approve"}
              {actionDialog.type === "apply" && "Apply Now"}
              {actionDialog.type === "dryrun" && "Run Dry-Run"}
              {actionDialog.type === "rollback" && "Rollback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Detail View (could be a slide-over or separate page) */}
      {selectedPlan && (
        <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedPlan.name}</DialogTitle>
              <DialogDescription>{selectedPlan.description}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Status:</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedPlan.status} />
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Risk Level:</span>
                  <div className={cn("mt-1", RISK_CONFIG[selectedPlan.riskLevel]?.color || "text-gray-600")}>
                    {RISK_CONFIG[selectedPlan.riskLevel]?.label || selectedPlan.riskLevel}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Scope:</span>
                  <div className="mt-1">
                    <Badge variant="outline">{selectedPlan.scope}</Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Created:</span>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {format(new Date(selectedPlan.createdAt), "PPp")}
                  </div>
                </div>
              </div>

              {selectedPlan.impactSummary && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Impact Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="py-3">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Content Affected</div>
                        <div className="text-lg font-semibold">{selectedPlan.impactSummary.contentAffected}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Entities Affected</div>
                        <div className="text-lg font-semibold">{selectedPlan.impactSummary.entitiesAffected}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Links Affected</div>
                        <div className="text-lg font-semibold">{selectedPlan.impactSummary.linksAffected}</div>
                      </div>
                    </div>
                    {selectedPlan.impactSummary.warnings?.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <div className="text-sm font-medium text-yellow-600">Warnings:</div>
                        {selectedPlan.impactSummary.warnings.map((warning, i) => (
                          <div key={i} className="text-sm text-yellow-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {warning}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPlan(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: "outline" as const, icon: Clock };
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className={cn("h-3 w-3", status === "applying" && "animate-spin")} />
      {config.label}
    </Badge>
  );
}

interface PlansTableProps {
  plans: ChangePlan[];
  loading: boolean;
  onViewPlan: (plan: ChangePlan) => void;
  onAction: (type: "approve" | "apply" | "dryrun" | "rollback", plan: ChangePlan) => void;
  stats?: ChangeStats;
}

function PlansTable({ plans, loading, onViewPlan, onAction, stats }: PlansTableProps) {
  if (loading) {
    return <AdminTableSkeleton rows={5} columns={6} />;
  }

  if (plans.length === 0) {
    return (
      <AdminEmptyState
        icon={<GitBranch className="h-12 w-12" />}
        title="No Change Plans"
        description="No change plans found. Plans are created by the Growth Engine, AI recommendations, or admin bulk operations."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plan</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Risk</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {plans.map((plan) => (
          <TableRow key={plan.id}>
            <TableCell>
              <div>
                <div className="font-medium">{plan.name}</div>
                {plan.description && (
                  <div className="text-sm text-muted-foreground line-clamp-1">{plan.description}</div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{plan.scope}</Badge>
            </TableCell>
            <TableCell>
              <StatusBadge status={plan.status} />
            </TableCell>
            <TableCell>
              <span className={RISK_CONFIG[plan.riskLevel]?.color || "text-gray-600"}>
                {RISK_CONFIG[plan.riskLevel]?.label || plan.riskLevel}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(plan.createdAt), { addSuffix: true })}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onViewPlan(plan)}>
                  <Eye className="h-4 w-4" />
                </Button>

                {/* Dry-run available for draft/submitted/approved */}
                {["draft", "submitted", "approved"].includes(plan.status) && stats?.dryRunEnabled && (
                  <Button variant="ghost" size="sm" onClick={() => onAction("dryrun", plan)}>
                    <Shield className="h-4 w-4" />
                  </Button>
                )}

                {/* Approve for submitted plans */}
                {plan.status === "submitted" && (
                  <Button variant="ghost" size="sm" onClick={() => onAction("approve", plan)}>
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                )}

                {/* Apply for approved plans */}
                {plan.status === "approved" && stats?.applyEnabled && (
                  <Button variant="ghost" size="sm" onClick={() => onAction("apply", plan)}>
                    <Play className="h-4 w-4" />
                  </Button>
                )}

                {/* Rollback for completed/failed plans */}
                {["completed", "failed"].includes(plan.status) && stats?.rollbackEnabled && (
                  <Button variant="ghost" size="sm" onClick={() => onAction("rollback", plan)}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

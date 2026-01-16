/**
 * SEO Engine Actions Queue
 *
 * Manages pending SEO actions with approval workflow.
 * Shows: pending approvals, execute/dry-run buttons, rollback functionality
 *
 * Feature flag: ENABLE_SEO_ENGINE
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout, StatCard, AdminSection } from "@/components/admin";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  History,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  TestTube,
  XCircle,
  Zap,
} from "lucide-react";

interface PendingAction {
  id: string;
  actionType: string;
  contentId: string;
  contentTitle?: string;
  status: "pending" | "approved" | "rejected" | "executed" | "rolled_back";
  requestedBy: string;
  requestedAt: string;
  reason?: string;
  dryRunResult?: DryRunResult;
  rollbackToken?: string;
  expiresAt?: string;
}

interface DryRunResult {
  success: boolean;
  changes: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  warnings: string[];
}

interface RollbackToken {
  token: string;
  actionId: string;
  contentId: string;
  actionType: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

interface ApprovalRequest {
  id: string;
  actionType: string;
  contentId: string;
  status: "pending" | "approved" | "rejected" | "expired";
  requestedBy: string;
  requestedAt: string;
  reason?: string;
}

export default function SeoEngineActionsQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAction, setSelectedAction] = useState<PendingAction | null>(null);
  const [dryRunDialogOpen, setDryRunDialogOpen] = useState(false);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [actionComment, setActionComment] = useState("");

  // Fetch pending approvals
  const { data: pendingApprovals, isLoading: approvalsLoading, refetch: refetchApprovals } = useQuery<ApprovalRequest[]>({
    queryKey: ["/api/seo-engine/governance/approvals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/seo-engine/governance/approvals");
      if (!res.ok) return [];
      const data = await res.json();
      return data.approvals || [];
    },
    retry: false,
  });

  // Fetch rollback tokens
  const { data: rollbackTokens, isLoading: tokensLoading, refetch: refetchTokens } = useQuery<RollbackToken[]>({
    queryKey: ["/api/seo-engine/governance/rollback-tokens"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/seo-engine/governance/rollback-tokens");
      if (!res.ok) return [];
      const data = await res.json();
      return data.tokens || [];
    },
    retry: false,
  });

  // Fetch pending pipeline actions
  const { data: pipelineActions, isLoading: pipelineLoading } = useQuery<PendingAction[]>({
    queryKey: ["/api/seo-engine/actions/pending"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/seo-engine/actions/pending");
      if (!res.ok) return [];
      const data = await res.json();
      return data.actions || [];
    },
    retry: false,
  });

  // Execute action mutation
  const executeMutation = useMutation({
    mutationFn: async ({ actionId, dryRun }: { actionId: string; dryRun: boolean }) => {
      const res = await apiRequest("POST", `/api/seo-engine/actions/${actionId}/execute`, {
        dryRun,
        comment: actionComment,
      });
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (variables.dryRun) {
        toast({
          title: "Dry Run Complete",
          description: data.success ? "No issues detected" : "Check warnings before executing",
        });
        setSelectedAction((prev) =>
          prev ? { ...prev, dryRunResult: data.result } : null
        );
      } else {
        toast({
          title: "Action Executed",
          description: "The SEO action has been executed successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/seo-engine/actions/pending"] });
        queryClient.invalidateQueries({ queryKey: ["/api/seo-engine/governance/rollback-tokens"] });
        setDryRunDialogOpen(false);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to execute action",
        variant: "destructive",
      });
    },
  });

  // Approve action mutation
  const approveMutation = useMutation({
    mutationFn: async (approvalId: string) => {
      const res = await apiRequest("POST", `/api/seo-engine/governance/approvals/${approvalId}/approve`, {
        comment: actionComment,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Approved",
        description: "The action has been approved",
      });
      refetchApprovals();
      setActionComment("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve",
        variant: "destructive",
      });
    },
  });

  // Reject action mutation
  const rejectMutation = useMutation({
    mutationFn: async (approvalId: string) => {
      const res = await apiRequest("POST", `/api/seo-engine/governance/approvals/${approvalId}/reject`, {
        comment: actionComment,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Rejected",
        description: "The action has been rejected",
      });
      refetchApprovals();
      setActionComment("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject",
        variant: "destructive",
      });
    },
  });

  // Rollback mutation
  const rollbackMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", `/api/seo-engine/governance/rollback`, {
        token,
        comment: actionComment,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Rolled Back",
        description: "The action has been successfully rolled back",
      });
      refetchTokens();
      setRollbackDialogOpen(false);
      setActionComment("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to rollback",
        variant: "destructive",
      });
    },
  });

  const filteredApprovals = (pendingApprovals || []).filter((item) => {
    const matchesSearch =
      item.actionType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contentId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "executed":
        return <Badge className="bg-blue-100 text-blue-800">Executed</Badge>;
      case "expired":
        return <Badge className="bg-gray-100 text-gray-800">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionTypeBadge = (type: string) => {
    const destructive = ["DELETE", "NOINDEX", "BLOCK"].some((t) => type.includes(t));
    return (
      <Badge variant={destructive ? "destructive" : "outline"}>
        {type.replace(/_/g, " ")}
      </Badge>
    );
  };

  const isLoading = approvalsLoading || tokensLoading || pipelineLoading;

  if (isLoading) {
    return (
      <DashboardLayout
        title="SEO Actions Queue"
        description="Manage pending SEO actions and approvals"
        stats={
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        }
      >
        <Skeleton className="h-96" />
      </DashboardLayout>
    );
  }

  const pendingCount = (pendingApprovals || []).filter((a) => a.status === "pending").length;
  const activeTokens = (rollbackTokens || []).filter((t) => !t.used).length;
  const pipelineCount = (pipelineActions || []).length;

  const statsSection = (
    <>
      <StatCard
        label="Pending Approvals"
        value={pendingCount}
        icon={<Clock className="w-4 h-4" />}
      />
      <StatCard
        label="Pipeline Queue"
        value={pipelineCount}
        icon={<Zap className="w-4 h-4" />}
      />
      <StatCard
        label="Rollback Tokens"
        value={activeTokens}
        icon={<RotateCcw className="w-4 h-4" />}
      />
      <StatCard
        label="Executed Today"
        value={0}
        icon={<CheckCircle2 className="w-4 h-4" />}
      />
    </>
  );

  const actionsSection = (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search actions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 w-48"
        />
      </div>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={() => { refetchApprovals(); refetchTokens(); }}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh
      </Button>
    </div>
  );

  return (
    <DashboardLayout
      title="SEO Actions Queue"
      description="Manage pending SEO actions and approvals"
      actions={actionsSection}
      stats={statsSection}
    >
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approvals
            {pendingCount > 0 && (
              <Badge className="ml-2" variant="secondary">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pipeline">
            Pipeline Queue
            {pipelineCount > 0 && (
              <Badge className="ml-2" variant="secondary">{pipelineCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rollback">
            Rollback Tokens
            {activeTokens > 0 && (
              <Badge className="ml-2" variant="secondary">{activeTokens}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approval Requests</CardTitle>
              <CardDescription>
                Review and approve or reject SEO actions that require authorization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApprovals.map((approval) => (
                      <TableRow key={approval.id}>
                        <TableCell>{getActionTypeBadge(approval.actionType)}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{approval.contentId.slice(0, 8)}...</span>
                        </TableCell>
                        <TableCell>{approval.requestedBy}</TableCell>
                        <TableCell>{getStatusBadge(approval.status)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(approval.requestedAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {approval.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => approveMutation.mutate(approval.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => rejectMutation.mutate(approval.id)}
                                  disabled={rejectMutation.isPending}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredApprovals.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Shield className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-muted-foreground">No pending approvals</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Action Queue</CardTitle>
              <CardDescription>
                Actions queued by the SEO pipeline for execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(pipelineActions || []).map((action) => (
                      <TableRow key={action.id}>
                        <TableCell>{getActionTypeBadge(action.actionType)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{action.contentTitle || "Unknown"}</p>
                            <p className="text-xs font-mono text-muted-foreground">
                              {action.contentId.slice(0, 8)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(action.status)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {action.reason || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAction(action);
                                setDryRunDialogOpen(true);
                              }}
                            >
                              <TestTube className="w-4 h-4 mr-1" />
                              Dry Run
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => executeMutation.mutate({ actionId: action.id, dryRun: false })}
                              disabled={executeMutation.isPending}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Execute
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(pipelineActions || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Zap className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-muted-foreground">No pending pipeline actions</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rollback" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Rollback Tokens</CardTitle>
              <CardDescription>
                Tokens that can be used to undo recent SEO actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rollbackTokens || []).map((token) => (
                      <TableRow key={token.token}>
                        <TableCell>{getActionTypeBadge(token.actionType)}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{token.contentId.slice(0, 8)}...</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(token.createdAt).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(token.expiresAt).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {token.used ? (
                            <Badge variant="secondary">Used</Badge>
                          ) : new Date(token.expiresAt) < new Date() ? (
                            <Badge variant="secondary">Expired</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!token.used && new Date(token.expiresAt) > new Date() && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedAction({
                                  id: token.actionId,
                                  actionType: token.actionType,
                                  contentId: token.contentId,
                                  status: "executed",
                                  requestedBy: "system",
                                  requestedAt: token.createdAt,
                                  rollbackToken: token.token,
                                });
                                setRollbackDialogOpen(true);
                              }}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Rollback
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(rollbackTokens || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <History className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-muted-foreground">No rollback tokens available</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dry Run Dialog */}
      <Dialog open={dryRunDialogOpen} onOpenChange={setDryRunDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dry Run Results</DialogTitle>
            <DialogDescription>
              Preview the changes this action will make
            </DialogDescription>
          </DialogHeader>
          {selectedAction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Action Type</label>
                  <p>{getActionTypeBadge(selectedAction.actionType)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Content ID</label>
                  <p className="font-mono text-sm">{selectedAction.contentId}</p>
                </div>
              </div>

              {selectedAction.dryRunResult ? (
                <>
                  <div className="p-3 rounded bg-muted">
                    <div className="flex items-center gap-2 mb-2">
                      {selectedAction.dryRunResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                      )}
                      <span className="font-medium">
                        {selectedAction.dryRunResult.success ? "Ready to Execute" : "Warnings Detected"}
                      </span>
                    </div>
                    {selectedAction.dryRunResult.warnings?.length > 0 && (
                      <ul className="text-sm text-yellow-600 space-y-1">
                        {selectedAction.dryRunResult.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Changes</label>
                    <div className="space-y-2">
                      {selectedAction.dryRunResult.changes?.map((change, i) => (
                        <div key={i} className="p-2 border rounded text-sm">
                          <span className="font-medium">{change.field}:</span>{" "}
                          <span className="text-red-600">{String(change.oldValue)}</span>
                          {" → "}
                          <span className="text-green-600">{String(change.newValue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <Button
                    onClick={() => executeMutation.mutate({ actionId: selectedAction.id, dryRun: true })}
                    disabled={executeMutation.isPending}
                  >
                    {executeMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <TestTube className="w-4 h-4 mr-2" />
                        Run Dry Run
                      </>
                    )}
                  </Button>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Comment (optional)</label>
                <Textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder="Add a note about this action..."
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDryRunDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAction) {
                  executeMutation.mutate({ actionId: selectedAction.id, dryRun: false });
                }
              }}
              disabled={executeMutation.isPending || !selectedAction?.dryRunResult?.success}
            >
              <Play className="w-4 h-4 mr-2" />
              Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Dialog */}
      <Dialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rollback</DialogTitle>
            <DialogDescription>
              This will undo the action and restore the previous state
            </DialogDescription>
          </DialogHeader>
          {selectedAction && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Warning: This action cannot be undone</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Action Type</label>
                  <p>{getActionTypeBadge(selectedAction.actionType)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Content ID</label>
                  <p className="font-mono text-sm">{selectedAction.contentId}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Reason for rollback</label>
                <Textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder="Why are you rolling back this action?"
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedAction?.rollbackToken) {
                  rollbackMutation.mutate(selectedAction.rollbackToken);
                }
              }}
              disabled={rollbackMutation.isPending}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Confirm Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

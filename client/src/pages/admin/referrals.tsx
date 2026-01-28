import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  Users,
  MousePointer2,
  DollarSign,
  TrendingUp,
  Settings,
  Trash2,
  Eye,
} from "lucide-react";

interface Partner {
  id: string;
  code: string;
  name: string;
  email: string;
  commissionRate: number;
  isActive: boolean;
  totalClicks: number;
  totalSignups: number;
  totalConversions: number;
  totalCommission: number;
  createdAt: string;
}

interface Click {
  id: string;
  ipAddress: string;
  landingPage: string;
  createdAt: string;
}

interface Conversion {
  id: string;
  email: string;
  status: string;
  createdAt: string;
}

export default function AdminReferrals() {
  const { toast } = useToast();
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [newCommissionRate, setNewCommissionRate] = useState(10);
  const [newIsActive, setNewIsActive] = useState(true);

  const { data: partners, isLoading } = useQuery<Partner[]>({
    queryKey: ["/api/referrals/admin"],
  });

  const { data: clicks } = useQuery<Click[]>({
    queryKey: ["/api/referrals/admin", selectedPartner?.code, "clicks"],
    queryFn: async () => {
      if (!selectedPartner) return [];
      const res = await fetch(`/api/referrals/admin/${selectedPartner.code}/clicks`);
      return res.json();
    },
    enabled: !!selectedPartner && detailsDialogOpen,
  });

  const { data: conversions } = useQuery<Conversion[]>({
    queryKey: ["/api/referrals/admin", selectedPartner?.code, "conversions"],
    queryFn: async () => {
      if (!selectedPartner) return [];
      const res = await fetch(`/api/referrals/admin/${selectedPartner.code}/conversions`);
      return res.json();
    },
    enabled: !!selectedPartner && detailsDialogOpen,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      code,
      commissionRate,
      isActive,
    }: {
      code: string;
      commissionRate: number;
      isActive: boolean;
    }) => {
      const res = await apiRequest("PATCH", `/api/referrals/admin/${code}`, {
        commissionRate,
        isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/admin"] });
      setEditDialogOpen(false);
      toast({ title: "Partner updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update partner", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      await apiRequest("DELETE", `/api/referrals/admin/${code}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/admin"] });
      toast({ title: "Partner deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete partner", variant: "destructive" });
    },
  });

  const openEditDialog = (partner: Partner) => {
    setSelectedPartner(partner);
    setNewCommissionRate(partner.commissionRate);
    setNewIsActive(partner.isActive);
    setEditDialogOpen(true);
  };

  const openDetailsDialog = (partner: Partner) => {
    setSelectedPartner(partner);
    setDetailsDialogOpen(true);
  };

  const totalStats = partners?.reduce(
    (acc, p) => ({
      clicks: acc.clicks + p.totalClicks,
      signups: acc.signups + p.totalSignups,
      conversions: acc.conversions + p.totalConversions,
      commission: acc.commission + p.totalCommission,
    }),
    { clicks: 0, signups: 0, conversions: 0, commission: 0 }
  ) || { clicks: 0, signups: 0, conversions: 0, commission: 0 };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
      <div className="border-b border-[hsl(var(--admin-border))] bg-white">
        <div className="px-6 py-4">
          <h1
            className="text-xl font-semibold text-[hsl(var(--admin-text))]"
            data-testid="text-page-title"
          >
            Referral Program
          </h1>
          <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1">
            Manage partners, view clicks, and track conversions.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-partners">
                    {partners?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Partners</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
                  <MousePointer2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-total-clicks">
                    {totalStats.clicks}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-[#6443F4]/10 dark:bg-[#6443F4]/20">
                  <TrendingUp className="h-5 w-5 text-[#6443F4] dark:text-[#6443F4]" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-total-conversions">
                    {totalStats.conversions}
                  </p>
                  <p className="text-sm text-muted-foreground">Conversions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                  <DollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-total-commission">
                    ${totalStats.commission.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Commission</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Partners Table */}
        <Card>
          <CardHeader>
            <CardTitle>Partners</CardTitle>
            <CardDescription>All registered referral partners</CardDescription>
          </CardHeader>
          <CardContent>
            {!partners || partners.length === 0 ? (
              <p className="text-center text-muted-foreground py-8" data-testid="text-empty-state">
                No partners registered yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Conversions</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map(partner => (
                    <TableRow key={partner.id} data-testid={`row-partner-${partner.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{partner.name}</p>
                          <p className="text-sm text-muted-foreground">{partner.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code
                          className="text-sm bg-muted px-2 py-1 rounded"
                          data-testid={`text-code-${partner.id}`}
                        >
                          {partner.code}
                        </code>
                      </TableCell>
                      <TableCell>{partner.commissionRate}%</TableCell>
                      <TableCell>{partner.totalClicks}</TableCell>
                      <TableCell>{partner.totalConversions}</TableCell>
                      <TableCell>${partner.totalCommission.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={partner.isActive ? "default" : "secondary"}>
                          {partner.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openDetailsDialog(partner)}
                            data-testid={`button-view-${partner.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(partner)}
                            data-testid={`button-edit-${partner.id}`}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Delete partner ${partner.name}?`)) {
                                deleteMutation.mutate(partner.code);
                              }
                            }}
                            data-testid={`button-delete-${partner.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Partner</DialogTitle>
              <DialogDescription>Update settings for {selectedPartner?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Commission Rate (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={newCommissionRate}
                  onChange={e => setNewCommissionRate(parseInt(e.target.value) || 0)}
                  data-testid="input-commission-rate"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Active</label>
                <Switch
                  checked={newIsActive}
                  onCheckedChange={setNewIsActive}
                  data-testid="switch-active"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedPartner) {
                    updateMutation.mutate({
                      code: selectedPartner.code,
                      commissionRate: newCommissionRate,
                      isActive: newIsActive,
                    });
                  }
                }}
                disabled={updateMutation.isPending}
                data-testid="button-save"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Partner Details: {selectedPartner?.name}</DialogTitle>
              <DialogDescription>
                View clicks and conversions for {selectedPartner?.code}
              </DialogDescription>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-4 py-4 max-h-[400px] overflow-y-auto">
              <div>
                <h4 className="font-medium mb-2">Recent Clicks</h4>
                {clicks && clicks.length > 0 ? (
                  <div className="space-y-2">
                    {clicks.slice(0, 10).map(click => (
                      <div
                        key={click.id}
                        className="text-sm p-2 bg-muted rounded"
                        data-testid={`detail-click-${click.id}`}
                      >
                        <p className="truncate">{click.landingPage || "/"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(click.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No clicks yet</p>
                )}
              </div>
              <div>
                <h4 className="font-medium mb-2">Conversions</h4>
                {conversions && conversions.length > 0 ? (
                  <div className="space-y-2">
                    {conversions.slice(0, 10).map(conv => (
                      <div
                        key={conv.id}
                        className="text-sm p-2 bg-muted rounded"
                        data-testid={`detail-conversion-${conv.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{conv.email || "Anonymous"}</span>
                          <Badge variant="outline">{conv.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(conv.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No conversions yet</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

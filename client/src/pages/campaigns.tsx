import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Mail, Send, Trash2, Edit, Eye, Clock, CheckCircle, AlertTriangle, FileText, Users, MousePointer, TrendingUp, XCircle } from "lucide-react";
import { Redirect } from "wouter";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";

type Campaign = {
  id: string;
  name: string;
  subject: string;
  previewText: string | null;
  htmlContent: string;
  status: CampaignStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  totalRecipients: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
};

const statusConfig: Record<CampaignStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle }> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText },
  scheduled: { label: "Scheduled", variant: "outline", icon: Clock },
  sending: { label: "Sending", variant: "default", icon: Send },
  sent: { label: "Sent", variant: "default", icon: CheckCircle },
  failed: { label: "Failed", variant: "destructive", icon: AlertTriangle },
};

const campaignFormSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  subject: z.string().min(1, "Subject line is required"),
  previewText: z.string().optional(),
  htmlContent: z.string().min(1, "Email contents is required"),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

export default function CampaignsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      subject: "",
      previewText: "",
      htmlContent: "",
    },
  });

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CampaignFormValues) => {
      return await apiRequest("POST", "/api/campaigns", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Campaign created",
        description: "Your campaign has been saved as a draft.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CampaignFormValues> }) => {
      return await apiRequest("PATCH", `/api/campaigns/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setEditingCampaign(null);
      form.reset();
      toast({
        title: "Campaign updated",
        description: "Your changes have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign deleted",
        description: "The campaign has been permanently removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/campaigns/${id}/send`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign sent",
        description: `Successfully sent to ${data.sent} subscribers${data.failed > 0 ? ` (${data.failed} failed)` : ""}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        campaign.name.toLowerCase().includes(searchLower) ||
        campaign.subject.toLowerCase().includes(searchLower);
      const matchesStatus = filterStatus === "all" || campaign.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchQuery, filterStatus]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: campaigns.length };
    for (const c of campaigns) {
      counts[c.status] = (counts[c.status] || 0) + 1;
    }
    return counts;
  }, [campaigns]);

  const aggregateStats = useMemo(() => {
    const sentCampaigns = campaigns.filter(c => c.status === "sent" || c.status === "sending");
    const totalSent = sentCampaigns.reduce((sum, c) => sum + c.totalSent, 0);
    const totalOpened = sentCampaigns.reduce((sum, c) => sum + c.totalOpened, 0);
    const totalClicked = sentCampaigns.reduce((sum, c) => sum + c.totalClicked, 0);
    const totalBounced = sentCampaigns.reduce((sum, c) => sum + c.totalBounced, 0);
    const totalUnsubscribed = sentCampaigns.reduce((sum, c) => sum + c.totalUnsubscribed, 0);
    
    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
    
    return {
      totalSent,
      totalOpened,
      totalClicked,
      totalBounced,
      totalUnsubscribed,
      openRate: openRate.toFixed(1),
      clickRate: clickRate.toFixed(1),
      bounceRate: bounceRate.toFixed(1),
      campaignsSent: sentCampaigns.length,
    };
  }, [campaigns]);

  const onSubmit = (values: CampaignFormValues) => {
    if (editingCampaign) {
      updateMutation.mutate({ id: editingCampaign.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const openEditDialog = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    form.reset({
      name: campaign.name,
      subject: campaign.subject,
      previewText: campaign.previewText || "",
      htmlContent: campaign.htmlContent,
    });
  };

  const closeDialog = () => {
    setIsCreateOpen(false);
    setEditingCampaign(null);
    form.reset();
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect to="/login" />;
  }

  const isDialogOpen = isCreateOpen || !!editingCampaign;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Email Campaigns</h1>
          <p className="text-muted-foreground">
            Create and manage newsletter campaigns
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1.5">
            <Mail className="w-4 h-4 mr-2" />
            {campaigns.length} campaigns
          </Badge>
          <Badge variant="default" className="px-3 py-1.5">
            {statusCounts.sent || 0} sent
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5">
            {statusCounts.draft || 0} drafts
          </Badge>
        </div>
      </div>

      {aggregateStats.campaignsSent > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Sent</p>
                  <p className="text-2xl font-semibold" data-testid="stat-total-sent">
                    {aggregateStats.totalSent.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-500/10">
                  <Eye className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                  <p className="text-2xl font-semibold" data-testid="stat-open-rate">
                    {aggregateStats.openRate}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {aggregateStats.totalOpened.toLocaleString()} opens
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-500/10">
                  <MousePointer className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Click Rate</p>
                  <p className="text-2xl font-semibold" data-testid="stat-click-rate">
                    {aggregateStats.clickRate}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {aggregateStats.totalClicked.toLocaleString()} clicks
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-red-500/10">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bounce Rate</p>
                  <p className="text-2xl font-semibold" data-testid="stat-bounce-rate">
                    {aggregateStats.bounceRate}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {aggregateStats.totalBounced.toLocaleString()} bounced
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle>All Campaigns</CardTitle>
            <CardDescription>
              View and manage your email campaigns
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-campaign">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCampaign ? "Edit Campaign" : "Create Campaign"}
                </DialogTitle>
                <DialogDescription>
                  {editingCampaign 
                    ? "Update your email campaign details." 
                    : "Create a new email campaign. It will be saved as a draft."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., December Newsletter" 
                            {...field} 
                            data-testid="input-campaign-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject Line</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Discover Dubai's Hidden Gems" 
                            {...field} 
                            data-testid="input-campaign-subject"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="previewText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preview Text (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Brief preview shown in email clients" 
                            {...field} 
                            data-testid="input-campaign-preview"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="htmlContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Content (HTML)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Paste your HTML email contents here..." 
                            className="min-h-[200px] font-mono text-sm"
                            {...field} 
                            data-testid="input-campaign-contents"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={closeDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending} data-testid="button-save-campaign">
                      {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingCampaign ? "Save Changes" : "Create Campaign"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-4"
                data-testid="input-search-campaigns"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses ({statusCounts.all})</SelectItem>
                <SelectItem value="draft">Draft ({statusCounts.draft || 0})</SelectItem>
                <SelectItem value="scheduled">Scheduled ({statusCounts.scheduled || 0})</SelectItem>
                <SelectItem value="sending">Sending ({statusCounts.sending || 0})</SelectItem>
                <SelectItem value="sent">Sent ({statusCounts.sent || 0})</SelectItem>
                <SelectItem value="failed">Failed ({statusCounts.failed || 0})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No campaigns found</p>
              <p className="text-sm">
                {campaigns.length === 0 
                  ? "Create your first email campaign to get started." 
                  : "Try adjusting your search or filter."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stats</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => {
                    const config = statusConfig[campaign.status];
                    const StatusIcon = config.icon;
                    const openRate = campaign.totalSent > 0 
                      ? ((campaign.totalOpened / campaign.totalSent) * 100).toFixed(1)
                      : "0";
                    const clickRate = campaign.totalOpened > 0
                      ? ((campaign.totalClicked / campaign.totalOpened) * 100).toFixed(1)
                      : "0";

                    return (
                      <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                              {campaign.subject}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.variant}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {campaign.status === "sent" || campaign.status === "sending" ? (
                            <div className="text-sm">
                              <p>{campaign.totalSent} sent</p>
                              <p className="text-muted-foreground">
                                {openRate}% opened, {clickRate}% clicked
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(campaign.createdAt), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(campaign.status === "draft" || campaign.status === "failed") && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={sendMutation.isPending}
                                    data-testid={`button-send-campaign-${campaign.id}`}
                                  >
                                    {sendMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Send className="w-4 h-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Send Campaign</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to send "{campaign.name}" to all active subscribers? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => sendMutation.mutate(campaign.id)}
                                    >
                                      Send Now
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(campaign)}
                              disabled={campaign.status === "sending" || campaign.status === "sent"}
                              data-testid={`button-edit-campaign-${campaign.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={campaign.status === "sending"}
                                  data-testid={`button-delete-campaign-${campaign.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{campaign.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(campaign.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

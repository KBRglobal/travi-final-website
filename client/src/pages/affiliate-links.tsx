import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Link2, Trash2, ExternalLink, Copy, Pencil, TrendingUp, DollarSign, MousePointerClick, AlertCircle } from "lucide-react";
import type { AffiliateLink, Content } from "@shared/schema";

const PROVIDERS = [
  { value: "getyourguide", label: "GetYourGuide", description: "Tours & Activities" },
  { value: "booking", label: "Booking.com", description: "Hotels & Stays" },
  { value: "viator", label: "Viator", description: "Experiences" },
  { value: "klook", label: "Klook", description: "Activities & Transport" },
  { value: "tripadvisor", label: "TripAdvisor", description: "Reviews & Bookings" },
  { value: "expedia", label: "Expedia", description: "Travel Packages" },
  { value: "airbnb", label: "Airbnb", description: "Unique Stays" },
  { value: "amazon", label: "Amazon", description: "Products & Guides" },
  { value: "custom", label: "Custom", description: "Other Partners" },
];

const PLACEMENTS = [
  { value: "hero", label: "Hero Section" },
  { value: "sidebar", label: "Sidebar" },
  { value: "inline", label: "Inline Content" },
  { value: "footer", label: "Footer" },
  { value: "cta", label: "CTA Block" },
  { value: "auto", label: "Auto Injection" },
];

interface LinkFormData {
  provider: string;
  anchor: string;
  url: string;
  productId: string;
  placement: string;
  contentId: string;
}

const initialFormData: LinkFormData = {
  provider: "",
  anchor: "",
  url: "",
  productId: "",
  placement: "",
  contentId: "global",
};

export default function AffiliateLinks() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<AffiliateLink | null>(null);
  const [formData, setFormData] = useState<LinkFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState("all");

  const { data: links, isLoading } = useQuery<AffiliateLink[]>({
    queryKey: ["/api/affiliate-links"],
  });

  const { data: contentsData } = useQuery<{ contents: Content[] }>({
    queryKey: ["/api/contents"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<LinkFormData>) =>
      apiRequest("POST", "/api/affiliate-links", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate-links"] });
      closeDialog();
      toast({ title: "Affiliate link added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add affiliate link", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LinkFormData> }) =>
      apiRequest("PATCH", `/api/affiliate-links/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate-links"] });
      closeDialog();
      toast({ title: "Affiliate link updated" });
    },
    onError: () => {
      toast({ title: "Failed to update affiliate link", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/affiliate-links/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate-links"] });
      toast({ title: "Affiliate link deleted" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingLink(null);
    setFormData(initialFormData);
  };

  const openEditDialog = (link: AffiliateLink) => {
    setEditingLink(link);
    setFormData({
      provider: link.provider,
      anchor: link.anchor,
      url: link.url,
      productId: link.productId || "",
      placement: link.placement || "",
      contentId: link.contentId || "global",
    });
    setDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const handleSubmit = () => {
    if (!formData.provider || !formData.anchor || !formData.url) return;
    
    const data = {
      provider: formData.provider,
      anchor: formData.anchor,
      url: formData.url,
      productId: formData.productId || undefined,
      placement: formData.placement || undefined,
      contentId: formData.contentId === "global" ? undefined : formData.contentId || undefined,
    };

    if (editingLink) {
      updateMutation.mutate({ id: editingLink.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + "...";
  };

  const getProviderLabel = (provider: string) => {
    return PROVIDERS.find(p => p.value === provider)?.label || provider;
  };

  const getPlacementLabel = (placement: string | null) => {
    if (!placement) return null;
    return PLACEMENTS.find(p => p.value === placement)?.label || placement;
  };

  const filteredLinks = links?.filter(link => {
    if (activeTab === "all") return true;
    return link.provider === activeTab;
  }) || [];

  const providerCounts = links?.reduce((acc, link) => {
    acc[link.provider] = (acc[link.provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Affiliate Links</h1>
          <p className="text-muted-foreground">Manage affiliate partnerships and track monetization</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (!open) closeDialog();
          else setDialogOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-link">
              <Plus className="h-4 w-4 mr-2" />
              Add Link
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingLink ? "Edit Affiliate Link" : "Add Affiliate Link"}</DialogTitle>
              <DialogDescription>
                {editingLink 
                  ? "Update the affiliate link details below."
                  : "Create a new affiliate link for contents monetization."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="link-provider">Provider</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value }))}
                >
                  <SelectTrigger data-testid="select-provider">
                    <SelectValue placeholder="Select affiliate provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        <div className="flex flex-col">
                          <span>{provider.label}</span>
                          <span className="text-xs text-muted-foreground">{provider.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-anchor">Anchor Text</Label>
                <Input
                  id="link-anchor"
                  value={formData.anchor}
                  onChange={(e) => setFormData(prev => ({ ...prev, anchor: e.target.value }))}
                  placeholder="e.g., Book tickets now, Get exclusive discount"
                  data-testid="input-link-anchor"
                />
                <p className="text-xs text-muted-foreground">Text that will be displayed as the clickable link</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-url">Affiliate URL</Label>
                <Input
                  id="link-url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://partner.com/your-tracking-id"
                  data-testid="input-link-url"
                />
                <p className="text-xs text-muted-foreground">Full URL with your affiliate tracking code</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="link-product-id">Product/Activity ID</Label>
                  <Input
                    id="link-product-id"
                    value={formData.productId}
                    onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                    placeholder="Optional"
                    data-testid="input-link-product-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link-placement">Placement</Label>
                  <Select
                    value={formData.placement}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, placement: value }))}
                  >
                    <SelectTrigger data-testid="select-placement">
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLACEMENTS.map((placement) => (
                        <SelectItem key={placement.value} value={placement.value}>
                          {placement.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-contents">Link to Content (Optional)</Label>
                <Select
                  value={formData.contentId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, contentId: value }))}
                >
                  <SelectTrigger data-testid="select-contents">
                    <SelectValue placeholder="Global (not linked to specific contents)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    {contentsData?.contents?.slice(0, 50).map((contents) => (
                      <SelectItem key={contents.id} value={contents.id}>
                        {contents.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Optionally link to specific contents for targeted placement</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.provider || !formData.anchor || !formData.url || createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-link"
              >
                {editingLink ? "Update Link" : "Add Link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{links?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active affiliate links</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Providers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(providerCounts).length}</div>
            <p className="text-xs text-muted-foreground">Partner platforms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Tracking</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <span className="text-sm text-muted-foreground">Coming Soon</span>
            </div>
            <p className="text-xs text-muted-foreground">Analytics integration pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <span className="text-sm text-muted-foreground">Coming Soon</span>
            </div>
            <p className="text-xs text-muted-foreground">Revenue tracking pending</p>
          </CardContent>
        </Card>
      </div>

      {!links || links.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No affiliate links"
          description="Add affiliate links to track and manage your monetization partners. Links will be automatically injected into matching contents."
          actionLabel="Add Your First Link"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Affiliate Links</CardTitle>
            <CardDescription>
              Manage your affiliate partnerships. Links are automatically matched to contents based on keywords.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 flex-wrap h-auto gap-1">
                <TabsTrigger value="all">
                  All ({links.length})
                </TabsTrigger>
                {Object.entries(providerCounts).map(([provider, count]) => (
                  <TabsTrigger key={provider} value={provider}>
                    {getProviderLabel(provider)} ({count})
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={activeTab}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Anchor Text</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Placement</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLinks.map((link) => (
                      <TableRow key={link.id} data-testid={`row-link-${link.id}`}>
                        <TableCell>
                          <Badge variant="secondary">
                            {getProviderLabel(link.provider)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {link.anchor}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[250px]">
                          <span title={link.url}>{truncateUrl(link.url)}</span>
                        </TableCell>
                        <TableCell>
                          {getPlacementLabel(link.placement) ? (
                            <Badge variant="outline">{getPlacementLabel(link.placement)}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(link)}
                              data-testid={`button-edit-${link.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(link.url)}
                              data-testid={`button-copy-${link.id}`}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" asChild>
                              <a href={link.url} target="_blank" rel="noopener noreferrer" data-testid={`link-open-${link.id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(link.id)}
                              data-testid={`button-delete-${link.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How Affiliate Links Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium">1. Add Your Links</h4>
              <p className="text-sm text-muted-foreground">
                Add affiliate links from your partner platforms (GetYourGuide, Booking.com, etc.) with tracking codes.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">2. Automatic Matching</h4>
              <p className="text-sm text-muted-foreground">
                Links are automatically matched to contents based on keywords and placement settings.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">3. Track Performance</h4>
              <p className="text-sm text-muted-foreground">
                Monitor clicks and conversions through your partner dashboards (analytics coming soon).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

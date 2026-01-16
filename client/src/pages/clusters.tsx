import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, Edit2, Network, FileText, Link, ChevronDown, ChevronUp, X } from "lucide-react";
import type { ContentCluster, Content } from "@shared/schema";

interface ClusterWithMembers extends ContentCluster {
  pillarContent?: Content | null;
  members?: Array<{
    id: string;
    contentId: string;
    position: number;
    contents?: Content;
  }>;
}

const clusterColors = [
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "purple", label: "Purple", class: "bg-[#6443F4]" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "pink", label: "Pink", class: "bg-[#6443F4]" },
  { value: "teal", label: "Teal", class: "bg-teal-500" },
];

export default function ClustersPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<ClusterWithMembers | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [color, setColor] = useState("blue");
  const [pillarContentId, setPillarContentId] = useState<string>("");
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string>("");

  const { data: clusters, isLoading } = useQuery<ClusterWithMembers[]>({
    queryKey: ["/api/clusters"],
  });

  const { data: allContent } = useQuery<Content[]>({
    queryKey: ["/api/contents"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/clusters", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clusters"] });
      resetForm();
      toast({ title: "Cluster created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create cluster", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/clusters/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clusters"] });
      resetForm();
      toast({ title: "Cluster updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update cluster", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/clusters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clusters"] });
      toast({ title: "Cluster deleted" });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ clusterId, contentId }: { clusterId: string; contentId: string }) =>
      apiRequest("POST", `/api/clusters/${clusterId}/members`, { contentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clusters"] });
      setAddMemberDialogOpen(false);
      setSelectedContentId("");
      toast({ title: "Content added to cluster" });
    },
    onError: () => {
      toast({ title: "Failed to add contents to cluster", variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ clusterId, memberId }: { clusterId: string; memberId: string }) =>
      apiRequest("DELETE", `/api/clusters/${clusterId}/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clusters"] });
      toast({ title: "Content removed from cluster" });
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditingCluster(null);
    setName("");
    setSlug("");
    setDescription("");
    setPrimaryKeyword("");
    setColor("blue");
    setPillarContentId("");
  };

  const openEditDialog = (cluster: ClusterWithMembers) => {
    setEditingCluster(cluster);
    setName(cluster.name);
    setSlug(cluster.slug);
    setDescription(cluster.description || "");
    setPrimaryKeyword(cluster.primaryKeyword || "");
    setColor(cluster.color || "blue");
    setPillarContentId(cluster.pillarContentId || "");
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!name || !slug) return;
    const data = {
      name,
      slug: slug.toLowerCase().replace(/\s+/g, "-"),
      description: description || null,
      primaryKeyword: primaryKeyword || null,
      color: color || null,
      pillarContentId: pillarContentId || null,
    };

    if (editingCluster) {
      updateMutation.mutate({ id: editingCluster.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const generateSlug = () => {
    if (name && !slug) {
      setSlug(name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
    }
  };

  const getColorClass = (colorValue: string | null) => {
    const found = clusterColors.find(c => c.value === colorValue);
    return found?.class || "bg-gray-500";
  };

  const publishedContent = allContent?.filter(c => c.status === "published") || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const totalClusters = clusters?.length || 0;
  const totalMembers = clusters?.reduce((sum, c) => sum + (c.members?.length || 0), 0) || 0;
  const clustersWithPillar = clusters?.filter(c => c.pillarContentId).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Content Clusters</h1>
          <p className="text-muted-foreground">Organize contents into topic clusters with pillar pages</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-cluster">
              <Plus className="h-4 w-4 mr-2" />
              New Cluster
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCluster ? "Edit Cluster" : "Create Cluster"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="cluster-name">Cluster Name</Label>
                <Input
                  id="cluster-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={generateSlug}
                  placeholder="e.g., Dubai Attractions Guide"
                  data-testid="input-cluster-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cluster-slug">URL Slug</Label>
                <Input
                  id="cluster-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g., dubai-attractions-guide"
                  data-testid="input-cluster-slug"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cluster-description">Description</Label>
                <Textarea
                  id="cluster-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this topic cluster..."
                  rows={2}
                  data-testid="input-cluster-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cluster-keyword">Primary Keyword</Label>
                <Input
                  id="cluster-keyword"
                  value={primaryKeyword}
                  onChange={(e) => setPrimaryKeyword(e.target.value)}
                  placeholder="e.g., things to do in dubai"
                  data-testid="input-cluster-keyword"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cluster-color">Color</Label>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger data-testid="select-cluster-color">
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      {clusterColors.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${c.class}`} />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cluster-pillar">Pillar Page</Label>
                  <Select value={pillarContentId} onValueChange={setPillarContentId}>
                    <SelectTrigger data-testid="select-cluster-pillar">
                      <SelectValue placeholder="Select contents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No pillar page</SelectItem>
                      {publishedContent.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!name || !slug || createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-cluster"
              >
                {editingCluster ? "Update" : "Create"} Cluster
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Network className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalClusters}</p>
                <p className="text-sm text-muted-foreground">Total Clusters</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <FileText className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalMembers}</p>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Link className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clustersWithPillar}</p>
                <p className="text-sm text-muted-foreground">With Pillar Pages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!clusters || clusters.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No clusters found"
          description="Create topic clusters to organize related contents and improve SEO."
          actionLabel="Create Your First Cluster"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {clusters.map((cluster) => (
            <Card key={cluster.id} data-testid={`card-cluster-${cluster.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${getColorClass(cluster.color)}`} />
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-base">{cluster.name}</CardTitle>
                    {cluster.description && (
                      <CardDescription className="line-clamp-1">{cluster.description}</CardDescription>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {cluster.primaryKeyword && (
                        <Badge variant="secondary" className="text-xs">
                          {cluster.primaryKeyword}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {cluster.members?.length || 0} members
                      </Badge>
                      {cluster.pillarContent && (
                        <Badge className="text-xs">
                          Pillar: {cluster.pillarContent.title}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setExpandedCluster(expandedCluster === cluster.id ? null : cluster.id)}
                    data-testid={`button-expand-${cluster.id}`}
                  >
                    {expandedCluster === cluster.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(cluster)}
                    data-testid={`button-edit-${cluster.id}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(cluster.id)}
                    data-testid={`button-delete-${cluster.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              {expandedCluster === cluster.id && (
                <CardContent className="pt-0">
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Cluster Members</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedClusterId(cluster.id);
                          setAddMemberDialogOpen(true);
                        }}
                        data-testid={`button-add-member-${cluster.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Content
                      </Button>
                    </div>
                    {cluster.members && cluster.members.length > 0 ? (
                      <div className="space-y-2">
                        {cluster.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                            data-testid={`member-${member.id}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs text-muted-foreground">#{member.position + 1}</span>
                              <span className="text-sm truncate">{member.contents?.title || "Unknown contents"}</span>
                              {member.contents?.type && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {member.contents.type}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMemberMutation.mutate({ clusterId: cluster.id, memberId: member.id })}
                              data-testid={`button-remove-member-${member.id}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No contents added to this cluster yet.</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Content to Cluster</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="member-contents">Select Content</Label>
            <Select value={selectedContentId} onValueChange={setSelectedContentId}>
              <SelectTrigger data-testid="select-member-contents">
                <SelectValue placeholder="Choose contents to add" />
              </SelectTrigger>
              <SelectContent>
                {publishedContent
                  .filter(c => {
                    const currentCluster = clusters?.find(cl => cl.id === selectedClusterId);
                    return !currentCluster?.members?.some(m => m.contentId === c.id);
                  })
                  .map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span>{c.title}</span>
                        <Badge variant="outline" className="text-xs">{c.type}</Badge>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedClusterId && selectedContentId) {
                  addMemberMutation.mutate({ clusterId: selectedClusterId, contentId: selectedContentId });
                }
              }}
              disabled={!selectedContentId || addMemberMutation.isPending}
              data-testid="button-confirm-add-member"
            >
              Add to Cluster
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

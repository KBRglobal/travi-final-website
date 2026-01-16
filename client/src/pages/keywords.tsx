import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, Trash2, Edit2, TrendingUp, BarChart3 } from "lucide-react";
import type { KeywordRepository } from "@shared/schema";

const keywordTypes = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "long-tail", label: "Long-tail" },
  { value: "local", label: "Local" },
  { value: "branded", label: "Branded" },
];

const competitionLevels = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export default function KeywordsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<KeywordRepository | null>(null);
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("primary");
  const [category, setCategory] = useState("");
  const [searchVolume, setSearchVolume] = useState("");
  const [competition, setCompetition] = useState("");
  const [relatedKeywords, setRelatedKeywords] = useState("");
  const [priority, setPriority] = useState("0");
  const [notes, setNotes] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  const queryParams = new URLSearchParams();
  if (filterType) queryParams.append("type", filterType);
  if (filterCategory) queryParams.append("category", filterCategory);
  const queryString = queryParams.toString();

  const { data: keywords, isLoading } = useQuery<KeywordRepository[]>({
    queryKey: ["/api/keywords", queryString],
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/keywords", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keywords"] });
      resetForm();
      toast({ title: "Keyword created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create keyword", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/keywords/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keywords"] });
      resetForm();
      toast({ title: "Keyword updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update keyword", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/keywords/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keywords"] });
      toast({ title: "Keyword deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/keywords/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keywords"] });
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditingKeyword(null);
    setKeyword("");
    setType("primary");
    setCategory("");
    setSearchVolume("");
    setCompetition("");
    setRelatedKeywords("");
    setPriority("0");
    setNotes("");
  };

  const openEditDialog = (kw: KeywordRepository) => {
    setEditingKeyword(kw);
    setKeyword(kw.keyword);
    setType(kw.type);
    setCategory(kw.category || "");
    setSearchVolume(kw.searchVolume || "");
    setCompetition(kw.competition || "");
    setRelatedKeywords(kw.relatedKeywords?.join(", ") || "");
    setPriority(String(kw.priority || 0));
    setNotes(kw.notes || "");
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!keyword || !type) return;
    const data = {
      keyword,
      type,
      category: category || null,
      searchVolume: searchVolume || null,
      competition: competition || null,
      relatedKeywords: relatedKeywords.split(",").map(k => k.trim()).filter(Boolean),
      priority: parseInt(priority) || 0,
      notes: notes || null,
    };

    if (editingKeyword) {
      updateMutation.mutate({ id: editingKeyword.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getCompetitionColor = (comp: string | null) => {
    if (!comp) return "secondary";
    if (comp === "low") return "default";
    if (comp === "high") return "destructive";
    return "secondary";
  };

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

  const totalKeywords = keywords?.length || 0;
  const activeKeywords = keywords?.filter(k => k.isActive).length || 0;
  const totalUsage = keywords?.reduce((sum, k) => sum + (k.usageCount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Keyword Repository</h1>
          <p className="text-muted-foreground">SEO Bible - manage target keywords for contents optimization</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-keyword">
              <Plus className="h-4 w-4 mr-2" />
              Add Keyword
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingKeyword ? "Edit Keyword" : "Add Keyword"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="keyword-text">Keyword</Label>
                <Input
                  id="keyword-text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g., best hotels in dubai"
                  data-testid="input-keyword"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="keyword-type">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger data-testid="select-keyword-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {keywordTypes.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keyword-category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger data-testid="select-keyword-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attractions">Attractions</SelectItem>
                      <SelectItem value="hotels">Hotels</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="events">Events</SelectItem>
                      <SelectItem value="tips">Tips</SelectItem>
                      <SelectItem value="shopping">Shopping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="keyword-volume">Search Volume</Label>
                  <Input
                    id="keyword-volume"
                    value={searchVolume}
                    onChange={(e) => setSearchVolume(e.target.value)}
                    placeholder="e.g., 10K-100K"
                    data-testid="input-search-volume"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keyword-competition">Competition</Label>
                  <Select value={competition} onValueChange={setCompetition}>
                    <SelectTrigger data-testid="select-competition">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {competitionLevels.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyword-related">Related Keywords (comma-separated)</Label>
                <Input
                  id="keyword-related"
                  value={relatedKeywords}
                  onChange={(e) => setRelatedKeywords(e.target.value)}
                  placeholder="e.g., luxury hotels dubai, 5 star hotels"
                  data-testid="input-related-keywords"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyword-priority">Priority</Label>
                <Input
                  id="keyword-priority"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  placeholder="0"
                  data-testid="input-keyword-priority"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyword-notes">Notes</Label>
                <Textarea
                  id="keyword-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this keyword..."
                  rows={2}
                  data-testid="input-keyword-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!keyword || !type || createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-keyword"
              >
                {editingKeyword ? "Update" : "Add"} Keyword
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
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalKeywords}</p>
                <p className="text-sm text-muted-foreground">Total Keywords</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeKeywords}</p>
                <p className="text-sm text-muted-foreground">Active Keywords</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsage}</p>
                <p className="text-sm text-muted-foreground">Total Usage</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40" data-testid="filter-type">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {keywordTypes.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40" data-testid="filter-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="attractions">Attractions</SelectItem>
            <SelectItem value="hotels">Hotels</SelectItem>
            <SelectItem value="food">Food</SelectItem>
            <SelectItem value="transport">Transport</SelectItem>
            <SelectItem value="events">Events</SelectItem>
            <SelectItem value="tips">Tips</SelectItem>
            <SelectItem value="shopping">Shopping</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!keywords || keywords.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No keywords found"
          description="Add SEO keywords to help optimize your contents for search engines."
          actionLabel="Add Your First Keyword"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {keywords.map((kw) => (
            <Card key={kw.id} data-testid={`card-keyword-${kw.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="space-y-1 min-w-0 flex-1">
                  <CardTitle className="text-base">{kw.keyword}</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {kw.type}
                    </Badge>
                    {kw.category && (
                      <Badge variant="outline" className="text-xs">
                        {kw.category}
                      </Badge>
                    )}
                    {kw.competition && (
                      <Badge variant={getCompetitionColor(kw.competition)} className="text-xs capitalize">
                        {kw.competition}
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  checked={kw.isActive ?? false}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ id: kw.id, isActive: checked })
                  }
                  data-testid={`switch-active-${kw.id}`}
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  {kw.searchVolume && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <BarChart3 className="h-3 w-3" />
                      {kw.searchVolume}
                    </div>
                  )}
                  {kw.priority !== null && kw.priority > 0 && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      Priority: {kw.priority}
                    </div>
                  )}
                </div>
                {kw.relatedKeywords && kw.relatedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {kw.relatedKeywords.slice(0, 3).map((rk, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {rk}
                      </Badge>
                    ))}
                    {kw.relatedKeywords.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{kw.relatedKeywords.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Used {kw.usageCount || 0} time{(kw.usageCount || 0) !== 1 ? "s" : ""}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(kw)}
                    data-testid={`button-edit-${kw.id}`}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(kw.id)}
                    data-testid={`button-delete-${kw.id}`}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

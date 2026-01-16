import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Lightbulb, Trash2, Edit2, TrendingUp, Clock, Sparkles, Loader2, Newspaper, Merge } from "lucide-react";
import type { TopicBank } from "@shared/schema";

type TopicCategory = "attractions" | "hotels" | "food" | "transport" | "events" | "tips" | "shopping" | "news";

export default function TopicBankPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicBank | null>(null);
  const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null);
  const [generatingNewsId, setGeneratingNewsId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TopicCategory | "">("");
  const [keywords, setKeywords] = useState("");
  const [outline, setOutline] = useState("");
  const [priority, setPriority] = useState("0");

  const { data: topics, isLoading } = useQuery<TopicBank[]>({
    queryKey: ["/api/topic-bank"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/topic-bank", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topic-bank"] });
      resetForm();
      toast({ title: "Topic created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create topic", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/topic-bank/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topic-bank"] });
      resetForm();
      toast({ title: "Topic updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update topic", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/topic-bank/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topic-bank"] });
      toast({ title: "Topic deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/topic-bank/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topic-bank"] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (id: string) => {
      setGeneratingTopicId(id);
      const response = await apiRequest("POST", `/api/topic-bank/${id}/generate`);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratingTopicId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/topic-bank"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contents?type=article"] });
      toast({
        title: "Article Generated",
        description: `Created draft article: ${data.contents?.title}`
      });
      // Navigate to the editor to view/edit the generated article
      if (data.contents?.id) {
        navigate(`/admin/articles/${data.contents.id}`);
      }
    },
    onError: () => {
      setGeneratingTopicId(null);
      toast({ title: "Failed to generate article", variant: "destructive" });
    },
  });

  // Generate NEWS and DELETE topic from bank
  const generateNewsMutation = useMutation({
    mutationFn: async (id: string) => {
      setGeneratingNewsId(id);
      const response = await apiRequest("POST", `/api/topic-bank/${id}/generate-news`);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratingNewsId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/topic-bank"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contents?type=article"] });
      toast({
        title: "News Created & Topic Removed",
        description: `Created news: ${data.contents?.title}`
      });
    },
    onError: () => {
      setGeneratingNewsId(null);
      toast({ title: "Failed to generate news", variant: "destructive" });
    },
  });

  // Merge duplicate topics
  const mergeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/topic-bank/merge-duplicates");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/topic-bank"] });
      toast({
        title: "Duplicates Merged",
        description: data.message || `Merged ${data.mergedGroups} groups, deleted ${data.deletedItems} duplicates`
      });
    },
    onError: () => {
      toast({ title: "Failed to merge duplicates", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditingTopic(null);
    setTitle("");
    setCategory("");
    setKeywords("");
    setOutline("");
    setPriority("0");
  };

  const openEditDialog = (topic: TopicBank) => {
    setEditingTopic(topic);
    setTitle(topic.title);
    setCategory((topic.category as TopicCategory) || "");
    setKeywords(topic.keywords?.join(", ") || "");
    setOutline(topic.outline || "");
    setPriority(String(topic.priority || 0));
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!title) return;
    const data: Record<string, unknown> = {
      title,
      category: category || null,
      keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
      outline: outline || null,
      priority: parseInt(priority) || 0,
    };

    if (editingTopic) {
      updateMutation.mutate({ id: editingTopic.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Topic Bank</h1>
          <p className="text-muted-foreground">Store ideas for AI article generation when RSS lacks contents</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={mergeMutation.isPending || !topics || topics.length < 2}
                data-testid="button-merge-duplicates"
              >
                {mergeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Merge className="h-4 w-4 mr-2" />
                )}
                Merge Duplicates
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Merge Duplicate Topics?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will find all topics with identical names and merge them into one. 
                  Keywords will be combined, the longest outline will be kept, and all metadata 
                  will be preserved from the best record. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => mergeMutation.mutate()}>
                  Merge Duplicates
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-topic">
                <Plus className="h-4 w-4 mr-2" />
                Add Topic
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTopic ? "Edit Topic" : "Add Topic"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="topic-title">Topic Title</Label>
                <Input
                  id="topic-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Best Beaches in Dubai for Families"
                  data-testid="input-topic-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-category">Category</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as typeof category)}>
                  <SelectTrigger data-testid="select-topic-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attractions">Attractions</SelectItem>
                    <SelectItem value="hotels">Hotels</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                    <SelectItem value="tips">Tips</SelectItem>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="shopping">Shopping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-keywords">Keywords (comma-separated)</Label>
                <Input
                  id="topic-keywords"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g., dubai beaches, family beach, jbr beach"
                  data-testid="input-topic-keywords"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-outline">Outline / Notes</Label>
                <Textarea
                  id="topic-outline"
                  value={outline}
                  onChange={(e) => setOutline(e.target.value)}
                  placeholder="Brief outline or notes for the AI to use..."
                  rows={3}
                  data-testid="input-topic-outline"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-priority">Priority (higher = more important)</Label>
                <Input
                  id="topic-priority"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  placeholder="0"
                  data-testid="input-topic-priority"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!title || createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-topic"
              >
                {editingTopic ? "Update" : "Add"} Topic
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {!topics || topics.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No topics in bank"
          description="Add topic ideas that can be used to generate articles when RSS feeds lack new contents."
          actionLabel="Add Your First Topic"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <Card key={topic.id} data-testid={`card-topic-${topic.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="space-y-1 min-w-0 flex-1">
                  <CardTitle className="text-base line-clamp-2">{topic.title}</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    {topic.category && (
                      <Badge variant="secondary" className="text-xs">
                        {topic.category}
                      </Badge>
                    )}
                    <Badge variant={topic.isActive ? "default" : "outline"} className="text-xs">
                      {topic.isActive ? "Active" : "Paused"}
                    </Badge>
                    {topic.priority !== null && topic.priority > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {topic.priority}
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  checked={topic.isActive ?? false}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ id: topic.id, isActive: checked })
                  }
                  data-testid={`switch-active-${topic.id}`}
                />
              </CardHeader>
              <CardContent className="space-y-4">
                {topic.keywords && topic.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {topic.keywords.slice(0, 5).map((kw, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                    {topic.keywords.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{topic.keywords.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}
                {topic.outline && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {topic.outline}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {topic.timesUsed
                    ? `Used ${topic.timesUsed} time${topic.timesUsed > 1 ? "s" : ""}`
                    : "Never used"}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => generateNewsMutation.mutate(topic.id)}
                    disabled={generatingTopicId !== null || generatingNewsId !== null}
                    data-testid={`button-generate-news-${topic.id}`}
                    title="Generate News & Remove Topic"
                  >
                    {generatingNewsId === topic.id ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Newspaper className="h-3 w-3 mr-1" />
                    )}
                    News
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateMutation.mutate(topic.id)}
                    disabled={generatingTopicId !== null || generatingNewsId !== null}
                    data-testid={`button-generate-${topic.id}`}
                    title="Generate Article (keeps topic)"
                  >
                    {generatingTopicId === topic.id ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1" />
                    )}
                    Article
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(topic)}
                    data-testid={`button-edit-${topic.id}`}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(topic.id)}
                    data-testid={`button-delete-${topic.id}`}
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

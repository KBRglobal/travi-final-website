import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Rss, Trash2, RefreshCw, ExternalLink, Clock } from "lucide-react";
import type { RssFeed } from "@shared/schema";

export default function RssFeeds() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");

  const { data: feeds, isLoading } = useQuery<RssFeed[]>({
    queryKey: ["/api/rss-feeds"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; url: string; category?: string }) =>
      apiRequest("POST", "/api/rss-feeds", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rss-feeds"] });
      setDialogOpen(false);
      setName("");
      setUrl("");
      setCategory("");
      toast({ title: "RSS Feed added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add RSS feed", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/rss-feeds/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rss-feeds"] });
      toast({ title: "RSS Feed deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/rss-feeds/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rss-feeds"] });
    },
  });

  const handleSubmit = () => {
    if (!name || !url) return;
    createMutation.mutate({ name, url, category: category || undefined });
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">RSS Feeds</h1>
          <p className="text-muted-foreground">Manage news sources for article import</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-feed">
              <Plus className="h-4 w-4 mr-2" />
              Add Feed
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add RSS Feed</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="feed-name">Feed Name</Label>
                <Input
                  id="feed-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Dubai News Daily"
                  data-testid="input-feed-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feed-url">Feed URL</Label>
                <Input
                  id="feed-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  data-testid="input-feed-url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feed-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-feed-category">
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!name || !url || createMutation.isPending}
                data-testid="button-save-feed"
              >
                Add Feed
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!feeds || feeds.length === 0 ? (
        <EmptyState
          icon={Rss}
          title="No RSS feeds"
          description="Add RSS feeds to automatically import news and articles for your CMS."
          actionLabel="Add Your First Feed"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {feeds.map((feed) => (
            <Card key={feed.id} data-testid={`card-feed-${feed.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <CardTitle className="text-base truncate">{feed.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {feed.category && (
                      <Badge variant="secondary" className="text-xs">
                        {feed.category}
                      </Badge>
                    )}
                    <Badge variant={feed.isActive ? "default" : "outline"} className="text-xs">
                      {feed.isActive ? "Active" : "Paused"}
                    </Badge>
                  </div>
                </div>
                <Switch
                  checked={feed.isActive ?? false}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ id: feed.id, isActive: checked })
                  }
                  data-testid={`switch-active-${feed.id}`}
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs font-mono text-muted-foreground truncate">
                  {feed.url}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {feed.lastFetchedAt
                    ? `Last fetched: ${new Date(feed.lastFetchedAt).toLocaleDateString()}`
                    : "Never fetched"}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1" disabled data-testid={`button-fetch-${feed.id}`}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Fetch
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={feed.url} target="_blank" rel="noopener noreferrer" data-testid={`link-feed-${feed.id}`}>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(feed.id)}
                    data-testid={`button-delete-${feed.id}`}
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

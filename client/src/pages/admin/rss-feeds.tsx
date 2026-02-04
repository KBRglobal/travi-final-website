/**
 * RSS Feeds Management Page
 * Manage RSS feeds for automatic content generation
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Rss,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  Clock,
  FileText,
  Zap,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RssFeed {
  id: string;
  name: string;
  url: string;
  category: string | null;
  destinationId: string | null;
  isActive: boolean;
  lastFetchedAt: string | null;
  createdAt: string;
}

interface Destination {
  id: string;
  name: string;
  slug: string;
}

interface RssItem {
  title: string;
  link?: string;
  description?: string;
  pubDate?: string;
}

function FeedSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-48" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-24" />
      </TableCell>
    </TableRow>
  );
}

export default function RssFeedsPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState<RssFeed | null>(null);
  const [previewItems, setPreviewItems] = useState<RssItem[]>([]);
  const [newFeed, setNewFeed] = useState({
    name: "",
    url: "",
    category: "news",
    destinationId: "",
  });

  // Fetch feeds
  const { data: feeds = [], isLoading: feedsLoading } = useQuery<RssFeed[]>({
    queryKey: ["/api/rss-feeds"],
  });

  // Fetch destinations for dropdown
  const { data: destinations = [] } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
  });

  // Create feed mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof newFeed) => {
      return apiRequest("POST", "/api/rss-feeds", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rss-feeds"] });
      setIsAddDialogOpen(false);
      setNewFeed({ name: "", url: "", category: "news", destinationId: "" });
      toast({ title: "RSS Feed created", description: "The feed has been added successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create RSS feed.", variant: "destructive" });
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/rss-feeds/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rss-feeds"] });
    },
  });

  // Delete feed mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/rss-feeds/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rss-feeds"] });
      toast({ title: "Feed deleted", description: "The RSS feed has been removed." });
    },
  });

  // Fetch items mutation
  const fetchItemsMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/rss-feeds/${id}/fetch`);
      return response.json();
    },
    onSuccess: data => {
      setPreviewItems(data.items || []);
      setIsPreviewDialogOpen(true);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to fetch RSS items.", variant: "destructive" });
    },
  });

  // Import items mutation
  const importMutation = useMutation({
    mutationFn: async ({ feedId, items }: { feedId: string; items: RssItem[] }) => {
      const response = await apiRequest("POST", `/api/rss-feeds/${feedId}/import`, { items });
      return response.json();
    },
    onSuccess: data => {
      toast({
        title: "Import complete",
        description: data.message,
      });
      setIsPreviewDialogOpen(false);
      setPreviewItems([]);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to import items.", variant: "destructive" });
    },
  });

  // Fetch all feeds mutation - uses the proper Octypo endpoint that stores items
  const fetchAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/octypo/rss/fetch-all");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rss-feeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/octypo/rss/items/recent"] });
      toast({
        title: "Fetch complete",
        description: `Fetched ${data.summary?.feedsProcessed || 0} feeds, ${data.summary?.newItems || 0} new items stored.`,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to fetch feeds.", variant: "destructive" });
    },
  });

  const handleFetchAndPreview = (feed: RssFeed) => {
    setSelectedFeed(feed);
    fetchItemsMutation.mutate(feed.id);
  };

  const handleImportAll = () => {
    if (selectedFeed && previewItems.length > 0) {
      importMutation.mutate({ feedId: selectedFeed.id, items: previewItems });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rss className="h-6 w-6" />
            RSS Feeds
          </h1>
          <p className="text-muted-foreground">Manage RSS feeds for automatic content generation</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => fetchAllMutation.mutate()}
            disabled={fetchAllMutation.isPending || feeds.filter(f => f.isActive).length === 0}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${fetchAllMutation.isPending ? "animate-spin" : ""}`} />
            {fetchAllMutation.isPending
              ? "Fetching all feeds..."
              : `Fetch All (${feeds.filter(f => f.isActive).length})`}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Feed
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add RSS Feed</DialogTitle>
              <DialogDescription>
                Add a new RSS feed to automatically generate content from.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Feed Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., TechCrunch Travel"
                  value={newFeed.name}
                  onChange={e => setNewFeed({ ...newFeed, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">Feed URL</Label>
                <Input
                  id="url"
                  placeholder="https://example.com/feed.xml"
                  value={newFeed.url}
                  onChange={e => setNewFeed({ ...newFeed, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newFeed.category}
                  onValueChange={v => setNewFeed({ ...newFeed, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                    <SelectItem value="food">Food & Dining</SelectItem>
                    <SelectItem value="culture">Culture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Target Destination</Label>
                <Select
                  value={newFeed.destinationId}
                  onValueChange={v => setNewFeed({ ...newFeed, destinationId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination..." />
                  </SelectTrigger>
                  <SelectContent>
                    {destinations.map(dest => (
                      <SelectItem key={dest.id} value={dest.id}>
                        {dest.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newFeed)}
                disabled={!newFeed.name || !newFeed.url || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Feed"}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Feeds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feeds.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Feeds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {feeds.filter(f => f.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Auto-Generation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span className="text-sm">Up to 10 articles/day</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feeds Table */}
      <Card>
        <CardHeader>
          <CardTitle>RSS Feeds</CardTitle>
          <CardDescription>
            Configure feeds to automatically fetch and generate content
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feedsLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Last Fetched</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map(i => (
                  <FeedSkeleton key={i} />
                ))}
              </TableBody>
            </Table>
          ) : feeds.length === 0 ? (
            <div className="text-center py-12">
              <Rss className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No RSS Feeds</h3>
              <p className="text-muted-foreground mb-4">
                Add your first RSS feed to start generating content automatically.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Feed
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Last Fetched</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeds.map(feed => (
                  <TableRow key={feed.id}>
                    <TableCell className="font-medium">{feed.name}</TableCell>
                    <TableCell>
                      <a
                        href={feed.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 max-w-[200px] truncate"
                      >
                        {feed.url}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{feed.category || "news"}</Badge>
                    </TableCell>
                    <TableCell>
                      {feed.lastFetchedAt ? (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(feed.lastFetchedAt), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={feed.isActive}
                        onCheckedChange={checked =>
                          toggleMutation.mutate({ id: feed.id, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFetchAndPreview(feed)}
                          disabled={fetchItemsMutation.isPending}
                        >
                          <RefreshCw
                            className={`h-4 w-4 mr-1 ${fetchItemsMutation.isPending ? "animate-spin" : ""}`}
                          />
                          Fetch
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(feed.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview RSS Items</DialogTitle>
            <DialogDescription>
              {selectedFeed?.name} - {previewItems.length} items found
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {previewItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                No items found in this feed
              </div>
            ) : (
              previewItems.slice(0, 10).map((item, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="font-medium">{item.title}</div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
                    >
                      View original <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImportAll}
              disabled={previewItems.length === 0 || importMutation.isPending}
            >
              <FileText className="h-4 w-4 mr-2" />
              {importMutation.isPending
                ? "Importing..."
                : `Import ${Math.min(previewItems.length, 10)} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

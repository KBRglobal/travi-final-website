import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  Plus,
  Search,
  TrendingUp,
  Bot,
  Rss,
  FileText,
  Lightbulb,
  Loader2,
  Clock,
  CheckCircle,
} from "lucide-react";

interface StatsData {
  pendingContent: number;
  generatedContent: number;
  writerAgentCount: number;
  validatorAgentCount: number;
  avgQualityScore: number;
}


interface EngineStats {
  total: number;
  healthy: number;
  unhealthy: number;
  byProvider: Record<string, number>;
}

interface AIQueueStatus {
  queue: {
    length: number;
    activeRequests: number;
    completedRequests: number;
  };
  providers: Array<{
    name: string;
    available: boolean;
    status: string;
  }>;
}

interface RssFeed {
  id: string;
  name: string;
  url: string;
  category: string | null;
  isActive: boolean;
  destinationId: string | null;
  destinationName: string | null;
  language: string | null;
}

interface RssItem {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  publishedDate: string | null;
  source: string;
  feedId: string;
  category: string | null;
  processed: boolean;
  createdAt: string;
}

export default function OctypoDashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [sourceType, setSourceType] = useState<"rss" | "topic" | "manual">("rss");
  const [selectedFeeds, setSelectedFeeds] = useState<string[]>([]);
  const [topicKeywords, setTopicKeywords] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [manualEntries, setManualEntries] = useState<{ title: string; description: string }[]>([
    { title: "", description: "" },
  ]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: statsData } = useQuery<StatsData>({
    queryKey: ["/api/octypo/stats"],
  });


  const { data: engineStats } = useQuery<EngineStats>({
    queryKey: ["/api/octypo/engines/stats"],
    refetchInterval: 30000,
  });

  const { data: aiQueueStatus } = useQuery<AIQueueStatus>({
    queryKey: ["/api/octypo/ai-queue/status"],
    refetchInterval: 10000,
  });

  const { data: rssFeedsData } = useQuery<{ feeds: RssFeed[] }>({
    queryKey: ["/api/octypo/sources/rss"],
  });

  const {
    data: rssItemsData,
    isLoading,
    refetch,
  } = useQuery<{ items: RssItem[]; count: number }>({
    queryKey: ["/api/octypo/rss/items/recent"],
  });

  const { data: dialogFeeds } = useQuery<{ feeds: RssFeed[] }>({
    queryKey: ["/api/octypo/sources/rss", "dialog"],
    enabled: isJobDialogOpen && sourceType === "rss",
  });

  const generateFromItemMutation = useMutation({
    mutationFn: (item: RssItem) =>
      apiRequest("/api/octypo/jobs/create", {
        method: "POST",
        body: {
          sourceType: "manual",
          manualContent: [{ title: item.title, description: item.summary || item.url }],
          priority: "normal",
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/octypo/rss/items/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/octypo/job-queue/status"] });
      toast({
        title: "Job Created",
        description: "Content generation job created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create job",
        variant: "destructive",
      });
    },
  });

  const createJobMutation = useMutation({
    mutationFn: (config: {
      sourceType: string;
      rssFeedIds?: string[];
      topicKeywords?: string[];
      manualContent?: { title: string; description: string }[];
      priority: string;
    }) => apiRequest("/api/octypo/jobs/create", { method: "POST", body: config }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/octypo/job-queue/status"] });
      toast({
        title: "Content Job Created",
        description: `Created ${data.jobsCreated} content generation job(s)`,
      });
      setIsJobDialogOpen(false);
      resetJobForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create content job",
        variant: "destructive",
      });
    },
  });

  const resetJobForm = () => {
    setSourceType("rss");
    setSelectedFeeds([]);
    setTopicKeywords("");
    setPriority("normal");
    setManualEntries([{ title: "", description: "" }]);
  };

  const addManualEntry = () => {
    setManualEntries(prev => [...prev, { title: "", description: "" }]);
  };

  const removeManualEntry = (index: number) => {
    setManualEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updateManualEntry = (index: number, field: "title" | "description", value: string) => {
    setManualEntries(prev =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    );
  };

  const handleCreateJob = () => {
    if (sourceType === "rss" && selectedFeeds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one RSS feed",
        variant: "destructive",
      });
      return;
    }
    if (sourceType === "topic" && !topicKeywords.trim()) {
      toast({ title: "Error", description: "Please enter topic keywords", variant: "destructive" });
      return;
    }
    if (sourceType === "manual") {
      const validEntries = manualEntries.filter(e => e.title.trim());
      if (validEntries.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one content item with a title",
          variant: "destructive",
        });
        return;
      }
    }

    createJobMutation.mutate({
      sourceType,
      rssFeedIds: sourceType === "rss" ? selectedFeeds : undefined,
      topicKeywords:
        sourceType === "topic"
          ? topicKeywords
              .split(",")
              .map(k => k.trim())
              .filter(Boolean)
          : undefined,
      manualContent:
        sourceType === "manual" ? manualEntries.filter(e => e.title.trim()) : undefined,
      priority,
    });
  };

  const toggleFeedSelection = (feedId: string) => {
    setSelectedFeeds(prev =>
      prev.includes(feedId) ? prev.filter(id => id !== feedId) : [...prev, feedId]
    );
  };


  const feeds = rssFeedsData?.feeds || [];
  const rssItems = rssItemsData?.items || [];
  const generatedContent = statsData?.generatedContent || 0;
  const pendingContent = statsData?.pendingContent || 0;
  const writerAgentCount = statsData?.writerAgentCount || 0;
  const validatorAgentCount = statsData?.validatorAgentCount || 0;

  const filteredItems = rssItems.filter(
    item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-state">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="octypo-dashboard-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">
            Octypo Content Engine
          </h1>
          <p className="text-muted-foreground">AI-powered content generation from RSS feeds</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsJobDialogOpen(true)} data-testid="button-new-content-job">
            <Plus className="h-4 w-4 mr-2" />
            New Content Job
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">RSS Feeds</CardTitle>
            <Rss className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-feeds">
              {feeds.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {feeds.filter(f => f.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Generated</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600" data-testid="text-generated">
              {generatedContent}
            </div>
            <p className="text-xs text-muted-foreground">total articles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Queue</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600" data-testid="text-pending">
              {pendingContent}
            </div>
            <p className="text-xs text-muted-foreground">
              {aiQueueStatus?.queue?.activeRequests || 0} processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Writers</CardTitle>
            <Bot className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600" data-testid="text-writers">
              {writerAgentCount}
            </div>
            <p className="text-xs text-muted-foreground">{validatorAgentCount} validators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">RSS Items</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600" data-testid="text-rss-items">
              {rssItems.length}
            </div>
            <p className="text-xs text-muted-foreground">recent news</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Infrastructure */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            AI Infrastructure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10">
              <div className="text-2xl font-bold text-purple-600" data-testid="text-engines-total">
                {engineStats?.total || 0}
              </div>
              <div className="text-xs text-muted-foreground">AI Engines</div>
            </div>
            <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10">
              <div className="text-2xl font-bold text-green-600" data-testid="text-engines-healthy">
                {engineStats?.healthy || 0}
              </div>
              <div className="text-xs text-muted-foreground">Healthy</div>
            </div>
            <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10">
              <div className="text-2xl font-bold" data-testid="text-providers">
                {Object.keys(engineStats?.byProvider || {}).length}
              </div>
              <div className="text-xs text-muted-foreground">Providers</div>
            </div>
            <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10">
              <div className="text-2xl font-bold text-blue-600" data-testid="text-queue-length">
                {aiQueueStatus?.queue?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Queue Length</div>
            </div>
            <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10">
              <div className="text-2xl font-bold text-cyan-600" data-testid="text-active-providers">
                {aiQueueStatus?.providers?.filter(p => p.available).length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Active Providers</div>
            </div>
            <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10">
              <div
                className="text-2xl font-bold text-emerald-600"
                data-testid="text-completed-requests"
              >
                {aiQueueStatus?.queue?.completedRequests || 0}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(engineStats?.byProvider || {})
              .slice(0, 6)
              .map(([provider, count]) => (
                <Badge key={provider} variant="outline" className="capitalize">
                  {provider}: {count}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* RSS News Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            News from RSS Feeds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search news..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="empty-state">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No news items found</p>
              <p className="text-sm">Fetch RSS feeds to get news items.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Title</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => (
                  <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                    <TableCell>
                      <div className="space-y-1">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:text-primary hover:underline line-clamp-2"
                        >
                          {item.title}
                        </a>
                        {item.category && (
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{item.source}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {item.publishedDate
                          ? new Date(item.publishedDate).toLocaleDateString("he-IL")
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.processed ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Generated
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => generateFromItemMutation.mutate(item)}
                        disabled={item.processed || generateFromItemMutation.isPending}
                        data-testid={`button-generate-${item.id}`}
                      >
                        {generateFromItemMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Bot className="h-4 w-4 mr-1" />
                            Generate
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Job Dialog */}
      <Dialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Create Content Generation Job
            </DialogTitle>
            <DialogDescription>
              Configure a new content generation job. Select your data source.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Source Type</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant={sourceType === "rss" ? "default" : "outline"}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => setSourceType("rss")}
                  data-testid="button-source-rss"
                >
                  <Rss className="h-5 w-5" />
                  <span>RSS Feeds</span>
                </Button>
                <Button
                  type="button"
                  variant={sourceType === "topic" ? "default" : "outline"}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => setSourceType("topic")}
                  data-testid="button-source-topic"
                >
                  <Lightbulb className="h-5 w-5" />
                  <span>Topics</span>
                </Button>
                <Button
                  type="button"
                  variant={sourceType === "manual" ? "default" : "outline"}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => setSourceType("manual")}
                  data-testid="button-source-manual"
                >
                  <FileText className="h-5 w-5" />
                  <span>Manual</span>
                </Button>
              </div>
            </div>

            {sourceType === "rss" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select RSS Feeds</Label>
                  <span className="text-sm text-muted-foreground">
                    {selectedFeeds.length} selected
                  </span>
                </div>
                <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                  {dialogFeeds?.feeds && dialogFeeds.feeds.length > 0 ? (
                    dialogFeeds.feeds.map(feed => (
                      <div
                        key={feed.id}
                        className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleFeedSelection(feed.id)}
                        data-testid={`feed-item-${feed.id}`}
                      >
                        <Checkbox
                          checked={selectedFeeds.includes(feed.id)}
                          onCheckedChange={() => toggleFeedSelection(feed.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{feed.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {feed.category || "No category"}
                          </div>
                        </div>
                        {feed.isActive ? (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          >
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      <Rss className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No RSS feeds available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {sourceType === "topic" && (
              <div className="space-y-2">
                <Label>Topic Keywords</Label>
                <Textarea
                  placeholder="Enter keywords separated by commas (e.g., Dubai Marina, Burj Khalifa, desert safari)"
                  value={topicKeywords}
                  onChange={e => setTopicKeywords(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="input-topic-keywords"
                />
                <p className="text-xs text-muted-foreground">
                  AI will generate content based on these topics
                </p>
              </div>
            )}

            {sourceType === "manual" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Content Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addManualEntry}
                    data-testid="button-add-manual-entry"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-3 max-h-[250px] overflow-y-auto">
                  {manualEntries.map((entry, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Item {index + 1}</span>
                        {manualEntries.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeManualEntry(index)}
                            className="h-6 w-6 p-0 text-destructive"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="Title"
                        value={entry.title}
                        onChange={e => updateManualEntry(index, "title", e.target.value)}
                        data-testid={`input-manual-title-${index}`}
                      />
                      <Textarea
                        placeholder="Description or content outline (optional)"
                        value={entry.description}
                        onChange={e => updateManualEntry(index, "description", e.target.value)}
                        rows={2}
                        data-testid={`input-manual-description-${index}`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  AI will expand these items into full content articles
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={v => setPriority(v as any)}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Process when queue is empty</SelectItem>
                  <SelectItem value="normal">Normal - Standard queue priority</SelectItem>
                  <SelectItem value="high">High - Process immediately</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsJobDialogOpen(false)}
              data-testid="button-cancel-job"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateJob}
              disabled={createJobMutation.isPending}
              data-testid="button-create-job"
            >
              {createJobMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Job
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

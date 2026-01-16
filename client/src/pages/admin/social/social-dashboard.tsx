import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Share2, 
  Calendar, 
  BarChart3, 
  PlusCircle, 
  Linkedin, 
  Twitter, 
  Instagram, 
  Facebook,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  TrendingUp,
  Users,
  Eye,
  MousePointer,
  Lightbulb
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  campaigns: number;
  posts: {
    total: number;
    scheduled: number;
    published: number;
    draft: number;
  };
  analytics: {
    totalImpressions: number;
    totalEngagement: number;
  };
}

interface SocialPost {
  id: string;
  campaignId?: string;
  platform: "linkedin" | "twitter" | "facebook" | "instagram";
  status: "draft" | "scheduled" | "published" | "failed";
  text: string;
  textHe?: string;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
}

interface SocialCampaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  targetPlatforms: string[];
  createdAt: string;
}

const platformIcons = {
  linkedin: Linkedin,
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
};

const statusColors = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  published: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export default function SocialDashboardPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [newPost, setNewPost] = useState({
    platform: "linkedin" as const,
    text: "",
    textHe: "",
    scheduledAt: "",
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/social/dashboard"],
  });

  const { data: posts, isLoading: postsLoading } = useQuery<SocialPost[]>({
    queryKey: ["/api/social/posts"],
  });

  const { data: campaigns } = useQuery<SocialCampaign[]>({
    queryKey: ["/api/social/campaigns"],
  });

  const createPostMutation = useMutation({
    mutationFn: async (post: typeof newPost) => {
      const payload: Record<string, any> = {
        platform: post.platform,
        text: post.text,
        textHe: post.textHe || undefined,
      };
      if (post.scheduledAt) {
        payload.scheduledAt = new Date(post.scheduledAt).toISOString();
        payload.status = "scheduled";
      }
      return apiRequest("POST", "/api/social/posts", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/dashboard"] });
      setIsCreatePostOpen(false);
      setNewPost({ platform: "linkedin", text: "", textHe: "", scheduledAt: "" });
      toast({ title: "Post created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create post", variant: "destructive" });
    },
  });

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="heading-social">
          <Share2 className="h-8 w-8 text-primary" />
          Social Media Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Schedule and manage social media posts across platforms
        </p>
        <div className="mt-4 p-4 bg-muted rounded-lg border">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            How It Works / איך זה עובד
          </h3>
          <p className="text-sm text-muted-foreground">
            Create <strong>campaigns</strong> to organize your social contents, then schedule <strong>posts</strong> 
            to LinkedIn, Twitter, Facebook, and Instagram. Track engagement and performance analytics.
            <br />
            <span className="text-xs opacity-70" dir="rtl">
              (צור קמפיינים לארגון תוכן הרשתות החברתיות, תזמן פוסטים ועקוב אחרי ביצועים.)
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-campaigns-count">
              {stats?.campaigns || 0}
            </div>
            <p className="text-xs text-muted-foreground">Active campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-scheduled-count">
              {stats?.posts?.scheduled || 0}
            </div>
            <p className="text-xs text-muted-foreground">Pending posts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-published-count">
              {stats?.posts?.published || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Impressions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-impressions">
              {(stats?.analytics?.totalImpressions || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total reach</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="posts" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-post">
                <PlusCircle className="h-4 w-4 mr-2" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Social Post</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select 
                    value={newPost.platform} 
                    onValueChange={(v: any) => setNewPost({ ...newPost, platform: v })}
                  >
                    <SelectTrigger data-testid="select-platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="twitter">Twitter / X</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Content (English)</Label>
                  <Textarea 
                    placeholder="Write your post contents..."
                    value={newPost.text}
                    onChange={(e) => setNewPost({ ...newPost, text: e.target.value })}
                    rows={4}
                    data-testid="input-post-text"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content (Hebrew) - Optional</Label>
                  <Textarea 
                    placeholder="תוכן הפוסט בעברית..."
                    value={newPost.textHe}
                    onChange={(e) => setNewPost({ ...newPost, textHe: e.target.value })}
                    rows={3}
                    dir="rtl"
                    data-testid="input-post-text-he"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Schedule (Optional)</Label>
                  <Input 
                    type="datetime-local"
                    value={newPost.scheduledAt}
                    onChange={(e) => setNewPost({ ...newPost, scheduledAt: e.target.value })}
                    data-testid="input-scheduled-at"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to save as draft
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreatePostOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createPostMutation.mutate(newPost)}
                  disabled={!newPost.text || createPostMutation.isPending}
                  data-testid="button-submit-post"
                >
                  {createPostMutation.isPending ? "Creating..." : "Create Post"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="posts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Posts</CardTitle>
              <CardDescription>Manage your scheduled and published posts</CardDescription>
            </CardHeader>
            <CardContent>
              {postsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : posts && posts.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {posts.map((post) => {
                      const PlatformIcon = platformIcons[post.platform];
                      return (
                        <div 
                          key={post.id} 
                          className="p-4 border rounded-lg flex items-start gap-4"
                          data-testid={`post-item-${post.id}`}
                        >
                          <div className="p-2 bg-muted rounded-lg">
                            <PlatformIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={statusColors[post.status]}>
                                {post.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {post.scheduledAt 
                                  ? `Scheduled: ${new Date(post.scheduledAt).toLocaleDateString()}`
                                  : `Created: ${new Date(post.createdAt).toLocaleDateString()}`
                                }
                              </span>
                            </div>
                            <p className="text-sm truncate">{post.text}</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No posts yet</p>
                  <p className="text-sm">Create your first social media post</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaigns</CardTitle>
              <CardDescription>Organize posts into marketing campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns && campaigns.length > 0 ? (
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div 
                      key={campaign.id} 
                      className="p-4 border rounded-lg"
                      data-testid={`campaign-item-${campaign.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{campaign.name}</h4>
                          {campaign.description && (
                            <p className="text-sm text-muted-foreground">{campaign.description}</p>
                          )}
                        </div>
                        <Badge>{campaign.status}</Badge>
                      </div>
                      {campaign.targetPlatforms && campaign.targetPlatforms.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {campaign.targetPlatforms.map((p) => {
                            const Icon = platformIcons[p as keyof typeof platformIcons];
                            return Icon ? <Icon key={p} className="h-4 w-4 text-muted-foreground" /> : null;
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No campaigns yet</p>
                  <p className="text-sm">Create a campaign to organize your posts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Calendar</CardTitle>
              <CardDescription>View scheduled posts on a calendar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Calendar view coming soon</p>
                <p className="text-sm">View and manage your scheduled posts visually</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

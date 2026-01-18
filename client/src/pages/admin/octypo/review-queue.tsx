import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileEdit,
  AlertCircle,
  RefreshCw,
  Filter,
  Loader2,
} from "lucide-react";

interface ReviewItem {
  id: string;
  contentId: string;
  title: string;
  type: string;
  priority: string;
  createdAt: string;
  quality: number;
  seo: number;
  issues: string[];
  writerId: string | null;
  wordCount: number;
}

interface ReviewQueueResponse {
  queue: ReviewItem[];
  total: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
}

export default function OctypoReviewQueuePage() {
  const [filter, setFilter] = useState("pending");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: reviewData, isLoading, refetch } = useQuery<ReviewQueueResponse>({
    queryKey: ['/api/octypo/review-queue'],
  });
  const reviewQueue = reviewData?.queue || [];
  const byPriority = reviewData?.byPriority || { high: 0, medium: 0, low: 0 };

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/octypo/review-queue/${id}/approve`, { 
      method: 'POST',
      body: JSON.stringify({ publishImmediately: false })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/octypo/review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/octypo/content'] });
      toast({ title: "Content approved" });
    },
    onError: () => {
      toast({ title: "Failed to approve content", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/octypo/review-queue/${id}/reject`, { 
      method: 'POST',
      body: JSON.stringify({ reason: "Needs revision", sendBackToWriter: true })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/octypo/review-queue'] });
      toast({ title: "Content rejected" });
    },
    onError: () => {
      toast({ title: "Failed to reject content", variant: "destructive" });
    },
  });

  const stats = {
    pending: reviewQueue.length,
    inReview: byPriority.high,
    approvedToday: 0,
    avgReviewTime: "15m",
  };

  return (
    <div className="space-y-6" data-testid="octypo-review-queue-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Review Queue</h1>
          <p className="text-muted-foreground">Review and approve AI-generated content</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary" data-testid="text-pending">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-in-review">{byPriority.high}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Medium Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600" data-testid="text-approved-today">{byPriority.medium}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-avg-review-time">{byPriority.low}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-filter">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : reviewQueue.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Review Queue Empty</h3>
            <p className="text-muted-foreground">No content pending review at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviewQueue.map((item) => (
            <Card key={item.id} data-testid={`review-item-${item.id}`}>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge 
                        variant={item.priority === 'high' ? 'destructive' : 'outline'} 
                        className="text-xs"
                      >
                        {item.priority} priority
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {item.type}
                      </Badge>
                      {item.createdAt && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold">{item.title || `Content ID: ${item.contentId}`}</h3>
                      {item.issues && item.issues.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-muted-foreground">{item.issues[0]}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-muted-foreground">Quality: </span>
                        <span className="font-semibold">{item.quality}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">SEO: </span>
                        <span className="font-semibold">{item.seo}%</span>
                      </div>
                      {item.wordCount > 0 && (
                        <div>
                          <span className="text-muted-foreground">Words: </span>
                          <span className="font-semibold">{item.wordCount}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      className="bg-green-500"
                      onClick={() => approveMutation.mutate(item.id)}
                      disabled={approveMutation.isPending}
                      data-testid={`button-approve-${item.id}`}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => rejectMutation.mutate(item.id)}
                      disabled={rejectMutation.isPending}
                      data-testid={`button-reject-${item.id}`}
                    >
                      {rejectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Reject
                    </Button>
                    <Button 
                      variant="outline"
                      data-testid={`button-changes-${item.id}`}
                    >
                      <FileEdit className="h-4 w-4 mr-2" />
                      Changes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

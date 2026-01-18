import { useState } from "react";
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
  Hourglass,
  ThumbsUp,
  Timer,
} from "lucide-react";

interface ReviewItem {
  id: string;
  contentId: string;
  priority: number;
  timestamp: string;
  issues: string[];
  qualityScore: number;
  seoScore: number;
}

const mockReviewItems: ReviewItem[] = [
  {
    id: "1",
    contentId: "c4...",
    priority: 1,
    timestamp: "Jan 18, 9:32 PM",
    issues: ["Missing alt text for images"],
    qualityScore: 85,
    seoScore: 80,
  },
  {
    id: "2",
    contentId: "c3...",
    priority: 2,
    timestamp: "Jan 18, 9:32 PM",
    issues: [],
    qualityScore: 78,
    seoScore: 72,
  },
];

export default function OctypoReviewQueuePage() {
  const [filter, setFilter] = useState("pending");

  const stats = {
    pending: 5,
    inReview: 2,
    approvedToday: 12,
    avgReviewTime: "15m",
  };

  return (
    <div className="space-y-6" data-testid="octypo-review-queue-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Review Queue</h1>
          <p className="text-muted-foreground">Review and approve AI-generated content</p>
        </div>
        <Button variant="outline" data-testid="button-refresh">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">In Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-in-review">{stats.inReview}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600" data-testid="text-approved-today">{stats.approvedToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Review Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-avg-review-time">{stats.avgReviewTime}</div>
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

      <div className="space-y-4">
        {mockReviewItems.map((item) => (
          <Card key={item.id} data-testid={`review-item-${item.id}`}>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      Priority {item.priority}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {item.timestamp}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold">Content ID: {item.contentId}</h3>
                    {item.issues.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm text-muted-foreground">{item.issues[0]}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quality: </span>
                      <span className="font-semibold">{item.qualityScore}00%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Seo: </span>
                      <span className="font-semibold">{item.seoScore}00%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    className="bg-green-500 hover:bg-green-600"
                    data-testid={`button-approve-${item.id}`}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    variant="destructive"
                    data-testid={`button-reject-${item.id}`}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
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
    </div>
  );
}

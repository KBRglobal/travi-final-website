import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Eye,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Lightbulb,
  Search,
  ExternalLink,
  Shield,
} from "lucide-react";

interface PlagiarismStats {
  totalChecked: number;
  uniqueContent: number;
  flaggedContent: number;
  avgOriginality: number;
}

interface ContentCheck {
  contentId: string;
  title: string;
  type: string;
  originalityScore: number;
  status: "unique" | "similar" | "flagged";
  lastChecked?: string;
  matches?: Array<{
    source: string;
    similarity: number;
    url?: string;
  }>;
}

export default function PlagiarismCheckPage() {
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery<PlagiarismStats>({
    queryKey: ["/api/analytics/plagiarism/stats"],
  });

  const { data: checks } = useQuery<ContentCheck[]>({
    queryKey: ["/api/analytics/plagiarism/checks"],
  });

  const scanMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/analytics/plagiarism/scan"),
    onSuccess: () => {
      toast({ title: "Plagiarism scan started" });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/plagiarism"] });
    },
  });

  const getStatusBadge = (status: string, score: number) => {
    if (status === "unique" || score >= 90) {
      return <Badge className="bg-green-500">Original</Badge>;
    } else if (status === "similar" || score >= 70) {
      return <Badge className="bg-amber-500">Similar</Badge>;
    } else {
      return <Badge variant="destructive">Flagged</Badge>;
    }
  };

  const getStatusIcon = (status: string, score: number) => {
    if (status === "unique" || score >= 90) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    } else if (status === "similar" || score >= 70) {
      return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  if (isLoading) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold flex items-center gap-3"
            data-testid="heading-plagiarism"
          >
            <Eye className="h-8 w-8 text-primary" />
            Plagiarism Check
          </h1>
          <p className="text-muted-foreground mt-1">
            Ensure contents originality and avoid duplicate contents issues
          </p>
        </div>
        <Button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          data-testid="button-scan-all"
        >
          <Search className="h-4 w-4 mr-2" />
          Scan All Content
        </Button>
      </div>

      <div className="p-4 bg-muted rounded-lg border">
        <h3 className="font-medium flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          How It Works
        </h3>
        <p className="text-sm text-muted-foreground">
          Plagiarism check scans your content against{" "}
          <strong>web sources and internal duplicates</strong>. Ensures AI-generated articles are
          unique and flags content that may hurt SEO rankings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Content Checked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-checked-count">
              {stats?.totalChecked || 0}
            </div>
            <p className="text-xs text-muted-foreground">Articles scanned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Unique Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-unique-count">
              {stats?.uniqueContent || 0}
            </div>
            <p className="text-xs text-muted-foreground">Passed check</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Flagged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-flagged-count">
              {stats?.flaggedContent || 0}
            </div>
            <p className="text-xs text-muted-foreground">Need review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Avg Originality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-originality">
              {(stats?.avgOriginality || 0).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">Content score</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Originality Reports</CardTitle>
          <CardDescription>Detailed plagiarism check results for each article</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[450px]">
            {checks?.length ? (
              <div className="space-y-4">
                {checks.map(check => (
                  <div
                    key={check.contentId}
                    className="p-4 border rounded-lg space-y-3"
                    data-testid={`plagiarism-check-${check.contentId}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(check.status, check.originalityScore)}
                        <div>
                          <h4 className="font-medium">{check.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {check.type} | Last checked:{" "}
                            {check.lastChecked
                              ? new Date(check.lastChecked).toLocaleDateString()
                              : "Never"}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(check.status, check.originalityScore)}
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">Originality:</span>
                      <Progress value={check.originalityScore} className="flex-1 h-2" />
                      <span className="text-sm font-medium">
                        {check.originalityScore.toFixed(0)}%
                      </span>
                    </div>

                    {check.matches && check.matches.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground mb-2">Similar sources:</p>
                        <div className="space-y-1">
                          {check.matches.slice(0, 3).map((match, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="truncate flex-1">{match.source}</span>
                              <div className="flex items-center gap-2 ml-2">
                                <Badge variant="outline" className="text-xs">
                                  {match.similarity.toFixed(0)}%
                                </Badge>
                                {match.url && (
                                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-details-${check.contentId}`}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-rescan-${check.contentId}`}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Rescan
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No plagiarism checks run yet</p>
                <p className="text-sm">Click "Scan All Content" to check your articles</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

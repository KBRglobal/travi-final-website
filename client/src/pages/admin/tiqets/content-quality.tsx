import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Play,
  Eye,
  RotateCcw,
  Upload,
  FileCheck,
  Target,
  Sparkles,
  Brain,
  Shield,
} from "lucide-react";

interface QualityReport {
  total: number;
  passed: number;
  failed: number;
  noScore: number;
  averageScore: number;
  byCityBreakdown: Array<{
    city: string;
    total: number;
    passed: number;
    avgScore: number;
  }>;
}

interface RegenerationStats {
  inProgress: boolean;
  processed: number;
  total: number;
  passed: number;
  failed: number;
  errors: number;
  currentBatch: number;
  totalBatches: number;
  startedAt: string | null;
  estimatedCompletion: string | null;
}

interface AttractionQuality {
  id: string;
  title: string;
  cityName: string;
  seoSlug: string | null;
  qualityScore: number | null;
  seoScore: number | null;
  aeoScore: number | null;
  factCheckScore: number | null;
  contentVersion: number | null;
  status: string;
  lastContentUpdate: string | null;
}

function ScoreBadge({ score, label }: { score: number | null; label: string }) {
  if (score === null) {
    return (
      <Badge variant="secondary" className="text-xs">
        {label}: --
      </Badge>
    );
  }
  
  const variant = score >= 90 ? "default" : score >= 70 ? "secondary" : "destructive";
  const color = score >= 90 ? "text-green-700 dark:text-green-400" : 
                score >= 70 ? "text-yellow-700 dark:text-yellow-400" : 
                "text-red-700 dark:text-red-400";
  
  return (
    <Badge variant={variant} className="text-xs">
      <span className={color}>{label}: {score}</span>
    </Badge>
  );
}

export default function ContentQualityDashboard() {
  const { toast } = useToast();
  const [selectedCity, setSelectedCity] = useState<string>("");
  
  const { data: report, isLoading: reportLoading } = useQuery<QualityReport>({
    queryKey: ["/api/admin/content-quality/report"],
    refetchInterval: 10000,
  });
  
  const { data: regenerationStatus, isLoading: statusLoading } = useQuery<RegenerationStats>({
    queryKey: ["/api/admin/content-quality/regeneration-status"],
    refetchInterval: 3000,
  });
  
  const { data: attractionsData, isLoading: attractionsLoading } = useQuery<{
    attractions: AttractionQuality[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: ["/api/admin/content-quality/attractions"],
  });

  const regenerateSingleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/admin/content-quality/regenerate/${id}`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content-quality/attractions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content-quality/report"] });
      toast({
        title: data.success ? "Regeneration Complete" : "Regeneration Failed",
        description: data.success 
          ? `Scores: SEO ${data.scores?.seo}, AEO ${data.scores?.aeo}, Fact ${data.scores?.factCheck}`
          : data.error,
        variant: data.success ? "default" : "destructive",
      });
    },
  });

  const regenerateAllMutation = useMutation({
    mutationFn: async (options: { batchSize?: number; cityFilter?: string }) => {
      const response = await apiRequest("POST", "/api/admin/content-quality/regenerate-all", options);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Regeneration Started",
        description: data.message,
      });
    },
  });

  const publishReadyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/content-quality/publish-ready");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content-quality/report"] });
      toast({
        title: "Publishing Complete",
        description: data.message,
      });
    },
  });

  if (reportLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const stats = report || {
    total: 0,
    passed: 0,
    failed: 0,
    noScore: 0,
    averageScore: 0,
    byCityBreakdown: [],
  };

  const isRegenerating = regenerationStatus?.inProgress || false;
  const progressPercent = regenerationStatus && regenerationStatus.total > 0 
    ? (regenerationStatus.processed / regenerationStatus.total) * 100 
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Content Quality Dashboard</h1>
          <p className="text-muted-foreground">V2 content regeneration with 90+ quality gate</p>
        </div>
        <div className="flex items-center gap-2">
          {isRegenerating && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Regenerating...
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/content-quality/report"] })}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Attractions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.noScore} not yet scored
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Passing Quality</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-passed">
              {stats.passed}
            </div>
            <p className="text-xs text-muted-foreground">
              90+ overall score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Below Threshold</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-failed">
              {stats.failed}
            </div>
            <p className="text-xs text-muted-foreground">
              Score below 90
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-score">
              {stats.averageScore || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall quality average
            </p>
          </CardContent>
        </Card>
      </div>

      {isRegenerating && regenerationStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Regeneration Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Processed: {regenerationStatus.processed} / {regenerationStatus.total}
              </span>
              <span>
                Passed: {regenerationStatus.passed} | Failed: {regenerationStatus.failed}
              </span>
            </div>
            {regenerationStatus.currentBatch > 0 && (
              <p className="text-xs text-muted-foreground">
                Batch {regenerationStatus.currentBatch} / {regenerationStatus.totalBatches}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Regenerate content with V2 quality system</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => regenerateAllMutation.mutate({ batchSize: 10 })}
            disabled={isRegenerating || regenerateAllMutation.isPending}
            data-testid="button-regenerate-all"
          >
            {regenerateAllMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Start Full Regeneration
          </Button>
          
          <Button
            variant="outline"
            onClick={() => publishReadyMutation.mutate()}
            disabled={publishReadyMutation.isPending}
            data-testid="button-publish-ready"
          >
            {publishReadyMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Publish All 90+ Scores
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attractions Quality Overview</CardTitle>
          <CardDescription>
            Content quality scores for ready attractions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attractionsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attraction</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>SEO</TableHead>
                  <TableHead>AEO</TableHead>
                  <TableHead>Fact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attractionsData?.attractions.map((attraction) => {
                  const allPass = (attraction.seoScore ?? 0) >= 90 && 
                                  (attraction.aeoScore ?? 0) >= 90 && 
                                  (attraction.factCheckScore ?? 0) >= 90;
                  return (
                    <TableRow key={attraction.id} data-testid={`row-attraction-${attraction.id}`}>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        {attraction.title}
                      </TableCell>
                      <TableCell>{attraction.cityName}</TableCell>
                      <TableCell>
                        <ScoreBadge score={attraction.seoScore} label="SEO" />
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={attraction.aeoScore} label="AEO" />
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={attraction.factCheckScore} label="Fact" />
                      </TableCell>
                      <TableCell>
                        {allPass ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ready
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Needs Work
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => regenerateSingleMutation.mutate(attraction.id)}
                          disabled={regenerateSingleMutation.isPending}
                          data-testid={`button-regenerate-${attraction.id}`}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!attractionsData?.attractions || attractionsData.attractions.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No ready attractions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

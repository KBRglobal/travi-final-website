import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  FileText,
  Link,
  Image,
  Eye,
  ExternalLink,
  RefreshCw,
  MapPin,
  Building2,
  Utensils,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import type { ContentWithRelations } from "@shared/schema";

// SEO Issue types
interface SEOIssue {
  type: "error" | "warning" | "info";
  category: string;
  message: string;
  field?: string;
}

// Content type icons
const contentTypeIcons: Record<string, React.ElementType> = {
  attraction: MapPin,
  hotel: Building2,
  article: FileText,
  dining: Utensils,
};

// SEO analysis function
function analyzeSEO(contents: ContentWithRelations): SEOIssue[] {
  const issues: SEOIssue[] = [];

  // Title checks
  if (!contents.title) {
    issues.push({ type: "error", category: "Title", message: "Missing title", field: "title" });
  } else {
    if (contents.title.length < 30) {
      issues.push({ type: "warning", category: "Title", message: "Title too short (< 30 chars)", field: "title" });
    }
    if (contents.title.length > 60) {
      issues.push({ type: "warning", category: "Title", message: "Title too long (> 60 chars)", field: "title" });
    }
  }

  // Meta description
  if (!contents.metaDescription) {
    issues.push({ type: "error", category: "Meta", message: "Missing meta description", field: "metaDescription" });
  } else {
    if (contents.metaDescription.length < 120) {
      issues.push({ type: "warning", category: "Meta", message: "Meta description too short (< 120 chars)", field: "metaDescription" });
    }
    if (contents.metaDescription.length > 160) {
      issues.push({ type: "warning", category: "Meta", message: "Meta description too long (> 160 chars)", field: "metaDescription" });
    }
  }

  // Slug
  if (!contents.slug) {
    issues.push({ type: "error", category: "URL", message: "Missing URL slug", field: "slug" });
  } else if (contents.slug.length > 75) {
    issues.push({ type: "warning", category: "URL", message: "URL slug too long (> 75 chars)", field: "slug" });
  }

  // Content length
  const wordCount = contents.wordCount || 0;
  if (wordCount < 300) {
    issues.push({ type: "error", category: "Content", message: "Content too thin (< 300 words)", field: "contents" });
  } else if (wordCount < 800) {
    issues.push({ type: "warning", category: "Content", message: "Content could be longer (< 800 words)", field: "contents" });
  }

  // Featured/Hero image
  if (!contents.heroImage) {
    issues.push({ type: "warning", category: "Images", message: "Missing hero image", field: "heroImage" });
  }

  // SEO score
  if (contents.seoScore !== null && contents.seoScore !== undefined && contents.seoScore < 50) {
    issues.push({ type: "error", category: "Score", message: `Low SEO score (${contents.seoScore}/100)`, field: "seoScore" });
  }

  return issues;
}

// Calculate overall SEO score
function calculateOverallScore(contents: ContentWithRelations[]): number {
  if (contents.length === 0) return 0;
  const totalScore = contents.reduce((sum, c) => sum + (c.seoScore || 0), 0);
  return Math.round(totalScore / contents.length);
}

export default function SEOAuditPage() {
  const [, navigate] = useLocation();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [issueFilter, setIssueFilter] = useState<string>("all");

  // Fetch all published contents
  const { data: contents = [], isLoading } = useQuery<ContentWithRelations[]>({
    queryKey: ["/api/contents"],
    select: (data) => data.filter((c) => c.status === "published"),
  });

  // Filter contents
  const filteredContents = useMemo(() => {
    return contents.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      return true;
    });
  }, [contents, typeFilter]);

  // Analyze all contents
  const analysis = useMemo(() => {
    const results = filteredContents.map((contents) => ({
      contents,
      issues: analyzeSEO(contents),
    }));

    // Filter by issue type
    if (issueFilter !== "all") {
      return results.filter((r) => r.issues.some((i) => i.type === issueFilter));
    }

    return results;
  }, [filteredContents, issueFilter]);

  // Stats
  const stats = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    let clean = 0;

    analysis.forEach(({ issues }) => {
      const hasErrors = issues.some((i) => i.type === "error");
      const hasWarnings = issues.some((i) => i.type === "warning");

      if (hasErrors) errors++;
      else if (hasWarnings) warnings++;
      else clean++;
    });

    return { errors, warnings, clean, total: analysis.length };
  }, [analysis]);

  // Overall score
  const overallScore = calculateOverallScore(filteredContents);

  // Score distribution
  const scoreDistribution = useMemo(() => {
    const ranges = { excellent: 0, good: 0, fair: 0, poor: 0 };
    filteredContents.forEach((c) => {
      const score = c.seoScore || 0;
      if (score >= 80) ranges.excellent++;
      else if (score >= 60) ranges.good++;
      else if (score >= 40) ranges.fair++;
      else ranges.poor++;
    });
    return ranges;
  }, [filteredContents]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    if (score >= 40) return "bg-orange-100";
    return "bg-red-100";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Search className="h-6 w-6" />
            SEO Audit
          </h1>
          <p className="text-muted-foreground">
            Analyze and improve SEO across all your contents
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}
            </div>
            <Progress value={overallScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-1">
              <XCircle className="h-4 w-4" />
              Critical Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.errors}</div>
            <p className="text-xs text-muted-foreground">
              {stats.errors > 0 ? "Need immediate attention" : "All clear!"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.warnings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.warnings > 0 ? "Could be improved" : "No warnings"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Optimized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.clean}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.clean / stats.total) * 100) || 0}% of contents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
          <CardDescription>How your contents scores are distributed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  Excellent (80-100)
                </span>
                <span className="font-medium">{scoreDistribution.excellent}</span>
              </div>
              <Progress value={(scoreDistribution.excellent / stats.total) * 100} className="h-2 bg-muted" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  Good (60-79)
                </span>
                <span className="font-medium">{scoreDistribution.good}</span>
              </div>
              <Progress value={(scoreDistribution.good / stats.total) * 100} className="h-2 bg-muted" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  Fair (40-59)
                </span>
                <span className="font-medium">{scoreDistribution.fair}</span>
              </div>
              <Progress value={(scoreDistribution.fair / stats.total) * 100} className="h-2 bg-muted" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  Poor (0-39)
                </span>
                <span className="font-medium">{scoreDistribution.poor}</span>
              </div>
              <Progress value={(scoreDistribution.poor / stats.total) * 100} className="h-2 bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Content Analysis</CardTitle>
              <CardDescription>Detailed SEO issues by contents</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="attraction">Attractions</SelectItem>
                  <SelectItem value="hotel">Hotels</SelectItem>
                  <SelectItem value="article">Articles</SelectItem>
                  <SelectItem value="dining">Dining</SelectItem>
                </SelectContent>
              </Select>
              <Select value={issueFilter} onValueChange={setIssueFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Issues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Issues</SelectItem>
                  <SelectItem value="error">Errors Only</SelectItem>
                  <SelectItem value="warning">Warnings Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Content</TableHead>
                  <TableHead className="w-[80px]">Score</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.map(({ contents, issues }) => {
                  const Icon = contentTypeIcons[contents.type] || FileText;
                  const score = contents.seoScore || 0;
                  const errors = issues.filter((i) => i.type === "error");
                  const warnings = issues.filter((i) => i.type === "warning");

                  return (
                    <TableRow key={contents.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium truncate max-w-[250px]">
                              {contents.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              /{contents.slug}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className={`inline-flex items-center justify-center w-10 h-10 rounded-lg font-bold ${getScoreBg(
                            score
                          )} ${getScoreColor(score)}`}
                        >
                          {score}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {errors.map((issue, idx) => (
                            <Tooltip key={`error-${idx}`}>
                              <TooltipTrigger>
                                <Badge variant="destructive" className="text-xs">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  {issue.category}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>{issue.message}</TooltipContent>
                            </Tooltip>
                          ))}
                          {warnings.map((issue, idx) => (
                            <Tooltip key={`warning-${idx}`}>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-200 bg-yellow-50">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {issue.category}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>{issue.message}</TooltipContent>
                            </Tooltip>
                          ))}
                          {issues.length === 0 && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Optimized
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/admin/${contents.type}s/${contents.id}`)
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

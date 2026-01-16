/**
 * SEO Engine Content Report
 *
 * Detailed SEO analysis for individual contents pieces.
 * Shows: classification, AEO validation, snippet readiness, canonical, link suggestions
 *
 * Feature flag: ENABLE_SEO_ENGINE
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardLayout, AdminSection } from "@/components/admin";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  Link,
  Link2,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Tag,
  XCircle,
} from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  classification?: PageClassification;
  aeoValidation?: AEOValidation;
  snippetReadiness?: SnippetReadiness;
  linkSuggestions?: LinkSuggestion[];
  seoScore?: number;
  canonical?: string;
}

interface PageClassification {
  tier: "HERO" | "HUB" | "SPOKE" | "UTILITY" | "UNCLASSIFIED";
  confidence: number;
  signals: string[];
}

interface AEOValidation {
  score: number;
  hasFAQ: boolean;
  hasStructuredData: boolean;
  hasAnswerTarget: boolean;
  hasSchema: boolean;
  issues: string[];
}

interface SnippetReadiness {
  score: number;
  hasMetaDescription: boolean;
  metaDescriptionLength: number;
  hasOgTags: boolean;
  hasStructuredSnippet: boolean;
  issues: string[];
}

interface LinkSuggestion {
  targetId: string;
  targetTitle: string;
  targetSlug: string;
  anchorText: string;
  context: string;
  score: number;
}

export default function SeoEngineContentReport() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("list");

  const { data: contentList, isLoading: listLoading, refetch } = useQuery<ContentItem[]>({
    queryKey: ["/api/seo-engine/contents-list"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/seo-engine/classification/all?limit=100");
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });

  const { data: contentDetail, isLoading: detailLoading } = useQuery<ContentItem>({
    queryKey: ["/api/seo-engine/contents", selectedContentId],
    queryFn: async () => {
      if (!selectedContentId) return null;
      const res = await apiRequest("GET", `/api/seo-engine/adapters/contents/${selectedContentId}`);
      return res.json();
    },
    enabled: !!selectedContentId,
  });

  const filteredContent = (contentList || []).filter(
    (item) =>
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "HERO":
        return "bg-[#6443F4]/10 text-[#6443F4] border-[#6443F4]/30";
      case "HUB":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "SPOKE":
        return "bg-green-100 text-green-800 border-green-200";
      case "UTILITY":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  if (listLoading) {
    return (
      <DashboardLayout
        title="SEO Content Report"
        description="Detailed SEO analysis for all contents"
      >
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  const actionsSection = (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search contents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 w-64"
        />
      </div>
      <Button variant="outline" onClick={() => refetch()}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh
      </Button>
    </div>
  );

  return (
    <DashboardLayout
      title="SEO Content Report"
      description="Classification, AEO validation, snippet readiness, and link suggestions"
      actions={actionsSection}
    >
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="list">Content List</TabsTrigger>
          <TabsTrigger value="detail" disabled={!selectedContentId}>
            Detail View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Content ({filteredContent.length})</CardTitle>
              <CardDescription>Click on a row to view detailed SEO analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>SEO Score</TableHead>
                      <TableHead>AEO Ready</TableHead>
                      <TableHead>Snippet</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContent.map((item) => (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => {
                          setSelectedContentId(item.id);
                          setSelectedTab("detail");
                        }}
                      >
                        <TableCell>
                          <div className="max-w-[300px]">
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">/{item.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTierColor(item.classification?.tier || "UNCLASSIFIED")}>
                            {item.classification?.tier || "UNCLASSIFIED"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${getScoreColor(item.seoScore || 0)}`}>
                            {item.seoScore || 0}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {item.aeoValidation?.score ? (
                            item.aeoValidation.score >= 70 ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-yellow-500" />
                            )
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-300" />
                          )}
                        </TableCell>
                        <TableCell>
                          {item.snippetReadiness?.score ? (
                            item.snippetReadiness.score >= 70 ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-yellow-500" />
                            )
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-300" />
                          )}
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredContent.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No contents found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail" className="mt-4">
          {detailLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          ) : contentDetail ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{contentDetail.title}</CardTitle>
                      <CardDescription>/{contentDetail.slug}</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedContentId(null);
                        setSelectedTab("list");
                      }}
                    >
                      Back to List
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Classification */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="w-5 h-5" />
                      Classification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Page Tier</span>
                      <Badge className={getTierColor(contentDetail.classification?.tier || "UNCLASSIFIED")}>
                        {contentDetail.classification?.tier || "UNCLASSIFIED"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Confidence</span>
                      <span className="font-semibold">
                        {Math.round((contentDetail.classification?.confidence || 0) * 100)}%
                      </span>
                    </div>
                    {contentDetail.classification?.signals && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Signals</p>
                        <div className="flex flex-wrap gap-1">
                          {contentDetail.classification.signals.map((signal, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {signal}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* AEO Validation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      AEO Validation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>AEO Score</span>
                        <span className={`font-semibold ${getScoreColor(contentDetail.aeoValidation?.score || 0)}`}>
                          {contentDetail.aeoValidation?.score || 0}%
                        </span>
                      </div>
                      <Progress value={contentDetail.aeoValidation?.score || 0} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">FAQ Section</span>
                        {contentDetail.aeoValidation?.hasFAQ ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Structured Data</span>
                        {contentDetail.aeoValidation?.hasStructuredData ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Answer Target</span>
                        {contentDetail.aeoValidation?.hasAnswerTarget ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Schema Markup</span>
                        {contentDetail.aeoValidation?.hasSchema ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    {contentDetail.aeoValidation?.issues && contentDetail.aeoValidation.issues.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Issues</p>
                        <ul className="text-sm text-red-600 space-y-1">
                          {contentDetail.aeoValidation.issues.map((issue, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Snippet Readiness */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Snippet Readiness
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Readiness Score</span>
                        <span className={`font-semibold ${getScoreColor(contentDetail.snippetReadiness?.score || 0)}`}>
                          {contentDetail.snippetReadiness?.score || 0}%
                        </span>
                      </div>
                      <Progress value={contentDetail.snippetReadiness?.score || 0} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Meta Description</span>
                        {contentDetail.snippetReadiness?.hasMetaDescription ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Description Length</span>
                        <span className="text-sm">
                          {contentDetail.snippetReadiness?.metaDescriptionLength || 0} chars
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Open Graph Tags</span>
                        {contentDetail.snippetReadiness?.hasOgTags ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Structured Snippet</span>
                        {contentDetail.snippetReadiness?.hasStructuredSnippet ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Canonical */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      Canonical URL
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {contentDetail.canonical ? (
                      <div className="p-3 bg-muted rounded font-mono text-sm break-all">
                        {contentDetail.canonical}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertCircle className="w-4 h-4" />
                        <span>No canonical URL set</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Link Suggestions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="w-5 h-5" />
                    Link Suggestions
                  </CardTitle>
                  <CardDescription>
                    Recommended internal links to add to this contents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!contentDetail.linkSuggestions?.length ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Link className="w-12 h-12 mx-auto mb-2" />
                      <p>No link suggestions available</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Target Page</TableHead>
                          <TableHead>Anchor Text</TableHead>
                          <TableHead>Context</TableHead>
                          <TableHead>Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contentDetail.linkSuggestions.map((suggestion, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{suggestion.targetTitle}</p>
                                <p className="text-xs text-muted-foreground">/{suggestion.targetSlug}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{suggestion.anchorText}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {suggestion.context}
                            </TableCell>
                            <TableCell>
                              <span className={`font-semibold ${getScoreColor(suggestion.score * 100)}`}>
                                {Math.round(suggestion.score * 100)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select a contents item to view detailed analysis
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

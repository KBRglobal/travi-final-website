/**
 * Search Debug Admin Page
 *
 * Admin-only tool for debugging search queries.
 * Shows the full search pipeline: intent, expansion, ranking.
 *
 * FEATURE 3: Search Admin Debug Mode
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Search, Bug, Filter, Clock, Lightbulb, Target,
  AlertTriangle, CheckCircle, ArrowRight, Layers
} from "lucide-react";

interface ScoreBreakdown {
  typeWeight: number;
  titleMatchBoost: number;
  recencyBoost: number;
  popularityBoost: number;
  intentBoost: number;
  totalMultiplier: number;
}

interface MatchDetails {
  titleMatch: boolean;
  titleContains: boolean;
  matchedTerms: string[];
}

interface DebugResult {
  id: string;
  title: string;
  type: string;
  slug: string;
  baseScore: number;
  adjustedScore: number;
  scoreBreakdown: ScoreBreakdown;
  matchDetails: MatchDetails;
  metadata: {
    viewCount: number | null;
    publishedAt: string | null;
  };
}

interface PipelineStep {
  step: string;
  query: string;
  resultCount: number;
  durationMs: number;
  details: string;
}

interface QueryAnalysis {
  original: string;
  normalized: string;
  tokens: string[];
  language: string;
  queryExpansion: {
    synonymsApplied: string[];
    resolvedCity: string | null;
    expandedTerms: string[];
  };
  spellCheck: {
    corrected: string;
    wasChanged: boolean;
    confidence: number;
    suggestions: string[];
  };
}

interface IntentClassification {
  primary: string;
  confidence: number;
  matchedPatterns: string[];
  extractedEntities: Record<string, unknown>;
  suggestedFilters: Record<string, unknown>;
  filterReasons: string[];
}

interface SearchDebugResponse {
  query: string;
  timestamp: string;
  totalDurationMs: number;
  queryAnalysis: QueryAnalysis;
  intentClassification: IntentClassification;
  pipeline: PipelineStep[];
  results: DebugResult[];
  noResultsReasons: string[];
  recommendations: string[];
}

interface RankingFactors {
  factors: Record<string, string>;
  note: string;
}

export default function SearchDebugPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [debugResult, setDebugResult] = useState<SearchDebugResponse | null>(null);

  // Get ranking factor explanations
  const { data: rankingFactors } = useQuery<RankingFactors>({
    queryKey: ["/api/admin/search/debug/ranking-factors"],
  });

  // Debug search mutation
  const debugMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("GET", `/api/admin/search/debug?q=${encodeURIComponent(query)}`);
      return response.json() as Promise<SearchDebugResponse>;
    },
    onSuccess: (data) => {
      setDebugResult(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Debug failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDebug = () => {
    if (searchQuery.trim()) {
      debugMutation.mutate(searchQuery);
    }
  };

  const getIntentBadgeColor = (intent: string): "default" | "secondary" | "outline" => {
    if (intent === "navigational") return "default";
    if (intent === "transactional") return "secondary";
    return "outline";
  };

  const formatMs = (ms: number) => {
    return ms < 1 ? "<1ms" : `${ms.toFixed(0)}ms`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bug className="h-8 w-8 text-primary" />
          Search Debug
        </h1>
        <p className="text-muted-foreground mt-1">
          Debug search queries - understand why results appear (or don't)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Debug Query
          </CardTitle>
          <CardDescription>
            Enter a search query to see the full pipeline breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter search query to debug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDebug()}
              data-testid="input-search-debug"
            />
            <Button
              onClick={handleDebug}
              disabled={debugMutation.isPending}
              data-testid="button-debug"
            >
              <Bug className="h-4 w-4 mr-2" />
              Debug
            </Button>
          </div>
        </CardContent>
      </Card>

      {debugMutation.isPending && (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      )}

      {debugResult && (
        <div className="space-y-6">
          {/* Summary Header */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Query: "{debugResult.query}"</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatMs(debugResult.totalDurationMs)}
                  </Badge>
                  <Badge variant={debugResult.results.length > 0 ? "default" : "destructive"}>
                    {debugResult.results.length} results
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="pipeline">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="query">Query Analysis</TabsTrigger>
              <TabsTrigger value="intent">Intent</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="help">Ranking Help</TabsTrigger>
            </TabsList>

            {/* Pipeline Tab */}
            <TabsContent value="pipeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Execution Pipeline
                  </CardTitle>
                  <CardDescription>
                    Step-by-step breakdown of how the query was processed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {debugResult.pipeline.map((step, index) => (
                      <div key={step.step} className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium capitalize">{step.step.replace(/_/g, " ")}</h4>
                            <Badge variant="outline">{formatMs(step.durationMs)}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{step.details}</p>
                          {step.query !== debugResult.query && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Query: "{step.query}"
                            </p>
                          )}
                        </div>
                        {index < debugResult.pipeline.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground mt-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Warnings & Recommendations */}
              {(debugResult.noResultsReasons.length > 0 || debugResult.recommendations.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {debugResult.noResultsReasons.length > 0 && (
                    <Card className="border-orange-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                          <AlertTriangle className="h-4 w-4" />
                          Issues Detected
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1 text-sm">
                          {debugResult.noResultsReasons.map((reason, i) => (
                            <li key={i} className="text-muted-foreground">{reason}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {debugResult.recommendations.length > 0 && (
                    <Card className="border-green-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2 text-green-600">
                          <Lightbulb className="h-4 w-4" />
                          Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1 text-sm">
                          {debugResult.recommendations.map((rec, i) => (
                            <li key={i} className="text-muted-foreground">{rec}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Query Analysis Tab */}
            <TabsContent value="query" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Tokenization</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Original</p>
                      <p className="font-mono text-sm">{debugResult.queryAnalysis.original}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Normalized</p>
                      <p className="font-mono text-sm">{debugResult.queryAnalysis.normalized}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tokens</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {debugResult.queryAnalysis.tokens.map((token, i) => (
                          <Badge key={i} variant="secondary">{token}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Detected Language</p>
                      <Badge>{debugResult.queryAnalysis.language}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Query Expansion</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Resolved City</p>
                      <p className="text-sm">
                        {debugResult.queryAnalysis.queryExpansion.resolvedCity || "None"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Synonyms Applied</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {debugResult.queryAnalysis.queryExpansion.synonymsApplied.length > 0 ? (
                          debugResult.queryAnalysis.queryExpansion.synonymsApplied.map((syn, i) => (
                            <Badge key={i} variant="outline">{syn}</Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expanded Terms</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {debugResult.queryAnalysis.queryExpansion.expandedTerms.map((term, i) => (
                          <Badge key={i} variant="secondary">{term}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      Spell Check
                      {debugResult.queryAnalysis.spellCheck.wasChanged ? (
                        <Badge variant="default" className="bg-blue-500">Corrected</Badge>
                      ) : (
                        <Badge variant="outline">No changes</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Corrected Query</p>
                        <p className="font-mono text-sm">{debugResult.queryAnalysis.spellCheck.corrected}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        <p className="text-sm">{(debugResult.queryAnalysis.spellCheck.confidence * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    {debugResult.queryAnalysis.spellCheck.suggestions.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground">Suggestions</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {debugResult.queryAnalysis.spellCheck.suggestions.map((sug, i) => (
                            <Badge key={i} variant="outline">{sug}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Intent Tab */}
            <TabsContent value="intent" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Intent Classification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Primary Intent</p>
                      <Badge variant={getIntentBadgeColor(debugResult.intentClassification.primary)} className="text-lg">
                        {debugResult.intentClassification.primary}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${debugResult.intentClassification.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm">{(debugResult.intentClassification.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Extracted Entities</p>
                    {Object.keys(debugResult.intentClassification.extractedEntities).length > 0 ? (
                      <div className="font-mono text-sm bg-muted p-3 rounded-lg">
                        {JSON.stringify(debugResult.intentClassification.extractedEntities, null, 2)}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No entities extracted</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Suggested Filters</p>
                    {Object.keys(debugResult.intentClassification.suggestedFilters).length > 0 ? (
                      <div className="font-mono text-sm bg-muted p-3 rounded-lg">
                        {JSON.stringify(debugResult.intentClassification.suggestedFilters, null, 2)}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No filters suggested</p>
                    )}
                  </div>

                  {debugResult.intentClassification.filterReasons.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Filter Reasons</p>
                      <ul className="space-y-1">
                        {debugResult.intentClassification.filterReasons.map((reason, i) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <Filter className="h-3 w-3 text-muted-foreground" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Search Results ({debugResult.results.length})
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Detailed scoring breakdown for each result
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {debugResult.results.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No results found for this query</p>
                        </div>
                      ) : (
                        debugResult.results.map((result, index) => (
                          <div
                            key={result.id}
                            className="p-4 border rounded-lg"
                            data-testid={`debug-result-${index}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl font-bold text-muted-foreground">#{index + 1}</span>
                                <div>
                                  <h4 className="font-medium">{result.title}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary">{result.type}</Badge>
                                    <span className="text-xs text-muted-foreground">/{result.slug}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold">{result.adjustedScore.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">
                                  Base: {result.baseScore.toFixed(2)}
                                </p>
                              </div>
                            </div>

                            <Separator className="my-3" />

                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
                              <div>
                                <p className="text-xs text-muted-foreground">Type</p>
                                <p className="font-medium">{result.scoreBreakdown.typeWeight.toFixed(1)}x</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Title</p>
                                <p className="font-medium">{result.scoreBreakdown.titleMatchBoost.toFixed(1)}x</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Recency</p>
                                <p className="font-medium">{result.scoreBreakdown.recencyBoost.toFixed(2)}x</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Popularity</p>
                                <p className="font-medium">{result.scoreBreakdown.popularityBoost.toFixed(2)}x</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Intent</p>
                                <p className="font-medium">{result.scoreBreakdown.intentBoost.toFixed(1)}x</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Total</p>
                                <p className="font-bold text-primary">{result.scoreBreakdown.totalMultiplier.toFixed(2)}x</p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              {result.matchDetails.titleMatch && (
                                <Badge variant="default" className="bg-green-500">Exact Title Match</Badge>
                              )}
                              {result.matchDetails.titleContains && !result.matchDetails.titleMatch && (
                                <Badge variant="secondary">Title Contains Term</Badge>
                              )}
                              {result.matchDetails.matchedTerms.map((term) => (
                                <Badge key={term} variant="outline">Matched: {term}</Badge>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Help Tab */}
            <TabsContent value="help" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Ranking Factor Reference
                  </CardTitle>
                  <CardDescription>
                    {rankingFactors?.note || "Understanding how search results are ranked"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {rankingFactors?.factors && Object.entries(rankingFactors.factors).map(([key, value]) => (
                      <div key={key} className="p-3 bg-muted rounded-lg">
                        <h4 className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

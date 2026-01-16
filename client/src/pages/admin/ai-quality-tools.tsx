import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertTriangle,
  BookOpen,
  RefreshCw,
  Sparkles,
  Shield,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
  Lightbulb,
} from "lucide-react";

interface HallucinationReport {
  overallRiskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  metrics: {
    totalClaims: number;
    verifiedClaims: number;
    unverifiedClaims: number;
    flaggedClaims: number;
  };
  claims: Array<{
    text: string;
    confidence: number;
    verified: boolean;
    reason?: string;
  }>;
  recommendations: string[];
}

interface ReadabilityMetrics {
  overallScore: number;
  gradeLevel: number;
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  gunningFogIndex: number;
  smogIndex: number;
  colemanLiauIndex: number;
  automatedReadabilityIndex: number;
  daleChallScore?: number;
  vocabularyDiversity: number;
  averageSentenceLength: number;
  averageWordLength: number;
  recommendations: string[];
}

interface ParaphraseResult {
  original: string;
  paraphrased: string;
  qualityScore: number;
  style: string;
  changes: Array<{
    type: string;
    description: string;
  }>;
}

export default function AIQualityToolsPage() {
  const { toast } = useToast();
  
  const [hallucinationContent, setHallucinationContent] = useState("");
  const [strictMode, setStrictMode] = useState(false);
  const [sourceContext, setSourceContext] = useState("");
  const [hallucinationResult, setHallucinationResult] = useState<HallucinationReport | null>(null);
  
  const [readabilityContent, setReadabilityContent] = useState("");
  const [targetAudience, setTargetAudience] = useState<string>("general");
  const [readabilityResult, setReadabilityResult] = useState<ReadabilityMetrics | null>(null);
  
  const [paraphraseContent, setParaphraseContent] = useState("");
  const [paraphraseStyle, setParaphraseStyle] = useState<string>("professional");
  const [paraphraseTone, setParaphraseTone] = useState<string>("neutral");
  const [seoOptimized, setSeoOptimized] = useState(false);
  const [preserveKeywords, setPreserveKeywords] = useState("");
  const [variationsResult, setVariationsResult] = useState<ParaphraseResult[] | null>(null);

  const hallucinationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai-quality/hallucinations/analyze", {
        content: hallucinationContent,
        options: {
          strictMode,
          sourceContext: sourceContext || undefined,
        },
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setHallucinationResult(data.data);
        toast({
          title: "Analysis Complete",
          description: `Risk level: ${data.data.riskLevel}`,
        });
      } else {
        toast({
          title: "Analysis Failed",
          description: data.error || "Unknown error",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const readabilityMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai-quality/readability/analyze", {
        content: readabilityContent,
        options: {
          targetAudience,
        },
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setReadabilityResult(data.data);
        toast({
          title: "Analysis Complete",
          description: `Grade Level: ${data.data.gradeLevel}`,
        });
      } else {
        toast({
          title: "Analysis Failed",
          description: data.error || "Unknown error",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const variationsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai-quality/paraphrase/variations", {
        content: paraphraseContent,
        count: 3,
        style: paraphraseStyle,
        tone: paraphraseTone,
        seoOptimized,
        preserveKeywords: preserveKeywords ? preserveKeywords.split(",").map(k => k.trim()) : undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setVariationsResult(data.data);
        toast({
          title: "Variations Generated",
          description: `Generated ${data.data.length} variations`,
        });
      } else {
        toast({
          title: "Generation Failed",
          description: data.error || "Unknown error",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "low": return "text-green-600 dark:text-green-400";
      case "medium": return "text-yellow-600 dark:text-yellow-400";
      case "high": return "text-orange-600 dark:text-orange-400";
      case "critical": return "text-red-600 dark:text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case "low": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Low Risk</Badge>;
      case "medium": return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Medium Risk</Badge>;
      case "high": return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">High Risk</Badge>;
      case "critical": return <Badge variant="destructive">Critical Risk</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-page-title">
            <Shield className="h-8 w-8 text-primary" />
            AI Content Quality Tools
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
            Update 9987 - Analyze and improve your content
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Hallucination Detector
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-tool-hallucination">Active</div>
            <p className="text-xs text-muted-foreground">Detect AI-generated inaccuracies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Readability Analyzer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-tool-readability">Active</div>
            <p className="text-xs text-muted-foreground">Measure content accessibility</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Content Paraphraser
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-tool-paraphraser">Active</div>
            <p className="text-xs text-muted-foreground">Generate style variations</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="hallucination" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hallucination" className="gap-2" data-testid="tab-hallucination">
            <AlertTriangle className="h-4 w-4" />
            Hallucination Detector
          </TabsTrigger>
          <TabsTrigger value="readability" className="gap-2" data-testid="tab-readability">
            <BookOpen className="h-4 w-4" />
            Readability Analyzer
          </TabsTrigger>
          <TabsTrigger value="paraphraser" className="gap-2" data-testid="tab-paraphraser">
            <Sparkles className="h-4 w-4" />
            Content Paraphraser
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hallucination" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Content Input
                </CardTitle>
                <CardDescription>
                  Enter content to analyze for potential hallucinations (minimum 100 characters)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hallucination-content">Content</Label>
                  <Textarea
                    id="hallucination-content"
                    placeholder="Paste your AI-generated content here..."
                    className="min-h-[200px]"
                    value={hallucinationContent}
                    onChange={(e) => setHallucinationContent(e.target.value)}
                    data-testid="textarea-hallucination-content"
                  />
                  <p className="text-xs text-muted-foreground">
                    {hallucinationContent.length} characters
                    {hallucinationContent.length < 100 && hallucinationContent.length > 0 && (
                      <span className="text-orange-500"> (minimum 100 required)</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="strict-mode"
                    checked={strictMode}
                    onCheckedChange={(checked) => setStrictMode(!!checked)}
                    data-testid="checkbox-strict-mode"
                  />
                  <Label htmlFor="strict-mode" className="text-sm font-normal">
                    Strict Mode (more thorough analysis)
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source-context">Source Context (Optional)</Label>
                  <Textarea
                    id="source-context"
                    placeholder="Provide source material for grounding checks..."
                    className="min-h-[100px]"
                    value={sourceContext}
                    onChange={(e) => setSourceContext(e.target.value)}
                    data-testid="textarea-source-context"
                  />
                </div>

                <Button
                  onClick={() => hallucinationMutation.mutate()}
                  disabled={hallucinationContent.length < 100 || hallucinationMutation.isPending}
                  className="w-full"
                  data-testid="button-analyze-hallucinations"
                >
                  {hallucinationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Analyze
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hallucinationResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Risk Score</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${getRiskColor(hallucinationResult.riskLevel)}`} data-testid="text-risk-score">
                          {hallucinationResult.overallRiskScore}%
                        </span>
                        {getRiskBadge(hallucinationResult.riskLevel)}
                      </div>
                    </div>
                    <Progress 
                      value={hallucinationResult.overallRiskScore} 
                      className="h-2"
                    />

                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold" data-testid="text-total-claims">{hallucinationResult.metrics.totalClaims}</div>
                        <div className="text-xs text-muted-foreground">Total Claims</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-green-600" data-testid="text-verified-claims">{hallucinationResult.metrics.verifiedClaims}</div>
                        <div className="text-xs text-muted-foreground">Verified</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600" data-testid="text-unverified-claims">{hallucinationResult.metrics.unverifiedClaims}</div>
                        <div className="text-xs text-muted-foreground">Unverified</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-red-600" data-testid="text-flagged-claims">{hallucinationResult.metrics.flaggedClaims}</div>
                        <div className="text-xs text-muted-foreground">Flagged</div>
                      </div>
                    </div>

                    {hallucinationResult.claims && hallucinationResult.claims.length > 0 && (
                      <div className="pt-4">
                        <h4 className="text-sm font-medium mb-2">Claims Found</h4>
                        <ScrollArea className="h-[150px]">
                          <div className="space-y-2">
                            {hallucinationResult.claims.map((claim, index) => (
                              <div key={index} className="p-2 bg-muted rounded-lg text-sm">
                                <div className="flex items-start gap-2">
                                  {claim.verified ? (
                                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                  )}
                                  <div>
                                    <p>{claim.text}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Confidence: {Math.round(claim.confidence * 100)}%
                                      {claim.reason && ` • ${claim.reason}`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {hallucinationResult.recommendations && hallucinationResult.recommendations.length > 0 && (
                      <div className="pt-4">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          Recommendations
                        </h4>
                        <ul className="space-y-1">
                          {hallucinationResult.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <Info className="h-3 w-3 mt-1 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <Shield className="h-12 w-12 mb-4 opacity-50" />
                    <p>No analysis results yet</p>
                    <p className="text-sm">Enter content and click Analyze</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="readability" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Content Input
                </CardTitle>
                <CardDescription>
                  Enter content to analyze readability metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="readability-content">Content</Label>
                  <Textarea
                    id="readability-content"
                    placeholder="Paste your content here..."
                    className="min-h-[250px]"
                    value={readabilityContent}
                    onChange={(e) => setReadabilityContent(e.target.value)}
                    data-testid="textarea-readability-content"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-audience">Target Audience</Label>
                  <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger id="target-audience" data-testid="select-target-audience">
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => readabilityMutation.mutate()}
                  disabled={!readabilityContent.trim() || readabilityMutation.isPending}
                  className="w-full"
                  data-testid="button-analyze-readability"
                >
                  {readabilityMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Analyze
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Readability Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {readabilityResult ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="font-medium">Overall Score</span>
                        <span className={`text-2xl font-bold ${getScoreColor(readabilityResult.overallScore)}`} data-testid="text-overall-score">
                          {readabilityResult.overallScore}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="font-medium">Grade Level</span>
                        <span className="text-xl font-bold" data-testid="text-grade-level">
                          Grade {readabilityResult.gradeLevel}
                        </span>
                      </div>

                      <div className="space-y-3 pt-2">
                        <h4 className="text-sm font-medium">Detailed Metrics</h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 border rounded-lg">
                            <div className="text-lg font-bold" data-testid="text-flesch-ease">{readabilityResult.fleschReadingEase.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">Flesch Reading Ease</div>
                          </div>
                          <div className="p-3 border rounded-lg">
                            <div className="text-lg font-bold" data-testid="text-flesch-kincaid">{readabilityResult.fleschKincaidGrade.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">Flesch-Kincaid Grade</div>
                          </div>
                          <div className="p-3 border rounded-lg">
                            <div className="text-lg font-bold" data-testid="text-gunning-fog">{readabilityResult.gunningFogIndex.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">Gunning Fog Index</div>
                          </div>
                          <div className="p-3 border rounded-lg">
                            <div className="text-lg font-bold" data-testid="text-smog-index">{readabilityResult.smogIndex.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">SMOG Index</div>
                          </div>
                          <div className="p-3 border rounded-lg">
                            <div className="text-lg font-bold" data-testid="text-coleman-liau">{readabilityResult.colemanLiauIndex.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">Coleman-Liau Index</div>
                          </div>
                          <div className="p-3 border rounded-lg">
                            <div className="text-lg font-bold" data-testid="text-ari">{readabilityResult.automatedReadabilityIndex.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">Automated Readability</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="p-3 border rounded-lg">
                            <div className="text-lg font-bold">{(readabilityResult.vocabularyDiversity * 100).toFixed(0)}%</div>
                            <div className="text-xs text-muted-foreground">Vocabulary Diversity</div>
                          </div>
                          <div className="p-3 border rounded-lg">
                            <div className="text-lg font-bold">{readabilityResult.averageSentenceLength.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">Avg. Sentence Length</div>
                          </div>
                        </div>
                      </div>

                      {readabilityResult.recommendations && readabilityResult.recommendations.length > 0 && (
                        <div className="pt-4">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Recommendations
                          </h4>
                          <ul className="space-y-1">
                            {readabilityResult.recommendations.map((rec, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                <Info className="h-3 w-3 mt-1 flex-shrink-0" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <BookOpen className="h-12 w-12 mb-4 opacity-50" />
                    <p>No analysis results yet</p>
                    <p className="text-sm">Enter content and click Analyze</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="paraphraser" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Content Input
                </CardTitle>
                <CardDescription>
                  Enter content to generate style variations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paraphrase-content">Content</Label>
                  <Textarea
                    id="paraphrase-content"
                    placeholder="Paste your content here..."
                    className="min-h-[150px]"
                    value={paraphraseContent}
                    onChange={(e) => setParaphraseContent(e.target.value)}
                    data-testid="textarea-paraphrase-content"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paraphrase-style">Style</Label>
                    <Select value={paraphraseStyle} onValueChange={setParaphraseStyle}>
                      <SelectTrigger id="paraphrase-style" data-testid="select-style">
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="engaging">Engaging</SelectItem>
                        <SelectItem value="informative">Informative</SelectItem>
                        <SelectItem value="concise">Concise</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paraphrase-tone">Tone</Label>
                    <Select value={paraphraseTone} onValueChange={setParaphraseTone}>
                      <SelectTrigger id="paraphrase-tone" data-testid="select-tone">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                        <SelectItem value="authoritative">Authoritative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="seo-optimized"
                    checked={seoOptimized}
                    onCheckedChange={(checked) => setSeoOptimized(!!checked)}
                    data-testid="checkbox-seo-optimized"
                  />
                  <Label htmlFor="seo-optimized" className="text-sm font-normal">
                    SEO Optimized
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preserve-keywords">Keywords to Preserve (comma-separated)</Label>
                  <Input
                    id="preserve-keywords"
                    placeholder="e.g., Dubai, luxury, travel"
                    value={preserveKeywords}
                    onChange={(e) => setPreserveKeywords(e.target.value)}
                    data-testid="input-preserve-keywords"
                  />
                </div>

                <Button
                  onClick={() => variationsMutation.mutate()}
                  disabled={!paraphraseContent.trim() || variationsMutation.isPending}
                  className="w-full"
                  data-testid="button-generate-variations"
                >
                  {variationsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Variations
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Generated Variations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {variationsResult && variationsResult.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <h4 className="text-sm font-medium mb-2">Original</h4>
                        <p className="text-sm" data-testid="text-original-content">{variationsResult[0]?.original || paraphraseContent}</p>
                      </div>

                      {variationsResult.map((variation, index) => (
                        <div key={index} className="p-3 border rounded-lg space-y-2" data-testid={`card-variation-${index}`}>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">Variation {index + 1}</Badge>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Quality:</span>
                              <span className={`font-bold ${getScoreColor(variation.qualityScore)}`}>
                                {variation.qualityScore}%
                              </span>
                            </div>
                          </div>
                          <p className="text-sm">{variation.paraphrased}</p>
                          {variation.changes && variation.changes.length > 0 && (
                            <div className="pt-2">
                              <p className="text-xs text-muted-foreground">
                                Changes: {variation.changes.map(c => c.type).join(", ")}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <Sparkles className="h-12 w-12 mb-4 opacity-50" />
                    <p>No variations generated yet</p>
                    <p className="text-sm">Enter content and click Generate Variations</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

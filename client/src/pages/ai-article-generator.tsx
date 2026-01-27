import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Sparkles,
  FileText,
  Tag,
  BarChart3,
  Lightbulb,
  AlertCircle,
  Check,
  Copy,
  RefreshCw,
  ArrowRight,
  Zap,
  Clock,
  Users,
  Globe,
  HelpCircle,
  Link,
  Image,
  ChevronRight,
  UserCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GeneratedArticle {
  meta: {
    title: string;
    description: string;
    slug: string;
    keywords: string[];
    ogTitle: string;
    ogDescription: string;
  };
  analysis: {
    category: string;
    tone: string;
    personality: string;
    structure: string;
    uniqueAngle: string;
    marketingWords: string[];
    primaryKeyword: string;
    secondaryKeywords: string[];
    lsiKeywords: string[];
    urgency: string;
    audience: string[];
  };
  article: {
    h1: string;
    intro: string;
    quickFacts: { label: string; value: string }[];
    sections: { heading: string; body: string }[];
    proTips: string[];
    goodToKnow: string[];
    faq: { q: string; a: string }[];
    internalLinks: { anchor: string; suggestedTopic: string }[];
    altTexts: string[];
    closing: string;
  };
  suggestions: {
    alternativeHeadlines: string[];
    alternativeIntros: string[];
    alternativeCta: string;
  };
  heroImage?: {
    url: string;
    alt: string;
    source: "library" | "freepik";
    imageId: string;
  } | null;
}

const inputTypeOptions = [
  { value: "title_only", label: "Title Only", description: "Generate from title alone" },
  { value: "title_summary", label: "Title + Summary", description: "Include a brief summary" },
  { value: "title_rss", label: "From RSS Feed", description: "Include RSS contents" },
  { value: "title_url", label: "From URL", description: "Include source URL" },
  { value: "manual_override", label: "Manual Input", description: "Full custom source text" },
];

interface Writer {
  id: string;
  name: string;
  avatar?: string;
  category?: string;
  expertise?: string[];
  nationality?: string;
  bio?: string;
}

export default function AIArticleGenerator() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [inputType, setInputType] = useState("title_only");
  const [selectedWriterId, setSelectedWriterId] = useState<string>("auto");
  const [generatedData, setGeneratedData] = useState<GeneratedArticle | null>(null);
  const [editedData, setEditedData] = useState<GeneratedArticle | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch available writers
  const { data: writersData, isLoading: writersLoading } = useQuery<{ writers: Writer[] }>({
    queryKey: ["/api/writers"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/generate-article", {
        title,
        summary:
          inputType === "title_summary" || inputType === "manual_override" ? summary : undefined,
        sourceUrl: inputType === "title_url" ? sourceUrl : undefined,
        sourceText:
          inputType === "manual_override" || inputType === "title_rss" ? sourceText : undefined,
        inputType,
      });
      return response.json();
    },
    onSuccess: (data: GeneratedArticle) => {
      setGeneratedData(data);
      setEditedData(data);
      toast({
        title: "Article generated",
        description: "Your AI-generated article is ready for review.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate article. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createDraftMutation = useMutation({
    mutationFn: async () => {
      if (!editedData) throw new Error("No data to save");

      const slug =
        editedData.meta.slug ||
        editedData.article.h1
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") + `-${Date.now()}`;

      // Convert data to editor-compatible format
      // Highlights/Tips use 'contents' as newline-separated string, FAQ uses individual blocks
      const blocks = [
        {
          type: "hero",
          data: {
            title: editedData.article.h1,
            subtitle: editedData.article.intro,
            image: editedData.heroImage?.url || null,
          },
        },
        ...editedData.article.sections.map(section => ({
          type: "text",
          data: {
            heading: section.heading,
            contents: section.body,
          },
        })),
        ...(editedData.article.quickFacts?.length
          ? [
              {
                type: "highlights",
                data: {
                  contents: editedData.article.quickFacts
                    .map(f => `${f.label}: ${f.value}`)
                    .join("\n"),
                },
              },
            ]
          : []),
        ...(editedData.article.proTips?.length
          ? [
              {
                type: "tips",
                data: {
                  contents: editedData.article.proTips.join("\n"),
                },
              },
            ]
          : []),
        ...(editedData.article.goodToKnow?.length
          ? [
              {
                type: "tips",
                data: {
                  contents: editedData.article.goodToKnow.join("\n"),
                },
              },
            ]
          : []),
        // Create individual FAQ blocks for each question/answer pair
        ...(editedData.article.faq?.length
          ? editedData.article.faq.map(f => ({
              type: "faq",
              data: {
                question: f.q,
                answer: f.a,
              },
            }))
          : []),
        {
          type: "cta",
          data: {
            title: "Plan Your Trip",
            contents: "Ready to experience Dubai? Start planning your adventure today!",
            buttonText: "Explore More",
            buttonLink: "/articles",
          },
        },
      ];

      const categoryMap: Record<string, string> = {
        A: "attractions",
        B: "hotels",
        C: "food",
        D: "transport",
        E: "events",
        F: "tips",
        G: "news",
        H: "shopping",
      };
      const categoryCode = editedData.analysis.category?.charAt(0) || "F";
      const mappedCategory = categoryMap[categoryCode] || "tips";

      // Get the selected writer - if "auto", call server to find optimal writer
      let resolvedWriterId: string | null = null;
      if (selectedWriterId !== "auto") {
        resolvedWriterId = selectedWriterId;
      } else {
        // Use server-side assignment system for optimal writer selection
        try {
          const optimalResponse = await apiRequest("POST", "/api/writers/optimal", {
            contentType: "article",
            topic: editedData.article.h1,
            keywords: editedData.meta.keywords || [],
          });
          const optimalData = await optimalResponse.json();
          resolvedWriterId = optimalData.writer?.id || null;
        } catch (err) {
          // Fall back to first available writer if optimal endpoint fails

          resolvedWriterId = writersData?.writers?.[0]?.id || null;
        }
      }

      const response = await apiRequest("POST", "/api/contents", {
        title: editedData.article.h1,
        slug,
        type: "article",
        status: "draft",
        metaTitle: editedData.meta.title,
        metaDescription: editedData.meta.description,
        ogTitle: editedData.meta.ogTitle,
        ogDescription: editedData.meta.ogDescription,
        keywords: editedData.meta.keywords,
        primaryKeyword:
          editedData.analysis.primaryKeyword ||
          editedData.meta.keywords?.[0] ||
          editedData.article.h1,
        secondaryKeywords: editedData.analysis.secondaryKeywords || [],
        heroImage: editedData.heroImage?.url || null,
        heroImageAlt: editedData.heroImage?.alt || editedData.article.h1,
        blocks,
        writerId: resolvedWriterId || null,
        generatedByAI: true,
        article: {
          category: mappedCategory,
          tone: editedData.analysis.tone,
          personality: editedData.analysis.personality,
          urgencyLevel: editedData.analysis.urgency,
          targetAudience: editedData.analysis.audience,
          quickFacts: editedData.article.quickFacts?.map(f => `${f.label}: ${f.value}`) || [],
          proTips: editedData.article.proTips || [],
          warnings: editedData.article.goodToKnow || [],
          faq: editedData.article.faq?.map(f => ({ question: f.q, answer: f.a })) || [],
        },
      });
      return response.json();
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ["/api/contents?type=article"] });
      toast({
        title: "Draft created",
        description: "Article saved as draft. Redirecting to editor...",
      });
      navigate(`/admin/articles/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create draft",
        description: error.message || "Could not save article. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string, fieldName: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const applyAlternative = (type: "headline" | "intro" | "cta", value: string) => {
    if (!editedData) return;

    const updated = { ...editedData };
    if (type === "headline") {
      updated.article.h1 = value;
    } else if (type === "intro") {
      updated.article.intro = value;
    } else if (type === "cta") {
      updated.article.closing = value;
    }
    setEditedData(updated);
    toast({
      title: "Applied",
      description: `Alternative ${type} applied to the article.`,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your article.",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Article Generator
          </h1>
          <p className="text-muted-foreground">
            Generate SEO-optimized Dubai travel contents using AI
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Input</CardTitle>
            <CardDescription>Provide the source information for your article</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Article Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., New Dubai Metro Extension Opens"
                  data-testid="input-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inputType">Input Type</Label>
                <Select value={inputType} onValueChange={setInputType}>
                  <SelectTrigger data-testid="select-input-type">
                    <SelectValue placeholder="Select input type" />
                  </SelectTrigger>
                  <SelectContent>
                    {inputTypeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {inputTypeOptions.find(o => o.value === inputType)?.description}
                </p>
              </div>

              {(inputType === "title_summary" || inputType === "manual_override") && (
                <div className="space-y-2">
                  <Label htmlFor="summary">Summary / Source Text</Label>
                  <Textarea
                    id="summary"
                    value={inputType === "manual_override" ? sourceText : summary}
                    onChange={e =>
                      inputType === "manual_override"
                        ? setSourceText(e.target.value)
                        : setSummary(e.target.value)
                    }
                    placeholder="Enter a summary or full source text..."
                    rows={4}
                    data-testid="input-summary"
                  />
                </div>
              )}

              {inputType === "title_url" && (
                <div className="space-y-2">
                  <Label htmlFor="sourceUrl">Source URL</Label>
                  <Input
                    id="sourceUrl"
                    type="url"
                    value={sourceUrl}
                    onChange={e => setSourceUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    data-testid="input-source-url"
                  />
                </div>
              )}

              {inputType === "title_rss" && (
                <div className="space-y-2">
                  <Label htmlFor="rssContent">RSS Content</Label>
                  <Textarea
                    id="rssContent"
                    value={sourceText}
                    onChange={e => setSourceText(e.target.value)}
                    placeholder="Paste RSS item contents here..."
                    rows={4}
                    data-testid="input-rss-contents"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="writer" className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  Assign Writer
                </Label>
                <Select
                  value={selectedWriterId}
                  onValueChange={setSelectedWriterId}
                  disabled={writersLoading}
                >
                  <SelectTrigger data-testid="select-writer">
                    <SelectValue
                      placeholder={writersLoading ? "Loading writers..." : "Select a writer"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span>Auto-select based on category</span>
                      </div>
                    </SelectItem>
                    {writersData?.writers?.map(writer => (
                      <SelectItem key={writer.id} value={writer.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            {writer.avatar && <AvatarImage src={writer.avatar} alt={writer.name} />}
                            <AvatarFallback>{writer.name?.[0] || "W"}</AvatarFallback>
                          </Avatar>
                          <span>{writer.name}</span>
                          {writer.category && (
                            <span className="text-xs text-muted-foreground">
                              ({writer.category})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {selectedWriterId === "auto"
                    ? "Writer matched to article category (hotels, food, culture, etc.)"
                    : `Selected: ${writersData?.writers?.find(w => w.id === selectedWriterId)?.name || selectedWriterId}`}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={generateMutation.isPending}
                data-testid="button-generate"
              >
                {generateMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Article
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {generateMutation.isPending && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                    <span className="font-medium">Generating your article...</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The AI is analyzing your input and creating SEO-optimized contents. This may
                    take 15-30 seconds.
                  </p>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {editedData && !generateMutation.isPending && (
            <>
              <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
                <div>
                  <h3 className="font-medium text-sm">Ready to save?</h3>
                  <p className="text-xs text-muted-foreground">Create a draft article in the CMS</p>
                </div>
                <Button
                  onClick={() => createDraftMutation.mutate()}
                  disabled={createDraftMutation.isPending}
                  data-testid="button-create-draft"
                >
                  {createDraftMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Create Draft Article
                    </>
                  )}
                </Button>
              </div>

              <Tabs defaultValue="article" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="article" data-testid="tab-article">
                    <FileText className="h-4 w-4 mr-2" />
                    Article
                  </TabsTrigger>
                  <TabsTrigger value="meta" data-testid="tab-meta">
                    <Tag className="h-4 w-4 mr-2" />
                    Meta
                  </TabsTrigger>
                  <TabsTrigger value="analysis" data-testid="tab-analysis">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analysis
                  </TabsTrigger>
                  <TabsTrigger value="suggestions" data-testid="tab-suggestions">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Suggestions
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="article" className="mt-4">
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-6">
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between gap-4">
                            <CardTitle className="text-lg">Headline (H1)</CardTitle>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(editedData.article.h1, "h1")}
                              data-testid="button-copy-h1"
                            >
                              {copiedField === "h1" ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            value={editedData.article.h1}
                            onChange={e =>
                              setEditedData({
                                ...editedData,
                                article: { ...editedData.article, h1: e.target.value },
                              })
                            }
                            rows={2}
                            className="font-semibold text-lg"
                            data-testid="textarea-h1"
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between gap-4">
                            <CardTitle className="text-lg">Introduction</CardTitle>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(editedData.article.intro, "intro")}
                              data-testid="button-copy-intro"
                            >
                              {copiedField === "intro" ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            value={editedData.article.intro}
                            onChange={e =>
                              setEditedData({
                                ...editedData,
                                article: { ...editedData.article, intro: e.target.value },
                              })
                            }
                            rows={4}
                            data-testid="textarea-intro"
                          />
                        </CardContent>
                      </Card>

                      {editedData.article.quickFacts?.length > 0 && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              Quick Facts
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-3">
                              {editedData.article.quickFacts.map((fact, idx) => (
                                <div
                                  key={idx}
                                  className="flex flex-col gap-1 p-2 rounded-md bg-muted/50"
                                >
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {fact.label}
                                  </span>
                                  <span className="text-sm">{fact.value}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Content Sections</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Accordion type="multiple" className="w-full">
                            {editedData.article.sections?.map((section, idx) => (
                              <AccordionItem key={idx} value={`section-${idx}`}>
                                <AccordionTrigger className="text-left">
                                  <span className="font-medium">{section.heading}</span>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <Textarea
                                    value={section.body}
                                    onChange={e => {
                                      const newSections = [...editedData.article.sections];
                                      newSections[idx] = {
                                        ...newSections[idx],
                                        body: e.target.value,
                                      };
                                      setEditedData({
                                        ...editedData,
                                        article: { ...editedData.article, sections: newSections },
                                      });
                                    }}
                                    rows={6}
                                    className="mt-2"
                                    data-testid={`textarea-section-${idx}`}
                                  />
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </CardContent>
                      </Card>

                      {editedData.article.proTips?.length > 0 && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Lightbulb className="h-4 w-4" />
                              Pro Tips
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {editedData.article.proTips.map((tip, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                                  <span className="text-sm">{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {editedData.article.goodToKnow?.length > 0 && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Good to Know
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {editedData.article.goodToKnow.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <ChevronRight className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
                                  <span className="text-sm">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {editedData.article.faq?.length > 0 && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <HelpCircle className="h-4 w-4" />
                              FAQ ({editedData.article.faq.length} items)
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Accordion type="multiple" className="w-full">
                              {editedData.article.faq.map((item, idx) => (
                                <AccordionItem key={idx} value={`faq-${idx}`}>
                                  <AccordionTrigger className="text-left">
                                    <span className="font-medium text-sm">{item.q}</span>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <p className="text-sm text-muted-foreground">{item.a}</p>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </CardContent>
                        </Card>
                      )}

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Closing</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            value={editedData.article.closing}
                            onChange={e =>
                              setEditedData({
                                ...editedData,
                                article: { ...editedData.article, closing: e.target.value },
                              })
                            }
                            rows={3}
                            data-testid="textarea-closing"
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="meta" className="mt-4">
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <Label>Meta Title</Label>
                          <Badge variant="secondary" className="text-xs">
                            {editedData.meta.title?.length || 0}/65 chars
                          </Badge>
                        </div>
                        <Input
                          value={editedData.meta.title}
                          onChange={e =>
                            setEditedData({
                              ...editedData,
                              meta: { ...editedData.meta, title: e.target.value },
                            })
                          }
                          data-testid="input-meta-title"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <Label>Meta Description</Label>
                          <Badge variant="secondary" className="text-xs">
                            {editedData.meta.description?.length || 0}/160 chars
                          </Badge>
                        </div>
                        <Textarea
                          value={editedData.meta.description}
                          onChange={e =>
                            setEditedData({
                              ...editedData,
                              meta: { ...editedData.meta, description: e.target.value },
                            })
                          }
                          rows={3}
                          data-testid="input-meta-description"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Slug</Label>
                        <Input
                          value={editedData.meta.slug}
                          onChange={e =>
                            setEditedData({
                              ...editedData,
                              meta: { ...editedData.meta, slug: e.target.value },
                            })
                          }
                          data-testid="input-slug"
                        />
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Open Graph Title
                        </Label>
                        <Input
                          value={editedData.meta.ogTitle}
                          onChange={e =>
                            setEditedData({
                              ...editedData,
                              meta: { ...editedData.meta, ogTitle: e.target.value },
                            })
                          }
                          data-testid="input-og-title"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Open Graph Description
                        </Label>
                        <Textarea
                          value={editedData.meta.ogDescription}
                          onChange={e =>
                            setEditedData({
                              ...editedData,
                              meta: { ...editedData.meta, ogDescription: e.target.value },
                            })
                          }
                          rows={2}
                          data-testid="input-og-description"
                        />
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label>Keywords</Label>
                        <div className="flex flex-wrap gap-2">
                          {editedData.meta.keywords?.map((keyword, idx) => (
                            <Badge key={idx} variant="outline">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="analysis" className="mt-4">
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Category</Label>
                          <p className="font-medium">{editedData.analysis.category}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Tone</Label>
                          <p className="font-medium capitalize">{editedData.analysis.tone}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Personality</Label>
                          <p className="font-medium">{editedData.analysis.personality}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Structure</Label>
                          <p className="font-medium capitalize">
                            {editedData.analysis.structure?.replace("_", " ")}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Unique Angle</Label>
                        <p className="text-sm">{editedData.analysis.uniqueAngle}</p>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Urgency
                          </Label>
                          <Badge
                            variant={
                              editedData.analysis.urgency === "urgent" ? "destructive" : "secondary"
                            }
                          >
                            {editedData.analysis.urgency}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Target Audience
                          </Label>
                          <div className="flex flex-wrap gap-1">
                            {editedData.analysis.audience?.map((a, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {a}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Primary Keyword</Label>
                        <Badge>{editedData.analysis.primaryKeyword}</Badge>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Secondary Keywords</Label>
                        <div className="flex flex-wrap gap-1">
                          {editedData.analysis.secondaryKeywords?.map((k, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {k}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">LSI Keywords</Label>
                        <div className="flex flex-wrap gap-1">
                          {editedData.analysis.lsiKeywords?.map((k, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {k}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Marketing Words Used ({editedData.analysis.marketingWords?.length || 0}/5
                          max)
                        </Label>
                        <div className="flex flex-wrap gap-1">
                          {editedData.analysis.marketingWords?.map((w, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs bg-amber-50 dark:bg-amber-950"
                            >
                              {w}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="suggestions" className="mt-4">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Alternative Headlines</CardTitle>
                        <CardDescription>Click to apply a different headline</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {editedData.suggestions.alternativeHeadlines?.map((headline, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            className="w-full justify-between text-left h-auto py-3"
                            onClick={() => applyAlternative("headline", headline)}
                            data-testid={`button-alt-headline-${idx}`}
                          >
                            <span className="flex-1 text-wrap">{headline}</span>
                            <ArrowRight className="h-4 w-4 flex-shrink-0 ml-2" />
                          </Button>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Alternative Intros</CardTitle>
                        <CardDescription>Click to apply a different introduction</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {editedData.suggestions.alternativeIntros?.map((intro, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            className="w-full justify-between text-left h-auto py-3"
                            onClick={() => applyAlternative("intro", intro)}
                            data-testid={`button-alt-intro-${idx}`}
                          >
                            <span className="flex-1 text-wrap text-sm">{intro}</span>
                            <ArrowRight className="h-4 w-4 flex-shrink-0 ml-2" />
                          </Button>
                        ))}
                      </CardContent>
                    </Card>

                    {editedData.suggestions.alternativeCta && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Alternative CTA</CardTitle>
                          <CardDescription>Click to apply as closing statement</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button
                            variant="outline"
                            className="w-full justify-between text-left h-auto py-3"
                            onClick={() =>
                              applyAlternative("cta", editedData.suggestions.alternativeCta)
                            }
                            data-testid="button-alt-cta"
                          >
                            <span className="flex-1 text-wrap text-sm">
                              {editedData.suggestions.alternativeCta}
                            </span>
                            <ArrowRight className="h-4 w-4 flex-shrink-0 ml-2" />
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {editedData.article.internalLinks?.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Link className="h-4 w-4" />
                            Suggested Internal Links
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {editedData.article.internalLinks.map((link, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <Badge variant="outline" className="flex-shrink-0">
                                  {link.anchor}
                                </Badge>
                                <span className="text-muted-foreground">{link.suggestedTopic}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {editedData.article.altTexts?.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            Suggested Image Alt Texts
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {editedData.article.altTexts.map((alt, idx) => (
                              <li key={idx} className="text-sm p-2 rounded bg-muted/50">
                                {alt}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}

          {!editedData && !generateMutation.isPending && (
            <Card className="lg:col-span-2">
              <CardContent className="py-16 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">Generate Your First Article</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Enter a title and click generate to create an SEO-optimized Dubai travel article
                  using AI.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

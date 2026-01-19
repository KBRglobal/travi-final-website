import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Save, Globe, FileText, Image, Link as LinkIcon, 
  Bot, Eye, RefreshCw, Search, Code, Wand2, Loader2,
  CheckCircle2, AlertTriangle, XCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface AIGeneratedSeo {
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonicalUrl?: string;
  robotsMeta?: string;
  score?: {
    titleScore: number;
    descriptionScore: number;
    overall: number;
  };
  suggestions?: string[];
}

interface PageSeo {
  id?: string;
  pagePath: string;
  pageLabel?: string;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  robotsMeta: string | null;
  jsonLdSchema: any;
}

interface PageSeoEditorProps {
  pagePath: string;
  pageLabel: string;
}

export function PageSeoEditor({ pagePath, pageLabel }: PageSeoEditorProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<PageSeo>>({});
  const [jsonLdInput, setJsonLdInput] = useState("");

  const [isNewRecord, setIsNewRecord] = useState(false);

  const { data: seoData, isLoading } = useQuery<PageSeo | null>({
    queryKey: ["/api/admin/page-seo", pagePath],
    queryFn: async () => {
      const res = await fetch(`/api/admin/page-seo${pagePath}`);
      if (res.status === 404) {
        setIsNewRecord(true);
        return null;
      }
      setIsNewRecord(false);
      return res.json();
    },
  });

  // Sync form data when SEO data is loaded
  useEffect(() => {
    if (seoData) {
      setFormData(seoData);
      setJsonLdInput(seoData.jsonLdSchema ? JSON.stringify(seoData.jsonLdSchema, null, 2) : "");
    }
  }, [seoData]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<PageSeo>) => {
      let jsonLdSchema = null;
      if (jsonLdInput.trim()) {
        try {
          jsonLdSchema = JSON.parse(jsonLdInput);
        } catch (e) {
          throw new Error("Invalid JSON-LD schema format");
        }
      }
      
      // Filter out database metadata fields per field ownership contract
      // Only send SEO-specific fields that are allowed by the contract
      const { id, createdAt, updatedAt, _meta, ...seoFields } = data as any;
      
      return apiRequest("PUT", `/api/admin/page-seo${pagePath}`, {
        ...seoFields,
        pageLabel,
        jsonLdSchema,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/page-seo", pagePath] });
      toast({
        title: "SEO Settings Saved",
        description: `SEO configuration for ${pageLabel} has been updated.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Saving SEO",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof PageSeo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value || null }));
  };

  // AI SEO Generation
  const [aiScore, setAiScore] = useState<{ titleScore: number; descriptionScore: number; overall: number } | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/generate-page-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          pagePath, 
          pageLabel,
          context: `This is the main ${pageLabel.toLowerCase()} index page for the Travi travel platform.` 
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to generate SEO" }));
        throw new Error(error.error || "Failed to generate SEO");
      }
      return res.json() as Promise<AIGeneratedSeo>;
    },
    onSuccess: (data) => {
      setFormData(prev => ({
        ...prev,
        metaTitle: data.metaTitle || prev.metaTitle,
        metaDescription: data.metaDescription || prev.metaDescription,
        ogTitle: data.ogTitle || prev.ogTitle,
        ogDescription: data.ogDescription || prev.ogDescription,
        canonicalUrl: data.canonicalUrl || prev.canonicalUrl,
        robotsMeta: data.robotsMeta || prev.robotsMeta,
      }));
      if (data.score) {
        setAiScore(data.score);
      }
      if (data.suggestions) {
        setAiSuggestions(data.suggestions);
      }
      toast({
        title: "AI SEO Generated",
        description: `Generated optimized SEO content${data.score ? ` with ${data.score.overall}% score` : ""}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const titleLength = (formData.metaTitle || "").length;
  const descLength = (formData.metaDescription || "").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          {pageLabel} SEO Settings
        </CardTitle>
        <CardDescription>
          Configure SEO metadata for the {pageLabel} page. All values are stored in the database with no auto-generation or fallbacks.
        </CardDescription>
        {isNewRecord && (
          <div className="mt-3 flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">No SEO data exists in the database for this page. Fill in the fields below and save to create the record.</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="meta" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="meta" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Meta Tags
            </TabsTrigger>
            <TabsTrigger value="og" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Open Graph
            </TabsTrigger>
            <TabsTrigger value="schema" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              JSON-LD
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="meta" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="metaTitle" className="flex items-center justify-between">
                <span>Meta Title</span>
                <span className={`text-xs ${
                  titleLength > 0 && (titleLength < 30 || titleLength > 60) 
                    ? "text-destructive font-medium" 
                    : "text-muted-foreground"
                }`}>
                  {titleLength}/60 {titleLength > 0 && titleLength < 30 && "(min 30)"}
                </span>
              </Label>
              <Input
                id="metaTitle"
                data-testid="input-meta-title"
                placeholder="Enter page title for search engines"
                value={formData.metaTitle || ""}
                onChange={(e) => handleInputChange("metaTitle", e.target.value)}
                className={titleLength > 0 && (titleLength < 30 || titleLength > 60) ? "border-destructive" : ""}
              />
              {titleLength > 0 && (titleLength < 30 || titleLength > 60) && (
                <p className="text-xs text-destructive">
                  Title should be 30-60 characters for optimal search engine display
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Appears in browser tab and search results. Recommended: 30-60 characters.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaDescription" className="flex items-center justify-between">
                <span>Meta Description</span>
                <span className={`text-xs ${
                  descLength > 0 && (descLength < 120 || descLength > 160) 
                    ? "text-destructive font-medium" 
                    : "text-muted-foreground"
                }`}>
                  {descLength}/160 {descLength > 0 && descLength < 120 && "(min 120)"}
                </span>
              </Label>
              <Textarea
                id="metaDescription"
                data-testid="input-meta-description"
                placeholder="Enter page description for search engines"
                rows={3}
                value={formData.metaDescription || ""}
                onChange={(e) => handleInputChange("metaDescription", e.target.value)}
                className={descLength > 0 && (descLength < 120 || descLength > 160) ? "border-destructive" : ""}
              />
              {descLength > 0 && (descLength < 120 || descLength > 160) && (
                <p className="text-xs text-destructive">
                  Description should be 120-160 characters for optimal search display
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Appears below the title in search results. Recommended: 120-160 characters.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="canonicalUrl">Canonical URL</Label>
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="canonicalUrl"
                  data-testid="input-canonical-url"
                  placeholder="https://travi.world/destinations"
                  value={formData.canonicalUrl || ""}
                  onChange={(e) => handleInputChange("canonicalUrl", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="robotsMeta">Robots Meta</Label>
              <Input
                id="robotsMeta"
                data-testid="input-robots-meta"
                placeholder="index, follow"
                value={formData.robotsMeta || ""}
                onChange={(e) => handleInputChange("robotsMeta", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Options: index, noindex, follow, nofollow
              </p>
            </div>
          </TabsContent>

          <TabsContent value="og" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="ogTitle">Open Graph Title</Label>
              <Input
                id="ogTitle"
                data-testid="input-og-title"
                placeholder="Title for social media shares"
                value={formData.ogTitle || ""}
                onChange={(e) => handleInputChange("ogTitle", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ogDescription">Open Graph Description</Label>
              <Textarea
                id="ogDescription"
                data-testid="input-og-description"
                placeholder="Description for social media shares"
                rows={3}
                value={formData.ogDescription || ""}
                onChange={(e) => handleInputChange("ogDescription", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ogImage">Open Graph Image URL</Label>
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="ogImage"
                  data-testid="input-og-image"
                  placeholder="https://travi.world/images/destinations-og.jpg"
                  value={formData.ogImage || ""}
                  onChange={(e) => handleInputChange("ogImage", e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: 1200x630 pixels for optimal display on social media.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="schema" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="jsonLdSchema" className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                JSON-LD Structured Data
              </Label>
              <Textarea
                id="jsonLdSchema"
                data-testid="input-json-ld"
                placeholder={`{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Travel Destinations",
  "description": "Explore our collection of travel destinations"
}`}
                rows={12}
                className="font-mono text-sm"
                value={jsonLdInput}
                onChange={(e) => setJsonLdInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter valid JSON-LD schema for structured data. Leave empty if not needed.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            {(!formData.metaTitle && !formData.metaDescription) ? (
              <div className="border border-dashed rounded-lg p-8 text-center bg-muted/20">
                <XCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium text-lg mb-2">No SEO Data Available</h3>
                <p className="text-muted-foreground text-sm">
                  Enter meta title and description in the Meta Tags tab to see a preview.
                  <br />
                  All SEO data must be explicitly set - no defaults or fallbacks are used.
                </p>
              </div>
            ) : (
              <>
                <div className="border rounded-lg p-6 bg-muted/30">
                  <h3 className="text-sm font-medium mb-4 text-muted-foreground">Google Search Preview</h3>
                  <div className="space-y-1">
                    {formData.metaTitle ? (
                      <div className="text-blue-600 text-lg hover:underline cursor-pointer">
                        {formData.metaTitle}
                      </div>
                    ) : (
                      <div className="text-destructive text-lg border border-dashed border-destructive/50 rounded px-2 py-1 bg-destructive/5">
                        Required: Set meta title in Meta Tags tab
                      </div>
                    )}
                    <div className="text-green-700 text-sm">
                      {formData.canonicalUrl || `https://travi.world${pagePath}`}
                    </div>
                    {formData.metaDescription ? (
                      <div className="text-sm text-gray-600">
                        {formData.metaDescription}
                      </div>
                    ) : (
                      <div className="text-destructive text-sm border border-dashed border-destructive/50 rounded px-2 py-1 bg-destructive/5">
                        Required: Set meta description in Meta Tags tab
                      </div>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-6 bg-muted/30">
                  <h3 className="text-sm font-medium mb-4 text-muted-foreground">Social Media Preview</h3>
                  <div className="border rounded-lg overflow-hidden max-w-md">
                    {formData.ogImage ? (
                      <img 
                        src={formData.ogImage} 
                        alt="OG Preview" 
                        className="w-full h-40 object-cover"
                      />
                    ) : (
                      <div className="w-full h-40 bg-muted flex items-center justify-center text-muted-foreground border-b">
                        Set OG image in Open Graph tab
                      </div>
                    )}
                    <div className="p-3 bg-card">
                      <div className="text-xs text-muted-foreground uppercase">travi.world</div>
                      {(formData.ogTitle || formData.metaTitle) ? (
                        <div className="font-medium mt-1">
                          {formData.ogTitle || formData.metaTitle}
                        </div>
                      ) : (
                        <div className="text-destructive text-sm mt-1">Required: Set OG or meta title</div>
                      )}
                      {(formData.ogDescription || formData.metaDescription) ? (
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {formData.ogDescription || formData.metaDescription}
                        </div>
                      ) : (
                        <div className="text-destructive text-sm mt-1">Required: Set OG or meta description</div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* SEO Score Panel */}
        {aiScore && (
          <div className="mt-6 pt-6 border-t space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                AI SEO Score
              </h4>
              <Badge variant={aiScore.overall >= 80 ? "default" : aiScore.overall >= 50 ? "secondary" : "destructive"}>
                {aiScore.overall >= 80 ? "Good" : aiScore.overall >= 50 ? "Needs Work" : "Poor"}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{aiScore.overall}%</div>
                <div className="text-xs text-muted-foreground">Overall</div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Title</span>
                  <span className={aiScore.titleScore >= 80 ? "text-green-600" : "text-amber-600"}>{aiScore.titleScore}%</span>
                </div>
                <Progress value={aiScore.titleScore} className="h-1.5" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Description</span>
                  <span className={aiScore.descriptionScore >= 80 ? "text-green-600" : "text-amber-600"}>{aiScore.descriptionScore}%</span>
                </div>
                <Progress value={aiScore.descriptionScore} className="h-1.5" />
              </div>
            </div>
            {aiSuggestions.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Suggestions</h5>
                {aiSuggestions.map((suggestion, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500" />
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center mt-6 pt-6 border-t">
          <Button 
            variant="outline"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            data-testid="button-generate-seo"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                AI Generate SEO
              </>
            )}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending}
            data-testid="button-save-seo"
          >
            {saveMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save SEO Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PageSeoManagement() {
  const pages = [
    { path: "/destinations", label: "Destinations List" },
    { path: "/hotels", label: "Hotels List" },
    { path: "/attractions", label: "Attractions List" },
    { path: "/guides", label: "Travel Guides" },
    { path: "/news", label: "News & Articles" },
  ];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Search className="w-8 h-8" />
          Page SEO Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure SEO metadata for key pages. All values are stored in the database - no auto-generation or fallbacks.
        </p>
      </div>

      <Tabs defaultValue="/destinations" className="w-full">
        <TabsList className="mb-6">
          {pages.map(page => (
            <TabsTrigger key={page.path} value={page.path}>
              {page.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {pages.map(page => (
          <TabsContent key={page.path} value={page.path}>
            <PageSeoEditor pagePath={page.path} pageLabel={page.label} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

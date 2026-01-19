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
  Bot, Eye, RefreshCw, Search, Code
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const { data: seoData, isLoading } = useQuery<PageSeo>({
    queryKey: ["/api/admin/page-seo", pagePath],
    queryFn: async () => {
      const res = await fetch(`/api/admin/page-seo${pagePath}`);
      if (res.status === 404) {
        return {
          pagePath,
          pageLabel,
          metaTitle: null,
          metaDescription: null,
          canonicalUrl: null,
          ogTitle: null,
          ogDescription: null,
          ogImage: null,
          robotsMeta: "index, follow",
          jsonLdSchema: null,
        };
      }
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
      
      return apiRequest("PUT", `/api/admin/page-seo${pagePath}`, {
        ...data,
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
                <span className={`text-xs ${titleLength > 60 ? "text-red-500" : "text-muted-foreground"}`}>
                  {titleLength}/60 characters
                </span>
              </Label>
              <Input
                id="metaTitle"
                data-testid="input-meta-title"
                placeholder="Enter page title for search engines"
                value={formData.metaTitle || ""}
                onChange={(e) => handleInputChange("metaTitle", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Appears in browser tab and search results. Recommended: 50-60 characters.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaDescription" className="flex items-center justify-between">
                <span>Meta Description</span>
                <span className={`text-xs ${descLength > 160 ? "text-red-500" : "text-muted-foreground"}`}>
                  {descLength}/160 characters
                </span>
              </Label>
              <Textarea
                id="metaDescription"
                data-testid="input-meta-description"
                placeholder="Enter page description for search engines"
                rows={3}
                value={formData.metaDescription || ""}
                onChange={(e) => handleInputChange("metaDescription", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Appears below the title in search results. Recommended: 150-160 characters.
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
            <div className="border rounded-lg p-6 bg-muted/30">
              <h3 className="text-sm font-medium mb-4 text-muted-foreground">Google Search Preview</h3>
              <div className="space-y-1">
                <div className="text-blue-600 text-lg hover:underline cursor-pointer">
                  {formData.metaTitle || "(No title set)"}
                </div>
                <div className="text-green-700 text-sm">
                  {formData.canonicalUrl || `https://travi.world${pagePath}`}
                </div>
                <div className="text-sm text-gray-600">
                  {formData.metaDescription || "(No description set)"}
                </div>
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
                  <div className="w-full h-40 bg-muted flex items-center justify-center text-muted-foreground">
                    No image set
                  </div>
                )}
                <div className="p-3 bg-card">
                  <div className="text-xs text-muted-foreground uppercase">travi.world</div>
                  <div className="font-medium mt-1">
                    {formData.ogTitle || formData.metaTitle || "(No OG title set)"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {formData.ogDescription || formData.metaDescription || "(No OG description set)"}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6 pt-6 border-t">
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

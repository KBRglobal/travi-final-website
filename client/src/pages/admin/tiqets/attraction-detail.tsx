/**
 * Attraction Editor - Full content editing for Tiqets attractions
 * Elementor-style editor with tabs for different content sections
 */

type ListFieldName = "highlights" | "whatsIncluded" | "whatsExcluded";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  ExternalLink,
  FileText,
  Settings,
  Sparkles,
  HelpCircle,
  MapPin,
  Plus,
  Trash2,
  Eye,
  Search,
} from "lucide-react";

interface Attraction {
  id: string;
  tiqetsId: string;
  title: string;
  slug: string;
  seoSlug: string | null;
  h1Title: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  description: string | null;
  cityName: string;
  productUrl: string;
  highlights: string[] | null;
  whatsIncluded: string[] | null;
  whatsExcluded: string[] | null;
  faqs: Array<{ question: string; answer: string }> | null;
  primaryCategory: string | null;
  secondaryCategories: string[] | null;
  images: Array<{ url: string; alt: string; isHero?: boolean }> | null;
  status: "imported" | "processing" | "ready" | "published" | "archived";
  contentGenerationStatus: string | null;
  aiContent: {
    introduction: string;
    whyVisit: string;
    proTip: string;
    whatToExpect: Array<{ title: string; description: string; icon: string }>;
    visitorTips: Array<{ title: string; description: string; icon: string }>;
    howToGetThere: { description: string; transport: Array<{ mode: string; details: string }> };
    answerCapsule: string;
  } | null;
  qualityScore: number | null;
  seoScore: number | null;
}

function EditorSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

export default function AttractionDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("content");

  // Fetch attraction data
  const { data: attraction, isLoading } = useQuery<Attraction>({
    queryKey: ["/api/admin/tiqets/attractions", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tiqets/attractions/${id}`);
      if (!res.ok) throw new Error("Failed to fetch attraction");
      return res.json();
    },
    enabled: !!id,
  });

  // Form state
  const [formData, setFormData] = useState<Partial<Attraction>>({});

  // Initialize form when data loads
  useEffect(() => {
    if (attraction) {
      setFormData(attraction);
    }
  }, [attraction]);

  // Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Attraction>) => {
      return apiRequest("PATCH", `/api/admin/tiqets/attractions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tiqets/attractions", id] });
      toast({ title: "Saved!", description: "Attraction updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const updateField = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateAiContent = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      aiContent: {
        ...((prev.aiContent || attraction?.aiContent) as Attraction["aiContent"]),
        [field]: value,
      },
    }));
  };

  // List management helpers
  const addListItem = (field: ListFieldName) => {
    const current = formData[field] || attraction?.[field] || [];
    updateField(field, [...current, ""]);
  };

  const updateListItem = (field: ListFieldName, index: number, value: string) => {
    const current = [...(formData[field] || attraction?.[field] || [])];
    current[index] = value;
    updateField(field, current);
  };

  const removeListItem = (field: ListFieldName, index: number) => {
    const current = [...(formData[field] || attraction?.[field] || [])];
    current.splice(index, 1);
    updateField(field, current);
  };

  // FAQ management
  const addFaq = () => {
    const current = formData.faqs || attraction?.faqs || [];
    updateField("faqs", [...current, { question: "", answer: "" }]);
  };

  const updateFaq = (index: number, field: "question" | "answer", value: string) => {
    const current = [...(formData.faqs || attraction?.faqs || [])];
    current[index] = { ...current[index], [field]: value };
    updateField("faqs", current);
  };

  const removeFaq = (index: number) => {
    const current = [...(formData.faqs || attraction?.faqs || [])];
    current.splice(index, 1);
    updateField("faqs", current);
  };

  if (isLoading) return <EditorSkeleton />;
  if (!attraction) return <div className="p-6">Attraction not found</div>;

  const data = { ...attraction, ...formData };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-background z-10 py-4 border-b">
        <div className="flex items-center gap-4">
          <Link href="/admin/attractions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold line-clamp-1">{data.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {data.cityName}
              <Badge variant={data.status === "published" ? "default" : "secondary"}>
                {data.status}
              </Badge>
              {data.qualityScore && <Badge variant="outline">Quality: {data.qualityScore}%</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/en/${data.cityName.toLowerCase()}/attractions/${data.seoSlug || data.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </a>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Editor Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="content" className="gap-2">
            <FileText className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-2">
            <Search className="h-4 w-4" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Content
          </TabsTrigger>
          <TabsTrigger value="faqs" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            FAQs
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Main content that appears on the attraction page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="h1Title">Page Title (H1)</Label>
                <Input
                  id="h1Title"
                  value={data.h1Title || data.title}
                  onChange={e => updateField("h1Title", e.target.value)}
                  placeholder="Main heading for the page"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={data.description || ""}
                  onChange={e => updateField("description", e.target.value)}
                  placeholder="Detailed description of the attraction..."
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Highlights</CardTitle>
              <CardDescription>Key features that make this attraction special</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data.highlights || []).map((item, index) => (
                <div
                  key={`highlight-${item.slice(0, 30)}-${index}`}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={item}
                    onChange={e => updateListItem("highlights", index, e.target.value)}
                    placeholder="Highlight..."
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeListItem("highlights", index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addListItem("highlights")}>
                <Plus className="h-4 w-4 mr-2" />
                Add Highlight
              </Button>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>What's Included</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(data.whatsIncluded || []).map((item, index) => (
                  <div
                    key={`included-${item.slice(0, 30)}-${index}`}
                    className="flex items-center gap-2"
                  >
                    <Input
                      value={item}
                      onChange={e => updateListItem("whatsIncluded", index, e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeListItem("whatsIncluded", index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addListItem("whatsIncluded")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What's Not Included</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(data.whatsExcluded || []).map((item, index) => (
                  <div
                    key={`excluded-${item.slice(0, 30)}-${index}`}
                    className="flex items-center gap-2"
                  >
                    <Input
                      value={item}
                      onChange={e => updateListItem("whatsExcluded", index, e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeListItem("whatsExcluded", index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addListItem("whatsExcluded")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>Optimize how this page appears in search results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seoSlug">URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm whitespace-nowrap">
                    /{data.cityName.toLowerCase()}/attractions/
                  </span>
                  <Input
                    id="seoSlug"
                    value={data.seoSlug || data.slug}
                    onChange={e => updateField("seoSlug", e.target.value)}
                    className="flex-1"
                    placeholder="attraction-name (without city)"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Don't include city name - it's already in the URL path
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={data.metaTitle || ""}
                  onChange={e => updateField("metaTitle", e.target.value)}
                  placeholder="SEO title (max 60 characters)"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  {(data.metaTitle || "").length}/60 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={data.metaDescription || ""}
                  onChange={e => updateField("metaDescription", e.target.value)}
                  placeholder="SEO description (max 160 characters)"
                  maxLength={160}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {(data.metaDescription || "").length}/160 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SEO Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Search Preview</CardTitle>
              <CardDescription>How this page might appear in Google</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-white">
                <div className="text-blue-600 text-lg hover:underline cursor-pointer">
                  {data.metaTitle || data.h1Title || data.title}
                </div>
                <div className="text-green-700 text-sm">
                  travi.com/{data.cityName.toLowerCase()}/attractions/{data.seoSlug || data.slug}
                </div>
                <div className="text-gray-600 text-sm mt-1">
                  {data.metaDescription || data.description?.slice(0, 160) || "No description set"}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Content Tab */}
        <TabsContent value="ai" className="space-y-6">
          {data.aiContent ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Introduction</CardTitle>
                  <CardDescription>Opening paragraph for the attraction</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={data.aiContent.introduction}
                    onChange={e => updateAiContent("introduction", e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Why Visit</CardTitle>
                  <CardDescription>Compelling reasons to visit this attraction</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={data.aiContent.whyVisit}
                    onChange={e => updateAiContent("whyVisit", e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pro Tip</CardTitle>
                  <CardDescription>Insider advice for visitors</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={data.aiContent.proTip}
                    onChange={e => updateAiContent("proTip", e.target.value)}
                    rows={3}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Answer Capsule (AEO)</CardTitle>
                  <CardDescription>Direct answer for featured snippets</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={data.aiContent.answerCapsule}
                    onChange={e => updateAiContent("answerCapsule", e.target.value)}
                    rows={3}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No AI Content Generated</h3>
                <p className="text-muted-foreground mb-4">
                  AI content hasn't been generated for this attraction yet.
                </p>
                <Button>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate AI Content
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* FAQs Tab */}
        <TabsContent value="faqs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Help visitors find answers quickly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(data.faqs || []).map((faq, index) => (
                <div
                  key={`faq-${faq.question.slice(0, 30)}-${index}`}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-3">
                      <div className="space-y-2">
                        <Label>Question</Label>
                        <Input
                          value={faq.question}
                          onChange={e => updateFaq(index, "question", e.target.value)}
                          placeholder="What visitors commonly ask..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Answer</Label>
                        <Textarea
                          value={faq.answer}
                          onChange={e => updateFaq(index, "answer", e.target.value)}
                          placeholder="Helpful answer..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFaq(index)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addFaq}>
                <Plus className="h-4 w-4 mr-2" />
                Add FAQ
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publication Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={data.status} onValueChange={v => updateField("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imported">Imported</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Primary Category</Label>
                <Input
                  value={data.primaryCategory || ""}
                  onChange={e => updateField("primaryCategory", e.target.value)}
                  placeholder="e.g., Museum, Theme Park, Tour..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tiqets Information</CardTitle>
              <CardDescription>Original data from Tiqets API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tiqets ID:</span>
                <span className="font-mono">{data.tiqetsId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Slug:</span>
                <span className="font-mono">{data.slug}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Product URL:</span>
                <a
                  href={data.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  View on Tiqets <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

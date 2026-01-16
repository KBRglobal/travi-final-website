import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, Save, Eye, Trash2, Plus, GripVertical,
  FileText, Search, MessageSquare, Link2, Settings,
  CheckCircle2, AlertCircle, Loader2
} from "lucide-react";
import type { RealEstatePage } from "@shared/schema";

const faqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
});

const relatedLinkSchema = z.object({
  title: z.string().min(1, "Title is required"),
  path: z.string().min(1, "Path is required"),
  description: z.string().optional(),
});

const sectionSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string().optional(),
  contents: z.string().optional(),
  data: z.unknown().optional(),
});

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  metaTitle: z.string().max(60, "Meta title should be 50-60 characters").optional().nullable(),
  metaDescription: z.string().max(160, "Meta description should be 150-160 characters").optional().nullable(),
  heroTitle: z.string().optional().nullable(),
  heroSubtitle: z.string().optional().nullable(),
  introText: z.string().optional().nullable(),
  sections: z.array(sectionSchema).default([]),
  faqs: z.array(faqSchema).default([]),
  relatedLinks: z.array(relatedLinkSchema).default([]),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

const CATEGORY_LABELS: Record<string, string> = {
  guide: "Guide",
  calculator: "Calculator",
  comparison: "Comparison",
  case_study: "Case Study",
  location: "Location",
  developer: "Developer",
  pillar: "Pillar Page",
};

export default function RealEstateEditor() {
  const { pageKey } = useParams<{ pageKey: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("contents");

  const { data: page, isLoading, error } = useQuery<RealEstatePage>({
    queryKey: ["/api/real-estate-pages", pageKey],
    queryFn: async () => {
      const response = await fetch(`/api/real-estate-pages/${pageKey}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch page");
      return response.json();
    },
    enabled: !!pageKey,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      metaTitle: "",
      metaDescription: "",
      heroTitle: "",
      heroSubtitle: "",
      introText: "",
      sections: [],
      faqs: [],
      relatedLinks: [],
      isActive: true,
    },
  });

  const { fields: faqFields, append: appendFaq, remove: removeFaq } = useFieldArray({
    control: form.control,
    name: "faqs",
  });

  const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray({
    control: form.control,
    name: "relatedLinks",
  });

  useEffect(() => {
    if (page) {
      form.reset({
        title: page.title || "",
        metaTitle: page.metaTitle || "",
        metaDescription: page.metaDescription || "",
        heroTitle: page.heroTitle || "",
        heroSubtitle: page.heroSubtitle || "",
        introText: page.introText || "",
        sections: page.sections || [],
        faqs: page.faqs || [],
        relatedLinks: page.relatedLinks || [],
        isActive: page.isActive ?? true,
      });
    }
  }, [page, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest("PATCH", `/api/real-estate-pages/${pageKey}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/real-estate-pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/real-estate-pages", pageKey] });
      toast({
        title: "Saved",
        description: "Page contents updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save changes",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    saveMutation.mutate(data);
  };

  const metaTitleLength = form.watch("metaTitle")?.length || 0;
  const metaDescLength = form.watch("metaDescription")?.length || 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested page could not be found. Make sure you've initialized the pages first.
            </p>
            <Button onClick={() => navigate("/admin/real-estate")} data-testid="button-back-notfound">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Real Estate Management
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/admin/real-estate")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{page.title}</h1>
              <Badge variant="outline">
                {CATEGORY_LABELS[page.category] || page.category}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Edit contents, SEO settings, and FAQs for this page
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/${page.pageKey}`, "_blank")}
            data-testid="button-preview"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={saveMutation.isPending}
            data-testid="button-save"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 max-w-xl">
              <TabsTrigger value="contents" className="flex items-center gap-2" data-testid="tab-contents">
                <FileText className="h-4 w-4" />
                Content
              </TabsTrigger>
              <TabsTrigger value="seo" className="flex items-center gap-2" data-testid="tab-seo">
                <Search className="h-4 w-4" />
                SEO
              </TabsTrigger>
              <TabsTrigger value="faqs" className="flex items-center gap-2" data-testid="tab-faqs">
                <MessageSquare className="h-4 w-4" />
                FAQs ({faqFields.length})
              </TabsTrigger>
              <TabsTrigger value="links" className="flex items-center gap-2" data-testid="tab-links">
                <Link2 className="h-4 w-4" />
                Links ({linkFields.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contents" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Page Content</CardTitle>
                  <CardDescription>
                    Edit the main contents displayed on this page
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Page Title</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Enter page title"
                            data-testid="input-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Hero Section</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="heroTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hero Title</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ""}
                                placeholder="Main headline"
                                data-testid="input-hero-title"
                              />
                            </FormControl>
                            <FormDescription>
                              Large headline displayed in the hero section
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="heroSubtitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hero Subtitle</FormLabel>
                            <FormControl>
                              <Input 
                                {...field}
                                value={field.value || ""}
                                placeholder="Supporting text"
                                data-testid="input-hero-subtitle"
                              />
                            </FormControl>
                            <FormDescription>
                              Secondary text under the headline
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <FormField
                    control={form.control}
                    name="introText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Introduction Text</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            value={field.value || ""}
                            placeholder="Write an engaging introduction paragraph..."
                            className="min-h-[150px]"
                            data-testid="input-intro-text"
                          />
                        </FormControl>
                        <FormDescription>
                          Opening paragraph that introduces the page topic
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Page Active</FormLabel>
                          <FormDescription>
                            When disabled, the page will not be accessible to visitors
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seo" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>SEO Settings</CardTitle>
                  <CardDescription>
                    Optimize this page for search engines. Follow the character limits for best results.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="metaTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">
                          <span>Meta Title</span>
                          <span className={`text-xs ${metaTitleLength > 60 ? "text-destructive" : metaTitleLength >= 50 ? "text-green-600" : "text-muted-foreground"}`}>
                            {metaTitleLength}/60 characters
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            value={field.value || ""}
                            placeholder="SEO-optimized page title"
                            data-testid="input-meta-title"
                          />
                        </FormControl>
                        <FormDescription>
                          Optimal length: 50-60 characters. This appears in search results.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="metaDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">
                          <span>Meta Description</span>
                          <span className={`text-xs ${metaDescLength > 160 ? "text-destructive" : metaDescLength >= 150 ? "text-green-600" : "text-muted-foreground"}`}>
                            {metaDescLength}/160 characters
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            value={field.value || ""}
                            placeholder="Brief description for search engines..."
                            className="min-h-[100px]"
                            data-testid="input-meta-description"
                          />
                        </FormControl>
                        <FormDescription>
                          Optimal length: 150-160 characters. Compelling description to improve click-through rate.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Card className="bg-muted">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Search Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <p className="text-blue-600 dark:text-blue-400 text-lg hover:underline cursor-pointer truncate">
                          {form.watch("metaTitle") || form.watch("title") || "Page Title"}
                        </p>
                        <p className="text-green-700 dark:text-green-500 text-sm truncate">
                          travi.ae/{page.pageKey}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {form.watch("metaDescription") || "Add a meta description to see how it appears in search results..."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="faqs" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle>Frequently Asked Questions</CardTitle>
                      <CardDescription>
                        Add FAQs to improve SEO and provide quick answers to visitors
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => appendFaq({ question: "", answer: "" })}
                      data-testid="button-add-faq"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add FAQ
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {faqFields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No FAQs added yet</p>
                      <p className="text-sm">Click "Add FAQ" to create your first question</p>
                    </div>
                  ) : (
                    faqFields.map((field, index) => (
                      <Card key={field.id} className="bg-muted" data-testid={`card-faq-${index}`}>
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 space-y-4">
                              <FormField
                                control={form.control}
                                name={`faqs.${index}.question`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Question {index + 1}</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        placeholder="What is the question?"
                                        data-testid={`input-faq-question-${index}`}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`faqs.${index}.answer`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Answer</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        {...field}
                                        placeholder="Provide a helpful answer..."
                                        className="min-h-[100px]"
                                        data-testid={`input-faq-answer-${index}`}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFaq(index)}
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-remove-faq-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="links" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle>Related Links</CardTitle>
                      <CardDescription>
                        Add internal links to related pages for better navigation and SEO
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => appendLink({ title: "", path: "", description: "" })}
                      data-testid="button-add-link"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Link
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {linkFields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No related links added yet</p>
                      <p className="text-sm">Click "Add Link" to create internal links</p>
                    </div>
                  ) : (
                    linkFields.map((field, index) => (
                      <Card key={field.id} className="bg-muted" data-testid={`card-link-${index}`}>
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 space-y-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <FormField
                                  control={form.control}
                                  name={`relatedLinks.${index}.title`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Link Title</FormLabel>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          placeholder="Link text"
                                          data-testid={`input-link-title-${index}`}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`relatedLinks.${index}.path`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>URL Path</FormLabel>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          placeholder="/page-path"
                                          data-testid={`input-link-path-${index}`}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={form.control}
                                name={`relatedLinks.${index}.description`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field}
                                        value={field.value || ""}
                                        placeholder="Brief description of the linked page"
                                        data-testid={`input-link-description-${index}`}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLink(index)}
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-remove-link-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}

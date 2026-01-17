import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  MapPin,
  Globe,
  Clock,
  ExternalLink,
  Loader2,
  Accessibility,
  Smartphone,
  Ticket,
  Languages,
  Building2,
  Save,
  FileText,
  Search,
  Eye,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { TiqetsAttraction, UpdateTiqetsAttraction } from "@shared/schema";

const formSchema = z.object({
  h1Title: z.string().max(200).nullable().optional(),
  metaTitle: z.string().max(60).nullable().optional(),
  metaDescription: z.string().max(160).nullable().optional(),
  description: z.string().nullable().optional(),
  highlights: z.array(z.string()).nullable().optional(),
  whatsIncluded: z.array(z.string()).nullable().optional(),
  whatsExcluded: z.array(z.string()).nullable().optional(),
  faqs: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).nullable().optional(),
  primaryCategory: z.string().max(100).nullable().optional(),
  status: z.enum(["imported", "processing", "ready", "published", "archived"]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function TiqetsAttractionDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: attraction, isLoading, error } = useQuery<TiqetsAttraction>({
    queryKey: ["/api/admin/tiqets/attractions", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tiqets/attractions/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch attraction");
      return res.json();
    },
    enabled: !!id,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      h1Title: "",
      metaTitle: "",
      metaDescription: "",
      description: "",
      highlights: [],
      whatsIncluded: [],
      whatsExcluded: [],
      faqs: [],
      primaryCategory: "",
      status: "imported",
    },
    values: attraction ? {
      h1Title: attraction.h1Title || "",
      metaTitle: attraction.metaTitle || "",
      metaDescription: attraction.metaDescription || "",
      description: attraction.description || "",
      highlights: attraction.highlights || [],
      whatsIncluded: attraction.whatsIncluded || [],
      whatsExcluded: attraction.whatsExcluded || [],
      faqs: attraction.faqs || [],
      primaryCategory: attraction.primaryCategory || "",
      status: attraction.status || "imported",
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateTiqetsAttraction) => {
      const res = await apiRequest("PATCH", `/api/admin/tiqets/attractions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tiqets/attractions", id] });
      toast({
        title: "Saved successfully",
        description: "Your SEO/AEO changes have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/tiqets/attractions/${id}/generate-content`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tiqets/attractions", id] });
      toast({
        title: "Content generated",
        description: "AI has generated SEO/AEO content. Review and save your changes.",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "AI content generation failed",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    const cleanedData: UpdateTiqetsAttraction = {
      status: data.status as any,
      h1Title: data.h1Title?.trim() || null,
      metaTitle: data.metaTitle?.trim() || null,
      metaDescription: data.metaDescription?.trim() || null,
      description: data.description?.trim() || null,
      primaryCategory: data.primaryCategory?.trim() || null,
      highlights: data.highlights?.filter(h => h.trim())?.length ? data.highlights.filter(h => h.trim()) : null,
      whatsIncluded: data.whatsIncluded?.filter(i => i.trim())?.length ? data.whatsIncluded.filter(i => i.trim()) : null,
      whatsExcluded: data.whatsExcluded?.filter(e => e.trim())?.length ? data.whatsExcluded.filter(e => e.trim()) : null,
      faqs: data.faqs?.filter(f => f.question.trim() && f.answer.trim())?.length 
        ? data.faqs.filter(f => f.question.trim() && f.answer.trim()) 
        : null,
    };
    updateMutation.mutate(cleanedData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loading-spinner" />
      </div>
    );
  }

  if (error || !attraction) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive" data-testid="error-message">
              Failed to load attraction. It may not exist or you don't have permission to view it.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/admin/tiqets/destinations")}
              data-testid="button-back-to-destinations"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Destinations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    imported: "bg-blue-500/10 text-blue-600 border-blue-200",
    processing: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
    ready: "bg-green-500/10 text-green-600 border-green-200",
    published: "bg-[#6443F4]/10 text-[#6443F4] border-[#6443F4]/30",
    archived: "bg-gray-500/10 text-gray-600 border-gray-200",
  };

  const highlights = form.watch("highlights") || [];
  const whatsIncluded = form.watch("whatsIncluded") || [];
  const whatsExcluded = form.watch("whatsExcluded") || [];
  const faqs = form.watch("faqs") || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/tiqets/destinations")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-attraction-title">
              {attraction.title}
            </h1>
            <p className="text-muted-foreground text-sm" data-testid="text-city-name">
              {attraction.cityName} | Edit SEO/AEO Content
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[attraction.status] || ""} data-testid="badge-status">
            {attraction.status}
          </Badge>
          {attraction.productUrl && (
            <Button
              variant="outline"
              size="sm"
              asChild
              data-testid="button-view-on-tiqets"
            >
              <a href={attraction.productUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View on Tiqets
              </a>
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || attraction.status !== "imported"}
            data-testid="button-generate-content"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {generateMutation.isPending ? "Generating..." : "Generate Content"}
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={updateMutation.isPending}
            data-testid="button-save"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="border-muted-foreground/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-lg">Tiqets Source Data</CardTitle>
              </div>
              <CardDescription>
                Reference data from Tiqets (read-only). Use this as a basis for your SEO content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="info">Info</TabsTrigger>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="images">Images</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Title</Label>
                      <p className="font-medium text-sm">{attraction.title}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">City</Label>
                      <p className="text-sm">{attraction.cityName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Venue</Label>
                      <p className="text-sm">{attraction.venueName || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Duration</Label>
                      <p className="text-sm">{attraction.duration || "N/A"}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground text-xs">Tiqets ID</Label>
                      <p className="text-sm font-mono">{attraction.tiqetsId}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="content" className="space-y-4 mt-4">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4 pr-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Summary</Label>
                        <p className="text-sm bg-muted/50 p-3 rounded-md">
                          {attraction.tiqetsSummary || "No summary available"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Description</Label>
                        <p className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">
                          {attraction.tiqetsDescription || "No description available"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Highlights</Label>
                        {attraction.tiqetsHighlights && attraction.tiqetsHighlights.length > 0 ? (
                          <ul className="list-disc list-inside bg-muted/50 p-3 rounded-md">
                            {attraction.tiqetsHighlights.map((h, i) => (
                              <li key={i} className="text-sm">{h}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                            No highlights available
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">What's Included</Label>
                        <p className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">
                          {attraction.tiqetsWhatsIncluded || "Not specified"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">What's Excluded</Label>
                        <p className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">
                          {attraction.tiqetsWhatsExcluded || "Not specified"}
                        </p>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="features" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm">
                        <Accessibility className="h-4 w-4 text-muted-foreground" />
                        Wheelchair Access
                      </span>
                      <Badge variant={attraction.wheelchairAccess ? "default" : "secondary"}>
                        {attraction.wheelchairAccess ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        Mobile Ticket
                      </span>
                      <Badge variant={attraction.smartphoneTicket ? "default" : "secondary"}>
                        {attraction.smartphoneTicket ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm">
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                        Instant Delivery
                      </span>
                      <Badge variant={attraction.instantTicketDelivery ? "default" : "secondary"}>
                        {attraction.instantTicketDelivery ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-muted-foreground text-xs flex items-center gap-1 mb-2">
                        <Languages className="h-3 w-3" /> Languages
                      </Label>
                      {attraction.languages && attraction.languages.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {attraction.languages.map((lang, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No languages specified</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="images" className="space-y-4 mt-4">
                  <ScrollArea className="h-[400px]">
                    <div className="grid grid-cols-2 gap-2 pr-4">
                      {attraction.tiqetsImages && attraction.tiqetsImages.length > 0 ? (
                        attraction.tiqetsImages.map((img, i) => (
                          <img
                            key={i}
                            src={img.medium || img.large}
                            alt={img.alt_text || `Image ${i + 1}`}
                            className="rounded-md object-cover aspect-square w-full"
                          />
                        ))
                      ) : (
                        <p className="col-span-2 text-sm text-muted-foreground">No images available</p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-lg">SEO/AEO Content Editor</CardTitle>
              </div>
              <CardDescription>
                Write optimized content for search engines and AI assistants.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-6">
                  <Tabs defaultValue="seo" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="seo">SEO Meta</TabsTrigger>
                      <TabsTrigger value="content">Content</TabsTrigger>
                      <TabsTrigger value="faqs">FAQs</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="seo" className="space-y-4 mt-4">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-status">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="imported">Imported</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="ready">Ready</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="h1Title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>H1 Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="SEO-optimized page title"
                                data-testid="input-h1-title"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Main heading for the page (max 200 chars)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="metaTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Meta Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Title for search results"
                                data-testid="input-meta-title"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              {(field.value?.length || 0)}/60 characters
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
                            <FormLabel>Meta Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Description for search results"
                                className="resize-none"
                                rows={3}
                                data-testid="input-meta-description"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              {(field.value?.length || 0)}/160 characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="primaryCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Category</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Museums, Theme Parks, Tours"
                                data-testid="input-primary-category"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    
                    <TabsContent value="content" className="space-y-4 mt-4">
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4 pr-4">
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Description</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Write a compelling, SEO-optimized description..."
                                    className="resize-none"
                                    rows={8}
                                    data-testid="input-description"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div>
                            <Label className="text-sm font-medium">Highlights</Label>
                            <p className="text-xs text-muted-foreground mb-2">Key selling points</p>
                            <div className="space-y-2">
                              {highlights.map((h, index) => (
                                <div key={index} className="flex gap-2">
                                  <Input
                                    value={h}
                                    onChange={(e) => {
                                      const newHighlights = [...highlights];
                                      newHighlights[index] = e.target.value;
                                      form.setValue("highlights", newHighlights);
                                    }}
                                    placeholder={`Highlight ${index + 1}`}
                                    data-testid={`input-highlight-${index}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const newHighlights = highlights.filter((_, i) => i !== index);
                                      form.setValue("highlights", newHighlights);
                                    }}
                                    data-testid={`button-remove-highlight-${index}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => form.setValue("highlights", [...highlights, ""])}
                                data-testid="button-add-highlight"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Highlight
                              </Button>
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium">What's Included</Label>
                            <p className="text-xs text-muted-foreground mb-2">Items included with the ticket</p>
                            <div className="space-y-2">
                              {whatsIncluded.map((item, index) => (
                                <div key={index} className="flex gap-2">
                                  <Input
                                    value={item}
                                    onChange={(e) => {
                                      const newItems = [...whatsIncluded];
                                      newItems[index] = e.target.value;
                                      form.setValue("whatsIncluded", newItems);
                                    }}
                                    placeholder={`Item ${index + 1}`}
                                    data-testid={`input-included-${index}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const newItems = whatsIncluded.filter((_, i) => i !== index);
                                      form.setValue("whatsIncluded", newItems);
                                    }}
                                    data-testid={`button-remove-included-${index}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => form.setValue("whatsIncluded", [...whatsIncluded, ""])}
                                data-testid="button-add-included"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                              </Button>
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium">What's Excluded</Label>
                            <p className="text-xs text-muted-foreground mb-2">Items NOT included with the ticket</p>
                            <div className="space-y-2">
                              {whatsExcluded.map((item, index) => (
                                <div key={index} className="flex gap-2">
                                  <Input
                                    value={item}
                                    onChange={(e) => {
                                      const newItems = [...whatsExcluded];
                                      newItems[index] = e.target.value;
                                      form.setValue("whatsExcluded", newItems);
                                    }}
                                    placeholder={`Item ${index + 1}`}
                                    data-testid={`input-excluded-${index}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const newItems = whatsExcluded.filter((_, i) => i !== index);
                                      form.setValue("whatsExcluded", newItems);
                                    }}
                                    data-testid={`button-remove-excluded-${index}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => form.setValue("whatsExcluded", [...whatsExcluded, ""])}
                                data-testid="button-add-excluded"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                              </Button>
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="faqs" className="space-y-4 mt-4">
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4 pr-4">
                          <p className="text-sm text-muted-foreground">
                            Add FAQ pairs to improve AEO (Answer Engine Optimization) and help AI assistants answer questions about this attraction.
                          </p>
                          
                          {faqs.map((faq, index) => (
                            <Card key={index} className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 space-y-3">
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Question</Label>
                                      <Input
                                        value={faq.question}
                                        onChange={(e) => {
                                          const newFaqs = [...faqs];
                                          newFaqs[index] = { ...newFaqs[index], question: e.target.value };
                                          form.setValue("faqs", newFaqs);
                                        }}
                                        placeholder="e.g., How long does the tour take?"
                                        data-testid={`input-faq-question-${index}`}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Answer</Label>
                                      <Textarea
                                        value={faq.answer}
                                        onChange={(e) => {
                                          const newFaqs = [...faqs];
                                          newFaqs[index] = { ...newFaqs[index], answer: e.target.value };
                                          form.setValue("faqs", newFaqs);
                                        }}
                                        placeholder="Provide a clear, concise answer..."
                                        rows={3}
                                        className="resize-none"
                                        data-testid={`input-faq-answer-${index}`}
                                      />
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const newFaqs = faqs.filter((_, i) => i !== index);
                                      form.setValue("faqs", newFaqs);
                                    }}
                                    data-testid={`button-remove-faq-${index}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                          
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => form.setValue("faqs", [...faqs, { question: "", answer: "" }])}
                            data-testid="button-add-faq"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add FAQ
                          </Button>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Internal ID</span>
                <span className="font-mono text-xs">{attraction.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Synced</span>
                <span>
                  {attraction.lastSyncedAt
                    ? new Date(attraction.lastSyncedAt).toLocaleDateString()
                    : "Never"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{new Date(attraction.updatedAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

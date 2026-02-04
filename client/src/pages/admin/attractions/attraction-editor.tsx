import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MagicButton, type MagicContext } from "@/components/admin/magic-button";
import {
  ArrowLeft,
  Landmark,
  Save,
  Loader2,
  Sparkles,
  MapPin,
  Clock,
  Ticket,
  Star,
  Image as ImageIcon,
  Search,
  Share2,
  Plus,
  Trash2,
  HelpCircle,
  Navigation,
  Lightbulb,
  Eye,
  Timer,
  Bus,
  Tag,
} from "lucide-react";

// Attraction categories
const ATTRACTION_CATEGORIES = [
  "Museum",
  "Monument",
  "Theme Park",
  "Natural Wonder",
  "Historical Site",
  "Religious Site",
  "Zoo & Aquarium",
  "Beach",
  "Park & Garden",
  "Shopping",
  "Entertainment",
  "Sports & Recreation",
  "Cultural Experience",
  "Food & Drink",
  "Viewpoint",
  "Architecture",
  "Art Gallery",
  "Science Center",
  "Other",
] as const;

// Schema for attraction form
const attractionFormSchema = z.object({
  // Basic info
  name: z.string().min(2, "Attraction name must be at least 2 characters"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().min(50, "Description should be at least 50 characters"),
  category: z.string(),

  // Location
  address: z.string().min(5, "Address is required"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),

  // Details
  openingHours: z.string(),
  ticketPrice: z.string(),
  duration: z.string(), // e.g., "2-3 hours"

  // SEO
  metaTitle: z.string().max(60, "Meta title should be under 60 characters"),
  metaDescription: z.string().max(160, "Meta description should be under 160 characters"),

  // Media
  heroImage: z.string().url().optional().or(z.literal("")),
  heroImageAlt: z.string().optional(),

  // Content sections
  highlights: z.array(z.string()),
  whatToExpect: z.string(),
  visitorTips: z.array(z.string()),
  howToGetThere: z.string(),

  // FAQs
  faqs: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    })
  ),

  // Social
  socialFacebook: z.string().optional(),
  socialTwitter: z.string().optional(),
  socialInstagram: z.string().optional(),

  // Booking
  bookingLink: z.string().url().optional().or(z.literal("")),
});

type AttractionFormValues = z.infer<typeof attractionFormSchema>;

interface AttractionData extends AttractionFormValues {
  id: string;
  destinationId?: string;
  destinationName?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const defaultValues: AttractionFormValues = {
  name: "",
  slug: "",
  description: "",
  category: "",
  address: "",
  latitude: 0,
  longitude: 0,
  openingHours: "",
  ticketPrice: "",
  duration: "",
  metaTitle: "",
  metaDescription: "",
  heroImage: "",
  heroImageAlt: "",
  highlights: [],
  whatToExpect: "",
  visitorTips: [],
  howToGetThere: "",
  faqs: [],
  socialFacebook: "",
  socialTwitter: "",
  socialInstagram: "",
  bookingLink: "",
};

export default function AttractionEditorPage() {
  const { id: attractionId = "" } = useParams<{ id: string }>();
  const isNew = attractionId === "new";
  const [, setLocation] = useLocation();

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");
  const [isMagicAllRunning, setIsMagicAllRunning] = useState(false);

  // Fetch attraction data if editing
  const { data: attraction, isLoading } = useQuery<AttractionData>({
    queryKey: [`/api/admin/attractions/${attractionId}`],
    enabled: !isNew && !!attractionId,
  });

  const form = useForm<AttractionFormValues>({
    resolver: zodResolver(attractionFormSchema),
    defaultValues: attraction || defaultValues,
    values: attraction || undefined,
  });

  const { watch, setValue, getValues } = form;
  const watchedName = watch("name");

  // Build magic context from current form values
  const getMagicContext = useCallback(
    (): MagicContext => ({
      contentType: "attraction",
      entityName: watchedName,
      parentDestination: attraction?.destinationName,
      existingFields: getValues(),
      locale: "en",
    }),
    [watchedName, attraction?.destinationName, getValues]
  );

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: AttractionFormValues) => {
      const url = isNew ? "/api/admin/attractions" : `/api/admin/attractions/${attractionId}`;
      const method = isNew ? "POST" : "PATCH";
      return apiRequest(url, { method, body: data });
    },
    onSuccess: async response => {
      const savedAttraction = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/attractions"] });
      toast({
        title: isNew ? "Attraction created" : "Attraction updated",
        description: `${getValues("name")} has been saved successfully.`,
      });
      if (isNew) {
        setLocation(`/admin/attractions/${savedAttraction.id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save attraction.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AttractionFormValues) => {
    saveMutation.mutate(data);
  };

  // Magic All handler - generates all fields
  const handleMagicAll = async () => {
    if (!watchedName) {
      toast({
        title: "Name required",
        description: "Please enter an attraction name before using Magic All.",
        variant: "destructive",
      });
      return;
    }

    setIsMagicAllRunning(true);
    toast({
      title: "Magic All started",
      description: "Generating all fields with AI...",
    });

    try {
      const response = await apiRequest("POST", "/api/octypo/magic/bulk", {
        contentType: "attraction",
        entityName: watchedName,
        existingFields: getValues(),
        fields: [
          "slug",
          "description",
          "auto_categorize",
          "address",
          "coordinates",
          "opening_hours",
          "price_range",
          "research_single",
          "meta_title",
          "meta_description",
          "image_search",
          "alt_text",
          "highlights",
          "body_content",
          "tips",
          "directions",
          "faqs",
          "social_facebook",
          "social_twitter",
          "social_instagram",
          "affiliate_link",
        ],
      });

      const results = await response.json();

      if (results.slug) setValue("slug", results.slug);
      if (results.description) setValue("description", results.description);
      if (results.category) setValue("category", results.category);
      if (results.address) setValue("address", results.address);
      if (results.latitude) setValue("latitude", results.latitude);
      if (results.longitude) setValue("longitude", results.longitude);
      if (results.openingHours) setValue("openingHours", results.openingHours);
      if (results.ticketPrice) setValue("ticketPrice", results.ticketPrice);
      if (results.duration) setValue("duration", results.duration);
      if (results.metaTitle) setValue("metaTitle", results.metaTitle);
      if (results.metaDescription) setValue("metaDescription", results.metaDescription);
      if (results.heroImage) setValue("heroImage", results.heroImage);
      if (results.heroImageAlt) setValue("heroImageAlt", results.heroImageAlt);
      if (results.highlights) setValue("highlights", results.highlights);
      if (results.whatToExpect) setValue("whatToExpect", results.whatToExpect);
      if (results.visitorTips) setValue("visitorTips", results.visitorTips);
      if (results.howToGetThere) setValue("howToGetThere", results.howToGetThere);
      if (results.faqs) setValue("faqs", results.faqs);
      if (results.socialFacebook) setValue("socialFacebook", results.socialFacebook);
      if (results.socialTwitter) setValue("socialTwitter", results.socialTwitter);
      if (results.socialInstagram) setValue("socialInstagram", results.socialInstagram);
      if (results.bookingLink) setValue("bookingLink", results.bookingLink);

      toast({
        title: "Magic All complete",
        description: "All fields have been generated.",
      });
    } catch (error) {
      toast({
        title: "Magic All failed",
        description: "Some fields could not be generated. Try generating them individually.",
        variant: "destructive",
      });
    } finally {
      setIsMagicAllRunning(false);
    }
  };

  // Helper to add/remove array items
  const addHighlight = () => {
    const current = getValues("highlights");
    setValue("highlights", [...current, ""]);
  };

  const removeHighlight = (index: number) => {
    const current = getValues("highlights");
    setValue(
      "highlights",
      current.filter((_, i) => i !== index)
    );
  };

  const addVisitorTip = () => {
    const current = getValues("visitorTips");
    setValue("visitorTips", [...current, ""]);
  };

  const removeVisitorTip = (index: number) => {
    const current = getValues("visitorTips");
    setValue(
      "visitorTips",
      current.filter((_, i) => i !== index)
    );
  };

  const addFaq = () => {
    const current = getValues("faqs");
    setValue("faqs", [...current, { question: "", answer: "" }]);
  };

  const removeFaq = (index: number) => {
    const current = getValues("faqs");
    setValue(
      "faqs",
      current.filter((_, i) => i !== index)
    );
  };

  if (isLoading && !isNew) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/admin/attractions">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <Landmark className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-bold" data-testid="heading-attraction-name">
                {isNew ? "New Attraction" : watchedName || "Edit Attraction"}
              </h1>
              {attraction?.isActive && <Badge variant="default">Active</Badge>}
              {watch("category") && <Badge variant="secondary">{watch("category")}</Badge>}
            </div>
            {attraction?.destinationName && (
              <p className="text-muted-foreground">{attraction.destinationName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleMagicAll}
            disabled={isMagicAllRunning || !watchedName}
            className="gap-2"
            data-testid="button-magic-all"
          >
            {isMagicAllRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-purple-500" />
            )}
            Magic All
          </Button>

          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={saveMutation.isPending}
            data-testid="button-save-attraction"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isNew ? "Create Attraction" : "Save Changes"}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-3xl grid-cols-6">
              <TabsTrigger value="basic" className="gap-2">
                <Landmark className="h-4 w-4" />
                Basic
              </TabsTrigger>
              <TabsTrigger value="location" className="gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-2">
                <Clock className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="seo" className="gap-2">
                <Search className="h-4 w-4" />
                SEO
              </TabsTrigger>
              <TabsTrigger value="content" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Content
              </TabsTrigger>
              <TabsTrigger value="social" className="gap-2">
                <Share2 className="h-4 w-4" />
                Social
              </TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Landmark className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>
                    Enter the attraction's name, description, and category
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Name - No Magic */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attraction Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Burj Khalifa, Louvre Museum"
                            data-testid="input-attraction-name"
                          />
                        </FormControl>
                        <FormDescription>Enter the official attraction name</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Slug - Magic */}
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>URL Slug *</FormLabel>
                          <MagicButton
                            fieldId="attraction-slug"
                            fieldType="slug"
                            context={getMagicContext()}
                            onResult={value => setValue("slug", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="burj-khalifa"
                            data-testid="input-attraction-slug"
                          />
                        </FormControl>
                        <FormDescription>
                          URL-friendly identifier for the attraction
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Category - Magic */}
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Category</FormLabel>
                          <MagicButton
                            fieldId="attraction-category"
                            fieldType="auto_categorize"
                            context={getMagicContext()}
                            onResult={value => setValue("category", value as string)}
                            size="sm"
                          />
                        </div>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ATTRACTION_CATEGORIES.map(category => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description - Magic */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Description *</FormLabel>
                          <MagicButton
                            fieldId="attraction-description"
                            fieldType="description"
                            context={getMagicContext()}
                            onResult={value => setValue("description", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={5}
                            placeholder="A world-famous landmark offering..."
                            data-testid="input-attraction-description"
                          />
                        </FormControl>
                        <FormDescription>
                          {field.value?.length || 0}/500 characters - Detailed description of the
                          attraction
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location
                  </CardTitle>
                  <CardDescription>Where is this attraction located?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Address - Magic */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Address</FormLabel>
                          <MagicButton
                            fieldId="attraction-address"
                            fieldType="address"
                            context={getMagicContext()}
                            onResult={value => setValue("address", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={2}
                            placeholder="1 Sheikh Mohammed bin Rashid Blvd, Dubai"
                            data-testid="input-attraction-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Coordinates - Magic */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="any"
                              placeholder="25.1972"
                              data-testid="input-attraction-latitude"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Longitude</FormLabel>
                            <MagicButton
                              fieldId="attraction-coordinates"
                              fieldType="coordinates"
                              context={getMagicContext()}
                              onResult={value => {
                                const coords = value as { lat: number; lng: number };
                                if (coords) {
                                  setValue("latitude", coords.lat);
                                  setValue("longitude", coords.lng);
                                }
                              }}
                              size="sm"
                            />
                          </div>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="any"
                              placeholder="55.2744"
                              data-testid="input-attraction-longitude"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* How to Get There - Magic */}
                  <FormField
                    control={form.control}
                    name="howToGetThere"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="flex items-center gap-2">
                            <Bus className="h-4 w-4" />
                            How to Get There
                          </FormLabel>
                          <MagicButton
                            fieldId="attraction-how-to-get-there"
                            fieldType="directions"
                            context={getMagicContext()}
                            onResult={value => setValue("howToGetThere", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder="Describe transportation options, nearest metro station, parking..."
                            data-testid="input-how-to-get-there"
                          />
                        </FormControl>
                        <FormDescription>Transportation and directions information</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6 mt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Timings Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Opening Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Opening Hours - Magic */}
                    <FormField
                      control={form.control}
                      name="openingHours"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Hours</FormLabel>
                            <MagicButton
                              fieldId="attraction-opening-hours"
                              fieldType="opening_hours"
                              context={getMagicContext()}
                              onResult={value => setValue("openingHours", value as string)}
                              size="sm"
                            />
                          </div>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={3}
                              placeholder="Mon-Sun: 9:00 AM - 11:00 PM&#10;Last entry: 10:30 PM"
                              data-testid="input-opening-hours"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Pricing Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Ticket className="h-5 w-5" />
                      Ticket Pricing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Ticket Price - Magic */}
                    <FormField
                      control={form.control}
                      name="ticketPrice"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Price Information</FormLabel>
                            <MagicButton
                              fieldId="attraction-ticket-price"
                              fieldType="price_range"
                              context={getMagicContext()}
                              onResult={value => setValue("ticketPrice", value as string)}
                              size="sm"
                            />
                          </div>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={3}
                              placeholder="Adults: $50&#10;Children (4-12): $25&#10;Under 4: Free"
                              data-testid="input-ticket-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Duration Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Timer className="h-5 w-5" />
                      Visit Duration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Duration - Magic */}
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Recommended Duration</FormLabel>
                            <MagicButton
                              fieldId="attraction-duration"
                              fieldType="research_single"
                              context={getMagicContext()}
                              onResult={value => setValue("duration", value as string)}
                              size="sm"
                            />
                          </div>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="2-3 hours"
                              data-testid="input-duration"
                            />
                          </FormControl>
                          <FormDescription>How long should visitors plan to spend?</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* SEO Tab */}
            <TabsContent value="seo" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    SEO Settings
                  </CardTitle>
                  <CardDescription>
                    Optimize your attraction page for search engines
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Meta Title - Magic */}
                  <FormField
                    control={form.control}
                    name="metaTitle"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Meta Title</FormLabel>
                          <MagicButton
                            fieldId="attraction-meta-title"
                            fieldType="meta_title"
                            context={getMagicContext()}
                            onResult={value => setValue("metaTitle", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Burj Khalifa - Tickets, Tours & Tips | Visit Dubai"
                            data-testid="input-meta-title"
                          />
                        </FormControl>
                        <FormDescription>{field.value?.length || 0}/60 characters</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Meta Description - Magic */}
                  <FormField
                    control={form.control}
                    name="metaDescription"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Meta Description</FormLabel>
                          <MagicButton
                            fieldId="attraction-meta-description"
                            fieldType="meta_description"
                            context={getMagicContext()}
                            onResult={value => setValue("metaDescription", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder="Visit the world's tallest building and enjoy stunning views..."
                            data-testid="input-meta-description"
                          />
                        </FormControl>
                        <FormDescription>{field.value?.length || 0}/160 characters</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Hero Image Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Hero Image
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Hero Image URL - Magic */}
                  <FormField
                    control={form.control}
                    name="heroImage"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Image URL</FormLabel>
                          <MagicButton
                            fieldId="attraction-hero-image"
                            fieldType="image_search"
                            context={getMagicContext()}
                            onResult={value => setValue("heroImage", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://images.example.com/attraction.jpg"
                            data-testid="input-hero-image"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Hero Image Alt - Magic */}
                  <FormField
                    control={form.control}
                    name="heroImageAlt"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Alt Text</FormLabel>
                          <MagicButton
                            fieldId="attraction-hero-alt"
                            fieldType="alt_text"
                            context={getMagicContext()}
                            onResult={value => setValue("heroImageAlt", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Burj Khalifa tower against a clear blue sky"
                            data-testid="input-hero-alt"
                          />
                        </FormControl>
                        <FormDescription>Describe the image for accessibility</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Image Preview */}
                  {watch("heroImage") && (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                      <img
                        src={watch("heroImage")}
                        alt={watch("heroImageAlt") || "Attraction preview"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-6 mt-6">
              {/* Highlights Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Highlights
                    </span>
                    <div className="flex items-center gap-2">
                      <MagicButton
                        fieldId="attraction-highlights"
                        fieldType="highlights"
                        context={getMagicContext()}
                        onResult={value => setValue("highlights", value as string[])}
                        size="sm"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addHighlight}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>Key features and must-see elements</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {watch("highlights")?.map((_, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name={`highlights.${index}`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., 360-degree observation deck views"
                                data-testid={`input-highlight-${index}`}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHighlight(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {watch("highlights")?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No highlights added. Click + or Magic to add highlights.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* What to Expect Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      What to Expect
                    </span>
                    <MagicButton
                      fieldId="attraction-what-to-expect"
                      fieldType="body_content"
                      context={getMagicContext()}
                      onResult={value => setValue("whatToExpect", value as string)}
                      size="sm"
                    />
                  </CardTitle>
                  <CardDescription>Detailed visitor experience description</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="whatToExpect"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={6}
                            placeholder="Describe the visitor experience, what they'll see, the journey through the attraction..."
                            data-testid="input-what-to-expect"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Visitor Tips Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Visitor Tips
                    </span>
                    <div className="flex items-center gap-2">
                      <MagicButton
                        fieldId="attraction-visitor-tips"
                        fieldType="tips"
                        context={getMagicContext()}
                        onResult={value => setValue("visitorTips", value as string[])}
                        size="sm"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addVisitorTip}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>Helpful advice for visitors</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {watch("visitorTips")?.map((_, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name={`visitorTips.${index}`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., Book tickets online to skip the queue"
                                data-testid={`input-visitor-tip-${index}`}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVisitorTip(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {watch("visitorTips")?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No tips added. Click + or Magic to add visitor tips.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* FAQs Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <HelpCircle className="h-5 w-5" />
                      FAQs
                    </span>
                    <div className="flex items-center gap-2">
                      <MagicButton
                        fieldId="attraction-faqs"
                        fieldType="faqs"
                        context={getMagicContext()}
                        onResult={value =>
                          setValue("faqs", value as Array<{ question: string; answer: string }>)
                        }
                        size="sm"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addFaq}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>Common questions about the attraction</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {watch("faqs")?.map((_, index) => (
                    <div key={index} className="space-y-2 p-4 border rounded-lg relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => removeFaq(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <FormField
                        control={form.control}
                        name={`faqs.${index}.question`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Question</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="How long does a visit take?"
                                data-testid={`input-faq-question-${index}`}
                              />
                            </FormControl>
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
                                rows={2}
                                placeholder="Most visitors spend 2-3 hours exploring..."
                                data-testid={`input-faq-answer-${index}`}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                  {watch("faqs")?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No FAQs added. Click + or Magic to add FAQs.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Social Tab */}
            <TabsContent value="social" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Social Media Content
                  </CardTitle>
                  <CardDescription>Pre-written social media posts for promotion</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Facebook - Magic */}
                  <FormField
                    control={form.control}
                    name="socialFacebook"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Facebook Post</FormLabel>
                          <MagicButton
                            fieldId="attraction-social-facebook"
                            fieldType="social_facebook"
                            context={getMagicContext()}
                            onResult={value => setValue("socialFacebook", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder="Experience the wonder of..."
                            data-testid="input-social-facebook"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Twitter - Magic */}
                  <FormField
                    control={form.control}
                    name="socialTwitter"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Twitter/X Post</FormLabel>
                          <MagicButton
                            fieldId="attraction-social-twitter"
                            fieldType="social_twitter"
                            context={getMagicContext()}
                            onResult={value => setValue("socialTwitter", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={2}
                            placeholder="Must-visit attraction alert!"
                            data-testid="input-social-twitter"
                          />
                        </FormControl>
                        <FormDescription>{field.value?.length || 0}/280 characters</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Instagram - Magic */}
                  <FormField
                    control={form.control}
                    name="socialInstagram"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Instagram Caption</FormLabel>
                          <MagicButton
                            fieldId="attraction-social-instagram"
                            fieldType="social_instagram"
                            context={getMagicContext()}
                            onResult={value => setValue("socialInstagram", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder="Views that take your breath away..."
                            data-testid="input-social-instagram"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    Booking Link
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Booking Link - Magic */}
                  <FormField
                    control={form.control}
                    name="bookingLink"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Affiliate/Booking URL</FormLabel>
                          <MagicButton
                            fieldId="attraction-booking-link"
                            fieldType="affiliate_link"
                            context={getMagicContext()}
                            onResult={value => setValue("bookingLink", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Navigation className="h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              placeholder="https://getyourguide.com/..."
                              data-testid="input-booking-link"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Link for ticket purchases (affiliate links supported)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}

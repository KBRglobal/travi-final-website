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
  Building2,
  Save,
  Loader2,
  Sparkles,
  MapPin,
  Clock,
  DollarSign,
  Star,
  Image as ImageIcon,
  Search,
  Share2,
  Plus,
  Trash2,
  Link as LinkIcon,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";

// Schema for hotel form
const hotelFormSchema = z.object({
  // Basic info
  name: z.string().min(2, "Hotel name must be at least 2 characters"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().min(50, "Description should be at least 50 characters"),

  // Details
  starRating: z.coerce.number().min(1).max(5),
  address: z.string().min(5, "Address is required"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  priceRange: z.string(),

  // Times
  checkInTime: z.string(),
  checkOutTime: z.string(),

  // Amenities (stored as array)
  amenities: z.array(z.string()),

  // SEO
  metaTitle: z.string().max(60, "Meta title should be under 60 characters"),
  metaDescription: z.string().max(160, "Meta description should be under 160 characters"),

  // Media
  heroImage: z.string().url().optional().or(z.literal("")),
  heroImageAlt: z.string().optional(),

  // Content
  highlights: z.array(z.string()),

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

  // Booking
  bookingLink: z.string().url().optional().or(z.literal("")),
});

type HotelFormValues = z.infer<typeof hotelFormSchema>;

interface HotelData extends HotelFormValues {
  id: string;
  destinationId?: string;
  destinationName?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const defaultValues: HotelFormValues = {
  name: "",
  slug: "",
  description: "",
  starRating: 4,
  address: "",
  latitude: 0,
  longitude: 0,
  priceRange: "$$",
  checkInTime: "15:00",
  checkOutTime: "11:00",
  amenities: [],
  metaTitle: "",
  metaDescription: "",
  heroImage: "",
  heroImageAlt: "",
  highlights: [],
  faqs: [],
  socialFacebook: "",
  socialTwitter: "",
  bookingLink: "",
};

export default function HotelEditorPage() {
  const { id: hotelId = "" } = useParams<{ id: string }>();
  const isNew = hotelId === "new";
  const [, setLocation] = useLocation();

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");
  const [isMagicAllRunning, setIsMagicAllRunning] = useState(false);

  // Fetch hotel data if editing
  const { data: hotel, isLoading } = useQuery<HotelData>({
    queryKey: [`/api/admin/hotels/${hotelId}`],
    enabled: !isNew && !!hotelId,
  });

  const form = useForm<HotelFormValues>({
    resolver: zodResolver(hotelFormSchema),
    defaultValues: hotel || defaultValues,
    values: hotel || undefined,
  });

  const { watch, setValue, getValues } = form;
  const watchedName = watch("name");
  const watchedDescription = watch("description");

  // Build magic context from current form values
  const getMagicContext = useCallback(
    (): MagicContext => ({
      contentType: "hotel",
      entityName: watchedName,
      parentDestination: hotel?.destinationName,
      existingFields: getValues(),
      locale: "en",
    }),
    [watchedName, hotel?.destinationName, getValues]
  );

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: HotelFormValues) => {
      const url = isNew ? "/api/admin/hotels" : `/api/admin/hotels/${hotelId}`;
      const method = isNew ? "POST" : "PATCH";
      return apiRequest(url, { method, body: data });
    },
    onSuccess: async response => {
      const savedHotel = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hotels"] });
      toast({
        title: isNew ? "Hotel created" : "Hotel updated",
        description: `${getValues("name")} has been saved successfully.`,
      });
      if (isNew) {
        setLocation(`/admin/hotels/${savedHotel.id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save hotel.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: HotelFormValues) => {
    saveMutation.mutate(data);
  };

  // Magic All handler - generates all fields sequentially
  const handleMagicAll = async () => {
    if (!watchedName) {
      toast({
        title: "Name required",
        description: "Please enter a hotel name before using Magic All.",
        variant: "destructive",
      });
      return;
    }

    setIsMagicAllRunning(true);
    toast({
      title: "Magic All started",
      description: "Generating all fields with AI...",
    });

    // The actual generation would be handled by individual MagicButton clicks
    // This is a placeholder for a bulk generation endpoint
    try {
      const response = await apiRequest("POST", "/api/octypo/magic/bulk", {
        contentType: "hotel",
        entityName: watchedName,
        existingFields: getValues(),
        fields: [
          "slug",
          "description",
          "research_single",
          "address",
          "coordinates",
          "price_range",
          "amenities",
          "opening_hours",
          "meta_title",
          "meta_description",
          "image_search",
          "alt_text",
          "highlights",
          "faqs",
          "social_facebook",
          "social_twitter",
          "affiliate_link",
        ],
      });

      const results = await response.json();

      if (results.slug) setValue("slug", results.slug);
      if (results.description) setValue("description", results.description);
      if (results.starRating) setValue("starRating", results.starRating);
      if (results.address) setValue("address", results.address);
      if (results.latitude) setValue("latitude", results.latitude);
      if (results.longitude) setValue("longitude", results.longitude);
      if (results.priceRange) setValue("priceRange", results.priceRange);
      if (results.amenities) setValue("amenities", results.amenities);
      if (results.checkInTime) setValue("checkInTime", results.checkInTime);
      if (results.checkOutTime) setValue("checkOutTime", results.checkOutTime);
      if (results.metaTitle) setValue("metaTitle", results.metaTitle);
      if (results.metaDescription) setValue("metaDescription", results.metaDescription);
      if (results.heroImage) setValue("heroImage", results.heroImage);
      if (results.heroImageAlt) setValue("heroImageAlt", results.heroImageAlt);
      if (results.highlights) setValue("highlights", results.highlights);
      if (results.faqs) setValue("faqs", results.faqs);
      if (results.socialFacebook) setValue("socialFacebook", results.socialFacebook);
      if (results.socialTwitter) setValue("socialTwitter", results.socialTwitter);
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

  const addAmenity = () => {
    const current = getValues("amenities");
    setValue("amenities", [...current, ""]);
  };

  const removeAmenity = (index: number) => {
    const current = getValues("amenities");
    setValue(
      "amenities",
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
          <Link href="/admin/hotels">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-bold" data-testid="heading-hotel-name">
                {isNew ? "New Hotel" : watchedName || "Edit Hotel"}
              </h1>
              {hotel?.isActive && <Badge variant="default">Active</Badge>}
            </div>
            {hotel?.destinationName && (
              <p className="text-muted-foreground">{hotel.destinationName}</p>
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
            data-testid="button-save-hotel"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isNew ? "Create Hotel" : "Save Changes"}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-2xl grid-cols-5">
              <TabsTrigger value="basic" className="gap-2">
                <Building2 className="h-4 w-4" />
                Basic
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-2">
                <MapPin className="h-4 w-4" />
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
                    <Building2 className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>Enter the hotel's name and main description</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Name - No Magic */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hotel Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., The Ritz-Carlton Dubai"
                            data-testid="input-hotel-name"
                          />
                        </FormControl>
                        <FormDescription>Enter the official hotel name</FormDescription>
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
                            fieldId="hotel-slug"
                            fieldType="slug"
                            context={getMagicContext()}
                            onResult={value => setValue("slug", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="ritz-carlton-dubai"
                            data-testid="input-hotel-slug"
                          />
                        </FormControl>
                        <FormDescription>URL-friendly identifier for the hotel</FormDescription>
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
                            fieldId="hotel-description"
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
                            placeholder="A luxurious 5-star hotel offering..."
                            data-testid="input-hotel-description"
                          />
                        </FormControl>
                        <FormDescription>
                          {field.value?.length || 0}/500 characters - Detailed description of the
                          hotel
                        </FormDescription>
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
                {/* Location Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Location
                    </CardTitle>
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
                              fieldId="hotel-address"
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
                              placeholder="123 Beach Road, Dubai Marina"
                              data-testid="input-hotel-address"
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
                                placeholder="25.0657"
                                data-testid="input-hotel-latitude"
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
                                fieldId="hotel-coordinates"
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
                                placeholder="55.1356"
                                data-testid="input-hotel-longitude"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Hotel Details Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Hotel Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Star Rating - Magic */}
                    <FormField
                      control={form.control}
                      name="starRating"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Star Rating</FormLabel>
                            <MagicButton
                              fieldId="hotel-star-rating"
                              fieldType="research_single"
                              context={getMagicContext()}
                              onResult={value => setValue("starRating", value as number)}
                              size="sm"
                            />
                          </div>
                          <Select
                            onValueChange={v => field.onChange(parseInt(v))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-star-rating">
                                <SelectValue placeholder="Select rating" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map(rating => (
                                <SelectItem key={rating} value={rating.toString()}>
                                  {"★".repeat(rating)} {rating} Star{rating > 1 ? "s" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Price Range - Magic */}
                    <FormField
                      control={form.control}
                      name="priceRange"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Price Range</FormLabel>
                            <MagicButton
                              fieldId="hotel-price-range"
                              fieldType="price_range"
                              context={getMagicContext()}
                              onResult={value => setValue("priceRange", value as string)}
                              size="sm"
                            />
                          </div>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-price-range">
                                <SelectValue placeholder="Select price range" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="$">$ - Budget</SelectItem>
                              <SelectItem value="$$">$$ - Mid-range</SelectItem>
                              <SelectItem value="$$$">$$$ - Upscale</SelectItem>
                              <SelectItem value="$$$$">$$$$ - Luxury</SelectItem>
                              <SelectItem value="$$$$$">$$$$$ - Ultra Luxury</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Check-in/Check-out Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Check-in / Check-out
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="checkInTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Check-in Time</FormLabel>
                            <FormControl>
                              <Input {...field} type="time" data-testid="input-check-in" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="checkOutTime"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Check-out Time</FormLabel>
                              <MagicButton
                                fieldId="hotel-times"
                                fieldType="opening_hours"
                                context={getMagicContext()}
                                onResult={value => {
                                  const times = value as { checkIn: string; checkOut: string };
                                  if (times) {
                                    setValue("checkInTime", times.checkIn);
                                    setValue("checkOutTime", times.checkOut);
                                  }
                                }}
                                size="sm"
                              />
                            </div>
                            <FormControl>
                              <Input {...field} type="time" data-testid="input-check-out" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Amenities Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        Amenities
                      </span>
                      <div className="flex items-center gap-2">
                        <MagicButton
                          fieldId="hotel-amenities"
                          fieldType="amenities"
                          context={getMagicContext()}
                          onResult={value => setValue("amenities", value as string[])}
                          size="sm"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={addAmenity}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {watch("amenities")?.map((_, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <FormField
                          control={form.control}
                          name={`amenities.${index}`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="e.g., Free WiFi, Pool, Spa"
                                  data-testid={`input-amenity-${index}`}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAmenity(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {watch("amenities")?.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No amenities added. Click + or Magic to add amenities.
                      </p>
                    )}
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
                  <CardDescription>Optimize your hotel page for search engines</CardDescription>
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
                            fieldId="hotel-meta-title"
                            fieldType="meta_title"
                            context={getMagicContext()}
                            onResult={value => setValue("metaTitle", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Luxury Hotel in Dubai | Book Now"
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
                            fieldId="hotel-meta-description"
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
                            placeholder="Discover luxury accommodations at..."
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
                            fieldId="hotel-hero-image"
                            fieldType="image_search"
                            context={getMagicContext()}
                            onResult={value => setValue("heroImage", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://images.example.com/hotel.jpg"
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
                            fieldId="hotel-hero-alt"
                            fieldType="alt_text"
                            context={getMagicContext()}
                            onResult={value => setValue("heroImageAlt", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Aerial view of the luxury hotel with pool"
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
                        alt={watch("heroImageAlt") || "Hotel preview"}
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
                        fieldId="hotel-highlights"
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
                  <CardDescription>Key selling points and unique features</CardDescription>
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
                                placeholder="e.g., Stunning sea views from every room"
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
                        fieldId="hotel-faqs"
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
                  <CardDescription>Common questions about the hotel</CardDescription>
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
                                placeholder="What is the check-in time?"
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
                                placeholder="Check-in is at 3:00 PM..."
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
                    Social & Booking
                  </CardTitle>
                  <CardDescription>Social media content and booking links</CardDescription>
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
                            fieldId="hotel-social-facebook"
                            fieldType="social_facebook"
                            context={getMagicContext()}
                            onResult={value => setValue("socialFacebook", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder="Discover paradise at..."
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
                            fieldId="hotel-social-twitter"
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
                            placeholder="Your luxury getaway awaits..."
                            data-testid="input-social-twitter"
                          />
                        </FormControl>
                        <FormDescription>{field.value?.length || 0}/280 characters</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  {/* Booking Link - Magic */}
                  <FormField
                    control={form.control}
                    name="bookingLink"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Booking Link</FormLabel>
                          <MagicButton
                            fieldId="hotel-booking-link"
                            fieldType="affiliate_link"
                            context={getMagicContext()}
                            onResult={value => setValue("bookingLink", value as string)}
                            size="sm"
                          />
                        </div>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              placeholder="https://booking.com/hotel/..."
                              data-testid="input-booking-link"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>Affiliate booking link for the hotel</FormDescription>
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

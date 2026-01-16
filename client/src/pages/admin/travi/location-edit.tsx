import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Save,
  Eye,
  Trash2,
  GripVertical,
  Star,
  Image as ImageIcon,
  MapPin,
  Globe,
  Phone,
  Clock,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Info,
  FileText,
  Link2,
  History,
  Loader2,
  Plus,
  X,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TIQETS_AFFILIATE_LINK = "https://tiqets.tpo.lu/k16k6RXU";

function countWords(text?: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

const urlRegex = /^https?:\/\/[^\s]+$/i;

const locationFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be under 200 characters"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  category: z.enum(["attraction", "restaurant", "hotel"], { required_error: "Category is required" }),
  status: z.enum(["discovered", "enriching", "generating", "ready", "error", "exported"]),
  h1Title: z.string().optional().refine(
    (val) => !val || (countWords(val) >= 5 && countWords(val) <= 100),
    { message: "Title must be between 5-100 words" }
  ),
  metaTitle: z.string().max(70, "Meta title should be under 70 characters").optional(),
  metaDescription: z.string().optional().refine(
    (val) => !val || (val.length >= 120 && val.length <= 160),
    { message: "Meta description must be 120-160 characters for optimal SEO" }
  ),
  shortDescription: z.string().optional().refine(
    (val) => !val || (countWords(val) >= 50 && countWords(val) <= 500),
    { message: "Description must be between 50-500 words" }
  ),
  whyVisit: z.string().optional(),
  visitorExperience: z.string().optional(),
  history: z.string().optional(),
  bestTimeToVisit: z.string().optional(),
  howToGetThere: z.string().optional(),
  website: z.string().optional().refine(
    (val) => !val || urlRegex.test(val),
    { message: "Website must be a valid URL (http:// or https://)" }
  ),
  latitude: z.string().optional().refine(
    (val) => {
      if (!val) return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= -90 && num <= 90;
    },
    { message: "Latitude must be between -90 and 90" }
  ),
  longitude: z.string().optional().refine(
    (val) => {
      if (!val) return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= -180 && num <= 180;
    },
    { message: "Longitude must be between -180 and 180" }
  ),
});

type LocationFormData = z.infer<typeof locationFormSchema>;

const locationCategories = ["attraction", "restaurant", "hotel"] as const;
const locationStatuses = [
  "discovered",
  "enriching",
  "generating",
  "ready",
  "error",
  "exported"
] as const;

const STATUS_LABELS: Record<string, string> = {
  discovered: "Discovered",
  enriching: "Enriching",
  generating: "Generating",
  ready: "Ready",
  error: "Error",
  exported: "Exported",
};

interface LocationImage {
  id?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  altText?: string;
  isHero: boolean;
  sortOrder: number;
  freepikId?: string;
  photographer?: string;
  attribution?: string;
  license?: string;
  width?: number;
  height?: number;
}

interface LocationContent {
  id?: string;
  locationId?: string;
  language: string;
  h1Title?: string;
  metaTitle?: string;
  metaDescription?: string;
  shortDescription?: string;
  whyVisit?: string;
  keyHighlights?: string[];
  visitorExperience?: string;
  history?: string;
  bestTimeToVisit?: string;
  howToGetThere?: string;
  whatToBring?: Array<{ item: string; reason: string }>;
  nearbyAttractions?: Array<{ name: string; distance: string }>;
  faq?: Array<{ question: string; answer: string }>;
  aiModel?: string;
  generatedAt?: string;
}

interface LocationDetails {
  id?: string;
  locationId?: string;
  fullAddress?: string;
  streetAddress?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
  phone?: string;
  website?: string;
  openingHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
    notes?: string;
  };
  googleRating?: string;
  googleReviewCount?: number;
  wheelchairAccessible?: boolean;
  accessibilityInfo?: string;
  googlePlaceId?: string;
  priceLevel?: number;
  businessStatus?: string;
}

interface LocationData {
  id: string;
  name: string;
  slug: string;
  category: string;
  city: string;
  country: string;
  destinationId?: string;
  status: string;
  sourceWikipedia?: boolean;
  sourceWikipediaUrl?: string;
  sourceOsm?: boolean;
  sourceOsmId?: string;
  sourceTripadvisor?: boolean;
  sourceTripadvisorId?: string;
  retryCount?: number;
  lastError?: string;
  validationErrors?: string[];
  createdAt?: string;
  updatedAt?: string;
  details?: LocationDetails | null;
  content?: LocationContent[];
  images?: LocationImage[];
}

function wordCount(text?: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function WordCounter({ text, min, max }: { text?: string; min: number; max: number }) {
  const count = wordCount(text);
  const isGood = count >= min && count <= max;
  const isTooFew = count < min;
  const isTooMany = count > max;

  return (
    <span className={`text-xs ${isGood ? "text-green-600 dark:text-green-400" : isTooFew ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
      {count} / {min}-{max} words
      {isGood && <CheckCircle className="inline-block ml-1 w-3 h-3" />}
      {isTooFew && <AlertCircle className="inline-block ml-1 w-3 h-3" />}
      {isTooMany && <AlertCircle className="inline-block ml-1 w-3 h-3" />}
    </span>
  );
}

function SortableImageItem({ image, onToggleHero, onRemove }: { 
  image: LocationImage; 
  onToggleHero: () => void; 
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: image.id || image.imageUrl 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border"
    >
      <button
        type="button"
        className="cursor-grab touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      
      <div className="relative w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
        <img
          src={image.thumbnailUrl || image.imageUrl}
          alt={image.altText || "Location image"}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
        {image.isHero && (
          <div className="absolute top-0 left-0 bg-primary text-primary-foreground text-xs px-1 py-0.5">
            Hero
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{image.altText || "No alt text"}</p>
        {image.photographer && (
          <p className="text-xs text-muted-foreground truncate">
            Photo by {image.photographer}
          </p>
        )}
        {image.width && image.height && (
          <p className="text-xs text-muted-foreground">
            {image.width} x {image.height}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          type="button"
          variant={image.isHero ? "default" : "outline"}
          size="sm"
          onClick={onToggleHero}
          data-testid={`button-hero-toggle-${image.sortOrder}`}
        >
          <Star className={`w-3 h-3 ${image.isHero ? "fill-current" : ""}`} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          data-testid={`button-remove-image-${image.sortOrder}`}
        >
          <Trash2 className="w-3 h-3 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export default function LocationEditPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");
  const [images, setImages] = useState<LocationImage[]>([]);
  const [keyHighlights, setKeyHighlights] = useState<string[]>([]);
  const [whatToBring, setWhatToBring] = useState<Array<{ item: string; reason: string }>>([]);
  const [nearbyAttractions, setNearbyAttractions] = useState<Array<{ name: string; distance: string }>>([]);
  const [faq, setFaq] = useState<Array<{ question: string; answer: string }>>([]);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [arrayFieldsDirty, setArrayFieldsDirty] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: location, isLoading, error } = useQuery<LocationData>({
    queryKey: ["/api/admin/travi/locations", id],
    enabled: !!id,
  });

  const englishContent = location?.content?.find(c => c.language === "en") || {} as LocationContent;

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      city: "",
      country: "",
      category: "attraction",
      status: "discovered",
      h1Title: "",
      metaTitle: "",
      metaDescription: "",
      shortDescription: "",
      whyVisit: "",
      visitorExperience: "",
      history: "",
      bestTimeToVisit: "",
      howToGetThere: "",
      website: "",
      latitude: "",
      longitude: "",
    },
    mode: "onChange",
  });

  const { formState: { errors, isDirty, isValid } } = form;
  const hasUnsavedChanges = isDirty || arrayFieldsDirty;
  const errorCount = Object.keys(errors).length;

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/admin/travi/locations/${id}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || "Failed to save changes");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/travi/locations"] });
      toast({ title: "Changes saved", description: "Location updated successfully" });
      form.reset(form.getValues());
      setArrayFieldsDirty(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Save failed", 
        description: error.message || "Failed to save changes",
        variant: "destructive"
      });
    }
  });

  const generateContentMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await apiRequest("POST", `/api/admin/travi/locations/${id}/generate-content`, { provider });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || "Failed to generate content");
      }
      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/travi/locations", id] });
      const freshData = queryClient.getQueryData<LocationData>(["/api/admin/travi/locations", id]);
      const freshContent = freshData?.content?.find(c => c.language === "en");
      if (freshContent) {
        form.setValue("h1Title", freshContent.h1Title || "", { shouldDirty: false });
        form.setValue("metaTitle", freshContent.metaTitle || "", { shouldDirty: false });
        form.setValue("metaDescription", freshContent.metaDescription || "", { shouldDirty: false });
        form.setValue("shortDescription", freshContent.shortDescription || "", { shouldDirty: false });
        form.setValue("whyVisit", freshContent.whyVisit || "", { shouldDirty: false });
        form.setValue("visitorExperience", freshContent.visitorExperience || "", { shouldDirty: false });
        form.setValue("bestTimeToVisit", freshContent.bestTimeToVisit || "", { shouldDirty: false });
        form.setValue("howToGetThere", freshContent.howToGetThere || "", { shouldDirty: false });
        if (freshContent.keyHighlights) {
          setKeyHighlights(freshContent.keyHighlights);
        }
      }
      toast({ title: "Content generated", description: "AI-generated content has been applied. Please review and save." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Generation failed", 
        description: error.message || "Failed to generate content",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (location) {
      form.reset({
        name: location.name || "",
        slug: location.slug || "",
        city: location.city || "",
        country: location.country || "",
        category: (location.category as "attraction" | "restaurant" | "hotel") || "attraction",
        status: (location.status as any) || "discovered",
        h1Title: englishContent.h1Title || "",
        metaTitle: englishContent.metaTitle || "",
        metaDescription: englishContent.metaDescription || "",
        shortDescription: englishContent.shortDescription || "",
        whyVisit: englishContent.whyVisit || "",
        visitorExperience: englishContent.visitorExperience || "",
        history: englishContent.history || "",
        bestTimeToVisit: englishContent.bestTimeToVisit || "",
        howToGetThere: englishContent.howToGetThere || "",
        website: location.details?.website || "",
        latitude: location.details?.latitude || "",
        longitude: location.details?.longitude || "",
      });
      setImages(location.images || []);
      setKeyHighlights(englishContent.keyHighlights || []);
      setWhatToBring(englishContent.whatToBring || []);
      setNearbyAttractions(englishContent.nearbyAttractions || []);
      setFaq(englishContent.faq || []);
      setArrayFieldsDirty(false);
    }
  }, [location, englishContent]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleNavigate = useCallback((path: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(path);
      setShowLeaveDialog(true);
    } else {
      navigate(path);
    }
  }, [hasUnsavedChanges, navigate]);

  const confirmLeave = useCallback(() => {
    setShowLeaveDialog(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, navigate]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex(item => (item.id || item.imageUrl) === active.id);
        const newIndex = items.findIndex(item => (item.id || item.imageUrl) === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex).map((img, idx) => ({
          ...img,
          sortOrder: idx
        }));
        setArrayFieldsDirty(true);
        return newItems;
      });
    }
  };

  const toggleHero = (index: number) => {
    setImages(items => items.map((img, idx) => ({
      ...img,
      isHero: idx === index ? !img.isHero : false
    })));
    setArrayFieldsDirty(true);
  };

  const removeImage = (index: number) => {
    setImages(items => items.filter((_, idx) => idx !== index));
    setArrayFieldsDirty(true);
  };

  const onSubmit = async (data: LocationFormData) => {
    const locationData = {
      name: data.name,
      slug: data.slug,
      category: data.category,
      city: data.city,
      country: data.country,
      status: data.status,
    };

    const contentData = {
      language: "en",
      h1Title: data.h1Title,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      shortDescription: data.shortDescription,
      whyVisit: data.whyVisit,
      visitorExperience: data.visitorExperience,
      history: data.history,
      bestTimeToVisit: data.bestTimeToVisit,
      howToGetThere: data.howToGetThere,
      keyHighlights,
      whatToBring,
      nearbyAttractions,
      faq,
    };

    const detailsData = {
      website: data.website,
      latitude: data.latitude,
      longitude: data.longitude,
    };

    await updateMutation.mutateAsync({
      location: locationData,
      content: contentData,
      details: detailsData,
      images: images
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h2 className="text-lg font-semibold">Location not found</h2>
            <p className="text-muted-foreground mb-4">
              The location you're looking for doesn't exist or was deleted.
            </p>
            <Button onClick={() => navigate("/admin/travi/locations")} data-testid="button-back-to-list">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Locations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingNavigation(null)}>
              Stay on Page
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave} className="bg-destructive text-destructive-foreground">
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigate("/admin/travi/locations")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-location-name">{location.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" data-testid="badge-category">{location.category}</Badge>
              <Badge 
                variant={location.status === "completed" || location.status === "exported" ? "default" : "secondary"}
                data-testid="badge-status"
              >
                {location.status}
              </Badge>
              {hasUnsavedChanges && (
                <Badge variant="destructive" className="animate-pulse">Unsaved changes</Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {errorCount} validation {errorCount === 1 ? "error" : "errors"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleNavigate(`/admin/travi/locations/${id}/preview`)}
            data-testid="button-preview"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            type="submit"
            form="location-form"
            disabled={updateMutation.isPending || !isValid}
            data-testid="button-save"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {errorCount > 0 && (
        <Card className="border-destructive bg-destructive/5" data-testid="validation-summary">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-destructive">Please fix the following errors:</h4>
                <ul className="mt-2 space-y-1 text-sm text-destructive/90">
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field} className="flex items-center gap-1">
                      <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span>{error?.message as string}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form id="location-form" onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-flex">
              <TabsTrigger value="basic" data-testid="tab-basic">
                <FileText className="w-4 h-4 mr-2 hidden sm:inline" />
                Basic
                {(errors.name || errors.slug || errors.city || errors.country || errors.category) && (
                  <AlertCircle className="w-3 h-3 ml-1 text-destructive" />
                )}
              </TabsTrigger>
              <TabsTrigger value="places" data-testid="tab-places">
                <MapPin className="w-4 h-4 mr-2 hidden sm:inline" />
                Places
                {(errors.latitude || errors.longitude || errors.website) && (
                  <AlertCircle className="w-3 h-3 ml-1 text-destructive" />
                )}
              </TabsTrigger>
              <TabsTrigger value="content" data-testid="tab-content">
                <FileText className="w-4 h-4 mr-2 hidden sm:inline" />
                Content
                {(errors.h1Title || errors.metaDescription || errors.shortDescription) && (
                  <AlertCircle className="w-3 h-3 ml-1 text-destructive" />
                )}
              </TabsTrigger>
              <TabsTrigger value="images" data-testid="tab-images">
                <ImageIcon className="w-4 h-4 mr-2 hidden sm:inline" />
                Images
              </TabsTrigger>
              <TabsTrigger value="attribution" data-testid="tab-attribution">
                <Info className="w-4 h-4 mr-2 hidden sm:inline" />
                Attribution
              </TabsTrigger>
              <TabsTrigger value="affiliate" data-testid="tab-affiliate">
                <Link2 className="w-4 h-4 mr-2 hidden sm:inline" />
                Affiliate
              </TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">
                <History className="w-4 h-4 mr-2 hidden sm:inline" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Core details about this location</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className={errors.name ? "border-destructive" : ""}
                              data-testid="input-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slug *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className={errors.slug ? "border-destructive" : ""}
                              data-testid="input-slug"
                            />
                          </FormControl>
                          <FormDescription>URL-friendly identifier (lowercase, hyphens only)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className={errors.city ? "border-destructive" : ""}
                              data-testid="input-city"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className={errors.country ? "border-destructive" : ""}
                              data-testid="input-country"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={errors.category ? "border-destructive" : ""} data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {locationCategories.map(cat => (
                                <SelectItem key={cat} value={cat}>
                                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                              {locationStatuses.map(status => (
                                <SelectItem key={status} value={status}>
                                  {status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                {location.validationErrors && location.validationErrors.length > 0 && (
                  <div className="p-4 bg-destructive/10 rounded-md border border-destructive/20">
                    <h4 className="font-medium text-destructive flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4" />
                      Validation Errors
                    </h4>
                    <ul className="list-disc list-inside text-sm text-destructive space-y-1">
                      {location.validationErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="places" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Google Places Data</CardTitle>
                <CardDescription>
                  Enrichment data from Google Places API (read-only)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!location.details ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No Google Places data available yet.</p>
                    <p className="text-sm">Run the enrichment process to populate this section.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Full Address</Label>
                        <Input 
                          value={location.details.fullAddress || "N/A"} 
                          readOnly 
                          className="bg-muted" 
                          data-testid="input-address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Google Place ID</Label>
                        <Input 
                          value={location.details.googlePlaceId || "N/A"} 
                          readOnly 
                          className="bg-muted font-mono text-sm" 
                          data-testid="input-place-id"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Coordinates</Label>
                        <div className="flex gap-2">
                          <Input 
                            value={location.details.latitude || "N/A"} 
                            readOnly 
                            className="bg-muted" 
                            placeholder="Latitude"
                          />
                          <Input 
                            value={location.details.longitude || "N/A"} 
                            readOnly 
                            className="bg-muted" 
                            placeholder="Longitude"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Contact</Label>
                        <div className="flex gap-2">
                          <Input 
                            value={location.details.phone || "N/A"} 
                            readOnly 
                            className="bg-muted" 
                            placeholder="Phone"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Google Rating</Label>
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="font-medium">{location.details.googleRating || "N/A"}</span>
                          <span className="text-muted-foreground text-sm">
                            ({location.details.googleReviewCount || 0} reviews)
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Price Level</Label>
                        <span className="font-medium">
                          {location.details.priceLevel !== undefined && location.details.priceLevel !== null
                            ? "$".repeat(location.details.priceLevel + 1)
                            : "N/A"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label>Business Status</Label>
                        <Badge variant={location.details.businessStatus === "OPERATIONAL" ? "default" : "secondary"}>
                          {location.details.businessStatus || "Unknown"}
                        </Badge>
                      </div>
                    </div>

                    {location.details.website && (
                      <div className="space-y-2">
                        <Label>Website</Label>
                        <div className="flex items-center gap-2">
                          <Input value={location.details.website} readOnly className="bg-muted" />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            asChild
                          >
                            <a href={location.details.website} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}

                    {location.details.openingHours && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Opening Hours
                        </Label>
                        <div className="grid gap-1 text-sm bg-muted p-3 rounded-md">
                          {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                            <div key={day} className="flex justify-between">
                              <span className="capitalize font-medium">{day}:</span>
                              <span>{(location.details!.openingHours as any)?.[day] || "Closed"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Switch checked={location.details.wheelchairAccessible || false} disabled />
                      <Label>Wheelchair Accessible</Label>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>SEO Content</CardTitle>
                <CardDescription>Meta tags and headings for search engines</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="h1Title">H1 Title</Label>
                  <Input
                    id="h1Title"
                    name="h1Title"
                    defaultValue={englishContent.h1Title || ""}
                    onChange={() => setArrayFieldsDirty(true)}
                    data-testid="input-h1-title"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="metaTitle">Meta Title</Label>
                    <span className="text-xs text-muted-foreground">
                      {(englishContent.metaTitle || "").length} / 60 chars
                    </span>
                  </div>
                  <Input
                    id="metaTitle"
                    name="metaTitle"
                    maxLength={60}
                    defaultValue={englishContent.metaTitle || ""}
                    onChange={() => setArrayFieldsDirty(true)}
                    data-testid="input-meta-title"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="metaDescription">Meta Description</Label>
                    <span className="text-xs text-muted-foreground">
                      {(englishContent.metaDescription || "").length} / 160 chars
                    </span>
                  </div>
                  <Textarea
                    id="metaDescription"
                    name="metaDescription"
                    maxLength={160}
                    defaultValue={englishContent.metaDescription || ""}
                    onChange={() => setArrayFieldsDirty(true)}
                    data-testid="input-meta-description"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Main Content</CardTitle>
                  <CardDescription>AI-generated content with word count targets</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={generateContentMutation.isPending}
                      data-testid="button-ai-autofill"
                    >
                      {generateContentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      AI Auto-Fill
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => generateContentMutation.mutate("openai")}
                      data-testid="ai-provider-openai"
                    >
                      OpenAI (GPT-5)
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => generateContentMutation.mutate("anthropic")}
                      data-testid="ai-provider-anthropic"
                    >
                      Anthropic (Claude)
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => generateContentMutation.mutate("gemini")}
                      data-testid="ai-provider-gemini"
                    >
                      Google (Gemini)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="shortDescription">Short Description</Label>
                    <WordCounter text={englishContent.shortDescription} min={40} max={60} />
                  </div>
                  <Textarea
                    id="shortDescription"
                    name="shortDescription"
                    defaultValue={englishContent.shortDescription || ""}
                    onChange={() => setArrayFieldsDirty(true)}
                    rows={3}
                    data-testid="input-short-description"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="whyVisit">Why Visit</Label>
                    <WordCounter text={englishContent.whyVisit} min={60} max={80} />
                  </div>
                  <Textarea
                    id="whyVisit"
                    name="whyVisit"
                    defaultValue={englishContent.whyVisit || ""}
                    onChange={() => setArrayFieldsDirty(true)}
                    rows={4}
                    data-testid="input-why-visit"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="visitorExperience">Visitor Experience</Label>
                    <WordCounter text={englishContent.visitorExperience} min={80} max={100} />
                  </div>
                  <Textarea
                    id="visitorExperience"
                    name="visitorExperience"
                    defaultValue={englishContent.visitorExperience || ""}
                    onChange={() => setArrayFieldsDirty(true)}
                    rows={5}
                    data-testid="input-visitor-experience"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="history">History</Label>
                  <Textarea
                    id="history"
                    name="history"
                    defaultValue={englishContent.history || ""}
                    onChange={() => setArrayFieldsDirty(true)}
                    rows={3}
                    data-testid="input-history"
                  />
                  <p className="text-xs text-muted-foreground">2-3 sentences about the location's history</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bestTimeToVisit">Best Time to Visit</Label>
                    <WordCounter text={englishContent.bestTimeToVisit} min={40} max={60} />
                  </div>
                  <Textarea
                    id="bestTimeToVisit"
                    name="bestTimeToVisit"
                    defaultValue={englishContent.bestTimeToVisit || ""}
                    onChange={() => setArrayFieldsDirty(true)}
                    rows={3}
                    data-testid="input-best-time"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="howToGetThere">How to Get There</Label>
                  <Textarea
                    id="howToGetThere"
                    name="howToGetThere"
                    defaultValue={englishContent.howToGetThere || ""}
                    onChange={() => setArrayFieldsDirty(true)}
                    rows={3}
                    data-testid="input-how-to-get-there"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Highlights</CardTitle>
                <CardDescription>3-5 bullet points about this location</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {keyHighlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={highlight}
                      onChange={(e) => {
                        const newHighlights = [...keyHighlights];
                        newHighlights[idx] = e.target.value;
                        setKeyHighlights(newHighlights);
                        setArrayFieldsDirty(true);
                      }}
                      placeholder={`Highlight ${idx + 1}`}
                      data-testid={`input-highlight-${idx}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setKeyHighlights(keyHighlights.filter((_, i) => i !== idx));
                        setArrayFieldsDirty(true);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {keyHighlights.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setKeyHighlights([...keyHighlights, ""]);
                      setArrayFieldsDirty(true);
                    }}
                    data-testid="button-add-highlight"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Highlight
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>FAQ</CardTitle>
                <CardDescription>Minimum 7 frequently asked questions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {faq.map((item, idx) => (
                  <div key={idx} className="space-y-2 p-3 border rounded-md">
                    <div className="flex items-center justify-between">
                      <Label>Question {idx + 1}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFaq(faq.filter((_, i) => i !== idx));
                          setArrayFieldsDirty(true);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <Input
                      value={item.question}
                      onChange={(e) => {
                        const newFaq = [...faq];
                        newFaq[idx] = { ...newFaq[idx], question: e.target.value };
                        setFaq(newFaq);
                        setArrayFieldsDirty(true);
                      }}
                      placeholder="Enter question..."
                      data-testid={`input-faq-question-${idx}`}
                    />
                    <Textarea
                      value={item.answer}
                      onChange={(e) => {
                        const newFaq = [...faq];
                        newFaq[idx] = { ...newFaq[idx], answer: e.target.value };
                        setFaq(newFaq);
                        setArrayFieldsDirty(true);
                      }}
                      placeholder="Enter answer..."
                      rows={2}
                      data-testid={`input-faq-answer-${idx}`}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFaq([...faq, { question: "", answer: "" }]);
                    setArrayFieldsDirty(true);
                  }}
                  data-testid="button-add-faq"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add FAQ
                </Button>
                {faq.length < 7 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Minimum 7 FAQs required ({7 - faq.length} more needed)
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Location Images</CardTitle>
                <CardDescription>
                  Drag to reorder. Click the star to set as hero image.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {images.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No images available yet.</p>
                    <p className="text-sm">Run the image collection process to populate this section.</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={images.map(img => img.id || img.imageUrl)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {images.map((image, idx) => (
                          <SortableImageItem
                            key={image.id || image.imageUrl}
                            image={image}
                            onToggleHero={() => toggleHero(idx)}
                            onRemove={() => removeImage(idx)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attribution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Sources & Attribution</CardTitle>
                <CardDescription>
                  Legal requirement: All sources must be properly attributed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {location.sourceWikipedia && (
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
                      <Globe className="w-5 h-5 mt-0.5 text-blue-500" />
                      <div>
                        <h4 className="font-medium">Wikipedia</h4>
                        <p className="text-sm text-muted-foreground">
                          Content licensed under CC BY-SA 3.0
                        </p>
                        {location.sourceWikipediaUrl && (
                          <a
                            href={location.sourceWikipediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            View source
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {location.sourceOsm && (
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
                      <MapPin className="w-5 h-5 mt-0.5 text-green-500" />
                      <div>
                        <h4 className="font-medium">OpenStreetMap</h4>
                        <p className="text-sm text-muted-foreground">
                          Data licensed under ODbL
                        </p>
                        {location.sourceOsmId && (
                          <p className="text-sm font-mono mt-1">ID: {location.sourceOsmId}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {images.filter(img => img.photographer || img.attribution).length > 0 && (
                    <div className="p-3 bg-muted/50 rounded-md">
                      <h4 className="font-medium flex items-center gap-2 mb-2">
                        <ImageIcon className="w-5 h-5 text-[#6443F4]" />
                        Freepik Images
                      </h4>
                      <ul className="space-y-1 text-sm">
                        {images.filter(img => img.photographer || img.attribution).map((img, idx) => (
                          <li key={idx} className="text-muted-foreground">
                            {img.attribution || `Photo by ${img.photographer} on Freepik`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!location.sourceWikipedia && !location.sourceOsm && images.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No source attributions yet.</p>
                      <p className="text-sm">Attributions will appear here after data collection.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="affiliate" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Affiliate Integration</CardTitle>
                <CardDescription>
                  Tiqets affiliate link for ticket bookings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-md">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Link2 className="w-5 h-5 text-primary" />
                    Official Tiqets Affiliate Link
                  </h4>
                  <div className="flex items-center gap-2">
                    <Input
                      value={TIQETS_AFFILIATE_LINK}
                      readOnly
                      className="font-mono text-sm bg-background"
                      data-testid="input-affiliate-link"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(TIQETS_AFFILIATE_LINK);
                        toast({ title: "Copied to clipboard" });
                      }}
                      data-testid="button-copy-affiliate"
                    >
                      Copy
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      asChild
                    >
                      <a href={TIQETS_AFFILIATE_LINK} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This link is locked and cannot be changed. All ticket booking CTAs will use this affiliate link.
                  </p>
                </div>

                <div className="text-sm text-muted-foreground space-y-2">
                  <h5 className="font-medium text-foreground">Important Notes:</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>NO prices can be displayed on the website (legal requirement)</li>
                    <li>The affiliate link is used for all "Book Tickets" CTAs</li>
                    <li>Commission tracking is handled by Tiqets</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <HistoryTab locationId={id!} />
          </TabsContent>
        </Tabs>
        </form>
      </Form>
    </div>
  );
}

interface EditHistoryEntry {
  id: string;
  locationId: string;
  userId: string | null;
  editedAt: string;
  changeType: "create" | "update" | "delete";
  fieldChanged: string | null;
  oldValue: unknown;
  newValue: unknown;
  summary: string | null;
  userName: string | null;
  userEmail: string | null;
}

function HistoryTab({ locationId }: { locationId: string }) {
  const { data: history, isLoading, error } = useQuery<EditHistoryEntry[]>({
    queryKey: ["/api/admin/travi/locations", locationId, "history"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-destructive mb-2" />
          <p className="text-muted-foreground">Failed to load edit history</p>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit History</CardTitle>
          <CardDescription>Track all changes made to this location</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <History className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No edit history found</p>
          <p className="text-xs text-muted-foreground mt-1">Changes will appear here after edits are made</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit History</CardTitle>
        <CardDescription>Track all changes made to this location ({history.length} changes)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry, idx) => (
            <div
              key={entry.id}
              className="relative pl-6 pb-4 border-l-2 border-muted last:border-l-0"
              data-testid={`history-entry-${idx}`}
            >
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-muted flex items-center justify-center">
                {entry.changeType === "create" && <Plus className="w-2 h-2 text-green-600" />}
                {entry.changeType === "update" && <FileText className="w-2 h-2 text-blue-600" />}
                {entry.changeType === "delete" && <Trash2 className="w-2 h-2 text-red-600" />}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={entry.changeType === "create" ? "default" : entry.changeType === "delete" ? "destructive" : "secondary"} className="text-xs">
                    {entry.changeType}
                  </Badge>
                  {entry.fieldChanged && (
                    <span className="text-sm font-medium">{entry.fieldChanged}</span>
                  )}
                </div>

                {entry.summary && (
                  <p className="text-sm text-foreground">{entry.summary}</p>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(entry.editedAt).toLocaleString()}</span>
                  {(entry.userName || entry.userEmail) && (
                    <>
                      <span className="mx-1">by</span>
                      <span className="font-medium">{entry.userName || entry.userEmail || "Unknown"}</span>
                    </>
                  )}
                </div>

                {(entry.oldValue !== null || entry.newValue !== null) && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View details
                    </summary>
                    <div className="mt-2 p-2 bg-muted rounded-md space-y-2">
                      {entry.oldValue !== null && (
                        <div>
                          <span className="font-medium text-red-600 dark:text-red-400">Old:</span>
                          <pre className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
                            {typeof entry.oldValue === "string" ? entry.oldValue : JSON.stringify(entry.oldValue, null, 2)}
                          </pre>
                        </div>
                      )}
                      {entry.newValue !== null && (
                        <div>
                          <span className="font-medium text-green-600 dark:text-green-400">New:</span>
                          <pre className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
                            {typeof entry.newValue === "string" ? entry.newValue : JSON.stringify(entry.newValue, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

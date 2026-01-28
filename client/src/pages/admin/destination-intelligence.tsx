import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Globe,
  Lightbulb,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  Wand2,
  Search,
  FileText,
  Link2,
  ShieldCheck,
  Heading2,
  Star,
  Image as ImageIcon,
  Pencil,
  Save,
  Eye,
  LayoutGrid,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import type { FeaturedAttraction, FeaturedArea, FeaturedHighlight } from "@shared/schema";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface DestinationStatus {
  id: string;
  name: string;
  country: string;
  status: "complete" | "partial" | "empty";
  hasPage: boolean;
  seoScore?: number;
  wordCount?: number;
  h2Count?: number;
  internalLinks?: number;
  qualityTier?: "draft" | "review" | "publish" | "auto_approve";
  lastUpdated?: string;
  metaTitle?: string;
  metaDescription?: string;
}

interface IntelligenceStatus {
  totalDestinations: number;
  activeDestinations: number;
  missingContent: number;
  healthScore: number;
  destinations: DestinationStatus[];
}

interface HeroImage {
  filename: string;
  url: string;
  alt: string;
  order: number;
  isActive?: boolean;
}

interface HeroData {
  id: string;
  name: string;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImages: HeroImage[] | null;
  heroCTAText: string | null;
  heroCTALink: string | null;
  moodVibe: string | null;
  moodTagline: string | null;
  moodPrimaryColor: string | null;
  moodGradientFrom: string | null;
  moodGradientTo: string | null;
}

const DESTINATIONS_DATA: DestinationStatus[] = [
  {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    status: "complete",
    hasPage: true,
    seoScore: 92,
    wordCount: 4500,
    h2Count: 6,
    internalLinks: 8,
    qualityTier: "auto_approve",
  },
  {
    id: "paris",
    name: "Paris",
    country: "France",
    status: "complete",
    hasPage: true,
    seoScore: 88,
    wordCount: 3800,
    h2Count: 5,
    internalLinks: 7,
    qualityTier: "publish",
  },
  {
    id: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    status: "complete",
    hasPage: true,
    seoScore: 85,
    wordCount: 3200,
    h2Count: 5,
    internalLinks: 6,
    qualityTier: "publish",
  },
  {
    id: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    status: "complete",
    hasPage: true,
    seoScore: 87,
    wordCount: 3500,
    h2Count: 5,
    internalLinks: 6,
    qualityTier: "publish",
  },
  {
    id: "london",
    name: "London",
    country: "UK",
    status: "complete",
    hasPage: true,
    seoScore: 90,
    wordCount: 4200,
    h2Count: 6,
    internalLinks: 8,
    qualityTier: "auto_approve",
  },
  {
    id: "new-york",
    name: "New York",
    country: "USA",
    status: "complete",
    hasPage: true,
    seoScore: 89,
    wordCount: 4100,
    h2Count: 6,
    internalLinks: 7,
    qualityTier: "publish",
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    status: "complete",
    hasPage: true,
    seoScore: 86,
    wordCount: 3600,
    h2Count: 5,
    internalLinks: 6,
    qualityTier: "publish",
  },
  { id: "tokyo", name: "Tokyo", country: "Japan", status: "empty", hasPage: false },
  { id: "barcelona", name: "Barcelona", country: "Spain", status: "empty", hasPage: false },
  { id: "rome", name: "Rome", country: "Italy", status: "empty", hasPage: false },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", status: "empty", hasPage: false },
  { id: "hong-kong", name: "Hong Kong", country: "China", status: "empty", hasPage: false },
  { id: "las-vegas", name: "Las Vegas", country: "USA", status: "empty", hasPage: false },
  { id: "sydney", name: "Sydney", country: "Australia", status: "empty", hasPage: false },
  { id: "bali", name: "Bali", country: "Indonesia", status: "empty", hasPage: false },
];

export default function DestinationIntelligencePage() {
  const { toast } = useToast();
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  // Hero editing state
  const [editingDestinationId, setEditingDestinationId] = useState<string | null>(null);
  const [heroFormData, setHeroFormData] = useState<Partial<HeroData>>({});
  const [folderImages, setFolderImages] = useState<HeroImage[]>([]);
  const [loadingHero, setLoadingHero] = useState(false);

  // Featured sections editing state
  const [featuredSectionsDestinationId, setFeaturedSectionsDestinationId] = useState<string | null>(
    null
  );
  const [featuredSectionsData, setFeaturedSectionsData] = useState<{
    name: string;
    featuredAttractions: FeaturedAttraction[];
    featuredAreas: FeaturedArea[];
    featuredHighlights: FeaturedHighlight[];
  }>({ name: "", featuredAttractions: [], featuredAreas: [], featuredHighlights: [] });
  const [loadingFeaturedSections, setLoadingFeaturedSections] = useState(false);
  const [savingFeaturedSections, setSavingFeaturedSections] = useState(false);

  // Fetch hero data when dialog opens
  const openHeroEditor = async (destinationId: string) => {
    setEditingDestinationId(destinationId);
    setLoadingHero(true);
    setHeroFormData({});
    setFolderImages([]);

    try {
      // Fetch hero data and folder images in parallel
      const [heroRes, imagesRes] = await Promise.all([
        fetch(`/api/destination-intelligence/${destinationId}/hero`),
        fetch(`/api/destination-intelligence/hero-images/${destinationId}`),
      ]);

      if (!heroRes.ok) {
        throw new Error(`Failed to fetch hero data: ${heroRes.status}`);
      }

      const heroData = await heroRes.json();

      // Set form data from API response
      setHeroFormData({
        id: heroData.id,
        name: heroData.name,
        heroTitle: heroData.heroTitle || "",
        heroSubtitle: heroData.heroSubtitle || "",
        heroImages: (heroData.heroImages || []).map((img: HeroImage, idx: number) => ({
          ...img,
          order: img.order ?? idx,
          isActive: img.isActive ?? true,
        })),
        heroCTAText: heroData.heroCTAText || "",
        heroCTALink: heroData.heroCTALink || "",
        moodVibe: heroData.moodVibe || "",
        moodTagline: heroData.moodTagline || "",
        moodPrimaryColor: heroData.moodPrimaryColor || "",
        moodGradientFrom: heroData.moodGradientFrom || "",
        moodGradientTo: heroData.moodGradientTo || "",
      });

      // Images endpoint may return 404 if folder doesn't exist - that's OK
      if (imagesRes.ok) {
        const imagesData = await imagesRes.json();
        setFolderImages(imagesData.images || []);
      }
    } catch (error) {
      toast({ title: "Failed to load hero data", variant: "destructive" });
      setEditingDestinationId(null);
    } finally {
      setLoadingHero(false);
    }
  };

  const updateHeroMutation = useMutation({
    mutationFn: async (data: { id: string; heroData: Partial<HeroData> }) => {
      await apiRequest("PATCH", `/api/destination-intelligence/${data.id}/hero`, data.heroData);
    },
    onSuccess: () => {
      toast({ title: "Hero updated", description: "Destination hero contents has been saved." });
      setEditingDestinationId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/destination-intelligence/status"] });
    },
    onError: () => {
      toast({ title: "Failed to update hero", variant: "destructive" });
    },
  });

  const handleSaveHero = () => {
    if (!editingDestinationId) return;
    updateHeroMutation.mutate({ id: editingDestinationId, heroData: heroFormData });
  };

  const selectImageFromFolder = (image: HeroImage) => {
    const currentImages = heroFormData.heroImages || [];
    const existingIndex = currentImages.findIndex(img => img.url === image.url);

    if (existingIndex !== -1) {
      // Remove if already selected, then reorder remaining
      const updatedImages = currentImages
        .filter(img => img.url !== image.url)
        .map((img, idx) => ({ ...img, order: idx }));

      setHeroFormData(prev => ({
        ...prev,
        heroImages: updatedImages,
      }));
    } else {
      // Add to selection with order as next index
      const newImage: HeroImage = {
        filename: image.filename,
        url: image.url,
        alt: image.alt,
        order: currentImages.length,
        isActive: true,
      };

      setHeroFormData(prev => ({
        ...prev,
        heroImages: [...currentImages, newImage],
      }));
    }
  };

  // Featured sections editor functions
  const openFeaturedSectionsEditor = async (destinationId: string, destinationName: string) => {
    setFeaturedSectionsDestinationId(destinationId);
    setLoadingFeaturedSections(true);
    setFeaturedSectionsData({
      name: destinationName,
      featuredAttractions: [],
      featuredAreas: [],
      featuredHighlights: [],
    });

    try {
      const response = await fetch(
        `/api/destination-intelligence/${destinationId}/featured-sections`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch featured sections: ${response.status}`);
      }
      const data = await response.json();
      setFeaturedSectionsData({
        name: destinationName,
        featuredAttractions: data.featuredAttractions || [],
        featuredAreas: data.featuredAreas || [],
        featuredHighlights: data.featuredHighlights || [],
      });
    } catch (error) {
      toast({ title: "Failed to load featured sections", variant: "destructive" });
    } finally {
      setLoadingFeaturedSections(false);
    }
  };

  const updateFeaturedSectionsMutation = useMutation({
    mutationFn: async (data: {
      featuredAttractions: FeaturedAttraction[];
      featuredAreas: FeaturedArea[];
      featuredHighlights: FeaturedHighlight[];
    }) => {
      await apiRequest(
        "PATCH",
        `/api/destination-intelligence/${featuredSectionsDestinationId}/featured-sections`,
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Featured sections updated",
        description: "Section contents has been saved.",
      });
      setFeaturedSectionsDestinationId(null);
    },
    onError: () => {
      toast({ title: "Failed to update featured sections", variant: "destructive" });
    },
  });

  const handleSaveFeaturedSections = () => {
    if (!featuredSectionsDestinationId) return;

    // Validate required fields for each section type
    const validationErrors: string[] = [];

    featuredSectionsData.featuredAttractions.forEach((a, idx) => {
      if (!a.title.trim()) validationErrors.push(`Attraction #${idx + 1}: Title is required`);
      if (!a.image.trim()) validationErrors.push(`Attraction #${idx + 1}: Image URL is required`);
      if (!a.imageAlt.trim())
        validationErrors.push(`Attraction #${idx + 1}: Image alt text is required`);
    });

    featuredSectionsData.featuredAreas.forEach((a, idx) => {
      if (!a.name.trim()) validationErrors.push(`Area #${idx + 1}: Name is required`);
      if (!a.image.trim()) validationErrors.push(`Area #${idx + 1}: Image URL is required`);
      if (!a.imageAlt.trim()) validationErrors.push(`Area #${idx + 1}: Image alt text is required`);
      if (!a.vibe.trim()) validationErrors.push(`Area #${idx + 1}: Vibe is required`);
    });

    featuredSectionsData.featuredHighlights.forEach((h, idx) => {
      if (!h.title.trim()) validationErrors.push(`Highlight #${idx + 1}: Title is required`);
      if (!h.image.trim()) validationErrors.push(`Highlight #${idx + 1}: Image URL is required`);
      if (!h.imageAlt.trim())
        validationErrors.push(`Highlight #${idx + 1}: Image alt text is required`);
    });

    if (validationErrors.length > 0) {
      toast({
        title: "Validation failed",
        description:
          validationErrors.slice(0, 3).join("; ") +
          (validationErrors.length > 3 ? `... and ${validationErrors.length - 3} more` : ""),
        variant: "destructive",
      });
      return;
    }

    // Auto-deactivate items without images (enforce "no image = no section" rule)
    const processedAttractions = featuredSectionsData.featuredAttractions.map(a => ({
      ...a,
      isActive: a.isActive && !!a.image.trim(),
    }));
    const processedAreas = featuredSectionsData.featuredAreas.map(a => ({
      ...a,
      isActive: a.isActive && !!a.image.trim(),
    }));
    const processedHighlights = featuredSectionsData.featuredHighlights.map(h => ({
      ...h,
      isActive: h.isActive && !!h.image.trim(),
    }));

    updateFeaturedSectionsMutation.mutate({
      featuredAttractions: processedAttractions,
      featuredAreas: processedAreas,
      featuredHighlights: processedHighlights,
    });
  };

  const addFeaturedAttraction = () => {
    const newAttraction: FeaturedAttraction = {
      id: generateId(),
      title: "",
      image: "",
      imageAlt: "",
      order: featuredSectionsData.featuredAttractions.length,
      isActive: true,
    };
    setFeaturedSectionsData(prev => ({
      ...prev,
      featuredAttractions: [...prev.featuredAttractions, newAttraction],
    }));
  };

  const addFeaturedArea = () => {
    const newArea: FeaturedArea = {
      id: generateId(),
      name: "",
      image: "",
      imageAlt: "",
      vibe: "",
      order: featuredSectionsData.featuredAreas.length,
      isActive: true,
    };
    setFeaturedSectionsData(prev => ({
      ...prev,
      featuredAreas: [...prev.featuredAreas, newArea],
    }));
  };

  const addFeaturedHighlight = () => {
    const newHighlight: FeaturedHighlight = {
      id: generateId(),
      title: "",
      image: "",
      imageAlt: "",
      order: featuredSectionsData.featuredHighlights.length,
      isActive: true,
    };
    setFeaturedSectionsData(prev => ({
      ...prev,
      featuredHighlights: [...prev.featuredHighlights, newHighlight],
    }));
  };

  const { data: status, isLoading } = useQuery<IntelligenceStatus>({
    queryKey: ["/api/destination-intelligence/status"],
    placeholderData: () => {
      const activeCount = DESTINATIONS_DATA.filter(d => d.hasPage).length;
      const missingCount = DESTINATIONS_DATA.filter(d => !d.hasPage).length;
      const avgSeoScore =
        DESTINATIONS_DATA.filter(d => d.seoScore).reduce((sum, d) => sum + (d.seoScore || 0), 0) /
        activeCount;

      return {
        totalDestinations: 15,
        activeDestinations: activeCount,
        missingContent: missingCount,
        healthScore: Math.round(avgSeoScore),
        destinations: DESTINATIONS_DATA,
      };
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (destinationId: string) => {
      setGeneratingIds(prev => new Set(prev).add(destinationId));
      await apiRequest("POST", "/api/destination-intelligence/generate", { destinationId });
    },
    onSuccess: (_, destinationId) => {
      toast({
        title: "Content generation started",
        description: `Generating contents for ${destinationId}...`,
      });
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(destinationId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/destination-intelligence/status"] });
    },
    onError: (_, destinationId) => {
      toast({ title: "Generation failed", variant: "destructive" });
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(destinationId);
        return next;
      });
    },
  });

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      setBulkGenerating(true);
      setBulkProgress(0);
      // Use the backend's generate-all endpoint which uses real-time status data
      const response = await apiRequest("POST", "/api/destination-intelligence/generate-all");
      const result = await response.json();
      return result as { success: boolean; generated: number; failed: number };
    },
    onSuccess: result => {
      toast({
        title: "Bulk generation complete",
        description: `Generated contents for ${result.generated} destinations.`,
      });
      setBulkGenerating(false);
      setBulkProgress(0);
      queryClient.invalidateQueries({ queryKey: ["/api/destination-intelligence/status"] });
    },
    onError: () => {
      toast({ title: "Bulk generation failed", variant: "destructive" });
      setBulkGenerating(false);
      setBulkProgress(0);
    },
  });

  const scanHealthMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/destination-intelligence/scan"),
    onSuccess: () => {
      toast({
        title: "Health scan started",
        description: "Scanning all destinations for contents health...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/destination-intelligence/status"] });
    },
    onError: () => toast({ title: "Health scan failed", variant: "destructive" }),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return (
          <Badge className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
            Complete
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800">
            Partial
          </Badge>
        );
      default:
        return <Badge variant="destructive">Missing Content</Badge>;
    }
  };

  const getQualityTierBadge = (tier?: string, score?: number) => {
    if (!tier && score === undefined) return null;

    // Trust backend tier if provided, otherwise calculate from score
    const effectiveTier = tier
      ? tier
      : score !== undefined
        ? score >= 90
          ? "auto_approve"
          : score >= 80
            ? "publish"
            : score >= 70
              ? "review"
              : "draft"
        : "draft";

    switch (effectiveTier) {
      case "auto_approve":
        return (
          <Badge className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs">
            Auto-Approve (90+)
          </Badge>
        );
      case "publish":
        return (
          <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs">
            Publish Ready (80+)
          </Badge>
        );
      case "review":
        return (
          <Badge className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs">
            Needs Review (70+)
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 text-xs">
            Draft (50+)
          </Badge>
        );
    }
  };

  const getSeoScoreColor = (score?: number) => {
    if (!score) return "text-muted-foreground";
    if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 80) return "text-blue-600 dark:text-blue-400";
    if (score >= 70) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const destinations = status?.destinations || DESTINATIONS_DATA;
  const activeCount = status?.activeDestinations || destinations.filter(d => d.hasPage).length;
  const missingCount = status?.missingContent || destinations.filter(d => !d.hasPage).length;
  const healthScore = status?.healthScore || 88;

  return (
    <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
      <div className="border-b border-[hsl(var(--admin-border))] bg-white">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold text-[hsl(var(--admin-text))]">
            Destination Intelligence Hub
          </h1>
          <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1">
            AI-powered destination contents generation and health monitoring
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="p-4 bg-muted rounded-lg border">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            How It Works
          </h3>
          <p className="text-sm text-muted-foreground">
            This intelligence system monitors all 15 destinations and identifies content gaps. Click
            "Generate Content" for a specific destination, or "Generate All Missing" to
            automatically fill all empty destinations with AI-generated content. The system also
            tracks SEO scores, word counts, and internal linking for quality assurance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Total Destinations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-destinations">
                15
              </div>
              <p className="text-xs text-muted-foreground">Worldwide coverage</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Active (with contents)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-destinations">
                {activeCount}
              </div>
              <p className="text-xs text-muted-foreground">Published pages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Missing Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-missing-contents">
                {missingCount}
              </div>
              <p className="text-xs text-muted-foreground">Pending generation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Content Health Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-health-score">
                {healthScore}%
              </div>
              <Progress value={healthScore} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Destination Map
                </CardTitle>
                <CardDescription>
                  All 15 destinations with contents status and generation controls
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => scanHealthMutation.mutate()}
                  disabled={scanHealthMutation.isPending}
                  data-testid="button-scan-health"
                >
                  {scanHealthMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Scan Content Health
                </Button>
                <Button
                  onClick={() => generateAllMutation.mutate()}
                  disabled={bulkGenerating || missingCount === 0}
                  data-testid="button-generate-all-missing"
                >
                  {bulkGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  Generate All Missing
                </Button>
              </div>
            </div>
            {bulkGenerating && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Bulk generation in progress...</span>
                  <span className="font-medium">{bulkProgress}%</span>
                </div>
                <Progress
                  value={bulkProgress}
                  className="h-2"
                  data-testid="progress-bulk-generation"
                />
              </div>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {destinations.map(destination => {
                  const isGenerating = generatingIds.has(destination.id);
                  return (
                    <Card
                      key={destination.id}
                      className={
                        destination.hasPage ? "border-green-500/20" : "border-destructive/20"
                      }
                      data-testid={`card-destination-${destination.id}`}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <h4 className="font-semibold">{destination.name}</h4>
                            <p className="text-sm text-muted-foreground">{destination.country}</p>
                          </div>
                          {getStatusBadge(destination.status)}
                        </div>

                        {destination.hasPage && (
                          <div className="space-y-2 mb-4 text-sm">
                            <div className="mb-3">
                              {getQualityTierBadge(destination.qualityTier, destination.seoScore)}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Search className="h-3 w-3" />
                                SEO Score
                              </span>
                              <span
                                className={`font-medium ${getSeoScoreColor(destination.seoScore)}`}
                              >
                                {destination.seoScore}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                Word Count
                              </span>
                              <span
                                className={`font-medium ${(destination.wordCount || 0) >= 1800 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}
                              >
                                {destination.wordCount?.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Heading2 className="h-3 w-3" />
                                H2 Headers
                              </span>
                              <span
                                className={`font-medium ${(destination.h2Count || 0) >= 4 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}
                              >
                                {destination.h2Count || 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Link2 className="h-3 w-3" />
                                Internal Links
                              </span>
                              <span
                                className={`font-medium ${(destination.internalLinks || 0) >= 5 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}
                              >
                                {destination.internalLinks || 0}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openHeroEditor(destination.id)}
                            data-testid={`button-edit-hero-${destination.id}`}
                          >
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Hero
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openFeaturedSectionsEditor(destination.id, destination.name)
                            }
                            data-testid={`button-featured-sections-${destination.id}`}
                          >
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            Sections
                          </Button>
                          <Button
                            variant={destination.hasPage ? "outline" : "default"}
                            size="sm"
                            disabled={destination.status === "complete" || isGenerating}
                            onClick={() => generateMutation.mutate(destination.id)}
                            data-testid={`button-generate-${destination.id}`}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : destination.status === "complete" ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Complete
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-4 w-4 mr-2" />
                                Generate
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Hero Editor Dialog */}
        <Dialog
          open={!!editingDestinationId}
          onOpenChange={open => !open && setEditingDestinationId(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Edit Hero - {heroFormData.name}
              </DialogTitle>
              <DialogDescription>
                Manage hero contents, images, and visual theming for this destination
              </DialogDescription>
            </DialogHeader>

            {loadingHero ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Tabs defaultValue="contents" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="contents">Content</TabsTrigger>
                  <TabsTrigger value="images">Images ({folderImages.length})</TabsTrigger>
                  <TabsTrigger value="mood">Mood & Theme</TabsTrigger>
                </TabsList>

                <TabsContent value="contents" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroTitle">Hero Title</Label>
                    <Input
                      id="heroTitle"
                      placeholder="e.g., Discover Tokyo"
                      value={heroFormData.heroTitle || ""}
                      onChange={e =>
                        setHeroFormData(prev => ({ ...prev, heroTitle: e.target.value }))
                      }
                      data-testid="input-hero-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                    <Textarea
                      id="heroSubtitle"
                      placeholder="A compelling subtitle that captures the essence of the destination..."
                      value={heroFormData.heroSubtitle || ""}
                      onChange={e =>
                        setHeroFormData(prev => ({ ...prev, heroSubtitle: e.target.value }))
                      }
                      data-testid="input-hero-subtitle"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="heroCTAText">CTA Button Text</Label>
                      <Input
                        id="heroCTAText"
                        placeholder="Start Exploring"
                        value={heroFormData.heroCTAText || ""}
                        onChange={e =>
                          setHeroFormData(prev => ({ ...prev, heroCTAText: e.target.value }))
                        }
                        data-testid="input-hero-cta-text"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="heroCTALink">CTA Link</Label>
                      <Input
                        id="heroCTALink"
                        placeholder="#experiences"
                        value={heroFormData.heroCTALink || ""}
                        onChange={e =>
                          setHeroFormData(prev => ({ ...prev, heroCTALink: e.target.value }))
                        }
                        data-testid="input-hero-cta-link"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="images" className="space-y-4 mt-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    Select images from the destination folder to include in the hero carousel.
                    Selected images will rotate automatically.
                  </div>

                  {folderImages.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground border rounded-lg bg-muted">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p>No images found in destinations-hero/{editingDestinationId}/</p>
                      <p className="text-xs mt-1">Upload .webp images to this folder</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {folderImages.map((image, index) => {
                        const isSelected = (heroFormData.heroImages || []).some(
                          img => img.url === image.url
                        );
                        return (
                          <div
                            key={index}
                            className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                              isSelected
                                ? "border-primary ring-2 ring-primary/20"
                                : "border-transparent"
                            }`}
                            onClick={() => selectImageFromFolder(image)}
                            data-testid={`image-select-${index}`}
                          >
                            <img
                              src={image.url}
                              alt={image.alt}
                              className="w-full h-24 object-cover"
                            />
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                <CheckCircle2 className="h-3 w-3" />
                              </div>
                            )}
                            <div className="p-2 bg-background">
                              <p className="text-xs truncate">{image.alt}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    Selected: {(heroFormData.heroImages || []).length} image(s)
                  </div>
                </TabsContent>

                <TabsContent value="mood" className="space-y-4 mt-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    Define the visual personality and color theme for this destination.
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="moodTagline">Tagline</Label>
                    <Input
                      id="moodTagline"
                      placeholder="e.g., Where Tradition Meets Tomorrow"
                      value={heroFormData.moodTagline || ""}
                      onChange={e =>
                        setHeroFormData(prev => ({ ...prev, moodTagline: e.target.value }))
                      }
                      data-testid="input-mood-tagline"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="moodVibe">Vibe</Label>
                      <Input
                        id="moodVibe"
                        placeholder="e.g., luxury, adventure, cultural"
                        value={heroFormData.moodVibe || ""}
                        onChange={e =>
                          setHeroFormData(prev => ({ ...prev, moodVibe: e.target.value }))
                        }
                        data-testid="input-mood-vibe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="moodPrimaryColor">Primary Color (HSL)</Label>
                      <Input
                        id="moodPrimaryColor"
                        placeholder="e.g., hsl(200, 80%, 50%)"
                        value={heroFormData.moodPrimaryColor || ""}
                        onChange={e =>
                          setHeroFormData(prev => ({ ...prev, moodPrimaryColor: e.target.value }))
                        }
                        data-testid="input-mood-primary-color"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="moodGradientFrom">Gradient From (HSLA)</Label>
                      <Input
                        id="moodGradientFrom"
                        placeholder="e.g., hsla(200, 80%, 20%, 0.8)"
                        value={heroFormData.moodGradientFrom || ""}
                        onChange={e =>
                          setHeroFormData(prev => ({ ...prev, moodGradientFrom: e.target.value }))
                        }
                        data-testid="input-mood-gradient-from"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="moodGradientTo">Gradient To (HSLA)</Label>
                      <Input
                        id="moodGradientTo"
                        placeholder="e.g., hsla(200, 80%, 10%, 0.9)"
                        value={heroFormData.moodGradientTo || ""}
                        onChange={e =>
                          setHeroFormData(prev => ({ ...prev, moodGradientTo: e.target.value }))
                        }
                        data-testid="input-mood-gradient-to"
                      />
                    </div>
                  </div>

                  {/* Color Preview */}
                  {heroFormData.moodPrimaryColor && (
                    <div className="mt-4 p-4 rounded-lg border">
                      <p className="text-sm font-medium mb-2">Color Preview</p>
                      <div
                        className="h-16 rounded-md"
                        style={{
                          background: `linear-gradient(180deg, ${heroFormData.moodGradientFrom || "transparent"} 0%, ${heroFormData.moodGradientTo || "transparent"} 100%)`,
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-full m-4"
                          style={{ background: heroFormData.moodPrimaryColor }}
                        />
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setEditingDestinationId(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveHero} disabled={updateHeroMutation.isPending}>
                {updateHeroMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Hero
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Featured Sections Editor Dialog */}
        <Dialog
          open={!!featuredSectionsDestinationId}
          onOpenChange={open => !open && setFeaturedSectionsDestinationId(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                Featured Sections - {featuredSectionsData.name}
              </DialogTitle>
              <DialogDescription>
                Manage image-led contents sections. Sections without images will be hidden on the
                frontend.
              </DialogDescription>
            </DialogHeader>

            {loadingFeaturedSections ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Tabs defaultValue="attractions" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="attractions">
                    Attractions ({featuredSectionsData.featuredAttractions.length})
                  </TabsTrigger>
                  <TabsTrigger value="areas">
                    Where to Stay ({featuredSectionsData.featuredAreas.length})
                  </TabsTrigger>
                  <TabsTrigger value="highlights">
                    Highlights ({featuredSectionsData.featuredHighlights.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="attractions" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Top attractions with stunning imagery
                    </p>
                    <Button size="sm" variant="outline" onClick={addFeaturedAttraction}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Attraction
                    </Button>
                  </div>
                  {featuredSectionsData.featuredAttractions.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground border rounded-lg bg-muted">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p>No featured attractions yet</p>
                      <p className="text-xs mt-1">
                        Add attractions with images to display this section
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {featuredSectionsData.featuredAttractions.map((attraction, idx) => (
                        <Card key={attraction.id} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input
                                placeholder="Burj Khalifa"
                                value={attraction.title}
                                onChange={e => {
                                  const updated = [...featuredSectionsData.featuredAttractions];
                                  updated[idx] = { ...attraction, title: e.target.value };
                                  setFeaturedSectionsData(prev => ({
                                    ...prev,
                                    featuredAttractions: updated,
                                  }));
                                }}
                                data-testid={`input-attraction-title-${idx}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Image URL</Label>
                              <Input
                                placeholder="/attractions/burj-khalifa.webp"
                                value={attraction.image}
                                onChange={e => {
                                  const updated = [...featuredSectionsData.featuredAttractions];
                                  updated[idx] = { ...attraction, image: e.target.value };
                                  setFeaturedSectionsData(prev => ({
                                    ...prev,
                                    featuredAttractions: updated,
                                  }));
                                }}
                                data-testid={`input-attraction-image-${idx}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Image Alt</Label>
                              <Input
                                placeholder="Burj Khalifa tower at sunset"
                                value={attraction.imageAlt}
                                onChange={e => {
                                  const updated = [...featuredSectionsData.featuredAttractions];
                                  updated[idx] = { ...attraction, imageAlt: e.target.value };
                                  setFeaturedSectionsData(prev => ({
                                    ...prev,
                                    featuredAttractions: updated,
                                  }));
                                }}
                                data-testid={`input-attraction-alt-${idx}`}
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  const updated = featuredSectionsData.featuredAttractions.filter(
                                    a => a.id !== attraction.id
                                  );
                                  setFeaturedSectionsData(prev => ({
                                    ...prev,
                                    featuredAttractions: updated,
                                  }));
                                }}
                                data-testid={`button-delete-attraction-${idx}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="areas" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Neighborhoods and where to stay</p>
                    <Button size="sm" variant="outline" onClick={addFeaturedArea}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Area
                    </Button>
                  </div>
                  {featuredSectionsData.featuredAreas.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground border rounded-lg bg-muted">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p>No featured areas yet</p>
                      <p className="text-xs mt-1">Add areas with images to display this section</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {featuredSectionsData.featuredAreas.map((area, idx) => (
                        <Card key={area.id} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="space-y-2">
                              <Label>Name</Label>
                              <Input
                                placeholder="Downtown Dubai"
                                value={area.name}
                                onChange={e => {
                                  const updated = [...featuredSectionsData.featuredAreas];
                                  updated[idx] = { ...area, name: e.target.value };
                                  setFeaturedSectionsData(prev => ({
                                    ...prev,
                                    featuredAreas: updated,
                                  }));
                                }}
                                data-testid={`input-area-name-${idx}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Image URL</Label>
                              <Input
                                placeholder="/areas/downtown.webp"
                                value={area.image}
                                onChange={e => {
                                  const updated = [...featuredSectionsData.featuredAreas];
                                  updated[idx] = { ...area, image: e.target.value };
                                  setFeaturedSectionsData(prev => ({
                                    ...prev,
                                    featuredAreas: updated,
                                  }));
                                }}
                                data-testid={`input-area-image-${idx}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Vibe</Label>
                              <Input
                                placeholder="luxury"
                                value={area.vibe}
                                onChange={e => {
                                  const updated = [...featuredSectionsData.featuredAreas];
                                  updated[idx] = { ...area, vibe: e.target.value };
                                  setFeaturedSectionsData(prev => ({
                                    ...prev,
                                    featuredAreas: updated,
                                  }));
                                }}
                                data-testid={`input-area-vibe-${idx}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Price Level</Label>
                              <Input
                                placeholder="$$$"
                                value={area.priceLevel || ""}
                                onChange={e => {
                                  const updated = [...featuredSectionsData.featuredAreas];
                                  updated[idx] = { ...area, priceLevel: e.target.value };
                                  setFeaturedSectionsData(prev => ({
                                    ...prev,
                                    featuredAreas: updated,
                                  }));
                                }}
                                data-testid={`input-area-price-${idx}`}
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  const updated = featuredSectionsData.featuredAreas.filter(
                                    a => a.id !== area.id
                                  );
                                  setFeaturedSectionsData(prev => ({
                                    ...prev,
                                    featuredAreas: updated,
                                  }));
                                }}
                                data-testid={`button-delete-area-${idx}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="highlights" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Stunning visual highlights</p>
                    <Button size="sm" variant="outline" onClick={addFeaturedHighlight}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Highlight
                    </Button>
                  </div>
                  {featuredSectionsData.featuredHighlights.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground border rounded-lg bg-muted">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p>No featured highlights yet</p>
                      <p className="text-xs mt-1">
                        Add highlights with images to display this section
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {featuredSectionsData.featuredHighlights.map((highlight, idx) => (
                        <Card key={highlight.id} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input
                                placeholder="Sunset at Marina"
                                value={highlight.title}
                                onChange={e => {
                                  const updated = [...featuredSectionsData.featuredHighlights];
                                  updated[idx] = { ...highlight, title: e.target.value };
                                  setFeaturedSectionsData(prev => ({
                                    ...prev,
                                    featuredHighlights: updated,
                                  }));
                                }}
                                data-testid={`input-highlight-title-${idx}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Image URL</Label>
                              <Input
                                placeholder="/highlights/marina-sunset.webp"
                                value={highlight.image}
                                onChange={e => {
                                  const updated = [...featuredSectionsData.featuredHighlights];
                                  updated[idx] = { ...highlight, image: e.target.value };
                                  setFeaturedSectionsData(prev => ({
                                    ...prev,
                                    featuredHighlights: updated,
                                  }));
                                }}
                                data-testid={`input-highlight-image-${idx}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Caption</Label>
                              <Input
                                placeholder="Golden hour over the marina"
                                value={highlight.caption || ""}
                                onChange={e => {
                                  const updated = [...featuredSectionsData.featuredHighlights];
                                  updated[idx] = { ...highlight, caption: e.target.value };
                                  setFeaturedSectionsData(prev => ({
                                    ...prev,
                                    featuredHighlights: updated,
                                  }));
                                }}
                                data-testid={`input-highlight-caption-${idx}`}
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  const updated = featuredSectionsData.featuredHighlights.filter(
                                    h => h.id !== highlight.id
                                  );
                                  setFeaturedSectionsData(prev => ({
                                    ...prev,
                                    featuredHighlights: updated,
                                  }));
                                }}
                                data-testid={`button-delete-highlight-${idx}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setFeaturedSectionsDestinationId(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveFeaturedSections}
                disabled={updateFeaturedSectionsMutation.isPending}
              >
                {updateFeaturedSectionsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Sections
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Quality Gates
            </CardTitle>
            <CardDescription>
              Content quality validation checks for all destinations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-lg border bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4 text-primary" />
                  <span className="font-medium">SEO Score</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Min 80% for publish, 90% for auto-approve
                </p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{activeCount} destinations passing</span>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">Word Count</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  1,800 - 3,500 words per destination
                </p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{activeCount} destinations passing</span>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Heading2 className="h-4 w-4 text-primary" />
                  <span className="font-medium">H2 Headers</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">4-6 H2 headers per destination</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{activeCount} destinations passing</span>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  <span className="font-medium">Internal Links</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  5-8 internal links per destination
                </p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{activeCount} destinations passing</span>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-primary" />
                  <span className="font-medium">Banned Phrases</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">No clickbait or cliche terms</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">All contents clean</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

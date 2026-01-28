import { useState, createContext, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home,
  Plus,
  Trash2,
  Edit2,
  Save,
  Image,
  Type,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Layers,
  Grid3X3,
  Compass,
  MapPin,
  Megaphone,
  Search,
  Globe,
  Languages,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AVAILABLE_LOCALES = [
  { code: "en", name: "English" },
  { code: "he", name: "Hebrew" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ar", name: "Arabic" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ru", name: "Russian" },
  { code: "pt", name: "Portuguese" },
  { code: "it", name: "Italian" },
];

const LocaleContext = createContext<{ locale: string; setLocale: (l: string) => void }>({
  locale: "en",
  setLocale: () => {},
});

interface HeroSlide {
  id: string;
  imageUrl: string;
  imageAlt: string | null;
  headline: string | null;
  subheadline: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface AvailableImage {
  filename: string;
  url: string;
  name: string;
}

interface HomepageSection {
  id: string;
  sectionKey: string;
  title: string | null;
  subtitle: string | null;
  sortOrder: number;
  isVisible: boolean;
}

interface HomepageCard {
  id: number;
  sectionId: string | null;
  icon: string | null;
  title: string | null;
  subtitle: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface ExperienceCategory {
  id: number;
  name: string | null;
  description: string | null;
  slug: string | null;
  image: string | null;
  imageAlt: string | null;
  icon: string | null;
  href: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface Destination {
  id: string;
  name: string | null;
  country: string | null;
  slug: string | null;
  cardImage: string | null;
  cardImageAlt: string | null;
  summary: string | null;
  isActive: boolean;
  destinationLevel: string | null;
}

interface RegionLink {
  id: number;
  regionName: string;
  name: string | null;
  icon: string | null;
  linkUrl: string | null;
  links: Array<{ name: string; slug: string }>;
  destinations: Array<{ name: string; slug: string }>;
  sortOrder: number;
  isActive: boolean;
}

interface HomepageCta {
  id: string;
  headline: string;
  subheadline: string | null;
  inputPlaceholder: string | null;
  buttonText: string | null;
  helperText: string | null;
  isVisible: boolean;
}

interface HomepageSeoMeta {
  id: string;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  schemaEnabled: boolean;
}

export default function HomepageEditorPage() {
  const [activeTab, setActiveTab] = useState("seo");
  const [locale, setLocale] = useState("en");
  const { toast } = useToast();

  const generateTranslationsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/homepage/generate-translations");
      return response.json();
    },
    onSuccess: data => {
      const skippedMsg =
        data.skipped > 0 ? ` (${data.skipped} existing translations preserved)` : "";
      toast({
        title: "Translations Generated",
        description: `Successfully generated ${data.translated} translations across ${data.locales?.length || 0} languages.${skippedMsg}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage"] });
    },
    onError: error => {
      toast({
        title: "Translation Failed",
        description: error instanceof Error ? error.message : "Failed to generate translations",
        variant: "destructive",
      });
    },
  });

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <div className="min-h-screen bg-[hsl(var(--admin-bg))]">
        <div className="border-b border-[hsl(var(--admin-border))] bg-white">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-semibold text-[hsl(var(--admin-text))]">
                  Homepage Editor
                </h1>
                <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1">
                  Manage all homepage contents, sections, and SEO settings
                </p>
              </div>
              <Button
                onClick={() => generateTranslationsMutation.mutate()}
                disabled={generateTranslationsMutation.isPending}
                data-testid="button-generate-translations"
              >
                {generateTranslationsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Languages className="h-4 w-4 mr-2" />
                )}
                Generate All Languages
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <Label htmlFor="locale-select">Editing Language:</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger className="w-[200px]" data-testid="select-locale">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_LOCALES.map(loc => (
                  <SelectItem key={loc.code} value={loc.code}>
                    {loc.name} ({loc.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-8 gap-1" data-testid="homepage-editor-tabs">
              <TabsTrigger value="seo" data-testid="tab-seo" className="gap-1">
                <Search className="h-4 w-4" />
                <span className="hidden lg:inline">SEO</span>
              </TabsTrigger>
              <TabsTrigger value="hero" data-testid="tab-hero" className="gap-1">
                <Image className="h-4 w-4" />
                <span className="hidden lg:inline">Hero</span>
              </TabsTrigger>
              <TabsTrigger value="sections" data-testid="tab-sections" className="gap-1">
                <Layers className="h-4 w-4" />
                <span className="hidden lg:inline">Sections</span>
              </TabsTrigger>
              <TabsTrigger value="cards" data-testid="tab-cards" className="gap-1">
                <Grid3X3 className="h-4 w-4" />
                <span className="hidden lg:inline">Cards</span>
              </TabsTrigger>
              <TabsTrigger value="experiences" data-testid="tab-experiences" className="gap-1">
                <Compass className="h-4 w-4" />
                <span className="hidden lg:inline">Experiences</span>
              </TabsTrigger>
              <TabsTrigger value="destinations" data-testid="tab-destinations" className="gap-1">
                <Globe className="h-4 w-4" />
                <span className="hidden lg:inline">Destinations</span>
              </TabsTrigger>
              <TabsTrigger value="regions" data-testid="tab-regions" className="gap-1">
                <MapPin className="h-4 w-4" />
                <span className="hidden lg:inline">Regions</span>
              </TabsTrigger>
              <TabsTrigger value="cta" data-testid="tab-cta" className="gap-1">
                <Megaphone className="h-4 w-4" />
                <span className="hidden lg:inline">CTA</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="seo">
              <SeoMetaEditor />
            </TabsContent>
            <TabsContent value="hero">
              <HeroSlidesEditor />
            </TabsContent>
            <TabsContent value="sections">
              <SectionsManager />
            </TabsContent>
            <TabsContent value="cards">
              <QuickCategoriesEditor />
            </TabsContent>
            <TabsContent value="experiences">
              <ExperienceCategoriesEditor />
            </TabsContent>
            <TabsContent value="destinations">
              <DestinationsEditor />
            </TabsContent>
            <TabsContent value="regions">
              <RegionLinksEditor />
            </TabsContent>
            <TabsContent value="cta">
              <HomepageCtaEditor />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </LocaleContext.Provider>
  );
}

function SeoMetaEditor() {
  const { toast } = useToast();
  const { locale } = useContext(LocaleContext);
  const [formData, setFormData] = useState<Partial<HomepageSeoMeta>>({});

  const { data: seoMeta, isLoading } = useQuery<HomepageSeoMeta | null>({
    queryKey: ["/api/admin/homepage/seo-meta", locale],
    queryFn: async () => {
      const res = await fetch(`/api/admin/homepage/seo-meta?locale=${locale}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<HomepageSeoMeta>) => {
      if (!seoMeta?.id) return;
      return apiRequest(
        "PATCH",
        `/api/admin/homepage/seo-meta/${seoMeta.id}?locale=${locale}`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage/seo-meta", locale] });
      toast({ title: "SEO settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save SEO settings", variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const currentData = { ...seoMeta, ...formData };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Meta & SEO Settings
        </CardTitle>
        <CardDescription>Configure homepage SEO metadata for search engines</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="metaTitle">Meta Title</Label>
          <Input
            id="metaTitle"
            data-testid="input-meta-title"
            value={currentData.metaTitle || ""}
            onChange={e => setFormData({ ...formData, metaTitle: e.target.value })}
            placeholder="TRAVI - Expert Travel Guides"
            dir={locale === "he" || locale === "ar" ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="metaDescription">Meta Description</Label>
          <Textarea
            id="metaDescription"
            data-testid="input-meta-description"
            value={currentData.metaDescription || ""}
            onChange={e => setFormData({ ...formData, metaDescription: e.target.value })}
            placeholder="Discover expert travel guides..."
            rows={3}
            dir={locale === "he" || locale === "ar" ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="metaKeywords">Keywords</Label>
          <Input
            id="metaKeywords"
            data-testid="input-meta-keywords"
            value={currentData.metaKeywords || ""}
            onChange={e => setFormData({ ...formData, metaKeywords: e.target.value })}
            placeholder="travel, guides, destinations"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ogTitle">OG Title</Label>
            <Input
              id="ogTitle"
              data-testid="input-og-title"
              value={currentData.ogTitle || ""}
              onChange={e => setFormData({ ...formData, ogTitle: e.target.value })}
              dir={locale === "he" || locale === "ar" ? "rtl" : "ltr"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ogDescription">OG Description</Label>
            <Input
              id="ogDescription"
              data-testid="input-og-description"
              value={currentData.ogDescription || ""}
              onChange={e => setFormData({ ...formData, ogDescription: e.target.value })}
              dir={locale === "he" || locale === "ar" ? "rtl" : "ltr"}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ogImage">OG Image URL</Label>
            <Input
              id="ogImage"
              data-testid="input-og-image"
              value={currentData.ogImage || ""}
              onChange={e => setFormData({ ...formData, ogImage: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="canonicalUrl">Canonical URL</Label>
            <Input
              id="canonicalUrl"
              data-testid="input-canonical-url"
              value={currentData.canonicalUrl || ""}
              onChange={e => setFormData({ ...formData, canonicalUrl: e.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="robotsMeta">Robots Meta</Label>
            <Input
              id="robotsMeta"
              data-testid="input-robots-meta"
              value={currentData.robotsMeta || ""}
              onChange={e => setFormData({ ...formData, robotsMeta: e.target.value })}
              placeholder="index, follow"
            />
          </div>
          <div className="flex items-center gap-3 pt-8">
            <Switch
              id="schemaEnabled"
              data-testid="switch-schema-enabled"
              checked={currentData.schemaEnabled ?? true}
              onCheckedChange={checked => setFormData({ ...formData, schemaEnabled: checked })}
            />
            <Label htmlFor="schemaEnabled">Enable Schema.org structured data</Label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            data-testid="button-save-seo"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save SEO Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ServerImagePicker({
  value,
  onSelect,
  folder = "hero",
}: {
  value: string;
  onSelect: (url: string) => void;
  folder?: "hero" | "cards" | "experiences" | "regions";
}) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [customFilename, setCustomFilename] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const {
    data: images,
    isLoading,
    refetch,
  } = useQuery<AvailableImage[]>({
    queryKey: ["/api/admin/homepage/available-images", folder],
    queryFn: async () => {
      const res = await fetch(`/api/admin/homepage/available-images?folder=${folder}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a JPG, PNG, WebP, or GIF image",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      // Create preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      // Suggest filename based on original
      if (!customFilename) {
        const baseName = file.name
          .replace(/\.[^.]+$/, "")
          .toLowerCase()
          .replace(/[^a-z0-9\-_]/g, "-");
        setCustomFilename(baseName);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("customFilename", customFilename);
      formData.append("folder", folder);

      const res = await fetch("/api/admin/homepage/upload-image", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Upload failed");
      }

      toast({ title: "Image uploaded", description: `Saved as ${result.filename}` });
      onSelect(result.url);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCustomFilename("");
      refetch(); // Refresh the image list
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCustomFilename("");
  };

  return (
    <div className="space-y-3 p-3 border rounded-md bg-muted">
      {/* Upload section */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Image className="h-4 w-4" />
          Upload New Image (converts to WebP)
        </Label>

        {!selectedFile ? (
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              className="flex-1"
              data-testid="input-upload-image"
            />
          </div>
        ) : (
          <div className="space-y-3 p-3 border rounded-md bg-background">
            <div className="flex items-start gap-3">
              {previewUrl && (
                <div className="w-24 h-16 rounded-md overflow-hidden flex-shrink-0 border">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Custom Filename (without extension)
                  </Label>
                  <Input
                    value={customFilename}
                    onChange={e =>
                      setCustomFilename(e.target.value.toLowerCase().replace(/[^a-z0-9\-_]/g, "-"))
                    }
                    placeholder="my-image-name"
                    data-testid="input-custom-filename"
                  />
                  <p className="text-xs text-muted-foreground">
                    Will be saved as: {customFilename || "image"}.webp
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={cancelUpload} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={isUploading || !customFilename}
                data-testid="button-confirm-upload"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Existing images */}
      {isLoading ? (
        <Skeleton className="h-24" />
      ) : images && images.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Or select from existing images</Label>
          <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
            {images.map(img => (
              <button
                key={img.filename}
                type="button"
                onClick={() => onSelect(img.url)}
                className={`relative aspect-video rounded-md overflow-hidden border-2 transition-all hover-elevate ${
                  value === img.url ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                }`}
                data-testid={`button-select-image-${img.filename}`}
              >
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                {value === img.url && (
                  <div className="absolute inset-0 bg-blue-200 dark:bg-blue-900 flex items-center justify-center">
                    <Badge variant="default" className="text-xs">
                      Selected
                    </Badge>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HeroSlideItem({
  slide,
  onUpdate,
  onDelete,
  isRtl,
}: {
  slide: HeroSlide;
  onUpdate: (data: Partial<HeroSlide>) => void;
  onDelete: () => void;
  isRtl: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    imageUrl: slide.imageUrl || "",
    imageAlt: slide.imageAlt || "",
    headline: slide.headline || "",
    subheadline: slide.subheadline || "",
    ctaText: slide.ctaText || "",
    ctaLink: slide.ctaLink || "",
    sortOrder: slide.sortOrder,
  });

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      imageUrl: slide.imageUrl || "",
      imageAlt: slide.imageAlt || "",
      headline: slide.headline || "",
      subheadline: slide.subheadline || "",
      ctaText: slide.ctaText || "",
      ctaLink: slide.ctaLink || "",
      sortOrder: slide.sortOrder,
    });
    setIsEditing(false);
  };

  return (
    <Card className={!slide.isActive ? "opacity-60" : ""}>
      <CardContent className="p-4 space-y-3">
        {/* Header row with image preview and actions */}
        <div className="flex items-start gap-4">
          <div className="w-32 h-20 bg-muted rounded-md overflow-hidden flex-shrink-0">
            {slide.imageUrl && (
              <img
                src={slide.imageUrl}
                alt={slide.imageAlt || "Hero slide"}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant={slide.isActive ? "default" : "secondary"}>
                {slide.isActive ? (
                  <Eye className="h-3 w-3 mr-1" />
                ) : (
                  <EyeOff className="h-3 w-3 mr-1" />
                )}
                {slide.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">Order: {slide.sortOrder}</Badge>
            </div>
            <p className="font-medium truncate">{slide.headline || "No headline"}</p>
            <p className="text-sm text-muted-foreground truncate">
              {slide.subheadline || "No subheadline"}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Switch
              checked={slide.isActive}
              onCheckedChange={() => onUpdate({ isActive: !slide.isActive })}
              data-testid={`switch-slide-active-${slide.id}`}
            />
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  onClick={handleSave}
                  data-testid={`button-save-slide-${slide.id}`}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  data-testid={`button-edit-slide-${slide.id}`}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  data-testid={`button-delete-slide-${slide.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Inline edit form */}
        {isEditing && (
          <div className="space-y-3 pt-3 border-t">
            {/* Server image picker */}
            <ServerImagePicker
              value={formData.imageUrl}
              onSelect={url => setFormData({ ...formData, imageUrl: url })}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Image URL (or enter custom)</Label>
                <Input
                  data-testid={`input-slide-image-url-${slide.id}`}
                  value={formData.imageUrl}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://... or select above"
                />
              </div>
              <div className="space-y-2">
                <Label>Image Alt Text</Label>
                <Input
                  data-testid={`input-slide-image-alt-${slide.id}`}
                  value={formData.imageAlt}
                  onChange={e => setFormData({ ...formData, imageAlt: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Headline</Label>
                <Input
                  data-testid={`input-slide-headline-${slide.id}`}
                  value={formData.headline}
                  onChange={e => setFormData({ ...formData, headline: e.target.value })}
                  dir={isRtl ? "rtl" : "ltr"}
                />
              </div>
              <div className="space-y-2">
                <Label>Subheadline</Label>
                <Input
                  data-testid={`input-slide-subheadline-${slide.id}`}
                  value={formData.subheadline}
                  onChange={e => setFormData({ ...formData, subheadline: e.target.value })}
                  dir={isRtl ? "rtl" : "ltr"}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>CTA Text</Label>
                <Input
                  data-testid={`input-slide-cta-text-${slide.id}`}
                  value={formData.ctaText}
                  onChange={e => setFormData({ ...formData, ctaText: e.target.value })}
                  placeholder="Explore Now"
                  dir={isRtl ? "rtl" : "ltr"}
                />
              </div>
              <div className="space-y-2">
                <Label>CTA Link</Label>
                <Input
                  data-testid={`input-slide-cta-link-${slide.id}`}
                  value={formData.ctaLink}
                  onChange={e => setFormData({ ...formData, ctaLink: e.target.value })}
                  placeholder="/destinations"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  data-testid={`input-slide-sort-order-${slide.id}`}
                  type="number"
                  value={formData.sortOrder}
                  onChange={e =>
                    setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HeroSlidesEditor() {
  const { toast } = useToast();
  const { locale } = useContext(LocaleContext);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSlideData, setNewSlideData] = useState<Partial<HeroSlide>>({});

  const { data: slides, isLoading } = useQuery<HeroSlide[]>({
    queryKey: ["/api/admin/homepage/hero-slides", locale],
    queryFn: async () => {
      const res = await fetch(`/api/admin/homepage/hero-slides?locale=${locale}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<HeroSlide>) => {
      return apiRequest("POST", `/api/admin/homepage/hero-slides?locale=${locale}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage/hero-slides", locale] });
      toast({ title: "Hero slide created" });
      setIsAddingNew(false);
      setNewSlideData({});
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<HeroSlide> }) => {
      return apiRequest("PATCH", `/api/admin/homepage/hero-slides/${id}?locale=${locale}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage/hero-slides", locale] });
      toast({ title: "Hero slide updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/homepage/hero-slides/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage/hero-slides", locale] });
      toast({ title: "Hero slide deleted" });
    },
  });

  const handleCreateNew = () => {
    createMutation.mutate({ ...newSlideData, imageUrl: newSlideData.imageUrl || "" });
  };

  const isRtl = locale === "he" || locale === "ar";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Hero Slides
          </CardTitle>
          <CardDescription>Manage homepage hero carousel images</CardDescription>
        </div>
        {!isAddingNew && (
          <Button onClick={() => setIsAddingNew(true)} data-testid="button-add-hero-slide">
            <Plus className="h-4 w-4 mr-2" />
            Add Slide
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inline Add New Form */}
        {isAddingNew && (
          <Card className="border-primary border-2">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-primary">New Hero Slide</p>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    onClick={handleCreateNew}
                    disabled={createMutation.isPending}
                    data-testid="button-save-new-slide"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {createMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewSlideData({});
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              {/* Server image picker */}
              <ServerImagePicker
                value={newSlideData.imageUrl || ""}
                onSelect={url => setNewSlideData({ ...newSlideData, imageUrl: url })}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Image URL (or enter custom)</Label>
                  <Input
                    data-testid="input-new-slide-image-url"
                    value={newSlideData.imageUrl || ""}
                    onChange={e => setNewSlideData({ ...newSlideData, imageUrl: e.target.value })}
                    placeholder="https://... or select above"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Image Alt Text</Label>
                  <Input
                    data-testid="input-new-slide-image-alt"
                    value={newSlideData.imageAlt || ""}
                    onChange={e => setNewSlideData({ ...newSlideData, imageAlt: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Headline</Label>
                  <Input
                    data-testid="input-new-slide-headline"
                    value={newSlideData.headline || ""}
                    onChange={e => setNewSlideData({ ...newSlideData, headline: e.target.value })}
                    dir={isRtl ? "rtl" : "ltr"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subheadline</Label>
                  <Input
                    data-testid="input-new-slide-subheadline"
                    value={newSlideData.subheadline || ""}
                    onChange={e =>
                      setNewSlideData({ ...newSlideData, subheadline: e.target.value })
                    }
                    dir={isRtl ? "rtl" : "ltr"}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>CTA Text</Label>
                  <Input
                    data-testid="input-new-slide-cta-text"
                    value={newSlideData.ctaText || ""}
                    onChange={e => setNewSlideData({ ...newSlideData, ctaText: e.target.value })}
                    placeholder="Explore Now"
                    dir={isRtl ? "rtl" : "ltr"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CTA Link</Label>
                  <Input
                    data-testid="input-new-slide-cta-link"
                    value={newSlideData.ctaLink || ""}
                    onChange={e => setNewSlideData({ ...newSlideData, ctaLink: e.target.value })}
                    placeholder="/destinations"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input
                    data-testid="input-new-slide-sort-order"
                    type="number"
                    value={newSlideData.sortOrder ?? 0}
                    onChange={e =>
                      setNewSlideData({ ...newSlideData, sortOrder: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing slides list */}
        {!slides || slides.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hero slides configured. Add your first slide.
          </div>
        ) : (
          <div className="space-y-3">
            {slides.map(slide => (
              <HeroSlideItem
                key={slide.id}
                slide={slide}
                onUpdate={data => updateMutation.mutate({ id: slide.id, data })}
                onDelete={() => deleteMutation.mutate(slide.id)}
                isRtl={isRtl}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionsManager() {
  const { toast } = useToast();
  const { locale } = useContext(LocaleContext);

  const { data: sections, isLoading } = useQuery<HomepageSection[]>({
    queryKey: ["/api/admin/homepage/sections", locale],
    queryFn: async () => {
      const res = await fetch(`/api/admin/homepage/sections?locale=${locale}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<HomepageSection> }) => {
      return apiRequest("PATCH", `/api/admin/homepage/sections/${id}?locale=${locale}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage/sections", locale] });
      toast({ title: "Section updated" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Sections Manager
        </CardTitle>
        <CardDescription>Control visibility and order of homepage sections</CardDescription>
      </CardHeader>
      <CardContent>
        {!sections || sections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No sections configured.</div>
        ) : (
          <div className="space-y-3">
            {sections.map(section => (
              <SectionItem
                key={section.id}
                section={section}
                onUpdate={data => updateMutation.mutate({ id: section.id, data })}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionItem({
  section,
  onUpdate,
}: {
  section: HomepageSection;
  onUpdate: (data: Partial<HomepageSection>) => void;
}) {
  const { locale } = useContext(LocaleContext);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: section.title || "",
    subtitle: section.subtitle || "",
    sortOrder: section.sortOrder,
  });

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  const isRtl = locale === "he" || locale === "ar";

  return (
    <Card className={!section.isVisible ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{section.sectionKey}</Badge>
              <Badge variant={section.isVisible ? "default" : "secondary"}>
                {section.isVisible ? (
                  <Eye className="h-3 w-3 mr-1" />
                ) : (
                  <EyeOff className="h-3 w-3 mr-1" />
                )}
                {section.isVisible ? "Visible" : "Hidden"}
              </Badge>
              <Badge variant="outline">Order: {section.sortOrder}</Badge>
            </div>
            {isEditing ? (
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="Title"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    data-testid={`input-section-title-${section.id}`}
                    dir={isRtl ? "rtl" : "ltr"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input
                    placeholder="Subtitle"
                    value={formData.subtitle}
                    onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                    data-testid={`input-section-subtitle-${section.id}`}
                    dir={isRtl ? "rtl" : "ltr"}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>Order:</Label>
                  <Input
                    type="number"
                    className="w-20"
                    value={formData.sortOrder}
                    onChange={e =>
                      setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                    }
                    data-testid={`input-section-order-${section.id}`}
                  />
                </div>
              </div>
            ) : (
              <div>
                <p className="font-medium">{section.title || "No title"}</p>
                <p className="text-sm text-muted-foreground">{section.subtitle || "No subtitle"}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={section.isVisible}
              onCheckedChange={() => onUpdate({ isVisible: !section.isVisible })}
              data-testid={`switch-section-visible-${section.id}`}
            />
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  onClick={handleSave}
                  data-testid={`button-save-section-${section.id}`}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                data-testid={`button-edit-section-${section.id}`}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickCategoryItem({
  card,
  onUpdate,
  onDelete,
  isRtl,
}: {
  card: HomepageCard;
  onUpdate: (data: Partial<HomepageCard>) => void;
  onDelete: () => void;
  isRtl: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    icon: card.icon || "",
    title: card.title || "",
    subtitle: card.subtitle || "",
    linkUrl: card.linkUrl || "",
    sortOrder: card.sortOrder,
  });

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      icon: card.icon || "",
      title: card.title || "",
      subtitle: card.subtitle || "",
      linkUrl: card.linkUrl || "",
      sortOrder: card.sortOrder,
    });
    setIsEditing(false);
  };

  return (
    <Card className={!card.isActive ? "opacity-60" : ""}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline">{card.icon || "No icon"}</Badge>
              <Badge variant={card.isActive ? "default" : "secondary"}>
                {card.isActive ? (
                  <Eye className="h-3 w-3 mr-1" />
                ) : (
                  <EyeOff className="h-3 w-3 mr-1" />
                )}
                {card.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">Order: {card.sortOrder}</Badge>
            </div>
            <p className="font-medium truncate">{card.title || "No title"}</p>
            <p className="text-sm text-muted-foreground truncate">
              {card.subtitle || "No subtitle"}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Switch
              checked={card.isActive}
              onCheckedChange={() => onUpdate({ isActive: !card.isActive })}
              data-testid={`switch-card-active-${card.id}`}
            />
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave} data-testid={`button-save-card-${card.id}`}>
                  <Save className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  data-testid={`button-edit-card-${card.id}`}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  data-testid={`button-delete-card-${card.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="space-y-3 pt-3 border-t">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Icon (Lucide name)</Label>
                <Input
                  data-testid={`input-card-icon-${card.id}`}
                  value={formData.icon}
                  onChange={e => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="e.g. MapPin, Hotel, Utensils"
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  data-testid={`input-card-title-${card.id}`}
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  dir={isRtl ? "rtl" : "ltr"}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                data-testid={`input-card-subtitle-${card.id}`}
                value={formData.subtitle}
                onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                dir={isRtl ? "rtl" : "ltr"}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  data-testid={`input-card-link-${card.id}`}
                  value={formData.linkUrl}
                  onChange={e => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="/attractions"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  data-testid={`input-card-sort-order-${card.id}`}
                  type="number"
                  value={formData.sortOrder}
                  onChange={e =>
                    setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickCategoriesEditor() {
  const { toast } = useToast();
  const { locale } = useContext(LocaleContext);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCardData, setNewCardData] = useState<Partial<HomepageCard>>({});

  const { data: cards, isLoading } = useQuery<HomepageCard[]>({
    queryKey: ["/api/admin/homepage/cards", locale],
    queryFn: async () => {
      const res = await fetch(`/api/admin/homepage/cards?locale=${locale}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<HomepageCard>) => {
      return apiRequest("POST", `/api/admin/homepage/cards?locale=${locale}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage/cards", locale] });
      toast({ title: "Card created" });
      setIsAddingNew(false);
      setNewCardData({});
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<HomepageCard> }) => {
      return apiRequest("PATCH", `/api/admin/homepage/cards/${id}?locale=${locale}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage/cards", locale] });
      toast({ title: "Card updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/homepage/cards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage/cards", locale] });
      toast({ title: "Card deleted" });
    },
  });

  const handleCreateNew = () => {
    createMutation.mutate(newCardData);
  };

  const isRtl = locale === "he" || locale === "ar";

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Quick Categories
          </CardTitle>
          <CardDescription>Navigation tiles for quick access</CardDescription>
        </div>
        {!isAddingNew && (
          <Button onClick={() => setIsAddingNew(true)} data-testid="button-add-card">
            <Plus className="h-4 w-4 mr-2" />
            Add Card
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isAddingNew && (
          <Card className="border-primary border-2">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-primary">New Quick Category</p>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    onClick={handleCreateNew}
                    disabled={createMutation.isPending}
                    data-testid="button-save-new-card"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {createMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewCardData({});
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Icon (Lucide name)</Label>
                  <Input
                    data-testid="input-new-card-icon"
                    value={newCardData.icon || ""}
                    onChange={e => setNewCardData({ ...newCardData, icon: e.target.value })}
                    placeholder="e.g. MapPin, Hotel, Utensils"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    data-testid="input-new-card-title"
                    value={newCardData.title || ""}
                    onChange={e => setNewCardData({ ...newCardData, title: e.target.value })}
                    dir={isRtl ? "rtl" : "ltr"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Input
                  data-testid="input-new-card-subtitle"
                  value={newCardData.subtitle || ""}
                  onChange={e => setNewCardData({ ...newCardData, subtitle: e.target.value })}
                  dir={isRtl ? "rtl" : "ltr"}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Link URL</Label>
                  <Input
                    data-testid="input-new-card-link"
                    value={newCardData.linkUrl || ""}
                    onChange={e => setNewCardData({ ...newCardData, linkUrl: e.target.value })}
                    placeholder="/attractions"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input
                    data-testid="input-new-card-sort-order"
                    type="number"
                    value={newCardData.sortOrder ?? 0}
                    onChange={e =>
                      setNewCardData({ ...newCardData, sortOrder: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!cards || cards.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No cards configured.</div>
        ) : (
          <div className="space-y-4">
            {cards.map(card => (
              <QuickCategoryItem
                key={card.id}
                card={card}
                onUpdate={data => updateMutation.mutate({ id: card.id, data })}
                onDelete={() => deleteMutation.mutate(card.id)}
                isRtl={isRtl}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExperienceCategoryItem({
  category,
  onUpdate,
  onDelete,
  isRtl,
}: {
  category: ExperienceCategory;
  onUpdate: (data: Partial<ExperienceCategory>) => void;
  onDelete: () => void;
  isRtl: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: category.name || "",
    description: category.description || "",
    slug: category.slug || "",
    icon: category.icon || "",
    image: category.image || "",
    imageAlt: category.imageAlt || "",
    href: category.href || "",
    sortOrder: category.sortOrder,
  });

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: category.name || "",
      description: category.description || "",
      slug: category.slug || "",
      icon: category.icon || "",
      image: category.image || "",
      imageAlt: category.imageAlt || "",
      href: category.href || "",
      sortOrder: category.sortOrder,
    });
    setIsEditing(false);
  };

  return (
    <Card className={!category.isActive ? "opacity-60" : ""}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-4">
          <div className="w-24 h-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
            {category.image && (
              <img
                src={category.image}
                alt={category.imageAlt || category.name || ""}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline">{category.icon || "No icon"}</Badge>
              <Badge variant={category.isActive ? "default" : "secondary"}>
                {category.isActive ? (
                  <Eye className="h-3 w-3 mr-1" />
                ) : (
                  <EyeOff className="h-3 w-3 mr-1" />
                )}
                {category.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">Order: {category.sortOrder}</Badge>
            </div>
            <p className="font-medium truncate">{category.name || "No name"}</p>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {category.description || "No description"}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Switch
              checked={category.isActive}
              onCheckedChange={() => onUpdate({ isActive: !category.isActive })}
              data-testid={`switch-experience-active-${category.id}`}
            />
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  onClick={handleSave}
                  data-testid={`button-save-experience-${category.id}`}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  data-testid={`button-edit-experience-${category.id}`}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  data-testid={`button-delete-experience-${category.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="space-y-3 pt-3 border-t">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  data-testid={`input-experience-name-${category.id}`}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  dir={isRtl ? "rtl" : "ltr"}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  data-testid={`input-experience-slug-${category.id}`}
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="luxury-travel"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                data-testid={`input-experience-description-${category.id}`}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                dir={isRtl ? "rtl" : "ltr"}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Icon (Lucide name)</Label>
                <Input
                  data-testid={`input-experience-icon-${category.id}`}
                  value={formData.icon}
                  onChange={e => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="Crown, Compass, Mountain"
                />
              </div>
              <div className="space-y-2">
                <Label>Link URL (href)</Label>
                <Input
                  data-testid={`input-experience-href-${category.id}`}
                  value={formData.href}
                  onChange={e => setFormData({ ...formData, href: e.target.value })}
                  placeholder="/experiences/luxury"
                />
              </div>
            </div>
            {/* Image upload/select */}
            <ServerImagePicker
              value={formData.image}
              onSelect={url => setFormData({ ...formData, image: url })}
              folder="experiences"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Image URL (or enter custom)</Label>
                <Input
                  data-testid={`input-experience-image-${category.id}`}
                  value={formData.image}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://... or use uploader above"
                />
              </div>
              <div className="space-y-2">
                <Label>Image Alt Text</Label>
                <Input
                  data-testid={`input-experience-image-alt-${category.id}`}
                  value={formData.imageAlt}
                  onChange={e => setFormData({ ...formData, imageAlt: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                data-testid={`input-experience-sort-order-${category.id}`}
                type="number"
                className="w-24"
                value={formData.sortOrder}
                onChange={e =>
                  setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExperienceCategoriesEditor() {
  const { toast } = useToast();
  const { locale } = useContext(LocaleContext);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState<Partial<ExperienceCategory>>({});

  const { data: categories, isLoading } = useQuery<ExperienceCategory[]>({
    queryKey: ["/api/admin/homepage/experience-categories", locale],
    queryFn: async () => {
      const res = await fetch(`/api/admin/homepage/experience-categories?locale=${locale}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<ExperienceCategory>) => {
      return apiRequest("POST", `/api/admin/homepage/experience-categories?locale=${locale}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/homepage/experience-categories", locale],
      });
      toast({ title: "Category created" });
      setIsAddingNew(false);
      setNewCategoryData({});
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ExperienceCategory> }) => {
      return apiRequest(
        "PATCH",
        `/api/admin/homepage/experience-categories/${id}?locale=${locale}`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/homepage/experience-categories", locale],
      });
      toast({ title: "Category updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/homepage/experience-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/homepage/experience-categories", locale],
      });
      toast({ title: "Category deleted" });
    },
  });

  const handleCreateNew = () => {
    createMutation.mutate(newCategoryData);
  };

  const isRtl = locale === "he" || locale === "ar";

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5" />
            Experience Categories
          </CardTitle>
          <CardDescription>Travel style categories (Luxury, Adventure, etc.)</CardDescription>
        </div>
        {!isAddingNew && (
          <Button onClick={() => setIsAddingNew(true)} data-testid="button-add-experience">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isAddingNew && (
          <Card className="border-primary border-2">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-primary">New Experience Category</p>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    onClick={handleCreateNew}
                    disabled={createMutation.isPending}
                    data-testid="button-save-new-experience"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {createMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewCategoryData({});
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    data-testid="input-new-experience-name"
                    value={newCategoryData.name || ""}
                    onChange={e => setNewCategoryData({ ...newCategoryData, name: e.target.value })}
                    dir={isRtl ? "rtl" : "ltr"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    data-testid="input-new-experience-slug"
                    value={newCategoryData.slug || ""}
                    onChange={e => setNewCategoryData({ ...newCategoryData, slug: e.target.value })}
                    placeholder="luxury-travel"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  data-testid="input-new-experience-description"
                  value={newCategoryData.description || ""}
                  onChange={e =>
                    setNewCategoryData({ ...newCategoryData, description: e.target.value })
                  }
                  rows={2}
                  dir={isRtl ? "rtl" : "ltr"}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Icon (Lucide name)</Label>
                  <Input
                    data-testid="input-new-experience-icon"
                    value={newCategoryData.icon || ""}
                    onChange={e => setNewCategoryData({ ...newCategoryData, icon: e.target.value })}
                    placeholder="Crown, Compass, Mountain"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Link URL (href)</Label>
                  <Input
                    data-testid="input-new-experience-href"
                    value={newCategoryData.href || ""}
                    onChange={e => setNewCategoryData({ ...newCategoryData, href: e.target.value })}
                    placeholder="/experiences/luxury"
                  />
                </div>
              </div>
              {/* Image upload/select */}
              <ServerImagePicker
                value={newCategoryData.image || ""}
                onSelect={url => setNewCategoryData({ ...newCategoryData, image: url })}
                folder="experiences"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Image URL (or enter custom)</Label>
                  <Input
                    data-testid="input-new-experience-image"
                    value={newCategoryData.image || ""}
                    onChange={e =>
                      setNewCategoryData({ ...newCategoryData, image: e.target.value })
                    }
                    placeholder="https://... or use uploader above"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Image Alt Text</Label>
                  <Input
                    data-testid="input-new-experience-image-alt"
                    value={newCategoryData.imageAlt || ""}
                    onChange={e =>
                      setNewCategoryData({ ...newCategoryData, imageAlt: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  data-testid="input-new-experience-sort-order"
                  type="number"
                  className="w-24"
                  value={newCategoryData.sortOrder ?? 0}
                  onChange={e =>
                    setNewCategoryData({
                      ...newCategoryData,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}

        {!categories || categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No experience categories configured.
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map(category => (
              <ExperienceCategoryItem
                key={category.id}
                category={category}
                onUpdate={data => updateMutation.mutate({ id: category.id, data })}
                onDelete={() => deleteMutation.mutate(category.id)}
                isRtl={isRtl}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RegionLinkItem({
  link,
  onUpdate,
  onDelete,
  isRtl,
}: {
  link: RegionLink;
  onUpdate: (data: Partial<RegionLink>) => void;
  onDelete: () => void;
  isRtl: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    regionName: link.regionName || "",
    name: link.name || "",
    icon: link.icon || "",
    linkUrl: link.linkUrl || "",
    sortOrder: link.sortOrder,
  });
  const [destinationsText, setDestinationsText] = useState(
    link.destinations?.map(d => `${d.name}:${d.slug}`).join("\n") || ""
  );

  const handleSave = () => {
    const destinations = destinationsText
      .split("\n")
      .filter(Boolean)
      .map(line => {
        const [name, slug] = line.split(":");
        return { name: name?.trim() || "", slug: slug?.trim() || "" };
      });
    onUpdate({ ...formData, destinations });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      regionName: link.regionName || "",
      name: link.name || "",
      icon: link.icon || "",
      linkUrl: link.linkUrl || "",
      sortOrder: link.sortOrder,
    });
    setDestinationsText(link.destinations?.map(d => `${d.name}:${d.slug}`).join("\n") || "");
    setIsEditing(false);
  };

  return (
    <Card className={!link.isActive ? "opacity-60" : ""}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline">{link.icon || "No icon"}</Badge>
              <Badge variant={link.isActive ? "default" : "secondary"}>
                {link.isActive ? (
                  <Eye className="h-3 w-3 mr-1" />
                ) : (
                  <EyeOff className="h-3 w-3 mr-1" />
                )}
                {link.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">Order: {link.sortOrder}</Badge>
            </div>
            <p className="font-medium truncate">{link.regionName}</p>
            <p className="text-sm text-muted-foreground truncate">
              {link.name || "No display name"}
            </p>
            <p className="text-xs text-muted-foreground">
              {link.destinations?.length || 0} destinations
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Switch
              checked={link.isActive}
              onCheckedChange={() => onUpdate({ isActive: !link.isActive })}
              data-testid={`switch-region-active-${link.id}`}
            />
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  onClick={handleSave}
                  data-testid={`button-save-region-${link.id}`}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  data-testid={`button-edit-region-${link.id}`}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  data-testid={`button-delete-region-${link.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="space-y-3 pt-3 border-t">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Region Name *</Label>
                <Input
                  data-testid={`input-region-name-${link.id}`}
                  value={formData.regionName}
                  onChange={e => setFormData({ ...formData, regionName: e.target.value })}
                  placeholder="Middle East"
                />
              </div>
              <div className="space-y-2">
                <Label>Icon (Lucide name)</Label>
                <Input
                  data-testid={`input-region-icon-${link.id}`}
                  value={formData.icon}
                  onChange={e => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="Globe, MapPin"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                data-testid={`input-region-display-name-${link.id}`}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                dir={isRtl ? "rtl" : "ltr"}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  data-testid={`input-region-link-url-${link.id}`}
                  value={formData.linkUrl}
                  onChange={e => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="/regions/middle-east"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  data-testid={`input-region-sort-order-${link.id}`}
                  type="number"
                  value={formData.sortOrder}
                  onChange={e =>
                    setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Destinations (one per line, format: Name:slug)</Label>
              <Textarea
                data-testid={`input-region-destinations-${link.id}`}
                value={destinationsText}
                onChange={e => setDestinationsText(e.target.value)}
                placeholder="Dubai:dubai&#10;Abu Dhabi:abu-dhabi&#10;Qatar:qatar"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">Each line: DisplayName:url-slug</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RegionLinksEditor() {
  const { toast } = useToast();
  const { locale } = useContext(LocaleContext);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLinkData, setNewLinkData] = useState<Partial<RegionLink>>({});
  const [newDestinationsText, setNewDestinationsText] = useState("");

  const { data: links, isLoading } = useQuery<RegionLink[]>({
    queryKey: ["/api/admin/homepage/region-links", locale],
    queryFn: async () => {
      const res = await fetch(`/api/admin/homepage/region-links?locale=${locale}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<RegionLink>) => {
      return apiRequest("POST", `/api/admin/homepage/region-links?locale=${locale}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage/region-links", locale] });
      toast({ title: "Region link created" });
      setIsAddingNew(false);
      setNewLinkData({});
      setNewDestinationsText("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<RegionLink> }) => {
      return apiRequest("PATCH", `/api/admin/homepage/region-links/${id}?locale=${locale}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage/region-links", locale] });
      toast({ title: "Region link updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/homepage/region-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage/region-links", locale] });
      toast({ title: "Region link deleted" });
    },
  });

  const handleCreateNew = () => {
    const destinations = newDestinationsText
      .split("\n")
      .filter(Boolean)
      .map(line => {
        const [name, slug] = line.split(":");
        return { name: name?.trim() || "", slug: slug?.trim() || "" };
      });
    createMutation.mutate({
      ...newLinkData,
      destinations,
      regionName: newLinkData.regionName || "",
    });
  };

  const isRtl = locale === "he" || locale === "ar";

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Region Links
          </CardTitle>
          <CardDescription>Quick links grid for SEO (pre-footer)</CardDescription>
        </div>
        {!isAddingNew && (
          <Button onClick={() => setIsAddingNew(true)} data-testid="button-add-region">
            <Plus className="h-4 w-4 mr-2" />
            Add Region
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isAddingNew && (
          <Card className="border-primary border-2">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-primary">New Region Link</p>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    onClick={handleCreateNew}
                    disabled={createMutation.isPending}
                    data-testid="button-save-new-region"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {createMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewLinkData({});
                      setNewDestinationsText("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Region Name *</Label>
                  <Input
                    data-testid="input-new-region-name"
                    value={newLinkData.regionName || ""}
                    onChange={e => setNewLinkData({ ...newLinkData, regionName: e.target.value })}
                    placeholder="Middle East"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Icon (Lucide name)</Label>
                  <Input
                    data-testid="input-new-region-icon"
                    value={newLinkData.icon || ""}
                    onChange={e => setNewLinkData({ ...newLinkData, icon: e.target.value })}
                    placeholder="Globe, MapPin"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  data-testid="input-new-region-display-name"
                  value={newLinkData.name || ""}
                  onChange={e => setNewLinkData({ ...newLinkData, name: e.target.value })}
                  dir={isRtl ? "rtl" : "ltr"}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Link URL</Label>
                  <Input
                    data-testid="input-new-region-link-url"
                    value={newLinkData.linkUrl || ""}
                    onChange={e => setNewLinkData({ ...newLinkData, linkUrl: e.target.value })}
                    placeholder="/regions/middle-east"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input
                    data-testid="input-new-region-sort-order"
                    type="number"
                    value={newLinkData.sortOrder ?? 0}
                    onChange={e =>
                      setNewLinkData({ ...newLinkData, sortOrder: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Destinations (one per line, format: Name:slug)</Label>
                <Textarea
                  data-testid="input-new-region-destinations"
                  value={newDestinationsText}
                  onChange={e => setNewDestinationsText(e.target.value)}
                  placeholder="Dubai:dubai&#10;Abu Dhabi:abu-dhabi&#10;Qatar:qatar"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">Each line: DisplayName:url-slug</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!links || links.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No region links configured.</div>
        ) : (
          <div className="space-y-4">
            {links.map(link => (
              <RegionLinkItem
                key={link.id}
                link={link}
                onUpdate={data => updateMutation.mutate({ id: link.id, data })}
                onDelete={() => deleteMutation.mutate(link.id)}
                isRtl={isRtl}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HomepageCtaEditor() {
  const { toast } = useToast();
  const { locale } = useContext(LocaleContext);
  const [formData, setFormData] = useState<Partial<HomepageCta>>({});

  const { data: cta, isLoading } = useQuery<HomepageCta | null>({
    queryKey: ["/api/admin/homepage/cta", locale],
    queryFn: async () => {
      const res = await fetch(`/api/admin/homepage/cta?locale=${locale}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<HomepageCta>) => {
      if (!cta?.id) return;
      return apiRequest("PATCH", `/api/admin/homepage/cta/${cta.id}?locale=${locale}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage/cta", locale] });
      toast({ title: "CTA settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save CTA settings", variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const isRtl = locale === "he" || locale === "ar";

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  const currentData = { ...cta, ...formData };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Homepage CTA
        </CardTitle>
        <CardDescription>Configure the newsletter/CTA section on the homepage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3">
          <Switch
            id="ctaVisible"
            data-testid="switch-cta-visible"
            checked={currentData.isVisible ?? true}
            onCheckedChange={checked => setFormData({ ...formData, isVisible: checked })}
          />
          <Label htmlFor="ctaVisible">Show CTA section on homepage</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ctaHeadline">Headline *</Label>
          <Input
            id="ctaHeadline"
            data-testid="input-cta-headline"
            value={currentData.headline || ""}
            onChange={e => setFormData({ ...formData, headline: e.target.value })}
            placeholder="Stay Updated with Travel Insights"
            dir={isRtl ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ctaSubheadline">Subheadline</Label>
          <Input
            id="ctaSubheadline"
            data-testid="input-cta-subheadline"
            value={currentData.subheadline || ""}
            onChange={e => setFormData({ ...formData, subheadline: e.target.value })}
            dir={isRtl ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ctaButtonText">Button Text</Label>
          <Input
            id="ctaButtonText"
            data-testid="input-cta-button-text"
            value={currentData.buttonText || ""}
            onChange={e => setFormData({ ...formData, buttonText: e.target.value })}
            placeholder="Subscribe"
            dir={isRtl ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ctaInputPlaceholder">Input Placeholder</Label>
          <Input
            id="ctaInputPlaceholder"
            data-testid="input-cta-placeholder"
            value={currentData.inputPlaceholder || ""}
            onChange={e => setFormData({ ...formData, inputPlaceholder: e.target.value })}
            placeholder="Enter your email"
            dir={isRtl ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ctaHelperText">Helper Text</Label>
          <Input
            id="ctaHelperText"
            data-testid="input-cta-helper-text"
            value={currentData.helperText || ""}
            onChange={e => setFormData({ ...formData, helperText: e.target.value })}
            placeholder="We respect your privacy"
            dir={isRtl ? "rtl" : "ltr"}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            data-testid="button-save-cta"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save CTA Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DestinationItem({
  destination,
  onUpdate,
  onDelete,
  isRtl,
}: {
  destination: Destination;
  onUpdate: (data: Partial<Destination>) => void;
  onDelete: () => void;
  isRtl: boolean;
}) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: destination.name || "",
    country: destination.country || "",
    slug: destination.slug || "",
    cardImage: destination.cardImage || "",
    cardImageAlt: destination.cardImageAlt || "",
    summary: destination.summary || "",
    isActive: destination.isActive,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const generateAutoMeta = async () => {
    if (!formData.cardImage) {
      toast({ title: "No image to analyze", variant: "destructive" });
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/admin/auto-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageUrl: formData.cardImage,
          filename: formData.cardImage.split("/").pop() || "",
        }),
      });
      const data = await res.json();
      if (data.success && data.meta) {
        const meta = data.meta;
        setFormData(prev => ({
          ...prev,
          cardImageAlt: meta.altText || prev.cardImageAlt,
          name: meta.destination || prev.name,
          country: meta.country || prev.country,
          summary: meta.seoDescription || prev.summary,
          slug: meta.slug ? `/destinations/${meta.slug}` : prev.slug,
        }));
        toast({
          title: "Auto Meta generated",
          description: `Applied: ${meta.destination || "metadata"} (${meta.confidence}% confidence)`,
        });
      } else {
        // Display specific error message from backend
        const errorMsg = data.error?.message || data.error || "Unknown error";
        const errorCode = data.error?.code || "UNKNOWN";
        toast({
          title: `Auto Meta Failed (${errorCode})`,
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Auto Meta error",
        description: "Network or server error",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  return (
    <Card className={!destination.isActive ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {destination.cardImage && (
              <img
                src={destination.cardImage}
                alt={destination.cardImageAlt || destination.name || ""}
                className="w-20 h-14 object-cover rounded-md flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{destination.name || "Unnamed"}</span>
                {destination.country && (
                  <Badge variant="secondary" className="text-xs">
                    {destination.country}
                  </Badge>
                )}
                {!destination.isActive && (
                  <Badge variant="outline" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {destination.summary || "No summary"}
              </p>
              <p className="text-xs text-muted-foreground">{destination.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsEditing(!isEditing)}
              data-testid={`button-edit-destination-${destination.id}`}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              data-testid={`button-delete-destination-${destination.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isEditing && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={checked => setFormData({ ...formData, isActive: checked })}
                  data-testid={`switch-destination-active-${destination.id}`}
                />
                <Label className="text-sm">Active</Label>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={handleSave}
                  data-testid={`button-save-destination-${destination.id}`}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  data-testid={`input-destination-name-${destination.id}`}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  dir={isRtl ? "rtl" : "ltr"}
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  data-testid={`input-destination-country-${destination.id}`}
                  value={formData.country}
                  onChange={e => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Slug (URL path)</Label>
              <Input
                data-testid={`input-destination-slug-${destination.id}`}
                value={formData.slug}
                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                placeholder="/destinations/dubai"
              />
            </div>

            <div className="space-y-2">
              <Label>Summary</Label>
              <Textarea
                data-testid={`input-destination-summary-${destination.id}`}
                value={formData.summary}
                onChange={e => setFormData({ ...formData, summary: e.target.value })}
                rows={2}
                dir={isRtl ? "rtl" : "ltr"}
              />
            </div>

            <ServerImagePicker
              value={formData.cardImage}
              onSelect={url => setFormData({ ...formData, cardImage: url })}
              folder="cards"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Card Image URL</Label>
                <Input
                  data-testid={`input-destination-image-${destination.id}`}
                  value={formData.cardImage}
                  onChange={e => setFormData({ ...formData, cardImage: e.target.value })}
                  placeholder="https://... or use uploader above"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Image Alt Text
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={generateAutoMeta}
                    disabled={isAnalyzing || !formData.cardImage}
                    className="h-6 text-xs"
                    data-testid={`button-auto-meta-destination-${destination.id}`}
                  >
                    {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Auto Meta"}
                  </Button>
                </Label>
                <Input
                  data-testid={`input-destination-image-alt-${destination.id}`}
                  value={formData.cardImageAlt}
                  onChange={e => setFormData({ ...formData, cardImageAlt: e.target.value })}
                  placeholder="Descriptive alt text for SEO"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DestinationsEditor() {
  const { toast } = useToast();
  const { locale } = useContext(LocaleContext);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newDestinationData, setNewDestinationData] = useState<Partial<Destination>>({});
  const [isAnalyzingNew, setIsAnalyzingNew] = useState(false);

  const { data: destinationsList, isLoading } = useQuery<Destination[]>({
    queryKey: ["/api/admin/homepage/destinations", locale],
    queryFn: async () => {
      const res = await fetch(`/api/admin/homepage/destinations?locale=${locale}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Destination>) => {
      return apiRequest("POST", `/api/admin/homepage/destinations?locale=${locale}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage/destinations", locale] });
      toast({ title: "Destination created" });
      setIsAddingNew(false);
      setNewDestinationData({});
    },
    onError: () => {
      toast({ title: "Failed to create destination", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Destination> }) => {
      return apiRequest("PATCH", `/api/admin/homepage/destinations/${id}?locale=${locale}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage/destinations", locale] });
      toast({ title: "Destination updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/homepage/destinations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage/destinations", locale] });
      toast({ title: "Destination deleted" });
    },
  });

  const generateNewAutoMeta = async () => {
    if (!newDestinationData.cardImage) {
      toast({ title: "No image to analyze", variant: "destructive" });
      return;
    }
    setIsAnalyzingNew(true);
    try {
      const res = await fetch("/api/admin/auto-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageUrl: newDestinationData.cardImage,
          filename: newDestinationData.cardImage.split("/").pop() || "",
        }),
      });
      const data = await res.json();
      if (data.success && data.meta) {
        const meta = data.meta;
        const suggestedId = meta.slug?.replace(/-/g, "-") || "";
        setNewDestinationData(prev => ({
          ...prev,
          id: prev.id || suggestedId,
          name: meta.destination || prev.name,
          country: meta.country || prev.country,
          slug: meta.slug ? `/destinations/${meta.slug}` : prev.slug,
          cardImageAlt: meta.altText || prev.cardImageAlt,
          summary: meta.seoDescription || prev.summary,
        }));
        toast({
          title: "Auto Meta generated",
          description: `Applied: ${meta.destination || "metadata"} (${meta.confidence}% confidence)`,
        });
      } else {
        // Display specific error message from backend
        const errorMsg = data.error?.message || data.error || "Unknown error";
        const errorCode = data.error?.code || "UNKNOWN";
        toast({
          title: `Auto Meta Failed (${errorCode})`,
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Auto Meta error",
        description: "Network or server error",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingNew(false);
    }
  };

  const handleCreateNew = () => {
    if (!newDestinationData.id) {
      toast({ title: "Please provide a unique ID", variant: "destructive" });
      return;
    }
    createMutation.mutate(newDestinationData);
  };

  const isRtl = locale === "he" || locale === "ar";

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Destinations
          </CardTitle>
          <CardDescription>
            Travel destinations displayed on the homepage (countries, cities, areas)
          </CardDescription>
        </div>
        {!isAddingNew && (
          <Button onClick={() => setIsAddingNew(true)} data-testid="button-add-destination">
            <Plus className="h-4 w-4 mr-2" />
            Add Destination
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isAddingNew && (
          <Card className="border-primary border-2">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-primary">New Destination</p>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    onClick={handleCreateNew}
                    disabled={createMutation.isPending}
                    data-testid="button-save-new-destination"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {createMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewDestinationData({});
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>ID (unique slug)</Label>
                  <Input
                    data-testid="input-new-destination-id"
                    value={newDestinationData.id || ""}
                    onChange={e =>
                      setNewDestinationData({ ...newDestinationData, id: e.target.value })
                    }
                    placeholder="dubai"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    data-testid="input-new-destination-name"
                    value={newDestinationData.name || ""}
                    onChange={e =>
                      setNewDestinationData({ ...newDestinationData, name: e.target.value })
                    }
                    dir={isRtl ? "rtl" : "ltr"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    data-testid="input-new-destination-country"
                    value={newDestinationData.country || ""}
                    onChange={e =>
                      setNewDestinationData({ ...newDestinationData, country: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Slug (URL path)</Label>
                <Input
                  data-testid="input-new-destination-slug"
                  value={newDestinationData.slug || ""}
                  onChange={e =>
                    setNewDestinationData({ ...newDestinationData, slug: e.target.value })
                  }
                  placeholder="/destinations/dubai"
                />
              </div>

              <div className="space-y-2">
                <Label>Summary</Label>
                <Textarea
                  data-testid="input-new-destination-summary"
                  value={newDestinationData.summary || ""}
                  onChange={e =>
                    setNewDestinationData({ ...newDestinationData, summary: e.target.value })
                  }
                  rows={2}
                  dir={isRtl ? "rtl" : "ltr"}
                />
              </div>

              <ServerImagePicker
                value={newDestinationData.cardImage || ""}
                onSelect={url => setNewDestinationData({ ...newDestinationData, cardImage: url })}
                folder="cards"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Card Image URL</Label>
                  <Input
                    data-testid="input-new-destination-image"
                    value={newDestinationData.cardImage || ""}
                    onChange={e =>
                      setNewDestinationData({ ...newDestinationData, cardImage: e.target.value })
                    }
                    placeholder="https://... or use uploader above"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Image Alt Text
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={generateNewAutoMeta}
                      disabled={isAnalyzingNew || !newDestinationData.cardImage}
                      className="h-6 text-xs"
                      data-testid="button-auto-meta-new-destination"
                    >
                      {isAnalyzingNew ? <Loader2 className="h-3 w-3 animate-spin" /> : "Auto Meta"}
                    </Button>
                  </Label>
                  <Input
                    data-testid="input-new-destination-image-alt"
                    value={newDestinationData.cardImageAlt || ""}
                    onChange={e =>
                      setNewDestinationData({ ...newDestinationData, cardImageAlt: e.target.value })
                    }
                    placeholder="Descriptive alt text for SEO"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!destinationsList || destinationsList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No destinations configured.</div>
        ) : (
          <div className="space-y-4">
            {destinationsList.map(destination => (
              <DestinationItem
                key={destination.id}
                destination={destination}
                onUpdate={data => updateMutation.mutate({ id: destination.id, data })}
                onDelete={() => deleteMutation.mutate(destination.id)}
                isRtl={isRtl}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

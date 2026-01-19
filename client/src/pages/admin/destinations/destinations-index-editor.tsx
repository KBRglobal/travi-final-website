import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import {
  Image as ImageIcon,
  Save,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  Upload,
  Sparkles,
  Settings,
  Eye,
  ArrowUp,
  ArrowDown,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroSlide {
  id: string;
  destinationId: string;
  filename: string;
  alt: string;
  order: number;
  isActive: boolean;
  cityType?: string;
  travelStyle?: string;
  secondaryBadge?: string;
}

interface DestinationsIndexConfig {
  id: string | null;
  heroSlides: HeroSlide[];
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroDescription: string | null;
  heroCTAText: string | null;
  heroCTALink: string | null;
}

interface AvailableDestination {
  id: string;
  name: string;
  slug: string;
  country: string;
  cardImage: string | null;
  heroImage: string | null;
}

export default function DestinationsIndexEditor() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("hero");
  
  const { data: config, isLoading: configLoading } = useQuery<DestinationsIndexConfig>({
    queryKey: ["/api/admin/destinations-index/config"],
  });
  
  const { data: availableDestinations, isLoading: destinationsLoading } = useQuery<AvailableDestination[]>({
    queryKey: ["/api/admin/destinations-index/available-destinations"],
  });

  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroDescription, setHeroDescription] = useState("");
  const [heroCTAText, setHeroCTAText] = useState("");
  const [heroCTALink, setHeroCTALink] = useState("");
  
  const [uploadingSlide, setUploadingSlide] = useState<string | null>(null);
  const [newSlideDestinationId, setNewSlideDestinationId] = useState("");

  useEffect(() => {
    if (config) {
      setHeroSlides(config.heroSlides || []);
      setHeroTitle(config.heroTitle || "");
      setHeroSubtitle(config.heroSubtitle || "");
      setHeroDescription(config.heroDescription || "");
      setHeroCTAText(config.heroCTAText || "");
      setHeroCTALink(config.heroCTALink || "");
    }
  }, [config]);

  const saveConfigMutation = useMutation({
    mutationFn: async (data: Partial<DestinationsIndexConfig>) => {
      return apiRequest("/api/admin/destinations-index/config", {
        method: "PUT",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/destinations-index/config"] });
      toast({
        title: "Configuration saved",
        description: "Destinations index configuration has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration.",
        variant: "destructive",
      });
    },
  });

  const saveSlidesMutation = useMutation({
    mutationFn: async (slides: HeroSlide[]) => {
      return apiRequest("/api/admin/destinations-index/hero-slides", {
        method: "PUT",
        body: { heroSlides: slides },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/destinations-index/config"] });
      toast({
        title: "Hero slides saved",
        description: "Carousel configuration has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save slides.",
        variant: "destructive",
      });
    },
  });

  const handleSaveContent = () => {
    saveConfigMutation.mutate({
      heroTitle,
      heroSubtitle,
      heroDescription,
      heroCTAText,
      heroCTALink,
    });
  };

  const handleSaveSlides = () => {
    saveSlidesMutation.mutate(heroSlides);
  };

  const handleAddSlide = () => {
    if (!newSlideDestinationId) {
      toast({
        title: "Select a destination",
        description: "Please select a destination before adding a slide.",
        variant: "destructive",
      });
      return;
    }
    
    const destination = availableDestinations?.find(d => d.id === newSlideDestinationId);
    if (!destination) return;
    
    const newSlide: HeroSlide = {
      id: `slide-${Date.now()}`,
      destinationId: newSlideDestinationId,
      filename: destination.heroImage || "",
      alt: `${destination.name}, ${destination.country} - Travel destination hero image`,
      order: heroSlides.length,
      isActive: true,
      cityType: "",
      travelStyle: "",
      secondaryBadge: "",
    };
    
    setHeroSlides([...heroSlides, newSlide]);
    setNewSlideDestinationId("");
  };

  const handleRemoveSlide = (slideId: string) => {
    setHeroSlides(heroSlides.filter(s => s.id !== slideId));
  };

  const handleMoveSlide = (index: number, direction: "up" | "down") => {
    const newSlides = [...heroSlides];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newSlides.length) return;
    
    [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];
    newSlides.forEach((slide, i) => slide.order = i);
    setHeroSlides(newSlides);
  };

  const handleToggleSlide = (slideId: string) => {
    setHeroSlides(heroSlides.map(s => 
      s.id === slideId ? { ...s, isActive: !s.isActive } : s
    ));
  };

  const handleUpdateSlide = (slideId: string, field: keyof HeroSlide, value: string) => {
    setHeroSlides(heroSlides.map(s =>
      s.id === slideId ? { ...s, [field]: value } : s
    ));
  };

  const handleUploadImage = async (slideId: string, file: File) => {
    setUploadingSlide(slideId);
    
    try {
      const formData = new FormData();
      formData.append("image", file);
      
      const slide = heroSlides.find(s => s.id === slideId);
      if (slide?.alt) {
        formData.append("alt", slide.alt);
      }
      
      const response = await fetch("/api/admin/destinations-index/hero-image", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload image");
      }
      
      const result = await response.json();
      
      setHeroSlides(heroSlides.map(s =>
        s.id === slideId ? { ...s, filename: result.url } : s
      ));
      
      toast({
        title: "Image uploaded",
        description: "Hero image has been uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingSlide(null);
    }
  };

  const getDestinationName = (destinationId: string) => {
    const dest = availableDestinations?.find(d => d.id === destinationId);
    return dest ? `${dest.name}, ${dest.country}` : destinationId;
  };

  if (configLoading || destinationsLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Destinations Index Editor</h1>
          <p className="text-muted-foreground mt-1">
            Manage the hero carousel and content for the /destinations page
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href="/destinations" target="_blank" rel="noopener noreferrer">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </a>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="hero" data-testid="tab-hero">
            <ImageIcon className="w-4 h-4 mr-2" />
            Hero Carousel
          </TabsTrigger>
          <TabsTrigger value="content" data-testid="tab-content">
            <Settings className="w-4 h-4 mr-2" />
            Hero Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Hero Carousel Slides
              </CardTitle>
              <CardDescription>
                Add, reorder, and manage hero carousel images. Alt text is required for SEO.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor="new-slide-destination">Add Destination to Carousel</Label>
                  <Select
                    value={newSlideDestinationId}
                    onValueChange={setNewSlideDestinationId}
                  >
                    <SelectTrigger id="new-slide-destination" data-testid="select-destination">
                      <SelectValue placeholder="Select a destination..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDestinations?.map(dest => (
                        <SelectItem key={dest.id} value={dest.id}>
                          {dest.name}, {dest.country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleAddSlide}
                  disabled={!newSlideDestinationId}
                  data-testid="button-add-slide"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Slide
                </Button>
              </div>

              <div className="space-y-4">
                {heroSlides.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No slides added yet. Select a destination above to add your first slide.</p>
                  </div>
                ) : (
                  heroSlides.map((slide, index) => (
                    <Card 
                      key={slide.id} 
                      className={cn(
                        "transition-opacity",
                        !slide.isActive && "opacity-60"
                      )}
                    >
                      <CardContent className="pt-6">
                        <div className="flex gap-4">
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMoveSlide(index, "up")}
                              disabled={index === 0}
                              data-testid={`button-move-up-${slide.id}`}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <div className="flex items-center justify-center text-muted-foreground">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMoveSlide(index, "down")}
                              disabled={index === heroSlides.length - 1}
                              data-testid={`button-move-down-${slide.id}`}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="w-48 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                            {slide.filename ? (
                              <img
                                src={slide.filename}
                                alt={slide.alt}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">#{index + 1}</Badge>
                                <span className="font-medium">
                                  {getDestinationName(slide.destinationId)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={slide.isActive}
                                    onCheckedChange={() => handleToggleSlide(slide.id)}
                                    data-testid={`switch-active-${slide.id}`}
                                  />
                                  <Label className="text-sm">Active</Label>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveSlide(slide.id)}
                                  data-testid={`button-remove-${slide.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`alt-${slide.id}`}>Alt Text (Required for SEO)</Label>
                                <Input
                                  id={`alt-${slide.id}`}
                                  value={slide.alt}
                                  onChange={(e) => handleUpdateSlide(slide.id, "alt", e.target.value)}
                                  placeholder="Descriptive alt text for the image"
                                  data-testid={`input-alt-${slide.id}`}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`cityType-${slide.id}`}>City Type</Label>
                                <Input
                                  id={`cityType-${slide.id}`}
                                  value={slide.cityType || ""}
                                  onChange={(e) => handleUpdateSlide(slide.id, "cityType", e.target.value)}
                                  placeholder="e.g., Global Travel Hub"
                                  data-testid={`input-cityType-${slide.id}`}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`travelStyle-${slide.id}`}>Travel Style</Label>
                                <Input
                                  id={`travelStyle-${slide.id}`}
                                  value={slide.travelStyle || ""}
                                  onChange={(e) => handleUpdateSlide(slide.id, "travelStyle", e.target.value)}
                                  placeholder="e.g., Luxury & Modern City"
                                  data-testid={`input-travelStyle-${slide.id}`}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`secondaryBadge-${slide.id}`}>Secondary Badge</Label>
                                <Input
                                  id={`secondaryBadge-${slide.id}`}
                                  value={slide.secondaryBadge || ""}
                                  onChange={(e) => handleUpdateSlide(slide.id, "secondaryBadge", e.target.value)}
                                  placeholder="e.g., Nov–Mar"
                                  data-testid={`input-secondaryBadge-${slide.id}`}
                                />
                              </div>
                            </div>

                            <div>
                              <Label>Upload Image</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadImage(slide.id, file);
                                  }}
                                  disabled={uploadingSlide === slide.id}
                                  className="flex-1"
                                  data-testid={`input-upload-${slide.id}`}
                                />
                                {uploadingSlide === slide.id && (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveSlides}
                  disabled={saveSlidesMutation.isPending}
                  data-testid="button-save-slides"
                >
                  {saveSlidesMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Carousel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Hero Content Settings
              </CardTitle>
              <CardDescription>
                Customize the text content displayed in the hero section.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="heroTitle">Hero Title</Label>
                  <Input
                    id="heroTitle"
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    placeholder="Discover World-Class"
                    data-testid="input-hero-title"
                  />
                </div>
                <div>
                  <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                  <Input
                    id="heroSubtitle"
                    value={heroSubtitle}
                    onChange={(e) => setHeroSubtitle(e.target.value)}
                    placeholder="Destinations"
                    data-testid="input-hero-subtitle"
                  />
                </div>
                <div>
                  <Label htmlFor="heroDescription">Hero Description</Label>
                  <Textarea
                    id="heroDescription"
                    value={heroDescription}
                    onChange={(e) => setHeroDescription(e.target.value)}
                    placeholder="Handpicked travel experiences, insider tips, and comprehensive guides..."
                    rows={3}
                    data-testid="input-hero-description"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="heroCTAText">CTA Button Text</Label>
                  <Input
                    id="heroCTAText"
                    value={heroCTAText}
                    onChange={(e) => setHeroCTAText(e.target.value)}
                    placeholder="Start Exploring"
                    data-testid="input-cta-text"
                  />
                </div>
                <div>
                  <Label htmlFor="heroCTALink">CTA Button Link</Label>
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-muted-foreground" />
                    <Input
                      id="heroCTALink"
                      value={heroCTALink}
                      onChange={(e) => setHeroCTALink(e.target.value)}
                      placeholder="#explore-destinations"
                      data-testid="input-cta-link"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveContent}
                  disabled={saveConfigMutation.isPending}
                  data-testid="button-save-content"
                >
                  {saveConfigMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Content
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

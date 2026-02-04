import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MagicButton, MagicAllButton } from "@/components/magic-button";
import {
  Image as ImageIcon,
  Save,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Palette,
} from "lucide-react";

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

interface DestinationHeroTabProps {
  destinationId: string;
  destination: {
    id: string;
    name: string;
    country?: string;
    heroTitle: string | null;
    heroSubtitle: string | null;
  };
}

export default function DestinationHeroTab({
  destinationId,
  destination,
}: DestinationHeroTabProps) {
  const { toast } = useToast();
  const [heroTitle, setHeroTitle] = useState(destination.heroTitle || "");
  const [heroSubtitle, setHeroSubtitle] = useState(destination.heroSubtitle || "");

  const heroUrl = `/api/destination-intelligence/${destinationId}/hero`;

  const { data: heroData, isLoading } = useQuery<HeroData>({
    queryKey: [heroUrl],
    enabled: !!destinationId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { heroTitle: string; heroSubtitle: string }) => {
      return apiRequest(heroUrl, {
        method: "PATCH",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [heroUrl] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/destinations/${destinationId}`] });
      toast({
        title: "Hero updated",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save hero settings.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({ heroTitle, heroSubtitle });
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const images = heroData?.heroImages || [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Hero Content
                </CardTitle>
                <CardDescription>
                  Set the headline and tagline for {destination.name}'s hero section
                </CardDescription>
              </div>
              <MagicAllButton
                contentType="destination"
                entityName={destination.name}
                existingFields={{
                  country: destination.country,
                  heroTitle,
                  heroSubtitle,
                }}
                fields={["heroTitle", "heroSubtitle"]}
                onResults={results => {
                  if (results.heroTitle) setHeroTitle(results.heroTitle as string);
                  if (results.heroSubtitle) setHeroSubtitle(results.heroSubtitle as string);
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="heroTitle">Hero Title</Label>
                  <MagicButton
                    fieldId="heroTitle"
                    fieldType="headline"
                    context={{
                      contentType: "destination",
                      entityName: destination.name,
                      existingFields: {
                        country: destination.country,
                        heroSubtitle,
                      },
                    }}
                    onResult={value => setHeroTitle(value as string)}
                    size="sm"
                  />
                </div>
                <span
                  className={`text-xs ${
                    heroTitle.length < 20 || heroTitle.length > 60
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  }`}
                  data-testid="text-hero-title-count"
                >
                  {heroTitle.length}/60{" "}
                  {heroTitle.length > 0 && heroTitle.length < 20 && "(min 20)"}
                </span>
              </div>
              <Input
                id="heroTitle"
                value={heroTitle}
                onChange={e => setHeroTitle(e.target.value)}
                placeholder={`Discover ${destination.name}`}
                className={
                  heroTitle.length > 0 && (heroTitle.length < 20 || heroTitle.length > 60)
                    ? "border-destructive"
                    : ""
                }
                data-testid="input-hero-title"
              />
              {heroTitle.length > 0 && (heroTitle.length < 20 || heroTitle.length > 60) && (
                <p className="text-xs text-destructive" data-testid="text-hero-title-warning">
                  Title should be 20-60 characters for optimal display
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                  <MagicButton
                    fieldId="heroSubtitle"
                    fieldType="subtitle"
                    context={{
                      contentType: "destination",
                      entityName: destination.name,
                      existingFields: {
                        country: destination.country,
                        heroTitle,
                      },
                    }}
                    onResult={value => setHeroSubtitle(value as string)}
                    size="sm"
                  />
                </div>
                <span
                  className={`text-xs ${
                    heroSubtitle.length > 0 &&
                    (heroSubtitle.length < 40 || heroSubtitle.length > 120)
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  }`}
                  data-testid="text-hero-subtitle-count"
                >
                  {heroSubtitle.length}/120{" "}
                  {heroSubtitle.length > 0 && heroSubtitle.length < 40 && "(min 40)"}
                </span>
              </div>
              <Textarea
                id="heroSubtitle"
                value={heroSubtitle}
                onChange={e => setHeroSubtitle(e.target.value)}
                placeholder="Enter a compelling description..."
                rows={3}
                className={
                  heroSubtitle.length > 0 && (heroSubtitle.length < 40 || heroSubtitle.length > 120)
                    ? "border-destructive"
                    : ""
                }
                data-testid="input-hero-subtitle"
              />
              {heroSubtitle.length > 0 &&
                (heroSubtitle.length < 40 || heroSubtitle.length > 120) && (
                  <p className="text-xs text-destructive" data-testid="text-hero-subtitle-warning">
                    Subtitle should be 40-120 characters for optimal display
                  </p>
                )}
            </div>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              data-testid="button-save-hero"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Mood & Theme
            </CardTitle>
            <CardDescription>Visual personality for {destination.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vibe</Label>
                <Input
                  value={heroData?.moodVibe || ""}
                  placeholder="e.g., Luxurious & Modern"
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input
                  value={heroData?.moodTagline || ""}
                  placeholder="e.g., Where Dreams Touch the Sky"
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>
            {heroData?.moodPrimaryColor && (
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-md border"
                  style={{ backgroundColor: heroData.moodPrimaryColor }}
                />
                <span className="text-sm text-muted-foreground">
                  Primary Color: {heroData.moodPrimaryColor}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Hero Carousel</CardTitle>
              <CardDescription>Images from /destinations-hero/{destinationId}/</CardDescription>
            </div>
            <Badge variant="outline">{images.length} images</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-3">No hero images found</p>
              <p className="text-sm text-muted-foreground">
                Add images to{" "}
                <code className="bg-muted px-1 rounded">/destinations-hero/{destinationId}/</code>
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {images.map((img, index) => (
                <div
                  key={img.filename}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-card"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  <div className="w-20 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                    <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{img.filename}</p>
                    <p className="text-xs text-muted-foreground truncate">{img.alt}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    #{index + 1}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

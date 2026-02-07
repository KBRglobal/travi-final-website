import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MagicButton, MagicAllButton } from "@/components/magic-button";
import {
  Search,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Globe,
  FileText,
} from "lucide-react";

interface SEOData {
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  keywords: string[] | null;
}

interface SEOScore {
  overall: number;
  titleScore: number;
  descriptionScore: number;
  keywordsScore: number;
  issues: string[];
  suggestions: string[];
}

interface DestinationSeoTabProps {
  destinationId: string;
  destination: {
    id: string;
    name: string;
    country?: string;
  };
}

export default function DestinationSeoTab({
  destinationId,
  destination,
}: Readonly<DestinationSeoTabProps>) {
  const { toast } = useToast();
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  const seoUrl = `/api/admin/destinations/${destinationId}/seo`;

  const { data: seoData, isLoading } = useQuery<SEOData>({
    queryKey: [seoUrl],
    enabled: !!destinationId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { metaTitle: string; metaDescription: string }) => {
      return apiRequest(seoUrl, {
        method: "PATCH",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [seoUrl] });
      toast({
        title: "SEO settings saved",
        description: "Your meta tags have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save SEO settings.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
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

  const titleLength = metaTitle.length || seoData?.metaTitle?.length || 0;
  const descLength = metaDescription.length || seoData?.metaDescription?.length || 0;

  let titleScore: number;
  if (titleLength >= 30 && titleLength <= 60) titleScore = 100;
  else if (titleLength > 0) titleScore = 60;
  else titleScore = 0;

  let descScore: number;
  if (descLength >= 120 && descLength <= 160) descScore = 100;
  else if (descLength > 0) descScore = 60;
  else descScore = 0;
  const overallScore = Math.round((titleScore + descScore) / 2);

  let scoreVariant: "default" | "secondary" | "destructive";
  if (overallScore >= 80) scoreVariant = "default";
  else if (overallScore >= 50) scoreVariant = "secondary";
  else scoreVariant = "destructive";

  let scoreLabel: string;
  if (overallScore >= 80) scoreLabel = "Good";
  else if (overallScore >= 50) scoreLabel = "Needs Work";
  else scoreLabel = "Poor";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Meta Tags
                </CardTitle>
                <CardDescription>Search engine optimization for {destination.name}</CardDescription>
              </div>
              <MagicAllButton
                contentType="destination"
                entityName={destination.name}
                existingFields={{
                  country: destination.country,
                  metaTitle,
                  metaDescription,
                }}
                fields={["metaTitle", "metaDescription"]}
                onResults={results => {
                  if (results.metaTitle) setMetaTitle(results.metaTitle as string);
                  if (results.metaDescription)
                    setMetaDescription(results.metaDescription as string);
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <MagicButton
                    fieldId="metaTitle"
                    fieldType="meta_title"
                    context={{
                      contentType: "destination",
                      entityName: destination.name,
                      existingFields: {
                        country: destination.country,
                        metaDescription,
                      },
                    }}
                    onResult={value => setMetaTitle(value as string)}
                    size="sm"
                  />
                </div>
                <span
                  className={`text-xs ${titleLength > 60 ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {titleLength}/60
                </span>
              </div>
              <Input
                id="metaTitle"
                value={metaTitle || seoData?.metaTitle || ""}
                onChange={e => setMetaTitle(e.target.value)}
                placeholder={`${destination.name} Travel Guide | Travi`}
                data-testid="input-meta-title"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <MagicButton
                    fieldId="metaDescription"
                    fieldType="meta_description"
                    context={{
                      contentType: "destination",
                      entityName: destination.name,
                      existingFields: {
                        country: destination.country,
                        metaTitle,
                      },
                    }}
                    onResult={value => setMetaDescription(value as string)}
                    size="sm"
                  />
                </div>
                <span
                  className={`text-xs ${descLength > 160 ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {descLength}/160
                </span>
              </div>
              <Textarea
                id="metaDescription"
                value={metaDescription || seoData?.metaDescription || ""}
                onChange={e => setMetaDescription(e.target.value)}
                placeholder="Enter a compelling meta description..."
                rows={3}
                data-testid="input-meta-description"
              />
            </div>
            <Button
              onClick={() => saveMutation.mutate({ metaTitle, metaDescription })}
              disabled={saveMutation.isPending}
              data-testid="button-save-seo"
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
              <Globe className="w-5 h-5" />
              Open Graph
            </CardTitle>
            <CardDescription>Social media preview settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>OG Title</Label>
              <Input
                value={seoData?.ogTitle || ""}
                placeholder="Same as meta title by default"
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>OG Image</Label>
              <div className="border rounded-lg p-3 bg-muted">
                {seoData?.ogImage ? (
                  <img
                    src={seoData.ogImage}
                    alt="OG preview"
                    className="w-full h-32 object-cover rounded"
                  />
                ) : (
                  <div className="h-32 flex items-center justify-center text-muted-foreground">
                    No OG image set
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            SEO Score
          </CardTitle>
          <CardDescription>Content quality analysis for {destination.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">{overallScore}</div>
            <Badge variant={scoreVariant}>{scoreLabel}</Badge>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Title Tag</span>
                <span className={titleScore === 100 ? "text-green-600" : "text-amber-600"}>
                  {titleScore}%
                </span>
              </div>
              <Progress value={titleScore} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Meta Description</span>
                <span className={descScore === 100 ? "text-green-600" : "text-amber-600"}>
                  {descScore}%
                </span>
              </div>
              <Progress value={descScore} className="h-2" />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium text-sm">Recommendations</h4>
            <div className="space-y-2 text-sm">
              {titleLength < 30 && (
                <div className="flex items-start gap-2 text-amber-600">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Title is too short. Aim for 30-60 characters.</span>
                </div>
              )}
              {titleLength > 60 && (
                <div className="flex items-start gap-2 text-destructive">
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Title is too long. Keep under 60 characters.</span>
                </div>
              )}
              {descLength < 120 && (
                <div className="flex items-start gap-2 text-amber-600">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Description is too short. Aim for 120-160 characters.</span>
                </div>
              )}
              {titleScore === 100 && descScore === 100 && (
                <div className="flex items-start gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Great job! Your SEO settings look good.</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

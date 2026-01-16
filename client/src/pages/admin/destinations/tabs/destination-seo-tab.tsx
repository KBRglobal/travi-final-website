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
import {
  Search,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Globe,
  FileText,
  Link2,
  Wand2,
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
  };
}

export default function DestinationSeoTab({ destinationId, destination }: DestinationSeoTabProps) {
  const { toast } = useToast();
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  const { data: seoData, isLoading } = useQuery<SEOData>({
    queryKey: ["/api/admin/destinations", destinationId, "seo"],
    enabled: !!destinationId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { metaTitle: string; metaDescription: string }) => {
      return apiRequest(`/api/admin/destinations/${destinationId}/seo`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/destinations", destinationId, "seo"] });
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
  
  const titleScore = titleLength >= 30 && titleLength <= 60 ? 100 : titleLength > 0 ? 60 : 0;
  const descScore = descLength >= 120 && descLength <= 160 ? 100 : descLength > 0 ? 60 : 0;
  const overallScore = Math.round((titleScore + descScore) / 2);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Meta Tags
            </CardTitle>
            <CardDescription>
              Search engine optimization for {destination.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <span className={`text-xs ${titleLength > 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {titleLength}/60
                </span>
              </div>
              <Input
                id="metaTitle"
                value={metaTitle || seoData?.metaTitle || ""}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder={`${destination.name} Travel Guide | Travi`}
                data-testid="input-meta-title"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <span className={`text-xs ${descLength > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {descLength}/160
                </span>
              </div>
              <Textarea
                id="metaDescription"
                value={metaDescription || seoData?.metaDescription || ""}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Enter a compelling meta description..."
                rows={3}
                data-testid="input-meta-description"
              />
            </div>
            <div className="flex items-center gap-2">
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
              <Button variant="outline" data-testid="button-generate-seo">
                <Wand2 className="w-4 h-4 mr-2" />
                AI Generate
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Open Graph
            </CardTitle>
            <CardDescription>
              Social media preview settings
            </CardDescription>
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
          <CardDescription>
            Content quality analysis for {destination.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">
              {overallScore}
            </div>
            <Badge variant={overallScore >= 80 ? "default" : overallScore >= 50 ? "secondary" : "destructive"}>
              {overallScore >= 80 ? "Good" : overallScore >= 50 ? "Needs Work" : "Poor"}
            </Badge>
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

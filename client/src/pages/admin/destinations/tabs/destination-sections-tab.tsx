import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  FileText,
  Star,
  MapPin,
  Image as ImageIcon,
  Plus,
  GripVertical,
  Settings,
  Eye,
  EyeOff,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface ContentSection {
  id: string;
  type: "featured_attractions" | "featured_areas" | "featured_highlights" | "custom";
  title: string;
  isVisible: boolean;
  itemCount: number;
}

interface DestinationSectionsTabProps {
  destinationId: string;
  destination: {
    id: string;
    name: string;
  };
}

const SECTION_TYPES = {
  featured_attractions: {
    icon: Star,
    label: "Featured Attractions",
    description: "Top attractions with images and descriptions",
  },
  featured_areas: {
    icon: MapPin,
    label: "Featured Areas",
    description: "Where to stay - neighborhoods with vibes and price levels",
  },
  featured_highlights: {
    icon: ImageIcon,
    label: "Featured Highlights",
    description: "Visual gallery with stunning images",
  },
  custom: {
    icon: FileText,
    label: "Custom Section",
    description: "Custom contents block",
  },
};

export default function DestinationSectionsTab({ destinationId, destination }: DestinationSectionsTabProps) {
  const { toast } = useToast();

  const sectionsUrl = `/api/admin/destinations/${destinationId}/sections`;
  
  const { data: sections = [], isLoading } = useQuery<ContentSection[]>({
    queryKey: [sectionsUrl],
    enabled: !!destinationId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ sectionId, isVisible }: { sectionId: string; isVisible: boolean }) => {
      return apiRequest(`${sectionsUrl}/${sectionId}`, {
        method: "PATCH",
        body: { isVisible },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [sectionsUrl] });
      toast({
        title: "Section updated",
        description: "Visibility setting saved.",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const defaultSections: ContentSection[] = [
    { id: "featured_attractions", type: "featured_attractions", title: "Top Attractions", isVisible: true, itemCount: 0 },
    { id: "featured_areas", type: "featured_areas", title: "Where to Stay", isVisible: true, itemCount: 0 },
    { id: "featured_highlights", type: "featured_highlights", title: "Visual Highlights", isVisible: true, itemCount: 0 },
  ];

  const displaySections = sections.length > 0 ? sections : defaultSections;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Content Sections</h2>
          <p className="text-muted-foreground">
            Manage the contents blocks that appear on {destination.name}'s public page
          </p>
        </div>
        <Button variant="outline" data-testid="button-add-section">
          <Plus className="w-4 h-4 mr-2" />
          Add Section
        </Button>
      </div>

      <div className="space-y-3">
        {displaySections.map((section) => {
          const config = SECTION_TYPES[section.type] || SECTION_TYPES.custom;
          const Icon = config.icon;
          
          return (
            <Card key={section.id} className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{section.title || config.label}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {section.itemCount} items
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`visible-${section.id}`} className="text-sm text-muted-foreground">
                        {section.isVisible ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Label>
                      <Switch
                        id={`visible-${section.id}`}
                        checked={section.isVisible}
                        onCheckedChange={(checked) => {
                          toggleMutation.mutate({ sectionId: section.id, isVisible: checked });
                        }}
                        disabled={toggleMutation.isPending}
                        data-testid={`switch-section-visible-${section.id}`}
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      data-testid={`button-edit-section-${section.id}`}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Edit
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-1">Add More Content</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Extend {destination.name}'s page with additional contents sections
          </p>
          <Button variant="outline" data-testid="button-browse-section-types">
            Browse Section Types
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

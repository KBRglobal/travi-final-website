import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Image as ImageIcon,
  FileText,
  Search as SearchIcon,
  Eye,
  Settings,
  ExternalLink,
  Train,
} from "lucide-react";

import DestinationHeroTab from "./tabs/destination-hero-tab";
import DestinationSectionsTab from "./tabs/destination-sections-tab";
import DestinationSeoTab from "./tabs/destination-seo-tab";
import DestinationMobilityTab from "./tabs/destination-mobility-tab";

interface DestinationDetail {
  id: string;
  name: string;
  country: string;
  slug: string;
  destinationLevel: string;
  cardImage: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  summary: string | null;
  isActive: boolean;
}

export default function DestinationHubPage() {
  const [, params] = useRoute("/admin/destinations/:slug");
  const { slug = "" } = params ?? {};
  const [activeTab, setActiveTab] = useState("hero");

  const destinationUrl = `/api/admin/destinations/${slug}`;
  
  const { data: destination, isLoading, error } = useQuery<DestinationDetail>({
    queryKey: [destinationUrl],
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !destination) {
    return (
      <div className="space-y-6">
        <Link href="/admin/destinations" data-testid="link-back-destinations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Destinations
          </Button>
        </Link>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Destination not found
          </h2>
          <p className="text-muted-foreground">
            The destination "{slug}" could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/admin/destinations" data-testid="link-back-destinations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground" data-testid="heading-destination-name">
                {destination.name}
              </h1>
              <Badge variant={destination.isActive ? "default" : "secondary"}>
                {destination.isActive ? "Active" : "Draft"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {destination.country} • {destination.destinationLevel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild data-testid="button-preview-destination">
            <a href={`/destinations/${slug}`} target="_blank" rel="noopener noreferrer">
              <Eye className="w-4 h-4 mr-2" />
              Preview
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4" data-testid="tabs-destination">
          <TabsTrigger value="hero" className="gap-2" data-testid="tab-hero">
            <ImageIcon className="w-4 h-4" />
            Hero & Media
          </TabsTrigger>
          <TabsTrigger value="sections" className="gap-2" data-testid="tab-sections">
            <FileText className="w-4 h-4" />
            Content Sections
          </TabsTrigger>
          <TabsTrigger value="mobility" className="gap-2" data-testid="tab-mobility">
            <Train className="w-4 h-4" />
            Mobility
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-2" data-testid="tab-seo">
            <SearchIcon className="w-4 h-4" />
            SEO
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="mt-6">
          <DestinationHeroTab destinationId={slug!} destination={destination} />
        </TabsContent>

        <TabsContent value="sections" className="mt-6">
          <DestinationSectionsTab destinationId={slug!} destination={destination} />
        </TabsContent>

        <TabsContent value="mobility" className="mt-6">
          <DestinationMobilityTab destinationId={slug!} destination={destination} />
        </TabsContent>

        <TabsContent value="seo" className="mt-6">
          <DestinationSeoTab destinationId={slug!} destination={destination} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

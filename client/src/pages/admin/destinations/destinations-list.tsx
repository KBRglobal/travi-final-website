import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListPageLayout, AdminEmptyState, AdminTableSkeleton } from "@/components/admin";
import {
  Search,
  MapPin,
  Globe,
  ChevronRight,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Filter,
  Image,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Destination {
  id: string;
  name: string;
  country: string;
  slug: string;
  destinationLevel: string;
  cardImage: string | null;
  cardImageAlt: string | null;
  heroImage: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  summary: string | null;
  isActive: boolean;
}

function getStatusBadge(destination: Destination) {
  const hasHero = !!destination.heroTitle;
  const hasImage = !!(destination.cardImage || destination.heroImage);
  
  if (hasHero && hasImage) {
    return (
      <Badge variant="default" className="bg-green-600 gap-1" data-testid={`badge-status-complete-${destination.id}`}>
        <CheckCircle2 className="w-3 h-3" />
        Complete
      </Badge>
    );
  } else if (hasHero || hasImage) {
    return (
      <Badge variant="secondary" className="bg-amber-500 text-white gap-1" data-testid={`badge-status-partial-${destination.id}`}>
        <AlertTriangle className="w-3 h-3" />
        Partial
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1" data-testid={`badge-status-empty-${destination.id}`}>
      <XCircle className="w-3 h-3" />
      Empty
    </Badge>
  );
}

export default function DestinationsListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "complete" | "partial" | "empty">("all");
  const [hasImagesFilter, setHasImagesFilter] = useState<"all" | "yes" | "no">("all");

  const { data: destinations = [], isLoading } = useQuery<Destination[]>({
    queryKey: ["/api/admin/destinations"],
  });

  const filteredDestinations = destinations.filter((dest) => {
    const query = searchQuery.toLowerCase().trim();
    // Use startsWith for prefix-based matching (better UX)
    const matchesSearch = !query || 
      dest.name.toLowerCase().startsWith(query) ||
      dest.country.toLowerCase().startsWith(query);
    
    // Status filter
    const hasHero = !!dest.heroTitle;
    const hasImage = !!(dest.cardImage || dest.heroImage);
    const status = hasHero && hasImage ? "complete" : (hasHero || hasImage ? "partial" : "empty");
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    
    // Has images filter
    const matchesImages = hasImagesFilter === "all" || 
      (hasImagesFilter === "yes" && hasImage) ||
      (hasImagesFilter === "no" && !hasImage);
    
    return matchesSearch && matchesStatus && matchesImages;
  });

  const groupedByCountry = filteredDestinations.reduce((acc, dest) => {
    const country = dest.country || "Other";
    if (!acc[country]) acc[country] = [];
    acc[country].push(dest);
    return acc;
  }, {} as Record<string, Destination[]>);

  const renderContent = () => {
    if (isLoading) {
      return <AdminTableSkeleton rows={8} className="p-6" />;
    }

    if (filteredDestinations.length === 0) {
      return (
        <AdminEmptyState
          icon={<MapPin className="w-12 h-12" />}
          title="No destinations found"
          description={
            searchQuery
              ? "Try adjusting your search query"
              : "Add your first destination to get started"
          }
          action={
            !searchQuery && (
              <Link href="/admin/destinations/new">
                <Button data-testid="button-add-destination-empty">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Destination
                </Button>
              </Link>
            )
          }
        />
      );
    }

    return (
      <div className="space-y-8 p-6">
        {Object.entries(groupedByCountry)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([country, dests]) => (
            <div key={country}>
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground" data-testid={`heading-country-${country.toLowerCase().replace(/\s+/g, '-')}`}>
                  {country}
                </h2>
                <Badge variant="secondary" data-testid={`badge-count-${country.toLowerCase().replace(/\s+/g, '-')}`}>{dests.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {dests.map((dest) => (
                  <Link
                    key={dest.id}
                    href={`/admin/destinations/${dest.id}`}
                    data-testid={`link-destination-${dest.id}`}
                  >
                    <Card className="overflow-hidden hover-elevate cursor-pointer h-full" data-testid={`card-destination-${dest.id}`}>
                      <div className="aspect-video relative bg-muted">
                        {(dest.cardImage || dest.heroImage) ? (
                          <img
                            src={dest.cardImage || dest.heroImage || ""}
                            alt={dest.cardImageAlt || dest.name}
                            className="w-full h-full object-cover"
                            data-testid={`img-destination-${dest.id}`}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" data-testid={`placeholder-destination-${dest.id}`}>
                            <MapPin className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          {getStatusBadge(dest)}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate" data-testid={`text-destination-name-${dest.id}`}>
                              {dest.name}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate" data-testid={`text-destination-country-${dest.id}`}>
                              {dest.country}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
      </div>
    );
  };

  return (
    <ListPageLayout
      title="Destinations"
      description="Manage travel destinations"
      actions={
        <Link href="/admin/destinations/new">
          <Button data-testid="button-add-destination">
            <Plus className="w-4 h-4 mr-2" />
            New Destination
          </Button>
        </Link>
      }
      filters={
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search destinations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-destinations"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-32" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-status-option-all">All Status</SelectItem>
                <SelectItem value="complete" data-testid="select-status-option-complete">Complete</SelectItem>
                <SelectItem value="partial" data-testid="select-status-option-partial">Partial</SelectItem>
                <SelectItem value="empty" data-testid="select-status-option-empty">Empty</SelectItem>
              </SelectContent>
            </Select>
            <Select value={hasImagesFilter} onValueChange={(v) => setHasImagesFilter(v as typeof hasImagesFilter)}>
              <SelectTrigger className="w-32" data-testid="select-images-filter">
                <Image className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Images" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-images-option-all">All</SelectItem>
                <SelectItem value="yes" data-testid="select-images-option-yes">Has Image</SelectItem>
                <SelectItem value="no" data-testid="select-images-option-no">No Image</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      }
    >
      {renderContent()}
    </ListPageLayout>
  );
}

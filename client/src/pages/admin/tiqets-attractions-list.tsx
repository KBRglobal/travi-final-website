import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useUrlState } from "@/hooks/use-url-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable, type Column, type Action } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  MapPin,
  Filter,
  X,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit2,
} from "lucide-react";

interface TiqetsAttraction {
  id: string;
  title: string;
  slug: string;
  cityName: string;
  status: "imported" | "ready" | "published";
  contentGenerationStatus?: string;
  qualityScore?: number;
}

interface AttractionsResponse {
  attractions: TiqetsAttraction[];
  total: number | string;
}

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    icon: React.ReactNode;
  }
> = {
  imported: { label: "Imported", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  ready: { label: "Ready", variant: "outline", icon: <CheckCircle2 className="h-3 w-3" /> },
  published: { label: "Published", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
};

const contentStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-muted-foreground" },
  generating: { label: "Generating...", color: "text-blue-600" },
  completed: { label: "AI Ready", color: "text-green-600" },
  failed: { label: "Failed", color: "text-destructive" },
};

export default function TiqetsAttractionsList() {
  const [urlState, setUrlState] = useUrlState({
    search: "",
    status: "all",
    city: "all",
  });

  const searchQuery = urlState.search;
  const statusFilter = urlState.status;
  const cityFilter = urlState.city;

  const setSearchQuery = (value: string) => setUrlState({ search: value });
  const setStatusFilter = (value: string) => setUrlState({ status: value });
  const setCityFilter = (value: string) => setUrlState({ city: value });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery<AttractionsResponse>({
    queryKey: ["/api/admin/tiqets/attractions", { limit: 5000 }],
    queryFn: async () => {
      const res = await fetch("/api/admin/tiqets/attractions?limit=5000");
      if (!res.ok) throw new Error("Failed to fetch attractions");
      return res.json();
    },
  });

  const attractions = data?.attractions ?? [];
  const total =
    typeof data?.total === "string" ? Number.parseInt(data.total, 10) : (data?.total ?? 0);

  const cities = useMemo(() => {
    const uniqueCities = [...new Set(attractions.map(a => a.cityName))].sort();
    return uniqueCities;
  }, [attractions]);

  const filteredAttractions = useMemo(() => {
    return attractions.filter(attraction => {
      const matchesSearch =
        !searchQuery ||
        attraction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attraction.cityName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || attraction.status === statusFilter;
      const matchesCity = cityFilter === "all" || attraction.cityName === cityFilter;

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [attractions, searchQuery, statusFilter, cityFilter]);

  const hasActiveFilters = searchQuery || statusFilter !== "all" || cityFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCityFilter("all");
  };

  const columns: Column<TiqetsAttraction>[] = [
    {
      key: "title",
      header: "Attraction",
      cell: attraction => (
        <div className="flex flex-col gap-1">
          <Link
            href={`/admin/attractions/${attraction.id}`}
            className="font-medium hover:underline text-foreground line-clamp-2"
            data-testid={`link-attraction-${attraction.id}`}
          >
            {attraction.title}
          </Link>
          <span className="text-xs text-muted-foreground">{attraction.slug}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: "cityName",
      header: "City",
      cell: attraction => (
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{attraction.cityName}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: "status",
      header: "Status",
      cell: attraction => {
        const config = statusConfig[attraction.status] || statusConfig.imported;
        return (
          <Badge variant={config.variant} className="gap-1">
            {config.icon}
            {config.label}
          </Badge>
        );
      },
      sortable: true,
    },
    {
      key: "contentGenerationStatus",
      header: "AI Content",
      cell: attraction => {
        const status = attraction.contentGenerationStatus || "pending";
        const config = contentStatusConfig[status] || contentStatusConfig.pending;
        return (
          <div className="flex items-center gap-1.5">
            <Sparkles className={`h-3.5 w-3.5 ${config.color}`} />
            <span className={`text-sm ${config.color}`}>{config.label}</span>
          </div>
        );
      },
    },
  ];

  const actions: Action<TiqetsAttraction>[] = [
    {
      label: "Edit",
      icon: <Edit2 className="h-4 w-4" />,
      onClick: attraction => {
        globalThis.location.href = `/admin/attractions/${attraction.id}`;
      },
    },
    {
      label: "View on Site",
      icon: <ExternalLink className="h-4 w-4" />,
      onClick: attraction => {
        globalThis.open(
          `/attractions/${attraction.cityName.toLowerCase()}/${attraction.slug}`,
          "_blank"
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Attractions
          </h1>
          <p className="text-muted-foreground mt-1">
            {total.toLocaleString()} attractions from Tiqets
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search attractions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-attractions"
              />
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="imported">Imported</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>

              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-city-filter">
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearFilters}
                  data-testid="button-clear-filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredAttractions.length === 0 ? (
            <EmptyState
              title="No attractions found"
              description={
                hasActiveFilters
                  ? "Try adjusting your filters to see more results."
                  : "No attractions have been imported yet."
              }
              icon={<AlertCircle className="h-12 w-12 text-muted-foreground" />}
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <DataTable
              data={filteredAttractions}
              columns={columns}
              actions={actions}
              selectable
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              getItemId={row => row.id}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

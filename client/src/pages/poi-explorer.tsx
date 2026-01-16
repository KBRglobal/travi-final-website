import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Search,
  Building2,
  UtensilsCrossed,
  Landmark,
  Star,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface POI {
  id: number;
  externalId: string;
  source: string;
  name: string;
  category: string;
  subCategory: string | null;
  city: string;
  address: string | null;
  lat: string;
  lng: string;
  polarity: number | null;
}

interface FilterOption {
  city?: string;
  count?: number;
  category?: string;
}

const CATEGORY_ICONS: Record<string, typeof MapPin> = {
  accommodation: Building2,
  restaurant: UtensilsCrossed,
  poi: Landmark,
  attraction: Landmark,
};

const CATEGORY_COLORS: Record<string, string> = {
  accommodation: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  restaurant: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  poi: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  attraction: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

export default function POIExplorer() {
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState(0);
  const limit = 24;

  const { data: cities, isLoading: citiesLoading } = useQuery<{ success: boolean; data: FilterOption[] }>({
    queryKey: ["/api/external/pois/cities"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<{ success: boolean; data: FilterOption[] }>({
    queryKey: ["/api/external/pois/categories"],
  });

  const { data: pois, isLoading: poisLoading } = useQuery<{ 
    success: boolean; 
    data: POI[]; 
    total: number 
  }>({
    queryKey: ["/api/external/pois", { city: selectedCity, category: selectedCategory, search: searchQuery, limit, offset: page * limit }],
  });

  const totalPOIs = pois?.total || 0;
  const totalPages = Math.ceil(totalPOIs / limit);

  const getCategoryIcon = (category: string) => {
    const Icon = CATEGORY_ICONS[category] || MapPin;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            POI Explorer
          </h1>
          <p className="text-muted-foreground">
            Browse {totalPOIs.toLocaleString()} points of interest from 8 major cities
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        
        <Select 
          value={selectedCity} 
          onValueChange={(value) => {
            setSelectedCity(value);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full md:w-48" data-testid="select-city">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities?.data?.map((city) => (
              <SelectItem key={city.city} value={city.city || ""}>
                {city.city} ({city.count?.toLocaleString()})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={selectedCategory} 
          onValueChange={(value) => {
            setSelectedCategory(value);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full md:w-48" data-testid="select-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.data?.map((cat) => (
              <SelectItem key={cat.category} value={cat.category || ""}>
                {cat.category} ({cat.count?.toLocaleString()})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {citiesLoading || categoriesLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Total POIs</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-pois">
                {totalPOIs.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Cities</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-cities-count">
                {cities?.data?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Hotels</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-hotels-count">
                {categories?.data?.find((c) => c.category === "accommodation")?.count?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Restaurants</CardTitle>
              <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-restaurants-count">
                {categories?.data?.find((c) => c.category === "restaurant")?.count?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {poisLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-pois" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pois?.data?.map((poi) => (
              <Card key={poi.id} className="hover-elevate overflow-visible" data-testid={`card-poi-${poi.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-medium line-clamp-2">
                      {poi.name}
                    </CardTitle>
                    {poi.polarity !== null && poi.polarity > 0 && (
                      <Badge variant="outline" className="shrink-0">
                        <Star className="h-3 w-3 mr-1" />
                        {poi.polarity.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={CATEGORY_COLORS[poi.category] || "bg-gray-100 text-gray-700"}>
                      {getCategoryIcon(poi.category)}
                      <span className="ml-1 capitalize">{poi.category}</span>
                    </Badge>
                    <Badge variant="secondary">
                      <MapPin className="h-3 w-3 mr-1" />
                      {poi.city}
                    </Badge>
                  </div>
                  
                  {poi.subCategory && (
                    <p className="text-sm text-muted-foreground">
                      {poi.subCategory}
                    </p>
                  )}
                  
                  {poi.address && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {poi.address}
                    </p>
                  )}

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <a
                        href={`https://www.google.com/maps?q=${poi.lat},${poi.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`link-map-${poi.id}`}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Map
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                data-testid="button-prev-page"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                data-testid="button-next-page"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

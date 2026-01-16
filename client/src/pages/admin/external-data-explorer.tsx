import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Database,
  MapPin,
  Calendar,
  Globe,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Building,
  Utensils,
  Landmark,
  Hotel,
} from "lucide-react";

interface StatsData {
  countries: number;
  states: number;
  pois: number;
  holidays: number;
}

interface POI {
  id: number;
  name: string;
  category: string;
  city: string;
  address: string | null;
  lat: number | null;
  lon: number | null;
}

interface Holiday {
  id: number;
  date: string;
  name: string;
  localName: string | null;
  countryCode: string;
  types: string[] | null;
}

interface Country {
  id: number;
  name: string;
  iso2: string;
  iso3: string | null;
  region: string | null;
  subregion: string | null;
  capital: string | null;
  currency: string | null;
  currencySymbol: string | null;
}

interface State {
  id: number;
  name: string;
  stateCode: string | null;
  countryCode: string;
}

interface CityOption {
  city: string;
  count: number;
}

interface CategoryOption {
  category: string;
  count: number;
}

interface HolidayCountryOption {
  countryCode: string;
  name: string;
  count: number;
}

interface RegionOption {
  region: string;
  count: number;
}

const getCategoryIcon = (category: string) => {
  switch (category?.toLowerCase()) {
    case "accommodation":
      return <Hotel className="h-4 w-4" />;
    case "restaurant":
      return <Utensils className="h-4 w-4" />;
    case "attraction":
      return <Landmark className="h-4 w-4" />;
    default:
      return <Building className="h-4 w-4" />;
  }
};

export default function ExternalDataExplorer() {
  const [activeTab, setActiveTab] = useState("pois");

  const { data: stats, isLoading: statsLoading } = useQuery<{ success: boolean; data: StatsData }>({
    queryKey: ["/api/external/stats"],
  });

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const statsData = stats?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-page-title">
          <Database className="h-8 w-8 text-primary" />
          External Data Explorer
        </h1>
        <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
          Update 9987 - Browse 180M+ travel data points
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Total Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stats-countries">
              {statsData?.countries?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Total States
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stats-states">
              {statsData?.states?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building className="h-4 w-4" />
              Total POIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stats-pois">
              {statsData?.pois?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Holidays
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stats-holidays">
              {statsData?.holidays?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pois" className="gap-2" data-testid="tab-pois">
            <Building className="h-4 w-4" />
            POI Explorer
          </TabsTrigger>
          <TabsTrigger value="holidays" className="gap-2" data-testid="tab-holidays">
            <Calendar className="h-4 w-4" />
            Holidays
          </TabsTrigger>
          <TabsTrigger value="destinations" className="gap-2" data-testid="tab-destinations">
            <Globe className="h-4 w-4" />
            Destinations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pois">
          <POIExplorerTab />
        </TabsContent>

        <TabsContent value="holidays">
          <HolidaysTab />
        </TabsContent>

        <TabsContent value="destinations">
          <DestinationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function POIExplorerTab() {
  const [city, setCity] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data: cities } = useQuery<{ success: boolean; data: CityOption[] }>({
    queryKey: ["/api/external/pois/cities"],
  });

  const { data: categories } = useQuery<{ success: boolean; data: CategoryOption[] }>({
    queryKey: ["/api/external/pois/categories"],
  });

  const { data: poisData, isLoading } = useQuery<{
    success: boolean;
    data: POI[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["/api/external/pois", { city, category, search, limit, offset }],
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    setOffset(0);
  };

  const handleCityChange = (value: string) => {
    setCity(value);
    setOffset(0);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setOffset(0);
  };

  const totalPages = Math.ceil((poisData?.total || 0) / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          POI Explorer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Select value={city} onValueChange={handleCityChange}>
            <SelectTrigger className="w-48" data-testid="select-city">
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities?.data?.map((c) => (
                <SelectItem key={c.city} value={c.city}>
                  {c.city} ({c.count.toLocaleString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-48" data-testid="select-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.data?.map((c) => (
                <SelectItem key={c.category} value={c.category}>
                  {c.category} ({c.count.toLocaleString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search POIs..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-pois"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poisData?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No POIs found
                    </TableCell>
                  </TableRow>
                ) : (
                  poisData?.data?.map((poi) => (
                    <TableRow key={poi.id} data-testid={`row-poi-${poi.id}`}>
                      <TableCell className="font-medium">{poi.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          {getCategoryIcon(poi.category)}
                          {poi.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{poi.city}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {poi.address || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground" data-testid="text-pois-count">
                Showing {poisData?.data?.length || 0} of {poisData?.total?.toLocaleString() || 0} POIs
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground" data-testid="text-page-info">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= (poisData?.total || 0)}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function HolidaysTab() {
  const [country, setCountry] = useState("all");
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const { data: countries } = useQuery<{ success: boolean; data: HolidayCountryOption[] }>({
    queryKey: ["/api/external/holidays/countries"],
  });

  const { data: holidaysData, isLoading } = useQuery<{ success: boolean; data: Holiday[] }>({
    queryKey: ["/api/external/holidays", { country, year }],
  });

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Public Holidays
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-64" data-testid="select-country">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries?.data?.map((c) => (
                <SelectItem key={c.countryCode} value={c.countryCode}>
                  {c.name} ({c.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32" data-testid="select-year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : holidaysData?.data?.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No holidays found for the selected filters
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {holidaysData?.data?.map((holiday) => (
              <Card key={holiday.id} className="hover-elevate" data-testid={`card-holiday-${holiday.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium">{holiday.name}</p>
                      {holiday.localName && holiday.localName !== holiday.name && (
                        <p className="text-sm text-muted-foreground">{holiday.localName}</p>
                      )}
                    </div>
                    <Badge variant="outline">{holiday.countryCode}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDate(holiday.date)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground" data-testid="text-holidays-count">
          {holidaysData?.data?.length || 0} holidays found
        </p>
      </CardContent>
    </Card>
  );
}

function DestinationsTab() {
  const [region, setRegion] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const limit = 50;

  const { data: regions } = useQuery<{ success: boolean; data: RegionOption[] }>({
    queryKey: ["/api/external/destinations/regions"],
  });

  const { data: countriesData, isLoading } = useQuery<{
    success: boolean;
    data: Country[];
    total: number;
  }>({
    queryKey: ["/api/external/destinations/countries", { region, search, limit, offset }],
  });

  const { data: statesData, isLoading: statesLoading } = useQuery<{
    success: boolean;
    data: { country: Country; states: State[] };
  }>({
    queryKey: ["/api/external/destinations/countries", expandedCountry],
    enabled: !!expandedCountry,
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    setOffset(0);
  };

  const handleRegionChange = (value: string) => {
    setRegion(value === "all" ? "" : value);
    setOffset(0);
  };

  const toggleCountry = (code: string) => {
    setExpandedCountry(expandedCountry === code ? null : code);
  };

  const totalPages = Math.ceil((countriesData?.total || 0) / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Countries & States
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Select value={region || "all"} onValueChange={handleRegionChange}>
            <SelectTrigger className="w-48" data-testid="select-region">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions?.data?.map((r) => (
                <SelectItem key={r.region} value={r.region}>
                  {r.region} ({r.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search countries..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-countries"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>ISO2</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Capital</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countriesData?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No countries found
                    </TableCell>
                  </TableRow>
                ) : (
                  countriesData?.data?.map((country) => (
                    <Collapsible
                      key={country.id}
                      open={expandedCountry === country.iso2}
                      onOpenChange={() => toggleCountry(country.iso2)}
                      asChild
                    >
                      <>
                        <TableRow data-testid={`row-country-${country.iso2}`}>
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                data-testid={`button-expand-${country.iso2}`}
                              >
                                {expandedCountry === country.iso2 ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell className="font-medium">{country.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{country.iso2}</Badge>
                          </TableCell>
                          <TableCell>{country.region || "-"}</TableCell>
                          <TableCell>{country.capital || "-"}</TableCell>
                          <TableCell>
                            {country.currency ? (
                              <span>
                                {country.currencySymbol} {country.currency}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={6} className="p-4">
                              {statesLoading ? (
                                <Skeleton className="h-20 w-full" />
                              ) : statesData?.data?.states?.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No states/provinces available for this country
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">
                                    States/Provinces ({statesData?.data?.states?.length || 0})
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {statesData?.data?.states?.map((state) => (
                                      <Badge
                                        key={state.id}
                                        variant="secondary"
                                        data-testid={`badge-state-${state.id}`}
                                      >
                                        {state.name}
                                        {state.stateCode && (
                                          <span className="text-muted-foreground ml-1">
                                            ({state.stateCode})
                                          </span>
                                        )}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground" data-testid="text-countries-count">
                Showing {countriesData?.data?.length || 0} of {countriesData?.total?.toLocaleString() || 0} countries
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  data-testid="button-countries-prev"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground" data-testid="text-countries-page">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= (countriesData?.total || 0)}
                  data-testid="button-countries-next"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

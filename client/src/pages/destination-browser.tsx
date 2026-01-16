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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Globe,
  Search,
  MapPin,
  Building2,
  Phone,
  DollarSign,
  Clock,
  Flag,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface Country {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
  phonecode: string;
  capital: string;
  currency: string;
  currencyName: string;
  currencySymbol: string;
  native: string;
  region: string;
  subregion: string;
  timezones: string;
  emoji: string;
  latitude: string;
  longitude: string;
}

interface State {
  id: number;
  name: string;
  stateCode: string;
  countryCode: string;
  latitude: string;
  longitude: string;
}

interface RegionOption {
  region: string;
  count: number;
}

export default function DestinationBrowser() {
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [page, setPage] = useState(0);
  const limit = 24;

  const { data: regions, isLoading: regionsLoading } = useQuery<{
    success: boolean;
    data: RegionOption[];
  }>({
    queryKey: ["/api/external/destinations/regions"],
  });

  const { data: countries, isLoading: countriesLoading } = useQuery<{
    success: boolean;
    data: Country[];
    total: number;
  }>({
    queryKey: ["/api/external/destinations/countries", { 
      region: selectedRegion !== "all" ? selectedRegion : undefined, 
      search: searchQuery || undefined,
      limit,
      offset: page * limit,
    }],
  });

  const { data: countryDetails, isLoading: detailsLoading } = useQuery<{
    success: boolean;
    data: { country: Country; states: State[] };
  }>({
    queryKey: ["/api/external/destinations/countries", selectedCountry?.iso2],
    enabled: !!selectedCountry,
  });

  const totalCountries = countries?.total || 0;
  const totalPages = Math.ceil(totalCountries / limit);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Destination Browser
          </h1>
          <p className="text-muted-foreground">
            Explore {totalCountries} countries and their regions
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search countries..."
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
          value={selectedRegion}
          onValueChange={(value) => {
            setSelectedRegion(value);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full md:w-48" data-testid="select-region">
            <SelectValue placeholder="All Regions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {regions?.data?.map((region) => (
              <SelectItem key={region.region} value={region.region}>
                {region.region} ({region.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {regionsLoading ? (
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
              <CardTitle className="text-sm font-medium">Countries</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-countries-total">
                {totalCountries}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Regions</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-regions-count">
                {regions?.data?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Europe</CardTitle>
              <Flag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-europe-count">
                {regions?.data?.find((r) => r.region === "Europe")?.count || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Asia</CardTitle>
              <Flag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-asia-count">
                {regions?.data?.find((r) => r.region === "Asia")?.count || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {countriesLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-countries" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {countries?.data?.map((country) => (
              <Card
                key={country.id}
                className="hover-elevate cursor-pointer overflow-visible"
                onClick={() => setSelectedCountry(country)}
                data-testid={`card-country-${country.iso2}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{country.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-medium truncate">
                        {country.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {country.native !== country.name ? country.native : country.iso3}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      <Building2 className="h-3 w-3 mr-1" />
                      {country.capital || "N/A"}
                    </Badge>
                    <Badge variant="outline">
                      {country.region}
                    </Badge>
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

      <Dialog open={!!selectedCountry} onOpenChange={() => setSelectedCountry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          {selectedCountry && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="text-4xl">{selectedCountry.emoji}</span>
                  <div>
                    <div>{selectedCountry.name}</div>
                    {selectedCountry.native !== selectedCountry.name && (
                      <div className="text-sm font-normal text-muted-foreground">
                        {selectedCountry.native}
                      </div>
                    )}
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Capital:</span>
                    <span className="font-medium">{selectedCountry.capital || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Phone:</span>
                    <span className="font-medium">+{selectedCountry.phonecode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Currency:</span>
                    <span className="font-medium">
                      {selectedCountry.currencySymbol} {selectedCountry.currency}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Region:</span>
                    <span className="font-medium">{selectedCountry.region}</span>
                  </div>
                </div>

                {selectedCountry.subregion && (
                  <Badge variant="secondary" className="w-fit">
                    {selectedCountry.subregion}
                  </Badge>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    States/Regions
                    {countryDetails?.data?.states && (
                      <Badge variant="secondary">
                        {countryDetails.data.states.length}
                      </Badge>
                    )}
                  </h4>

                  {detailsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : countryDetails?.data?.states.length ? (
                    <ScrollArea className="h-[200px]">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {countryDetails.data.states.map((state) => (
                          <Badge
                            key={state.id}
                            variant="outline"
                            className="justify-start"
                            data-testid={`badge-state-${state.id}`}
                          >
                            {state.name}
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No states/regions available
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

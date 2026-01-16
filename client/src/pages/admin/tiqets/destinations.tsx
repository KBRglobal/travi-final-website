import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Globe,
  Search,
  Check,
  X,
  MapPin,
  RefreshCw,
  Loader2,
  Sparkles,
  FileText,
} from "lucide-react";

interface TiqetsCity {
  id: string;
  name: string;
  countryName: string | null;
  tiqetsCityId: string | null;
  isActive: boolean;
  attractionCount: number;
  lastSyncedAt: string | null;
}

interface TiqetsCitiesResponse {
  cities: TiqetsCity[];
}

interface CitySearchResult {
  city_id: string;
  name: string;
  country_name: string;
  attraction_count: number;
}

interface GenerationProgress {
  total: number;
  processed: number;
  errors: number;
  currentItem?: string;
  isComplete: boolean;
}

export default function TiqetsDestinations() {
  const { toast } = useToast();
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<TiqetsCity | null>(null);
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generatingCity, setGeneratingCity] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    total: 0,
    processed: 0,
    errors: 0,
    isComplete: false,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data, isLoading } = useQuery<TiqetsCitiesResponse>({
    queryKey: ["/api/admin/tiqets/cities"],
  });

  const updateCityMutation = useMutation({
    mutationFn: async (params: { cityId: string; tiqetsCityId: string; countryName: string; attractionCount: number }) => {
      return apiRequest("PATCH", `/api/admin/tiqets/cities/${params.cityId}`, {
        tiqetsCityId: params.tiqetsCityId,
        countryName: params.countryName,
        attractionCount: params.attractionCount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tiqets/cities"] });
      toast({ title: "City Updated", description: "Tiqets ID has been linked successfully." });
      setSearchDialogOpen(false);
      setSelectedCity(null);
      setSearchResults([]);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update city.", variant: "destructive" });
    },
  });

  const toggleCityMutation = useMutation({
    mutationFn: async (params: { cityId: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/admin/tiqets/cities/${params.cityId}`, {
        isActive: params.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tiqets/cities"] });
    },
  });

  const handleFindId = async (city: TiqetsCity) => {
    setSelectedCity(city);
    setSearchDialogOpen(true);
    setIsSearching(true);
    setSearchResults([]);

    try {
      const response = await apiRequest("GET", `/api/admin/tiqets/search-city?name=${encodeURIComponent(city.name)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      toast({ title: "Search Failed", description: "Could not search Tiqets API.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: CitySearchResult) => {
    if (!selectedCity) return;
    
    updateCityMutation.mutate({
      cityId: selectedCity.id,
      tiqetsCityId: result.city_id,
      countryName: result.country_name,
      attractionCount: result.attraction_count,
    });
  };

  const handleGenerateContent = async (cityName: string) => {
    setGeneratingCity(cityName);
    setGenerateDialogOpen(true);
    setGenerationProgress({ total: 0, processed: 0, errors: 0, isComplete: false });
    
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch("/api/admin/tiqets/generate-city-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityName }),
        credentials: "include",
        signal: abortControllerRef.current.signal,
      });

      if (!response.body) {
        throw new Error("No response stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              
              if (event.type === "started") {
                setGenerationProgress(prev => ({ ...prev, total: event.total }));
              } else if (event.type === "progress") {
                setGenerationProgress(prev => ({
                  ...prev,
                  processed: event.processed,
                  errors: event.errors,
                  currentItem: event.title,
                }));
              } else if (event.type === "complete") {
                setGenerationProgress(prev => ({
                  ...prev,
                  processed: event.processed,
                  errors: event.errors,
                  isComplete: true,
                }));
                queryClient.invalidateQueries({ queryKey: ["/api/admin/tiqets/cities"] });
              } else if (event.type === "error") {
                toast({
                  title: "Generation Error",
                  description: event.message,
                  variant: "destructive",
                });
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast({
          title: "Generation Failed",
          description: error.message || "Failed to generate content",
          variant: "destructive",
        });
        setGenerationProgress(prev => ({ ...prev, isComplete: true }));
      }
    }
  };

  const handleCancelGeneration = () => {
    abortControllerRef.current?.abort();
    setGenerateDialogOpen(false);
    setGeneratingCity(null);
  };

  const cities = data?.cities || [];
  const configuredCount = cities.filter(c => c.tiqetsCityId).length;
  const activeCount = cities.filter(c => c.isActive).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Destinations</h1>
          <p className="text-muted-foreground">Manage target cities for Tiqets attraction import</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Cities</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-cities">{cities.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Configured</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-configured-cities">{configuredCount}</div>
            <p className="text-xs text-muted-foreground">With Tiqets ID</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-cities">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Ready for import</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Target Cities</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Tiqets ID</TableHead>
                  <TableHead>Attractions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cities.map((city) => (
                  <TableRow key={city.id} data-testid={`row-city-${city.name.toLowerCase().replace(/\s+/g, "-")}`}>
                    <TableCell className="font-medium">{city.name}</TableCell>
                    <TableCell>{city.countryName || "-"}</TableCell>
                    <TableCell>
                      {city.tiqetsCityId ? (
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{city.tiqetsCityId}</code>
                      ) : (
                        <span className="text-muted-foreground">Not configured</span>
                      )}
                    </TableCell>
                    <TableCell>{city.attractionCount}</TableCell>
                    <TableCell>
                      <Badge variant={city.isActive ? "default" : "secondary"}>
                        {city.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFindId(city)}
                          data-testid={`button-find-id-${city.name.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <Search className="h-4 w-4 mr-1" />
                          Find ID
                        </Button>
                        {city.attractionCount > 0 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleGenerateContent(city.name)}
                            disabled={generatingCity !== null}
                            data-testid={`button-generate-${city.name.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            <Sparkles className="h-4 w-4 mr-1" />
                            Generate AI
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={city.isActive ? "ghost" : "outline"}
                          onClick={() => toggleCityMutation.mutate({ cityId: city.id, isActive: !city.isActive })}
                          data-testid={`button-toggle-${city.name.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {city.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Find Tiqets City ID</DialogTitle>
            <DialogDescription>
              Search results for "{selectedCity?.name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Searching Tiqets API...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={result.city_id}
                    className="flex items-center justify-between p-3 border rounded-md hover-elevate cursor-pointer"
                    onClick={() => handleSelectResult(result)}
                    data-testid={`search-result-${result.city_id}`}
                  >
                    <div>
                      <p className="font-medium">{result.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {result.country_name} - {result.attraction_count} attractions
                      </p>
                    </div>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{result.city_id}</code>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No results found. Try searching manually on Tiqets.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSearchDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={generateDialogOpen} onOpenChange={(open) => !open && handleCancelGeneration()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Content Generation
            </DialogTitle>
            <DialogDescription>
              Generating SEO/AEO content for {generatingCity} attractions
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="text-muted-foreground">
                  {generationProgress.processed} / {generationProgress.total}
                </span>
              </div>
              <Progress 
                value={generationProgress.total > 0 
                  ? (generationProgress.processed / generationProgress.total) * 100 
                  : 0
                } 
                className="h-2"
              />
            </div>
            
            {generationProgress.currentItem && !generationProgress.isComplete && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="truncate">Processing: {generationProgress.currentItem}</span>
              </div>
            )}
            
            {generationProgress.isComplete && (
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600" />
                <span>
                  Complete: {generationProgress.processed - generationProgress.errors} succeeded
                  {generationProgress.errors > 0 && (
                    <span className="text-destructive ml-1">
                      ({generationProgress.errors} failed)
                    </span>
                  )}
                </span>
              </div>
            )}
            
            {generationProgress.total === 0 && !generationProgress.isComplete && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading attractions...</span>
              </div>
            )}
          </div>

          <DialogFooter>
            {generationProgress.isComplete ? (
              <Button onClick={() => { setGenerateDialogOpen(false); setGeneratingCity(null); }}>
                Done
              </Button>
            ) : (
              <Button variant="outline" onClick={handleCancelGeneration}>
                Cancel
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

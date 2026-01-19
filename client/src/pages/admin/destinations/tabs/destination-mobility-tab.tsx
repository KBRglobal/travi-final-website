import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Train,
  Save,
  Loader2,
  Plus,
  Trash2,
  Bus,
  Car,
  Plane,
  Bike,
  Footprints,
  Link as LinkIcon,
  Calendar,
} from "lucide-react";

interface MobilitySource {
  name: string;
  url: string;
  accessedAt: string;
}

interface TransportMode {
  type: string;
  name: string;
  notes?: string;
}

interface PaymentInfo {
  cardName?: string;
  contactless: boolean;
  notes?: string;
}

interface Airport {
  code?: string;
  name: string;
  bestDefault: string;
  alternatives?: string[];
  notes?: string;
}

interface MobilityData {
  publicTransport?: {
    overview: string;
    keyModes: TransportMode[];
    payment?: PaymentInfo;
    officialApps?: string[];
    operationalTips?: string[];
  };
  taxisRideHailing?: {
    primaryApps: string[];
    officialTaxiInfo?: string;
    commonRules?: string[];
  };
  airportTransfers?: {
    airports: Airport[];
  };
  micromobility?: {
    bikeShare?: { name: string; app?: string; notes?: string };
    scooters?: { available: boolean; notes?: string };
  };
  drivingParking?: {
    rentCarRecommended: boolean;
    recommendedWhen?: string;
    tolling?: { systemName: string; rentalBilling?: string };
    parkingNotes?: string;
  };
  walkability?: {
    summary: string;
    bestWalkAreas?: string[];
    cautions?: string[];
  };
  sources: MobilitySource[];
}

interface MobilityApiResponse {
  destinationId: string;
  exists: boolean;
  data: MobilityData | null;
  isActive?: boolean;
  version?: number;
  updatedAt?: string;
  createdAt?: string;
}

interface DestinationMobilityTabProps {
  destinationId: string;
  destination: {
    id: string;
    name: string;
  };
}

const emptyMobilityData: MobilityData = {
  publicTransport: {
    overview: "",
    keyModes: [],
    payment: { contactless: false },
    officialApps: [],
    operationalTips: [],
  },
  taxisRideHailing: {
    primaryApps: [],
    commonRules: [],
  },
  airportTransfers: {
    airports: [],
  },
  micromobility: {
    bikeShare: { name: "", notes: "" },
    scooters: { available: false, notes: "" },
  },
  drivingParking: {
    rentCarRecommended: false,
    parkingNotes: "",
  },
  walkability: {
    summary: "",
    bestWalkAreas: [],
    cautions: [],
  },
  sources: [],
};

export default function DestinationMobilityTab({ destinationId, destination }: DestinationMobilityTabProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<MobilityData>(emptyMobilityData);

  const { data: mobilityResponse, isLoading } = useQuery<MobilityApiResponse>({
    queryKey: [`/api/admin/destinations/${destinationId}/mobility`],
    enabled: !!destinationId,
  });

  useEffect(() => {
    if (mobilityResponse?.data) {
      setFormData({
        ...emptyMobilityData,
        ...mobilityResponse.data,
      });
    }
  }, [mobilityResponse]);

  const saveMutation = useMutation({
    mutationFn: async (data: MobilityData) => {
      return apiRequest(`/api/admin/destinations/${destinationId}/mobility`, {
        method: "PUT",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/destinations/${destinationId}/mobility`] });
      queryClient.invalidateQueries({ queryKey: [`/api/public/destinations/${destinationId}/mobility`] });
      toast({
        title: "Mobility data saved",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save mobility data.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const addTransportMode = () => {
    setFormData(prev => ({
      ...prev,
      publicTransport: {
        ...prev.publicTransport!,
        keyModes: [...(prev.publicTransport?.keyModes || []), { type: "", name: "" }],
      },
    }));
  };

  const removeTransportMode = (index: number) => {
    setFormData(prev => ({
      ...prev,
      publicTransport: {
        ...prev.publicTransport!,
        keyModes: prev.publicTransport?.keyModes.filter((_, i) => i !== index) || [],
      },
    }));
  };

  const addAirport = () => {
    setFormData(prev => ({
      ...prev,
      airportTransfers: {
        airports: [...(prev.airportTransfers?.airports || []), { name: "", bestDefault: "" }],
      },
    }));
  };

  const removeAirport = (index: number) => {
    setFormData(prev => ({
      ...prev,
      airportTransfers: {
        airports: prev.airportTransfers?.airports.filter((_, i) => i !== index) || [],
      },
    }));
  };

  const addSource = () => {
    setFormData(prev => ({
      ...prev,
      sources: [...(prev.sources || []), { name: "", url: "", accessedAt: new Date().toISOString().split('T')[0] }],
    }));
  };

  const removeSource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sources: prev.sources.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Train className="w-5 h-5" />
            Mobility & Transport for {destination.name}
          </h2>
          {mobilityResponse?.updatedAt && (
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: {new Date(mobilityResponse.updatedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-mobility">
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={["public-transport", "sources"]} className="space-y-4">
        <AccordionItem value="public-transport" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-public-transport">
            <div className="flex items-center gap-2">
              <Train className="w-4 h-4" />
              Public Transport
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Overview</Label>
              <Textarea
                value={formData.publicTransport?.overview || ""}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  publicTransport: { ...prev.publicTransport!, overview: e.target.value }
                }))}
                placeholder="Describe the public transport system..."
                rows={3}
                data-testid="input-transport-overview"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Transport Modes</Label>
                <Button size="sm" variant="outline" onClick={addTransportMode} data-testid="button-add-transport-mode">
                  <Plus className="w-3 h-3 mr-1" /> Add Mode
                </Button>
              </div>
              {formData.publicTransport?.keyModes.map((mode, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start">
                  <Input
                    className="col-span-3"
                    placeholder="Type (metro, bus...)"
                    value={mode.type}
                    onChange={(e) => {
                      const modes = [...(formData.publicTransport?.keyModes || [])];
                      modes[index] = { ...modes[index], type: e.target.value };
                      setFormData(prev => ({
                        ...prev,
                        publicTransport: { ...prev.publicTransport!, keyModes: modes }
                      }));
                    }}
                  />
                  <Input
                    className="col-span-4"
                    placeholder="Name"
                    value={mode.name}
                    onChange={(e) => {
                      const modes = [...(formData.publicTransport?.keyModes || [])];
                      modes[index] = { ...modes[index], name: e.target.value };
                      setFormData(prev => ({
                        ...prev,
                        publicTransport: { ...prev.publicTransport!, keyModes: modes }
                      }));
                    }}
                  />
                  <Input
                    className="col-span-4"
                    placeholder="Notes"
                    value={mode.notes || ""}
                    onChange={(e) => {
                      const modes = [...(formData.publicTransport?.keyModes || [])];
                      modes[index] = { ...modes[index], notes: e.target.value };
                      setFormData(prev => ({
                        ...prev,
                        publicTransport: { ...prev.publicTransport!, keyModes: modes }
                      }));
                    }}
                  />
                  <Button size="icon" variant="ghost" onClick={() => removeTransportMode(index)} className="col-span-1">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Transit Card Name</Label>
                <Input
                  value={formData.publicTransport?.payment?.cardName || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    publicTransport: {
                      ...prev.publicTransport!,
                      payment: { ...prev.publicTransport?.payment!, cardName: e.target.value }
                    }
                  }))}
                  placeholder="e.g., Oyster Card, Navigo"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={formData.publicTransport?.payment?.contactless || false}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    publicTransport: {
                      ...prev.publicTransport!,
                      payment: { ...prev.publicTransport?.payment!, contactless: checked }
                    }
                  }))}
                />
                <Label>Contactless payments accepted</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Official Apps (comma-separated)</Label>
              <Input
                value={(formData.publicTransport?.officialApps || []).join(", ")}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  publicTransport: {
                    ...prev.publicTransport!,
                    officialApps: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                  }
                }))}
                placeholder="e.g., TfL Go, Citymapper"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="taxis" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-taxis">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4" />
              Taxis & Ride-Hailing
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Primary Apps (comma-separated)</Label>
              <Input
                value={(formData.taxisRideHailing?.primaryApps || []).join(", ")}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  taxisRideHailing: {
                    ...prev.taxisRideHailing!,
                    primaryApps: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                  }
                }))}
                placeholder="e.g., Uber, Bolt, Careem"
                data-testid="input-ride-apps"
              />
            </div>
            <div className="space-y-2">
              <Label>Official Taxi Info</Label>
              <Textarea
                value={formData.taxisRideHailing?.officialTaxiInfo || ""}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  taxisRideHailing: { ...prev.taxisRideHailing!, officialTaxiInfo: e.target.value }
                }))}
                placeholder="Info about official taxis..."
                rows={2}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="airports" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-airports">
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4" />
              Airport Transfers
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <Label>Airports</Label>
              <Button size="sm" variant="outline" onClick={addAirport} data-testid="button-add-airport">
                <Plus className="w-3 h-3 mr-1" /> Add Airport
              </Button>
            </div>
            {formData.airportTransfers?.airports.map((airport, index) => (
              <Card key={index} className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input
                      value={airport.code || ""}
                      onChange={(e) => {
                        const airports = [...(formData.airportTransfers?.airports || [])];
                        airports[index] = { ...airports[index], code: e.target.value };
                        setFormData(prev => ({
                          ...prev,
                          airportTransfers: { airports }
                        }));
                      }}
                      placeholder="e.g., LHR"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={airport.name}
                      onChange={(e) => {
                        const airports = [...(formData.airportTransfers?.airports || [])];
                        airports[index] = { ...airports[index], name: e.target.value };
                        setFormData(prev => ({
                          ...prev,
                          airportTransfers: { airports }
                        }));
                      }}
                      placeholder="e.g., Heathrow"
                    />
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <Label>Best Default Option</Label>
                  <Input
                    value={airport.bestDefault}
                    onChange={(e) => {
                      const airports = [...(formData.airportTransfers?.airports || [])];
                      airports[index] = { ...airports[index], bestDefault: e.target.value };
                      setFormData(prev => ({
                        ...prev,
                        airportTransfers: { airports }
                      }));
                    }}
                    placeholder="e.g., Elizabeth Line to Paddington"
                  />
                </div>
                <div className="mt-3 space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={airport.notes || ""}
                    onChange={(e) => {
                      const airports = [...(formData.airportTransfers?.airports || [])];
                      airports[index] = { ...airports[index], notes: e.target.value };
                      setFormData(prev => ({
                        ...prev,
                        airportTransfers: { airports }
                      }));
                    }}
                    placeholder="Additional info..."
                  />
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeAirport(index)} className="mt-2">
                  <Trash2 className="w-4 h-4 mr-1 text-destructive" /> Remove
                </Button>
              </Card>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="micromobility" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-micromobility">
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4" />
              Micromobility
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bike Share Name</Label>
                <Input
                  value={formData.micromobility?.bikeShare?.name || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    micromobility: {
                      ...prev.micromobility!,
                      bikeShare: { ...prev.micromobility?.bikeShare!, name: e.target.value }
                    }
                  }))}
                  placeholder="e.g., Santander Cycles"
                />
              </div>
              <div className="space-y-2">
                <Label>Bike Share App</Label>
                <Input
                  value={formData.micromobility?.bikeShare?.app || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    micromobility: {
                      ...prev.micromobility!,
                      bikeShare: { ...prev.micromobility?.bikeShare!, app: e.target.value }
                    }
                  }))}
                  placeholder="App name"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.micromobility?.scooters?.available || false}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  micromobility: {
                    ...prev.micromobility!,
                    scooters: { ...prev.micromobility?.scooters!, available: checked }
                  }
                }))}
              />
              <Label>E-scooters available</Label>
            </div>
            {formData.micromobility?.scooters?.available && (
              <div className="space-y-2">
                <Label>Scooter Notes</Label>
                <Input
                  value={formData.micromobility?.scooters?.notes || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    micromobility: {
                      ...prev.micromobility!,
                      scooters: { ...prev.micromobility?.scooters!, notes: e.target.value }
                    }
                  }))}
                  placeholder="e.g., Available through Lime, Tier"
                />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="driving" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-driving">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4" />
              Driving & Parking
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.drivingParking?.rentCarRecommended || false}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  drivingParking: { ...prev.drivingParking!, rentCarRecommended: checked }
                }))}
              />
              <Label>Car rental recommended</Label>
            </div>
            {formData.drivingParking?.rentCarRecommended && (
              <div className="space-y-2">
                <Label>Recommended When</Label>
                <Input
                  value={formData.drivingParking?.recommendedWhen || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    drivingParking: { ...prev.drivingParking!, recommendedWhen: e.target.value }
                  }))}
                  placeholder="e.g., For day trips outside the city"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Parking Notes</Label>
              <Textarea
                value={formData.drivingParking?.parkingNotes || ""}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  drivingParking: { ...prev.drivingParking!, parkingNotes: e.target.value }
                }))}
                placeholder="Info about parking in the city..."
                rows={2}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="walkability" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-walkability">
            <div className="flex items-center gap-2">
              <Footprints className="w-4 h-4" />
              Walkability
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Summary</Label>
              <Textarea
                value={formData.walkability?.summary || ""}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  walkability: { ...prev.walkability!, summary: e.target.value }
                }))}
                placeholder="Describe walking conditions in the city..."
                rows={3}
                data-testid="input-walkability-summary"
              />
            </div>
            <div className="space-y-2">
              <Label>Best Walking Areas (comma-separated)</Label>
              <Input
                value={(formData.walkability?.bestWalkAreas || []).join(", ")}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  walkability: {
                    ...prev.walkability!,
                    bestWalkAreas: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                  }
                }))}
                placeholder="e.g., Historic center, Waterfront"
              />
            </div>
            <div className="space-y-2">
              <Label>Cautions (comma-separated)</Label>
              <Input
                value={(formData.walkability?.cautions || []).join(", ")}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  walkability: {
                    ...prev.walkability!,
                    cautions: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                  }
                }))}
                placeholder="e.g., Uneven cobblestones, Hot summers"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sources" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline" data-testid="accordion-sources">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Sources
              <Badge variant="outline" className="ml-2">{formData.sources?.length || 0}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <Label>Data Sources</Label>
              <Button size="sm" variant="outline" onClick={addSource} data-testid="button-add-source">
                <Plus className="w-3 h-3 mr-1" /> Add Source
              </Button>
            </div>
            {formData.sources?.map((source, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-start">
                <Input
                  className="col-span-3"
                  placeholder="Source name"
                  value={source.name}
                  onChange={(e) => {
                    const sources = [...(formData.sources || [])];
                    sources[index] = { ...sources[index], name: e.target.value };
                    setFormData(prev => ({ ...prev, sources }));
                  }}
                />
                <Input
                  className="col-span-5"
                  placeholder="URL"
                  value={source.url}
                  onChange={(e) => {
                    const sources = [...(formData.sources || [])];
                    sources[index] = { ...sources[index], url: e.target.value };
                    setFormData(prev => ({ ...prev, sources }));
                  }}
                />
                <Input
                  className="col-span-3"
                  type="date"
                  value={source.accessedAt}
                  onChange={(e) => {
                    const sources = [...(formData.sources || [])];
                    sources[index] = { ...sources[index], accessedAt: e.target.value };
                    setFormData(prev => ({ ...prev, sources }));
                  }}
                />
                <Button size="icon" variant="ghost" onClick={() => removeSource(index)} className="col-span-1">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
            {(!formData.sources || formData.sources.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No sources added yet. Add sources to cite your data.
              </p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

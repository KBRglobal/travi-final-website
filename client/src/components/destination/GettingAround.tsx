/**
 * GettingAround Section Component
 * Mobility and transport information fetched from database.
 * Renders accordion sections for each mobility category.
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Train, Car, Bike, Plane, Footprints, ExternalLink,
  CreditCard, Smartphone, AlertCircle, MapPin
} from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";

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
  destinationId: string;
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
  updatedAt?: string;
}

interface GettingAroundProps {
  destinationSlug: string;
  destinationName: string;
}

function hasContent(data: MobilityData | undefined): boolean {
  if (!data) return false;
  
  const hasPublicTransport = data.publicTransport?.overview || (data.publicTransport?.keyModes?.length || 0) > 0;
  const hasTaxis = (data.taxisRideHailing?.primaryApps?.length || 0) > 0;
  const hasAirports = (data.airportTransfers?.airports?.length || 0) > 0;
  const hasMicromobility = data.micromobility?.bikeShare?.name || data.micromobility?.scooters?.available;
  const hasDriving = data.drivingParking?.rentCarRecommended || data.drivingParking?.parkingNotes;
  const hasWalkability = data.walkability?.summary;
  
  return !!(hasPublicTransport || hasTaxis || hasAirports || hasMicromobility || hasDriving || hasWalkability);
}

export function GettingAround({ destinationSlug, destinationName }: GettingAroundProps) {
  const { data: mobilityData, isLoading, error } = useQuery<MobilityData>({
    queryKey: [`/api/public/destinations/${destinationSlug}/mobility`],
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  if (isLoading) {
    return (
      <AnimatedSection className="py-12 md:py-16 bg-transparent" data-testid="section-getting-around-loading">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Skeleton className="h-10 w-64 mx-auto mb-3" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </AnimatedSection>
    );
  }

  if (error || !mobilityData || !hasContent(mobilityData)) {
    return null;
  }

  const defaultOpenSections: string[] = [];
  if (mobilityData.publicTransport?.overview || (mobilityData.publicTransport?.keyModes?.length || 0) > 0) {
    defaultOpenSections.push("public-transport");
  }

  return (
    <AnimatedSection 
      className="py-12 md:py-16 bg-transparent"
      data-testid="section-getting-around"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            Getting Around {destinationName}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Transportation options and tips for navigating the city
          </p>
        </div>

        <Accordion type="multiple" defaultValue={defaultOpenSections} className="space-y-4">
          {mobilityData.publicTransport && (mobilityData.publicTransport.overview || (mobilityData.publicTransport.keyModes?.length || 0) > 0) && (
            <AccordionItem value="public-transport" className="border rounded-lg bg-card/80 backdrop-blur-md">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Train className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold text-lg">Public Transport</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                {mobilityData.publicTransport.overview && (
                  <p className="text-muted-foreground mb-4">{mobilityData.publicTransport.overview}</p>
                )}
                
                {mobilityData.publicTransport.keyModes && mobilityData.publicTransport.keyModes.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Transport Modes</h4>
                    <div className="flex flex-wrap gap-2">
                      {mobilityData.publicTransport.keyModes.map((mode, idx) => (
                        <Badge key={idx} variant="secondary" className="text-sm py-1">
                          {mode.name}
                          {mode.notes && <span className="text-xs opacity-70 ml-1">({mode.notes})</span>}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {mobilityData.publicTransport.payment && (
                  <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-3 mb-4">
                    <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Payment</h4>
                      <p className="text-sm text-muted-foreground">
                        {mobilityData.publicTransport.payment.cardName && (
                          <span>{mobilityData.publicTransport.payment.cardName}</span>
                        )}
                        {mobilityData.publicTransport.payment.contactless && (
                          <span>{mobilityData.publicTransport.payment.cardName ? " • " : ""}Contactless accepted</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {mobilityData.publicTransport.officialApps && mobilityData.publicTransport.officialApps.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Official Apps</h4>
                      <p className="text-sm text-muted-foreground">
                        {mobilityData.publicTransport.officialApps.join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )}

          {mobilityData.taxisRideHailing && (mobilityData.taxisRideHailing.primaryApps?.length || 0) > 0 && (
            <AccordionItem value="taxis" className="border rounded-lg bg-card/80 backdrop-blur-md">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold text-lg">Taxis & Ride-Hailing</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Available Apps</h4>
                  <div className="flex flex-wrap gap-2">
                    {mobilityData.taxisRideHailing.primaryApps.map((app, idx) => (
                      <Badge key={idx} variant="outline" className="text-sm py-1">
                        {app}
                      </Badge>
                    ))}
                  </div>
                </div>
                {mobilityData.taxisRideHailing.officialTaxiInfo && (
                  <p className="text-sm text-muted-foreground">{mobilityData.taxisRideHailing.officialTaxiInfo}</p>
                )}
              </AccordionContent>
            </AccordionItem>
          )}

          {mobilityData.airportTransfers && (mobilityData.airportTransfers.airports?.length || 0) > 0 && (
            <AccordionItem value="airports" className="border rounded-lg bg-card/80 backdrop-blur-md">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plane className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold text-lg">Airport Transfers</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  {mobilityData.airportTransfers.airports.map((airport, idx) => (
                    <Card key={idx} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold">
                            {airport.name}
                            {airport.code && <span className="text-muted-foreground ml-2">({airport.code})</span>}
                          </h4>
                        </div>
                        <p className="text-sm mb-2">
                          <span className="font-medium">Best option:</span>{" "}
                          <span className="text-muted-foreground">{airport.bestDefault}</span>
                        </p>
                        {airport.notes && (
                          <p className="text-sm text-muted-foreground">{airport.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {mobilityData.micromobility && (mobilityData.micromobility.bikeShare?.name || mobilityData.micromobility.scooters?.available) && (
            <AccordionItem value="micromobility" className="border rounded-lg bg-card/80 backdrop-blur-md">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bike className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold text-lg">Bikes & Scooters</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                {mobilityData.micromobility.bikeShare?.name && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-1">Bike Share</h4>
                    <p className="text-muted-foreground">
                      {mobilityData.micromobility.bikeShare.name}
                      {mobilityData.micromobility.bikeShare.app && (
                        <span className="text-sm"> • App: {mobilityData.micromobility.bikeShare.app}</span>
                      )}
                    </p>
                    {mobilityData.micromobility.bikeShare.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{mobilityData.micromobility.bikeShare.notes}</p>
                    )}
                  </div>
                )}
                {mobilityData.micromobility.scooters?.available && (
                  <div>
                    <h4 className="font-medium mb-1">E-Scooters</h4>
                    <p className="text-muted-foreground">
                      Available
                      {mobilityData.micromobility.scooters.notes && (
                        <span className="text-sm"> • {mobilityData.micromobility.scooters.notes}</span>
                      )}
                    </p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )}

          {mobilityData.walkability?.summary && (
            <AccordionItem value="walkability" className="border rounded-lg bg-card/80 backdrop-blur-md">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Footprints className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold text-lg">Walkability</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <p className="text-muted-foreground mb-4">{mobilityData.walkability.summary}</p>
                
                {mobilityData.walkability.bestWalkAreas && mobilityData.walkability.bestWalkAreas.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <h4 className="font-medium text-sm">Best Walking Areas</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {mobilityData.walkability.bestWalkAreas.map((area, idx) => (
                        <Badge key={idx} variant="secondary">{area}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {mobilityData.walkability.cautions && mobilityData.walkability.cautions.length > 0 && (
                  <div className="flex items-start gap-2 bg-yellow-500/10 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm text-yellow-700 dark:text-yellow-400">Cautions</h4>
                      <p className="text-sm text-muted-foreground">
                        {mobilityData.walkability.cautions.join(" • ")}
                      </p>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )}

          {mobilityData.drivingParking && (mobilityData.drivingParking.rentCarRecommended || mobilityData.drivingParking.parkingNotes) && (
            <AccordionItem value="driving" className="border rounded-lg bg-card/80 backdrop-blur-md">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold text-lg">Driving & Parking</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                {mobilityData.drivingParking.rentCarRecommended && (
                  <div className="mb-4">
                    <Badge variant="outline" className="mb-2">Car rental recommended</Badge>
                    {mobilityData.drivingParking.recommendedWhen && (
                      <p className="text-sm text-muted-foreground">{mobilityData.drivingParking.recommendedWhen}</p>
                    )}
                  </div>
                )}
                {mobilityData.drivingParking.parkingNotes && (
                  <p className="text-muted-foreground">{mobilityData.drivingParking.parkingNotes}</p>
                )}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {mobilityData.sources && mobilityData.sources.length > 0 && (
          <div className="mt-8 pt-6 border-t">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="font-medium">Sources:</span>
              {mobilityData.sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {source.name}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
            {mobilityData.updatedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Last updated: {new Date(mobilityData.updatedAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </AnimatedSection>
  );
}

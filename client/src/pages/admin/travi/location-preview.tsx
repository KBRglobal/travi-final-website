import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  MapPin, 
  Phone, 
  Globe, 
  Clock, 
  Star, 
  ExternalLink,
  ChevronRight,
  Ticket,
  Loader2,
  AlertCircle
} from "lucide-react";

const TIQETS_AFFILIATE_LINK = "https://tiqets.tpo.lu/k16k6RXU";

interface LocationImage {
  id?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  altText?: string;
  isHero: boolean;
  sortOrder: number;
  photographer?: string;
  attribution?: string;
}

interface LocationContent {
  h1Title?: string;
  metaTitle?: string;
  metaDescription?: string;
  shortDescription?: string;
  whyVisit?: string;
  keyHighlights?: string[];
  visitorExperience?: string;
  history?: string;
  bestTimeToVisit?: string;
  howToGetThere?: string;
  whatToBring?: Array<{ item: string; reason: string }>;
  nearbyAttractions?: Array<{ name: string; distance: string }>;
  faq?: Array<{ question: string; answer: string }>;
}

interface LocationDetails {
  fullAddress?: string;
  latitude?: string;
  longitude?: string;
  phone?: string;
  website?: string;
  openingHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  googleRating?: string;
  googleReviewCount?: number;
  wheelchairAccessible?: boolean;
}

interface LocationData {
  id: string;
  name: string;
  slug: string;
  category: string;
  city: string;
  country: string;
  status: string;
  sourceWikipedia?: boolean;
  sourceWikipediaUrl?: string;
  sourceOsm?: boolean;
  sourceOsmId?: string;
  details?: LocationDetails | null;
  content?: Array<LocationContent & { language: string }>;
  images?: LocationImage[];
}

export default function LocationPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: location, isLoading, error } = useQuery<LocationData>({
    queryKey: ["/api/admin/travi/locations", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h2 className="text-lg font-semibold">Location not found</h2>
            <p className="text-muted-foreground mb-4">
              The location you're looking for doesn't exist or was deleted.
            </p>
            <Button onClick={() => navigate("/admin/travi/locations")} data-testid="button-back-to-list">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Locations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const englishContent = location.content?.find(c => c.language === "en") || {} as LocationContent;
  const heroImage = location.images?.find(img => img.isHero) || location.images?.[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/travi/locations")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <Badge variant="outline" className="text-xs">Preview Mode</Badge>
            </div>
          </div>
          <Button
            onClick={() => navigate(`/admin/travi/locations/${id}`)}
            data-testid="button-edit"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <article className="container max-w-4xl mx-auto px-4 py-8">
        {heroImage && (
          <div className="relative aspect-video rounded-lg overflow-hidden mb-8">
            <img
              src={heroImage.imageUrl}
              alt={heroImage.altText || location.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <Badge className="mb-2 bg-white/20 backdrop-blur">
                {location.category}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-title">
                {englishContent.h1Title || location.name}
              </h1>
              <div className="flex items-center gap-2 text-white/80">
                <MapPin className="w-4 h-4" />
                <span>{location.city}, {location.country}</span>
              </div>
            </div>
          </div>
        )}

        {!heroImage && (
          <div className="mb-8">
            <Badge className="mb-2">{location.category}</Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-title">
              {englishContent.h1Title || location.name}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{location.city}, {location.country}</span>
            </div>
          </div>
        )}

        {location.details?.googleRating && (
          <div className="flex items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="font-semibold text-lg">{location.details.googleRating}</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <span className="text-muted-foreground">
              {location.details.googleReviewCount?.toLocaleString() || 0} reviews
            </span>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {englishContent.shortDescription && (
              <section>
                <p className="text-lg text-muted-foreground leading-relaxed" data-testid="text-short-description">
                  {englishContent.shortDescription}
                </p>
              </section>
            )}

            {englishContent.whyVisit && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Why Visit</h2>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-why-visit">
                  {englishContent.whyVisit}
                </p>
              </section>
            )}

            {englishContent.keyHighlights && englishContent.keyHighlights.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Key Highlights</h2>
                <ul className="space-y-2" data-testid="list-highlights">
                  {englishContent.keyHighlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <ChevronRight className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {englishContent.visitorExperience && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Visitor Experience</h2>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-visitor-experience">
                  {englishContent.visitorExperience}
                </p>
              </section>
            )}

            {englishContent.history && (
              <section>
                <h2 className="text-xl font-semibold mb-4">History</h2>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-history">
                  {englishContent.history}
                </p>
              </section>
            )}

            {englishContent.bestTimeToVisit && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Best Time to Visit</h2>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-best-time">
                  {englishContent.bestTimeToVisit}
                </p>
              </section>
            )}

            {englishContent.howToGetThere && (
              <section>
                <h2 className="text-xl font-semibold mb-4">How to Get There</h2>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-directions">
                  {englishContent.howToGetThere}
                </p>
              </section>
            )}

            {englishContent.whatToBring && englishContent.whatToBring.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">What to Bring</h2>
                <ul className="space-y-3" data-testid="list-what-to-bring">
                  {englishContent.whatToBring.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <ChevronRight className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{item.item}</span>
                        {item.reason && (
                          <span className="text-muted-foreground"> - {item.reason}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {location.images && location.images.length > 1 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Photos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3" data-testid="gallery">
                  {location.images.filter(img => !img.isHero).slice(0, 6).map((image, idx) => (
                    <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={image.thumbnailUrl || image.imageUrl}
                        alt={image.altText || `Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    </div>
                  ))}
                </div>
                {location.images.some(img => img.attribution) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Photos: {location.images.filter(img => img.attribution).map(img => img.attribution).join(" | ")}
                  </p>
                )}
              </section>
            )}

            {englishContent.faq && englishContent.faq.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
                <div className="space-y-4" data-testid="faq-list">
                  {englishContent.faq.map((item, idx) => (
                    <div key={idx} className="border-b pb-4 last:border-0">
                      <h3 className="font-medium mb-2">{item.question}</h3>
                      <p className="text-muted-foreground">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {englishContent.nearbyAttractions && englishContent.nearbyAttractions.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Nearby Attractions</h2>
                <div className="grid gap-3 sm:grid-cols-2" data-testid="nearby-list">
                  {englishContent.nearbyAttractions.map((attraction, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">{attraction.name}</span>
                      <Badge variant="outline">{attraction.distance}</Badge>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  Book Tickets
                </CardTitle>
                <CardDescription>
                  Skip the line with advance booking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  asChild
                  data-testid="button-book-tickets"
                >
                  <a 
                    href={TIQETS_AFFILIATE_LINK} 
                    target="_blank" 
                    rel="noopener noreferrer sponsored"
                  >
                    Check Availability
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Powered by Tiqets
                </p>
              </CardContent>
            </Card>

            {location.details && (
              <Card>
                <CardHeader>
                  <CardTitle>Practical Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {location.details.fullAddress && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Address</p>
                        <p className="text-sm text-muted-foreground">{location.details.fullAddress}</p>
                      </div>
                    </div>
                  )}

                  {location.details.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Phone</p>
                        <a 
                          href={`tel:${location.details.phone}`} 
                          className="text-sm text-primary hover:underline"
                        >
                          {location.details.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {location.details.website && (
                    <div className="flex items-start gap-3">
                      <Globe className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Website</p>
                        <a 
                          href={location.details.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Visit website
                        </a>
                      </div>
                    </div>
                  )}

                  {location.details.openingHours && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="w-full">
                        <p className="font-medium mb-2">Opening Hours</p>
                        <div className="space-y-1 text-sm">
                          {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                            <div key={day} className="flex justify-between">
                              <span className="capitalize text-muted-foreground">{day.slice(0, 3)}</span>
                              <span>{(location.details!.openingHours as any)?.[day] || "Closed"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {location.details.wheelchairAccessible !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant={location.details.wheelchairAccessible ? "default" : "secondary"}>
                        {location.details.wheelchairAccessible ? "Wheelchair Accessible" : "Limited Accessibility"}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>

        <Separator className="my-8" />

        <footer className="text-xs text-muted-foreground space-y-2">
          <p>Data sources and attribution:</p>
          <ul className="list-disc list-inside space-y-1">
            {location.sourceWikipedia && (
              <li>
                Content adapted from Wikipedia, licensed under CC BY-SA 3.0
                {location.sourceWikipediaUrl && (
                  <a 
                    href={location.sourceWikipediaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline ml-1"
                  >
                    [source]
                  </a>
                )}
              </li>
            )}
            {location.sourceOsm && (
              <li>
                Location data from OpenStreetMap, licensed under ODbL
                {location.sourceOsmId && <span className="ml-1">(ID: {location.sourceOsmId})</span>}
              </li>
            )}
            {location.images?.some(img => img.attribution) && (
              <li>
                Images from Freepik: {location.images.filter(img => img.photographer).map(img => img.photographer).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
              </li>
            )}
          </ul>
        </footer>
      </article>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, ExternalLink, Pencil, Plus, Building2, 
  Waves, Palmtree, Landmark, ShoppingBag, Globe,
  FileText, LayoutGrid, List
} from "lucide-react";
import type { Content } from "@shared/schema";

// All static district pages
const STATIC_DISTRICTS = [
  {
    title: "Downtown Dubai",
    path: "/districts/downtown-dubai",
    description: "Home to Burj Khalifa, Dubai Mall, and the Dubai Fountain",
    icon: Building2,
    category: "luxury",
  },
  {
    title: "Dubai Marina",
    path: "/districts/dubai-marina",
    description: "Waterfront living with marina views and dining",
    icon: Waves,
    category: "waterfront",
  },
  {
    title: "JBR - Jumeirah Beach Residence",
    path: "/districts/jbr-jumeirah-beach-residence",
    description: "Beachfront living with The Walk and Bluewaters nearby",
    icon: Palmtree,
    category: "waterfront",
  },
  {
    title: "Palm Jumeirah",
    path: "/districts/palm-jumeirah",
    description: "Iconic palm-shaped island with luxury resorts and villas",
    icon: Palmtree,
    category: "luxury",
  },
  {
    title: "Jumeirah",
    path: "/districts/jumeirah",
    description: "Upscale residential area with beach access",
    icon: Palmtree,
    category: "residential",
  },
  {
    title: "Business Bay",
    path: "/districts/business-bay",
    description: "Commercial hub with modern towers and waterfront",
    icon: Building2,
    category: "business",
  },
  {
    title: "Old Dubai",
    path: "/districts/old-dubai",
    description: "Historic area with souks, Creek, and traditional culture",
    icon: Landmark,
    category: "culture",
  },
  {
    title: "Dubai Creek Harbour",
    path: "/districts/dubai-creek-harbour",
    description: "Emerging waterfront community with Creek Tower",
    icon: Waves,
    category: "emerging",
  },
  {
    title: "Dubai South",
    path: "/districts/dubai-south",
    description: "New urban development near Expo City and Al Maktoum Airport",
    icon: Globe,
    category: "emerging",
  },
  {
    title: "Al Barsha",
    path: "/districts/al-barsha",
    description: "Popular residential area near Mall of the Emirates",
    icon: ShoppingBag,
    category: "residential",
  },
  {
    title: "DIFC",
    path: "/districts/difc",
    description: "Financial center with art galleries and fine dining",
    icon: Landmark,
    category: "business",
  },
  {
    title: "Dubai Hills Estate",
    path: "/districts/dubai-hills-estate",
    description: "Master-planned community with golf course and mall",
    icon: Building2,
    category: "residential",
  },
  {
    title: "JVC",
    path: "/districts/jvc",
    description: "Family-friendly community with affordable options",
    icon: Building2,
    category: "residential",
  },
  {
    title: "Bluewaters Island",
    path: "/districts/bluewaters-island",
    description: "Island home to Ain Dubai, the world's largest observation wheel",
    icon: Waves,
    category: "luxury",
  },
  {
    title: "International City",
    path: "/districts/international-city",
    description: "Budget-friendly community with country-themed clusters",
    icon: Globe,
    category: "residential",
  },
  {
    title: "Al Karama",
    path: "/districts/al-karama",
    description: "Vibrant area known for shopping and diverse cuisine",
    icon: ShoppingBag,
    category: "culture",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  luxury: "Luxury",
  waterfront: "Waterfront",
  business: "Business",
  culture: "Culture",
  residential: "Residential",
  emerging: "Emerging",
};

export default function DistrictsManagement() {
  const [activeTab, setActiveTab] = useState("overview");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const { data: cmsDistricts, isLoading } = useQuery<{ contents: Content[] }>({
    queryKey: ["/api/contents", { type: "district" }],
  });

  const categories = [...new Set(STATIC_DISTRICTS.map(d => d.category))];
  const filteredDistricts = filterCategory 
    ? STATIC_DISTRICTS.filter(d => d.category === filterCategory)
    : STATIC_DISTRICTS;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Districts</h1>
          <p className="text-muted-foreground">Manage Dubai district guides and neighborhood contents</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/districts" target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Gateway
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/districts/listings">
              <List className="h-4 w-4 mr-2" />
              Manage CMS Content
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/districts/new">
              <Plus className="h-4 w-4 mr-2" />
              Create District
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Static Districts</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{STATIC_DISTRICTS.length}</div>
            <p className="text-xs text-muted-foreground">Built-in district pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CMS Districts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cmsDistricts?.contents?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Editable in CMS</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">District categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Luxury</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {STATIC_DISTRICTS.filter(d => d.category === "luxury").length}
            </div>
            <p className="text-xs text-muted-foreground">Premium areas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="static">Static Pages</TabsTrigger>
          <TabsTrigger value="cms">CMS Districts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Filter:</span>
            <Button 
              variant={!filterCategory ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilterCategory(null)}
            >
              All
            </Button>
            {categories.map(cat => (
              <Button
                key={cat}
                variant={filterCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory(cat)}
              >
                {CATEGORY_LABELS[cat]}
              </Button>
            ))}
          </div>

          {/* Static Districts Grid */}
          <Card>
            <CardHeader>
              <CardTitle>District Pages ({filteredDistricts.length})</CardTitle>
              <CardDescription>
                Static district pages with comprehensive neighborhood guides. These require code changes to update.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDistricts.map((district) => (
                  <div key={district.path} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="p-2 rounded-md bg-muted shrink-0">
                      <district.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{district.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{district.description}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Badge variant="secondary" className="text-xs capitalize">{CATEGORY_LABELS[district.category]}</Badge>
                        <Button variant="ghost" size="icon" asChild className="h-6 w-6 ml-auto">
                          <Link href={district.path} target="_blank">
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CMS Districts Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                CMS District Pages
              </CardTitle>
              <CardDescription>
                Editable district contents managed through the CMS. Create new district pages or additional contents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cmsDistricts?.contents?.length ? (
                <div className="space-y-2">
                  {cmsDistricts.contents.slice(0, 5).map((district) => (
                    <div key={district.id} className="flex items-center justify-between gap-2 p-3 rounded-md border">
                      <div>
                        <p className="font-medium">{district.title}</p>
                        <Badge variant="outline">{district.status}</Badge>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/districts/${district.id}`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  ))}
                  {cmsDistricts.contents.length > 5 && (
                    <Button variant="ghost" className="w-full" asChild>
                      <Link href="/admin/districts/listings">
                        View all {cmsDistricts.contents.length} districts
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No CMS district pages yet</p>
                  <p className="text-sm">Create additional district contents or sub-pages.</p>
                  <Button className="mt-4" asChild>
                    <Link href="/admin/districts/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Create District
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="static" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Static Districts ({STATIC_DISTRICTS.length})</CardTitle>
              <CardDescription>
                Complete list of built-in district pages. These contain comprehensive neighborhood information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {STATIC_DISTRICTS.map((district) => (
                  <div key={district.path} className="flex items-center justify-between gap-3 p-3 rounded-md border">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-md bg-muted shrink-0">
                        <district.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{district.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{district.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[district.category]}</Badge>
                      <Badge variant="outline">Static</Badge>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={district.path} target="_blank">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CMS District Pages</CardTitle>
              <CardDescription>
                Full list of editable district pages managed through the CMS.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cmsDistricts?.contents?.length ? (
                <div className="space-y-2">
                  {cmsDistricts.contents.map((district) => (
                    <div key={district.id} className="flex items-center justify-between gap-2 p-3 rounded-md border">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{district.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline">{district.status}</Badge>
                          {district.slug && (
                            <span className="text-xs text-muted-foreground truncate">/{district.slug}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {district.slug && (
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/${district.slug}`} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/districts/${district.id}`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No CMS district pages created yet.</p>
                  <Button className="mt-4" asChild>
                    <Link href="/admin/districts/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First District
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About District Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong>Static Districts:</strong> Built-in pages with comprehensive neighborhood guides including 
              attractions, hotels, dining, shopping, and practical information. These pages are SEO-optimized 
              and require code changes to update.
            </p>
            <p>
              <strong>CMS Districts:</strong> Create additional district contents or sub-pages through the CMS. 
              Fully editable with contents blocks, images, and SEO settings.
            </p>
            <p>
              <strong>Homepage Display:</strong> Districts are featured on the homepage based on popularity 
              and relevance. The district gateway page shows all available districts.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

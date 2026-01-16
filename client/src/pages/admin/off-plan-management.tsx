import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building, Building2, FileText, BookOpen, Calculator, 
  Shield, Bitcoin, CreditCard, Key, Map, Award,
  ExternalLink, Pencil, Plus, LayoutGrid, List,
  TrendingUp, DollarSign, Landmark, Scale, Home, Users
} from "lucide-react";
import type { Content } from "@shared/schema";

// All off-plan related pages organized by category
const OFF_PLAN_PAGES = {
  guides: [
    {
      title: "Investment Guide",
      path: "/dubai-off-plan-investment-guide",
      description: "Comprehensive guide to off-plan property investment in Dubai",
      icon: BookOpen,
      editable: false,
    },
    {
      title: "How to Buy Off-Plan",
      path: "/how-to-buy-dubai-off-plan",
      description: "Step-by-step guide to purchasing off-plan properties",
      icon: Key,
      editable: false,
    },
    {
      title: "Payment Plans",
      path: "/dubai-off-plan-payment-plans",
      description: "Understanding payment plans and financing options",
      icon: CreditCard,
      editable: false,
    },
    {
      title: "Legal & Security",
      path: "/dubai-legal-security-guide",
      description: "Legal framework and buyer protections in Dubai",
      icon: Shield,
      editable: false,
    },
    {
      title: "ROI & Rental Yields",
      path: "/dubai-roi-rental-yields",
      description: "Understanding rental yields and return on investment",
      icon: TrendingUp,
      editable: false,
    },
  ],
  locations: [
    {
      title: "Business Bay",
      path: "/dubai-off-plan-business-bay",
      description: "Off-plan properties in Business Bay district",
      icon: Building2,
      editable: false,
    },
    {
      title: "Dubai Marina",
      path: "/dubai-off-plan-marina",
      description: "Off-plan properties in Dubai Marina",
      icon: Building2,
      editable: false,
    },
    {
      title: "JVC (Jumeirah Village Circle)",
      path: "/dubai-off-plan-jvc",
      description: "Off-plan properties in JVC",
      icon: Building2,
      editable: false,
    },
    {
      title: "Palm Jumeirah",
      path: "/dubai-off-plan-palm-jumeirah",
      description: "Luxury off-plan on Palm Jumeirah",
      icon: Building2,
      editable: false,
    },
    {
      title: "Creek Harbour",
      path: "/dubai-off-plan-creek-harbour",
      description: "Off-plan at Dubai Creek Harbour",
      icon: Building2,
      editable: false,
    },
    {
      title: "Al Furjan",
      path: "/dubai-off-plan-al-furjan",
      description: "Off-plan properties in Al Furjan",
      icon: Building2,
      editable: false,
    },
    {
      title: "Villas & Townhouses",
      path: "/dubai-off-plan-villas",
      description: "Off-plan villas and townhouse developments",
      icon: Home,
      editable: false,
    },
  ],
  developers: [
    {
      title: "Emaar Properties",
      path: "/off-plan-emaar",
      description: "Developer behind Burj Khalifa, Downtown Dubai",
      icon: Landmark,
      editable: false,
    },
    {
      title: "DAMAC Properties",
      path: "/off-plan-damac",
      description: "Luxury branded residences developer",
      icon: Landmark,
      editable: false,
    },
    {
      title: "Nakheel",
      path: "/off-plan-nakheel",
      description: "Developer of Palm Jumeirah and Dubai Islands",
      icon: Landmark,
      editable: false,
    },
    {
      title: "Meraas",
      path: "/off-plan-meraas",
      description: "Lifestyle-focused developments",
      icon: Landmark,
      editable: false,
    },
    {
      title: "Sobha Realty",
      path: "/off-plan-sobha",
      description: "Premium quality residences",
      icon: Landmark,
      editable: false,
    },
  ],
  payment: [
    {
      title: "Crypto Payments",
      path: "/off-plan-crypto-payments",
      description: "How to buy property with cryptocurrency",
      icon: Bitcoin,
      editable: false,
    },
    {
      title: "USDT/Stablecoin",
      path: "/off-plan-usdt",
      description: "Buying with USDT and stablecoins",
      icon: DollarSign,
      editable: false,
    },
    {
      title: "Post-Handover Plans",
      path: "/off-plan-post-handover",
      description: "Payment after property completion",
      icon: CreditCard,
      editable: false,
    },
    {
      title: "Escrow Protection",
      path: "/off-plan-escrow",
      description: "Understanding Dubai's escrow system",
      icon: Shield,
      editable: false,
    },
    {
      title: "Golden Visa",
      path: "/off-plan-golden-visa",
      description: "Property investment for residency visa",
      icon: Award,
      editable: false,
    },
  ],
  comparisons: [
    {
      title: "Off-Plan vs Ready",
      path: "/off-plan-vs-ready",
      description: "Comparing off-plan and ready properties",
      icon: Scale,
      editable: false,
    },
    {
      title: "Best Projects 2026",
      path: "/best-off-plan-projects-dubai-2026",
      description: "Top off-plan projects completing in 2026",
      icon: TrendingUp,
      editable: false,
    },
  ],
  tools: [
    {
      title: "ROI Calculator",
      path: "/tools-roi-calculator",
      description: "Calculate expected return on investment",
      icon: Calculator,
      editable: false,
    },
    {
      title: "Payment Calculator",
      path: "/tools-payment-calculator",
      description: "Calculate payment plan installments",
      icon: Calculator,
      editable: false,
    },
    {
      title: "Affordability Calculator",
      path: "/tools-affordability-calculator",
      description: "Check what you can afford",
      icon: Calculator,
      editable: false,
    },
  ],
};

const CASE_STUDIES = [
  { title: "JVC Investor Success", path: "/case-study-jvc-investor" },
  { title: "Crypto Buyer Journey", path: "/case-study-crypto-buyer" },
  { title: "Golden Visa through Property", path: "/case-study-golden-visa" },
];

export default function OffPlanManagement() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: cmsProperties, isLoading } = useQuery<{ contents: Content[] }>({
    queryKey: ["/api/contents", { type: "off_plan" }],
  });

  const totalPages = Object.values(OFF_PLAN_PAGES).reduce((sum, pages) => sum + pages.length, 0);

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
          <h1 className="text-2xl font-semibold">Off-Plan Properties</h1>
          <p className="text-muted-foreground">Manage the Dubai off-plan real estate section</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dubai-real-estate" target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Public Page
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/off-plan/listings">
              <List className="h-4 w-4 mr-2" />
              Manage CMS Content
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/off-plan/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPages}</div>
            <p className="text-xs text-muted-foreground">Static off-plan pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CMS Properties</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cmsProperties?.contents?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Editable in CMS</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <Map className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{OFF_PLAN_PAGES.locations.length}</div>
            <p className="text-xs text-muted-foreground">Area-specific pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Developers</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{OFF_PLAN_PAGES.developers.length}</div>
            <p className="text-xs text-muted-foreground">Developer profiles</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="guides">Guides</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="developers">Developers</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Off-Plan Section Structure</CardTitle>
              <CardDescription>
                The off-plan section consists of static informational pages and CMS-managed property listings. 
                Static pages contain market research and guides that require code changes to update.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Guides & Information ({OFF_PLAN_PAGES.guides.length} pages)
                </h4>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {OFF_PLAN_PAGES.guides.map((page) => (
                    <div key={page.path} className="flex items-center gap-2 p-2 rounded-md border">
                      <page.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{page.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{page.description}</p>
                      </div>
                      <Button variant="ghost" size="icon" asChild className="shrink-0">
                        <Link href={page.path} target="_blank">
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  Location Pages ({OFF_PLAN_PAGES.locations.length} pages)
                </h4>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {OFF_PLAN_PAGES.locations.map((page) => (
                    <div key={page.path} className="flex items-center gap-2 p-2 rounded-md border">
                      <page.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{page.title}</p>
                      </div>
                      <Button variant="ghost" size="icon" asChild className="shrink-0">
                        <Link href={page.path} target="_blank">
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Landmark className="h-4 w-4" />
                  Developer Pages ({OFF_PLAN_PAGES.developers.length} pages)
                </h4>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {OFF_PLAN_PAGES.developers.map((page) => (
                    <div key={page.path} className="flex items-center gap-2 p-2 rounded-md border">
                      <page.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{page.title}</p>
                      </div>
                      <Button variant="ghost" size="icon" asChild className="shrink-0">
                        <Link href={page.path} target="_blank">
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                CMS Property Listings
              </CardTitle>
              <CardDescription>
                These are editable off-plan property listings managed through the CMS.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cmsProperties?.contents?.length ? (
                <div className="space-y-2">
                  {cmsProperties.contents.slice(0, 10).map((property) => (
                    <div key={property.id} className="flex items-center justify-between gap-2 p-2 rounded-md border">
                      <div>
                        <p className="font-medium">{property.title}</p>
                        <Badge variant="outline">{property.status}</Badge>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/off-plan/${property.id}`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  ))}
                  {cmsProperties.contents.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      And {cmsProperties.contents.length - 10} more...
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No CMS properties yet</p>
                  <Button className="mt-4" asChild>
                    <Link href="/admin/off-plan/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Property
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {Object.entries(OFF_PLAN_PAGES).map(([category, pages]) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{category} Pages</CardTitle>
                <CardDescription>
                  {pages.length} pages in this category. These are static pages with embedded contents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {pages.map((page) => (
                    <div key={page.path} className="flex items-start gap-3 p-4 rounded-lg border">
                      <div className="p-2 rounded-md bg-muted">
                        <page.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{page.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{page.description}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant="secondary">Static Page</Badge>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={page.path} target="_blank">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About Static Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              The off-plan section contains detailed market research, developer information, and location guides 
              that are built as static pages for optimal SEO and performance. These pages contain comprehensive 
              data from 2024-2025 market research.
            </p>
            <p>
              To update contents on static pages, code changes are required. For dynamic property listings, 
              use the CMS property section which allows full editing capabilities.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" asChild>
                <Link href="/admin/off-plan">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Manage CMS Properties
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

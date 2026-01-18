import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Building2, Calculator, Scale, BookOpen, MapPin, 
  Landmark, FileText, ExternalLink, Pencil, Plus,
  Download, ChevronRight, TrendingUp, Percent, Home
} from "lucide-react";
import type { RealEstatePage } from "@shared/schema";

const CATEGORY_INFO = {
  guide: { 
    label: "Guides", 
    icon: BookOpen, 
    description: "Investment guides, how-to articles, and educational contents",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400"
  },
  calculator: { 
    label: "Calculators", 
    icon: Calculator, 
    description: "ROI, mortgage, payment, and affordability calculators",
    color: "bg-green-500/10 text-green-700 dark:text-green-400"
  },
  comparison: { 
    label: "Comparisons", 
    icon: Scale, 
    description: "Side-by-side comparisons of areas, developers, and options",
    color: "bg-[#6443F4]/10 text-[#6443F4] dark:text-[#6443F4]"
  },
  case_study: { 
    label: "Case Studies", 
    icon: TrendingUp, 
    description: "Real investor success stories and examples",
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-400"
  },
  location: { 
    label: "Locations", 
    icon: MapPin, 
    description: "Area-specific off-plan property guides",
    color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400"
  },
  developer: { 
    label: "Developers", 
    icon: Landmark, 
    description: "Developer profiles and project portfolios",
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400"
  },
  pillar: { 
    label: "Pillar Pages", 
    icon: FileText, 
    description: "Comprehensive topic hubs for SEO",
    color: "bg-[#6443F4]/10 text-[#6443F4] dark:text-[#6443F4]"
  },
};

const PAGE_URL_MAP: Record<string, string> = {
  "investment-guide": "/destinations/dubai/off-plan-investment-guide",
  "how-to-buy": "/how-to-buy-dubai-off-plan",
  "payment-plans": "/destinations/dubai/off-plan-payment-plans",
  "best-2026": "/destinations/dubai/best-off-plan-2026",
  "roi-guide": "/pillar-roi-rental-yields",
  "legal-guide": "/pillar-legal-security",
  "glossary": "/glossary-hub",
  "roi-calculator": "/tools-roi-calculator",
  "payment-calculator": "/tools-payment-calculator",
  "affordability-calculator": "/tools-affordability-calculator",
  "currency-converter": "/tools-currency-converter",
  "stamp-duty-calculator": "/tools-stamp-duty-calculator",
  "rental-yield-calculator": "/tools-rental-yield-calculator",
  "mortgage-calculator": "/tools-mortgage-calculator",
  "off-plan-vs-ready": "/compare-off-plan-vs-ready",
  "jvc-vs-dubai-south": "/compare-jvc-vs-dubai-south",
  "emaar-vs-damac": "/compare-emaar-vs-damac",
  "downtown-vs-marina": "/compare-downtown-vs-marina",
  "crypto-vs-bank": "/compare-crypto-vs-bank-transfer",
  "villa-vs-apartment": "/compare-villa-vs-apartment",
  "studio-vs-1bed": "/compare-studio-vs-1bed",
  "case-jvc-investor": "/case-study-investor-jvc",
  "case-crypto-buyer": "/case-study-crypto-buyer",
  "case-golden-visa": "/case-study-golden-visa",
  "case-expat-family": "/case-study-expat-family",
  "case-investor-flip": "/case-study-investor-flip",
  "case-portfolio": "/case-study-portfolio-diversification",
  "case-launch-day": "/case-study-off-plan-launch",
  "case-retirement": "/case-study-retirement-planning",
  "off-plan-jvc": "/off-plan-jvc",
  "off-plan-dubai-south": "/off-plan-dubai-south",
  "off-plan-business-bay": "/off-plan-business-bay",
  "off-plan-dubai-marina": "/off-plan-dubai-marina",
  "off-plan-creek-harbour": "/off-plan-creek-harbour",
  "off-plan-palm-jumeirah": "/off-plan-palm-jumeirah",
  "off-plan-al-furjan": "/off-plan-al-furjan",
  "developer-emaar": "/off-plan-emaar",
  "developer-damac": "/off-plan-damac",
  "developer-nakheel": "/off-plan-nakheel",
  "developer-meraas": "/off-plan-meraas",
  "developer-sobha": "/off-plan-sobha",
};

export default function RealEstateManagement() {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<{ pages: RealEstatePage[] }>({
    queryKey: ["/api/real-estate-pages"],
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/real-estate-pages/seed"),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/real-estate-pages"] });
      toast({
        title: "Pages Seeded",
        description: `Created ${result.created} new pages, ${result.skipped} already existed.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to seed pages",
        variant: "destructive",
      });
    },
  });

  const pages = data?.pages || [];
  const categoryCounts = pages.reduce((acc, page) => {
    acc[page.category] = (acc[page.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getPagesByCategory = (category: string) => 
    pages.filter(p => p.category === category);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-32" />
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
          <h1 className="text-2xl font-semibold">Real Estate Pages</h1>
          <p className="text-muted-foreground">Edit contents on investment guides, calculators, comparisons, and case studies</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/destinations/dubai/real-estate" target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Public Hub
            </Link>
          </Button>
          {pages.length === 0 && (
            <Button 
              onClick={() => seedMutation.mutate()} 
              disabled={seedMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              {seedMutation.isPending ? "Seeding..." : "Initialize Pages"}
            </Button>
          )}
        </div>
      </div>

      {pages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Pages Initialized</h3>
            <p className="text-muted-foreground mb-4">
              Click "Initialize Pages" to create CMS entries for all real estate pages.
              This will allow you to edit contents, hero text, FAQs, and more.
            </p>
            <Button 
              onClick={() => seedMutation.mutate()} 
              disabled={seedMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              {seedMutation.isPending ? "Seeding..." : "Initialize Pages"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pages.length}</div>
                <p className="text-xs text-muted-foreground">CMS editable pages</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Guides & Pillars</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(categoryCounts["guide"] || 0) + (categoryCounts["pillar"] || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Educational contents</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Calculators</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categoryCounts["calculator"] || 0}</div>
                <p className="text-xs text-muted-foreground">Interactive tools</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Case Studies</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categoryCounts["case_study"] || 0}</div>
                <p className="text-xs text-muted-foreground">Investor stories</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="guide">Guides</TabsTrigger>
              <TabsTrigger value="calculator">Calculators</TabsTrigger>
              <TabsTrigger value="comparison">Comparisons</TabsTrigger>
              <TabsTrigger value="case_study">Case Studies</TabsTrigger>
              <TabsTrigger value="location">Locations</TabsTrigger>
              <TabsTrigger value="developer">Developers</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(CATEGORY_INFO).map(([key, info]) => {
                  const Icon = info.icon;
                  const count = categoryCounts[key] || 0;
                  return (
                    <Card key={key} className="hover-elevate cursor-pointer" onClick={() => setActiveTab(key)}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className={`p-2 rounded-md ${info.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <Badge variant="secondary">{count} pages</Badge>
                        </div>
                        <CardTitle className="text-lg">{info.label}</CardTitle>
                        <CardDescription>{info.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="ghost" size="sm" className="w-full justify-between">
                          View {info.label}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {Object.keys(CATEGORY_INFO).map(category => (
              <TabsContent key={category} value={category} className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{CATEGORY_INFO[category as keyof typeof CATEGORY_INFO].label}</CardTitle>
                    <CardDescription>
                      {CATEGORY_INFO[category as keyof typeof CATEGORY_INFO].description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {getPagesByCategory(category).length > 0 ? (
                      <div className="space-y-2">
                        {getPagesByCategory(category).map((page) => {
                          const publicUrl = PAGE_URL_MAP[page.pageKey] || `/${page.pageKey}`;
                          return (
                            <div 
                              key={page.id} 
                              className="flex items-center justify-between gap-3 p-3 rounded-md border"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="p-2 rounded-md bg-muted shrink-0">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{page.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {page.heroTitle || page.metaTitle || "No custom contents yet"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge 
                                  variant={page.heroTitle || page.introText ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {page.heroTitle || page.introText ? "Customized" : "Default"}
                                </Badge>
                                <Button variant="outline" size="sm" asChild>
                                  <Link href={publicUrl} target="_blank">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    View
                                  </Link>
                                </Button>
                                <Button variant="default" size="sm" asChild>
                                  <Link href={`/admin/real-estate/${page.pageKey}`}>
                                    <Pencil className="h-3 w-3 mr-1" />
                                    Edit
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No pages in this category yet.</p>
                        <Button className="mt-4" onClick={() => seedMutation.mutate()}>
                          <Download className="h-4 w-4 mr-2" />
                          Initialize Pages
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How Page Editing Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  <strong>CMS Overrides:</strong> Each page has a static React component with default contents.
                  When you edit a page through this interface, your changes override the defaults - allowing you
                  to customize hero titles, intro text, FAQs, and section contents.
                </p>
                <p>
                  <strong>What You Can Edit:</strong> Hero title/subtitle, meta title/description for SEO,
                  intro paragraphs, FAQ questions and answers, related links, and custom sections.
                </p>
                <p>
                  <strong>Calculator Tools:</strong> For calculator pages, you can edit the explanatory text
                  and FAQs, but the calculator functionality itself is built into the component.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

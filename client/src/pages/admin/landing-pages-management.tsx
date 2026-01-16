import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, ExternalLink, Pencil, Plus, Megaphone,
  Gift, Scale, Crown, Clock, Map, Sparkles, BookOpen, List
} from "lucide-react";
import type { Content } from "@shared/schema";

// All static landing pages
const STATIC_LANDING_PAGES = [
  {
    title: "Free Things to Do in Dubai",
    path: "/dubai/free-things-to-do",
    description: "Comprehensive guide to free attractions, activities, and experiences in Dubai",
    icon: Gift,
    category: "lifestyle",
  },
  {
    title: "Dubai Laws for Tourists",
    path: "/dubai/laws-for-tourists",
    description: "Important laws and regulations tourists should know when visiting Dubai",
    icon: Scale,
    category: "information",
  },
  {
    title: "Sheikh Mohammed bin Rashid",
    path: "/dubai/sheikh-mohammed-bin-rashid",
    description: "Information about Dubai's ruler and his vision for the emirate",
    icon: Crown,
    category: "information",
  },
  {
    title: "24 Hours Open in Dubai",
    path: "/dubai/24-hours-open",
    description: "Guide to places, restaurants, and services open 24/7 in Dubai",
    icon: Clock,
    category: "lifestyle",
  },
];

export default function LandingPagesManagement() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: cmsPages, isLoading } = useQuery<{ contents: Content[] }>({
    queryKey: ["/api/contents", { type: "landing_page" }],
  });

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

  const lifestylePages = STATIC_LANDING_PAGES.filter(p => p.category === "lifestyle");
  const infoPages = STATIC_LANDING_PAGES.filter(p => p.category === "information");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Landing Pages</h1>
          <p className="text-muted-foreground">Manage special landing pages and informational contents</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/landing-pages/listings">
              <List className="h-4 w-4 mr-2" />
              Manage CMS Content
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/landing-pages/new">
              <Plus className="h-4 w-4 mr-2" />
              Create New Page
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Static Pages</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{STATIC_LANDING_PAGES.length}</div>
            <p className="text-xs text-muted-foreground">Built-in landing pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CMS Pages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cmsPages?.contents?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Editable in CMS</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lifestyle</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lifestylePages.length}</div>
            <p className="text-xs text-muted-foreground">Activity guides</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Information</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{infoPages.length}</div>
            <p className="text-xs text-muted-foreground">Reference pages</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cms">CMS Pages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Static Landing Pages */}
          <Card>
            <CardHeader>
              <CardTitle>Static Landing Pages</CardTitle>
              <CardDescription>
                These are built-in landing pages with comprehensive contents. They require code changes to update.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {STATIC_LANDING_PAGES.map((page) => (
                  <div key={page.path} className="flex items-start gap-3 p-4 rounded-lg border">
                    <div className="p-2 rounded-md bg-muted">
                      <page.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{page.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{page.description}</p>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Badge variant="secondary" className="capitalize">{page.category}</Badge>
                        <Badge variant="outline">Static</Badge>
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

          {/* CMS Pages Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                CMS Landing Pages
              </CardTitle>
              <CardDescription>
                These are editable landing pages managed through the CMS. Create new pages for custom contents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cmsPages?.contents?.length ? (
                <div className="space-y-2">
                  {cmsPages.contents.slice(0, 5).map((page) => (
                    <div key={page.id} className="flex items-center justify-between gap-2 p-3 rounded-md border">
                      <div>
                        <p className="font-medium">{page.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{page.status}</Badge>
                          {page.slug && (
                            <span className="text-xs text-muted-foreground">/{page.slug}</span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/landing-pages/${page.id}`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  ))}
                  {cmsPages.contents.length > 5 && (
                    <Button variant="ghost" className="w-full" asChild>
                      <Link href="/admin/landing-pages/listings">
                        View all {cmsPages.contents.length} pages
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No CMS landing pages yet</p>
                  <p className="text-sm">Create custom landing pages for campaigns, promotions, or seasonal contents.</p>
                  <Button className="mt-4" asChild>
                    <Link href="/admin/landing-pages/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Page
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All CMS Landing Pages</CardTitle>
              <CardDescription>
                Full list of editable landing pages. Click to edit any page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cmsPages?.contents?.length ? (
                <div className="space-y-2">
                  {cmsPages.contents.map((page) => (
                    <div key={page.id} className="flex items-center justify-between gap-2 p-3 rounded-md border">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{page.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline">{page.status}</Badge>
                          {page.slug && (
                            <span className="text-xs text-muted-foreground truncate">/{page.slug}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {page.slug && (
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/${page.slug}`} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/landing-pages/${page.id}`}>
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
                  <p>No CMS landing pages created yet.</p>
                  <Button className="mt-4" asChild>
                    <Link href="/admin/landing-pages/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Page
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
          <CardTitle className="text-lg">About Landing Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong>Static Pages:</strong> Built-in pages with comprehensive, SEO-optimized contents. 
              These pages (Free Things to Do, Dubai Laws, etc.) contain detailed information and require 
              code changes to update their contents.
            </p>
            <p>
              <strong>CMS Pages:</strong> Create custom landing pages for campaigns, promotions, or 
              any special contents. These are fully editable through the contents editor with blocks, 
              images, and SEO settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

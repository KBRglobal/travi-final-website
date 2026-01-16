import { Link } from "wouter";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  MapPin,
  Building2,
  FileText,
  Rss,
  Link2,
  Image,
  Settings,
  UtensilsCrossed,
  Map,
  Train,
  Sparkles,
  Lightbulb,
  Search,
  Users,
  LogOut,
  Home,
  BarChart3,
  ClipboardList,
  Shield,
  Mail,
  Send,
  Calendar,
  CalendarDays,
  Network,
  Tags,
  Languages,
  Megaphone,
  FileBarChart2,
  Building,
  LayoutTemplate,
  SearchCheck,
  ScrollText,
  Zap,
  Brain,
  PenTool,
  Lock,
  Newspaper,
  DollarSign,
  Crown,
  Store,
  Target,
  UsersRound,
  Webhook,
  Activity,
  Route,
  Radar,
  Terminal,
  MessageCircle,
  Workflow,
  Eye,
  Menu,
  PanelBottom,
  Share2,
  Database,
  ClipboardCheck,
  TrendingUp,
  Globe,
  ChevronRight,
  Loader2,
  Key,
  FileCheck,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import type { User } from "@/hooks/use-auth";
import { Mascot } from "@/components/logo";

// UI-Only Mode: Hide automation, AI generation, distribution features
// Set to false to show all menu items
const UI_ONLY_MODE = true;

type PermissionKey = 
  | "canCreate" | "canEdit" | "canEditOwn" | "canDelete" | "canPublish" 
  | "canSubmitForReview" | "canManageUsers" | "canManageSettings" 
  | "canViewAnalytics" | "canViewAuditLogs" | "canAccessMediaLibrary" 
  | "canAccessAffiliates" | "canViewAll";

interface PermissionsResponse {
  role?: string;
  permissions?: {
    [key: string]: boolean;
  };
  [key: string]: boolean | string | { [key: string]: boolean } | undefined;
}

interface NavItem {
  title: string;
  url: string;
  icon: typeof Home;
  requiredPermission?: PermissionKey;
}

// Core content items - always visible
const coreContentItems: NavItem[] = [
  { title: "Destinations", url: "/admin/destinations", icon: Radar },
  { title: "Attractions", url: "/admin/attractions", icon: MapPin },
  { title: "Hotels", url: "/admin/hotels", icon: Building2 },
  { title: "Dining", url: "/admin/dining", icon: UtensilsCrossed },
  { title: "Districts", url: "/admin/districts", icon: Map },
  { title: "News", url: "/admin/articles", icon: FileText },
  { title: "Events", url: "/admin/events", icon: Calendar },
  { title: "Landing Pages", url: "/admin/landing-pages", icon: Megaphone },
  { title: "Static Pages", url: "/admin/static-pages", icon: FileText, requiredPermission: "canManageSettings" },
  { title: "Homepage", url: "/admin/homepage", icon: Home, requiredPermission: "canManageSettings" },
];

// TRAVI CMS items - always visible for location management
const traviItems: NavItem[] = [
  { title: "TRAVI Locations", url: "/admin/travi/locations", icon: MapPin },
  { title: "Data Collection", url: "/admin/travi/data-collection", icon: Database },
  { title: "Data Ingestion", url: "/admin/ingestion", icon: Rss, requiredPermission: "canManageSettings" },
  { title: "Internal Links", url: "/admin/links", icon: Link2, requiredPermission: "canManageSettings" },
  { title: "TRAVI Config", url: "/admin/travi/config", icon: Settings },
  { title: "API Keys", url: "/admin/travi/api-keys", icon: Key },
];

// Extended content items - hidden in UI-only mode
const extendedContentItems: NavItem[] = [
  { title: "Transport", url: "/admin/transport", icon: Train },
  { title: "Case Studies", url: "/admin/case-studies", icon: FileBarChart2 },
  { title: "Off-Plan", url: "/admin/off-plan", icon: Building },
  { title: "Real Estate", url: "/admin/real-estate", icon: Home },
  { title: "Surveys", url: "/admin/surveys", icon: ClipboardList },
];

const contentItems: NavItem[] = UI_ONLY_MODE ? coreContentItems : [...coreContentItems, ...extendedContentItems];

// UI-only creation tools - visual editing only
const uiCreationItems: NavItem[] = [
  { title: "Visual Editor", url: "/admin/visual-editor", icon: Eye, requiredPermission: "canCreate" },
  { title: "Page Builder", url: "/admin/page-builder", icon: LayoutTemplate, requiredPermission: "canCreate" },
  { title: "Image Engine", url: "/admin/image-engine", icon: Sparkles, requiredPermission: "canAccessMediaLibrary" },
];

// Full creation tools - includes AI automation
const fullCreationItems: NavItem[] = [
  { title: "Octopus", url: "/admin/octopus", icon: Lightbulb, requiredPermission: "canCreate" },
  { title: "AI Generator", url: "/admin/ai-generator", icon: Sparkles, requiredPermission: "canCreate" },
  { title: "Templates", url: "/admin/templates", icon: LayoutTemplate, requiredPermission: "canCreate" },
  { title: "AI Writers", url: "/admin/writers", icon: PenTool, requiredPermission: "canCreate" },
  { title: "AI Newsroom", url: "/admin/writers/newsroom", icon: Newspaper, requiredPermission: "canCreate" },
  { title: "Content Intelligence", url: "/admin/contents-intelligence", icon: Brain, requiredPermission: "canViewAnalytics" },
  { title: "Topic Bank", url: "/admin/topic-bank", icon: Lightbulb, requiredPermission: "canCreate" },
  { title: "Image Engine", url: "/admin/image-engine", icon: Sparkles, requiredPermission: "canAccessMediaLibrary" },
  { title: "Page Builder", url: "/admin/page-builder", icon: LayoutTemplate, requiredPermission: "canCreate" },
  { title: "Visual Editor", url: "/admin/visual-editor", icon: Eye, requiredPermission: "canCreate" },
];

const creationItems: NavItem[] = UI_ONLY_MODE ? uiCreationItems : fullCreationItems;

// Automation items - hidden in UI-only mode
const automationItems: NavItem[] = UI_ONLY_MODE ? [] : [
  { title: "Auto-Pilot", url: "/admin/auto-pilot", icon: Zap, requiredPermission: "canManageSettings" },
  { title: "RSS Feeds", url: "/admin/rss-feeds", icon: Rss, requiredPermission: "canCreate" },
  { title: "Calendar", url: "/admin/calendar", icon: CalendarDays, requiredPermission: "canViewAll" },
  { title: "Content Rules", url: "/admin/contents-rules", icon: Shield, requiredPermission: "canManageSettings" },
  { title: "Workflows", url: "/admin/enterprise/workflows", icon: Workflow, requiredPermission: "canManageSettings" },
];

// UI-only distribution items - site structure only
const uiDistributionItems: NavItem[] = [
  { title: "Navigation", url: "/admin/navigation", icon: Menu, requiredPermission: "canManageSettings" },
  { title: "Footer", url: "/admin/footer", icon: PanelBottom, requiredPermission: "canManageSettings" },
];

// Full distribution items - includes marketing features
const fullDistributionItems: NavItem[] = [
  { title: "Translations", url: "/admin/translations", icon: Languages, requiredPermission: "canManageSettings" },
  { title: "AEO", url: "/admin/aeo", icon: Brain, requiredPermission: "canViewAnalytics" },
  { title: "Newsletter", url: "/admin/newsletter", icon: Mail, requiredPermission: "canViewAnalytics" },
  { title: "Campaigns", url: "/admin/campaigns", icon: Send, requiredPermission: "canViewAnalytics" },
  { title: "Social Media", url: "/admin/social", icon: Share2, requiredPermission: "canEdit" },
  { title: "Navigation", url: "/admin/navigation", icon: Menu, requiredPermission: "canManageSettings" },
  { title: "Footer", url: "/admin/footer", icon: PanelBottom, requiredPermission: "canManageSettings" },
  { title: "Live Chat", url: "/admin/chat", icon: MessageCircle, requiredPermission: "canViewAll" },
];

const distributionItems: NavItem[] = UI_ONLY_MODE ? uiDistributionItems : fullDistributionItems;

// Monetization items - hidden in UI-only mode
const monetizationItems: NavItem[] = UI_ONLY_MODE ? [] : [
  { title: "Affiliates", url: "/admin/affiliate-links", icon: Link2, requiredPermission: "canAccessAffiliates" },
  { title: "Affiliate Dashboard", url: "/admin/monetization/affiliates", icon: DollarSign, requiredPermission: "canAccessAffiliates" },
  { title: "Premium Content", url: "/admin/monetization/premium", icon: Crown, requiredPermission: "canManageSettings" },
  { title: "Business Listings", url: "/admin/monetization/listings", icon: Store, requiredPermission: "canManageSettings" },
  { title: "Leads", url: "/admin/monetization/leads", icon: Target, requiredPermission: "canViewAnalytics" },
  { title: "Referrals", url: "/admin/referrals", icon: Users, requiredPermission: "canAccessAffiliates" },
];

// Analysis items - hidden in UI-only mode
const analysisItems: NavItem[] = UI_ONLY_MODE ? [] : [
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3, requiredPermission: "canViewAnalytics" },
  { title: "SEO Audit", url: "/admin/seo-audit", icon: SearchCheck, requiredPermission: "canViewAnalytics" },
  { title: "Customer Journey", url: "/admin/analytics/journey", icon: Route, requiredPermission: "canViewAnalytics" },
  { title: "Search Analytics", url: "/admin/analytics/search", icon: Radar, requiredPermission: "canViewAnalytics" },
  { title: "Growth", url: "/admin/growth-dashboard", icon: TrendingUp, requiredPermission: "canViewAnalytics" },
  { title: "Plagiarism", url: "/admin/analytics/plagiarism", icon: Eye, requiredPermission: "canViewAnalytics" },
];

// UI-only system items - essential settings only
const uiSystemItems: NavItem[] = [
  { title: "Settings", url: "/admin/settings", icon: Settings, requiredPermission: "canManageSettings" },
  { title: "Site Settings", url: "/admin/site-settings", icon: Globe, requiredPermission: "canManageSettings" },
  { title: "Media Library", url: "/admin/media", icon: Image, requiredPermission: "canAccessMediaLibrary" },
  { title: "Users", url: "/admin/users", icon: Users, requiredPermission: "canManageUsers" },
];

// Full system items - includes enterprise features
const fullSystemItems: NavItem[] = [
  { title: "Settings", url: "/admin/settings", icon: Settings, requiredPermission: "canManageSettings" },
  { title: "Site Settings", url: "/admin/site-settings", icon: Globe, requiredPermission: "canManageSettings" },
  { title: "Security", url: "/admin/security", icon: Lock, requiredPermission: "canManageSettings" },
  { title: "Users", url: "/admin/users", icon: Users, requiredPermission: "canManageUsers" },
  { title: "Media Library", url: "/admin/media", icon: Image, requiredPermission: "canAccessMediaLibrary" },
  { title: "Keywords", url: "/admin/keywords", icon: Search, requiredPermission: "canCreate" },
  { title: "Clusters", url: "/admin/clusters", icon: Network, requiredPermission: "canCreate" },
  { title: "Tags", url: "/admin/tags", icon: Tags, requiredPermission: "canCreate" },
  { title: "System Logs", url: "/admin/logs", icon: ScrollText, requiredPermission: "canManageSettings" },
  { title: "Audit Logs", url: "/admin/audit-logs", icon: ClipboardList, requiredPermission: "canViewAuditLogs" },
  { title: "Teams", url: "/admin/enterprise/teams", icon: UsersRound, requiredPermission: "canManageUsers" },
  { title: "Webhooks", url: "/admin/enterprise/webhooks", icon: Webhook, requiredPermission: "canManageSettings" },
  { title: "Activity", url: "/admin/enterprise/activity", icon: Activity, requiredPermission: "canViewAuditLogs" },
  { title: "Console", url: "/admin/console", icon: Terminal, requiredPermission: "canManageSettings" },
  { title: "QA Checklist", url: "/admin/qa", icon: ClipboardCheck, requiredPermission: "canManageSettings" },
  { title: "Promotions", url: "/admin/homepage-promotions", icon: Megaphone, requiredPermission: "canManageSettings" },
];

const systemItems: NavItem[] = UI_ONLY_MODE ? uiSystemItems : fullSystemItems;

interface AppSidebarProps {
  user?: User | null;
}

interface TiqetsCity {
  id: string;
  name: string;
  tiqetsCityId: string | null;
  attractionCount: number;
  isActive: boolean;
}

interface TiqetsAttraction {
  id: string;
  title: string;
  slug: string;
  cityName: string;
  status: string;
}

interface TiqetsCitiesResponse {
  cities: TiqetsCity[];
}

interface TiqetsAttractionsResponse {
  attractions: TiqetsAttraction[];
  total: number;
}

function CityAttractionsSubmenu({ city, isExpanded }: { city: TiqetsCity; isExpanded: boolean }) {
  const [location] = useLocation();
  
  const { data, isLoading } = useQuery<TiqetsAttractionsResponse>({
    queryKey: ["/api/admin/tiqets/attractions/by-city", city.name],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tiqets/attractions/by-city/${encodeURIComponent(city.name)}?limit=20`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: isExpanded,
  });

  const attractions = data?.attractions || [];
  const total = data?.total || city.attractionCount;

  if (isLoading) {
    return (
      <div className="ml-4 pl-2 border-l border-sidebar-border py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-4 pl-2 border-l border-sidebar-border space-y-0.5 py-1">
      {attractions.slice(0, 10).map((attraction) => (
        <SidebarMenuButton
          key={attraction.id}
          asChild
          isActive={location === `/admin/tiqets/attractions/${attraction.id}`}
          className="h-7 text-xs"
          data-testid={`nav-attraction-${attraction.id}`}
        >
          <Link href={`/admin/tiqets/attractions/${attraction.id}`}>
            <span className="truncate">{attraction.title}</span>
          </Link>
        </SidebarMenuButton>
      ))}
      {total > 10 && (
        <SidebarMenuButton
          asChild
          className="h-7 text-xs text-muted-foreground"
          data-testid={`nav-city-${city.name.toLowerCase()}-more`}
        >
          <Link href={`/admin/tiqets/destinations?city=${city.name}`}>
            <span>+{total - 10} more...</span>
          </Link>
        </SidebarMenuButton>
      )}
      {attractions.length === 0 && (
        <div className="text-xs text-muted-foreground py-1 px-2">No attractions imported</div>
      )}
    </div>
  );
}

export function AppSidebar({ user }: AppSidebarProps) {
  const [location, setLocation] = useLocation();
  const [citiesExpanded, setCitiesExpanded] = useState<Record<string, boolean>>({});

  const { data: permissionsResponse, isLoading: permissionsLoading } = useQuery<PermissionsResponse>({
    queryKey: ["/api/user/permissions"],
    enabled: !!user,
  });

  const { data: tiqetsCitiesData, isLoading: citiesLoading } = useQuery<TiqetsCitiesResponse>({
    queryKey: ["/api/admin/tiqets/cities"],
    enabled: !!user,
  });

  const hasPermission = (permission: PermissionKey): boolean => {
    if (!permissionsResponse) return false;
    if (permissionsResponse.permissions?.[permission] !== undefined) {
      return permissionsResponse.permissions[permission] === true;
    }
    return permissionsResponse[permission] === true;
  };

  const filterItems = (items: NavItem[]): NavItem[] => {
    if (permissionsLoading) {
      return items.filter((item) => !item.requiredPermission);
    }
    return items.filter((item) => {
      if (!item.requiredPermission) return true;
      return hasPermission(item.requiredPermission);
    });
  };

  const visibleContentItems = filterItems(contentItems);
  const visibleCreationItems = filterItems(creationItems);
  const visibleAutomationItems = filterItems(automationItems);
  const visibleDistributionItems = filterItems(distributionItems);
  const visibleMonetizationItems = filterItems(monetizationItems);
  const visibleAnalysisItems = filterItems(analysisItems);
  const visibleSystemItems = filterItems(systemItems);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/login");
    },
  });

  const isActive = (url: string) => {
    if (url === "/admin") return location === "/admin";
    return location.startsWith(url);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const renderNavGroup = (label: string, items: NavItem[], showSeparator: boolean = false) => {
    if (items.length === 0) return null;
    
    const primaryCount = label === "Content" ? 10 : label === "Creation" ? 3 : label === "Automation" ? 3 : label === "Distribution" ? 4 : label === "Monetization" ? 2 : label === "Analysis" ? 2 : label === "System" ? 4 : items.length;
    const primaryItems = items.slice(0, primaryCount);
    const secondaryItems = items.slice(primaryCount);
    
    return (
      <SidebarGroup key={label}>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {primaryItems.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.url)}
                  data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Link href={item.url}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {secondaryItems.length > 0 && (
              <>
                <div className="my-1 mx-3 border-t border-dashed border-sidebar-border" />
                {secondaryItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      className="text-muted-foreground"
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  const tiqetsCities = tiqetsCitiesData?.cities || [];
  
  const toggleCity = (cityName: string) => {
    setCitiesExpanded(prev => ({ ...prev, [cityName]: !prev[cityName] }));
  };

  const renderCitySection = (city: TiqetsCity) => {
    const isExpanded = citiesExpanded[city.name];
    
    return (
      <Collapsible
        key={city.id}
        open={isExpanded}
        onOpenChange={() => toggleCity(city.name)}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className="w-full justify-between"
            data-testid={`nav-city-${city.name.toLowerCase().replace(/\s+/g, "-")}-toggle`}
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{city.name}</span>
              <span className="text-xs text-muted-foreground">({city.attractionCount})</span>
            </div>
            <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CityAttractionsSubmenu city={city} isExpanded={isExpanded} />
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const renderTraviSection = () => {
    const activeCities = tiqetsCities.filter(c => c.isActive);
    const isTraviLoading = citiesLoading;
    
    return (
      <SidebarGroup key="travi">
        <SidebarGroupLabel>TIQETS</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location === "/admin/tiqets" || location === "/admin/tiqets/dashboard"}
                data-testid="nav-tiqets-dashboard"
              >
                <Link href="/admin/tiqets">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location === "/admin/tiqets/destinations"}
                data-testid="nav-tiqets-destinations"
              >
                <Link href="/admin/tiqets/destinations">
                  <Globe className="h-4 w-4" />
                  <span>Destinations</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location === "/admin/tiqets/integrations"}
                data-testid="nav-tiqets-integrations"
              >
                <Link href="/admin/tiqets/integrations">
                  <Link2 className="h-4 w-4" />
                  <span>Integrations</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location === "/admin/tiqets/configuration"}
                data-testid="nav-tiqets-configuration"
              >
                <Link href="/admin/tiqets/configuration">
                  <Settings className="h-4 w-4" />
                  <span>Configuration</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location === "/admin/tiqets/content-quality"}
                data-testid="nav-content-quality"
              >
                <Link href="/admin/tiqets/content-quality">
                  <FileCheck className="h-4 w-4" />
                  <span>Content Quality</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            {isTraviLoading ? (
              <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Loading cities...</span>
              </div>
            ) : activeCities.length > 0 ? (
              <>
                <div className="my-1 mx-3 border-t border-dashed border-sidebar-border" />
                <div className="px-2 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  By City
                </div>
                {activeCities.map((city) => (
                  <SidebarMenuItem key={city.id}>
                    {renderCitySection(city)}
                  </SidebarMenuItem>
                ))}
              </>
            ) : null}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar className="w-60">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/admin" className="flex items-center gap-3">
          <Mascot variant="light-bg" size={36} />
          <div className="flex flex-col">
            <span className="font-heading font-semibold text-sm">Travi CMS</span>
            <span className="text-xs text-muted-foreground">Dubai Travel</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/admin") && location === "/admin"}
                  data-testid="nav-dashboard"
                  className="font-medium"
                >
                  <Link href="/admin">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {renderTraviSection()}
        {renderNavGroup("Content", visibleContentItems)}
        {renderNavGroup("Creation", visibleCreationItems)}
        {renderNavGroup("Automation", visibleAutomationItems)}
        {renderNavGroup("Distribution", visibleDistributionItems)}
        {renderNavGroup("Monetization", visibleMonetizationItems)}
        {renderNavGroup("Analysis", visibleAnalysisItems)}
        {renderNavGroup("System", visibleSystemItems)}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-3">
        {user && (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium truncate">{user.firstName || user.email}</span>
            <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

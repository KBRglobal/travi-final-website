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
  Sparkles,
  Lightbulb,
  Search,
  Users,
  LogOut,
  BarChart3,
  ClipboardList,
  Shield,
  Mail,
  Send,
  Calendar,
  Network,
  Tags,
  Languages,
  LayoutTemplate,
  SearchCheck,
  ScrollText,
  Zap,
  Brain,
  PenTool,
  Lock,
  Newspaper,
  DollarSign,
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
  Share2,
  TrendingUp,
  Globe,
  ChevronDown,
  Key,
  FileCheck,
  Video,
  Palette,
  PanelBottom,
  Gift,
  HelpCircle,
  BookOpen,
  Flag,
  Cog,
  Bug,
  FileImage,
  BarChart2,
  MousePointer,
  Package,
  Import,
  Clock,
  PlayCircle,
  Library,
  Bot,
  Database,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import type { User } from "@/hooks/use-auth";
import { Mascot } from "@/components/logo";
import { cn } from "@/lib/utils";

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
  icon: typeof LayoutDashboard;
  requiredPermission?: PermissionKey;
  hidden?: boolean;
  hiddenReason?: string;
}

interface NavModule {
  id: string;
  title: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
  defaultOpen?: boolean;
}

interface AppSidebarProps {
  user?: User | null;
}

const sidebarModules: NavModule[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { title: "Overview", url: "/admin", icon: LayoutDashboard },
      { title: "Activity Feed", url: "/admin/enterprise/activity", icon: Activity, requiredPermission: "canViewAuditLogs" },
      { title: "Quick Actions", url: "/admin/qa", icon: Zap, requiredPermission: "canManageSettings" },
    ],
  },
  {
    id: "content",
    title: "Content",
    icon: FileText,
    defaultOpen: true,
    items: [
      { title: "Destinations", url: "/admin/destinations", icon: Radar },
      { title: "Attractions", url: "/admin/attractions", icon: MapPin },
      // HIDDEN - no hotel content yet
      { title: "Hotels", url: "/admin/hotels", icon: Building2, hidden: true, hiddenReason: "No hotel content yet" },
      { title: "Articles", url: "/admin/articles", icon: FileText },
      { title: "Categories", url: "/admin/clusters", icon: Network, requiredPermission: "canCreate" },
      { title: "Tags", url: "/admin/tags", icon: Tags, requiredPermission: "canCreate" },
      { title: "Pages", url: "/admin/static-pages", icon: FileText, requiredPermission: "canManageSettings" },
    ],
  },
  {
    id: "octopus",
    title: "Octopus Engine",
    icon: Bot,
    items: [
      { title: "Content Generator", url: "/admin/octopus", icon: Lightbulb, requiredPermission: "canCreate" },
      { title: "Research Hub", url: "/admin/topic-bank", icon: Search, requiredPermission: "canCreate" },
      { title: "Templates", url: "/admin/templates", icon: LayoutTemplate, requiredPermission: "canCreate" },
      { title: "Settings", url: "/admin/travi/config", icon: Settings, requiredPermission: "canManageSettings" },
    ],
  },
  {
    id: "ai-writers",
    title: "AI Writers",
    icon: PenTool,
    items: [
      { title: "Writer Profiles", url: "/admin/writers", icon: PenTool, requiredPermission: "canCreate" },
      { title: "Writing Queue", url: "/admin/writers/newsroom", icon: Newspaper, requiredPermission: "canCreate" },
      { title: "Content Review", url: "/admin/contents-intelligence", icon: Brain, requiredPermission: "canViewAnalytics" },
      { title: "Provider Settings", url: "/admin/travi/api-keys", icon: Key, requiredPermission: "canManageSettings" },
    ],
  },
  {
    id: "news-rss",
    title: "News & RSS",
    icon: Newspaper,
    items: [
      { title: "RSS Feeds", url: "/admin/rss-feeds", icon: Rss, requiredPermission: "canCreate" },
      { title: "News Articles", url: "/admin/articles", icon: Newspaper },
      { title: "Aggregation Settings", url: "/admin/ingestion", icon: Database, requiredPermission: "canManageSettings" },
    ],
  },
  {
    id: "image-engine",
    title: "Image Engine",
    icon: Image,
    items: [
      { title: "AI Generation", url: "/admin/image-engine", icon: Sparkles, requiredPermission: "canAccessMediaLibrary" },
      { title: "Media Library", url: "/admin/media", icon: Image, requiredPermission: "canAccessMediaLibrary" },
      { title: "ALT Manager", url: "/admin/tiqets/content-quality", icon: FileImage, requiredPermission: "canCreate" },
      { title: "Stock Harvester", url: "/admin/ingestion", icon: Package, requiredPermission: "canManageSettings" },
    ],
  },
  {
    id: "video-engine",
    title: "Video Engine",
    icon: Video,
    items: [
      { title: "Video Generation", url: "/admin/media", icon: PlayCircle, requiredPermission: "canCreate", hidden: true, hiddenReason: "Video engine not yet implemented" },
      { title: "Video Library", url: "/admin/media?type=video", icon: Library, requiredPermission: "canAccessMediaLibrary" },
    ],
  },
  {
    id: "design-branding",
    title: "Design & Branding",
    icon: Palette,
    items: [
      { title: "Brand Settings", url: "/admin/site-settings", icon: Palette, requiredPermission: "canManageSettings" },
      { title: "Visual Styles", url: "/admin/visual-editor", icon: Eye, requiredPermission: "canCreate" },
      { title: "Navigation", url: "/admin/navigation", icon: Menu, requiredPermission: "canManageSettings" },
      { title: "Theme Settings", url: "/admin/footer", icon: PanelBottom, requiredPermission: "canManageSettings" },
    ],
  },
  {
    id: "page-builder",
    title: "Page Builder",
    icon: LayoutTemplate,
    items: [
      { title: "All Pages", url: "/admin/page-builder", icon: LayoutTemplate, requiredPermission: "canCreate" },
      { title: "Templates", url: "/admin/templates", icon: FileText, requiredPermission: "canCreate" },
      { title: "Widgets Library", url: "/admin/homepage", icon: Package, requiredPermission: "canManageSettings" },
    ],
  },
  {
    id: "seo-aeo",
    title: "SEO & AEO",
    icon: SearchCheck,
    items: [
      { title: "SEO Settings", url: "/admin/seo-audit", icon: SearchCheck, requiredPermission: "canViewAnalytics" },
      { title: "AEO Dashboard", url: "/admin/aeo", icon: Brain, requiredPermission: "canViewAnalytics" },
      { title: "Keywords Manager", url: "/admin/keywords", icon: Search, requiredPermission: "canCreate" },
      { title: "SEO Audit", url: "/admin/seo-engine", icon: FileCheck, requiredPermission: "canViewAnalytics" },
    ],
  },
  {
    id: "localization",
    title: "Localization",
    icon: Globe,
    items: [
      { title: "Languages", url: "/admin/translations", icon: Languages, requiredPermission: "canManageSettings" },
      { title: "Translations", url: "/admin/translations", icon: Globe, requiredPermission: "canManageSettings" },
      { title: "RTL Settings", url: "/admin/site-settings", icon: Flag, requiredPermission: "canManageSettings" },
    ],
  },
  {
    id: "mailing",
    title: "Mailing",
    icon: Mail,
    items: [
      { title: "Campaigns", url: "/admin/campaigns", icon: Send, requiredPermission: "canViewAnalytics" },
      { title: "Templates", url: "/admin/templates", icon: LayoutTemplate, requiredPermission: "canCreate" },
      { title: "Subscribers", url: "/admin/newsletter", icon: Mail, requiredPermission: "canViewAnalytics" },
      { title: "Automation", url: "/admin/auto-pilot", icon: Zap, requiredPermission: "canManageSettings" },
    ],
  },
  {
    id: "automation",
    title: "Automation",
    icon: Workflow,
    items: [
      { title: "Workflows", url: "/admin/enterprise/workflows", icon: Workflow, requiredPermission: "canManageSettings" },
      { title: "Triggers", url: "/admin/enterprise/webhooks", icon: Webhook, requiredPermission: "canManageSettings" },
      { title: "Scheduling", url: "/admin/calendar", icon: Calendar, requiredPermission: "canViewAll" },
      { title: "Auto-Pilot", url: "/admin/auto-pilot", icon: Zap, requiredPermission: "canManageSettings" },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: BarChart3,
    items: [
      { title: "Traffic", url: "/admin/analytics", icon: BarChart3, requiredPermission: "canViewAnalytics" },
      { title: "Content Performance", url: "/admin/growth-dashboard", icon: TrendingUp, requiredPermission: "canViewAnalytics" },
      { title: "Search Analytics", url: "/admin/analytics/search", icon: Radar, requiredPermission: "canViewAnalytics" },
      { title: "User Behavior", url: "/admin/analytics/journey", icon: MousePointer, requiredPermission: "canViewAnalytics" },
    ],
  },
  {
    id: "social-media",
    title: "Social Media",
    icon: Share2,
    items: [
      { title: "Connected Accounts", url: "/admin/social", icon: Share2, requiredPermission: "canEdit" },
      { title: "Post Scheduler", url: "/admin/social", icon: Clock, requiredPermission: "canEdit" },
      { title: "Social Analytics", url: "/admin/social", icon: BarChart2, requiredPermission: "canViewAnalytics" },
    ],
  },
  {
    id: "integrations",
    title: "Integrations",
    icon: Link2,
    items: [
      { title: "Webhooks", url: "/admin/enterprise/webhooks", icon: Webhook, requiredPermission: "canManageSettings" },
      { title: "API Keys", url: "/admin/travi/api-keys", icon: Key, requiredPermission: "canManageSettings" },
      { title: "Import/Export", url: "/admin/ingestion", icon: Import, requiredPermission: "canManageSettings" },
    ],
  },
  {
    id: "monetization",
    title: "Monetization",
    icon: DollarSign,
    items: [
      { title: "Affiliates", url: "/admin/affiliate-links", icon: Link2, requiredPermission: "canAccessAffiliates" },
      { title: "Products", url: "/admin/monetization/premium", icon: Store, requiredPermission: "canManageSettings" },
      { title: "Revenue Reports", url: "/admin/monetization/affiliates", icon: DollarSign, requiredPermission: "canAccessAffiliates" },
    ],
  },
  {
    id: "referrals",
    title: "Referrals",
    icon: Gift,
    items: [
      { title: "Programs", url: "/admin/referrals", icon: Gift, requiredPermission: "canAccessAffiliates" },
      { title: "Analytics", url: "/admin/referrals", icon: BarChart2, requiredPermission: "canViewAnalytics" },
    ],
  },
  {
    id: "live-chat",
    title: "Live Chat",
    icon: MessageCircle,
    items: [
      { title: "Conversations", url: "/admin/chat", icon: MessageCircle, requiredPermission: "canViewAll" },
      { title: "Settings", url: "/admin/chat", icon: Settings, requiredPermission: "canManageSettings" },
    ],
  },
  {
    id: "help-center",
    title: "Help Center",
    icon: HelpCircle,
    items: [
      { title: "Knowledge Base", url: "/admin/help", icon: BookOpen },
      { title: "FAQs", url: "/admin/help", icon: HelpCircle },
    ],
  },
  {
    id: "security",
    title: "Security",
    icon: Shield,
    items: [
      { title: "Users & Roles", url: "/admin/users", icon: UsersRound, requiredPermission: "canManageUsers" },
      { title: "Activity Logs", url: "/admin/audit-logs", icon: ClipboardList, requiredPermission: "canViewAuditLogs" },
      { title: "Security Settings", url: "/admin/security", icon: Lock, requiredPermission: "canManageSettings" },
    ],
  },
  {
    id: "system",
    title: "System",
    icon: Cog,
    items: [
      { title: "General Settings", url: "/admin/settings", icon: Settings, requiredPermission: "canManageSettings" },
      { title: "Feature Flags", url: "/admin/site-settings", icon: Flag, requiredPermission: "canManageSettings" },
      { title: "QA Validation", url: "/admin/qa", icon: FileCheck, requiredPermission: "canManageSettings" },
      { title: "Cache Management", url: "/admin/settings", icon: Database, requiredPermission: "canManageSettings" },
      { title: "Logs", url: "/admin/logs", icon: ScrollText, requiredPermission: "canManageSettings" },
    ],
  },
  {
    id: "developer",
    title: "Developer",
    icon: Terminal,
    items: [
      { title: "API Docs", url: "/admin/travi/api-keys", icon: FileText, requiredPermission: "canManageSettings" },
      { title: "API Playground", url: "/admin/console", icon: Terminal, requiredPermission: "canManageSettings" },
      { title: "Debug Console", url: "/admin/console", icon: Bug, requiredPermission: "canManageSettings" },
    ],
  },
];

function CollapsibleNavGroup({ 
  module, 
  isActive, 
  hasPermission, 
  openModules, 
  toggleModule 
}: { 
  module: NavModule;
  isActive: (url: string) => boolean;
  hasPermission: (permission: PermissionKey) => boolean;
  openModules: Record<string, boolean>;
  toggleModule: (id: string) => void;
}) {
  const visibleItems = module.items.filter(item => {
    if (item.hidden) return false;
    if (!item.requiredPermission) return true;
    return hasPermission(item.requiredPermission);
  });

  if (visibleItems.length === 0) return null;

  const isOpen = openModules[module.id] ?? module.defaultOpen ?? false;
  const hasActiveItem = visibleItems.some(item => isActive(item.url));

  return (
    <Collapsible open={isOpen} onOpenChange={() => toggleModule(module.id)}>
      <SidebarGroup className="py-0">
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel 
            className={cn(
              "flex items-center justify-between cursor-pointer rounded-md px-2 py-1.5",
              hasActiveItem && "font-medium"
            )}
            data-testid={`nav-group-${module.id}`}
          >
            <div className="flex items-center gap-2">
              <module.icon className="h-4 w-4" />
              <span>{module.title}</span>
            </div>
            <ChevronDown 
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-180"
              )} 
            />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu className="pl-2">
              {visibleItems.map((item) => (
                <SidebarMenuItem key={`${module.id}-${item.url}-${item.title}`}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    className="h-8"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export function AppSidebar({ user }: AppSidebarProps) {
  const [location, setLocation] = useLocation();
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({
    dashboard: true,
    content: true,
  });

  const { data: permissionsResponse, isLoading: permissionsLoading } = useQuery<PermissionsResponse>({
    queryKey: ["/api/user/permissions"],
    enabled: !!user,
  });

  const hasPermission = (permission: PermissionKey): boolean => {
    if (!permissionsResponse) return false;
    if (permissionsResponse.permissions?.[permission] !== undefined) {
      return permissionsResponse.permissions[permission] === true;
    }
    return permissionsResponse[permission] === true;
  };

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

  const toggleModule = (moduleId: string) => {
    setOpenModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  return (
    <Sidebar className="border-r" data-testid="admin-sidebar">
      <SidebarHeader className="border-b p-4">
        <Link href="/admin" className="flex items-center gap-3" data-testid="nav-logo">
          <Mascot className="h-8 w-8" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">TRAVI CMS</span>
            <span className="text-xs text-muted-foreground">Admin Panel</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 overflow-y-auto">
        {sidebarModules.map((module) => (
          <CollapsibleNavGroup
            key={module.id}
            module={module}
            isActive={isActive}
            hasPermission={hasPermission}
            openModules={openModules}
            toggleModule={toggleModule}
          />
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate">{user.username}</span>
              <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

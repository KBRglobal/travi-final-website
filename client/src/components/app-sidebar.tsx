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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  MapPin,
  FileText,
  Settings,
  Users,
  LogOut,
  LayoutTemplate,
  PenTool,
  Activity,
  Radar,
  Workflow,
  Eye,
  ChevronDown,
  Palette,
  Bot,
  Cpu,
  Rss,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import type { User } from "@/hooks/use-auth";
import { Mascot } from "@/components/logo";
import { cn } from "@/lib/utils";

type PermissionKey =
  | "canCreate"
  | "canEdit"
  | "canEditOwn"
  | "canDelete"
  | "canPublish"
  | "canSubmitForReview"
  | "canManageUsers"
  | "canManageSettings"
  | "canViewAnalytics"
  | "canViewAuditLogs"
  | "canAccessMediaLibrary"
  | "canAccessAffiliates"
  | "canViewAll";

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
    items: [{ title: "Overview", url: "/admin", icon: LayoutDashboard }],
  },
  {
    id: "content",
    title: "Content",
    icon: FileText,
    defaultOpen: true,
    items: [
      { title: "Destinations", url: "/admin/destinations", icon: Radar },
      { title: "Attractions", url: "/admin/attractions", icon: MapPin },
      { title: "RSS Feeds", url: "/admin/rss-feeds", icon: Rss },
    ],
  },
  {
    id: "octypo-engine",
    title: "Octypo Engine",
    icon: Bot,
    defaultOpen: true,
    items: [
      { title: "Dashboard", url: "/admin/octypo/dashboard", icon: LayoutDashboard },
      { title: "Review Queue", url: "/admin/octypo/review-queue", icon: Eye },
      { title: "Writers Room", url: "/admin/octypo/writers-room", icon: PenTool },
      { title: "AI Agents", url: "/admin/octypo/ai-agents", icon: Bot },
      { title: "Workflows", url: "/admin/octypo/workflows", icon: Workflow },
      { title: "AI Engines", url: "/admin/octypo/engines", icon: Cpu },
      { title: "Queue Monitor", url: "/admin/octypo/queue-monitor", icon: Activity },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    items: [
      {
        title: "Site Settings",
        url: "/admin/site-settings",
        icon: Palette,
        requiredPermission: "canManageSettings",
      },
      {
        title: "Homepage Editor",
        url: "/admin/homepage",
        icon: LayoutTemplate,
        requiredPermission: "canManageSettings",
      },
      {
        title: "General Settings",
        url: "/admin/settings",
        icon: Settings,
        requiredPermission: "canManageSettings",
      },
    ],
  },
];

function CollapsibleNavGroup({
  module,
  isActive,
  hasPermission,
  openModules,
  toggleModule,
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
              className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")}
            />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu className="pl-2">
              {visibleItems.map(item => (
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

  const { data: permissionsResponse, isLoading: permissionsLoading } =
    useQuery<PermissionsResponse>({
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
        {sidebarModules.map(module => (
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
              <span className="text-sm font-medium truncate">
                {user.firstName || user.email || "User"}
              </span>
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

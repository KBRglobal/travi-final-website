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
  FileText,
  MapPin,
  Radar,
  Image,
  LayoutDashboard,
  Zap,
  Bot,
  Eye,
  Activity,
  BarChart3,
  Search,
  TrendingUp,
  Settings,
  Users,
  Link2,
  Shield,
  ScrollText,
  Terminal,
  ChevronDown,
  ChevronRight,
  LogOut,
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
}

interface NavCategory {
  id: string;
  title: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
  defaultOpen?: boolean;
  collapsedByDefault?: boolean;
}

interface AdminSidebarProps {
  user?: User | null;
}

// New 5-category navigation structure
const navigationCategories: NavCategory[] = [
  {
    id: "content",
    title: "CONTENT",
    icon: FileText,
    defaultOpen: true,
    items: [
      { title: "Destinations", url: "/admin/destinations", icon: Radar },
      { title: "Attractions", url: "/admin/attractions", icon: MapPin },
      { title: "Articles", url: "/admin/articles", icon: FileText },
      { title: "Static Pages", url: "/admin/static-pages", icon: FileText },
      { title: "Media", url: "/admin/media", icon: Image },
    ],
  },
  {
    id: "octypo",
    title: "OCTYPO",
    icon: Bot,
    defaultOpen: true,
    items: [
      { title: "Dashboard", url: "/admin/octypo/dashboard", icon: LayoutDashboard },
      { title: "Autopilot", url: "/admin/octypo/autopilot", icon: Zap },
      { title: "AI Agents", url: "/admin/octypo/ai-agents", icon: Bot },
      { title: "Queue", url: "/admin/octypo/queue-monitor", icon: Activity },
    ],
  },
  {
    id: "analytics-seo",
    title: "ANALYTICS & SEO",
    icon: BarChart3,
    defaultOpen: true,
    items: [
      {
        title: "Overview",
        url: "/admin/analytics",
        icon: BarChart3,
        requiredPermission: "canViewAnalytics",
      },
      {
        title: "SEO Hub",
        url: "/admin/seo-hub",
        icon: Search,
        requiredPermission: "canViewAnalytics",
      },
      {
        title: "Performance",
        url: "/admin/growth-dashboard",
        icon: TrendingUp,
        requiredPermission: "canViewAnalytics",
      },
    ],
  },
  {
    id: "settings",
    title: "SETTINGS",
    icon: Settings,
    defaultOpen: false,
    items: [
      {
        title: "Site Config",
        url: "/admin/settings-hub",
        icon: Settings,
        requiredPermission: "canManageSettings",
      },
      {
        title: "Users & Roles",
        url: "/admin/users",
        icon: Users,
        requiredPermission: "canManageUsers",
      },
    ],
  },
  {
    id: "operations",
    title: "OPERATIONS",
    icon: Shield,
    collapsedByDefault: true,
    items: [
      {
        title: "System Health",
        url: "/admin/system-health",
        icon: Activity,
        requiredPermission: "canManageSettings",
      },
      {
        title: "Audit Logs",
        url: "/admin/audit-logs",
        icon: ScrollText,
        requiredPermission: "canViewAuditLogs",
      },
      {
        title: "Console",
        url: "/admin/console",
        icon: Terminal,
        requiredPermission: "canManageSettings",
      },
    ],
  },
];

function NavCategoryGroup({
  category,
  isActive,
  hasPermission,
  openCategories,
  toggleCategory,
}: {
  category: NavCategory;
  isActive: (url: string) => boolean;
  hasPermission: (permission: PermissionKey) => boolean;
  openCategories: Record<string, boolean>;
  toggleCategory: (id: string) => void;
}) {
  const visibleItems = category.items.filter(item => {
    if (!item.requiredPermission) return true;
    return hasPermission(item.requiredPermission);
  });

  if (visibleItems.length === 0) return null;

  const isOpen =
    openCategories[category.id] ?? (category.defaultOpen && !category.collapsedByDefault);
  const hasActiveItem = visibleItems.some(item => isActive(item.url));

  return (
    <Collapsible open={isOpen} onOpenChange={() => toggleCategory(category.id)}>
      <SidebarGroup className="py-0.5">
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel
            className={cn(
              "flex items-center justify-between cursor-pointer px-3 py-2 text-[11px] font-medium tracking-wide",
              "text-[hsl(var(--admin-text-muted))] hover:text-[hsl(var(--admin-text-secondary))]",
              "transition-colors duration-150",
              hasActiveItem && "text-[hsl(var(--admin-text-secondary))]"
            )}
            data-testid={`nav-group-${category.id}`}
          >
            <span>{category.title}</span>
            {isOpen ? (
              <ChevronDown className="h-3 w-3 opacity-50" />
            ) : (
              <ChevronRight className="h-3 w-3 opacity-50" />
            )}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {visibleItems.map(item => (
                <SidebarMenuItem key={`${category.id}-${item.url}`}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    className={cn(
                      "h-8 px-3 gap-2.5 rounded-[var(--admin-radius-sm)]",
                      "text-[13px] font-normal",
                      "text-[hsl(var(--admin-text-secondary))]",
                      "hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text))]",
                      "transition-all duration-150",
                      isActive(item.url) &&
                        "bg-[hsl(var(--admin-surface-active))] text-[hsl(var(--admin-text))] font-medium"
                    )}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4 opacity-60" />
                      <span>{item.title}</span>
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

export function AdminSidebar({ user }: AdminSidebarProps) {
  const [location, setLocation] = useLocation();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navigationCategories.forEach(cat => {
      initial[cat.id] = cat.defaultOpen && !cat.collapsedByDefault;
    });
    return initial;
  });

  const { data: permissionsResponse } = useQuery<PermissionsResponse>({
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

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  return (
    <Sidebar
      className="border-r border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))]"
      data-testid="admin-sidebar"
      style={{ width: "var(--admin-sidebar-width)" }}
    >
      <SidebarHeader className="border-b border-[hsl(var(--admin-border-subtle))] px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2.5" data-testid="nav-logo">
          <Mascot className="h-7 w-7" />
          <span className="text-[15px] font-semibold text-[hsl(var(--admin-text))]">
            TRAVI Admin
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 overflow-y-auto">
        {navigationCategories.map(category => (
          <NavCategoryGroup
            key={category.id}
            category={category}
            isActive={isActive}
            hasPermission={hasPermission}
            openCategories={openCategories}
            toggleCategory={toggleCategory}
          />
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-[hsl(var(--admin-border-subtle))] p-3">
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-2">
            <div className="h-7 w-7 rounded-full bg-[hsl(var(--admin-surface-active))] flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-[hsl(var(--admin-text-secondary))]" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[13px] font-medium text-[hsl(var(--admin-text))] truncate">
                {user.firstName || user.email || "User"}
              </span>
              <span className="text-[11px] text-[hsl(var(--admin-text-muted))] capitalize">
                {user.role}
              </span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-2 h-8",
            "text-[13px] text-[hsl(var(--admin-text-secondary))]",
            "hover:bg-[hsl(var(--admin-surface-hover))] hover:text-[hsl(var(--admin-text))]"
          )}
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

// Re-export with original name for backward compatibility
export { AdminSidebar as AppSidebar };

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MapPin,
  Building2,
  FileText,
  Utensils,
  Plus,
  Settings,
  Image,
  Rss,
  Lightbulb,
  BarChart3,
  Users,
  Globe,
  Hash,
  Link2,
  Calendar,
  ArrowRight,
  Command,
  LayoutDashboard,
  Sparkles,
  LayoutTemplate,
  SearchCheck,
} from "lucide-react";
import type { ContentWithRelations } from "@shared/schema";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Quick actions configuration
const quickActions = [
  { id: "new-attraction", label: "New Attraction", icon: MapPin, href: "/admin/attractions/new", category: "create" },
  { id: "new-hotel", label: "New Hotel", icon: Building2, href: "/admin/hotels/new", category: "create" },
  { id: "new-article", label: "New Article", icon: FileText, href: "/admin/articles/new", category: "create" },
  { id: "new-dining", label: "New Restaurant", icon: Utensils, href: "/admin/dining/new", category: "create" },
];

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/admin", category: "navigate" },
  { id: "calendar", label: "Content Calendar", icon: Calendar, href: "/admin/calendar", category: "navigate" },
  { id: "attractions", label: "Attractions", icon: MapPin, href: "/admin/attractions", category: "navigate" },
  { id: "hotels", label: "Hotels", icon: Building2, href: "/admin/hotels", category: "navigate" },
  { id: "articles", label: "Articles", icon: FileText, href: "/admin/articles", category: "navigate" },
  { id: "dining", label: "Dining", icon: Utensils, href: "/admin/dining", category: "navigate" },
  { id: "media", label: "Media Library", icon: Image, href: "/admin/media", category: "navigate" },
  { id: "rss", label: "RSS Feeds", icon: Rss, href: "/admin/rss-feeds", category: "navigate" },
  { id: "topics", label: "Topic Bank", icon: Lightbulb, href: "/admin/topic-bank", category: "navigate" },
  { id: "keywords", label: "Keywords", icon: Hash, href: "/admin/keywords", category: "navigate" },
  { id: "translations", label: "Translations", icon: Globe, href: "/admin/translations", category: "navigate" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: "/admin/analytics", category: "navigate" },
  { id: "seo-audit", label: "SEO Audit", icon: SearchCheck, href: "/admin/seo-audit", category: "navigate" },
  { id: "affiliates", label: "Affiliate Links", icon: Link2, href: "/admin/affiliate-links", category: "navigate" },
  { id: "ai-generator", label: "AI Generator", icon: Sparkles, href: "/admin/ai-generator", category: "navigate" },
  { id: "templates", label: "Templates", icon: LayoutTemplate, href: "/admin/templates", category: "navigate" },
  { id: "users", label: "Users", icon: Users, href: "/admin/users", category: "navigate" },
  { id: "settings", label: "Settings", icon: Settings, href: "/admin/settings", category: "navigate" },
];

// Content type icons
const contentTypeIcons: Record<string, React.ElementType> = {
  attraction: MapPin,
  hotel: Building2,
  article: FileText,
  dining: Utensils,
};

const contentTypeColors: Record<string, string> = {
  attraction: "text-blue-600",
  hotel: "text-[#6443F4]",
  article: "text-green-600",
  dining: "text-orange-600",
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch contents for search
  const { data: contents = [] } = useQuery<ContentWithRelations[]>({
    queryKey: ["/api/contents"],
    enabled: open,
  });

  // Filter and organize results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();

    // If no query, show quick actions and navigation
    if (!q) {
      return {
        actions: quickActions.slice(0, 4),
        navigation: navigationItems.slice(0, 6),
        contents: [],
      };
    }

    // Filter quick actions
    const filteredActions = quickActions.filter(
      (item) => item.label.toLowerCase().includes(q)
    );

    // Filter navigation
    const filteredNav = navigationItems.filter(
      (item) => item.label.toLowerCase().includes(q)
    );

    // Filter contents
    const filteredContent = contents
      .filter((c) =>
        c.title?.toLowerCase().includes(q) ||
        c.slug?.toLowerCase().includes(q) ||
        c.type?.toLowerCase().includes(q)
      )
      .slice(0, 8);

    return {
      actions: filteredActions,
      navigation: filteredNav,
      contents: filteredContent,
    };
  }, [query, contents]);

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    const items: Array<{ type: "action" | "nav" | "contents"; item: any }> = [];

    results.actions.forEach((item) => items.push({ type: "action", item }));
    results.navigation.forEach((item) => items.push({ type: "nav", item }));
    results.contents.forEach((item) => items.push({ type: "contents", item }));

    return items;
  }, [results]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        const selected = flatResults[selectedIndex];
        if (selected) {
          handleSelect(selected);
        }
        break;
      case "Escape":
        onOpenChange(false);
        break;
    }
  }, [flatResults, selectedIndex, onOpenChange]);

  // Handle selection
  const handleSelect = (result: { type: string; item: any }) => {
    onOpenChange(false);
    setQuery("");

    if (result.type === "action" || result.type === "nav") {
      navigate(result.item.href);
    } else if (result.type === "contents") {
      navigate(`/admin/${result.item.type}s/${result.item.id}`);
    }
  };

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  let currentIndex = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search contents, pages, actions..."
            className="border-0 focus-visible:ring-0 text-lg placeholder:text-muted-foreground/60"
            autoFocus
          />
          <Badge variant="outline" className="ml-2 text-xs">
            <Command className="h-3 w-3 mr-1" />K
          </Badge>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[400px]">
          <div className="p-2">
            {/* Quick Actions */}
            {results.actions.length > 0 && (
              <div className="mb-4">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Quick Actions
                </div>
                {results.actions.map((action) => {
                  const Icon = action.icon;
                  const isSelected = currentIndex === selectedIndex;
                  const itemIndex = currentIndex++;

                  return (
                    <button
                      key={action.id}
                      onClick={() => handleSelect({ type: "action", item: action })}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${isSelected ? "bg-primary/20" : "bg-muted"}`}>
                        <Plus className="h-4 w-4" />
                      </div>
                      <span className="flex-1 font-medium">{action.label}</span>
                      <ArrowRight className={`h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Navigation */}
            {results.navigation.length > 0 && (
              <div className="mb-4">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pages
                </div>
                {results.navigation.map((item) => {
                  const Icon = item.icon;
                  const isSelected = currentIndex === selectedIndex;
                  const itemIndex = currentIndex++;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect({ type: "nav", item })}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${isSelected ? "bg-primary/20" : "bg-muted"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="flex-1">{item.label}</span>
                      <ArrowRight className={`h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Content Results */}
            {results.contents.length > 0 && (
              <div>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Content
                </div>
                {results.contents.map((contents) => {
                  const Icon = contentTypeIcons[contents.type] || FileText;
                  const colorClass = contentTypeColors[contents.type] || "text-gray-600";
                  const isSelected = currentIndex === selectedIndex;
                  const itemIndex = currentIndex++;

                  return (
                    <button
                      key={contents.id}
                      onClick={() => handleSelect({ type: "contents", item: contents })}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${isSelected ? "bg-primary/20" : "bg-muted"}`}>
                        <Icon className={`h-4 w-4 ${colorClass}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{contents.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="capitalize">{contents.type}</span>
                          <span>•</span>
                          <span className="capitalize">{contents.status}</span>
                        </div>
                      </div>
                      <ArrowRight className={`h-4 w-4 shrink-0 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                    </button>
                  );
                })}
              </div>
            )}

            {/* No Results */}
            {query && flatResults.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No results for "{query}"</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground bg-muted/30">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
            Close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for global keyboard shortcut
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}

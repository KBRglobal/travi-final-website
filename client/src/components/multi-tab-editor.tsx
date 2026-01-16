import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  X,
  MoreHorizontal,
  ChevronDown,
  FileText,
  MapPin,
  Building2,
  Utensils,
  Calendar,
  Route,
  Dot,
  ExternalLink,
  XCircle,
  Layers,
} from "lucide-react";

// Tab interface
export interface EditorTab {
  id: string;
  contentId: string;
  contentType: string;
  title: string;
  path: string;
  isDirty: boolean;
  isNew: boolean;
}

// Context interface
interface MultiTabContextValue {
  tabs: EditorTab[];
  activeTabId: string | null;
  openTab: (tab: Omit<EditorTab, "isDirty" | "isNew">) => void;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
  setActiveTab: (id: string) => void;
  markDirty: (id: string, dirty: boolean) => void;
  updateTabTitle: (id: string, title: string) => void;
  getTab: (id: string) => EditorTab | undefined;
}

// Create context
const MultiTabContext = createContext<MultiTabContextValue | null>(null);

// Hook to use multi-tab context
export function useMultiTab() {
  const context = useContext(MultiTabContext);
  if (!context) {
    throw new Error("useMultiTab must be used within MultiTabProvider");
  }
  return context;
}

// Optional hook that doesn't throw
export function useMultiTabOptional() {
  return useContext(MultiTabContext);
}

// Provider component
interface MultiTabProviderProps {
  children: ReactNode;
}

export function MultiTabProvider({ children }: MultiTabProviderProps) {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openTab = useCallback(
    (newTab: Omit<EditorTab, "isDirty" | "isNew">) => {
      setTabs((current) => {
        // Check if tab already exists
        const existing = current.find(
          (t) =>
            t.contentId === newTab.contentId && t.contentType === newTab.contentType
        );
        if (existing) {
          setActiveTabId(existing.id);
          return current;
        }

        // Create new tab
        const tab: EditorTab = {
          ...newTab,
          isDirty: false,
          isNew: newTab.contentId === "new",
        };

        setActiveTabId(tab.id);
        return [...current, tab];
      });
    },
    []
  );

  const closeTab = useCallback(
    (id: string) => {
      setTabs((current) => {
        const index = current.findIndex((t) => t.id === id);
        if (index === -1) return current;

        const newTabs = current.filter((t) => t.id !== id);

        // If closing active tab, switch to adjacent tab
        if (activeTabId === id && newTabs.length > 0) {
          const newIndex = Math.min(index, newTabs.length - 1);
          setActiveTabId(newTabs[newIndex].id);
        } else if (newTabs.length === 0) {
          setActiveTabId(null);
        }

        return newTabs;
      });
    },
    [activeTabId]
  );

  const closeOtherTabs = useCallback((id: string) => {
    setTabs((current) => current.filter((t) => t.id === id));
    setActiveTabId(id);
  }, []);

  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  const setActiveTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const markDirty = useCallback((id: string, dirty: boolean) => {
    setTabs((current) =>
      current.map((t) => (t.id === id ? { ...t, isDirty: dirty } : t))
    );
  }, []);

  const updateTabTitle = useCallback((id: string, title: string) => {
    setTabs((current) =>
      current.map((t) => (t.id === id ? { ...t, title, isNew: false } : t))
    );
  }, []);

  const getTab = useCallback(
    (id: string) => tabs.find((t) => t.id === id),
    [tabs]
  );

  return (
    <MultiTabContext.Provider
      value={{
        tabs,
        activeTabId,
        openTab,
        closeTab,
        closeOtherTabs,
        closeAllTabs,
        setActiveTab,
        markDirty,
        updateTabTitle,
        getTab,
      }}
    >
      {children}
    </MultiTabContext.Provider>
  );
}

// Content type icons
const typeIcons: Record<string, typeof FileText> = {
  article: FileText,
  attraction: MapPin,
  hotel: Building2,
  dining: Utensils,
  event: Calendar,
  itinerary: Route,
};

// Tab bar component
interface TabBarProps {
  className?: string;
}

export function EditorTabBar({ className }: TabBarProps) {
  const [, navigate] = useLocation();
  const { tabs, activeTabId, closeTab, closeOtherTabs, closeAllTabs, setActiveTab } =
    useMultiTab();

  if (tabs.length === 0) return null;

  const handleTabClick = (tab: EditorTab) => {
    setActiveTab(tab.id);
    navigate(tab.path);
  };

  const handleCloseTab = (e: React.MouseEvent, tab: EditorTab) => {
    e.stopPropagation();
    if (tab.isDirty) {
      // Could show confirmation dialog here
      if (!confirm("You have unsaved changes. Close anyway?")) {
        return;
      }
    }
    closeTab(tab.id);
  };

  return (
    <div className={`border-b bg-muted/30 ${className}`}>
      <div className="flex items-center">
        <ScrollArea className="flex-1">
          <div className="flex items-center gap-0.5 p-1">
            {tabs.map((tab) => {
              const Icon = typeIcons[tab.contentType] || FileText;
              const isActive = tab.id === activeTabId;

              return (
                <div
                  key={tab.id}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors min-w-0 max-w-[200px] ${
                    isActive
                      ? "bg-background shadow-sm border"
                      : "hover:bg-background/50"
                  }`}
                  onClick={() => handleTabClick(tab)}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm truncate flex items-center gap-1">
                        {tab.isDirty && (
                          <Dot className="h-4 w-4 -ml-2 text-orange-500" />
                        )}
                        {tab.title || "Untitled"}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tab.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {tab.contentType}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <button
                    onClick={(e) => handleCloseTab(e, tab)}
                    className={`h-4 w-4 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted ${
                      isActive ? "opacity-100" : ""
                    }`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Tab actions */}
        {tabs.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 mr-1">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  const activeTab = tabs.find((t) => t.id === activeTabId);
                  if (activeTab) {
                    window.open(activeTab.path, "_blank");
                  }
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Window
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => activeTabId && closeOtherTabs(activeTabId)}>
                <XCircle className="h-4 w-4 mr-2" />
                Close Other Tabs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={closeAllTabs} className="text-destructive">
                <Layers className="h-4 w-4 mr-2" />
                Close All Tabs
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// Hook to register current editor as a tab
export function useRegisterTab(
  contentType: string,
  contentId: string,
  title: string
) {
  const context = useMultiTabOptional();
  const [, navigate] = useLocation();

  const registerTab = useCallback(() => {
    if (!context) return;

    const tabId = `${contentType}-${contentId}`;
    const path = `/admin/${contentType}s/${contentId}`;

    context.openTab({
      id: tabId,
      contentId,
      contentType,
      title: title || "Untitled",
      path,
    });
  }, [context, contentType, contentId, title]);

  const markDirty = useCallback(
    (dirty: boolean) => {
      if (!context) return;
      const tabId = `${contentType}-${contentId}`;
      context.markDirty(tabId, dirty);
    },
    [context, contentType, contentId]
  );

  const updateTitle = useCallback(
    (newTitle: string) => {
      if (!context) return;
      const tabId = `${contentType}-${contentId}`;
      context.updateTabTitle(tabId, newTitle);
    },
    [context, contentType, contentId]
  );

  return { registerTab, markDirty, updateTitle };
}

// Component to show tab count badge
interface TabCountBadgeProps {
  className?: string;
}

export function TabCountBadge({ className }: TabCountBadgeProps) {
  const context = useMultiTabOptional();

  if (!context || context.tabs.length === 0) return null;

  const dirtyCount = context.tabs.filter((t) => t.isDirty).length;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Layers className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">{context.tabs.length}</span>
      {dirtyCount > 0 && (
        <span className="text-xs text-orange-500">({dirtyCount} unsaved)</span>
      )}
    </div>
  );
}

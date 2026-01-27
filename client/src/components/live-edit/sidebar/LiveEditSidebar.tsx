import { motion, AnimatePresence } from "framer-motion";
import { X, Layers, Settings, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLiveEditStore } from "@/stores/liveEditStore";
import { ComponentLibrary } from "./ComponentLibrary";
import { ComponentSettings } from "./ComponentSettings";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { cn } from "@/lib/utils";

export function LiveEditSidebar() {
  const { isRTL } = useLocale();
  const {
    isEditMode,
    isPreviewMode,
    sidebarOpen,
    sidebarTab,
    selectedComponentId,
    setSidebarOpen,
    setSidebarTab,
  } = useLiveEditStore();

  // Don't render in preview mode or when not editing
  if (!isEditMode || isPreviewMode) {
    return null;
  }

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.div
          initial={{ x: isRTL ? -320 : 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: isRTL ? -320 : 320, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(
            "fixed top-14 bottom-0 w-80 bg-background border-s shadow-xl z-40",
            "flex flex-col",
            isRTL ? "left-0" : "right-0"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Edit Panel</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs
            value={sidebarTab}
            onValueChange={v => setSidebarTab(v as any)}
            className="flex-1 flex flex-col"
          >
            <TabsList className="grid grid-cols-3 mx-4 mt-4">
              <TabsTrigger value="components" className="gap-1">
                <Layers className="w-3.5 h-3.5" />
                <span className="text-xs">Components</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1" disabled={!selectedComponentId}>
                <Settings className="w-3.5 h-3.5" />
                <span className="text-xs">Settings</span>
              </TabsTrigger>
              <TabsTrigger value="contents" className="gap-1">
                <FileText className="w-3.5 h-3.5" />
                <span className="text-xs">Content</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="components" className="flex-1 p-4 overflow-auto">
              <ComponentLibrary />
            </TabsContent>

            <TabsContent value="settings" className="flex-1 p-4 overflow-auto">
              {selectedComponentId ? (
                <ComponentSettings />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a component to edit</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="contents" className="flex-1 p-4 overflow-auto">
              <div className="text-center text-muted-foreground py-8">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Pick contents from CMS</p>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

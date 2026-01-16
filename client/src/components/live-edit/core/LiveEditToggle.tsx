import { useCallback } from "react";
import { Pencil, X, Eye, EyeOff, Save, Undo, Redo, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLiveEditStore } from "@/stores/liveEditStore";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LiveEditToggleProps {
  pageSlug: string;
  className?: string;
}

export function LiveEditToggle({ pageSlug, className }: LiveEditToggleProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    isEditMode,
    isPreviewMode,
    isSaving,
    isPublishing,
    hasUnsavedChanges,
    canUndo,
    canRedo,
    enterEditMode,
    exitEditMode,
    togglePreviewMode,
    saveDraft,
    publishChanges,
    undo,
    redo,
    openDialog,
  } = useLiveEditStore();

  // Only show for admin/editor users
  const canEdit = user && ["admin", "editor", "author"].includes(user.role);

  const handleEnterEdit = useCallback(async () => {
    try {
      await enterEditMode(pageSlug);
      toast({
        title: "מצב עריכה",
        description: "כעת אפשר לערוך את העמוד",
      });
    } catch (error) {
      console.error("Failed to enter edit mode:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן להיכנס למצב עריכה",
        variant: "destructive",
      });
    }
  }, [enterEditMode, pageSlug, toast]);

  const handleSave = useCallback(async () => {
    try {
      await saveDraft();
      toast({
        title: "נשמר",
        description: "הטיוטה נשמרה בהצלחה",
      });
    } catch (error) {
      console.error("Failed to save:", error);
      toast({
        title: "שגיאה בשמירה",
        description: "לא ניתן לשמור את השינויים",
        variant: "destructive",
      });
    }
  }, [saveDraft, toast]);

  const handlePublish = useCallback(() => {
    openDialog("publish");
  }, [openDialog]);

  if (!canEdit) return null;

  // Show simple edit button when not in edit mode
  if (!isEditMode) {
    return (
      <Button
        onClick={handleEnterEdit}
        className={cn(
          "fixed bottom-6 right-6 z-50 rounded-full shadow-lg",
          "bg-secondary hover:bg-secondary/90 text-white",
          "h-14 w-14 p-0",
          className
        )}
        title="Edit Page"
      >
        <Pencil className="w-5 h-5" />
      </Button>
    );
  }

  // Show full toolbar when in edit mode - positioned bottom-right to avoid overlapping footer CTAs
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "flex items-center gap-2 p-2 rounded-full",
        "bg-background border shadow-xl",
        className
      )}
    >
      {/* Undo/Redo */}
      <div className="flex items-center gap-1 px-2 border-r border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={undo}
          disabled={!canUndo}
          className="h-9 w-9 rounded-full"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={redo}
          disabled={!canRedo}
          className="h-9 w-9 rounded-full"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      {/* Preview Toggle */}
      <Button
        variant={isPreviewMode ? "secondary" : "ghost"}
        size="sm"
        onClick={togglePreviewMode}
        className="rounded-full"
      >
        {isPreviewMode ? (
          <>
            <EyeOff className="w-4 h-4 mr-1" />
            Exit Preview
          </>
        ) : (
          <>
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </>
        )}
      </Button>

      {/* Save */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSave}
        disabled={isSaving || !hasUnsavedChanges}
        className="rounded-full"
      >
        <Save className="w-4 h-4 mr-1" />
        {isSaving ? "Saving..." : "Save"}
      </Button>

      {/* Publish */}
      <Button
        variant="default"
        size="sm"
        onClick={handlePublish}
        disabled={isPublishing || hasUnsavedChanges}
        className="rounded-full bg-green-600 hover:bg-green-700"
      >
        <Upload className="w-4 h-4 mr-1" />
        {isPublishing ? "Publishing..." : "Publish"}
      </Button>

      {/* Unsaved indicator */}
      {hasUnsavedChanges && (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
          Unsaved
        </Badge>
      )}

      {/* Exit */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => exitEditMode()}
        className="h-9 w-9 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
        title="Exit Edit Mode"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

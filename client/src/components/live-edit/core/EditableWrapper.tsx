import { ReactNode, useCallback, MouseEvent } from "react";
import { Trash2, Copy, GripVertical, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLiveEditStore } from "@/stores/liveEditStore";
import { cn } from "@/lib/utils";

interface EditableWrapperProps {
  id: string;
  children: ReactNode;
  className?: string;
  showControls?: boolean;
}

export function EditableWrapper({
  id,
  children,
  className,
  showControls = true,
}: EditableWrapperProps) {
  const {
    isEditMode,
    isPreviewMode,
    selectedComponentId,
    hoveredComponentId,
    selectComponent,
    hoverComponent,
    removeComponent,
    duplicateComponent,
    setSidebarTab,
  } = useLiveEditStore();

  const isSelected = selectedComponentId === id;
  const isHovered = hoveredComponentId === id;

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!isEditMode || isPreviewMode) return;
      e.stopPropagation();
      selectComponent(id);
    },
    [isEditMode, isPreviewMode, selectComponent, id]
  );

  const handleMouseEnter = useCallback(() => {
    if (!isEditMode || isPreviewMode) return;
    hoverComponent(id);
  }, [isEditMode, isPreviewMode, hoverComponent, id]);

  const handleMouseLeave = useCallback(() => {
    if (!isEditMode || isPreviewMode) return;
    hoverComponent(null);
  }, [isEditMode, isPreviewMode, hoverComponent]);

  const handleDelete = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (confirm("Are you sure you want to delete this component?")) {
        removeComponent(id);
      }
    },
    [removeComponent, id]
  );

  const handleDuplicate = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      duplicateComponent(id);
    },
    [duplicateComponent, id]
  );

  const handleSettings = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      selectComponent(id);
      setSidebarTab("settings");
    },
    [selectComponent, setSidebarTab, id]
  );

  // In preview mode or not edit mode, just render children
  if (!isEditMode || isPreviewMode) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "relative group transition-all duration-150",
        // Selection/hover outline
        isSelected && "ring-2 ring-secondary ring-offset-2",
        isHovered && !isSelected && "ring-2 ring-secondary/50 ring-offset-1",
        className
      )}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-component-id={id}
    >
      {children}

      {/* Component controls - only show when selected or hovered */}
      {showControls && (isSelected || isHovered) && (
        <div
          className={cn(
            "absolute -top-10 left-0 z-50",
            "flex items-center gap-1 p-1 rounded-lg",
            "bg-background border shadow-lg",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            isSelected && "opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </Button>

          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleSettings}
            title="Component Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>

          {/* Duplicate */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleDuplicate}
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={handleDelete}
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

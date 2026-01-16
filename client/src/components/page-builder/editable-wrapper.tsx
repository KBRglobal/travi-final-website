import { ReactNode, useCallback, MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit3, Move, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLiveEdit, useIsPageBuilderEditMode } from "./live-edit-provider";
import { cn } from "@/lib/utils";
import type { PageSection } from "@shared/schema";

interface PageBuilderEditableWrapperProps {
  section: PageSection;
  children: ReactNode;
  className?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onToggleVisibility?: () => void;
}

export function PageBuilderEditableWrapper({
  section,
  children,
  className,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleVisibility,
}: PageBuilderEditableWrapperProps) {
  const isEditMode = useIsPageBuilderEditMode();
  const {
    selectedSection,
    hoveredSectionId,
    selectSection,
    hoverSection,
    updateSection,
  } = useLiveEdit();

  const isSelected = selectedSection?.id === section.id;
  const isHovered = hoveredSectionId === section.id;

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!isEditMode) return;
      e.stopPropagation();
      selectSection(section);
      onEdit?.();
    },
    [isEditMode, selectSection, section, onEdit]
  );

  const handleMouseEnter = useCallback(() => {
    if (!isEditMode) return;
    hoverSection(section.id);
  }, [isEditMode, hoverSection, section.id]);

  const handleMouseLeave = useCallback(() => {
    if (!isEditMode) return;
    hoverSection(null);
  }, [isEditMode, hoverSection]);

  const handleDelete = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (window.confirm("Are you sure you want to delete this section?")) {
        onDelete?.();
      }
    },
    [onDelete]
  );

  const handleDuplicate = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      onDuplicate?.();
    },
    [onDuplicate]
  );

  const handleToggleVisibility = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      updateSection(section.id, { isVisible: !section.isVisible });
      onToggleVisibility?.();
    },
    [section.id, section.isVisible, updateSection, onToggleVisibility]
  );

  const handleEditClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      selectSection(section);
      onEdit?.();
    },
    [selectSection, section, onEdit]
  );

  if (!isEditMode) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "relative group transition-all duration-200",
        isSelected && "ring-2 ring-primary ring-offset-2",
        isHovered && !isSelected && "ring-2 ring-primary/40 ring-offset-1",
        !section.isVisible && "opacity-50",
        className
      )}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-section-id={section.id}
      data-section-type={section.sectionType}
      data-testid={`editable-section-${section.id}`}
    >
      {children}

      <AnimatePresence>
        {(isSelected || isHovered) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute -top-12 left-1/2 -translate-x-1/2 z-50",
              "flex items-center gap-1 p-1.5 rounded-lg",
              "bg-background border shadow-lg"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-grab active:cursor-grabbing"
              title="Drag to reorder"
              data-testid="section-drag-handle"
            >
              <Move className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleEditClick}
              title="Edit section"
              data-testid="section-edit-button"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleToggleVisibility}
              title={section.isVisible ? "Hide section" : "Show section"}
              data-testid="section-visibility-toggle"
            >
              {section.isVisible ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
            </Button>

            {onDuplicate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleDuplicate}
                title="Duplicate section"
                data-testid="section-duplicate-button"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            )}

            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={handleDelete}
                title="Delete section"
                data-testid="section-delete-button"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none border-2 border-primary/50 border-dashed rounded-sm"
          />
        )}
      </AnimatePresence>

      <div
        className={cn(
          "absolute bottom-2 left-2 z-40",
          "px-2 py-1 rounded text-xs font-medium",
          "bg-background border shadow-sm",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          isSelected && "opacity-100"
        )}
      >
        {section.sectionType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
      </div>
    </div>
  );
}

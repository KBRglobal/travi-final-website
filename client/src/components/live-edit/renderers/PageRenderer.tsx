import { useEffect } from "react";
import { useLiveEditStore, useIsEditMode } from "@/stores/liveEditStore";
import { ComponentRenderer } from "./ComponentRenderer";
import { LiveEditToggle } from "../core/LiveEditToggle";
import { LiveEditSidebar } from "../sidebar/LiveEditSidebar";
import { LiveEditDialogs } from "../dialogs/LiveEditDialogs";
import { DragDropProvider } from "../providers/DragDropProvider";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface PageRendererProps {
  pageSlug: string;
  fallbackContent?: React.ReactNode;
  className?: string;
}

function SortableComponent({ id, children }: { id: string; children: React.ReactNode }) {
  const isEditMode = useIsEditMode();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-50")}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

export function PageRenderer({ pageSlug, fallbackContent, className }: PageRendererProps) {
  const isEditMode = useIsEditMode();
  const {
    componentOrder,
    currentLayout,
    isLoading,
    loadLayout,
  } = useLiveEditStore();

  // Load layout on mount
  useEffect(() => {
    loadLayout(pageSlug);
  }, [pageSlug, loadLayout]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Show fallback if no components and not editing
  if (componentOrder.length === 0 && !isEditMode) {
    return <>{fallbackContent}</>;
  }

  const contents = (
    <div className={cn("relative", className)}>
      {componentOrder.map((compId) => {
        const component = currentLayout[compId];
        if (!component) return null;

        if (isEditMode) {
          return (
            <SortableComponent key={compId} id={compId}>
              <ComponentRenderer component={component} />
            </SortableComponent>
          );
        }

        return <ComponentRenderer key={compId} component={component} />;
      })}

      {/* Empty state in edit mode */}
      {isEditMode && componentOrder.length === 0 && (
        <div className="py-16 text-center border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <p className="text-muted-foreground">
            גרור רכיבים לכאן או בחר מהסרגל הצדדי
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Edit mode toggle button */}
      <LiveEditToggle pageSlug={pageSlug} />

      {/* Wrap in DragDropProvider when editing */}
      {isEditMode ? (
        <DragDropProvider>
          {contents}
        </DragDropProvider>
      ) : (
        contents
      )}

      {/* Sidebar and dialogs */}
      {isEditMode && (
        <>
          <LiveEditSidebar />
          <LiveEditDialogs />
        </>
      )}
    </>
  );
}

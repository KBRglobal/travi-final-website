import { EditableWrapper } from "../core/EditableWrapper";
import { useIsEditMode } from "@/stores/liveEditStore";
import { cn } from "@/lib/utils";

interface SpacerRendererProps {
  id: string;
  props: {
    height?: "small" | "medium" | "large" | "xlarge";
  };
  onUpdate: (props: Record<string, any>) => void;
}

export function SpacerRenderer({ id, props }: SpacerRendererProps) {
  const isEditMode = useIsEditMode();
  const { height = "medium" } = props;

  const heightClasses = {
    small: "h-4",
    medium: "h-8",
    large: "h-16",
    xlarge: "h-24",
  };

  return (
    <EditableWrapper id={id}>
      <div
        className={cn(
          heightClasses[height],
          isEditMode && "bg-muted border border-dashed border-muted-foreground flex items-center justify-center"
        )}
      >
        {isEditMode && (
          <span className="text-xs text-muted-foreground">רווח</span>
        )}
      </div>
    </EditableWrapper>
  );
}

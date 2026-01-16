import { EditableWrapper } from "../core/EditableWrapper";
import { cn } from "@/lib/utils";

interface DividerRendererProps {
  id: string;
  props: {
    style?: "solid" | "dashed" | "dotted";
    width?: "full" | "half" | "third";
  };
  onUpdate: (props: Record<string, any>) => void;
}

export function DividerRenderer({ id, props }: DividerRendererProps) {
  const { style = "solid", width = "full" } = props;

  const widthClasses = {
    full: "w-full",
    half: "w-1/2 mx-auto",
    third: "w-1/3 mx-auto",
  };

  const styleClasses = {
    solid: "border-solid",
    dashed: "border-dashed",
    dotted: "border-dotted",
  };

  return (
    <EditableWrapper id={id}>
      <div className="py-4 px-6">
        <hr
          className={cn(
            "border-t border-muted-foreground/30",
            widthClasses[width],
            styleClasses[style]
          )}
        />
      </div>
    </EditableWrapper>
  );
}

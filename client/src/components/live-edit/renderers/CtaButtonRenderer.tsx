import { EditableWrapper } from "../core/EditableWrapper";
import { InlineTextEditor } from "../editors/InlineTextEditor";
import { useIsEditMode } from "@/stores/liveEditStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CtaButtonRendererProps {
  id: string;
  props: {
    text: string;
    link?: string;
    variant?: "default" | "secondary" | "outline" | "ghost";
    size?: "sm" | "default" | "lg";
    alignment?: "left" | "center" | "right";
    fullWidth?: boolean;
  };
  onUpdate: (props: Record<string, any>) => void;
}

export function CtaButtonRenderer({ id, props, onUpdate }: CtaButtonRendererProps) {
  const isEditMode = useIsEditMode();
  const {
    text,
    link,
    variant = "default",
    size = "default",
    alignment = "center",
    fullWidth = false,
  } = props;

  const alignmentClasses = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  };

  return (
    <EditableWrapper id={id}>
      <div className={cn("py-4 px-6 flex", alignmentClasses[alignment])}>
        <Button
          variant={variant}
          size={size}
          className={cn(fullWidth && "w-full")}
          asChild={!isEditMode && link ? true : false}
        >
          {isEditMode ? (
            <InlineTextEditor
              componentId={id}
              fieldName="text"
              value={text}
              onChange={value => onUpdate({ ...props, text: value })}
              placeholder="Button Text"
              as="span"
            />
          ) : link ? (
            <a href={link}>{text}</a>
          ) : (
            <span>{text}</span>
          )}
        </Button>
      </div>
    </EditableWrapper>
  );
}

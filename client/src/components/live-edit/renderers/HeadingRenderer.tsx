import { EditableWrapper } from "../core/EditableWrapper";
import { InlineTextEditor } from "../editors/InlineTextEditor";
import { useIsEditMode } from "@/stores/liveEditStore";
import { cn } from "@/lib/utils";

interface HeadingRendererProps {
  id: string;
  props: {
    text: string;
    level?: "h1" | "h2" | "h3" | "h4";
    alignment?: "left" | "center" | "right";
  };
  onUpdate: (props: Record<string, any>) => void;
}

export function HeadingRenderer({ id, props, onUpdate }: HeadingRendererProps) {
  const isEditMode = useIsEditMode();
  const { text, level = "h2", alignment = "right" } = props;

  const levelClasses = {
    h1: "text-4xl md:text-5xl font-bold",
    h2: "text-3xl md:text-4xl font-bold",
    h3: "text-2xl md:text-3xl font-semibold",
    h4: "text-xl md:text-2xl font-semibold",
  };

  const alignmentClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  const Tag = level;

  return (
    <EditableWrapper id={id}>
      <div className={cn("py-4 px-6", alignmentClasses[alignment])}>
        {isEditMode ? (
          <InlineTextEditor
            componentId={id}
            fieldName="text"
            value={text}
            onChange={value => onUpdate({ ...props, text: value })}
            className={levelClasses[level]}
            placeholder="Heading"
            as={level}
          />
        ) : (
          <Tag className={levelClasses[level]}>{text}</Tag>
        )}
      </div>
    </EditableWrapper>
  );
}

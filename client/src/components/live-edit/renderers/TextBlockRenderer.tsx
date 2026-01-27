import { EditableWrapper } from "../core/EditableWrapper";
import { InlineTextEditor } from "../editors/InlineTextEditor";
import { useIsEditMode } from "@/stores/liveEditStore";
import { cn } from "@/lib/utils";
import { sanitizeHTML } from "@/lib/sanitize";

interface TextBlockRendererProps {
  id: string;
  props: {
    contents: string;
    alignment?: "left" | "center" | "right";
    size?: "small" | "medium" | "large";
  };
  onUpdate: (props: Record<string, any>) => void;
}

export function TextBlockRenderer({ id, props, onUpdate }: TextBlockRendererProps) {
  const isEditMode = useIsEditMode();
  const { contents, alignment = "right", size = "medium" } = props;

  const sizeClasses = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg",
  };

  const alignmentClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <EditableWrapper id={id}>
      <div className={cn("py-4 px-6", sizeClasses[size], alignmentClasses[alignment])}>
        {isEditMode ? (
          <InlineTextEditor
            componentId={id}
            fieldName="contents"
            value={contents}
            onChange={value => onUpdate({ ...props, contents: value })}
            multiline
            className="prose prose-lg max-w-none"
            placeholder="Enter text here..."
            as="div"
          />
        ) : (
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(contents || "") }}
          />
        )}
      </div>
    </EditableWrapper>
  );
}

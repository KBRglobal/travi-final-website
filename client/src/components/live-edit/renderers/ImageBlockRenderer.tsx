import { EditableWrapper } from "../core/EditableWrapper";
import { InlineTextEditor } from "../editors/InlineTextEditor";
import { useIsEditMode } from "@/stores/liveEditStore";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

interface ImageBlockRendererProps {
  id: string;
  props: {
    src: string;
    alt?: string;
    caption?: string;
    size?: "small" | "medium" | "large" | "full";
    rounded?: boolean;
  };
  onUpdate: (props: Record<string, any>) => void;
}

export function ImageBlockRenderer({ id, props, onUpdate }: ImageBlockRendererProps) {
  const isEditMode = useIsEditMode();
  const { src, alt = "", caption, size = "medium", rounded = true } = props;

  const sizeClasses = {
    small: "max-w-sm",
    medium: "max-w-2xl",
    large: "max-w-4xl",
    full: "w-full",
  };

  return (
    <EditableWrapper id={id}>
      <figure className={cn("py-4 px-6 mx-auto", sizeClasses[size])}>
        {src ? (
          <img
            src={src}
            alt={alt}
            className={cn(
              "w-full h-auto object-cover",
              rounded && "rounded-lg"
            )}
          />
        ) : (
          <div
            className={cn(
              "flex items-center justify-center bg-muted h-48",
              rounded && "rounded-lg"
            )}
          >
            <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}

        {(caption || isEditMode) && (
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">
            {isEditMode ? (
              <InlineTextEditor
                componentId={id}
                fieldName="caption"
                value={caption || ""}
                onChange={(value) => onUpdate({ ...props, caption: value })}
                placeholder="הוסף כיתוב..."
                as="span"
              />
            ) : (
              caption
            )}
          </figcaption>
        )}
      </figure>
    </EditableWrapper>
  );
}

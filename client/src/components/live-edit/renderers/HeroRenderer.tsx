import { EditableWrapper } from "../core/EditableWrapper";
import { InlineTextEditor } from "../editors/InlineTextEditor";
import { useIsEditMode } from "@/stores/liveEditStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeroRendererProps {
  id: string;
  props: {
    title: string;
    subtitle?: string;
    backgroundImage?: string;
    ctaText?: string;
    ctaLink?: string;
    alignment?: "left" | "center" | "right";
    height?: "small" | "medium" | "large";
  };
  onUpdate: (props: Record<string, any>) => void;
}

export function HeroRenderer({ id, props, onUpdate }: HeroRendererProps) {
  const isEditMode = useIsEditMode();
  const {
    title,
    subtitle,
    backgroundImage,
    ctaText,
    ctaLink,
    alignment = "center",
    height = "medium",
  } = props;

  const heightClasses = {
    small: "min-h-[300px]",
    medium: "min-h-[450px]",
    large: "min-h-[600px]",
  };

  const alignmentClasses = {
    left: "text-start items-start",
    center: "text-center items-center",
    right: "text-end items-end",
  };

  return (
    <EditableWrapper id={id}>
      <section
        className={cn(
          "relative flex flex-col justify-center px-6 py-12",
          heightClasses[height],
          alignmentClasses[alignment]
        )}
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {backgroundImage && <div className="absolute inset-0 bg-black/40" />}

        <div className="relative z-10 max-w-4xl mx-auto space-y-4">
          {isEditMode ? (
            <InlineTextEditor
              componentId={id}
              fieldName="title"
              value={title}
              onChange={value => onUpdate({ ...props, title: value })}
              className="text-4xl md:text-5xl font-bold text-white"
              placeholder="Main Title"
              as="h1"
            />
          ) : (
            <h1 className="text-4xl md:text-5xl font-bold text-white">{title}</h1>
          )}

          {(subtitle || isEditMode) &&
            (isEditMode ? (
              <InlineTextEditor
                componentId={id}
                fieldName="subtitle"
                value={subtitle || ""}
                onChange={value => onUpdate({ ...props, subtitle: value })}
                className="text-xl md:text-2xl text-white/90"
                placeholder="Subtitle"
                as="p"
              />
            ) : (
              <p className="text-xl md:text-2xl text-white/90">{subtitle}</p>
            ))}

          {(ctaText || isEditMode) && (
            <div className="pt-4">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90"
                asChild={!isEditMode && ctaLink ? true : false}
              >
                {isEditMode ? (
                  <InlineTextEditor
                    componentId={id}
                    fieldName="ctaText"
                    value={ctaText || ""}
                    onChange={value => onUpdate({ ...props, ctaText: value })}
                    className="text-white"
                    placeholder="Button Text"
                    as="span"
                  />
                ) : ctaLink ? (
                  <a href={ctaLink}>{ctaText}</a>
                ) : (
                  <span>{ctaText}</span>
                )}
              </Button>
            </div>
          )}
        </div>
      </section>
    </EditableWrapper>
  );
}

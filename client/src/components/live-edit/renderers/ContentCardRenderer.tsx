import { EditableWrapper } from "../core/EditableWrapper";
import { InlineTextEditor } from "../editors/InlineTextEditor";
import { useIsEditMode } from "@/stores/liveEditStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContentCardRendererProps {
  id: string;
  props: {
    title: string;
    description?: string;
    image?: string;
    link?: string;
    linkText?: string;
  };
  onUpdate: (props: Record<string, any>) => void;
}

export function ContentCardRenderer({ id, props, onUpdate }: ContentCardRendererProps) {
  const isEditMode = useIsEditMode();
  const { title, description, image, link, linkText } = props;

  return (
    <EditableWrapper id={id}>
      <Card className="overflow-hidden">
        {image && (
          <div className="aspect-video overflow-hidden">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader>
          <CardTitle>
            {isEditMode ? (
              <InlineTextEditor
                componentId={id}
                fieldName="title"
                value={title}
                onChange={(value) => onUpdate({ ...props, title: value })}
                placeholder="כותרת"
                as="span"
              />
            ) : (
              title
            )}
          </CardTitle>
          {(description || isEditMode) && (
            <CardDescription>
              {isEditMode ? (
                <InlineTextEditor
                  componentId={id}
                  fieldName="description"
                  value={description || ""}
                  onChange={(value) => onUpdate({ ...props, description: value })}
                  multiline
                  placeholder="תיאור"
                  as="p"
                />
              ) : (
                description
              )}
            </CardDescription>
          )}
        </CardHeader>
        {(link || isEditMode) && (
          <CardContent>
            <Button variant="outline" asChild={!isEditMode && link ? true : false}>
              {isEditMode ? (
                <InlineTextEditor
                  componentId={id}
                  fieldName="linkText"
                  value={linkText || "קרא עוד"}
                  onChange={(value) => onUpdate({ ...props, linkText: value })}
                  placeholder="טקסט קישור"
                  as="span"
                />
              ) : (
                <a href={link}>{linkText || "קרא עוד"}</a>
              )}
            </Button>
          </CardContent>
        )}
      </Card>
    </EditableWrapper>
  );
}

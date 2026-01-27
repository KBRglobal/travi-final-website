import { EditableWrapper } from "../core/EditableWrapper";
import { InlineTextEditor } from "../editors/InlineTextEditor";
import { useIsEditMode } from "@/stores/liveEditStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GridItem {
  id: string;
  title: string;
  description?: string;
  image?: string;
  link?: string;
}

interface ContentGridRendererProps {
  id: string;
  props: {
    title?: string;
    columns?: 2 | 3 | 4;
    items: GridItem[];
  };
  onUpdate: (props: Record<string, any>) => void;
}

export function ContentGridRenderer({ id, props, onUpdate }: ContentGridRendererProps) {
  const isEditMode = useIsEditMode();
  const { title, columns = 3, items = [] } = props;

  const columnClasses = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  const updateItem = (index: number, updates: Partial<GridItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onUpdate({ ...props, items: newItems });
  };

  return (
    <EditableWrapper id={id}>
      <section className="py-8 px-6">
        {(title || isEditMode) && (
          <div className="text-center mb-8">
            {isEditMode ? (
              <InlineTextEditor
                componentId={id}
                fieldName="title"
                value={title || ""}
                onChange={value => onUpdate({ ...props, title: value })}
                className="text-3xl font-bold"
                placeholder="Grid Title"
                as="h2"
              />
            ) : (
              <h2 className="text-3xl font-bold">{title}</h2>
            )}
          </div>
        )}

        <div className={cn("grid gap-6", columnClasses[columns])}>
          {items.map((item, index) => (
            <Card key={item.id} className="overflow-hidden">
              {item.image && (
                <div className="aspect-video overflow-hidden">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">
                  {isEditMode ? (
                    <InlineTextEditor
                      componentId={id}
                      fieldName={`items.${index}.title`}
                      value={item.title}
                      onChange={value => updateItem(index, { title: value })}
                      placeholder="Title"
                      as="span"
                    />
                  ) : (
                    item.title
                  )}
                </CardTitle>
              </CardHeader>
              {(item.description || isEditMode) && (
                <CardContent>
                  {isEditMode ? (
                    <InlineTextEditor
                      componentId={id}
                      fieldName={`items.${index}.description`}
                      value={item.description || ""}
                      onChange={value => updateItem(index, { description: value })}
                      multiline
                      className="text-muted-foreground"
                      placeholder="Description"
                      as="p"
                    />
                  ) : (
                    <p className="text-muted-foreground">{item.description}</p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </section>
    </EditableWrapper>
  );
}

import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getAllComponents,
  getComponentCategories,
  getCategoryLabel,
  getCategoryLabelHebrew,
  EditableComponentConfig,
} from "@/lib/live-edit/componentRegistry";
import { useLiveEditStore } from "@/stores/liveEditStore";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { cn } from "@/lib/utils";

interface DraggableComponentProps {
  config: EditableComponentConfig;
}

function DraggableComponent({ config }: DraggableComponentProps) {
  const { isRTL } = useLocale();
  const { addComponent, componentOrder } = useLiveEditStore();

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new-${config.type}`,
    data: {
      componentType: config.type,
    },
  });

  const handleClick = () => {
    // Add component at the end when clicked
    addComponent(
      config.type,
      { index: componentOrder.length, parentId: undefined },
      config.defaultProps
    );
  };

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        "p-3 cursor-grab active:cursor-grabbing transition-all",
        "hover:shadow-md hover:border-secondary/50",
        "flex items-center gap-3",
        isDragging && "opacity-50 scale-95"
      )}
    >
      <span className="text-xl">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">
          {isRTL && config.displayNameHe ? config.displayNameHe : config.displayName}
        </h4>
      </div>
    </Card>
  );
}

export function ComponentLibrary() {
  const { isRTL } = useLocale();
  const categories = getComponentCategories();
  const allComponents = getAllComponents();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {isRTL
          ? "גרור או לחץ להוספת רכיב"
          : "Drag or click to add component"}
      </p>

      {categories.map((category) => {
        const components = allComponents.filter((c) => c.category === category);
        if (components.length === 0) return null;

        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs">
                {isRTL ? getCategoryLabelHebrew(category) : getCategoryLabel(category)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                ({components.length})
              </span>
            </div>
            <div className="space-y-2">
              {components.map((config) => (
                <DraggableComponent key={config.type} config={config} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

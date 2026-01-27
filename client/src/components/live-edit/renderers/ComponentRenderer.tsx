import { useLiveEditStore } from "@/stores/liveEditStore";
import type { ComponentState } from "@/types/liveEdit";

// Import all renderers
import { HeroRenderer } from "./HeroRenderer";
import { TextBlockRenderer } from "./TextBlockRenderer";
import { HeadingRenderer } from "./HeadingRenderer";
import { SpacerRenderer } from "./SpacerRenderer";
import { DividerRenderer } from "./DividerRenderer";
import { ImageBlockRenderer } from "./ImageBlockRenderer";
import { ContentCardRenderer } from "./ContentCardRenderer";
import { ContentGridRenderer } from "./ContentGridRenderer";
import { CtaButtonRenderer } from "./CtaButtonRenderer";
import { FaqAccordionRenderer } from "./FaqAccordionRenderer";

interface ComponentRendererProps {
  component: ComponentState;
}

// Map component types to their renderers
const rendererMap: Record<string, React.ComponentType<any>> = {
  hero: HeroRenderer,
  textBlock: TextBlockRenderer,
  heading: HeadingRenderer,
  spacer: SpacerRenderer,
  divider: DividerRenderer,
  imageBlock: ImageBlockRenderer,
  contentCard: ContentCardRenderer,
  contentGrid: ContentGridRenderer,
  ctaButton: CtaButtonRenderer,
  faqAccordion: FaqAccordionRenderer,
};

export function ComponentRenderer({ component }: ComponentRendererProps) {
  const { updateComponentProps } = useLiveEditStore();

  const Renderer = rendererMap[component.type];

  if (!Renderer) {
    // Unknown component type - show placeholder in edit mode
    return (
      <div className="p-4 border border-dashed border-muted-foreground/30 rounded-lg text-center text-muted-foreground">
        <p>Unknown component: {component.type}</p>
      </div>
    );
  }

  const handleUpdate = (newProps: Record<string, any>) => {
    updateComponentProps(component.id, newProps);
  };

  return <Renderer id={component.id} props={component.props} onUpdate={handleUpdate} />;
}

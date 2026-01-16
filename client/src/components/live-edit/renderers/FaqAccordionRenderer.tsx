import { EditableWrapper } from "../core/EditableWrapper";
import { InlineTextEditor } from "../editors/InlineTextEditor";
import { useIsEditMode } from "@/stores/liveEditStore";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqAccordionRendererProps {
  id: string;
  props: {
    title?: string;
    items: FaqItem[];
  };
  onUpdate: (props: Record<string, any>) => void;
}

export function FaqAccordionRenderer({ id, props, onUpdate }: FaqAccordionRendererProps) {
  const isEditMode = useIsEditMode();
  const { title, items = [] } = props;

  const updateItem = (index: number, updates: Partial<FaqItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onUpdate({ ...props, items: newItems });
  };

  return (
    <EditableWrapper id={id}>
      <section className="py-8 px-6 max-w-3xl mx-auto">
        {(title || isEditMode) && (
          <div className="text-center mb-8">
            {isEditMode ? (
              <InlineTextEditor
                componentId={id}
                fieldName="title"
                value={title || ""}
                onChange={(value) => onUpdate({ ...props, title: value })}
                className="text-3xl font-bold"
                placeholder="שאלות נפוצות"
                as="h2"
              />
            ) : (
              <h2 className="text-3xl font-bold">{title}</h2>
            )}
          </div>
        )}

        <Accordion type="single" collapsible className="w-full">
          {items.map((item, index) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="text-right">
                {isEditMode ? (
                  <InlineTextEditor
                    componentId={id}
                    fieldName={`items.${index}.question`}
                    value={item.question}
                    onChange={(value) => updateItem(index, { question: value })}
                    placeholder="שאלה"
                    as="span"
                  />
                ) : (
                  item.question
                )}
              </AccordionTrigger>
              <AccordionContent>
                {isEditMode ? (
                  <InlineTextEditor
                    componentId={id}
                    fieldName={`items.${index}.answer`}
                    value={item.answer}
                    onChange={(value) => updateItem(index, { answer: value })}
                    multiline
                    placeholder="תשובה"
                    as="p"
                  />
                ) : (
                  <p className="text-muted-foreground">{item.answer}</p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </EditableWrapper>
  );
}

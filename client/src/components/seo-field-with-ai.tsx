import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AIFieldAssistant, FieldType } from "@/components/ai-field-assistant";
import { Trash2, CheckCircle } from "lucide-react";

// Shared contents context type
interface ContentContext {
  title: string;
  contentType: string;
  primaryKeyword?: string;
}

// 1. SeoTextFieldWithAI - For simple text fields (intro, expanded intro)
interface SeoTextFieldWithAIProps {
  label: string;
  fieldName: string;
  fieldType: FieldType;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  wordCount?: boolean;
  contentContext: ContentContext;
}

export function SeoTextFieldWithAI({
  label,
  fieldName,
  fieldType,
  value,
  onChange,
  placeholder,
  rows = 3,
  wordCount = false,
  contentContext,
}: SeoTextFieldWithAIProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label htmlFor={fieldName}>{label}</Label>
        <AIFieldAssistant
          fieldName={fieldName}
          fieldType={fieldType}
          currentValue={value}
          contentContext={contentContext}
          onApply={onChange}
        />
      </div>
      <Textarea
        id={fieldName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-2"
      />
      {wordCount && (
        <p className="text-xs text-muted-foreground mt-1">
          {value.split(" ").filter(Boolean).length} words
        </p>
      )}
    </div>
  );
}

// 2. SeoArrayFieldWithAI - For array fields (tips, local tips, etc.)
interface SeoArrayFieldWithAIProps {
  label: string;
  description?: string;
  fieldName: string;
  fieldType: FieldType;
  items: string[];
  onItemsChange: (items: string[]) => void;
  itemPlaceholder?: string;
  addButtonText?: string;
  contentContext: ContentContext;
  useTextarea?: boolean;
  textareaRows?: number;
}

export function SeoArrayFieldWithAI({
  label,
  description,
  fieldName,
  fieldType,
  items,
  onItemsChange,
  itemPlaceholder = "Enter text...",
  addButtonText = "Add Item",
  contentContext,
  useTextarea = false,
  textareaRows = 2,
}: SeoArrayFieldWithAIProps) {
  const addItem = () => {
    onItemsChange([...items, ""]);
  };

  const updateItem = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onItemsChange(updated);
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <Label>{label}</Label>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <AIFieldAssistant
          fieldName={fieldName}
          fieldType={fieldType}
          currentValue={items.join('\n')}
          contentContext={contentContext}
          onApply={(value) => {
            const newItems = value.split('\n').filter(t => t.trim());
            onItemsChange(newItems);
          }}
        />
      </div>
      <div className="space-y-3 mt-3">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2 items-center">
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            {useTextarea ? (
              <Textarea
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                placeholder={itemPlaceholder}
                rows={textareaRows}
                className="flex-1"
              />
            ) : (
              <Input
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                placeholder={itemPlaceholder}
                className="flex-1"
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeItem(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button onClick={addItem} variant="outline" className="w-full">
          {addButtonText}
        </Button>
      </div>
    </div>
  );
}

// 3. SeoHighlightsFieldWithAI - For highlights (title + description pairs)
interface HighlightItem {
  title: string;
  description: string;
  image?: string;
}

interface SeoHighlightsFieldWithAIProps {
  label: string;
  description?: string;
  fieldName: string;
  highlights: HighlightItem[];
  onHighlightsChange: (highlights: HighlightItem[]) => void;
  contentContext: ContentContext;
  showImage?: boolean;
  imageLabel?: string;
  imagePlaceholder?: string;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
  descriptionRows?: number;
}

export function SeoHighlightsFieldWithAI({
  label,
  description,
  fieldName,
  highlights,
  onHighlightsChange,
  contentContext,
  showImage = true,
  imageLabel = "Image URL",
  imagePlaceholder = "/images/highlight-1.jpg",
  titlePlaceholder = "Title",
  descriptionPlaceholder = "Description (1-2 sentences)",
  descriptionRows = 2,
}: SeoHighlightsFieldWithAIProps) {
  const addHighlight = () => {
    const newItem: HighlightItem = { 
      image: "", 
      title: "", 
      description: ""
    };
    onHighlightsChange([...highlights, newItem]);
  };

  const updateHighlight = (index: number, field: keyof HighlightItem, value: string) => {
    const updated = [...highlights];
    updated[index] = { ...updated[index], [field]: value };
    onHighlightsChange(updated);
  };

  const removeHighlight = (index: number) => {
    onHighlightsChange(highlights.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <Label>{label}</Label>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <AIFieldAssistant
          fieldName={fieldName}
          fieldType="highlights"
          currentValue={highlights.map(h => `${h.title}: ${h.description}`).join('\n')}
          contentContext={contentContext}
          onApply={(value) => {
            const lines = value.split('\n').filter(l => l.trim());
            const newHighlights = lines.map(line => {
              const [title, ...descParts] = line.split(':');
              return {
                image: "",
                title: title.trim(),
                description: descParts.join(':').trim()
              };
            });
            onHighlightsChange(newHighlights);
          }}
        />
      </div>
      <div className="space-y-4 mt-3">
        {highlights.map((item, index) => (
          <div key={index} className="p-3 border rounded-lg space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder={titlePlaceholder}
                value={item.title || ""}
                onChange={(e) => updateHighlight(index, "title", e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeHighlight(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              placeholder={descriptionPlaceholder}
              value={item.description || ""}
              onChange={(e) => updateHighlight(index, "description", e.target.value)}
              rows={descriptionRows}
            />
            {showImage && (
              <div>
                <Label>{imageLabel}</Label>
                <Input
                  placeholder={imagePlaceholder}
                  value={item.image || ""}
                  onChange={(e) => updateHighlight(index, "image", e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        ))}
        <Button onClick={addHighlight} variant="outline" className="w-full">
          Add {fieldName}
        </Button>
      </div>
    </div>
  );
}

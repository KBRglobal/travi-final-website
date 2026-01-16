import { useState, useRef, useEffect, KeyboardEvent, FocusEvent } from "react";
import { useLiveEditStore } from "@/stores/liveEditStore";
import { cn } from "@/lib/utils";

interface InlineTextEditorProps {
  componentId: string;
  fieldName: string;
  value: string;
  onChange?: (value: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
}

export function InlineTextEditor({
  componentId,
  fieldName,
  value,
  onChange,
  multiline = false,
  className,
  placeholder = "Click to edit...",
  as: Component = "div",
}: InlineTextEditorProps) {
  const { isEditMode, isPreviewMode, updateComponentProps, focusField, focusedFieldId } =
    useLiveEditStore();

  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const editorRef = useRef<HTMLDivElement>(null);

  const fieldId = `${componentId}-${fieldName}`;
  const isFocused = focusedFieldId === fieldId;

  // Sync local value with prop
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
    }
  }, [value, isEditing]);

  // Focus editor when field is focused
  useEffect(() => {
    if (isFocused && editorRef.current && isEditMode && !isPreviewMode) {
      editorRef.current.focus();
      setIsEditing(true);
    }
  }, [isFocused, isEditMode, isPreviewMode]);

  const handleClick = () => {
    if (!isEditMode || isPreviewMode) return;
    setIsEditing(true);
    focusField(fieldId);
  };

  const handleBlur = (e: FocusEvent) => {
    setIsEditing(false);
    focusField(null);

    // Save changes
    if (localValue !== value) {
      updateComponentProps(componentId, { [fieldName]: localValue });
      onChange?.(localValue);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      setLocalValue(editorRef.current.innerText);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Enter in single-line mode saves and exits
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      editorRef.current?.blur();
    }

    // Escape cancels changes
    if (e.key === "Escape") {
      setLocalValue(value);
      setIsEditing(false);
      focusField(null);
      editorRef.current?.blur();
    }
  };

  // In preview mode or not edit mode, just show the text
  if (!isEditMode || isPreviewMode) {
    return <Component className={className}>{value || placeholder}</Component>;
  }

  return (
    <Component
      ref={editorRef}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onClick={handleClick}
      onBlur={handleBlur}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      className={cn(
        "outline-none transition-all",
        // Editable styling
        isEditing && "ring-2 ring-secondary/50 rounded px-1 -mx-1",
        // Hover styling when not editing
        !isEditing && "hover:bg-secondary/10 cursor-text rounded px-1 -mx-1",
        // Empty placeholder styling
        !localValue && "text-muted-foreground",
        className
      )}
      data-placeholder={!localValue ? placeholder : undefined}
    >
      {localValue || (isEditing ? "" : placeholder)}
    </Component>
  );
}

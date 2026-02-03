import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Copy } from "lucide-react";
import { useLiveEditStore, useSelectedComponent } from "@/stores/liveEditStore";
import { useLocale } from "@/lib/i18n/LocaleRouter";

// Stub function - componentRegistry module was removed
const getComponentConfig = (_type: string): { icon: string; displayName: string; editableFields: Array<{ name: string; type: string; label: string; required?: boolean; placeholder?: string; defaultValue?: unknown; options?: Array<{ value: string; label: string }> }> } | null => null;

export function ComponentSettings() {
  const { isRTL } = useLocale();
  const selectedComponent = useSelectedComponent();
  const { updateComponentProps, removeComponent, duplicateComponent } = useLiveEditStore();

  if (!selectedComponent) {
    return null;
  }

  const config = getComponentConfig(selectedComponent.type);
  if (!config) {
    return <div className="text-center text-muted-foreground py-4">Unknown component type</div>;
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    updateComponentProps(selectedComponent.id, { [fieldName]: value });
  };

  const handleDelete = () => {
    if (confirm("Delete this component?")) {
      removeComponent(selectedComponent.id);
    }
  };

  const handleDuplicate = () => {
    duplicateComponent(selectedComponent.id);
  };

  return (
    <div className="space-y-6">
      {/* Component Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold">{config.displayName}</h3>
          <p className="text-xs text-muted-foreground">ID: {selectedComponent.id.slice(0, 8)}...</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDuplicate} className="flex-1">
          <Copy className="w-3.5 h-3.5 me-1" />
          Duplicate
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5 me-1" />
          Delete
        </Button>
      </div>

      {/* Fields */}
      <Card className="p-4 space-y-4">
        <h4 className="text-sm font-medium">Settings</h4>

        {config.editableFields.map(field => {
          const currentValue = selectedComponent.props?.[field.name] ?? field.defaultValue ?? "";

          switch (field.type) {
            case "text":
            case "link":
              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-red-500 ms-1">*</span>}
                  </Label>
                  <Input
                    id={field.name}
                    value={currentValue}
                    onChange={e => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                  />
                </div>
              );

            case "textarea":
            case "richtext":
              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-red-500 ms-1">*</span>}
                  </Label>
                  <Textarea
                    id={field.name}
                    value={currentValue}
                    onChange={e => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                  />
                </div>
              );

            case "number":
              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input
                    id={field.name}
                    type="number"
                    value={currentValue}
                    onChange={e => handleFieldChange(field.name, parseInt(e.target.value) || 0)}
                  />
                </div>
              );

            case "boolean":
              return (
                <div key={field.name} className="flex items-center justify-between">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Switch
                    id={field.name}
                    checked={!!currentValue}
                    onCheckedChange={checked => handleFieldChange(field.name, checked)}
                  />
                </div>
              );

            case "select":
              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Select
                    value={String(currentValue)}
                    onValueChange={value => handleFieldChange(field.name, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map(option => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );

            case "image":
              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-red-500 ms-1">*</span>}
                  </Label>
                  <Input
                    id={field.name}
                    value={currentValue}
                    onChange={e => handleFieldChange(field.name, e.target.value)}
                    placeholder="Image URL..."
                  />
                  {currentValue && (
                    <img
                      src={currentValue}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded border"
                    />
                  )}
                </div>
              );

            default:
              return null;
          }
        })}
      </Card>
    </div>
  );
}

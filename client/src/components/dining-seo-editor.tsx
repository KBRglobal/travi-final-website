import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeoHighlightsFieldWithAI, SeoArrayFieldWithAI } from "@/components/seo-field-with-ai";
import { Plus, Trash2, Utensils, DollarSign, MapPin } from "lucide-react";
import type {
  QuickInfoItem,
  HighlightItem,
  MenuHighlightItem,
  EssentialInfoItem,
  RelatedItem,
  GalleryImage,
  FaqItem,
} from "@shared/schema";

interface DiningSeoEditorProps {
  data: {
    location?: string;
    cuisineType?: string;
    priceRange?: string;
    targetAudience?: string[];
    primaryCta?: string;
    quickInfoBar?: QuickInfoItem[];
    highlights?: HighlightItem[];
    menuHighlights?: MenuHighlightItem[];
    essentialInfo?: EssentialInfoItem[];
    diningTips?: string[];
    faq?: FaqItem[];
    relatedDining?: RelatedItem[];
    photoGallery?: GalleryImage[];
    trustSignals?: string[];
  };
  onChange: (data: any) => void;
  title?: string;
  contentType?: string;
  primaryKeyword?: string;
}

export function DiningSeoEditor({ data, onChange, title = "", contentType = "dining", primaryKeyword = "" }: DiningSeoEditorProps) {
  const updateField = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const addToArray = (field: string, item: any) => {
    const current = (data[field as keyof typeof data] as any[]) || [];
    updateField(field, [...current, item]);
  };

  const removeFromArray = (field: string, index: number) => {
    const current = (data[field as keyof typeof data] as any[]) || [];
    updateField(field, current.filter((_, i) => i !== index));
  };

  const updateArrayItem = (field: string, index: number, updates: any) => {
    const current = (data[field as keyof typeof data] as any[]) || [];
    const updated = [...current];
    updated[index] = { ...updated[index], ...updates };
    updateField(field, updated);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Location</Label>
            <Input
              value={data.location || ""}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="e.g., DIFC, Downtown Dubai"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cuisine Type</Label>
              <Input
                value={data.cuisineType || ""}
                onChange={(e) => updateField("cuisineType", e.target.value)}
                placeholder="e.g., French Fine Dining"
              />
            </div>
            <div>
              <Label>Price Range</Label>
              <Input
                value={data.priceRange || ""}
                onChange={(e) => updateField("priceRange", e.target.value)}
                placeholder="e.g., AED 300-500 per person"
              />
            </div>
          </div>

          <div>
            <Label>Primary CTA</Label>
            <Input
              value={data.primaryCta || ""}
              onChange={(e) => updateField("primaryCta", e.target.value)}
              placeholder="Reserve Your Table"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Info Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Info Bar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data.quickInfoBar || []).map((item, index) => (
            <div key={index} className="flex gap-2 p-3 border rounded-lg">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  placeholder="Label"
                  value={item.label || ""}
                  onChange={(e) =>
                    updateArrayItem("quickInfoBar", index, { label: e.target.value })
                  }
                />
                <Input
                  placeholder="Value"
                  value={item.value || ""}
                  onChange={(e) =>
                    updateArrayItem("quickInfoBar", index, { value: e.target.value })
                  }
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFromArray("quickInfoBar", index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            onClick={() => addToArray("quickInfoBar", { label: "", value: "", icon: "" })}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Quick Info Item
          </Button>
        </CardContent>
      </Card>

      {/* Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Highlights</CardTitle>
        </CardHeader>
        <CardContent>
          <SeoHighlightsFieldWithAI
            label=""
            fieldName="Highlight"
            highlights={data.highlights || []}
            onHighlightsChange={(highlights) => updateField("highlights", highlights)}
            contentContext={{
              title,
              contentType,
              primaryKeyword,
            }}
          />
        </CardContent>
      </Card>

      {/* Menu Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Highlights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data.menuHighlights || []).map((item, index) => (
            <div key={index} className="p-3 border rounded-lg space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Dish Name"
                  value={item.name || ""}
                  onChange={(e) =>
                    updateArrayItem("menuHighlights", index, { name: e.target.value })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromArray("menuHighlights", index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                placeholder="Description"
                value={item.description || ""}
                onChange={(e) =>
                  updateArrayItem("menuHighlights", index, { description: e.target.value })
                }
                rows={2}
              />
              <Input
                placeholder="Price (optional, e.g., AED 120)"
                value={item.price || ""}
                onChange={(e) =>
                  updateArrayItem("menuHighlights", index, { price: e.target.value })
                }
              />
            </div>
          ))}
          <Button
            onClick={() =>
              addToArray("menuHighlights", {
                name: "",
                description: "",
                price: "",
              })
            }
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Menu Item
          </Button>
        </CardContent>
      </Card>

      {/* Dining Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Dining Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <SeoArrayFieldWithAI
            label=""
            fieldName="Dining Tips"
            fieldType="tips"
            items={data.diningTips || []}
            onItemsChange={(items) => updateField("diningTips", items)}
            itemPlaceholder="Tip"
            addButtonText="Add Dining Tip"
            useTextarea={true}
            contentContext={{
              title,
              contentType,
              primaryKeyword,
            }}
          />
        </CardContent>
      </Card>

      {/* Related Restaurants */}
      <Card>
        <CardHeader>
          <CardTitle>Related Restaurants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data.relatedDining || []).map((restaurant, index) => (
            <div key={index} className="p-3 border rounded-lg space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Restaurant Name"
                  value={restaurant.name || ""}
                  onChange={(e) =>
                    updateArrayItem("relatedDining", index, { name: e.target.value })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromArray("relatedDining", index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                placeholder="Link (e.g., /dining/restaurant-slug)"
                value={restaurant.link || ""}
                onChange={(e) =>
                  updateArrayItem("relatedDining", index, { link: e.target.value })
                }
              />
            </div>
          ))}
          <Button
            onClick={() => addToArray("relatedDining", { name: "", link: "", image: "" })}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Related Restaurant
          </Button>
        </CardContent>
      </Card>

      {/* Trust Signals */}
      <Card>
        <CardHeader>
          <CardTitle>Trust Signals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data.trustSignals || []).map((signal, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={signal}
                onChange={(e) => {
                  const updated = [...(data.trustSignals || [])];
                  updated[index] = e.target.value;
                  updateField("trustSignals", updated);
                }}
                placeholder="Trust signal (e.g., Michelin Star 2024)"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFromArray("trustSignals", index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            onClick={() => addToArray("trustSignals", "")}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Trust Signal
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

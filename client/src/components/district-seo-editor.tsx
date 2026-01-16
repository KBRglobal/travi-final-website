import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeoTextFieldWithAI, SeoHighlightsFieldWithAI, SeoArrayFieldWithAI } from "@/components/seo-field-with-ai";
import { Plus, Trash2, MapPin, Building } from "lucide-react";
import type {
  QuickInfoItem,
  HighlightItem,
  ThingsToDoItem,
  DistrictAttractionItem,
  DiningHighlightItem,
  EssentialInfoItem,
  RelatedItem,
  GalleryImage,
  FaqItem,
} from "@shared/schema";

interface DistrictSeoEditorProps {
  data: {
    location?: string;
    neighborhood?: string;
    subcategory?: string;
    targetAudience?: string[];
    primaryCta?: string;
    introText?: string;
    expandedIntroText?: string;
    quickInfoBar?: QuickInfoItem[];
    highlights?: HighlightItem[];
    thingsToDo?: ThingsToDoItem[];
    attractionsGrid?: DistrictAttractionItem[];
    diningHighlights?: DiningHighlightItem[];
    essentialInfo?: EssentialInfoItem[];
    localTips?: string[];
    faq?: FaqItem[];
    relatedDistricts?: RelatedItem[];
    photoGallery?: GalleryImage[];
    trustSignals?: string[];
  };
  onChange: (data: any) => void;
  title?: string;
  contentType?: string;
  primaryKeyword?: string;
}

export function DistrictSeoEditor({ data, onChange, title = "", contentType = "district", primaryKeyword = "" }: DistrictSeoEditorProps) {
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
            <MapPin className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Location</Label>
            <Input
              value={data.location || ""}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="e.g., Dubai Marina"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Neighborhood</Label>
              <Input
                value={data.neighborhood || ""}
                onChange={(e) => updateField("neighborhood", e.target.value)}
                placeholder="e.g., Marina"
              />
            </div>
            <div>
              <Label>Subcategory</Label>
              <Input
                value={data.subcategory || ""}
                onChange={(e) => updateField("subcategory", e.target.value)}
                placeholder="e.g., Waterfront District"
              />
            </div>
          </div>

          <div>
            <Label>Primary CTA</Label>
            <Input
              value={data.primaryCta || ""}
              onChange={(e) => updateField("primaryCta", e.target.value)}
              placeholder="Explore Dubai Marina"
            />
          </div>

          <SeoTextFieldWithAI
            label="Intro Text (Visible)"
            fieldName="Intro Text"
            fieldType="intro"
            value={data.introText || ""}
            onChange={(value) => updateField("introText", value)}
            placeholder="3 compelling sentences (60-80 words)"
            rows={3}
            contentContext={{
              title,
              contentType,
              primaryKeyword,
            }}
          />

          <SeoTextFieldWithAI
            label="Expanded Intro Text (Hidden/Expandable)"
            fieldName="Expanded Intro"
            fieldType="expandedIntro"
            value={data.expandedIntroText || ""}
            onChange={(value) => updateField("expandedIntroText", value)}
            placeholder="150-200 words detailed description"
            rows={6}
            contentContext={{
              title,
              contentType,
              primaryKeyword,
            }}
          />
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
          <CardTitle>District Highlights</CardTitle>
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

      {/* Things to Do */}
      <Card>
        <CardHeader>
          <CardTitle>Things to Do</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data.thingsToDo || []).map((item, index) => (
            <div key={index} className="p-3 border rounded-lg space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Activity Name"
                  value={item.name || ""}
                  onChange={(e) =>
                    updateArrayItem("thingsToDo", index, { name: e.target.value })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromArray("thingsToDo", index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                placeholder="Description"
                value={item.description || ""}
                onChange={(e) =>
                  updateArrayItem("thingsToDo", index, { description: e.target.value })
                }
                rows={2}
              />
              <Input
                placeholder="Type (e.g., Shopping, Dining, Beach)"
                value={item.type || ""}
                onChange={(e) =>
                  updateArrayItem("thingsToDo", index, { type: e.target.value })
                }
              />
            </div>
          ))}
          <Button
            onClick={() =>
              addToArray("thingsToDo", { name: "", description: "", type: "" })
            }
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Activity
          </Button>
        </CardContent>
      </Card>

      {/* Dining Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>Dining Highlights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data.diningHighlights || []).map((item, index) => (
            <div key={index} className="p-3 border rounded-lg space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Restaurant Name"
                  value={item.name || ""}
                  onChange={(e) =>
                    updateArrayItem("diningHighlights", index, { name: e.target.value })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromArray("diningHighlights", index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                placeholder="Description"
                value={item.description || ""}
                onChange={(e) =>
                  updateArrayItem("diningHighlights", index, { description: e.target.value })
                }
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Cuisine Type"
                  value={item.cuisine || ""}
                  onChange={(e) =>
                    updateArrayItem("diningHighlights", index, { cuisine: e.target.value })
                  }
                />
                <Input
                  placeholder="Price Range"
                  value={item.priceRange || ""}
                  onChange={(e) =>
                    updateArrayItem("diningHighlights", index, {
                      priceRange: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          ))}
          <Button
            onClick={() =>
              addToArray("diningHighlights", {
                name: "",
                description: "",
                cuisine: "",
                priceRange: "",
                image: "",
              })
            }
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Restaurant
          </Button>
        </CardContent>
      </Card>

      {/* Local Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Local Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <SeoArrayFieldWithAI
            label=""
            fieldName="Local Tips"
            fieldType="tips"
            items={data.localTips || []}
            onItemsChange={(items) => updateField("localTips", items)}
            itemPlaceholder="Local tip"
            addButtonText="Add Local Tip"
            useTextarea={true}
            contentContext={{
              title,
              contentType,
              primaryKeyword,
            }}
          />
        </CardContent>
      </Card>

      {/* Related Districts */}
      <Card>
        <CardHeader>
          <CardTitle>Related Districts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data.relatedDistricts || []).map((district, index) => (
            <div key={index} className="p-3 border rounded-lg space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="District Name"
                  value={district.name || ""}
                  onChange={(e) =>
                    updateArrayItem("relatedDistricts", index, { name: e.target.value })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromArray("relatedDistricts", index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                placeholder="Link (e.g., /districts/district-slug)"
                value={district.link || ""}
                onChange={(e) =>
                  updateArrayItem("relatedDistricts", index, { link: e.target.value })
                }
              />
            </div>
          ))}
          <Button
            onClick={() =>
              addToArray("relatedDistricts", { name: "", link: "", image: "" })
            }
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Related District
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
                placeholder="Trust signal"
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

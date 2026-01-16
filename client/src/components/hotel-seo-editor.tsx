import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SeoHighlightsFieldWithAI, SeoArrayFieldWithAI } from "@/components/seo-field-with-ai";
import { Plus, Trash2, Star, Building, Users, MapPin } from "lucide-react";
import type {
  QuickInfoItem,
  HighlightItem,
  RoomTypeItem,
  EssentialInfoItem,
  DiningItem,
  NearbyItem,
  RelatedItem,
  GalleryImage,
  FaqItem,
} from "@shared/schema";

interface HotelSeoEditorProps {
  data: {
    location?: string;
    starRating?: string;
    numberOfRooms?: string;
    amenities?: string[];
    targetAudience?: string[];
    primaryCta?: string;
    quickInfoBar?: QuickInfoItem[];
    highlights?: HighlightItem[];
    roomTypes?: RoomTypeItem[];
    essentialInfo?: EssentialInfoItem[];
    diningPreview?: DiningItem[];
    activities?: string[];
    travelerTips?: string[];
    faq?: FaqItem[];
    locationNearby?: NearbyItem[];
    relatedHotels?: RelatedItem[];
    photoGallery?: GalleryImage[];
    trustSignals?: string[];
  };
  onChange: (data: any) => void;
  title?: string;
  contentType?: string;
  primaryKeyword?: string;
}

export function HotelSeoEditor({ data, onChange, title = "", contentType = "hotel", primaryKeyword = "" }: HotelSeoEditorProps) {
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
            <Building className="h-5 w-5" />
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
              <Label>Star Rating</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={data.starRating || ""}
                onChange={(e) => updateField("starRating", e.target.value)}
                placeholder="5"
              />
            </div>
            <div>
              <Label>Number of Rooms</Label>
              <Input
                type="number"
                value={data.numberOfRooms || ""}
                onChange={(e) => updateField("numberOfRooms", e.target.value)}
                placeholder="200"
              />
            </div>
          </div>

          <div>
            <Label>Primary CTA</Label>
            <Input
              value={data.primaryCta || ""}
              onChange={(e) => updateField("primaryCta", e.target.value)}
              placeholder="Check Rates & Availability"
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
          <CardTitle>Hotel Highlights</CardTitle>
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

      {/* Room Types */}
      <Card>
        <CardHeader>
          <CardTitle>Room Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data.roomTypes || []).map((room, index) => (
            <div key={index} className="p-3 border rounded-lg space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Room Title"
                  value={room.title || ""}
                  onChange={(e) =>
                    updateArrayItem("roomTypes", index, { title: e.target.value })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromArray("roomTypes", index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Price (e.g., From AED 800)"
                  value={room.price || ""}
                  onChange={(e) =>
                    updateArrayItem("roomTypes", index, { price: e.target.value })
                  }
                />
                <Input
                  placeholder="Image URL"
                  value={room.image || ""}
                  onChange={(e) =>
                    updateArrayItem("roomTypes", index, { image: e.target.value })
                  }
                />
              </div>
            </div>
          ))}
          <Button
            onClick={() =>
              addToArray("roomTypes", {
                title: "",
                price: "",
                image: "",
                features: [],
              })
            }
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Room Type
          </Button>
        </CardContent>
      </Card>

      {/* Amenities */}
      <Card>
        <CardHeader>
          <CardTitle>Amenities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data.amenities || []).map((amenity, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={amenity}
                onChange={(e) => {
                  const updated = [...(data.amenities || [])];
                  updated[index] = e.target.value;
                  updateField("amenities", updated);
                }}
                placeholder="Amenity"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFromArray("amenities", index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            onClick={() => addToArray("amenities", "")}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Amenity
          </Button>
        </CardContent>
      </Card>

      {/* Traveler Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Traveler Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <SeoArrayFieldWithAI
            label=""
            fieldName="Traveler Tips"
            fieldType="tips"
            items={data.travelerTips || []}
            onItemsChange={(items) => updateField("travelerTips", items)}
            itemPlaceholder="Tip"
            addButtonText="Add Tip"
            useTextarea={true}
            contentContext={{
              title,
              contentType,
              primaryKeyword,
            }}
          />
        </CardContent>
      </Card>

      {/* Related Hotels */}
      <Card>
        <CardHeader>
          <CardTitle>Related Hotels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data.relatedHotels || []).map((hotel, index) => (
            <div key={index} className="p-3 border rounded-lg space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Hotel Name"
                  value={hotel.name || ""}
                  onChange={(e) =>
                    updateArrayItem("relatedHotels", index, { name: e.target.value })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromArray("relatedHotels", index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                placeholder="Link (e.g., /hotels/hotel-slug)"
                value={hotel.link || ""}
                onChange={(e) =>
                  updateArrayItem("relatedHotels", index, { link: e.target.value })
                }
              />
            </div>
          ))}
          <Button
            onClick={() => addToArray("relatedHotels", { name: "", link: "", image: "" })}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Related Hotel
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
                placeholder="Trust signal (e.g., TripAdvisor Certificate of Excellence 2024)"
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

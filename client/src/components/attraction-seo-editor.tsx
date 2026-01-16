import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SeoTextFieldWithAI, SeoArrayFieldWithAI, SeoHighlightsFieldWithAI } from "@/components/seo-field-with-ai";
import {
  Plus,
  Trash2,
  GripVertical,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Star,
  Image as ImageIcon,
  Link as LinkIcon,
  CheckCircle,
  Info,
} from "lucide-react";
import type {
  QuickInfoItem,
  HighlightItem,
  TicketInfoItem,
  EssentialInfoItem,
  RelatedItem,
} from "@shared/schema";

interface AttractionSeoEditorProps {
  data: {
    introText?: string;
    expandedIntroText?: string;
    quickInfoBar?: QuickInfoItem[];
    highlights?: HighlightItem[];
    ticketInfo?: TicketInfoItem[];
    essentialInfo?: EssentialInfoItem[];
    visitorTips?: string[];
    relatedAttractions?: RelatedItem[];
    trustSignals?: string[];
    primaryCta?: string;
    location?: string;
    priceFrom?: string;
    duration?: string;
  };
  onChange: (data: any) => void;
  title?: string;
  contentType?: string;
  primaryKeyword?: string;
}

export function AttractionSeoEditor({ data, onChange, title = "", contentType = "attraction", primaryKeyword = "" }: AttractionSeoEditorProps) {
  const updateField = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const addQuickInfoItem = () => {
    const newItem: QuickInfoItem = { icon: "MapPin", label: "", value: "" };
    updateField("quickInfoBar", [...(data.quickInfoBar || []), newItem]);
  };

  const updateQuickInfoItem = (index: number, field: keyof QuickInfoItem, value: string) => {
    const updated = [...(data.quickInfoBar || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateField("quickInfoBar", updated);
  };

  const removeQuickInfoItem = (index: number) => {
    updateField("quickInfoBar", (data.quickInfoBar || []).filter((_, i) => i !== index));
  };

  const addTicketInfo = () => {
    const newItem: TicketInfoItem = { type: "Standard", description: "", price: "" };
    updateField("ticketInfo", [...(data.ticketInfo || []), newItem]);
  };

  const updateTicketInfo = (index: number, field: keyof TicketInfoItem, value: string) => {
    const updated = [...(data.ticketInfo || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateField("ticketInfo", updated);
  };

  const removeTicketInfo = (index: number) => {
    updateField("ticketInfo", (data.ticketInfo || []).filter((_, i) => i !== index));
  };

  const addEssentialInfo = () => {
    const newItem: EssentialInfoItem = { icon: "Info", label: "", value: "" };
    updateField("essentialInfo", [...(data.essentialInfo || []), newItem]);
  };

  const updateEssentialInfo = (index: number, field: keyof EssentialInfoItem, value: string) => {
    const updated = [...(data.essentialInfo || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateField("essentialInfo", updated);
  };

  const removeEssentialInfo = (index: number) => {
    updateField("essentialInfo", (data.essentialInfo || []).filter((_, i) => i !== index));
  };

  const addTrustSignal = () => {
    updateField("trustSignals", [...(data.trustSignals || []), ""]);
  };

  const updateTrustSignal = (index: number, value: string) => {
    const updated = [...(data.trustSignals || [])];
    updated[index] = value;
    updateField("trustSignals", updated);
  };

  const removeTrustSignal = (index: number) => {
    updateField("trustSignals", (data.trustSignals || []).filter((_, i) => i !== index));
  };

  const iconOptions = [
    { value: "MapPin", label: "Location" },
    { value: "Clock", label: "Time" },
    { value: "DollarSign", label: "Price" },
    { value: "Users", label: "People" },
    { value: "Star", label: "Rating" },
    { value: "Info", label: "Info" },
  ];

  return (
    <div className="space-y-6">
      {/* Intro Texts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📝 Intro Texts</CardTitle>
          <CardDescription>
            Brief intro (visible) + Expanded intro (collapsed by default)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SeoTextFieldWithAI
            label="Brief Intro (3 sentences, ~60 words)"
            fieldName="Brief Intro"
            fieldType="intro"
            value={data.introText || ""}
            onChange={(value) => updateField("introText", value)}
            placeholder="Short, compelling intro that appears immediately visible..."
            rows={3}
            wordCount={true}
            contentContext={{
              title,
              contentType,
              primaryKeyword,
            }}
          />

          <SeoTextFieldWithAI
            label="Expanded Intro (~150 words)"
            fieldName="Expanded Intro"
            fieldType="expandedIntro"
            value={data.expandedIntroText || ""}
            onChange={(value) => updateField("expandedIntroText", value)}
            placeholder="Detailed description that expands when user clicks 'Read More'..."
            rows={6}
            wordCount={true}
            contentContext={{
              title,
              contentType,
              primaryKeyword,
            }}
          />
        </CardContent>
      </Card>

      {/* Primary CTA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🎯 Primary CTA</CardTitle>
          <CardDescription>Main call-to-action text (e.g., "Book Tickets Online")</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={data.primaryCta || ""}
            onChange={(e) => updateField("primaryCta", e.target.value)}
            placeholder="Book Tickets Online"
          />
        </CardContent>
      </Card>

      {/* Quick Info Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ℹ️ Quick Info Bar</CardTitle>
          <CardDescription>
            8 key facts displayed prominently (Location, Hours, Price, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data.quickInfoBar || []).map((item, index) => (
            <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
              <GripVertical className="h-5 w-5 text-muted-foreground mt-2 flex-shrink-0" />
              <div className="flex-1 grid grid-cols-3 gap-2">
                <select
                  value={item.icon}
                  onChange={(e) => updateQuickInfoItem(index, "icon", e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  {iconOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <Input
                  value={item.label}
                  onChange={(e) => updateQuickInfoItem(index, "label", e.target.value)}
                  placeholder="Label (e.g., Location)"
                />
                <Input
                  value={item.value}
                  onChange={(e) => updateQuickInfoItem(index, "value", e.target.value)}
                  placeholder="Value (e.g., Downtown Dubai)"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeQuickInfoItem(index)}
                className="flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button onClick={addQuickInfoItem} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Add Info Item
          </Button>
        </CardContent>
      </Card>

      {/* Highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">✨ Highlights (3-4)</CardTitle>
          <CardDescription>What to expect - key experiences with images</CardDescription>
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
            titlePlaceholder="OSS Hope Space Station 2071"
            descriptionPlaceholder="Experience life aboard a future orbital station..."
          />
        </CardContent>
      </Card>

      {/* Ticket Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🎫 Ticket Info & Pricing</CardTitle>
          <CardDescription>Different ticket types with prices and CTAs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data.ticketInfo || []).map((item, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Input
                  value={item.type}
                  onChange={(e) => updateTicketInfo(index, "type", e.target.value)}
                  placeholder="Standard Admission"
                  className="w-1/3"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTicketInfo(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateTicketInfo(index, "description", e.target.value)}
                  placeholder="Adults: From AED 149, Children (3-12): AED 119"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Price Display</Label>
                <Input
                  value={item.price || ""}
                  onChange={(e) => updateTicketInfo(index, "price", e.target.value)}
                  placeholder="From AED 149"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Affiliate Link ID (optional)</Label>
                <Input
                  value={item.affiliateLinkId || ""}
                  onChange={(e) => updateTicketInfo(index, "affiliateLinkId", e.target.value)}
                  placeholder="link-id-from-affiliate-links"
                  className="mt-1"
                />
              </div>
            </div>
          ))}
          <Button onClick={addTicketInfo} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Add Ticket Type
          </Button>
        </CardContent>
      </Card>

      {/* Essential Info Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Essential Info Grid</CardTitle>
          <CardDescription>8 essential facts in grid format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data.essentialInfo || []).map((item, index) => (
            <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
              <GripVertical className="h-5 w-5 text-muted-foreground mt-2 flex-shrink-0" />
              <div className="flex-1 grid grid-cols-3 gap-2">
                <select
                  value={item.icon}
                  onChange={(e) => updateEssentialInfo(index, "icon", e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  {iconOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <Input
                  value={item.label}
                  onChange={(e) => updateEssentialInfo(index, "label", e.target.value)}
                  placeholder="Duration"
                />
                <Input
                  value={item.value}
                  onChange={(e) => updateEssentialInfo(index, "value", e.target.value)}
                  placeholder="2-3 hours"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeEssentialInfo(index)}
                className="flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button onClick={addEssentialInfo} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Add Essential Info
          </Button>
        </CardContent>
      </Card>

      {/* Visitor Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💡 Visitor Tips (5 bullets)</CardTitle>
          <CardDescription>Essential tips for visitors</CardDescription>
        </CardHeader>
        <CardContent>
          <SeoArrayFieldWithAI
            label=""
            fieldName="Visitor Tips"
            fieldType="tips"
            items={data.visitorTips || []}
            onItemsChange={(items) => updateField("visitorTips", items)}
            itemPlaceholder="Book tickets 2-3 days in advance..."
            addButtonText="Add Visitor Tip"
            contentContext={{
              title,
              contentType,
              primaryKeyword,
            }}
          />
        </CardContent>
      </Card>

      {/* Trust Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">✅ Trust Signals</CardTitle>
          <CardDescription>Badges near CTAs (e.g., "✓ Instant confirmation")</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data.trustSignals || []).map((signal, index) => (
            <div key={index} className="flex gap-2 items-center">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <Input
                value={signal}
                onChange={(e) => updateTrustSignal(index, e.target.value)}
                placeholder="Instant confirmation"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeTrustSignal(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button onClick={addTrustSignal} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Add Trust Signal
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

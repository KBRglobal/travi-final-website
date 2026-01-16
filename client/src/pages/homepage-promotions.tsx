import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Star,
  MapPin,
  Building2,
  FileText,
  TrendingUp,
  UtensilsCrossed,
  Calendar,
} from "lucide-react";
import type { Content } from "@shared/schema";

type HomepageSection = "featured" | "attractions" | "hotels" | "articles" | "trending" | "dining" | "events";

interface HomepagePromotion {
  id: string;
  section: HomepageSection;
  contentId: string | null;
  position: number;
  isActive: boolean;
  customTitle: string | null;
  customImage: string | null;
  createdAt: string;
  contents?: Content;
}

const SECTIONS: { value: HomepageSection; label: string; icon: typeof Star }[] = [
  { value: "featured", label: "Featured", icon: Star },
  { value: "attractions", label: "Attractions", icon: MapPin },
  { value: "hotels", label: "Hotels", icon: Building2 },
  { value: "dining", label: "Restaurants", icon: UtensilsCrossed },
  { value: "events", label: "Events", icon: Calendar },
  { value: "articles", label: "Guides", icon: FileText },
  { value: "trending", label: "Trending", icon: TrendingUp },
];

function PromotionsList({ section }: { section: HomepageSection }) {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: promotions = [], isLoading } = useQuery<HomepagePromotion[]>({
    queryKey: ["/api/homepage-promotions", section],
  });

  const { data: publishedContents = [] } = useQuery<Content[]>({
    queryKey: ["/api/contents?status=published"],
  });

  const filteredContents = publishedContents.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase());
    const notAlreadyAdded = !promotions.some((p) => p.contentId === c.id);
    
    if (section === "attractions") return c.type === "attraction" && matchesSearch && notAlreadyAdded;
    if (section === "hotels") return c.type === "hotel" && matchesSearch && notAlreadyAdded;
    if (section === "dining") return c.type === "dining" && matchesSearch && notAlreadyAdded;
    if (section === "events") return c.type === "event" && matchesSearch && notAlreadyAdded;
    if (section === "articles") return c.type === "article" && matchesSearch && notAlreadyAdded;
    return matchesSearch && notAlreadyAdded;
  });

  const createMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const position = promotions.length;
      return apiRequest("POST", "/api/homepage-promotions", {
        section,
        contentId,
        position,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homepage-promotions", section] });
      setAddDialogOpen(false);
      setSelectedContentId("");
      toast({ title: "Content added to section" });
    },
    onError: () => {
      toast({ title: "Failed to add contents", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<HomepagePromotion> }) => {
      return apiRequest("PATCH", `/api/homepage-promotions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homepage-promotions", section] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/homepage-promotions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homepage-promotions", section] });
      toast({ title: "Removed from section" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      return apiRequest("POST", "/api/homepage-promotions/reorder", {
        section,
        orderedIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homepage-promotions", section] });
    },
  });

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...promotions];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderMutation.mutate(newOrder.map((p) => p.id));
  };

  const handleMoveDown = (index: number) => {
    if (index === promotions.length - 1) return;
    const newOrder = [...promotions];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderMutation.mutate(newOrder.map((p) => p.id));
  };

  const handleToggleActive = (promo: HomepagePromotion) => {
    updateMutation.mutate({ id: promo.id, data: { isActive: !promo.isActive } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {promotions.length} item{promotions.length !== 1 ? "s" : ""} in this section
        </p>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-promotion">
              <Plus className="h-4 w-4 mr-2" />
              Add Content
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Content to {section}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Search Published Content</Label>
                <Input
                  placeholder="Search by title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-contents"
                />
              </div>
              <div className="space-y-2">
                <Label>Select Content</Label>
                <Select value={selectedContentId} onValueChange={setSelectedContentId}>
                  <SelectTrigger data-testid="select-contents">
                    <SelectValue placeholder="Choose contents to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredContents.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No available contents found
                      </div>
                    ) : (
                      filteredContents.map((contents) => (
                        <SelectItem key={contents.id} value={contents.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {contents.type}
                            </Badge>
                            <span className="truncate max-w-[200px]">{contents.title}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                disabled={!selectedContentId || createMutation.isPending}
                onClick={() => createMutation.mutate(selectedContentId)}
                data-testid="button-confirm-add"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Add to Section
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {promotions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No contents in this section yet. Click "Add Content" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {promotions.map((promo, index) => (
            <Card key={promo.id} data-testid={`promotion-item-${promo.id}`}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className="flex flex-col gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={index === 0 || reorderMutation.isPending}
                    onClick={() => handleMoveUp(index)}
                    data-testid={`button-move-up-${promo.id}`}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={index === promotions.length - 1 || reorderMutation.isPending}
                    onClick={() => handleMoveDown(index)}
                    data-testid={`button-move-down-${promo.id}`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">
                      {promo.customTitle || promo.contents?.title || "Unknown contents"}
                    </span>
                    {promo.contents && (
                      <Badge variant="outline" className="text-xs">
                        {promo.contents.type}
                      </Badge>
                    )}
                  </div>
                  {promo.contents?.slug && (
                    <p className="text-xs text-muted-foreground truncate">
                      /{promo.contents.type}s/{promo.contents.slug}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={promo.isActive}
                    onCheckedChange={() => handleToggleActive(promo)}
                    data-testid={`switch-active-${promo.id}`}
                  />
                  <span className="text-xs text-muted-foreground w-12">
                    {promo.isActive ? "Active" : "Hidden"}
                  </span>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(promo.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-${promo.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomepagePromotions() {
  const [activeSection, setActiveSection] = useState<HomepageSection>("featured");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-semibold" data-testid="page-title">
          Homepage Promotions
        </h1>
        <p className="text-muted-foreground">
          Manage which contents appears in each section of the public homepage
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Homepage Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as HomepageSection)}>
            <TabsList className="mb-4 flex-wrap">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <TabsTrigger
                    key={section.value}
                    value={section.value}
                    className="gap-2"
                    data-testid={`tab-${section.value}`}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {SECTIONS.map((section) => (
              <TabsContent key={section.value} value={section.value}>
                <PromotionsList section={section.value} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

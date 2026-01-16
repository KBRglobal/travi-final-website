import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Menu, Plus, Trash2, GripVertical, Edit2, Save, X, Lightbulb, 
  ExternalLink, Sparkles, ChevronDown, ChevronRight
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface MenuItem {
  id: string;
  menuId: string;
  parentId: string | null;
  label: string;
  labelHe: string | null;
  href: string;
  icon: string | null;
  openInNewTab: boolean;
  isHighlighted: boolean;
  highlightStyle: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface NavigationMenu {
  id: string;
  name: string;
  slug: string;
  location: string;
  isActive: boolean;
  items: MenuItem[];
}

export default function NavigationManagerPage() {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    label: "",
    labelHe: "",
    href: "",
    icon: "",
    openInNewTab: false,
    isHighlighted: false,
  });

  const { data: menus, isLoading } = useQuery<NavigationMenu[]>({
    queryKey: ["/api/site-config/navigation"],
  });

  const createMenuMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; location: string }) => {
      return apiRequest("POST", "/api/site-config/navigation", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-config/navigation"] });
      toast({ title: "Menu created" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ menuId, data }: { menuId: string; data: Partial<MenuItem> }) => {
      return apiRequest("POST", `/api/site-config/navigation/${menuId}/items`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-config/navigation"] });
      toast({ title: "Menu item added" });
      setShowAddDialog(false);
      setNewItem({ label: "", labelHe: "", href: "", icon: "", openInNewTab: false, isHighlighted: false });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MenuItem> }) => {
      return apiRequest("PUT", `/api/site-config/navigation/items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-config/navigation"] });
      toast({ title: "Menu item updated" });
      setEditingItem(null);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/site-config/navigation/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-config/navigation"] });
      toast({ title: "Menu item deleted" });
    },
  });

  const handleAddItem = () => {
    if (!selectedMenuId || !newItem.label || !newItem.href) return;
    addItemMutation.mutate({ menuId: selectedMenuId, data: newItem });
  };

  const handleCreateDefaultMenu = () => {
    createMenuMutation.mutate({ name: "Main Navigation", slug: "main", location: "header" });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const hasMenus = menus && menus.length > 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Menu className="h-8 w-8 text-primary" />
          Navigation Manager
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure your website's navigation menus and links
        </p>
        
        <div className="mt-4 p-4 bg-muted rounded-lg border">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            איך זה עובד / How It Works
          </h3>
          <p className="text-sm text-muted-foreground mb-2" dir="rtl">
            כאן תוכל לערוך את תפריט הניווט של האתר. הוסף, מחק או שנה את הלינקים שמופיעים בראש האתר.
            ניתן להגדיר גם תרגום לעברית וסגנון מודגש לפריטים מיוחדים.
          </p>
          <p className="text-sm text-muted-foreground">
            Manage your site's navigation menu here. Add, remove, or modify links that appear in the header.
            You can set Hebrew translations and highlight styles for special items.
          </p>
        </div>
      </div>

      {!hasMenus ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Menu className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Navigation Menus</h3>
            <p className="text-muted-foreground mb-4">
              Create your first navigation menu to get started
            </p>
            <Button onClick={handleCreateDefaultMenu} data-testid="button-create-menu">
              <Plus className="h-4 w-4 mr-2" />
              Create Main Menu
            </Button>
          </CardContent>
        </Card>
      ) : (
        menus.map((menu) => (
          <Card key={menu.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Menu className="h-5 w-5" />
                  {menu.name}
                </CardTitle>
                <Badge variant="outline">{menu.location}</Badge>
                {menu.isActive ? (
                  <Badge className="bg-green-500/10 text-green-600">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              <Button
                onClick={() => {
                  setSelectedMenuId(menu.id);
                  setShowAddDialog(true);
                }}
                size="sm"
                data-testid={`button-add-item-${menu.slug}`}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {menu.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No menu items yet. Click "Add Item" to add your first link.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {menu.items.sort((a, b) => a.sortOrder - b.sortOrder).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 border rounded-lg hover-elevate"
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.label}</span>
                          {item.labelHe && (
                            <span className="text-sm text-muted-foreground" dir="rtl">
                              ({item.labelHe})
                            </span>
                          )}
                          {item.isHighlighted && (
                            <Badge className="bg-primary/10 text-primary">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Highlighted
                            </Badge>
                          )}
                          {item.openInNewTab && (
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">{item.href}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.isActive}
                          onCheckedChange={(checked) =>
                            updateItemMutation.mutate({ id: item.id, data: { isActive: checked } })
                          }
                          data-testid={`switch-item-active-${item.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingItem(item)}
                          data-testid={`button-edit-item-${item.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                          data-testid={`button-delete-item-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Label (English)</Label>
                <Input
                  placeholder="Attractions"
                  value={newItem.label}
                  onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
                  data-testid="input-new-item-label"
                />
              </div>
              <div className="space-y-2">
                <Label>Label (Hebrew)</Label>
                <Input
                  placeholder="אטרקציות"
                  value={newItem.labelHe}
                  onChange={(e) => setNewItem({ ...newItem, labelHe: e.target.value })}
                  dir="rtl"
                  data-testid="input-new-item-label-he"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                placeholder="/attractions"
                value={newItem.href}
                onChange={(e) => setNewItem({ ...newItem, href: e.target.value })}
                data-testid="input-new-item-href"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Icon (Lucide name)</Label>
                <Input
                  placeholder="Camera"
                  value={newItem.icon}
                  onChange={(e) => setNewItem({ ...newItem, icon: e.target.value })}
                  data-testid="input-new-item-icon"
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newItem.openInNewTab}
                    onCheckedChange={(checked) => setNewItem({ ...newItem, openInNewTab: checked })}
                  />
                  <Label>Open in new tab</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newItem.isHighlighted}
                    onCheckedChange={(checked) => setNewItem({ ...newItem, isHighlighted: checked })}
                  />
                  <Label>Highlight</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={addItemMutation.isPending} data-testid="button-save-new-item">
              <Save className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Label (English)</Label>
                  <Input
                    value={editingItem.label}
                    onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                    data-testid="input-edit-item-label"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Label (Hebrew)</Label>
                  <Input
                    value={editingItem.labelHe || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, labelHe: e.target.value })}
                    dir="rtl"
                    data-testid="input-edit-item-label-he"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={editingItem.href}
                  onChange={(e) => setEditingItem({ ...editingItem, href: e.target.value })}
                  data-testid="input-edit-item-href"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Input
                    value={editingItem.icon || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, icon: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingItem.openInNewTab}
                      onCheckedChange={(checked) => setEditingItem({ ...editingItem, openInNewTab: checked })}
                    />
                    <Label>Open in new tab</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingItem.isHighlighted}
                      onCheckedChange={(checked) => setEditingItem({ ...editingItem, isHighlighted: checked })}
                    />
                    <Label>Highlight</Label>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editingItem && updateItemMutation.mutate({ id: editingItem.id, data: editingItem })}
              disabled={updateItemMutation.isPending}
              data-testid="button-save-edit-item"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

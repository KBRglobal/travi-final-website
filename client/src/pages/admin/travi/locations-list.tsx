import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MapPin,
  Building2,
  UtensilsCrossed,
  Search,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Settings,
  Download,
  Zap,
  Edit,
  MapPinned,
  Play,
} from "lucide-react";
const STATUS_COLORS: Record<string, string> = {
  discovered: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  enriching: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  generating: "bg-[#6443F4]/10 text-[#6443F4] dark:bg-[#6443F4]/20 dark:text-[#6443F4]",
  ready: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  exported: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  discovered: "Discovered",
  enriching: "Enriching",
  generating: "Generating",
  ready: "Ready",
  error: "Error",
  exported: "Exported",
};

const CATEGORY_ICONS: Record<string, typeof MapPin> = {
  attraction: MapPin,
  hotel: Building2,
  restaurant: UtensilsCrossed,
  dining: UtensilsCrossed,
};

interface LocationWithDistrict {
  id: string;
  name: string;
  slug: string;
  category: string;
  city: string;
  country: string;
  destinationId: string;
  districtId: number | null;
  status: string;
  sourceWikipedia: boolean;
  sourceOsm: boolean;
  sourceTripadvisor: boolean;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  district: { id: number; name: string; slug: string } | null;
}

interface LocationsResponse {
  locations: LocationWithDistrict[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    cities: string[];
    categories: string[];
    statuses: string[];
  };
}

export default function TraviLocationsList() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);
  const [bulkEditValues, setBulkEditValues] = useState<{
    status?: string;
    category?: string;
    city?: string;
    districtId?: number | null;
  }>({});

  const { data: districts } = useQuery<{ id: number; name: string; city: string }[]>({
    queryKey: ["/api/admin/travi/districts", city],
    queryFn: async () => {
      const params = city ? `?city=${city}` : "";
      const response = await fetch(`/api/admin/travi/districts${params}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  const { data, isLoading, refetch } = useQuery<LocationsResponse>({
    queryKey: ["/api/admin/travi/locations", { page, search, city, category, status, district }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "50");
      if (search) params.set("search", search);
      if (city) params.set("city", city);
      if (category) params.set("category", category);
      if (status) params.set("status", status);
      if (district) params.set("district", district);
      const response = await fetch(`/api/admin/travi/locations?${params}`);
      if (!response.ok) throw new Error("Failed to fetch locations");
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/travi/locations/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Location deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/travi/locations"] });
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
    },
    onError: () => {
      toast({ title: "Failed to delete location", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return apiRequest("POST", "/api/admin/travi/locations/bulk", {
        action: "delete",
        ids,
      });
    },
    onSuccess: () => {
      toast({ title: `${selectedIds.size} locations deleted` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/travi/locations"] });
      setSelectedIds(new Set());
      setBulkDeleteDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to delete locations", variant: "destructive" });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      return apiRequest("POST", "/api/admin/travi/locations/bulk", {
        action: "set_status",
        ids,
        status,
      });
    },
    onSuccess: (_, variables) => {
      toast({ title: `${selectedIds.size} locations updated to ${variables.status}` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/travi/locations"] });
      setSelectedIds(new Set());
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const bulkEditMutation = useMutation({
    mutationFn: async (data: { ids: string[]; status?: string; category?: string; city?: string; districtId?: number | null }) => {
      return apiRequest("POST", "/api/admin/travi/locations/bulk", {
        action: "bulk_update",
        ids: data.ids,
        status: data.status,
        category: data.category,
        city: data.city,
        districtId: data.districtId,
      });
    },
    onSuccess: () => {
      toast({ title: `${selectedIds.size} locations updated successfully` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/travi/locations"] });
      setSelectedIds(new Set());
      setBulkEditDialogOpen(false);
      setBulkEditValues({});
    },
    onError: () => {
      toast({ title: "Failed to update locations", variant: "destructive" });
    },
  });

  const autoAssignDistrictsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/travi/districts/auto-assign", { city: "Dubai" });
    },
    onSuccess: (data: { assigned: number; skipped: number; totalLocations: number }) => {
      if (data.assigned === 0 && data.skipped > 0) {
        toast({
          title: "No locations assigned",
          description: `${data.skipped} locations skipped (missing coordinates). Add GPS coordinates to locations first.`,
          variant: "destructive",
        });
      } else if (data.skipped > data.assigned * 3) {
        toast({
          title: `Assigned ${data.assigned} locations`,
          description: `${data.skipped} locations skipped (missing coordinates or outside districts).`,
          variant: "default",
        });
      } else {
        toast({
          title: "Districts assigned",
          description: `${data.assigned} locations assigned to districts`,
        });
      }
      refetch();
    },
    onError: () => {
      toast({ title: "Failed to auto-assign districts", variant: "destructive" });
    },
  });

  const bulkProcessMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/travi/locations/bulk-process", { 
        city: "Dubai", 
        provider: "openai", 
        limit: 10 
      });
    },
    onSuccess: (response: any) => {
      toast({ 
        title: "Bulk Process Complete", 
        description: `Processed ${response?.processed || 0} locations` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/travi/locations"] });
    },
    onError: () => {
      toast({ title: "Failed to process locations", variant: "destructive" });
    },
  });

  const handleBulkStatusChange = (newStatus: string) => {
    if (selectedIds.size > 0 && newStatus) {
      bulkStatusMutation.mutate({ ids: Array.from(selectedIds), status: newStatus });
    }
  };

  const handleBulkEdit = () => {
    const hasValidValue = Object.entries(bulkEditValues).some(([key, v]) => {
      if (key === 'districtId') return v !== undefined;
      return v !== undefined && v !== "";
    });
    if (selectedIds.size > 0 && hasValidValue) {
      const cleanedValues = Object.fromEntries(
        Object.entries(bulkEditValues).filter(([key, v]) => {
          if (key === 'districtId') return v !== undefined;
          return v !== undefined && v !== "";
        })
      );
      bulkEditMutation.mutate({ ids: Array.from(selectedIds), ...cleanedValues });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.locations) {
      setSelectedIds(new Set(data.locations.map((l) => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleDelete = (id: string) => {
    setLocationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (locationToDelete) {
      deleteMutation.mutate(locationToDelete);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size > 0) {
      setBulkDeleteDialogOpen(true);
    }
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  const resetFilters = () => {
    setSearch("");
    setCity("");
    setCategory("");
    setStatus("");
    setDistrict("");
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const locations = data?.locations || [];
  const filters = data?.filters || { cities: [], categories: [], statuses: [] };
  const allSelected = locations.length > 0 && selectedIds.size === locations.length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">TRAVI Locations</h1>
          <p className="text-muted-foreground">
            Manage travel locations for all destinations ({data?.total || 0} total)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" asChild data-testid="link-generator">
            <Link href="/admin/travi-generator">
              <Zap className="h-4 w-4 mr-2" />
              Generator
            </Link>
          </Button>
          <Button variant="outline" asChild data-testid="link-config">
            <Link href="/admin/travi/config">
              <Settings className="h-4 w-4 mr-2" />
              Config
            </Link>
          </Button>
          <Button variant="outline" asChild data-testid="link-export">
            <a href="/api/admin/travi/export?format=csv" download>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </a>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => refetch()} 
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={() => autoAssignDistrictsMutation.mutate()}
            disabled={autoAssignDistrictsMutation.isPending}
            data-testid="button-auto-assign-districts"
          >
            <MapPinned className="h-4 w-4 mr-2" />
            {autoAssignDistrictsMutation.isPending ? "Assigning..." : "Auto-Assign Districts"}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => bulkProcessMutation.mutate()}
            disabled={bulkProcessMutation.isPending}
            data-testid="button-process-discovered"
          >
            <Play className="h-4 w-4 mr-2" />
            {bulkProcessMutation.isPending ? "Processing..." : "Process Discovered"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select
              value={city}
              onValueChange={(val) => {
                setCity(val === "all" ? "" : val);
                setDistrict("");
                setPage(1);
              }}
            >
              <SelectTrigger data-testid="select-city">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {filters.cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={category}
              onValueChange={(val) => {
                setCategory(val === "all" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {filters.categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(val) => {
                setStatus(val === "all" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger data-testid="select-status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {filters.statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={district}
              onValueChange={(val) => {
                setDistrict(val === "all" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger data-testid="select-district">
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {(districts || []).map((d) => (
                  <SelectItem key={d.id} value={d.id.toString()}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetFilters} data-testid="button-reset">
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-md flex-wrap">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Select onValueChange={handleBulkStatusChange} disabled={bulkStatusMutation.isPending}>
            <SelectTrigger className="w-[180px]" data-testid="select-bulk-status">
              <SelectValue placeholder="Change Status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="discovered">Discovered</SelectItem>
              <SelectItem value="enriching">Enriching</SelectItem>
              <SelectItem value="generating">Generating</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="exported">Exported</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkEditDialogOpen(true)}
            data-testid="button-bulk-edit"
          >
            <Edit className="h-4 w-4 mr-2" />
            Bulk Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isPending}
            data-testid="button-bulk-delete"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            data-testid="button-clear-selection"
          >
            Clear Selection
          </Button>
        </div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No locations found. Run the generator to discover locations.
                </TableCell>
              </TableRow>
            ) : (
              locations.map((location) => {
                const CategoryIcon = CATEGORY_ICONS[location.category] || MapPin;
                return (
                  <TableRow key={location.id} data-testid={`row-location-${location.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(location.id)}
                        onCheckedChange={(checked) =>
                          handleSelectOne(location.id, checked as boolean)
                        }
                        data-testid={`checkbox-${location.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                        {location.name}
                      </div>
                    </TableCell>
                    <TableCell>{location.city}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {location.category.charAt(0).toUpperCase() + location.category.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {location.district?.name || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[location.status] || ""}>
                        {location.status.charAt(0).toUpperCase() + location.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {location.updatedAt
                        ? new Date(location.updatedAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          data-testid={`button-preview-${location.id}`}
                        >
                          <Link href={`/admin/travi/locations/${location.id}/preview`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          data-testid={`button-edit-${location.id}`}
                        >
                          <Link href={`/admin/travi/locations/${location.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(location.id)}
                          data-testid={`button-delete-${location.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages} ({data.total} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this location? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Locations</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} locations? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit {selectedIds.size} Locations</DialogTitle>
            <DialogDescription>
              Select the fields you want to update. Only selected values will be applied.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={bulkEditValues.status || ""}
                onValueChange={(val) => setBulkEditValues(prev => ({ ...prev, status: val || undefined }))}
              >
                <SelectTrigger data-testid="bulk-edit-status">
                  <SelectValue placeholder="Keep current status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discovered">Discovered</SelectItem>
                  <SelectItem value="enriching">Enriching</SelectItem>
                  <SelectItem value="generating">Generating</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="exported">Exported</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={bulkEditValues.category || ""}
                onValueChange={(val) => setBulkEditValues(prev => ({ ...prev, category: val || undefined }))}
              >
                <SelectTrigger data-testid="bulk-edit-category">
                  <SelectValue placeholder="Keep current category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attraction">Attraction</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Select
                value={bulkEditValues.city || ""}
                onValueChange={(val) => setBulkEditValues(prev => ({ ...prev, city: val || undefined }))}
              >
                <SelectTrigger data-testid="bulk-edit-city">
                  <SelectValue placeholder="Keep current city" />
                </SelectTrigger>
                <SelectContent>
                  {filters.cities.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>District</Label>
              <Select
                value={bulkEditValues.districtId === null ? "clear" : (bulkEditValues.districtId?.toString() || "")}
                onValueChange={(val) => setBulkEditValues(prev => ({ 
                  ...prev, 
                  districtId: val === "clear" ? null : (val ? parseInt(val) : undefined)
                }))}
              >
                <SelectTrigger data-testid="bulk-edit-district">
                  <SelectValue placeholder="Keep current district" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clear">Clear district</SelectItem>
                  {(districts || []).map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkEditDialogOpen(false);
                setBulkEditValues({});
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkEdit}
              disabled={bulkEditMutation.isPending || !Object.entries(bulkEditValues).some(([key, v]) => key === 'districtId' ? v !== undefined : (v !== undefined && v !== ""))}
              data-testid="button-apply-bulk-edit"
            >
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

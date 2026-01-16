/**
 * Entity Merge Admin Page
 *
 * Admin tool for detecting and merging duplicate entities.
 *
 * FEATURE 4: Entity Merge & Canonicalization
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Copy, Merge, AlertTriangle, CheckCircle, Clock,
  ArrowRight, Undo, MapPin, FileText, Hotel, Landmark
} from "lucide-react";

type EntityType = 'destination' | 'attraction' | 'hotel' | 'article';
type MergeStrategy = 'keep_target' | 'keep_source' | 'merge_content';
type Confidence = 'high' | 'medium' | 'low';

interface EntityInfo {
  id: string;
  name: string;
  slug: string;
  location?: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface DuplicatePair {
  entityType: EntityType;
  entityA: EntityInfo;
  entityB: EntityInfo;
  matchType: string;
  similarity: number;
  confidence: Confidence;
  suggestedAction: 'merge' | 'review' | 'ignore';
  reasons: string[];
}

interface DuplicateStats {
  byType: Record<EntityType, number>;
  byConfidence: Record<Confidence, number>;
  total: number;
  featureEnabled: boolean;
}

interface Redirect {
  id: string;
  entityType: EntityType;
  fromId: string;
  fromSlug: string;
  toId: string;
  toSlug: string;
  mergedAt: string;
  mergedBy: string;
}

export default function EntityMergePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [selectedPair, setSelectedPair] = useState<DuplicatePair | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>("keep_target");
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  // Fetch duplicate stats
  const { data: stats, isLoading: statsLoading } = useQuery<DuplicateStats>({
    queryKey: ["/api/admin/entities/duplicates/stats"],
  });

  // Fetch duplicates
  const { data: duplicatesData, isLoading: duplicatesLoading } = useQuery<{
    duplicates: DuplicatePair[];
    totalScanned: number;
    featureEnabled: boolean;
  }>({
    queryKey: ["/api/admin/entities/duplicates", entityTypeFilter],
    queryFn: async () => {
      const params = entityTypeFilter !== "all" ? `?type=${entityTypeFilter}` : "";
      const res = await apiRequest("GET", `/api/admin/entities/duplicates${params}`);
      return res.json();
    },
  });

  // Fetch merge history
  const { data: historyData } = useQuery<{ history: Redirect[]; count: number }>({
    queryKey: ["/api/admin/entities/merge/history"],
  });

  // Merge mutation
  const mergeMutation = useMutation({
    mutationFn: async ({ sourceId, targetId, strategy }: { sourceId: string; targetId: string; strategy: MergeStrategy }) => {
      return apiRequest("POST", `/api/admin/entities/${sourceId}/merge`, {
        intoId: targetId,
        strategy,
      });
    },
    onSuccess: () => {
      toast({ title: "Entities merged successfully" });
      setShowMergeDialog(false);
      setSelectedPair(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/entities/duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/entities/merge/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/entities/duplicates/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Merge failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Undo merge mutation
  const undoMutation = useMutation({
    mutationFn: async (redirectId: string) => {
      return apiRequest("POST", `/api/admin/entities/merge/undo/${redirectId}`);
    },
    onSuccess: () => {
      toast({ title: "Merge undone successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/entities/merge/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/entities/duplicates"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Undo failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMerge = () => {
    if (!selectedPair) return;

    // Determine which entity to merge into which based on status/date
    const sourceEntity = selectedPair.entityA.status === 'draft'
      ? selectedPair.entityA
      : (selectedPair.entityB.status === 'draft' ? selectedPair.entityB : selectedPair.entityA);
    const targetEntity = sourceEntity === selectedPair.entityA
      ? selectedPair.entityB
      : selectedPair.entityA;

    mergeMutation.mutate({
      sourceId: sourceEntity.id,
      targetId: targetEntity.id,
      strategy: mergeStrategy,
    });
  };

  const getEntityIcon = (type: EntityType) => {
    switch (type) {
      case 'destination': return <MapPin className="h-4 w-4" />;
      case 'attraction': return <Landmark className="h-4 w-4" />;
      case 'hotel': return <Hotel className="h-4 w-4" />;
      case 'article': return <FileText className="h-4 w-4" />;
    }
  };

  const getConfidenceBadge = (confidence: Confidence) => {
    switch (confidence) {
      case 'high':
        return <Badge variant="destructive" className="bg-red-500">High</Badge>;
      case 'medium':
        return <Badge variant="default" className="bg-orange-500">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Merge className="h-8 w-8 text-primary" />
          Entity Merge
        </h1>
        <p className="text-muted-foreground mt-1">
          Detect and merge duplicate entities to maintain data integrity
        </p>
      </div>

      {!stats?.featureEnabled && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              <p>Entity merge is disabled. Set <code className="bg-orange-100 px-1 rounded">ENABLE_ENTITY_MERGE=true</code> to enable.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Duplicates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Destinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.byType?.destination || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              Attractions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.byType?.attraction || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Hotel className="h-4 w-4" />
              Hotels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.byType?.hotel || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Articles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.byType?.article || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="duplicates">
        <TabsList>
          <TabsTrigger value="duplicates">Potential Duplicates</TabsTrigger>
          <TabsTrigger value="history">Merge History</TabsTrigger>
        </TabsList>

        <TabsContent value="duplicates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detected Duplicates</CardTitle>
                  <CardDescription>
                    Review and merge duplicate entities
                  </CardDescription>
                </div>
                <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="destination">Destinations</SelectItem>
                    <SelectItem value="attraction">Attractions</SelectItem>
                    <SelectItem value="hotel">Hotels</SelectItem>
                    <SelectItem value="article">Articles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {duplicatesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {duplicatesData?.duplicates?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        <p>No duplicates detected</p>
                        <p className="text-sm">Your entities are all unique</p>
                      </div>
                    ) : (
                      duplicatesData?.duplicates?.map((pair, index) => (
                        <div
                          key={`${pair.entityA.id}-${pair.entityB.id}`}
                          className="p-4 border rounded-lg"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1">
                              {getEntityIcon(pair.entityType)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{pair.entityA.name}</span>
                                  <Badge variant="outline" className="text-xs">{pair.entityA.status}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">/{pair.entityA.slug}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-muted-foreground">
                              <ArrowRight className="h-4 w-4" />
                              <Badge variant="secondary">{(pair.similarity * 100).toFixed(0)}%</Badge>
                              <ArrowRight className="h-4 w-4" />
                            </div>

                            <div className="flex-1 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-medium">{pair.entityB.name}</span>
                                <Badge variant="outline" className="text-xs">{pair.entityB.status}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">/{pair.entityB.slug}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <div className="flex items-center gap-2">
                              {getConfidenceBadge(pair.confidence)}
                              <span className="text-sm text-muted-foreground capitalize">
                                {pair.matchType.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {pair.suggestedAction === 'merge' && (
                                <Badge variant="default" className="bg-green-500">Suggested: Merge</Badge>
                              )}
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedPair(pair);
                                  setShowMergeDialog(true);
                                }}
                                disabled={!stats?.featureEnabled}
                              >
                                <Merge className="h-4 w-4 mr-1" />
                                Merge
                              </Button>
                            </div>
                          </div>

                          {pair.reasons.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {pair.reasons.join(' • ')}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Merge History</CardTitle>
              <CardDescription>
                Past merge operations and redirects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {historyData?.history?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No merge history yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyData?.history?.map((redirect) => (
                      <div
                        key={redirect.id}
                        className="p-3 border rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {getEntityIcon(redirect.entityType)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">/{redirect.fromSlug}</span>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm">/{redirect.toSlug}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Merged {new Date(redirect.mergedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => undoMutation.mutate(redirect.id)}
                          disabled={undoMutation.isPending}
                        >
                          <Undo className="h-4 w-4 mr-1" />
                          Undo
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Entities</DialogTitle>
            <DialogDescription>
              Choose how to merge these duplicate entities
            </DialogDescription>
          </DialogHeader>

          {selectedPair && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedPair.entityA.name}</p>
                    <p className="text-xs text-muted-foreground">Source (will be archived)</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div className="text-right">
                    <p className="font-medium">{selectedPair.entityB.name}</p>
                    <p className="text-xs text-muted-foreground">Target (will keep)</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Merge Strategy</Label>
                <RadioGroup value={mergeStrategy} onValueChange={(v) => setMergeStrategy(v as MergeStrategy)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="keep_target" id="keep_target" />
                    <Label htmlFor="keep_target" className="font-normal">
                      Keep target values (discard source)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="keep_source" id="keep_source" />
                    <Label htmlFor="keep_source" className="font-normal">
                      Overwrite with source values
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="merge_content" id="merge_content" />
                    <Label htmlFor="merge_content" className="font-normal">
                      Merge contents blocks (combine both)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <div className="text-sm text-orange-700">
                    <p className="font-medium">This action creates a redirect</p>
                    <p className="text-xs mt-1">
                      Old URLs will redirect to the merged entity. The source entity will be archived.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMerge} disabled={mergeMutation.isPending}>
              {mergeMutation.isPending ? "Merging..." : "Confirm Merge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, Image, Trash2, Copy, Search, AlertTriangle } from "lucide-react";
import type { MediaFile } from "@shared/schema";

interface MediaUsage {
  isUsed: boolean;
  usedIn: Array<{
    id: number;
    title: string;
    type: string;
    slug: string;
  }>;
}

export default function MediaLibrary() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [editAltText, setEditAltText] = useState("");
  const [usageWarningOpen, setUsageWarningOpen] = useState(false);
  const [mediaUsage, setMediaUsage] = useState<MediaUsage | null>(null);
  const [checkingUsage, setCheckingUsage] = useState(false);

  const { data: files, isLoading } = useQuery<MediaFile[]>({
    queryKey: ["/api/media"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(error.error || "Upload failed");
      }
      const result = await response.json();
      // Map new API response to expected format
      return result.image || result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
      toast({ title: "File uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to upload file", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/media/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
      setSelectedFile(null);
      toast({ title: "File deleted" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, altText }: { id: string; altText: string }) =>
      apiRequest("PATCH", `/api/media/${id}`, { altText }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
      toast({ title: "Alt text updated" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleDeleteClick = async () => {
    if (!selectedFile) return;
    
    setCheckingUsage(true);
    try {
      const response = await fetch(`/api/media/${selectedFile.id}/usage`, {
        credentials: "include",
      });
      if (!response.ok) {
        deleteMutation.mutate(selectedFile.id);
        return;
      }
      
      const usage: MediaUsage = await response.json();
      
      if (usage.isUsed && usage.usedIn.length > 0) {
        setMediaUsage(usage);
        setUsageWarningOpen(true);
      } else {
        deleteMutation.mutate(selectedFile.id);
      }
    } catch {
      deleteMutation.mutate(selectedFile.id);
    } finally {
      setCheckingUsage(false);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedFile) {
      deleteMutation.mutate(selectedFile.id);
      setUsageWarningOpen(false);
      setMediaUsage(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "URL copied to clipboard" });
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const filteredFiles = files?.filter(
    (file) =>
      file.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.altText?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Media Library</h1>
          <p className="text-muted-foreground">Upload and manage images and files</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="pl-9 w-64"
              data-testid="input-search-media"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button onClick={openFileDialog} disabled={uploadMutation.isPending} data-testid="button-upload">
            <Upload className="h-4 w-4 mr-2" />
            {uploadMutation.isPending ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {!filteredFiles || filteredFiles.length === 0 ? (
        <EmptyState
          icon={Image}
          title={searchQuery ? "No matching files" : "No media files"}
          description={
            searchQuery
              ? "Try adjusting your search query."
              : "Upload images and files to use in your contents."
          }
          actionLabel={!searchQuery ? "Upload Your First File" : undefined}
          onAction={!searchQuery ? openFileDialog : undefined}
        />
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          {filteredFiles.map((file) => (
            <Card
              key={file.id}
              className="overflow-hidden cursor-pointer hover-elevate"
              onClick={() => {
                setSelectedFile(file);
                setEditAltText(file.altText || "");
              }}
              data-testid={`card-file-${file.id}`}
            >
              <div className="aspect-square bg-muted relative">
                {file.mimeType.startsWith("image/") ? (
                  <img
                    src={file.url}
                    alt={file.altText || file.originalFilename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Image className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <CardContent className="p-2">
                <p className="text-xs truncate" title={file.originalFilename}>
                  {file.originalFilename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>File Details</DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {selectedFile.mimeType.startsWith("image/") ? (
                  <img
                    src={selectedFile.url}
                    alt={selectedFile.altText || selectedFile.originalFilename}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Image className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Filename</p>
                  <p className="text-sm text-muted-foreground">{selectedFile.originalFilename}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Size</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
                {selectedFile.width && selectedFile.height && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Dimensions</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedFile.width} x {selectedFile.height}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm font-medium">Type</p>
                  <p className="text-sm text-muted-foreground">{selectedFile.mimeType}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="alt-text">Alt Text</Label>
                <div className="flex gap-2">
                  <Input
                    id="alt-text"
                    value={editAltText}
                    onChange={(e) => setEditAltText(e.target.value)}
                    placeholder="Describe the image..."
                    data-testid="input-alt-text"
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateMutation.mutate({ id: selectedFile.id, altText: editAltText })
                    }
                    disabled={updateMutation.isPending}
                    data-testid="button-save-alt"
                  >
                    Save
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <div className="flex gap-2">
                  <Input value={selectedFile.url} readOnly className="font-mono text-xs" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(selectedFile.url)}
                    data-testid="button-copy-url"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={deleteMutation.isPending || checkingUsage}
              data-testid="button-delete-file"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {checkingUsage ? "Checking..." : "Delete File"}
            </Button>
            <Button variant="outline" onClick={() => setSelectedFile(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={usageWarningOpen} onOpenChange={setUsageWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Media In Use
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>This media file is currently used in the following contents items:</p>
                {mediaUsage && mediaUsage.usedIn.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1">
                    {mediaUsage.usedIn.map((item) => (
                      <li key={`${item.type}-${item.id}`} className="text-sm">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-muted-foreground"> ({item.type})</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-destructive font-medium">
                  Deleting this file will break these contents items and cause missing images.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

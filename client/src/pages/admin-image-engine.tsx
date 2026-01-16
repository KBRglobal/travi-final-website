import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  Search, 
  Image as ImageIcon, 
  ThumbsUp, 
  ThumbsDown, 
  SkipForward,
  Check,
  X,
  Loader2,
  Grid3X3,
  List,
  Download,
  Trash2,
  RefreshCw,
  BarChart3,
  Wand2,
  Eye,
  Copy,
  Upload,
  FolderUp,
  ImagePlus,
  ExternalLink,
  Filter,
} from "lucide-react";
import type { AiGeneratedImage } from "@shared/schema";

interface KeywordsData {
  categories: Record<string, { topics: string[]; imageTypes: string[] }>;
  allTopics: string[];
  imageTypes: string[];
}

interface LibraryResponse {
  images: AiGeneratedImage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface StatsResponse {
  total: number;
  approved: number;
  liked: number;
  disliked: number;
  byCategory: { category: string; count: string }[];
  topTopics: { topic: string; count: string }[];
}

interface FreepikResult {
  id: string;
  title: string;
  previewUrl: string;
  downloadUrl: string;
  author?: string;
  width?: number;
  height?: number;
}

interface FreepikSearchResponse {
  results: FreepikResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UploadProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
}

export default function AdminImageEngine() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upload");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedImageType, setSelectedImageType] = useState("hero");
  const [customPrompt, setCustomPrompt] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [topicSearch, setTopicSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedImage, setSelectedImage] = useState<AiGeneratedImage | null>(null);
  const [ratingIndex, setRatingIndex] = useState(0);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [filterSource, setFilterSource] = useState("all");

  const [freepikQuery, setFreepikQuery] = useState("");
  const [freepikSearchTerm, setFreepikSearchTerm] = useState("");
  
  const [uploadFiles, setUploadFiles] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("general");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: keywordsData, isLoading: keywordsLoading } = useQuery<KeywordsData>({
    queryKey: ["/api/image-engine/keywords"],
  });

  const { data: libraryData, isLoading: libraryLoading, refetch: refetchLibrary } = useQuery<LibraryResponse>({
    queryKey: ["/api/image-engine/library", { 
      search: searchQuery || undefined, 
      category: filterCategory !== "all" ? filterCategory : undefined, 
      rating: filterRating !== "all" ? filterRating : undefined,
      source: filterSource !== "all" ? filterSource : undefined,
    }],
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ["/api/image-engine/stats"],
  });

  const { data: searchResults } = useQuery<string[]>({
    queryKey: [`/api/image-engine/keywords/search?q=${encodeURIComponent(topicSearch)}`],
    enabled: topicSearch.length > 2,
  });

  const { data: freepikData, isLoading: freepikLoading, refetch: refetchFreepik } = useQuery<FreepikSearchResponse>({
    queryKey: [`/api/freepik/search?q=${encodeURIComponent(freepikSearchTerm)}`],
    enabled: freepikSearchTerm.length > 0,
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { topic: string; imageType: string; category: string; customPrompt?: string }) => {
      const res = await apiRequest("POST", "/api/image-engine/generate", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Image generated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/image-engine/library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/image-engine/stats"] });
    },
    onError: (error: Error) => {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    },
  });

  const rateMutation = useMutation({
    mutationFn: async ({ id, rating }: { id: string; rating: "like" | "dislike" | "skip" }) => {
      const res = await apiRequest("PATCH", `/api/image-engine/library/${id}/rate`, { rating });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/image-engine/library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/image-engine/stats"] });
      setRatingIndex((prev) => prev + 1);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const res = await apiRequest("PATCH", `/api/image-engine/library/${id}/approve`, { approved });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/image-engine/library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/image-engine/stats"] });
      toast({ title: "Image approval updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/image-engine/library/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/image-engine/library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/image-engine/stats"] });
      toast({ title: "Image deleted" });
      setSelectedImage(null);
    },
  });

  const importFreepikMutation = useMutation({
    mutationFn: async (data: { imageUrl: string; title: string; category: string }) => {
      const res = await apiRequest("POST", "/api/freepik/import", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Image imported successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/image-engine/library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/image-engine/stats"] });
    },
    onError: (error: Error) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  const handleGenerate = () => {
    if (!selectedTopic) {
      toast({ title: "Please select a topic", variant: "destructive" });
      return;
    }
    generateMutation.mutate({
      topic: selectedTopic,
      imageType: selectedImageType,
      category: selectedCategory || "general",
      customPrompt: customPrompt || undefined,
    });
  };

  const handleFreepikSearch = () => {
    if (freepikQuery.trim()) {
      setFreepikSearchTerm(freepikQuery.trim());
    }
  };

  const handleFreepikImport = (result: FreepikResult) => {
    importFreepikMutation.mutate({
      imageUrl: result.downloadUrl || result.previewUrl,
      title: result.title,
      category: "general",
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length > 0) {
      addFilesToUpload(files);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
    if (files.length > 0) {
      addFilesToUpload(files);
    }
  };

  const addFilesToUpload = (files: File[]) => {
    const newUploads: UploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: "pending",
    }));
    setUploadFiles(prev => [...prev, ...newUploads]);
  };

  const startBulkUpload = async () => {
    const pendingFiles = uploadFiles.filter(u => u.status === "pending");
    if (pendingFiles.length === 0) return;

    const formData = new FormData();
    pendingFiles.forEach(u => formData.append("files", u.file));
    formData.append("category", uploadCategory);

    setUploadFiles(prev => prev.map(u => 
      u.status === "pending" ? { ...u, status: "uploading" as const, progress: 10 } : u
    ));

    try {
      const response = await fetch("/api/image-engine/bulk-upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      
      setUploadFiles(prev => prev.map(u => 
        u.status === "uploading" ? { ...u, status: "complete" as const, progress: 100 } : u
      ));

      toast({ 
        title: "Upload complete", 
        description: `${result.uploaded} images uploaded successfully${result.failed > 0 ? `, ${result.failed} failed` : ""}` 
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/image-engine/library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/image-engine/stats"] });
    } catch (error) {
      setUploadFiles(prev => prev.map(u => 
        u.status === "uploading" ? { ...u, status: "error" as const, error: "Upload failed" } : u
      ));
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const clearCompletedUploads = () => {
    setUploadFiles(prev => prev.filter(u => u.status !== "complete"));
  };

  const categories = keywordsData?.categories ? Object.keys(keywordsData.categories).filter((c): c is string => typeof c === "string") : [];
  const topics = selectedCategory && keywordsData?.categories?.[selectedCategory]?.topics || [];
  const filteredTopics = topicSearch 
    ? (searchResults || keywordsData?.allTopics?.filter(t => 
        t.toLowerCase().includes(topicSearch.toLowerCase())
      ) || [])
    : topics;

  const unratedImages = libraryData?.images?.filter(img => !img.userRating) || [];
  const currentRatingImage = unratedImages[ratingIndex % Math.max(unratedImages.length, 1)];

  const getSourceColor = (source: string | null | undefined) => {
    switch (source) {
      case "openai": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "gemini": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "freepik": return "bg-[#6443F4]/10 text-[#6443F4] dark:bg-[#6443F4]/20 dark:text-[#6443F4]";
      case "stock": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "upload": return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="border-b px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Image Engine
            </h1>
            <p className="text-sm text-muted-foreground">
              Bulk upload, search stock images, and manage your visual contents library
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchLibrary()}
              data-testid="button-refresh-library"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {statsData && (
              <Badge variant="secondary" className="text-sm">
                {statsData.total} images
              </Badge>
            )}
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b px-6">
          <TabsList className="h-12">
            <TabsTrigger value="upload" className="gap-2" data-testid="tab-upload">
              <Upload className="h-4 w-4" />
              Bulk Upload
            </TabsTrigger>
            <TabsTrigger value="freepik" className="gap-2" data-testid="tab-freepik">
              <ImagePlus className="h-4 w-4" />
              Freepik Search
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2" data-testid="tab-library">
              <Grid3X3 className="h-4 w-4" />
              Library
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-2" data-testid="tab-generate">
              <Wand2 className="h-4 w-4" />
              AI Generate
            </TabsTrigger>
            <TabsTrigger value="rate" className="gap-2" data-testid="tab-rate">
              <ThumbsUp className="h-4 w-4" />
              Rate ({unratedImages.length})
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2" data-testid="tab-stats">
              <BarChart3 className="h-4 w-4" />
              Stats
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="upload" className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderUp className="h-5 w-5" />
                  Bulk Image Upload
                </CardTitle>
                <CardDescription>
                  Drag and drop multiple images or click to select files. All images will be added to your library.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <Label>Category</Label>
                    <Select value={uploadCategory} onValueChange={setUploadCategory}>
                      <SelectTrigger data-testid="select-upload-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="attractions">Attractions</SelectItem>
                        <SelectItem value="hotels">Hotels</SelectItem>
                        <SelectItem value="dining">Dining</SelectItem>
                        <SelectItem value="districts">Districts</SelectItem>
                        <SelectItem value="transport">Transport</SelectItem>
                        <SelectItem value="events">Events</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    isDragging 
                      ? "border-primary bg-primary/5" 
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  data-testid="drop-zone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="file-input"
                  />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    {isDragging ? "Drop images here" : "Drag and drop images"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to browse your files
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-browse-files"
                  >
                    Browse Files
                  </Button>
                </div>

                {uploadFiles.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium">
                        {uploadFiles.length} file{uploadFiles.length !== 1 ? "s" : ""} selected
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearCompletedUploads}
                          data-testid="button-clear-completed"
                        >
                          Clear Completed
                        </Button>
                        <Button
                          onClick={startBulkUpload}
                          disabled={uploadFiles.every(u => u.status !== "pending")}
                          data-testid="button-start-upload"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload All
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {uploadFiles.map((upload, idx) => (
                        <div key={idx} className="relative group">
                          <div className="aspect-square rounded-md overflow-hidden bg-muted">
                            <img
                              src={URL.createObjectURL(upload.file)}
                              alt={upload.file.name}
                              className="w-full h-full object-cover"
                            />
                            {upload.status === "uploading" && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                              </div>
                            )}
                            {upload.status === "complete" && (
                              <div className="absolute inset-0 bg-green-500/50 flex items-center justify-center">
                                <Check className="h-6 w-6 text-white" />
                              </div>
                            )}
                            {upload.status === "error" && (
                              <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                                <X className="h-6 w-6 text-white" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs truncate mt-1">{upload.file.name}</p>
                          {upload.status === "uploading" && (
                            <Progress value={upload.progress} className="h-1 mt-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="freepik" className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b p-4 flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Freepik stock images..."
                value={freepikQuery}
                onChange={(e) => setFreepikQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFreepikSearch()}
                className="pl-9"
                data-testid="input-freepik-search"
              />
            </div>
            <Button onClick={handleFreepikSearch} disabled={!freepikQuery.trim() || freepikLoading} data-testid="button-freepik-search">
              {freepikLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Search</span>
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            {!freepikSearchTerm ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <ImagePlus className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Search Freepik</p>
                <p className="text-sm">Enter a search term to find stock images</p>
              </div>
            ) : freepikLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !freepikData?.results?.length ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
                <p>No results found for "{freepikSearchTerm}"</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {freepikData.results.map((result) => (
                  <Card key={result.id} className="overflow-hidden group" data-testid={`card-freepik-${result.id}`}>
                    <div className="aspect-square relative">
                      <img
                        src={result.previewUrl}
                        alt={result.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleFreepikImport(result)}
                          disabled={importFreepikMutation.isPending}
                          data-testid={`button-import-${result.id}`}
                        >
                          {importFreepikMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span className="ml-1">Import</span>
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs font-medium truncate">{result.title}</p>
                      {result.author && (
                        <p className="text-xs text-muted-foreground truncate">by {result.author}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="library" className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b p-4 flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search images..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-library-search"
              />
            </div>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-source">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="upload">Upload</SelectItem>
                <SelectItem value="freepik">Freepik</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="stock">Stock</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-[130px]" data-testid="select-filter-rating">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="liked">Liked</SelectItem>
                <SelectItem value="disliked">Disliked</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                data-testid="button-view-grid"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                data-testid="button-view-list"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            {libraryLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !libraryData?.images?.length ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
                <p>No images in library yet</p>
                <Button variant="ghost" onClick={() => setActiveTab("upload")}>
                  Upload your first images
                </Button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {libraryData.images.map((image) => (
                  <Card
                    key={image.id}
                    className="cursor-pointer overflow-hidden group"
                    onClick={() => setSelectedImage(image)}
                    data-testid={`card-image-${image.id}`}
                  >
                    <div className="aspect-square relative">
                      <img
                        src={image.url}
                        alt={image.altText || image.topic}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="h-6 w-6 text-white" />
                      </div>
                      <Badge className={`absolute top-2 left-2 text-xs ${getSourceColor(image.source)}`}>
                        {image.source || "unknown"}
                      </Badge>
                      {image.isApproved && (
                        <Badge className="absolute top-2 right-2 bg-green-500">
                          <Check className="h-3 w-3" />
                        </Badge>
                      )}
                      {(image.usageCount ?? 0) > 0 && (
                        <Badge variant="secondary" className="absolute bottom-2 right-2 text-xs">
                          {image.usageCount} uses
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs font-medium truncate">{image.topic}</p>
                      <p className="text-xs text-muted-foreground">{image.category} - {image.imageType}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {libraryData.images.map((image) => (
                  <Card
                    key={image.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedImage(image)}
                    data-testid={`card-image-${image.id}`}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                        <img
                          src={image.url}
                          alt={image.altText || image.topic}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{image.topic}</p>
                        <p className="text-sm text-muted-foreground">
                          {image.category} - {image.imageType}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={`text-xs ${getSourceColor(image.source)}`}>
                            {image.source || "unknown"}
                          </Badge>
                          {image.isApproved && (
                            <Badge variant="outline" className="text-green-600">Approved</Badge>
                          )}
                          {image.userRating === "like" && (
                            <Badge variant="outline">Liked</Badge>
                          )}
                          {image.userRating === "dislike" && (
                            <Badge variant="destructive">Disliked</Badge>
                          )}
                          {(image.usageCount ?? 0) > 0 && (
                            <Badge variant="secondary">{image.usageCount} uses</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={image.url} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="generate" className="flex-1 p-6 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
            <Card>
              <CardHeader>
                <CardTitle>Topic Selection</CardTitle>
                <CardDescription>
                  Choose a Dubai tourism topic to generate an image for
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Search Topics</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search all topics..."
                      value={topicSearch}
                      onChange={(e) => setTopicSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-topic-search"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={selectedCategory} 
                    onValueChange={(v) => {
                      setSelectedCategory(v);
                      setSelectedTopic("");
                    }}
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Topic</Label>
                  <ScrollArea className="h-48 border rounded-md p-2">
                    <div className="flex flex-wrap gap-2">
                      {filteredTopics.slice(0, 50).map((topic) => (
                        <Badge
                          key={topic}
                          variant={selectedTopic === topic ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => setSelectedTopic(topic)}
                          data-testid={`badge-topic-${topic.replace(/\s+/g, "-").toLowerCase()}`}
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="space-y-2">
                  <Label>Image Type</Label>
                  <Select value={selectedImageType} onValueChange={setSelectedImageType}>
                    <SelectTrigger data-testid="select-image-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(keywordsData?.imageTypes || ["hero", "thumbnail", "gallery", "banner"]).filter((t): t is string => typeof t === "string").map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generation Settings</CardTitle>
                <CardDescription>
                  Customize the AI prompt or use automatic generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTopic && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Selected Topic:</p>
                    <p className="text-lg font-bold text-primary">{selectedTopic}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Type: {selectedImageType} | Category: {selectedCategory || "General"}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Custom Prompt (Optional)</Label>
                  <Textarea
                    placeholder="Leave empty to use auto-generated prompt based on topic and image type..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    data-testid="textarea-custom-prompt"
                  />
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={!selectedTopic || generateMutation.isPending}
                  data-testid="button-generate-image"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Image
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {generateMutation.data?.image && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Generated Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                    <img
                      src={generateMutation.data.image.url}
                      alt={generateMutation.data.image.altText || selectedTopic}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(generateMutation.data.image.url);
                        toast({ title: "URL copied to clipboard" });
                      }}
                      data-testid="button-copy-url"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy URL
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      data-testid="button-download-image"
                    >
                      <a href={generateMutation.data.image.url} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="rate" className="flex-1 flex items-center justify-center p-6">
          {!unratedImages.length ? (
            <div className="text-center text-muted-foreground">
              <ThumbsUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">All images rated!</p>
              <p className="text-sm">Upload or generate more images to continue rating</p>
            </div>
          ) : currentRatingImage ? (
            <Card className="w-full max-w-2xl">
              <CardContent className="p-6">
                <div className="aspect-video rounded-lg overflow-hidden mb-6">
                  <img
                    src={currentRatingImage.url}
                    alt={currentRatingImage.altText || currentRatingImage.topic}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold">{currentRatingImage.topic}</h3>
                  <p className="text-muted-foreground">
                    {currentRatingImage.category} - {currentRatingImage.imageType}
                  </p>
                  <Badge className={`mt-2 ${getSourceColor(currentRatingImage.source)}`}>
                    {currentRatingImage.source || "unknown"}
                  </Badge>
                </div>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <Button
                    variant="destructive"
                    size="lg"
                    className="w-32"
                    onClick={() => rateMutation.mutate({ id: currentRatingImage.id, rating: "dislike" })}
                    disabled={rateMutation.isPending}
                    data-testid="button-rate-dislike"
                  >
                    <ThumbsDown className="h-5 w-5 mr-2" />
                    Dislike
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-32"
                    onClick={() => rateMutation.mutate({ id: currentRatingImage.id, rating: "skip" })}
                    disabled={rateMutation.isPending}
                    data-testid="button-rate-skip"
                  >
                    <SkipForward className="h-5 w-5 mr-2" />
                    Skip
                  </Button>
                  <Button
                    size="lg"
                    className="w-32 bg-green-600"
                    onClick={() => rateMutation.mutate({ id: currentRatingImage.id, rating: "like" })}
                    disabled={rateMutation.isPending}
                    data-testid="button-rate-like"
                  >
                    <ThumbsUp className="h-5 w-5 mr-2" />
                    Like
                  </Button>
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  {unratedImages.length - 1} more images to rate
                </p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="stats" className="flex-1 p-6 overflow-auto">
          {statsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : statsData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Images</CardDescription>
                  <CardTitle className="text-3xl">{statsData.total}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Approved</CardDescription>
                  <CardTitle className="text-3xl text-green-600">{statsData.approved}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Liked</CardDescription>
                  <CardTitle className="text-3xl text-blue-600">{statsData.liked}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Disliked</CardDescription>
                  <CardTitle className="text-3xl text-red-600">{statsData.disliked}</CardTitle>
                </CardHeader>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Images by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {statsData.byCategory.map((cat) => (
                      <div key={cat.category || "uncategorized"} className="flex items-center justify-between gap-2">
                        <span className="text-sm">{cat.category || "Uncategorized"}</span>
                        <Badge variant="secondary">{cat.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Top Topics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {statsData.topTopics.map((topic) => (
                      <Badge key={topic.topic} variant="outline">
                        {topic.topic} ({topic.count})
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedImage.topic}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  {selectedImage.category} - {selectedImage.imageType}
                  <Badge className={getSourceColor(selectedImage.source)}>
                    {selectedImage.source || "unknown"}
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <div className="aspect-video rounded-lg overflow-hidden">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.altText || selectedImage.topic}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Alt Text</Label>
                  <p className="text-sm">{selectedImage.altText || "No alt text"}</p>
                </div>
                {selectedImage.prompt && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Prompt</Label>
                    <p className="text-sm">{selectedImage.prompt}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={selectedImage.isApproved ? "default" : "outline"}>
                    {selectedImage.isApproved ? "Approved" : "Not Approved"}
                  </Badge>
                  {selectedImage.userRating && (
                    <Badge variant={selectedImage.userRating === "like" ? "default" : "destructive"}>
                      {selectedImage.userRating === "like" ? "Liked" : "Disliked"}
                    </Badge>
                  )}
                  {(selectedImage.usageCount ?? 0) > 0 && (
                    <Badge variant="secondary">{selectedImage.usageCount} uses</Badge>
                  )}
                </div>
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedImage.url);
                    toast({ title: "URL copied" });
                  }}
                  data-testid="button-dialog-copy-url"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </Button>
                <Button
                  variant="outline"
                  asChild
                  data-testid="button-dialog-download"
                >
                  <a href={selectedImage.url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
                <Button
                  variant={selectedImage.isApproved ? "outline" : "default"}
                  onClick={() => approveMutation.mutate({ 
                    id: selectedImage.id, 
                    approved: !selectedImage.isApproved 
                  })}
                  data-testid="button-dialog-approve"
                >
                  {selectedImage.isApproved ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Unapprove
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(selectedImage.id)}
                  disabled={deleteMutation.isPending}
                  data-testid="button-dialog-delete"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

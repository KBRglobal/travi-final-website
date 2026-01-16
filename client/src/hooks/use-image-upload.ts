/**
 * Unified Image Upload Hook
 * Single source of truth for all image uploads in the application
 * Uses the new unified /api/images/* endpoints
 */

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// TYPES
// ============================================================================

export interface UploadedImage {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  seo?: {
    alt: { en: string; he: string; ar: string };
    title: { en: string; he: string; ar: string };
    caption: { en: string; he: string; ar: string };
  };
}

export interface ImageUploadOptions {
  /** Alt text for the image */
  altText?: string;
  /** Content ID to associate with */
  contentId?: number;
  /** SEO context for optimized naming and metadata */
  seoContext?: {
    contentType: string;
    entityName: string;
    entitySlug: string;
    location?: { area: string };
    category?: string;
    purpose?: string;
  };
  /** Show success toast */
  showSuccessToast?: boolean;
  /** Show error toast */
  showErrorToast?: boolean;
  /** Custom success message */
  successMessage?: string;
}

export interface UseImageUploadResult {
  /** Upload a single file */
  uploadFile: (file: File, options?: ImageUploadOptions) => Promise<UploadedImage | null>;
  /** Upload from URL */
  uploadFromUrl: (url: string, options?: ImageUploadOptions) => Promise<UploadedImage | null>;
  /** Upload multiple files */
  uploadFiles: (files: File[], options?: ImageUploadOptions) => Promise<UploadedImage[]>;
  /** Generate AI image */
  generateAiImage: (prompt: string, options?: AiImageOptions) => Promise<UploadedImage | null>;
  /** Is currently uploading */
  isUploading: boolean;
  /** Upload progress (0-100) */
  progress: number;
  /** Last error message */
  error: string | null;
  /** Clear error */
  clearError: () => void;
}

export interface AiImageOptions {
  /** Image size */
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  /** Image quality */
  quality?: "standard" | "hd";
  /** Image style */
  style?: "vivid" | "natural";
  /** Provider preference */
  provider?: "openai" | "flux";
  /** SEO context for optimized generation */
  seoContext?: ImageUploadOptions["seoContext"];
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useImageUpload(): UseImageUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const clearError = useCallback(() => setError(null), []);

  /**
   * Upload a single file
   */
  const uploadFile = useCallback(async (
    file: File,
    options: ImageUploadOptions = {}
  ): Promise<UploadedImage | null> => {
    const {
      altText,
      contentId,
      seoContext,
      showSuccessToast = true,
      showErrorToast = true,
      successMessage = "Image uploaded successfully"
    } = options;

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      if (altText) formData.append("altText", altText);
      if (contentId) formData.append("contentId", String(contentId));
      if (seoContext) formData.append("seoContext", JSON.stringify(seoContext));

      setProgress(30);

      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      setProgress(80);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      setProgress(100);

      // Handle both response formats for backwards compatibility
      const image: UploadedImage = result.image || {
        url: result.url,
        filename: result.filename || file.name,
        mimeType: result.mimeType || file.type,
        size: result.size || file.size,
        width: result.width,
        height: result.height,
        thumbnailUrl: result.thumbnailUrl,
        seo: result.seo,
      };

      if (showSuccessToast) {
        toast({
          title: "Success",
          description: successMessage,
        });
      }

      return image;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload image";
      setError(message);

      if (showErrorToast) {
        toast({
          title: "Upload Failed",
          description: message,
          variant: "destructive",
        });
      }

      return null;
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  /**
   * Upload from URL
   */
  const uploadFromUrl = useCallback(async (
    url: string,
    options: ImageUploadOptions = {}
  ): Promise<UploadedImage | null> => {
    const {
      altText,
      contentId,
      seoContext,
      showSuccessToast = true,
      showErrorToast = true,
      successMessage = "Image downloaded and saved"
    } = options;

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      setProgress(20);

      const response = await fetch("/api/images/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          url,
          altText,
          contentId,
          seoContext,
        }),
      });

      setProgress(80);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Download failed" }));
        throw new Error(errorData.error || `Download failed: ${response.status}`);
      }

      const result = await response.json();
      setProgress(100);

      const image: UploadedImage = result.image || {
        url: result.url,
        filename: result.filename,
        mimeType: result.mimeType,
        size: result.size,
        width: result.width,
        height: result.height,
      };

      if (showSuccessToast) {
        toast({
          title: "Success",
          description: successMessage,
        });
      }

      return image;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to download image";
      setError(message);

      if (showErrorToast) {
        toast({
          title: "Download Failed",
          description: message,
          variant: "destructive",
        });
      }

      return null;
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  /**
   * Upload multiple files
   */
  const uploadFiles = useCallback(async (
    files: File[],
    options: ImageUploadOptions = {}
  ): Promise<UploadedImage[]> => {
    const results: UploadedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(Math.round((i / files.length) * 100));

      const result = await uploadFile(file, {
        ...options,
        showSuccessToast: false, // Don't show toast for each file
      });

      if (result) {
        results.push(result);
      }
    }

    if (results.length > 0 && options.showSuccessToast !== false) {
      toast({
        title: "Success",
        description: `${results.length} image${results.length > 1 ? "s" : ""} uploaded`,
      });
    }

    return results;
  }, [uploadFile, toast]);

  /**
   * Generate AI image
   */
  const generateAiImage = useCallback(async (
    prompt: string,
    options: AiImageOptions = {}
  ): Promise<UploadedImage | null> => {
    const {
      size = "1792x1024",
      quality = "hd",
      style = "natural",
      provider = "openai",
      seoContext,
    } = options;

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      setProgress(10);

      // Use SEO endpoint if context provided, otherwise standard generation
      const endpoint = seoContext
        ? "/api/images/seo/generate-and-upload"
        : "/api/images/generate-ai";

      const body = seoContext
        ? { context: seoContext, options: { size, quality, style, provider } }
        : { prompt, size, quality, style, provider };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      setProgress(90);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(errorData.error || `Generation failed: ${response.status}`);
      }

      const result = await response.json();
      setProgress(100);

      const image: UploadedImage = result.image || {
        url: result.url,
        filename: result.filename,
        mimeType: "image/webp",
        size: result.size || 0,
        width: result.width,
        height: result.height,
        seo: result.seo,
      };

      toast({
        title: "Image Generated",
        description: "AI image created successfully",
      });

      return image;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate image";
      setError(message);

      toast({
        title: "Generation Failed",
        description: message,
        variant: "destructive",
      });

      return null;
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  return {
    uploadFile,
    uploadFromUrl,
    uploadFiles,
    generateAiImage,
    isUploading,
    progress,
    error,
    clearError,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, GIF, WebP` };
  }

  if (file.size > MAX_SIZE) {
    return { valid: false, error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 10MB` };
  }

  return { valid: true };
}

/**
 * Get image dimensions from file
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      reject(new Error("Failed to load image"));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default useImageUpload;

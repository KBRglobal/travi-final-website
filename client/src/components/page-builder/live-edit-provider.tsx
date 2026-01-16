import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PageSection } from "@shared/schema";

interface LiveEditContextType {
  isEditMode: boolean;
  selectedSection: PageSection | null;
  hoveredSectionId: string | null;
  pendingChanges: Map<string, Partial<PageSection>>;
  toggleEditMode: () => void;
  selectSection: (section: PageSection | null) => void;
  hoverSection: (sectionId: string | null) => void;
  updateSection: (sectionId: string, updates: Partial<PageSection>) => Promise<void>;
  saveChanges: () => Promise<void>;
  discardChanges: () => void;
  canEdit: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

const LiveEditContext = createContext<LiveEditContextType | null>(null);

export function useLiveEdit() {
  const context = useContext(LiveEditContext);
  if (!context) {
    throw new Error("useLiveEdit must be used within a PageBuilderLiveEditProvider");
  }
  return context;
}

export function useIsPageBuilderEditMode() {
  const context = useContext(LiveEditContext);
  return context?.isEditMode ?? false;
}

interface PageBuilderLiveEditProviderProps {
  children: ReactNode;
  pageId: string;
  sections: PageSection[];
  onSectionsChange?: (sections: PageSection[]) => void;
}

export function PageBuilderLiveEditProvider({
  children,
  pageId,
  sections,
  onSectionsChange,
}: PageBuilderLiveEditProviderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSection, setSelectedSection] = useState<PageSection | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<PageSection>>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = Boolean(user && ["admin", "editor"].includes(user.role));

  const toggleEditMode = useCallback(() => {
    if (!canEdit) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit this page.",
        variant: "destructive",
      });
      return;
    }
    
    setIsEditMode((prev) => {
      if (prev) {
        setSelectedSection(null);
        setHoveredSectionId(null);
        if (pendingChanges.size > 0) {
          const shouldDiscard = window.confirm("You have unsaved changes. Discard them?");
          if (!shouldDiscard) return prev;
          setPendingChanges(new Map());
        }
      }
      return !prev;
    });
  }, [canEdit, pendingChanges.size, toast]);

  const selectSection = useCallback((section: PageSection | null) => {
    setSelectedSection(section);
  }, []);

  const hoverSection = useCallback((sectionId: string | null) => {
    setHoveredSectionId(sectionId);
  }, []);

  const updateSection = useCallback(async (sectionId: string, updates: Partial<PageSection>) => {
    setPendingChanges((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(sectionId) || {};
      newMap.set(sectionId, { ...existing, ...updates });
      return newMap;
    });

    if (onSectionsChange) {
      const updatedSections = sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s
      );
      onSectionsChange(updatedSections);
    }

    if (selectedSection?.id === sectionId) {
      setSelectedSection((prev) => prev ? { ...prev, ...updates } : null);
    }
  }, [sections, selectedSection?.id, onSectionsChange]);

  const saveChanges = useCallback(async () => {
    if (pendingChanges.size === 0) return;
    
    setIsSaving(true);
    try {
      const updates = Array.from(pendingChanges.entries());
      
      await Promise.all(
        updates.map(([sectionId, changes]) =>
          apiRequest("PATCH", `/api/page-builder/sections/${sectionId}`, changes)
        )
      );

      await queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages", pageId] });
      
      setPendingChanges(new Map());
      
      toast({
        title: "Changes Saved",
        description: `${updates.length} section(s) updated successfully.`,
      });
    } catch (error) {
      console.error("Failed to save changes:", error);
      toast({
        title: "Save Failed",
        description: "Could not save your changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, pageId, toast]);

  const discardChanges = useCallback(() => {
    setPendingChanges(new Map());
    setSelectedSection(null);
    
    queryClient.invalidateQueries({ queryKey: ["/api/page-builder/pages", pageId] });
    
    toast({
      title: "Changes Discarded",
      description: "All unsaved changes have been discarded.",
    });
  }, [pageId, toast]);

  const hasUnsavedChanges = pendingChanges.size > 0;

  return (
    <LiveEditContext.Provider
      value={{
        isEditMode,
        selectedSection,
        hoveredSectionId,
        pendingChanges,
        toggleEditMode,
        selectSection,
        hoverSection,
        updateSection,
        saveChanges,
        discardChanges,
        canEdit,
        isSaving,
        hasUnsavedChanges,
      }}
    >
      {children}
    </LiveEditContext.Provider>
  );
}

/**
 * Assignment Dialog Component
 * 
 * Dialog for assigning contents to AI writers
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, User, Check, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AIWriter {
  id: string;
  name: string;
  slug: string;
  avatar: string;
  nationality: string;
  expertise: string[];
  writingStyle: string;
  isActive: boolean;
}

interface Content {
  id: number;
  title: string;
  type: string;
  status: string;
  writerId: string | null;
}

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignmentDialog({ open, onOpenChange }: AssignmentDialogProps) {
  const [selectedWriter, setSelectedWriter] = useState<AIWriter | null>(null);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const { toast } = useToast();

  // Fetch writers
  const { data: writersData, isLoading: loadingWriters } = useQuery({
    queryKey: ['writers'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/writers');
      return response.json() as Promise<{ writers: AIWriter[]; total: number }>;
    },
    enabled: open,
  });

  // Fetch unassigned contents
  const { data: contentsData, isLoading: loadingContents } = useQuery({
    queryKey: ['contents', 'unassigned'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/contents?limit=50');
      const data = await response.json() as { contents: Content[]; total: number };
      // Filter to show only contents without a writer assigned
      return {
        ...data,
        contents: data.contents.filter(c => !c.writerId)
      };
    },
    enabled: open,
  });

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async ({ contentId, writerId }: { contentId: number; writerId: string }) => {
      const response = await apiRequest('PATCH', `/api/contents/${contentId}`, {
        writerId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assignment Created",
        description: `Content assigned to ${selectedWriter?.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      queryClient.invalidateQueries({ queryKey: ['writer-stats'] });
      onOpenChange(false);
      setSelectedWriter(null);
      setSelectedContent(null);
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign contents",
        variant: "destructive",
      });
    },
  });

  const writers = writersData?.writers?.filter(w => w.isActive) || [];
  const contents = contentsData?.contents || [];

  const handleAssign = () => {
    if (selectedWriter && selectedContent) {
      assignMutation.mutate({
        contentId: selectedContent.id,
        writerId: selectedWriter.id
      });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedWriter(null);
      setSelectedContent(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Assignment
          </DialogTitle>
          <DialogDescription>
            Assign contents to an AI writer for generation
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Writer Selection */}
          <div className="space-y-2">
            <h3 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Select Writer
            </h3>
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {loadingWriters ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : writers.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No active writers available
                </div>
              ) : (
                <div className="space-y-2">
                  {writers.map((writer) => (
                    <div
                      key={writer.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedWriter?.id === writer.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => setSelectedWriter(writer)}
                      data-testid={`writer-option-${writer.id}`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={writer.avatar} alt={writer.name} />
                        <AvatarFallback>{getInitials(writer.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{writer.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {writer.expertise[0]}
                        </p>
                      </div>
                      {selectedWriter?.id === writer.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Content Selection */}
          <div className="space-y-2">
            <h3 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Select Content
            </h3>
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {loadingContents ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : contents.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No unassigned contents available
                </div>
              ) : (
                <div className="space-y-2">
                  {contents.map((contents) => (
                    <div
                      key={contents.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedContent?.id === contents.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => setSelectedContent(contents)}
                      data-testid={`contents-option-${contents.id}`}
                    >
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{contents.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {contents.type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {contents.status}
                          </Badge>
                        </div>
                      </div>
                      {selectedContent?.id === contents.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Selection Summary */}
        {(selectedWriter || selectedContent) && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">Assignment Summary</h4>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{selectedWriter?.name || 'No writer selected'}</span>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{selectedContent?.title || 'No contents selected'}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedWriter || !selectedContent || assignMutation.isPending}
            data-testid="button-create-assignment"
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              'Create Assignment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

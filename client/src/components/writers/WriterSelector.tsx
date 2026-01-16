/**
 * Writer Selector Component
 * 
 * Dropdown/modal to select a writer for contents
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WriterCard } from "./WriterCard";
import { Sparkles, Search, TrendingUp, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AIWriter {
  id: string;
  name: string;
  slug: string;
  avatar: string;
  nationality: string;
  age: number;
  expertise: string[];
  personality: string;
  writingStyle: string;
  shortBio: string;
  contentTypes: string[];
  languages: string[];
  isActive: boolean;
  articleCount: number;
}

interface WriterSelectorProps {
  contentType?: string;
  topic?: string;
  onSelect: (writer: AIWriter) => void;
  selectedWriterId?: string;
  trigger?: React.ReactNode;
}

export function WriterSelector({
  contentType,
  topic,
  onSelect,
  selectedWriterId,
  trigger,
}: WriterSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all writers
  const { data: writersData, isLoading } = useQuery({
    queryKey: ['writers', contentType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (contentType) params.append('contentType', contentType);
      params.append('active', 'true');
      
      const response = await fetch(`/api/writers?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch writers');
      return response.json() as Promise<{ writers: AIWriter[]; total: number }>;
    },
  });

  // Fetch recommendations if topic is provided
  const { data: recommendationsData } = useQuery({
    queryKey: ['writer-recommendations', topic, contentType],
    queryFn: async () => {
      if (!topic) return null;
      
      const params = new URLSearchParams({ topic });
      if (contentType) params.append('contentType', contentType);
      
      const response = await fetch(`/api/writers/recommendations?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      return response.json() as Promise<{ 
        recommendations: Array<{
          writer: AIWriter;
          score: number;
          reason: string;
        }>;
      }>;
    },
    enabled: !!topic,
  });

  const writers = writersData?.writers || [];
  const recommendations = recommendationsData?.recommendations || [];

  // Filter writers by search query
  const filteredWriters = writers.filter(writer => 
    writer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    writer.expertise.some(exp => exp.toLowerCase().includes(searchQuery.toLowerCase())) ||
    writer.nationality.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectWriter = (writer: AIWriter) => {
    onSelect(writer);
    setOpen(false);
  };

  const selectedWriter = writers.find(w => w.id === selectedWriterId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full justify-start">
            <Sparkles className="mr-2 h-4 w-4" />
            {selectedWriter ? (
              <>
                {selectedWriter.name}
                <Badge variant="secondary" className="ml-2">
                  {selectedWriter.expertise[0]}
                </Badge>
              </>
            ) : (
              'Select AI Writer'
            )}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select AI Writer</DialogTitle>
          <DialogDescription>
            Choose the best writer for your contents based on their expertise and style.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, expertise, or nationality..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue={recommendations.length > 0 ? "recommended" : "all"} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            {recommendations.length > 0 && (
              <TabsTrigger value="recommended">
                <TrendingUp className="mr-2 h-4 w-4" />
                Recommended
              </TabsTrigger>
            )}
            <TabsTrigger value="all">
              <Users className="mr-2 h-4 w-4" />
              All Writers
            </TabsTrigger>
          </TabsList>

          {recommendations.length > 0 && (
            <TabsContent value="recommended" className="flex-1">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {recommendations.map(({ writer, score, reason }) => (
                    <div key={writer.id} className="relative">
                      <div className="absolute -left-2 top-4 flex items-center gap-2">
                        <Badge variant="default" className="rounded-full">
                          {score}%
                        </Badge>
                      </div>
                      <div className="ml-12">
                        <WriterCard
                          writer={writer}
                          onSelect={handleSelectWriter}
                          showActions={true}
                          variant="default"
                        />
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          )}

          <TabsContent value="all" className="flex-1">
            <ScrollArea className="h-[400px] pr-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading writers...
                </div>
              ) : filteredWriters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No writers found
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredWriters.map((writer) => (
                    <WriterCard
                      key={writer.id}
                      writer={writer}
                      onSelect={handleSelectWriter}
                      showActions={true}
                      variant="default"
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

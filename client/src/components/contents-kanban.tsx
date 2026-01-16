import { useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  Building2,
  FileText,
  UtensilsCrossed,
  Map as MapIcon,
  Train,
  Calendar,
  Route,
  Megaphone,
  FileBarChart2,
  Building,
  Clock,
  Eye,
} from "lucide-react";
import type { ContentWithRelations } from "@shared/schema";

interface ContentKanbanProps {
  contents: ContentWithRelations[];
  type: string;
  basePath: string;
}

const STATUS_COLUMNS = [
  { key: "draft", label: "Draft", color: "bg-muted" },
  { key: "in_review", label: "In Review", color: "bg-yellow-500/10" },
  { key: "reviewed", label: "Reviewed", color: "bg-blue-500/10" },
  { key: "approved", label: "Approved", color: "bg-emerald-500/10" },
  { key: "scheduled", label: "Scheduled", color: "bg-[#6443F4]/10" },
  { key: "published", label: "Published", color: "bg-green-500/10" },
  { key: "archived", label: "Archived", color: "bg-gray-500/10" },
] as const;

const typeIcons: Record<string, typeof MapPin> = {
  attraction: MapPin,
  hotel: Building2,
  article: FileText,
  dining: UtensilsCrossed,
  district: MapIcon,
  transport: Train,
  event: Calendar,
  itinerary: Route,
  landing_page: Megaphone,
  case_study: FileBarChart2,
  off_plan: Building,
};

function ContentCard({ content, basePath }: { content: ContentWithRelations; basePath: string }) {
  const Icon = typeIcons[content.type] || FileText;
  const authorName = content.author 
    ? `${content.author.firstName || ""} ${content.author.lastName || ""}`.trim() || content.author.email
    : "Unknown";

  return (
    <Link href={`${basePath}/${content.id}`}>
      <Card 
        className="mb-2 cursor-pointer hover-elevate transition-all"
        data-testid={`kanban-card-${content.id}`}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm leading-tight line-clamp-2">
                {content.title}
              </h4>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span className="truncate">{authorName}</span>
                {content.scheduledAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(content.scheduledAt).toLocaleDateString()}
                  </span>
                )}
                {content.status === "published" && content.publishedAt && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {new Date(content.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ContentKanban({ contents, type, basePath }: ContentKanbanProps) {
  const contentsByStatus = useMemo(() => {
    const grouped: Record<string, ContentWithRelations[]> = {};
    
    STATUS_COLUMNS.forEach(col => {
      grouped[col.key] = [];
    });

    contents.forEach(content => {
      const status = content.status;
      if (grouped[status]) {
        grouped[status].push(content);
      } else {
        grouped["draft"].push(content);
      }
    });

    return grouped;
  }, [contents]);

  return (
    <div 
      className="flex gap-4 overflow-x-auto pb-4"
      data-testid="content-kanban-board"
    >
      {STATUS_COLUMNS.map(column => (
        <div 
          key={column.key}
          className="flex-shrink-0 w-72"
          data-testid={`kanban-column-${column.key}`}
        >
          <Card className={`h-full ${column.color}`}>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                {column.label}
                <Badge variant="secondary" className="ml-2">
                  {contentsByStatus[column.key]?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="px-2">
                  {contentsByStatus[column.key]?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No items
                    </div>
                  ) : (
                    contentsByStatus[column.key]?.map(content => (
                      <ContentCard 
                        key={content.id} 
                        content={content} 
                        basePath={basePath}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

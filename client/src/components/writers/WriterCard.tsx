/**
 * Writer Card Component
 * 
 * Display writer info in card format
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  FileText, 
  Globe, 
  TrendingUp,
  Edit,
  Eye,
  Sparkles,
} from "lucide-react";

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

interface WriterCardProps {
  writer: AIWriter;
  onSelect?: (writer: AIWriter) => void;
  onEdit?: (writer: AIWriter) => void;
  onView?: (writer: AIWriter) => void;
  showActions?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export function WriterCard({
  writer,
  onSelect,
  onEdit,
  onView,
  showActions = true,
  variant = 'default',
}: WriterCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  if (variant === 'compact') {
    return (
      <div 
        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
        onClick={() => onSelect?.(writer)}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={writer.avatar} alt={writer.name} />
          <AvatarFallback>{getInitials(writer.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{writer.name}</p>
          <p className="text-sm text-muted-foreground truncate">
            {writer.expertise[0]}
          </p>
        </div>
        <Badge variant={writer.isActive ? "default" : "secondary"}>
          {writer.articleCount}
        </Badge>
      </div>
    );
  }

  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-lg ${!writer.isActive ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/10">
              <AvatarImage src={writer.avatar} alt={writer.name} />
              <AvatarFallback>{getInitials(writer.name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {writer.name}
                {writer.isActive && (
                  <Sparkles className="h-4 w-4 text-primary" />
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Globe className="h-3 w-3" />
                {writer.nationality} • {writer.age} years
              </CardDescription>
            </div>
          </div>
          {!writer.isActive && (
            <Badge variant="secondary">Inactive</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Short Bio */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {writer.personality}
        </p>

        {/* Expertise Tags */}
        <div className="flex flex-wrap gap-1">
          {writer.expertise.slice(0, 3).map((exp) => (
            <Badge key={exp} variant="outline" className="text-xs">
              {exp}
            </Badge>
          ))}
          {writer.expertise.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{writer.expertise.length - 3}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{writer.articleCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              <span>{writer.languages.length}</span>
            </div>
          </div>

          {showActions && (
            <div className="flex gap-1">
              {onView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(writer);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(writer);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onSelect && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(writer);
                  }}
                >
                  Select
                </Button>
              )}
            </div>
          )}
        </div>

        {variant === 'detailed' && (
          <>
            {/* Content Types */}
            <div className="pt-2 border-t">
              <p className="text-xs font-medium mb-2">Content Types</p>
              <div className="flex flex-wrap gap-1">
                {writer.contentTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Writing Style */}
            <div>
              <p className="text-xs font-medium mb-1">Writing Style</p>
              <p className="text-xs text-muted-foreground">
                {writer.writingStyle}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

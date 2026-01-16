import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Building2,
  FileText,
  Utensils,
  CalendarDays,
  Clock,
  Eye,
} from "lucide-react";
import type { ContentWithRelations } from "@shared/schema";

// Content type icons
const contentTypeIcons: Record<string, React.ElementType> = {
  attraction: MapPin,
  hotel: Building2,
  article: FileText,
  dining: Utensils,
  event: CalendarDays,
};

const contentTypeColors: Record<string, string> = {
  attraction: "bg-blue-100 text-blue-700 border-blue-200",
  hotel: "bg-[#6443F4]/10 text-[#6443F4] border-[#6443F4]",
  article: "bg-green-100 text-green-700 border-green-200",
  dining: "bg-orange-100 text-orange-700 border-orange-200",
  event: "bg-[#6443F4]/10 text-[#6443F4] border-[#6443F4]",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  in_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  scheduled: "bg-[#6443F4]/10 text-[#6443F4]",
  published: "bg-green-100 text-green-700",
};

// Get days in month
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Get first day of month (0 = Sunday)
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// Format date for comparison
function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ContentCalendarProps {
  onSelectContent?: (contents: ContentWithRelations) => void;
}

export function ContentCalendar({ onSelectContent }: ContentCalendarProps) {
  const [, navigate] = useLocation();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch all contents
  const { data: contents = [] } = useQuery<ContentWithRelations[]>({
    queryKey: ["/api/contents"],
  });

  // Group contents by date
  const contentByDate = useMemo(() => {
    const grouped: Record<string, ContentWithRelations[]> = {};

    contents.forEach((contents) => {
      // Filter by type
      if (filterType !== "all" && contents.type !== filterType) return;
      // Filter by status
      if (filterStatus !== "all" && contents.status !== filterStatus) return;

      // Use scheduledAt for scheduled contents, or updatedAt for others
      const dateField = contents.status === "scheduled" && contents.scheduledAt
        ? new Date(contents.scheduledAt)
        : contents.status === "published" && contents.publishedAt
        ? new Date(contents.publishedAt)
        : contents.updatedAt
        ? new Date(contents.updatedAt)
        : null;

      if (dateField) {
        const key = formatDateKey(dateField);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(contents);
      }
    });

    return grouped;
  }, [contents, filterType, filterStatus]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days: Array<{ day: number | null; date: string | null; isToday: boolean }> = [];

    // Add empty cells for days before first day
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, date: null, isToday: false });
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isToday = formatDateKey(date) === formatDateKey(today);
      days.push({
        day,
        date: formatDateKey(date),
        isToday,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Navigate months
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Handle contents click
  const handleContentClick = (contents: ContentWithRelations) => {
    if (onSelectContent) {
      onSelectContent(contents);
    } else {
      navigate(`/admin/${contents.type}s/${contents.id}`);
    }
  };

  // Stats for current month
  const monthStats = useMemo(() => {
    let scheduled = 0;
    let published = 0;

    Object.entries(contentByDate).forEach(([dateKey, items]) => {
      const [year, month] = dateKey.split("-").map(Number);
      if (year === currentYear && month === currentMonth + 1) {
        items.forEach((item) => {
          if (item.status === "scheduled") scheduled++;
          if (item.status === "published") published++;
        });
      }
    });

    return { scheduled, published };
  }, [contentByDate, currentMonth, currentYear]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Content Calendar
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="bg-[#6443F4]/5">
                <Clock className="h-3 w-3 mr-1" />
                {monthStats.scheduled} scheduled
              </Badge>
              <Badge variant="outline" className="bg-green-50">
                <Eye className="h-3 w-3 mr-1" />
                {monthStats.published} published
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filters */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="attraction">Attractions</SelectItem>
                <SelectItem value="hotel">Hotels</SelectItem>
                <SelectItem value="article">Articles</SelectItem>
                <SelectItem value="dining">Dining</SelectItem>
                <SelectItem value="event">Events</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold ml-2">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-muted/50">
            {DAYS.map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-center text-sm font-medium text-muted-foreground border-b"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((cell, idx) => {
              const dayContents = cell.date ? contentByDate[cell.date] || [] : [];
              const hasContent = dayContents.length > 0;

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] border-b border-r p-1 ${
                    cell.day === null ? "bg-muted/30" : "bg-background"
                  } ${cell.isToday ? "bg-primary/5" : ""}`}
                >
                  {cell.day !== null && (
                    <>
                      <div
                        className={`text-sm font-medium mb-1 px-1 ${
                          cell.isToday
                            ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                            : "text-muted-foreground"
                        }`}
                      >
                        {cell.day}
                      </div>

                      <ScrollArea className="h-[70px]">
                        <div className="space-y-1">
                          {dayContents.slice(0, 3).map((contents) => {
                            const Icon = contentTypeIcons[contents.type] || FileText;
                            const colorClass = contentTypeColors[contents.type] || "bg-gray-100 text-gray-700";

                            return (
                              <Tooltip key={contents.id}>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleContentClick(contents)}
                                    className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate border ${colorClass} hover:opacity-80 transition-opacity`}
                                  >
                                    <span className="flex items-center gap-1">
                                      <Icon className="h-3 w-3 shrink-0" />
                                      <span className="truncate">{contents.title}</span>
                                    </span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-[250px]">
                                  <div className="space-y-1">
                                    <p className="font-medium">{contents.title}</p>
                                    <div className="flex items-center gap-2 text-xs">
                                      <Badge className={statusColors[contents.status || "draft"]}>
                                        {contents.status}
                                      </Badge>
                                      <span className="capitalize">{contents.type}</span>
                                    </div>
                                    {contents.scheduledAt && (
                                      <p className="text-xs text-muted-foreground">
                                        Scheduled: {new Date(contents.scheduledAt).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}

                          {dayContents.length > 3 && (
                            <div className="text-xs text-muted-foreground px-1">
                              +{dayContents.length - 3} more
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="font-medium">Types:</span>
          {Object.entries(contentTypeColors).map(([type, colorClass]) => {
            const Icon = contentTypeIcons[type];
            return (
              <span key={type} className={`flex items-center gap-1 px-2 py-0.5 rounded border ${colorClass}`}>
                <Icon className="h-3 w-3" />
                <span className="capitalize">{type}</span>
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

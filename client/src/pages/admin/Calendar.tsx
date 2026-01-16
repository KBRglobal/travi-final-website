/**
 * Content Calendar Page
 *
 * Admin page for viewing and managing scheduled contents.
 * Shows month view with scheduled items color-coded by status.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarItem {
  contentId: string;
  title: string;
  type: string;
  slug: string;
  scheduledAt: string;
  status: 'pending' | 'published' | 'failed' | 'cancelled';
  publishedAt?: string;
}

interface CalendarResponse {
  year: number;
  month: number;
  items: CalendarItem[];
}

interface UpcomingResponse {
  items: CalendarItem[];
  total: number;
}

interface MetricsResponse {
  enabled: boolean;
  lastRunAt: string | null;
  totalProcessed: number;
  totalPublished: number;
  totalFailed: number;
  isRunning: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
    case 'published':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3" />;
    case 'published':
      return <CheckCircle2 className="h-3 w-3" />;
    case 'failed':
      return <AlertCircle className="h-3 w-3" />;
    default:
      return <FileText className="h-3 w-3" />;
  }
}

function CalendarGrid({
  year,
  month,
  items,
  loading,
}: {
  year: number;
  month: number;
  items: CalendarItem[];
  loading: boolean;
}) {
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: { date: number | null; items: CalendarItem[] }[] = [];

    // Add empty slots for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: null, items: [] });
    }

    // Add each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayItems = items.filter(item => {
        const itemDate = new Date(item.scheduledAt);
        return itemDate.getDate() === day;
      });
      days.push({ date: day, items: dayItems });
    }

    return days;
  }, [year, month, items]);

  if (loading) {
    return (
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {DAY_NAMES.map(day => (
        <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
          {day}
        </div>
      ))}
      {calendarDays.map((day, index) => (
        <div
          key={index}
          className={cn(
            "min-h-24 p-1 border rounded-md",
            day.date === null
              ? "bg-muted/30"
              : "bg-card hover:bg-accent/30"
          )}
        >
          {day.date !== null && (
            <>
              <div className="text-sm font-medium mb-1">{day.date}</div>
              <div className="space-y-1">
                {day.items.slice(0, 3).map(item => (
                  <a
                    key={item.contentId}
                    href={`/admin/contents/${item.contentId}`}
                    className={cn(
                      "block text-xs p-1 rounded border truncate",
                      getStatusColor(item.status)
                    )}
                    title={`${item.title} - ${item.status}`}
                  >
                    <span className="flex items-center gap-1">
                      {getStatusIcon(item.status)}
                      <span className="truncate">{item.title}</span>
                    </span>
                  </a>
                ))}
                {day.items.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{day.items.length - 3} more
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function UpcomingList({ items, loading }: { items: CalendarItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No upcoming scheduled contents</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map(item => {
        const scheduledDate = new Date(item.scheduledAt);
        return (
          <a
            key={item.contentId}
            href={`/admin/contents/${item.contentId}`}
            className="block p-3 rounded-lg border hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.title}</div>
                <div className="text-sm text-muted-foreground">
                  {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <Badge variant="outline" className={cn("shrink-0", getStatusColor(item.status))}>
                {getStatusIcon(item.status)}
                <span className="ml-1">{item.status}</span>
              </Badge>
            </div>
          </a>
        );
      })}
    </div>
  );
}

function SchedulerMetrics({ metrics, loading }: { metrics?: MetricsResponse; loading: boolean }) {
  if (loading) {
    return <Skeleton className="h-20" />;
  }

  if (!metrics?.enabled) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Scheduling Disabled</span>
        </div>
        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
          Set <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">ENABLE_CONTENT_SCHEDULING=true</code> to enable.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-3 bg-card border rounded-lg">
        <div className="text-2xl font-bold">{metrics.totalProcessed}</div>
        <div className="text-sm text-muted-foreground">Processed</div>
      </div>
      <div className="p-3 bg-card border rounded-lg">
        <div className="text-2xl font-bold text-green-600">{metrics.totalPublished}</div>
        <div className="text-sm text-muted-foreground">Published</div>
      </div>
      <div className="p-3 bg-card border rounded-lg">
        <div className="text-2xl font-bold text-red-600">{metrics.totalFailed}</div>
        <div className="text-sm text-muted-foreground">Failed</div>
      </div>
      <div className="p-3 bg-card border rounded-lg">
        <div className="text-2xl font-bold">{metrics.isRunning ? 'Active' : 'Idle'}</div>
        <div className="text-sm text-muted-foreground">Scheduler</div>
      </div>
    </div>
  );
}

export default function ContentCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: calendar, isLoading: loadingCalendar } = useQuery<CalendarResponse>({
    queryKey: ["/api/admin/contents/schedule/calendar", { year, month }],
    queryFn: async () => {
      const res = await fetch(`/api/admin/contents/schedule/calendar?year=${year}&month=${month}`);
      if (!res.ok) throw new Error('Failed to fetch calendar');
      return res.json();
    },
  });

  const { data: upcoming, isLoading: loadingUpcoming } = useQuery<UpcomingResponse>({
    queryKey: ["/api/admin/contents/schedule/upcoming"],
  });

  const { data: metrics, isLoading: loadingMetrics } = useQuery<MetricsResponse>({
    queryKey: ["/api/admin/contents/schedule/metrics"],
  });

  const goToPreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const goToToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Content Calendar</h1>
          <p className="text-muted-foreground">
            View and manage scheduled contents
          </p>
        </div>
      </div>

      {/* Scheduler Metrics */}
      <SchedulerMetrics metrics={metrics} loading={loadingMetrics} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {MONTH_NAMES[month - 1]} {year}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={goToNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CalendarGrid
                year={year}
                month={month}
                items={calendar?.items || []}
                loading={loadingCalendar}
              />
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <UpcomingList
                items={upcoming?.items || []}
                loading={loadingUpcoming}
              />
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Status Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor('pending')}>
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
                <span className="text-sm text-muted-foreground">Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor('published')}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Published
                </Badge>
                <span className="text-sm text-muted-foreground">Auto-published</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor('failed')}>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
                <span className="text-sm text-muted-foreground">Past due</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

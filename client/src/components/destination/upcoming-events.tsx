import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  MapPin, 
  PartyPopper, 
  Trophy, 
  Music, 
  Users, 
  Palette, 
  Globe,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventData {
  id: string;
  name: string;
  description: string | null;
  eventType: string;
  eventTypeLabel: string;
  eventTypeIcon: string;
  venue: string | null;
  venueAddress: string | null;
  startDate: string | null;
  endDate: string | null;
  ticketUrl: string | null;
  imageUrl: string | null;
  status: string;
  featured: boolean;
  destinationId: string;
}

interface EventsResponse {
  success: boolean;
  data: EventData[];
  total: number;
}

interface UpcomingEventsProps {
  destinationId: string;
  destinationName?: string;
  limit?: number;
  showViewAll?: boolean;
}

const EVENT_TYPE_ICONS: Record<string, typeof Calendar> = {
  festival: PartyPopper,
  sports: Trophy,
  concert: Music,
  conference: Users,
  exhibition: Palette,
  cultural: Globe,
  holiday: Calendar,
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  festival: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  sports: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  concert: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  conference: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  exhibition: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  cultural: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  holiday: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function formatEventDate(startDate: string | null, endDate: string | null): string {
  if (!startDate) return "Date TBD";
  
  const start = new Date(startDate);
  const options: Intl.DateTimeFormatOptions = { 
    month: "short", 
    day: "numeric",
    year: start.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
  };
  
  const startStr = start.toLocaleDateString("en-US", options);
  
  if (endDate) {
    const end = new Date(endDate);
    if (start.toDateString() !== end.toDateString()) {
      const endOptions: Intl.DateTimeFormatOptions = { 
        month: "short", 
        day: "numeric",
        year: end.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
      };
      return `${startStr} - ${end.toLocaleDateString("en-US", endOptions)}`;
    }
  }
  
  return startStr;
}

function getDaysUntil(startDate: string | null): string | null {
  if (!startDate) return null;
  
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = start.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return null;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays <= 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
  return `In ${Math.ceil(diffDays / 30)} months`;
}

function EventCard({ event }: { event: EventData }) {
  const IconComponent = EVENT_TYPE_ICONS[event.eventType] || Calendar;
  const colorClass = EVENT_TYPE_COLORS[event.eventType] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  const daysUntil = getDaysUntil(event.startDate);
  
  return (
    <Card className="overflow-hidden hover-elevate transition-all duration-200" data-testid={`card-event-${event.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 p-2.5 rounded-md ${colorClass}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-sm leading-tight line-clamp-2" data-testid={`text-event-name-${event.id}`}>
                {event.name}
              </h3>
              {event.featured && (
                <Badge variant="secondary" className="flex-shrink-0 text-xs">
                  Featured
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span data-testid={`text-event-date-${event.id}`}>
                {formatEventDate(event.startDate, event.endDate)}
              </span>
              {daysUntil && (
                <Badge variant="outline" className="text-xs ml-auto">
                  {daysUntil}
                </Badge>
              )}
            </div>
            
            {event.venue && (
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate" data-testid={`text-event-venue-${event.id}`}>
                  {event.venue}
                </span>
              </div>
            )}
            
            {event.description && (
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="w-10 h-10 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function UpcomingEvents({ 
  destinationId, 
  destinationName,
  limit = 4,
  showViewAll = true 
}: UpcomingEventsProps) {
  const { data, isLoading, error } = useQuery<EventsResponse>({
    queryKey: ['/api/destination-events/upcoming', destinationId, { limit }],
    queryFn: async () => {
      const response = await fetch(`/api/destination-events/upcoming?destinationId=${destinationId}&limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    },
    enabled: !!destinationId,
  });

  if (error) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="py-8" data-testid="section-upcoming-events">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Upcoming Events</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: limit }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const events = data?.data || [];
  
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="py-8" data-testid="section-upcoming-events">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold" data-testid="text-events-title">
              Upcoming Events{destinationName ? ` in ${destinationName}` : ""}
            </h2>
          </div>
          {showViewAll && events.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 text-muted-foreground"
              data-testid="button-view-all-events"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
        
        {events.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(EVENT_TYPE_ICONS).slice(0, 6).map(([type, Icon]) => {
              const count = events.filter(e => e.eventType === type).length;
              if (count === 0) return null;
              return (
                <Badge 
                  key={type} 
                  variant="outline" 
                  className="gap-1.5"
                  data-testid={`badge-event-type-${type}`}
                >
                  <Icon className="w-3 h-3" />
                  {type.charAt(0).toUpperCase() + type.slice(1)} ({count})
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

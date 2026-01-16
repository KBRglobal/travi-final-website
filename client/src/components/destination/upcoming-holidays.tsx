import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Globe } from "lucide-react";

interface HolidayData {
  id: number;
  name: string;
  localName: string | null;
  date: string;
  countryCode: string;
}

interface HolidaysResponse {
  success: boolean;
  data: HolidayData[];
  _meta: {
    destination: string;
    countryCode: string;
    dateRange: { from: string; to: string };
    total: number;
  };
}

interface UpcomingHolidaysProps {
  destinationId: string;
  destinationName: string;
  limit?: number;
}

function formatHolidayDate(dateStr: string): { day: string; month: string; weekday: string } {
  const date = new Date(dateStr + "T00:00:00");
  return {
    day: date.toLocaleDateString("en-US", { day: "numeric" }),
    month: date.toLocaleDateString("en-US", { month: "short" }),
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

function getDaysUntil(dateStr: string): string | null {
  const holidayDate = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = holidayDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return null;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays <= 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
  return `In ${Math.ceil(diffDays / 30)} months`;
}

function HolidayCard({ holiday }: { holiday: HolidayData }) {
  const { day, month, weekday } = formatHolidayDate(holiday.date);
  const daysUntil = getDaysUntil(holiday.date);
  const hasLocalName = holiday.localName && holiday.localName !== holiday.name;

  return (
    <Card 
      className="overflow-hidden hover-elevate transition-all duration-200 border-l-4 border-l-[#6443F4]" 
      data-testid={`card-holiday-${holiday.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-16 text-center">
            <div className="bg-[#6443F4]/10 dark:bg-[#6443F4]/20 rounded-lg p-2">
              <Calendar className="w-5 h-5 text-[#6443F4] mx-auto mb-1" />
              <div className="text-2xl font-bold text-[#6443F4]" data-testid={`text-holiday-day-${holiday.id}`}>
                {day}
              </div>
              <div className="text-xs text-muted-foreground uppercase font-medium">
                {month}
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {weekday}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 
                className="font-semibold text-sm leading-tight" 
                data-testid={`text-holiday-name-${holiday.id}`}
              >
                {holiday.name}
              </h3>
              {daysUntil && (
                <Badge 
                  variant="outline" 
                  className="flex-shrink-0 text-xs border-[#6443F4]/30 text-[#6443F4]"
                >
                  {daysUntil}
                </Badge>
              )}
            </div>
            
            {hasLocalName && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                <Globe className="w-3 h-3 flex-shrink-0" />
                <span className="italic" data-testid={`text-holiday-localname-${holiday.id}`}>
                  {holiday.localName}
                </span>
              </div>
            )}
            
            <div className="mt-2">
              <Badge 
                variant="secondary" 
                className="text-xs bg-[#6443F4]/10 text-[#6443F4] hover:bg-[#6443F4]/20"
              >
                Public Holiday
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HolidayCardSkeleton() {
  return (
    <Card className="overflow-hidden border-l-4 border-l-muted">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-16">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-3 w-8 mx-auto mt-1" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function UpcomingHolidays({ 
  destinationId, 
  destinationName,
  limit = 4
}: UpcomingHolidaysProps) {
  const { data, isLoading, error } = useQuery<HolidaysResponse>({
    queryKey: ['/api/destinations', destinationId, 'holidays'],
    queryFn: async () => {
      const response = await fetch(`/api/destinations/${destinationId}/holidays`);
      if (!response.ok) throw new Error('Failed to fetch holidays');
      return response.json();
    },
    enabled: !!destinationId,
  });

  if (error) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="py-12 bg-card/30" data-testid="section-upcoming-holidays">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-[#6443F4]/10">
              <Calendar className="w-6 h-6 text-[#6443F4]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Upcoming Public Holidays</h2>
              <p className="text-sm text-muted-foreground">Loading holidays...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: limit }).map((_, i) => (
              <HolidayCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const holidays = data?.data?.slice(0, limit) || [];
  const countryCode = data?._meta?.countryCode;
  
  if (holidays.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-card/30" data-testid="section-upcoming-holidays">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-[#6443F4]/10">
            <Calendar className="w-6 h-6 text-[#6443F4]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-holidays-title">
              Upcoming Public Holidays in {destinationName}
            </h2>
            <p className="text-sm text-muted-foreground">
              Plan your trip around these national holidays
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {holidays.map((holiday) => (
            <HolidayCard key={holiday.id} holiday={holiday} />
          ))}
        </div>
        
        {holidays.length > 0 && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Showing next {holidays.length} public holidays • Country code: {countryCode}
          </p>
        )}
      </div>
    </section>
  );
}

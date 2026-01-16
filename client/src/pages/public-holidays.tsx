import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Globe,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { format, parseISO, getMonth, getYear } from "date-fns";

interface Holiday {
  id: number;
  countryCode: string;
  date: string;
  localName: string;
  name: string;
  fixed: boolean;
  global: boolean;
  types: string[];
}

interface CountryOption {
  countryCode: string;
  name: string;
  count: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const HOLIDAY_TYPE_COLORS: Record<string, string> = {
  Public: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  Bank: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  School: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  Authorities: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  Optional: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Observance: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
};

export default function PublicHolidays() {
  const currentYear = new Date().getFullYear();
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const { data: countries, isLoading: countriesLoading } = useQuery<{ 
    success: boolean; 
    data: CountryOption[] 
  }>({
    queryKey: ["/api/external/holidays/countries"],
  });

  const { data: holidays, isLoading: holidaysLoading } = useQuery<{ 
    success: boolean; 
    data: Holiday[] 
  }>({
    queryKey: ["/api/external/holidays", { country: selectedCountry, year: selectedYear }],
  });

  const holidaysByMonth = holidays?.data?.reduce((acc, holiday) => {
    const month = getMonth(parseISO(holiday.date));
    if (!acc[month]) acc[month] = [];
    acc[month].push(holiday);
    return acc;
  }, {} as Record<number, Holiday[]>) || {};

  const totalHolidays = holidays?.data?.length || 0;
  const uniqueCountries = countries?.data?.length || 0;

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Public Holidays
          </h1>
          <p className="text-muted-foreground">
            Explore public holidays from {uniqueCountries} countries
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <Select 
          value={selectedCountry} 
          onValueChange={setSelectedCountry}
        >
          <SelectTrigger className="w-full md:w-64" data-testid="select-country">
            <SelectValue placeholder="All Countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries?.data?.map((country) => (
              <SelectItem key={country.countryCode} value={country.countryCode}>
                {country.name} ({country.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedYear(selectedYear - 1)}
            data-testid="button-prev-year"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Select 
            value={selectedYear.toString()} 
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-32" data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedYear(selectedYear + 1)}
            data-testid="button-next-year"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Holidays</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-holidays">
              {totalHolidays}
            </div>
            <p className="text-xs text-muted-foreground">
              For {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-countries-count">
              {uniqueCountries}
            </div>
            <p className="text-xs text-muted-foreground">
              With holiday data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <PartyPopper className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-upcoming-count">
              {holidays?.data?.filter((h) => new Date(h.date) >= new Date()).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Remaining this year
            </p>
          </CardContent>
        </Card>
      </div>

      {holidaysLoading || countriesLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-holidays" />
        </div>
      ) : (
        <div className="space-y-6">
          {MONTHS.map((monthName, monthIndex) => {
            const monthHolidays = holidaysByMonth[monthIndex] || [];
            if (monthHolidays.length === 0) return null;

            return (
              <Card key={monthIndex} data-testid={`card-month-${monthIndex}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {monthName} {selectedYear}
                    <Badge variant="secondary" className="ml-2">
                      {monthHolidays.length} holidays
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {monthHolidays.map((holiday) => (
                      <div
                        key={holiday.id}
                        className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                        data-testid={`holiday-${holiday.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{holiday.name}</span>
                            {holiday.localName !== holiday.name && (
                              <span className="text-sm text-muted-foreground">
                                ({holiday.localName})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {format(parseISO(holiday.date), "EEEE, MMM d")}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {holiday.countryCode}
                            </Badge>
                            {holiday.global && (
                              <Badge variant="secondary" className="text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                National
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {holiday.types.map((type) => (
                            <Badge
                              key={type}
                              className={HOLIDAY_TYPE_COLORS[type] || "bg-gray-100 text-gray-700"}
                            >
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {Object.keys(holidaysByMonth).length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No holidays found</p>
                <p className="text-muted-foreground">
                  Try selecting a different country or year
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

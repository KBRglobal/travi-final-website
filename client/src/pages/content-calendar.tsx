import { ContentCalendar } from "@/components/content-calendar";

/**
 * Content Calendar Page
 * Displays content scheduling in calendar format
 */
export default function ContentCalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Calendar</h1>
        <p className="text-muted-foreground">
          View and manage your contents schedule in a calendar format
        </p>
      </div>

      <ContentCalendar />
    </div>
  );
}

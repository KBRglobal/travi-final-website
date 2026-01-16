import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ContentStatus = "draft" | "in_review" | "reviewed" | "approved" | "scheduled" | "published" | "archived";

interface StatusBadgeProps {
  status: ContentStatus;
  className?: string;
}

const statusConfig: Record<ContentStatus, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
  },
  in_review: {
    label: "In Review",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  reviewed: {
    label: "Reviewed",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  scheduled: {
    label: "Scheduled",
    className: "bg-[#6443F4]/10 text-[#6443F4] dark:bg-[#6443F4]/20 dark:text-[#6443F4]",
  },
  published: {
    label: "Published",
    className: "bg-primary text-primary-foreground",
  },
  archived: {
    label: "Archived",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge
      variant="secondary"
      className={cn(config.className, "font-medium", className)}
      data-testid={`status-badge-${status}`}
    >
      {config.label}
    </Badge>
  );
}

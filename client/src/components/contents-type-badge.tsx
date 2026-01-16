import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
} from "lucide-react";

type ContentType = 
  | "attraction" 
  | "hotel" 
  | "article" 
  | "dining" 
  | "district" 
  | "transport" 
  | "event" 
  | "itinerary" 
  | "landing_page" 
  | "case_study" 
  | "off_plan";

interface ContentTypeBadgeProps {
  type: ContentType;
  className?: string;
}

const typeConfig: Record<ContentType, { label: string; icon: typeof MapPin; className: string }> = {
  attraction: {
    label: "Attraction",
    icon: MapPin,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  hotel: {
    label: "Hotel",
    icon: Building2,
    className: "bg-[#6443F4]/10 text-[#6443F4] dark:bg-[#6443F4]/20 dark:text-[#6443F4]",
  },
  article: {
    label: "Article",
    icon: FileText,
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  dining: {
    label: "Dining",
    icon: UtensilsCrossed,
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  district: {
    label: "District",
    icon: MapIcon,
    className: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  },
  transport: {
    label: "Transport",
    icon: Train,
    className: "bg-[#6443F4]/10 text-[#6443F4] dark:bg-[#6443F4]/20 dark:text-[#6443F4]",
  },
  event: {
    label: "Event",
    icon: Calendar,
    className: "bg-[#6443F4]/10 text-[#6443F4] dark:bg-[#6443F4]/20 dark:text-[#6443F4]",
  },
  itinerary: {
    label: "Itinerary",
    icon: Route,
    className: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  },
  landing_page: {
    label: "Landing Page",
    icon: Megaphone,
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  case_study: {
    label: "Case Study",
    icon: FileBarChart2,
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  },
  off_plan: {
    label: "Off-Plan",
    icon: Building,
    className: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  },
};

export function ContentTypeBadge({ type, className }: ContentTypeBadgeProps) {
  const config = typeConfig[type];
  
  if (!config) {
    return (
      <Badge variant="secondary" className={className}>
        {type}
      </Badge>
    );
  }
  
  const Icon = config.icon;
  
  return (
    <Badge
      variant="secondary"
      className={cn(config.className, "font-medium gap-1", className)}
      data-testid={`type-badge-${type}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

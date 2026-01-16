import { Link, useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

// Auto-generate breadcrumbs from current path
function useAutoBreadcrumbs(): BreadcrumbItem[] {
  const [location] = useLocation();
  const { localePath } = useLocale();

  const pathSegments = location
    .split("/")
    .filter((seg) => seg && !["ar", "he", "hi", "zh", "ru", "fa", "ur", "fr", "de", "es", "it", "tr", "bn", "fil", "ja", "ko"].includes(seg));

  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = "";

  const labelMap: Record<string, string> = {
    attractions: "Attractions",
    hotels: "Hotels",
    dining: "Dining",
    districts: "Districts",
    events: "Events",
    articles: "Articles",
    search: "Search",
    "real-estate": "Real Estate",
    "off-plan": "Off-Plan Properties",
    dubai: "Dubai",
    "free-things-to-do": "Free Things to Do",
    "laws-for-tourists": "Laws for Tourists",
  };

  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;

    breadcrumbs.push({
      label: labelMap[segment] || segment.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      href: isLast ? undefined : localePath(currentPath),
    });
  });

  return breadcrumbs;
}

export function Breadcrumbs({ items, showHome = true, className }: BreadcrumbsProps) {
  const { t, localePath, isRTL } = useLocale();
  const autoBreadcrumbs = useAutoBreadcrumbs();
  const breadcrumbs = items || autoBreadcrumbs;

  if (breadcrumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm text-muted-foreground", className)}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <ol className="flex items-center gap-1 flex-wrap">
        {showHome && (
          <li className="flex items-center">
            <Link
              href={localePath("/")}
              className="flex items-center hover:text-foreground transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="sr-only">{t("nav.home")}</span>
            </Link>
            <ChevronRight className={cn("w-4 h-4 mx-1", isRTL && "rotate-180")} />
          </li>
        )}

        {breadcrumbs.map((item, index) => (
          <li key={index} className="flex items-center">
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{item.label}</span>
            )}

            {index < breadcrumbs.length - 1 && (
              <ChevronRight className={cn("w-4 h-4 mx-1", isRTL && "rotate-180")} />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

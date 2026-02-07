/**
 * Breadcrumbs Component
 * Renders breadcrumb navigation with destination-aware context
 */

import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { ChevronRight } from "lucide-react";
import { useDestinationContext } from "@/hooks/use-destination-context";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const BASE_URL = "https://travi.world";

interface BreadcrumbItem {
  label?: string;
  labelKey?: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showDestination?: boolean;
  className?: string;
}

export function Breadcrumbs({ items, showDestination = false, className = "" }: BreadcrumbsProps) {
  const { currentDestination, destinationSlug } = useDestinationContext();
  const { localePath } = useLocale();

  // Build full breadcrumb list
  const allItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }];

  // Add destination if showing and we have one
  if (showDestination && destinationSlug) {
    allItems.push({
      label: currentDestination || destinationSlug,
      href: `/destination/${destinationSlug}`,
    });
  }

  // Add custom items
  allItems.push(...items);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label || item.labelKey || "",
      ...(item.href ? { item: `${BASE_URL}${localePath(item.href)}` } : {}),
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <nav
        className={`flex items-center gap-2 text-slate-500 text-sm ${className}`}
        aria-label="Breadcrumb"
      >
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const label = item.label || item.labelKey || "";

          return (
            <span key={index} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="w-4 h-4" />}
              {isLast || !item.href ? (
                <span className="text-slate-900 dark:text-white font-medium">{label}</span>
              ) : (
                <Link
                  href={localePath(item.href)}
                  className="hover:text-[#6443F4] transition-colors"
                >
                  {label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}

export default Breadcrumbs;

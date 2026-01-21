/**
 * Breadcrumbs Component
 * Provides navigation back to home and destination pages
 * Used on internal pages to help users navigate back
 */

import { Link } from "wouter";
import { ChevronRight, Home, ChevronLeft } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useDestinationContext } from "@/hooks/use-destination-context";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  labelKey?: string;
  label?: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
  showDestination?: boolean;
}

export function Breadcrumbs({ 
  items = [], 
  className,
  showHome = true,
  showDestination = true
}: BreadcrumbsProps) {
  const { localePath, isRTL } = useLocale();
  const { isDubai } = useDestinationContext();
  const { t } = useTranslation();

  const getLabel = (item: BreadcrumbItem) => {
    if (item.labelKey) return t(item.labelKey);
    return item.label || "";
  };

  const allItems: BreadcrumbItem[] = [];
  
  if (showHome) {
    allItems.push({
      labelKey: "nav.home",
      href: "/"
    });
  }

  if (showDestination && isDubai) {
    allItems.push({
      labelKey: "breadcrumbs.dubai",
      href: "/destination/dubai"
    });
  }

  allItems.push(...items);

  const Separator = () => (
    isRTL 
      ? <ChevronLeft className="w-3 h-3 text-gray-400 flex-shrink-0 mx-1" aria-hidden="true" />
      : <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0 mx-1" aria-hidden="true" />
  );

  if (allItems.length <= 1) return null;

  return (
    <nav 
      aria-label={t("breadcrumbs.ariaLabel")}
      className={cn(
        "flex items-center gap-1 text-sm",
        className
      )}
      data-testid="breadcrumbs"
    >
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        const isFirst = index === 0;
        const displayLabel = getLabel(item);
        const itemKey = item.labelKey || item.label || item.href || `breadcrumb-${index}`;
        const testIdSuffix = (item.labelKey || item.label || item.href || `item-${index}`).toLowerCase().replace(/[.\s]/g, '-');
        
        return (
          <div key={itemKey} className="flex items-center">
            {index > 0 && <Separator />}
            
            {item.href && !isLast ? (
              <Link
                href={localePath(item.href)}
                className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-[#6443F4] transition-colors whitespace-nowrap"
                data-testid={`breadcrumb-link-${testIdSuffix}`}
              >
                {isFirst && <Home className="w-3.5 h-3.5" aria-hidden="true" />}
                <span>{displayLabel}</span>
              </Link>
            ) : (
              <span 
                className="text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap truncate max-w-[200px]"
                data-testid="breadcrumb-current"
                aria-current="page"
              >
                {displayLabel}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

interface BackButtonProps {
  href?: string;
  labelKey?: string;
  className?: string;
}

export function BackButton({ 
  href, 
  labelKey = "common.back",
  className 
}: BackButtonProps) {
  const { localePath, isRTL } = useLocale();
  const { isDubai } = useDestinationContext();
  const { t } = useTranslation();
  
  const targetHref = href || (isDubai ? "/destination/dubai" : "/");
  const displayLabel = t(labelKey);

  const ArrowIcon = isRTL ? ChevronRight : ChevronLeft;

  return (
    <Link
      href={localePath(targetHref)}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-[#6443F4] transition-colors",
        className
      )}
      data-testid="button-back"
    >
      <ArrowIcon className="w-4 h-4" aria-hidden="true" />
      <span>{displayLabel}</span>
    </Link>
  );
}

export function PageHeader({
  titleKey,
  title,
  subtitleKey,
  subtitle,
  breadcrumbs = [],
  showBackButton = true,
  backHref,
  backLabelKey,
  children,
  className,
}: {
  titleKey?: string;
  title?: string;
  subtitleKey?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  showBackButton?: boolean;
  backHref?: string;
  backLabelKey?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const displayTitle = titleKey ? t(titleKey) : title || "";
  const displaySubtitle = subtitleKey ? t(subtitleKey) : subtitle;

  return (
    <div 
      className={cn(
        "bg-white dark:bg-card rounded-xl p-6 mb-6 shadow-sm",
        className
      )}
      data-testid="page-header"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Breadcrumbs items={breadcrumbs} />
          {showBackButton && (
            <BackButton 
              href={backHref} 
              labelKey={backLabelKey}
            />
          )}
        </div>
        
        <div>
          <h1 
            className="text-2xl md:text-3xl font-bold text-foreground"
            data-testid="page-title"
          >
            {displayTitle}
          </h1>
          {displaySubtitle && (
            <p 
              className="mt-2 text-gray-600 dark:text-gray-400"
              data-testid="page-subtitle"
            >
              {displaySubtitle}
            </p>
          )}
        </div>
        
        {children}
      </div>
    </div>
  );
}

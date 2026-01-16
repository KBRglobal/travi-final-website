import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  Shield, 
  ShieldAlert, 
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  X
} from "lucide-react";

interface HealthAlert {
  id: string;
  alertType: string;
  alertTypeLabel: string;
  title: string;
  description: string | null;
  details: Record<string, unknown> | null;
  severity: "low" | "medium" | "high" | "critical";
  severityLabel: string;
  status: string;
  source: string | null;
  sourceUrl: string | null;
  issuedDate: string | null;
}

interface HealthAlertResponse {
  success: boolean;
  data: HealthAlert[];
  total: number;
}

interface SafetyBannerProps {
  destinationCode: string;
  destinationName?: string;
}

const COUNTRY_CODE_MAPPING: Record<string, string> = {
  "dubai": "AE",
  "uae": "AE",
  "united-arab-emirates": "AE",
  "abu-dhabi": "AE",
  "london": "GB",
  "uk": "GB",
  "paris": "FR",
  "france": "FR",
  "tokyo": "JP",
  "japan": "JP",
  "singapore": "SG",
  "bangkok": "TH",
  "thailand": "TH",
  "hong-kong": "HK",
  "amsterdam": "NL",
  "barcelona": "ES",
  "spain": "ES",
  "rome": "IT",
  "italy": "IT",
  "istanbul": "TR",
  "turkey": "TR",
  "new-york": "US",
  "usa": "US",
  "los-angeles": "US",
  "miami": "US",
};

function normalizeDestinationCode(code: string): string | null {
  if (!code) return null;
  const upperCode = code.toUpperCase();
  if (upperCode.length === 2 && /^[A-Z]{2}$/.test(upperCode)) {
    return upperCode;
  }
  const lowerCode = code.toLowerCase();
  return COUNTRY_CODE_MAPPING[lowerCode] || null;
}

const SEVERITY_CONFIG: Record<string, {
  icon: typeof ShieldCheck;
  bannerClass: string;
  iconClass: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
}> = {
  low: {
    icon: ShieldCheck,
    bannerClass: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900",
    iconClass: "text-green-600 dark:text-green-400",
    badgeVariant: "default",
  },
  medium: {
    icon: Shield,
    bannerClass: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
    iconClass: "text-amber-600 dark:text-amber-400",
    badgeVariant: "secondary",
  },
  high: {
    icon: ShieldAlert,
    bannerClass: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900",
    iconClass: "text-orange-600 dark:text-orange-400",
    badgeVariant: "secondary",
  },
  critical: {
    icon: AlertTriangle,
    bannerClass: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900",
    iconClass: "text-red-600 dark:text-red-400",
    badgeVariant: "destructive",
  },
};

export function SafetyBanner({ destinationCode, destinationName }: SafetyBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  const normalizedCode = normalizeDestinationCode(destinationCode);

  const { data, isLoading } = useQuery<HealthAlertResponse>({
    queryKey: [`/api/health-alerts?destination=${normalizedCode}&status=active&limit=5`],
    enabled: !!normalizedCode && !isDismissed,
  });

  if (isDismissed) return null;
  
  if (isLoading) {
    return (
      <div className="w-full" data-testid="safety-banner-loading">
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const alerts = data?.data || [];
  if (alerts.length === 0) return null;

  const highestSeverity = alerts.reduce((highest, alert) => {
    const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    return severityOrder[alert.severity] > severityOrder[highest] ? alert.severity : highest;
  }, "low" as "low" | "medium" | "high" | "critical");

  const config = SEVERITY_CONFIG[highestSeverity];
  const Icon = config.icon;
  const primaryAlert = alerts[0];

  return (
    <div 
      className={`w-full border rounded-md ${config.bannerClass}`}
      data-testid="safety-banner"
    >
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.iconClass}`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={config.badgeVariant} data-testid="severity-badge">
                {primaryAlert.severityLabel}
              </Badge>
              <span className="text-sm font-medium" data-testid="alert-title">
                {primaryAlert.title}
              </span>
            </div>
            
            {isExpanded && (
              <div className="mt-3 space-y-3" data-testid="expanded-content">
                {primaryAlert.description && (
                  <p className="text-sm text-muted-foreground">
                    {primaryAlert.description}
                  </p>
                )}
                
                {primaryAlert.details?.advice && (
                  <div className="text-sm">
                    <span className="font-medium">Advice: </span>
                    <span className="text-muted-foreground">
                      {String(primaryAlert.details.advice)}
                    </span>
                  </div>
                )}
                
                {primaryAlert.sourceUrl && (
                  <a
                    href={primaryAlert.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary underline"
                    data-testid="link-source"
                  >
                    View full advisory
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                
                {alerts.length > 1 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">
                      {alerts.length - 1} more alert{alerts.length > 2 ? 's' : ''} for {destinationName || 'this destination'}:
                    </p>
                    <ul className="space-y-1">
                      {alerts.slice(1).map(alert => (
                        <li key={alert.id} className="text-sm flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {alert.severityLabel}
                          </Badge>
                          <span className="truncate">{alert.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid="button-toggle-expand"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDismissed(true)}
              data-testid="button-dismiss"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SafetyBanner;

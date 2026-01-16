import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Clock, Globe, FileText, AlertCircle } from "lucide-react";

interface VisaRequirementData {
  id: number;
  passportCountryCode: string;
  destinationCountryCode: string;
  visaCategory: string;
  visaCategoryLabel: string;
  stayDuration: number | null;
  stayDurationLabel: string | null;
  notes: string | null;
  sourceUrl: string | null;
  lastUpdated: string | null;
}

interface VisaRequirementResponse {
  success: boolean;
  data: VisaRequirementData | null;
  message?: string;
}

interface QuickInfoRailProps {
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
  "united-kingdom": "GB",
  "paris": "FR",
  "france": "FR",
  "tokyo": "JP",
  "japan": "JP",
  "new-york": "US",
  "usa": "US",
  "united-states": "US",
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
  "las-vegas": "US",
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
  if (COUNTRY_CODE_MAPPING[lowerCode]) {
    return COUNTRY_CODE_MAPPING[lowerCode];
  }
  return null;
}

const COMMON_NATIONALITIES = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "JP", label: "Japan" },
  { code: "IN", label: "India" },
  { code: "CN", label: "China" },
  { code: "BR", label: "Brazil" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "SG", label: "Singapore" },
  { code: "KR", label: "South Korea" },
  { code: "IT", label: "Italy" },
  { code: "ES", label: "Spain" },
  { code: "NL", label: "Netherlands" },
  { code: "SE", label: "Sweden" },
  { code: "CH", label: "Switzerland" },
  { code: "MX", label: "Mexico" },
  { code: "RU", label: "Russia" },
];

const VISA_STATUS_CONFIG: Record<string, { 
  icon: typeof CheckCircle; 
  color: string; 
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  bgClass: string;
}> = {
  VF: { 
    icon: CheckCircle, 
    color: "text-green-600 dark:text-green-400", 
    badgeVariant: "default",
    bgClass: "bg-green-50 dark:bg-green-950/30",
  },
  VOA: { 
    icon: Clock, 
    color: "text-amber-600 dark:text-amber-400", 
    badgeVariant: "secondary",
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
  },
  eVisa: { 
    icon: FileText, 
    color: "text-blue-600 dark:text-blue-400", 
    badgeVariant: "secondary",
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
  },
  ETA: { 
    icon: Globe, 
    color: "text-purple-600 dark:text-purple-400", 
    badgeVariant: "secondary",
    bgClass: "bg-purple-50 dark:bg-purple-950/30",
  },
  VR: { 
    icon: XCircle, 
    color: "text-red-600 dark:text-red-400", 
    badgeVariant: "destructive",
    bgClass: "bg-red-50 dark:bg-red-950/30",
  },
};

export function QuickInfoRail({ destinationCode, destinationName }: QuickInfoRailProps) {
  const [selectedNationality, setSelectedNationality] = useState("US");
  
  const normalizedCode = normalizeDestinationCode(destinationCode);

  const { data, isLoading, error } = useQuery<VisaRequirementResponse>({
    queryKey: [`/api/visa-requirements?destination=${normalizedCode}&passport=${selectedNationality}`],
    enabled: !!normalizedCode,
  });

  const visaData = data?.data;
  const statusConfig = visaData 
    ? VISA_STATUS_CONFIG[visaData.visaCategory] || VISA_STATUS_CONFIG.VR 
    : null;

  const StatusIcon = statusConfig?.icon || AlertCircle;

  return (
    <Card data-testid="quick-info-rail">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Visa Requirements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label 
            className="text-sm text-muted-foreground"
            htmlFor="nationality-select"
          >
            Your Nationality
          </label>
          <Select
            value={selectedNationality}
            onValueChange={setSelectedNationality}
          >
            <SelectTrigger 
              id="nationality-select"
              data-testid="select-nationality"
            >
              <SelectValue placeholder="Select nationality" />
            </SelectTrigger>
            <SelectContent>
              {COMMON_NATIONALITIES.map((country) => (
                <SelectItem 
                  key={country.code} 
                  value={country.code}
                  data-testid={`option-nationality-${country.code}`}
                >
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3" data-testid="loading-skeleton">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : error ? (
          <div 
            className="text-sm text-destructive flex items-center gap-2"
            data-testid="error-message"
          >
            <AlertCircle className="h-4 w-4" />
            Failed to load visa information
          </div>
        ) : visaData ? (
          <div className="space-y-3">
            <div 
              className={`p-4 rounded-md ${statusConfig?.bgClass || ""}`}
              data-testid="visa-status-card"
            >
              <div className="flex items-center gap-3">
                <StatusIcon 
                  className={`h-6 w-6 ${statusConfig?.color || ""}`} 
                  data-testid="visa-status-icon"
                />
                <div className="flex-1">
                  <Badge 
                    variant={statusConfig?.badgeVariant || "secondary"}
                    data-testid="visa-status-badge"
                  >
                    {visaData.visaCategoryLabel}
                  </Badge>
                </div>
              </div>
              
              {visaData.stayDuration && (
                <p 
                  className="text-sm mt-2 text-muted-foreground"
                  data-testid="stay-duration"
                >
                  Stay allowed: <span className="font-medium text-foreground">{visaData.stayDurationLabel}</span>
                </p>
              )}
            </div>

            {visaData.notes && (
              <p 
                className="text-xs text-muted-foreground"
                data-testid="visa-notes"
              >
                {visaData.notes}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Traveling from{" "}
              <span className="font-medium">
                {COMMON_NATIONALITIES.find(c => c.code === selectedNationality)?.label || selectedNationality}
              </span>
              {destinationName && (
                <>
                  {" "}to{" "}
                  <span className="font-medium">{destinationName}</span>
                </>
              )}
            </p>

            {visaData.sourceUrl && (
              <a
                href={visaData.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground underline hover:text-foreground"
                data-testid="link-source"
              >
                Data source
              </a>
            )}
          </div>
        ) : (
          <div 
            className="text-sm text-muted-foreground flex items-center gap-2"
            data-testid="no-data-message"
          >
            <AlertCircle className="h-4 w-4" />
            No visa data available for this destination
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default QuickInfoRail;

import { Globe, Check, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SUPPORTED_LOCALES, RTL_LOCALES, type Locale } from "@shared/schema";
import { cn } from "@/lib/utils";

const POPULAR_LOCALES: Locale[] = ["en", "ar", "fr", "de", "es", "zh", "ja", "hi", "ru", "pt"];

interface LanguageSwitcherProps {
  variant?: "nav" | "footer" | "compact";
  className?: string;
}

export function LanguageSwitcher({ variant = "nav", className }: LanguageSwitcherProps) {
  const { locale, setLocale, isRTL } = useLocale();
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();
  
  const currentLocale = SUPPORTED_LOCALES.find(l => l.code === locale) || SUPPORTED_LOCALES[0];
  
  const handleLocaleChange = (newLocale: Locale) => {
    const localePattern = new RegExp(`^/(${SUPPORTED_LOCALES.map(l => l.code).join('|')})(/|$)`);
    const match = location.match(localePattern);
    let pathWithoutLocale = location;
    
    if (match) {
      pathWithoutLocale = location.slice(match[1].length + 1) || '/';
    }
    
    const cleanPath = pathWithoutLocale.startsWith('/') ? pathWithoutLocale : `/${pathWithoutLocale}`;
    const newPath = `/${newLocale}${cleanPath === '/' ? '' : cleanPath}`;
    
    setLocale(newLocale);
    setLocation(newPath.replace(/\/+/g, '/') || `/${newLocale}`);
  };

  const popularLocales = SUPPORTED_LOCALES.filter(l => POPULAR_LOCALES.includes(l.code));
  const otherLocales = SUPPORTED_LOCALES.filter(l => !POPULAR_LOCALES.includes(l.code));

  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("rounded-full text-white/70", className)}
            data-testid="button-language-switcher"
            aria-label={t("nav.changeLanguage")}
          >
            <Globe className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align={isRTL ? "start" : "end"} 
          className="w-48 max-h-80 overflow-y-auto"
          data-testid="dropdown-language-menu"
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t("nav.selectLanguage")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SUPPORTED_LOCALES.map((l) => (
            <DropdownMenuItem
              key={l.code}
              onClick={() => handleLocaleChange(l.code)}
              className={cn(
                "flex items-center justify-between cursor-pointer",
                l.code === locale && "bg-accent"
              )}
              data-testid={`menu-item-lang-${l.code}`}
            >
              <span className={cn(RTL_LOCALES.includes(l.code) && "font-arabic")}>
                {l.nativeName}
              </span>
              {l.code === locale && <Check className="w-4 h-4 text-foreground" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn("gap-2 rounded-full text-white/70 px-3", className)}
          data-testid="button-language-switcher"
          aria-label={t("nav.changeLanguage")}
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">{currentLocale.nativeName}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={isRTL ? "start" : "end"} 
        className="w-56 max-h-[70vh] overflow-y-auto"
        data-testid="dropdown-language-menu"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          {t("nav.popularLanguages")}
        </DropdownMenuLabel>
        {popularLocales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => handleLocaleChange(l.code)}
            className={cn(
              "flex items-center justify-between cursor-pointer py-2.5",
              l.code === locale && "bg-accent"
            )}
            data-testid={`menu-item-lang-${l.code}`}
          >
            <div className="flex flex-col">
              <span className={cn(
                "font-medium",
                RTL_LOCALES.includes(l.code) && "font-arabic"
              )}>
                {l.nativeName}
              </span>
              <span className="text-xs text-muted-foreground">{l.name}</span>
            </div>
            {l.code === locale && <Check className="w-4 h-4 text-foreground shrink-0" />}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          {t("nav.allLanguages")}
        </DropdownMenuLabel>
        {otherLocales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => handleLocaleChange(l.code)}
            className={cn(
              "flex items-center justify-between cursor-pointer py-2.5",
              l.code === locale && "bg-accent"
            )}
            data-testid={`menu-item-lang-${l.code}`}
          >
            <div className="flex flex-col">
              <span className={cn(
                "font-medium",
                RTL_LOCALES.includes(l.code) && "font-arabic"
              )}>
                {l.nativeName}
              </span>
              <span className="text-xs text-muted-foreground">{l.name}</span>
            </div>
            {l.code === locale && <Check className="w-4 h-4 text-foreground shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

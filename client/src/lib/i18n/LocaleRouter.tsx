import { createContext, useContext, useEffect, useMemo, ReactNode } from "react";
import { useLocation, useRoute } from "wouter";
import { SUPPORTED_LOCALES, RTL_LOCALES, type Locale } from "@shared/schema";
import { translations } from "./translations";

// Get all locale codes
const LOCALE_CODES = SUPPORTED_LOCALES.map((l) => l.code);

// Context for current locale
interface LocaleContextType {
  locale: Locale;
  t: (key: string) => string;
  isRTL: boolean;
  localePath: (path: string) => string;
  availableLocales: typeof SUPPORTED_LOCALES;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  t: (key) => key,
  isRTL: false,
  localePath: (path) => path,
  availableLocales: SUPPORTED_LOCALES,
});

export const useLocale = () => useContext(LocaleContext);

// Hook to get translation function
export const useTranslations = () => {
  const { t, locale } = useLocale();
  return { t, locale };
};

// Extract locale from path
export function extractLocaleFromPath(path: string): { locale: Locale; pathWithoutLocale: string } {
  const segments = path.split("/").filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();

  if (firstSegment && LOCALE_CODES.includes(firstSegment as Locale)) {
    return {
      locale: firstSegment as Locale,
      pathWithoutLocale: "/" + segments.slice(1).join("/") || "/",
    };
  }

  // Check localStorage for saved preference
  const savedLocale = localStorage.getItem("i18nextLng") as Locale | null;
  if (savedLocale && LOCALE_CODES.includes(savedLocale)) {
    return { locale: savedLocale, pathWithoutLocale: path };
  }

  return { locale: "en", pathWithoutLocale: path };
}

// Translation helper - supports nested keys like "nav.home"
function getTranslation(locale: Locale, key: string): string {
  const keys = key.split(".");
  let value: any = translations[locale] || translations.en;

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      // Fallback to English
      value = translations.en;
      for (const fallbackKey of keys) {
        value = value?.[fallbackKey];
        if (value === undefined) break;
      }
      break;
    }
  }

  return typeof value === "string" ? value : key;
}

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [location] = useLocation();

  const { locale, pathWithoutLocale } = useMemo(() =>
    extractLocaleFromPath(location),
    [location]
  );

  const isRTL = RTL_LOCALES.includes(locale);

  // Update document attributes when locale changes
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    localStorage.setItem("i18nextLng", locale);
  }, [locale, isRTL]);

  // Translation function
  const t = (key: string): string => getTranslation(locale, key);

  // Helper to create locale-prefixed paths
  const localePath = (path: string): string => {
    if (locale === "en") return path; // English is default, no prefix
    return `/${locale}${path}`;
  };

  const value: LocaleContextType = {
    locale,
    t,
    isRTL,
    localePath,
    availableLocales: SUPPORTED_LOCALES,
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

// Component to render routes for all locales
interface LocaleRoutesProps {
  children: ReactNode;
}

export function LocaleRoutes({ children }: LocaleRoutesProps) {
  return <>{children}</>;
}

// Hook to get the current path without locale prefix
export function usePathWithoutLocale(): string {
  const [location] = useLocation();
  const { pathWithoutLocale } = extractLocaleFromPath(location);
  return pathWithoutLocale;
}

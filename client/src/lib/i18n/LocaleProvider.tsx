import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { I18nextProvider } from "react-i18next";
import i18n, { isRTL, changeLanguage, getCurrentLocale } from "./config";
import { SUPPORTED_LOCALES, RTL_LOCALES, type Locale } from "@shared/schema";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  isRTL: boolean;
  localeInfo: (typeof SUPPORTED_LOCALES)[number] | undefined;
  availableLocales: typeof SUPPORTED_LOCALES;
  localePath: (path: string) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [location] = useLocation();
  const [locale, setLocaleState] = useState<Locale>(() => {
    // Try to get locale from URL first
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const urlLocale = pathParts[0] as Locale;
    if (SUPPORTED_LOCALES.some((l) => l.code === urlLocale)) {
      return urlLocale;
    }
    // Fall back to stored preference or browser detection
    const stored = localStorage.getItem("i18nextLng") as Locale;
    if (stored && SUPPORTED_LOCALES.some((l) => l.code === stored)) {
      return stored;
    }
    // Fall back to browser language
    const browserLang = navigator.language.split("-")[0] as Locale;
    if (SUPPORTED_LOCALES.some((l) => l.code === browserLang)) {
      return browserLang;
    }
    return "en";
  });

  const [currentIsRTL, setCurrentIsRTL] = useState(() => isRTL(locale));

  // CRITICAL: Sync i18n with initial locale on mount
  useEffect(() => {
    changeLanguage(locale);
  }, []);

  // Update locale from URL on location change
  useEffect(() => {
    const pathParts = location.split("/").filter(Boolean);
    const urlLocale = pathParts[0] as Locale;
    if (SUPPORTED_LOCALES.some((l) => l.code === urlLocale) && urlLocale !== locale) {
      handleSetLocale(urlLocale);
    }
  }, [location]);

  // Apply RTL/LTR on locale change
  useEffect(() => {
    const rtl = isRTL(locale);
    setCurrentIsRTL(rtl);
    document.documentElement.lang = locale;
    document.documentElement.dir = rtl ? "rtl" : "ltr";

    // Add RTL class for Tailwind
    if (rtl) {
      document.documentElement.classList.add("rtl");
    } else {
      document.documentElement.classList.remove("rtl");
    }
  }, [locale]);

  const handleSetLocale = async (newLocale: Locale) => {
    await changeLanguage(newLocale);
    setLocaleState(newLocale);
  };

  const localeInfo = SUPPORTED_LOCALES.find((l) => l.code === locale);

  const localePath = (path: string): string => {
    if (locale === "en") return path;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `/${locale}${cleanPath}`;
  };

  const value: LocaleContextType = {
    locale,
    setLocale: handleSetLocale,
    isRTL: currentIsRTL,
    localeInfo,
    availableLocales: SUPPORTED_LOCALES,
    localePath,
  };

  return (
    <LocaleContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LocaleContext.Provider>
  );
}

// Hook to get localized URL
export function useLocalizedUrl() {
  const { locale } = useLocale();

  const getLocalizedUrl = (path: string, targetLocale?: Locale) => {
    const loc = targetLocale || locale;
    // Remove any existing locale prefix
    const cleanPath = path.replace(/^\/(en|ar|hi|ru|zh|de|fr|es|it|pt|nl|pl|uk|ta|te|bn|mr|gu|ml|kn|pa|ur|si|ne|ja|ko|th|vi|id|ms|tl|zh-TW|fa|tr|he|kk|uz|az|cs|el|sv|no|da|fi|hu|ro|sw|am)\//, "/");
    return `/${loc}${cleanPath}`;
  };

  const getCurrentPathWithLocale = (targetLocale: Locale) => {
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split("/").filter(Boolean);

    // Check if current path has a locale prefix
    const hasLocalePrefix = SUPPORTED_LOCALES.some((l) => l.code === pathParts[0]);

    if (hasLocalePrefix) {
      pathParts[0] = targetLocale;
      return "/" + pathParts.join("/");
    }
    return `/${targetLocale}${currentPath}`;
  };

  return { getLocalizedUrl, getCurrentPathWithLocale };
}

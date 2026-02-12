import { useEffect, useState, useMemo, useCallback, ReactNode } from "react";
import { useLocation } from "wouter";
import { I18nextProvider } from "react-i18next";
import i18n, { isRTL, changeLanguage } from "./config";
import { SUPPORTED_LOCALES, type Locale } from "@shared/schema/locales";
import { getLocaleContext, useLocale, type LocaleContextType } from "./locale-context";

export { useLocale } from "./locale-context";

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: Readonly<LocaleProviderProps>) {
  const [location] = useLocation();
  const [locale, setLocale] = useState<Locale>(() => {
    // Try to get locale from URL first
    const urlLocale = globalThis.location.pathname.split("/").find(Boolean) as Locale;
    if (SUPPORTED_LOCALES.some(l => l.code === urlLocale)) {
      return urlLocale;
    }
    // Fall back to stored preference or browser detection
    const stored = localStorage.getItem("i18nextLng") as Locale;
    if (stored && SUPPORTED_LOCALES.some(l => l.code === stored)) {
      return stored;
    }
    // Fall back to browser language
    const browserLang = navigator.language.split("-")[0] as Locale;
    if (SUPPORTED_LOCALES.some(l => l.code === browserLang)) {
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
    const urlLocale = location.split("/").find(Boolean) as Locale;
    if (SUPPORTED_LOCALES.some(l => l.code === urlLocale) && urlLocale !== locale) {
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

  const handleSetLocale = useCallback(async (newLocale: Locale) => {
    await changeLanguage(newLocale);
    setLocale(newLocale);
  }, []);

  const localeInfo = SUPPORTED_LOCALES.find(l => l.code === locale);

  const localePath = useCallback(
    (path: string): string => {
      if (locale === "en") return path;
      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      return `/${locale}${cleanPath}`;
    },
    [locale]
  );

  const value: LocaleContextType = useMemo(
    () => ({
      locale,
      setLocale: handleSetLocale,
      isRTL: currentIsRTL,
      localeInfo,
      availableLocales: SUPPORTED_LOCALES,
      localePath,
    }),
    [locale, handleSetLocale, currentIsRTL, localeInfo, localePath]
  );

  const Context = getLocaleContext();
  return (
    <Context.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </Context.Provider>
  );
}

// Hook to get localized URL
// Build locale prefix pattern dynamically from supported locales
const LOCALE_PREFIX_PATTERN = new RegExp(
  String.raw`^\/(${SUPPORTED_LOCALES.map(l => l.code).join("|")})\/`
);

export function useLocalizedUrl() {
  const { locale } = useLocale();

  const getLocalizedUrl = (path: string, targetLocale?: Locale) => {
    const loc = targetLocale || locale;
    // Remove any existing locale prefix
    const cleanPath = path.replace(LOCALE_PREFIX_PATTERN, "/");
    return `/${loc}${cleanPath}`;
  };

  const getCurrentPathWithLocale = (targetLocale: Locale) => {
    const currentPath = globalThis.location.pathname;
    const pathParts = currentPath.split("/").filter(Boolean);

    // Check if current path has a locale prefix
    const hasLocalePrefix = SUPPORTED_LOCALES.some(l => l.code === pathParts[0]);

    if (hasLocalePrefix) {
      pathParts[0] = targetLocale;
      return "/" + pathParts.join("/");
    }
    return `/${targetLocale}${currentPath}`;
  };

  return { getLocalizedUrl, getCurrentPathWithLocale };
}

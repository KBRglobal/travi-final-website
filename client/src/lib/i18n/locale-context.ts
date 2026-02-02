/**
 * Locale Context - Separated from LocaleProvider to avoid circular dependencies
 * This module only contains the context and types, not the provider implementation
 * 
 * Uses lazy context creation to avoid circular dependency issues in production builds
 */
import { createContext, useContext, type Context } from "react";
import { SUPPORTED_LOCALES, type Locale } from "@shared/schema";

export interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  isRTL: boolean;
  localeInfo: (typeof SUPPORTED_LOCALES)[number] | undefined;
  availableLocales: typeof SUPPORTED_LOCALES;
  localePath: (path: string) => string;
}

// Lazy context creation to avoid module-level createContext call
// which can fail due to circular dependencies in production builds
let _localeContext: Context<LocaleContextType | undefined> | null = null;

export function getLocaleContext(): Context<LocaleContextType | undefined> {
  if (!_localeContext) {
    _localeContext = createContext<LocaleContextType | undefined>(undefined);
  }
  return _localeContext;
}

// For backwards compatibility - exports the context getter
export const LocaleContext = {
  get Provider() {
    return getLocaleContext().Provider;
  },
  get Consumer() {
    return getLocaleContext().Consumer;
  }
};

export function useLocale() {
  const context = useContext(getLocaleContext());
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

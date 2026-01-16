import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type CookieConsentType = "all" | "essential" | "pending";

interface CookiePreferences {
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsentContextType {
  consent: CookieConsentType;
  preferences: CookiePreferences;
  showBanner: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (prefs: CookiePreferences) => void;
  openSettings: () => void;
}

const COOKIE_CONSENT_KEY = "travi_cookie_consent";
const COOKIE_PREFS_KEY = "travi_cookie_prefs";
const GTM_ID = "GTM-WVXXVS6L";

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

declare global {
  interface Window {
    __gtm_loaded?: boolean;
  }
}

function loadGTM() {
  if (typeof window === "undefined") return;
  if (window.__gtm_loaded) return;
  
  window.__gtm_loaded = true;
  
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  
  const f = document.getElementsByTagName("script")[0];
  const j = document.createElement("script");
  j.async = true;
  j.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  f.parentNode?.insertBefore(j, f);
  
  const noscript = document.createElement("noscript");
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${GTM_ID}`;
  iframe.height = "0";
  iframe.width = "0";
  iframe.style.display = "none";
  iframe.style.visibility = "hidden";
  noscript.appendChild(iframe);
  document.body.insertBefore(noscript, document.body.firstChild);
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentType>("pending");
  const [preferences, setPreferences] = useState<CookiePreferences>({
    analytics: false,
    marketing: false,
  });
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY) as CookieConsentType | null;
    const savedPrefs = localStorage.getItem(COOKIE_PREFS_KEY);

    if (savedConsent && savedConsent !== "pending") {
      setConsent(savedConsent);
      if (savedPrefs) {
        const parsedPrefs = JSON.parse(savedPrefs) as CookiePreferences;
        setPreferences(parsedPrefs);
        // Only load GTM if analytics is explicitly enabled
        if (parsedPrefs.analytics) {
          loadGTM();
        }
      }
    } else {
      setShowBanner(true);
    }
  }, []);

  const acceptAll = useCallback(() => {
    const prefs = { analytics: true, marketing: true };
    setConsent("all");
    setPreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);
    localStorage.setItem(COOKIE_CONSENT_KEY, "all");
    localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify(prefs));
    loadGTM();
  }, []);

  const rejectNonEssential = useCallback(() => {
    const prefs = { analytics: false, marketing: false };
    setConsent("essential");
    setPreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);
    localStorage.setItem(COOKIE_CONSENT_KEY, "essential");
    localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify(prefs));
  }, []);

  const savePreferences = useCallback((prefs: CookiePreferences) => {
    setPreferences(prefs);
    setConsent(prefs.analytics || prefs.marketing ? "all" : "essential");
    setShowBanner(false);
    setShowSettings(false);
    localStorage.setItem(COOKIE_CONSENT_KEY, prefs.analytics || prefs.marketing ? "all" : "essential");
    localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify(prefs));
    if (prefs.analytics) {
      loadGTM();
    }
  }, []);

  const openSettings = useCallback(() => {
    setShowSettings(true);
    setShowBanner(true);
  }, []);

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        preferences,
        showBanner: showBanner || showSettings,
        acceptAll,
        rejectNonEssential,
        savePreferences,
        openSettings,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error("useCookieConsent must be used within a CookieConsentProvider");
  }
  return context;
}

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useCookieConsent } from "@/contexts/cookie-consent-context";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X, Cookie, Settings, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function CookieConsentBanner() {
  const { t } = useTranslation();
  const { showBanner, acceptAll, rejectNonEssential, savePreferences, preferences } =
    useCookieConsent();
  const [showManage, setShowManage] = useState(false);
  const [localPrefs, setLocalPrefs] = useState({
    analytics: preferences.analytics,
    marketing: preferences.marketing,
  });
  const dialogRef = useRef<HTMLDivElement>(null);

  // Sync local preferences with context preferences when banner opens or preferences change
  useEffect(() => {
    if (showBanner) {
      setLocalPrefs({
        analytics: preferences.analytics,
        marketing: preferences.marketing,
      });
    }
  }, [showBanner, preferences.analytics, preferences.marketing]);

  // Move focus into the dialog when it appears
  useEffect(() => {
    if (showBanner && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [showBanner]);

  // Trap focus within the dialog using keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !dialogRef.current) return;

    const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pointer-events-none"
        data-testid="cookie-banner"
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-label={t("cookies.title")}
          aria-describedby="cookie-consent-description"
          aria-modal="false"
          aria-live="polite"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="max-w-2xl mx-auto bg-card border shadow-lg rounded-lg pointer-events-auto"
        >
          {!showManage ? (
            <div className="p-4 sm:p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Cookie className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{t("cookies.title")}</h3>
                  <p id="cookie-consent-description" className="text-sm text-muted-foreground">
                    {t("cookies.description")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManage(true)}
                  className="gap-1"
                  data-testid="button-manage-cookies"
                >
                  <Settings className="w-4 h-4" aria-hidden="true" />
                  {t("cookies.manage")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={rejectNonEssential}
                  data-testid="button-reject-cookies"
                >
                  {t("cookies.rejectAll")}
                </Button>
                <Button size="sm" onClick={acceptAll} data-testid="button-accept-cookies">
                  {t("cookies.acceptAll")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
                  <h3 className="font-semibold text-lg">{t("cookies.preferencesTitle")}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowManage(false)}
                  data-testid="button-close-manage"
                  aria-label={t("common.close")}
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div>
                    <Label className="font-medium">{t("cookies.essential.title")}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("cookies.essential.description")}
                    </p>
                  </div>
                  <Switch checked disabled data-testid="switch-essential" />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div>
                    <Label htmlFor="analytics" className="font-medium">
                      {t("cookies.analytics.title")}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("cookies.analytics.description")}
                    </p>
                  </div>
                  <Switch
                    id="analytics"
                    checked={localPrefs.analytics}
                    onCheckedChange={checked =>
                      setLocalPrefs({ ...localPrefs, analytics: checked })
                    }
                    data-testid="switch-analytics"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div>
                    <Label htmlFor="marketing" className="font-medium">
                      {t("cookies.marketing.title")}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("cookies.marketing.description")}
                    </p>
                  </div>
                  <Switch
                    id="marketing"
                    checked={localPrefs.marketing}
                    onCheckedChange={checked =>
                      setLocalPrefs({ ...localPrefs, marketing: checked })
                    }
                    data-testid="switch-marketing"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowManage(false)}>
                  {t("common.back")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => savePreferences(localPrefs)}
                  data-testid="button-save-preferences"
                >
                  {t("cookies.savePreferences")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

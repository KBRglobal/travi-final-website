import { useState, useEffect } from "react";
import { useCookieConsent } from "@/contexts/cookie-consent-context";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X, Cookie, Settings, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function CookieConsentBanner() {
  const { showBanner, acceptAll, rejectNonEssential, savePreferences, preferences } = useCookieConsent();
  const [showManage, setShowManage] = useState(false);
  const [localPrefs, setLocalPrefs] = useState({
    analytics: preferences.analytics,
    marketing: preferences.marketing,
  });

  // Sync local preferences with context preferences when banner opens or preferences change
  useEffect(() => {
    if (showBanner) {
      setLocalPrefs({
        analytics: preferences.analytics,
        marketing: preferences.marketing,
      });
    }
  }, [showBanner, preferences.analytics, preferences.marketing]);

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
        <div className="max-w-2xl mx-auto bg-card border shadow-lg rounded-lg pointer-events-auto">
          {!showManage ? (
            <div className="p-4 sm:p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Cookie className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">We value your privacy</h3>
                  <p className="text-sm text-muted-foreground">
                    We use cookies to enhance your browsing experience, analyze site traffic, and personalize contents. 
                    By clicking "Accept All", you consent to our use of cookies.
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
                  <Settings className="w-4 h-4" />
                  Manage
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={rejectNonEssential}
                  data-testid="button-reject-cookies"
                >
                  Reject All
                </Button>
                <Button
                  size="sm"
                  onClick={acceptAll}
                  data-testid="button-accept-cookies"
                >
                  Accept All
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg">Cookie Preferences</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowManage(false)}
                  data-testid="button-close-manage"
                  aria-label="Close cookie preferences"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div>
                    <Label className="font-medium">Essential Cookies</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Required for the website to function properly
                    </p>
                  </div>
                  <Switch checked disabled data-testid="switch-essential" />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div>
                    <Label htmlFor="analytics" className="font-medium">Analytics Cookies</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Help us understand how visitors interact with our website
                    </p>
                  </div>
                  <Switch
                    id="analytics"
                    checked={localPrefs.analytics}
                    onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, analytics: checked })}
                    data-testid="switch-analytics"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div>
                    <Label htmlFor="marketing" className="font-medium">Marketing Cookies</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Used to deliver personalized advertisements
                    </p>
                  </div>
                  <Switch
                    id="marketing"
                    checked={localPrefs.marketing}
                    onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, marketing: checked })}
                    data-testid="switch-marketing"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManage(false)}
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={() => savePreferences(localPrefs)}
                  data-testid="button-save-preferences"
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

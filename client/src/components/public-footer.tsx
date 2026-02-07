import { Link } from "wouter";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useCookieConsent } from "@/contexts/cookie-consent-context";
import { useTranslation } from "react-i18next";

export function PublicFooter() {
  const { localePath, isRTL } = useLocale();
  const { openSettings: openCookieSettings } = useCookieConsent();
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const exploreLinks = [
    { key: "nav.destinations", href: "/destinations" },
    { key: "nav.attractions", href: "/attractions" },
  ];

  const travelLinks = [
    { key: "footer.allGuides", href: "/guides" },
    { key: "nav.news", href: "/news" },
  ];

  const companyLinks = [
    { key: "footer.aboutUs", href: "/about" },
    { key: "footer.contactUs", href: "/contact" },
    { key: "footer.termsOfService", href: "/terms" },
    { key: "footer.privacyPolicy", href: "/privacy" },
    { key: "footer.cookies", href: "/cookies" },
    { key: "footer.security", href: "/security" },
  ];

  return (
    <footer
      className="bg-white dark:bg-slate-950"
      dir={isRTL ? "rtl" : "ltr"}
      data-testid="footer"
      role="contentinfo"
      aria-label={t("footer.ariaLabel")}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
          <div className="lg:col-span-1">
            <h2 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-foreground leading-tight font-chillax">
              {t("footer.tagline")}
            </h2>
            <p className="mt-6 text-base text-muted-foreground leading-relaxed max-w-sm">
              {t("footer.aboutText")}
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-12">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-5 tracking-normal">
                  {t("footer.explore")}
                </h3>
                <ul className="space-y-3">
                  {exploreLinks.map(link => (
                    <li key={link.href}>
                      <Link
                        href={localePath(link.href)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 inline-flex items-center min-h-[44px]"
                        data-testid={`link-footer-${link.href.replace("/", "")}`}
                      >
                        {t(link.key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-5 tracking-normal">
                  {t("footer.travel")}
                </h3>
                <ul className="space-y-3">
                  {travelLinks.map(link => (
                    <li key={link.href}>
                      <Link
                        href={localePath(link.href)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 inline-flex items-center min-h-[44px]"
                        data-testid={`link-footer-${link.href.replace("/", "")}`}
                      >
                        {t(link.key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-5 tracking-normal">
                  {t("footer.company")}
                </h3>
                <ul className="space-y-3">
                  {companyLinks.map(link => (
                    <li key={link.href}>
                      <Link
                        href={localePath(link.href)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 inline-flex items-center min-h-[44px]"
                        data-testid={`link-footer-${link.href.replace("/", "")}`}
                      >
                        {t(link.key)}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <button
                      onClick={openCookieSettings}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer text-start inline-flex items-center min-h-[44px]"
                      data-testid="button-cookie-settings"
                    >
                      {t("footer.cookieSettings")}
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/20 dark:border-border/30 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>{t("footer.copyright", { year: currentYear, brand: "TRAVI" })}</span>
            <a
              href="mailto:info@travi.world"
              className="hover:text-foreground transition-colors duration-200"
              data-testid="link-footer-email"
              aria-label={t("footer.emailAriaLabel")}
            >
              info@travi.world
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

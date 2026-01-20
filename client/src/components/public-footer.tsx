import { Link } from "wouter";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { useCookieConsent } from "@/contexts/cookie-consent-context";

export function PublicFooter() {
  const { localePath, isRTL } = useLocale();
  const { openSettings: openCookieSettings } = useCookieConsent();
  const currentYear = new Date().getFullYear();

  const exploreLinks = [
    { label: "Destinations", href: "/destinations" },
    { label: "Attractions", href: "/attractions" },
  ];

  const travelLinks = [
    { label: "All Guides", href: "/guides" },
    { label: "News", href: "/news" },
  ];

  const companyLinks = [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
    { label: "Cookies", href: "/cookies" },
    { label: "Security", href: "/security" },
  ];

  return (
    <footer 
      className="bg-white dark:bg-slate-950" 
      dir={isRTL ? "rtl" : "ltr"} 
      data-testid="footer" 
      role="contentinfo" 
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
          
          <div className="lg:col-span-1">
            <h2 
              className="text-2xl sm:text-3xl lg:text-3xl font-bold text-foreground leading-tight"
              style={{ fontFamily: "'Chillax', var(--font-sans)", fontWeight: 700, lineHeight: 1.2 }}
            >Your Trusted Travel Resource</h2>
            <p className="mt-6 text-base text-muted-foreground leading-relaxed max-w-sm">
              Comprehensive travel information for 16 destinations worldwide.
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-12">
              
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-5 tracking-normal">
                  Explore
                </h3>
                <ul className="space-y-3" role="list">
                  {exploreLinks.map((link) => (
                    <li key={link.href}>
                      <Link 
                        href={localePath(link.href)} 
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                        data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-5 tracking-normal">
                  Travel
                </h3>
                <ul className="space-y-3" role="list">
                  {travelLinks.map((link) => (
                    <li key={link.href}>
                      <Link 
                        href={localePath(link.href)} 
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                        data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-5 tracking-normal">
                  Company
                </h3>
                <ul className="space-y-3" role="list">
                  {companyLinks.map((link) => (
                    <li key={link.href}>
                      <Link 
                        href={localePath(link.href)} 
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                        data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <button
                      onClick={openCookieSettings}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer text-left"
                      data-testid="button-cookie-settings"
                    >
                      Cookie Settings
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
            <span>© {currentYear} TRAVI. All rights reserved.</span>
            <a 
              href="mailto:info@travi.world" 
              className="hover:text-foreground transition-colors duration-200"
              data-testid="link-footer-email"
            >
              info@travi.world
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

import { Link } from "wouter";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { useQuery } from "@tanstack/react-query";
import { useCookieConsent } from "@/contexts/cookie-consent-context";

interface Destination {
  id: number;
  name: string;
  slug: string;
  country?: string;
  status?: string;
}

export function PublicFooter() {
  const { localePath, locale, isRTL } = useLocale();
  const { openSettings: openCookieSettings } = useCookieConsent();
  const currentYear = new Date().getFullYear();

  const { data: destinations } = useQuery<Destination[]>({
    queryKey: ['/api/public/destinations'],
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  // Explore / Destinations column
  const exploreLinks = [
    { label: "Destinations", href: "/destinations" },
    { label: "Hotels", href: "/hotels" },
    { label: "Attractions", href: "/attractions" },
    { label: "Restaurants", href: "/dining" },
    { label: "News", href: "/news" },
  ];

  // All legal links - exactly as required
  const legalLinks = [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "Security Policy", href: "/security" },
  ];

  const dubaiDestination = destinations?.find(
    d => (d.status === 'published' || !d.status) && (d.slug === 'dubai' || d.slug?.includes('dubai') || d.name.toLowerCase().includes('dubai'))
  );

  return (
    <footer 
      className="bg-white dark:bg-slate-950" 
      dir={isRTL ? "rtl" : "ltr"} 
      data-testid="footer" 
      role="contentinfo" 
      aria-label="Site footer"
    >
      {/* MAIN FOOTER - Editorial Layout */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
          
          {/* LEFT: EDITORIAL STATEMENT */}
          <div className="lg:col-span-1">
            <h2 
              className="text-2xl sm:text-3xl lg:text-3xl font-bold text-foreground leading-tight"
              style={{ fontFamily: "'Chillax', var(--font-sans)", fontWeight: 700, lineHeight: 1.2 }}
            >Your Trusted Travel Resource</h2>
            <p className="mt-6 text-base text-muted-foreground leading-relaxed max-w-sm">
              Comprehensive travel information for 16 destinations worldwide.
            </p>
          </div>

          {/* RIGHT: 3 COLUMNS */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-12">
              
              {/* COLUMN 1: EXPLORE */}
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

              {/* COLUMN 2: GUIDES / CONTENT */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-5 tracking-normal">
                  Guides
                </h3>
                <ul className="space-y-3" role="list">
                  {dubaiDestination && (
                    <li>
                      <Link 
                        href={localePath(`/destinations/${dubaiDestination.slug}`)} 
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                        data-testid={`link-footer-guide-${dubaiDestination.slug}`}
                      >
                        {dubaiDestination.name} Travel Guide
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link 
                      href={localePath("/guides")} 
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                      data-testid="link-footer-all-guides"
                    >
                      All Guides
                    </Link>
                  </li>
                </ul>
              </div>

              {/* COLUMN 3: COMPANY / LEGAL */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-5 tracking-normal">
                  Company
                </h3>
                <ul className="space-y-3" role="list">
                  {legalLinks.map((link) => (
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
      {/* BOTTOM BAR - Minimal Legal Footer */}
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

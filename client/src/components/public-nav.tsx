import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu,
  X,
  Search,
  MapPin,
  Camera,
  Building2,
  Utensils,
  Sparkles,
  Compass,
  ShoppingBag,
  LucideIcon,
  Circle,
  Newspaper,
  Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const traviLogo = "/logos/Logotype_for_Dark_Background.svg";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SiTiktok } from "react-icons/si";
import { LanguageSwitcher } from "@/components/language-switcher";

// Navigation items - translation keys for i18next
const NAV_ITEMS = [
  { key: "nav.destinations", href: "/destinations" },
  { key: "nav.attractions", href: "/attractions" },
  { key: "nav.guides", href: "/guides" },
  { key: "nav.news", href: "/news" },
];

const iconMap: Record<string, LucideIcon> = {
  Camera,
  Building2,
  MapPin,
  Utensils,
  ShoppingBag,
  Compass,
  Sparkles,
  Menu,
  Search,
  Newspaper,
};

function getIcon(iconName?: string | null): LucideIcon {
  if (!iconName) return Circle;
  return iconMap[iconName] || Circle;
}

interface NavItem {
  id: string;
  label: string;
  labelHe?: string | null;
  href: string;
  icon?: string | null;
  isHighlighted?: boolean;
  highlightStyle?: string | null;
  sortOrder: number;
}

interface NavMenu {
  items: NavItem[];
}

// Fallback nav links with translation keys
const fallbackNavLinks = [
  { href: "/attractions", key: "nav.attractions", icon: "Camera" },
  { href: "/districts", key: "nav.districts", icon: "MapPin" },
  { href: "/shopping", key: "nav.shopping", icon: "ShoppingBag" },
  { href: "/news", key: "nav.news", icon: "Newspaper" },
];

interface PublicNavProps {
  className?: string;
  variant?: "default" | "transparent";
  transparentTone?: "light" | "dark";
  hideOnMobile?: boolean;
  onMobileMenuToggle?: (isOpen: boolean) => void;
  externalMobileMenuOpen?: boolean;
}

export function PublicNav({
  className = "",
  variant = "default",
  transparentTone = "dark",
  hideOnMobile = false,
  onMobileMenuToggle,
  externalMobileMenuOpen,
}: PublicNavProps) {
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);

  const mobileMenuOpen =
    externalMobileMenuOpen !== undefined ? externalMobileMenuOpen : internalMobileMenuOpen;
  const setMobileMenuOpen = (value: boolean) => {
    setInternalMobileMenuOpen(value);
    onMobileMenuToggle?.(value);
  };
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();
  const { localePath, isRTL, locale } = useLocale();
  const { t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isTransparent = variant === "transparent";
  const normalizedLocation = location.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
  const isActive = (href: string) =>
    normalizedLocation === href || normalizedLocation.startsWith(href + "/");

  return (
    <header className={className} role="banner">
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          hideOnMobile ? "hidden lg:block" : ""
        } ${
          scrolled
            ? "backdrop-blur-xl shadow-lg shadow-black/20"
            : isTransparent
              ? "bg-transparent"
              : ""
        }`}
        style={{
          background: scrolled
            ? "hsla(var(--travi-purple) / 0.95)"
            : isTransparent
              ? "transparent"
              : "hsl(var(--travi-purple))",
        }}
        data-testid="nav-header"
        aria-label={t("nav.mainNavigation")}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href={localePath("/")} data-testid="link-header-logo">
              <img src={traviLogo} alt={t("nav.logoAlt")} className="h-8 md:h-10" />
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map(item => {
                const active = isActive(item.href);
                const label = t(item.key);
                return (
                  <Link
                    key={item.href}
                    href={localePath(item.href)}
                    className={`px-4 py-2 min-h-[44px] inline-flex items-center text-sm font-medium rounded-full transition-all ${
                      active
                        ? "text-white bg-white/20"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                    data-testid={`link-nav-${item.href.replace("/", "")}`}
                    aria-current={active ? "page" : undefined}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <LanguageSwitcher className="hidden sm:flex" />
              <LanguageSwitcher variant="compact" className="sm:hidden" />

              <div className="hidden md:flex items-center gap-3">
                <a
                  href="https://www.instagram.com/travi_world"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-white/70 hover:text-[#E4405F] transition-colors rounded-full"
                  data-testid="link-social-instagram"
                  aria-label={t("nav.followInstagram")}
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="https://www.tiktok.com/@travi.world"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-white/70 hover:text-white transition-colors rounded-full"
                  data-testid="link-social-tiktok"
                  aria-label={t("nav.followTikTok")}
                >
                  <SiTiktok className="w-4 h-4" />
                </a>
              </div>

              {/* Mobile Menu - Simple Sheet matching homepage */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden rounded-full text-white/70 hover:text-white hover:bg-white/10"
                    data-testid="button-mobile-menu"
                    aria-label={t("nav.openMenu")}
                  >
                    <Menu className="w-5 h-5" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side={isRTL ? "left" : "right"}
                  className="w-[300px] sm:w-[350px] border-0"
                  style={{
                    background: "hsl(var(--travi-purple))",
                  }}
                >
                  <SheetHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/10">
                    <SheetTitle>
                      <img src={traviLogo} alt={t("nav.logoAlt")} className="h-8" />
                    </SheetTitle>
                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                        data-testid="button-mobile-menu-close"
                        aria-label={t("nav.closeMenu")}
                      >
                        <X className="w-5 h-5" aria-hidden="true" />
                        <span className="sr-only">{t("nav.closeMenu")}</span>
                      </Button>
                    </SheetClose>
                  </SheetHeader>
                  <div className="mt-6 space-y-1">
                    {NAV_ITEMS.map(item => {
                      const active = isActive(item.href);
                      const label = t(item.key);
                      return (
                        <Link
                          key={item.href}
                          href={localePath(item.href)}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center py-3 px-4 rounded-xl text-base font-medium transition-colors ${
                            active
                              ? "text-white bg-white/15"
                              : "text-white/70 hover:text-white hover:bg-white/10"
                          }`}
                          data-testid={`link-mobile-${item.href.replace("/", "")}`}
                          aria-current={active ? "page" : undefined}
                        >
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

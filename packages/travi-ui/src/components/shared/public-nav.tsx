import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Search, ChevronDown, MapPin, Camera, Building2, Utensils, Sparkles, Compass, ShoppingBag, LucideIcon, Circle, Newspaper, Instagram } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { SiTiktok } from "react-icons/si";
import traviLogo from "@assets/Logotype_for_Dark_Background_1765497703861.png";

// Navigation items - used for both desktop and mobile, matching homepage design
const NAV_ITEMS = [
  { label: "Destinations", labelHe: "יעדים", href: "/destinations" },
  { label: "Hotels", labelHe: "מלונות", href: "/hotels" },
  { label: "Attractions", labelHe: "אטרקציות", href: "/attractions" },
  { label: "Dining", labelHe: "מסעדות", href: "/dining" },
  { label: "Things to Do", labelHe: "מה לעשות", href: "/things-to-do" },
  { label: "Guides", labelHe: "מדריכים", href: "/guides" },
  { label: "News", labelHe: "חדשות", href: "/news" },
  { label: "Test", labelHe: "בדיקה", href: "/test" },
];

const iconMap: Record<string, LucideIcon> = {
  Camera, Building2, MapPin, Utensils, ShoppingBag, Compass, Sparkles, Menu, Search, Newspaper
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

const fallbackNavLinks = [
  { href: "/attractions", label: "Attractions", labelHe: "אטרקציות", icon: "Camera" },
  { href: "/hotels", label: "Hotels", labelHe: "מלונות", icon: "Building2" },
  { href: "/districts", label: "Districts", labelHe: "שכונות", icon: "MapPin" },
  { href: "/dining", label: "Restaurants", labelHe: "מסעדות", icon: "Utensils" },
  { href: "/shopping", label: "Shopping", labelHe: "קניות", icon: "ShoppingBag" },
  { href: "/news", label: "News", labelHe: "חדשות", icon: "Newspaper" },
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
  externalMobileMenuOpen
}: PublicNavProps) {
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  
  const mobileMenuOpen = externalMobileMenuOpen !== undefined ? externalMobileMenuOpen : internalMobileMenuOpen;
  const setMobileMenuOpen = (value: boolean) => {
    setInternalMobileMenuOpen(value);
    onMobileMenuToggle?.(value);
  };
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();
  const { localePath, isRTL, locale } = useLocale();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getLabel = (item: { label: string; labelHe?: string | null }) => {
    if (locale === 'he' && item.labelHe) return item.labelHe;
    return item.label;
  };

  const isTransparent = variant === "transparent";
  const normalizedLocation = location.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  const isActive = (href: string) => normalizedLocation === href || normalizedLocation.startsWith(href + '/');

  return (
    <header className={className}>
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
            ? 'rgba(100, 67, 244, 0.95)'
            : isTransparent 
              ? 'transparent'
              : '#6443F4'
        }}
        data-testid="nav-header" 
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href={localePath("/")} data-testid="link-header-logo">
              <img 
                src={traviLogo} 
                alt="TRAVI - Travel Guide" 
                className="h-8 md:h-10"
              />
            </Link>

            <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={localePath(item.href)}
                  className="px-4 py-2 text-sm font-medium rounded-full transition-all text-white/70 hover:text-white hover:bg-white/10"
                  data-testid={`link-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {getLabel(item)}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <a 
                  href="https://www.instagram.com/travi_world" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-[#E4405F] transition-colors"
                  data-testid="link-social-instagram"
                  aria-label="Follow TRAVI on Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a 
                  href="https://www.tiktok.com/@travi.world" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-white transition-colors"
                  data-testid="link-social-tiktok"
                  aria-label="Follow TRAVI on TikTok"
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
                    aria-label="Open mobile menu"
                  >
                    <Menu className="w-5 h-5" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side={isRTL ? "left" : "right"}
                  className="w-[300px] sm:w-[350px] border-0"
                  style={{
                    background: '#6443F4'
                  }}
                >
                  <SheetHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/10">
                    <SheetTitle>
                      <img src={traviLogo} alt="TRAVI" className="h-8" />
                    </SheetTitle>
                    <SheetClose asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-full" 
                        data-testid="button-mobile-menu-close" 
                        aria-label="Close menu"
                      >
                        <X className="w-5 h-5" aria-hidden="true" />
                        <span className="sr-only">Close menu</span>
                      </Button>
                    </SheetClose>
                  </SheetHeader>
                  <div className="mt-6 space-y-1">
                    {NAV_ITEMS.map((item) => (
                      <Link 
                        key={item.href}
                        href={localePath(item.href)}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center py-3 px-4 rounded-xl text-base font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                        data-testid={`link-mobile-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {getLabel(item)}
                      </Link>
                    ))}
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

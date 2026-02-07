import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Instagram, Menu, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { SiTiktok } from "react-icons/si";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { NAV_ITEMS } from "./homepage-data";

export function HomepageHeader({ isScrolled }: Readonly<{ isScrolled: boolean }>) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "bg-[#6443F4] shadow-lg" : "bg-[#6443F4]"
      )}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Logo variant="dark-bg" height={40} linkTo="/" />

          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                title={item.title}
                className="px-4 py-2 text-sm font-medium rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3">
              <a
                href="https://www.instagram.com/travi_world"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-[#E4405F] hover:bg-white/20 transition-all"
                aria-label="Follow TRAVI on Instagram"
                title="Follow TRAVI World on Instagram"
              >
                <Instagram className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href="https://www.tiktok.com/@travi.world"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all"
                aria-label="Follow TRAVI on TikTok"
                title="Follow TRAVI World on TikTok"
              >
                <SiTiktok className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden rounded-full text-white/70 hover:text-white hover:bg-white/10"
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] border-0 bg-[#6443F4]">
                <SheetHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/10">
                  <SheetTitle>
                    <Logo variant="dark-bg" height={40} linkTo={null} />
                  </SheetTitle>
                  <SheetClose asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                      aria-label="Close menu"
                    >
                      <X className="w-5 h-5" aria-hidden="true" />
                    </Button>
                  </SheetClose>
                </SheetHeader>
                <nav className="mt-6 space-y-1" aria-label="Mobile navigation">
                  {NAV_ITEMS.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center py-3 px-4 rounded-xl text-base font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                      title={item.title}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

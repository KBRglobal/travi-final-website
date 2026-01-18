/**
 * DestinationNav Component - Sticky Navigation for Destination Pages
 * Provides contextual navigation with back button and section anchors.
 * Glassmorphism design matching hero CTA style.
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Hotel, Newspaper, Calendar, Car, HelpCircle, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DestinationNavProps {
  destinationName: string;
  destinationSlug: string;
}

// TODO: Re-enable hotels tab after hotel content is added to CMS
const NAV_SECTIONS = [
  { id: "attractions", label: "Attractions", icon: MapPin },
  // { id: "hotels", label: "Stay", icon: Hotel }, // DISABLED - no hotel content in CMS yet
  { id: "news", label: "News", icon: Newspaper },
  { id: "best-time", label: "When to Go", icon: Calendar },
  { id: "getting-around", label: "Getting Around", icon: Car },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

export function DestinationNav({ destinationName, destinationSlug }: DestinationNavProps) {
  const [activeSection, setActiveSection] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Intersection Observer for active section highlighting
    const observers: IntersectionObserver[] = [];
    
    NAV_SECTIONS.forEach(section => {
      const element = document.getElementById(section.id);
      if (element) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setActiveSection(section.id);
            }
          },
          { rootMargin: "-50% 0px -50% 0px" }
        );
        observer.observe(element);
        observers.push(observer);
      }
    });

    return () => observers.forEach(obs => obs.disconnect());
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      data-testid="destination-nav"
    >
      <div 
        className="mx-4 mt-4 rounded-2xl"
        style={{
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Back Button + Destination Name */}
            <div className="flex items-center gap-3">
              <Link href="/destinations">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="rounded-full hover:bg-slate-100"
                  data-testid="button-back-to-destinations"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <span className="font-semibold text-slate-800 hidden sm:block">
                {destinationName}
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_SECTIONS.map(section => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-full transition-colors",
                    activeSection === section.id
                      ? "bg-slate-800 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                  data-testid={`nav-link-${section.id}`}
                >
                  {section.label}
                </button>
              ))}
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden pt-3 pb-2 border-t border-slate-200 mt-3"
            >
              <div className="flex flex-wrap gap-2">
                {NAV_SECTIONS.map(section => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-full transition-colors",
                        activeSection === section.id
                          ? "bg-slate-800 text-white"
                          : "bg-slate-100 text-slate-600"
                      )}
                      data-testid={`nav-link-mobile-${section.id}`}
                    >
                      <Icon className="w-4 h-4" />
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </nav>
  );
}

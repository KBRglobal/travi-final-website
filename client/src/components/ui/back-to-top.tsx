import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface BackToTopProps {
  threshold?: number;
  className?: string;
}

export function BackToTop({ threshold = 400, className }: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > threshold);
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        "fixed bottom-6 right-6 z-50 rounded-full shadow-lg transition-all duration-300",
        "bg-primary hover:bg-primary/90 text-primary-foreground",
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none",
        className
      )}
      aria-label="Back to top"
    >
      <ArrowUp className="w-5 h-5" />
    </Button>
  );
}

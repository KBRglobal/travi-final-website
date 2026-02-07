import { cn } from "@/lib/utils";

interface SkipLinkProps {
  href?: string;
  className?: string;
  isRTL?: boolean;
}

export function SkipLink({
  href = "#main-content",
  className,
  isRTL = false,
}: Readonly<SkipLinkProps>) {
  const text = "Skip to main content";

  return (
    <a
      href={href}
      className={cn(
        "skip-link",
        "sr-only focus:not-sr-only",
        "focus:fixed focus:top-4 focus:z-[9999]",
        isRTL ? "focus:right-4" : "focus:left-4",
        "focus:px-4 focus:py-2",
        "focus:bg-primary focus:text-primary-foreground",
        "focus:rounded-md focus:shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "font-medium text-sm",
        "transition-all",
        className
      )}
      data-testid="link-skip-to-contents"
    >
      {text}
    </a>
  );
}

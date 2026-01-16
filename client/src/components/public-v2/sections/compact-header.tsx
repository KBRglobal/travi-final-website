import type { ReactNode } from "react";

interface CompactHeaderProps {
  title: ReactNode | null;
}

export function CompactHeader({ title }: CompactHeaderProps) {
  return (
    <section 
      className="border-b border-border/40 bg-gradient-to-b from-muted/30 to-background"
      data-testid="section-compact-header"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <h1 
          className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          {title}
        </h1>
      </div>
    </section>
  );
}

import type { ReactNode } from "react";

interface FilterBarProps {
  filters: ReactNode | null;
  onFilterChange: () => void;
}

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  return (
    <section 
      className="sticky top-16 md:top-20 z-40 bg-background/95 backdrop-blur-sm border-b border-border/40"
      data-testid="section-filter-bar"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-3 md:py-4">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {filters}
        </div>
      </div>
    </section>
  );
}

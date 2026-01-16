import type { ReactNode } from "react";

interface RelatedItemsProps {
  items: ReactNode | null;
}

export function RelatedItems({ items }: RelatedItemsProps) {
  if (!items) {
    return null;
  }

  return (
    <section 
      className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14 border-t border-border/40"
      data-testid="section-related-items"
    >
      <h2 
        className="text-xl sm:text-2xl md:text-3xl font-bold mb-8 md:mb-10 tracking-tight"
        style={{ fontFamily: "'Chillax', var(--font-sans)" }}
      >
        {null}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {items}
      </div>
    </section>
  );
}

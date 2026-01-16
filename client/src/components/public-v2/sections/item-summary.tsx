import type { ReactNode } from "react";

interface ItemSummaryProps {
  summarySlot: ReactNode | null;
}

export function ItemSummary({ summarySlot }: ItemSummaryProps) {
  if (!summarySlot) {
    return null;
  }

  return (
    <section 
      className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12"
      data-testid="section-item-summary"
    >
      <div className="max-w-4xl">
        <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight">
          {summarySlot}
        </div>
      </div>
    </section>
  );
}

import type { ReactNode } from "react";

interface AreaGroupingProps {
  areas: ReactNode | null;
  itemsByArea: ReactNode | null;
}

export function AreaGrouping({ areas, itemsByArea }: AreaGroupingProps) {
  if (!areas) {
    return null;
  }

  return (
    <section 
      className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14"
      data-testid="section-area-grouping"
    >
      <div className="space-y-10 md:space-y-14">
        {itemsByArea}
      </div>
    </section>
  );
}

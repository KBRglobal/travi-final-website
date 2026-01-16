import type { ReactNode } from "react";

type DestinationCardType = "country" | "city" | "area";

interface DestinationGridProps {
  destinations: ReactNode | null;
  cardType: DestinationCardType;
}

export function DestinationGrid({ destinations, cardType }: DestinationGridProps) {
  if (!destinations) {
    return null;
  }

  return (
    <section 
      className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14 lg:py-16"
      data-testid={`section-destination-grid-${cardType}`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {destinations}
      </div>
    </section>
  );
}

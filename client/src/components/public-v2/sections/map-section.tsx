import type { ReactNode } from "react";

interface MapSectionProps {
  location: { lat: number; lng: number } | null;
  address: ReactNode | null;
}

export function MapSection({ location, address }: MapSectionProps) {
  return (
    <section 
      className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12"
      data-testid="section-map"
    >
      <div className="aspect-[16/9] md:aspect-[21/9] bg-muted rounded-xl overflow-hidden shadow-sm mb-4 md:mb-6">
        {null}
      </div>
      {address && (
        <div className="text-sm md:text-base text-muted-foreground">
          {address}
        </div>
      )}
    </section>
  );
}

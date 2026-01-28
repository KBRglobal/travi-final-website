import type { ReactNode } from "react";

interface HeroSectionProps {
  imageSlot: ReactNode | null;
  title: ReactNode | null;
  subtitle?: ReactNode | null;
}

export function HeroSection({ imageSlot, title, subtitle }: HeroSectionProps) {
  return (
    <section
      className="relative w-full min-h-[400px] md:min-h-[480px] lg:min-h-[560px] bg-muted overflow-hidden"
      data-testid="section-hero"
    >
      <div className="absolute inset-0">{imageSlot}</div>
      <div className="relative container mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-24 flex flex-col justify-end min-h-[400px] md:min-h-[480px] lg:min-h-[560px]">
        <div className="max-w-4xl space-y-4 md:space-y-6">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white tracking-tight leading-[1.1]"
            style={{ fontFamily: "'Chillax', var(--font-sans)" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

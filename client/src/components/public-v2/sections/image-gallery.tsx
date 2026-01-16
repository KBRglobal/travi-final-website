import type { ReactNode } from "react";

interface ImageGalleryProps {
  imageSlots: ReactNode | null;
}

export function ImageGallery({ imageSlots }: ImageGalleryProps) {
  if (!imageSlots) {
    return null;
  }

  return (
    <section 
      className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12"
      data-testid="section-image-gallery"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
        {imageSlots}
      </div>
    </section>
  );
}

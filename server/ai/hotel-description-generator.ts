/**
 * Stub: hotel-description-generator
 * Original AI generator replaced by Octypo pipeline.
 * Returns placeholder content so routes don't break.
 */

interface HotelInput {
  id: string;
  name: string;
  stars?: number;
  location?: { name?: string; city?: string; country?: string };
  amenities?: string[];
  facilities?: string[];
  rating?: number | null;
  reviews?: number;
}

export async function generateHotelDescription(
  hotel: HotelInput,
  lang: string = "en"
): Promise<{
  description: string;
  seoTitle: string;
  seoDescription: string;
  highlights: string[];
} | null> {
  const city = hotel.location?.city || "the city";
  return {
    description: `Experience luxury and comfort at ${hotel.name}. Featuring world-class amenities, exceptional service, and breathtaking views, this hotel offers an unforgettable stay for discerning travelers.`,
    seoTitle: `${hotel.name} | ${hotel.stars || 5}-Star Luxury Hotel | TRAVI`,
    seoDescription: `Book ${hotel.name}, a ${hotel.stars || 5}-star luxury hotel in ${city}. Experience premium amenities and exceptional service.`,
    highlights: [
      `${hotel.stars || 5}-star luxury property`,
      `Located in ${city}`,
      ...(hotel.amenities?.slice(0, 3) || []),
    ],
  };
}

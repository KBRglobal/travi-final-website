/**
 * Stub: attraction-description-generator
 * Original AI generator replaced by Octypo pipeline.
 * Returns placeholder content so routes don't break.
 */

export async function generateAttractionContent(
  name: string,
  destination: string,
  category?: string,
  price?: string,
  duration?: string
): Promise<{
  introduction: string;
  whatToExpect: string[];
  highlights: string[];
  visitorTips: string[];
  faqItems: Array<{ question: string; answer: string }>;
  metaTitle: string;
  metaDescription: string;
}> {
  return {
    introduction: `${name} is one of ${destination}'s most popular attractions, offering visitors an unforgettable experience.`,
    whatToExpect: [
      `Experience the best of ${destination}`,
      "Professional guides and modern facilities",
      "Photography opportunities throughout",
    ],
    highlights: [`Top-rated attraction in ${destination}`, "Perfect for all ages"],
    visitorTips: [
      "Book tickets online in advance",
      "Arrive early to avoid crowds",
      "Wear comfortable walking shoes",
    ],
    faqItems: [
      {
        question: `What can I expect at ${name}?`,
        answer: `${name} offers a world-class experience in ${destination} with professional facilities and memorable moments.`,
      },
    ],
    metaTitle: `${name} | ${destination} Attractions | TRAVI`,
    metaDescription: `Discover ${name} in ${destination}. Book tickets, read reviews, and plan your visit with TRAVI.`,
  };
}

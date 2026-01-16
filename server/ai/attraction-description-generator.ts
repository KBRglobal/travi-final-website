import OpenAI from "openai";

const openai = new OpenAI();

export interface AttractionGeneratedContent {
  introduction: string;
  whatToExpect: string[];
  highlights: string[];
  visitorTips: string[];
  faqItems: { question: string; answer: string }[];
  metaTitle: string;
  metaDescription: string;
}

export async function generateAttractionContent(
  attractionName: string,
  destination: string,
  category: string,
  priceRange?: string,
  duration?: string
): Promise<AttractionGeneratedContent> {
  const prompt = `You are a travel content writer for TRAVI, creating SEO/AEO optimized content for tourist attractions.

Generate content for: ${attractionName} in ${destination}
Category: ${category}
${priceRange ? `Price Range: ${priceRange}` : ''}
${duration ? `Duration: ${duration}` : ''}

Create the following in JSON format:

1. "introduction": A 150-200 word engaging introduction. First 40-60 words must be a standalone answer suitable for AI search engines (AEO). No marketing fluff. Factual and informative.

2. "whatToExpect": Array of 5-6 specific things visitors will experience. Each item should be 20-40 words.

3. "highlights": Array of 3-5 key highlights that make this attraction special. Each 15-25 words.

4. "visitorTips": Array of 6-8 practical tips for visitors. Include booking advice, timing, what to bring, dress code if relevant.

5. "faqItems": Array of 8-10 FAQ objects with "question" and "answer" keys. Cover:
   - Ticket prices and booking
   - Opening hours
   - Best time to visit
   - Duration needed
   - Accessibility
   - Photography rules
   - Nearby attractions
   - Transportation
   Each answer should be concise (30-60 words). If unknown, say "Please check the ticket options page for the latest details."

6. "metaTitle": SEO title under 60 chars including year: "${attractionName} – Complete Guide 2026"

7. "metaDescription": SEO meta description 150-160 chars, compelling and informative.

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a travel content expert. Return only valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content?.trim() || "";
    
    // Parse JSON, handling potential markdown code blocks
    let jsonStr = content;
    if (content.startsWith("```")) {
      jsonStr = content.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    const parsed = JSON.parse(jsonStr);

    return {
      introduction: parsed.introduction || `${attractionName} is a must-visit destination in ${destination}.`,
      whatToExpect: parsed.whatToExpect || [],
      highlights: parsed.highlights || [],
      visitorTips: parsed.visitorTips || [],
      faqItems: parsed.faqItems || [],
      metaTitle: parsed.metaTitle || `${attractionName} – Complete Guide 2026`,
      metaDescription: parsed.metaDescription || `Discover ${attractionName} in ${destination}. Complete visitor guide with tickets, tips, and insider information.`
    };
  } catch (error) {
    console.error("[Attraction AI] Error generating content:", error);
    
    // Return fallback content
    return {
      introduction: `${attractionName} is one of ${destination}'s most popular attractions. This iconic destination offers visitors an unforgettable experience with world-class facilities and stunning views. Whether you're a first-time visitor or returning to explore more, ${attractionName} promises an extraordinary journey through ${destination}'s cultural and architectural heritage.`,
      whatToExpect: [
        `Experience the best of ${destination} at this iconic attraction`,
        `Professional guides available to enhance your visit`,
        `Modern facilities designed for visitor comfort`,
        `Photography opportunities throughout the venue`,
        `Gift shops and dining options available`
      ],
      highlights: [
        `One of ${destination}'s most photographed landmarks`,
        `Rich cultural and historical significance`,
        `Stunning architectural design and views`
      ],
      visitorTips: [
        `Book tickets online in advance to skip the queue`,
        `Arrive early, especially during peak season`,
        `Wear comfortable walking shoes`,
        `Check the weather forecast before your visit`,
        `Bring a camera for memorable photos`,
        `Allow extra time to explore nearby attractions`
      ],
      faqItems: [
        { question: `How much are tickets for ${attractionName}?`, answer: "Please check the ticket options page for the latest prices and availability." },
        { question: `What are the opening hours?`, answer: "Opening hours may vary by season. Please check the official ticket page for current times." },
        { question: `How long should I plan for my visit?`, answer: `Most visitors spend 2-3 hours at ${attractionName}. Allow extra time if you want to explore everything.` },
        { question: `Is ${attractionName} wheelchair accessible?`, answer: "Accessibility facilities are generally available. Check the ticket page for specific accessibility information." },
        { question: `Can I take photos at ${attractionName}?`, answer: "Photography for personal use is typically permitted in most areas." },
        { question: `What's the best time to visit?`, answer: "Weekday mornings tend to be less crowded. Consider visiting during shoulder season for smaller crowds." },
        { question: `How do I get to ${attractionName}?`, answer: "Multiple transportation options are available including public transit, taxi, and rideshare services." },
        { question: `Are there restaurants nearby?`, answer: "Various dining options are available at and around the attraction." }
      ],
      metaTitle: `${attractionName} – Complete Guide 2026`,
      metaDescription: `Discover ${attractionName} in ${destination}. Complete visitor guide with tickets, tips, and insider information for 2026.`
    };
  }
}

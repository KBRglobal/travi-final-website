/**
 * Content Block Utilities
 * Handles validation, normalization, and creation of content blocks for the CMS
 */

import type { ContentBlock } from "@shared/schema";

/**
 * Valid block types supported by the content system
 */
export const VALID_BLOCK_TYPES: ContentBlock["type"][] = [
  "hero",
  "text",
  "image",
  "gallery",
  "faq",
  "cta",
  "info_grid",
  "highlights",
  "room_cards",
  "tips",
  "quote",
  "banner",
  "recommendations",
  "related_articles",
];

/**
 * Normalize highlights block data: convert items array to content string
 */
function normalizeHighlightsData(data: Record<string, unknown>): Record<string, unknown> {
  const items = (data as any).items || (data as any).highlights;
  if (Array.isArray(items) && items.length > 0) {
    const content = items
      .map((item: unknown) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item && (item as any).title) {
          const t = item as { title?: string; description?: string };
          return t.description ? `${t.title}: ${t.description}` : t.title;
        }
        return String(item);
      })
      .join("\n");
    return { ...data, content };
  }
  if (typeof (data as any).content === "string" && (data as any).content.length > 0) return data;
  return {
    ...data,
    content:
      "Key attraction feature\nUnique experience offered\nMust-see element\nPopular activity",
  };
}

/**
 * Normalize tips block data: convert tips array to content string
 */
function normalizeTipsData(data: Record<string, unknown>): Record<string, unknown> {
  const tipsArray = (data as any).tips || (data as any).items;
  if (Array.isArray(tipsArray) && tipsArray.length > 0) {
    return { ...data, content: tipsArray.map(String).join("\n") };
  }
  if (typeof (data as any).content === "string" && (data as any).content.length > 0) return data;
  return {
    ...data,
    content:
      "Visit during off-peak hours\nBook in advance\nWear comfortable clothing\nStay hydrated\nCheck local customs",
  };
}

/**
 * Normalize FAQ block data: extract question/answer pairs
 */
function normalizeFaqData(data: Record<string, unknown>): Record<string, unknown> {
  if (typeof (data as any).question === "string" && (data as any).question.length > 0) return data;
  const faqsArray = (data as any).faqs || (data as any).items || (data as any).questions;
  if (Array.isArray(faqsArray) && faqsArray.length > 0) {
    const firstFaq = faqsArray[0];
    if (typeof firstFaq === "object" && firstFaq) {
      const q = firstFaq.question || firstFaq.q || "Question?";
      const a = firstFaq.answer || firstFaq.a || "Answer pending.";
      return { question: q, answer: a, _remainingFaqs: faqsArray.slice(1) };
    }
  }
  return {
    question: "What are the opening hours?",
    answer: "Check the official website for current timings.",
  };
}

/**
 * Ensure items in a list have default images
 */
function ensureItemImages(
  items: Array<Record<string, unknown>> | undefined,
  defaultImages: string[]
): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(items)) return items;
  return items.map((item, index) => ({
    ...item,
    image: item.image || defaultImages[index % defaultImages.length],
  }));
}

const PASSTHROUGH_TYPES = new Set([
  "hero",
  "text",
  "cta",
  "image",
  "gallery",
  "info_grid",
  "quote",
]);

const REC_DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=400",
  "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=400",
  "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=400",
  "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400",
];

const ARTICLE_DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400",
  "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=400",
  "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=400",
  "https://images.unsplash.com/photo-1546412414-e1885259563a?w=400",
];

/**
 * Normalize a single content block based on its type
 */
export function normalizeBlock(
  type: string,
  data: Record<string, unknown>
): Omit<ContentBlock, "id" | "order"> | null {
  // Simple passthrough types
  if (PASSTHROUGH_TYPES.has(type)) {
    return { type: type as ContentBlock["type"], data };
  }

  switch (type) {
    case "highlights":
      return { type: "highlights" as const, data: normalizeHighlightsData(data) };

    case "tips":
      return { type: "tips" as const, data: normalizeTipsData(data) };

    case "faq":
      return { type: "faq" as const, data: normalizeFaqData(data) };

    case "banner": {
      const bannerData = { ...data };
      if (!bannerData.image) {
        bannerData.image = "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920";
      }
      return { type: "banner" as const, data: bannerData };
    }

    case "recommendations":
      return {
        type: "recommendations" as const,
        data: { ...data, items: ensureItemImages(data.items as any, REC_DEFAULT_IMAGES) },
      };

    case "related_articles":
      return {
        type: "related_articles" as const,
        data: { ...data, articles: ensureItemImages(data.articles as any, ARTICLE_DEFAULT_IMAGES) },
      };

    case "room_cards":
      return { type: "room_cards" as const, data };

    default:
      // Check if type is valid, otherwise return text
      if (VALID_BLOCK_TYPES.includes(type as ContentBlock["type"])) {
        return { type: type as ContentBlock["type"], data };
      }
      return { type: "text" as const, data };
  }
}

/**
 * Create default content blocks for empty content
 */
export function createDefaultBlocks(title: string): ContentBlock[] {
  const timestamp = Date.now();
  return [
    {
      id: `hero-${timestamp}-0`,
      type: "hero",
      data: { title, subtitle: "Discover Travel Destinations", overlayText: "" },
      order: 0,
    },
    {
      id: `text-${timestamp}-1`,
      type: "text",
      data: {
        heading: "Overview",
        content: "Content generation incomplete. Please edit this article to add more details.",
      },
      order: 1,
    },
    {
      id: `highlights-${timestamp}-2`,
      type: "highlights",
      data: { content: "Feature 1\nFeature 2\nFeature 3\nFeature 4\nFeature 5\nFeature 6" },
      order: 2,
    },
    {
      id: `tips-${timestamp}-3`,
      type: "tips",
      data: {
        content:
          "Plan ahead\nBook in advance\nVisit early morning\nStay hydrated\nRespect local customs\nBring camera\nCheck weather",
      },
      order: 3,
    },
    {
      id: `faq-${timestamp}-4`,
      type: "faq",
      data: {
        question: "What are the opening hours?",
        answer: "Check official website for current hours.",
      },
      order: 4,
    },
    {
      id: `faq-${timestamp}-5`,
      type: "faq",
      data: { question: "Is there parking?", answer: "Yes, parking is available." },
      order: 5,
    },
    {
      id: `faq-${timestamp}-6`,
      type: "faq",
      data: {
        question: "What should I bring?",
        answer: "Comfortable shoes, sunscreen, and water.",
      },
      order: 6,
    },
    {
      id: `cta-${timestamp}-7`,
      type: "cta",
      data: {
        title: "Book Your Visit",
        content: "Plan your trip today!",
        buttonText: "Book Now",
        buttonLink: "#",
      },
      order: 7,
    },
  ];
}

/**
 * Expand remaining FAQs from a normalized block into separate blocks
 */
function expandRemainingFaqs(
  normalized: Omit<ContentBlock, "id" | "order">,
  blocks: Omit<ContentBlock, "id" | "order">[]
) {
  if (normalized.type !== "faq" || !(normalized.data as any)._remainingFaqs) return;
  const remainingFaqs = (normalized.data as any)._remainingFaqs as Array<{
    question?: string;
    answer?: string;
    q?: string;
    a?: string;
  }>;
  delete (normalized.data as any)._remainingFaqs;
  for (const faq of remainingFaqs) {
    blocks.push({
      type: "faq" as const,
      data: {
        question: faq.question || faq.q || "Question?",
        answer: faq.answer || faq.a || "Answer pending.",
      },
    });
  }
}

/**
 * Default block definitions for missing required types
 */
const DEFAULT_BLOCK_DEFS: {
  type: string;
  position: "push" | "unshift" | number;
  data: Record<string, unknown>;
}[] = [
  { type: "hero", position: "unshift", data: {} }, // title set dynamically
  {
    type: "highlights",
    position: "push",
    data: {
      content:
        "Key attraction feature\nUnique experience offered\nMust-see element\nPopular activity\nEssential stop\nNotable landmark",
    },
  },
  {
    type: "tips",
    position: "push",
    data: {
      content:
        "Plan your visit during cooler months\nBook tickets in advance\nArrive early to avoid crowds\nBring comfortable walking shoes\nStay hydrated\nCheck dress codes beforehand\nConsider guided tours for insights",
    },
  },
  {
    type: "cta",
    position: "push",
    data: {
      title: "Plan Your Visit",
      content: "Ready to experience this amazing destination? Book your trip today!",
      buttonText: "Book Now",
      buttonLink: "#",
    },
  },
  {
    type: "quote",
    position: 4,
    data: {
      text: "Travel opens doors to new experiences. Every destination has a story waiting to be discovered.",
      author: "TRAVI World",
      source: "",
    },
  },
  {
    type: "banner",
    position: 7,
    data: {
      title: "EXPLORE THE WORLD",
      subtitle: "Discover the magic",
      image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920",
      ctaText: "Explore More",
      ctaLink: "/attractions",
    },
  },
];

const DEFAULT_FAQ_BLOCKS = [
  {
    question: "What are the opening hours?",
    answer: "Opening hours vary by season. Check the official website for current timings.",
  },
  {
    question: "How much does entry cost?",
    answer:
      "Pricing varies depending on the package selected. Visit the official website for current rates.",
  },
  { question: "Is parking available?", answer: "Yes, parking is available on-site for visitors." },
];

const DEFAULT_RECOMMENDATIONS = {
  title: "Travi Recommends",
  subtitle: "Handpicked experiences to enhance your visit",
  items: [
    {
      title: "Top Attraction Experience",
      description: "See the destination from its most iconic spot",
      image: "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=400",
      ctaText: "Book Now",
      ctaLink: "/attractions",
      price: "Check prices",
    },
    {
      title: "Local Adventure",
      description: "Experience authentic local culture",
      image: "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=400",
      ctaText: "Book Now",
      ctaLink: "/attractions",
      price: "Check prices",
    },
    {
      title: "Scenic Cruise",
      description: "Luxury cruise with beautiful views",
      image: "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=400",
      ctaText: "Book Now",
      ctaLink: "/attractions",
      price: "Check prices",
    },
    {
      title: "Nature Experience",
      description: "Explore beautiful natural attractions",
      image: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400",
      ctaText: "Book Now",
      ctaLink: "/attractions",
      price: "Check prices",
    },
  ],
};

const DEFAULT_RELATED_ARTICLES = {
  title: "Related Articles",
  subtitle: "Explore more travel guides and tips",
  articles: [
    {
      title: "Top Things to Do",
      description: "Essential experiences for first-time visitors",
      image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400",
      date: "25",
      category: "Travel Guide",
      slug: "top-things-to-do",
    },
    {
      title: "Travel on a Budget",
      description: "How to enjoy your trip for less",
      image: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=400",
      date: "25",
      category: "Tips",
      slug: "budget-travel-guide",
    },
    {
      title: "Best Restaurants 2025",
      description: "Where to eat from casual to fine dining",
      image: "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=400",
      date: "25",
      category: "Dining",
      slug: "best-restaurants",
    },
    {
      title: "Hidden Gems",
      description: "Secret spots the locals love",
      image: "https://images.unsplash.com/photo-1546412414-e1885259563a?w=400",
      date: "25",
      category: "Attractions",
      slug: "hidden-gems",
    },
  ],
};

/**
 * Add missing required blocks to the normalized list
 */
function ensureRequiredBlocks(
  blocks: Omit<ContentBlock, "id" | "order">[],
  blockTypes: Set<string>,
  title: string
) {
  for (const def of DEFAULT_BLOCK_DEFS) {
    if (blockTypes.has(def.type)) continue;
    const data =
      def.type === "hero"
        ? { title, subtitle: "Discover Travel Destinations", overlayText: "" }
        : def.data;
    const block: Omit<ContentBlock, "id" | "order"> = {
      type: def.type as ContentBlock["type"],
      data,
    };
    if (def.position === "unshift") {
      blocks.unshift(block);
    } else if (def.position === "push") {
      blocks.push(block);
    } else {
      blocks.splice(Math.min(def.position, blocks.length), 0, block);
    }
  }

  if (!blockTypes.has("faq")) {
    for (const faq of DEFAULT_FAQ_BLOCKS) {
      blocks.push({ type: "faq", data: { question: faq.question, answer: faq.answer } });
    }
  }

  if (!blockTypes.has("recommendations")) {
    blocks.push({ type: "recommendations", data: DEFAULT_RECOMMENDATIONS });
  }

  if (!blockTypes.has("related_articles")) {
    blocks.push({ type: "related_articles", data: DEFAULT_RELATED_ARTICLES });
  }
}

/**
 * Validate and normalize AI-generated content blocks
 */
export function validateAndNormalizeBlocks(blocks: unknown[], title: string): ContentBlock[] {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return createDefaultBlocks(title);
  }

  const normalizedBlocks: Omit<ContentBlock, "id" | "order">[] = [];
  const blockTypes = new Set<string>();

  for (const block of blocks) {
    if (typeof block !== "object" || !block) continue;
    const b = block as Record<string, unknown>;
    if (typeof b.type !== "string" || !b.data) continue;

    const normalized = normalizeBlock(b.type, b.data as Record<string, unknown>);
    if (!normalized) continue;
    normalizedBlocks.push(normalized);
    blockTypes.add(normalized.type);
    expandRemainingFaqs(normalized, normalizedBlocks);
  }

  ensureRequiredBlocks(normalizedBlocks, blockTypes, title);

  // Add id and order to all blocks before returning
  return normalizedBlocks.map((block, index) => ({
    ...block,
    id: `${block.type}-${Date.now()}-${index}`,
    order: index,
  }));
}

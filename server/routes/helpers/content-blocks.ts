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
 * Normalize a single content block based on its type
 */
export function normalizeBlock(
  type: string,
  data: Record<string, unknown>
): Omit<ContentBlock, "id" | "order"> | null {
  switch (type) {
    case "hero":
      return { type: "hero" as const, data };

    case "text":
      return { type: "text" as const, data };

    case "highlights": {
      // Convert items array to content string (one per line) for editor compatibility
      let highlightItems = (data as any).items || (data as any).highlights;
      if (Array.isArray(highlightItems) && highlightItems.length > 0) {
        // Convert array to newline-separated string for textarea editing
        const highlightContent = highlightItems
          .map((item: unknown) => {
            if (typeof item === "string") return item;
            if (typeof item === "object" && item && (item as any).title) {
              // Handle {title, description} format
              const t = item as { title?: string; description?: string };
              return t.description ? `${t.title}: ${t.description}` : t.title;
            }
            return String(item);
          })
          .join("\n");
        return { type: "highlights" as const, data: { ...data, content: highlightContent } };
      }
      // If already has content, use it
      if (typeof (data as any).content === "string" && (data as any).content.length > 0) {
        return { type: "highlights" as const, data };
      }
      // Default highlights
      return {
        type: "highlights" as const,
        data: {
          ...data,
          content:
            "Key attraction feature\nUnique experience offered\nMust-see element\nPopular activity",
        },
      };
    }

    case "tips": {
      // Convert tips array to content string (one per line) for editor compatibility
      let tipsArray = (data as any).tips || (data as any).items;
      if (Array.isArray(tipsArray) && tipsArray.length > 0) {
        // Convert array to newline-separated string for textarea editing
        const tipsContent = tipsArray.map((tip: unknown) => String(tip)).join("\n");
        return { type: "tips" as const, data: { ...data, content: tipsContent } };
      }
      // If already has content, use it
      if (typeof (data as any).content === "string" && (data as any).content.length > 0) {
        return { type: "tips" as const, data };
      }
      // Default tips
      return {
        type: "tips" as const,
        data: {
          ...data,
          content:
            "Visit during off-peak hours\nBook in advance\nWear comfortable clothing\nStay hydrated\nCheck local customs",
        },
      };
    }

    case "faq": {
      // For FAQ, editor expects individual blocks with question/answer strings
      // If data has question/answer directly, use it
      if (typeof (data as any).question === "string" && (data as any).question.length > 0) {
        return { type: "faq" as const, data };
      }
      // If data has faqs array, take the first one (other FAQs handled by validateAndNormalizeBlocks)
      let faqsArray = (data as any).faqs || (data as any).items || (data as any).questions;
      if (Array.isArray(faqsArray) && faqsArray.length > 0) {
        const firstFaq = faqsArray[0];
        if (typeof firstFaq === "object" && firstFaq) {
          const q = firstFaq.question || firstFaq.q || "Question?";
          const a = firstFaq.answer || firstFaq.a || "Answer pending.";
          // Store the remaining FAQs for later extraction
          return {
            type: "faq" as const,
            data: { question: q, answer: a, _remainingFaqs: faqsArray.slice(1) },
          };
        }
      }
      // Default FAQ
      return {
        type: "faq" as const,
        data: {
          question: "What are the opening hours?",
          answer: "Check the official website for current timings.",
        },
      };
    }

    case "cta":
      return { type: "cta" as const, data };

    case "image":
      return { type: "image" as const, data };
    case "gallery":
      return { type: "gallery" as const, data };
    case "info_grid":
      return { type: "info_grid" as const, data };

    case "quote":
      return { type: "quote" as const, data };

    case "banner": {
      // Ensure banner has image
      const bannerData = { ...data };
      if (!bannerData.image) {
        bannerData.image = "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920";
      }
      return { type: "banner" as const, data: bannerData };
    }

    case "recommendations": {
      // Ensure recommendations have items with images
      const recData = data;
      let recItems = recData.items as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(recItems)) {
        const defaultImages = [
          "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=400",
          "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=400",
          "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=400",
          "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400",
        ];
        recItems = recItems.map((item: Record<string, unknown>, index: number) => ({
          ...item,
          image: item.image || defaultImages[index % defaultImages.length],
        }));
      }
      return { type: "recommendations" as const, data: { ...data, items: recItems } };
    }

    case "related_articles": {
      // Ensure related articles have images
      const articleData = data;
      let articles = articleData.articles as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(articles)) {
        const defaultArticleImages = [
          "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400",
          "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=400",
          "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=400",
          "https://images.unsplash.com/photo-1546412414-e1885259563a?w=400",
        ];
        articles = articles.map((article: Record<string, unknown>, index: number) => ({
          ...article,
          image: article.image || defaultArticleImages[index % defaultArticleImages.length],
        }));
      }
      return { type: "related_articles" as const, data: { ...data, articles } };
    }

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
    if (normalized) {
      normalizedBlocks.push(normalized);
      blockTypes.add(normalized.type);

      // If FAQ block has remaining FAQs, expand them into separate blocks
      if (normalized.type === "faq" && (normalized.data as any)._remainingFaqs) {
        const remainingFaqs = (normalized.data as any)._remainingFaqs as Array<{
          question?: string;
          answer?: string;
          q?: string;
          a?: string;
        }>;
        // Clean up the _remainingFaqs from the first block
        delete (normalized.data as any)._remainingFaqs;

        // Add remaining FAQs as separate blocks
        for (const faq of remainingFaqs) {
          const q = faq.question || faq.q || "Question?";
          const a = faq.answer || faq.a || "Answer pending.";
          normalizedBlocks.push({
            type: "faq" as const,
            data: { question: q, answer: a },
          });
        }
      }
    }
  }

  // Ensure required block types exist
  if (!blockTypes.has("hero")) {
    normalizedBlocks.unshift({
      type: "hero",
      data: { title, subtitle: "Discover Travel Destinations", overlayText: "" },
    });
  }

  if (!blockTypes.has("highlights")) {
    normalizedBlocks.push({
      type: "highlights",
      data: {
        content:
          "Key attraction feature\nUnique experience offered\nMust-see element\nPopular activity\nEssential stop\nNotable landmark",
      },
    });
  }

  if (!blockTypes.has("tips")) {
    normalizedBlocks.push({
      type: "tips",
      data: {
        content:
          "Plan your visit during cooler months\nBook tickets in advance\nArrive early to avoid crowds\nBring comfortable walking shoes\nStay hydrated\nCheck dress codes beforehand\nConsider guided tours for insights",
      },
    });
  }

  if (!blockTypes.has("faq")) {
    // Add individual FAQ blocks (editor expects question/answer format)
    const defaultFaqs = [
      {
        question: "What are the opening hours?",
        answer: "Opening hours vary by season. Check the official website for current timings.",
      },
      {
        question: "How much does entry cost?",
        answer:
          "Pricing varies depending on the package selected. Visit the official website for current rates.",
      },
      {
        question: "Is parking available?",
        answer: "Yes, parking is available on-site for visitors.",
      },
    ];
    for (const faq of defaultFaqs) {
      normalizedBlocks.push({
        type: "faq",
        data: { question: faq.question, answer: faq.answer },
      });
    }
  }

  if (!blockTypes.has("cta")) {
    normalizedBlocks.push({
      type: "cta",
      data: {
        title: "Plan Your Visit",
        content: "Ready to experience this amazing destination? Book your trip today!",
        buttonText: "Book Now",
        buttonLink: "#",
      },
    });
  }

  // Add quote block if missing (insert after second text block if exists)
  if (!blockTypes.has("quote")) {
    const insertIndex = Math.min(4, normalizedBlocks.length);
    normalizedBlocks.splice(insertIndex, 0, {
      type: "quote",
      data: {
        text: "Travel opens doors to new experiences. Every destination has a story waiting to be discovered.",
        author: "TRAVI World",
        source: "",
      },
    });
  }

  // Add banner block if missing
  if (!blockTypes.has("banner")) {
    const insertIndex = Math.min(7, normalizedBlocks.length);
    normalizedBlocks.splice(insertIndex, 0, {
      type: "banner",
      data: {
        title: "EXPLORE THE WORLD",
        subtitle: "Discover the magic",
        image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920",
        ctaText: "Explore More",
        ctaLink: "/attractions",
      },
    });
  }

  // Add recommendations block if missing
  if (!blockTypes.has("recommendations")) {
    normalizedBlocks.push({
      type: "recommendations",
      data: {
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
      },
    });
  }

  // Add related articles block if missing
  if (!blockTypes.has("related_articles")) {
    normalizedBlocks.push({
      type: "related_articles",
      data: {
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
      },
    });
  }

  // Add id and order to all blocks before returning
  return normalizedBlocks.map((block, index) => ({
    ...block,
    id: `${block.type}-${Date.now()}-${index}`,
    order: index,
  }));
}

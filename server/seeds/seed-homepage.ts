import { db } from "../db";
import { editablePages, pageSections } from "@shared/schema";
import { eq } from "drizzle-orm";

const SKY_BACKGROUND = "/attached_assets/blue-sky-clouds-background_1766314952453.jpg";
const MASCOT_IMAGE = "/attached_assets/Mascot_for_Dark_Background_1765497703861.png";

interface SeedSectionData {
  sectionKey: string;
  sectionType: string;
  title?: string;
  titleHe?: string;
  subtitle?: string;
  subtitleHe?: string;
  description?: string;
  descriptionHe?: string;
  buttonText?: string;
  buttonTextHe?: string;
  buttonLink?: string;
  backgroundImage?: string;
  images?: string[];
  data?: Record<string, unknown>;
  dataHe?: Record<string, unknown>;
  sortOrder: number;
}

export async function seedHomepage(): Promise<{
  success: boolean;
  message: string;
  pageId?: string;
}> {
  try {
    const existingPage = await db
      .select()
      .from(editablePages)
      .where(eq(editablePages.slug, "home"))
      .limit(1);

    if (existingPage.length > 0) {
      return {
        success: true,
        message: "Homepage already exists, skipping seed",
        pageId: existingPage[0].id,
      };
    }

    const [page] = await db
      .insert(editablePages)
      .values({
        slug: "home",
        pageType: "home",
        title: "Travi - Dubai Travel Guide",
        titleHe: "",
        metaTitle: "Travi - Dubai Travel Guide | Things to Do, Hotels & Attractions",
        metaTitleHe: "",
        metaDescription:
          "The most comprehensive guide to Dubai's attractions, hotels & hidden gems. Written by local experts in 17 languages.",
        metaDescriptionHe: "",
        isPublished: true,
        publishedAt: new Date(),
      } as any)
      .returning();

    const sectionsData: SeedSectionData[] = [
      {
        sectionKey: "hero",
        sectionType: "hero",
        title: "TRAVI",
        titleHe: "TRAVI",
        subtitle: "Discover the World Like a Local",
        subtitleHe: "",
        description: "The most comprehensive guide to Dubai's attractions, hotels & hidden gems.",
        descriptionHe: "",
        buttonText: "Start Exploring",
        buttonTextHe: "",
        buttonLink: "/attractions",
        backgroundImage: SKY_BACKGROUND,
        data: {
          showSearch: true,
          searchPlaceholder: "Search attractions, hotels, restaurants...",
          mascotImage: MASCOT_IMAGE,
          quickLinks: [
            { label: "Laws for Tourists", href: "/destinations/dubai/laws-for-tourists" },
            { label: "Sheikh Mohammed", href: "/destinations/dubai/sheikh-mohammed" },
            { label: "24 Hours Open", href: "/destinations/dubai/24-hours-open" },
            { label: "Free Things To Do", href: "/destinations/dubai/free-things-to-do" },
          ],
          stats: [
            { icon: "book", label: "Guides", dynamic: true },
            { icon: "globe", label: "17 Languages", value: "17" },
          ],
        },
        dataHe: {
          showSearch: true,
          searchPlaceholder: "",
          mascotImage: MASCOT_IMAGE,
          quickLinks: [
            { label: "", href: "/he/destinations/dubai/laws-for-tourists" },
            { label: "", href: "/he/destinations/dubai/sheikh-mohammed" },
            { label: "", href: "/he/destinations/dubai/24-hours-open" },
            { label: "", href: "/he/destinations/dubai/free-things-to-do" },
          ],
          stats: [
            { icon: "book", label: "", dynamic: true },
            { icon: "globe", label: "", value: "17" },
          ],
        },
        sortOrder: 1,
      },
      {
        sectionKey: "categories",
        sectionType: "highlight_grid",
        title: "Explore Dubai",
        titleHe: "",
        data: {
          items: [
            {
              icon: "building",
              title: "Attractions",
              titleHe: "",
              link: "/attractions",
              color: "#6C5CE7",
            },
            { icon: "hotel", title: "Hotels", titleHe: "", link: "/hotels", color: "#EC4899" },
            { icon: "utensils", title: "Dining", titleHe: "", link: "/dining", color: "#F59E0B" },
            { icon: "map", title: "Districts", titleHe: "", link: "/districts", color: "#10B981" },
            { icon: "newspaper", title: "News", titleHe: "", link: "/news", color: "#3B82F6" },
            { icon: "calendar", title: "Events", titleHe: "", link: "/events", color: "#8B5CF6" },
          ],
        },
        dataHe: {
          items: [
            { icon: "building", title: "", link: "/he/attractions", color: "#6C5CE7" },
            { icon: "hotel", title: "", link: "/he/hotels", color: "#EC4899" },
            { icon: "utensils", title: "", link: "/he/dining", color: "#F59E0B" },
            { icon: "map", title: "", link: "/he/districts", color: "#10B981" },
            { icon: "newspaper", title: "", link: "/he/news", color: "#3B82F6" },
            { icon: "calendar", title: "", link: "/he/events", color: "#8B5CF6" },
          ],
        },
        sortOrder: 2,
      },
      {
        sectionKey: "trust",
        sectionType: "features",
        title: "Why 2 Million Travelers Trust Travi",
        titleHe: "",
        data: {
          items: [
            {
              icon: "check",
              title: "Local Experts",
              description: "Written by Dubai residents who know every hidden corner",
            },
            {
              icon: "book",
              title: "In-Depth Guides",
              description: "1500+ words per guide on average",
            },
            {
              icon: "globe",
              title: "17 Languages",
              description: "Read in your native language",
            },
          ],
          testimonial: '"The most detailed Dubai guide I\'ve found" - TripAdvisor',
        },
        dataHe: {
          items: [
            {
              icon: "check",
              title: "",
              description: "",
            },
            {
              icon: "book",
              title: "",
              description: "",
            },
            {
              icon: "globe",
              title: "",
              description: "",
            },
          ],
          testimonial: "",
        },
        sortOrder: 3,
      },
      {
        sectionKey: "attractions",
        sectionType: "content_grid",
        title: "Top Attractions in Dubai",
        titleHe: "",
        buttonText: "View All",
        buttonTextHe: "",
        buttonLink: "/attractions",
        data: {
          contentType: "attraction",
          limit: 4,
          showRating: true,
          showPrice: true,
          showLocation: true,
        },
        dataHe: {
          contentType: "attraction",
          limit: 4,
          showRating: true,
          showPrice: true,
          showLocation: true,
        },
        sortOrder: 4,
      },
      {
        sectionKey: "districts",
        sectionType: "content_grid",
        title: "Explore Dubai by Area",
        titleHe: "",
        buttonText: "View All Districts",
        buttonTextHe: "",
        buttonLink: "/districts",
        data: {
          contentType: "district",
          limit: 3,
          layout: "featured",
          showStats: true,
        },
        dataHe: {
          contentType: "district",
          limit: 3,
          layout: "featured",
          showStats: true,
        },
        sortOrder: 5,
      },
      {
        sectionKey: "hotels",
        sectionType: "content_grid",
        title: "Where to Stay in Dubai",
        titleHe: "",
        buttonText: "View All",
        buttonTextHe: "",
        buttonLink: "/hotels",
        data: {
          contentType: "hotel",
          limit: 4,
          showStars: true,
          showPrice: true,
          showLocation: true,
          filters: ["All", "Luxury 5*", "Mid-Range", "Budget", "Beach", "City"],
        },
        dataHe: {
          contentType: "hotel",
          limit: 4,
          showStars: true,
          showPrice: true,
          showLocation: true,
          filters: [],
        },
        sortOrder: 6,
      },
      {
        sectionKey: "dining",
        sectionType: "content_grid",
        title: "Best Restaurants in Dubai",
        titleHe: "",
        buttonText: "View All",
        buttonTextHe: "",
        buttonLink: "/dining",
        data: {
          contentType: "dining",
          limit: 4,
          showCuisine: true,
          showPriceLevel: true,
          showLocation: true,
          filters: ["All", "Fine Dining", "Casual", "Brunches", "Street Food"],
        },
        dataHe: {
          contentType: "dining",
          limit: 4,
          showCuisine: true,
          showPriceLevel: true,
          showLocation: true,
          filters: [],
        },
        sortOrder: 7,
      },
      {
        sectionKey: "articles",
        sectionType: "content_grid",
        title: "Dubai Travel Tips & News",
        titleHe: "",
        buttonText: "View All",
        buttonTextHe: "",
        buttonLink: "/news",
        data: {
          contentType: "article",
          limit: 5,
          layout: "featured",
          showDate: true,
          showReadTime: true,
          showSidebar: true,
          sidebarTitle: "Popular Guides",
          statsTitle: "Dubai Quick Facts",
          stats: [
            { label: "Annual Visitors", value: "17.15M+" },
            { label: "World's Tallest Tower", value: "828m" },
            { label: "Year-Round Sunshine", value: "340+ days" },
            { label: "Nationalities Living", value: "200+" },
          ],
        },
        dataHe: {
          contentType: "article",
          limit: 5,
          layout: "featured",
          showDate: true,
          showReadTime: true,
          showSidebar: true,
          sidebarTitle: "",
          statsTitle: "",
          stats: [
            { label: "", value: "17.15M+" },
            { label: "", value: "" },
            { label: "", value: "" },
            { label: "", value: "200+" },
          ],
        },
        sortOrder: 8,
      },
      {
        sectionKey: "events",
        sectionType: "content_grid",
        title: "What's Happening in Dubai",
        titleHe: "",
        buttonText: "View All Events",
        buttonTextHe: "",
        buttonLink: "/events",
        data: {
          contentType: "event",
          limit: 4,
          layout: "list",
          showDate: true,
          sectionTitle: "THIS WEEK",
        },
        dataHe: {
          contentType: "event",
          limit: 4,
          layout: "list",
          showDate: true,
          sectionTitle: "",
        },
        sortOrder: 9,
      },
      {
        sectionKey: "newsletter",
        sectionType: "newsletter",
        title: "Get Weekly Dubai Tips & Deals",
        titleHe: "",
        subtitle: "Join 50,000+ travelers who get our free guide",
        subtitleHe: "",
        buttonText: "Subscribe",
        buttonTextHe: "",
        data: {
          placeholder: "Enter your email",
          successMessage: "Thanks for subscribing!",
          benefits: ["Weekly insider tips", "Exclusive deals", "New attraction alerts"],
        },
        dataHe: {
          placeholder: "",
          successMessage: "",
          benefits: [],
        },
        sortOrder: 10,
      },
    ];

    for (const sectionData of sectionsData) {
      await db.insert(pageSections).values({
        pageId: page.id,
        sectionKey: sectionData.sectionKey,
        sectionType: sectionData.sectionType,
        title: sectionData.title || null,
        titleHe: sectionData.titleHe || null,
        subtitle: sectionData.subtitle || null,
        subtitleHe: sectionData.subtitleHe || null,
        description: sectionData.description || null,
        descriptionHe: sectionData.descriptionHe || null,
        buttonText: sectionData.buttonText || null,
        buttonTextHe: sectionData.buttonTextHe || null,
        buttonLink: sectionData.buttonLink || null,
        backgroundImage: sectionData.backgroundImage || null,
        images: sectionData.images || [],
        data: sectionData.data || {},
        dataHe: sectionData.dataHe || {},
        sortOrder: sectionData.sortOrder,
        isVisible: true,
        showOnMobile: true,
        showOnDesktop: true,
      } as any);
    }

    return {
      success: true,
      message: `Homepage created with ${sectionsData.length} sections`,
      pageId: page.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function seedCategoryPage(
  type: "hotels" | "dining" | "districts" | "shopping"
): Promise<{ success: boolean; message: string; pageId?: string }> {
  const categoryConfig: Record<
    string,
    {
      title: string;
      titleHe: string;
      metaTitle: string;
      metaTitleHe: string;
      metaDescription: string;
      metaDescriptionHe: string;
    }
  > = {
    hotels: {
      title: "Hotels in Dubai",
      titleHe: "",
      metaTitle: "Best Hotels in Dubai | Luxury to Budget Stays | Travi",
      metaTitleHe: "",
      metaDescription:
        "Find the perfect hotel in Dubai. From luxury 5-star resorts to budget-friendly options, explore our curated selection.",
      metaDescriptionHe: "",
    },
    dining: {
      title: "Restaurants in Dubai",
      titleHe: "",
      metaTitle: "Best Restaurants in Dubai | Fine Dining to Street Food | Travi",
      metaTitleHe: "",
      metaDescription:
        "Discover Dubai's culinary scene. From Michelin-starred restaurants to hidden gems and street food.",
      metaDescriptionHe: "",
    },
    districts: {
      title: "Districts in Dubai",
      titleHe: "",
      metaTitle: "Dubai Districts Guide | Neighborhoods & Areas | Travi",
      metaTitleHe: "",
      metaDescription:
        "Explore Dubai's diverse neighborhoods. From Downtown to Dubai Marina, discover what each area has to offer.",
      metaDescriptionHe: "",
    },
    shopping: {
      title: "Shopping in Dubai",
      titleHe: "",
      metaTitle: "Shopping in Dubai | Malls, Souks & Boutiques | Travi",
      metaTitleHe: "",
      metaDescription:
        "Your guide to shopping in Dubai. From mega malls to traditional souks and designer boutiques.",
      metaDescriptionHe: "",
    },
  };

  const config = categoryConfig[type];
  if (!config) {
    return { success: false, message: `Unknown category type: ${type}` };
  }

  try {
    const existingPage = await db
      .select()
      .from(editablePages)
      .where(eq(editablePages.slug, type))
      .limit(1);

    if (existingPage.length > 0) {
      return {
        success: true,
        message: `${type} page already exists, skipping seed`,
        pageId: existingPage[0].id,
      };
    }

    const [page] = await db
      .insert(editablePages)
      .values({
        slug: type,
        pageType: "category",
        title: config.title,
        titleHe: config.titleHe,
        metaTitle: config.metaTitle,
        metaTitleHe: config.metaTitleHe,
        metaDescription: config.metaDescription,
        metaDescriptionHe: config.metaDescriptionHe,
        isPublished: true,
        publishedAt: new Date(),
      } as any)
      .returning();

    await db.insert(pageSections).values({
      pageId: page.id,
      sectionKey: "hero",
      sectionType: "hero",
      title: config.title,
      titleHe: config.titleHe,
      subtitle: config.metaDescription,
      subtitleHe: config.metaDescriptionHe,
      sortOrder: 1,
      isVisible: true,
    } as any);

    await db.insert(pageSections).values({
      pageId: page.id,
      sectionKey: "content",
      sectionType: "content_grid",
      title: config.title,
      titleHe: config.titleHe,
      data: {
        contentType: type === "shopping" ? "article" : type.replace("s", ""),
        showFilters: true,
        showPagination: true,
      },
      dataHe: {
        contentType: type === "shopping" ? "article" : type.replace("s", ""),
        showFilters: true,
        showPagination: true,
      },
      sortOrder: 2,
      isVisible: true,
    } as any);

    return {
      success: true,
      message: `${type} category page created successfully`,
      pageId: page.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

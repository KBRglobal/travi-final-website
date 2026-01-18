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

export async function seedHomepage(): Promise<{ success: boolean; message: string; pageId?: string }> {
  try {
    const existingPage = await db.select()
      .from(editablePages)
      .where(eq(editablePages.slug, "home"))
      .limit(1);

    if (existingPage.length > 0) {
      return { 
        success: true, 
        message: "Homepage already exists, skipping seed",
        pageId: existingPage[0].id 
      };
    }

    const [page] = await db.insert(editablePages)
      .values({
        slug: "home",
        pageType: "home",
        title: "Travi - Dubai Travel Guide",
        titleHe: "טראווי - מדריך נסיעות לדובאי",
        metaTitle: "Travi - Dubai Travel Guide | Things to Do, Hotels & Attractions",
        metaTitleHe: "טראווי - מדריך נסיעות לדובאי | אטרקציות, מלונות ופעילויות",
        metaDescription: "The most comprehensive guide to Dubai's attractions, hotels & hidden gems. Written by local experts in 17 languages.",
        metaDescriptionHe: "המדריך המקיף ביותר לאטרקציות, מלונות והמקומות הסודיים של דובאי. נכתב על ידי מומחים מקומיים ב-17 שפות.",
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
        subtitleHe: "גלו את העולם כמו מקומיים",
        description: "The most comprehensive guide to Dubai's attractions, hotels & hidden gems.",
        descriptionHe: "המדריך המקיף ביותר לאטרקציות, מלונות והמקומות הסודיים של דובאי.",
        buttonText: "Start Exploring",
        buttonTextHe: "התחילו לחקור",
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
          searchPlaceholder: "חיפוש אטרקציות, מלונות, מסעדות...",
          mascotImage: MASCOT_IMAGE,
          quickLinks: [
            { label: "חוקים לתיירים", href: "/he/destinations/dubai/laws-for-tourists" },
            { label: "שייח' מוחמד", href: "/he/destinations/dubai/sheikh-mohammed" },
            { label: "פתוח 24 שעות", href: "/he/destinations/dubai/24-hours-open" },
            { label: "דברים בחינם לעשות", href: "/he/destinations/dubai/free-things-to-do" },
          ],
          stats: [
            { icon: "book", label: "מדריכים", dynamic: true },
            { icon: "globe", label: "17 שפות", value: "17" },
          ],
        },
        sortOrder: 1,
      },
      {
        sectionKey: "categories",
        sectionType: "highlight_grid",
        title: "Explore Dubai",
        titleHe: "גלו את דובאי",
        data: {
          items: [
            { icon: "building", title: "Attractions", titleHe: "אטרקציות", link: "/attractions", color: "#6C5CE7" },
            { icon: "hotel", title: "Hotels", titleHe: "מלונות", link: "/hotels", color: "#EC4899" },
            { icon: "utensils", title: "Dining", titleHe: "מסעדות", link: "/dining", color: "#F59E0B" },
            { icon: "map", title: "Districts", titleHe: "אזורים", link: "/districts", color: "#10B981" },
            { icon: "newspaper", title: "News", titleHe: "חדשות", link: "/news", color: "#3B82F6" },
            { icon: "calendar", title: "Events", titleHe: "אירועים", link: "/events", color: "#8B5CF6" },
          ],
        },
        dataHe: {
          items: [
            { icon: "building", title: "אטרקציות", link: "/he/attractions", color: "#6C5CE7" },
            { icon: "hotel", title: "מלונות", link: "/he/hotels", color: "#EC4899" },
            { icon: "utensils", title: "מסעדות", link: "/he/dining", color: "#F59E0B" },
            { icon: "map", title: "אזורים", link: "/he/districts", color: "#10B981" },
            { icon: "newspaper", title: "חדשות", link: "/he/news", color: "#3B82F6" },
            { icon: "calendar", title: "אירועים", link: "/he/events", color: "#8B5CF6" },
          ],
        },
        sortOrder: 2,
      },
      {
        sectionKey: "trust",
        sectionType: "features",
        title: "Why 2 Million Travelers Trust Travi",
        titleHe: "למה 2 מיליון מטיילים סומכים על טראווי",
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
              title: "מומחים מקומיים", 
              description: "נכתב על ידי תושבי דובאי שמכירים כל פינה נסתרת",
            },
            { 
              icon: "book", 
              title: "מדריכים מעמיקים", 
              description: "בממוצע 1500+ מילים לכל מדריך",
            },
            { 
              icon: "globe", 
              title: "17 שפות", 
              description: "קראו בשפת האם שלכם",
            },
          ],
          testimonial: '"המדריך המפורט ביותר לדובאי שמצאתי" - TripAdvisor',
        },
        sortOrder: 3,
      },
      {
        sectionKey: "attractions",
        sectionType: "content_grid",
        title: "Top Attractions in Dubai",
        titleHe: "האטרקציות המובילות בדובאי",
        buttonText: "View All",
        buttonTextHe: "צפו בהכל",
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
        titleHe: "גלו את דובאי לפי אזורים",
        buttonText: "View All Districts",
        buttonTextHe: "צפו בכל האזורים",
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
        titleHe: "היכן להתארח בדובאי",
        buttonText: "View All",
        buttonTextHe: "צפו בהכל",
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
          filters: ["הכל", "יוקרה 5*", "טווח ביניים", "תקציב", "חוף", "עיר"],
        },
        sortOrder: 6,
      },
      {
        sectionKey: "dining",
        sectionType: "content_grid",
        title: "Best Restaurants in Dubai",
        titleHe: "המסעדות הטובות ביותר בדובאי",
        buttonText: "View All",
        buttonTextHe: "צפו בהכל",
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
          filters: ["הכל", "מסעדות יוקרה", "קז'ואל", "ארוחות בראנץ'", "אוכל רחוב"],
        },
        sortOrder: 7,
      },
      {
        sectionKey: "articles",
        sectionType: "content_grid",
        title: "Dubai Travel Tips & News",
        titleHe: "טיפים וחדשות נסיעות לדובאי",
        buttonText: "View All",
        buttonTextHe: "צפו בהכל",
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
          sidebarTitle: "מדריכים פופולריים",
          statsTitle: "עובדות מהירות על דובאי",
          stats: [
            { label: "מבקרים שנתיים", value: "17.15M+" },
            { label: "המגדל הגבוה בעולם", value: "828 מטר" },
            { label: "שמש כל השנה", value: "340+ ימים" },
            { label: "לאומים גרים", value: "200+" },
          ],
        },
        sortOrder: 8,
      },
      {
        sectionKey: "events",
        sectionType: "content_grid",
        title: "What's Happening in Dubai",
        titleHe: "מה קורה בדובאי",
        buttonText: "View All Events",
        buttonTextHe: "צפו בכל האירועים",
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
          sectionTitle: "השבוע",
        },
        sortOrder: 9,
      },
      {
        sectionKey: "newsletter",
        sectionType: "newsletter",
        title: "Get Weekly Dubai Tips & Deals",
        titleHe: "קבלו טיפים ועסקאות שבועיות לדובאי",
        subtitle: "Join 50,000+ travelers who get our free guide",
        subtitleHe: "הצטרפו ל-50,000+ מטיילים שמקבלים את המדריך החינמי שלנו",
        buttonText: "Subscribe",
        buttonTextHe: "הירשמו",
        data: {
          placeholder: "Enter your email",
          successMessage: "Thanks for subscribing!",
          benefits: [
            "Weekly insider tips",
            "Exclusive deals",
            "New attraction alerts",
          ],
        },
        dataHe: {
          placeholder: "הזינו את האימייל שלכם",
          successMessage: "תודה שנרשמתם!",
          benefits: [
            "טיפים שבועיים מבפנים",
            "עסקאות בלעדיות",
            "התראות על אטרקציות חדשות",
          ],
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

    console.log(`[Seed] Homepage created with ${sectionsData.length} sections`);
    return { 
      success: true, 
      message: `Homepage created with ${sectionsData.length} sections`,
      pageId: page.id 
    };
  } catch (error) {
    console.error("[Seed] Error seeding homepage:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export async function seedCategoryPage(type: "hotels" | "dining" | "districts" | "shopping"): Promise<{ success: boolean; message: string; pageId?: string }> {
  const categoryConfig: Record<string, { 
    title: string; 
    titleHe: string; 
    metaTitle: string; 
    metaTitleHe: string;
    metaDescription: string;
    metaDescriptionHe: string;
  }> = {
    hotels: {
      title: "Hotels in Dubai",
      titleHe: "מלונות בדובאי",
      metaTitle: "Best Hotels in Dubai | Luxury to Budget Stays | Travi",
      metaTitleHe: "המלונות הטובים ביותר בדובאי | מיוקרה ועד תקציב | טראווי",
      metaDescription: "Find the perfect hotel in Dubai. From luxury 5-star resorts to budget-friendly options, explore our curated selection.",
      metaDescriptionHe: "מצאו את המלון המושלם בדובאי. מאתרי נופש יוקרתיים של 5 כוכבים ועד אפשרויות ידידותיות לתקציב.",
    },
    dining: {
      title: "Restaurants in Dubai",
      titleHe: "מסעדות בדובאי",
      metaTitle: "Best Restaurants in Dubai | Fine Dining to Street Food | Travi",
      metaTitleHe: "המסעדות הטובות ביותר בדובאי | מסעדות יוקרה ועד אוכל רחוב | טראווי",
      metaDescription: "Discover Dubai's culinary scene. From Michelin-starred restaurants to hidden gems and street food.",
      metaDescriptionHe: "גלו את סצנת הקולינריה של דובאי. ממסעדות עם כוכבי מישלן ועד פנינים נסתרות ואוכל רחוב.",
    },
    districts: {
      title: "Districts in Dubai",
      titleHe: "אזורים בדובאי",
      metaTitle: "Dubai Districts Guide | Neighborhoods & Areas | Travi",
      metaTitleHe: "מדריך אזורי דובאי | שכונות ואזורים | טראווי",
      metaDescription: "Explore Dubai's diverse neighborhoods. From Downtown to Dubai Marina, discover what each area has to offer.",
      metaDescriptionHe: "גלו את השכונות המגוונות של דובאי. מדאון טאון ועד דובאי מרינה, גלו מה כל אזור מציע.",
    },
    shopping: {
      title: "Shopping in Dubai",
      titleHe: "קניות בדובאי",
      metaTitle: "Shopping in Dubai | Malls, Souks & Boutiques | Travi",
      metaTitleHe: "קניות בדובאי | קניונים, שווקים ובוטיקים | טראווי",
      metaDescription: "Your guide to shopping in Dubai. From mega malls to traditional souks and designer boutiques.",
      metaDescriptionHe: "המדריך שלכם לקניות בדובאי. מקניונים ענקיים ועד שווקים מסורתיים ובוטיקים של מעצבים.",
    },
  };

  const config = categoryConfig[type];
  if (!config) {
    return { success: false, message: `Unknown category type: ${type}` };
  }

  try {
    const existingPage = await db.select()
      .from(editablePages)
      .where(eq(editablePages.slug, type))
      .limit(1);

    if (existingPage.length > 0) {
      return { 
        success: true, 
        message: `${type} page already exists, skipping seed`,
        pageId: existingPage[0].id 
      };
    }

    const [page] = await db.insert(editablePages)
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

    console.log(`[Seed] ${type} category page created`);
    return { 
      success: true, 
      message: `${type} category page created successfully`,
      pageId: page.id 
    };
  } catch (error) {
    console.error(`[Seed] Error seeding ${type} page:`, error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

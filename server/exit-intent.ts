/**
 * Exit Intent Popup System
 *
 * Intelligent popups that appear when user is about to leave:
 * - Personalized offers based on content viewed
 * - Newsletter subscription
 * - Special deals
 * - Related content suggestions
 */

import { db } from "./db";
import { contents } from "@shared/schema";
import { eq } from "drizzle-orm";

// ============================================================================
// POPUP TYPES
// ============================================================================

export interface ExitPopup {
  id: string;
  type: "newsletter" | "offer" | "related" | "download" | "feedback" | "custom";
  trigger: "exit" | "scroll" | "time" | "inactive";
  triggerValue?: number; // scroll %, seconds, inactive seconds

  // Content
  title: string;
  titleHe: string;
  subtitle?: string;
  subtitleHe?: string;
  image?: string;

  // Call to action
  ctaText: string;
  ctaTextHe: string;
  ctaUrl?: string;
  ctaAction?: "submit" | "redirect" | "close";

  // Secondary action
  secondaryText?: string;
  secondaryTextHe?: string;

  // Styling
  style: "modal" | "slide-in" | "banner" | "corner";
  position?: "center" | "bottom" | "top" | "bottom-right";
  backgroundColor?: string;
  accentColor?: string;

  // Targeting
  targetPages?: string[]; // specific slugs or patterns
  targetContentTypes?: string[];
  excludePages?: string[];
  showOnce?: boolean;
  cooldownHours?: number;

  // Form fields (for newsletter type)
  formFields?: Array<{
    name: string;
    label: string;
    labelHe: string;
    type: "email" | "text" | "select";
    required: boolean;
    options?: string[];
  }>;

  // Analytics
  impressions?: number;
  conversions?: number;
  conversionRate?: number;

  isActive: boolean;
  priority: number;
}

// ============================================================================
// DEFAULT POPUPS
// ============================================================================

const defaultPopups: ExitPopup[] = [
  // Newsletter popup
  {
    id: "newsletter-exit",
    type: "newsletter",
    trigger: "exit",
    title: "Don't Miss Dubai's Best Tips!",
    titleHe: "",
    subtitle: "Get exclusive deals and insider guides delivered to your inbox",
    subtitleHe: "",
    ctaText: "Subscribe Now",
    ctaTextHe: "",
    ctaAction: "submit",
    secondaryText: "No thanks, I'll miss out",
    secondaryTextHe: "",
    style: "modal",
    position: "center",
    backgroundColor: "#ffffff",
    accentColor: "#e53935",
    formFields: [
      { name: "email", label: "Email", labelHe: "", type: "email", required: true },
      { name: "name", label: "First Name", labelHe: "", type: "text", required: false },
    ],
    showOnce: true,
    cooldownHours: 72,
    isActive: true,
    priority: 100,
  },

  // Hotel deal popup
  {
    id: "hotel-deal-exit",
    type: "offer",
    trigger: "exit",
    title: "Wait! Get 15% Off Your Hotel",
    titleHe: "",
    subtitle: "Use code DUBAI15 at checkout",
    subtitleHe: "",
    image: "/images/popups/hotel-deal.jpg",
    ctaText: "Get My Discount",
    ctaTextHe: "",
    ctaUrl: "/hotels?promo=DUBAI15",
    ctaAction: "redirect",
    secondaryText: "Maybe later",
    secondaryTextHe: "",
    style: "modal",
    position: "center",
    backgroundColor: "#1a237e",
    accentColor: "#ffc107",
    targetContentTypes: ["hotel"],
    showOnce: true,
    cooldownHours: 48,
    isActive: true,
    priority: 90,
  },

  // Related content popup
  {
    id: "related-content-exit",
    type: "related",
    trigger: "exit",
    title: "Before You Go...",
    titleHe: "",
    subtitle: "Check out these popular articles",
    subtitleHe: "",
    ctaText: "Keep Reading",
    ctaTextHe: "",
    ctaAction: "close",
    style: "slide-in",
    position: "bottom-right",
    targetContentTypes: ["article"],
    showOnce: false,
    cooldownHours: 24,
    isActive: true,
    priority: 70,
  },

  // Attraction ticket popup
  {
    id: "attraction-tickets-exit",
    type: "offer",
    trigger: "exit",
    title: "Skip the Lines!",
    titleHe: "",
    subtitle: "Book tickets online and save time",
    subtitleHe: "",
    ctaText: "Get Tickets",
    ctaTextHe: "",
    ctaAction: "redirect",
    style: "corner",
    position: "bottom-right",
    accentColor: "#43a047",
    targetContentTypes: ["attraction"],
    showOnce: true,
    cooldownHours: 24,
    isActive: true,
    priority: 85,
  },

  // Download guide popup
  {
    id: "guide-download-exit",
    type: "download",
    trigger: "exit",
    title: "Free Dubai Travel Guide",
    titleHe: "",
    subtitle: "100+ insider tips in one PDF",
    subtitleHe: "",
    ctaText: "Download Free Guide",
    ctaTextHe: "",
    ctaAction: "submit",
    style: "modal",
    backgroundColor: "#00695c",
    formFields: [{ name: "email", label: "Email", labelHe: "", type: "email", required: true }],
    targetContentTypes: ["article", "itinerary"],
    showOnce: true,
    cooldownHours: 168, // 1 week
    isActive: true,
    priority: 75,
  },

  // Scroll-triggered newsletter
  {
    id: "scroll-newsletter",
    type: "newsletter",
    trigger: "scroll",
    triggerValue: 70, // 70% scroll
    title: "Enjoying This Article?",
    titleHe: "",
    subtitle: "Get more like this in your inbox",
    subtitleHe: "",
    ctaText: "Subscribe",
    ctaTextHe: "",
    ctaAction: "submit",
    style: "banner",
    position: "bottom",
    formFields: [
      { name: "email", label: "Your email", labelHe: "", type: "email", required: true },
    ],
    targetContentTypes: ["article"],
    showOnce: true,
    cooldownHours: 24,
    isActive: true,
    priority: 60,
  },
];

// ============================================================================
// EXIT INTENT MANAGER
// ============================================================================

export const exitIntent = {
  /**
   * Get all popups (from config/database)
   */
  async getAllPopups(): Promise<ExitPopup[]> {
    // In production, load from database
    // For now, return defaults
    return defaultPopups.filter(p => p.isActive);
  },

  /**
   * Get popup for specific content
   */
  async getPopupForContent(
    contentId: string,
    trigger: ExitPopup["trigger"] = "exit",
    viewedPopups: string[] = []
  ): Promise<ExitPopup | null> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content) return null;

    const allPopups = await this.getAllPopups();

    // Filter applicable popups
    const applicablePopups = allPopups.filter(popup => {
      // Check trigger type
      if (popup.trigger !== trigger) return false;

      // Check if already viewed (if showOnce)
      if (popup.showOnce && viewedPopups.includes(popup.id)) return false;

      // Check content type targeting
      if (popup.targetContentTypes && popup.targetContentTypes.length > 0) {
        if (!popup.targetContentTypes.includes(content.type)) return false;
      }

      // Check page exclusions
      if (popup.excludePages && popup.excludePages.length > 0) {
        if (popup.excludePages.includes(content.slug)) return false;
      }

      // Check specific page targeting
      if (popup.targetPages && popup.targetPages.length > 0) {
        const matches = popup.targetPages.some(pattern => {
          if (pattern.includes("*")) {
            const regex = new RegExp(pattern.replaceAll("*", ".*"));
            return regex.test(content.slug);
          }
          return pattern === content.slug;
        });
        if (!matches) return false;
      }

      return true;
    });

    // Sort by priority and return highest
    applicablePopups.sort((a, b) => b.priority - a.priority);
    return applicablePopups[0] || null;
  },

  /**
   * Get popup configuration for client-side
   */
  async getClientConfig(
    contentId: string,
    locale: string = "en"
  ): Promise<{
    popups: Array<{
      id: string;
      trigger: ExitPopup["trigger"];
      triggerValue?: number;
      content: {
        title: string;
        subtitle?: string;
        ctaText: string;
        secondaryText?: string;
        image?: string;
      };
      style: ExitPopup["style"];
      position?: string;
      colors: {
        background?: string;
        accent?: string;
      };
      formFields?: ExitPopup["formFields"];
      cooldownHours: number;
    }>;
  }> {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
    if (!content) return { popups: [] };

    const allPopups = await this.getAllPopups();
    const isHebrew = locale === "he";

    const applicablePopups = allPopups
      .filter(popup => {
        if (popup.targetContentTypes && popup.targetContentTypes.length > 0) {
          if (!popup.targetContentTypes.includes(content.type)) return false;
        }
        return true;
      })
      .map(popup => ({
        id: popup.id,
        trigger: popup.trigger,
        triggerValue: popup.triggerValue,
        content: {
          title: isHebrew ? popup.titleHe : popup.title,
          subtitle: isHebrew ? popup.subtitleHe : popup.subtitle,
          ctaText: isHebrew ? popup.ctaTextHe : popup.ctaText,
          secondaryText: isHebrew ? popup.secondaryTextHe : popup.secondaryText,
          image: popup.image,
        },
        style: popup.style,
        position: popup.position,
        colors: {
          background: popup.backgroundColor,
          accent: popup.accentColor,
        },
        formFields: popup.formFields?.map(f => ({
          ...f,
          label: isHebrew ? f.labelHe : f.label,
        })),
        cooldownHours: popup.cooldownHours || 24,
      }));

    return { popups: applicablePopups };
  },

  /**
   * Track popup impression
   */
  async trackImpression(popupId: string): Promise<void> {
    // In production, update database
    const popup = defaultPopups.find(p => p.id === popupId);
    if (popup) {
      popup.impressions = (popup.impressions || 0) + 1;
    }
  },

  /**
   * Track popup conversion
   */
  async trackConversion(popupId: string, data?: Record<string, any>): Promise<void> {
    const popup = defaultPopups.find(p => p.id === popupId);
    if (popup) {
      popup.conversions = (popup.conversions || 0) + 1;
      popup.conversionRate = popup.impressions
        ? Math.round((popup.conversions / popup.impressions) * 100)
        : 0;
    }
  },

  /**
   * Get popup analytics
   */
  async getAnalytics(): Promise<
    Array<{
      id: string;
      title: string;
      impressions: number;
      conversions: number;
      conversionRate: number;
    }>
  > {
    return defaultPopups
      .filter(p => p.impressions && p.impressions > 0)
      .map(p => ({
        id: p.id,
        title: p.title,
        impressions: p.impressions || 0,
        conversions: p.conversions || 0,
        conversionRate: p.conversionRate || 0,
      }))
      .sort((a, b) => b.impressions - a.impressions);
  },

  /**
   * Create custom popup
   */
  async createPopup(
    popup: Omit<ExitPopup, "id" | "impressions" | "conversions" | "conversionRate">
  ): Promise<ExitPopup> {
    const newPopup: ExitPopup = {
      ...popup,
      id: `popup_${Date.now()}`,
      impressions: 0,
      conversions: 0,
      conversionRate: 0,
    };
    defaultPopups.push(newPopup);
    return newPopup;
  },

  /**
   * Update popup
   */
  async updatePopup(id: string, updates: Partial<ExitPopup>): Promise<ExitPopup | null> {
    const popup = defaultPopups.find(p => p.id === id);
    if (!popup) return null;

    Object.assign(popup, updates);
    return popup;
  },

  /**
   * Delete popup
   */
  async deletePopup(id: string): Promise<boolean> {
    const index = defaultPopups.findIndex(p => p.id === id);
    if (index === -1) return false;

    defaultPopups.splice(index, 1);
    return true;
  },
};

export default exitIntent;

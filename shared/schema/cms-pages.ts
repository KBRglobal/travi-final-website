import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { pageLayoutStatusEnum, homepageSectionEnum, realEstatePageCategoryEnum } from "./enums";
import type { StaticPageTranslation } from "./types";

// ============================================================================
// PAGE LAYOUTS - VISUAL PAGE BUILDER SYSTEM
// ============================================================================

export const pageLayouts = pgTable("page_layouts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  slug: varchar("slug").notNull().unique(), // e.g., "public-attractions", "district-downtown"
  title: text("title"),
  // Published components (what visitors see)
  components: jsonb("components")
    .$type<
      Array<{
        id: string;
        type: string;
        order: number;
        parentId?: string;
        props: Record<string, any>;
      }>
    >()
    .default([]),
  // Draft components (what editors are working on)
  draftComponents: jsonb("draft_components").$type<
    Array<{
      id: string;
      type: string;
      order: number;
      parentId?: string;
      props: Record<string, any>;
    }>
  >(),
  status: pageLayoutStatusEnum("status").default("draft"),
  publishedAt: timestamp("published_at"),
  draftUpdatedAt: timestamp("draft_updated_at"),
  createdBy: varchar("created_by"),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPageLayoutSchema = createInsertSchema(pageLayouts);

export type PageLayout = typeof pageLayouts.$inferSelect;
export type InsertPageLayout = z.infer<typeof insertPageLayoutSchema>;

// ============================================================================
// HOMEPAGE PROMOTIONS - CONTENT PROMOTIONS ON HOMEPAGE
// ============================================================================

export const homepagePromotions = pgTable("homepage_promotions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  section: homepageSectionEnum("section").notNull(),
  contentId: varchar("content_id"),
  position: integer("position").default(0),
  isActive: boolean("is_active").default(true),
  customTitle: text("custom_title"),
  customImage: text("custom_image"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHomepagePromotionSchema = createInsertSchema(homepagePromotions);

export type HomepagePromotion = typeof homepagePromotions.$inferSelect;
export type InsertHomepagePromotion = z.infer<typeof insertHomepagePromotionSchema>;

// ============================================================================
// REAL ESTATE PAGES - CMS FOR REAL ESTATE CONTENT
// ============================================================================

export const realEstatePages = pgTable(
  "real_estate_pages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    pageKey: varchar("page_key").notNull().unique(),
    category: realEstatePageCategoryEnum("category").notNull(),
    title: text("title").notNull(),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    heroTitle: text("hero_title"),
    heroSubtitle: text("hero_subtitle"),
    introText: text("intro_text"),
    sections: jsonb("sections")
      .$type<
        Array<{
          id: string;
          type: string;
          title?: string;
          content?: string;
          data?: unknown;
        }>
      >()
      .default([]),
    faqs: jsonb("faqs")
      .$type<
        Array<{
          question: string;
          answer: string;
        }>
      >()
      .default([]),
    relatedLinks: jsonb("related_links")
      .$type<
        Array<{
          title: string;
          path: string;
          description?: string;
        }>
      >()
      .default([]),
    isActive: boolean("is_active").notNull().default(true),
    lastEditedBy: varchar("last_edited_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_real_estate_pages_category").on(table.category),
    index("IDX_real_estate_pages_active").on(table.isActive),
  ]
);

export const insertRealEstatePageSchema = createInsertSchema(realEstatePages);

export type RealEstatePage = typeof realEstatePages.$inferSelect;
export type InsertRealEstatePage = z.infer<typeof insertRealEstatePageSchema>;

// ============================================================================
// SITE CONFIGURATION - FULLY EDITABLE CMS NAVIGATION & FOOTER
// ============================================================================

// Navigation Menus
export const navigationMenus = pgTable("navigation_menus", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  location: text("location").notNull().default("header"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNavigationMenuSchema = createInsertSchema(navigationMenus);

export type NavigationMenu = typeof navigationMenus.$inferSelect;
export type InsertNavigationMenu = z.infer<typeof insertNavigationMenuSchema>;

// Navigation Menu Items
export const navigationMenuItems = pgTable(
  "navigation_menu_items",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    menuId: varchar("menu_id").notNull(),
    parentId: varchar("parent_id"),
    label: text("label").notNull(),
    labelHe: text("label_he"),
    href: text("href").notNull(),
    icon: text("icon"),
    openInNewTab: boolean("open_in_new_tab").default(false),
    isHighlighted: boolean("is_highlighted").default(false),
    highlightStyle: text("highlight_style"),
    sortOrder: integer("sort_order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_nav_menu_items_menu").on(table.menuId),
    index("IDX_nav_menu_items_parent").on(table.parentId),
    index("IDX_nav_menu_items_order").on(table.sortOrder),
  ]
);

export const insertNavigationMenuItemSchema = createInsertSchema(navigationMenuItems);

export type NavigationMenuItem = typeof navigationMenuItems.$inferSelect;
export type InsertNavigationMenuItem = z.infer<typeof insertNavigationMenuItemSchema>;

// Footer Sections
export const footerSections = pgTable(
  "footer_sections",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    titleHe: text("title_he"),
    slug: varchar("slug").notNull().unique(),
    sortOrder: integer("sort_order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [index("IDX_footer_sections_order").on(table.sortOrder)]
);

export const insertFooterSectionSchema = createInsertSchema(footerSections);

export type FooterSection = typeof footerSections.$inferSelect;
export type InsertFooterSection = z.infer<typeof insertFooterSectionSchema>;

// Footer Links
export const footerLinks = pgTable(
  "footer_links",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sectionId: varchar("section_id").notNull(),
    label: text("label").notNull(),
    labelHe: text("label_he"),
    href: text("href").notNull(),
    icon: text("icon"),
    openInNewTab: boolean("open_in_new_tab").default(false),
    sortOrder: integer("sort_order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_footer_links_section").on(table.sectionId),
    index("IDX_footer_links_order").on(table.sortOrder),
  ]
);

export const insertFooterLinkSchema = createInsertSchema(footerLinks);

export type FooterLink = typeof footerLinks.$inferSelect;
export type InsertFooterLink = z.infer<typeof insertFooterLinkSchema>;

// ============================================================================
// STATIC PAGES - TERMS, PRIVACY, ABOUT, CONTACT, ETC.
// ============================================================================

export const staticPages = pgTable(
  "static_pages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    slug: varchar("slug").notNull().unique(),
    title: text("title").notNull(),
    titleHe: text("title_he"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    content: text("content"),
    contentHe: text("content_he"),
    blocks: jsonb("blocks")
      .$type<
        Array<{
          id: string;
          type: string;
          data: unknown;
        }>
      >()
      .default([]),
    translations: jsonb("translations").$type<Record<string, StaticPageTranslation>>().default({}),
    isActive: boolean("is_active").default(true),
    showInFooter: boolean("show_in_footer").default(false),
    lastEditedBy: varchar("last_edited_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_static_pages_slug").on(table.slug),
    index("IDX_static_pages_active").on(table.isActive),
  ]
);

export const insertStaticPageSchema = createInsertSchema(staticPages);

export type StaticPage = typeof staticPages.$inferSelect;
export type InsertStaticPage = z.infer<typeof insertStaticPageSchema>;

// ============================================================================
// HOMEPAGE SECTIONS - CONTROLS STRUCTURE, ORDER, VISIBILITY
// ============================================================================

export const homepageSections = pgTable(
  "homepage_sections",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sectionKey: varchar("section_key", { length: 50 }).notNull().unique(), // immutable identifier
    title: text("title"),
    titleHe: text("title_he"),
    subtitle: text("subtitle"),
    subtitleHe: text("subtitle_he"),
    sortOrder: integer("sort_order").default(0),
    isVisible: boolean("is_visible").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_homepage_sections_key").on(table.sectionKey),
    index("IDX_homepage_sections_order").on(table.sortOrder),
  ]
);

export const insertHomepageSectionSchema = createInsertSchema(homepageSections);

export type HomepageSectionEntry = typeof homepageSections.$inferSelect;
export type InsertHomepageSectionEntry = z.infer<typeof insertHomepageSectionSchema>;

// ============================================================================
// HOMEPAGE CARDS - QUICK NAVIGATION TILES
// ============================================================================

export const homepageCards = pgTable(
  "homepage_cards",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sectionId: varchar("section_id"),
    icon: varchar("icon", { length: 50 }), // lucide icon name
    title: varchar("title", { length: 255 }),
    titleHe: text("title_he"),
    subtitle: varchar("subtitle", { length: 255 }),
    subtitleHe: text("subtitle_he"),
    linkUrl: varchar("link_url", { length: 255 }),
    sortOrder: integer("sort_order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_homepage_cards_section").on(table.sectionId),
    index("IDX_homepage_cards_order").on(table.sortOrder),
  ]
);

export const insertHomepageCardSchema = createInsertSchema(homepageCards);

export type HomepageCard = typeof homepageCards.$inferSelect;
export type InsertHomepageCard = z.infer<typeof insertHomepageCardSchema>;

// ============================================================================
// EXPERIENCE CATEGORIES - TRAVEL STYLE CATEGORIES
// ============================================================================

export const experienceCategories = pgTable(
  "experience_categories",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 255 }),
    nameHe: text("name_he"),
    description: text("description"),
    descriptionHe: text("description_he"),
    slug: varchar("slug", { length: 255 }),
    image: text("image"),
    imageAlt: text("image_alt"),
    icon: varchar("icon", { length: 50 }),
    href: varchar("href", { length: 255 }), // link URL for the category
    sortOrder: integer("sort_order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [index("IDX_experience_categories_order").on(table.sortOrder)]
);

export const insertExperienceCategorySchema = createInsertSchema(experienceCategories);

export type ExperienceCategory = typeof experienceCategories.$inferSelect;
export type InsertExperienceCategory = z.infer<typeof insertExperienceCategorySchema>;

// ============================================================================
// REGION LINKS - QUICK LINKS GRID FOR SEO (PRE-FOOTER)
// ============================================================================

export const regionLinks = pgTable(
  "region_links",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    regionName: varchar("region_name", { length: 255 }).notNull(),
    name: text("name"),
    nameHe: text("name_he"),
    icon: varchar("icon", { length: 50 }),
    linkUrl: text("link_url"),
    links: jsonb("links").$type<Array<{ name: string; slug: string }>>().default([]),
    destinations: jsonb("destinations").$type<Array<{ name: string; slug: string }>>().default([]),
    sortOrder: integer("sort_order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [index("IDX_region_links_order").on(table.sortOrder)]
);

export const insertRegionLinkSchema = createInsertSchema(regionLinks);

export type RegionLink = typeof regionLinks.$inferSelect;
export type InsertRegionLink = z.infer<typeof insertRegionLinkSchema>;

// ============================================================================
// HERO SLIDES - HOMEPAGE CAROUSEL IMAGES
// ============================================================================

export const heroSlides = pgTable(
  "hero_slides",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    imageUrl: text("image_url").notNull(),
    imageAlt: text("image_alt"),
    headline: text("headline"),
    headlineHe: text("headline_he"),
    subheadline: text("subheadline"),
    subheadlineHe: text("subheadline_he"),
    ctaText: text("cta_text"),
    ctaTextHe: text("cta_text_he"),
    ctaLink: text("cta_link"),
    sortOrder: integer("sort_order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_hero_slides_order").on(table.sortOrder),
    index("IDX_hero_slides_active").on(table.isActive),
  ]
);

export const insertHeroSlideSchema = createInsertSchema(heroSlides);

export type HeroSlide = typeof heroSlides.$inferSelect;
export type InsertHeroSlide = z.infer<typeof insertHeroSlideSchema>;

// ============================================================================
// HOMEPAGE CTA - NEWSLETTER/CTA ZONE CONFIGURATION
// ============================================================================

export const homepageCta = pgTable("homepage_cta", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  eyebrow: text("eyebrow"),
  eyebrowHe: text("eyebrow_he"),
  headline: text("headline").notNull(),
  headlineHe: text("headline_he"),
  subheadline: text("subheadline"),
  subheadlineHe: text("subheadline_he"),
  inputPlaceholder: text("input_placeholder"),
  inputPlaceholderHe: text("input_placeholder_he"),
  buttonText: text("button_text"),
  buttonTextHe: text("button_text_he"),
  helperText: text("helper_text"),
  helperTextHe: text("helper_text_he"),
  backgroundImage: text("background_image"),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHomepageCtaSchema = createInsertSchema(homepageCta);

export type HomepageCta = typeof homepageCta.$inferSelect;
export type InsertHomepageCta = z.infer<typeof insertHomepageCtaSchema>;

// ============================================================================
// HOMEPAGE SEO META - SEO CONFIGURATION FOR HOMEPAGE
// ============================================================================

export const homepageSeoMeta = pgTable("homepage_seo_meta", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  metaTitle: text("meta_title"),
  metaTitleHe: text("meta_title_he"),
  metaDescription: text("meta_description"),
  metaDescriptionHe: text("meta_description_he"),
  metaKeywords: text("meta_keywords"),
  ogTitle: text("og_title"),
  ogTitleHe: text("og_title_he"),
  ogDescription: text("og_description"),
  ogDescriptionHe: text("og_description_he"),
  ogImage: text("og_image"),
  canonicalUrl: text("canonical_url"),
  robotsMeta: text("robots_meta").default("index, follow"),
  schemaEnabled: boolean("schema_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHomepageSeoMetaSchema = createInsertSchema(homepageSeoMeta);

export type HomepageSeoMeta = typeof homepageSeoMeta.$inferSelect;
export type InsertHomepageSeoMeta = z.infer<typeof insertHomepageSeoMetaSchema>;

// ============================================================================
// PAGE BUILDER SYSTEM - UNIVERSAL SECTION EDITOR
// ============================================================================

// Editable Pages - defines which pages can be edited via page builder
export const editablePages = pgTable(
  "editable_pages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    pageType: varchar("page_type", { length: 50 }).notNull(), // home, category, static, landing
    title: text("title").notNull(),
    titleHe: text("title_he"),
    metaTitle: text("meta_title"),
    metaTitleHe: text("meta_title_he"),
    metaDescription: text("meta_description"),
    metaDescriptionHe: text("meta_description_he"),
    isPublished: boolean("is_published").default(false),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    lastEditedBy: varchar("last_edited_by"),
  },
  table => [
    uniqueIndex("IDX_editable_pages_slug").on(table.slug),
    index("IDX_editable_pages_type").on(table.pageType),
  ]
);

export const insertEditablePageSchema = createInsertSchema(editablePages);

export type EditablePage = typeof editablePages.$inferSelect;
export type InsertEditablePage = z.infer<typeof insertEditablePageSchema>;

// Page Sections - stores all editable sections for any page
export const pageSections = pgTable(
  "page_sections",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    pageId: varchar("page_id").notNull(),
    sectionType: text("section_type").notNull(),
    sectionKey: varchar("section_key", { length: 100 }), // unique key within page for easy reference

    // Content - English
    title: text("title"),
    subtitle: text("subtitle"),
    description: text("description"),
    buttonText: text("button_text"),
    buttonLink: text("button_link"),

    // Content - Hebrew
    titleHe: text("title_he"),
    subtitleHe: text("subtitle_he"),
    descriptionHe: text("description_he"),
    buttonTextHe: text("button_text_he"),

    // Media
    backgroundImage: text("background_image"),
    backgroundVideo: text("background_video"),
    images: jsonb("images").$type<string[]>().default([]),

    // Flexible data for complex sections
    data: jsonb("data").$type<Record<string, unknown>>().default({}),
    dataHe: jsonb("data_he").$type<Record<string, unknown>>().default({}),

    // Styling
    backgroundColor: varchar("background_color", { length: 50 }),
    textColor: varchar("text_color", { length: 50 }),
    customCss: text("custom_css"),
    animation: varchar("animation", { length: 50 }),

    // Layout
    sortOrder: integer("sort_order").default(0),
    isVisible: boolean("is_visible").default(true),
    showOnMobile: boolean("show_on_mobile").default(true),
    showOnDesktop: boolean("show_on_desktop").default(true),

    // Metadata
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    lastEditedBy: varchar("last_edited_by"),
  },
  table => [
    index("IDX_page_sections_page").on(table.pageId),
    index("IDX_page_sections_order").on(table.pageId, table.sortOrder),
    index("IDX_page_sections_key").on(table.pageId, table.sectionKey),
  ]
);

export const insertPageSectionSchema = createInsertSchema(pageSections);

export type PageSection = typeof pageSections.$inferSelect;
export type InsertPageSection = z.infer<typeof insertPageSectionSchema>;

// Section Versions - version history for undo/redo
export const sectionVersions = pgTable(
  "section_versions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sectionId: varchar("section_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    changedBy: varchar("changed_by"),
    changeDescription: text("change_description"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_section_versions_section").on(table.sectionId),
    index("IDX_section_versions_number").on(table.sectionId, table.versionNumber),
  ]
);

export const insertSectionVersionSchema = createInsertSchema(sectionVersions);

export type SectionVersion = typeof sectionVersions.$inferSelect;
export type InsertSectionVersion = z.infer<typeof insertSectionVersionSchema>;

// ============================================================================
// RELATIONS
// ============================================================================

export const editablePagesRelations = relations(editablePages, ({ many }) => ({
  sections: many(pageSections),
}));

export const pageSectionsRelations = relations(pageSections, ({ one, many }) => ({
  page: one(editablePages, { fields: [pageSections.pageId], references: [editablePages.id] }),
  versions: many(sectionVersions),
}));

export const sectionVersionsRelations = relations(sectionVersions, ({ one }) => ({
  section: one(pageSections, {
    fields: [sectionVersions.sectionId],
    references: [pageSections.id],
  }),
}));

// ============================================================================
// SECTION TYPES CONFIGURATION
// ============================================================================

export const SECTION_TYPES = {
  hero: {
    name: "Hero",
    description: "Large banner with title, subtitle, background image",
    fields: ["title", "subtitle", "buttonText", "buttonLink", "backgroundImage"],
  },
  intro_text: {
    name: "Introduction",
    description: "Introductory text block with optional image",
    fields: ["title", "description", "images"],
  },
  highlight_grid: {
    name: "Highlight Grid",
    description: "Grid of highlighted items/features",
    fields: ["title", "data"],
  },
  filter_bar: {
    name: "Filter Bar",
    description: "Category filter buttons",
    fields: ["data"],
  },
  content_grid: {
    name: "Content Grid",
    description: "Grid of content cards",
    fields: ["title", "subtitle", "data"],
  },
  cta: {
    name: "Call to Action",
    description: "Call to action block",
    fields: ["title", "subtitle", "buttonText", "buttonLink", "backgroundImage"],
  },
  faq: {
    name: "FAQ",
    description: "Frequently asked questions accordion",
    fields: ["title", "data"],
  },
  testimonial: {
    name: "Testimonials",
    description: "Customer testimonials/reviews",
    fields: ["title", "data"],
  },
  gallery: {
    name: "Image Gallery",
    description: "Image gallery or carousel",
    fields: ["title", "images"],
  },
  stats: {
    name: "Statistics",
    description: "Key numbers/statistics display",
    fields: ["data"],
  },
  features: {
    name: "Features",
    description: "Feature list with icons",
    fields: ["title", "data"],
  },
  text_image: {
    name: "Text + Image",
    description: "Two-column text and image layout",
    fields: ["title", "description", "images", "data"],
  },
  video: {
    name: "Video",
    description: "Embedded video section",
    fields: ["title", "data"],
  },
  newsletter: {
    name: "Newsletter",
    description: "Newsletter signup form",
    fields: ["title", "subtitle", "buttonText"],
  },
  custom: {
    name: "Custom HTML",
    description: "Custom HTML/code block",
    fields: ["data"],
  },
} as const;

export type SectionTypeName = keyof typeof SECTION_TYPES;

/**
 * Homepage Components
 *
 * Decomposed modules from homepage.tsx and editorial zone components.
 */

// Core layout components
export { AnimatedSection } from "./animated-section";
export { LoadingScreen } from "./loading-screen";
export { HomepageHeader } from "./homepage-header";

// Major sections
export { SplitHero } from "./split-hero";
export { CategoriesSection } from "./categories-section";
export { FAQSection } from "./faq-section";
export { TraviMascotHelper } from "./travi-mascot-helper";

// Editorial Zones
export { EditorialHero } from "./EditorialHero";
export { EditorialSecondary } from "./EditorialSecondary";
export { EditorialNewsGrid } from "./EditorialNewsGrid";
export { TrendingSection } from "./TrendingSection";

// Existing components
export { NewsletterSection } from "./NewsletterSection";

// Shared data and types
export type {
  HomepageConfig,
  HomepageSectionConfig,
  ExperienceCategory,
  RegionLink,
  FeaturedDestination,
  CTAConfig,
  SEOMetaConfig,
} from "./homepage-data";

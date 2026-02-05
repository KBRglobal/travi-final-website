/**
 * Page Renderers Index - Export all page rendering functions
 */

// Homepage
export { renderHomepage } from "./homepage";

// Static pages
export { renderStaticPage } from "./static-pages";

// Error pages
export { render404 } from "./error-pages";

// Content pages (articles, hotels, etc.)
export { renderContentPage, renderCategoryPage } from "./content-pages";

// Destinations
export {
  renderDestinationsHub,
  renderDestinationPage,
  renderDestinationSubpage,
} from "./destinations";

// Guides
export { renderGuidesHub, renderGuidePage, renderDestinationGuideFallback } from "./guides";

// Attractions (Tiqets)
export { renderTiqetsAttractionPage } from "./attractions";

// Hub pages (news, events, shopping, districts)
export {
  renderNewsHub,
  renderEventsHub,
  renderShoppingHub,
  renderDistrictsHub,
  renderDistrictPage,
  renderRestaurantPage,
  renderEventPage,
} from "./hub-pages";

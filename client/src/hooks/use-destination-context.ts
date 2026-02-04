/**
 * Destination Context Hook
 * Determines current destination from URL and provides destination-aware navigation logic
 *
 * Supports destination-specific content (e.g., Dubai real estate, districts)
 * while maintaining a destination-agnostic architecture.
 */

import { useLocation } from "wouter";
import { useMemo } from "react";

export interface DestinationContext {
  currentDestination: string | null;
  destinationSlug: string | null;
  isDestinationPage: boolean;
  /** True if current route has destination-specific content */
  hasDestinationContent: boolean;
  /** The destination that owns the current route (if destination-specific) */
  routeDestination: string | null;
  /** @deprecated Use destinationSlug === 'dubai' instead */
  isDubai: boolean;
  /** @deprecated Use isDestinationSpecificRoute() instead */
  isDubaiOnlyRoute: boolean;
}

/**
 * Destination-specific routes mapping
 * Routes that belong to a specific destination and show that destination's sub-nav
 */
export const DESTINATION_SPECIFIC_ROUTES: Record<string, string[]> = {
  dubai: [
  // Districts
  "/districts",
  // Real Estate
  "/dubai-real-estate",
  "/dubai-off-plan-properties",
  "/dubai-off-plan-investment-guide",
  "/how-to-buy-dubai-off-plan",
  "/dubai-off-plan-payment-plans",
  "/best-off-plan-projects-dubai-2026",
  "/dubai-off-plan-business-bay",
  "/dubai-off-plan-marina",
  "/dubai-off-plan-jvc",
  "/dubai-off-plan-palm-jumeirah",
  "/dubai-off-plan-creek-harbour",
  "/dubai-off-plan-al-furjan",
  "/dubai-off-plan-villas",
  "/off-plan-emaar",
  "/off-plan-damac",
  "/off-plan-nakheel",
  "/off-plan-meraas",
  "/off-plan-sobha",
  "/off-plan-crypto-payments",
  "/off-plan-usdt",
  "/off-plan-golden-visa",
  "/off-plan-post-handover",
  "/off-plan-escrow",
  "/off-plan-vs-ready",
  // Tools
  "/tools-roi-calculator",
  "/tools-payment-calculator",
  "/tools-affordability-calculator",
  "/tools-currency-converter",
  "/tools-mortgage-calculator",
  "/tools-rental-yield-calculator",
  "/tools-fees-calculator",
  // Landing pages
  "/dubai/free-things-to-do",
  "/dubai/laws-for-tourists",
  "/dubai/sheikh-mohammed-bin-rashid",
  "/dubai/24-hours-open",
  // Case studies
  "/case-study-jvc-investor",
  "/case-study-crypto-buyer",
  "/case-study-golden-visa",
  "/case-study-expat-family",
  "/case-study-investor-flip",
  "/case-study-portfolio-diversification",
  "/case-study-off-plan-launch",
  "/case-study-retirement-planning",
  // Pillar articles
  "/dubai-roi-rental-yields",
  "/dubai-legal-security-guide",
  // Compare pages
  "/compare-off-plan-vs-ready",
  "/compare-jvc-vs-dubai-south",
  "/compare-emaar-vs-damac",
  "/compare-downtown-vs-marina",
  "/compare-60-40-vs-80-20",
  "/compare-sobha-vs-meraas",
  "/compare-crypto-vs-bank-transfer",
  "/compare-business-bay-vs-jlt",
  "/compare-new-vs-resale",
  "/compare-nakheel-vs-azizi",
  "/compare-villa-vs-apartment",
  "/compare-studio-vs-1bed",
  // Shopping (Dubai only)
    "/shopping",
  ],
  // Add other destinations here as they get specific content:
  // paris: ["/paris-arrondissements", ...],
  // tokyo: ["/tokyo-districts", ...],
};

// Legacy export for backward compatibility
export const DUBAI_ONLY_ROUTES = DESTINATION_SPECIFIC_ROUTES.dubai || [];

/**
 * Find which destination owns a given route
 */
function getRouteDestination(path: string): string | null {
  const normalizedPath = path.toLowerCase();
  for (const [destination, routes] of Object.entries(DESTINATION_SPECIFIC_ROUTES)) {
    if (routes.some(route =>
      normalizedPath === route.toLowerCase() ||
      normalizedPath.startsWith(route.toLowerCase() + "/")
    )) {
      return destination;
    }
  }
  return null;
}

// Map destination slugs to display names
export const DESTINATION_NAMES: Record<string, string> = {
  dubai: "Dubai",
  bangkok: "Bangkok",
  paris: "Paris",
  istanbul: "Istanbul",
  london: "London",
  nyc: "New York",
  singapore: "Singapore",
  tokyo: "Tokyo",
  barcelona: "Barcelona",
  rome: "Rome",
  amsterdam: "Amsterdam",
  "hong-kong": "Hong Kong",
  sydney: "Sydney",
  "los-angeles": "Los Angeles",
  miami: "Miami",
  "las-vegas": "Las Vegas",
  berlin: "Berlin",
};

export function useDestinationContext(): DestinationContext {
  const [location] = useLocation();

  return useMemo(() => {
    const path = location.toLowerCase();

    // Check if we're on a destination page (support both /destination/slug and /destinations/slug)
    const destinationMatch = path.match(/\/destinations?\/([^\/]+)/);
    const destinationSlug = destinationMatch ? destinationMatch[1] : null;

    // Check if this route belongs to a specific destination
    const routeDestination = getRouteDestination(path);
    const hasDestinationContent = routeDestination !== null;

    // Determine current destination (from URL or from route ownership)
    let currentDestination: string | null = null;
    if (destinationSlug && DESTINATION_NAMES[destinationSlug]) {
      currentDestination = DESTINATION_NAMES[destinationSlug];
    } else if (routeDestination && DESTINATION_NAMES[routeDestination]) {
      currentDestination = DESTINATION_NAMES[routeDestination];
    }

    // Legacy: isDubai for backward compatibility
    const isDubai = destinationSlug === "dubai" || routeDestination === "dubai";

    return {
      currentDestination,
      destinationSlug,
      isDestinationPage: !!destinationSlug,
      hasDestinationContent,
      routeDestination,
      // Deprecated - kept for backward compatibility
      isDubai,
      isDubaiOnlyRoute: routeDestination === "dubai",
    };
  }, [location]);
}

/**
 * Check if a route is destination-specific (belongs to a particular destination)
 */
export function isDestinationSpecificRoute(path: string): boolean {
  return getRouteDestination(path) !== null;
}

/**
 * Get which destination a route belongs to
 */
export function getRouteDestinationSlug(path: string): string | null {
  return getRouteDestination(path);
}

/**
 * @deprecated Use isDestinationSpecificRoute() or getRouteDestinationSlug() instead
 */
export function isDubaiOnlyRoute(path: string): boolean {
  return getRouteDestination(path) === "dubai";
}

/**
 * Get the destination page path for a given slug
 */
export function getDestinationPath(slug: string): string {
  return `/destinations/${slug}`;
}

/**
 * @deprecated Use getDestinationPath('dubai') instead
 */
export function getDubaiRedirectPath(): string {
  return getDestinationPath("dubai");
}

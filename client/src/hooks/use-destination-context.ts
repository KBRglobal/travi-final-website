/**
 * Destination Context Hook
 * Determines current destination from URL and provides Dubai-specific navigation logic
 */

import { useLocation } from "wouter";
import { useMemo } from "react";

export interface DestinationContext {
  currentDestination: string | null;
  isDubai: boolean;
  isDubaiOnlyRoute: boolean;
  isDestinationPage: boolean;
  destinationSlug: string | null;
}

// List of Dubai-specific routes that should only be accessible from Dubai context
export const DUBAI_ONLY_ROUTES = [
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
];

// Routes that indicate we're explicitly in Dubai context (NOT including Dubai-only routes)
// These are the "entry points" to Dubai content
const DUBAI_CONTEXT_ROUTES = [
  "/destination/dubai",
  "/destinations/dubai", // Also support plural route format
];

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

    // Check if we're on a Dubai-only route
    const onDubaiOnlyRoute = DUBAI_ONLY_ROUTES.some(
      route => path === route.toLowerCase() || path.startsWith(route.toLowerCase() + "/")
    );

    // Check if we're explicitly in Dubai context (NOT just on a Dubai-only route)
    // Dubai context means: destination/dubai page OR any Dubai-only route (since those are Dubai content)
    const isDubai =
      destinationSlug === "dubai" ||
      DUBAI_CONTEXT_ROUTES.some(route => path.startsWith(route.toLowerCase())) ||
      onDubaiOnlyRoute; // Dubai-only routes ARE Dubai content, so show the sub-nav

    // Get current destination name
    let currentDestination: string | null = null;
    if (destinationSlug && DESTINATION_NAMES[destinationSlug]) {
      currentDestination = DESTINATION_NAMES[destinationSlug];
    } else if (isDubai) {
      currentDestination = "Dubai";
    }

    return {
      currentDestination,
      isDubai,
      isDubaiOnlyRoute: onDubaiOnlyRoute,
      isDestinationPage: !!destinationSlug,
      destinationSlug,
    };
  }, [location]);
}

/**
 * Check if a route is Dubai-only
 */
export function isDubaiOnlyRoute(path: string): boolean {
  const normalizedPath = path.toLowerCase();
  return DUBAI_ONLY_ROUTES.some(
    route =>
      normalizedPath === route.toLowerCase() || normalizedPath.startsWith(route.toLowerCase() + "/")
  );
}

/**
 * Get the Dubai destination redirect path
 */
export function getDubaiRedirectPath(): string {
  return "/destinations/dubai";
}

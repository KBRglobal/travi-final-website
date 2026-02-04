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
}

/**
 * Destination-specific routes mapping
 * Routes that belong to a specific destination and show that destination's sub-nav
 *
 * Note: Dubai-specific routes have been removed as part of destination-agnostic cleanup.
 * Add destination-specific routes here as needed for future destinations.
 */
export const DESTINATION_SPECIFIC_ROUTES: Record<string, string[]> = {
  // Add destination-specific routes here as they get specific content:
  // paris: ["/paris-arrondissements", ...],
  // tokyo: ["/tokyo-districts", ...],
};

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

    return {
      currentDestination,
      destinationSlug,
      isDestinationPage: !!destinationSlug,
      hasDestinationContent,
      routeDestination,
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
 * Get the destination page path for a given slug
 */
export function getDestinationPath(slug: string): string {
  return `/destinations/${slug}`;
}

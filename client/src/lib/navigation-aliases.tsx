/**
 * Navigation Compatibility Layer
 *
 * Provides route aliases to prevent 404s for legacy/alternate paths.
 * This file creates minimal redirect components that can be added to publicRoutes.
 *
 * DO NOT add styling, layout, or UI logic here - routing only.
 */

import { Redirect } from "wouter";

/**
 * Route alias definitions.
 * Key: alias path (the 404 path we want to fix)
 * Value: canonical path (where it should redirect)
 */
export const NAVIGATION_ALIASES = {
  // Dining/Restaurants terminology fix
  "/restaurants": "/dining",

  // Things to do → Attractions (conceptually similar)
  "/things-to-do": "/attractions",

  // Travel guides → News (articles hub)
  "/travel-guides": "/news",
  "/guides": "/news",

  // Articles → News (canonical is /news which is the newer, fuller page)
  // Note: We keep /articles route working but /news is canonical
} as const;

/**
 * Creates redirect components for route aliases.
 * Use in publicRoutes array.
 */
export const createAliasRoutes = () =>
  Object.entries(NAVIGATION_ALIASES).map(([alias, canonical]) => ({
    path: alias,
    component: () => <Redirect to={canonical} replace />,
  }));

/**
 * Canonical navigation paths - source of truth.
 * Use these when linking in navigation components.
 */
export const CANONICAL_PATHS = {
  attractions: "/attractions",
  hotels: "/hotels",
  restaurants: "/dining",  // canonical route, label is "Restaurants"
  districts: "/districts",
  news: "/news",           // canonical for news/articles
  shopping: "/shopping",
  realEstate: "/dubai-off-plan-properties",
  destinations: "/destinations",
} as const;

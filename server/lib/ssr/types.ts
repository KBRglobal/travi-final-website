/**
 * SSR Types and Interfaces
 */

import type { Locale } from "@shared/schema";

export interface SSRRenderOptions {
  locale?: Locale;
  path: string;
  searchParams?: URLSearchParams;
}

export interface SSRRenderResult {
  html: string;
  status: number;
  redirect?: string;
}

export interface NormalizedItem {
  title: string;
  slug: string;
  description?: string;
}

export interface FeaturedAttraction {
  title: string;
  slug: string;
  description?: string;
}

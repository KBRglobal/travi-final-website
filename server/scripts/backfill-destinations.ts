/**
 * One-Time Migration Script: Static Destination Data → PostgreSQL
 *
 * This script migrates destination data from static files to the PostgreSQL database.
 * Run once with: npx tsx server/scripts/backfill-destinations.ts
 *
 * Data Sources:
 * - client/src/data/destinations.ts: Mood data, SEO fields, hero content templates
 *
 * Fields Updated:
 * - heroTitle, heroSubtitle
 * - metaTitle, metaDescription
 * - moodVibe, moodTagline, moodPrimaryColor, moodGradientFrom, moodGradientTo
 * - cardImage, ogImage, canonicalUrl
 *
 * This is IDEMPOTENT - safe to run multiple times (uses UPDATE with WHERE clause)
 */

import { db } from "../db";
import { destinations } from "@shared/schema";
import { eq } from "drizzle-orm";

const currentYear = new Date().getFullYear();

interface DestinationMigrationData {
  name: string;
  country: string;
  heroTitle: string;
  heroSubtitle: string;
  metaTitle: string;
  metaDescription: string;
  moodVibe: string;
  moodTagline: string;
  moodPrimaryColor: string;
  moodGradientFrom: string;
  moodGradientTo: string;
  cardImage: string;
  canonicalUrl: string;
  ogImage: string;
}

const DESTINATION_DATA: Record<string, DestinationMigrationData> = {
  "abu-dhabi": {
    name: "Abu Dhabi",
    country: "United Arab Emirates",
    heroTitle: `Abu Dhabi Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of Abu Dhabi - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `Abu Dhabi Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your Abu Dhabi trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in Abu Dhabi, United Arab Emirates.",
    moodVibe: "luxury",
    moodTagline: "Where Tradition Meets Tomorrow",
    moodPrimaryColor: "hsl(35 100% 50%)",
    moodGradientFrom: "rgba(212, 175, 55, 0.4)",
    moodGradientTo: "rgba(139, 90, 43, 0.6)",
    cardImage: "/cards/abu-dhabi.webp",
    canonicalUrl: "https://travi.world/destinations/abu-dhabi",
    ogImage: "/cards/abu-dhabi.webp",
  },
  amsterdam: {
    name: "Amsterdam",
    country: "Netherlands",
    heroTitle: `Amsterdam Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of Amsterdam - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `Amsterdam Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your Amsterdam trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in Amsterdam, Netherlands.",
    moodVibe: "cultural",
    moodTagline: "Canals, Culture & Character",
    moodPrimaryColor: "hsl(25 80% 50%)",
    moodGradientFrom: "rgba(255, 140, 0, 0.3)",
    moodGradientTo: "rgba(100, 80, 60, 0.5)",
    cardImage: "/cards/amsterdam.webp",
    canonicalUrl: "https://travi.world/destinations/amsterdam",
    ogImage: "/cards/amsterdam.webp",
  },
  bangkok: {
    name: "Bangkok",
    country: "Thailand",
    heroTitle: `Bangkok Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of Bangkok - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `Bangkok Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your Bangkok trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in Bangkok, Thailand.",
    moodVibe: "adventure",
    moodTagline: "The City That Never Sleeps",
    moodPrimaryColor: "hsl(45 100% 50%)",
    moodGradientFrom: "rgba(255, 215, 0, 0.4)",
    moodGradientTo: "rgba(180, 100, 50, 0.6)",
    cardImage: "/cards/bangkok.webp",
    canonicalUrl: "https://travi.world/destinations/bangkok",
    ogImage: "/cards/bangkok.webp",
  },
  barcelona: {
    name: "Barcelona",
    country: "Spain",
    heroTitle: `Barcelona Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of Barcelona - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `Barcelona Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your Barcelona trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in Barcelona, Spain.",
    moodVibe: "cultural",
    moodTagline: "Art, Architecture & Mediterranean Soul",
    moodPrimaryColor: "hsl(15 85% 55%)",
    moodGradientFrom: "rgba(220, 100, 60, 0.4)",
    moodGradientTo: "rgba(100, 50, 80, 0.5)",
    cardImage: "/cards/barcelona.webp",
    canonicalUrl: "https://travi.world/destinations/barcelona",
    ogImage: "/cards/barcelona.webp",
  },
  dubai: {
    name: "Dubai",
    country: "United Arab Emirates",
    heroTitle: `Dubai Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of Dubai - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `Dubai Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your Dubai trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in Dubai, United Arab Emirates.",
    moodVibe: "luxury",
    moodTagline: "The Future is Here",
    moodPrimaryColor: "hsl(35 100% 50%)",
    moodGradientFrom: "rgba(255, 200, 50, 0.4)",
    moodGradientTo: "rgba(100, 60, 30, 0.6)",
    cardImage: "/cards/dubai.webp",
    canonicalUrl: "https://travi.world/destinations/dubai",
    ogImage: "/cards/dubai.webp",
  },
  "hong-kong": {
    name: "Hong Kong",
    country: "China SAR",
    heroTitle: `Hong Kong Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of Hong Kong - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `Hong Kong Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your Hong Kong trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in Hong Kong, China SAR.",
    moodVibe: "modern",
    moodTagline: "Where East Meets West",
    moodPrimaryColor: "hsl(350 80% 55%)",
    moodGradientFrom: "rgba(200, 50, 70, 0.4)",
    moodGradientTo: "rgba(50, 50, 80, 0.6)",
    cardImage: "/cards/hong-kong.webp",
    canonicalUrl: "https://travi.world/destinations/hong-kong",
    ogImage: "/cards/hong-kong.webp",
  },
  istanbul: {
    name: "Istanbul",
    country: "Turkey",
    heroTitle: `Istanbul Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of Istanbul - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `Istanbul Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your Istanbul trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in Istanbul, Turkey.",
    moodVibe: "cultural",
    moodTagline: "Bridging Continents & Centuries",
    moodPrimaryColor: "hsl(15 70% 50%)",
    moodGradientFrom: "rgba(180, 80, 60, 0.4)",
    moodGradientTo: "rgba(80, 40, 60, 0.6)",
    cardImage: "/cards/istanbul.webp",
    canonicalUrl: "https://travi.world/destinations/istanbul",
    ogImage: "/cards/istanbul.webp",
  },
  "las-vegas": {
    name: "Las Vegas",
    country: "United States",
    heroTitle: `Las Vegas Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of Las Vegas - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `Las Vegas Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your Las Vegas trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in Las Vegas, United States.",
    moodVibe: "adventure",
    moodTagline: "Entertainment Capital of the World",
    moodPrimaryColor: "hsl(280 70% 55%)",
    moodGradientFrom: "rgba(150, 50, 180, 0.4)",
    moodGradientTo: "rgba(50, 20, 80, 0.6)",
    cardImage: "/cards/las-vegas.webp",
    canonicalUrl: "https://travi.world/destinations/las-vegas",
    ogImage: "/cards/las-vegas.webp",
  },
  london: {
    name: "London",
    country: "United Kingdom",
    heroTitle: `London Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of London - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `London Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your London trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in London, United Kingdom.",
    moodVibe: "cultural",
    moodTagline: "History, Heritage & Innovation",
    moodPrimaryColor: "hsl(220 50% 50%)",
    moodGradientFrom: "rgba(70, 90, 140, 0.4)",
    moodGradientTo: "rgba(40, 50, 80, 0.6)",
    cardImage: "/cards/london.webp",
    canonicalUrl: "https://travi.world/destinations/london",
    ogImage: "/cards/london.webp",
  },
  "los-angeles": {
    name: "Los Angeles",
    country: "United States",
    heroTitle: `Los Angeles Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of Los Angeles - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `Los Angeles Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your Los Angeles trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in Los Angeles, United States.",
    moodVibe: "modern",
    moodTagline: "Dreams Start Here",
    moodPrimaryColor: "hsl(35 90% 55%)",
    moodGradientFrom: "rgba(255, 180, 100, 0.4)",
    moodGradientTo: "rgba(100, 60, 80, 0.5)",
    cardImage: "/cards/los-angeles.webp",
    canonicalUrl: "https://travi.world/destinations/los-angeles",
    ogImage: "/cards/los-angeles.webp",
  },
  miami: {
    name: "Miami",
    country: "United States",
    heroTitle: `Miami Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of Miami - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `Miami Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your Miami trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in Miami, United States.",
    moodVibe: "tropical",
    moodTagline: "Where the Sun Always Shines",
    moodPrimaryColor: "hsl(180 70% 50%)",
    moodGradientFrom: "rgba(50, 200, 200, 0.4)",
    moodGradientTo: "rgba(200, 100, 150, 0.5)",
    cardImage: "/cards/miami.webp",
    canonicalUrl: "https://travi.world/destinations/miami",
    ogImage: "/cards/miami.webp",
  },
  "new-york": {
    name: "New York",
    country: "United States",
    heroTitle: `New York Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of New York - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `New York Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your New York trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in New York, United States.",
    moodVibe: "modern",
    moodTagline: "The City That Never Sleeps",
    moodPrimaryColor: "hsl(220 60% 50%)",
    moodGradientFrom: "rgba(60, 80, 140, 0.4)",
    moodGradientTo: "rgba(40, 40, 60, 0.6)",
    cardImage: "/cards/new-york.webp",
    canonicalUrl: "https://travi.world/destinations/new-york",
    ogImage: "/cards/new-york.webp",
  },
  paris: {
    name: "Paris",
    country: "France",
    heroTitle: `Paris Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of Paris - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `Paris Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your Paris trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in Paris, France.",
    moodVibe: "romantic",
    moodTagline: "The City of Light & Love",
    moodPrimaryColor: "hsl(330 50% 55%)",
    moodGradientFrom: "rgba(180, 100, 140, 0.4)",
    moodGradientTo: "rgba(60, 40, 60, 0.6)",
    cardImage: "/cards/paris.webp",
    canonicalUrl: "https://travi.world/destinations/paris",
    ogImage: "/cards/paris.webp",
  },
  "ras-al-khaimah": {
    name: "Ras Al Khaimah",
    country: "United Arab Emirates",
    heroTitle: `Ras Al Khaimah Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of Ras Al Khaimah - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `Ras Al Khaimah Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your Ras Al Khaimah trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in Ras Al Khaimah, United Arab Emirates.",
    moodVibe: "adventure",
    moodTagline: "Nature's Hidden Gem",
    moodPrimaryColor: "hsl(30 70% 50%)",
    moodGradientFrom: "rgba(180, 120, 60, 0.4)",
    moodGradientTo: "rgba(100, 60, 40, 0.6)",
    cardImage: "/cards/ras-al-khaimah.webp",
    canonicalUrl: "https://travi.world/destinations/ras-al-khaimah",
    ogImage: "/cards/ras-al-khaimah.webp",
  },
  rome: {
    name: "Rome",
    country: "Italy",
    heroTitle: `Rome Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of Rome - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `Rome Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your Rome trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in Rome, Italy.",
    moodVibe: "cultural",
    moodTagline: "Eternal City, Timeless Beauty",
    moodPrimaryColor: "hsl(30 60% 45%)",
    moodGradientFrom: "rgba(160, 100, 60, 0.4)",
    moodGradientTo: "rgba(80, 50, 40, 0.6)",
    cardImage: "/cards/rome.webp",
    canonicalUrl: "https://travi.world/destinations/rome",
    ogImage: "/cards/rome.webp",
  },
  singapore: {
    name: "Singapore",
    country: "Singapore",
    heroTitle: `Singapore Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of Singapore - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `Singapore Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your Singapore trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in Singapore.",
    moodVibe: "modern",
    moodTagline: "The Garden City",
    moodPrimaryColor: "hsl(160 60% 45%)",
    moodGradientFrom: "rgba(50, 150, 120, 0.4)",
    moodGradientTo: "rgba(30, 60, 80, 0.6)",
    cardImage: "/cards/singapore.webp",
    canonicalUrl: "https://travi.world/destinations/singapore",
    ogImage: "/cards/singapore.webp",
  },
  tokyo: {
    name: "Tokyo",
    country: "Japan",
    heroTitle: `Tokyo Travel Guide ${currentYear}`,
    heroSubtitle:
      "Discover the best of Tokyo - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.",
    metaTitle: `Tokyo Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
    metaDescription:
      "Plan your Tokyo trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in Tokyo, Japan.",
    moodVibe: "modern",
    moodTagline: "Tradition Meets Tomorrow",
    moodPrimaryColor: "hsl(350 80% 60%)",
    moodGradientFrom: "rgba(200, 60, 100, 0.4)",
    moodGradientTo: "rgba(40, 30, 80, 0.6)",
    cardImage: "/cards/tokyo.webp",
    canonicalUrl: "https://travi.world/destinations/tokyo",
    ogImage: "/cards/tokyo.webp",
  },
};

async function backfillDestinations() {
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const [id, data] of Object.entries(DESTINATION_DATA)) {
    try {
      const result = await db
        .update(destinations)
        .set({
          heroTitle: data.heroTitle,
          heroSubtitle: data.heroSubtitle,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          moodVibe: data.moodVibe,
          moodTagline: data.moodTagline,
          moodPrimaryColor: data.moodPrimaryColor,
          moodGradientFrom: data.moodGradientFrom,
          moodGradientTo: data.moodGradientTo,
          cardImage: data.cardImage,
          ogImage: data.cardImage,
          canonicalUrl: data.canonicalUrl,
          updatedAt: new Date(),
        } as any)
        .where(eq(destinations.id, id))
        .returning({ id: destinations.id });

      if (result.length > 0) {
        successCount++;
      } else {
        skipCount++;
      }
    } catch (error) {
      errorCount++;
    }
  }

  if (errorCount === 0 && successCount > 0) {
  } else if (errorCount > 0) {
  }

  process.exit(0);
}

backfillDestinations().catch(() => {});

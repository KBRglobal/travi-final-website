/**
 * SSR Constants and Destination Data
 */

export const BASE_URL = "https://travi.world";
export const SITE_NAME = "TRAVI";

// Destination metadata for SSR (mirrors client/src/data/destinations.ts)
export const DESTINATION_DATA: Record<
  string,
  {
    name: string;
    country: string;
    tagline: string;
    description: string;
    heroImage: string;
    currency: string;
    language: string;
    timezone: string;
  }
> = {
  singapore: {
    name: "Singapore",
    country: "Singapore",
    tagline: "Where East Meets West",
    description:
      "Discover Singapore - a stunning city-state where ultramodern architecture meets traditional culture. Experience world-class attractions, diverse cuisines, and vibrant neighborhoods.",
    heroImage: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&h=630&fit=crop",
    currency: "SGD",
    language: "English, Mandarin, Malay, Tamil",
    timezone: "GMT+8",
  },
  dubai: {
    name: "Dubai",
    country: "United Arab Emirates",
    tagline: "The City of Gold",
    description:
      "Explore Dubai's iconic skyscrapers, luxury shopping, and desert adventures. From the Burj Khalifa to traditional souks, discover why millions visit this spectacular city.",
    heroImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&h=630&fit=crop",
    currency: "AED",
    language: "Arabic, English",
    timezone: "GMT+4",
  },
  bangkok: {
    name: "Bangkok",
    country: "Thailand",
    tagline: "The City of Angels",
    description:
      "Experience Bangkok's grand temples, vibrant street food scene, and bustling markets. Thailand's capital offers an unforgettable blend of tradition and modernity.",
    heroImage: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&h=630&fit=crop",
    currency: "THB",
    language: "Thai, English",
    timezone: "GMT+7",
  },
  paris: {
    name: "Paris",
    country: "France",
    tagline: "The City of Light",
    description:
      "Discover Paris - the world's most romantic city. From the Eiffel Tower to world-class museums, charming cafés, and haute cuisine, Paris captivates visitors endlessly.",
    heroImage: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&h=630&fit=crop",
    currency: "EUR",
    language: "French",
    timezone: "GMT+1",
  },
  london: {
    name: "London",
    country: "United Kingdom",
    tagline: "A World in One City",
    description:
      "Explore London's iconic landmarks, world-class museums, and diverse neighborhoods. The British capital offers history, culture, and modern attractions for every traveler.",
    heroImage: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=630&fit=crop",
    currency: "GBP",
    language: "English",
    timezone: "GMT",
  },
  istanbul: {
    name: "Istanbul",
    country: "Turkey",
    tagline: "Where Continents Meet",
    description:
      "Experience Istanbul's rich heritage spanning two continents. From the Blue Mosque to the Grand Bazaar, discover why this ancient city remains eternally captivating.",
    heroImage: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200&h=630&fit=crop",
    currency: "TRY",
    language: "Turkish",
    timezone: "GMT+3",
  },
  "new-york": {
    name: "New York City",
    country: "United States",
    tagline: "The City That Never Sleeps",
    description:
      "Discover New York City's iconic skyline, Broadway shows, and world-famous museums. From Central Park to Times Square, the Big Apple offers endless excitement.",
    heroImage: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&h=630&fit=crop",
    currency: "USD",
    language: "English",
    timezone: "GMT-5",
  },
  tokyo: {
    name: "Tokyo",
    country: "Japan",
    tagline: "Where Tradition Meets Innovation",
    description:
      "Explore Tokyo's fascinating blend of ancient temples and cutting-edge technology. Japan's capital offers unique culture, amazing food, and unforgettable experiences.",
    heroImage: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&h=630&fit=crop",
    currency: "JPY",
    language: "Japanese",
    timezone: "GMT+9",
  },
  "hong-kong": {
    name: "Hong Kong",
    country: "China",
    tagline: "Asia's World City",
    description:
      "Experience Hong Kong's dramatic skyline, dim sum delights, and vibrant street markets. This dynamic city offers the perfect blend of East and West.",
    heroImage: "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=1200&h=630&fit=crop",
    currency: "HKD",
    language: "Cantonese, English",
    timezone: "GMT+8",
  },
  rome: {
    name: "Rome",
    country: "Italy",
    tagline: "The Eternal City",
    description:
      "Walk through Rome's ancient ruins, Renaissance masterpieces, and vibrant piazzas. The Italian capital offers millennia of history and world-renowned cuisine.",
    heroImage: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&h=630&fit=crop",
    currency: "EUR",
    language: "Italian",
    timezone: "GMT+1",
  },
  barcelona: {
    name: "Barcelona",
    country: "Spain",
    tagline: "Art, Architecture & Mediterranean Vibes",
    description:
      "Discover Barcelona's Gaudí masterpieces, stunning beaches, and vibrant nightlife. This Catalan gem offers art, culture, and Mediterranean charm year-round.",
    heroImage: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&h=630&fit=crop",
    currency: "EUR",
    language: "Spanish, Catalan",
    timezone: "GMT+1",
  },
  amsterdam: {
    name: "Amsterdam",
    country: "Netherlands",
    tagline: "City of Canals",
    description:
      "Explore Amsterdam's iconic canals, world-class museums, and charming neighborhoods. The Dutch capital offers art, history, and a welcoming atmosphere.",
    heroImage: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&h=630&fit=crop",
    currency: "EUR",
    language: "Dutch, English",
    timezone: "GMT+1",
  },
  "abu-dhabi": {
    name: "Abu Dhabi",
    country: "United Arab Emirates",
    tagline: "The Capital of Culture",
    description:
      "Discover Abu Dhabi's stunning cultural landmarks, desert adventures, and luxury experiences. The UAE capital blends heritage with modern sophistication.",
    heroImage: "https://images.unsplash.com/photo-1512632578888-169bbfe94b38?w=1200&h=630&fit=crop",
    currency: "AED",
    language: "Arabic, English",
    timezone: "GMT+4",
  },
  "las-vegas": {
    name: "Las Vegas",
    country: "United States",
    tagline: "Entertainment Capital of the World",
    description:
      "Experience Las Vegas's world-famous casinos, shows, and nightlife. Beyond the Strip, discover incredible natural wonders and unforgettable adventures.",
    heroImage: "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=1200&h=630&fit=crop",
    currency: "USD",
    language: "English",
    timezone: "GMT-8",
  },
  "los-angeles": {
    name: "Los Angeles",
    country: "United States",
    tagline: "The City of Angels",
    description:
      "Explore Los Angeles's iconic beaches, Hollywood glamour, and diverse neighborhoods. The entertainment capital offers endless sunshine and attractions.",
    heroImage: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=1200&h=630&fit=crop",
    currency: "USD",
    language: "English, Spanish",
    timezone: "GMT-8",
  },
  miami: {
    name: "Miami",
    country: "United States",
    tagline: "The Magic City",
    description:
      "Experience Miami's stunning beaches, Art Deco architecture, and vibrant Latin culture. This tropical paradise offers nightlife, cuisine, and year-round sunshine.",
    heroImage: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200&h=630&fit=crop",
    currency: "USD",
    language: "English, Spanish",
    timezone: "GMT-5",
  },
};

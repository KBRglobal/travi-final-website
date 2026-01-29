/**
 * Destination Placeholder Data
 * Factory pattern data for all 17 destinations.
 *
 * PLACEHOLDER CONTENT POLICY:
 * - Uses generic travel descriptions (no lorem ipsum)
 * - Uses $XX-$YY format for pricing
 * - Uses X-Y hours for durations
 * - NEVER invents real-world facts (weather, visa rules, costs)
 */

import type { DestinationPageData, DestinationId, DestinationMood } from "@/types/destination";
import { SITE_URL } from "@/lib/constants";

// Helper to generate placeholder content (natural travel language, no lorem ipsum)
const descriptionShort = "A destination rich in culture and experiences waiting to be explored.";
const descriptionMedium =
  "Plan your perfect trip with local insights and travel tips. Find the best times to visit, top attractions, and practical travel advice.";

// Generic quick facts template
const createQuickFacts = (currency: string, language: string) => [
  { icon: "Coins", label: "Currency", value: currency },
  { icon: "Languages", label: "Language", value: language },
  { icon: "FileCheck", label: "Visa", value: "Check requirements" },
  { icon: "Cloud", label: "Weather", value: "Varies by season" },
  { icon: "Plane", label: "Airport", value: "International" },
  { icon: "ShieldCheck", label: "Safety", value: "Exercise caution" },
];

// NOTE: Seasons data is now fetched from database via Open-Meteo Historical Weather API
// The BestTimeToVisit component only renders when real climate data exists in DB
// Run: npx tsx server/scripts/fetch-climate-data.ts to populate seasons data

// NOTE: Transport/mobility data is now fetched from database via destinationContent table
// The GettingAround component only renders when mobility data exists in DB
// Use the admin Mobility tab to add transport data for each destination

// Generic FAQ template
const createFAQs = (name: string) => [
  {
    question: `What is the best time to visit ${name}?`,
    answer:
      "The best time to visit depends on your preferences and planned activities. Check the seasonal guide for detailed weather information.",
  },
  {
    question: `Do I need a visa to visit ${name}?`,
    answer:
      "Visa requirements vary by nationality. Check with your local embassy or consulate for the most current requirements before your trip.",
  },
  {
    question: `How many days should I spend in ${name}?`,
    answer:
      "Most travelers recommend 3-5 days to see the main attractions and experience local culture. Plan extra time if you want to explore beyond the city center.",
  },
  {
    question: `Is ${name} safe for tourists?`,
    answer:
      "Generally safe for tourists. Always exercise normal precautions and stay aware of your surroundings.",
  },
  {
    question: `What is the local currency in ${name}?`,
    answer:
      "Credit cards are widely accepted at hotels, restaurants, and major attractions. Carrying some local currency is recommended for smaller vendors, markets, and taxis.",
  },
  {
    question: `How do I get from the airport to the city center?`,
    answer:
      "Multiple transport options are available including taxi, bus, and train services. Check the Getting Around section for details.",
  },
  {
    question: `What are the must-see attractions in ${name}?`,
    answer: "Explore our attractions guide for the top sights and experiences in this destination.",
  },
  {
    question: `What should I pack for a trip to ${name}?`,
    answer:
      "Pack according to the season and your planned activities. Comfortable walking shoes are essential, as most destinations are best explored on foot.",
  },
];

// Generic experiences template
const createExperiences = (name: string) => [
  {
    id: "exp-1",
    title: `Historic ${name} Walking Tour`,
    description: descriptionShort,
    duration: "2-3 hours",
    priceRange: "$XX-$YY",
    imageUrl: null,
    imageAlt: null,
  },
  {
    id: "exp-2",
    title: `${name} Food & Culture Experience`,
    description: descriptionShort,
    duration: "3-4 hours",
    priceRange: "$XX-$YY",
    imageUrl: null,
    imageAlt: null,
  },
  {
    id: "exp-3",
    title: `Sunset Views of ${name}`,
    description: descriptionShort,
    duration: "2-3 hours",
    priceRange: "$XX-$YY",
    imageUrl: null,
    imageAlt: null,
  },
  {
    id: "exp-4",
    title: `${name} Museum & Art Tour`,
    description: descriptionShort,
    duration: "3-4 hours",
    priceRange: "$XX-$YY",
    imageUrl: null,
    imageAlt: null,
  },
  {
    id: "exp-5",
    title: `Day Trip from ${name}`,
    description: descriptionShort,
    duration: "6-8 hours",
    priceRange: "$XXX-$YYY",
    imageUrl: null,
    imageAlt: null,
  },
  {
    id: "exp-6",
    title: `${name} Nightlife Experience`,
    description: descriptionShort,
    duration: "3-4 hours",
    priceRange: "$XX-$YY",
    imageUrl: null,
    imageAlt: null,
  },
];

// Generic neighborhoods template with atmospheric images
const createNeighborhoods = (name: string) => [
  {
    id: "nb-1",
    name: "Historic Center",
    description:
      "The heart of the city with major landmarks and cultural attractions within walking distance.",
    highlights: ["Walking distance", "Landmarks", "Dining"],
    priceLevel: "$$$",
    imageUrl: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800&h=600&fit=crop",
    imageAlt: `Historic center of ${name}`,
    vibe: "Cultural",
  },
  {
    id: "nb-2",
    name: "Business District",
    description:
      "Modern high-rise hotels with excellent transport links and upscale shopping options.",
    highlights: ["Modern hotels", "Transport", "Shopping"],
    priceLevel: "$$$$",
    imageUrl: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=600&fit=crop",
    imageAlt: `Business district of ${name}`,
    vibe: "Luxury",
  },
  {
    id: "nb-3",
    name: "Arts Quarter",
    description: "Creative neighborhood with galleries, independent cafes, and boutique shopping.",
    highlights: ["Galleries", "Cafes", "Boutiques"],
    priceLevel: "$$",
    imageUrl: "https://images.unsplash.com/photo-1533158307587-828f0a76ef46?w=800&h=600&fit=crop",
    imageAlt: `Arts quarter of ${name}`,
    vibe: "Creative",
  },
  {
    id: "nb-4",
    name: "Waterfront Area",
    description: "Scenic waterfront location with great views, restaurants, and nightlife options.",
    highlights: ["Views", "Restaurants", "Nightlife"],
    priceLevel: "$$$",
    imageUrl: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&h=600&fit=crop",
    imageAlt: `Waterfront area of ${name}`,
    vibe: "Vibrant",
  },
  {
    id: "nb-5",
    name: "Budget-Friendly Zone",
    description: "Affordable area with local character, markets, and hostels for budget travelers.",
    highlights: ["Local vibe", "Markets", "Hostels"],
    priceLevel: "$",
    imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop",
    imageAlt: `Local neighborhood in ${name}`,
    vibe: "Local",
  },
  {
    id: "nb-6",
    name: "Residential Area",
    description: "Quiet streets with parks, offering a glimpse into everyday local life.",
    highlights: ["Quiet streets", "Parks", "Local life"],
    priceLevel: "$$",
    imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop",
    imageAlt: `Residential area of ${name}`,
    vibe: "Quiet",
  },
];

// Destination mood configurations - each destination has unique visual identity
const DESTINATION_MOODS: Record<DestinationId, DestinationMood> = {
  "abu-dhabi": {
    primaryColor: "hsl(35 100% 50%)",
    gradientFrom: "rgba(212, 175, 55, 0.4)",
    gradientTo: "rgba(139, 90, 43, 0.6)",
    vibe: "luxury",
    tagline: "Where Tradition Meets Tomorrow",
  },
  amsterdam: {
    primaryColor: "hsl(25 80% 50%)",
    gradientFrom: "rgba(255, 140, 0, 0.3)",
    gradientTo: "rgba(100, 80, 60, 0.5)",
    vibe: "cultural",
    tagline: "Canals, Culture & Character",
  },
  bangkok: {
    primaryColor: "hsl(45 100% 50%)",
    gradientFrom: "rgba(255, 215, 0, 0.4)",
    gradientTo: "rgba(180, 100, 50, 0.6)",
    vibe: "adventure",
    tagline: "The City That Never Sleeps",
  },
  barcelona: {
    primaryColor: "hsl(15 85% 55%)",
    gradientFrom: "rgba(220, 100, 60, 0.4)",
    gradientTo: "rgba(100, 50, 80, 0.5)",
    vibe: "cultural",
    tagline: "Art, Architecture & Mediterranean Soul",
  },
  dubai: {
    primaryColor: "hsl(35 100% 50%)",
    gradientFrom: "rgba(255, 200, 50, 0.4)",
    gradientTo: "rgba(100, 60, 30, 0.6)",
    vibe: "luxury",
    tagline: "The Future is Here",
  },
  "hong-kong": {
    primaryColor: "hsl(350 80% 55%)",
    gradientFrom: "rgba(200, 50, 70, 0.4)",
    gradientTo: "rgba(50, 50, 80, 0.6)",
    vibe: "modern",
    tagline: "Where East Meets West",
  },
  istanbul: {
    primaryColor: "hsl(15 70% 50%)",
    gradientFrom: "rgba(180, 80, 60, 0.4)",
    gradientTo: "rgba(80, 40, 60, 0.6)",
    vibe: "cultural",
    tagline: "Bridging Continents & Centuries",
  },
  "las-vegas": {
    primaryColor: "hsl(280 70% 55%)",
    gradientFrom: "rgba(150, 50, 180, 0.4)",
    gradientTo: "rgba(50, 20, 80, 0.6)",
    vibe: "adventure",
    tagline: "Entertainment Capital of the World",
  },
  london: {
    primaryColor: "hsl(220 50% 50%)",
    gradientFrom: "rgba(70, 90, 140, 0.4)",
    gradientTo: "rgba(40, 50, 80, 0.6)",
    vibe: "cultural",
    tagline: "History, Heritage & Innovation",
  },
  "los-angeles": {
    primaryColor: "hsl(35 90% 55%)",
    gradientFrom: "rgba(255, 180, 100, 0.4)",
    gradientTo: "rgba(100, 60, 80, 0.5)",
    vibe: "modern",
    tagline: "Dreams Start Here",
  },
  miami: {
    primaryColor: "hsl(180 70% 50%)",
    gradientFrom: "rgba(50, 200, 200, 0.4)",
    gradientTo: "rgba(200, 100, 150, 0.5)",
    vibe: "tropical",
    tagline: "Where the Sun Always Shines",
  },
  "new-york": {
    primaryColor: "hsl(220 60% 50%)",
    gradientFrom: "rgba(60, 80, 140, 0.4)",
    gradientTo: "rgba(40, 40, 60, 0.6)",
    vibe: "modern",
    tagline: "The City That Never Sleeps",
  },
  paris: {
    primaryColor: "hsl(330 50% 55%)",
    gradientFrom: "rgba(180, 100, 140, 0.4)",
    gradientTo: "rgba(60, 40, 60, 0.6)",
    vibe: "romantic",
    tagline: "The City of Light & Love",
  },
  rome: {
    primaryColor: "hsl(30 60% 45%)",
    gradientFrom: "rgba(160, 100, 60, 0.4)",
    gradientTo: "rgba(80, 50, 40, 0.6)",
    vibe: "cultural",
    tagline: "Eternal City, Timeless Beauty",
  },
  singapore: {
    primaryColor: "hsl(160 60% 45%)",
    gradientFrom: "rgba(50, 150, 120, 0.4)",
    gradientTo: "rgba(30, 60, 80, 0.6)",
    vibe: "modern",
    tagline: "The Garden City",
  },
  tokyo: {
    primaryColor: "hsl(350 80% 60%)",
    gradientFrom: "rgba(200, 60, 100, 0.4)",
    gradientTo: "rgba(40, 30, 80, 0.6)",
    vibe: "modern",
    tagline: "Tradition Meets Tomorrow",
  },
};

// Create destination data factory
function createDestinationData(
  id: DestinationId,
  name: string,
  country: string,
  currency: string,
  language: string
): DestinationPageData {
  const currentYear = new Date().getFullYear();

  return {
    id,
    name,
    country,
    mood: DESTINATION_MOODS[id],
    hero: {
      title: `${name} Travel Guide ${currentYear}`,
      subtitle: `Discover the best of ${name} - from iconic landmarks to hidden gems. Your complete guide to hotels, attractions, and local experiences.`,
      imageUrl: `/cards/${id}.webp`,
      imageAlt: `${name} skyline and cityscape - travel destination guide`,
      ctaText: `Explore ${name}`,
      ctaLink: `/destinations/${id}/attractions`,
    },
    quickFacts: createQuickFacts(currency, language),
    experiences: createExperiences(name),
    neighborhoods: createNeighborhoods(name),
    seasons: [], // Seasons data now fetched from DB via Open-Meteo API
    transportOptions: [], // Transport/mobility data now fetched from DB via admin CMS
    faqs: createFAQs(name),
    cta: {
      headline: `Start Planning Your ${name} Adventure`,
      subheadline: `Get personalized recommendations and exclusive deals for your trip to ${name}.`,
      buttonText: "Plan My Trip",
      buttonLink: `/destinations/${id}/plan`,
    },
    seo: {
      metaTitle: `${name} Travel Guide ${currentYear} - Hotels, Attractions & Things to Do | TRAVI`,
      metaDescription: `Plan your ${name} trip with TRAVI. Discover the best hotels, top attractions, local restaurants, and hidden gems in ${name}, ${country}.`,
      canonicalUrl: `${SITE_URL}/destinations/${id}`,
      ogImage: `/cards/${id}.webp`,
      lastUpdated: new Date().toISOString(),
    },
  };
}

// Abu Dhabi hero carousel images
const abuDhabiHeroImages = [
  {
    filename: "hero-1.webp",
    url: "/destinations-hero/abu-dhabi/hero-1.webp",
    alt: "Sheikh Zayed Grand Mosque courtyard with stunning white architecture and reflective pools",
    order: 0,
  },
  {
    filename: "hero-2.webp",
    url: "/destinations-hero/abu-dhabi/hero-2.webp",
    alt: "Presidential Palace Qasr Al Watan aerial view showcasing Abu Dhabi's grandeur",
    order: 1,
  },
  {
    filename: "hero-3.webp",
    url: "/destinations-hero/abu-dhabi/hero-3.webp",
    alt: "Ferrari World at Yas Island - Abu Dhabi's famous entertainment destination",
    order: 2,
  },
];

// Base destination data (16 entries - RAK handled separately as 17th destination)
const baseDestinationData: Record<DestinationId, DestinationPageData> = {
  "abu-dhabi": createDestinationData(
    "abu-dhabi",
    "Abu Dhabi",
    "United Arab Emirates",
    "AED (Dirham)",
    "Arabic, English"
  ),
  amsterdam: createDestinationData(
    "amsterdam",
    "Amsterdam",
    "Netherlands",
    "EUR (Euro)",
    "Dutch, English"
  ),
  bangkok: createDestinationData("bangkok", "Bangkok", "Thailand", "THB (Baht)", "Thai, English"),
  barcelona: createDestinationData(
    "barcelona",
    "Barcelona",
    "Spain",
    "EUR (Euro)",
    "Spanish, Catalan"
  ),
  dubai: createDestinationData(
    "dubai",
    "Dubai",
    "United Arab Emirates",
    "AED (Dirham)",
    "Arabic, English"
  ),
  "hong-kong": createDestinationData(
    "hong-kong",
    "Hong Kong",
    "China SAR",
    "HKD (Dollar)",
    "Cantonese, English"
  ),
  istanbul: createDestinationData(
    "istanbul",
    "Istanbul",
    "Turkey",
    "TRY (Lira)",
    "Turkish, English"
  ),
  "las-vegas": createDestinationData(
    "las-vegas",
    "Las Vegas",
    "United States",
    "USD (Dollar)",
    "English, Spanish"
  ),
  london: createDestinationData("london", "London", "United Kingdom", "GBP (Pound)", "English"),
  "los-angeles": createDestinationData(
    "los-angeles",
    "Los Angeles",
    "United States",
    "USD (Dollar)",
    "English, Spanish"
  ),
  miami: createDestinationData(
    "miami",
    "Miami",
    "United States",
    "USD (Dollar)",
    "English, Spanish"
  ),
  "new-york": createDestinationData(
    "new-york",
    "New York",
    "United States",
    "USD (Dollar)",
    "English"
  ),
  paris: createDestinationData("paris", "Paris", "France", "EUR (Euro)", "French, English"),
  rome: createDestinationData("rome", "Rome", "Italy", "EUR (Euro)", "Italian, English"),
  singapore: createDestinationData(
    "singapore",
    "Singapore",
    "Singapore",
    "SGD (Dollar)",
    "English, Mandarin"
  ),
  tokyo: createDestinationData("tokyo", "Tokyo", "Japan", "JPY (Yen)", "Japanese, English"),
};

// Dubai Districts/Neighborhoods with real data
const dubaiNeighborhoods = [
  {
    id: "downtown-dubai",
    name: "Downtown Dubai",
    description:
      "The heart of modern Dubai featuring the iconic Burj Khalifa, Dubai Mall, and Dubai Fountain. A premier destination for luxury shopping, fine dining, and world-class entertainment.",
    highlights: ["Burj Khalifa", "Dubai Mall", "Dubai Fountain", "Souk Al Bahar", "Opera District"],
    priceLevel: "$$$$",
    imageUrl: null,
    imageAlt: "Downtown Dubai skyline with Burj Khalifa",
    vibe: "Luxury",
    introText:
      "Downtown Dubai is the crown jewel of the city, home to record-breaking architecture and world-class attractions. The area centers around the Burj Khalifa, the world's tallest building, and the massive Dubai Mall with over 1,200 stores. Every evening, the Dubai Fountain puts on a spectacular water, light, and music show that draws crowds from across the city.",
    bestFor: [
      "Luxury travelers",
      "First-time visitors",
      "Shopping enthusiasts",
      "Architecture lovers",
    ],
    nearbyAttractions: [
      "Burj Khalifa",
      "Dubai Mall",
      "Dubai Fountain",
      "Dubai Opera",
      "Souk Al Bahar",
    ],
    quickInfo: [
      { icon: "MapPin", label: "Location", value: "Central Dubai" },
      { icon: "Train", label: "Metro", value: "Burj Khalifa Station" },
      { icon: "DollarSign", label: "Average Hotel", value: "AED 800-2500/night" },
    ],
    localTips: [
      "Book Burj Khalifa At The Top tickets online to skip long queues",
      "Best Dubai Fountain views are from the bridge at Souk Al Bahar",
      "Visit Dubai Mall on weekday mornings to avoid crowds",
      "The Opera District has excellent restaurants for pre-show dining",
    ],
    faq: [
      {
        question: "What is the best time to visit Downtown Dubai?",
        answer:
          "Visit in the evening to see the Dubai Fountain show (every 30 minutes from 6 PM) and the Burj Khalifa lit up against the night sky.",
      },
      {
        question: "How do I get to Downtown Dubai?",
        answer:
          "Take the Dubai Metro Red Line to Burj Khalifa/Dubai Mall station. The area is also well-connected by taxi and ride-sharing apps.",
      },
    ],
    transportOptions: ["Metro (Red Line)", "Taxi", "Uber/Careem", "Walking-friendly area"],
  },
  {
    id: "dubai-marina",
    name: "Dubai Marina",
    description:
      "A stunning waterfront community with impressive skyscrapers, yacht clubs, and a vibrant promenade. Perfect for those seeking an urban beach lifestyle.",
    highlights: ["Marina Walk", "Beach Access", "Nightlife", "Yacht Tours", "Fine Dining"],
    priceLevel: "$$$",
    imageUrl:
      "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
    imageAlt: "Dubai Marina waterfront and skyscrapers",
    vibe: "Vibrant",
    introText:
      "Dubai Marina is one of the world's largest man-made marinas, featuring over 200 high-rise towers along a 3km stretch of waterfront. The Marina Walk promenade offers endless dining options, from casual cafes to upscale restaurants, all with stunning views of the yachts and towers.",
    bestFor: ["Young professionals", "Nightlife lovers", "Beach seekers", "Food enthusiasts"],
    nearbyAttractions: ["Marina Walk", "JBR Beach", "Ain Dubai", "Marina Mall", "Pier 7"],
    quickInfo: [
      { icon: "MapPin", label: "Location", value: "New Dubai" },
      { icon: "Train", label: "Metro", value: "DMCC/JLT Stations" },
      { icon: "DollarSign", label: "Average Hotel", value: "AED 500-1500/night" },
    ],
    localTips: [
      "Take a dhow dinner cruise for amazing evening views",
      "The Marina Walk is great for morning jogs before it gets hot",
      "Many restaurants offer happy hour deals from 5-8 PM",
      "Water taxis connect Marina to other waterfront areas",
    ],
    faq: [
      {
        question: "Is Dubai Marina walkable?",
        answer:
          "Yes! The Marina Walk is a 7km pedestrian promenade perfect for walking, jogging, or cycling. Most attractions are within walking distance.",
      },
      {
        question: "What is the nightlife like?",
        answer:
          "Dubai Marina has a vibrant nightlife scene with rooftop bars, lounges, and clubs. Popular spots include Pier 7 and the various hotel bars.",
      },
    ],
    transportOptions: ["Metro (Red Line)", "Tram", "Water Taxi", "Walking-friendly"],
  },
  {
    id: "palm-jumeirah",
    name: "Palm Jumeirah",
    description:
      "The world-famous palm-shaped island featuring luxury resorts, beachfront villas, and exclusive restaurants. An iconic symbol of Dubai's ambition.",
    highlights: ["Atlantis Resort", "Beach Clubs", "Luxury Hotels", "The Pointe", "Aquaventure"],
    priceLevel: "$$$$",
    imageUrl:
      "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
    imageAlt: "Palm Jumeirah aerial view",
    vibe: "Luxury",
    introText:
      "Palm Jumeirah is an engineering marvel and one of the most recognizable landmarks in the world. This palm-shaped artificial island is home to some of Dubai's most exclusive hotels, including Atlantis The Palm, as well as private beach clubs, celebrity restaurants, and luxury villas.",
    bestFor: ["Honeymooners", "Luxury seekers", "Beach lovers", "Families with children"],
    nearbyAttractions: [
      "Atlantis The Palm",
      "Aquaventure Waterpark",
      "The Lost Chambers Aquarium",
      "The Pointe",
      "Nakheel Mall",
    ],
    quickInfo: [
      { icon: "MapPin", label: "Location", value: "Off JBR Coast" },
      { icon: "Train", label: "Monorail", value: "Palm Monorail" },
      { icon: "DollarSign", label: "Average Hotel", value: "AED 1200-5000/night" },
    ],
    localTips: [
      "The Palm Monorail offers incredible views of the island and skyline",
      "Book beach club access for the day if not staying on the Palm",
      "Sunset at The Pointe with views of Atlantis is spectacular",
      "Atlantis day passes include waterpark and aquarium access",
    ],
    faq: [
      {
        question: "How do I get to Palm Jumeirah?",
        answer:
          "Take the Palm Monorail from Gateway Station (connects to the tram), drive, or use taxi/rideshare. The Monorail offers the best views.",
      },
      {
        question: "Can I visit Atlantis without staying there?",
        answer:
          "Yes! You can buy day passes for Aquaventure Waterpark, visit The Lost Chambers Aquarium, or dine at any of the restaurants.",
      },
    ],
    transportOptions: ["Palm Monorail", "Taxi", "Uber/Careem", "Hotel shuttles"],
  },
  {
    id: "jbr",
    name: "JBR - Jumeirah Beach Residence",
    description:
      "A beachfront community with a lively promenade, outdoor dining, and direct beach access. The Walk at JBR is perfect for families and beach lovers.",
    highlights: ["The Walk", "JBR Beach", "The Beach Mall", "Street Performers", "Watersports"],
    priceLevel: "$$$",
    imageUrl: null,
    imageAlt: "JBR beach and promenade",
    vibe: "Beach",
    introText:
      "JBR (Jumeirah Beach Residence) is Dubai's most popular beachfront destination, combining residential towers with an incredible lifestyle offering. The Walk at JBR is a 1.7km outdoor promenade lined with shops, restaurants, and entertainment options, while the beach offers stunning views of Ain Dubai and Bluewaters Island.",
    bestFor: ["Families", "Beach lovers", "Casual dining fans", "People watchers"],
    nearbyAttractions: ["JBR Beach", "The Walk", "The Beach Mall", "Ain Dubai", "Marina Walk"],
    quickInfo: [
      { icon: "MapPin", label: "Location", value: "New Dubai Coast" },
      { icon: "Train", label: "Tram", value: "JBR Stations" },
      { icon: "DollarSign", label: "Average Hotel", value: "AED 600-1800/night" },
    ],
    localTips: [
      "Early morning is best for beach visits before it gets crowded",
      "The beach has designated swimming zones - look for the flags",
      "Street performers usually appear around sunset",
      "Watersports rentals are available right on the beach",
    ],
    faq: [
      {
        question: "Is JBR Beach free?",
        answer:
          "Yes, JBR Beach is a public beach and completely free to access. Sunbeds and umbrellas can be rented for a fee.",
      },
      {
        question: "What facilities are available?",
        answer:
          "JBR Beach has showers, changing rooms, lifeguards, watersports rentals, and numerous restaurants and cafes along The Walk.",
      },
    ],
    transportOptions: ["Tram", "Metro to Marina then walk", "Taxi", "Walking from Marina"],
  },
  {
    id: "old-dubai",
    name: "Old Dubai (Deira & Bur Dubai)",
    description:
      "Experience authentic Dubai culture in the historic districts of Deira and Bur Dubai. Explore traditional souks, abra rides on Dubai Creek, and heritage sites.",
    highlights: ["Gold Souk", "Spice Souk", "Dubai Creek", "Al Fahidi", "Abra Rides"],
    priceLevel: "$",
    imageUrl:
      "/images/categories/dubai/dubai-old-town-wind-towers-colorful-traditional-architecture.webp",
    imageAlt: "Traditional abra boats on Dubai Creek",
    vibe: "Cultural",
    introText:
      "Old Dubai offers a glimpse into the emirate's pearl-diving and trading past before the oil boom. The historic districts of Deira and Bur Dubai sit on opposite sides of Dubai Creek, connected by traditional abra water taxis. Wander through the atmospheric souks, visit heritage museums, and experience the multicultural fabric of old Dubai.",
    bestFor: ["Culture seekers", "History buffs", "Budget travelers", "Photography enthusiasts"],
    nearbyAttractions: [
      "Gold Souk",
      "Spice Souk",
      "Al Fahidi Historical District",
      "Dubai Museum",
      "Dubai Frame",
    ],
    quickInfo: [
      { icon: "MapPin", label: "Location", value: "Central Dubai" },
      { icon: "Train", label: "Metro", value: "Multiple Stations" },
      { icon: "DollarSign", label: "Average Hotel", value: "AED 200-600/night" },
    ],
    localTips: [
      "Take an abra across the creek - it costs just 1 AED",
      "Bargaining is expected in the souks - start at 50% of asking price",
      "Visit in the morning or evening when it's cooler",
      "The Al Fahidi District has beautiful restored wind-tower houses",
    ],
    faq: [
      {
        question: "Is it safe to walk around Old Dubai?",
        answer:
          "Yes, Old Dubai is very safe to explore on foot. The streets can be busy and crowded, especially in the souks, so keep your belongings secure.",
      },
      {
        question: "What is an abra?",
        answer:
          "An abra is a traditional wooden boat that crosses Dubai Creek. It's one of the oldest forms of transport in Dubai and costs just 1 AED for the crossing.",
      },
    ],
    transportOptions: ["Metro (Green Line)", "Abra", "Taxi", "Walking"],
  },
  {
    id: "business-bay",
    name: "Business Bay",
    description:
      "Dubai's central business district with modern high-rises, waterfront views along the Dubai Canal, and excellent connectivity to all areas.",
    highlights: ["Dubai Canal", "Business Hub", "Modern Hotels", "Bay Avenue", "Water Taxi"],
    priceLevel: "$$$",
    imageUrl: null,
    imageAlt: "Business Bay skyline and Dubai Canal",
    vibe: "Modern",
    introText:
      "Business Bay is Dubai's answer to Manhattan - a forest of skyscrapers housing offices, hotels, and residences along the Dubai Canal. The area has evolved from a pure business district to a vibrant mixed-use community with excellent restaurants, waterfront promenades, and some of the city's best value luxury hotels.",
    bestFor: [
      "Business travelers",
      "Value seekers",
      "Modern architecture fans",
      "Canal-view lovers",
    ],
    nearbyAttractions: [
      "Dubai Canal",
      "Bay Avenue Mall",
      "Downtown Dubai",
      "Dubai Design District",
    ],
    quickInfo: [
      { icon: "MapPin", label: "Location", value: "Central Dubai" },
      { icon: "Train", label: "Metro", value: "Business Bay Station" },
      { icon: "DollarSign", label: "Average Hotel", value: "AED 400-1200/night" },
    ],
    localTips: [
      "Hotels here offer great value compared to Downtown",
      "The Dubai Canal walkway is perfect for evening strolls",
      "Water taxis connect to Festival City and other areas",
      "Many restaurants have canal-side terraces",
    ],
    faq: [
      {
        question: "Is Business Bay close to Downtown Dubai?",
        answer:
          "Yes, Business Bay borders Downtown Dubai and is a 5-10 minute walk from Burj Khalifa and Dubai Mall.",
      },
      {
        question: "Is there nightlife in Business Bay?",
        answer:
          "Business Bay has a growing number of rooftop bars and restaurants, particularly along the canal. It's more sophisticated than nightclub-focused.",
      },
    ],
    transportOptions: ["Metro (Red Line)", "Water Taxi", "Taxi", "Walking to Downtown"],
  },
  {
    id: "jumeirah",
    name: "Jumeirah",
    description:
      "An upscale residential area known for its beautiful beaches, the iconic Burj Al Arab, and family-friendly atmosphere with excellent schools and parks.",
    highlights: ["Burj Al Arab", "Kite Beach", "Family Friendly", "La Mer", "Jumeirah Mosque"],
    priceLevel: "$$$$",
    imageUrl: null,
    imageAlt: "Jumeirah beach with Burj Al Arab",
    vibe: "Luxury",
    introText:
      "Jumeirah is Dubai's most prestigious residential neighborhood, stretching along the coast and home to the iconic Burj Al Arab hotel. The area features beautiful public beaches like Kite Beach, upscale shopping on Jumeirah Beach Road, and some of the city's finest restaurants. It's particularly popular with families due to excellent schools and safe, quiet streets.",
    bestFor: ["Families", "Luxury travelers", "Beach lovers", "Long-stay visitors"],
    nearbyAttractions: ["Burj Al Arab", "Kite Beach", "La Mer", "Jumeirah Mosque", "Box Park"],
    quickInfo: [
      { icon: "MapPin", label: "Location", value: "Coastal Dubai" },
      { icon: "Car", label: "Transport", value: "Taxi/Bus" },
      { icon: "DollarSign", label: "Average Hotel", value: "AED 1000-4000/night" },
    ],
    localTips: [
      "Kite Beach is free and has excellent facilities",
      "Jumeirah Mosque offers guided tours for non-Muslims",
      "La Mer is great for families with beach and entertainment",
      "Many beachfront hotels offer day passes",
    ],
    faq: [
      {
        question: "Can I visit Burj Al Arab?",
        answer:
          "You can visit by booking afternoon tea, a restaurant reservation, or a guided tour. Advance booking is essential.",
      },
      {
        question: "Is Jumeirah on the Metro?",
        answer:
          "No, Jumeirah is not directly served by the Metro. The best options are taxi, bus, or ride-sharing apps.",
      },
    ],
    transportOptions: ["Taxi", "Bus", "Uber/Careem", "Limited Metro access"],
  },
  {
    id: "difc",
    name: "DIFC - Dubai International Financial Centre",
    description:
      "The financial heart of the Middle East featuring world-class art galleries, high-end restaurants, and luxury boutiques in a sophisticated urban setting.",
    highlights: ["Art Galleries", "Fine Dining", "Business", "Gate Avenue", "Sculptures"],
    priceLevel: "$$$$",
    imageUrl: null,
    imageAlt: "DIFC Gate Building and art district",
    vibe: "Luxury",
    introText:
      "DIFC (Dubai International Financial Centre) has transformed from a financial district into a cultural hub with Dubai's highest concentration of art galleries, Michelin-starred restaurants, and designer boutiques. The pedestrian-friendly streets feature impressive public art installations, and the Gate Avenue mall offers premium shopping and dining.",
    bestFor: ["Business travelers", "Art lovers", "Foodies", "Professionals"],
    nearbyAttractions: [
      "Gate Village galleries",
      "Gate Avenue",
      "ICD Brookfield Place",
      "Opera Gallery",
    ],
    quickInfo: [
      { icon: "MapPin", label: "Location", value: "Central Dubai" },
      { icon: "Train", label: "Metro", value: "DIFC Station" },
      { icon: "DollarSign", label: "Average Hotel", value: "AED 800-2000/night" },
    ],
    localTips: [
      "Gallery hopping is free and all galleries are walkable",
      "Art Nights Dubai brings extra events in March",
      "Gate Avenue has excellent lunch spots for working professionals",
      "La Petite Maison and Zuma are DIFC dining institutions",
    ],
    faq: [
      {
        question: "Is DIFC only for business people?",
        answer:
          "No! DIFC has become a lifestyle destination with galleries, restaurants, and shopping that attracts visitors from across the city.",
      },
      {
        question: "Are the galleries free to enter?",
        answer:
          "Yes, most galleries in DIFC are free to enter and open to the public. Just check opening hours as many close on Fridays.",
      },
    ],
    transportOptions: ["Metro (Red Line)", "Taxi", "Walking from Downtown"],
  },
  {
    id: "dubai-creek-harbour",
    name: "Dubai Creek Harbour",
    description:
      "A new waterfront development at the historic Dubai Creek featuring the upcoming Dubai Creek Tower, stunning views, and modern living spaces.",
    highlights: [
      "Creek Views",
      "New Development",
      "Modern Living",
      "Harbour Promenade",
      "Creek Marina",
    ],
    priceLevel: "$$$",
    imageUrl: null,
    imageAlt: "Dubai Creek Harbour waterfront",
    vibe: "Modern",
    introText:
      "Dubai Creek Harbour is one of Dubai's newest mega-developments, set to become a major destination when the Dubai Creek Tower (designed to surpass Burj Khalifa) is completed. Already, the area offers beautiful waterfront living with views of the historic creek, wildlife sanctuary, and the city skyline.",
    bestFor: [
      "Modern architecture fans",
      "Peace seekers",
      "Bird watchers",
      "New development enthusiasts",
    ],
    nearbyAttractions: ["Creek Marina", "Ras Al Khor Wildlife Sanctuary", "Dubai Festival City"],
    quickInfo: [
      { icon: "MapPin", label: "Location", value: "Creek Side" },
      { icon: "Car", label: "Transport", value: "Taxi/Car" },
      { icon: "DollarSign", label: "Average Hotel", value: "AED 400-1000/night" },
    ],
    localTips: [
      "The promenade offers amazing sunset views over the creek",
      "Visit the Ras Al Khor Wildlife Sanctuary nearby for flamingo watching",
      "Still developing so fewer restaurants than other areas",
      "Great for photography of the skyline from a unique angle",
    ],
    transportOptions: ["Taxi", "Uber/Careem", "Water Taxi"],
  },
  {
    id: "dubai-hills",
    name: "Dubai Hills Estate",
    description:
      "A premium master-planned community with an 18-hole championship golf course, Dubai Hills Mall, and lush green spaces perfect for families.",
    highlights: ["Golf Course", "Dubai Hills Mall", "Parks", "Green Spaces", "Family Community"],
    priceLevel: "$$$",
    imageUrl: null,
    imageAlt: "Dubai Hills golf course and villas",
    vibe: "Family",
    introText:
      "Dubai Hills Estate is a sprawling master-planned community that represents Dubai's vision for suburban living. The area features an 18-hole championship golf course, the massive Dubai Hills Mall, extensive parks and green spaces, and a mix of villas and apartments. It's particularly popular with families seeking a quieter lifestyle while staying connected to the city.",
    bestFor: ["Families", "Golfers", "Nature lovers", "Long-stay visitors"],
    nearbyAttractions: ["Dubai Hills Mall", "Dubai Hills Golf Club", "Dubai Hills Park"],
    quickInfo: [
      { icon: "MapPin", label: "Location", value: "Al Barsha South" },
      { icon: "Car", label: "Transport", value: "Taxi/Car" },
      { icon: "DollarSign", label: "Average Hotel", value: "AED 350-900/night" },
    ],
    localTips: [
      "Dubai Hills Mall is one of the city's newest and largest",
      "The golf course welcomes non-members",
      "Parks are great for morning walks and exercise",
      "More residential so fewer tourist-focused attractions",
    ],
    transportOptions: ["Taxi", "Uber/Careem", "Car rental recommended"],
  },
  {
    id: "al-barsha",
    name: "Al Barsha",
    description:
      "A centrally located residential area home to Mall of the Emirates and Ski Dubai. Offers great value with easy access to all major attractions.",
    highlights: [
      "Mall of Emirates",
      "Ski Dubai",
      "Central Location",
      "Value Hotels",
      "Metro Access",
    ],
    priceLevel: "$$",
    imageUrl: null,
    imageAlt: "Mall of the Emirates exterior",
    vibe: "Shopping",
    introText:
      "Al Barsha is a practical, centrally-located neighborhood that offers excellent value for visitors. Its main draw is the Mall of the Emirates, home to the incredible Ski Dubai indoor ski slope. The area has good Metro connectivity, making it easy to reach beaches, Downtown, and other attractions. Hotels here are significantly cheaper than Marina or Downtown.",
    bestFor: ["Budget-conscious travelers", "Families", "Mall lovers", "Central base seekers"],
    nearbyAttractions: ["Mall of the Emirates", "Ski Dubai", "Museum of the Future (nearby)"],
    quickInfo: [
      { icon: "MapPin", label: "Location", value: "Central Dubai" },
      { icon: "Train", label: "Metro", value: "Mall of Emirates Station" },
      { icon: "DollarSign", label: "Average Hotel", value: "AED 250-600/night" },
    ],
    localTips: [
      "Ski Dubai is a must-do unique experience",
      "Hotels here are 30-50% cheaper than Marina/Downtown",
      "Metro makes getting around very easy",
      "Lots of budget-friendly restaurants in the area",
    ],
    transportOptions: ["Metro (Red Line)", "Taxi", "Bus"],
  },
  {
    id: "jvc",
    name: "JVC - Jumeirah Village Circle",
    description:
      "A family-friendly community with affordable housing options, community parks, and growing amenities. Ideal for long-term stays and budget-conscious travelers.",
    highlights: [
      "Affordable",
      "Community Parks",
      "Family Friendly",
      "Growing Amenities",
      "Local Vibe",
    ],
    priceLevel: "$",
    imageUrl: null,
    imageAlt: "JVC community park and buildings",
    vibe: "Local",
    introText:
      "JVC (Jumeirah Village Circle) is a popular residential community known for affordable apartments and a genuine neighborhood feel. While not a tourist destination, it offers authentic local living, community parks, and increasingly good dining options. It's ideal for long-term stays or budget travelers who want to live like a local.",
    bestFor: ["Long-stay visitors", "Budget travelers", "Local experience seekers", "Families"],
    nearbyAttractions: ["JVC Community Parks", "Circle Mall", "Dubai Sports City (nearby)"],
    quickInfo: [
      { icon: "MapPin", label: "Location", value: "New Dubai" },
      { icon: "Car", label: "Transport", value: "Taxi/Car" },
      { icon: "DollarSign", label: "Average Hotel/Apt", value: "AED 150-400/night" },
    ],
    localTips: [
      "Great for apartment rentals on monthly basis",
      "Circle Mall has supermarkets and basic amenities",
      "Not on Metro so you'll need taxi/car",
      "Community feel with parks for jogging and relaxing",
    ],
    transportOptions: ["Taxi", "Uber/Careem", "Car rental recommended"],
  },
  {
    id: "dubai-south",
    name: "Dubai South",
    description:
      "A rapidly developing area near Al Maktoum International Airport and Expo City Dubai. The future of Dubai with excellent investment potential.",
    highlights: ["Expo City", "Airport Access", "New Development", "Future Vision", "Golf Course"],
    priceLevel: "$$",
    imageUrl: null,
    imageAlt: "Expo City Dubai pavilions",
    vibe: "Modern",
    introText:
      "Dubai South is the city's master-planned future, designed around Al Maktoum International Airport (set to become the world's largest) and Expo City Dubai. The area hosted Expo 2020 and many pavilions have been transformed into permanent attractions. It's a vision of Dubai's next chapter, with growing residential and commercial developments.",
    bestFor: ["Business travelers", "Expo City visitors", "Future-focused visitors"],
    nearbyAttractions: ["Expo City Dubai", "Al Maktoum Airport", "Dubai South Golf Course"],
    quickInfo: [
      { icon: "MapPin", label: "Location", value: "Southern Dubai" },
      { icon: "Train", label: "Metro", value: "Route 2020 Extension" },
      { icon: "DollarSign", label: "Average Hotel", value: "AED 300-700/night" },
    ],
    localTips: [
      "Expo City has ongoing exhibitions and events",
      "Good choice if flying from Al Maktoum Airport",
      "Still developing so amenities are limited",
      "Metro Route 2020 connects to main network",
    ],
    transportOptions: ["Metro (Route 2020)", "Taxi", "Car"],
  },
  {
    id: "bluewaters-island",
    name: "Bluewaters Island",
    description:
      "A lifestyle destination featuring Ain Dubai (the world's largest observation wheel), upscale dining, and stunning views of the Arabian Gulf.",
    highlights: ["Ain Dubai", "Dining", "Entertainment", "Caesar's Palace", "Sea Views"],
    priceLevel: "$$$$",
    imageUrl: null,
    imageAlt: "Ain Dubai observation wheel",
    vibe: "Entertainment",
    introText:
      "Bluewaters Island is Dubai's newest lifestyle destination, anchored by Ain Dubai - the world's largest and tallest observation wheel at 250 meters. The island features upscale dining options, the Caesar's Palace Dubai resort, and stunning views of JBR and the Marina skyline. It's connected to JBR by a pedestrian bridge.",
    bestFor: ["Experience seekers", "View lovers", "Couples", "Dining enthusiasts"],
    nearbyAttractions: ["Ain Dubai", "Caesar's Palace", "JBR (connected by bridge)"],
    quickInfo: [
      { icon: "MapPin", label: "Location", value: "Off JBR Coast" },
      { icon: "Walking", label: "Access", value: "Bridge from JBR" },
      { icon: "DollarSign", label: "Average Hotel", value: "AED 1500-4000/night" },
    ],
    localTips: [
      "Book Ain Dubai tickets in advance, especially for sunset slots",
      "The bridge from JBR makes for a nice evening walk",
      "Multiple dining options with amazing views",
      "Caesar's Palace has excellent day/pool access packages",
    ],
    transportOptions: ["Walk from JBR", "Taxi to entrance", "Tram to JBR then walk"],
  },
  {
    id: "international-city",
    name: "International City",
    description:
      "A multicultural community with themed clusters representing different countries. Known for affordable living and diverse dining options.",
    highlights: ["Multicultural", "Affordable", "Dragon Mart", "Diverse Cuisine", "Local Life"],
    priceLevel: "$",
    imageUrl: null,
    imageAlt: "International City themed buildings",
    vibe: "Budget",
    introText:
      "International City is a unique residential development with themed clusters styled after different countries - China, Persia, Morocco, Greece, and more. It's home to Dragon Mart, one of the largest trading hubs for Chinese goods outside China. The area offers Dubai's most affordable accommodation and authentic international cuisine from its diverse residents.",
    bestFor: ["Budget travelers", "Wholesale shoppers", "Food adventurers", "Long-stay visitors"],
    nearbyAttractions: ["Dragon Mart", "Global Village (seasonal)", "Dubai Silicon Oasis"],
    quickInfo: [
      { icon: "MapPin", label: "Location", value: "Eastern Dubai" },
      { icon: "Car", label: "Transport", value: "Taxi/Bus" },
      { icon: "DollarSign", label: "Average Hotel/Apt", value: "AED 100-300/night" },
    ],
    localTips: [
      "Dragon Mart is massive - plan for a full day if shopping",
      "Amazing authentic Chinese, Filipino, and Indian restaurants",
      "Not on Metro - budget for taxi costs",
      "Very hot in summer with limited shade",
    ],
    transportOptions: ["Taxi", "Bus", "Car rental"],
  },
  {
    id: "al-karama",
    name: "Al Karama",
    description:
      "A bustling commercial area known for its shopping centers, textile shops, and diverse restaurants. A great place for budget shopping and authentic cuisine.",
    highlights: ["Shopping", "Budget Friendly", "Restaurants", "Textiles", "Metro Access"],
    priceLevel: "$",
    imageUrl: null,
    imageAlt: "Al Karama shopping area",
    vibe: "Local",
    introText:
      "Al Karama is one of Dubai's oldest and most vibrant neighborhoods, known for its bustling streets, textile shops, and incredibly diverse food scene. It's the go-to place for bargain shopping (though beware of counterfeit goods) and authentic cuisine from South Asia, the Philippines, and beyond. The area has excellent Metro access, making it a budget-friendly base.",
    bestFor: ["Budget shoppers", "Food lovers", "Authentic experience seekers", "Budget travelers"],
    nearbyAttractions: ["Karama Market", "Dubai Frame (nearby)", "Zabeel Park"],
    quickInfo: [
      { icon: "MapPin", label: "Location", value: "Central Dubai" },
      { icon: "Train", label: "Metro", value: "ADCB/Karama Station" },
      { icon: "DollarSign", label: "Average Hotel", value: "AED 150-400/night" },
    ],
    localTips: [
      "Bargain hard - prices are often inflated for tourists",
      "Be wary of fake branded goods",
      "Amazing Indian and Filipino restaurants throughout",
      "Great Metro access to all parts of Dubai",
    ],
    transportOptions: ["Metro (Green Line)", "Taxi", "Bus", "Walking-friendly"],
  },
];

// Add hero carousel images and custom data to destinations
export const DESTINATION_DATA: Record<DestinationId, DestinationPageData> = {
  ...baseDestinationData,
  "abu-dhabi": {
    ...baseDestinationData["abu-dhabi"],
    hero: {
      ...baseDestinationData["abu-dhabi"].hero,
      images: abuDhabiHeroImages,
    },
  },
  dubai: {
    ...baseDestinationData["dubai"],
    neighborhoods: dubaiNeighborhoods,
  },
};

// Helper function to get destination data by slug
export function getDestinationBySlug(slug: string): DestinationPageData | undefined {
  return DESTINATION_DATA[slug as DestinationId];
}

// List of all destination slugs for routing
export const DESTINATION_SLUGS = Object.keys(DESTINATION_DATA) as DestinationId[];

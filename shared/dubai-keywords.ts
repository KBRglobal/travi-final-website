/**
 * Dubai Tourism SEO Keywords
 * Real keyword data organized by category for content optimization
 */

export interface TopicKeyword {
  topic: string;
  keywords: string[];
}

export const DUBAI_KEYWORDS: Record<string, { name: string; topics: TopicKeyword[] }> = {
  attractions: {
    name: "Attractions & Landmarks",
    topics: [
      {
        topic: "burj khalifa",
        keywords: [
          "burj khalifa tickets",
          "burj khalifa observation deck",
          "at the top burj khalifa",
          "burj khalifa ticket price",
          "burj khalifa height",
          "burj khalifa at night",
        ],
      },
      {
        topic: "dubai mall",
        keywords: [
          "dubai mall shops",
          "dubai mall aquarium",
          "dubai mall fountain show",
          "dubai mall ice rink",
          "dubai mall opening hours",
        ],
      },
      {
        topic: "dubai frame",
        keywords: [
          "dubai frame tickets",
          "dubai frame ticket price",
          "dubai frame height",
          "dubai frame opening hours",
        ],
      },
      {
        topic: "palm jumeirah",
        keywords: [
          "palm jumeirah attractions",
          "palm jumeirah beach",
          "the pointe palm jumeirah",
          "atlantis the palm",
          "palm jumeirah boardwalk",
        ],
      },
      {
        topic: "museum of the future",
        keywords: [
          "museum of the future dubai tickets",
          "museum of the future dubai price",
          "museum of the future opening hours",
        ],
      },
      {
        topic: "dubai aquarium",
        keywords: [
          "dubai aquarium tickets",
          "dubai aquarium and underwater zoo",
          "dubai aquarium ticket price",
          "dubai mall aquarium",
        ],
      },
      {
        topic: "miracle garden",
        keywords: [
          "dubai miracle garden tickets",
          "dubai miracle garden season",
          "miracle garden opening hours",
          "miracle garden dubai price",
        ],
      },
      {
        topic: "global village",
        keywords: [
          "global village dubai tickets",
          "global village dubai season",
          "global village opening hours",
          "global village dubai price",
        ],
      },
    ],
  },
  hotels: {
    name: "Hotels & Accommodation",
    topics: [
      {
        topic: "luxury hotels",
        keywords: [
          "best luxury hotels in dubai",
          "5 star hotels dubai",
          "burj al arab hotel",
          "atlantis the royal dubai",
          "best hotels in dubai marina",
        ],
      },
      {
        topic: "budget hotels",
        keywords: [
          "cheap hotels in dubai",
          "budget hotels dubai",
          "affordable hotels dubai",
          "dubai hotels under 200 aed",
          "best value hotels dubai",
        ],
      },
      {
        topic: "family hotels",
        keywords: [
          "best family hotels dubai",
          "dubai hotels with kids club",
          "family resorts dubai",
          "all inclusive family hotels dubai",
        ],
      },
      {
        topic: "beach hotels",
        keywords: [
          "best beach hotels dubai",
          "jbr beach hotels",
          "palm jumeirah hotels",
          "dubai beachfront hotels",
          "hotels with private beach dubai",
        ],
      },
      {
        topic: "downtown hotels",
        keywords: [
          "hotels near burj khalifa",
          "downtown dubai hotels",
          "hotels near dubai mall",
          "best hotels downtown dubai",
        ],
      },
    ],
  },
  activities: {
    name: "Activities & Experiences",
    topics: [
      {
        topic: "desert safari",
        keywords: [
          "desert safari dubai",
          "desert safari dubai price",
          "evening desert safari",
          "morning desert safari dubai",
          "overnight desert safari dubai",
          "desert safari with bbq dinner",
        ],
      },
      {
        topic: "water activities",
        keywords: [
          "aquaventure waterpark dubai",
          "wild wadi waterpark",
          "jet ski dubai",
          "scuba diving dubai",
          "dubai boat tour",
          "yacht rental dubai",
        ],
      },
      {
        topic: "adventure activities",
        keywords: [
          "skydiving dubai",
          "dubai skydive palm",
          "xline dubai marina",
          "bungee jumping dubai",
          "indoor skydiving dubai",
          "flyboarding dubai",
        ],
      },
      {
        topic: "cultural experiences",
        keywords: [
          "old dubai tour",
          "al fahidi historic district",
          "dubai creek abra ride",
          "gold souk dubai",
          "spice souk dubai",
          "dubai heritage village",
        ],
      },
      {
        topic: "theme parks",
        keywords: [
          "img worlds of adventure dubai",
          "legoland dubai",
          "motiongate dubai",
          "dubai parks and resorts",
          "ski dubai",
        ],
      },
      {
        topic: "things to do",
        keywords: [
          "things to do in dubai",
          "free things to do in dubai",
          "top 10 things to do in dubai",
          "things to do in dubai at night",
          "things to do in dubai with kids",
          "unique things to do in dubai",
        ],
      },
    ],
  },
  dining: {
    name: "Dining & Restaurants",
    topics: [
      {
        topic: "fine dining",
        keywords: [
          "best restaurants in dubai",
          "fine dining dubai",
          "michelin star restaurants dubai",
          "rooftop restaurants dubai",
          "restaurants with burj khalifa view",
        ],
      },
      {
        topic: "brunch",
        keywords: [
          "friday brunch dubai",
          "best brunch in dubai",
          "all you can eat brunch dubai",
          "pool brunch dubai",
          "cheap brunch dubai",
        ],
      },
      {
        topic: "street food",
        keywords: [
          "street food dubai",
          "best shawarma dubai",
          "cheap eats dubai",
          "dubai street food guide",
          "al rigga food street",
        ],
      },
      {
        topic: "cafes",
        keywords: [
          "best cafes in dubai",
          "instagram cafes dubai",
          "specialty coffee dubai",
          "cafe with view dubai",
        ],
      },
    ],
  },
  practical: {
    name: "Practical Information",
    topics: [
      {
        topic: "visa",
        keywords: [
          "dubai visa",
          "dubai tourist visa",
          "dubai visa on arrival",
          "dubai visa requirements",
          "dubai transit visa",
          "uae visa application",
        ],
      },
      {
        topic: "weather",
        keywords: [
          "dubai weather",
          "best time to visit dubai",
          "dubai weather in december",
          "dubai weather in january",
          "dubai summer temperature",
          "dubai winter weather",
        ],
      },
      {
        topic: "transport",
        keywords: [
          "dubai metro",
          "dubai metro map",
          "dubai airport transfer",
          "nol card dubai",
          "dubai taxi fare",
          "dubai tram",
          "rta dubai",
        ],
      },
      {
        topic: "money",
        keywords: [
          "dubai currency",
          "aed to usd",
          "tipping in dubai",
          "dubai cost of living",
          "how much money for dubai trip",
          "dubai budget travel",
        ],
      },
      {
        topic: "safety",
        keywords: [
          "is dubai safe",
          "dubai dress code",
          "dubai rules for tourists",
          "dubai laws for tourists",
          "ramadan rules dubai tourists",
        ],
      },
    ],
  },
  seasonal: {
    name: "Seasonal & Events",
    topics: [
      {
        topic: "new year",
        keywords: [
          "dubai new year fireworks",
          "new year in dubai",
          "new year eve dubai",
          "burj khalifa new year",
          "dubai new year 2026",
        ],
      },
      {
        topic: "ramadan",
        keywords: [
          "dubai ramadan",
          "ramadan in dubai for tourists",
          "dubai iftar",
          "ramadan timings dubai",
        ],
      },
      {
        topic: "summer deals",
        keywords: [
          "dubai summer deals",
          "dubai summer surprises",
          "dubai hotel deals summer",
          "things to do in dubai summer",
          "indoor activities dubai summer",
        ],
      },
      {
        topic: "shopping festival",
        keywords: [
          "dubai shopping festival",
          "dsf dubai",
          "dubai super sale",
          "dubai shopping deals",
          "best shopping in dubai",
        ],
      },
      {
        topic: "eid",
        keywords: ["eid in dubai", "eid al fitr dubai", "eid offers dubai", "eid activities dubai"],
      },
    ],
  },
  neighborhoods: {
    name: "Neighborhoods & Areas",
    topics: [
      {
        topic: "dubai marina",
        keywords: [
          "dubai marina walk",
          "dubai marina restaurants",
          "dubai marina beach",
          "jbr walk dubai",
          "ain dubai",
        ],
      },
      {
        topic: "downtown dubai",
        keywords: [
          "downtown dubai attractions",
          "dubai fountain show times",
          "souk al bahar",
          "dubai opera",
          "downtown dubai restaurants",
        ],
      },
      {
        topic: "deira",
        keywords: ["deira dubai", "deira gold souk", "deira city centre", "deira night market"],
      },
      {
        topic: "jumeirah",
        keywords: [
          "jumeirah beach",
          "jumeirah beach road",
          "jumeirah mosque",
          "la mer dubai",
          "kite beach dubai",
        ],
      },
    ],
  },
};

// Flatten all topics for search
const allTopics: TopicKeyword[] = Object.values(DUBAI_KEYWORDS).flatMap(cat => cat.topics);

export function searchTopics(query: string): TopicKeyword[] {
  const q = query.toLowerCase();
  return allTopics.filter(
    t =>
      t.topic.toLowerCase().includes(q) ||
      q.includes(t.topic.toLowerCase()) ||
      t.keywords.some(k => k.includes(q) || q.includes(k))
  );
}

export function getAllTopics(): TopicKeyword[] {
  return allTopics;
}

export function getTopicsByCategory(cat: string): TopicKeyword[] {
  const category = DUBAI_KEYWORDS[cat.toLowerCase()];
  return category ? category.topics : [];
}

export const IMAGE_TYPES: string[] = [
  "hero",
  "gallery",
  "thumbnail",
  "map",
  "infographic",
  "comparison",
  "panorama",
];

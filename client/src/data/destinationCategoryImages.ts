/**
 * Destination Category Images Configuration
 * SEO/AEO optimized filenames
 *
 * Image Location: client/public/images/categories/{city}/
 * Each city needs 3 images with SEO-friendly names
 */

const baseImagePath = "/images/categories";

export interface CategoryImage {
  filename: string;
  alt: string;
  category: "attractions" | "food" | "culture";
  categoryLabel: string;
  path: string;
}

export interface DestinationCategoryConfig {
  slug: string;
  name: string;
  images: CategoryImage[];
  metaTags: {
    title: string;
    description: string;
    keywords: string;
  };
}

export const destinationCategoryImages: Record<string, DestinationCategoryConfig> = {
  "abu-dhabi": {
    slug: "abu-dhabi",
    name: "Abu Dhabi",
    images: [
      {
        filename: "abu-dhabi-sheikh-zayed-mosque-sunrise-islamic-architecture.webp",
        alt: "Sheikh Zayed Grand Mosque at sunrise with stunning Islamic architecture in Abu Dhabi",
        category: "attractions",
        categoryLabel: "Top Attractions",
        path: `${baseImagePath}/abu-dhabi/abu-dhabi-sheikh-zayed-mosque-sunrise-islamic-architecture.webp`,
      },
      {
        filename: "abu-dhabi-traditional-emirati-cuisine-majlis-dining.webp",
        alt: "Traditional Emirati cuisine served in authentic majlis-style dining in Abu Dhabi",
        category: "food",
        categoryLabel: "Food & Dining",
        path: `${baseImagePath}/abu-dhabi/abu-dhabi-traditional-emirati-cuisine-majlis-dining.webp`,
      },
      {
        filename: "abu-dhabi-heritage-village-traditional-dhow-boats-culture.webp",
        alt: "Abu Dhabi Heritage Village with traditional dhow boats showcasing Emirati culture",
        category: "culture",
        categoryLabel: "Culture & Lifestyle",
        path: `${baseImagePath}/abu-dhabi/abu-dhabi-heritage-village-traditional-dhow-boats-culture.webp`,
      },
    ],
    metaTags: {
      title: "Abu Dhabi Travel Guide 2025 - Mosques, Culture & Luxury | TRAVI",
      description:
        "Discover Abu Dhabi with TRAVI: Sheikh Zayed Mosque, Louvre Abu Dhabi, traditional Emirati heritage, luxury resorts, and desert experiences. Your 2025 Abu Dhabi guide.",
      keywords:
        "Abu Dhabi travel, Sheikh Zayed Mosque, Louvre Abu Dhabi, Emirati culture, Abu Dhabi desert safari, UAE capital travel guide 2025",
    },
  },

  amsterdam: {
    slug: "amsterdam",
    name: "Amsterdam",
    images: [
      {
        filename: "amsterdam-museums-anne-frank-house-rijksmuseum.webp",
        alt: "Amsterdam landmarks including Anne Frank House, Westerkerk tower, and Rijksmuseum",
        category: "attractions",
        categoryLabel: "Top Attractions",
        path: `${baseImagePath}/amsterdam/amsterdam-museums-anne-frank-house-rijksmuseum.webp`,
      },
      {
        filename: "amsterdam-canal-dining-dutch-pancakes-breakfast.webp",
        alt: "Dutch pancakes and beer on canalside table in Amsterdam",
        category: "food",
        categoryLabel: "Food & Dining",
        path: `${baseImagePath}/amsterdam/amsterdam-canal-dining-dutch-pancakes-breakfast.webp`,
      },
      {
        filename: "amsterdam-cycling-canal-flower-market-colorful-flags.webp",
        alt: "Cyclists riding along Amsterdam canal with flower market and colorful flags",
        category: "culture",
        categoryLabel: "Culture & Lifestyle",
        path: `${baseImagePath}/amsterdam/amsterdam-cycling-canal-flower-market-colorful-flags.webp`,
      },
    ],
    metaTags: {
      title: "Amsterdam Travel Guide 2025 - Attractions, Hotels & Tips | TRAVI",
      description:
        "Discover Amsterdam with TRAVI: explore canal cruises, Anne Frank House, Rijksmuseum, Dutch cuisine, and cycling culture. Complete 2025 guide with personalized recommendations.",
      keywords:
        "Amsterdam travel, Amsterdam attractions, canal cruises, Anne Frank House, Rijksmuseum, Dutch pancakes, Amsterdam cycling, flower market, Netherlands travel guide 2025",
    },
  },

  bangkok: {
    slug: "bangkok",
    name: "Bangkok",
    images: [
      {
        filename: "bangkok-wat-arun-temple-chao-phraya-river-longtail-boat.webp",
        alt: "Wat Arun temple at sunset with longtail boat on Chao Phraya River in Bangkok",
        category: "attractions",
        categoryLabel: "Top Attractions",
        path: `${baseImagePath}/bangkok/bangkok-wat-arun-temple-chao-phraya-river-longtail-boat.webp`,
      },
      {
        filename: "bangkok-street-food-market-noodles-neon-signs.webp",
        alt: "Thai street food noodles at night market with colorful neon signs in Bangkok",
        category: "food",
        categoryLabel: "Food & Dining",
        path: `${baseImagePath}/bangkok/bangkok-street-food-market-noodles-neon-signs.webp`,
      },
      {
        filename: "bangkok-grand-palace-golden-stupa-monks-temple.webp",
        alt: "Buddhist monks at Grand Palace golden stupa temple complex in Bangkok",
        category: "culture",
        categoryLabel: "Culture & Lifestyle",
        path: `${baseImagePath}/bangkok/bangkok-grand-palace-golden-stupa-monks-temple.webp`,
      },
    ],
    metaTags: {
      title: "Bangkok Travel Guide 2025 - Temples, Street Food & Culture | TRAVI",
      description:
        "Experience Bangkok with TRAVI: Wat Arun, Grand Palace, authentic street food markets, floating markets, and Thai cultural experiences. Your complete 2025 Bangkok guide.",
      keywords:
        "Bangkok travel, Bangkok temples, Wat Arun, Grand Palace, Thai street food, Bangkok night markets, Chao Phraya River, Thailand travel guide 2025",
    },
  },

  barcelona: {
    slug: "barcelona",
    name: "Barcelona",
    images: [
      {
        filename: "barcelona-sagrada-familia-park-guell-gaudi-architecture.webp",
        alt: "Sagrada Familia and Park Güell showcasing Gaudí's iconic architecture in Barcelona",
        category: "attractions",
        categoryLabel: "Top Attractions",
        path: `${baseImagePath}/barcelona/barcelona-sagrada-familia-park-guell-gaudi-architecture.webp`,
      },
      {
        filename: "barcelona-paella-seafood-colorful-buildings-terrace.webp",
        alt: "Traditional Spanish paella with seafood on terrace overlooking colorful Barcelona buildings",
        category: "food",
        categoryLabel: "Food & Dining",
        path: `${baseImagePath}/barcelona/barcelona-paella-seafood-colorful-buildings-terrace.webp`,
      },
      {
        filename: "barcelona-casa-batllo-gaudi-mosaic-facade-passeig-de-gracia.webp",
        alt: "Casa Batlló Gaudí mosaic facade on Passeig de Gràcia in Barcelona",
        category: "culture",
        categoryLabel: "Culture & Lifestyle",
        path: `${baseImagePath}/barcelona/barcelona-casa-batllo-gaudi-mosaic-facade-passeig-de-gracia.webp`,
      },
    ],
    metaTags: {
      title: "Barcelona Travel Guide 2025 - Gaudí, Beaches & Tapas | TRAVI",
      description:
        "Explore Barcelona with TRAVI: Sagrada Familia, Park Güell, Gothic Quarter, Mediterranean beaches, tapas bars, and Catalan culture. Complete 2025 Barcelona guide.",
      keywords:
        "Barcelona travel, Sagrada Familia, Park Güell, Gaudí architecture, Barcelona beaches, Spanish tapas, Las Ramblas, Catalonia Spain travel 2025",
    },
  },

  dubai: {
    slug: "dubai",
    name: "Dubai",
    images: [
      {
        filename: "dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        alt: "Palm Jumeirah and Dubai Marina skyline at sunset with modern architecture",
        category: "attractions",
        categoryLabel: "Top Attractions",
        path: `${baseImagePath}/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp`,
      },
      {
        filename: "dubai-arabic-breakfast-burj-khalifa-view-rooftop-terrace.webp",
        alt: "Arabic breakfast spread with Burj Khalifa view from rooftop terrace in Dubai",
        category: "food",
        categoryLabel: "Food & Dining",
        path: `${baseImagePath}/dubai/dubai-arabic-breakfast-burj-khalifa-view-rooftop-terrace.webp`,
      },
      {
        filename: "dubai-old-town-wind-towers-colorful-traditional-architecture.webp",
        alt: "Traditional wind towers and colorful architecture in Dubai Old Town heritage district",
        category: "culture",
        categoryLabel: "Culture & Lifestyle",
        path: `${baseImagePath}/dubai/dubai-old-town-wind-towers-colorful-traditional-architecture.webp`,
      },
    ],
    metaTags: {
      title: "Dubai Travel Guide 2025 - Luxury, Desert & Modern Marvels | TRAVI",
      description:
        "Discover Dubai with TRAVI: Burj Khalifa, Palm Jumeirah, desert safaris, luxury shopping, traditional souks, and world-class dining. Your 2025 Dubai guide.",
      keywords:
        "Dubai travel, Burj Khalifa, Palm Jumeirah, Dubai Marina, desert safari, Dubai Mall, traditional souks, UAE travel guide 2025",
    },
  },

  "hong-kong": {
    slug: "hong-kong",
    name: "Hong Kong",
    images: [
      {
        filename: "hong-kong-tian-tan-buddha-victoria-harbour-star-ferry-skyline.webp",
        alt: "Tian Tan Buddha, Victoria Harbour, and Star Ferry with Hong Kong skyline",
        category: "attractions",
        categoryLabel: "Top Attractions",
        path: `${baseImagePath}/hong-kong/hong-kong-tian-tan-buddha-victoria-harbour-star-ferry-skyline.webp`,
      },
      {
        filename: "hong-kong-dim-sum-traditional-bamboo-steamers-tea-house.webp",
        alt: "Traditional dim sum in bamboo steamers at authentic Hong Kong tea house",
        category: "food",
        categoryLabel: "Food & Dining",
        path: `${baseImagePath}/hong-kong/hong-kong-dim-sum-traditional-bamboo-steamers-tea-house.webp`,
      },
      {
        filename: "hong-kong-temple-incense-colorful-flags-street-market.webp",
        alt: "Traditional temple with incense coils and colorful prayer flags at Hong Kong street market",
        category: "culture",
        categoryLabel: "Culture & Lifestyle",
        path: `${baseImagePath}/hong-kong/hong-kong-temple-incense-colorful-flags-street-market.webp`,
      },
    ],
    metaTags: {
      title: "Hong Kong Travel Guide 2025 - Skyline, Dim Sum & Culture | TRAVI",
      description:
        "Experience Hong Kong with TRAVI: Victoria Peak, Star Ferry, authentic dim sum, traditional temples, night markets, and fusion culture. Complete 2025 Hong Kong guide.",
      keywords:
        "Hong Kong travel, Victoria Harbour, Tian Tan Buddha, dim sum, Hong Kong skyline, Star Ferry, Temple Street Market, Hong Kong travel guide 2025",
    },
  },

  istanbul: {
    slug: "istanbul",
    name: "Istanbul",
    images: [
      {
        filename: "istanbul-hagia-sophia-bosphorus-bridge-sultanahmet-sunset.webp",
        alt: "Hagia Sophia and Bosphorus Bridge at sunset in Sultanahmet district Istanbul",
        category: "attractions",
        categoryLabel: "Top Attractions",
        path: `${baseImagePath}/istanbul/istanbul-hagia-sophia-bosphorus-bridge-sultanahmet-sunset.webp`,
      },
      {
        filename: "istanbul-turkish-desserts-pastry-shops-colorful-architecture.webp",
        alt: "Turkish desserts and pastries display at traditional shop with colorful Istanbul architecture",
        category: "food",
        categoryLabel: "Food & Dining",
        path: `${baseImagePath}/istanbul/istanbul-turkish-desserts-pastry-shops-colorful-architecture.webp`,
      },
      {
        filename: "istanbul-spice-bazaar-mosque-colorful-textiles-sunset.webp",
        alt: "Istanbul Spice Bazaar with mosque dome and colorful textiles at sunset",
        category: "culture",
        categoryLabel: "Culture & Lifestyle",
        path: `${baseImagePath}/istanbul/istanbul-spice-bazaar-mosque-colorful-textiles-sunset.webp`,
      },
    ],
    metaTags: {
      title: "Istanbul Travel Guide 2025 - Mosques, Bazaars & Bosphorus | TRAVI",
      description:
        "Explore Istanbul with TRAVI: Hagia Sophia, Blue Mosque, Grand Bazaar, Bosphorus cruise, Turkish cuisine, and East-meets-West culture. Your 2025 Istanbul guide.",
      keywords:
        "Istanbul travel, Hagia Sophia, Blue Mosque, Grand Bazaar, Bosphorus, Turkish food, Sultanahmet, Turkey travel guide 2025",
    },
  },

  "las-vegas": {
    slug: "las-vegas",
    name: "Las Vegas",
    images: [
      {
        filename: "las-vegas-strip-stratosphere-tower-welcome-sign-neon-lights.webp",
        alt: "Las Vegas Strip with Stratosphere Tower and Welcome sign illuminated by neon lights",
        category: "attractions",
        categoryLabel: "Top Attractions",
        path: `${baseImagePath}/las-vegas/las-vegas-strip-stratosphere-tower-welcome-sign-neon-lights.webp`,
      },
      {
        filename: "las-vegas-buffet-casino-strip-view-all-you-can-eat.webp",
        alt: "All-you-can-eat buffet spread with Las Vegas Strip view from casino restaurant",
        category: "food",
        categoryLabel: "Food & Dining",
        path: `${baseImagePath}/las-vegas/las-vegas-buffet-casino-strip-view-all-you-can-eat.webp`,
      },
      {
        filename: "las-vegas-fremont-street-casinos-neon-signs-street-performers.webp",
        alt: "Fremont Street Experience with vintage casinos, neon signs, and street performers in Las Vegas",
        category: "culture",
        categoryLabel: "Culture & Lifestyle",
        path: `${baseImagePath}/las-vegas/las-vegas-fremont-street-casinos-neon-signs-street-performers.webp`,
      },
    ],
    metaTags: {
      title: "Las Vegas Travel Guide 2025 - Shows, Casinos & Entertainment | TRAVI",
      description:
        "Experience Las Vegas with TRAVI: The Strip, world-class shows, casino resorts, Fremont Street, buffets, and 24/7 entertainment. Complete 2025 Vegas guide.",
      keywords:
        "Las Vegas travel, Las Vegas Strip, Vegas shows, casino resorts, Fremont Street, Vegas buffets, Nevada travel guide 2025",
    },
  },

  london: {
    slug: "london",
    name: "London",
    images: [
      {
        filename: "london-buckingham-palace-changing-guard-ceremony-colorful.webp",
        alt: "Changing of the Guard ceremony at Buckingham Palace in colorful uniforms London",
        category: "attractions",
        categoryLabel: "Top Attractions",
        path: `${baseImagePath}/london/london-buckingham-palace-changing-guard-ceremony-colorful.webp`,
      },
      {
        filename: "london-afternoon-tea-big-ben-view-scones-pastries.webp",
        alt: "Traditional afternoon tea with scones and pastries overlooking Big Ben in London",
        category: "food",
        categoryLabel: "Food & Dining",
        path: `${baseImagePath}/london/london-afternoon-tea-big-ben-view-scones-pastries.webp`,
      },
      {
        filename: "london-notting-hill-colorful-houses-cafe-street-scene.webp",
        alt: "Colorful Victorian houses and street cafe scene in Notting Hill London",
        category: "culture",
        categoryLabel: "Culture & Lifestyle",
        path: `${baseImagePath}/london/london-notting-hill-colorful-houses-cafe-street-scene.webp`,
      },
    ],
    metaTags: {
      title: "London Travel Guide 2025 - Royalty, Museums & Culture | TRAVI",
      description:
        "Discover London with TRAVI: Buckingham Palace, British Museum, Tower of London, West End shows, afternoon tea, and British culture. Your 2025 London guide.",
      keywords:
        "London travel, Buckingham Palace, Tower of London, British Museum, Big Ben, afternoon tea, West End, UK travel guide 2025",
    },
  },

  "los-angeles": {
    slug: "los-angeles",
    name: "Los Angeles",
    images: [
      {
        filename: "los-angeles-hollywood-sign-griffith-observatory-downtown-skyline-sunset.webp",
        alt: "Hollywood Sign, Griffith Observatory, and downtown Los Angeles skyline at sunset",
        category: "attractions",
        categoryLabel: "Top Attractions",
        path: `${baseImagePath}/los-angeles/los-angeles-hollywood-sign-griffith-observatory-downtown-skyline-sunset.webp`,
      },
      {
        filename: "los-angeles-rooftop-dining-downtown-skyline-neon-fine-dining.webp",
        alt: "Rooftop fine dining with downtown Los Angeles skyline and neon lights at night",
        category: "food",
        categoryLabel: "Food & Dining",
        path: `${baseImagePath}/los-angeles/los-angeles-rooftop-dining-downtown-skyline-neon-fine-dining.webp`,
      },
      {
        filename: "los-angeles-venice-beach-street-art-murals-food-trucks-skateboarders.webp",
        alt: "Venice Beach street art murals with food trucks and skateboarders in Los Angeles",
        category: "culture",
        categoryLabel: "Culture & Lifestyle",
        path: `${baseImagePath}/los-angeles/los-angeles-venice-beach-street-art-murals-food-trucks-skateboarders.webp`,
      },
    ],
    metaTags: {
      title: "Los Angeles Travel Guide 2025 - Hollywood, Beaches & Culture | TRAVI",
      description:
        "Explore LA with TRAVI: Hollywood Sign, Venice Beach, Getty Center, Santa Monica Pier, celebrity culture, and California sunshine. Complete 2025 Los Angeles guide.",
      keywords:
        "Los Angeles travel, Hollywood Sign, Venice Beach, Santa Monica, Griffith Observatory, LA beaches, California travel guide 2025",
    },
  },

  miami: {
    slug: "miami",
    name: "Miami",
    images: [
      {
        filename: "miami-south-beach-art-deco-district-colorful-buildings-sunset.webp",
        alt: "South Beach Art Deco Historic District with colorful pastel buildings at sunset Miami",
        category: "attractions",
        categoryLabel: "Top Attractions",
        path: `${baseImagePath}/miami/miami-south-beach-art-deco-district-colorful-buildings-sunset.webp`,
      },
      {
        filename: "miami-art-deco-ocean-drive-rooftop-dining-burger-mojito.webp",
        alt: "Rooftop dining with burger and mojito overlooking Art Deco Ocean Drive in Miami",
        category: "food",
        categoryLabel: "Food & Dining",
        path: `${baseImagePath}/miami/miami-art-deco-ocean-drive-rooftop-dining-burger-mojito.webp`,
      },
      {
        filename: "miami-ocean-drive-art-deco-buildings-street-art-palm-trees.webp",
        alt: "Ocean Drive Art Deco buildings with street art murals and palm trees in Miami",
        category: "culture",
        categoryLabel: "Culture & Lifestyle",
        path: `${baseImagePath}/miami/miami-ocean-drive-art-deco-buildings-street-art-palm-trees.webp`,
      },
    ],
    metaTags: {
      title: "Miami Travel Guide 2025 - Beaches, Art Deco & Nightlife | TRAVI",
      description:
        "Experience Miami with TRAVI: South Beach, Art Deco District, Wynwood Walls, Cuban cuisine, vibrant nightlife, and tropical paradise. Your 2025 Miami guide.",
      keywords:
        "Miami travel, South Beach, Art Deco District, Miami Beach, Wynwood Walls, Cuban food, Ocean Drive, Florida travel guide 2025",
    },
  },

  "new-york": {
    slug: "new-york",
    name: "New York",
    images: [
      {
        filename: "new-york-statue-of-liberty-empire-state-building-manhattan-skyline.webp",
        alt: "Statue of Liberty, Empire State Building, and Manhattan skyline in New York City",
        category: "attractions",
        categoryLabel: "Top Attractions",
        path: `${baseImagePath}/new-york/new-york-statue-of-liberty-empire-state-building-manhattan-skyline.webp`,
      },
      {
        filename: "new-york-colorful-buildings-street-food-carts-neon-signs-dusk.webp",
        alt: "Colorful buildings with street food carts and neon signs at dusk in New York City",
        category: "food",
        categoryLabel: "Food & Dining",
        path: `${baseImagePath}/new-york/new-york-colorful-buildings-street-food-carts-neon-signs-dusk.webp`,
      },
      {
        filename: "new-york-soho-colorful-architecture-yellow-cabs-street-vendors.webp",
        alt: "SoHo district colorful cast-iron architecture with yellow cabs and street vendors New York",
        category: "culture",
        categoryLabel: "Culture & Lifestyle",
        path: `${baseImagePath}/new-york/new-york-soho-colorful-architecture-yellow-cabs-street-vendors.webp`,
      },
    ],
    metaTags: {
      title: "New York Travel Guide 2025 - NYC Attractions & Culture | TRAVI",
      description:
        "Discover NYC with TRAVI: Statue of Liberty, Times Square, Central Park, Broadway shows, world-class museums, and diverse neighborhoods. Complete 2025 New York guide.",
      keywords:
        "New York travel, NYC attractions, Statue of Liberty, Times Square, Central Park, Broadway shows, Empire State Building, New York City guide 2025",
    },
  },

  paris: {
    slug: "paris",
    name: "Paris",
    images: [
      {
        filename: "paris-eiffel-tower-louvre-pyramid-trocadero-gardens-sunset.webp",
        alt: "Eiffel Tower and Louvre Pyramid viewed from Trocadéro Gardens at sunset in Paris",
        category: "attractions",
        categoryLabel: "Top Attractions",
        path: `${baseImagePath}/paris/paris-eiffel-tower-louvre-pyramid-trocadero-gardens-sunset.webp`,
      },
      {
        filename: "paris-cafe-croissants-coffee-traditional-bistro-street-scene.webp",
        alt: "Fresh croissants and coffee at traditional Parisian sidewalk cafe bistro",
        category: "food",
        categoryLabel: "Food & Dining",
        path: `${baseImagePath}/paris/paris-cafe-croissants-coffee-traditional-bistro-street-scene.webp`,
      },
      {
        filename: "paris-fashion-boutique-colorful-window-display-shopping-street.webp",
        alt: "Parisian fashion boutique with colorful window display on luxury shopping street",
        category: "culture",
        categoryLabel: "Culture & Lifestyle",
        path: `${baseImagePath}/paris/paris-fashion-boutique-colorful-window-display-shopping-street.webp`,
      },
    ],
    metaTags: {
      title: "Paris Travel Guide 2025 - Eiffel Tower, Louvre & Romance | TRAVI",
      description:
        "Explore Paris with TRAVI: Eiffel Tower, Louvre Museum, Notre-Dame, Champs-Élysées, French cuisine, and Parisian romance. Your complete 2025 Paris guide.",
      keywords:
        "Paris travel, Eiffel Tower, Louvre Museum, Notre-Dame, Champs-Élysées, French cuisine, Paris cafes, France travel guide 2025",
    },
  },

  rome: {
    slug: "rome",
    name: "Rome",
    images: [
      {
        filename: "rome-trevi-fountain-baroque-sculpture-crowded-landmark.webp",
        alt: "Trevi Fountain baroque sculpture with crowds at iconic Rome landmark",
        category: "attractions",
        categoryLabel: "Top Attractions",
        path: `${baseImagePath}/rome/rome-trevi-fountain-baroque-sculpture-crowded-landmark.webp`,
      },
      {
        filename: "rome-colorful-buildings-pasta-outdoor-dining-church-bell-tower.webp",
        alt: "Italian pasta at outdoor cafe with colorful buildings and church bell tower in Rome",
        category: "food",
        categoryLabel: "Food & Dining",
        path: `${baseImagePath}/rome/rome-colorful-buildings-pasta-outdoor-dining-church-bell-tower.webp`,
      },
      {
        filename: "rome-colorful-street-cobblestone-outdoor-cafes-dome-church.webp",
        alt: "Colorful cobblestone street with outdoor cafes and baroque dome church in Rome",
        category: "culture",
        categoryLabel: "Culture & Lifestyle",
        path: `${baseImagePath}/rome/rome-colorful-street-cobblestone-outdoor-cafes-dome-church.webp`,
      },
    ],
    metaTags: {
      title: "Rome Travel Guide 2025 - Ancient History & Italian Culture | TRAVI",
      description:
        "Discover Rome with TRAVI: Colosseum, Vatican City, Trevi Fountain, Roman Forum, authentic Italian cuisine, and ancient history. Complete 2025 Rome guide.",
      keywords:
        "Rome travel, Colosseum, Vatican City, Trevi Fountain, Roman Forum, Italian food, Rome attractions, Italy travel guide 2025",
    },
  },

  singapore: {
    slug: "singapore",
    name: "Singapore",
    images: [
      {
        filename: "singapore-marina-bay-sands-gardens-by-the-bay-supertrees-sunset.webp",
        alt: "Marina Bay Sands and Gardens by the Bay Supertrees at sunset in Singapore",
        category: "attractions",
        categoryLabel: "Top Attractions",
        path: `${baseImagePath}/singapore/singapore-marina-bay-sands-gardens-by-the-bay-supertrees-sunset.webp`,
      },
      {
        filename: "singapore-hawker-center-street-food-stalls-colorful-outdoor-dining.webp",
        alt: "Singapore hawker center with street food stalls and colorful outdoor dining area",
        category: "food",
        categoryLabel: "Food & Dining",
        path: `${baseImagePath}/singapore/singapore-hawker-center-street-food-stalls-colorful-outdoor-dining.webp`,
      },
      {
        filename: "singapore-esplanade-waterfront-skyline-cultural-performers-sunset.webp",
        alt: "Esplanade waterfront with Singapore skyline and traditional cultural performers at sunset",
        category: "culture",
        categoryLabel: "Culture & Lifestyle",
        path: `${baseImagePath}/singapore/singapore-esplanade-waterfront-skyline-cultural-performers-sunset.webp`,
      },
    ],
    metaTags: {
      title: "Singapore Travel Guide 2025 - Gardens, Food & Culture | TRAVI",
      description:
        "Experience Singapore with TRAVI: Marina Bay Sands, Gardens by the Bay, hawker centers, diverse culture, and modern architecture. Your 2025 Singapore guide.",
      keywords:
        "Singapore travel, Marina Bay Sands, Gardens by the Bay, Singapore hawker centers, Singapore food, Sentosa Island, Singapore guide 2025",
    },
  },

  tokyo: {
    slug: "tokyo",
    name: "Tokyo",
    images: [
      {
        filename: "tokyo-tsutenkaku-tower-shinsekai-neon-signs-kimono-street-scene.webp",
        alt: "Tsutenkaku Tower in Shinsekai district with neon signs and kimono-clad women in Tokyo",
        category: "attractions",
        categoryLabel: "Top Attractions",
        path: `${baseImagePath}/tokyo/tokyo-tsutenkaku-tower-shinsekai-neon-signs-kimono-street-scene.webp`,
      },
      {
        filename: "tokyo-sushi-chef-preparing-nigiri-pagoda-view-authentic-restaurant.webp",
        alt: "Japanese sushi chef preparing fresh nigiri with pagoda view from authentic Tokyo restaurant",
        category: "food",
        categoryLabel: "Food & Dining",
        path: `${baseImagePath}/tokyo/tokyo-sushi-chef-preparing-nigiri-pagoda-view-authentic-restaurant.webp`,
      },
      {
        filename: "tokyo-torii-gate-pagoda-sensoji-temple-lanterns-traditional-market.webp",
        alt: "Red torii gate and five-story pagoda at Sensoji Temple with lanterns and traditional market Tokyo",
        category: "culture",
        categoryLabel: "Culture & Lifestyle",
        path: `${baseImagePath}/tokyo/tokyo-torii-gate-pagoda-sensoji-temple-lanterns-traditional-market.webp`,
      },
    ],
    metaTags: {
      title: "Tokyo Travel Guide 2025 - Temples, Sushi & Modern Japan | TRAVI",
      description:
        "Explore Tokyo with TRAVI: Sensoji Temple, Shibuya Crossing, authentic sushi, traditional culture, cutting-edge technology, and Japanese hospitality. Complete 2025 Tokyo guide.",
      keywords:
        "Tokyo travel, Sensoji Temple, Shibuya Crossing, Tokyo sushi, Japanese culture, Tokyo attractions, Japan travel guide 2025",
    },
  },
};

export function getDestinationCategoryConfig(slug: string): DestinationCategoryConfig | null {
  const normalizedSlug = slug.toLowerCase().replaceAll(/\s+/g, "-");
  return destinationCategoryImages[normalizedSlug] || null;
}

export function getAttractionImage(slug: string): CategoryImage | null {
  const config = getDestinationCategoryConfig(slug);
  return config?.images.find(img => img.category === "attractions") || null;
}

export function getFoodImage(slug: string): CategoryImage | null {
  const config = getDestinationCategoryConfig(slug);
  return config?.images.find(img => img.category === "food") || null;
}

export function getCultureImage(slug: string): CategoryImage | null {
  const config = getDestinationCategoryConfig(slug);
  return config?.images.find(img => img.category === "culture") || null;
}

export function getAllDestinationSlugs(): string[] {
  return Object.keys(destinationCategoryImages);
}

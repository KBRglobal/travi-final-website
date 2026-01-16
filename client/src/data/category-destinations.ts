import { Building2, Landmark, UtensilsCrossed, Compass, BookOpen } from "lucide-react";

export interface Destination {
  id: string;
  city: string;
  country: string;
  region: "middle-east" | "europe" | "asia" | "americas";
  slug: string;
  heroImage: string;
  cardImage: string;
  tagline: string;
  highlights: string[];
  stats: {
    hotels?: number;
    attractions?: number;
    restaurants?: number;
    experiences?: number;
    guides?: number;
  };
}

export interface CategoryConfig {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  heroImage: string;
  icon: typeof Building2;
  gradient: string;
  pillars: {
    title: string;
    description: string;
    icon: typeof Building2;
  }[];
  stats: {
    value: string;
    label: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
  editorialQuote?: {
    text: string;
    author: string;
    role: string;
  };
}

export const globalDestinations: Destination[] = [
  {
    id: "dubai",
    city: "Dubai",
    country: "United Arab Emirates",
    region: "middle-east",
    slug: "dubai",
    heroImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&h=1080&fit=crop&q=80",
    cardImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop&q=80",
    tagline: "Where Future Meets Tradition",
    highlights: ["Burj Khalifa", "Desert Safari", "Palm Jumeirah", "Dubai Mall"],
    stats: { hotels: 850, attractions: 320, restaurants: 1200, experiences: 450, guides: 85 }
  },
  {
    id: "paris",
    city: "Paris",
    country: "France",
    region: "europe",
    slug: "paris",
    heroImage: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&h=1080&fit=crop&q=80",
    cardImage: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop&q=80",
    tagline: "The City of Light and Love",
    highlights: ["Eiffel Tower", "Louvre Museum", "Champs-Élysées", "Montmartre"],
    stats: { hotels: 1200, attractions: 580, restaurants: 2500, experiences: 680, guides: 120 }
  },
  {
    id: "tokyo",
    city: "Tokyo",
    country: "Japan",
    region: "asia",
    slug: "tokyo",
    heroImage: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&h=1080&fit=crop&q=80",
    cardImage: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=400&fit=crop&q=80",
    tagline: "Ancient Traditions, Cutting-Edge Innovation",
    highlights: ["Shibuya Crossing", "Senso-ji Temple", "Tokyo Skytree", "Tsukiji Market"],
    stats: { hotels: 980, attractions: 420, restaurants: 3200, experiences: 520, guides: 95 }
  },
  {
    id: "london",
    city: "London",
    country: "United Kingdom",
    region: "europe",
    slug: "london",
    heroImage: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920&h=1080&fit=crop&q=80",
    cardImage: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=400&fit=crop&q=80",
    tagline: "History, Culture, and Royal Splendor",
    highlights: ["Big Ben", "Tower of London", "British Museum", "Buckingham Palace"],
    stats: { hotels: 1100, attractions: 650, restaurants: 2800, experiences: 720, guides: 110 }
  },
  {
    id: "new-york",
    city: "New York",
    country: "United States",
    region: "americas",
    slug: "new-york",
    heroImage: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1920&h=1080&fit=crop&q=80",
    cardImage: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=400&fit=crop&q=80",
    tagline: "The City That Never Sleeps",
    highlights: ["Statue of Liberty", "Central Park", "Times Square", "Brooklyn Bridge"],
    stats: { hotels: 950, attractions: 480, restaurants: 2600, experiences: 580, guides: 100 }
  },
  {
    id: "barcelona",
    city: "Barcelona",
    country: "Spain",
    region: "europe",
    slug: "barcelona",
    heroImage: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1920&h=1080&fit=crop&q=80",
    cardImage: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&h=400&fit=crop&q=80",
    tagline: "Art, Architecture, and Mediterranean Soul",
    highlights: ["La Sagrada Familia", "Park Güell", "Las Ramblas", "Gothic Quarter"],
    stats: { hotels: 720, attractions: 380, restaurants: 1800, experiences: 420, guides: 75 }
  }
];

export const categoryConfigs: Record<string, CategoryConfig> = {
  hotels: {
    id: "hotels",
    slug: "hotels",
    title: "Hotels & Resorts",
    subtitle: "Where Every Stay Becomes a Story",
    description: "From iconic luxury palaces to design-forward boutiques, discover accommodations that transform your journey into an unforgettable experience.",
    heroImage: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&h=1080&fit=crop&q=80",
    icon: Building2,
    gradient: "from-[#6443F4]/8 via-background to-[#6443F4]/5",
    pillars: [
      {
        title: "Iconic Luxury",
        description: "Legendary properties that define hospitality excellence",
        icon: Building2
      },
      {
        title: "Design Forward",
        description: "Architectural masterpieces and boutique gems",
        icon: Landmark
      },
      {
        title: "Sustainable Stays",
        description: "Eco-conscious retreats without compromise",
        icon: Compass
      }
    ],
    stats: [
      { value: "5,800+", label: "Curated Properties" },
      { value: "45", label: "Destinations" },
      { value: "Expert", label: "Reviews" },
      { value: "24/7", label: "Concierge Tips" }
    ],
    faqs: [
      {
        question: "What types of hotels does TRAVI feature?",
        answer: "TRAVI features over 5,800 curated properties spanning ultra-luxury resorts, boutique hotels, design-forward stays, and sustainable eco-lodges across 45 global destinations. Our system analyzes 580 behavioral signals across 24 traveler personas to match you with properties that align with your travel style, budget preferences, and desired amenities for every journey."
      },
      {
        question: "How does TRAVI's hotel recommendation work?",
        answer: "Our AI-powered recommendation engine processes 580 behavioral signals and matches them against 24 distinct traveler personas developed from millions of travel interactions. This achieves 94.7% accuracy in predicting hotel satisfaction, ensuring you discover properties that truly resonate with your preferences, travel goals, and expected experience level at your destination."
      },
      {
        question: "Can I earn rewards when booking hotels through TRAVI?",
        answer: "Yes, TRAVI offers competitive cashback rewards on hotel bookings through our unified checkout system designed for seamless transactions. You earn points on every booking that can be redeemed for future travel experiences, plus exclusive member perks at partner properties worldwide including room upgrades and early check-in when available."
      },
      {
        question: "What's included in TRAVI hotel bookings?",
        answer: "TRAVI provides transparent pricing with unified checkout that shows all fees upfront before you complete your reservation. Many bookings include split-pay options for group travel coordination, flexible cancellation policies for peace of mind, and access to exclusive member rates, complimentary amenities, and room upgrades when available at participating properties."
      },
      {
        question: "Does TRAVI have hotels for every budget?",
        answer: "Absolutely. Our curated collection spans from affordable boutique stays under $100 per night to ultra-luxury experiences at the world's finest properties. Every hotel meets our editorial standards regardless of price point, ensuring quality, authenticity, and genuine value at every tier through our 24 traveler personas matching system."
      },
      {
        question: "Can I book hotels for group travel?",
        answer: "Yes, TRAVI's split-pay feature makes group bookings seamless and stress-free for trip coordinators. Divide costs among travelers easily, manage multiple rooms from one central dashboard, and coordinate check-in details effortlessly. Our system tracks 580 behavioral signals to suggest properties that work well for group dynamics and shared experiences."
      },
      {
        question: "How do I know if a hotel is right for me?",
        answer: "TRAVI's 24 traveler personas help identify your unique travel style through comprehensive analysis, then our 94.7% accurate matching system recommends properties aligned with your specific preferences. Each listing includes detailed editorial reviews from our expert team, verified photos, and honest assessments of what guests can expect during their stay."
      },
      {
        question: "Are TRAVI hotel prices competitive?",
        answer: "TRAVI partners directly with properties and major booking platforms to offer competitive rates plus generous cashback rewards on qualifying reservations. Our unified checkout ensures transparent pricing with no hidden fees or surprise charges, and intelligent price alerts notify you automatically when rates drop for saved properties you're considering."
      }
    ],
    editorialQuote: {
      text: "The best hotels don't just provide a room—they provide a window into the soul of a destination.",
      author: "Travel Editorial Team",
      role: "Travi Editors"
    }
  },
  attractions: {
    id: "attractions",
    slug: "attractions",
    title: "Attractions & Experiences",
    subtitle: "Discover What Makes Each Destination Extraordinary",
    description: "From architectural marvels to hidden cultural gems, explore the landmarks and experiences that define the world's greatest cities.",
    heroImage: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1920&h=1080&fit=crop&q=80",
    icon: Landmark,
    gradient: "from-[#6443F4]/8 via-background to-[#6443F4]/5",
    pillars: [
      {
        title: "Cultural Icons",
        description: "Landmarks that shaped civilizations and inspire wonder",
        icon: Landmark
      },
      {
        title: "Architectural Marvels",
        description: "Engineering feats and design masterpieces",
        icon: Building2
      },
      {
        title: "Immersive Experiences",
        description: "Beyond sightseeing—authentic local encounters",
        icon: Compass
      }
    ],
    stats: [
      { value: "2,800+", label: "Attractions" },
      { value: "45", label: "Destinations" },
      { value: "Field", label: "Tested" },
      { value: "Insider", label: "Access" }
    ],
    faqs: [
      {
        question: "What types of attractions does TRAVI cover?",
        answer: "TRAVI curates over 3,200 attractions including UNESCO World Heritage sites, iconic architectural landmarks, world-class museums, thrilling theme parks, breathtaking natural wonders, and hidden cultural gems across 45 destinations. Our system analyzes 580 behavioral signals to match attractions with your specific interests, travel style, and experience preferences for memorable discoveries."
      },
      {
        question: "Can I book attraction tickets through TRAVI?",
        answer: "Yes, TRAVI offers unified checkout for attraction tickets with competitive pricing and generous cashback rewards on qualifying purchases. Our platform supports convenient split-pay for group bookings, priority skip-the-line options at popular venues, and flexible date changes where available to accommodate your evolving travel plans effortlessly."
      },
      {
        question: "How does TRAVI recommend attractions?",
        answer: "Our 24 traveler personas and 94.7% accurate matching engine analyze your preferences comprehensively to suggest attractions you'll genuinely enjoy and remember. We factor in optimal timing, current crowd levels, accessibility requirements, and complementary nearby experiences to help you build the perfect itinerary for your destination."
      },
      {
        question: "Are attraction prices on TRAVI competitive?",
        answer: "TRAVI aggregates tickets from multiple trusted sources to find the most competitive rates available, plus you earn valuable cashback rewards on qualifying bookings. Our unified checkout displays all fees upfront with complete transparency, ensuring no hidden costs or surprise surcharges when you finalize your attraction reservations."
      },
      {
        question: "Can I book attractions for families?",
        answer: "Absolutely. Our 24 traveler personas include dedicated family-focused profiles that highlight age-appropriate attractions, stroller accessibility information, kid-friendly dining options nearby, and optimal visiting times strategically planned to avoid overwhelming crowds for younger travelers while maximizing enjoyment for the whole family unit."
      },
      {
        question: "Does TRAVI offer last-minute attraction bookings?",
        answer: "Yes, many attractions offer convenient same-day booking through TRAVI with instant confirmation delivered to your device. Our platform displays real-time availability updates and intelligently suggests quality alternatives when popular sites are sold out, ensuring your carefully planned itinerary stays on track despite last-minute changes."
      },
      {
        question: "What's the refund policy for attraction tickets?",
        answer: "Refund policies vary by attraction and specific ticket type selected. TRAVI clearly displays all cancellation terms before purchase so you know exactly what to expect, and many tickets offer free cancellation up to 24 hours before your scheduled visit. Premium members receive enhanced flexibility on select bookings."
      },
      {
        question: "Can I combine attractions into an itinerary?",
        answer: "TRAVI's intelligent itinerary builder analyzes 580 behavioral signals to create logical day plans that minimize unnecessary travel time and maximize memorable experiences. You can customize suggestions freely, add dining stops, and share detailed plans with travel companions through our convenient split-pay coordination features for seamless group travel."
      }
    ],
    editorialQuote: {
      text: "Every great attraction tells a story. Our job is to help you hear it.",
      author: "Cultural Desk",
      role: "Travi Field Editors"
    }
  },
  dining: {
    id: "dining",
    slug: "dining",
    title: "Restaurants & Dining",
    subtitle: "A Culinary Journey Across Continents",
    description: "From Michelin-starred temples of gastronomy to beloved street food stalls, discover where locals eat and world-class chefs create.",
    heroImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&h=1080&fit=crop&q=80",
    icon: UtensilsCrossed,
    gradient: "from-[#F59E0B]/8 via-background to-[#EF4444]/8",
    pillars: [
      {
        title: "Culinary Capitals",
        description: "Cities that define world gastronomy",
        icon: UtensilsCrossed
      },
      {
        title: "Signature Kitchens",
        description: "Where celebrated chefs craft unforgettable meals",
        icon: Building2
      },
      {
        title: "Street Food Atlas",
        description: "Authentic flavors from neighborhood vendors",
        icon: Compass
      }
    ],
    stats: [
      { value: "14,000+", label: "Restaurants" },
      { value: "45", label: "Cuisines" },
      { value: "Local", label: "Tested" },
      { value: "Chef", label: "Interviews" }
    ],
    faqs: [
      {
        question: "What types of dining experiences does TRAVI feature?",
        answer: "TRAVI curates over 14,000 restaurants spanning Michelin-starred fine dining establishments, beloved local eateries with authentic character, street food gems offering unforgettable flavors, and unique culinary experiences across 45 destinations worldwide. Our 580 behavioral signals identify your taste preferences across 24 traveler personas for highly personalized restaurant recommendations."
      },
      {
        question: "Can I book restaurant reservations through TRAVI?",
        answer: "Yes, TRAVI integrates with major reservation platforms for seamless booking that fits naturally into your trip planning process. Our unified checkout supports convenient split-pay for group dining coordination, and you earn valuable cashback rewards on participating restaurants. Premium dining experiences may include exclusive member perks and priority seating."
      },
      {
        question: "How does TRAVI recommend restaurants?",
        answer: "Our 94.7% accurate matching engine comprehensively analyzes your cuisine preferences, dietary needs, ambiance preferences, and budget constraints to suggest restaurants you'll genuinely enjoy and remember. We factor in location relative to your planned activities and real-time availability to ensure seamless dining experiences throughout your trip."
      },
      {
        question: "Does TRAVI support dietary restrictions?",
        answer: "Absolutely. Our 24 traveler personas include detailed dietary profiles covering vegetarian, vegan, halal, kosher, gluten-free, and allergy-conscious dining requirements with comprehensive verification. Each restaurant listing clearly indicates accommodation capabilities with verified information gathered from establishments, helping you dine confidently anywhere in the world."
      },
      {
        question: "Are dining prices on TRAVI competitive?",
        answer: "TRAVI shows transparent menu pricing where available from our restaurant partners, plus you earn valuable cashback rewards on qualifying restaurant bookings made through our platform. Our comprehensive platform highlights exceptional value options at every price tier, from incredible street food under $5 to sophisticated tasting menus with expertly paired wines."
      },
      {
        question: "Can I find local hidden gems on TRAVI?",
        answer: "Yes, our dedicated editorial team works closely with local food writers and analyzes 580 behavioral signals to surface authentic neighborhood spots that tourists typically miss during their travels. We prioritize restaurants where locals genuinely dine over tourist-focused establishments, ensuring you experience authentic culinary culture at every destination."
      },
      {
        question: "Does TRAVI offer food tours?",
        answer: "TRAVI features carefully curated food tours and immersive culinary experiences in major destinations around the world. Book easily through our unified checkout with convenient split-pay options for groups, earn cashback rewards on qualifying experiences, and benefit from our 24 traveler persona matching for personalized tour recommendations."
      },
      {
        question: "How do I know if a restaurant is right for me?",
        answer: "TRAVI's 24 traveler personas and 94.7% accurate matching system comprehensively analyze your preferences to suggest restaurants aligned with your specific tastes and expectations. Each listing includes detailed editorial reviews from our expert team, verified photos, sample menus, and honest assessments of atmosphere and service quality."
      }
    ],
    editorialQuote: {
      text: "To understand a city, eat where the locals eat. To love it, eat where they celebrate.",
      author: "Food & Culture Desk",
      role: "Travi Culinary Editors"
    }
  },
  "things-to-do": {
    id: "things-to-do",
    slug: "things-to-do",
    title: "Things to Do",
    subtitle: "Curated Experiences for Every Traveler",
    description: "Whether you seek adventure, relaxation, or cultural immersion, find perfectly crafted itineraries and experiences tailored to your travel style.",
    heroImage: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&h=1080&fit=crop&q=80",
    icon: Compass,
    gradient: "from-[#10B981]/8 via-background to-[#3B82F6]/8",
    pillars: [
      {
        title: "Adventure Seekers",
        description: "Thrilling experiences for the bold traveler",
        icon: Compass
      },
      {
        title: "Cultural Immersion",
        description: "Deep dives into local traditions and arts",
        icon: Landmark
      },
      {
        title: "Seasonal Highlights",
        description: "Time-sensitive events and perfect-timing activities",
        icon: Building2
      }
    ],
    stats: [
      { value: "3,500+", label: "Experiences" },
      { value: "45", label: "Destinations" },
      { value: "Curated", label: "Itineraries" },
      { value: "Seasonal", label: "Updates" }
    ],
    faqs: [
      {
        question: "How do you create itineraries?",
        answer: "TRAVI's itineraries are expertly crafted by analyzing 580 behavioral signals and matching them to our 24 traveler personas for personalized trip planning. Local experts contribute authentic insider knowledge while our AI optimizes logistics, pacing, and connections between experiences to achieve 94.7% traveler satisfaction across all destinations we cover."
      },
      {
        question: "Do you offer experiences for families?",
        answer: "Yes, our 24 traveler personas include multiple dedicated family profiles covering various age ranges, interests, and travel styles. We carefully tag experiences by suitability for different ages, highlight stroller access, identify nearby kid-friendly dining, and suggest optimal timing to ensure enjoyable adventures for travelers of all ages."
      },
      {
        question: "Can I customize pre-built itineraries?",
        answer: "Absolutely. TRAVI's flexible itinerary builder lets you swap activities easily, adjust timing to your preferences, add dining stops, and reorganize days to match your desired pace. Our intelligent system recalculates logistics automatically while maintaining our 94.7% accurate experience matching to ensure seamless travel planning."
      },
      {
        question: "How do I book activities from an itinerary?",
        answer: "TRAVI's unified checkout lets you conveniently book multiple activities at once with competitive pricing and generous cashback rewards on qualifying reservations. Our split-pay features seamlessly coordinate group bookings, and flexible scheduling gracefully accommodates last-minute changes where available to keep your trip on track."
      },
      {
        question: "Are there seasonal itineraries available?",
        answer: "Yes, our dedicated editorial team creates seasonal itineraries highlighting local festivals, optimal weather windows for outdoor activities, and time-sensitive experiences you won't want to miss. We analyze 580 behavioral signals to recommend the absolute best times to visit each destination based on your unique preferences."
      },
      {
        question: "Can I share itineraries with travel companions?",
        answer: "TRAVI's collaborative planning features let you easily share complete itineraries, coordinate split-pay bookings for shared expenses, and sync schedules with travel companions in real-time. Automatic updates ensure everyone stays informed when plans change, keeping your entire group aligned throughout the trip planning process."
      },
      {
        question: "What makes TRAVI itineraries different?",
        answer: "Unlike generic travel guides, TRAVI's 24 traveler personas and 94.7% accurate matching engine personalize every single recommendation to your unique preferences. We thoughtfully balance iconic highlights with local discoveries, optimize logistics for efficiency, and seamlessly integrate booking with valuable cashback rewards for complete trip planning."
      },
      {
        question: "Do you include rest time in itineraries?",
        answer: "Yes, our thoughtfully designed itineraries factor in realistic pacing, meal breaks, and essential downtime for rejuvenation. We analyze 580 behavioral signals including your preferred travel intensity to create balanced schedules that avoid burnout while maximizing memorable experiences throughout your journey."
      }
    ],
    editorialQuote: {
      text: "The best trips aren't about seeing everything—they're about experiencing what matters.",
      author: "Experiences Team",
      role: "Travi Itinerary Editors"
    }
  },
  guides: {
    id: "guides",
    slug: "guides",
    title: "Travel Guides",
    subtitle: "Expert Knowledge for Confident Exploration",
    description: "Comprehensive destination guides, practical planning resources, and insider knowledge from our global network of travel experts.",
    heroImage: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&h=1080&fit=crop&q=80",
    icon: BookOpen,
    gradient: "from-[#8B5CF6]/8 via-background to-[#6443F4]/8",
    pillars: [
      {
        title: "Destination Guides",
        description: "Comprehensive city and country explorations",
        icon: BookOpen
      },
      {
        title: "Planning Essentials",
        description: "Visas, budgets, packing, and logistics",
        icon: Compass
      },
      {
        title: "Expert Columns",
        description: "Insights from seasoned travel professionals",
        icon: Building2
      }
    ],
    stats: [
      { value: "580+", label: "Guides" },
      { value: "45", label: "Destinations" },
      { value: "Expert", label: "Written" },
      { value: "Weekly", label: "Updates" }
    ],
    faqs: [
      {
        question: "How often are guides updated?",
        answer: "Our dedicated editorial team reviews and updates guides weekly with the latest information, with major comprehensive refreshes for each destination at least quarterly. We analyze 580 behavioral signals and direct traveler feedback to identify outdated information and emerging experiences worth featuring for our global community."
      },
      {
        question: "Can I download guides offline?",
        answer: "Premium members can download complete PDF versions of any guide for convenient offline access during their travels anywhere in the world. Our mobile-optimized formats include detailed maps, direct booking links, and all essential details that work seamlessly without internet connectivity when you need them most."
      },
      {
        question: "What destinations does TRAVI cover?",
        answer: "TRAVI currently features 580+ comprehensive guides across 45 carefully selected destinations worldwide spanning every continent. We prioritize depth over breadth, ensuring each guide reflects genuine local expertise matched to our 24 traveler personas for highly personalized recommendations tailored to your travel style."
      },
      {
        question: "How are guides organized?",
        answer: "TRAVI guides are thoughtfully structured around our 24 traveler personas and 580 behavioral signals for intuitive navigation. Each destination comprehensively includes neighborhoods, attractions, dining, hotels, and itineraries organized by interest, budget, and travel style for optimal 94.7% matching accuracy."
      },
      {
        question: "Do guides include practical travel information?",
        answer: "Yes, every TRAVI guide thoroughly covers visas, currency exchange, local transportation options, safety tips, cultural etiquette, and seasonal considerations for informed travel. Our unified platform seamlessly integrates this practical information with booking options and valuable cashback rewards for completely seamless trip planning."
      },
      {
        question: "Can I contribute to TRAVI guides?",
        answer: "TRAVI welcomes valuable traveler contributions that enhance our 580 behavioral signals and improve recommendations for everyone. Verified reviews, authentic photos, and insider tips help refine our 24 traveler personas and continuously improve matching accuracy for the entire TRAVI community worldwide."
      },
      {
        question: "Are guides available in multiple languages?",
        answer: "TRAVI guides are currently available in English with comprehensive localization for major international markets actively in development. Our 24 traveler personas account for regional preferences and cultural nuances, and we prioritize cultural context in all our destination coverage to serve travelers globally."
      },
      {
        question: "What makes TRAVI guides different from other travel resources?",
        answer: "TRAVI combines deep editorial expertise with AI-powered personalization for a unique travel planning experience. Our 580 behavioral signals and 24 traveler personas achieve 94.7% matching accuracy, while unified checkout with valuable cashback rewards and convenient split-pay features streamline the entire journey from planning to booking."
      }
    ],
    editorialQuote: {
      text: "A great travel guide doesn't just tell you where to go—it teaches you how to see.",
      author: "Editorial Director",
      role: "Travi Travel Desk"
    }
  }
};

export function getDestinationsForCategory(categorySlug: string): Destination[] {
  return globalDestinations;
}

export function getCategoryConfig(categorySlug: string): CategoryConfig | undefined {
  return categoryConfigs[categorySlug];
}

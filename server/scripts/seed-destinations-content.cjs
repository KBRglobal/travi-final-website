/**
 * Seed script: Enrich 17 destinations with descriptions, SEO meta, taglines, highlights
 * and create 5 seed articles for Dubai.
 *
 * Usage: DATABASE_URL="..." node server/scripts/seed-destinations-content.js
 */
const { Pool } = require('pg');
const { randomUUID } = require('node:crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ─── Destination enrichment data ───────────────────────────────────────────────

const destinations = [
  {
    id: 1, // Abu Dhabi
    description: `Abu Dhabi, the capital of the United Arab Emirates, is a city where tradition meets extraordinary ambition. Home to the magnificent Sheikh Zayed Grand Mosque, one of the world's largest mosques adorned with 82 domes and over 1,000 columns, Abu Dhabi offers a cultural depth that surprises many first-time visitors.

Beyond its spiritual landmarks, the city boasts world-class attractions like the Louvre Abu Dhabi, an architectural marvel on Saadiyat Island that houses a stunning collection spanning centuries of human creativity. Yas Island delivers thrills with Ferrari World, Yas Waterworld, and the Formula 1 Etihad Airways Abu Dhabi Grand Prix circuit.

The city's Corniche stretches for eight kilometers along the waterfront, offering pristine beaches, cycling paths, and panoramic views of the Arabian Gulf. From the opulent Emirates Palace to the serene mangrove forests of Jubail Island, Abu Dhabi weaves luxury with nature in ways few cities can match.`,
    summary: 'The luxurious capital of the UAE featuring world-class museums, stunning mosques, and desert adventures.',
    mood_tagline: 'Capital of Ambition',
    hero_subtitle: 'Where Heritage Meets Tomorrow',
    meta_title: 'Abu Dhabi Travel Guide | Top Attractions & Tips',
    meta_description: 'Plan your Abu Dhabi trip with our complete guide. Explore Sheikh Zayed Mosque, Louvre Abu Dhabi, Yas Island, and more.',
    primary_keyword: 'Abu Dhabi travel guide',
    featured_highlights: JSON.stringify([
      { title: 'Sheikh Zayed Grand Mosque', description: 'One of the world\'s largest and most beautiful mosques' },
      { title: 'Louvre Abu Dhabi', description: 'World-class art museum on Saadiyat Island' },
      { title: 'Yas Island', description: 'Theme parks, F1 circuit, and waterparks' },
      { title: 'Emirates Palace', description: 'Iconic luxury hotel and cultural landmark' },
      { title: 'Corniche Beach', description: '8km waterfront promenade with Blue Flag beaches' }
    ]),
    mood_vibe: 'luxurious',
    brand_color: '#C4A265',
    mood_primary_color: '#1A1A2E',
    mood_gradient_from: '#1A1A2E',
    mood_gradient_to: '#C4A265'
  },
  {
    id: 2, // Amsterdam
    description: `Amsterdam captivates visitors with its iconic canal ring, a UNESCO World Heritage site lined with narrow 17th-century merchant houses that lean charmingly over the water. The city's 165 canals are best explored by boat, offering a unique perspective on centuries of Dutch architecture and urban planning.

The museum district is a cultural powerhouse. The Rijksmuseum houses Rembrandt's Night Watch and Vermeer's Milkmaid, while the Van Gogh Museum holds the world's largest collection of the post-impressionist master's work. The Anne Frank House provides a deeply moving experience, preserving the secret annex where the young diarist hid during World War II.

Amsterdam's neighborhoods each have distinct character — the Jordaan with its cozy brown cafes and boutiques, De Pijp with its multicultural Albert Cuyp Market, and the vibrant Ndsm Wharf transformed from shipyard to creative hub. The city's cycling culture, with more bikes than residents, makes exploring these areas a genuine pleasure.`,
    summary: 'Historic canals, world-class museums, and vibrant neighborhoods in the heart of the Netherlands.',
    mood_tagline: 'Venice of the North',
    hero_subtitle: 'Canals, Culture & Dutch Charm',
    meta_title: 'Amsterdam Travel Guide | Canals, Museums & More',
    meta_description: 'Discover Amsterdam with our travel guide. Explore canals, Rijksmuseum, Van Gogh Museum, and vibrant neighborhoods.',
    primary_keyword: 'Amsterdam travel guide',
    featured_highlights: JSON.stringify([
      { title: 'Canal Ring', description: 'UNESCO-listed 17th-century canal network' },
      { title: 'Rijksmuseum', description: 'Dutch masters including Rembrandt and Vermeer' },
      { title: 'Van Gogh Museum', description: 'World\'s largest Van Gogh collection' },
      { title: 'Anne Frank House', description: 'Historic WWII hiding place turned museum' },
      { title: 'Jordaan District', description: 'Charming neighborhood with cafes and boutiques' }
    ]),
    mood_vibe: 'charming',
    brand_color: '#FF6B35',
    mood_primary_color: '#1B4332',
    mood_gradient_from: '#1B4332',
    mood_gradient_to: '#FF6B35'
  },
  {
    id: 3, // Bangkok
    description: `Bangkok is a city of contrasts where ancient temples adorned with gold leaf stand in the shadow of gleaming skyscrapers. The Grand Palace, a dazzling complex of halls, pavilions, and the sacred Emerald Buddha temple, has been the ceremonial heart of Thailand since 1782. Nearby, Wat Pho houses the awe-inspiring 46-meter Reclining Buddha and is known as the birthplace of traditional Thai massage.

The city's street food scene is legendary. Yaowarat (Chinatown) comes alive at night with wok flames and aromatic smoke from countless stalls, while Chatuchak Weekend Market sprawls across 27 acres with over 15,000 stalls selling everything from vintage clothing to artisan crafts. The floating markets of Damnoen Saduak and Amphawa offer glimpses into a way of life that predates the city's rapid modernization.

Modern Bangkok pulses with energy in areas like Sukhumvit and Silom, where rooftop bars offer panoramic views of the skyline and the Chao Phraya River. The BTS Skytrain and MRT subway make navigating this sprawling metropolis surprisingly easy, connecting ancient temples to luxury malls and vibrant nightlife in minutes.`,
    summary: 'Ancient temples, legendary street food, and vibrant nightlife in Thailand\'s electrifying capital.',
    mood_tagline: 'City of Angels',
    hero_subtitle: 'Temples, Street Food & Endless Energy',
    meta_title: 'Bangkok Travel Guide | Temples, Food & Nightlife',
    meta_description: 'Explore Bangkok with our guide to temples, street food, markets, and nightlife. Plan your perfect Thai adventure.',
    primary_keyword: 'Bangkok travel guide',
    featured_highlights: JSON.stringify([
      { title: 'Grand Palace', description: 'Spectacular royal complex with Emerald Buddha' },
      { title: 'Street Food', description: 'World-famous cuisine at every corner' },
      { title: 'Chatuchak Market', description: '15,000+ stalls in the world\'s largest weekend market' },
      { title: 'Wat Pho', description: '46-meter Reclining Buddha and Thai massage birthplace' },
      { title: 'Rooftop Bars', description: 'Stunning skyline views from world-class bars' }
    ]),
    mood_vibe: 'vibrant',
    brand_color: '#FFD700',
    mood_primary_color: '#8B0000',
    mood_gradient_from: '#8B0000',
    mood_gradient_to: '#FFD700'
  },
  {
    id: 4, // Barcelona
    description: `Barcelona is a Mediterranean masterpiece where the visionary architecture of Antoni Gaudi defines the skyline. The Sagrada Familia, his unfinished basilica begun in 1882, is a breathtaking fusion of Gothic and Art Nouveau styles that continues to rise toward completion. Park Guell, Casa Batllo, and Casa Mila showcase his organic, nature-inspired designs that make Barcelona unlike any other city on Earth.

The Gothic Quarter (Barri Gotic) is a labyrinth of medieval streets hiding Roman ruins, hidden plazas, and the Barcelona Cathedral. Just steps away, La Rambla stretches from Placa Catalunya to the waterfront, a tree-lined boulevard alive with street performers, flower stalls, and the legendary La Boqueria food market overflowing with fresh seafood, jamon iberico, and tropical fruits.

Barcelona's beaches stretch for over four kilometers along the Mediterranean coast, from the lively Barceloneta to the quieter Nova Icaria. The city's culinary scene rivals Madrid and San Sebastian, with Michelin-starred restaurants alongside traditional tapas bars. Camp Nou, home to FC Barcelona, is a pilgrimage site for football fans from every continent.`,
    summary: 'Gaudi\'s architectural wonder on the Mediterranean, with stunning beaches, tapas, and football passion.',
    mood_tagline: 'Mediterranean Masterpiece',
    hero_subtitle: 'Gaudi, Beaches & Catalan Soul',
    meta_title: 'Barcelona Travel Guide | Gaudi, Beaches & Tapas',
    meta_description: 'Plan your Barcelona trip. Discover Sagrada Familia, Gothic Quarter, beaches, tapas bars, and more in our guide.',
    primary_keyword: 'Barcelona travel guide',
    featured_highlights: JSON.stringify([
      { title: 'Sagrada Familia', description: 'Gaudi\'s awe-inspiring unfinished basilica' },
      { title: 'Gothic Quarter', description: 'Medieval streets and Roman ruins' },
      { title: 'La Boqueria Market', description: 'Legendary food market on La Rambla' },
      { title: 'Barceloneta Beach', description: '4km of Mediterranean coastline' },
      { title: 'Park Guell', description: 'Gaudi\'s colorful hilltop garden park' }
    ]),
    mood_vibe: 'artistic',
    brand_color: '#E63946',
    mood_primary_color: '#1D3557',
    mood_gradient_from: '#1D3557',
    mood_gradient_to: '#E63946'
  },
  {
    id: 5, // Dubai — most detailed
    description: `Dubai is a city that defies imagination. Rising from the Arabian Desert in just five decades, it has become one of the world's most visited destinations, welcoming over 16 million international tourists annually. The Burj Khalifa, standing at 828 meters, is the tallest building on Earth and offers observation decks with views stretching to the horizon. At its base, the Dubai Fountain performs a mesmerizing water, light, and music show across a 30-acre lake every evening.

The city is a shopper's paradise. The Dubai Mall, the world's largest by total area, houses over 1,200 retail stores, an Olympic-sized ice rink, a 33,000-animal aquarium, and an indoor theme park. The Gold Souk in Deira dazzles with window after window of intricate jewelry, while the Spice Souk fills the air with the aromas of saffron, frankincense, and cardamom. For a luxury experience, Mall of the Emirates features the indoor ski slope Ski Dubai complete with real snow and penguins.

Beyond the glitz, Dubai offers cultural depth. The Al Fahidi Historical Neighbourhood preserves wind-tower architecture from the 1800s, and the Dubai Museum in Al Fahidi Fort chronicles the city's transformation from fishing village to global hub. The Dubai Opera in Downtown hosts world-class performances in a stunning dhow-shaped venue. Dubai Creek, the historic heart of the city, can be crossed on traditional abra water taxis for just one dirham.

Adventure seekers find endless thrills in Dubai. Desert safaris offer dune bashing, camel rides, and traditional Bedouin camp experiences under the stars. The Palm Jumeirah, an artificial island shaped like a palm tree, hosts Atlantis The Royal and Aquaventure Waterpark. Dubai Marina's stunning waterfront promenade is perfect for evening strolls, while JBR Beach offers golden sands with skyline views. For the ultimate adrenaline rush, skydiving over the Palm provides a perspective of Dubai that no observation deck can match.

The food scene in Dubai is as diverse as its population, with over 200 nationalities represented. From Michelin-starred restaurants by celebrity chefs at DIFC to authentic Pakistani biryani in Karama, every cuisine on Earth is available within the city limits. Friday brunch is a Dubai institution, with lavish spreads at five-star hotels that locals and expats plan their weekends around. Dubai's commitment to culinary excellence earned it a UNESCO Creative City of Gastronomy designation.`,
    summary: 'The ultimate superlative city — tallest tower, biggest mall, boldest ambitions, and year-round sunshine.',
    mood_tagline: 'The City of Gold',
    hero_subtitle: 'Where Dreams Touch the Sky',
    meta_title: 'Dubai Travel Guide 2026 | Top Things to Do & See',
    meta_description: 'Your complete Dubai travel guide. Explore Burj Khalifa, desert safaris, beaches, shopping, dining, and nightlife.',
    primary_keyword: 'Dubai travel guide',
    featured_highlights: JSON.stringify([
      { title: 'Burj Khalifa', description: 'World\'s tallest building at 828 meters with stunning views' },
      { title: 'Dubai Mall', description: 'World\'s largest mall with aquarium, ice rink, and 1,200+ stores' },
      { title: 'Desert Safari', description: 'Dune bashing, camel rides, and Bedouin camp dining' },
      { title: 'Palm Jumeirah', description: 'Iconic palm-shaped island with luxury resorts' },
      { title: 'Gold & Spice Souks', description: 'Traditional markets in historic Deira' },
      { title: 'Dubai Marina', description: 'Stunning waterfront promenade and dining district' },
      { title: 'Al Fahidi Quarter', description: 'Historic wind-tower neighborhood and Dubai Museum' },
      { title: 'JBR Beach', description: 'Golden sands with skyline views and beachfront dining' }
    ]),
    mood_vibe: 'luxurious',
    brand_color: '#D4AF37',
    mood_primary_color: '#0D1B2A',
    mood_gradient_from: '#0D1B2A',
    mood_gradient_to: '#D4AF37'
  },
  {
    id: 6, // Hong Kong
    description: `Hong Kong is a vertical city of superlatives, where bamboo-scaffolded skyscrapers rise above ancient temples and neon-lit streets pulse with energy around the clock. Victoria Peak offers a panoramic view of the iconic skyline, one of the most photographed in the world, with the harbor stretching between Hong Kong Island and Kowloon.

The city is a food lover's dream. From Michelin-starred dim sum at Tim Ho Wan — the world's cheapest Michelin restaurant — to sizzling dai pai dong street stalls in Sham Shui Po, Hong Kong's culinary scene is unmatched in density and diversity. The Temple Street Night Market in Kowloon and the Ladies' Market in Mong Kok offer bargain-hunting adventures alongside fortune tellers and opera singers.

Beyond the urban core, Hong Kong surprises with natural beauty. Over 70% of the territory is countryside, with hiking trails like the Dragon's Back offering stunning coastal views. The Big Buddha on Lantau Island sits serenely above the Ngong Ping plateau, reached by a dramatic cable car ride. Traditional fishing villages like Tai O provide a glimpse into Hong Kong's pre-colonial heritage.`,
    summary: 'A dazzling fusion of East and West with stunning skylines, legendary food, and surprising nature.',
    mood_tagline: 'Asia\'s World City',
    hero_subtitle: 'Skyline, Dim Sum & Hidden Trails',
    meta_title: 'Hong Kong Travel Guide | Food, Views & Culture',
    meta_description: 'Explore Hong Kong with our guide to Victoria Peak, dim sum, night markets, hiking trails, and more.',
    primary_keyword: 'Hong Kong travel guide',
    featured_highlights: JSON.stringify([
      { title: 'Victoria Peak', description: 'Iconic panoramic views of the skyline' },
      { title: 'Dim Sum Culture', description: 'World-class Cantonese cuisine everywhere' },
      { title: 'Temple Street Night Market', description: 'Bargains, food, and fortune tellers' },
      { title: 'Big Buddha', description: 'Giant bronze Buddha on Lantau Island' },
      { title: 'Dragon\'s Back Trail', description: 'Award-winning urban hiking trail' }
    ]),
    mood_vibe: 'dynamic',
    brand_color: '#FF4136',
    mood_primary_color: '#2C003E',
    mood_gradient_from: '#2C003E',
    mood_gradient_to: '#FF4136'
  },
  {
    id: 7, // Istanbul
    description: `Istanbul is the only city in the world that spans two continents, with Europe and Asia meeting across the Bosphorus strait. This geographic uniqueness has made it a crossroads of civilizations for over 2,500 years, leaving behind a layered tapestry of Roman, Byzantine, and Ottoman heritage that fills every street and skyline.

The Hagia Sophia stands as the city's crowning jewel — built as a cathedral in 537 AD, converted to a mosque, then a museum, and now a mosque again. Its massive dome seems to float above the interior, which glows with Byzantine mosaics and Ottoman calligraphy. Nearby, the Blue Mosque dazzles with its six minarets and 20,000 handmade Iznik tiles. The Topkapi Palace, home to Ottoman sultans for 400 years, displays treasures including the Spoonmaker's Diamond and the Prophet Muhammad's cloak.

The Grand Bazaar is one of the world's oldest and largest covered markets, with over 4,000 shops selling carpets, ceramics, leather goods, and Turkish delight. A few blocks away, the Egyptian Spice Bazaar fills the air with the scents of cumin, sumac, and dried roses. Istanbul's food scene extends from rooftop restaurants overlooking the Golden Horn to humble street vendors serving fresh balik ekmek (fish sandwiches) at Eminonu pier.`,
    summary: 'Where Europe meets Asia — ancient bazaars, Byzantine mosaics, and Turkish culinary treasures.',
    mood_tagline: 'Where Continents Collide',
    hero_subtitle: 'Two Continents, One Extraordinary City',
    meta_title: 'Istanbul Travel Guide | History, Bazaars & Food',
    meta_description: 'Discover Istanbul with our guide to Hagia Sophia, Grand Bazaar, Blue Mosque, and Turkish cuisine.',
    primary_keyword: 'Istanbul travel guide',
    featured_highlights: JSON.stringify([
      { title: 'Hagia Sophia', description: '1,500-year-old architectural wonder' },
      { title: 'Grand Bazaar', description: '4,000+ shops in the world\'s oldest covered market' },
      { title: 'Blue Mosque', description: 'Stunning Ottoman mosque with 20,000 Iznik tiles' },
      { title: 'Topkapi Palace', description: 'Ottoman sultans\' residence with priceless treasures' },
      { title: 'Bosphorus Cruise', description: 'Sail between Europe and Asia' }
    ]),
    mood_vibe: 'historic',
    brand_color: '#C62828',
    mood_primary_color: '#1A237E',
    mood_gradient_from: '#1A237E',
    mood_gradient_to: '#C62828'
  },
  {
    id: 8, // Las Vegas
    description: `Las Vegas is the Entertainment Capital of the World, a neon oasis in the Mojave Desert that attracts over 40 million visitors annually with its extraordinary concentration of shows, dining, and gaming. The Las Vegas Strip stretches for 4.2 miles with themed mega-resorts that recreate Paris, Venice, ancient Egypt, and New York in spectacular fashion.

World-class entertainment defines Vegas beyond the casino floor. Residency shows from top artists pack venues nightly, while Cirque du Soleil operates multiple permanent productions. The dining scene has evolved from all-you-can-eat buffets to a serious culinary destination, with restaurants from Gordon Ramsay, Wolfgang Puck, and Jose Andres earning Michelin stars and James Beard recognition.

Beyond the Strip, Las Vegas offers unexpected experiences. The Arts District (18b) hosts galleries, craft breweries, and First Friday art walks. Red Rock Canyon National Conservation Area, just 20 minutes from the Strip, offers dramatic desert landscapes and world-class rock climbing. Hoover Dam and the Grand Canyon are popular day trips, making Vegas a gateway to some of America's most iconic natural wonders.`,
    summary: 'The Entertainment Capital of the World — world-class shows, dining, gaming, and desert adventures.',
    mood_tagline: 'The Entertainment Capital',
    hero_subtitle: 'Where Every Night Is Legendary',
    meta_title: 'Las Vegas Travel Guide | Shows, Dining & Gaming',
    meta_description: 'Plan your Las Vegas trip. Discover shows, restaurants, casinos, day trips to Grand Canyon, and insider tips.',
    primary_keyword: 'Las Vegas travel guide',
    featured_highlights: JSON.stringify([
      { title: 'The Strip', description: '4.2 miles of themed mega-resorts and casinos' },
      { title: 'World-Class Shows', description: 'Cirque du Soleil, residencies, and Broadway hits' },
      { title: 'Celebrity Chef Dining', description: 'Michelin-starred restaurants from global chefs' },
      { title: 'Red Rock Canyon', description: 'Stunning desert landscapes minutes from the Strip' },
      { title: 'Grand Canyon Day Trip', description: 'One of the world\'s natural wonders nearby' }
    ]),
    mood_vibe: 'electric',
    brand_color: '#FF1744',
    mood_primary_color: '#000000',
    mood_gradient_from: '#000000',
    mood_gradient_to: '#FF1744'
  },
  {
    id: 9, // London
    description: `London is a city where nearly 2,000 years of history coexist with cutting-edge culture and innovation. The Tower of London, a fortress founded by William the Conqueror in 1066, guards the Crown Jewels, while just across the Thames, the Shard pierces the sky at 310 meters. Buckingham Palace's Changing of the Guard ceremony remains one of the world's most iconic free spectacles.

The city's museum scene is unrivaled — and remarkably, many of the best are free. The British Museum holds the Rosetta Stone and Parthenon sculptures, the National Gallery displays masterworks from Da Vinci to Van Gogh, and the Tate Modern occupies a converted power station with views over the Millennium Bridge to St Paul's Cathedral. The Natural History Museum and V&A in South Kensington are architectural marvels in their own right.

London's neighborhoods define its character. Notting Hill's pastel-colored houses and Portobello Road Market charm visitors, while Shoreditch pulses with street art and independent coffee shops. Camden Market combines food, fashion, and live music in a wonderfully eclectic setting. The West End rivals Broadway for theatrical excellence, with landmark shows running in ornate Victorian and Edwardian theaters.`,
    summary: 'Royal heritage and modern culture in one iconic city — museums, theater, and the world at your doorstep.',
    mood_tagline: 'The Original World City',
    hero_subtitle: 'History, Culture & Endless Discovery',
    meta_title: 'London Travel Guide | Museums, Shows & Royal Sites',
    meta_description: 'Explore London with our guide to Buckingham Palace, British Museum, West End shows, and vibrant neighborhoods.',
    primary_keyword: 'London travel guide',
    featured_highlights: JSON.stringify([
      { title: 'Tower of London', description: 'Nearly 1,000 years of history and the Crown Jewels' },
      { title: 'British Museum', description: 'Free entry to one of the world\'s greatest museums' },
      { title: 'West End Theatre', description: 'World-class performances in historic venues' },
      { title: 'Buckingham Palace', description: 'The King\'s official residence and Changing of the Guard' },
      { title: 'Borough Market', description: 'London\'s most renowned food market since 1756' }
    ]),
    mood_vibe: 'classic',
    brand_color: '#003366',
    mood_primary_color: '#1B1B2F',
    mood_gradient_from: '#1B1B2F',
    mood_gradient_to: '#003366'
  },
  {
    id: 10, // Los Angeles
    description: `Los Angeles sprawls across the Southern California coast, a sun-soaked metropolis where Hollywood dreams, Pacific waves, and multicultural neighborhoods create an endlessly fascinating tapestry. The Hollywood Sign, perched on Mount Lee in the Santa Monica Mountains, has been an icon of ambition since 1923, while the Hollywood Walk of Fame stretches along Hollywood Boulevard with over 2,700 stars.

The city's cultural offerings extend far beyond movie studios. The Getty Center, free to visit, houses European paintings and sculptures in Richard Meier's stunning hilltop campus with panoramic views to the Pacific. LACMA's Urban Light installation of 202 restored street lamps has become one of the most Instagrammed spots in America. The Griffith Observatory offers free telescope viewing and sweeping views from Downtown to the ocean.

LA's beach communities each have their own personality. Santa Monica's pier and Third Street Promenade blend shopping with ocean views, Venice Beach showcases bodybuilders, skateboarders, and street performers on its famous boardwalk, and Malibu's 27 miles of coastline feature world-class surfing and celebrity hideaways. The food scene reflects the city's diversity, from Little Tokyo's ramen shops to East LA's taco trucks to the farm-to-table restaurants of Silver Lake.`,
    summary: 'Hollywood glamour, beautiful beaches, and endless sunshine in the City of Angels.',
    mood_tagline: 'City of Angels',
    hero_subtitle: 'Sun, Stars & Pacific Dreams',
    meta_title: 'Los Angeles Travel Guide | Hollywood, Beaches & More',
    meta_description: 'Discover Los Angeles with our guide to Hollywood, Santa Monica, Venice Beach, museums, and LA food culture.',
    primary_keyword: 'Los Angeles travel guide',
    featured_highlights: JSON.stringify([
      { title: 'Hollywood', description: 'Walk of Fame, studios, and the iconic Hollywood Sign' },
      { title: 'Santa Monica Beach', description: 'Iconic pier, promenade, and Pacific sunsets' },
      { title: 'Getty Center', description: 'Free world-class art museum with stunning views' },
      { title: 'Venice Beach', description: 'Legendary boardwalk with street performers' },
      { title: 'Griffith Observatory', description: 'Free stargazing with panoramic city views' }
    ]),
    mood_vibe: 'creative',
    brand_color: '#FF9800',
    mood_primary_color: '#1A237E',
    mood_gradient_from: '#1A237E',
    mood_gradient_to: '#FF9800'
  },
  {
    id: 11, // Miami
    description: `Miami is where Latin American energy meets American ambition, creating a vibrant cultural fusion unlike anywhere else on the planet. South Beach's Art Deco Historic District features over 800 pastel-colored buildings from the 1930s and 40s, perfectly preserved along Ocean Drive where the people-watching is as spectacular as the architecture.

The city's cultural scene has exploded in recent years. The Wynwood Walls transformed a warehouse district into the world's largest outdoor street art museum, while the Perez Art Museum Miami (PAMM) hangs dramatically over Biscayne Bay. The Design District houses luxury fashion brands alongside cutting-edge galleries, and Little Havana's Calle Ocho pulses with domino games, cigar shops, and the irresistible aroma of Cuban coffee.

Miami's natural beauty extends beyond its famous beaches. Everglades National Park, a UNESCO World Heritage site just 45 minutes from Downtown, protects a unique ecosystem of sawgrass marshes, mangroves, and wildlife including alligators and manatees. Biscayne Bay offers world-class boating, while Key Biscayne's Crandon Park provides a tranquil escape with some of the best snorkeling in South Florida.`,
    summary: 'Vibrant beaches, Art Deco charm, Latin beats, and a cultural scene that never stops surprising.',
    mood_tagline: 'The Magic City',
    hero_subtitle: 'Where Latin Soul Meets Ocean Breeze',
    meta_title: 'Miami Travel Guide | Beaches, Art Deco & Nightlife',
    meta_description: 'Plan your Miami trip with our guide to South Beach, Wynwood, Little Havana, Everglades, and vibrant nightlife.',
    primary_keyword: 'Miami travel guide',
    featured_highlights: JSON.stringify([
      { title: 'South Beach', description: 'Art Deco architecture and world-famous beaches' },
      { title: 'Wynwood Walls', description: 'World\'s largest outdoor street art museum' },
      { title: 'Little Havana', description: 'Cuban culture, coffee, and cigars on Calle Ocho' },
      { title: 'Everglades', description: 'UNESCO World Heritage wetlands 45 min from Downtown' },
      { title: 'Design District', description: 'Luxury fashion and cutting-edge art galleries' }
    ]),
    mood_vibe: 'tropical',
    brand_color: '#00BCD4',
    mood_primary_color: '#E91E63',
    mood_gradient_from: '#E91E63',
    mood_gradient_to: '#00BCD4'
  },
  {
    id: 12, // New York
    description: `New York City is the city that never sleeps, a towering metropolis of eight million people and five distinct boroughs that together form the cultural and financial capital of the world. The Statue of Liberty, gifted by France in 1886, continues to welcome visitors in New York Harbor, while the Empire State Building and One World Trade Center define one of the most recognizable skylines on Earth.

Manhattan packs more iconic attractions per square mile than perhaps anywhere else. Central Park's 843 acres provide an urban oasis for jogging, ice skating, and free Shakespeare performances. Times Square's blazing neon signs and Broadway's 41 theaters make the Theater District a pilgrimage for performing arts lovers. The Metropolitan Museum of Art, spanning 5,000 years of art across two million square feet, could occupy visitors for days.

Beyond Manhattan, the boroughs offer authentic New York experiences. Brooklyn's Williamsburg is a hub of independent culture, DUMBO offers stunning views of the Manhattan Bridge, and Prospect Park rivals Central Park in beauty. Queens serves the most ethnically diverse food in the world along Roosevelt Avenue, from Colombian arepas to Tibetan momos. The Bronx is home to the world-class New York Botanical Garden and Yankee Stadium, while Staten Island's free ferry provides postcard views of the harbor.`,
    summary: 'The city that never sleeps — skyscrapers, Broadway, world-class museums, and limitless energy.',
    mood_tagline: 'The City That Never Sleeps',
    hero_subtitle: 'Eight Million Stories, One Extraordinary City',
    meta_title: 'New York Travel Guide | Broadway, Museums & More',
    meta_description: 'Explore NYC with our complete guide to Broadway, Central Park, Statue of Liberty, museums, and the best neighborhoods.',
    primary_keyword: 'New York travel guide',
    featured_highlights: JSON.stringify([
      { title: 'Statue of Liberty', description: 'Iconic symbol of freedom in New York Harbor' },
      { title: 'Broadway', description: '41 theaters and world-class performances' },
      { title: 'Central Park', description: '843-acre urban oasis in the heart of Manhattan' },
      { title: 'Metropolitan Museum', description: '5,000 years of art across 2 million sq ft' },
      { title: 'Brooklyn Bridge', description: 'Walk across this 1883 engineering marvel' }
    ]),
    mood_vibe: 'iconic',
    brand_color: '#1565C0',
    mood_primary_color: '#212121',
    mood_gradient_from: '#212121',
    mood_gradient_to: '#1565C0'
  },
  {
    id: 13, // Paris
    description: `Paris, the City of Light, has been the world's capital of art, fashion, and gastronomy for centuries. The Eiffel Tower, built as a temporary exhibit for the 1889 World's Fair, has become the most visited paid monument on Earth, offering views that stretch 80 kilometers on clear days. At its feet, the Champ de Mars provides the perfect setting for a Parisian picnic.

The Louvre Museum, housed in a former royal palace, is the world's largest and most visited museum. Its collection of 380,000 objects includes the Mona Lisa, the Venus de Milo, and the Winged Victory of Samothrace. The Musee d'Orsay, in a converted Belle Epoque railway station, holds the world's finest collection of Impressionist paintings by Monet, Renoir, and Degas. The Centre Pompidou's inside-out architecture houses Europe's largest modern art collection.

Paris is a city made for walking. The Champs-Elysees stretches from the Arc de Triomphe to the Tuileries Garden, Montmartre's winding streets lead to the white domes of Sacre-Coeur, and the Latin Quarter's medieval lanes are lined with independent bookshops and bistros. The Seine's banks, a UNESCO World Heritage site, are perfect for evening strolls past illuminated Notre-Dame Cathedral, currently undergoing its magnificent restoration.`,
    summary: 'The City of Light — art, fashion, cuisine, and romance at every corner.',
    mood_tagline: 'The City of Light',
    hero_subtitle: 'Art, Romance & Joie de Vivre',
    meta_title: 'Paris Travel Guide | Eiffel Tower, Louvre & More',
    meta_description: 'Plan your Paris trip with our guide to the Eiffel Tower, Louvre, Montmartre, French cuisine, and hidden gems.',
    primary_keyword: 'Paris travel guide',
    featured_highlights: JSON.stringify([
      { title: 'Eiffel Tower', description: 'The world\'s most visited paid monument' },
      { title: 'Louvre Museum', description: 'World\'s largest museum with the Mona Lisa' },
      { title: 'Montmartre', description: 'Bohemian hilltop village with Sacre-Coeur' },
      { title: 'Champs-Elysees', description: 'The world\'s most famous avenue' },
      { title: 'Seine River Cruise', description: 'Glide past illuminated landmarks at sunset' }
    ]),
    mood_vibe: 'romantic',
    brand_color: '#9C27B0',
    mood_primary_color: '#1A1A2E',
    mood_gradient_from: '#1A1A2E',
    mood_gradient_to: '#9C27B0'
  },
  {
    id: 14, // Ras Al Khaimah
    description: `Ras Al Khaimah (RAK) is the northernmost emirate of the UAE, a rising star in adventure tourism that offers a refreshing contrast to its flashier neighbors. Jebel Jais, the UAE's highest peak at 1,934 meters, is home to the world's longest zipline, spanning 2.83 kilometers at speeds reaching 150 km/h. The mountain also offers via ferrata climbing routes, hiking trails, and a stunning observation deck.

The emirate's coastline stretches for 64 kilometers with pristine beaches and luxury resorts that offer a more relaxed and affordable alternative to Dubai and Abu Dhabi. Al Marjan Island, a man-made archipelago, is emerging as a hospitality hub with properties from Wynn, Marriott, and Mövenpick. The warm waters of the Arabian Gulf provide excellent conditions for kayaking, paddleboarding, and diving.

RAK's heritage runs deep. Dhayah Fort, perched dramatically on a hilltop, is the only remaining hill fort in the UAE. The National Museum of Ras Al Khaimah, housed in an 18th-century fort, traces the region's history from the Stone Age to the pearl-diving era. The ancient town of Jazirat Al Hamra, a remarkably preserved pearl-fishing village abandoned in the 1960s, offers a haunting glimpse into pre-oil life in the Gulf.`,
    summary: 'Adventure and relaxation in the northernmost emirate — mountains, beaches, and authentic Arabian heritage.',
    mood_tagline: 'The Adventure Emirate',
    hero_subtitle: 'Mountains, Beaches & Arabian Spirit',
    meta_title: 'Ras Al Khaimah Guide | Adventure, Beaches & More',
    meta_description: 'Discover Ras Al Khaimah — the UAE\'s adventure emirate. Jebel Jais zipline, beaches, heritage sites, and luxury resorts.',
    primary_keyword: 'Ras Al Khaimah travel guide',
    featured_highlights: JSON.stringify([
      { title: 'Jebel Jais', description: 'UAE\'s highest peak with the world\'s longest zipline' },
      { title: 'Al Marjan Island', description: 'Emerging luxury resort destination' },
      { title: 'Dhayah Fort', description: 'UAE\'s only remaining hill fort with panoramic views' },
      { title: 'Pristine Beaches', description: '64km of quiet Arabian Gulf coastline' },
      { title: 'Jazirat Al Hamra', description: 'Preserved pearl-fishing village from the 1960s' }
    ]),
    mood_vibe: 'adventurous',
    brand_color: '#2E7D32',
    mood_primary_color: '#1B5E20',
    mood_gradient_from: '#1B5E20',
    mood_gradient_to: '#FF8F00'
  },
  {
    id: 15, // Rome
    description: `Rome is a living museum where nearly 3,000 years of history unfold at every turn. The Colosseum, completed in 80 AD, once hosted gladiatorial contests for 50,000 spectators and remains the largest ancient amphitheater ever built. Adjacent, the Roman Forum and Palatine Hill reveal the political and social heart of the ancient empire, with ruins of temples, basilicas, and triumphal arches.

Vatican City, the world's smallest independent state, lies within Rome and draws millions of pilgrims and art lovers annually. St. Peter's Basilica, the largest church in Christendom, houses Michelangelo's Pieta and offers breathtaking views from its dome. The Sistine Chapel ceiling, painted by Michelangelo between 1508 and 1512, is one of the supreme achievements of Western art. The Vatican Museums' collection of over 70,000 works spans from ancient Egyptian artifacts to modern religious art.

Roman cuisine is deceptively simple yet deeply satisfying. The four pasta pillars — cacio e pepe, carbonara, amatriciana, and gricia — are perfected in family-run trattorias across Trastevere and Testaccio. Supplì (fried rice balls), pizza al taglio (by the slice), and gelato from artisan shops make walking Rome a continuous culinary adventure. Tossing a coin into the Trevi Fountain guarantees a return to the Eternal City — and few who visit can resist making that promise.`,
    summary: 'Walk through nearly 3,000 years of history in the Eternal City — Colosseum, Vatican, and timeless cuisine.',
    mood_tagline: 'The Eternal City',
    hero_subtitle: 'Where Every Stone Tells a Story',
    meta_title: 'Rome Travel Guide | Colosseum, Vatican & Italian Food',
    meta_description: 'Explore Rome with our guide to the Colosseum, Vatican, Trevi Fountain, Italian cuisine, and ancient history.',
    primary_keyword: 'Rome travel guide',
    featured_highlights: JSON.stringify([
      { title: 'Colosseum', description: 'Iconic 50,000-seat ancient amphitheater' },
      { title: 'Vatican Museums', description: '70,000+ artworks including the Sistine Chapel' },
      { title: 'Roman Forum', description: 'Ruins of ancient Rome\'s political center' },
      { title: 'Trevi Fountain', description: 'Baroque masterpiece — toss a coin to return' },
      { title: 'Trastevere', description: 'Charming neighborhood for authentic Roman dining' }
    ]),
    mood_vibe: 'historic',
    brand_color: '#8D6E63',
    mood_primary_color: '#3E2723',
    mood_gradient_from: '#3E2723',
    mood_gradient_to: '#8D6E63'
  },
  {
    id: 16, // Singapore
    description: `Singapore is a city-state that punches far above its weight, a 728-square-kilometer island that has become one of the world's most prosperous and livable cities. Marina Bay Sands, with its iconic infinity pool perched across three towers, has become the symbol of modern Singapore, while the Supertree Grove at Gardens by the Bay brings a futuristic vision of nature to life with its towering vertical gardens.

The city's cultural diversity is its greatest asset. Chinatown's ornate temples sit alongside the shophouses of the heritage conservation area, Little India explodes with color and spice along Serangoon Road, and Kampong Glam's Arab Quarter features the golden-domed Sultan Mosque and Haji Lane's independent boutiques. Peranakan (Straits Chinese) culture adds another layer of uniqueness found nowhere else in the world.

Singapore's food culture is legendary, anchored by its hawker centers — open-air food courts where dishes averaging $3-5 have earned Michelin stars. Maxwell Food Centre, Lau Pa Sat, and Tiong Bahru Market serve signature dishes like Hainanese chicken rice, laksa, chili crab, and char kway teow. The city's position as a global hub means you'll also find outstanding Japanese omakase, French fine dining, and innovative modern Asian cuisine at every turn.`,
    summary: 'A melting pot of cultures with futuristic architecture, legendary hawker food, and tropical gardens.',
    mood_tagline: 'The Garden City',
    hero_subtitle: 'Future City with Heritage Soul',
    meta_title: 'Singapore Travel Guide | Food, Gardens & Culture',
    meta_description: 'Plan your Singapore trip. Discover Marina Bay Sands, Gardens by the Bay, hawker food, and multicultural neighborhoods.',
    primary_keyword: 'Singapore travel guide',
    featured_highlights: JSON.stringify([
      { title: 'Marina Bay Sands', description: 'Iconic triple-tower hotel with infinity pool' },
      { title: 'Gardens by the Bay', description: 'Futuristic Supertree Grove and flower domes' },
      { title: 'Hawker Centers', description: 'Michelin-starred street food for under $5' },
      { title: 'Chinatown & Little India', description: 'Vibrant multicultural heritage districts' },
      { title: 'Sentosa Island', description: 'Beaches, Universal Studios, and adventure parks' }
    ]),
    mood_vibe: 'futuristic',
    brand_color: '#00C853',
    mood_primary_color: '#0D47A1',
    mood_gradient_from: '#0D47A1',
    mood_gradient_to: '#00C853'
  },
  {
    id: 17, // Tokyo
    description: `Tokyo is a city where ancient Shinto shrines share blocks with neon-drenched gaming arcades, and centuries-old tea ceremonies coexist with cutting-edge robotics. Shibuya Crossing, the world's busiest pedestrian intersection, sees up to 3,000 people cross simultaneously during peak hours — a mesmerizing symbol of the city's organized energy. Nearby, Harajuku's Takeshita Street is the epicenter of Japanese youth fashion and pop culture.

Traditional Tokyo reveals itself in unexpected moments. The Meiji Shrine, dedicated to Emperor Meiji and Empress Shoken, occupies a forested sanctuary in the heart of the city, while the Senso-ji temple in Asakusa has welcomed worshippers since 645 AD. The Imperial Palace East Gardens offer tranquil walks within the former Edo Castle grounds. For a deeper cultural immersion, the Yanaka district preserves the feel of old Tokyo with its narrow lanes, independent cafes, and artisan workshops.

Tokyo's food scene is the world's most Michelin-starred, with over 200 starred restaurants spanning every price range. Tsukiji Outer Market (the famous inner market moved to Toyosu) offers the freshest sushi breakfast imaginable, while ramen shops in every neighborhood perfect their craft to obsessive detail. Depachika (department store food basements) are culinary wonderlands of beautifully packaged wagashi sweets, bento boxes, and artisan breads. Robot Restaurant in Shinjuku and themed cafes across Akihabara add a uniquely Tokyo layer to the dining experience.`,
    summary: 'Where ancient traditions blend with cutting-edge technology — temples, ramen, and neon dreams.',
    mood_tagline: 'The Future Is Now',
    hero_subtitle: 'Ancient Temples, Neon Dreams',
    meta_title: 'Tokyo Travel Guide | Temples, Food & Technology',
    meta_description: 'Explore Tokyo with our guide to Shibuya, Senso-ji, sushi, ramen, anime culture, and traditional neighborhoods.',
    primary_keyword: 'Tokyo travel guide',
    featured_highlights: JSON.stringify([
      { title: 'Shibuya Crossing', description: 'World\'s busiest intersection — pure Tokyo energy' },
      { title: 'Senso-ji Temple', description: 'Tokyo\'s oldest temple in historic Asakusa' },
      { title: 'Tsukiji/Toyosu Market', description: 'The world\'s freshest sushi experience' },
      { title: 'Harajuku', description: 'Epicenter of Japanese youth fashion culture' },
      { title: 'Meiji Shrine', description: 'Tranquil forest sanctuary in the city center' }
    ]),
    mood_vibe: 'futuristic',
    brand_color: '#E91E63',
    mood_primary_color: '#1A1A2E',
    mood_gradient_from: '#1A1A2E',
    mood_gradient_to: '#E91E63'
  }
];

// ─── Article seed data ─────────────────────────────────────────────────────────

const articles = [
  {
    title: 'Top 10 Things to Do in Dubai',
    slug: 'top-10-things-to-do-in-dubai',
    meta_title: 'Top 10 Things to Do in Dubai | TRAVI Guide',
    meta_description: 'Discover the top 10 must-do experiences in Dubai, from Burj Khalifa to desert safaris, shopping, and more.',
    primary_keyword: 'things to do in Dubai',
    category: 'attractions',
    summary: 'From the world\'s tallest building to ancient souks and desert adventures, here are the 10 experiences that define Dubai.',
    excerpt: 'Dubai offers a staggering range of experiences for every type of traveler. Here are the absolute must-do activities.',
    blocks: [
      { type: 'heading', level: 2, text: '1. Visit the Burj Khalifa' },
      { type: 'paragraph', text: 'Standing at 828 meters, the Burj Khalifa is the tallest building on Earth and Dubai\'s most iconic landmark. The At the Top observation deck on the 124th floor offers sweeping views of the city, the desert, and the Arabian Gulf. For an even more exclusive experience, the SKY lounge on the 148th floor provides premium access with refreshments. Time your visit for sunset to watch the city transform from golden afternoon light to a glittering carpet of lights.' },
      { type: 'paragraph', text: 'At the base of the Burj Khalifa, the Dubai Fountain puts on a spectacular show every 30 minutes in the evening. Set on the 30-acre Burj Khalifa Lake, the fountain shoots water up to 150 meters in the air, choreographed to Arabic, classical, and contemporary music. It\'s free to watch from the promenade, making it one of Dubai\'s best free attractions.' },
      { type: 'heading', level: 2, text: '2. Explore the Dubai Mall' },
      { type: 'paragraph', text: 'The Dubai Mall is not just a shopping destination — it\'s an entertainment city. Spanning over 1 million square meters of total area, it houses over 1,200 retail stores, the Dubai Aquarium and Underwater Zoo with 33,000 aquatic animals, an Olympic-sized ice rink, a VR park, and a 22-screen cinema complex. The mall also features a dedicated fashion avenue with the world\'s top luxury brands.' },
      { type: 'paragraph', text: 'For families, KidZania offers an interactive educational experience where children can role-play adult careers. The mall connects directly to the Burj Khalifa and sits beside the Dubai Fountain, making it easy to combine multiple experiences in one visit.' },
      { type: 'heading', level: 2, text: '3. Desert Safari Adventure' },
      { type: 'paragraph', text: 'No visit to Dubai is complete without a desert safari. Just 45 minutes from the city center, the Arabian Desert offers an otherworldly landscape of rolling red dunes. Most safari packages include dune bashing in a 4x4, camel riding, sandboarding, and quad biking. As the sun sets, you\'ll arrive at a traditional Bedouin camp for a barbecue dinner under the stars, accompanied by belly dancing, henna painting, and shisha.' },
      { type: 'paragraph', text: 'For a more upscale experience, several operators offer overnight luxury camping in the desert with private pools and gourmet dining. Hot air balloon rides at dawn offer a serene alternative, floating silently over the dunes as the first light paints the landscape gold and copper.' },
      { type: 'heading', level: 2, text: '4. Walk Through Old Dubai' },
      { type: 'paragraph', text: 'The Al Fahidi Historical Neighbourhood is the heart of old Dubai, a beautifully restored area of wind-tower houses, art galleries, and the Dubai Museum in Al Fahidi Fort. Cross Dubai Creek on a traditional abra (water taxi) for just 1 AED and explore the Gold Souk, where shops display an estimated 10 tons of gold at any given time. The adjacent Spice Souk fills the air with intoxicating aromas of saffron, frankincense, and dried roses.' },
      { type: 'heading', level: 2, text: '5. Relax at JBR Beach and Dubai Marina' },
      { type: 'paragraph', text: 'Jumeirah Beach Residence (JBR) offers a perfect beach day with golden sand, clean waters, and a vibrant beachfront promenade called The Walk. Dubai Marina, one of the largest man-made marinas in the world, is ideal for evening strolls, yacht cruises, and waterfront dining. The area comes alive at night with restaurants, cafes, and stunning views of the illuminated skyline.' },
      { type: 'heading', level: 2, text: '6. Visit the Palm Jumeirah' },
      { type: 'paragraph', text: 'The Palm Jumeirah, an artificial island shaped like a palm tree, is one of Dubai\'s most ambitious engineering feats. Atlantis The Royal, the new ultra-luxury resort by Kerzner International, offers stunning architecture and celebrity chef restaurants. Aquaventure Waterpark features over 105 slides and attractions, including the world\'s largest waterpark. The Palm also offers the View at The Palm, an observation deck providing 360-degree views from 240 meters.' },
      { type: 'heading', level: 2, text: '7. Shop at the Gold and Spice Souks' },
      { type: 'paragraph', text: 'Dubai\'s traditional souks are a sensory feast. The Gold Souk in Deira is one of the largest gold markets in the world, with over 300 retailers selling everything from simple chains to elaborate bridal sets. Prices are based on the daily gold rate plus a making charge, and bargaining is expected. The nearby Spice Souk offers saffron, oud, and traditional Arabic perfumes at prices far below mall shops.' },
      { type: 'heading', level: 2, text: '8. Experience Dubai\'s Dining Scene' },
      { type: 'paragraph', text: 'Dubai is a UNESCO Creative City of Gastronomy, and its dining scene reflects the 200+ nationalities living in the city. DIFC and Downtown host Michelin-starred restaurants from celebrity chefs including Nobu Matsuhisa, Massimo Bottura, and Heston Blumenthal. For authentic local flavors, explore Karama for Pakistani and Indian street food, Satwa for Iranian cuisine, and Al Dhiyafah Road for shawarma and kunafa.' },
      { type: 'heading', level: 2, text: '9. Visit the Dubai Frame' },
      { type: 'paragraph', text: 'The Dubai Frame, standing 150 meters tall in Zabeel Park, is an architectural landmark that frames views of old and new Dubai on either side. A glass-floored sky deck at the top offers vertiginous views straight down. The ground floor features an immersive exhibition about Dubai\'s transformation from a small fishing village to a global metropolis, making it one of the most photogenic attractions in the city.' },
      { type: 'heading', level: 2, text: '10. Watch the Sunset from a Rooftop Bar' },
      { type: 'paragraph', text: 'Dubai\'s rooftop bar scene is world-class. SkyView Bar on the 27th floor of the Burj Al Arab offers exclusive cocktails with panoramic views. Ce La Vi at Address Sky View provides stunning Burj Khalifa views, while Level 43 Sky Lounge in Dubai Marina is perfect for watching the sun set over the Palm. For a truly unique experience, Privilege at the JW Marriott Marquis — one of the world\'s tallest hotels — offers views from 72 floors up.' }
    ]
  },
  {
    title: 'Best Time to Visit Dubai',
    slug: 'best-time-to-visit-dubai',
    meta_title: 'Best Time to Visit Dubai | Weather & Season Guide',
    meta_description: 'Find the best time to visit Dubai based on weather, prices, events, and activities. Month-by-month guide included.',
    primary_keyword: 'best time to visit Dubai',
    category: 'tips',
    summary: 'Dubai\'s best months for visiting depend on what you want to do. Here\'s a complete season-by-season breakdown.',
    excerpt: 'Planning a Dubai trip? Learn the best months to visit for weather, prices, and major events.',
    blocks: [
      { type: 'heading', level: 2, text: 'Overview: Dubai\'s Climate' },
      { type: 'paragraph', text: 'Dubai has a hot desert climate with two main seasons: a warm winter (November to March) and a scorching summer (June to September). The best time for most visitors is November through March, when temperatures are pleasant at 20-30°C, skies are blue, and outdoor activities are comfortable. Summer temperatures routinely exceed 45°C with high humidity, making outdoor sightseeing extremely challenging.' },
      { type: 'heading', level: 2, text: 'Peak Season: November to March' },
      { type: 'paragraph', text: 'This is Dubai\'s golden period. Temperatures hover between 20-30°C, rainfall is minimal, and the city buzzes with events. The Dubai Shopping Festival (December-January) offers major discounts at malls and souks. Dubai Food Festival (February-March) showcases the city\'s culinary diversity. New Year\'s Eve features one of the world\'s most spectacular fireworks displays at the Burj Khalifa.' },
      { type: 'paragraph', text: 'The downside of peak season is higher hotel prices and larger crowds. Book at least 2-3 months in advance for the best rates, especially around Christmas, New Year, and the Formula 1 Abu Dhabi Grand Prix weekend in November. Five-star hotel rates can triple during peak weeks.' },
      { type: 'heading', level: 2, text: 'Shoulder Season: April and October' },
      { type: 'paragraph', text: 'April and October offer a sweet spot. Temperatures are warm (30-35°C) but manageable, especially with Dubai\'s exceptional air conditioning in malls, restaurants, and attractions. Hotel prices drop 20-30% from peak rates, and crowds thin considerably. April brings Dubai World Cup, one of the richest horse racing events in the world, while October marks the start of the outdoor dining season.' },
      { type: 'heading', level: 2, text: 'Summer: May to September' },
      { type: 'paragraph', text: 'Summer in Dubai is intense — temperatures regularly hit 45°C with humidity above 80%. However, this is when you\'ll find the best deals. Hotel prices plummet by 40-60%, and indoor attractions like Dubai Mall, Ski Dubai, and IMG Worlds of Adventure remain perfectly comfortable. Many restaurants offer incredible summer promotions and prix fixe menus.' },
      { type: 'paragraph', text: 'Ramadan (dates shift annually based on the Islamic calendar) typically falls in spring/summer. While restaurants are closed during daylight hours, the iftar (breaking of fast) meals at sunset are among the most memorable dining experiences in Dubai. The city takes on a special atmosphere of community and generosity during this holy month.' },
      { type: 'heading', level: 2, text: 'Month-by-Month Quick Guide' },
      { type: 'paragraph', text: 'January: Perfect weather, Dubai Shopping Festival. February: Pleasant, Dubai Food Festival. March: Warming up, Art Dubai. April: Hot but manageable, Dubai World Cup. May-September: Very hot, best hotel deals. October: Cooling down, outdoor season begins. November: Ideal weather, F1 season. December: Peak season, New Year celebrations.' },
      { type: 'heading', level: 2, text: 'Best Time for Beach Activities' },
      { type: 'paragraph', text: 'The Arabian Gulf waters are warm year-round (22-33°C). Beach season runs from October to May, with the most comfortable water temperatures in November-December (around 26°C) and March-April (around 24°C). Summer beach visits are best reserved for early morning or late afternoon, with many beach clubs offering temperature-controlled pools as alternatives.' },
      { type: 'heading', level: 2, text: 'Best Time for Desert Activities' },
      { type: 'paragraph', text: 'Desert safaris operate year-round, but November to March offers the most comfortable experience. Morning balloon rides are particularly magical in December and January when the air is cool and clear. Avoid desert excursions in July and August when sand temperatures can exceed 70°C.' }
    ]
  },
  {
    title: 'Getting Around Dubai — Transport Guide',
    slug: 'getting-around-dubai-transport-guide',
    meta_title: 'Dubai Transport Guide | Metro, Taxi, Bus & More',
    meta_description: 'Complete guide to getting around Dubai. Metro, taxis, buses, water taxis, ride-hailing apps, and rental cars explained.',
    primary_keyword: 'Dubai transportation',
    category: 'transport',
    summary: 'Everything you need to know about navigating Dubai, from the driverless metro to traditional abra boats.',
    excerpt: 'Dubai is a spread-out city, but getting around is easier than you think. Here\'s your complete transport guide.',
    blocks: [
      { type: 'heading', level: 2, text: 'Dubai Metro: The Backbone' },
      { type: 'paragraph', text: 'The Dubai Metro is the world\'s longest driverless metro system, spanning 75 kilometers across two lines. The Red Line runs from Rashidiya to UAE Exchange via the airport, Downtown, and Dubai Marina. The Green Line connects Creek stations to Healthcare City. Trains run every 3-7 minutes during peak hours and every 10 minutes off-peak. Operating hours are Saturday to Thursday 5:30 AM to midnight, and Friday 10 AM to midnight.' },
      { type: 'paragraph', text: 'The metro uses a Nol card system with Silver, Gold, and Blue tiers. Silver class (standard) costs as little as 3 AED per trip. Gold class offers larger, less crowded carriages with plush seating. A Red Nol ticket (paper) works for single trips. Women and children have dedicated carriages at the front of each train. The metro is immaculately clean — eating, drinking, and chewing gum are strictly prohibited on board.' },
      { type: 'heading', level: 2, text: 'Taxis and Ride-Hailing' },
      { type: 'paragraph', text: 'Dubai\'s cream-colored taxis are metered, reliable, and air-conditioned. The starting fare is 5 AED (12 AED from the airport), with 1.96 AED per kilometer. Taxis are easy to hail on major roads, and most drivers speak basic English. Pink-roofed taxis with female drivers are available for women and families.' },
      { type: 'paragraph', text: 'Careem (the region\'s equivalent of Uber, now owned by Uber) and Uber both operate in Dubai. Both apps are reliable and often comparable in price to street taxis. During peak hours or rain (which causes chaos on Dubai roads), surge pricing can apply. The Careem app also offers Careem Bus, a shared minibus service along popular routes.' },
      { type: 'heading', level: 2, text: 'Dubai Tram' },
      { type: 'paragraph', text: 'The Dubai Tram connects Dubai Marina, JBR, and the Palm Jumeirah monorail station along a 10.6-kilometer route with 11 stations. It\'s the ideal way to get around the Marina and JBR areas without dealing with parking. The tram runs from 6:30 AM to 1:30 AM (Saturday to Thursday) and connects to the metro at DMCC and JLT stations.' },
      { type: 'heading', level: 2, text: 'Water Transport' },
      { type: 'paragraph', text: 'Traditional abra (wooden boat) rides across Dubai Creek cost just 1 AED and take about 5 minutes, connecting Bur Dubai to Deira. These wooden boats have been ferrying passengers for over a century and remain one of Dubai\'s most authentic experiences. The RTA also operates Dubai Ferry services connecting Marina, Creek, and other waterfront areas — the 90-minute full tour (75 AED) offers stunning skyline views.' },
      { type: 'paragraph', text: 'Water taxis and water buses offer modern alternatives along the Creek and Marina waterways. The Dubai Water Canal, opened in 2016, connects Business Bay to the Arabian Gulf through Jumeirah, with water taxi stops at key points along the route.' },
      { type: 'heading', level: 2, text: 'Renting a Car' },
      { type: 'paragraph', text: 'Dubai\'s roads are modern, well-maintained, and well-signposted in English and Arabic. International driving licenses are accepted for tourists. Rental prices start from around 80 AED per day for economy cars. Major rental companies operate at the airports and throughout the city. Parking is widely available but can be expensive in Downtown (around 20 AED per hour). Salik (toll) charges of 4 AED apply at several highway gates.' },
      { type: 'heading', level: 2, text: 'Getting From the Airport' },
      { type: 'paragraph', text: 'Dubai International Airport (DXB) is well-connected to the city. The Dubai Metro Red Line stops at Terminal 1 and Terminal 3, reaching Downtown in about 20 minutes for under 10 AED. Taxis from the airport cost approximately 50-80 AED to Downtown and 100-120 AED to Dubai Marina. Al Maktoum International Airport (DWC), used by some budget airlines, is further south and best reached by taxi or shuttle bus.' },
      { type: 'heading', level: 2, text: 'Tips for Getting Around' },
      { type: 'paragraph', text: 'Buy a Nol card immediately upon arrival — it works on the metro, tram, buses, and water buses. Download the RTA Dubai app for real-time transit information and route planning. Traffic peaks between 7-9 AM and 5-8 PM on weekdays — plan major drives outside these hours. Friday is the lightest traffic day. During Ramadan, traffic patterns shift significantly, with roads quietest in the morning and busiest after iftar.' }
    ]
  },
  {
    title: 'Dubai on a Budget — Money-Saving Tips',
    slug: 'dubai-on-a-budget-money-saving-tips',
    meta_title: 'Dubai on a Budget | 15 Money-Saving Tips for 2026',
    meta_description: 'Visit Dubai without breaking the bank. Budget hotels, free attractions, cheap eats, and smart saving tips.',
    primary_keyword: 'Dubai on a budget',
    category: 'tips',
    summary: 'Dubai doesn\'t have to be expensive. Here\'s how savvy travelers enjoy the City of Gold without the gold-plated price tag.',
    excerpt: 'Think Dubai is only for big spenders? These budget tips prove you can enjoy the city\'s best experiences affordably.',
    blocks: [
      { type: 'heading', level: 2, text: 'Accommodation Hacks' },
      { type: 'paragraph', text: 'Skip the five-star resorts and look at three-star hotels in Deira, Bur Dubai, or Al Barsha. Clean, comfortable rooms with breakfast can be found for 150-250 AED per night. Areas like International City and Discovery Gardens offer studio apartments on Airbnb for even less. Visit during summer (June-August) when even luxury hotels slash rates by 50-70%.' },
      { type: 'paragraph', text: 'If you want a taste of luxury on a budget, many five-star hotels offer incredible day passes for pool and beach access (100-200 AED), giving you the resort experience without the overnight price. Booking.com and Hotels.com frequently offer last-minute deals for mid-range properties in JLT and Tecom.' },
      { type: 'heading', level: 2, text: 'Free Attractions' },
      { type: 'paragraph', text: 'Dubai has dozens of world-class free experiences. The Dubai Fountain show runs every 30 minutes from 6 PM (free). Walking through the Gold Souk and Spice Souk costs nothing. The Dubai Mall, including its aquarium viewing panel, is free to enter. Al Fahidi Historical Neighbourhood offers free heritage walks. Dubai\'s public beaches (JBR, Kite Beach, Umm Suqeim) are free. The Dubai Water Canal boardwalk and Dubai Marina promenade are perfect for free evening strolls.' },
      { type: 'paragraph', text: 'Several museums and galleries offer free entry, including the Etihad Museum, Coffee Museum, and many galleries in Alserkal Avenue (Al Quoz). The Ras Al Khor Wildlife Sanctuary provides free bird-watching hides where you can see thousands of flamingos just 10 minutes from Downtown.' },
      { type: 'heading', level: 2, text: 'Eating Cheap in Dubai' },
      { type: 'paragraph', text: 'You can eat incredibly well in Dubai for under 30 AED per meal. Karama and Satwa are packed with Indian, Pakistani, and Filipino restaurants serving generous portions for 15-25 AED. Shawarma stands throughout the city offer wraps for 5-10 AED. Al Mallah on Al Dhiyafah Road serves legendary shawarma and fresh juices at local prices.' },
      { type: 'paragraph', text: 'For a splurge without the bill, visit restaurants during lunch when many offer set menus at 30-50% less than dinner prices. Food courts in malls offer diverse options for 25-40 AED. The Ravi Restaurant in Satwa has been a Dubai institution for decades, serving exceptional Pakistani cuisine at incredibly low prices — expect to pay 20-30 AED for a full meal.' },
      { type: 'heading', level: 2, text: 'Transport Savings' },
      { type: 'paragraph', text: 'The Dubai Metro is your best friend on a budget. A Nol Silver card costs 25 AED (including 19 AED credit) and individual rides are 3-7.50 AED depending on zones. One-day passes (22 AED) offer unlimited rides. The traditional abra across Dubai Creek costs just 1 AED — possibly the best value experience in Dubai. Avoid taxis during rush hour; the metro is faster and cheaper.' },
      { type: 'heading', level: 2, text: 'Smart Booking Tips' },
      { type: 'paragraph', text: 'Buy attraction tickets online — Burj Khalifa, Dubai Frame, and Aquaventure all offer significant online discounts (10-20% off walk-up prices). The Dubai Pass and Go Dubai Explorer Pass bundle multiple attractions at discounted rates. Visit popular attractions at off-peak times (weekday mornings) for shorter queues and sometimes lower prices.' },
      { type: 'heading', level: 2, text: 'Shopping on a Budget' },
      { type: 'paragraph', text: 'Dubai\'s outlet malls (Dubai Outlet Mall, The Outlet Village) offer 30-90% discounts on brands year-round. Global Village (November-April) is a cultural shopping festival with goods from around the world at bargain prices, plus 25 AED entry includes entertainment. Dragon Mart in International City offers everything from electronics to home goods at wholesale prices.' },
      { type: 'heading', level: 2, text: 'Budget Daily Itinerary Example' },
      { type: 'paragraph', text: 'Here\'s a sample budget day: Morning — free walk through Al Fahidi and Coffee Museum, abra to Spice and Gold Souk (1 AED). Lunch — shawarma and juice at Al Mallah (15 AED). Afternoon — Dubai Mall window shopping, free aquarium viewing, and people-watching. Evening — Dubai Fountain show (free), metro to JBR Beach for sunset walk (5 AED). Dinner — Ravi Restaurant in Satwa (25 AED). Total: under 50 AED for a full day of memorable experiences.' }
    ]
  },
  {
    title: 'Dubai Food Guide — Must-Try Dishes',
    slug: 'dubai-food-guide-must-try-dishes',
    meta_title: 'Dubai Food Guide | 12 Must-Try Dishes & Where to Eat',
    meta_description: 'Explore Dubai\'s diverse food scene. From shawarma and machboos to kunafa and camel milk chocolate — your tasty guide.',
    primary_keyword: 'Dubai food guide',
    category: 'food',
    summary: 'Dubai\'s food scene reflects 200+ nationalities. Here are the essential dishes every visitor should try.',
    excerpt: 'From humble street food to Michelin-starred dining, Dubai\'s culinary diversity is unmatched. Start with these dishes.',
    blocks: [
      { type: 'heading', level: 2, text: '1. Shawarma' },
      { type: 'paragraph', text: 'Dubai\'s shawarma is arguably the best in the world, thanks to fierce competition among thousands of shops. Thinly sliced chicken or lamb is shaved from a rotating spit, wrapped in Arabic bread with garlic sauce, pickles, and tahini. The best come from unassuming roadside shops rather than fancy restaurants. Al Mallah on Al Dhiyafah Road, Hatam Al Tai in Karama, and Shawarma Press on Sheikh Zayed Road are local favorites. Expect to pay 8-15 AED for a generous wrap.' },
      { type: 'heading', level: 2, text: '2. Machboos (Kabsa)' },
      { type: 'paragraph', text: 'Machboos is the UAE\'s national dish — fragrant spiced rice cooked with lamb, chicken, or seafood, seasoned with bezar (a local spice blend of turmeric, cinnamon, and dried limes). The rice absorbs the meat juices and spices, creating layers of flavor. Al Fanar Restaurant in Dubai Festival City serves an excellent version in a traditional Emirati setting. Arabian Tea House in Al Fahidi is another authentic option.' },
      { type: 'heading', level: 2, text: '3. Luqaimat' },
      { type: 'paragraph', text: 'These golden, crispy dumplings are the most beloved Emirati dessert. Deep-fried dough balls are drizzled with date syrup (dibs) and sprinkled with sesame seeds. They\'re crunchy on the outside, soft and airy inside. You\'ll find them at heritage restaurants, Ramadan tents, and street food festivals. Logma in Box Park and Mall of the Emirates offers a modern take on this traditional sweet.' },
      { type: 'heading', level: 2, text: '4. Kunafa (Knafeh)' },
      { type: 'paragraph', text: 'This Levantine dessert has become a Dubai obsession. Crispy shredded phyllo pastry is layered with melted cheese or cream, soaked in sweet syrup, and topped with crushed pistachios. The cheese pull when it\'s freshly made is legendary. Feras Al Diyafa in International City makes arguably the best in Dubai. Al Reef Bakery offers excellent versions at budget-friendly prices throughout the city.' },
      { type: 'heading', level: 2, text: '5. Mandi and Madhbi' },
      { type: 'paragraph', text: 'Yemeni-style slow-cooked meat dishes have a massive following in Dubai. Mandi features tender lamb or chicken cooked in a tandoor oven with aromatic rice, while Madhbi is grilled over charcoal. The meat literally falls off the bone. Maraheb Yemeni Restaurant and Bait Al Mandi in Deira serve generous portions with spicy sahawiq (green chili sauce) and saloona (tomato broth).' },
      { type: 'heading', level: 2, text: '6. Fresh Seafood' },
      { type: 'paragraph', text: 'Dubai\'s location on the Arabian Gulf means exceptional fresh seafood. Hammour (grouper) is the local favorite, often grilled whole with Arabic spices. The Dubai Fish Market in Deira lets you buy fresh catch and have it cooked to order at adjacent restaurants. Bu Qtair, a legendary beachside shack in Jumeirah, serves fried fish and shrimp with minimal fuss but maximum flavor for around 50 AED per person.' },
      { type: 'heading', level: 2, text: '7. Biryani' },
      { type: 'paragraph', text: 'Dubai\'s South Asian population has elevated biryani to an art form here. Hyderabadi, Lucknowi, and Karachi-style versions compete for supremacy across Karama, Meena Bazaar, and Al Nahda. Pak Liyari in Al Quoz and Karachi Darbar across multiple locations serve fragrant, generously portioned biryani for 15-30 AED. The layered rice, marinated meat, and aromatic spices make it one of the best value meals in the city.' },
      { type: 'heading', level: 2, text: '8. Arabic Mezze' },
      { type: 'paragraph', text: 'A proper Arabic mezze spread is a communal feast of small dishes: creamy hummus, smoky mutabal (baba ganoush), tabbouleh bright with parsley and lemon, fattoush with crispy pita chips, and warm manakeesh (flatbread with za\'atar or cheese). Order a mixed mezze platter to sample everything. Al Hallab in Mall of the Emirates and Operation Falafel serve excellent versions at fair prices.' },
      { type: 'heading', level: 2, text: '9. Camel Milk Products' },
      { type: 'paragraph', text: 'The UAE is a pioneer in camel milk products. Al Nassma produces camel milk chocolate in unique flavors including dates and Arabic spices. Camel milk lattes are available at The Camelicious Cafe. The milk itself is nutritious — lower in fat and higher in vitamin C than cow\'s milk. The Camel Bar in The Ritz-Carlton offers camel milk cappuccinos and innovative camel milk desserts.' },
      { type: 'heading', level: 2, text: '10. Karak Chai' },
      { type: 'paragraph', text: 'Karak chai is the unofficial drink of Dubai — strong tea brewed with condensed milk, cardamom, and saffron, sold at almost every cafeteria for 1-3 AED. It\'s the great social equalizer; you\'ll see laborers and businessmen alike gathering at chai stalls. Filli Cafe has standardized the experience, while purists insist the best karak comes from the smallest, most unassuming cafeterias.' },
      { type: 'heading', level: 2, text: '11. Friday Brunch' },
      { type: 'paragraph', text: 'Friday brunch is a Dubai institution. Hotels and restaurants offer lavish all-you-can-eat-and-drink spreads that can last from noon until 4 PM. Prices range from 200-600 AED depending on the venue and package. Bubbalicious at the Westin, Saffron at Atlantis, and La Petite Maison\'s brunch are consistently rated among the best. Book well in advance as the most popular venues fill up weeks ahead.' },
      { type: 'heading', level: 2, text: '12. Dates and Arabic Coffee' },
      { type: 'paragraph', text: 'No Dubai food guide is complete without dates and gahwa (Arabic coffee). The UAE produces premium dates — Khalas, Sukkari, and Medjool varieties are available at Bateel boutiques and traditional markets. Arabic coffee, lightly roasted and flavored with cardamom and saffron, is traditionally served in small cups alongside dates as a gesture of hospitality. The Arabic Coffee Experience at the Coffee Museum in Al Fahidi is a wonderful introduction to this centuries-old tradition.' }
    ]
  }
];

async function run() {
  const client = await pool.connect();

  try {
    // ──────────────────────────────────────────────
    // TASK 1: Update all 17 destinations
    // ──────────────────────────────────────────────
    console.log('=== Updating 17 destinations with rich content ===\n');

    for (const dest of destinations) {
      const { id, featured_highlights, ...fields } = dest;

      const setClauses = [];
      const values = [];
      let paramIdx = 1;

      for (const [key, val] of Object.entries(fields)) {
        setClauses.push(`${key} = $${paramIdx}`);
        values.push(val);
        paramIdx++;
      }

      // featured_highlights is JSONB
      setClauses.push(`featured_highlights = $${paramIdx}::jsonb`);
      values.push(featured_highlights);
      paramIdx++;

      // Set hero_image placeholder
      const heroUrl = `https://cdn.travi.world/hero/${destinations.find(d => d.id === id) ? dest.meta_title.split('|')[0].trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'default'}.webp`;
      setClauses.push(`hero_image = COALESCE(hero_image, $${paramIdx})`);
      values.push(`https://cdn.travi.world/hero/${['abu-dhabi','amsterdam','bangkok','barcelona','dubai','hong-kong','istanbul','las-vegas','london','los-angeles','miami','new-york','paris','ras-al-khaimah','rome','singapore','tokyo'][id-1]}.webp`);
      paramIdx++;

      setClauses.push(`hero_image_alt = COALESCE(hero_image_alt, $${paramIdx})`);
      values.push(`Scenic view of ${destinations.find(d => d.id === id).mood_tagline.includes('City') ? '' : 'the city of '}${dest.meta_title.split('|')[0].trim().replace(' Travel Guide', '')}`);
      paramIdx++;

      // Card image
      setClauses.push(`card_image = COALESCE(card_image, $${paramIdx})`);
      values.push(`https://cdn.travi.world/cards/${['abu-dhabi','amsterdam','bangkok','barcelona','dubai','hong-kong','istanbul','las-vegas','london','los-angeles','miami','new-york','paris','ras-al-khaimah','rome','singapore','tokyo'][id-1]}.webp`);
      paramIdx++;

      // OG fields
      setClauses.push(`og_title = COALESCE(og_title, meta_title)`);
      setClauses.push(`og_description = COALESCE(og_description, meta_description)`);
      setClauses.push(`og_image = COALESCE(og_image, hero_image)`);

      // word_count and seo_score
      const wordCount = dest.description.split(/\s+/).length;
      setClauses.push(`word_count = $${paramIdx}`);
      values.push(wordCount);
      paramIdx++;

      setClauses.push(`seo_score = COALESCE(seo_score, $${paramIdx})`);
      values.push(Math.min(95, 70 + Math.floor(wordCount / 20)));
      paramIdx++;

      setClauses.push(`updated_at = NOW()`);

      values.push(id);

      const sql = `UPDATE destinations SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`;

      await client.query(sql, values);
      console.log(`  Updated: ${fields.meta_title}`);
    }

    console.log('\n=== All 17 destinations updated ===\n');

    // ──────────────────────────────────────────────
    // TASK 2: Insert 5 seed articles
    // ──────────────────────────────────────────────
    console.log('=== Creating 5 seed articles for Dubai ===\n');

    const dubaiId = 5; // Dubai's destination ID

    for (const article of articles) {
      const contentId = randomUUID();
      const articleId = randomUUID();
      const now = new Date().toISOString();

      // Calculate word count from blocks
      const wordCount = article.blocks
        .filter(b => b.type === 'paragraph')
        .reduce((sum, b) => sum + b.text.split(/\s+/).length, 0);

      // Insert into contents table
      await client.query(`
        INSERT INTO contents (id, type, status, title, slug, meta_title, meta_description,
          primary_keyword, summary, blocks, word_count, seo_score, generated_by_ai,
          intent, published_at, created_at, updated_at)
        VALUES ($1, 'article', 'published', $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, false,
          'informational', $11, $11, $11)
        ON CONFLICT DO NOTHING
      `, [
        contentId, article.title, article.slug, article.meta_title, article.meta_description,
        article.primary_keyword, article.summary, JSON.stringify(article.blocks),
        wordCount, Math.min(92, 70 + Math.floor(wordCount / 50)),
        now
      ]);

      // Insert into articles table
      await client.query(`
        INSERT INTO articles (id, content_id, category, excerpt,
          related_destination_ids, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $6)
        ON CONFLICT DO NOTHING
      `, [
        articleId, contentId, article.category, article.excerpt,
        JSON.stringify([dubaiId]),
        now
      ]);

      console.log(`  Created article: ${article.title} (${wordCount} words)`);
    }

    console.log('\n=== All 5 articles created ===\n');

    // ──────────────────────────────────────────────
    // TASK 3: Verification
    // ──────────────────────────────────────────────
    console.log('=== Verification ===\n');

    const destCheck = await client.query(`
      SELECT id, name, slug,
        CASE WHEN description IS NOT NULL AND LENGTH(description) > 100 THEN 'YES' ELSE 'NO' END as has_desc,
        CASE WHEN hero_image IS NOT NULL THEN 'YES' ELSE 'NO' END as has_hero,
        CASE WHEN mood_tagline IS NOT NULL THEN 'YES' ELSE 'NO' END as has_tagline,
        CASE WHEN meta_title IS NOT NULL THEN 'YES' ELSE 'NO' END as has_seo,
        CASE WHEN featured_highlights IS NOT NULL AND featured_highlights::text != '[]' THEN 'YES' ELSE 'NO' END as has_highlights,
        word_count
      FROM destinations ORDER BY id
    `);
    console.table(destCheck.rows);

    const articleCheck = await client.query(`
      SELECT c.title, c.slug, c.status, c.word_count, a.category
      FROM contents c JOIN articles a ON a.content_id = c.id
      WHERE c.type = 'article' AND c.status = 'published'
      ORDER BY c.created_at DESC LIMIT 10
    `);
    console.log('\nPublished articles:');
    console.table(articleCheck.rows);

  } catch (err) {
    console.error('Error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });

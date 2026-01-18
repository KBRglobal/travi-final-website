/**
 * Dubai Pages Data Configuration
 * Comprehensive metadata for all 72 Dubai-specific pages
 * Organized by category for SEO-optimized content delivery
 */

export type DubaiPageCategory = 
  | 'district' 
  | 'off-plan' 
  | 'comparison' 
  | 'tool' 
  | 'case-study' 
  | 'pillar' 
  | 'landing';

export interface DubaiPageBreadcrumb {
  label: string;
  href: string;
}

export interface DubaiPageFAQ {
  question: string;
  answer: string;
}

export interface DubaiPageStat {
  value: string;
  label: string;
  subtext?: string;
}

export interface DubaiPageHero {
  title: string;
  subtitle: string;
  image?: string;
  badges?: string[];
}

export interface DubaiPageCTA {
  label: string;
  href: string;
}

export interface DubaiPageData {
  slug: string;
  category: DubaiPageCategory;
  title: string;
  description: string;
  hero: DubaiPageHero;
  keywords: string[];
  breadcrumbs: DubaiPageBreadcrumb[];
  faqs?: DubaiPageFAQ[];
  stats?: DubaiPageStat[];
  cta?: DubaiPageCTA;
}

// ============================================
// DISTRICT PAGES (17 pages)
// ============================================

const districtPages: DubaiPageData[] = [
  {
    slug: 'districts',
    category: 'district',
    title: 'Dubai Districts Guide 2026 - Explore All Dubai Neighborhoods',
    description: 'Complete guide to Dubai districts and neighborhoods. From Downtown Dubai to Palm Jumeirah, discover the best areas to stay, invest, and explore in Dubai.',
    hero: {
      title: 'Explore Dubai Districts',
      subtitle: 'Your comprehensive guide to every neighborhood in Dubai - from iconic waterfront communities to hidden cultural gems',
      image: '/destinations-hero/dubai/dubai/dubai-hero-dubai-frame-skyline-aerial.webp',
      badges: ['16 Districts', 'Investment Hotspots', 'Local Insights']
    },
    keywords: ['dubai districts', 'dubai neighborhoods', 'dubai areas', 'where to stay dubai', 'dubai communities', 'dubai zones'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' }
    ],
    stats: [
      { value: '16+', label: 'Major Districts', subtext: 'Unique communities' },
      { value: '3.5M', label: 'Population', subtext: 'Growing annually' },
      { value: '4,114', label: 'sq km', subtext: 'Total area' }
    ],
    cta: { label: 'Find Your Perfect District', href: '#districts-explorer' }
  },
  {
    slug: 'downtown',
    category: 'district',
    title: 'Downtown Dubai Guide 2026 - Burj Khalifa, Dubai Mall & More',
    description: 'Explore Downtown Dubai, home to Burj Khalifa, Dubai Mall, and Dubai Fountain. Complete guide to attractions, hotels, restaurants, and real estate in Downtown Dubai.',
    hero: {
      title: 'Downtown Dubai',
      subtitle: 'The heart of modern Dubai featuring the world\'s tallest tower, largest shopping mall, and spectacular fountain shows',
      image: '/destinations-hero/dubai/dubai/dubai-hero-burj-khalifa-palms-sunset.webp',
      badges: ['Burj Khalifa', 'Dubai Mall', 'Luxury Living']
    },
    keywords: ['downtown dubai', 'burj khalifa', 'dubai mall', 'dubai fountain', 'downtown dubai hotels', 'downtown dubai apartments'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' },
      { label: 'Downtown', href: '/destinations/dubai/districts/downtown' }
    ],
    faqs: [
      { question: 'What is Downtown Dubai known for?', answer: 'Downtown Dubai is the city\'s premier urban destination, home to the iconic Burj Khalifa (world\'s tallest building at 828m), Dubai Mall (1,200+ stores), Dubai Fountain, and Dubai Opera. It\'s the entertainment and lifestyle hub of the UAE.' },
      { question: 'How expensive is it to live in Downtown Dubai?', answer: 'Downtown Dubai is a premium location. Studio apartments start from AED 60,000/year, while 1-bedroom units range from AED 80,000-150,000/year. Luxury penthouses can exceed AED 1 million annually.' },
      { question: 'Is Downtown Dubai walkable?', answer: 'Yes, Downtown Dubai is one of the most walkable areas in Dubai. The Boulevard, Dubai Mall, and Burj Khalifa area are pedestrian-friendly with shaded walkways and air-conditioned connections between buildings.' }
    ],
    stats: [
      { value: '828m', label: 'Burj Khalifa Height', subtext: 'World\'s tallest' },
      { value: '1,200+', label: 'Dubai Mall Stores', subtext: 'Largest mall globally' },
      { value: '8%', label: 'Rental Yield', subtext: 'Average ROI' }
    ],
    cta: { label: 'Explore Downtown Properties', href: '/destinations/dubai/off-plan/business-bay' }
  },
  {
    slug: 'marina',
    category: 'district',
    title: 'Dubai Marina Guide 2026 - Waterfront Living & Attractions',
    description: 'Discover Dubai Marina, the world\'s largest man-made marina. Guide to Marina Walk, yacht clubs, restaurants, nightlife, and luxury apartments in Dubai Marina.',
    hero: {
      title: 'Dubai Marina',
      subtitle: 'Stunning waterfront living in the world\'s largest artificial marina with 200+ towers and endless dining options',
      image: '/destinations-hero/dubai/dubai/dubai-hero-marina-abra-boat-night.webp',
      badges: ['Waterfront', 'Nightlife Hub', 'Beach Access']
    },
    keywords: ['dubai marina', 'marina walk', 'dubai marina apartments', 'dubai marina restaurants', 'dubai marina nightlife', 'marina yacht club'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' },
      { label: 'Marina', href: '/destinations/dubai/districts/marina' }
    ],
    faqs: [
      { question: 'What makes Dubai Marina special?', answer: 'Dubai Marina is a 3km waterfront development featuring over 200 residential towers, the Marina Walk promenade with 100+ restaurants, direct beach access via JBR, and stunning yacht harbor views. It\'s one of the world\'s most desirable waterfront communities.' },
      { question: 'Is Dubai Marina good for families?', answer: 'Dubai Marina is ideal for young professionals and couples. While families can live here, areas like JVC or Dubai Hills offer more family-oriented amenities like schools and parks.' },
      { question: 'How do I get around Dubai Marina?', answer: 'Dubai Marina is well-connected via Dubai Metro (Red Line), Dubai Tram, water taxis, and the Marina Walk. Most residents walk to restaurants, shops, and the beach.' }
    ],
    stats: [
      { value: '3km', label: 'Waterfront', subtext: 'Marina promenade' },
      { value: '200+', label: 'Towers', subtext: 'Residential & hotel' },
      { value: '7%', label: 'Rental Yield', subtext: 'Average ROI' }
    ],
    cta: { label: 'View Marina Properties', href: '/destinations/dubai/off-plan/marina' }
  },
  {
    slug: 'jbr',
    category: 'district',
    title: 'JBR Dubai Guide 2026 - Jumeirah Beach Residence & The Walk',
    description: 'Complete guide to JBR (Jumeirah Beach Residence) in Dubai. Explore The Walk, JBR Beach, dining, shopping, and beachfront apartments at JBR.',
    hero: {
      title: 'Jumeirah Beach Residence',
      subtitle: 'Dubai\'s most vibrant beachfront community with The Walk promenade, golden beaches, and stunning Ain Dubai views',
      image: '/destinations-hero/dubai/dubai/dubai-hero-atlantis-palm-jumeirah-beach.webp',
      badges: ['Beachfront', 'The Walk', 'Ain Dubai Views']
    },
    keywords: ['jbr dubai', 'jumeirah beach residence', 'the walk jbr', 'jbr beach', 'jbr apartments', 'jbr restaurants'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' },
      { label: 'JBR', href: '/destinations/dubai/districts/jbr' }
    ],
    faqs: [
      { question: 'Is JBR Beach free?', answer: 'Yes, JBR Beach is a public beach and completely free to access. Sunbeds and umbrellas can be rented from beach operators. The beach has lifeguards, showers, and changing facilities.' },
      { question: 'What is The Walk at JBR?', answer: 'The Walk is a 1.7km outdoor promenade along JBR featuring over 300 shops, restaurants, and entertainment venues. It\'s one of Dubai\'s most popular outdoor destinations with street performers and stunning sea views.' },
      { question: 'How far is JBR from Dubai Mall?', answer: 'JBR is approximately 25km from Dubai Mall, about 25-35 minutes by car depending on traffic. The Dubai Metro doesn\'t directly reach JBR, but the Dubai Tram connects to JLT Metro Station.' }
    ],
    stats: [
      { value: '1.7km', label: 'The Walk', subtext: 'Pedestrian promenade' },
      { value: '40+', label: 'Towers', subtext: 'Beachfront living' },
      { value: '6.5%', label: 'Rental Yield', subtext: 'Average ROI' }
    ],
    cta: { label: 'Explore JBR Living', href: '/destinations/dubai/districts/jbr#properties' }
  },
  {
    slug: 'palm-jumeirah',
    category: 'district',
    title: 'Palm Jumeirah Guide 2026 - Dubai\'s Iconic Island',
    description: 'Explore Palm Jumeirah, Dubai\'s world-famous palm-shaped island. Guide to Atlantis, luxury resorts, beach clubs, villas, and apartments on Palm Jumeirah.',
    hero: {
      title: 'Palm Jumeirah',
      subtitle: 'The world\'s largest artificial island and one of the most exclusive addresses in the world',
      image: '/destinations-hero/dubai/dubai/dubai-hero-atlantis-palm-jumeirah-beach.webp',
      badges: ['Atlantis', 'Ultra-Luxury', 'Iconic Island']
    },
    keywords: ['palm jumeirah', 'atlantis dubai', 'palm jumeirah villas', 'palm jumeirah apartments', 'palm jumeirah hotels', 'palm jumeirah beach'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' },
      { label: 'Palm Jumeirah', href: '/destinations/dubai/districts/palm-jumeirah' }
    ],
    faqs: [
      { question: 'Can you visit Palm Jumeirah without staying there?', answer: 'Yes! You can visit Atlantis (Aquaventure Waterpark, The Lost Chambers), dine at celebrity restaurants, book beach club day passes, or take the Palm Monorail for panoramic views.' },
      { question: 'How much do villas cost on Palm Jumeirah?', answer: 'Palm Jumeirah villas range from AED 15 million to over AED 200 million for ultra-luxury properties. Signature Villas and Garden Homes are the main villa types, with frond-end properties commanding premium prices.' },
      { question: 'Is Palm Jumeirah connected to the mainland?', answer: 'Yes, Palm Jumeirah connects to the mainland via a road bridge at the trunk. The Palm Monorail runs from Gateway Station (connecting to the Dubai Tram) to Atlantis at the crescent.' }
    ],
    stats: [
      { value: '5.72km', label: 'Crescent Length', subtext: 'Island perimeter' },
      { value: '1,500+', label: 'Villas', subtext: 'Exclusive properties' },
      { value: '5%', label: 'Rental Yield', subtext: 'Average ROI' }
    ],
    cta: { label: 'View Palm Properties', href: '/destinations/dubai/off-plan/palm-jumeirah' }
  },
  {
    slug: 'jumeirah',
    category: 'district',
    title: 'Jumeirah Dubai Guide 2026 - Beach Road & Luxury Villas',
    description: 'Discover Jumeirah, Dubai\'s prestigious coastal neighborhood. Guide to Jumeirah Beach Road, Burj Al Arab, La Mer, luxury villas, and upscale dining in Jumeirah.',
    hero: {
      title: 'Jumeirah',
      subtitle: 'Dubai\'s most prestigious beachside neighborhood with iconic Burj Al Arab views and exclusive villa communities',
      image: '/destinations-hero/dubai/dubai/dubai-hero-burj-al-arab-skyline-night.webp',
      badges: ['Burj Al Arab', 'Beach Road', 'Villa Living']
    },
    keywords: ['jumeirah dubai', 'jumeirah beach road', 'burj al arab', 'la mer dubai', 'jumeirah villas', 'jumeirah restaurants'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' },
      { label: 'Jumeirah', href: '/destinations/dubai/districts/jumeirah' }
    ],
    faqs: [
      { question: 'What is the difference between Jumeirah and JBR?', answer: 'Jumeirah is a sprawling beachside area known for luxury villas and the Burj Al Arab. JBR (Jumeirah Beach Residence) is a specific high-rise apartment community with The Walk promenade. They are different areas, about 15km apart.' },
      { question: 'Is Jumeirah a good place to live in Dubai?', answer: 'Jumeirah is one of Dubai\'s most desirable residential areas, known for spacious villas, excellent schools, beach access, and a family-friendly atmosphere. It\'s popular with expat families and long-term residents.' },
      { question: 'What attractions are in Jumeirah?', answer: 'Key attractions include Burj Al Arab, La Mer Beach, Jumeirah Beach Park, Madinat Jumeirah, Wild Wadi Waterpark, and numerous boutique shops and restaurants along Jumeirah Beach Road.' }
    ],
    stats: [
      { value: '15km', label: 'Beach Road', subtext: 'Coastal stretch' },
      { value: '321m', label: 'Burj Al Arab', subtext: 'Iconic sail-shaped hotel' },
      { value: '4.5%', label: 'Rental Yield', subtext: 'Average ROI' }
    ],
    cta: { label: 'Explore Jumeirah Properties', href: '/destinations/dubai/districts/jumeirah#properties' }
  },
  {
    slug: 'business-bay',
    category: 'district',
    title: 'Business Bay Dubai Guide 2026 - CBD Living & Investment',
    description: 'Complete guide to Business Bay, Dubai\'s central business district. Explore Business Bay apartments, offices, Dubai Canal, dining, and investment opportunities.',
    hero: {
      title: 'Business Bay',
      subtitle: 'Dubai\'s dynamic central business district with stunning Dubai Canal views and excellent investment potential',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Dubai Canal', 'CBD Location', 'High ROI']
    },
    keywords: ['business bay dubai', 'business bay apartments', 'dubai canal', 'business bay offices', 'business bay towers', 'business bay investment'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' },
      { label: 'Business Bay', href: '/destinations/dubai/districts/business-bay' }
    ],
    faqs: [
      { question: 'Is Business Bay a good area to live in Dubai?', answer: 'Business Bay offers excellent value with modern apartments, Dubai Canal access, walkability to Downtown Dubai, and strong rental yields. It\'s ideal for young professionals and investors seeking central locations at lower prices than Downtown.' },
      { question: 'How far is Business Bay from Downtown Dubai?', answer: 'Business Bay is adjacent to Downtown Dubai, just 5-10 minutes by car or a pleasant walk across the Dubai Canal footbridge. The Burj Khalifa is visible from most Business Bay towers.' },
      { question: 'What is Business Bay known for?', answer: 'Business Bay is Dubai\'s CBD, known for commercial towers, the Dubai Canal promenade, waterfront dining, modern apartments, and proximity to Downtown Dubai. It\'s a major hub for businesses and professionals.' }
    ],
    stats: [
      { value: '3.2km', label: 'Dubai Canal', subtext: 'Waterfront access' },
      { value: '240+', label: 'Towers', subtext: 'Residential & commercial' },
      { value: '8.5%', label: 'Rental Yield', subtext: 'Top ROI in Dubai' }
    ],
    cta: { label: 'Invest in Business Bay', href: '/destinations/dubai/off-plan/business-bay' }
  },
  {
    slug: 'old-dubai',
    category: 'district',
    title: 'Old Dubai Guide 2026 - Deira, Bur Dubai & Gold Souk',
    description: 'Explore Old Dubai including Deira and Bur Dubai. Visit the Gold Souk, Spice Souk, Dubai Creek, Al Fahidi, and experience authentic Emirati culture.',
    hero: {
      title: 'Old Dubai',
      subtitle: 'Discover Dubai\'s rich heritage in the historic districts of Deira and Bur Dubai with traditional souks and abra rides',
      image: '/images/categories/dubai/dubai-old-town-wind-towers-colorful-traditional-architecture.webp',
      badges: ['Gold Souk', 'Dubai Creek', 'Cultural Heart']
    },
    keywords: ['old dubai', 'deira dubai', 'bur dubai', 'gold souk dubai', 'spice souk', 'dubai creek', 'al fahidi'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' },
      { label: 'Old Dubai', href: '/destinations/dubai/districts/old-dubai' }
    ],
    faqs: [
      { question: 'What can you buy at Dubai Gold Souk?', answer: 'Dubai Gold Souk offers gold jewelry at competitive prices, with gold sold by weight plus making charges. You\'ll also find silver, precious stones, pearls, and watches. Bargaining is expected and can reduce prices by 20-30%.' },
      { question: 'How much is an abra ride in Dubai Creek?', answer: 'An abra (traditional wooden boat) ride across Dubai Creek costs just 1 AED per person. It\'s one of Dubai\'s most iconic and affordable experiences, connecting Deira to Bur Dubai in about 5 minutes.' },
      { question: 'Is Old Dubai worth visiting?', answer: 'Absolutely! Old Dubai offers an authentic contrast to the modern city. Explore Al Fahidi Historical District, visit Dubai Museum, haggle in the souks, take an abra ride, and enjoy traditional Emirati cuisine at heritage restaurants.' }
    ],
    stats: [
      { value: '1 AED', label: 'Abra Ride', subtext: 'Across the Creek' },
      { value: '300+', label: 'Gold Shops', subtext: 'In Gold Souk' },
      { value: '1890s', label: 'Heritage', subtext: 'Al Fahidi origins' }
    ],
    cta: { label: 'Plan Your Old Dubai Tour', href: '/destinations/dubai/districts/old-dubai#attractions' }
  },
  {
    slug: 'creek-harbour',
    category: 'district',
    title: 'Dubai Creek Harbour Guide 2026 - Future Landmark District',
    description: 'Explore Dubai Creek Harbour, home to the upcoming Dubai Creek Tower. Guide to Creek Beach, shopping, dining, and off-plan investment in Creek Harbour.',
    hero: {
      title: 'Dubai Creek Harbour',
      subtitle: 'A visionary waterfront destination that will soon be home to the world\'s tallest structure',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Creek Tower', 'Emaar Project', 'Waterfront']
    },
    keywords: ['dubai creek harbour', 'creek harbour', 'dubai creek tower', 'creek beach dubai', 'emaar creek harbour', 'creek harbour apartments'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' },
      { label: 'Creek Harbour', href: '/destinations/dubai/districts/creek-harbour' }
    ],
    faqs: [
      { question: 'What is Dubai Creek Harbour?', answer: 'Dubai Creek Harbour is a 6 sq km mega-development by Emaar along Dubai Creek. It will feature the Dubai Creek Tower (planned to exceed Burj Khalifa), residences, a yacht marina, retail, and leisure destinations.' },
      { question: 'Is Dubai Creek Harbour a good investment?', answer: 'Creek Harbour offers strong investment potential due to Emaar\'s track record, waterfront location, future Dubai Creek Tower, and competitive pricing compared to Downtown Dubai. Off-plan properties offer attractive payment plans.' },
      { question: 'How far is Creek Harbour from Downtown Dubai?', answer: 'Dubai Creek Harbour is approximately 10km from Downtown Dubai, about 15-20 minutes by car. Once completed, it will have its own metro station connection.' }
    ],
    stats: [
      { value: '6 sq km', label: 'Total Area', subtext: '2x Downtown Dubai' },
      { value: '1km+', label: 'Creek Tower', subtext: 'Future tallest structure' },
      { value: '7%', label: 'Expected Yield', subtext: 'Investment ROI' }
    ],
    cta: { label: 'Invest in Creek Harbour', href: '/destinations/dubai/off-plan/creek-harbour' }
  },
  {
    slug: 'dubai-south',
    category: 'district',
    title: 'Dubai South Guide 2026 - Expo City & Airport District',
    description: 'Discover Dubai South, the city within a city near Al Maktoum Airport. Guide to Expo City, affordable housing, and investment in Dubai South.',
    hero: {
      title: 'Dubai South',
      subtitle: 'A self-contained city designed around Al Maktoum International Airport and the legacy of Expo 2020',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Expo City', 'Airport District', 'Affordable']
    },
    keywords: ['dubai south', 'expo city dubai', 'al maktoum airport', 'dubai south apartments', 'dubai south villas', 'expo dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' },
      { label: 'Dubai South', href: '/destinations/dubai/districts/dubai-south' }
    ],
    faqs: [
      { question: 'What is Dubai South?', answer: 'Dubai South is a 145 sq km master-planned city near Al Maktoum International Airport. It encompasses Expo City Dubai, residential districts, logistics zones, and commercial areas, designed to eventually house 1 million people.' },
      { question: 'Is Dubai South a good place to invest?', answer: 'Dubai South offers affordable entry points, strong government backing, proximity to the future world\'s largest airport, and Expo City legacy developments. It\'s ideal for long-term investors and first-time buyers.' },
      { question: 'How far is Dubai South from Dubai city center?', answer: 'Dubai South is approximately 40km from Downtown Dubai, about 35-45 minutes by car via Sheikh Mohammed Bin Zayed Road. The Route 2020 Metro extension connects Expo City to the main network.' }
    ],
    stats: [
      { value: '145 sq km', label: 'Total Area', subtext: 'City within a city' },
      { value: '1M', label: 'Future Population', subtext: 'Planned capacity' },
      { value: '9%', label: 'Rental Yield', subtext: 'High ROI potential' }
    ],
    cta: { label: 'Explore Dubai South', href: '/destinations/dubai/districts/dubai-south#properties' }
  },
  {
    slug: 'al-barsha',
    category: 'district',
    title: 'Al Barsha Dubai Guide 2026 - Mall of the Emirates District',
    description: 'Explore Al Barsha, a popular residential area home to Mall of the Emirates. Guide to Ski Dubai, restaurants, apartments, and villas in Al Barsha.',
    hero: {
      title: 'Al Barsha',
      subtitle: 'A well-established residential community centered around Mall of the Emirates and Ski Dubai',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Mall of Emirates', 'Ski Dubai', 'Central Location']
    },
    keywords: ['al barsha dubai', 'mall of the emirates', 'ski dubai', 'al barsha apartments', 'al barsha villas', 'al barsha restaurants'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' },
      { label: 'Al Barsha', href: '/destinations/dubai/districts/al-barsha' }
    ],
    faqs: [
      { question: 'Is Al Barsha a good area to live in Dubai?', answer: 'Al Barsha is popular for its central location, Mall of the Emirates access, good schools, affordable villas, and Metro connectivity. It\'s ideal for families seeking value without sacrificing convenience.' },
      { question: 'What is there to do in Al Barsha?', answer: 'Main attractions include Mall of the Emirates, Ski Dubai (indoor ski resort), various restaurants and cafes, fitness centers, and proximity to Media City and Internet City. It\'s well-connected to beaches via Sheikh Zayed Road.' },
      { question: 'How much is rent in Al Barsha?', answer: 'Al Barsha offers competitive rents. Studios start from AED 35,000/year, 1-bedrooms from AED 50,000, and villas from AED 120,000/year. It\'s more affordable than neighboring areas like Marina or JBR.' }
    ],
    stats: [
      { value: '520+', label: 'Stores', subtext: 'Mall of the Emirates' },
      { value: '-4°C', label: 'Ski Dubai', subtext: 'Indoor snow park' },
      { value: '6%', label: 'Rental Yield', subtext: 'Average ROI' }
    ],
    cta: { label: 'View Al Barsha Properties', href: '/destinations/dubai/districts/al-barsha#properties' }
  },
  {
    slug: 'difc',
    category: 'district',
    title: 'DIFC Dubai Guide 2026 - Financial Centre & Gate Avenue',
    description: 'Discover DIFC (Dubai International Financial Centre), the financial hub of the Middle East. Guide to Gate Avenue, dining, art galleries, and apartments in DIFC.',
    hero: {
      title: 'DIFC - Dubai International Financial Centre',
      subtitle: 'The leading financial hub of the Middle East, Africa, and South Asia with world-class dining and art',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Financial Hub', 'Fine Dining', 'Art District']
    },
    keywords: ['difc dubai', 'dubai financial centre', 'gate avenue difc', 'difc restaurants', 'difc apartments', 'difc art gallery'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' },
      { label: 'DIFC', href: '/destinations/dubai/districts/difc' }
    ],
    faqs: [
      { question: 'What is DIFC known for?', answer: 'DIFC is the Middle East\'s leading financial hub, housing global banks, law firms, and financial services. It\'s also renowned for Gate Avenue\'s fine dining, art galleries, and a sophisticated social scene.' },
      { question: 'Can you live in DIFC?', answer: 'Yes, DIFC has residential components including luxury apartments. Living in DIFC offers walkability to offices, restaurants, and cultural venues, plus excellent Metro connectivity.' },
      { question: 'What restaurants are in DIFC?', answer: 'DIFC hosts Dubai\'s best fine dining including Zuma, La Petite Maison, Coya, Roberto\'s, Tresind Studio, and many others. Gate Avenue offers both casual and high-end options.' }
    ],
    stats: [
      { value: '$1T+', label: 'Assets', subtext: 'Under administration' },
      { value: '100+', label: 'Restaurants', subtext: 'Gate Avenue & beyond' },
      { value: '2,500+', label: 'Companies', subtext: 'Registered in DIFC' }
    ],
    cta: { label: 'Explore DIFC', href: '/destinations/dubai/districts/difc#lifestyle' }
  },
  {
    slug: 'dubai-hills',
    category: 'district',
    title: 'Dubai Hills Estate Guide 2026 - Family Community & Golf',
    description: 'Explore Dubai Hills Estate, a premium family community by Emaar. Guide to Dubai Hills Mall, golf course, schools, villas, and apartments in Dubai Hills.',
    hero: {
      title: 'Dubai Hills Estate',
      subtitle: 'An 11 million sq ft premium green community with championship golf and excellent family amenities',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Golf Course', 'Emaar', 'Family Living']
    },
    keywords: ['dubai hills estate', 'dubai hills mall', 'dubai hills golf', 'dubai hills villas', 'dubai hills apartments', 'emaar dubai hills'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' },
      { label: 'Dubai Hills', href: '/destinations/dubai/districts/dubai-hills' }
    ],
    faqs: [
      { question: 'Is Dubai Hills a good area?', answer: 'Dubai Hills Estate is one of Dubai\'s most sought-after family communities, offering green spaces, a championship golf course, excellent schools, Dubai Hills Mall, and a central location between Downtown and Dubai Marina.' },
      { question: 'What schools are in Dubai Hills?', answer: 'Dubai Hills hosts several premium schools including GEMS Wellington Academy, King\'s School Al Barsha (nearby), and planned future educational facilities. The area is designed with families in mind.' },
      { question: 'How much are villas in Dubai Hills?', answer: 'Dubai Hills villas range from AED 3 million for smaller units to AED 30+ million for mansions. Off-plan options and existing inventory offer various entry points. Apartments start from AED 1.2 million.' }
    ],
    stats: [
      { value: '18-hole', label: 'Golf Course', subtext: 'Championship layout' },
      { value: '650+', label: 'Mall Stores', subtext: 'Dubai Hills Mall' },
      { value: '5.5%', label: 'Rental Yield', subtext: 'Average ROI' }
    ],
    cta: { label: 'View Dubai Hills Properties', href: '/destinations/dubai/districts/dubai-hills#properties' }
  },
  {
    slug: 'jvc',
    category: 'district',
    title: 'JVC Dubai Guide 2026 - Jumeirah Village Circle',
    description: 'Discover JVC (Jumeirah Village Circle), one of Dubai\'s most affordable and family-friendly communities. Guide to apartments, villas, amenities, and investment in JVC.',
    hero: {
      title: 'Jumeirah Village Circle',
      subtitle: 'Dubai\'s top choice for affordable family living with excellent rental yields and growing amenities',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Affordable', 'High ROI', 'Family-Friendly']
    },
    keywords: ['jvc dubai', 'jumeirah village circle', 'jvc apartments', 'jvc villas', 'jvc investment', 'jvc rental yield'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' },
      { label: 'JVC', href: '/destinations/dubai/districts/jvc' }
    ],
    faqs: [
      { question: 'Is JVC a good investment in Dubai?', answer: 'JVC consistently offers Dubai\'s highest rental yields, averaging 8-10%. Affordable property prices, growing demand from families, and continuous development make it attractive for investors seeking income-generating properties.' },
      { question: 'What is JVC like to live in?', answer: 'JVC is a well-planned community with parks, schools, supermarkets, and fitness facilities. It\'s family-oriented, quieter than tourist areas, and offers spacious apartments at affordable rents. Traffic can be challenging during peak hours.' },
      { question: 'How far is JVC from Dubai Marina?', answer: 'JVC is approximately 10km from Dubai Marina, about 15-20 minutes by car. The area is connected via Al Khail Road and Sheikh Mohammed Bin Zayed Road.' }
    ],
    stats: [
      { value: '800+', label: 'Buildings', subtext: 'Residential community' },
      { value: '8-10%', label: 'Rental Yield', subtext: 'Dubai\'s highest' },
      { value: 'AED 40K', label: 'Studio Rent', subtext: 'Average annual' }
    ],
    cta: { label: 'Invest in JVC', href: '/destinations/dubai/off-plan/jvc' }
  },
  {
    slug: 'bluewaters',
    category: 'district',
    title: 'Bluewaters Island Dubai Guide 2026 - Ain Dubai & Caesars',
    description: 'Explore Bluewaters Island, home to Ain Dubai (world\'s largest observation wheel). Guide to Caesars Palace, Cove Beach, dining, and luxury apartments.',
    hero: {
      title: 'Bluewaters Island',
      subtitle: 'A boutique island destination featuring Ain Dubai and exclusive beachfront living',
      image: '/destinations-hero/dubai/dubai/dubai-hero-dubai-frame-skyline-aerial.webp',
      badges: ['Ain Dubai', 'Caesars Palace', 'Island Living']
    },
    keywords: ['bluewaters island', 'ain dubai', 'caesars palace dubai', 'cove beach', 'bluewaters apartments', 'bluewaters restaurants'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' },
      { label: 'Bluewaters', href: '/destinations/dubai/districts/bluewaters' }
    ],
    faqs: [
      { question: 'What is Ain Dubai?', answer: 'Ain Dubai (Dubai Eye) is the world\'s largest and tallest observation wheel at 250 meters. It offers stunning 360-degree views of Dubai\'s skyline, Palm Jumeirah, and the Arabian Gulf during 38-minute rotations.' },
      { question: 'How do you get to Bluewaters Island?', answer: 'Bluewaters Island is connected to JBR via a pedestrian bridge and the Bluewaters Bridge for vehicles. It\'s walkable from The Beach at JBR or accessible by car, taxi, or ride-sharing apps.' },
      { question: 'Is Bluewaters Island expensive?', answer: 'Bluewaters is a premium destination with luxury apartments starting from AED 2 million. Caesars Palace hotel rooms average AED 1,500+ per night. Dining and entertainment are upscale but there are casual options too.' }
    ],
    stats: [
      { value: '250m', label: 'Ain Dubai Height', subtext: 'World\'s tallest wheel' },
      { value: '10', label: 'Residential Buildings', subtext: 'Exclusive apartments' },
      { value: '5%', label: 'Rental Yield', subtext: 'Average ROI' }
    ],
    cta: { label: 'Explore Bluewaters Living', href: '/destinations/dubai/districts/bluewaters#properties' }
  },
  {
    slug: 'international-city',
    category: 'district',
    title: 'International City Dubai Guide 2026 - Affordable Living',
    description: 'Discover International City, one of Dubai\'s most affordable communities. Guide to themed clusters, Dragon Mart, apartments, and budget-friendly living.',
    hero: {
      title: 'International City',
      subtitle: 'Dubai\'s most affordable residential community with themed architecture and Dragon Mart shopping',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Budget-Friendly', 'Dragon Mart', 'Multicultural']
    },
    keywords: ['international city dubai', 'dragon mart dubai', 'international city apartments', 'cheap rent dubai', 'affordable dubai', 'budget dubai living'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' },
      { label: 'International City', href: '/destinations/dubai/districts/international-city' }
    ],
    faqs: [
      { question: 'Is International City safe?', answer: 'International City is generally safe like most of Dubai. It\'s a densely populated, multicultural community popular with budget-conscious residents. Standard precautions apply, and there\'s regular police patrol.' },
      { question: 'What is Dragon Mart?', answer: 'Dragon Mart is the largest Chinese trading hub outside of China, located in International City. It features over 4,000 stores selling wholesale and retail goods from furniture to electronics at competitive prices.' },
      { question: 'How cheap is rent in International City?', answer: 'International City offers Dubai\'s cheapest rents. Studios from AED 18,000/year, 1-bedrooms from AED 28,000/year. It\'s ideal for those prioritizing savings over luxury amenities.' }
    ],
    stats: [
      { value: 'AED 18K', label: 'Studio Rent', subtext: 'Cheapest in Dubai' },
      { value: '4,000+', label: 'Dragon Mart Stores', subtext: 'Wholesale hub' },
      { value: '10+', label: 'Themed Clusters', subtext: 'Global architecture' }
    ],
    cta: { label: 'View Affordable Options', href: '/destinations/dubai/districts/international-city#rentals' }
  },
  {
    slug: 'al-karama',
    category: 'district',
    title: 'Al Karama Dubai Guide 2026 - Shopping & Local Culture',
    description: 'Explore Al Karama, Dubai\'s vibrant multicultural neighborhood. Guide to Karama Market, restaurants, Metro access, affordable apartments, and local experiences.',
    hero: {
      title: 'Al Karama',
      subtitle: 'A vibrant, multicultural neighborhood known for affordable shopping, diverse cuisine, and authentic local vibes',
      image: '/images/categories/dubai/dubai-old-town-wind-towers-colorful-traditional-architecture.webp',
      badges: ['Shopping', 'Metro Access', 'Affordable']
    },
    keywords: ['al karama dubai', 'karama market', 'karama shopping', 'karama restaurants', 'karama apartments', 'cheap shopping dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Districts', href: '/destinations/dubai/districts' },
      { label: 'Al Karama', href: '/destinations/dubai/districts/al-karama' }
    ],
    faqs: [
      { question: 'What is Al Karama famous for?', answer: 'Al Karama is famous for its market selling affordable goods, replica items, textiles, and souvenirs. It\'s also known for diverse international restaurants, particularly Indian, Filipino, and Pakistani cuisine.' },
      { question: 'Is Al Karama a good area?', answer: 'Al Karama is ideal for budget-conscious residents who want central location, Metro access, affordable rent, and multicultural dining. It\'s not luxury but offers excellent value and authentic local experiences.' },
      { question: 'How to get to Karama from Dubai Mall?', answer: 'Take the Dubai Metro Red Line from Burj Khalifa/Dubai Mall station to ADCB station (Al Karama). It\'s just 3 stops, about 8 minutes, and costs 4-6 AED depending on your Nol card type.' }
    ],
    stats: [
      { value: 'AED 35K', label: 'Avg Studio Rent', subtext: 'Annual rent' },
      { value: '2', label: 'Metro Stations', subtext: 'Red Line access' },
      { value: '500+', label: 'Shops', subtext: 'Karama Market' }
    ],
    cta: { label: 'Explore Karama', href: '/destinations/dubai/districts/al-karama#shopping' }
  }
];

// ============================================
// OFF-PLAN PAGES (22 pages)
// ============================================

const offPlanPages: DubaiPageData[] = [
  // Guides (4)
  {
    slug: 'investment-guide',
    category: 'off-plan',
    title: 'Dubai Off-Plan Investment Guide 2026 - Complete Buyer\'s Guide',
    description: 'Complete guide to investing in Dubai off-plan properties. Learn about payment plans, developer reputation, ROI expectations, and legal protections for investors.',
    hero: {
      title: 'Dubai Off-Plan Investment Guide',
      subtitle: 'Everything you need to know about buying off-plan property in Dubai, from first-time investor to seasoned portfolio builder',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['2026 Guide', 'Expert Insights', 'Step-by-Step']
    },
    keywords: ['dubai off-plan investment', 'buy off-plan dubai', 'dubai property investment', 'off-plan roi', 'dubai real estate guide'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Investment Guide', href: '/destinations/dubai/off-plan/investment-guide' }
    ],
    faqs: [
      { question: 'Is off-plan investment safe in Dubai?', answer: 'Dubai has implemented strict regulations including escrow accounts, RERA registration, and developer licensing to protect off-plan buyers. The market is well-regulated compared to many other countries.' },
      { question: 'What is the typical ROI on Dubai off-plan?', answer: 'Dubai off-plan properties typically offer 5-10% capital appreciation upon completion plus 6-10% rental yields. Location, developer, and timing significantly impact returns.' },
      { question: 'Can foreigners buy off-plan in Dubai?', answer: 'Yes, foreigners can buy freehold property in designated areas without residency requirements. There are no restrictions on nationality or need for local partners.' }
    ],
    stats: [
      { value: '7-10%', label: 'Avg Rental Yield', subtext: 'Annual return' },
      { value: '60-80%', label: 'Payment Plans', subtext: 'During construction' },
      { value: '0%', label: 'Property Tax', subtext: 'No annual tax' }
    ],
    cta: { label: 'Start Your Investment Journey', href: '/destinations/dubai/off-plan' }
  },
  {
    slug: 'how-to-buy',
    category: 'off-plan',
    title: 'How to Buy Off-Plan Property in Dubai 2026 - Step-by-Step',
    description: 'Step-by-step guide on how to buy off-plan property in Dubai. From choosing a developer to signing the SPA, understand every step of the buying process.',
    hero: {
      title: 'How to Buy Off-Plan in Dubai',
      subtitle: 'A comprehensive step-by-step guide to purchasing off-plan property in Dubai with expert tips at every stage',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Step-by-Step', 'Beginner-Friendly', 'Expert Tips']
    },
    keywords: ['how to buy off-plan dubai', 'off-plan buying process', 'dubai property buying steps', 'spa agreement dubai', 'off-plan for beginners'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'How to Buy', href: '/destinations/dubai/off-plan/how-to-buy' }
    ],
    faqs: [
      { question: 'What documents do I need to buy off-plan?', answer: 'You\'ll need your passport copy, Emirates ID (if resident), proof of address, and the booking deposit. Some developers may require source of funds documentation for larger purchases.' },
      { question: 'How long does the buying process take?', answer: 'The initial booking takes 1-2 days. SPA (Sales Purchase Agreement) signing typically occurs within 30-60 days of booking, including DLD registration.' },
      { question: 'Do I need to be in Dubai to buy?', answer: 'No, you can purchase remotely. Developers accept digital signatures, and bank transfers can be made internationally. Many buyers complete purchases without visiting Dubai.' }
    ],
    stats: [
      { value: '10-20%', label: 'Booking Deposit', subtext: 'Initial payment' },
      { value: '30 Days', label: 'SPA Signing', subtext: 'After booking' },
      { value: '4%', label: 'DLD Fee', subtext: 'Registration cost' }
    ],
    cta: { label: 'View Available Projects', href: '/destinations/dubai/off-plan' }
  },
  {
    slug: 'payment-plans',
    category: 'off-plan',
    title: 'Dubai Off-Plan Payment Plans 2026 - 60/40, 80/20 & More',
    description: 'Understand Dubai off-plan payment plans including 60/40, 80/20, post-handover, and interest-free options. Compare plans and choose the best for your investment.',
    hero: {
      title: 'Off-Plan Payment Plans Explained',
      subtitle: 'Comprehensive guide to payment structures for Dubai off-plan properties, from 60/40 to post-handover options',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['60/40 Plans', '80/20 Plans', 'Post-Handover']
    },
    keywords: ['dubai payment plans', 'off-plan payment structure', '60/40 payment plan', '80/20 payment plan', 'post-handover payment dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Payment Plans', href: '/destinations/dubai/off-plan/payment-plans' }
    ],
    faqs: [
      { question: 'What is a 60/40 payment plan?', answer: 'A 60/40 plan means you pay 60% of the property price during construction (spread across milestones) and 40% upon handover. This is the most common structure in Dubai.' },
      { question: 'What is post-handover payment?', answer: 'Post-handover plans allow you to pay a portion (typically 20-50%) after receiving the property keys. This can extend 2-5 years after handover with interest-free installments.' },
      { question: 'Are off-plan payment plans interest-free?', answer: 'Yes, most developer payment plans during construction and post-handover are interest-free. You\'re essentially getting 0% financing directly from the developer.' }
    ],
    stats: [
      { value: '0%', label: 'Interest', subtext: 'Most plans interest-free' },
      { value: '5+ Years', label: 'Max Duration', subtext: 'With post-handover' },
      { value: '1%', label: 'Monthly', subtext: 'Some extended plans' }
    ],
    cta: { label: 'Compare Payment Plans', href: '/destinations/dubai/compare/payment-plans' }
  },
  {
    slug: 'best-2026',
    category: 'off-plan',
    title: 'Best Off-Plan Projects Dubai 2026 - Top Developments',
    description: 'Discover the best off-plan projects launching in Dubai 2026. Expert-curated list of top developments from Emaar, DAMAC, Nakheel, and other leading developers.',
    hero: {
      title: 'Best Off-Plan Projects 2026',
      subtitle: 'Our expert-curated selection of the most promising off-plan developments launching in Dubai this year',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['2026 Launches', 'Expert Picks', 'High ROI']
    },
    keywords: ['best off-plan dubai 2026', 'dubai new launches 2026', 'top dubai projects', 'off-plan recommendations', 'dubai property 2026'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Best 2026', href: '/destinations/dubai/off-plan/best-2026' }
    ],
    faqs: [
      { question: 'Which areas have the best launches in 2026?', answer: 'Business Bay, Dubai Marina, Creek Harbour, and Palm Jumeirah continue to see strong launches. Emerging areas like Dubai South and MBR City offer value opportunities.' },
      { question: 'Should I wait for new launches or buy existing inventory?', answer: 'New launches often offer the best pricing and payment terms. However, existing inventory may be closer to handover, reducing wait time. Both strategies have merit depending on your goals.' },
      { question: 'How do I get early access to new launches?', answer: 'Register with developers, work with reputable brokers who have direct relationships, and follow industry news. Early bird pricing typically offers 5-15% discounts.' }
    ],
    stats: [
      { value: '50+', label: 'New Launches', subtext: 'Expected in 2026' },
      { value: '15%', label: 'Early Bird Discount', subtext: 'Typical savings' },
      { value: 'Q1-Q2', label: 'Best Time', subtext: 'For new launches' }
    ],
    cta: { label: 'View 2026 Projects', href: '/destinations/dubai/off-plan/best-2026#projects' }
  },

  // Areas (7)
  {
    slug: 'off-plan-business-bay',
    category: 'off-plan',
    title: 'Business Bay Off-Plan Properties 2026 - Dubai Investment',
    description: 'Explore off-plan apartments and penthouses in Business Bay, Dubai. Top projects, payment plans, ROI analysis, and investment guide for Business Bay.',
    hero: {
      title: 'Off-Plan in Business Bay',
      subtitle: 'High-yield investment opportunities in Dubai\'s thriving CBD with canal views and Downtown proximity',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['8%+ ROI', 'Canal Views', 'CBD Location']
    },
    keywords: ['business bay off-plan', 'business bay apartments', 'business bay investment', 'off-plan cbd dubai', 'business bay new projects'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Business Bay', href: '/destinations/dubai/off-plan/business-bay' }
    ],
    stats: [
      { value: '8.5%', label: 'Rental Yield', subtext: 'Average ROI' },
      { value: 'AED 1.5K', label: 'Per Sqft', subtext: 'Average price' },
      { value: '2025-2027', label: 'Handover', subtext: 'Current projects' }
    ],
    cta: { label: 'View Business Bay Projects', href: '/destinations/dubai/off-plan/business-bay#projects' }
  },
  {
    slug: 'off-plan-marina',
    category: 'off-plan',
    title: 'Dubai Marina Off-Plan Properties 2026 - Waterfront Investment',
    description: 'Invest in off-plan apartments in Dubai Marina. Waterfront towers, yacht marina views, and high rental demand. Complete investment guide for Marina off-plan.',
    hero: {
      title: 'Off-Plan in Dubai Marina',
      subtitle: 'Premium waterfront apartments in the world\'s largest artificial marina with exceptional lifestyle amenities',
      image: '/destinations-hero/dubai/dubai/dubai-hero-marina-abra-boat-night.webp',
      badges: ['Waterfront', 'High Demand', 'Premium Location']
    },
    keywords: ['dubai marina off-plan', 'marina apartments', 'marina investment', 'waterfront off-plan dubai', 'marina new towers'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Marina', href: '/destinations/dubai/off-plan/marina' }
    ],
    stats: [
      { value: '7%', label: 'Rental Yield', subtext: 'Average ROI' },
      { value: 'AED 2K', label: 'Per Sqft', subtext: 'Average price' },
      { value: '95%', label: 'Occupancy', subtext: 'Rental demand' }
    ],
    cta: { label: 'View Marina Projects', href: '/destinations/dubai/off-plan/marina#projects' }
  },
  {
    slug: 'off-plan-jvc',
    category: 'off-plan',
    title: 'JVC Off-Plan Properties 2026 - High Yield Investment',
    description: 'Invest in JVC (Jumeirah Village Circle) off-plan properties. Best ROI in Dubai with affordable entry and strong rental yields. Complete JVC investment guide.',
    hero: {
      title: 'Off-Plan in JVC',
      subtitle: 'Dubai\'s highest rental yield community with affordable prices and excellent capital appreciation potential',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['9%+ ROI', 'Affordable', 'Family-Friendly']
    },
    keywords: ['jvc off-plan', 'jvc investment', 'jvc apartments', 'high yield dubai', 'affordable off-plan dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'JVC', href: '/destinations/dubai/off-plan/jvc' }
    ],
    stats: [
      { value: '9%', label: 'Rental Yield', subtext: 'Highest in Dubai' },
      { value: 'AED 800', label: 'Per Sqft', subtext: 'Average price' },
      { value: 'AED 500K', label: 'Entry Point', subtext: 'Studios from' }
    ],
    cta: { label: 'View JVC Projects', href: '/destinations/dubai/off-plan/jvc#projects' }
  },
  {
    slug: 'off-plan-palm-jumeirah',
    category: 'off-plan',
    title: 'Palm Jumeirah Off-Plan Properties 2026 - Ultra-Luxury',
    description: 'Exclusive off-plan villas and apartments on Palm Jumeirah. Ultra-luxury island living with beach access and Dubai skyline views. Premium investment guide.',
    hero: {
      title: 'Off-Plan on Palm Jumeirah',
      subtitle: 'Ultra-luxury living on the world\'s most iconic artificial island with exclusive beachfront addresses',
      image: '/destinations-hero/dubai/dubai/dubai-hero-atlantis-palm-jumeirah-beach.webp',
      badges: ['Ultra-Luxury', 'Beachfront', 'Limited Supply']
    },
    keywords: ['palm jumeirah off-plan', 'palm villas', 'palm apartments', 'luxury off-plan dubai', 'palm jumeirah investment'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Palm Jumeirah', href: '/destinations/dubai/off-plan/palm-jumeirah' }
    ],
    stats: [
      { value: '5%', label: 'Rental Yield', subtext: 'Luxury segment' },
      { value: 'AED 3K+', label: 'Per Sqft', subtext: 'Average price' },
      { value: 'AED 15M+', label: 'Villa Entry', subtext: 'Starting from' }
    ],
    cta: { label: 'View Palm Projects', href: '/destinations/dubai/off-plan/palm-jumeirah#projects' }
  },
  {
    slug: 'off-plan-creek-harbour',
    category: 'off-plan',
    title: 'Dubai Creek Harbour Off-Plan 2026 - Future Landmark',
    description: 'Invest in Dubai Creek Harbour by Emaar. Waterfront living near future Dubai Creek Tower. Complete off-plan investment guide for Creek Harbour.',
    hero: {
      title: 'Off-Plan at Creek Harbour',
      subtitle: 'Be part of Dubai\'s next iconic destination, home to the future world\'s tallest structure',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Emaar', 'Creek Tower', 'Waterfront']
    },
    keywords: ['creek harbour off-plan', 'emaar creek harbour', 'creek tower', 'dubai creek investment', 'creek harbour apartments'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Creek Harbour', href: '/destinations/dubai/off-plan/creek-harbour' }
    ],
    stats: [
      { value: '7%', label: 'Expected Yield', subtext: 'Upon completion' },
      { value: 'AED 1.5K', label: 'Per Sqft', subtext: 'Current pricing' },
      { value: '6 sq km', label: 'Development', subtext: 'Total area' }
    ],
    cta: { label: 'View Creek Harbour Projects', href: '/destinations/dubai/off-plan/creek-harbour#projects' }
  },
  {
    slug: 'off-plan-al-furjan',
    category: 'off-plan',
    title: 'Al Furjan Off-Plan Properties 2026 - Family Community',
    description: 'Explore off-plan townhouses and apartments in Al Furjan. Family-friendly community with excellent schools, parks, and Metro connectivity.',
    hero: {
      title: 'Off-Plan in Al Furjan',
      subtitle: 'A well-planned family community with excellent infrastructure and strong appreciation potential',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Metro Connected', 'Family Area', 'Townhouses']
    },
    keywords: ['al furjan off-plan', 'al furjan townhouses', 'al furjan investment', 'family off-plan dubai', 'al furjan apartments'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Al Furjan', href: '/destinations/dubai/off-plan/al-furjan' }
    ],
    stats: [
      { value: '6.5%', label: 'Rental Yield', subtext: 'Average ROI' },
      { value: 'AED 900', label: 'Per Sqft', subtext: 'Average price' },
      { value: 'AED 1.5M', label: 'Townhouse', subtext: 'Starting from' }
    ],
    cta: { label: 'View Al Furjan Projects', href: '/destinations/dubai/off-plan/al-furjan#projects' }
  },
  {
    slug: 'off-plan-villas',
    category: 'off-plan',
    title: 'Dubai Off-Plan Villas 2026 - Luxury Villa Communities',
    description: 'Explore off-plan villas across Dubai. From Arabian Ranches to Palm Jumeirah, find the perfect luxury villa with gardens, pools, and community amenities.',
    hero: {
      title: 'Off-Plan Villas in Dubai',
      subtitle: 'Discover luxury villa communities across Dubai offering spacious living with private gardens and premium amenities',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Luxury Villas', 'Gated Communities', 'Premium Living']
    },
    keywords: ['dubai villas off-plan', 'luxury villas dubai', 'off-plan townhouses', 'villa communities dubai', 'dubai villa investment'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Villas', href: '/destinations/dubai/off-plan/villas' }
    ],
    stats: [
      { value: '5%', label: 'Rental Yield', subtext: 'Villa segment' },
      { value: 'AED 3M+', label: 'Entry Point', subtext: 'Standard villas' },
      { value: '15+', label: 'Communities', subtext: 'With new launches' }
    ],
    cta: { label: 'View Villa Projects', href: '/destinations/dubai/off-plan/villas#projects' }
  },

  // Developers (5)
  {
    slug: 'developer-emaar',
    category: 'off-plan',
    title: 'Emaar Properties Dubai 2026 - Projects & Off-Plan',
    description: 'Explore Emaar Properties projects in Dubai. Developer of Burj Khalifa, Dubai Mall, and premier communities. Complete guide to Emaar off-plan opportunities.',
    hero: {
      title: 'Emaar Properties',
      subtitle: 'Dubai\'s most trusted developer behind iconic landmarks and premium residential communities worldwide',
      image: '/destinations-hero/dubai/dubai/dubai-hero-burj-khalifa-palms-sunset.webp',
      badges: ['Burj Khalifa', '#1 Developer', 'Premium Quality']
    },
    keywords: ['emaar properties dubai', 'emaar off-plan', 'emaar projects', 'emaar downtown', 'emaar dubai hills'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Emaar', href: '/destinations/dubai/off-plan/developers/emaar' }
    ],
    faqs: [
      { question: 'Is Emaar a reliable developer?', answer: 'Emaar is Dubai\'s largest and most established developer, known for Burj Khalifa, Dubai Mall, and numerous successful communities. They have a strong track record of on-time delivery and quality construction.' },
      { question: 'What communities does Emaar develop?', answer: 'Emaar develops Downtown Dubai, Dubai Hills Estate, Dubai Creek Harbour, Arabian Ranches, Emaar Beachfront, Dubai Marina (parts), and many more premium communities.' },
      { question: 'Are Emaar properties good investments?', answer: 'Emaar properties command premium pricing but offer strong capital appreciation, reliable build quality, and excellent rental demand. They\'re considered blue-chip investments in Dubai real estate.' }
    ],
    stats: [
      { value: '90+', label: 'Countries', subtext: 'Global presence' },
      { value: '60,000+', label: 'Units Delivered', subtext: 'In Dubai' },
      { value: '#1', label: 'Developer', subtext: 'Market leader' }
    ],
    cta: { label: 'View Emaar Projects', href: '/destinations/dubai/off-plan/developers/emaar#projects' }
  },
  {
    slug: 'developer-damac',
    category: 'off-plan',
    title: 'DAMAC Properties Dubai 2026 - Luxury Projects & Off-Plan',
    description: 'Discover DAMAC Properties luxury developments in Dubai. Branded residences, DAMAC Hills, and premium apartments. Complete DAMAC investment guide.',
    hero: {
      title: 'DAMAC Properties',
      subtitle: 'Luxury real estate pioneer known for branded residences with Versace, Cavalli, Fendi, and more',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Branded Residences', 'Luxury Focus', 'Premium Design']
    },
    keywords: ['damac properties dubai', 'damac off-plan', 'damac hills', 'damac branded residences', 'damac projects'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'DAMAC', href: '/destinations/dubai/off-plan/developers/damac' }
    ],
    stats: [
      { value: '40,000+', label: 'Units Delivered', subtext: 'Since 2002' },
      { value: '10+', label: 'Fashion Brands', subtext: 'Partnerships' },
      { value: '2', label: 'Golf Communities', subtext: 'DAMAC Hills 1 & 2' }
    ],
    cta: { label: 'View DAMAC Projects', href: '/destinations/dubai/off-plan/developers/damac#projects' }
  },
  {
    slug: 'developer-nakheel',
    category: 'off-plan',
    title: 'Nakheel Properties Dubai 2026 - Palm Jumeirah Developer',
    description: 'Explore Nakheel Properties developments including Palm Jumeirah, The World Islands, and Jumeirah Islands. Complete guide to Nakheel off-plan projects.',
    hero: {
      title: 'Nakheel Properties',
      subtitle: 'The visionary developer behind Palm Jumeirah and Dubai\'s most iconic waterfront destinations',
      image: '/destinations-hero/dubai/dubai/dubai-hero-atlantis-palm-jumeirah-beach.webp',
      badges: ['Palm Jumeirah', 'Waterfront Expert', 'Iconic Projects']
    },
    keywords: ['nakheel properties dubai', 'nakheel off-plan', 'palm jumeirah developer', 'nakheel projects', 'nakheel communities'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Nakheel', href: '/destinations/dubai/off-plan/developers/nakheel' }
    ],
    stats: [
      { value: '15,000+', label: 'Hectares', subtext: 'Land developed' },
      { value: '300+', label: 'Projects', subtext: 'Completed & planned' },
      { value: '3', label: 'Palm Islands', subtext: 'Iconic landmarks' }
    ],
    cta: { label: 'View Nakheel Projects', href: '/destinations/dubai/off-plan/developers/nakheel#projects' }
  },
  {
    slug: 'developer-meraas',
    category: 'off-plan',
    title: 'Meraas Dubai 2026 - City Walk, Bluewaters & More',
    description: 'Discover Meraas developments in Dubai including City Walk, Bluewaters Island, and La Mer. Premium lifestyle destinations and residential projects.',
    hero: {
      title: 'Meraas',
      subtitle: 'Dubai\'s lifestyle destination creator behind City Walk, Bluewaters, La Mer, and other premium experiences',
      image: '/destinations-hero/dubai/dubai/dubai-hero-dubai-frame-skyline-aerial.webp',
      badges: ['City Walk', 'Bluewaters', 'Lifestyle Focus']
    },
    keywords: ['meraas dubai', 'meraas properties', 'city walk dubai', 'bluewaters developer', 'meraas projects'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Meraas', href: '/destinations/dubai/off-plan/developers/meraas' }
    ],
    stats: [
      { value: '25+', label: 'Destinations', subtext: 'Created in Dubai' },
      { value: 'Ain Dubai', label: 'Iconic', subtext: 'World\'s tallest wheel' },
      { value: 'Premium', label: 'Focus', subtext: 'Lifestyle-led development' }
    ],
    cta: { label: 'View Meraas Projects', href: '/destinations/dubai/off-plan/developers/meraas#projects' }
  },
  {
    slug: 'developer-sobha',
    category: 'off-plan',
    title: 'Sobha Realty Dubai 2026 - Sobha Hartland & Quality',
    description: 'Explore Sobha Realty developments known for exceptional quality. Sobha Hartland, Sobha One, and luxury villas. Complete guide to Sobha off-plan.',
    hero: {
      title: 'Sobha Realty',
      subtitle: 'Known for backward-integrated construction and industry-leading quality standards in Dubai real estate',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Sobha Hartland', 'Premium Quality', 'Self-Built']
    },
    keywords: ['sobha realty dubai', 'sobha hartland', 'sobha off-plan', 'sobha quality', 'sobha projects'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Sobha', href: '/destinations/dubai/off-plan/developers/sobha' }
    ],
    stats: [
      { value: '100%', label: 'In-House', subtext: 'Self-manufactured' },
      { value: '8M sq ft', label: 'Sobha Hartland', subtext: 'Flagship community' },
      { value: 'Premium', label: 'Quality', subtext: 'Industry benchmark' }
    ],
    cta: { label: 'View Sobha Projects', href: '/destinations/dubai/off-plan/developers/sobha#projects' }
  },

  // Special (6)
  {
    slug: 'crypto',
    category: 'off-plan',
    title: 'Buy Dubai Property with Crypto 2026 - Bitcoin & Ethereum',
    description: 'Complete guide to buying Dubai property with cryptocurrency. Accept Bitcoin, Ethereum, and stablecoins. Developers accepting crypto and legal considerations.',
    hero: {
      title: 'Buy Dubai Property with Crypto',
      subtitle: 'Dubai\'s crypto-friendly real estate market makes it possible to purchase property with Bitcoin, Ethereum, and more',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Bitcoin Accepted', 'Ethereum', 'USDT']
    },
    keywords: ['buy property crypto dubai', 'bitcoin real estate dubai', 'crypto property purchase', 'ethereum dubai property', 'cryptocurrency dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Crypto', href: '/destinations/dubai/off-plan/crypto' }
    ],
    faqs: [
      { question: 'Can you buy property in Dubai with Bitcoin?', answer: 'Yes, several Dubai developers and real estate agencies accept Bitcoin, Ethereum, USDT, and other cryptocurrencies. The transaction is converted at the point of sale at prevailing market rates.' },
      { question: 'Is crypto property purchase legal in Dubai?', answer: 'Yes, cryptocurrency transactions are legal in Dubai. The UAE has established a regulatory framework for crypto assets, and property purchases with crypto are recognized and recorded normally.' },
      { question: 'Which developers accept cryptocurrency?', answer: 'Major developers like DAMAC and select Emaar projects accept crypto. Many boutique developers and secondary market agencies also facilitate crypto transactions.' }
    ],
    stats: [
      { value: '10+', label: 'Developers', subtext: 'Accept crypto' },
      { value: 'BTC, ETH', label: 'Accepted', subtext: 'Major cryptocurrencies' },
      { value: '0%', label: 'Additional Fee', subtext: 'Most transactions' }
    ],
    cta: { label: 'View Crypto-Friendly Projects', href: '/destinations/dubai/off-plan/crypto#projects' }
  },
  {
    slug: 'usdt',
    category: 'off-plan',
    title: 'Buy Dubai Property with USDT 2026 - Tether Payments',
    description: 'How to buy Dubai property using USDT (Tether). Benefits of stablecoin transactions, accepted developers, and step-by-step process for USDT property purchase.',
    hero: {
      title: 'Buy Property with USDT',
      subtitle: 'Stablecoin convenience meets Dubai real estate - purchase property with Tether\'s price stability',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['USDT Accepted', 'Stablecoin', 'Fast Transfer']
    },
    keywords: ['usdt property dubai', 'tether real estate', 'stablecoin property', 'usdt payment dubai', 'crypto stablecoin dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'USDT', href: '/destinations/dubai/off-plan/usdt' }
    ],
    stats: [
      { value: '1:1', label: 'USD Pegged', subtext: 'Price stability' },
      { value: '<1 Hour', label: 'Transfer Time', subtext: 'Fast settlement' },
      { value: '0.1%', label: 'Network Fee', subtext: 'Low transaction cost' }
    ],
    cta: { label: 'Pay with USDT', href: '/destinations/dubai/off-plan/usdt#start' }
  },
  {
    slug: 'golden-visa',
    category: 'off-plan',
    title: 'Dubai Golden Visa Through Property 2026 - 10-Year Residency',
    description: 'Complete guide to obtaining UAE Golden Visa through Dubai property investment. Requirements, eligible properties, and step-by-step application process.',
    hero: {
      title: 'Golden Visa Through Property',
      subtitle: 'Secure a 10-year UAE residency visa by investing AED 2 million in Dubai real estate',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['10-Year Visa', 'AED 2M Minimum', 'Family Included']
    },
    keywords: ['dubai golden visa property', 'uae golden visa', 'golden visa investment', 'residency through property', '10 year visa dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Golden Visa', href: '/destinations/dubai/off-plan/golden-visa' }
    ],
    faqs: [
      { question: 'What is the minimum investment for Golden Visa?', answer: 'The minimum property investment for Golden Visa is AED 2 million. This can be a single property or multiple properties totaling AED 2M. The property must be completed (not off-plan).' },
      { question: 'Can off-plan properties qualify for Golden Visa?', answer: 'The property must be completed and registered in your name for Golden Visa eligibility. However, you can buy off-plan and apply once the property is handed over and registered.' },
      { question: 'Who is included in the Golden Visa?', answer: 'Your spouse and children can be included in your Golden Visa. The visa is renewable as long as you maintain the property investment.' }
    ],
    stats: [
      { value: '10 Years', label: 'Visa Duration', subtext: 'Renewable' },
      { value: 'AED 2M', label: 'Minimum', subtext: 'Property value' },
      { value: '100%', label: 'Family', subtext: 'Sponsored included' }
    ],
    cta: { label: 'Explore Golden Visa Properties', href: '/destinations/dubai/off-plan/golden-visa#properties' }
  },
  {
    slug: 'post-handover',
    category: 'off-plan',
    title: 'Dubai Post-Handover Payment Plans 2026 - Extended Finance',
    description: 'Explore Dubai off-plan projects with post-handover payment plans. Pay up to 50% after receiving keys with interest-free installments over 2-5 years.',
    hero: {
      title: 'Post-Handover Payment Plans',
      subtitle: 'Move in first, pay later - projects offering extended payment plans after property handover',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Pay After Keys', 'Interest-Free', '2-5 Years']
    },
    keywords: ['post-handover dubai', 'payment after handover', 'extended payment plan', 'developer finance dubai', 'interest-free payment'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Post-Handover', href: '/destinations/dubai/off-plan/post-handover' }
    ],
    stats: [
      { value: '20-50%', label: 'Post-Handover', subtext: 'Typical portion' },
      { value: '0%', label: 'Interest', subtext: 'Developer financing' },
      { value: '5 Years', label: 'Max Term', subtext: 'Extended plans' }
    ],
    cta: { label: 'View Post-Handover Projects', href: '/destinations/dubai/off-plan/post-handover#projects' }
  },
  {
    slug: 'escrow',
    category: 'off-plan',
    title: 'Dubai Escrow Accounts 2026 - Off-Plan Buyer Protection',
    description: 'Understand Dubai\'s escrow account system for off-plan purchases. How RERA protects buyers, escrow regulations, and developer compliance explained.',
    hero: {
      title: 'Escrow Protection in Dubai',
      subtitle: 'How Dubai\'s escrow system protects off-plan buyers with regulated accounts and strict developer oversight',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['RERA Regulated', 'Buyer Protection', 'Secure Funds']
    },
    keywords: ['dubai escrow account', 'rera escrow', 'off-plan protection', 'buyer protection dubai', 'escrow law dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'Escrow', href: '/destinations/dubai/off-plan/escrow' }
    ],
    faqs: [
      { question: 'What is an escrow account in Dubai real estate?', answer: 'An escrow account is a regulated bank account where developers deposit buyer payments. Funds are only released to developers upon completion of construction milestones verified by RERA.' },
      { question: 'Is my money safe in escrow?', answer: 'Yes, escrow accounts are regulated by RERA (Real Estate Regulatory Agency). Developers cannot access funds without meeting construction milestones, protecting buyers from project failures.' },
      { question: 'What if a developer doesn\'t complete the project?', answer: 'If a project is cancelled, funds in escrow are returned to buyers. RERA oversees the process and can appoint new developers to complete stalled projects in some cases.' }
    ],
    stats: [
      { value: '100%', label: 'Deposited', subtext: 'Buyer payments' },
      { value: 'RERA', label: 'Regulated', subtext: 'Government oversight' },
      { value: 'Milestone', label: 'Release', subtext: 'Construction-linked' }
    ],
    cta: { label: 'Learn About Protection', href: '/destinations/dubai/off-plan/escrow#how-it-works' }
  },
  {
    slug: 'vs-ready',
    category: 'off-plan',
    title: 'Off-Plan vs Ready Property Dubai 2026 - Complete Comparison',
    description: 'Should you buy off-plan or ready property in Dubai? Compare pros, cons, ROI, payment plans, and risks of both options to make an informed decision.',
    hero: {
      title: 'Off-Plan vs Ready Property',
      subtitle: 'A comprehensive comparison to help you decide between purchasing off-plan or ready-to-move properties in Dubai',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Full Comparison', 'Pros & Cons', 'Expert Analysis']
    },
    keywords: ['off-plan vs ready dubai', 'off-plan advantages', 'ready property benefits', 'dubai property comparison', 'should i buy off-plan'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Off-Plan', href: '/destinations/dubai/off-plan' },
      { label: 'vs Ready', href: '/destinations/dubai/off-plan/vs-ready' }
    ],
    stats: [
      { value: '10-20%', label: 'Off-Plan Discount', subtext: 'vs ready market' },
      { value: 'Immediate', label: 'Ready Rental', subtext: 'Income starts now' },
      { value: '0%', label: 'Off-Plan Finance', subtext: 'Interest-free plans' }
    ],
    cta: { label: 'Compare Properties', href: '/destinations/dubai/compare/off-plan-vs-ready' }
  }
];

// ============================================
// COMPARISON PAGES (12 pages)
// ============================================

const comparisonPages: DubaiPageData[] = [
  {
    slug: 'off-plan-vs-ready',
    category: 'comparison',
    title: 'Off-Plan vs Ready Property Dubai 2026 - Which Is Better?',
    description: 'Detailed comparison of off-plan versus ready properties in Dubai. Analyze ROI, risks, payment terms, and find out which option suits your investment goals.',
    hero: {
      title: 'Off-Plan vs Ready Property',
      subtitle: 'An in-depth analysis comparing off-plan and ready property investments in Dubai',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Head-to-Head', 'ROI Analysis', 'Risk Assessment']
    },
    keywords: ['off-plan vs ready', 'dubai property comparison', 'off-plan advantages', 'ready property pros', 'investment comparison'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Compare', href: '/destinations/dubai/compare' },
      { label: 'Off-Plan vs Ready', href: '/destinations/dubai/compare/off-plan-vs-ready' }
    ],
    stats: [
      { value: '15%', label: 'Price Advantage', subtext: 'Off-plan typically' },
      { value: 'Now', label: 'Rental Income', subtext: 'Ready property' },
      { value: '2-4 Years', label: 'Wait Time', subtext: 'Off-plan handover' }
    ],
    cta: { label: 'Get Investment Advice', href: '/destinations/dubai/off-plan/investment-guide' }
  },
  {
    slug: 'jvc-vs-dubai-south',
    category: 'comparison',
    title: 'JVC vs Dubai South 2026 - Area Comparison Dubai',
    description: 'Compare JVC (Jumeirah Village Circle) and Dubai South for property investment. Analyze prices, rental yields, amenities, and future development potential.',
    hero: {
      title: 'JVC vs Dubai South',
      subtitle: 'Comparing two of Dubai\'s most affordable investment areas for maximum ROI potential',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Area Comparison', 'Investment Focus', 'ROI Battle']
    },
    keywords: ['jvc vs dubai south', 'area comparison dubai', 'affordable investment dubai', 'jvc investment', 'dubai south investment'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Compare', href: '/destinations/dubai/compare' },
      { label: 'JVC vs Dubai South', href: '/destinations/dubai/compare/jvc-vs-dubai-south' }
    ],
    stats: [
      { value: '9%', label: 'JVC Yield', subtext: 'Average rental' },
      { value: '8%', label: 'Dubai South Yield', subtext: 'Average rental' },
      { value: 'AED 800', label: 'JVC Price', subtext: 'Per sqft' }
    ],
    cta: { label: 'View JVC Properties', href: '/destinations/dubai/off-plan/jvc' }
  },
  {
    slug: 'emaar-vs-damac',
    category: 'comparison',
    title: 'Emaar vs DAMAC 2026 - Dubai Developer Comparison',
    description: 'Compare Emaar and DAMAC, Dubai\'s top two developers. Analyze quality, pricing, communities, payment plans, and investment potential of each developer.',
    hero: {
      title: 'Emaar vs DAMAC',
      subtitle: 'Dubai\'s two largest developers compared on quality, value, and investment returns',
      image: '/destinations-hero/dubai/dubai/dubai-hero-burj-khalifa-palms-sunset.webp',
      badges: ['Developer Battle', 'Quality vs Value', 'Investment Analysis']
    },
    keywords: ['emaar vs damac', 'dubai developer comparison', 'best dubai developer', 'emaar quality', 'damac value'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Compare', href: '/destinations/dubai/compare' },
      { label: 'Emaar vs DAMAC', href: '/destinations/dubai/compare/emaar-vs-damac' }
    ],
    stats: [
      { value: '#1', label: 'Emaar', subtext: 'Market share' },
      { value: '#2', label: 'DAMAC', subtext: 'Market share' },
      { value: '10-20%', label: 'Price Gap', subtext: 'Emaar premium' }
    ],
    cta: { label: 'View Developer Projects', href: '/destinations/dubai/off-plan/developers/emaar' }
  },
  {
    slug: 'downtown-vs-marina',
    category: 'comparison',
    title: 'Downtown Dubai vs Marina 2026 - Area Comparison',
    description: 'Compare Downtown Dubai and Dubai Marina for living and investment. Analyze lifestyle, prices, rental yields, and which area suits your preferences.',
    hero: {
      title: 'Downtown vs Marina',
      subtitle: 'Dubai\'s two most iconic areas compared for lifestyle and investment potential',
      image: '/destinations-hero/dubai/dubai/dubai-hero-burj-khalifa-palms-sunset.webp',
      badges: ['Lifestyle Battle', 'Price Comparison', 'Investment Analysis']
    },
    keywords: ['downtown vs marina', 'dubai area comparison', 'downtown dubai living', 'marina lifestyle', 'where to live dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Compare', href: '/destinations/dubai/compare' },
      { label: 'Downtown vs Marina', href: '/destinations/dubai/compare/downtown-vs-marina' }
    ],
    stats: [
      { value: 'AED 2.2K', label: 'Downtown', subtext: 'Per sqft average' },
      { value: 'AED 1.8K', label: 'Marina', subtext: 'Per sqft average' },
      { value: '7%', label: 'Marina Yield', subtext: 'Average ROI' }
    ],
    cta: { label: 'Explore Downtown', href: '/destinations/dubai/districts/downtown' }
  },
  {
    slug: 'payment-plans-60-40-vs-80-20',
    category: 'comparison',
    title: '60/40 vs 80/20 Payment Plans Dubai 2026 - Which Is Better?',
    description: 'Compare 60/40 and 80/20 off-plan payment plans in Dubai. Understand the cash flow implications, pros and cons, and choose the right plan for your budget.',
    hero: {
      title: '60/40 vs 80/20 Payment Plans',
      subtitle: 'Comparing the most common off-plan payment structures to optimize your cash flow',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Payment Plans', 'Cash Flow', 'Expert Analysis']
    },
    keywords: ['60/40 payment plan', '80/20 payment plan', 'off-plan payment comparison', 'dubai payment plans', 'construction linked'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Compare', href: '/destinations/dubai/compare' },
      { label: '60/40 vs 80/20', href: '/destinations/dubai/compare/payment-plans-60-40-vs-80-20' }
    ],
    stats: [
      { value: '60%', label: 'During Build', subtext: '60/40 plan' },
      { value: '80%', label: 'During Build', subtext: '80/20 plan' },
      { value: '0%', label: 'Interest', subtext: 'Both plans' }
    ],
    cta: { label: 'View Payment Options', href: '/destinations/dubai/off-plan/payment-plans' }
  },
  {
    slug: 'sobha-vs-meraas',
    category: 'comparison',
    title: 'Sobha vs Meraas 2026 - Dubai Developer Comparison',
    description: 'Compare Sobha Realty and Meraas developments in Dubai. Analyze construction quality, communities, pricing, and which developer offers better value.',
    hero: {
      title: 'Sobha vs Meraas',
      subtitle: 'Comparing two premium developers known for exceptional quality and unique lifestyle offerings',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Quality Focus', 'Lifestyle Battle', 'Premium Segment']
    },
    keywords: ['sobha vs meraas', 'dubai developer comparison', 'sobha quality', 'meraas lifestyle', 'premium developers dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Compare', href: '/destinations/dubai/compare' },
      { label: 'Sobha vs Meraas', href: '/destinations/dubai/compare/sobha-vs-meraas' }
    ],
    stats: [
      { value: '100%', label: 'Sobha In-House', subtext: 'Self-built quality' },
      { value: 'Lifestyle', label: 'Meraas Focus', subtext: 'Destination creation' },
      { value: 'Premium', label: 'Both', subtext: 'Segment positioning' }
    ],
    cta: { label: 'Explore Sobha', href: '/destinations/dubai/off-plan/developers/sobha' }
  },
  {
    slug: 'crypto-vs-bank',
    category: 'comparison',
    title: 'Crypto vs Bank Transfer Dubai Property 2026 - Payment Comparison',
    description: 'Compare buying Dubai property with cryptocurrency versus traditional bank transfer. Analyze speed, fees, tax implications, and which method suits you.',
    hero: {
      title: 'Crypto vs Bank Transfer',
      subtitle: 'Comparing payment methods for Dubai property: traditional banking versus cryptocurrency',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Payment Methods', 'Speed & Fees', 'Tax Implications']
    },
    keywords: ['crypto payment dubai', 'bank transfer property', 'buy property cryptocurrency', 'payment comparison dubai', 'swift vs crypto'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Compare', href: '/destinations/dubai/compare' },
      { label: 'Crypto vs Bank', href: '/destinations/dubai/compare/crypto-vs-bank' }
    ],
    stats: [
      { value: '<1 Hour', label: 'Crypto Speed', subtext: 'Transfer time' },
      { value: '3-5 Days', label: 'Bank Speed', subtext: 'International SWIFT' },
      { value: '~0.1%', label: 'Crypto Fee', subtext: 'Network cost' }
    ],
    cta: { label: 'Pay with Crypto', href: '/destinations/dubai/off-plan/crypto' }
  },
  {
    slug: 'business-bay-vs-jlt',
    category: 'comparison',
    title: 'Business Bay vs JLT 2026 - Area Comparison Dubai',
    description: 'Compare Business Bay and JLT (Jumeirah Lake Towers) for living and investment. Analyze prices, lifestyle, connectivity, and rental yields.',
    hero: {
      title: 'Business Bay vs JLT',
      subtitle: 'Comparing two popular commercial-residential districts for value and lifestyle',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Area Battle', 'Value Comparison', 'Lifestyle Analysis']
    },
    keywords: ['business bay vs jlt', 'dubai area comparison', 'jlt living', 'business bay investment', 'where to live dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Compare', href: '/destinations/dubai/compare' },
      { label: 'Business Bay vs JLT', href: '/destinations/dubai/compare/business-bay-vs-jlt' }
    ],
    stats: [
      { value: '8.5%', label: 'Business Bay Yield', subtext: 'Average ROI' },
      { value: '7%', label: 'JLT Yield', subtext: 'Average ROI' },
      { value: 'Metro', label: 'Both', subtext: 'Connected' }
    ],
    cta: { label: 'Explore Business Bay', href: '/destinations/dubai/districts/business-bay' }
  },
  {
    slug: 'new-vs-resale',
    category: 'comparison',
    title: 'New vs Resale Property Dubai 2026 - Which to Buy?',
    description: 'Compare buying new (off-plan/ready) versus resale property in Dubai. Understand pricing, quality, location options, and investment implications.',
    hero: {
      title: 'New vs Resale Property',
      subtitle: 'Analyzing the pros and cons of new developments versus secondary market purchases',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Market Comparison', 'Price Analysis', 'Quality Check']
    },
    keywords: ['new vs resale dubai', 'secondary market dubai', 'resale property dubai', 'new property benefits', 'resale advantages'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Compare', href: '/destinations/dubai/compare' },
      { label: 'New vs Resale', href: '/destinations/dubai/compare/new-vs-resale' }
    ],
    stats: [
      { value: 'Modern', label: 'New', subtext: 'Latest specs' },
      { value: 'Prime', label: 'Resale', subtext: 'Established locations' },
      { value: 'Varies', label: 'Pricing', subtext: 'Market dependent' }
    ],
    cta: { label: 'View New Projects', href: '/destinations/dubai/off-plan' }
  },
  {
    slug: 'nakheel-vs-azizi',
    category: 'comparison',
    title: 'Nakheel vs Azizi 2026 - Dubai Developer Comparison',
    description: 'Compare Nakheel and Azizi developments in Dubai. Analyze project quality, pricing, payment plans, and which developer offers better investment value.',
    hero: {
      title: 'Nakheel vs Azizi',
      subtitle: 'Comparing an established giant with a value-focused challenger in Dubai real estate',
      image: '/destinations-hero/dubai/dubai/dubai-hero-atlantis-palm-jumeirah-beach.webp',
      badges: ['Developer Battle', 'Value Analysis', 'Project Comparison']
    },
    keywords: ['nakheel vs azizi', 'dubai developer comparison', 'nakheel projects', 'azizi developments', 'affordable developers dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Compare', href: '/destinations/dubai/compare' },
      { label: 'Nakheel vs Azizi', href: '/destinations/dubai/compare/nakheel-vs-azizi' }
    ],
    stats: [
      { value: 'Palm', label: 'Nakheel', subtext: 'Iconic developer' },
      { value: 'Value', label: 'Azizi', subtext: 'Affordable focus' },
      { value: '20%+', label: 'Price Gap', subtext: 'Typical difference' }
    ],
    cta: { label: 'Explore Nakheel', href: '/destinations/dubai/off-plan/developers/nakheel' }
  },
  {
    slug: 'villa-vs-apartment',
    category: 'comparison',
    title: 'Villa vs Apartment Dubai 2026 - Property Type Comparison',
    description: 'Should you buy a villa or apartment in Dubai? Compare space, lifestyle, ROI, maintenance, and which property type suits your investment goals.',
    hero: {
      title: 'Villa vs Apartment',
      subtitle: 'Comparing two fundamentally different property types for lifestyle and investment in Dubai',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Property Types', 'Lifestyle Match', 'ROI Analysis']
    },
    keywords: ['villa vs apartment dubai', 'dubai property type', 'buy villa dubai', 'apartment investment', 'best property type dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Compare', href: '/destinations/dubai/compare' },
      { label: 'Villa vs Apartment', href: '/destinations/dubai/compare/villa-vs-apartment' }
    ],
    stats: [
      { value: '5%', label: 'Villa Yield', subtext: 'Average ROI' },
      { value: '7%', label: 'Apartment Yield', subtext: 'Average ROI' },
      { value: 'Higher', label: 'Villa Capital', subtext: 'Appreciation' }
    ],
    cta: { label: 'Explore Villas', href: '/destinations/dubai/off-plan/villas' }
  },
  {
    slug: 'studio-vs-1bed',
    category: 'comparison',
    title: 'Studio vs 1-Bedroom Dubai 2026 - Investment Comparison',
    description: 'Compare studio and 1-bedroom apartments for Dubai investment. Analyze price points, rental yields, tenant demand, and which offers better ROI.',
    hero: {
      title: 'Studio vs 1-Bedroom',
      subtitle: 'Entry-level investment comparison for maximum rental yield in Dubai',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Entry-Level', 'Yield Focus', 'Investor Guide']
    },
    keywords: ['studio vs 1bed dubai', 'small apartment investment', 'dubai rental yield', 'studio apartment dubai', '1 bedroom dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Compare', href: '/destinations/dubai/compare' },
      { label: 'Studio vs 1-Bed', href: '/destinations/dubai/compare/studio-vs-1bed' }
    ],
    stats: [
      { value: '8-10%', label: 'Studio Yield', subtext: 'Higher per sqft' },
      { value: '7-8%', label: '1-Bed Yield', subtext: 'Stable demand' },
      { value: 'AED 500K', label: 'Studio Entry', subtext: 'Typical starting' }
    ],
    cta: { label: 'View Apartments', href: '/destinations/dubai/off-plan/jvc' }
  }
];

// ============================================
// TOOL PAGES (7 pages)
// ============================================

const toolPages: DubaiPageData[] = [
  {
    slug: 'roi-calculator',
    category: 'tool',
    title: 'Dubai Property ROI Calculator 2026 - Investment Returns',
    description: 'Calculate your Dubai property investment ROI. Factor in purchase price, rental income, appreciation, and all costs for accurate return projections.',
    hero: {
      title: 'ROI Calculator',
      subtitle: 'Calculate your expected returns from Dubai property investment with our comprehensive ROI tool',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Free Tool', 'Accurate Projections', 'All Costs Included']
    },
    keywords: ['dubai roi calculator', 'property roi', 'investment calculator dubai', 'rental yield calculator', 'return on investment dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Tools', href: '/destinations/dubai/tools' },
      { label: 'ROI Calculator', href: '/destinations/dubai/tools/roi-calculator' }
    ],
    cta: { label: 'Calculate Now', href: '/destinations/dubai/tools/roi-calculator#calculator' }
  },
  {
    slug: 'payment-calculator',
    category: 'tool',
    title: 'Dubai Off-Plan Payment Calculator 2026 - Plan Your Payments',
    description: 'Calculate your off-plan payment schedule for Dubai property. Enter price and payment plan to see exact installment amounts and due dates.',
    hero: {
      title: 'Payment Calculator',
      subtitle: 'Plan your off-plan payment schedule and understand your cash flow requirements',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Free Tool', 'All Plans', 'Milestone Breakdown']
    },
    keywords: ['off-plan payment calculator', 'installment calculator', 'dubai payment plan', 'construction payment', 'payment schedule dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Tools', href: '/destinations/dubai/tools' },
      { label: 'Payment Calculator', href: '/destinations/dubai/tools/payment-calculator' }
    ],
    cta: { label: 'Calculate Payments', href: '/destinations/dubai/tools/payment-calculator#calculator' }
  },
  {
    slug: 'affordability-calculator',
    category: 'tool',
    title: 'Dubai Property Affordability Calculator 2026 - Budget Check',
    description: 'Find out what Dubai property you can afford. Enter your budget, savings, and income to see your maximum property price and mortgage eligibility.',
    hero: {
      title: 'Affordability Calculator',
      subtitle: 'Discover what you can afford in Dubai real estate based on your financial situation',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Free Tool', 'Instant Results', 'Budget Planning']
    },
    keywords: ['affordability calculator dubai', 'how much can i afford', 'dubai property budget', 'mortgage affordability', 'property budget dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Tools', href: '/destinations/dubai/tools' },
      { label: 'Affordability Calculator', href: '/destinations/dubai/tools/affordability-calculator' }
    ],
    cta: { label: 'Check Affordability', href: '/destinations/dubai/tools/affordability-calculator#calculator' }
  },
  {
    slug: 'currency-converter',
    category: 'tool',
    title: 'AED Currency Converter 2026 - Dubai Property Prices',
    description: 'Convert Dubai property prices from AED to your local currency. Real-time exchange rates for USD, GBP, EUR, INR, and 50+ currencies.',
    hero: {
      title: 'Currency Converter',
      subtitle: 'Convert Dubai property prices to your local currency with real-time exchange rates',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Real-Time Rates', '50+ Currencies', 'Free Tool']
    },
    keywords: ['aed converter', 'dubai currency', 'dirham converter', 'property price converter', 'aed to usd'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Tools', href: '/destinations/dubai/tools' },
      { label: 'Currency Converter', href: '/destinations/dubai/tools/currency-converter' }
    ],
    cta: { label: 'Convert Now', href: '/destinations/dubai/tools/currency-converter#converter' }
  },
  {
    slug: 'fees-calculator',
    category: 'tool',
    title: 'Dubai Property Fees Calculator 2026 - DLD, Agency & More',
    description: 'Calculate all Dubai property purchase fees including DLD (4%), agency commission, NOC, trustee fees, and mortgage registration costs.',
    hero: {
      title: 'Fees Calculator',
      subtitle: 'Calculate all transaction costs when buying property in Dubai including DLD and agency fees',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['All Fees', 'DLD Included', 'Accurate Totals']
    },
    keywords: ['dubai property fees', 'dld fees', 'transfer fees dubai', 'buying costs dubai', 'agency fees dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Tools', href: '/destinations/dubai/tools' },
      { label: 'Fees Calculator', href: '/destinations/dubai/tools/fees-calculator' }
    ],
    cta: { label: 'Calculate Fees', href: '/destinations/dubai/tools/fees-calculator#calculator' }
  },
  {
    slug: 'rental-yield-calculator',
    category: 'tool',
    title: 'Dubai Rental Yield Calculator 2026 - Net Yield Analysis',
    description: 'Calculate net rental yield on Dubai property. Factor in service charges, maintenance, vacancy, and management fees for accurate yield projections.',
    hero: {
      title: 'Rental Yield Calculator',
      subtitle: 'Calculate your true net rental yield after all expenses for Dubai property investment',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Net Yield', 'All Costs', 'Accurate Analysis']
    },
    keywords: ['rental yield calculator', 'dubai rental yield', 'net yield dubai', 'gross yield', 'property income calculator'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Tools', href: '/destinations/dubai/tools' },
      { label: 'Rental Yield Calculator', href: '/destinations/dubai/tools/rental-yield-calculator' }
    ],
    cta: { label: 'Calculate Yield', href: '/destinations/dubai/tools/rental-yield-calculator#calculator' }
  },
  {
    slug: 'mortgage-calculator',
    category: 'tool',
    title: 'Dubai Mortgage Calculator 2026 - Monthly Payments',
    description: 'Calculate Dubai mortgage payments with current interest rates. Compare fixed vs variable, see amortization schedule, and plan your property purchase.',
    hero: {
      title: 'Mortgage Calculator',
      subtitle: 'Calculate monthly mortgage payments and total interest for Dubai property financing',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Current Rates', 'Amortization', 'Bank Comparison']
    },
    keywords: ['dubai mortgage calculator', 'home loan calculator', 'mortgage payments dubai', 'property financing', 'uae mortgage'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Tools', href: '/destinations/dubai/tools' },
      { label: 'Mortgage Calculator', href: '/destinations/dubai/tools/mortgage-calculator' }
    ],
    cta: { label: 'Calculate Mortgage', href: '/destinations/dubai/tools/mortgage-calculator#calculator' }
  }
];

// ============================================
// CASE STUDY PAGES (8 pages)
// ============================================

const caseStudyPages: DubaiPageData[] = [
  {
    slug: 'jvc-investor',
    category: 'case-study',
    title: 'JVC Investment Success Story - 12% ROI Case Study',
    description: 'Real case study of a successful JVC property investment achieving 12% annual returns. Learn the strategy, numbers, and lessons from this investor.',
    hero: {
      title: 'JVC Investment Success',
      subtitle: 'How one investor achieved 12% annual returns through strategic JVC property purchases',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['12% ROI', 'Real Numbers', 'Strategy Revealed']
    },
    keywords: ['jvc investment case study', 'dubai investment success', 'high yield case study', 'property investment story', 'jvc roi'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Case Studies', href: '/destinations/dubai/case-studies' },
      { label: 'JVC Investor', href: '/destinations/dubai/case-studies/jvc-investor' }
    ],
    stats: [
      { value: '12%', label: 'Annual ROI', subtext: 'Achieved return' },
      { value: 'AED 650K', label: 'Investment', subtext: '1-bedroom JVC' },
      { value: '18 Months', label: 'Breakeven', subtext: 'Rental income' }
    ],
    cta: { label: 'Invest in JVC', href: '/destinations/dubai/off-plan/jvc' }
  },
  {
    slug: 'crypto-buyer',
    category: 'case-study',
    title: 'Crypto Property Purchase Dubai - Case Study',
    description: 'Real case study of buying Dubai property with Bitcoin. Learn about the process, challenges, and outcome of this cryptocurrency real estate purchase.',
    hero: {
      title: 'Buying Property with Crypto',
      subtitle: 'A complete walkthrough of purchasing a Dubai apartment using Bitcoin in 2024',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Bitcoin Used', 'Full Process', 'Real Experience']
    },
    keywords: ['crypto property purchase', 'bitcoin real estate', 'cryptocurrency buyer', 'dubai crypto case study', 'btc property'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Case Studies', href: '/destinations/dubai/case-studies' },
      { label: 'Crypto Buyer', href: '/destinations/dubai/case-studies/crypto-buyer' }
    ],
    stats: [
      { value: '2.5 BTC', label: 'Investment', subtext: 'At time of purchase' },
      { value: '48 Hours', label: 'Complete Process', subtext: 'Start to finish' },
      { value: 'AED 2M', label: 'Property Value', subtext: 'Marina apartment' }
    ],
    cta: { label: 'Pay with Crypto', href: '/destinations/dubai/off-plan/crypto' }
  },
  {
    slug: 'golden-visa-success',
    category: 'case-study',
    title: 'Golden Visa Through Property - Success Story',
    description: 'Real case study of obtaining UAE Golden Visa through Dubai property investment. Timeline, costs, and step-by-step experience shared.',
    hero: {
      title: 'Golden Visa Success Story',
      subtitle: 'How one investor secured a 10-year UAE Golden Visa through strategic property investment',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['10-Year Visa', 'Full Process', 'Real Experience']
    },
    keywords: ['golden visa case study', 'uae residency success', 'property visa dubai', 'golden visa experience', 'investor visa'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Case Studies', href: '/destinations/dubai/case-studies' },
      { label: 'Golden Visa', href: '/destinations/dubai/case-studies/golden-visa-success' }
    ],
    stats: [
      { value: '10 Years', label: 'Visa Duration', subtext: 'Full term' },
      { value: 'AED 2.1M', label: 'Investment', subtext: 'Total property' },
      { value: '6 Weeks', label: 'Process Time', subtext: 'Start to visa' }
    ],
    cta: { label: 'Get Golden Visa', href: '/destinations/dubai/off-plan/golden-visa' }
  },
  {
    slug: 'expat-family',
    category: 'case-study',
    title: 'Expat Family Home Purchase Dubai - Case Study',
    description: 'Real case study of an expat family purchasing their Dubai home. From renting to owning, learn about the journey, challenges, and outcomes.',
    hero: {
      title: 'Expat Family Home Purchase',
      subtitle: 'One family\'s journey from renting to owning their dream home in Dubai Hills Estate',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Family Focus', 'End-User', 'Real Journey']
    },
    keywords: ['expat buying dubai', 'family home dubai', 'end user purchase', 'dubai hills family', 'expat property'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Case Studies', href: '/destinations/dubai/case-studies' },
      { label: 'Expat Family', href: '/destinations/dubai/case-studies/expat-family' }
    ],
    stats: [
      { value: 'AED 3.5M', label: 'Property', subtext: '4-bed villa' },
      { value: 'Dubai Hills', label: 'Location', subtext: 'Family community' },
      { value: '3 Kids', label: 'Family', subtext: 'School nearby' }
    ],
    cta: { label: 'Explore Dubai Hills', href: '/destinations/dubai/districts/dubai-hills' }
  },
  {
    slug: 'investor-flip',
    category: 'case-study',
    title: 'Dubai Property Flip Success - 25% Profit Case Study',
    description: 'Real case study of a successful Dubai property flip achieving 25% profit. Learn the strategy, timing, and market conditions that made it work.',
    hero: {
      title: 'Property Flip Success',
      subtitle: 'How strategic timing and location selection led to a 25% profit in 18 months',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['25% Profit', 'Flip Strategy', 'Market Timing']
    },
    keywords: ['dubai property flip', 'real estate flip', 'capital gain dubai', 'short term investment', 'flip profit'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Case Studies', href: '/destinations/dubai/case-studies' },
      { label: 'Investor Flip', href: '/destinations/dubai/case-studies/investor-flip' }
    ],
    stats: [
      { value: '25%', label: 'Profit', subtext: 'Net after costs' },
      { value: '18 Months', label: 'Hold Period', subtext: 'Off-plan to sale' },
      { value: 'Business Bay', label: 'Location', subtext: 'Strategic choice' }
    ],
    cta: { label: 'View Off-Plan Projects', href: '/destinations/dubai/off-plan' }
  },
  {
    slug: 'portfolio-diversification',
    category: 'case-study',
    title: 'Dubai Property Portfolio Diversification - Case Study',
    description: 'Case study of building a diversified Dubai property portfolio. Learn how one investor spread risk across different areas, types, and price points.',
    hero: {
      title: 'Portfolio Diversification',
      subtitle: 'Building a balanced Dubai property portfolio across locations, types, and price segments',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Multi-Property', 'Risk Spread', 'Strategy Focus']
    },
    keywords: ['dubai portfolio', 'property diversification', 'multi-property investment', 'real estate portfolio', 'investment strategy'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Case Studies', href: '/destinations/dubai/case-studies' },
      { label: 'Portfolio', href: '/destinations/dubai/case-studies/portfolio-diversification' }
    ],
    stats: [
      { value: '5', label: 'Properties', subtext: 'Portfolio size' },
      { value: 'AED 8M', label: 'Total Value', subtext: 'Portfolio worth' },
      { value: '7.5%', label: 'Avg Yield', subtext: 'Blended return' }
    ],
    cta: { label: 'Investment Guide', href: '/destinations/dubai/off-plan/investment-guide' }
  },
  {
    slug: 'off-plan-launch',
    category: 'case-study',
    title: 'Off-Plan Launch Day Purchase - Early Bird Case Study',
    description: 'Case study of purchasing property on off-plan launch day. Learn about the early bird advantage, pricing benefits, and investment outcome.',
    hero: {
      title: 'Launch Day Purchase',
      subtitle: 'The advantages and experience of buying on an off-plan project\'s launch day',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Early Bird', 'Launch Day', 'Best Units']
    },
    keywords: ['off-plan launch', 'early bird purchase', 'launch day dubai', 'best pricing', 'new project investment'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Case Studies', href: '/destinations/dubai/case-studies' },
      { label: 'Launch Day', href: '/destinations/dubai/case-studies/off-plan-launch' }
    ],
    stats: [
      { value: '15%', label: 'Early Bird Discount', subtext: 'vs phase 2 pricing' },
      { value: 'Best Floor', label: 'Unit Selection', subtext: 'First pick' },
      { value: '60/40', label: 'Payment Plan', subtext: 'Flexible terms' }
    ],
    cta: { label: 'View New Launches', href: '/destinations/dubai/off-plan/best-2026' }
  },
  {
    slug: 'retirement-planning',
    category: 'case-study',
    title: 'Dubai Property for Retirement - Planning Case Study',
    description: 'Case study of using Dubai property for retirement planning. Learn how rental income provides passive retirement income with tax advantages.',
    hero: {
      title: 'Retirement Planning with Dubai Property',
      subtitle: 'How Dubai real estate provides tax-free passive income for retirement',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Retirement', 'Passive Income', 'Tax-Free']
    },
    keywords: ['retirement property dubai', 'passive income dubai', 'retirement planning', 'rental income retirement', 'tax free income'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Case Studies', href: '/destinations/dubai/case-studies' },
      { label: 'Retirement', href: '/destinations/dubai/case-studies/retirement-planning' }
    ],
    stats: [
      { value: 'AED 15K', label: 'Monthly Income', subtext: 'Rental returns' },
      { value: '0%', label: 'Income Tax', subtext: 'Tax-free rental' },
      { value: '3', label: 'Properties', subtext: 'Income sources' }
    ],
    cta: { label: 'Start Planning', href: '/destinations/dubai/off-plan/investment-guide' }
  }
];

// ============================================
// PILLAR PAGES (2 pages)
// ============================================

const pillarPages: DubaiPageData[] = [
  {
    slug: 'roi-rental-yields',
    category: 'pillar',
    title: 'Dubai ROI & Rental Yields 2026 - Complete Analysis',
    description: 'Comprehensive guide to Dubai property ROI and rental yields. Area-by-area analysis, historical trends, and projections for informed investment decisions.',
    hero: {
      title: 'Dubai ROI & Rental Yields',
      subtitle: 'The definitive guide to understanding and maximizing returns from Dubai property investment',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Data-Driven', 'All Areas', '2026 Analysis']
    },
    keywords: ['dubai roi guide', 'rental yields dubai', 'property returns dubai', 'investment analysis', 'yield comparison'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'ROI & Rental Yields', href: '/destinations/dubai/roi-rental-yields' }
    ],
    faqs: [
      { question: 'What is the average rental yield in Dubai?', answer: 'Dubai offers 5-10% gross rental yields depending on location and property type. Studios and 1-bedrooms in areas like JVC achieve 8-10%, while luxury properties in Palm Jumeirah yield 4-6%.' },
      { question: 'Which area has the highest ROI in Dubai?', answer: 'JVC, Dubai South, and International City typically offer the highest yields (8-10%). However, premium areas like Downtown and Marina offer better capital appreciation potential.' },
      { question: 'How is rental yield calculated?', answer: 'Gross yield = (Annual Rent / Property Price) × 100. Net yield deducts service charges, maintenance, management fees, and vacancy allowance for a more accurate picture.' }
    ],
    stats: [
      { value: '7%', label: 'Average Yield', subtext: 'Dubai market' },
      { value: '0%', label: 'Rental Tax', subtext: 'No income tax' },
      { value: '10%', label: 'Top Yields', subtext: 'JVC, Dubai South' }
    ],
    cta: { label: 'Use ROI Calculator', href: '/destinations/dubai/tools/roi-calculator' }
  },
  {
    slug: 'legal-security-guide',
    category: 'pillar',
    title: 'Dubai Property Legal & Security Guide 2026',
    description: 'Complete guide to legal protections for Dubai property buyers. RERA regulations, escrow, ownership rights, and buyer security measures explained.',
    hero: {
      title: 'Legal & Security Guide',
      subtitle: 'Understanding your rights and protections when purchasing property in Dubai',
      image: '/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp',
      badges: ['Legal Guide', 'Buyer Protection', 'RERA Explained']
    },
    keywords: ['dubai property law', 'rera dubai', 'buyer protection dubai', 'property rights uae', 'legal security dubai'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Legal & Security Guide', href: '/destinations/dubai/legal-security-guide' }
    ],
    faqs: [
      { question: 'What is RERA?', answer: 'RERA (Real Estate Regulatory Agency) is Dubai\'s real estate regulator under DLD. It licenses agents, regulates developers, manages escrow accounts, and resolves disputes to protect buyers.' },
      { question: 'Can foreigners own property in Dubai?', answer: 'Yes, foreigners can own freehold property in designated areas (most popular areas). There are no restrictions on nationality, and ownership is registered with Dubai Land Department.' },
      { question: 'What happens if a developer goes bankrupt?', answer: 'Escrow funds protect buyers. RERA can appoint new developers to complete projects, refund buyers, or restructure the project. Dubai has strong developer regulations to prevent failures.' }
    ],
    stats: [
      { value: 'RERA', label: 'Regulated', subtext: 'Government oversight' },
      { value: 'Freehold', label: 'Ownership', subtext: '100% foreign ownership' },
      { value: 'Escrow', label: 'Protected', subtext: 'Buyer funds secured' }
    ],
    cta: { label: 'Learn About Escrow', href: '/destinations/dubai/off-plan/escrow' }
  }
];

// ============================================
// LANDING PAGES (4 pages)
// ============================================

const landingPages: DubaiPageData[] = [
  {
    slug: 'free-things-to-do',
    category: 'landing',
    title: '50+ Free Things to Do in Dubai 2026 - Budget Guide',
    description: 'Discover over 50 free things to do in Dubai. From beaches to malls, festivals to parks, experience Dubai without spending a dirham.',
    hero: {
      title: 'Free Things to Do in Dubai',
      subtitle: 'Experience the best of Dubai without spending a dirham - over 50 free activities and attractions',
      image: '/destinations-hero/dubai/dubai/dubai-hero-burj-khalifa-palms-sunset.webp',
      badges: ['50+ Activities', 'Budget-Friendly', 'Local Tips']
    },
    keywords: ['free things dubai', 'budget dubai', 'free activities dubai', 'cheap dubai', 'dubai on a budget'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Free Things to Do', href: '/destinations/dubai/free-things-to-do' }
    ],
    stats: [
      { value: '50+', label: 'Free Activities', subtext: 'Beaches, parks, shows' },
      { value: '0 AED', label: 'Cost', subtext: 'Completely free' },
      { value: '365', label: 'Days', subtext: 'Year-round options' }
    ],
    cta: { label: 'Explore Dubai', href: '/destinations/dubai' }
  },
  {
    slug: 'laws-for-tourists',
    category: 'landing',
    title: 'Dubai Laws for Tourists 2026 - What You Need to Know',
    description: 'Essential guide to Dubai laws for tourists. Understand dress codes, alcohol rules, photography laws, and cultural etiquette to stay safe.',
    hero: {
      title: 'Dubai Laws for Tourists',
      subtitle: 'Essential rules and cultural guidelines every visitor should know before traveling to Dubai',
      image: '/images/categories/dubai/dubai-old-town-wind-towers-colorful-traditional-architecture.webp',
      badges: ['Essential Guide', 'Stay Safe', 'Cultural Tips']
    },
    keywords: ['dubai laws tourists', 'dubai rules', 'dubai dress code', 'dubai alcohol laws', 'dubai etiquette'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Laws for Tourists', href: '/destinations/dubai/laws-for-tourists' }
    ],
    stats: [
      { value: 'Safe', label: 'Dubai', subtext: 'Low crime rate' },
      { value: 'Respect', label: 'Culture', subtext: 'Key principle' },
      { value: 'Know', label: 'Rules', subtext: 'Before you go' }
    ],
    cta: { label: 'Plan Your Trip', href: '/destinations/dubai' }
  },
  {
    slug: 'sheikh-mohammed',
    category: 'landing',
    title: 'Sheikh Mohammed - The Visionary Behind Dubai',
    description: 'Learn about Sheikh Mohammed bin Rashid Al Maktoum, the visionary leader who transformed Dubai into a global city. His vision, achievements, and legacy.',
    hero: {
      title: 'Sheikh Mohammed',
      subtitle: 'The visionary leader who transformed a desert trading post into a global metropolis',
      image: '/destinations-hero/dubai/dubai/dubai-hero-dubai-frame-skyline-aerial.webp',
      badges: ['Visionary Leader', 'Dubai\'s Ruler', 'Global Impact']
    },
    keywords: ['sheikh mohammed', 'dubai ruler', 'uae leadership', 'dubai vision', 'mbr'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: 'Sheikh Mohammed', href: '/destinations/dubai/sheikh-mohammed' }
    ],
    stats: [
      { value: '2006', label: 'Ruler Since', subtext: 'Dubai\'s leader' },
      { value: 'Vision 2071', label: 'Future', subtext: 'Long-term plan' },
      { value: 'Global', label: 'Impact', subtext: 'World recognition' }
    ],
    cta: { label: 'Discover Dubai', href: '/destinations/dubai' }
  },
  {
    slug: '24-hours-open',
    category: 'landing',
    title: 'Dubai 24 Hours - Things Open Round the Clock',
    description: 'Discover what\'s open 24/7 in Dubai. From restaurants to pharmacies, supermarkets to entertainment, Dubai never sleeps.',
    hero: {
      title: 'Dubai 24 Hours',
      subtitle: 'The city that never sleeps - everything open round the clock in Dubai',
      image: '/destinations-hero/dubai/dubai/dubai-hero-marina-abra-boat-night.webp',
      badges: ['24/7 Dubai', 'Night Life', 'Always Open']
    },
    keywords: ['dubai 24 hours', 'open 24 7 dubai', 'late night dubai', 'dubai night', 'dubai always open'],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Dubai', href: '/destinations/dubai' },
      { label: '24 Hours Open', href: '/destinations/dubai/24-hours-open' }
    ],
    stats: [
      { value: '24/7', label: 'City Life', subtext: 'Never stops' },
      { value: '100+', label: 'Venues', subtext: 'Always open' },
      { value: 'All Night', label: 'Services', subtext: 'Available' }
    ],
    cta: { label: 'Explore Dubai', href: '/destinations/dubai' }
  }
];

// ============================================
// COMBINED DATA & HELPER FUNCTIONS
// ============================================

// Combine all pages
export const allDubaiPages: DubaiPageData[] = [
  ...districtPages,
  ...offPlanPages,
  ...comparisonPages,
  ...toolPages,
  ...caseStudyPages,
  ...pillarPages,
  ...landingPages
];

// Helper function: Get pages by category
export function getDubaiPagesByCategory(category: DubaiPageCategory): DubaiPageData[] {
  return allDubaiPages.filter(page => page.category === category);
}

// Helper function: Get page by slug (searches across all categories)
export function getDubaiPageBySlug(slug: string): DubaiPageData | undefined {
  return allDubaiPages.find(page => page.slug === slug);
}

// Helper function: Get page by full path
export function getDubaiPageByPath(path: string): DubaiPageData | undefined {
  // Extract slug from path like "/destinations/dubai/districts/downtown"
  const segments = path.split('/').filter(Boolean);
  const slug = segments[segments.length - 1];
  return getDubaiPageBySlug(slug);
}

// Helper function: Get all district pages
export function getDistrictPages(): DubaiPageData[] {
  return getDubaiPagesByCategory('district');
}

// Helper function: Get all off-plan pages
export function getOffPlanPages(): DubaiPageData[] {
  return getDubaiPagesByCategory('off-plan');
}

// Helper function: Get all comparison pages
export function getComparisonPages(): DubaiPageData[] {
  return getDubaiPagesByCategory('comparison');
}

// Helper function: Get all tool pages
export function getToolPages(): DubaiPageData[] {
  return getDubaiPagesByCategory('tool');
}

// Helper function: Get all case study pages
export function getCaseStudyPages(): DubaiPageData[] {
  return getDubaiPagesByCategory('case-study');
}

// Helper function: Get all pillar pages
export function getPillarPages(): DubaiPageData[] {
  return getDubaiPagesByCategory('pillar');
}

// Helper function: Get all landing pages
export function getLandingPages(): DubaiPageData[] {
  return getDubaiPagesByCategory('landing');
}

// Helper function: Get page count by category
export function getDubaiPageCountByCategory(): Record<DubaiPageCategory, number> {
  return {
    district: districtPages.length,
    'off-plan': offPlanPages.length,
    comparison: comparisonPages.length,
    tool: toolPages.length,
    'case-study': caseStudyPages.length,
    pillar: pillarPages.length,
    landing: landingPages.length
  };
}

// Helper function: Get total page count
export function getTotalDubaiPageCount(): number {
  return allDubaiPages.length;
}

// Export category arrays for direct access
export {
  districtPages,
  offPlanPages,
  comparisonPages,
  toolPages,
  caseStudyPages,
  pillarPages,
  landingPages
};

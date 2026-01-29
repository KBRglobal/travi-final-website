import { Helmet } from "react-helmet-async";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import ArticlePage, { ArticlePageProps } from "@/pages/article-page";
import { SITE_URL } from "@/lib/constants";

const wynnGuideData: ArticlePageProps = {
  title: "Wynn Al Marjan Island: The Complete 2027 Guide",
  slug: "wynn-al-marjan-island",
  heroImage: {
    src: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1920&h=1080&fit=crop",
    alt: "Wynn Al Marjan Island Resort rendering - luxury integrated resort in Ras Al Khaimah, UAE",
  },
  category: "Travel Guides",
  publishedAt: "2026-01-10",
  updatedAt: "2026-01-10",
  author: {
    name: "TRAVI Editorial",
    role: "Travel Experts",
  },
  readTime: "12 min read",
  excerpt:
    "Everything you need to know about Wynn Al Marjan Island, the UAE's first licensed integrated resort and casino. From opening dates and accommodation options to gaming rules and alcohol policies, this comprehensive guide covers all the essential details for planning your visit to this groundbreaking $5.1 billion destination.",
  quickInfo: {
    location: "Al Marjan Island, Ras Al Khaimah, UAE",
    duration: "45-55 min from Dubai",
    bestTime: "Opening Spring 2027",
  },
  sections: [
    {
      id: "quick-facts",
      title: "Quick Facts at a Glance",
      content: `
        <table class="w-full border-collapse my-6">
          <tbody>
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <td class="py-3 pr-4 font-semibold text-slate-900 dark:text-white">Opening Date</td>
              <td class="py-3 text-slate-700 dark:text-slate-300">Spring 2027 (Q1 expected)</td>
            </tr>
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <td class="py-3 pr-4 font-semibold text-slate-900 dark:text-white">Location</td>
              <td class="py-3 text-slate-700 dark:text-slate-300">Al Marjan Island, Ras Al Khaimah, UAE</td>
            </tr>
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <td class="py-3 pr-4 font-semibold text-slate-900 dark:text-white">Investment</td>
              <td class="py-3 text-slate-700 dark:text-slate-300">$5.1 billion USD</td>
            </tr>
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <td class="py-3 pr-4 font-semibold text-slate-900 dark:text-white">Rooms</td>
              <td class="py-3 text-slate-700 dark:text-slate-300">1,530 rooms and suites</td>
            </tr>
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <td class="py-3 pr-4 font-semibold text-slate-900 dark:text-white">Casino Size</td>
              <td class="py-3 text-slate-700 dark:text-slate-300">194,000 square feet</td>
            </tr>
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <td class="py-3 pr-4 font-semibold text-slate-900 dark:text-white">Restaurants</td>
              <td class="py-3 text-slate-700 dark:text-slate-300">22 dining venues</td>
            </tr>
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <td class="py-3 pr-4 font-semibold text-slate-900 dark:text-white">Distance from Dubai</td>
              <td class="py-3 text-slate-700 dark:text-slate-300">45-55 minutes by car</td>
            </tr>
            <tr>
              <td class="py-3 pr-4 font-semibold text-slate-900 dark:text-white">License Status</td>
              <td class="py-3 text-slate-700 dark:text-slate-300">First UAE commercial gaming license (October 2024)</td>
            </tr>
          </tbody>
        </table>
      `,
    },
    {
      id: "opening-date-timeline",
      title: "Opening Date Timeline",
      content: `
        <p>Wynn Al Marjan Island is scheduled to open in <strong>Spring 2027</strong>, with Q1 being the expected target. This marks a historic moment as the first licensed integrated resort and casino in the United Arab Emirates.</p>
        <p>Construction has progressed significantly, with the main tower reaching its topping out milestone in <strong>December 2025</strong>. The impressive structure stands at <strong>283 meters</strong> tall, spanning <strong>70 stories</strong>, making it one of the tallest buildings in Ras Al Khaimah.</p>
        <p>The project received its commercial gaming license in <strong>October 2024</strong>, becoming the first such license ever issued in the UAE. This regulatory milestone cleared the path for Wynn Resorts to complete construction and begin preparations for the grand opening.</p>
      `,
    },
    {
      id: "resort-by-numbers",
      title: "Resort By the Numbers",
      content: `
        <p>Wynn Al Marjan Island is a massive integrated resort development offering a diverse range of accommodation options and amenities:</p>
        <h3 class="text-xl font-semibold mt-6 mb-3">Accommodation</h3>
        <ul class="list-disc pl-6 space-y-2">
          <li><strong>1,217 resort rooms</strong> - Standard luxury accommodations with ocean and island views</li>
          <li><strong>297 Enclave suites</strong> - Premium suite-level accommodations with enhanced services</li>
          <li><strong>2 Royal Apartments</strong> - Ultra-exclusive residences for VIP guests</li>
          <li><strong>4 Garden Townhomes</strong> - Private villa-style accommodations with personal gardens</li>
        </ul>
        <h3 class="text-xl font-semibold mt-6 mb-3">Resort Amenities</h3>
        <ul class="list-disc pl-6 space-y-2">
          <li><strong>3.6-hectare pool complex</strong> - One of the largest resort pool areas in the region</li>
          <li><strong>15,000 sqm retail space</strong> - Luxury shopping and boutiques</li>
          <li><strong>7,500 sqm convention space</strong> - State-of-the-art meeting and event facilities</li>
          <li><strong>22 dining venues</strong> - World-class restaurants and bars</li>
          <li><strong>194,000 sq ft gaming floor</strong> - The centerpiece casino attraction</li>
        </ul>
      `,
    },
    {
      id: "casino-rules",
      title: "Casino Rules and Gaming",
      content: `
        <p>The Wynn Al Marjan Island casino will operate under regulations established by the RAK Gaming Commission, modeled on successful frameworks from other jurisdictions.</p>
        <h3 class="text-xl font-semibold mt-6 mb-3">Age Requirements</h3>
        <p>The <strong>minimum age for casino entry is 21 years old</strong>. Valid identification will be required for all guests accessing the gaming floor.</p>
        <h3 class="text-xl font-semibold mt-6 mb-3">Gaming Options</h3>
        <p>The 194,000 square foot gaming floor will feature:</p>
        <ul class="list-disc pl-6 space-y-2">
          <li><strong>Table games</strong> - Including blackjack, baccarat, roulette, and poker</li>
          <li><strong>Slot machines</strong> - A wide variety of electronic gaming options</li>
          <li><strong>High-limit rooms</strong> - Private gaming areas for VIP players</li>
        </ul>
        <h3 class="text-xl font-semibold mt-6 mb-3">Regulatory Framework</h3>
        <p>The gaming regulations are expected to follow a <strong>two-tier system similar to Singapore's model</strong>, which differentiates between tourists and residents. This approach allows for controlled gaming access while maximizing the tourism appeal of the resort.</p>
      `,
    },
    {
      id: "alcohol-policy",
      title: "Alcohol Policy",
      content: `
        <p><strong>Yes, alcohol is served throughout the resort</strong>, including in gaming areas. This is possible because Ras Al Khaimah maintains more liberal policies regarding alcohol than other emirates.</p>
        <p>Key points about alcohol at Wynn Al Marjan Island:</p>
        <ul class="list-disc pl-6 space-y-2">
          <li>Alcohol is available at all 22 dining venues</li>
          <li>Guests can drink freely throughout the resort premises</li>
          <li>Alcohol is served on the gaming floor</li>
          <li><strong>Minimum drinking age is 21 years old</strong></li>
        </ul>
        <p>Ras Al Khaimah has long been known for its more relaxed approach to alcohol licensing, making it a popular destination for visitors seeking a resort experience with full bar service.</p>
      `,
    },
    {
      id: "getting-there",
      title: "Getting There",
      content: `
        <p>Wynn Al Marjan Island is conveniently located on Al Marjan Island in Ras Al Khaimah, with easy access from Dubai and the surrounding region.</p>
        <h3 class="text-xl font-semibold mt-6 mb-3">From Dubai International Airport (DXB)</h3>
        <ul class="list-disc pl-6 space-y-2">
          <li><strong>Drive time:</strong> 45-55 minutes depending on traffic</li>
          <li><strong>Taxi fare:</strong> Approximately AED 250-300</li>
          <li><strong>Rental car:</strong> Available at DXB airport with easy highway access to RAK</li>
        </ul>
        <h3 class="text-xl font-semibold mt-6 mb-3">Ras Al Khaimah International Airport (RKT)</h3>
        <p>For guests preferring a shorter transfer, RAK International Airport is significantly closer to the resort. The airport is currently <strong>expanding its VVIP terminal</strong> to accommodate high-end travelers visiting Wynn and other luxury resorts in the emirate.</p>
        <h3 class="text-xl font-semibold mt-6 mb-3">Resort Transportation</h3>
        <p>Wynn is expected to offer premium transfer services for guests, including luxury car services from both Dubai and RAK airports.</p>
      `,
    },
  ],
  keyTakeaways: [
    "Wynn Al Marjan Island opens Spring 2027 as the UAE's first licensed casino resort",
    "$5.1 billion investment with 1,530 rooms and a 194,000 sq ft gaming floor",
    "Minimum age is 21 for both casino entry and alcohol consumption",
    "Alcohol is served freely throughout the resort including gaming areas",
    "45-55 minute drive from Dubai, with RAK airport expanding VVIP services",
  ],
  faqs: [
    {
      question: "When does Wynn Al Marjan Island open?",
      answer:
        "Wynn Al Marjan Island is scheduled to open in Spring 2027, with Q1 being the expected target. The tower topped out in December 2025 at 283 meters and 70 stories.",
    },
    {
      question: "What is the minimum age for the casino?",
      answer:
        "The minimum age for casino entry at Wynn Al Marjan Island is 21 years old. Valid identification will be required for all guests accessing the gaming floor.",
    },
    {
      question: "Can tourists drink alcohol freely?",
      answer:
        "Yes, alcohol is served throughout the resort, including at all 22 dining venues and on the gaming floor. Ras Al Khaimah has liberal policies regarding alcohol. The minimum drinking age is 21.",
    },
    {
      question: "How much did the project cost?",
      answer:
        "Wynn Al Marjan Island is a $5.1 billion USD investment, making it one of the largest hospitality developments in the UAE.",
    },
    {
      question: "How many rooms does it have?",
      answer:
        "The resort offers 1,530 rooms and suites in total, including 1,217 resort rooms, 297 Enclave suites, 2 Royal Apartments, and 4 Garden Townhomes.",
    },
  ],
  ctaTitle: "Plan Your Visit to Wynn Al Marjan Island",
  ctaButtonText: "Explore Ras Al Khaimah",
  ctaButtonUrl: "/destinations/ras-al-khaimah",
  relatedArticles: [
    {
      id: "rak-adventure-guide",
      title: "Beyond the Beach: The Ultimate RAK Adventure Guide 2026",
      slug: "rak-adventure-guide",
      excerpt: "Discover the outdoor adventures waiting in Ras Al Khaimah",
      category: "Adventure",
      readTime: "10 min read",
    },
    {
      id: "dubai-to-rak",
      title: "Dubai to Ras Al Khaimah: The 2026 Transport Guide",
      slug: "dubai-to-rak-transport",
      excerpt: "All the ways to travel between Dubai and RAK",
      category: "Transport",
      readTime: "6 min read",
    },
    {
      id: "dubai-vs-rak",
      title: "Dubai vs. Ras Al Khaimah: 2026 Holiday Comparison",
      slug: "dubai-vs-rak-comparison",
      excerpt: "Which emirate is right for your next trip?",
      category: "Comparison",
      readTime: "8 min read",
    },
    {
      id: "rak-investment",
      title: "Invest in Ras Al Khaimah: The Next Dubai?",
      slug: "rak-investment-guide",
      excerpt: "Why investors are eyeing the northern emirate",
      category: "Investment",
      readTime: "12 min read",
    },
  ],
};

export default function WynnAlMarjanGuidePage() {
  return (
    <div data-testid="page-wynn-guide" className="min-h-screen bg-white dark:bg-slate-950">
      <Helmet>
        <title>
          Wynn Al Marjan Island: Complete 2027 Guide | Opening Date, Casino Rules, Hotels | TRAVI
        </title>
        <meta
          name="description"
          content="Complete guide to Wynn Al Marjan Island - UAE's first licensed casino resort opening Spring 2027. $5.1B investment, 1,530 rooms, 194,000 sq ft casino, 22 restaurants. Everything you need to know."
        />
        <meta
          name="keywords"
          content="Wynn Al Marjan Island, Wynn UAE, Wynn casino, Ras Al Khaimah casino, UAE casino, Al Marjan Island resort, Wynn 2027, UAE gaming license"
        />
        <meta property="og:title" content="Wynn Al Marjan Island: Complete 2027 Guide" />
        <meta
          property="og:description"
          content="Everything you need to know about UAE's first licensed casino resort. Opening Spring 2027 with 1,530 rooms and a 194,000 sq ft gaming floor."
        />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${SITE_URL}/guides/wynn-al-marjan-island`} />
        <meta
          property="og:image"
          content="https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1200&h=630&fit=crop"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Wynn Al Marjan Island: Complete 2027 Guide" />
        <meta
          name="twitter:description"
          content="UAE's first licensed casino resort opening Spring 2027. Complete guide to rooms, gaming, dining, and more."
        />
        <link rel="canonical" href={`${SITE_URL}/guides/wynn-al-marjan-island`} />
      </Helmet>

      <PublicNav />

      <ArticlePage {...wynnGuideData} />

      <PublicFooter />
    </div>
  );
}

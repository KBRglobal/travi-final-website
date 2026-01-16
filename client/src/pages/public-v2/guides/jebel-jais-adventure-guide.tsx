import { Helmet } from "react-helmet-async";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import ArticlePage, { ArticlePageProps } from "@/pages/article-page";

const jebelJaisGuideData: ArticlePageProps = {
  title: "Jebel Jais Adventure Guide: UAE's Ultimate Mountain Escape 2026",
  slug: "jebel-jais-adventure",
  heroImage: {
    src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&h=1080&fit=crop",
    alt: "Jebel Jais mountain peak in Ras Al Khaimah, UAE - highest point in the United Arab Emirates",
  },
  category: "Travel Guides",
  publishedAt: "2026-01-10",
  updatedAt: "2026-01-10",
  author: {
    name: "TRAVI Editorial",
    role: "Travel Experts",
  },
  readTime: "8 min read",
  excerpt:
    "If you think the UAE is just shopping malls and skyscrapers, you haven't been to Ras Al Khaimah (RAK). While Dubai reaches for the sky with steel and glass, RAK does it with raw, jagged mountains and terracotta deserts. Known officially as the \"Nature Emirate,\" RAK has quietly transformed into the region's adventure capital.",
  quickInfo: {
    location: "Jebel Jais, Ras Al Khaimah, UAE",
    duration: "Full day recommended",
    bestTime: "October - April (cooler months)",
  },
  sections: [
    {
      id: "jebel-jais-peak",
      title: "1. Jebel Jais - UAE's Highest Peak",
      content: `
        <p>Standing at <strong>1,934 meters</strong>, Jebel Jais is the highest peak in the United Arab Emirates. The mountain offers temperatures that are <strong>10°C cooler than sea level</strong>, making it a refreshing escape from the desert heat below.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">Jais Flight: World's Longest Zipline</h3>
        <p>Experience the thrill of the <strong>world's longest zipline</strong>, stretching an incredible <strong>2.83km</strong> across the Jebel Jais mountains. Riders reach speeds of up to <strong>160 kmph</strong> in a superman-style position, soaring above the dramatic mountain landscape.</p>
        <p><strong>Pro Tip:</strong> Book the earliest 9:00 AM slot for morning mist - the views are absolutely spectacular with the early light filtering through the mountain haze.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">Jais Sledder: Mountain Coaster</h3>
        <p>The Jais Sledder is a thrilling mountain coaster that winds through the rocky terrain at <strong>40 kmph</strong>. This family-friendly attraction is perfect for adventure seekers of all ages.</p>
        <ul class="list-disc pl-6 space-y-2">
          <li><strong>Cost:</strong> AED 50 per ride</li>
          <li><strong>Age requirement:</strong> Kids must be 3+ years old with an accompanying adult</li>
          <li><strong>Height requirement:</strong> Solo riders must be 1.35m or taller</li>
        </ul>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">1484 by Puro: UAE's Highest Restaurant</h3>
        <p><strong>1484 by Puro</strong> is the UAE's highest restaurant, named after its elevation in meters. The restaurant serves international comfort food with panoramic mountain views.</p>
        <p><strong>Important:</strong> Reservations are mandatory and should be made weeks in advance, especially during winter weekends when demand peaks.</p>
      `,
    },
    {
      id: "hidden-gems",
      title: "2. Hidden Gems",
      content: `
        <h3 class="text-xl font-semibold mt-6 mb-3">Suwaidi Pearls (Al Rams Village)</h3>
        <p>Discover the <strong>only pearl farm in the UAE</strong> at Suwaidi Pearls in Al Rams village. This unique experience takes you on a traditional dhow boat journey through scenic mangroves where you can spot flamingos and turtles.</p>
        <p>The highlight? You get to <strong>open your own oyster and keep the pearl</strong> as a souvenir of your visit.</p>
        <p><strong>2026 Update:</strong> Suwaidi Pearls now offers mangrove kayaking tours, adding another dimension to this authentic experience.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">Al Jazirat Al Hamra: The Ghost Town</h3>
        <p>Step back in time at <strong>Al Jazirat Al Hamra</strong>, a pearl-diving village that was abandoned in the 1960s. Today, it serves as an open-air museum showcasing traditional coral-stone architecture.</p>
        <ul class="list-disc pl-6 space-y-2">
          <li><strong>Entry:</strong> Free</li>
          <li><strong>Best time to visit:</strong> Golden hour around 4:30 PM for the most atmospheric photos</li>
        </ul>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">Dhayah Fort</h3>
        <p>Climb to <strong>Dhayah Fort</strong>, the only hilltop fort in the UAE. The journey involves <strong>239 steps</strong> but rewards you with stunning 360-degree views of the surrounding landscape.</p>
        <p>This historic site holds significant importance as the location of the <strong>1819 resistance against the British</strong>, making it both a scenic and culturally enriching destination.</p>
      `,
    },
    {
      id: "hardcore-hiking",
      title: "3. Hardcore Hiking",
      content: `
        <h3 class="text-xl font-semibold mt-6 mb-3">Wadi Shawka</h3>
        <p><strong>Wadi Shawka</strong> offers hiking options for all skill levels. Beginners can enjoy gentle trails along the wadi, while experienced hikers can tackle challenging loops that wind through the rugged terrain.</p>
        <p>The most famous route is the <strong>"Stairway to Heaven" trail</strong> - this challenging hike is recommended for experienced hikers only due to its steep ascents and technical sections.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">Bear Grylls Explorers Camp</h3>
        <p>For the ultimate adventure experience, the <strong>Bear Grylls Explorers Camp</strong> on Jebel Jais offers <strong>24-hour survival courses</strong> that teach wilderness skills in the dramatic mountain setting.</p>
        <p>The camp also provides rustic cabin accommodation for those who want to extend their adventure and wake up surrounded by the Hajar Mountains.</p>
      `,
    },
    {
      id: "2026-events",
      title: "4. 2026 Events",
      content: `
        <p>Ras Al Khaimah hosts several major adventure events throughout the year. Here are the key dates for 2026:</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">February 2026</h3>
        <ul class="list-disc pl-6 space-y-2">
          <li><strong>HIGHLANDER Adventure:</strong> A long-distance hiking event that challenges participants to traverse the stunning mountain trails of Jebel Jais</li>
          <li><strong>RAK Half Marathon:</strong> Known as the "fastest half marathon in the world" thanks to its flat course, attracting runners from around the globe</li>
        </ul>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">March 2026</h3>
        <ul class="list-disc pl-6 space-y-2">
          <li><strong>RAK Art Festival:</strong> Features outdoor art installations in the atmospheric ghost town of Al Jazirat Al Hamra, blending contemporary art with historic architecture</li>
        </ul>
      `,
    },
    {
      id: "practical-info",
      title: "Practical Information",
      content: `
        <p><strong>Car rental is highly recommended</strong> for exploring Ras Al Khaimah. The emirate is spread out, and attractions are located across different areas that aren't easily accessible by public transport.</p>
        <p>Public transport options are limited compared to Dubai, so having your own vehicle gives you the freedom to explore at your own pace and access remote hiking spots and scenic viewpoints.</p>
      `,
    },
  ],
  keyTakeaways: [
    "Jebel Jais at 1,934m is UAE's highest peak, 10°C cooler than sea level",
    "Experience the world's longest zipline (2.83km) at speeds up to 160 kmph",
    "Discover hidden gems like Suwaidi Pearls farm and the ghost town of Al Jazirat Al Hamra",
    "Hardcore hikers can tackle Wadi Shawka trails or take survival courses at Bear Grylls Camp",
    "Car rental is essential - RAK is spread out with limited public transport",
  ],
  faqs: [
    {
      question: "How high is Jebel Jais?",
      answer:
        "Jebel Jais stands at 1,934 meters, making it the highest peak in the United Arab Emirates. The summit is approximately 10°C cooler than sea level, providing a refreshing escape from the desert heat.",
    },
    {
      question: "How long is the Jais Flight zipline?",
      answer:
        "The Jais Flight zipline stretches 2.83 kilometers, making it the world's longest zipline. Riders can reach speeds of up to 160 kmph in a superman-style position.",
    },
    {
      question: "Is Jais Sledder suitable for children?",
      answer:
        "Yes, Jais Sledder is family-friendly. Children aged 3 and above can ride with an accompanying adult. Solo riders must be at least 1.35m tall. Each ride costs AED 50.",
    },
    {
      question: "Do I need to book 1484 by Puro restaurant in advance?",
      answer:
        "Yes, reservations are mandatory for 1484 by Puro, UAE's highest restaurant. During winter weekends, you should book weeks in advance due to high demand.",
    },
    {
      question: "What is the best time to visit Al Jazirat Al Hamra ghost town?",
      answer:
        "The best time to visit is around golden hour (4:30 PM) for the most atmospheric experience and photographs. Entry to the ghost town is free.",
    },
    {
      question: "Do I need a car to explore Ras Al Khaimah?",
      answer:
        "Yes, car rental is highly recommended. RAK is spread out and public transport options are limited compared to Dubai. Having your own vehicle allows you to access remote hiking spots and attractions at your own pace.",
    },
  ],
  ctaTitle: "Plan Your Jebel Jais Adventure",
  ctaButtonText: "Explore Ras Al Khaimah",
  ctaButtonUrl: "/destinations/ras-al-khaimah",
  relatedArticles: [
    {
      id: "wynn-guide",
      title: "Wynn Al Marjan Island: The Complete 2027 Guide",
      slug: "wynn-al-marjan-island",
      excerpt: "Everything you need to know about UAE's first licensed casino resort",
      category: "Travel Guides",
      readTime: "12 min read",
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

export default function JebelJaisAdventureGuidePage() {
  return (
    <div data-testid="page-jebel-jais-guide" className="min-h-screen bg-white dark:bg-slate-950">
      <Helmet>
        <title>Jebel Jais Adventure Guide 2026: Zipline, Hiking, Hidden Gems | TRAVI</title>
        <meta
          name="description"
          content="Complete guide to Jebel Jais adventures in Ras Al Khaimah. World's longest zipline (2.83km), mountain hiking, Suwaidi Pearls, ghost towns, and Bear Grylls Camp. UAE's highest peak at 1,934m."
        />
        <meta
          name="keywords"
          content="Jebel Jais, Ras Al Khaimah, Jais Flight zipline, UAE hiking, 1484 by Puro, Suwaidi Pearls, Al Jazirat Al Hamra, Dhayah Fort, Bear Grylls Camp, RAK adventure"
        />
        <meta property="og:title" content="Jebel Jais Adventure Guide 2026: UAE's Ultimate Mountain Escape" />
        <meta
          property="og:description"
          content="Discover Ras Al Khaimah's adventure capital. World's longest zipline, mountain hiking, pearl farms, ghost towns, and more at UAE's highest peak."
        />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://travi.world/guides/jebel-jais-adventure" />
        <meta
          property="og:image"
          content="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&h=630&fit=crop"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Jebel Jais Adventure Guide 2026" />
        <meta
          name="twitter:description"
          content="Complete guide to UAE's highest peak - ziplines, hiking, hidden gems, and adventure activities in Ras Al Khaimah."
        />
        <link rel="canonical" href="https://travi.world/guides/jebel-jais-adventure" />
      </Helmet>

      <PublicNav />

      <ArticlePage {...jebelJaisGuideData} />

      <PublicFooter />
    </div>
  );
}

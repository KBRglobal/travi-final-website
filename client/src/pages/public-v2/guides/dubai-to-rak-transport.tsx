import { Helmet } from "react-helmet-async";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import ArticlePage, { ArticlePageProps } from "@/pages/article-page";

const dubaiToRakTransportData: ArticlePageProps = {
  title: "Dubai to Ras Al Khaimah: The 2026 Transport Guide",
  slug: "dubai-to-rak-transport",
  heroImage: {
    src: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&h=1080&fit=crop",
    alt: "Highway road in UAE desert landscape connecting Dubai to Ras Al Khaimah",
  },
  category: "Transport",
  publishedAt: "2026-01-10",
  updatedAt: "2026-01-10",
  author: {
    name: "TRAVI Editorial",
    role: "Travel Experts",
  },
  readTime: "6 min read",
  excerpt:
    "You have booked the hotel, you are dreaming of the zipline, but there is one final logistical hurdle: How do you actually get to Ras Al Khaimah? Unlike Dubai, RAK does not have a metro system. In 2026, getting there has never been easier.",
  quickInfo: {
    location: "Dubai to Ras Al Khaimah, UAE",
    duration: "45-90 minutes depending on transport",
    bestTime: "Early morning or evening to avoid traffic",
  },
  sections: [
    {
      id: "rak-shuttle",
      title: "Option 1: RAK Shuttle (Best for Tourists)",
      content: `
        <p>The <strong>RAK Shuttle</strong> is the most convenient option for tourists arriving at Dubai International Airport. This dedicated service connects the airport directly to major Ras Al Khaimah resorts.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">Key Details</h3>
        <ul class="list-disc pl-6 space-y-2">
          <li><strong>Cost:</strong> AED 30-40 per person</li>
          <li><strong>Pickup Locations:</strong> DXB Terminal 1 and Terminal 3</li>
          <li><strong>Drop-off Locations:</strong> Major resorts including DoubleTree Marjan, Rixos Bab Al Bahr, Waldorf Astoria, and city center</li>
        </ul>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">Benefits</h3>
        <ul class="list-disc pl-6 space-y-2">
          <li>Free Wi-Fi onboard</li>
          <li>Direct service - no transfers needed</li>
          <li>No haggling required - fixed pricing</li>
        </ul>
        
        <p class="mt-4"><strong>Important:</strong> Pre-booking is required online. Make sure to book your shuttle before arriving at the airport.</p>
      `,
    },
    {
      id: "public-bus",
      title: "Option 2: Public Bus (Budget Choice)",
      content: `
        <p>For budget-conscious travelers, the <strong>public bus service</strong> offers an affordable way to reach Ras Al Khaimah from Dubai.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">Route Information</h3>
        <ul class="list-disc pl-6 space-y-2">
          <li><strong>Route:</strong> Dubai Union Bus Station → Al Hamra Bus Station (RAK)</li>
          <li><strong>Cost:</strong> AED 20-27 (one way)</li>
          <li><strong>Timings:</strong> Daily from 7:30 AM to 11:00 PM</li>
          <li><strong>Frequency:</strong> Usually every hour</li>
        </ul>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">Payment Options</h3>
        <ul class="list-disc pl-6 space-y-2">
          <li>Cash payment accepted onboard</li>
          <li>E-SAQR Card (RAK's equivalent of Dubai's Nol card)</li>
        </ul>
        
        <p class="mt-4"><strong>Tip:</strong> The E-SAQR Card can be purchased at bus stations and offers a slightly lower fare than cash payment.</p>
      `,
    },
    {
      id: "rental-car",
      title: "Option 3: Rental Car (Recommended)",
      content: `
        <p><strong>Renting a car</strong> is the recommended option for most travelers visiting Ras Al Khaimah. It offers maximum flexibility and is essential for exploring the emirate's spread-out attractions.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">Driving Details</h3>
        <ul class="list-disc pl-6 space-y-2">
          <li><strong>Drive Time:</strong> 45-60 minutes from Dubai</li>
          <li><strong>Route:</strong> Sheikh Mohammed Bin Zayed Road (E311)</li>
          <li><strong>Road Conditions:</strong> Wide, well-lit, and safe</li>
          <li><strong>Parking:</strong> Plentiful and often free in RAK</li>
        </ul>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">Vehicle Choice</h3>
        <p><strong>Pro Tip:</strong> A standard sedan is perfectly fine for reaching Jebel Jais - the road is fully paved. However, an SUV provides more comfort on the winding mountain corners and better handles the occasional gravel roads to hidden attractions.</p>
      `,
    },
    {
      id: "getting-around-rak",
      title: "Getting Around RAK",
      content: `
        <p>Once you arrive in Ras Al Khaimah, here are your options for getting around the emirate:</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">Careem (Hala Taxi)</h3>
        <p>The <strong>main ride-hailing app</strong> in RAK. Offers fixed pricing and accepts card payments, making it convenient and predictable for tourists.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">Uber</h3>
        <p>Available in Ras Al Khaimah but expect <strong>longer wait times</strong> and <strong>higher prices</strong> compared to Dubai. Limited driver availability in remote areas.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">Sayr App</h3>
        <p><strong>RAKTA's official journey planning app</strong> for public transport. Useful for checking bus schedules and planning routes within the emirate.</p>
        
        <h3 class="text-xl font-semibold mt-6 mb-3">Standard Taxis</h3>
        <ul class="list-disc pl-6 space-y-2">
          <li>Look for silver cars with the <strong>RAKTA logo</strong></li>
          <li>Metered service</li>
          <li>Flagfall: AED 3-4</li>
        </ul>
      `,
    },
  ],
  keyTakeaways: [
    "RAK Shuttle is best for tourists: AED 30-40, direct from DXB to major resorts",
    "Public bus is the budget option: AED 20-27 from Dubai Union Bus Station",
    "Rental car is recommended for flexibility - 45-60 minute drive on E311",
    "Careem (Hala Taxi) is the main ride-hailing app in RAK with fixed pricing",
    "Standard sedan works fine for Jebel Jais - the mountain road is fully paved",
  ],
  faqs: [
    {
      question: "Can I take an Uber from Dubai to Ras Al Khaimah?",
      answer:
        "Yes, you can take an Uber from Dubai to RAK. The cost is approximately AED 300-400 (around $80-110 USD). However, be aware that booking a return trip via Uber can be harder due to limited driver availability in RAK.",
    },
    {
      question: "Is there a metro in Ras Al Khaimah?",
      answer:
        "No, Ras Al Khaimah does not have a metro system. The Etihad Rail project is in progress but is not expected to offer passenger travel services by 2026.",
    },
    {
      question: "Can I do a day trip to Oman (Musandam) from RAK?",
      answer:
        "Yes, the Musandam peninsula in Oman is just 30-40 minutes north of Ras Al Khaimah. You will need your passport for the border crossing and \"Orange Card\" car insurance if you're driving a rental car into Oman.",
    },
  ],
  ctaTitle: "Plan Your RAK Adventure",
  ctaButtonText: "Explore Ras Al Khaimah",
  ctaButtonUrl: "/destinations/ras-al-khaimah",
  relatedArticles: [
    {
      id: "jebel-jais-guide",
      title: "Jebel Jais Adventure Guide: UAE's Ultimate Mountain Escape 2026",
      slug: "jebel-jais-adventure",
      excerpt: "World's longest zipline, mountain hiking, and hidden gems at UAE's highest peak",
      category: "Travel Guides",
      readTime: "8 min read",
    },
    {
      id: "wynn-guide",
      title: "Wynn Al Marjan Island: The Complete 2027 Guide",
      slug: "wynn-al-marjan-island",
      excerpt: "Everything you need to know about UAE's first licensed casino resort",
      category: "Travel Guides",
      readTime: "12 min read",
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

export default function DubaiToRakTransportPage() {
  return (
    <div data-testid="page-transport-guide" className="min-h-screen bg-white dark:bg-slate-950">
      <Helmet>
        <title>Dubai to Ras Al Khaimah: The 2026 Transport Guide | TRAVI</title>
        <meta
          name="description"
          content="Complete guide on how to get from Dubai to Ras Al Khaimah in 2026. RAK Shuttle, public bus, rental car options. Plus getting around RAK with Careem, Uber, and taxis."
        />
        <meta
          name="keywords"
          content="Dubai to Ras Al Khaimah, RAK transport, RAK Shuttle, Dubai to RAK bus, rental car RAK, Careem RAK, Uber RAK, E311 highway, UAE transport"
        />
        <meta property="og:title" content="Dubai to Ras Al Khaimah: The 2026 Transport Guide" />
        <meta
          property="og:description"
          content="All the ways to travel between Dubai and RAK. Shuttle services, public bus, rental cars, and local transport options."
        />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://travi.world/guides/dubai-to-rak-transport" />
        <meta
          property="og:image"
          content="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=630&fit=crop"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Dubai to Ras Al Khaimah: The 2026 Transport Guide" />
        <meta
          name="twitter:description"
          content="Complete transport guide from Dubai to RAK - shuttles, buses, rental cars, and local transport."
        />
        <link rel="canonical" href="https://travi.world/guides/dubai-to-rak-transport" />
      </Helmet>

      <PublicNav />

      <ArticlePage {...dubaiToRakTransportData} />

      <PublicFooter />
    </div>
  );
}

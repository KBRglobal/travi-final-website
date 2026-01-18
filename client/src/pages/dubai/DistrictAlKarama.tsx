import { ShoppingBag, Train, UtensilsCrossed, MapPin, Building, Wallet } from "lucide-react";
import { DubaiDistrictTemplate } from "./templates/DubaiDistrictTemplate";

export default function DistrictAlKarama() {
  return (
    <DubaiDistrictTemplate
      title="Al Karama Dubai Guide 2026 - Shopping & Local Culture"
      metaDescription="Explore Al Karama, Dubai's vibrant multicultural neighborhood. Guide to Karama Market, restaurants, Metro access, affordable apartments, and local experiences."
      canonicalPath="/dubai/al-karama"
      keywords={["al karama dubai", "karama market", "karama shopping", "karama restaurants", "karama apartments", "cheap shopping dubai"]}
      breadcrumbs={[
        { label: "Districts", href: "/dubai/districts" },
        { label: "Al Karama", href: "/dubai/al-karama" }
      ]}
      hero={{
        title: "Al Karama",
        subtitle: "A vibrant, multicultural neighborhood known for affordable shopping, diverse cuisine, and authentic local vibes",
        backgroundImage: "/images/categories/dubai/dubai-old-town-wind-towers-colorful-traditional-architecture.webp",
        badges: [
          { text: "Shopping", variant: "default" },
          { text: "Metro Access", variant: "secondary" },
          { text: "Affordable", variant: "outline" }
        ]
      }}
      stats={[
        { value: "AED 35K", label: "Avg Studio Rent", subtext: "Annual rent" },
        { value: "2", label: "Metro Stations", subtext: "Red Line access" },
        { value: "500+", label: "Shops", subtext: "Karama Market" },
        { value: "AED 750", label: "Per Sqft", subtext: "Average price" }
      ]}
      statsTitle="Al Karama Overview"
      statsSubtitle="Key facts about this vibrant multicultural neighborhood"
      highlights={[
        {
          icon: ShoppingBag,
          title: "Karama Market",
          description: "Browse 500+ shops selling textiles, clothing, electronics, and souvenirs at bargain prices."
        },
        {
          icon: Train,
          title: "Metro Connected",
          description: "Two Metro stations (ADCB and Al Karama) provide excellent connectivity via the Red Line."
        },
        {
          icon: UtensilsCrossed,
          title: "Diverse Cuisine",
          description: "Enjoy authentic Indian, Pakistani, Filipino, and Middle Eastern restaurants at affordable prices."
        },
        {
          icon: MapPin,
          title: "Central Location",
          description: "Just 10 minutes from Downtown Dubai and Bur Dubai, with easy access to major destinations."
        },
        {
          icon: Wallet,
          title: "Affordable Living",
          description: "Budget-friendly apartments ideal for those seeking value without sacrificing location."
        },
        {
          icon: Building,
          title: "Local Character",
          description: "Experience authentic Dubai life in a neighborhood that retains its local charm."
        }
      ]}
      highlightsTitle="What Makes Al Karama Special"
      nearbyDistricts={[
        { name: "Old Dubai", slug: "old-dubai", description: "Gold Souk & heritage" },
        { name: "Business Bay", slug: "business-bay", description: "Dubai Canal & CBD" },
        { name: "Downtown Dubai", slug: "downtown-dubai", description: "Burj Khalifa & Dubai Mall" }
      ]}
      faqs={[
        { 
          question: "What is Al Karama famous for?", 
          answer: "Al Karama is famous for its market selling affordable goods, replica items, textiles, and souvenirs. It's also known for diverse international restaurants, particularly Indian, Filipino, and Pakistani cuisine." 
        },
        { 
          question: "Is Al Karama a good area?", 
          answer: "Al Karama is ideal for budget-conscious residents who want central location, Metro access, affordable rent, and multicultural dining. It's not luxury but offers excellent value and authentic local experiences." 
        },
        { 
          question: "How to get to Karama from Dubai Mall?", 
          answer: "Take the Dubai Metro Red Line from Burj Khalifa/Dubai Mall station to ADCB station (Al Karama). It's just 3 stops, about 8 minutes, and costs 4-6 AED depending on your Nol card type." 
        },
        {
          question: "Is bargaining possible in Karama?",
          answer: "Yes, bargaining is expected in Karama Market shops. You can typically negotiate 20-40% off the initial asking price, especially for bulk purchases or cash payments."
        },
        {
          question: "What is the best time to visit Karama Market?",
          answer: "Visit in the evening (4-9 PM) when shops are fully open and temperatures are cooler. Avoid Friday mornings when some shops may be closed. Weekday evenings are less crowded than weekends."
        }
      ]}
      cta={{
        title: "Explore Al Karama",
        description: "Discover affordable shopping, authentic cuisine, and budget-friendly living in this vibrant neighborhood.",
        primaryAction: { label: "Shopping Guide", href: "/destinations/dubai/districts/al-karama#shopping" },
        secondaryAction: { label: "View Properties", href: "/destinations/dubai/districts/al-karama#properties" }
      }}
    />
  );
}

import { TrendingUp, Home, TreePine, ShoppingCart, Building, Users } from "lucide-react";
import { DubaiDistrictTemplate } from "./templates/DubaiDistrictTemplate";

export default function DistrictJVC() {
  return (
    <DubaiDistrictTemplate
      title="JVC Dubai Guide 2026 - Jumeirah Village Circle"
      metaDescription="Discover JVC (Jumeirah Village Circle), one of Dubai's most affordable and family-friendly communities. Guide to apartments, villas, amenities, and investment in JVC."
      canonicalPath="/dubai/jvc"
      keywords={["jvc dubai", "jumeirah village circle", "jvc apartments", "jvc villas", "jvc investment", "jvc rental yield"]}
      breadcrumbs={[
        { label: "Districts", href: "/dubai/districts" },
        { label: "JVC", href: "/dubai/jvc" }
      ]}
      hero={{
        title: "Jumeirah Village Circle",
        subtitle: "Dubai's top choice for affordable family living with excellent rental yields and growing amenities",
        backgroundImage: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { text: "Affordable", variant: "default" },
          { text: "High ROI", variant: "secondary" },
          { text: "Family-Friendly", variant: "outline" }
        ]
      }}
      stats={[
        { value: "800+", label: "Buildings", subtext: "Residential community" },
        { value: "8-10%", label: "Rental Yield", subtext: "Dubai's highest" },
        { value: "AED 40K", label: "Studio Rent", subtext: "Average annual" },
        { value: "AED 850", label: "Per Sqft", subtext: "Average price" }
      ]}
      statsTitle="JVC Overview"
      statsSubtitle="Key facts about Dubai's affordable investment hotspot"
      highlights={[
        {
          icon: TrendingUp,
          title: "Highest ROI",
          description: "Consistently delivers Dubai's highest rental yields at 8-10%, making it a top investment choice."
        },
        {
          icon: Home,
          title: "Affordable Living",
          description: "Spacious apartments and villas at prices significantly lower than premium waterfront areas."
        },
        {
          icon: Users,
          title: "Family Community",
          description: "Designed for families with parks, playgrounds, schools, and community-oriented amenities."
        },
        {
          icon: TreePine,
          title: "Green Spaces",
          description: "Well-planned community with parks, landscaped areas, and jogging tracks throughout."
        },
        {
          icon: ShoppingCart,
          title: "Growing Amenities",
          description: "Supermarkets, restaurants, cafes, and retail continue to expand across the community."
        },
        {
          icon: Building,
          title: "Modern Buildings",
          description: "Newer developments offer modern amenities including pools, gyms, and covered parking."
        }
      ]}
      highlightsTitle="What Makes JVC Special"
      nearbyDistricts={[
        { name: "Dubai Marina", slug: "dubai-marina", description: "Waterfront living" },
        { name: "Al Barsha", slug: "al-barsha", description: "Mall of Emirates" },
        { name: "Dubai Hills", slug: "dubai-hills", description: "Premium green community" }
      ]}
      faqs={[
        { 
          question: "Is JVC a good investment in Dubai?", 
          answer: "JVC consistently offers Dubai's highest rental yields, averaging 8-10%. Affordable property prices, growing demand from families, and continuous development make it attractive for investors seeking income-generating properties." 
        },
        { 
          question: "What is JVC like to live in?", 
          answer: "JVC is a well-planned community with parks, schools, supermarkets, and fitness facilities. It's family-oriented, quieter than tourist areas, and offers spacious apartments at affordable rents. Traffic can be challenging during peak hours." 
        },
        { 
          question: "How far is JVC from Dubai Marina?", 
          answer: "JVC is approximately 10km from Dubai Marina, about 15-20 minutes by car. The area is connected via Al Khail Road and Sheikh Mohammed Bin Zayed Road." 
        },
        {
          question: "Does JVC have Metro access?",
          answer: "JVC doesn't have a Metro station within the community. The nearest stations are DMCC (Dubai Marina) and Mall of the Emirates. Most residents rely on cars, taxis, or ride-sharing apps."
        },
        {
          question: "Is JVC suitable for expats?",
          answer: "Yes, JVC is very popular with expat families due to its affordability, community feel, and growing amenities. The diverse population includes families from South Asia, Europe, Middle East, and beyond."
        }
      ]}
      cta={{
        title: "Invest in JVC's High Returns",
        description: "Maximize your rental income with affordable properties in Dubai's highest-yielding community.",
        primaryAction: { label: "View Properties", href: "/destinations/dubai/off-plan/jvc" },
        secondaryAction: { label: "ROI Calculator", href: "/dubai/tools/roi-calculator" }
      }}
    />
  );
}

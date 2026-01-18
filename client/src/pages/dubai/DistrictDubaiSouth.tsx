import { Plane, Building2, TrendingUp, Train, Landmark, Home } from "lucide-react";
import { DubaiDistrictTemplate } from "./templates/DubaiDistrictTemplate";

export default function DistrictDubaiSouth() {
  return (
    <DubaiDistrictTemplate
      title="Dubai South Guide 2026 - Expo City & Airport District"
      metaDescription="Discover Dubai South, the city within a city near Al Maktoum Airport. Guide to Expo City, affordable housing, and investment in Dubai South."
      canonicalPath="/destinations/dubai/districts/dubai-south"
      keywords={["dubai south", "expo city dubai", "al maktoum airport", "dubai south apartments", "dubai south villas", "expo dubai"]}
      breadcrumbs={[
        { label: "Districts", href: "/destinations/dubai/districts" },
        { label: "Dubai South", href: "/destinations/dubai/districts/dubai-south" }
      ]}
      hero={{
        title: "Dubai South",
        subtitle: "A self-contained city designed around Al Maktoum International Airport and the legacy of Expo 2020",
        backgroundImage: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { text: "Expo City", variant: "default" },
          { text: "Airport District", variant: "secondary" },
          { text: "Affordable", variant: "outline" }
        ]
      }}
      stats={[
        { value: "145 sq km", label: "Total Area", subtext: "City within a city" },
        { value: "1M", label: "Future Population", subtext: "Planned capacity" },
        { value: "9%", label: "Rental Yield", subtext: "High ROI potential" },
        { value: "AED 800", label: "Per Sqft", subtext: "Average price" }
      ]}
      statsTitle="Dubai South Overview"
      statsSubtitle="Key facts about Dubai's city of the future"
      highlights={[
        {
          icon: Landmark,
          title: "Expo City Dubai",
          description: "The legacy of Expo 2020 transformed into a sustainable district with museums, events, and attractions."
        },
        {
          icon: Plane,
          title: "Al Maktoum Airport",
          description: "Located next to the future world's largest airport, designed to handle 160 million passengers annually."
        },
        {
          icon: TrendingUp,
          title: "Affordable Entry",
          description: "One of Dubai's most affordable investment opportunities with strong government backing and growth potential."
        },
        {
          icon: Train,
          title: "Route 2020 Metro",
          description: "Connected to Dubai's Metro network via the Route 2020 extension linking Expo City to the main network."
        },
        {
          icon: Building2,
          title: "Mixed-Use Districts",
          description: "Includes residential, commercial, logistics, aviation, and humanitarian zones for diverse opportunities."
        },
        {
          icon: Home,
          title: "The Residential District",
          description: "Affordable apartments, villas, and townhouses in master-planned communities with modern amenities."
        }
      ]}
      highlightsTitle="What Makes Dubai South Special"
      nearbyDistricts={[
        { name: "JVC", slug: "jvc", description: "Affordable family living" },
        { name: "Dubai Hills", slug: "dubai-hills", description: "Premium green community" },
        { name: "Al Barsha", slug: "al-barsha", description: "Mall of Emirates" }
      ]}
      faqs={[
        { 
          question: "What is Dubai South?", 
          answer: "Dubai South is a 145 sq km master-planned city near Al Maktoum International Airport. It encompasses Expo City Dubai, residential districts, logistics zones, and commercial areas, designed to eventually house 1 million people." 
        },
        { 
          question: "Is Dubai South a good place to invest?", 
          answer: "Dubai South offers affordable entry points, strong government backing, proximity to the future world's largest airport, and Expo City legacy developments. It's ideal for long-term investors and first-time buyers." 
        },
        { 
          question: "How far is Dubai South from Dubai city center?", 
          answer: "Dubai South is approximately 40km from Downtown Dubai, about 35-45 minutes by car via Sheikh Mohammed Bin Zayed Road. The Route 2020 Metro extension connects Expo City to the main network." 
        },
        {
          question: "What is Expo City Dubai?",
          answer: "Expo City Dubai is the legacy development on the former Expo 2020 site. It features Terra sustainability pavilion, event venues, the Al Wasl Dome, and is being developed into a business and entertainment district."
        },
        {
          question: "Is Dubai South suitable for families?",
          answer: "Dubai South is developing family-friendly communities with schools, parks, and community facilities. It's best suited for those who work in the area or don't need daily access to central Dubai."
        }
      ]}
      cta={{
        title: "Invest in Dubai's Future City",
        description: "Take advantage of affordable entry points in one of Dubai's most ambitious mega-developments.",
        primaryAction: { label: "View Properties", href: "/destinations/dubai/districts/dubai-south#properties" },
        secondaryAction: { label: "Expo City Guide", href: "/destinations/dubai/attractions/expo-city" }
      }}
    />
  );
}

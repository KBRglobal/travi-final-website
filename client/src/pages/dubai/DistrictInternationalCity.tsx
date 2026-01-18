import { Home, ShoppingCart, Globe, Building, MapPin, Wallet } from "lucide-react";
import { DubaiDistrictTemplate } from "./templates/DubaiDistrictTemplate";

export default function DistrictInternationalCity() {
  return (
    <DubaiDistrictTemplate
      title="International City Dubai Guide 2026 - Affordable Living"
      metaDescription="Discover International City, one of Dubai's most affordable communities. Guide to themed clusters, Dragon Mart, apartments, and budget-friendly living."
      canonicalPath="/destinations/dubai/districts/international-city"
      keywords={["international city dubai", "dragon mart dubai", "international city apartments", "cheap rent dubai", "affordable dubai", "budget dubai living"]}
      breadcrumbs={[
        { label: "Districts", href: "/destinations/dubai/districts" },
        { label: "International City", href: "/destinations/dubai/districts/international-city" }
      ]}
      hero={{
        title: "International City",
        subtitle: "Dubai's most affordable residential community with themed architecture and Dragon Mart shopping",
        backgroundImage: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { text: "Budget-Friendly", variant: "default" },
          { text: "Dragon Mart", variant: "secondary" },
          { text: "Multicultural", variant: "outline" }
        ]
      }}
      stats={[
        { value: "AED 18K", label: "Studio Rent", subtext: "Cheapest in Dubai" },
        { value: "4,000+", label: "Dragon Mart Stores", subtext: "Wholesale hub" },
        { value: "10+", label: "Themed Clusters", subtext: "Global architecture" },
        { value: "AED 500", label: "Per Sqft", subtext: "Average price" }
      ]}
      statsTitle="International City Overview"
      statsSubtitle="Key facts about Dubai's most affordable community"
      highlights={[
        {
          icon: Wallet,
          title: "Lowest Rents",
          description: "Dubai's most affordable rents with studios from AED 18,000 and 1-bedrooms from AED 28,000 annually."
        },
        {
          icon: ShoppingCart,
          title: "Dragon Mart",
          description: "Shop at the largest Chinese trading hub outside China with over 4,000 stores selling wholesale goods."
        },
        {
          icon: Globe,
          title: "Themed Clusters",
          description: "Explore China, England, France, Greece, and other country-themed residential clusters."
        },
        {
          icon: Building,
          title: "Dense Community",
          description: "A densely populated multicultural community with residents from across the globe."
        },
        {
          icon: Home,
          title: "Investment Value",
          description: "Low entry prices offer investors excellent rental yields and capital appreciation potential."
        },
        {
          icon: MapPin,
          title: "Growing Area",
          description: "Continuous development improving infrastructure, retail, and community facilities."
        }
      ]}
      highlightsTitle="What Makes International City Special"
      nearbyDistricts={[
        { name: "Dubai South", slug: "dubai-south", description: "Expo City & airport" },
        { name: "JVC", slug: "jvc", description: "Family-friendly community" },
        { name: "Al Karama", slug: "al-karama", description: "Shopping & dining" }
      ]}
      faqs={[
        { 
          question: "Is International City safe?", 
          answer: "International City is generally safe like most of Dubai. It's a densely populated, multicultural community popular with budget-conscious residents. Standard precautions apply, and there's regular police patrol." 
        },
        { 
          question: "What is Dragon Mart?", 
          answer: "Dragon Mart is the largest Chinese trading hub outside of China, located in International City. It features over 4,000 stores selling wholesale and retail goods from furniture to electronics at competitive prices." 
        },
        { 
          question: "How cheap is rent in International City?", 
          answer: "International City offers Dubai's cheapest rents. Studios from AED 18,000/year, 1-bedrooms from AED 28,000/year. It's ideal for those prioritizing savings over luxury amenities." 
        },
        {
          question: "What are the downsides of International City?",
          answer: "International City has limited Metro access, can experience traffic congestion, and lacks some amenities found in premium areas. The buildings are older, and maintenance varies. It's best for budget-conscious residents."
        },
        {
          question: "Is International City good for investment?",
          answer: "Yes, for budget investors. Low property prices and strong rental demand from budget tenants result in good yields. However, appreciation is slower than premium areas, and tenant turnover may be higher."
        }
      ]}
      cta={{
        title: "Find Affordable Housing",
        description: "Discover Dubai's most budget-friendly accommodation options in International City.",
        primaryAction: { label: "View Rentals", href: "/destinations/dubai/districts/international-city#rentals" },
        secondaryAction: { label: "Dragon Mart Guide", href: "/destinations/dubai/shopping/dragon-mart" }
      }}
    />
  );
}

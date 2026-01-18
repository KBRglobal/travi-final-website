import { ShoppingBag, Snowflake, Train, Home, UtensilsCrossed, GraduationCap } from "lucide-react";
import { DubaiDistrictTemplate } from "./templates/DubaiDistrictTemplate";

export default function DistrictAlBarsha() {
  return (
    <DubaiDistrictTemplate
      title="Al Barsha Dubai Guide 2026 - Mall of the Emirates District"
      metaDescription="Explore Al Barsha, a popular residential area home to Mall of the Emirates. Guide to Ski Dubai, restaurants, apartments, and villas in Al Barsha."
      canonicalPath="/destinations/dubai/districts/al-barsha"
      keywords={["al barsha dubai", "mall of the emirates", "ski dubai", "al barsha apartments", "al barsha villas", "al barsha restaurants"]}
      breadcrumbs={[
        { label: "Districts", href: "/destinations/dubai/districts" },
        { label: "Al Barsha", href: "/destinations/dubai/districts/al-barsha" }
      ]}
      hero={{
        title: "Al Barsha",
        subtitle: "A well-established residential community centered around Mall of the Emirates and Ski Dubai",
        backgroundImage: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { text: "Mall of Emirates", variant: "default" },
          { text: "Ski Dubai", variant: "secondary" },
          { text: "Central Location", variant: "outline" }
        ]
      }}
      stats={[
        { value: "520+", label: "Stores", subtext: "Mall of the Emirates" },
        { value: "-4°C", label: "Ski Dubai", subtext: "Indoor snow park" },
        { value: "6%", label: "Rental Yield", subtext: "Average ROI" },
        { value: "AED 1,000", label: "Per Sqft", subtext: "Average price" }
      ]}
      statsTitle="Al Barsha Overview"
      statsSubtitle="Key facts about this popular residential community"
      highlights={[
        {
          icon: ShoppingBag,
          title: "Mall of the Emirates",
          description: "Shop at over 520 stores, catch a movie, dine at 100+ restaurants, and experience world-class entertainment."
        },
        {
          icon: Snowflake,
          title: "Ski Dubai",
          description: "Experience snow in the desert at the Middle East's first indoor ski resort with slopes and penguins."
        },
        {
          icon: Train,
          title: "Metro Connected",
          description: "Mall of the Emirates Metro Station provides direct Red Line access to Dubai's major destinations."
        },
        {
          icon: Home,
          title: "Affordable Villas",
          description: "Choose from spacious villas and townhouses at more affordable prices than neighboring premium areas."
        },
        {
          icon: GraduationCap,
          title: "Top Schools",
          description: "Access excellent schools including American School of Dubai, Raffles World Academy, and more."
        },
        {
          icon: UtensilsCrossed,
          title: "Diverse Dining",
          description: "Enjoy restaurants ranging from casual cafes to fine dining, both in the mall and throughout the community."
        }
      ]}
      highlightsTitle="What Makes Al Barsha Special"
      nearbyDistricts={[
        { name: "Dubai Marina", slug: "dubai-marina", description: "Waterfront living" },
        { name: "JBR", slug: "jbr", description: "Beachfront community" },
        { name: "Jumeirah", slug: "jumeirah", description: "Prestigious villas" }
      ]}
      faqs={[
        { 
          question: "Is Al Barsha a good area to live in Dubai?", 
          answer: "Al Barsha is popular for its central location, Mall of the Emirates access, good schools, affordable villas, and Metro connectivity. It's ideal for families seeking value without sacrificing convenience." 
        },
        { 
          question: "What is there to do in Al Barsha?", 
          answer: "Main attractions include Mall of the Emirates, Ski Dubai (indoor ski resort), various restaurants and cafes, fitness centers, and proximity to Media City and Internet City. It's well-connected to beaches via Sheikh Zayed Road." 
        },
        { 
          question: "How much is rent in Al Barsha?", 
          answer: "Al Barsha offers competitive rents. Studios start from AED 35,000/year, 1-bedrooms from AED 50,000, and villas from AED 120,000/year. It's more affordable than neighboring areas like Marina or JBR." 
        },
        {
          question: "Is Al Barsha family-friendly?",
          answer: "Yes, Al Barsha is very family-friendly with good schools, parks, community centers, and safe residential streets. The mall provides entertainment for all ages, and the area has a strong community feel."
        },
        {
          question: "How far is Al Barsha from the beach?",
          answer: "Al Barsha is about 10-15 minutes by car from JBR Beach and the Marina. The area doesn't have direct beach access, but the main beaches are easily reachable via Sheikh Zayed Road."
        }
      ]}
      cta={{
        title: "Find Your Home in Al Barsha",
        description: "Discover affordable apartments and villas in one of Dubai's most convenient residential communities.",
        primaryAction: { label: "View Properties", href: "/destinations/dubai/districts/al-barsha#properties" },
        secondaryAction: { label: "Al Barsha Guide", href: "/destinations/dubai/guides/al-barsha" }
      }}
    />
  );
}

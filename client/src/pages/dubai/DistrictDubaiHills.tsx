import { TreePine, ShoppingBag, GraduationCap, Home, Building2, Activity } from "lucide-react";
import { DubaiDistrictTemplate } from "./templates/DubaiDistrictTemplate";

export default function DistrictDubaiHills() {
  return (
    <DubaiDistrictTemplate
      title="Dubai Hills Estate Guide 2026 - Family Community & Golf"
      metaDescription="Explore Dubai Hills Estate, a premium family community by Emaar. Guide to Dubai Hills Mall, golf course, schools, villas, and apartments in Dubai Hills."
      canonicalPath="/dubai/dubai-hills"
      keywords={["dubai hills estate", "dubai hills mall", "dubai hills golf", "dubai hills villas", "dubai hills apartments", "emaar dubai hills"]}
      breadcrumbs={[
        { label: "Districts", href: "/dubai/districts" },
        { label: "Dubai Hills", href: "/dubai/dubai-hills" }
      ]}
      hero={{
        title: "Dubai Hills Estate",
        subtitle: "An 11 million sq ft premium green community with championship golf and excellent family amenities",
        backgroundImage: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { text: "Golf Course", variant: "default" },
          { text: "Emaar", variant: "secondary" },
          { text: "Family Living", variant: "outline" }
        ]
      }}
      stats={[
        { value: "18-hole", label: "Golf Course", subtext: "Championship layout" },
        { value: "650+", label: "Mall Stores", subtext: "Dubai Hills Mall" },
        { value: "5.5%", label: "Rental Yield", subtext: "Average ROI" },
        { value: "AED 1,600", label: "Per Sqft", subtext: "Average price" }
      ]}
      statsTitle="Dubai Hills Estate Overview"
      statsSubtitle="Key facts about this premium family community"
      highlights={[
        {
          icon: TreePine,
          title: "Green Community",
          description: "Enjoy over 1.45 million sq m of parks, gardens, and open spaces throughout the development."
        },
        {
          icon: Activity,
          title: "Championship Golf",
          description: "Play the 18-hole championship golf course designed to PGA standards with stunning views."
        },
        {
          icon: ShoppingBag,
          title: "Dubai Hills Mall",
          description: "Shop at over 650 stores including Roxy Cinemas, Galeries Lafayette, and diverse dining options."
        },
        {
          icon: GraduationCap,
          title: "Premium Schools",
          description: "Access top-rated schools including GEMS Wellington Academy and King's School nearby."
        },
        {
          icon: Home,
          title: "Diverse Housing",
          description: "Choose from apartments, townhouses, and luxury villas in various sub-communities."
        },
        {
          icon: Building2,
          title: "Central Location",
          description: "Strategically located between Downtown Dubai and Dubai Marina with easy highway access."
        }
      ]}
      highlightsTitle="What Makes Dubai Hills Estate Special"
      nearbyDistricts={[
        { name: "Downtown Dubai", slug: "downtown-dubai", description: "Burj Khalifa & Dubai Mall" },
        { name: "Al Barsha", slug: "al-barsha", description: "Mall of Emirates" },
        { name: "Business Bay", slug: "business-bay", description: "Dubai Canal & CBD" }
      ]}
      faqs={[
        { 
          question: "Is Dubai Hills a good area?", 
          answer: "Dubai Hills Estate is one of Dubai's most sought-after family communities, offering green spaces, a championship golf course, excellent schools, Dubai Hills Mall, and a central location between Downtown and Dubai Marina." 
        },
        { 
          question: "What schools are in Dubai Hills?", 
          answer: "Dubai Hills hosts several premium schools including GEMS Wellington Academy, King's School Al Barsha (nearby), and planned future educational facilities. The area is designed with families in mind." 
        },
        { 
          question: "How much are villas in Dubai Hills?", 
          answer: "Dubai Hills villas range from AED 3 million for smaller units to AED 30+ million for mansions. Off-plan options and existing inventory offer various entry points. Apartments start from AED 1.2 million." 
        },
        {
          question: "Is Dubai Hills Estate completed?",
          answer: "Dubai Hills Estate is partially completed with many residents already living there. Dubai Hills Mall is open, and new phases continue to be developed by Emaar. The community is expected to be fully completed by 2027-2028."
        },
        {
          question: "How far is Dubai Hills from the beach?",
          answer: "Dubai Hills is about 20-25 minutes by car from JBR Beach and Dubai Marina. While it doesn't offer beach access, the community's parks, pools, and golf course provide excellent recreational alternatives."
        }
      ]}
      cta={{
        title: "Live the Dubai Hills Lifestyle",
        description: "Discover premium family homes in one of Dubai's most desirable master-planned communities.",
        primaryAction: { label: "View Properties", href: "/destinations/dubai/districts/dubai-hills#properties" },
        secondaryAction: { label: "Golf Membership", href: "/destinations/dubai/districts/dubai-hills#golf" }
      }}
    />
  );
}

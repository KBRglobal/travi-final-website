import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  Anchor,
  Building2,
  TrendingUp,
  Waves,
  MapPin,
  Star,
  Utensils,
  Ship,
  Sun,
  Shield,
  Palmtree,
  Users,
} from "lucide-react";

export default function OffPlanDubaiMarina() {
  return (
    <DubaiOffPlanTemplate
      title="Dubai Marina Off-Plan Properties 2026 - Waterfront Investment"
      metaDescription="Invest in off-plan apartments in Dubai Marina. Waterfront towers, yacht marina views, and high rental demand. Complete investment guide for Marina off-plan."
      canonicalPath="/destinations/dubai/off-plan/marina"
      keywords={["dubai marina off-plan", "marina apartments", "marina investment", "waterfront off-plan dubai", "marina new towers"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "Marina", href: "/destinations/dubai/off-plan/marina" },
      ]}
      hero={{
        title: "Off-Plan in Dubai Marina",
        subtitle: "Premium waterfront apartments in the world's largest artificial marina with exceptional lifestyle amenities",
        image: "/destinations-hero/dubai/dubai/dubai-hero-marina-abra-boat-night.webp",
        badges: [
          { label: "Waterfront" },
          { label: "High Demand" },
          { label: "Premium Location" },
        ],
      }}
      marketStats={[
        { value: "7%", label: "Rental Yield", description: "Average annual ROI" },
        { value: "AED 2K", label: "Per Sqft", description: "Average price" },
        { value: "95%", label: "Occupancy", description: "Rental demand" },
        { value: "AED 1.5M+", label: "Entry Point", description: "1-bedrooms from" },
      ]}
      marketStatsTitle="Dubai Marina Market Overview"
      marketStatsSubtitle="Premium waterfront living with proven investment returns"
      highlights={[
        {
          icon: Anchor,
          title: "World's Largest Marina",
          description: "Home to 200+ superyachts, Dubai Marina offers an unparalleled waterfront lifestyle with stunning views.",
        },
        {
          icon: Palmtree,
          title: "JBR Beach Access",
          description: "Steps from The Walk at JBR and its pristine beach, restaurants, and entertainment options.",
        },
        {
          icon: Ship,
          title: "Marina Promenade",
          description: "The iconic Marina Walk features 7km of waterfront dining, boutiques, and cafes.",
        },
        {
          icon: Star,
          title: "Premium Address",
          description: "One of Dubai's most prestigious addresses, Marina properties command premium rental and resale values.",
        },
      ]}
      highlightsTitle="Why Dubai Marina"
      highlightsSubtitle="The enduring appeal of Dubai's most iconic waterfront community"
      investmentBenefits={[
        {
          icon: Waves,
          title: "Unmatched Waterfront Living",
          description: "Floor-to-ceiling windows overlooking superyachts, the Arabian Gulf, and Palm Jumeirah. Few locations globally offer this combination of water views and urban convenience.",
        },
        {
          icon: TrendingUp,
          title: "Consistent Appreciation",
          description: "Marina properties have delivered steady 8-12% annual appreciation over the past decade. Limited new supply protects existing values.",
        },
        {
          icon: Users,
          title: "International Tenant Pool",
          description: "Attracts high-income expat professionals and tourists. The cosmopolitan atmosphere ensures year-round rental demand from diverse nationalities.",
        },
        {
          icon: Utensils,
          title: "World-Class Amenities",
          description: "Fine dining at Pier 7, shopping at Marina Mall, entertainment venues, and direct Metro access. Everything within walking distance.",
        },
        {
          icon: Sun,
          title: "Beach Lifestyle",
          description: "JBR Beach, water sports, and yacht clubs provide the complete coastal lifestyle. Perfect for holiday rentals commanding premium rates.",
        },
        {
          icon: Building2,
          title: "Iconic Towers",
          description: "Choose from architectural landmarks like Cayan Tower (twisted design), Princess Tower, and new launches offering contemporary luxury.",
        },
      ]}
      investmentBenefitsTitle="Investment Benefits"
      investmentBenefitsSubtitle="Why Dubai Marina remains the gold standard for waterfront investment"
      faqs={[
        {
          question: "Are there new off-plan projects in Dubai Marina?",
          answer: "While Marina is largely built-out, select premium projects still launch. Recent and upcoming projects include Jumeirah Living Marina Gate, LIV Marina, and Marina Vista by Emaar. These command premium pricing for their scarcity value.",
        },
        {
          question: "What is the rental demand like in Dubai Marina?",
          answer: "Extremely strong. Marina consistently maintains 95%+ occupancy rates. The combination of beach access, nightlife, dining, and Metro connectivity makes it perennially popular with young professionals and tourists.",
        },
        {
          question: "How does Marina compare to newer areas like Business Bay?",
          answer: "Marina offers established lifestyle, beach access, and proven track record but at higher entry prices. Business Bay offers higher yields and growth potential. Marina is for lifestyle buyers; Business Bay for pure investors.",
        },
        {
          question: "Is Marina suitable for holiday homes?",
          answer: "Excellent for short-term rentals. Beach proximity and tourist attractions drive strong holiday demand. Expect 20-40% premium over long-term rentals during peak season, though management is more intensive.",
        },
        {
          question: "What are typical payment plans for Marina off-plan?",
          answer: "Premium developers in Marina typically offer 60/40 plans. Due to the prime location, aggressive payment incentives are less common than in developing areas. Expect 15-20% booking deposits.",
        },
      ]}
      cta={{
        title: "Discover Marina Off-Plan Opportunities",
        description: "Secure your piece of Dubai's most prestigious waterfront address",
        primaryButtonText: "View Marina Projects",
        primaryButtonHref: "/destinations/dubai/off-plan/marina#projects",
        secondaryButtonText: "Schedule Viewing",
        secondaryButtonHref: "/contact",
      }}
    />
  );
}

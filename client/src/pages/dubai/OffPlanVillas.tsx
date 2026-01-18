import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  Home,
  Palmtree,
  Shield,
  Building2,
  TrendingUp,
  Users,
  Trees,
  Car,
  Star,
  Crown,
  MapPin,
  Key,
} from "lucide-react";

export default function OffPlanVillas() {
  return (
    <DubaiOffPlanTemplate
      title="Dubai Off-Plan Villas 2026 - Luxury Villa Communities"
      metaDescription="Explore off-plan villas across Dubai. From Arabian Ranches to Palm Jumeirah, find the perfect luxury villa with gardens, pools, and community amenities."
      canonicalPath="/destinations/dubai/off-plan/villas"
      keywords={["dubai villas off-plan", "luxury villas dubai", "off-plan townhouses", "villa communities dubai", "dubai villa investment"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "Villas", href: "/destinations/dubai/off-plan/villas" },
      ]}
      hero={{
        title: "Off-Plan Villas in Dubai",
        subtitle: "Discover luxury villa communities across Dubai offering spacious living with private gardens and premium amenities",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "Luxury Villas" },
          { label: "Gated Communities" },
          { label: "Premium Living" },
        ],
      }}
      marketStats={[
        { value: "5%", label: "Rental Yield", description: "Villa segment average" },
        { value: "AED 3M+", label: "Entry Point", description: "Standard villas" },
        { value: "15+", label: "Communities", description: "With new launches" },
        { value: "35%", label: "Appreciation", description: "Last 3 years" },
      ]}
      marketStatsTitle="Dubai Villa Market Overview"
      marketStatsSubtitle="Premium villa living with strong long-term appreciation"
      highlights={[
        {
          icon: Palmtree,
          title: "Private Gardens",
          description: "Villas offer private outdoor spaces, pools, and gardens - impossible to find in apartment living.",
        },
        {
          icon: Shield,
          title: "Gated Security",
          description: "24/7 security, controlled access, and safe family environments in master-planned communities.",
        },
        {
          icon: Trees,
          title: "Community Amenities",
          description: "Golf courses, clubhouses, parks, schools, and retail within walkable distances.",
        },
        {
          icon: Crown,
          title: "Prestige Living",
          description: "Villa ownership represents the aspirational Dubai lifestyle for families and executives.",
        },
      ]}
      highlightsTitle="Why Choose a Villa"
      highlightsSubtitle="The unique benefits of Dubai villa living"
      investmentBenefits={[
        {
          icon: TrendingUp,
          title: "Strong Capital Appreciation",
          description: "Dubai villas have appreciated 30-40% since 2022. Limited land supply for new villa communities ensures continued value growth.",
        },
        {
          icon: Users,
          title: "Family Tenant Demand",
          description: "Villas attract premium long-term tenants - executives and families who stay for years, not months. Lower turnover means reduced management burden.",
        },
        {
          icon: Building2,
          title: "Top Villa Communities",
          description: "Choose from Arabian Ranches, Dubai Hills, Damac Hills, Tilal Al Ghaf, Palm Jumeirah, and new launches like Expo Golf Villas.",
        },
        {
          icon: Car,
          title: "Suburban Lifestyle",
          description: "Space, privacy, and family-oriented amenities that apartment living cannot match. Yet still minutes from urban centers via excellent roads.",
        },
        {
          icon: Key,
          title: "End-User Appeal",
          description: "Villas sell easily on the secondary market to end-users, not just investors. This broader buyer pool supports resale values.",
        },
        {
          icon: Star,
          title: "Premium Developers",
          description: "Emaar (Arabian Ranches, Dubai Hills), Nakheel (Palm), DAMAC (Hills), and Majid Al Futtaim (Tilal Al Ghaf) deliver world-class villa communities.",
        },
      ]}
      investmentBenefitsTitle="Investment Benefits"
      investmentBenefitsSubtitle="Why Dubai villas are a cornerstone of smart property portfolios"
      faqs={[
        {
          question: "What are the best villa communities in Dubai?",
          answer: "Top communities include Emirates Hills (ultra-luxury), Dubai Hills Estate (Emaar flagship), Arabian Ranches 1-3 (family favorite), DAMAC Hills (golf course living), and Tilal Al Ghaf (lagoon community). Each offers different lifestyle and price points.",
        },
        {
          question: "What is the minimum investment for a villa?",
          answer: "Entry-level townhouses start around AED 1.5M (Al Furjan, Damac Hills 2). Standard villas begin at AED 3-4M (Arabian Ranches, Dubai Hills). Ultra-luxury estates exceed AED 30M+ (Emirates Hills, Palm).",
        },
        {
          question: "Are villa yields lower than apartments?",
          answer: "Yes, typically 4-6% vs 7-9% for apartments. However, villas offer superior capital appreciation and attract premium long-term tenants. Total returns often match or exceed apartment investments.",
        },
        {
          question: "What payment plans are available for villas?",
          answer: "Most developers offer 60/40 or 70/30 plans for villas. Post-handover options are less common than apartments due to higher values. Expect 15-25% booking deposits.",
        },
        {
          question: "Which communities have off-plan villas available now?",
          answer: "Active launches include Dubai Hills (The Valley), Arabian Ranches 3, DAMAC Lagoons, Tilal Al Ghaf new phases, Sobha Reserve, and select Palm Jumeirah signature villas. Inventory varies by phase and timing.",
        },
      ]}
      cta={{
        title: "Find Your Dream Villa",
        description: "Explore off-plan villas across Dubai's premier communities",
        primaryButtonText: "View Villa Projects",
        primaryButtonHref: "/destinations/dubai/off-plan/villas#projects",
        secondaryButtonText: "Get Expert Guidance",
        secondaryButtonHref: "/contact",
      }}
    />
  );
}

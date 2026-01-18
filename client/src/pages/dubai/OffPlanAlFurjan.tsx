import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  Home,
  Train,
  Users,
  Building2,
  TrendingUp,
  MapPin,
  School,
  Trees,
  Shield,
  Star,
  Car,
  Heart,
} from "lucide-react";

export default function OffPlanAlFurjan() {
  return (
    <DubaiOffPlanTemplate
      title="Al Furjan Off-Plan Properties 2026 - Family Community"
      metaDescription="Explore off-plan townhouses and apartments in Al Furjan. Family-friendly community with excellent schools, parks, and Metro connectivity."
      canonicalPath="/destinations/dubai/off-plan/al-furjan"
      keywords={["al furjan off-plan", "al furjan townhouses", "al furjan investment", "family off-plan dubai", "al furjan apartments"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "Al Furjan", href: "/destinations/dubai/off-plan/al-furjan" },
      ]}
      hero={{
        title: "Off-Plan in Al Furjan",
        subtitle: "A well-planned family community with excellent infrastructure and strong appreciation potential",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "Metro Connected" },
          { label: "Family Area" },
          { label: "Townhouses" },
        ],
      }}
      marketStats={[
        { value: "6.5%", label: "Rental Yield", description: "Average annual ROI" },
        { value: "AED 900", label: "Per Sqft", description: "Average price" },
        { value: "AED 1.5M", label: "Townhouse", description: "Starting from" },
        { value: "AED 700K", label: "Apartment", description: "1-beds from" },
      ]}
      marketStatsTitle="Al Furjan Market Overview"
      marketStatsSubtitle="Family-focused community with strong fundamentals and growth trajectory"
      highlights={[
        {
          icon: Train,
          title: "Metro Connected",
          description: "Discovery Gardens and Furjan Metro stations provide direct access to Dubai's rail network.",
        },
        {
          icon: Users,
          title: "Family-Oriented",
          description: "Designed for families with parks, playgrounds, community pools, and safe pedestrian areas.",
        },
        {
          icon: Home,
          title: "Townhouse Living",
          description: "Rare opportunity for affordable villa/townhouse investment with private gardens.",
        },
        {
          icon: MapPin,
          title: "Strategic Location",
          description: "10 minutes to Marina, 15 to DWC Airport, convenient access to Sheikh Zayed Road.",
        },
      ]}
      highlightsTitle="Why Al Furjan"
      highlightsSubtitle="The ideal balance of suburban living and urban accessibility"
      investmentBenefits={[
        {
          icon: TrendingUp,
          title: "Strong Appreciation",
          description: "Al Furjan has seen 20-25% price appreciation since 2022. Metro connectivity and continued development drive sustained growth.",
        },
        {
          icon: Building2,
          title: "Quality Developers",
          description: "Projects from Nakheel, Azizi, and select boutique developers ensure quality construction and reliable delivery timelines.",
        },
        {
          icon: School,
          title: "Education Infrastructure",
          description: "Top schools including Arbor School, Gems Wellington, and nurseries serve the community, attracting long-term family tenants.",
        },
        {
          icon: Trees,
          title: "Green Community",
          description: "Extensively landscaped with parks, jogging tracks, and community gardens. The village atmosphere is rare in new Dubai developments.",
        },
        {
          icon: Car,
          title: "Easy Commutes",
          description: "Direct access to Sheikh Zayed Road and Mohammed Bin Zayed Road. 10-15 minutes to major employment hubs.",
        },
        {
          icon: Heart,
          title: "Community Feel",
          description: "Al Furjan Pavilion offers retail, dining, and a cinema. The community has an established neighborhood feel with active resident engagement.",
        },
      ]}
      investmentBenefitsTitle="Investment Benefits"
      investmentBenefitsSubtitle="Why Al Furjan is the smart choice for family-focused investors"
      faqs={[
        {
          question: "What types of properties are available in Al Furjan?",
          answer: "Al Furjan offers townhouses (3-4 bedrooms), apartments (studios to 3-beds), and limited independent villas. Townhouses from AED 1.5M offer private gardens and villa-style living at apartment prices.",
        },
        {
          question: "Is Al Furjan good for rental income?",
          answer: "Yes, yields of 6-7% are typical. The family-friendly environment attracts stable, long-term tenants. Townhouses particularly popular with expat families seeking suburban lifestyle.",
        },
        {
          question: "Which developers are active in Al Furjan?",
          answer: "Nakheel developed the master community. Azizi has significant apartment projects (Azizi Riviera connection). Select townhouse phases by Nakheel still launch periodically.",
        },
        {
          question: "How does Al Furjan compare to JVC?",
          answer: "Al Furjan offers more townhouses and a more established community feel. JVC has higher yields but mostly apartments. Al Furjan suits families wanting villa-style living; JVC suits yield-focused investors.",
        },
        {
          question: "What is the future outlook for Al Furjan?",
          answer: "Strong growth expected. Metro connectivity, proximity to Expo City Dubai (formerly Expo 2020 site), and limited new supply protect values. Expect continued 8-12% annual appreciation.",
        },
      ]}
      cta={{
        title: "Explore Al Furjan Off-Plan",
        description: "Find your family's perfect townhouse or apartment in this thriving community",
        primaryButtonText: "View Al Furjan Projects",
        primaryButtonHref: "/destinations/dubai/off-plan/al-furjan#projects",
        secondaryButtonText: "Schedule Community Tour",
        secondaryButtonHref: "/contact",
      }}
    />
  );
}

import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  Building2,
  Trophy,
  Globe,
  Star,
  Shield,
  Award,
  Landmark,
  Crown,
  TrendingUp,
  CheckCircle2,
  MapPin,
  Home,
} from "lucide-react";

export default function OffPlanEmaar() {
  return (
    <DubaiOffPlanTemplate
      title="Emaar Properties Dubai 2026 - Projects & Off-Plan"
      metaDescription="Explore Emaar Properties projects in Dubai. Developer of Burj Khalifa, Dubai Mall, and premier communities. Complete guide to Emaar off-plan opportunities."
      canonicalPath="/destinations/dubai/off-plan/developers/emaar"
      keywords={["emaar properties dubai", "emaar off-plan", "emaar projects", "emaar downtown", "emaar dubai hills"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "Emaar", href: "/destinations/dubai/off-plan/developers/emaar" },
      ]}
      hero={{
        title: "Emaar Properties",
        subtitle: "Dubai's most trusted developer behind iconic landmarks and premium residential communities worldwide",
        image: "/destinations-hero/dubai/dubai/dubai-hero-burj-khalifa-palms-sunset.webp",
        badges: [
          { label: "Burj Khalifa" },
          { label: "#1 Developer" },
          { label: "Premium Quality" },
        ],
      }}
      marketStats={[
        { value: "90+", label: "Countries", description: "Global presence" },
        { value: "60,000+", label: "Units Delivered", description: "In Dubai" },
        { value: "#1", label: "Developer", description: "Market leader" },
        { value: "30+ Years", label: "Experience", description: "Since 1997" },
      ]}
      marketStatsTitle="Emaar Overview"
      marketStatsSubtitle="The developer behind Dubai's most iconic landmarks"
      highlights={[
        {
          icon: Landmark,
          title: "Iconic Landmarks",
          description: "Creator of Burj Khalifa, Dubai Mall, Dubai Fountain, and Address Hotels brand.",
        },
        {
          icon: Globe,
          title: "Global Presence",
          description: "Projects spanning 6 continents with a proven track record of international success.",
        },
        {
          icon: Shield,
          title: "Reliable Delivery",
          description: "Industry-leading on-time delivery record with minimal delays or cancellations.",
        },
        {
          icon: Crown,
          title: "Premium Communities",
          description: "Downtown Dubai, Dubai Hills, Arabian Ranches, and Dubai Creek Harbour.",
        },
      ]}
      highlightsTitle="Why Choose Emaar"
      highlightsSubtitle="The gold standard in Dubai real estate development"
      investmentBenefits={[
        {
          icon: Trophy,
          title: "Market Leadership",
          description: "Emaar holds the largest market share in Dubai's residential sector. Properties command premium pricing and attract the most discerning buyers and tenants.",
        },
        {
          icon: TrendingUp,
          title: "Strong Resale Values",
          description: "Emaar properties consistently outperform the market in resale value retention. The brand premium translates to 10-15% higher prices vs comparable developers.",
        },
        {
          icon: Award,
          title: "Quality Construction",
          description: "Known for superior finishing, attention to detail, and durable construction. Emaar properties maintain their quality decades after delivery.",
        },
        {
          icon: MapPin,
          title: "Prime Locations",
          description: "Emaar develops in the best locations: Downtown, Marina, Hills, Arabian Ranches. Their land bank represents Dubai's most coveted addresses.",
        },
        {
          icon: CheckCircle2,
          title: "Transparent Process",
          description: "Clear payment plans, regular construction updates, and professional handover processes. Emaar sets the standard for customer experience.",
        },
        {
          icon: Home,
          title: "Comprehensive Communities",
          description: "Emaar delivers complete communities with schools, retail, parks, and amenities. Not just buildings, but integrated lifestyle destinations.",
        },
      ]}
      investmentBenefitsTitle="Investment Benefits"
      investmentBenefitsSubtitle="Why Emaar is the blue-chip choice for property investors"
      faqs={[
        {
          question: "Is Emaar a reliable developer?",
          answer: "Emaar is Dubai's largest and most established developer, known for Burj Khalifa, Dubai Mall, and numerous successful communities. They have a strong track record of on-time delivery and quality construction. Emaar is publicly listed (DFM) providing transparency.",
        },
        {
          question: "What communities does Emaar develop?",
          answer: "Emaar develops Downtown Dubai, Dubai Hills Estate, Dubai Creek Harbour, Arabian Ranches 1-3, Emaar Beachfront, Dubai Marina (parts), The Valley, and many more premium communities across Dubai.",
        },
        {
          question: "Are Emaar properties good investments?",
          answer: "Emaar properties command premium pricing but offer strong capital appreciation, reliable build quality, and excellent rental demand. They're considered blue-chip investments in Dubai real estate with lower risk than lesser-known developers.",
        },
        {
          question: "What payment plans does Emaar offer?",
          answer: "Emaar typically offers 60/40 or 70/30 payment plans with 10-15% booking deposits. Post-handover options are less common than other developers. Their plans are straightforward and milestone-linked.",
        },
        {
          question: "How do Emaar prices compare to other developers?",
          answer: "Emaar commands a 10-20% premium over comparable developers. However, stronger appreciation, higher resale values, and reliable delivery often justify this premium for investors.",
        },
      ]}
      cta={{
        title: "Explore Emaar Projects",
        description: "Invest in properties from Dubai's most trusted developer",
        primaryButtonText: "View Emaar Projects",
        primaryButtonHref: "/destinations/dubai/off-plan/developers/emaar#projects",
        secondaryButtonText: "Speak with Specialist",
        secondaryButtonHref: "/contact",
      }}
    />
  );
}

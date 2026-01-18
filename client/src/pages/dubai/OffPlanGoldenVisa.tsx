import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  Award,
  Users,
  Home,
  Shield,
  Clock,
  Globe,
  Building2,
  CheckCircle2,
  DollarSign,
  FileText,
  Star,
  Plane,
} from "lucide-react";

export default function OffPlanGoldenVisa() {
  return (
    <DubaiOffPlanTemplate
      title="Dubai Golden Visa Through Property 2026 - 10-Year Residency"
      metaDescription="Complete guide to obtaining UAE Golden Visa through Dubai property investment. Requirements, eligible properties, and step-by-step application process."
      canonicalPath="/destinations/dubai/off-plan/golden-visa"
      keywords={["dubai golden visa property", "uae golden visa", "golden visa investment", "residency through property", "10 year visa dubai"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "Golden Visa", href: "/destinations/dubai/off-plan/golden-visa" },
      ]}
      hero={{
        title: "Golden Visa Through Property",
        subtitle: "Secure a 10-year UAE residency visa by investing AED 2 million in Dubai real estate",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "10-Year Visa" },
          { label: "AED 2M Minimum" },
          { label: "Family Included" },
        ],
      }}
      marketStats={[
        { value: "10 Years", label: "Visa Duration", description: "Renewable" },
        { value: "AED 2M", label: "Minimum", description: "Property value" },
        { value: "100%", label: "Family", description: "Sponsored included" },
        { value: "6 Months", label: "Stay Requirement", description: "No minimum stay" },
      ]}
      marketStatsTitle="Golden Visa Overview"
      marketStatsSubtitle="UAE's premier residency pathway for property investors"
      highlights={[
        {
          icon: Clock,
          title: "10-Year Validity",
          description: "The longest residency term available in the UAE, renewable as long as you maintain the investment.",
        },
        {
          icon: Users,
          title: "Full Family Coverage",
          description: "Spouse, children, and domestic helpers included under your Golden Visa sponsorship.",
        },
        {
          icon: Plane,
          title: "No Stay Requirements",
          description: "Unlike standard visas, Golden Visa has no minimum stay requirement. Live anywhere in the world.",
        },
        {
          icon: Globe,
          title: "Work Flexibility",
          description: "Work for any employer or run your own business without additional permits.",
        },
      ]}
      highlightsTitle="Golden Visa Benefits"
      highlightsSubtitle="Why property investors choose the UAE Golden Visa pathway"
      investmentBenefits={[
        {
          icon: Award,
          title: "Long-Term Security",
          description: "10-year residency provides stability for family planning, business setup, and lifestyle design. No need for annual renewals or sponsor dependencies.",
        },
        {
          icon: Shield,
          title: "Asset Protection",
          description: "UAE offers a stable legal environment, no wealth taxes, and strong property rights. Your investment is protected in a business-friendly jurisdiction.",
        },
        {
          icon: DollarSign,
          title: "Tax Advantages",
          description: "UAE residency provides access to one of the world's most favorable tax environments. No income tax, capital gains tax, or inheritance tax.",
        },
        {
          icon: Building2,
          title: "Real Estate Returns",
          description: "Your AED 2M investment generates rental income (6-8% yields) while also qualifying you for residency. The investment pays for itself.",
        },
        {
          icon: CheckCircle2,
          title: "Banking Access",
          description: "UAE residency opens access to world-class banking services, international investment accounts, and financial services difficult to obtain as a non-resident.",
        },
        {
          icon: Star,
          title: "Global Hub Access",
          description: "Dubai is a global business hub with excellent connectivity. Your residency provides a base in one of the world's most dynamic cities.",
        },
      ]}
      investmentBenefitsTitle="Investment & Residency Benefits"
      investmentBenefitsSubtitle="Combining property investment with long-term residency rights"
      faqs={[
        {
          question: "What is the minimum investment for Golden Visa?",
          answer: "The minimum property investment for Golden Visa is AED 2 million. This can be a single property or multiple properties totaling AED 2M. The property must be completed (not off-plan at time of application).",
        },
        {
          question: "Can off-plan properties qualify for Golden Visa?",
          answer: "The property must be completed and registered in your name for Golden Visa eligibility. However, you can buy off-plan and apply once the property is handed over and registered with DLD.",
        },
        {
          question: "Who is included in the Golden Visa?",
          answer: "Your spouse and children (regardless of age) can be included in your Golden Visa. Domestic helpers can also be sponsored. Each family member receives their own 10-year residence permit.",
        },
        {
          question: "Can I work with a Golden Visa?",
          answer: "Yes, Golden Visa holders can work for any employer in the UAE or run their own businesses without additional work permits. This is a significant advantage over standard employment visas.",
        },
        {
          question: "What if property value drops below AED 2M?",
          answer: "Golden Visa qualification is based on purchase price, not current market value. Once issued, your visa remains valid even if the property's market value fluctuates. However, selling the property may affect renewal eligibility.",
        },
      ]}
      cta={{
        title: "Qualify for Golden Visa",
        description: "Explore properties that meet the AED 2M threshold for 10-year residency",
        primaryButtonText: "View Golden Visa Properties",
        primaryButtonHref: "/destinations/dubai/off-plan/golden-visa#properties",
        secondaryButtonText: "Get Visa Guidance",
        secondaryButtonHref: "/contact",
      }}
    />
  );
}

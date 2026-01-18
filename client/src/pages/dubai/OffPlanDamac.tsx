import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  Crown,
  Gem,
  Building2,
  TrendingUp,
  Star,
  Shield,
  Home,
  Sparkles,
  Award,
  DollarSign,
  Trees,
  Palette,
} from "lucide-react";

export default function OffPlanDamac() {
  return (
    <DubaiOffPlanTemplate
      title="DAMAC Properties Dubai 2026 - Luxury Projects & Off-Plan"
      metaDescription="Discover DAMAC Properties luxury developments in Dubai. Branded residences, DAMAC Hills, and premium apartments. Complete DAMAC investment guide."
      canonicalPath="/destinations/dubai/off-plan/developers/damac"
      keywords={["damac properties dubai", "damac off-plan", "damac hills", "damac branded residences", "damac projects"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "DAMAC", href: "/destinations/dubai/off-plan/developers/damac" },
      ]}
      hero={{
        title: "DAMAC Properties",
        subtitle: "Luxury real estate pioneer known for branded residences with Versace, Cavalli, Fendi, and more",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "Branded Residences" },
          { label: "Luxury Focus" },
          { label: "Premium Design" },
        ],
      }}
      marketStats={[
        { value: "40,000+", label: "Units Delivered", description: "Since 2002" },
        { value: "10+", label: "Fashion Brands", description: "Partnerships" },
        { value: "2", label: "Golf Communities", description: "DAMAC Hills 1 & 2" },
        { value: "AED 43B+", label: "Pipeline", description: "Projects value" },
      ]}
      marketStatsTitle="DAMAC Overview"
      marketStatsSubtitle="Dubai's luxury real estate and branded residences pioneer"
      highlights={[
        {
          icon: Crown,
          title: "Branded Residences",
          description: "Exclusive partnerships with Versace, Cavalli, Fendi, de Grisogono, and Trump Organization.",
        },
        {
          icon: Trees,
          title: "Golf Course Living",
          description: "DAMAC Hills 1 & 2 offer Trump International Golf Club and expansive green communities.",
        },
        {
          icon: Gem,
          title: "Luxury Focus",
          description: "Every project emphasizes premium materials, designer interiors, and exclusive amenities.",
        },
        {
          icon: DollarSign,
          title: "Competitive Pricing",
          description: "Luxury specifications at prices often below Emaar for comparable offerings.",
        },
      ]}
      highlightsTitle="Why Choose DAMAC"
      highlightsSubtitle="Luxury living made accessible through innovative partnerships"
      investmentBenefits={[
        {
          icon: Sparkles,
          title: "Branded Value Premium",
          description: "Versace, Cavalli, and Fendi residences command 20-30% premiums on the secondary market. The brand association provides lasting value differentiation.",
        },
        {
          icon: TrendingUp,
          title: "Strong Appreciation",
          description: "DAMAC Hills properties have appreciated 25-35% since 2022. The branded residence segment is particularly strong with limited supply.",
        },
        {
          icon: Building2,
          title: "Diverse Portfolio",
          description: "From apartments to villas, from Business Bay to DAMAC Hills. Options for every budget and lifestyle preference.",
        },
        {
          icon: Award,
          title: "Award-Winning Design",
          description: "Multiple regional and international awards for architecture, interior design, and community development.",
        },
        {
          icon: Shield,
          title: "Listed Company",
          description: "DAMAC is publicly listed providing transparency and governance. Track record of navigating market cycles successfully.",
        },
        {
          icon: Palette,
          title: "Designer Interiors",
          description: "Partnerships with fashion houses extend to interior design. Branded residences feature furniture, fixtures, and finishes by the partnering brand.",
        },
      ]}
      investmentBenefitsTitle="Investment Benefits"
      investmentBenefitsSubtitle="Why DAMAC delivers luxury with investment value"
      faqs={[
        {
          question: "What are DAMAC branded residences?",
          answer: "DAMAC partners with luxury fashion and lifestyle brands (Versace, Cavalli, Fendi, de Grisogono) to create residences with branded interiors, furnishings, and specifications. These properties carry the brand's design DNA throughout.",
        },
        {
          question: "Is DAMAC a good developer?",
          answer: "DAMAC is one of Dubai's largest developers with 40,000+ units delivered. While historically some projects faced delays, recent delivery performance has improved significantly. Their branded properties maintain strong resale values.",
        },
        {
          question: "What is DAMAC Hills?",
          answer: "DAMAC Hills 1 features the Trump International Golf Club with villas and apartments. DAMAC Hills 2 (Akoya Oxygen) is a larger community with more affordable options. Both offer golf and resort-style living.",
        },
        {
          question: "What payment plans does DAMAC offer?",
          answer: "DAMAC offers flexible plans including 80/20, 60/40, and post-handover options up to 3-5 years. They're known for aggressive payment incentives especially for new launches.",
        },
        {
          question: "How does DAMAC compare to Emaar?",
          answer: "DAMAC focuses on luxury and branded residences, while Emaar emphasizes prime locations and community development. DAMAC often offers more competitive pricing for comparable luxury levels.",
        },
      ]}
      cta={{
        title: "Explore DAMAC Projects",
        description: "Discover branded residences and luxury developments from DAMAC",
        primaryButtonText: "View DAMAC Projects",
        primaryButtonHref: "/destinations/dubai/off-plan/developers/damac#projects",
        secondaryButtonText: "Request Brochure",
        secondaryButtonHref: "/contact",
      }}
    />
  );
}

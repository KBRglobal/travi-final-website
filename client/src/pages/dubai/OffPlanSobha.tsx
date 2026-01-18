import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  Award,
  Building2,
  CheckCircle2,
  Star,
  Shield,
  Gem,
  Trees,
  TrendingUp,
  Sparkles,
  Crown,
  Home,
  Hammer,
} from "lucide-react";

export default function OffPlanSobha() {
  return (
    <DubaiOffPlanTemplate
      title="Sobha Realty Dubai 2026 - Sobha Hartland & Quality"
      metaDescription="Explore Sobha Realty developments known for exceptional quality. Sobha Hartland, Sobha One, and luxury villas. Complete guide to Sobha off-plan."
      canonicalPath="/destinations/dubai/off-plan/developers/sobha"
      keywords={["sobha realty dubai", "sobha hartland", "sobha off-plan", "sobha quality", "sobha projects"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "Sobha", href: "/destinations/dubai/off-plan/developers/sobha" },
      ]}
      hero={{
        title: "Sobha Realty",
        subtitle: "Known for backward-integrated construction and industry-leading quality standards in Dubai real estate",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "Sobha Hartland" },
          { label: "Premium Quality" },
          { label: "Self-Built" },
        ],
      }}
      marketStats={[
        { value: "100%", label: "In-House", description: "Self-manufactured" },
        { value: "8M sq ft", label: "Sobha Hartland", description: "Flagship community" },
        { value: "Premium", label: "Quality", description: "Industry benchmark" },
        { value: "25+ Years", label: "Experience", description: "Since 1998" },
      ]}
      marketStatsTitle="Sobha Overview"
      marketStatsSubtitle="The quality benchmark in Dubai real estate development"
      highlights={[
        {
          icon: Hammer,
          title: "Backward Integration",
          description: "Sobha manufactures its own materials - marble, woodwork, glazing, and MEP. Total quality control from quarry to finishing.",
        },
        {
          icon: Trees,
          title: "Sobha Hartland",
          description: "8M sq ft waterfront community in MBR City with lagoons, parks, and premium residences.",
        },
        {
          icon: Award,
          title: "Quality Awards",
          description: "Multiple awards for construction quality, design excellence, and customer satisfaction.",
        },
        {
          icon: Crown,
          title: "Premium Segment",
          description: "Focused exclusively on the premium segment with attention to detail that exceeds industry norms.",
        },
      ]}
      highlightsTitle="Why Choose Sobha"
      highlightsSubtitle="Uncompromising quality through complete vertical integration"
      investmentBenefits={[
        {
          icon: Gem,
          title: "Exceptional Quality",
          description: "Sobha's backward integration means every component is manufactured in-house to exacting standards. The quality difference is visible and tangible in every finish.",
        },
        {
          icon: TrendingUp,
          title: "Strong Appreciation",
          description: "Sobha Hartland has appreciated 30-35% since 2022. The quality reputation attracts discerning buyers willing to pay premiums.",
        },
        {
          icon: Shield,
          title: "Reliable Delivery",
          description: "Sobha's in-house construction capability ensures minimal dependency on contractors. This translates to consistent on-time delivery.",
        },
        {
          icon: Star,
          title: "Premium Location",
          description: "Sobha Hartland sits in Mohammed Bin Rashid City with Dubai Creek and Ras Al Khor wildlife sanctuary views. Prime positioning for long-term value.",
        },
        {
          icon: CheckCircle2,
          title: "Attention to Detail",
          description: "From imported marble to custom woodwork, every element is considered. Buyers notice the difference in materials and finishing quality.",
        },
        {
          icon: Home,
          title: "Diverse Product Range",
          description: "Studios to penthouse apartments, villas, and townhouses. The quality standard is consistent across all product types.",
        },
      ]}
      investmentBenefitsTitle="Investment Benefits"
      investmentBenefitsSubtitle="Why Sobha's quality focus delivers investment value"
      faqs={[
        {
          question: "What is Sobha's backward integration?",
          answer: "Sobha manufactures most construction materials in-house: marble from own quarries, custom glazing, woodwork, and MEP systems. This 'backward integration' ensures quality control from raw material to finished product.",
        },
        {
          question: "Is Sobha Hartland a good investment?",
          answer: "Sobha Hartland has shown 30-35% appreciation since 2022. The quality reputation, prime MBR City location, and waterfront positioning make it attractive for both end-users and investors.",
        },
        {
          question: "How does Sobha quality compare to Emaar?",
          answer: "Sobha is generally considered to have superior finishing quality due to in-house manufacturing. Emaar offers better locations. Both are premium developers, with Sobha appealing to quality-focused buyers.",
        },
        {
          question: "What payment plans does Sobha offer?",
          answer: "Sobha typically offers 60/40 or 70/30 plans. Some phases include post-handover options. Being a premium developer, plans are structured rather than aggressive.",
        },
        {
          question: "What projects does Sobha currently have?",
          answer: "Active projects include Sobha Hartland (apartments, villas, townhouses), Sobha Hartland II (Waves, Verde, Reserve), and Sobha One (Downtown adjacent). Each phase offers different configurations and price points.",
        },
      ]}
      cta={{
        title: "Explore Sobha Projects",
        description: "Experience the difference that uncompromising quality makes",
        primaryButtonText: "View Sobha Projects",
        primaryButtonHref: "/destinations/dubai/off-plan/developers/sobha#projects",
        secondaryButtonText: "Book Showroom Visit",
        secondaryButtonHref: "/contact",
      }}
    />
  );
}

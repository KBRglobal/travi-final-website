import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  FileText,
  CreditCard,
  Key,
  Building2,
  Shield,
  CheckCircle2,
  Clock,
  Users,
  Landmark,
  Search,
  PenTool,
  Home,
} from "lucide-react";

export default function OffPlanHowToBuy() {
  return (
    <DubaiOffPlanTemplate
      title="How to Buy Off-Plan Property in Dubai 2026 - Step-by-Step"
      metaDescription="Step-by-step guide on how to buy off-plan property in Dubai. From choosing a developer to signing the SPA, understand every step of the buying process."
      canonicalPath="/destinations/dubai/off-plan/how-to-buy"
      keywords={["how to buy off-plan dubai", "off-plan buying process", "dubai property buying steps", "spa agreement dubai", "off-plan for beginners"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "How to Buy", href: "/destinations/dubai/off-plan/how-to-buy" },
      ]}
      hero={{
        title: "How to Buy Off-Plan in Dubai",
        subtitle: "A comprehensive step-by-step guide to purchasing off-plan property in Dubai with expert tips at every stage",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "Step-by-Step" },
          { label: "Beginner-Friendly" },
          { label: "Expert Tips" },
        ],
      }}
      marketStats={[
        { value: "10-20%", label: "Booking Deposit", description: "Initial payment required" },
        { value: "30 Days", label: "SPA Signing", description: "After booking confirmation" },
        { value: "4%", label: "DLD Fee", description: "Registration cost" },
        { value: "2-4 Years", label: "Handover", description: "Typical construction time" },
      ]}
      marketStatsTitle="Key Buying Milestones"
      marketStatsSubtitle="Essential numbers to know before starting your off-plan purchase journey"
      highlights={[
        {
          icon: Search,
          title: "Research & Selection",
          description: "Research developers, locations, and projects. Compare prices, payment plans, and expected handover dates to find the right fit.",
        },
        {
          icon: CreditCard,
          title: "Booking & Deposit",
          description: "Reserve your unit with a 10-20% booking deposit. This secures your chosen unit and locks in the current price.",
        },
        {
          icon: PenTool,
          title: "SPA Signing",
          description: "Sign the Sales Purchase Agreement within 30-60 days. This legally binding contract outlines all terms and payment schedules.",
        },
        {
          icon: Home,
          title: "Construction & Handover",
          description: "Make milestone payments during construction. Upon completion, conduct a final inspection and receive your keys.",
        },
      ]}
      highlightsTitle="The Buying Process"
      highlightsSubtitle="Four key stages from first inquiry to receiving your keys"
      investmentBenefits={[
        {
          icon: FileText,
          title: "Documents Required",
          description: "You'll need your passport copy, Emirates ID (if resident), proof of address, and the booking deposit. Some developers may require source of funds documentation for larger purchases over AED 4 million.",
        },
        {
          icon: Shield,
          title: "Oqood Registration",
          description: "Off-plan contracts are registered with the Dubai Land Department through Oqood (the off-plan registration system). This provides legal protection and officially records your ownership interest.",
        },
        {
          icon: Clock,
          title: "Payment Schedule",
          description: "Typical payment plans spread costs: 10-20% at booking, 50-70% during construction (linked to milestones), and 20-30% at handover. Some developers offer post-handover plans extending 2-5 years.",
        },
        {
          icon: Users,
          title: "Remote Purchase Options",
          description: "You can purchase remotely via digital signatures and international bank transfers. Many investors complete the entire process without visiting Dubai. Power of attorney arrangements are also available.",
        },
        {
          icon: CheckCircle2,
          title: "Final Inspection",
          description: "Before handover, conduct a snagging inspection to identify any defects. Developers must fix all issues before you accept the keys. Use a professional snagger for best results.",
        },
        {
          icon: Key,
          title: "Title Deed Transfer",
          description: "After handover and final payment, the property is registered in your name at DLD. You receive your title deed typically within 30-60 days of completing all formalities.",
        },
      ]}
      investmentBenefitsTitle="What You Need to Know"
      investmentBenefitsSubtitle="Essential information for a smooth buying experience"
      faqs={[
        {
          question: "What documents do I need to buy off-plan?",
          answer: "You'll need your passport copy, Emirates ID (if resident), proof of address, and the booking deposit. Some developers may require source of funds documentation for larger purchases. Non-residents typically only need a valid passport.",
        },
        {
          question: "How long does the buying process take?",
          answer: "The initial booking takes 1-2 days. SPA (Sales Purchase Agreement) signing typically occurs within 30-60 days of booking, including DLD registration. The complete purchase process from first inquiry to signed SPA is usually 60-90 days.",
        },
        {
          question: "Do I need to be in Dubai to buy?",
          answer: "No, you can purchase remotely. Developers accept digital signatures, and bank transfers can be made internationally. Many buyers complete purchases without visiting Dubai. If preferred, you can appoint someone with power of attorney.",
        },
        {
          question: "Can I get a mortgage for off-plan property?",
          answer: "Yes, but it's more limited. Some banks offer mortgages for off-plan properties at 50% LTV (loan-to-value). Most buyers pay cash during construction and refinance after handover when 80% LTV mortgages become available.",
        },
        {
          question: "What happens if I want to sell before handover?",
          answer: "You can sell off-plan property before completion (called assignment/flipping). Most developers charge 2-5% NOC fee and require 30-50% of the price to be paid before allowing resale. The process typically takes 2-4 weeks.",
        },
      ]}
      cta={{
        title: "Ready to Buy Your Dubai Property?",
        description: "Let our experts guide you through every step of the buying process",
        primaryButtonText: "View Available Projects",
        primaryButtonHref: "/destinations/dubai/off-plan",
        secondaryButtonText: "Get Expert Guidance",
        secondaryButtonHref: "/contact",
      }}
    />
  );
}

import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  TrendingUp,
  Shield,
  DollarSign,
  Building2,
  CalendarDays,
  Key,
  BadgeCheck,
  Scale,
  Users,
  Globe,
  Landmark,
  FileText,
} from "lucide-react";

export default function OffPlanInvestmentGuide() {
  return (
    <DubaiOffPlanTemplate
      title="Dubai Off-Plan Investment Guide 2026 - Complete Buyer's Guide"
      metaDescription="Complete guide to investing in Dubai off-plan properties. Learn about payment plans, developer reputation, ROI expectations, and legal protections for investors."
      canonicalPath="/destinations/dubai/off-plan/investment-guide"
      keywords={["dubai off-plan investment", "buy off-plan dubai", "dubai property investment", "off-plan roi", "dubai real estate guide"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "Investment Guide", href: "/destinations/dubai/off-plan/investment-guide" },
      ]}
      hero={{
        title: "Dubai Off-Plan Investment Guide",
        subtitle: "Everything you need to know about buying off-plan property in Dubai, from first-time investor to seasoned portfolio builder",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "2026 Guide" },
          { label: "Expert Insights" },
          { label: "Step-by-Step" },
        ],
      }}
      marketStats={[
        { value: "7-10%", label: "Avg Rental Yield", description: "Annual return on investment" },
        { value: "60-80%", label: "Payment Plans", description: "During construction phase" },
        { value: "0%", label: "Property Tax", description: "No annual property tax" },
        { value: "15-25%", label: "Capital Gains", description: "Average appreciation" },
      ]}
      marketStatsTitle="Dubai Off-Plan Market Overview"
      marketStatsSubtitle="Key metrics that make Dubai one of the world's most attractive property investment destinations"
      highlights={[
        {
          icon: TrendingUp,
          title: "Capital Appreciation",
          description: "Properties typically appreciate 15-25% from launch to handover, with prime areas seeing even higher gains.",
        },
        {
          icon: DollarSign,
          title: "Below Market Pricing",
          description: "Off-plan properties are priced 10-20% below ready market rates, offering immediate equity on purchase.",
        },
        {
          icon: CalendarDays,
          title: "Flexible Payment Plans",
          description: "Spread payments over 3-5 years with interest-free installments during construction and post-handover.",
        },
        {
          icon: Shield,
          title: "Escrow Protection",
          description: "All payments go into RERA-regulated escrow accounts, protecting buyers from developer default.",
        },
      ]}
      highlightsTitle="Why Invest in Dubai Off-Plan"
      highlightsSubtitle="Key advantages that make off-plan the preferred choice for savvy investors"
      investmentBenefits={[
        {
          icon: Shield,
          title: "RERA Regulated Market",
          description: "Dubai's Real Estate Regulatory Agency (RERA) enforces strict developer requirements, escrow accounts, and milestone-based releases. Buyers enjoy maximum protection compared to other emerging markets.",
        },
        {
          icon: BadgeCheck,
          title: "Golden Visa Eligibility",
          description: "Invest AED 2 million or more to qualify for a 10-year UAE Golden Visa for yourself and your family. Properties below AED 2M can qualify for 2-year renewable investor visas.",
        },
        {
          icon: Globe,
          title: "No Foreign Ownership Restrictions",
          description: "100% freehold ownership available to all nationalities in designated areas. No need for local partners or residency requirements to purchase property.",
        },
        {
          icon: DollarSign,
          title: "Tax-Free Returns",
          description: "No income tax, capital gains tax, or annual property tax in Dubai. Your rental income and sales proceeds are 100% yours to keep.",
        },
        {
          icon: Building2,
          title: "Premium Developer Options",
          description: "Choose from world-class developers like Emaar, DAMAC, Nakheel, and Sobha with proven track records, quality construction, and on-time delivery.",
        },
        {
          icon: Key,
          title: "Early Unit Selection",
          description: "Off-plan buyers get first access to choose premium units - best floors, views, and layouts before public launch.",
        },
      ]}
      investmentBenefitsTitle="Investment Benefits"
      investmentBenefitsSubtitle="Why Dubai off-plan is attracting record international investment"
      faqs={[
        {
          question: "Is off-plan investment safe in Dubai?",
          answer: "Yes, Dubai has implemented strict regulations including escrow accounts, RERA registration, and developer licensing to protect off-plan buyers. All buyer payments go into regulated escrow accounts and are only released to developers upon completion of verified construction milestones. This makes Dubai one of the safest off-plan markets globally.",
        },
        {
          question: "What is the typical ROI on Dubai off-plan?",
          answer: "Dubai off-plan properties typically offer 15-25% capital appreciation from launch to handover, plus 6-10% rental yields annually once rented. Total returns depend on location, developer, timing, and market conditions. Prime areas like Downtown and Marina tend to see higher appreciation.",
        },
        {
          question: "Can foreigners buy off-plan in Dubai?",
          answer: "Yes, foreigners can buy freehold property in designated areas without residency requirements. There are no restrictions on nationality or need for local partners. You can purchase remotely and don't need to visit Dubai to complete the transaction.",
        },
        {
          question: "What are the costs involved in buying off-plan?",
          answer: "Main costs include: 4% DLD registration fee, 2% agency commission (if applicable), AED 5,000+ for NOC and admin fees, and Oqood registration (AED 1,000-2,000). There's no stamp duty or property tax. Total transaction costs are typically 6-7% of property value.",
        },
        {
          question: "How long does it take to complete an off-plan purchase?",
          answer: "The initial booking takes 1-2 days with a 10-20% deposit. The Sales Purchase Agreement (SPA) is typically signed within 30-60 days. Construction and handover depend on the project, usually 2-4 years from launch. The entire purchase process from inquiry to SPA signing takes about 60-90 days.",
        },
      ]}
      cta={{
        title: "Start Your Dubai Investment Journey",
        description: "Connect with our investment specialists for personalized guidance on the best off-plan opportunities",
        primaryButtonText: "Explore Properties",
        primaryButtonHref: "/destinations/dubai/off-plan",
        secondaryButtonText: "Contact Expert",
        secondaryButtonHref: "/contact",
      }}
    />
  );
}

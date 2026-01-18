import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  Scale,
  TrendingUp,
  Clock,
  DollarSign,
  Home,
  Shield,
  Building2,
  Key,
  CalendarDays,
  Percent,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export default function OffPlanVsReady() {
  return (
    <DubaiOffPlanTemplate
      title="Off-Plan vs Ready Property Dubai 2026 - Complete Comparison"
      metaDescription="Should you buy off-plan or ready property in Dubai? Compare pros, cons, ROI, payment plans, and risks of both options to make an informed decision."
      canonicalPath="/destinations/dubai/off-plan/vs-ready"
      keywords={["off-plan vs ready dubai", "off-plan advantages", "ready property benefits", "dubai property comparison", "should i buy off-plan"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "vs Ready", href: "/destinations/dubai/off-plan/vs-ready" },
      ]}
      hero={{
        title: "Off-Plan vs Ready Property",
        subtitle: "A comprehensive comparison to help you decide between purchasing off-plan or ready-to-move properties in Dubai",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "Full Comparison" },
          { label: "Pros & Cons" },
          { label: "Expert Analysis" },
        ],
      }}
      marketStats={[
        { value: "10-20%", label: "Off-Plan Discount", description: "vs ready market" },
        { value: "Immediate", label: "Ready Rental", description: "Income starts now" },
        { value: "0%", label: "Off-Plan Finance", description: "Interest-free plans" },
        { value: "2-4 Years", label: "Off-Plan Wait", description: "Construction time" },
      ]}
      marketStatsTitle="Key Comparison Points"
      marketStatsSubtitle="Understanding the fundamental differences between off-plan and ready properties"
      highlights={[
        {
          icon: DollarSign,
          title: "Off-Plan Pricing",
          description: "Off-plan properties are typically priced 10-20% below ready market rates, with prices increasing as construction progresses.",
        },
        {
          icon: Key,
          title: "Ready Possession",
          description: "Ready properties offer immediate possession. Move in or start renting within weeks of purchase completion.",
        },
        {
          icon: CalendarDays,
          title: "Payment Flexibility",
          description: "Off-plan offers 0% interest payment plans spread over years. Ready requires full payment or mortgage (with interest).",
        },
        {
          icon: TrendingUp,
          title: "Appreciation Window",
          description: "Off-plan provides longer appreciation runway. Ready properties reflect current market values.",
        },
      ]}
      highlightsTitle="Core Differences"
      highlightsSubtitle="What separates off-plan from ready property investments"
      investmentBenefits={[
        {
          icon: Percent,
          title: "Off-Plan: Interest-Free Finance",
          description: "Off-plan payment plans are 0% interest, spread over 2-5+ years. Ready properties require bank mortgages at 4-6% interest or full cash payment. This makes off-plan significantly more affordable.",
        },
        {
          icon: Clock,
          title: "Ready: Immediate Returns",
          description: "Ready properties generate rental income from day one. Off-plan requires waiting 2-4 years for handover before any income. If cash flow is priority, ready is superior.",
        },
        {
          icon: Shield,
          title: "Off-Plan: Newer Standards",
          description: "Off-plan delivers the latest construction standards, designs, and amenities. Ready properties may be 5-10+ years old with dated specifications.",
        },
        {
          icon: AlertTriangle,
          title: "Off-Plan: Construction Risk",
          description: "Delays, specification changes, or developer issues are inherent off-plan risks. Ready properties are what-you-see-is-what-you-get with no surprises.",
        },
        {
          icon: Building2,
          title: "Off-Plan: Unit Selection",
          description: "Early buyers get first choice of floors, views, and layouts. Ready market offers limited inventory - you choose from what's available.",
        },
        {
          icon: CheckCircle2,
          title: "Ready: Proven Quality",
          description: "Inspect the actual unit, building, and neighborhood before purchase. No uncertainty about finishing quality or community development.",
        },
      ]}
      investmentBenefitsTitle="Detailed Comparison"
      investmentBenefitsSubtitle="Weighing the advantages and disadvantages of each approach"
      faqs={[
        {
          question: "Which is better for first-time investors?",
          answer: "Off-plan is generally better for first-timers due to lower entry costs (10-20% down), interest-free payment plans, and lower total capital requirement. Ready requires more upfront capital or mortgage qualification.",
        },
        {
          question: "Which offers better ROI?",
          answer: "Off-plan typically offers higher total ROI due to price appreciation during construction (15-25%) plus post-completion rental yields. Ready offers immediate but lower total returns. Off-plan ROI is higher but delayed.",
        },
        {
          question: "What about Golden Visa eligibility?",
          answer: "Golden Visa requires completed, registered property. Buy off-plan now and apply after handover, or buy ready for immediate visa eligibility. If visa is urgent, ready is necessary.",
        },
        {
          question: "How do risks compare?",
          answer: "Off-plan carries construction risk (delays, spec changes, developer issues). Ready carries no construction risk but may have hidden defects. Off-plan risk is mitigated by choosing Tier 1 developers with strong track records.",
        },
        {
          question: "Can I get a mortgage for either?",
          answer: "Ready properties qualify for up to 80% LTV mortgages. Off-plan is harder to finance - some banks offer 50% LTV. Most off-plan buyers pay cash during construction using developer payment plans, then potentially refinance after handover.",
        },
      ]}
      cta={{
        title: "Make Your Decision",
        description: "Explore both off-plan and ready options to find your ideal investment",
        primaryButtonText: "View Off-Plan Projects",
        primaryButtonHref: "/destinations/dubai/off-plan",
        secondaryButtonText: "Compare Ready Properties",
        secondaryButtonHref: "/destinations/dubai/compare/off-plan-vs-ready",
      }}
    />
  );
}

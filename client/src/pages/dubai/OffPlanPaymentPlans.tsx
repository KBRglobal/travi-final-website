import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  CreditCard,
  CalendarDays,
  Percent,
  Building2,
  Key,
  Clock,
  Shield,
  TrendingUp,
  Wallet,
  Calculator,
  FileText,
  CheckCircle2,
} from "lucide-react";

export default function OffPlanPaymentPlans() {
  return (
    <DubaiOffPlanTemplate
      title="Dubai Off-Plan Payment Plans 2026 - 60/40, 80/20 & More"
      metaDescription="Understand Dubai off-plan payment plans including 60/40, 80/20, post-handover, and interest-free options. Compare plans and choose the best for your investment."
      canonicalPath="/destinations/dubai/off-plan/payment-plans"
      keywords={["dubai payment plans", "off-plan payment structure", "60/40 payment plan", "80/20 payment plan", "post-handover payment dubai"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "Payment Plans", href: "/destinations/dubai/off-plan/payment-plans" },
      ]}
      hero={{
        title: "Off-Plan Payment Plans Explained",
        subtitle: "Comprehensive guide to payment structures for Dubai off-plan properties, from 60/40 to post-handover options",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "60/40 Plans" },
          { label: "80/20 Plans" },
          { label: "Post-Handover" },
        ],
      }}
      marketStats={[
        { value: "0%", label: "Interest", description: "Most plans are interest-free" },
        { value: "5+ Years", label: "Max Duration", description: "With post-handover options" },
        { value: "1%", label: "Monthly", description: "Some extended plans offer" },
        { value: "10-20%", label: "Down Payment", description: "Typical initial deposit" },
      ]}
      marketStatsTitle="Payment Plan Highlights"
      marketStatsSubtitle="Key features that make Dubai off-plan payment plans attractive to investors"
      highlights={[
        {
          icon: CalendarDays,
          title: "60/40 Payment Plan",
          description: "Pay 60% during construction and 40% at handover. The most common structure offered by major developers like Emaar and Nakheel.",
        },
        {
          icon: Percent,
          title: "80/20 Payment Plan",
          description: "Pay 80% during construction and 20% at handover. Ideal for investors who prefer smaller final payments.",
        },
        {
          icon: Key,
          title: "Post-Handover Plans",
          description: "Continue payments after receiving keys, typically 20-50% over 2-5 years. Move in or rent while still paying.",
        },
        {
          icon: Clock,
          title: "1% Monthly Plans",
          description: "Extended plans with just 1% monthly payments over many years. Offered by developers like Danube and Samana.",
        },
      ]}
      highlightsTitle="Popular Payment Structures"
      highlightsSubtitle="Choose the plan that best fits your financial strategy"
      investmentBenefits={[
        {
          icon: Shield,
          title: "Interest-Free Financing",
          description: "Unlike bank mortgages, developer payment plans are typically interest-free. You're essentially getting 0% financing directly from the developer, making off-plan more affordable than ready properties requiring mortgages.",
        },
        {
          icon: Wallet,
          title: "Low Entry Point",
          description: "Start with just 10-20% down payment to secure your property. This allows you to invest in premium locations for a fraction of the total cost upfront, preserving capital for other investments.",
        },
        {
          icon: TrendingUp,
          title: "Equity While You Pay",
          description: "Your property appreciates during construction while you're still making payments. By handover, you may have 15-25% built-in equity from market appreciation alone.",
        },
        {
          icon: Building2,
          title: "Milestone-Based Payments",
          description: "Construction-linked payments mean you pay as the project progresses. Your money is released to developers only when verified construction milestones are achieved.",
        },
        {
          icon: CheckCircle2,
          title: "Flexibility Options",
          description: "Many developers allow payment plan modifications, additional prepayments without penalties, and flexible handover date arrangements to accommodate investor needs.",
        },
        {
          icon: Calculator,
          title: "Budget Planning",
          description: "Fixed payment schedules allow precise budget planning. Know exactly when each payment is due months or years in advance, enabling better financial management.",
        },
      ]}
      investmentBenefitsTitle="Why Payment Plans Matter"
      investmentBenefitsSubtitle="Strategic advantages of Dubai's developer financing options"
      faqs={[
        {
          question: "What is a 60/40 payment plan?",
          answer: "A 60/40 plan means you pay 60% of the property price during construction (spread across milestones like 10% booking, 10% at foundation, 20% at structure, 20% at finishing) and 40% upon handover. This is the most common structure in Dubai.",
        },
        {
          question: "What is post-handover payment?",
          answer: "Post-handover plans allow you to pay a portion (typically 20-50%) after receiving the property keys. This can extend 2-5 years after handover with interest-free installments. You can live in the property or rent it out while still making payments.",
        },
        {
          question: "Are off-plan payment plans interest-free?",
          answer: "Yes, most developer payment plans during construction and post-handover are interest-free. You're essentially getting 0% financing directly from the developer. This is a major advantage over bank mortgages which carry 4-6% interest.",
        },
        {
          question: "What happens if I miss a payment?",
          answer: "Developers typically allow grace periods of 30-60 days. Continued non-payment may result in penalties (usually 10-15% of outstanding amount) or contract termination. Developers generally prefer to work out solutions rather than cancel contracts.",
        },
        {
          question: "Can I pay off my plan early?",
          answer: "Yes, most developers allow early settlement without penalties. In fact, some offer small discounts (1-3%) for early full payment. This is beneficial if your financial situation improves or you want to sell before handover.",
        },
      ]}
      cta={{
        title: "Find Your Ideal Payment Plan",
        description: "Compare payment structures across different developers and projects",
        primaryButtonText: "Explore Projects",
        primaryButtonHref: "/destinations/dubai/off-plan",
        secondaryButtonText: "Calculate Payments",
        secondaryButtonHref: "/destinations/dubai/tools/roi-calculator",
      }}
    />
  );
}

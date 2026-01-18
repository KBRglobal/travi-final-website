import { DubaiCaseStudyTemplate } from "./templates/DubaiCaseStudyTemplate";
import { 
  TrendingUp, 
  Building2, 
  Clock, 
  DollarSign, 
  Target, 
  LineChart,
  Calendar,
  ArrowRight,
  Percent,
  BarChart3,
  Zap,
  AlertTriangle
} from "lucide-react";

export default function CaseStudyInvestorFlip() {
  return (
    <DubaiCaseStudyTemplate
      title="Off-Plan Property Flip Success | Dubai Investment Case Study"
      metaDescription="How an experienced investor achieved 25% profit in 3 years by buying off-plan and selling at handover. Complete Dubai property flip strategy with lessons learned."
      canonicalPath="/destinations/dubai/case-studies/investor-flip"
      keywords={[
        "dubai property flip",
        "off-plan investment",
        "dubai capital gains",
        "buy sell dubai property",
        "off-plan profit",
        "property flipping dubai"
      ]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Case Studies", href: "/destinations/dubai/case-studies" },
        { label: "Property Flip", href: "/destinations/dubai/case-studies/investor-flip" }
      ]}
      hero={{
        title: "25% Profit from Off-Plan Flip",
        subtitle: "How Viktor turned a 10% deposit into AED 375K profit in 3 years",
        topBadge: "Case Study",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "Experienced Investor", icon: LineChart },
          { label: "Off-Plan Strategy", icon: Building2 },
          { label: "25% ROI", icon: TrendingUp, variant: "highlight" }
        ]
      }}
      keyStats={[
        { value: "AED 1.5M", label: "Purchase Price", subtext: "Off-plan launch", icon: DollarSign },
        { value: "AED 375K", label: "Profit", subtext: "Sold at AED 1.875M", icon: TrendingUp },
        { value: "25%", label: "Total Return", subtext: "In 3 years", icon: Percent },
        { value: "150K", label: "Initial Deposit", subtext: "10% at launch", icon: Target }
      ]}
      keyStatsTitle="Investment Performance"
      keyStatsSubtitle="Key metrics from Viktor's off-plan flip strategy"
      storyHighlights={[
        {
          title: "The Strategy: Buy Early, Sell at Handover",
          content: "Viktor, a 52-year-old Russian investor with Dubai property experience, follows a specific strategy: buy at off-plan launch when prices are lowest, hold during construction, sell at handover when prices peak. His target: 20-30% capital appreciation.",
          icon: Target
        },
        {
          title: "Project Selection: Emaar Creek Harbour",
          content: "In 2021, Viktor identified Emaar Creek Harbour as undervalued with strong appreciation potential. He chose a 2BR unit in a new tower at launch price: AED 1.5M. Emaar's track record and the location near Old Dubai and Downtown made it attractive.",
          icon: Building2
        },
        {
          title: "Payment Structure During Construction",
          content: "Viktor used a 60/40 payment plan: 60% during construction, 40% on handover. His payments: 10% booking, then installments tied to construction milestones. Total paid before handover: AED 900K.",
          icon: Calendar
        },
        {
          title: "Market Timing & Exit Strategy",
          content: "As construction neared completion in 2024, Dubai's market was booming. Similar units in completed Emaar Creek Harbour towers were selling at AED 2,000/sqft. Viktor listed his unit at AED 1.875M—25% above his purchase price.",
          icon: LineChart
        },
        {
          title: "The Sale at Handover",
          content: "Viktor found a buyer within 3 weeks—an end-user family wanting ready property. The buyer paid the remaining 40% (AED 600K) to Emaar and AED 375K profit to Viktor. Total transaction completed before final handover.",
          icon: Zap
        },
        {
          title: "Final Numbers & Reinvestment",
          content: "Investment: AED 900K over 3 years. Return: AED 375K profit + original capital. Effective ROI: 42% on capital deployed (25% on property value). Viktor immediately reinvested in a new off-plan launch in Dubai South.",
          icon: BarChart3
        }
      ]}
      storyHighlightsTitle="Viktor's Flip Strategy in Action"
      storyHighlightsSubtitle="A detailed look at the off-plan to handover exit strategy"
      lessonsLearned={[
        {
          title: "Launch Prices Are Best Prices",
          description: "Developers offer lowest prices at project launch to generate momentum. Viktor's unit at AED 1.5M was selling at AED 1.875M+ by handover—a 25% difference.",
          takeaway: "Off-plan launches offer 15-25% discount vs. ready prices"
        },
        {
          title: "Developer Selection Matters",
          description: "Viktor only buys from tier-1 developers (Emaar, DAMAC, Nakheel, Meraas). Their track record means projects complete on time and attract buyers at resale.",
          takeaway: "Stick to established developers for flip strategies"
        },
        {
          title: "Payment Plans Reduce Capital Requirements",
          description: "With 60/40 plans, Viktor deployed AED 900K to control a AED 1.5M asset. His 42% ROI on deployed capital beats most alternative investments.",
          takeaway: "Payment plans amplify returns on capital"
        },
        {
          title: "Timing the Exit is Critical",
          description: "Viktor listed his unit 3 months before handover when buyer demand peaks (people want ready apartments). Waiting too long risks market shifts.",
          takeaway: "List 2-3 months before handover for maximum demand"
        },
        {
          title: "This Strategy Has Risks",
          description: "Off-plan flipping works in rising markets. If the market stalls or drops, you might need to complete purchase and hold. Viktor only invests what he could hold long-term if needed.",
          takeaway: "Never flip with money you can't afford to hold"
        }
      ]}
      lessonsLearnedTitle="Key Lessons for Property Flippers"
      lessonsLearnedSubtitle="Strategic insights for off-plan investment and exit"
      cta={{
        title: "Explore Off-Plan Investment Opportunities",
        subtitle: "New Launches with High Appreciation Potential",
        description: "Discover current off-plan launches from top developers with attractive payment plans and strong capital appreciation potential.",
        primaryLabel: "View New Launches",
        primaryIcon: ArrowRight,
        primaryHref: "/destinations/dubai/off-plan/best-2026",
        secondaryLabel: "Off-Plan Investment Guide",
        secondaryHref: "/destinations/dubai/off-plan/investment-guide",
        variant: "gradient",
        badges: ["Launch Prices", "Payment Plans", "Developer Analysis"]
      }}
    />
  );
}

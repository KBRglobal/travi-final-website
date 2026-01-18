import { DubaiCaseStudyTemplate } from "./templates/DubaiCaseStudyTemplate";
import { 
  Sunset, 
  Building2, 
  Wallet, 
  Heart, 
  DollarSign, 
  TrendingUp,
  Calendar,
  ArrowRight,
  Palmtree,
  Shield,
  Umbrella,
  Sun
} from "lucide-react";

export default function CaseStudyRetirementPlanning() {
  return (
    <DubaiCaseStudyTemplate
      title="Retirement Income Through Dubai Property | Buy-to-Let Case Study"
      metaDescription="How a British retiree generates AED 120K tax-free annual income through Dubai buy-to-let investments. Complete retirement property strategy with passive income planning."
      canonicalPath="/destinations/dubai/case-studies/retirement-planning"
      keywords={[
        "dubai retirement income",
        "tax free rental income",
        "retirement property dubai",
        "passive income dubai",
        "buy to let dubai",
        "expat retirement dubai"
      ]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Case Studies", href: "/destinations/dubai/case-studies" },
        { label: "Retirement Planning", href: "/destinations/dubai/case-studies/retirement-planning" }
      ]}
      hero={{
        title: "Tax-Free Retirement Income in Dubai",
        subtitle: "How David generates AED 120K passive income annually from Dubai property",
        topBadge: "Case Study",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "Retiree Investor", icon: Sunset },
          { label: "Buy-to-Let Strategy", icon: Building2 },
          { label: "AED 120K/Year", icon: Wallet, variant: "highlight" }
        ]
      }}
      keyStats={[
        { value: "AED 120K", label: "Annual Income", subtext: "Tax-free", icon: DollarSign },
        { value: "2", label: "Properties", subtext: "Rental portfolio", icon: Building2 },
        { value: "7.8%", label: "Net Yield", subtext: "After expenses", icon: TrendingUp },
        { value: "0%", label: "Income Tax", subtext: "UAE tax-free", icon: Shield }
      ]}
      keyStatsTitle="Retirement Income Overview"
      keyStatsSubtitle="David's passive income from Dubai real estate"
      storyHighlights={[
        {
          title: "The Retirement Planning Challenge",
          content: "David, 62, retired from a UK engineering career with a pension and savings. UK rental income would be taxed at 40%. He researched international options and discovered Dubai's 0% income tax and strong rental yields could significantly boost his retirement income.",
          icon: Sunset
        },
        {
          title: "Why Dubai for Retirement Income",
          content: "David calculated the math: a UK buy-to-let yielding 4% after 40% tax equals 2.4% net. The same capital in Dubai yielding 7% with 0% tax equals 7% net. Nearly 3x the retirement income from the same investment.",
          icon: TrendingUp
        },
        {
          title: "Property 1: JVC 2BR (AED 800K)",
          content: "David started with a 2BR apartment in JVC. Purchase price: AED 800K. Annual rent: AED 65,000. After service charges and management fees: AED 55,000 net (6.9% yield). Tenant: a young professional on a 2-year contract.",
          icon: Building2
        },
        {
          title: "Property 2: Business Bay 1BR (AED 900K)",
          content: "Encouraged by results, David added a 1BR in Business Bay. Purchase price: AED 900K. Annual rent: AED 75,000. After expenses: AED 65,000 net (7.2% yield). Premium location commands premium rent.",
          icon: DollarSign
        },
        {
          title: "Setting Up for Passive Income",
          content: "David hired property management companies for both units (8% of rent). They handle tenant finding, maintenance, and rent collection. Rental income is deposited directly to his UAE bank account monthly. He manages everything remotely from the UK.",
          icon: Wallet
        },
        {
          title: "Life Today: Financially Secure Retirement",
          content: "David receives AED 120,000 (approximately £26,000) annually, tax-free. Combined with his UK pension, he enjoys a comfortable retirement with 6 months in Dubai each winter. His properties have also appreciated 15%, adding to his wealth.",
          icon: Sun
        }
      ]}
      storyHighlightsTitle="David's Retirement Income Journey"
      storyHighlightsSubtitle="Building tax-free passive income through Dubai property"
      lessonsLearned={[
        {
          title: "Tax-Free Means More Income",
          description: "David's AED 120K income in the UK would net approximately £19,500 after 40% tax. In Dubai: £26,000 net. That's £6,500 more per year—funding 2 extra months of comfortable living.",
          takeaway: "Dubai's 0% tax multiplies effective rental yield"
        },
        {
          title: "Yield Over Appreciation for Retirees",
          description: "David prioritized high-yield properties (JVC, Business Bay) over premium appreciation plays (Palm, Downtown). Steady income matters more than capital gains in retirement.",
          takeaway: "Choose 7%+ yield properties for income-focused investing"
        },
        {
          title: "Professional Management is Essential",
          description: "Managing properties remotely from another country requires professional support. David's 8% management fee is worth the peace of mind and consistent service.",
          takeaway: "Budget 8-10% for property management when investing remotely"
        },
        {
          title: "UAE Bank Account Simplifies Everything",
          description: "David opened a UAE bank account during his property purchase visit. Rent is deposited locally, he uses a UAE debit card when visiting, and transfers to the UK as needed.",
          takeaway: "Open a UAE bank account during your purchase trip"
        },
        {
          title: "Retirement Visa Available for Property Owners",
          description: "David qualifies for a 5-year UAE retirement visa (age 55+, property worth AED 1M+, income proof). He spends winters in Dubai, avoiding UK cold while enjoying his investment firsthand.",
          takeaway: "Property ownership enables retirement residency"
        }
      ]}
      lessonsLearnedTitle="Key Lessons for Retirement Investors"
      lessonsLearnedSubtitle="Building passive income through Dubai real estate"
      cta={{
        title: "Plan Your Retirement Income in Dubai",
        subtitle: "Tax-Free Passive Income Strategy",
        description: "Discover how Dubai property can boost your retirement income with tax-free rental yields. Free consultation with retirement investment specialists.",
        primaryLabel: "High-Yield Properties",
        primaryIcon: ArrowRight,
        primaryHref: "/destinations/dubai/off-plan/jvc",
        secondaryLabel: "Rental Yield Calculator",
        secondaryHref: "/destinations/dubai/tools/rental-yield-calculator",
        variant: "gradient",
        badges: ["Tax-Free Income", "Remote Management", "Retirement Visas"]
      }}
    />
  );
}

import { DubaiCaseStudyTemplate } from "./templates/DubaiCaseStudyTemplate";
import { 
  PieChart, 
  Building2, 
  Home, 
  Globe, 
  DollarSign, 
  TrendingUp,
  MapPin,
  Calendar,
  ArrowRight,
  BarChart3,
  Layers,
  Shield
} from "lucide-react";

export default function CaseStudyPortfolioDiversification() {
  return (
    <DubaiCaseStudyTemplate
      title="Dubai Property Portfolio Building | Investment Diversification Case Study"
      metaDescription="How an international investor built a diversified 4-property Dubai portfolio with apartments and villas across different areas. Complete portfolio strategy with AED 8M investment."
      canonicalPath="/destinations/dubai/case-studies/portfolio-diversification"
      keywords={[
        "dubai property portfolio",
        "real estate diversification",
        "multiple properties dubai",
        "international investor dubai",
        "dubai investment portfolio",
        "property diversification strategy"
      ]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Case Studies", href: "/destinations/dubai/case-studies" },
        { label: "Portfolio Building", href: "/destinations/dubai/case-studies/portfolio-diversification" }
      ]}
      hero={{
        title: "Building a Diversified Dubai Portfolio",
        subtitle: "How Chen built a AED 8M portfolio with 4 properties across different Dubai communities",
        topBadge: "Case Study",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "International Investor", icon: Globe },
          { label: "4 Properties", icon: Layers },
          { label: "7.5% Avg Yield", icon: TrendingUp, variant: "highlight" }
        ]
      }}
      keyStats={[
        { value: "AED 8M", label: "Total Portfolio", subtext: "4 properties", icon: DollarSign },
        { value: "4", label: "Properties", subtext: "Apartments & villas", icon: Building2 },
        { value: "7.5%", label: "Average Yield", subtext: "Net rental income", icon: TrendingUp },
        { value: "3 Years", label: "Building Time", subtext: "2021-2024", icon: Calendar }
      ]}
      keyStatsTitle="Portfolio Overview"
      keyStatsSubtitle="Chen's diversified Dubai real estate holdings"
      storyHighlights={[
        {
          title: "The Investor Profile",
          content: "Chen, a 48-year-old Chinese-Canadian entrepreneur, sold his tech company in 2021 and sought to deploy capital into real estate. He chose Dubai for its tax-free environment, strong yields, and strategic location between East and West.",
          icon: Globe
        },
        {
          title: "The Diversification Philosophy",
          content: "Rather than buying one trophy property, Chen adopted a portfolio approach: spread risk across property types (apartments and villas), locations (established and emerging), and price points (mid-market and premium).",
          icon: PieChart
        },
        {
          title: "Property 1: JVC 1BR Apartment (AED 750K)",
          content: "Started with an affordable entry point for high yields. JVC 1BR offers 9% gross yields, attracting young professionals. This became his 'cash flow engine' property, generating consistent monthly income.",
          icon: Building2
        },
        {
          title: "Property 2: Marina 2BR Apartment (AED 2.2M)",
          content: "Premium waterfront location for capital appreciation and tourist rental potential. Marina 2BR commands strong short-term rental rates during peak season and solid long-term tenant demand year-round.",
          icon: MapPin
        },
        {
          title: "Property 3: Dubai Hills 3BR Townhouse (AED 3.3M)",
          content: "Family-oriented community for stable long-term tenants. Dubai Hills attracts executives on multi-year contracts. Lower turnover, consistent income, and strong appreciation as the community matures.",
          icon: Home
        },
        {
          title: "Property 4: Dubai South 2BR (AED 1.75M)",
          content: "Emerging area play for maximum appreciation. Dubai South near Expo City is undervalued compared to established areas. Chen sees 50%+ appreciation potential over 5 years as infrastructure develops.",
          icon: TrendingUp
        }
      ]}
      storyHighlightsTitle="Chen's Portfolio Construction"
      storyHighlightsSubtitle="Building a balanced Dubai property portfolio over 3 years"
      lessonsLearned={[
        {
          title: "Mix Yield and Growth Properties",
          description: "Chen's JVC property generates 9% yield (cash flow). His Dubai South property yields 6% but offers higher growth potential. The mix provides both income today and appreciation tomorrow.",
          takeaway: "Balance high-yield properties with high-growth opportunities"
        },
        {
          title: "Diversify Across Locations",
          description: "If one area underperforms, others compensate. JVC, Marina, Dubai Hills, and Dubai South respond to different market factors. Chen's portfolio isn't dependent on a single area's success.",
          takeaway: "Never put all capital in one neighborhood"
        },
        {
          title: "Different Property Types, Different Tenants",
          description: "Apartments attract young professionals and tourists. Villas attract families on long-term contracts. Chen's tenant mix reduces vacancy risk across market cycles.",
          takeaway: "Apartment and villa mix creates tenant diversification"
        },
        {
          title: "Start Small, Scale Up",
          description: "Chen began with AED 750K in JVC, learned the Dubai market, then progressively added larger properties. Each purchase built on lessons from the previous one.",
          takeaway: "Learn with smaller investments before going premium"
        },
        {
          title: "Professional Management is Non-Negotiable",
          description: "Managing 4 properties across Dubai remotely requires systems. Chen uses property management companies for each property (5-8% of rental income) and quarterly reporting from a portfolio accountant.",
          takeaway: "Budget 10% for management and accounting across portfolio"
        }
      ]}
      lessonsLearnedTitle="Key Lessons for Portfolio Investors"
      lessonsLearnedSubtitle="Strategic insights for building a diversified Dubai property portfolio"
      cta={{
        title: "Build Your Dubai Property Portfolio",
        subtitle: "Diversified Investment Strategy",
        description: "Whether you're starting with one property or building a multi-asset portfolio, we help you create a balanced approach to Dubai real estate investment.",
        primaryLabel: "Investment Strategy Consultation",
        primaryIcon: ArrowRight,
        primaryHref: "/destinations/dubai/off-plan/investment-guide",
        secondaryLabel: "Calculate Portfolio Returns",
        secondaryHref: "/destinations/dubai/tools/roi-calculator",
        variant: "gradient",
        badges: ["Portfolio Planning", "Multi-Property Deals", "Tax Optimization"]
      }}
    />
  );
}

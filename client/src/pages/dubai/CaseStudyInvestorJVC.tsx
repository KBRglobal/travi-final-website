import { DubaiCaseStudyTemplate } from "./templates/DubaiCaseStudyTemplate";
import { 
  User, 
  Building2, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Search, 
  FileCheck, 
  Key, 
  Wallet,
  Target,
  ArrowRight
} from "lucide-react";

export default function CaseStudyInvestorJVC() {
  return (
    <DubaiCaseStudyTemplate
      title="JVC First-Time Investor Success Story | Dubai Real Estate Case Study"
      metaDescription="Discover how a first-time investor achieved 9% rental yield and 15% appreciation in 2 years with an AED 600K investment in JVC, Dubai. Real case study with lessons learned."
      canonicalPath="/destinations/dubai/case-studies/investor-jvc"
      keywords={[
        "JVC investment",
        "dubai first time investor",
        "jvc rental yield",
        "dubai property investment",
        "jvc apartments",
        "dubai real estate success story"
      ]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Case Studies", href: "/destinations/dubai/case-studies" },
        { label: "JVC Investor", href: "/destinations/dubai/case-studies/investor-jvc" }
      ]}
      hero={{
        title: "First-Time Investor Success in JVC",
        subtitle: "How Ahmed turned AED 600K into a passive income machine with 9% yields",
        topBadge: "Case Study",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "First-Time Investor", icon: User },
          { label: "1BR Apartment", icon: Building2 },
          { label: "9% Yield", icon: TrendingUp, variant: "highlight" }
        ]
      }}
      keyStats={[
        { value: "AED 600K", label: "Total Investment", subtext: "Including fees", icon: DollarSign },
        { value: "9%", label: "Rental Yield", subtext: "Annual ROI", icon: TrendingUp },
        { value: "15%", label: "Appreciation", subtext: "In 2 years", icon: Target },
        { value: "2 Years", label: "Timeline", subtext: "From purchase to today", icon: Calendar }
      ]}
      keyStatsTitle="Investment Overview"
      keyStatsSubtitle="Key metrics from Ahmed's JVC investment journey"
      storyHighlights={[
        {
          title: "The Starting Point: Budget Planning",
          content: "Ahmed, a 32-year-old marketing professional, had saved AED 600,000 over 5 years. After renting in Dubai for 3 years, he wanted to build wealth through property investment. He researched extensively and identified JVC as an emerging hotspot with strong yields.",
          icon: Wallet
        },
        {
          title: "Research & Area Selection",
          content: "After comparing Business Bay, Dubai South, and JVC, Ahmed chose JVC for its affordability, high rental demand from young professionals, and upcoming infrastructure developments. He focused on buildings near Circle Mall and the upcoming Metro station.",
          icon: Search
        },
        {
          title: "Property Selection & Due Diligence",
          content: "Ahmed shortlisted 5 properties and visited each one. He checked completion quality, building management, existing tenant reviews, and service charges. He chose a 1BR apartment in a reputable building with excellent facilities and low vacancy rates.",
          icon: Building2
        },
        {
          title: "Purchase & Documentation",
          content: "The purchase process took 3 weeks. Ahmed secured the property with a 10% deposit, completed DLD registration (4% fee), and ensured all NOCs were in place. Total acquisition cost including fees: AED 600,000.",
          icon: FileCheck
        },
        {
          title: "Tenant Placement & Management",
          content: "Within 2 weeks of handover, Ahmed found a tenant through a reputable agency. He rented the apartment for AED 52,000/year (post-dated cheques). He hired a property management company for AED 5,000/year to handle maintenance.",
          icon: Key
        },
        {
          title: "Current Results After 2 Years",
          content: "Today, Ahmed's property is valued at AED 690,000 (15% appreciation). His net rental income after expenses is AED 45,000/year (9% yield). He's now saving for his second investment property in Dubai South.",
          icon: TrendingUp
        }
      ]}
      storyHighlightsTitle="Ahmed's Investment Journey"
      storyHighlightsSubtitle="A step-by-step look at how this first-time investor built his Dubai property portfolio"
      lessonsLearned={[
        {
          title: "Location Over Luxury",
          description: "Ahmed chose a well-located property over a fancy one. Proximity to metro, malls, and offices drives rental demand more than premium finishes.",
          takeaway: "Focus on accessibility and amenities that tenants actually want"
        },
        {
          title: "Budget for All Costs",
          description: "Many first-time investors forget about DLD fees (4%), agency fees (2%), and service charges. Ahmed budgeted for everything upfront, avoiding surprises.",
          takeaway: "Add 8-10% to property price for total acquisition cost"
        },
        {
          title: "Professional Management Pays Off",
          description: "Despite the cost, hiring a property manager freed Ahmed's time and ensured professional tenant handling. His tenant renewed for a second year.",
          takeaway: "Property management costs 5-8% but saves headaches"
        },
        {
          title: "Start Small, Think Long-Term",
          description: "Rather than stretching for a 2BR, Ahmed started with a 1BR he could comfortably afford. Lower risk, higher yield, and a foundation for portfolio growth.",
          takeaway: "Better to own one property outright than stretch for two"
        },
        {
          title: "Research the Building, Not Just the Area",
          description: "JVC has varying quality. Ahmed inspected service charges, management reputation, and completion quality before committing.",
          takeaway: "Check RERA for building service charge history"
        }
      ]}
      lessonsLearnedTitle="Key Lessons from Ahmed's Journey"
      lessonsLearnedSubtitle="Practical insights for first-time Dubai property investors"
      cta={{
        title: "Ready to Start Your Investment Journey?",
        subtitle: "Your Dubai Success Story Begins Here",
        description: "Whether you're a first-time investor or expanding your portfolio, our team can help you find the perfect property in JVC and beyond.",
        primaryLabel: "Explore JVC Properties",
        primaryIcon: ArrowRight,
        primaryHref: "/destinations/dubai/off-plan/jvc",
        secondaryLabel: "Calculate Your ROI",
        secondaryHref: "/destinations/dubai/tools/roi-calculator",
        variant: "gradient",
        badges: ["Free Consultation", "No Obligations", "Expert Guidance"]
      }}
    />
  );
}

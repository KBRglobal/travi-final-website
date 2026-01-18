import { DubaiCaseStudyTemplate } from "./templates/DubaiCaseStudyTemplate";
import { 
  Rocket, 
  Building2, 
  Star, 
  Clock, 
  DollarSign, 
  MapPin,
  Calendar,
  ArrowRight,
  Percent,
  Award,
  Zap,
  Users
} from "lucide-react";

export default function CaseStudyOffPlanLaunch() {
  return (
    <DubaiCaseStudyTemplate
      title="Off-Plan Launch Day Success | Emaar Creek Harbour Case Study"
      metaDescription="How an early investor secured the best unit at the best price during an Emaar Creek Harbour launch. Complete off-plan launch strategy with preparation tips."
      canonicalPath="/destinations/dubai/case-studies/off-plan-launch"
      keywords={[
        "emaar off-plan launch",
        "dubai property launch",
        "creek harbour investment",
        "off-plan launch tips",
        "best off-plan deals dubai",
        "new launch dubai property"
      ]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Case Studies", href: "/destinations/dubai/case-studies" },
        { label: "Off-Plan Launch", href: "/destinations/dubai/case-studies/off-plan-launch" }
      ]}
      hero={{
        title: "Winning at Off-Plan Launch Day",
        subtitle: "How Aisha secured the best Creek Harbour unit by preparing ahead",
        topBadge: "Case Study",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "Early Investor", icon: Star },
          { label: "Emaar Creek Harbour", icon: Building2 },
          { label: "Launch Price", icon: Zap, variant: "highlight" }
        ]
      }}
      keyStats={[
        { value: "AED 1.3M", label: "Launch Price", subtext: "2BR waterfront", icon: DollarSign },
        { value: "22%", label: "Below Market", subtext: "Vs. ready units", icon: Percent },
        { value: "Unit 2401", label: "Prime Selection", subtext: "High floor, best view", icon: Star },
        { value: "Day 1", label: "Secured", subtext: "At launch opening", icon: Clock }
      ]}
      keyStatsTitle="Launch Day Results"
      keyStatsSubtitle="What Aisha achieved with proper preparation"
      storyHighlights={[
        {
          title: "The Opportunity: Emaar Creek Harbour New Tower",
          content: "Aisha, a 35-year-old Dubai-based finance professional, learned about an upcoming Emaar Creek Harbour tower launch 2 months before the public announcement. She knew launch prices are always lowest and best units go first.",
          icon: Rocket
        },
        {
          title: "Pre-Launch Research & Registration",
          content: "Aisha registered for VIP early access through Emaar's preferred broker network. She studied the masterplan, identified the best-positioned units (high floors, waterfront views, away from noise), and prepared her finances.",
          icon: MapPin
        },
        {
          title: "Understanding the Unit Mix",
          content: "Before launch, she obtained the floor plan catalog. She ranked her top 5 unit choices: all 2BR with Creek views, floors 20-30 (best views without premium penthouse pricing). Her target: Unit 2401—24th floor, corner position.",
          icon: Building2
        },
        {
          title: "Financial Preparation",
          content: "Aisha arranged AED 130K for the 10% deposit, obtained bank pre-approval for mortgage (if needed later), and had passport copies, Emirates ID, and proof of funds ready. Launch day requires instant decisions.",
          icon: DollarSign
        },
        {
          title: "Launch Day Execution",
          content: "At 8am on launch day, Aisha was first in line at the sales center with her broker. By 8:15am, she had Unit 2401 reserved with a holding cheque. By 9am, she signed the SPA. Top units were gone within 2 hours.",
          icon: Zap
        },
        {
          title: "The Results 2 Years Later",
          content: "Aisha's unit is now under construction, 70% complete. Similar ready units in Creek Harbour sell at AED 1.65M—27% above her purchase price. She's locked in AED 350K in paper gains before the building even completes.",
          icon: Award
        }
      ]}
      storyHighlightsTitle="Aisha's Launch Day Strategy"
      storyHighlightsSubtitle="How preparation turned into the perfect off-plan purchase"
      lessonsLearned={[
        {
          title: "Early Access is Everything",
          description: "VIP and broker-priority access means seeing units hours or days before the public. Aisha's broker relationship gave her first-mover advantage.",
          takeaway: "Build relationships with developer-connected brokers"
        },
        {
          title: "Know Your Target Units Before Launch",
          description: "Aisha walked in knowing exactly which units she wanted, ranked by preference. When crowds are competing, hesitation costs you the best options.",
          takeaway: "Study floor plans and make decisions before launch day"
        },
        {
          title: "High Floor, Corner Units Command Premium",
          description: "Not all units are equal. High floors with unobstructed views appreciate more and rent higher. Aisha's research identified these before launch.",
          takeaway: "Corner units and high floors offer best appreciation"
        },
        {
          title: "Have All Documents Ready",
          description: "Launch day moves fast. Aisha had her passport, Emirates ID, proof of funds, and deposit cheque ready. Missing documents mean missing out.",
          takeaway: "Prepare a complete document folder before launch"
        },
        {
          title: "Launch Prices Are Non-Negotiable—But Worth It",
          description: "Unlike resale, launch prices are fixed. But Aisha's 22% discount vs. ready market justifies the wait for construction. Launch pricing is the negotiation advantage.",
          takeaway: "Accept launch prices—the discount is built in"
        }
      ]}
      lessonsLearnedTitle="Key Lessons for Off-Plan Launch Success"
      lessonsLearnedSubtitle="How to prepare for and win at project launches"
      cta={{
        title: "Get Early Access to New Launches",
        subtitle: "Be First at the Next Big Launch",
        description: "Join our priority list for upcoming off-plan launches from Emaar, DAMAC, and other top developers. Get VIP access and launch-day support.",
        primaryLabel: "Join VIP Launch List",
        primaryIcon: ArrowRight,
        primaryHref: "/destinations/dubai/off-plan/best-2026",
        secondaryLabel: "Upcoming Launches Calendar",
        secondaryHref: "/destinations/dubai/off-plan",
        variant: "gradient",
        badges: ["VIP Access", "Launch Day Support", "Unit Selection Help"]
      }}
    />
  );
}

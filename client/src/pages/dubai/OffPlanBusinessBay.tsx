import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  Building2,
  TrendingUp,
  Waves,
  MapPin,
  Train,
  Briefcase,
  DollarSign,
  Shield,
  Star,
  Home,
  Coffee,
  Users,
} from "lucide-react";

export default function OffPlanBusinessBay() {
  return (
    <DubaiOffPlanTemplate
      title="Business Bay Off-Plan Properties 2026 - Dubai Investment"
      metaDescription="Explore off-plan apartments and penthouses in Business Bay, Dubai. Top projects, payment plans, ROI analysis, and investment guide for Business Bay."
      canonicalPath="/destinations/dubai/off-plan/business-bay"
      keywords={["business bay off-plan", "business bay apartments", "business bay investment", "off-plan cbd dubai", "business bay new projects"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "Business Bay", href: "/destinations/dubai/off-plan/business-bay" },
      ]}
      hero={{
        title: "Off-Plan in Business Bay",
        subtitle: "High-yield investment opportunities in Dubai's thriving CBD with canal views and Downtown proximity",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "8%+ ROI" },
          { label: "Canal Views" },
          { label: "CBD Location" },
        ],
      }}
      marketStats={[
        { value: "8.5%", label: "Rental Yield", description: "Average annual ROI" },
        { value: "AED 1.5K", label: "Per Sqft", description: "Average price" },
        { value: "2026-2028", label: "Handover", description: "Current projects" },
        { value: "AED 1M+", label: "Entry Point", description: "Studios from" },
      ]}
      marketStatsTitle="Business Bay Market Overview"
      marketStatsSubtitle="Key investment metrics for Dubai's dynamic central business district"
      highlights={[
        {
          icon: Waves,
          title: "Dubai Water Canal",
          description: "Premium towers line the iconic Dubai Water Canal, offering stunning waterfront views and pedestrian promenades.",
        },
        {
          icon: MapPin,
          title: "Downtown Proximity",
          description: "Walking distance to Dubai Mall, Burj Khalifa, and DIFC. The ultimate urban lifestyle location.",
        },
        {
          icon: TrendingUp,
          title: "High Rental Demand",
          description: "Young professionals and executives drive consistent 8%+ rental yields with low vacancy rates.",
        },
        {
          icon: Briefcase,
          title: "Business Hub",
          description: "Home to major corporate headquarters, startups, and coworking spaces attracting business tenants.",
        },
      ]}
      highlightsTitle="Why Business Bay"
      highlightsSubtitle="The factors driving demand in Dubai's most dynamic district"
      investmentBenefits={[
        {
          icon: TrendingUp,
          title: "Highest Rental Yields",
          description: "Business Bay consistently delivers 8-9% rental yields, among the highest in Dubai. Strong demand from working professionals ensures quick tenant placement and minimal vacancy periods.",
        },
        {
          icon: Building2,
          title: "Premium Developments",
          description: "Major developers including Emaar, Binghatti, and Omniyat are delivering luxury towers with premium finishes, branded residences, and exceptional amenities.",
        },
        {
          icon: Train,
          title: "Excellent Connectivity",
          description: "Metro stations, major highways (Sheikh Zayed Road, Al Khail), and water taxi stops provide seamless connectivity across Dubai.",
        },
        {
          icon: Coffee,
          title: "Lifestyle & Dining",
          description: "The area features world-class restaurants, cafes, and retail along the canal promenade. JW Marriott Marquis, the world's tallest hotel, anchors the hospitality scene.",
        },
        {
          icon: Star,
          title: "Capital Appreciation",
          description: "Properties here have seen 20-30% appreciation since 2022. Ongoing developments and infrastructure improvements continue to drive values higher.",
        },
        {
          icon: Users,
          title: "Young Demographics",
          description: "Business Bay attracts Dubai's young professional crowd, ensuring consistent rental demand and a vibrant community atmosphere.",
        },
      ]}
      investmentBenefitsTitle="Investment Benefits"
      investmentBenefitsSubtitle="Why Business Bay remains a top choice for property investors"
      faqs={[
        {
          question: "What are the best off-plan projects in Business Bay?",
          answer: "Top projects include The Opus by Omniyat (Zaha Hadid design), Marquise Square Tower 2, The Residences at Dorchester Collection, Binghatti Onyx, and various Damac canal-front towers. Each offers unique positioning and payment plans.",
        },
        {
          question: "Is Business Bay good for short-term rentals?",
          answer: "Yes, Business Bay is excellent for short-term rentals due to its proximity to Downtown attractions. Holiday homes can achieve 20-30% higher returns than long-term rentals, though occupancy varies seasonally.",
        },
        {
          question: "What payment plans are available in Business Bay?",
          answer: "Most developers offer 60/40 or 70/30 plans. Some like Binghatti and Samana offer extended 1% monthly plans. Post-handover options (3-5 years) are increasingly common in this area.",
        },
        {
          question: "How does Business Bay compare to Downtown Dubai?",
          answer: "Business Bay offers 15-20% lower prices than Downtown with similar or better rental yields. While Downtown has Burj Khalifa views, Business Bay offers canal waterfront living at more accessible price points.",
        },
        {
          question: "What is the expected appreciation in Business Bay?",
          answer: "Based on current market trends and ongoing development, Business Bay is expected to see 10-15% annual appreciation through 2026-2027. Prime canal-facing units may outperform this average.",
        },
      ]}
      cta={{
        title: "Explore Business Bay Off-Plan Projects",
        description: "Find the perfect canal-front apartment or penthouse in Dubai's CBD",
        primaryButtonText: "View Projects",
        primaryButtonHref: "/destinations/dubai/off-plan/business-bay#projects",
        secondaryButtonText: "Get Investment Advice",
        secondaryButtonHref: "/contact",
      }}
    />
  );
}

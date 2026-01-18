import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  TrendingUp,
  DollarSign,
  Home,
  Users,
  Building2,
  MapPin,
  Shield,
  Percent,
  School,
  Trees,
  Car,
  Star,
} from "lucide-react";

export default function OffPlanJVC() {
  return (
    <DubaiOffPlanTemplate
      title="JVC Off-Plan Properties 2026 - High Yield Investment"
      metaDescription="Invest in JVC (Jumeirah Village Circle) off-plan properties. Best ROI in Dubai with affordable entry and strong rental yields. Complete JVC investment guide."
      canonicalPath="/destinations/dubai/off-plan/jvc"
      keywords={["jvc off-plan", "jvc investment", "jvc apartments", "high yield dubai", "affordable off-plan dubai"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "JVC", href: "/destinations/dubai/off-plan/jvc" },
      ]}
      hero={{
        title: "Off-Plan in JVC",
        subtitle: "Dubai's highest rental yield community with affordable prices and excellent capital appreciation potential",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "9%+ ROI" },
          { label: "Affordable" },
          { label: "Family-Friendly" },
        ],
      }}
      marketStats={[
        { value: "9%", label: "Rental Yield", description: "Highest in Dubai" },
        { value: "AED 800", label: "Per Sqft", description: "Average price" },
        { value: "AED 500K", label: "Entry Point", description: "Studios from" },
        { value: "30%", label: "Appreciation", description: "Last 2 years" },
      ]}
      marketStatsTitle="JVC Market Overview"
      marketStatsSubtitle="Dubai's top-performing affordable investment destination"
      highlights={[
        {
          icon: TrendingUp,
          title: "Highest Rental Yields",
          description: "JVC consistently delivers 8-10% rental yields, outperforming premium areas significantly.",
        },
        {
          icon: DollarSign,
          title: "Affordable Entry",
          description: "Studios from AED 500K and 1-bedrooms from AED 700K make property investment accessible.",
        },
        {
          icon: Users,
          title: "Family-Focused",
          description: "Parks, schools, and community centers create strong appeal for family tenants.",
        },
        {
          icon: Car,
          title: "Central Location",
          description: "15-20 minutes to Marina, Downtown, and Dubai airports via major highways.",
        },
      ]}
      highlightsTitle="Why JVC"
      highlightsSubtitle="The factors making JVC Dubai's hottest investment area"
      investmentBenefits={[
        {
          icon: Percent,
          title: "Unbeatable ROI",
          description: "JVC delivers 8-10% rental yields consistently - nearly double what premium areas offer. Strong demand from middle-income professionals ensures quick tenant placement.",
        },
        {
          icon: DollarSign,
          title: "Low Entry, High Returns",
          description: "With studios from AED 500K, investors can enter the market with minimal capital while still achieving institutional-grade returns.",
        },
        {
          icon: Building2,
          title: "Active Development",
          description: "Major developers like Danube, Binghatti, and Ellington are delivering quality projects with attractive payment plans, including extended post-handover options.",
        },
        {
          icon: Trees,
          title: "Community Living",
          description: "JVC features 33 landscaped parks, community centers, and pedestrian-friendly design. The village atmosphere attracts long-term family tenants.",
        },
        {
          icon: School,
          title: "Education Hub",
          description: "Multiple schools including GEMS, JSS, and Kings School serve the community, making it highly attractive to families with children.",
        },
        {
          icon: Star,
          title: "Appreciation Trajectory",
          description: "JVC has seen 25-30% price appreciation since 2022. With infrastructure improvements and continued demand, further growth is expected.",
        },
      ]}
      investmentBenefitsTitle="Investment Benefits"
      investmentBenefitsSubtitle="Why JVC is the smart investor's choice"
      faqs={[
        {
          question: "Why are JVC yields so high?",
          answer: "JVC offers affordable purchase prices but commands strong rents due to excellent location, family amenities, and quality developments. The yield equation (rent/price) is highly favorable compared to premium areas.",
        },
        {
          question: "What developers are active in JVC?",
          answer: "Major developers include Danube (Elz, Gemz, Olivz), Binghatti (Azure, Venus), Ellington (Bellevue, Wilton), and Sobha. Many offer 1% monthly payment plans extending 5+ years.",
        },
        {
          question: "Is JVC good for families?",
          answer: "Excellent. JVC was designed as a family community with 33 parks, playgrounds, schools, and community centers. The low-rise, village atmosphere is very different from high-rise areas like Marina.",
        },
        {
          question: "What are typical payment plans in JVC?",
          answer: "JVC is known for extended payment plans. 1% monthly (up to 7 years), 60/40, and significant post-handover options (40-60% after keys) are common. This makes entry very accessible.",
        },
        {
          question: "How does JVC compare to Dubai Silicon Oasis or Sports City?",
          answer: "JVC offers better location (more central) and stronger tenant demand than these alternatives. While entry prices are similar, JVC commands 10-15% higher rents and sees faster appreciation.",
        },
      ]}
      cta={{
        title: "Invest in JVC Off-Plan",
        description: "Access Dubai's highest yields with affordable entry and flexible payment plans",
        primaryButtonText: "View JVC Projects",
        primaryButtonHref: "/destinations/dubai/off-plan/jvc#projects",
        secondaryButtonText: "Calculate Returns",
        secondaryButtonHref: "/destinations/dubai/tools/roi-calculator",
      }}
    />
  );
}

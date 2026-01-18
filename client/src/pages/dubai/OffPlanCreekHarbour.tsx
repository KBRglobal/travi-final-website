import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  Building2,
  Waves,
  TrendingUp,
  MapPin,
  Star,
  Trophy,
  Landmark,
  Trees,
  Home,
  Ship,
  Eye,
  Shield,
} from "lucide-react";

export default function OffPlanCreekHarbour() {
  return (
    <DubaiOffPlanTemplate
      title="Dubai Creek Harbour Off-Plan 2026 - Future Landmark"
      metaDescription="Invest in Dubai Creek Harbour by Emaar. Waterfront living near future Dubai Creek Tower. Complete off-plan investment guide for Creek Harbour."
      canonicalPath="/destinations/dubai/off-plan/creek-harbour"
      keywords={["creek harbour off-plan", "emaar creek harbour", "creek tower", "dubai creek investment", "creek harbour apartments"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "Creek Harbour", href: "/destinations/dubai/off-plan/creek-harbour" },
      ]}
      hero={{
        title: "Off-Plan at Creek Harbour",
        subtitle: "Be part of Dubai's next iconic destination, home to the future world's tallest structure",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "Emaar" },
          { label: "Creek Tower" },
          { label: "Waterfront" },
        ],
      }}
      marketStats={[
        { value: "7%", label: "Expected Yield", description: "Upon completion" },
        { value: "AED 1.5K", label: "Per Sqft", description: "Current pricing" },
        { value: "6 sq km", label: "Development", description: "Total area" },
        { value: "AED 1.2M+", label: "Entry Point", description: "1-bedrooms from" },
      ]}
      marketStatsTitle="Creek Harbour Market Overview"
      marketStatsSubtitle="Emaar's flagship waterfront development with massive growth potential"
      highlights={[
        {
          icon: Trophy,
          title: "Dubai Creek Tower",
          description: "Future home of the world's tallest structure, set to surpass Burj Khalifa and redefine Dubai's skyline.",
        },
        {
          icon: Waves,
          title: "Waterfront Living",
          description: "Premium residences along the historic Dubai Creek with marina berths and waterfront promenades.",
        },
        {
          icon: Landmark,
          title: "Emaar Quality",
          description: "Developed by Dubai's most trusted developer, known for Burj Khalifa and Dubai Mall excellence.",
        },
        {
          icon: MapPin,
          title: "Strategic Location",
          description: "Close to Downtown Dubai, Dubai International Airport, and Ras Al Khor wildlife sanctuary.",
        },
      ]}
      highlightsTitle="Why Creek Harbour"
      highlightsSubtitle="Dubai's next world-class destination in the making"
      investmentBenefits={[
        {
          icon: TrendingUp,
          title: "Early-Mover Advantage",
          description: "Creek Harbour is still in development phase, offering prices 20-30% below what completed units will command. Entry now means maximum appreciation runway.",
        },
        {
          icon: Eye,
          title: "Creek Tower Views",
          description: "Select towers will offer direct views of the future world's tallest structure. These units will command significant premiums upon tower completion.",
        },
        {
          icon: Building2,
          title: "Diverse Product Range",
          description: "From studios to penthouses, Creek Beach apartments to Creek Edge townhouses. Options for every investor profile and budget.",
        },
        {
          icon: Trees,
          title: "Integrated Community",
          description: "1.5km retail promenade, Creek Marina, parks, schools, and healthcare facilities create a self-contained lifestyle destination.",
        },
        {
          icon: Ship,
          title: "Marina Lifestyle",
          description: "200-berth marina accommodates yachts up to 150 feet. Waterfront dining and entertainment bring a unique lifestyle proposition.",
        },
        {
          icon: Shield,
          title: "Emaar Trust",
          description: "Emaar's track record of quality construction and on-time delivery provides peace of mind. Their premium brand ensures strong resale values.",
        },
      ]}
      investmentBenefitsTitle="Investment Benefits"
      investmentBenefitsSubtitle="Why Creek Harbour is the investment opportunity of the decade"
      faqs={[
        {
          question: "What projects are currently available at Creek Harbour?",
          answer: "Active phases include Creek Edge (townhouses), Creek Rise (mid-rise apartments), Creek Waters (waterfront towers), and Creek Beach (beachfront living). Each phase offers different views, unit types, and pricing.",
        },
        {
          question: "When will Dubai Creek Tower be completed?",
          answer: "The Creek Tower timeline remains flexible. However, the surrounding community is rapidly developing with retail, dining, and residential towers already delivered and occupied. The tower's completion will be an uplift catalyst.",
        },
        {
          question: "What payment plans does Emaar offer at Creek Harbour?",
          answer: "Emaar typically offers 60/40 or 70/30 payment plans at Creek Harbour. Booking deposits are usually 10-15%. Some phases offer limited post-handover options, though less aggressive than non-Emaar developers.",
        },
        {
          question: "How does Creek Harbour compare to Downtown Dubai?",
          answer: "Creek Harbour offers similar Emaar quality at 20-30% lower prices. While Downtown has Burj Khalifa, Creek Harbour will have Creek Tower. It's a forward-looking investment for those who believe in the area's future.",
        },
        {
          question: "Is Creek Harbour suitable for families?",
          answer: "Excellent for families. The master plan includes parks, schools (Repton School is already operational), healthcare facilities, and community centers. The low-rise Creek Edge townhouses are particularly family-friendly.",
        },
      ]}
      cta={{
        title: "Invest in Creek Harbour",
        description: "Secure your place in Dubai's next landmark destination by Emaar",
        primaryButtonText: "View Creek Harbour Projects",
        primaryButtonHref: "/destinations/dubai/off-plan/creek-harbour#projects",
        secondaryButtonText: "Speak with Specialist",
        secondaryButtonHref: "/contact",
      }}
    />
  );
}

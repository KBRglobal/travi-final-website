import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  Sparkles,
  Building2,
  Coffee,
  Palmtree,
  Star,
  Shield,
  Award,
  MapPin,
  TrendingUp,
  Users,
  Eye,
  Waves,
} from "lucide-react";

export default function OffPlanMeraas() {
  return (
    <DubaiOffPlanTemplate
      title="Meraas Dubai 2026 - City Walk, Bluewaters & More"
      metaDescription="Discover Meraas developments in Dubai including City Walk, Bluewaters Island, and La Mer. Premium lifestyle destinations and residential projects."
      canonicalPath="/destinations/dubai/off-plan/developers/meraas"
      keywords={["meraas dubai", "meraas properties", "city walk dubai", "bluewaters developer", "meraas projects"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "Meraas", href: "/destinations/dubai/off-plan/developers/meraas" },
      ]}
      hero={{
        title: "Meraas",
        subtitle: "Dubai's lifestyle destination creator behind City Walk, Bluewaters, La Mer, and other premium experiences",
        image: "/destinations-hero/dubai/dubai/dubai-hero-dubai-frame-skyline-aerial.webp",
        badges: [
          { label: "City Walk" },
          { label: "Bluewaters" },
          { label: "Lifestyle Focus" },
        ],
      }}
      marketStats={[
        { value: "25+", label: "Destinations", description: "Created in Dubai" },
        { value: "Ain Dubai", label: "Iconic", description: "World's tallest wheel" },
        { value: "Premium", label: "Focus", description: "Lifestyle-led development" },
        { value: "5M+", label: "Annual Visitors", description: "To Meraas destinations" },
      ]}
      marketStatsTitle="Meraas Overview"
      marketStatsSubtitle="The developer transforming Dubai's lifestyle landscape"
      highlights={[
        {
          icon: Coffee,
          title: "Lifestyle Destinations",
          description: "City Walk, La Mer, Boxpark, and Last Exit - Dubai's favorite leisure and dining destinations.",
        },
        {
          icon: Waves,
          title: "Bluewaters Island",
          description: "Home to Ain Dubai (world's largest observation wheel) and Caesars Palace resort.",
        },
        {
          icon: Palmtree,
          title: "Beach Living",
          description: "Port de La Mer, Nikki Beach Residences, and beachfront developments redefine coastal living.",
        },
        {
          icon: Star,
          title: "Design Excellence",
          description: "Award-winning architecture with focus on pedestrian-friendly urban design.",
        },
      ]}
      highlightsTitle="Why Choose Meraas"
      highlightsSubtitle="Where real estate meets lifestyle experience"
      investmentBenefits={[
        {
          icon: Sparkles,
          title: "Destination Living",
          description: "Meraas residences are embedded within popular destinations. Residents enjoy walkable retail, dining, and entertainment at their doorstep.",
        },
        {
          icon: Eye,
          title: "Iconic Addresses",
          description: "City Walk, Bluewaters, and La Mer are immediately recognizable. The address itself carries prestige and attracts premium tenants.",
        },
        {
          icon: TrendingUp,
          title: "Premium Appreciation",
          description: "Meraas properties command 15-25% premiums over comparable locations. The lifestyle integration justifies higher valuations.",
        },
        {
          icon: Award,
          title: "Design Leadership",
          description: "Meraas projects consistently win architecture and urban design awards. The aesthetic quality translates to lasting value.",
        },
        {
          icon: Users,
          title: "Tourist Appeal",
          description: "Destinations like Bluewaters attract millions of visitors annually. Residences benefit from this foot traffic for short-term rentals.",
        },
        {
          icon: Shield,
          title: "Dubai Holding",
          description: "Meraas is part of Dubai Holding, backed by significant government resources. Project completion and quality are assured.",
        },
      ]}
      investmentBenefitsTitle="Investment Benefits"
      investmentBenefitsSubtitle="Why Meraas delivers lifestyle-integrated investment value"
      faqs={[
        {
          question: "What destinations does Meraas develop?",
          answer: "Meraas created City Walk, Bluewaters Island, La Mer, Boxpark, Last Exit, The Beach at JBR, Port de La Mer, and many leisure destinations. Their focus is creating vibrant urban experiences.",
        },
        {
          question: "Are Meraas residential projects available off-plan?",
          answer: "Yes, Meraas launches residential phases at City Walk, Port de La Mer, and Bluewaters periodically. Inventory is limited given the boutique nature of their developments.",
        },
        {
          question: "Is Meraas a reliable developer?",
          answer: "Meraas is part of Dubai Holding with strong government backing. Their track record focuses on quality over quantity, with award-winning destinations that become city landmarks.",
        },
        {
          question: "What makes Meraas different from other developers?",
          answer: "Meraas is 'lifestyle-first' - they create destinations people want to visit, then add residential components. This reverses the typical developer approach and ensures built-in foot traffic and amenities.",
        },
        {
          question: "What are typical Meraas payment plans?",
          answer: "Meraas offers standard 60/40 or 70/30 plans. Due to the premium nature and limited inventory, aggressive extended plans are less common. Expect 15-20% booking deposits.",
        },
      ]}
      cta={{
        title: "Explore Meraas Properties",
        description: "Live at the heart of Dubai's most sought-after lifestyle destinations",
        primaryButtonText: "View Meraas Projects",
        primaryButtonHref: "/destinations/dubai/off-plan/developers/meraas#projects",
        secondaryButtonText: "Request Information",
        secondaryButtonHref: "/contact",
      }}
    />
  );
}

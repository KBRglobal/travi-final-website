import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  Palmtree,
  Waves,
  Globe,
  Building2,
  Star,
  Shield,
  Award,
  MapPin,
  Anchor,
  TrendingUp,
  Home,
  Crown,
} from "lucide-react";

export default function OffPlanNakheel() {
  return (
    <DubaiOffPlanTemplate
      title="Nakheel Properties Dubai 2026 - Palm Jumeirah Developer"
      metaDescription="Explore Nakheel Properties developments including Palm Jumeirah, The World Islands, and Jumeirah Islands. Complete guide to Nakheel off-plan projects."
      canonicalPath="/destinations/dubai/off-plan/developers/nakheel"
      keywords={["nakheel properties dubai", "nakheel off-plan", "palm jumeirah developer", "nakheel projects", "nakheel communities"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "Nakheel", href: "/destinations/dubai/off-plan/developers/nakheel" },
      ]}
      hero={{
        title: "Nakheel Properties",
        subtitle: "The visionary developer behind Palm Jumeirah and Dubai's most iconic waterfront destinations",
        image: "/destinations-hero/dubai/dubai/dubai-hero-atlantis-palm-jumeirah-beach.webp",
        badges: [
          { label: "Palm Jumeirah" },
          { label: "Waterfront Expert" },
          { label: "Iconic Projects" },
        ],
      }}
      marketStats={[
        { value: "15,000+", label: "Hectares", description: "Land developed" },
        { value: "300+", label: "Projects", description: "Completed & planned" },
        { value: "3", label: "Palm Islands", description: "Iconic landmarks" },
        { value: "40%", label: "Coastline", description: "Of Dubai extended" },
      ]}
      marketStatsTitle="Nakheel Overview"
      marketStatsSubtitle="The developer that transformed Dubai's coastline"
      highlights={[
        {
          icon: Palmtree,
          title: "Palm Jumeirah",
          description: "Created the world's most iconic artificial island, visible from space and home to ultra-luxury living.",
        },
        {
          icon: Waves,
          title: "Waterfront Expertise",
          description: "Unmatched experience in marine and coastal development, land reclamation, and island creation.",
        },
        {
          icon: Globe,
          title: "The World Islands",
          description: "300 artificial islands forming a world map, with luxury resorts and private estates.",
        },
        {
          icon: Crown,
          title: "Premium Communities",
          description: "Al Furjan, Jumeirah Islands, Discovery Gardens, and Dubai Waterfront developments.",
        },
      ]}
      highlightsTitle="Why Choose Nakheel"
      highlightsSubtitle="Dubai's waterfront and island development pioneer"
      investmentBenefits={[
        {
          icon: Award,
          title: "Iconic Locations",
          description: "Nakheel's developments become landmarks. Palm Jumeirah is globally recognized and commands the highest premiums in Dubai real estate.",
        },
        {
          icon: Anchor,
          title: "Waterfront Premium",
          description: "Water-facing properties consistently outperform inland alternatives. Nakheel's portfolio is predominantly waterfront-oriented.",
        },
        {
          icon: TrendingUp,
          title: "Strong Appreciation",
          description: "Palm Jumeirah has seen 40-50% appreciation since 2020. Nakheel properties in established areas show reliable long-term value growth.",
        },
        {
          icon: Shield,
          title: "Government-Backed",
          description: "Nakheel is government-owned, providing stability and assurance of project completion. No concerns about developer financial viability.",
        },
        {
          icon: Building2,
          title: "Diverse Portfolio",
          description: "From ultra-luxury Palm villas to affordable Al Furjan townhouses. Entry points for various budgets while maintaining Nakheel quality.",
        },
        {
          icon: MapPin,
          title: "Future Developments",
          description: "Palm Jebel Ali and other mega-projects in the pipeline will extend Nakheel's iconic waterfront portfolio.",
        },
      ]}
      investmentBenefitsTitle="Investment Benefits"
      investmentBenefitsSubtitle="Why Nakheel represents waterfront investment excellence"
      faqs={[
        {
          question: "Is Nakheel a reliable developer?",
          answer: "Nakheel is a Dubai government-owned developer with an unmatched track record. They created Palm Jumeirah and transformed Dubai's coastline. Government ownership ensures financial stability and project completion.",
        },
        {
          question: "What communities does Nakheel develop?",
          answer: "Nakheel's portfolio includes Palm Jumeirah, The World Islands, Jumeirah Islands, Al Furjan, Discovery Gardens, Dragon City, Jumeirah Park, and upcoming Palm Jebel Ali. Predominantly waterfront and island communities.",
        },
        {
          question: "Is Palm Jebel Ali happening?",
          answer: "Yes, Palm Jebel Ali has been revived and is in development. This will be Nakheel's next major island project, expected to offer investment opportunities similar to Palm Jumeirah's early stages.",
        },
        {
          question: "What payment plans does Nakheel offer?",
          answer: "Nakheel typically offers straightforward 60/40 or 70/30 plans. Being government-backed, they're less aggressive with extended post-handover options. Emphasis is on reliable delivery over complex financing.",
        },
        {
          question: "How do Nakheel prices compare?",
          answer: "Nakheel commands premiums for waterfront properties (Palm, Jumeirah Islands) but offers competitive pricing for suburban communities (Al Furjan, Discovery Gardens). Prices reflect location quality.",
        },
      ]}
      cta={{
        title: "Explore Nakheel Projects",
        description: "Invest in properties from Dubai's legendary waterfront developer",
        primaryButtonText: "View Nakheel Projects",
        primaryButtonHref: "/destinations/dubai/off-plan/developers/nakheel#projects",
        secondaryButtonText: "Get Expert Advice",
        secondaryButtonHref: "/contact",
      }}
    />
  );
}

import { DubaiOffPlanTemplate } from "./templates/DubaiOffPlanTemplate";
import {
  Palmtree,
  Crown,
  Waves,
  Sun,
  Home,
  Star,
  Shield,
  Building2,
  Gem,
  Globe,
  Award,
  Key,
} from "lucide-react";

export default function OffPlanPalmJumeirah() {
  return (
    <DubaiOffPlanTemplate
      title="Palm Jumeirah Off-Plan Properties 2026 - Ultra-Luxury"
      metaDescription="Exclusive off-plan villas and apartments on Palm Jumeirah. Ultra-luxury island living with beach access and Dubai skyline views. Premium investment guide."
      canonicalPath="/destinations/dubai/off-plan/palm-jumeirah"
      keywords={["palm jumeirah off-plan", "palm villas", "palm apartments", "luxury off-plan dubai", "palm jumeirah investment"]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Off-Plan", href: "/destinations/dubai/off-plan" },
        { label: "Palm Jumeirah", href: "/destinations/dubai/off-plan/palm-jumeirah" },
      ]}
      hero={{
        title: "Off-Plan on Palm Jumeirah",
        subtitle: "Ultra-luxury living on the world's most iconic artificial island with exclusive beachfront addresses",
        image: "/destinations-hero/dubai/dubai/dubai-hero-atlantis-palm-jumeirah-beach.webp",
        badges: [
          { label: "Ultra-Luxury" },
          { label: "Beachfront" },
          { label: "Limited Supply" },
        ],
      }}
      marketStats={[
        { value: "5%", label: "Rental Yield", description: "Luxury segment" },
        { value: "AED 3K+", label: "Per Sqft", description: "Average price" },
        { value: "AED 15M+", label: "Villa Entry", description: "Starting from" },
        { value: "50%", label: "Appreciation", description: "Last 3 years" },
      ]}
      marketStatsTitle="Palm Jumeirah Market Overview"
      marketStatsSubtitle="The pinnacle of Dubai luxury real estate"
      highlights={[
        {
          icon: Palmtree,
          title: "Iconic Location",
          description: "The world's most recognizable man-made island, visible from space and synonymous with Dubai luxury.",
        },
        {
          icon: Sun,
          title: "Private Beach Access",
          description: "Beachfront villas and apartments with direct access to pristine private beaches.",
        },
        {
          icon: Crown,
          title: "Ultra-Luxury Finishes",
          description: "Developments from Omniyat, Alpago, and Nakheel feature world-class architecture and premium materials.",
        },
        {
          icon: Star,
          title: "Blue-Chip Investment",
          description: "Limited supply and global recognition ensure long-term value preservation and appreciation.",
        },
      ]}
      highlightsTitle="Why Palm Jumeirah"
      highlightsSubtitle="The ultimate address for discerning investors and residents"
      investmentBenefits={[
        {
          icon: Gem,
          title: "Scarcity Value",
          description: "Palm Jumeirah is fully developed with no new land. New launches are extremely rare, making each release highly valuable. Supply constraints protect long-term values.",
        },
        {
          icon: Globe,
          title: "Global Recognition",
          description: "The Palm is one of the world's most famous landmarks, attracting ultra-high-net-worth buyers and celebrities. This global brand recognition commands premium pricing.",
        },
        {
          icon: Award,
          title: "Trophy Asset",
          description: "Palm properties are generational assets that transcend typical real estate cycles. They're collected as much as invested in by the world's wealthy.",
        },
        {
          icon: Building2,
          title: "Signature Developments",
          description: "New launches include Six Senses Residences, Como Residences, and Atlantis The Royal Residences - each offering unprecedented luxury specifications.",
        },
        {
          icon: Shield,
          title: "Capital Preservation",
          description: "During market corrections, Palm properties retain value better than any other Dubai location. They're considered the safest store of wealth in Dubai real estate.",
        },
        {
          icon: Key,
          title: "Lifestyle Benefits",
          description: "Residents enjoy Atlantis amenities, five-star dining, exclusive beach clubs, and a community of global elite. It's not just property - it's a lifestyle.",
        },
      ]}
      investmentBenefitsTitle="Investment Benefits"
      investmentBenefitsSubtitle="Why Palm Jumeirah represents the pinnacle of real estate investment"
      faqs={[
        {
          question: "Are there new off-plan projects on Palm Jumeirah?",
          answer: "Yes, but very limited. Current and recent launches include Six Senses Residences (branded wellness), Como Residences (ultra-luxury), and Atlantis The Royal Residences. Entry typically starts at AED 10M+ for apartments.",
        },
        {
          question: "What is the minimum investment on Palm Jumeirah?",
          answer: "For off-plan, apartments start around AED 10-15M. Villas range from AED 25M to over AED 100M for signature fronds. The secondary market offers some lower entry points but still commands premium pricing.",
        },
        {
          question: "Is Palm Jumeirah good for rental income?",
          answer: "Yields are lower (4-5%) due to high purchase prices, but absolute rental income is substantial. Premium villas rent for AED 1-3M annually. Short-term rentals can yield higher returns during peak seasons.",
        },
        {
          question: "What payment plans are available on Palm?",
          answer: "Premium Palm developments typically offer less aggressive payment plans. Expect 50/50 or 60/40 structures with 20-30% upfront deposits. Post-handover options are less common in this ultra-luxury segment.",
        },
        {
          question: "How does Palm compare to Dubai Hills or Emirates Hills?",
          answer: "Palm offers beachfront/waterfront living, while Hills communities offer golf course views and villa compounds. Palm commands highest per-sqft prices due to its global brand and limited supply.",
        },
      ]}
      cta={{
        title: "Explore Palm Jumeirah Off-Plan",
        description: "Secure your address on the world's most iconic island",
        primaryButtonText: "View Palm Projects",
        primaryButtonHref: "/destinations/dubai/off-plan/palm-jumeirah#projects",
        secondaryButtonText: "Request Private Viewing",
        secondaryButtonHref: "/contact",
      }}
    />
  );
}

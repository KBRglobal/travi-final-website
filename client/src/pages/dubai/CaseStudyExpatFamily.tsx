import { DubaiCaseStudyTemplate } from "./templates/DubaiCaseStudyTemplate";
import { 
  Home, 
  Users, 
  GraduationCap, 
  Trees, 
  Car, 
  Heart,
  MapPin,
  DollarSign,
  Calendar,
  ArrowRight,
  School,
  Smile
} from "lucide-react";

export default function CaseStudyExpatFamily() {
  return (
    <DubaiCaseStudyTemplate
      title="British Expat Family Home in Arabian Ranches | Dubai Relocation Case Study"
      metaDescription="How a British family of 5 found their perfect 3BR villa in Arabian Ranches with top schools nearby and community living. Complete Dubai relocation success story."
      canonicalPath="/destinations/dubai/case-studies/expat-family"
      keywords={[
        "british expats dubai",
        "arabian ranches family",
        "dubai family relocation",
        "expat villa dubai",
        "schools arabian ranches",
        "family community dubai"
      ]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Case Studies", href: "/destinations/dubai/case-studies" },
        { label: "Expat Family", href: "/destinations/dubai/case-studies/expat-family" }
      ]}
      hero={{
        title: "Finding Our Forever Home in Dubai",
        subtitle: "How the Williams family created their perfect life in Arabian Ranches",
        topBadge: "Case Study",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "Family of 5", icon: Users },
          { label: "3BR Villa", icon: Home },
          { label: "Community Living", icon: Heart, variant: "highlight" }
        ]
      }}
      keyStats={[
        { value: "AED 2.5M", label: "Property Price", subtext: "3BR townhouse", icon: DollarSign },
        { value: "3", label: "Children Enrolled", subtext: "In nearby schools", icon: GraduationCap },
        { value: "5 mins", label: "School Distance", subtext: "Walking distance", icon: MapPin },
        { value: "2 Years", label: "Living There", subtext: "And loving it", icon: Calendar }
      ]}
      keyStatsTitle="The Williams Family Setup"
      keyStatsSubtitle="Key details from their Arabian Ranches home purchase"
      storyHighlights={[
        {
          title: "The Relocation Decision",
          content: "James and Sarah Williams, both 40, made the decision to relocate from Surrey, UK to Dubai for James's new role. With three children aged 14, 11, and 8, finding the right community with excellent schools was their top priority—not city-center glamour.",
          icon: Users
        },
        {
          title: "Researching Family-Friendly Areas",
          content: "They explored The Springs, Jumeirah Park, Dubai Hills, and Arabian Ranches. After virtual tours and expat forums, Arabian Ranches stood out for its established community feel, British schools nearby, parks, and the popular community center with pool and gym.",
          icon: MapPin
        },
        {
          title: "The School Factor",
          content: "JESS Arabian Ranches (British curriculum, OFSTED-rated Outstanding) was within walking distance of several villa clusters. Ranches Primary School was also nearby. School placement was confirmed before they finalized the property—a crucial step.",
          icon: GraduationCap
        },
        {
          title: "Finding the Perfect Villa",
          content: "They chose a 3BR+maid townhouse in Palmera 3 with garden, close to the community pool. At AED 2.5M, it offered space for the family, easy school access, and the community lifestyle they wanted. The previous owners were also British expats.",
          icon: Home
        },
        {
          title: "Community Integration",
          content: "Within months, the kids had friends from school in the neighborhood, James joined the running club, and Sarah became active in the community center activities. The family dog loves the pet-friendly parks.",
          icon: Heart
        },
        {
          title: "Two Years Later",
          content: "Today, the Williams family considers Dubai home. The kids thrive in school, they've made lifelong friends, and the community has exceeded expectations. Property value has appreciated 18%, and they've recently renovated the garden for entertaining.",
          icon: Smile
        }
      ]}
      storyHighlightsTitle="The Williams Family Journey"
      storyHighlightsSubtitle="From Surrey to Arabian Ranches: A British family's Dubai story"
      lessonsLearned={[
        {
          title: "Schools First, Property Second",
          description: "The Williams confirmed school places before finalizing their property. Top schools in Dubai have waitlists—they applied 6 months before the move.",
          takeaway: "Start school applications as soon as you decide to relocate"
        },
        {
          title: "Community Over Location",
          description: "Arabian Ranches isn't as central as Dubai Marina, but for families, the trade-off is worth it. Parks, pools, sports facilities, and safe streets for kids matter more than proximity to nightlife.",
          takeaway: "Visit communities on weekends to see family life in action"
        },
        {
          title: "Buy Into Established Communities",
          description: "The Williams chose Palmera (established) over newer clusters. Mature landscaping, proven community management, and existing social networks made integration easier.",
          takeaway: "Established sub-communities offer faster integration"
        },
        {
          title: "Budget for the Whole Picture",
          description: "Beyond property cost, they factored in school fees (AED 60-80K/child/year), community service charges, and initial setup. Dubai family living requires comprehensive budgeting.",
          takeaway: "Annual school fees can exceed property costs—plan accordingly"
        },
        {
          title: "Make Friends Through Schools",
          description: "The kids' school became the social hub for parents too. School events, WhatsApp groups, and carpools created instant community connections.",
          takeaway: "School community = parent community in expat life"
        }
      ]}
      lessonsLearnedTitle="Key Lessons for Relocating Families"
      lessonsLearnedSubtitle="Practical insights for families considering Dubai"
      cta={{
        title: "Find Your Family's Dubai Home",
        subtitle: "Community Living for Expat Families",
        description: "From Arabian Ranches to Dubai Hills, we help families find the perfect community with the right schools, amenities, and lifestyle.",
        primaryLabel: "Family Communities Guide",
        primaryIcon: ArrowRight,
        primaryHref: "/destinations/dubai/districts/arabian-ranches",
        secondaryLabel: "Dubai Schools Guide",
        secondaryHref: "/destinations/dubai/guides/schools",
        variant: "gradient",
        badges: ["Family Experts", "School Guidance", "Community Tours"]
      }}
    />
  );
}

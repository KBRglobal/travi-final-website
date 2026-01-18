import { DubaiCaseStudyTemplate } from "./templates/DubaiCaseStudyTemplate";
import { 
  Award, 
  Home, 
  Users, 
  Calendar, 
  DollarSign, 
  FileCheck, 
  Plane, 
  GraduationCap,
  Heart,
  ArrowRight,
  Shield,
  Clock
} from "lucide-react";

export default function CaseStudyGoldenVisa() {
  return (
    <DubaiCaseStudyTemplate
      title="Golden Visa Through Property Investment | Dubai Real Estate Case Study"
      metaDescription="How an expat family secured 10-year UAE Golden Visas for their entire family through a AED 2M villa investment in Dubai Hills. Complete success story with timeline."
      canonicalPath="/destinations/dubai/case-studies/golden-visa"
      keywords={[
        "uae golden visa property",
        "dubai golden visa investment",
        "golden visa family",
        "dubai hills villa",
        "10 year visa dubai",
        "residency through property"
      ]}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dubai", href: "/destinations/dubai" },
        { label: "Case Studies", href: "/destinations/dubai/case-studies" },
        { label: "Golden Visa", href: "/destinations/dubai/case-studies/golden-visa" }
      ]}
      hero={{
        title: "Golden Visa Success Through Property",
        subtitle: "How the Sharma family secured 10-year residency for everyone with a Dubai Hills villa",
        topBadge: "Case Study",
        image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { label: "Family of 4", icon: Users },
          { label: "AED 2M Villa", icon: Home },
          { label: "10-Year Visa", icon: Award, variant: "highlight" }
        ]
      }}
      keyStats={[
        { value: "AED 2M", label: "Property Investment", subtext: "Dubai Hills villa", icon: DollarSign },
        { value: "10 Years", label: "Visa Duration", subtext: "Renewable", icon: Calendar },
        { value: "4 Visas", label: "Family Members", subtext: "All approved", icon: Users },
        { value: "6 Weeks", label: "Total Timeline", subtext: "Purchase to visa", icon: Clock }
      ]}
      keyStatsTitle="Investment & Visa Overview"
      keyStatsSubtitle="Key outcomes from the Sharma family's Golden Visa journey"
      storyHighlights={[
        {
          title: "The Family's Situation",
          content: "The Sharmas—Raj (45), Priya (42), and their two children (16 and 12)—had lived in Dubai for 8 years on employer-sponsored visas. With Raj considering entrepreneurship, they needed independent residency that wouldn't depend on employment.",
          icon: Users
        },
        {
          title: "Understanding Golden Visa Requirements",
          content: "They learned that investing AED 2M+ in UAE property qualifies for the 10-year Golden Visa. The property must be completed (not off-plan), in the investor's name, and purchased with cleared funds. Mortgage is allowed up to 50%.",
          icon: FileCheck
        },
        {
          title: "Property Search in Dubai Hills",
          content: "The family chose Dubai Hills Estate for its schools (GEMS Wellington nearby), green spaces, and family-friendly community. They found a 3BR townhouse with garden, priced at AED 2.1M, meeting the Golden Visa threshold.",
          icon: Home
        },
        {
          title: "Purchase & Documentation",
          content: "After property inspection and SPA signing, they completed the purchase in 3 weeks. They obtained the Title Deed from DLD, which is the key document for Golden Visa application. Total investment including fees: AED 2.2M.",
          icon: Shield
        },
        {
          title: "Golden Visa Application Process",
          content: "With Title Deed in hand, Raj applied through ICP (Federal Authority for Identity and Citizenship). Required documents: Title Deed, passport copies, photos, health insurance, and proof of income. Priya and children were added as dependents.",
          icon: Award
        },
        {
          title: "Approval & New Life Chapter",
          content: "Within 3 weeks of application, all four family members received their 10-year Golden Visas. Raj started his consultancy, kids continued school without visa concerns, and Priya began her own business. The villa has also appreciated 12%.",
          icon: Heart
        }
      ]}
      storyHighlightsTitle="The Sharma Family's Golden Visa Journey"
      storyHighlightsSubtitle="From employee visa dependency to independent 10-year residency"
      lessonsLearned={[
        {
          title: "AED 2M is the Magic Number",
          description: "The minimum property investment for Golden Visa is AED 2M. The Sharmas chose slightly above (AED 2.1M) to ensure they met the threshold after any valuation adjustments.",
          takeaway: "Budget AED 2M+ for property value, plus 8-10% for fees"
        },
        {
          title: "Property Must Be Completed",
          description: "Off-plan properties don't qualify until handover and Title Deed issuance. The Sharmas chose a ready property to begin their visa application immediately.",
          takeaway: "Ready properties enable immediate visa application"
        },
        {
          title: "Whole Family on One Investment",
          description: "A single AED 2M+ investment can sponsor the investor, spouse, and children (any age). The Sharmas' teenagers and even future children would be covered.",
          takeaway: "One investment covers unlimited family dependents"
        },
        {
          title: "Healthcare is Mandatory",
          description: "Golden Visa applicants must have UAE health insurance. The Sharmas opted for comprehensive family coverage, which also gave them peace of mind for medical needs.",
          takeaway: "Budget for family health insurance in your planning"
        },
        {
          title: "Visa is Renewable for Life",
          description: "As long as the property is owned, the Golden Visa can be renewed indefinitely. Even if the property is sold and replaced with another AED 2M+ property, eligibility continues.",
          takeaway: "Property ownership = permanent residency pathway"
        }
      ]}
      lessonsLearnedTitle="Key Lessons for Golden Visa Seekers"
      lessonsLearnedSubtitle="Essential insights for securing UAE residency through property investment"
      cta={{
        title: "Secure Your Family's Future in Dubai",
        subtitle: "10-Year Golden Visa Through Property",
        description: "Join thousands of families who've secured long-term UAE residency through property investment. We'll guide you through every step.",
        primaryLabel: "Golden Visa Properties",
        primaryIcon: ArrowRight,
        primaryHref: "/destinations/dubai/off-plan/golden-visa",
        secondaryLabel: "Golden Visa Guide",
        secondaryHref: "/destinations/dubai/guides/golden-visa",
        variant: "gradient",
        badges: ["10-Year Visa", "Family Included", "Expert Support"]
      }}
    />
  );
}

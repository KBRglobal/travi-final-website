import { Building2, Waves, TrendingUp, Compass, Ship, TreePine } from "lucide-react";
import { DubaiDistrictTemplate } from "./templates/DubaiDistrictTemplate";

export default function DistrictDubaiCreekHarbour() {
  return (
    <DubaiDistrictTemplate
      title="Dubai Creek Harbour Guide 2026 - Future Landmark District"
      metaDescription="Explore Dubai Creek Harbour, home to the upcoming Dubai Creek Tower. Guide to Creek Beach, shopping, dining, and off-plan investment in Creek Harbour."
      canonicalPath="/destinations/dubai/districts/creek-harbour"
      keywords={["dubai creek harbour", "creek harbour", "dubai creek tower", "creek beach dubai", "emaar creek harbour", "creek harbour apartments"]}
      breadcrumbs={[
        { label: "Districts", href: "/destinations/dubai/districts" },
        { label: "Dubai Creek Harbour", href: "/destinations/dubai/districts/creek-harbour" }
      ]}
      hero={{
        title: "Dubai Creek Harbour",
        subtitle: "A visionary waterfront destination that will soon be home to the world's tallest structure",
        backgroundImage: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { text: "Creek Tower", variant: "default" },
          { text: "Emaar Project", variant: "secondary" },
          { text: "Waterfront", variant: "outline" }
        ]
      }}
      stats={[
        { value: "6 sq km", label: "Total Area", subtext: "2x Downtown Dubai" },
        { value: "1km+", label: "Creek Tower", subtext: "Future tallest structure" },
        { value: "7%", label: "Expected Yield", subtext: "Investment ROI" },
        { value: "AED 1,400", label: "Per Sqft", subtext: "Average price" }
      ]}
      statsTitle="Dubai Creek Harbour Overview"
      statsSubtitle="Key facts about Dubai's visionary waterfront development"
      highlights={[
        {
          icon: Building2,
          title: "Dubai Creek Tower",
          description: "The future world's tallest structure, designed by Santiago Calatrava, will anchor this mega-development."
        },
        {
          icon: Waves,
          title: "Creek Beach",
          description: "Enjoy the 700m private beach with lagoon-style swimming, restaurants, and stunning Downtown views."
        },
        {
          icon: TrendingUp,
          title: "Investment Potential",
          description: "Early investors benefit from Emaar's track record and strong appreciation potential upon completion."
        },
        {
          icon: Ship,
          title: "Yacht Marina",
          description: "The harbour will feature a world-class marina for yacht owners and visitors."
        },
        {
          icon: TreePine,
          title: "Central Park",
          description: "A massive 28-hectare park, twice the size of DIFC, providing green spaces and recreation."
        },
        {
          icon: Compass,
          title: "Strategic Location",
          description: "Just 10km from Downtown Dubai with planned metro connectivity and major road access."
        }
      ]}
      highlightsTitle="What Makes Dubai Creek Harbour Special"
      nearbyDistricts={[
        { name: "Old Dubai", slug: "old-dubai", description: "Historic souks & heritage" },
        { name: "Downtown Dubai", slug: "downtown-dubai", description: "Burj Khalifa & Dubai Mall" },
        { name: "Business Bay", slug: "business-bay", description: "Dubai Canal access" }
      ]}
      faqs={[
        { 
          question: "What is Dubai Creek Harbour?", 
          answer: "Dubai Creek Harbour is a 6 sq km mega-development by Emaar along Dubai Creek. It will feature the Dubai Creek Tower (planned to exceed Burj Khalifa), residences, a yacht marina, retail, and leisure destinations." 
        },
        { 
          question: "Is Dubai Creek Harbour a good investment?", 
          answer: "Creek Harbour offers strong investment potential due to Emaar's track record, waterfront location, future Dubai Creek Tower, and competitive pricing compared to Downtown Dubai. Off-plan properties offer attractive payment plans." 
        },
        { 
          question: "How far is Creek Harbour from Downtown Dubai?", 
          answer: "Dubai Creek Harbour is approximately 10km from Downtown Dubai, about 15-20 minutes by car. Once completed, it will have its own metro station connection." 
        },
        {
          question: "When will Dubai Creek Tower be completed?",
          answer: "The Dubai Creek Tower was originally planned for Expo 2020 but has been delayed. While no official completion date has been announced, construction is expected to resume as the development progresses."
        },
        {
          question: "Is Creek Beach open to the public?",
          answer: "Yes, Creek Beach is open to the public with a small entry fee. It features a lagoon-style beach, restaurants, a splash pad for kids, and stunning views of Downtown Dubai across the creek."
        }
      ]}
      cta={{
        title: "Invest in Creek Harbour's Future",
        description: "Secure your position in Dubai's next iconic landmark district with competitive off-plan pricing.",
        primaryAction: { label: "View Properties", href: "/destinations/dubai/off-plan/creek-harbour" },
        secondaryAction: { label: "Investment Guide", href: "/destinations/dubai/off-plan/investment-guide" }
      }}
    />
  );
}

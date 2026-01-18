import { Umbrella, ShoppingBag, Eye, Building, Waves, UtensilsCrossed } from "lucide-react";
import { DubaiDistrictTemplate } from "./templates/DubaiDistrictTemplate";

export default function DistrictJBR() {
  return (
    <DubaiDistrictTemplate
      title="JBR Dubai Guide 2026 - Jumeirah Beach Residence & The Walk"
      metaDescription="Complete guide to JBR (Jumeirah Beach Residence) in Dubai. Explore The Walk, JBR Beach, dining, shopping, and beachfront apartments at JBR."
      canonicalPath="/dubai/jbr"
      keywords={["jbr dubai", "jumeirah beach residence", "the walk jbr", "jbr beach", "jbr apartments", "jbr restaurants"]}
      breadcrumbs={[
        { label: "Districts", href: "/dubai/districts" },
        { label: "JBR", href: "/dubai/jbr" }
      ]}
      hero={{
        title: "Jumeirah Beach Residence",
        subtitle: "Dubai's most vibrant beachfront community with The Walk promenade, golden beaches, and stunning Ain Dubai views",
        backgroundImage: "/destinations-hero/dubai/dubai/dubai-hero-atlantis-palm-jumeirah-beach.webp",
        badges: [
          { text: "Beachfront", variant: "default" },
          { text: "The Walk", variant: "secondary" },
          { text: "Ain Dubai Views", variant: "outline" }
        ]
      }}
      stats={[
        { value: "1.7km", label: "The Walk", subtext: "Pedestrian promenade" },
        { value: "40+", label: "Towers", subtext: "Beachfront living" },
        { value: "6.5%", label: "Rental Yield", subtext: "Average ROI" },
        { value: "AED 1,600", label: "Per Sqft", subtext: "Average price" }
      ]}
      statsTitle="JBR Overview"
      statsSubtitle="Key facts about Dubai's premier beachfront community"
      highlights={[
        {
          icon: Umbrella,
          title: "JBR Beach",
          description: "Enjoy Dubai's most popular public beach with golden sands, water sports, and stunning views of Ain Dubai."
        },
        {
          icon: ShoppingBag,
          title: "The Walk",
          description: "Explore 1.7km of outdoor shopping and dining with over 300 outlets and street performers."
        },
        {
          icon: Eye,
          title: "Ain Dubai Views",
          description: "Wake up to views of the world's largest observation wheel just across the water on Bluewaters Island."
        },
        {
          icon: Building,
          title: "The Beach",
          description: "Shop at the open-air mall featuring cinema, retail, and beachfront dining with sea views."
        },
        {
          icon: Waves,
          title: "Water Sports",
          description: "Try jet skiing, paddleboarding, parasailing, and flyboarding right from the beach."
        },
        {
          icon: UtensilsCrossed,
          title: "Beachfront Dining",
          description: "Dine with your feet in the sand at beach clubs and restaurants along the shoreline."
        }
      ]}
      highlightsTitle="What Makes JBR Special"
      nearbyDistricts={[
        { name: "Dubai Marina", slug: "dubai-marina", description: "Waterfront dining & nightlife" },
        { name: "Bluewaters Island", slug: "bluewaters", description: "Ain Dubai & Caesars Palace" },
        { name: "Palm Jumeirah", slug: "palm-jumeirah", description: "Iconic island living" }
      ]}
      faqs={[
        { 
          question: "Is JBR Beach free?", 
          answer: "Yes, JBR Beach is a public beach and completely free to access. Sunbeds and umbrellas can be rented from beach operators. The beach has lifeguards, showers, and changing facilities." 
        },
        { 
          question: "What is The Walk at JBR?", 
          answer: "The Walk is a 1.7km outdoor promenade along JBR featuring over 300 shops, restaurants, and entertainment venues. It's one of Dubai's most popular outdoor destinations with street performers and stunning sea views." 
        },
        { 
          question: "How far is JBR from Dubai Mall?", 
          answer: "JBR is approximately 25km from Dubai Mall, about 25-35 minutes by car depending on traffic. The Dubai Metro doesn't directly reach JBR, but the Dubai Tram connects to JLT Metro Station." 
        },
        {
          question: "Is JBR family-friendly?",
          answer: "Yes, JBR is very family-friendly with a safe beach, children's play areas, family restaurants, and activities. The Beach mall has a cinema and arcade. It's particularly lively on weekends and evenings."
        },
        {
          question: "What's the best time to visit JBR Beach?",
          answer: "October to April offers the best weather with temperatures between 20-30°C. Evenings are particularly pleasant. Summer months (June-August) can be very hot with temperatures exceeding 40°C."
        }
      ]}
      cta={{
        title: "Live Steps from the Beach",
        description: "Discover beachfront apartments at JBR with direct access to Dubai's most popular beach and The Walk promenade.",
        primaryAction: { label: "View JBR Properties", href: "/destinations/dubai/off-plan/jbr" },
        secondaryAction: { label: "JBR Beach Guide", href: "/destinations/dubai/beaches/jbr" }
      }}
    />
  );
}

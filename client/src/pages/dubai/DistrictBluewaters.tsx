import { Eye, Hotel, UtensilsCrossed, Waves, Building, Ship } from "lucide-react";
import { DubaiDistrictTemplate } from "./templates/DubaiDistrictTemplate";

export default function DistrictBluewaters() {
  return (
    <DubaiDistrictTemplate
      title="Bluewaters Island Dubai Guide 2026 - Ain Dubai & Caesars"
      metaDescription="Explore Bluewaters Island, home to Ain Dubai (world's largest observation wheel). Guide to Caesars Palace, Cove Beach, dining, and luxury apartments."
      canonicalPath="/dubai/bluewaters"
      keywords={["bluewaters island", "ain dubai", "caesars palace dubai", "cove beach", "bluewaters apartments", "bluewaters restaurants"]}
      breadcrumbs={[
        { label: "Districts", href: "/dubai/districts" },
        { label: "Bluewaters", href: "/dubai/bluewaters" }
      ]}
      hero={{
        title: "Bluewaters Island",
        subtitle: "A boutique island destination featuring Ain Dubai and exclusive beachfront living",
        backgroundImage: "/destinations-hero/dubai/dubai/dubai-hero-dubai-frame-skyline-aerial.webp",
        badges: [
          { text: "Ain Dubai", variant: "default" },
          { text: "Caesars Palace", variant: "secondary" },
          { text: "Island Living", variant: "outline" }
        ]
      }}
      stats={[
        { value: "250m", label: "Ain Dubai Height", subtext: "World's tallest wheel" },
        { value: "10", label: "Residential Buildings", subtext: "Exclusive apartments" },
        { value: "5%", label: "Rental Yield", subtext: "Average ROI" },
        { value: "AED 2,200", label: "Per Sqft", subtext: "Average price" }
      ]}
      statsTitle="Bluewaters Island Overview"
      statsSubtitle="Key facts about this exclusive island destination"
      highlights={[
        {
          icon: Eye,
          title: "Ain Dubai",
          description: "Experience the world's largest observation wheel at 250m, offering 360-degree views of Dubai's skyline."
        },
        {
          icon: Hotel,
          title: "Caesars Palace",
          description: "Stay at the iconic Caesars Palace hotel with pools, spa, and celebrity dining concepts."
        },
        {
          icon: Waves,
          title: "Cove Beach",
          description: "Relax at the trendy beach club with music, dining, and stunning views of Ain Dubai."
        },
        {
          icon: UtensilsCrossed,
          title: "Dining Scene",
          description: "Enjoy restaurants ranging from Hellfire BBQ to Gordon Ramsay's The Hell's Kitchen."
        },
        {
          icon: Building,
          title: "Island Living",
          description: "Exclusive residential apartments with sea views, island lifestyle, and premium amenities."
        },
        {
          icon: Ship,
          title: "Easy Access",
          description: "Connected to JBR via pedestrian bridge and Bluewaters Bridge for vehicles."
        }
      ]}
      highlightsTitle="What Makes Bluewaters Special"
      nearbyDistricts={[
        { name: "JBR", slug: "jbr", description: "Beachfront living & The Walk" },
        { name: "Dubai Marina", slug: "dubai-marina", description: "Waterfront dining & nightlife" },
        { name: "Palm Jumeirah", slug: "palm-jumeirah", description: "Iconic island living" }
      ]}
      faqs={[
        { 
          question: "What is Ain Dubai?", 
          answer: "Ain Dubai (Dubai Eye) is the world's largest and tallest observation wheel at 250 meters. It offers stunning 360-degree views of Dubai's skyline, Palm Jumeirah, and the Arabian Gulf during 38-minute rotations." 
        },
        { 
          question: "How do you get to Bluewaters Island?", 
          answer: "Bluewaters Island is connected to JBR via a pedestrian bridge and the Bluewaters Bridge for vehicles. It's walkable from The Beach at JBR or accessible by car, taxi, or ride-sharing apps." 
        },
        { 
          question: "Is Bluewaters Island expensive?", 
          answer: "Bluewaters is a premium destination with luxury apartments starting from AED 2 million. Caesars Palace hotel rooms average AED 1,500+ per night. Dining and entertainment are upscale but there are casual options too." 
        },
        {
          question: "Is Ain Dubai open?",
          answer: "Ain Dubai has had intermittent closures for maintenance. Check the official website for current operating hours. When open, tickets start from AED 130 for adults and the experience lasts about 38 minutes."
        },
        {
          question: "Is Bluewaters suitable for families?",
          answer: "Bluewaters is family-friendly with activities for all ages. Families enjoy Ain Dubai, the beach, and dining options. However, the nightlife scene at Cove Beach makes it more suited to adults in the evenings."
        }
      ]}
      cta={{
        title: "Experience Island Living",
        description: "Discover exclusive apartments on Bluewaters Island with world-class amenities and stunning views.",
        primaryAction: { label: "View Properties", href: "/destinations/dubai/districts/bluewaters#properties" },
        secondaryAction: { label: "Ain Dubai Tickets", href: "/destinations/dubai/attractions/ain-dubai" }
      }}
    />
  );
}

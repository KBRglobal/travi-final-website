import { Waves, UtensilsCrossed, PartyPopper, Ship, Train, Building } from "lucide-react";
import { DubaiDistrictTemplate } from "./templates/DubaiDistrictTemplate";

export default function DistrictDubaiMarina() {
  return (
    <DubaiDistrictTemplate
      title="Dubai Marina Guide 2026 - Waterfront Living & Attractions"
      metaDescription="Discover Dubai Marina, the world's largest man-made marina. Guide to Marina Walk, yacht clubs, restaurants, nightlife, and luxury apartments in Dubai Marina."
      canonicalPath="/dubai/dubai-marina"
      keywords={["dubai marina", "marina walk", "dubai marina apartments", "dubai marina restaurants", "dubai marina nightlife", "marina yacht club"]}
      breadcrumbs={[
        { label: "Districts", href: "/dubai/districts" },
        { label: "Dubai Marina", href: "/dubai/dubai-marina" }
      ]}
      hero={{
        title: "Dubai Marina",
        subtitle: "Stunning waterfront living in the world's largest artificial marina with 200+ towers and endless dining options",
        backgroundImage: "/destinations-hero/dubai/dubai/dubai-hero-marina-abra-boat-night.webp",
        badges: [
          { text: "Waterfront", variant: "default" },
          { text: "Nightlife Hub", variant: "secondary" },
          { text: "Beach Access", variant: "outline" }
        ]
      }}
      stats={[
        { value: "3km", label: "Waterfront", subtext: "Marina promenade" },
        { value: "200+", label: "Towers", subtext: "Residential & hotel" },
        { value: "7%", label: "Rental Yield", subtext: "Average ROI" },
        { value: "AED 1,800", label: "Per Sqft", subtext: "Average price" }
      ]}
      statsTitle="Dubai Marina Overview"
      statsSubtitle="Key facts about the world's largest man-made marina"
      highlights={[
        {
          icon: Waves,
          title: "Marina Walk",
          description: "Stroll along the 7km waterfront promenade lined with restaurants, cafes, and stunning yacht views."
        },
        {
          icon: UtensilsCrossed,
          title: "Dining Scene",
          description: "Over 200 restaurants offering cuisines from around the world, from casual cafes to fine dining."
        },
        {
          icon: PartyPopper,
          title: "Nightlife",
          description: "Experience Dubai's vibrant nightlife at rooftop bars, beach clubs, and world-renowned venues."
        },
        {
          icon: Ship,
          title: "Yacht Life",
          description: "Charter yachts, take dinner cruises, or enjoy water sports in the protected marina waters."
        },
        {
          icon: Train,
          title: "Transport Hub",
          description: "Excellent connectivity via Dubai Marina Metro stations and Dubai Tram to JBR and beyond."
        },
        {
          icon: Building,
          title: "Iconic Towers",
          description: "Home to stunning skyscrapers including Cayan Tower, Marina Torch, and Princess Tower."
        }
      ]}
      highlightsTitle="What Makes Dubai Marina Special"
      nearbyDistricts={[
        { name: "JBR", slug: "jbr", description: "Beachfront living & The Walk" },
        { name: "Palm Jumeirah", slug: "palm-jumeirah", description: "Iconic island living" },
        { name: "Bluewaters Island", slug: "bluewaters", description: "Ain Dubai & Caesars Palace" }
      ]}
      faqs={[
        { 
          question: "What makes Dubai Marina special?", 
          answer: "Dubai Marina is a 3km waterfront development featuring over 200 residential towers, the Marina Walk promenade with 100+ restaurants, direct beach access via JBR, and stunning yacht harbor views. It's one of the world's most desirable waterfront communities." 
        },
        { 
          question: "Is Dubai Marina good for families?", 
          answer: "Dubai Marina is ideal for young professionals and couples. While families can live here, areas like JVC or Dubai Hills offer more family-oriented amenities like schools and parks." 
        },
        { 
          question: "How do I get around Dubai Marina?", 
          answer: "Dubai Marina is well-connected via Dubai Metro (Red Line), Dubai Tram, water taxis, and the Marina Walk. Most residents walk to restaurants, shops, and the beach." 
        },
        {
          question: "What is the difference between Dubai Marina and JBR?",
          answer: "Dubai Marina is the canal-side area with high-rises surrounding the water, while JBR (Jumeirah Beach Residence) is the beachfront development adjacent to it. Both areas are connected by the Dubai Tram and share similar amenities."
        },
        {
          question: "How much does it cost to rent in Dubai Marina?",
          answer: "Studios start from AED 55,000/year, 1-bedroom apartments from AED 75,000, and 2-bedrooms from AED 110,000. Waterfront or high-floor units command premium prices."
        }
      ]}
      cta={{
        title: "Live the Marina Lifestyle",
        description: "Discover luxury waterfront apartments with stunning marina views and world-class amenities.",
        primaryAction: { label: "View Properties", href: "/destinations/dubai/off-plan/marina" },
        secondaryAction: { label: "Marina Dining Guide", href: "/destinations/dubai/dining/marina" }
      }}
    />
  );
}

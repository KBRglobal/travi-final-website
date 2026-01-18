import { Crown, Hotel, Waves, Train, Home, Star } from "lucide-react";
import { DubaiDistrictTemplate } from "./templates/DubaiDistrictTemplate";

export default function DistrictPalmJumeirah() {
  return (
    <DubaiDistrictTemplate
      title="Palm Jumeirah Guide 2026 - Dubai's Iconic Island"
      metaDescription="Explore Palm Jumeirah, Dubai's world-famous palm-shaped island. Guide to Atlantis, luxury resorts, beach clubs, villas, and apartments on Palm Jumeirah."
      canonicalPath="/dubai/palm-jumeirah"
      keywords={["palm jumeirah", "atlantis dubai", "palm jumeirah villas", "palm jumeirah apartments", "palm jumeirah hotels", "palm jumeirah beach"]}
      breadcrumbs={[
        { label: "Districts", href: "/dubai/districts" },
        { label: "Palm Jumeirah", href: "/dubai/palm-jumeirah" }
      ]}
      hero={{
        title: "Palm Jumeirah",
        subtitle: "The world's largest artificial island and one of the most exclusive addresses in the world",
        backgroundImage: "/destinations-hero/dubai/dubai/dubai-hero-atlantis-palm-jumeirah-beach.webp",
        badges: [
          { text: "Atlantis", variant: "default" },
          { text: "Ultra-Luxury", variant: "secondary" },
          { text: "Iconic Island", variant: "outline" }
        ]
      }}
      stats={[
        { value: "5.72km", label: "Crescent Length", subtext: "Island perimeter" },
        { value: "1,500+", label: "Villas", subtext: "Exclusive properties" },
        { value: "5%", label: "Rental Yield", subtext: "Average ROI" },
        { value: "AED 3,500", label: "Per Sqft", subtext: "Average price" }
      ]}
      statsTitle="Palm Jumeirah Overview"
      statsSubtitle="Key facts about Dubai's iconic palm-shaped island"
      highlights={[
        {
          icon: Hotel,
          title: "Atlantis Resort",
          description: "Experience Aquaventure Waterpark, The Lost Chambers Aquarium, and celebrity restaurants at the iconic Atlantis."
        },
        {
          icon: Crown,
          title: "Ultra-Luxury Living",
          description: "Home to some of the world's most expensive villas and apartments with private beaches and stunning views."
        },
        {
          icon: Waves,
          title: "Private Beaches",
          description: "Enjoy exclusive beach access at luxury hotels and beach clubs along the crescent and fronds."
        },
        {
          icon: Train,
          title: "Palm Monorail",
          description: "Ride the 5.5km monorail from Gateway Station to Atlantis for panoramic views of the island."
        },
        {
          icon: Home,
          title: "Signature Villas",
          description: "Choose from Garden Homes, Signature Villas, and Frond Villas with private beaches and pools."
        },
        {
          icon: Star,
          title: "World-Class Dining",
          description: "Dine at Nobu, Gordon Ramsay's Bread Street Kitchen, Ossiano, and other celebrity chef restaurants."
        }
      ]}
      highlightsTitle="What Makes Palm Jumeirah Special"
      nearbyDistricts={[
        { name: "JBR", slug: "jbr", description: "Beachfront living & The Walk" },
        { name: "Dubai Marina", slug: "dubai-marina", description: "Waterfront dining & nightlife" },
        { name: "Jumeirah", slug: "jumeirah", description: "Prestigious villa community" }
      ]}
      faqs={[
        { 
          question: "Can you visit Palm Jumeirah without staying there?", 
          answer: "Yes! You can visit Atlantis (Aquaventure Waterpark, The Lost Chambers), dine at celebrity restaurants, book beach club day passes, or take the Palm Monorail for panoramic views." 
        },
        { 
          question: "How much do villas cost on Palm Jumeirah?", 
          answer: "Palm Jumeirah villas range from AED 15 million to over AED 200 million for ultra-luxury properties. Signature Villas and Garden Homes are the main villa types, with frond-end properties commanding premium prices." 
        },
        { 
          question: "Is Palm Jumeirah connected to the mainland?", 
          answer: "Yes, Palm Jumeirah connects to the mainland via a road bridge at the trunk. The Palm Monorail runs from Gateway Station (connecting to the Dubai Tram) to Atlantis at the crescent." 
        },
        {
          question: "What beaches can you access on Palm Jumeirah?",
          answer: "Most beaches on Palm Jumeirah are private hotel or residential beaches. Day passes are available at Atlantis, FIVE Palm Jumeirah, Fairmont, and other hotels ranging from AED 200-500 per person."
        },
        {
          question: "Is Palm Jumeirah good for investment?",
          answer: "Palm Jumeirah offers lower rental yields (4-5%) than mainland areas but strong capital appreciation. It's best for luxury buyers seeking prestige, lifestyle, and long-term value rather than rental income."
        }
      ]}
      cta={{
        title: "Own a Piece of Paradise",
        description: "Discover exclusive villas and apartments on the world's most famous artificial island.",
        primaryAction: { label: "View Palm Properties", href: "/destinations/dubai/off-plan/palm-jumeirah" },
        secondaryAction: { label: "Palm Attractions", href: "/destinations/dubai/attractions/palm-jumeirah" }
      }}
    />
  );
}

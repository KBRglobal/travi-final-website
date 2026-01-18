import { Building, Waves, GraduationCap, UtensilsCrossed, Home, Landmark } from "lucide-react";
import { DubaiDistrictTemplate } from "./templates/DubaiDistrictTemplate";

export default function DistrictJumeirah() {
  return (
    <DubaiDistrictTemplate
      title="Jumeirah Dubai Guide 2026 - Beach Road & Luxury Villas"
      metaDescription="Discover Jumeirah, Dubai's prestigious coastal neighborhood. Guide to Jumeirah Beach Road, Burj Al Arab, La Mer, luxury villas, and upscale dining in Jumeirah."
      canonicalPath="/destinations/dubai/districts/jumeirah"
      keywords={["jumeirah dubai", "jumeirah beach road", "burj al arab", "la mer dubai", "jumeirah villas", "jumeirah restaurants"]}
      breadcrumbs={[
        { label: "Districts", href: "/destinations/dubai/districts" },
        { label: "Jumeirah", href: "/destinations/dubai/districts/jumeirah" }
      ]}
      hero={{
        title: "Jumeirah",
        subtitle: "Dubai's most prestigious beachside neighborhood with iconic Burj Al Arab views and exclusive villa communities",
        backgroundImage: "/destinations-hero/dubai/dubai/dubai-hero-burj-al-arab-skyline-night.webp",
        badges: [
          { text: "Burj Al Arab", variant: "default" },
          { text: "Beach Road", variant: "secondary" },
          { text: "Villa Living", variant: "outline" }
        ]
      }}
      stats={[
        { value: "15km", label: "Beach Road", subtext: "Coastal stretch" },
        { value: "321m", label: "Burj Al Arab", subtext: "Iconic sail-shaped hotel" },
        { value: "4.5%", label: "Rental Yield", subtext: "Average ROI" },
        { value: "AED 2,200", label: "Per Sqft", subtext: "Average price" }
      ]}
      statsTitle="Jumeirah Overview"
      statsSubtitle="Key facts about Dubai's prestigious coastal neighborhood"
      highlights={[
        {
          icon: Landmark,
          title: "Burj Al Arab",
          description: "Admire the world's most luxurious hotel, the iconic sail-shaped landmark visible from across the coast."
        },
        {
          icon: Waves,
          title: "La Mer Beach",
          description: "Enjoy the trendy beachfront destination with street art, boutique shopping, and diverse dining options."
        },
        {
          icon: Home,
          title: "Luxury Villas",
          description: "Live in spacious villas with gardens, private pools, and proximity to the beach in exclusive communities."
        },
        {
          icon: GraduationCap,
          title: "Top Schools",
          description: "Access some of Dubai's best international schools including JESS, Horizon, and Repton."
        },
        {
          icon: UtensilsCrossed,
          title: "Beach Road Dining",
          description: "Discover boutique cafes, restaurants, and eateries along the scenic Jumeirah Beach Road."
        },
        {
          icon: Building,
          title: "Madinat Jumeirah",
          description: "Experience the resort complex with traditional Arabian architecture, souks, and waterways."
        }
      ]}
      highlightsTitle="What Makes Jumeirah Special"
      nearbyDistricts={[
        { name: "Downtown Dubai", slug: "downtown-dubai", description: "Burj Khalifa & Dubai Mall" },
        { name: "DIFC", slug: "difc", description: "Financial hub & fine dining" },
        { name: "Al Barsha", slug: "al-barsha", description: "Mall of Emirates" }
      ]}
      faqs={[
        { 
          question: "What is the difference between Jumeirah and JBR?", 
          answer: "Jumeirah is a sprawling beachside area known for luxury villas and the Burj Al Arab. JBR (Jumeirah Beach Residence) is a specific high-rise apartment community with The Walk promenade. They are different areas, about 15km apart." 
        },
        { 
          question: "Is Jumeirah a good place to live in Dubai?", 
          answer: "Jumeirah is one of Dubai's most desirable residential areas, known for spacious villas, excellent schools, beach access, and a family-friendly atmosphere. It's popular with expat families and long-term residents." 
        },
        { 
          question: "What attractions are in Jumeirah?", 
          answer: "Key attractions include Burj Al Arab, La Mer Beach, Jumeirah Beach Park, Madinat Jumeirah, Wild Wadi Waterpark, and numerous boutique shops and restaurants along Jumeirah Beach Road." 
        },
        {
          question: "How much are villas in Jumeirah?",
          answer: "Jumeirah villas range from AED 4 million for smaller properties to AED 50+ million for beachfront estates. Rentals start from AED 180,000/year for 3-bedroom villas."
        },
        {
          question: "Is Jumeirah family-friendly?",
          answer: "Yes, Jumeirah is one of Dubai's most family-friendly areas with excellent schools, parks, quiet residential streets, and a strong expat community. It's particularly popular with Western families."
        }
      ]}
      cta={{
        title: "Live the Jumeirah Lifestyle",
        description: "Discover luxury villas and townhouses in Dubai's most prestigious beachside neighborhood.",
        primaryAction: { label: "View Properties", href: "/destinations/dubai/districts/jumeirah#properties" },
        secondaryAction: { label: "Jumeirah Guide", href: "/destinations/dubai/guides/jumeirah" }
      }}
    />
  );
}

import { Building2, Waves, TrendingUp, Train, UtensilsCrossed, Briefcase } from "lucide-react";
import { DubaiDistrictTemplate } from "./templates/DubaiDistrictTemplate";

export default function DistrictBusinessBay() {
  return (
    <DubaiDistrictTemplate
      title="Business Bay Dubai Guide 2026 - CBD Living & Investment"
      metaDescription="Complete guide to Business Bay, Dubai's central business district. Explore Business Bay apartments, offices, Dubai Canal, dining, and investment opportunities."
      canonicalPath="/destinations/dubai/districts/business-bay"
      keywords={["business bay dubai", "business bay apartments", "dubai canal", "business bay offices", "business bay towers", "business bay investment"]}
      breadcrumbs={[
        { label: "Districts", href: "/destinations/dubai/districts" },
        { label: "Business Bay", href: "/destinations/dubai/districts/business-bay" }
      ]}
      hero={{
        title: "Business Bay",
        subtitle: "Dubai's dynamic central business district with stunning Dubai Canal views and excellent investment potential",
        backgroundImage: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { text: "Dubai Canal", variant: "default" },
          { text: "CBD Location", variant: "secondary" },
          { text: "High ROI", variant: "outline" }
        ]
      }}
      stats={[
        { value: "3.2km", label: "Dubai Canal", subtext: "Waterfront access" },
        { value: "240+", label: "Towers", subtext: "Residential & commercial" },
        { value: "8.5%", label: "Rental Yield", subtext: "Top ROI in Dubai" },
        { value: "AED 1,500", label: "Per Sqft", subtext: "Average price" }
      ]}
      statsTitle="Business Bay Overview"
      statsSubtitle="Key facts about Dubai's central business district"
      highlights={[
        {
          icon: Waves,
          title: "Dubai Canal",
          description: "Enjoy 3.2km of waterfront promenade with cycling paths, cafes, and stunning nighttime views."
        },
        {
          icon: Building2,
          title: "CBD Location",
          description: "Live and work in Dubai's central business district, walkable to Downtown Dubai and DIFC."
        },
        {
          icon: TrendingUp,
          title: "Investment Hub",
          description: "Benefit from Dubai's highest rental yields averaging 8-8.5% with strong capital appreciation."
        },
        {
          icon: UtensilsCrossed,
          title: "Canal Dining",
          description: "Dine along the Dubai Canal at restaurants offering waterfront terraces and city views."
        },
        {
          icon: Train,
          title: "Metro Access",
          description: "Business Bay Metro Station provides direct Red Line access to Dubai's major destinations."
        },
        {
          icon: Briefcase,
          title: "Commercial Hub",
          description: "Access to major corporate offices, co-working spaces, and business services."
        }
      ]}
      highlightsTitle="What Makes Business Bay Special"
      nearbyDistricts={[
        { name: "Downtown Dubai", slug: "downtown-dubai", description: "Burj Khalifa & Dubai Mall" },
        { name: "DIFC", slug: "difc", description: "Financial hub & fine dining" },
        { name: "Dubai Creek Harbour", slug: "dubai-creek-harbour", description: "Future landmark district" }
      ]}
      faqs={[
        { 
          question: "Is Business Bay a good area to live in Dubai?", 
          answer: "Business Bay offers excellent value with modern apartments, Dubai Canal access, walkability to Downtown Dubai, and strong rental yields. It's ideal for young professionals and investors seeking central locations at lower prices than Downtown." 
        },
        { 
          question: "How far is Business Bay from Downtown Dubai?", 
          answer: "Business Bay is adjacent to Downtown Dubai, just 5-10 minutes by car or a pleasant walk across the Dubai Canal footbridge. The Burj Khalifa is visible from most Business Bay towers." 
        },
        { 
          question: "What is Business Bay known for?", 
          answer: "Business Bay is Dubai's CBD, known for commercial towers, the Dubai Canal promenade, waterfront dining, modern apartments, and proximity to Downtown Dubai. It's a major hub for businesses and professionals." 
        },
        {
          question: "Is Business Bay better than Downtown Dubai for investment?",
          answer: "Business Bay typically offers 1-2% higher rental yields than Downtown Dubai at 20-30% lower purchase prices. Downtown offers more prestige and amenities, while Business Bay offers better ROI."
        },
        {
          question: "What is the Dubai Water Canal?",
          answer: "The Dubai Water Canal is a 3.2km waterway connecting Dubai Creek to the Arabian Gulf via Business Bay. It features promenades, cycling paths, pedestrian bridges, and waterfront dining and entertainment."
        }
      ]}
      cta={{
        title: "Invest in Business Bay",
        description: "Maximize your returns with high-yield properties in Dubai's thriving central business district.",
        primaryAction: { label: "View Properties", href: "/destinations/dubai/off-plan/business-bay" },
        secondaryAction: { label: "Investment Calculator", href: "/dubai/tools/roi-calculator" }
      }}
    />
  );
}

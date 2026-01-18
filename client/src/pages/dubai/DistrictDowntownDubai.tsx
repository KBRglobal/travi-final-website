import { Building2, Sparkles, ShoppingBag, Theater, Camera, Train } from "lucide-react";
import { DubaiDistrictTemplate } from "./templates/DubaiDistrictTemplate";

export default function DistrictDowntownDubai() {
  return (
    <DubaiDistrictTemplate
      title="Downtown Dubai Guide 2026 - Burj Khalifa, Dubai Mall & More"
      metaDescription="Explore Downtown Dubai, home to Burj Khalifa, Dubai Mall, and Dubai Fountain. Complete guide to attractions, hotels, restaurants, and real estate in Downtown Dubai."
      canonicalPath="/destinations/dubai/districts/downtown"
      keywords={["downtown dubai", "burj khalifa", "dubai mall", "dubai fountain", "downtown dubai hotels", "downtown dubai apartments"]}
      breadcrumbs={[
        { label: "Districts", href: "/destinations/dubai/districts" },
        { label: "Downtown Dubai", href: "/destinations/dubai/districts/downtown" }
      ]}
      hero={{
        title: "Downtown Dubai",
        subtitle: "The heart of modern Dubai featuring the world's tallest tower, largest shopping mall, and spectacular fountain shows",
        backgroundImage: "/destinations-hero/dubai/dubai/dubai-hero-burj-khalifa-palms-sunset.webp",
        badges: [
          { text: "Burj Khalifa", variant: "default" },
          { text: "Dubai Mall", variant: "secondary" },
          { text: "Luxury Living", variant: "outline" }
        ]
      }}
      stats={[
        { value: "828m", label: "Burj Khalifa Height", subtext: "World's tallest" },
        { value: "1,200+", label: "Dubai Mall Stores", subtext: "Largest mall globally" },
        { value: "8%", label: "Rental Yield", subtext: "Average ROI" },
        { value: "AED 2,500", label: "Per Sqft", subtext: "Average price" }
      ]}
      statsTitle="Downtown Dubai Overview"
      statsSubtitle="Key facts about Dubai's premier destination"
      highlights={[
        {
          icon: Building2,
          title: "Burj Khalifa",
          description: "Visit the world's tallest building at 828m with observation decks on floors 124, 125, and 148 offering panoramic city views."
        },
        {
          icon: ShoppingBag,
          title: "Dubai Mall",
          description: "Shop at over 1,200 stores, visit the Dubai Aquarium, ice skate, and experience world-class entertainment under one roof."
        },
        {
          icon: Sparkles,
          title: "Dubai Fountain",
          description: "Watch the world's largest choreographed fountain system with shows every 30 minutes from 6 PM to 11 PM."
        },
        {
          icon: Theater,
          title: "Dubai Opera",
          description: "Experience world-class performances at the dhow-shaped opera house hosting ballet, opera, concerts, and theater."
        },
        {
          icon: Camera,
          title: "The Boulevard",
          description: "Stroll along the 3.5km promenade with cafes, restaurants, and stunning views of the Burj Khalifa."
        },
        {
          icon: Train,
          title: "Metro Connected",
          description: "Burj Khalifa/Dubai Mall Metro Station provides direct access via the Red Line to major destinations."
        }
      ]}
      highlightsTitle="What Makes Downtown Dubai Special"
      nearbyDistricts={[
        { name: "Business Bay", slug: "business-bay", description: "Adjacent CBD with canal views" },
        { name: "DIFC", slug: "difc", description: "Financial hub & fine dining" },
        { name: "Dubai Creek Harbour", slug: "dubai-creek-harbour", description: "Future landmark district" }
      ]}
      faqs={[
        { 
          question: "What is Downtown Dubai known for?", 
          answer: "Downtown Dubai is the city's premier urban destination, home to the iconic Burj Khalifa (world's tallest building at 828m), Dubai Mall (1,200+ stores), Dubai Fountain, and Dubai Opera. It's the entertainment and lifestyle hub of the UAE." 
        },
        { 
          question: "How expensive is it to live in Downtown Dubai?", 
          answer: "Downtown Dubai is a premium location. Studio apartments start from AED 60,000/year, while 1-bedroom units range from AED 80,000-150,000/year. Luxury penthouses can exceed AED 1 million annually." 
        },
        { 
          question: "Is Downtown Dubai walkable?", 
          answer: "Yes, Downtown Dubai is one of the most walkable areas in Dubai. The Boulevard, Dubai Mall, and Burj Khalifa area are pedestrian-friendly with shaded walkways and air-conditioned connections between buildings." 
        },
        {
          question: "What are the best restaurants in Downtown Dubai?",
          answer: "Downtown Dubai offers diverse dining from At.mosphere (world's highest restaurant in Burj Khalifa) to casual options at Souk Al Bahar. The Boulevard features international cuisines, while Dubai Mall has over 200 F&B outlets."
        },
        {
          question: "How do I get to Downtown Dubai from the airport?",
          answer: "From Dubai International Airport (DXB), take the Metro Red Line directly to Burj Khalifa/Dubai Mall station (about 35 minutes). Taxis cost approximately AED 60-80 and take 20-30 minutes depending on traffic."
        }
      ]}
      cta={{
        title: "Invest in Downtown Dubai",
        description: "Explore premium properties in Dubai's most iconic neighborhood with world-class amenities and strong rental yields.",
        primaryAction: { label: "View Properties", href: "/destinations/dubai/off-plan/downtown" },
        secondaryAction: { label: "Investment Guide", href: "/destinations/dubai/off-plan/investment-guide" }
      }}
    />
  );
}

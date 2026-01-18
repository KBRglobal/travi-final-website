import { Landmark, UtensilsCrossed, Building2, Train, Palette, Briefcase } from "lucide-react";
import { DubaiDistrictTemplate } from "./templates/DubaiDistrictTemplate";

export default function DistrictDIFC() {
  return (
    <DubaiDistrictTemplate
      title="DIFC Dubai Guide 2026 - Financial Centre & Gate Avenue"
      metaDescription="Discover DIFC (Dubai International Financial Centre), the financial hub of the Middle East. Guide to Gate Avenue, dining, art galleries, and apartments in DIFC."
      canonicalPath="/dubai/difc"
      keywords={["difc dubai", "dubai financial centre", "gate avenue difc", "difc restaurants", "difc apartments", "difc art gallery"]}
      breadcrumbs={[
        { label: "Districts", href: "/dubai/districts" },
        { label: "DIFC", href: "/dubai/difc" }
      ]}
      hero={{
        title: "DIFC - Dubai International Financial Centre",
        subtitle: "The leading financial hub of the Middle East, Africa, and South Asia with world-class dining and art",
        backgroundImage: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp",
        badges: [
          { text: "Financial Hub", variant: "default" },
          { text: "Fine Dining", variant: "secondary" },
          { text: "Art District", variant: "outline" }
        ]
      }}
      stats={[
        { value: "$1T+", label: "Assets", subtext: "Under administration" },
        { value: "100+", label: "Restaurants", subtext: "Gate Avenue & beyond" },
        { value: "2,500+", label: "Companies", subtext: "Registered in DIFC" },
        { value: "AED 2,800", label: "Per Sqft", subtext: "Average price" }
      ]}
      statsTitle="DIFC Overview"
      statsSubtitle="Key facts about the Middle East's financial capital"
      highlights={[
        {
          icon: Briefcase,
          title: "Financial Hub",
          description: "Home to the region's leading banks, law firms, and financial services with independent jurisdiction."
        },
        {
          icon: UtensilsCrossed,
          title: "World-Class Dining",
          description: "Experience Dubai's finest restaurants including Zuma, La Petite Maison, Coya, and Tresind Studio."
        },
        {
          icon: Landmark,
          title: "Gate Avenue",
          description: "The 1.3km pedestrian promenade connecting dining, retail, and entertainment venues."
        },
        {
          icon: Palette,
          title: "Art Scene",
          description: "Explore contemporary art galleries, public sculptures, and the annual Art Dubai fair."
        },
        {
          icon: Building2,
          title: "Premium Offices",
          description: "Prestigious office space with state-of-the-art facilities and independent business-friendly regulations."
        },
        {
          icon: Train,
          title: "Central Location",
          description: "DIFC Metro Station provides direct access, with Downtown Dubai just minutes away."
        }
      ]}
      highlightsTitle="What Makes DIFC Special"
      nearbyDistricts={[
        { name: "Downtown Dubai", slug: "downtown-dubai", description: "Burj Khalifa & Dubai Mall" },
        { name: "Business Bay", slug: "business-bay", description: "Dubai Canal & CBD" },
        { name: "Jumeirah", slug: "jumeirah", description: "Beach Road & villas" }
      ]}
      faqs={[
        { 
          question: "What is DIFC known for?", 
          answer: "DIFC is the Middle East's leading financial hub, housing global banks, law firms, and financial services. It's also renowned for Gate Avenue's fine dining, art galleries, and a sophisticated social scene." 
        },
        { 
          question: "Can you live in DIFC?", 
          answer: "Yes, DIFC has residential components including luxury apartments. Living in DIFC offers walkability to offices, restaurants, and cultural venues, plus excellent Metro connectivity." 
        },
        { 
          question: "What restaurants are in DIFC?", 
          answer: "DIFC hosts Dubai's best fine dining including Zuma, La Petite Maison, Coya, Roberto's, Tresind Studio, and many others. Gate Avenue offers both casual and high-end options." 
        },
        {
          question: "What are DIFC's operating laws?",
          answer: "DIFC operates under its own legal system based on English common law, independent of UAE civil law. It has its own courts, regulator (DFSA), and business-friendly regulations attracting international companies."
        },
        {
          question: "Is DIFC good for investment?",
          answer: "DIFC properties command premium prices due to prestige and location but offer lower yields (4-5%) than areas like Business Bay. It's best for those seeking lifestyle and capital appreciation over rental income."
        }
      ]}
      cta={{
        title: "Experience DIFC Living",
        description: "Discover luxury residences in the heart of the Middle East's financial capital.",
        primaryAction: { label: "View Properties", href: "/destinations/dubai/districts/difc#lifestyle" },
        secondaryAction: { label: "DIFC Dining Guide", href: "/destinations/dubai/dining/difc" }
      }}
    />
  );
}

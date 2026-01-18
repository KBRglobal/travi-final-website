import { Ship, ShoppingBag, Landmark, Camera, UtensilsCrossed, History } from "lucide-react";
import { DubaiDistrictTemplate } from "./templates/DubaiDistrictTemplate";

export default function DistrictOldDubai() {
  return (
    <DubaiDistrictTemplate
      title="Old Dubai Guide 2026 - Deira, Bur Dubai & Gold Souk"
      metaDescription="Explore Old Dubai including Deira and Bur Dubai. Visit the Gold Souk, Spice Souk, Dubai Creek, Al Fahidi, and experience authentic Emirati culture."
      canonicalPath="/dubai/old-dubai"
      keywords={["old dubai", "deira dubai", "bur dubai", "gold souk dubai", "spice souk", "dubai creek", "al fahidi"]}
      breadcrumbs={[
        { label: "Districts", href: "/dubai/districts" },
        { label: "Old Dubai", href: "/dubai/old-dubai" }
      ]}
      hero={{
        title: "Old Dubai",
        subtitle: "Discover Dubai's rich heritage in the historic districts of Deira and Bur Dubai with traditional souks and abra rides",
        backgroundImage: "/images/categories/dubai/dubai-old-town-wind-towers-colorful-traditional-architecture.webp",
        badges: [
          { text: "Gold Souk", variant: "default" },
          { text: "Dubai Creek", variant: "secondary" },
          { text: "Cultural Heart", variant: "outline" }
        ]
      }}
      stats={[
        { value: "1 AED", label: "Abra Ride", subtext: "Across the Creek" },
        { value: "300+", label: "Gold Shops", subtext: "In Gold Souk" },
        { value: "1890s", label: "Heritage", subtext: "Al Fahidi origins" },
        { value: "4", label: "Historic Souks", subtext: "Traditional markets" }
      ]}
      statsTitle="Old Dubai Overview"
      statsSubtitle="Key facts about Dubai's historic heart"
      highlights={[
        {
          icon: ShoppingBag,
          title: "Gold Souk",
          description: "Browse over 300 gold shops offering jewelry at competitive prices by weight. Bargaining is expected!"
        },
        {
          icon: Ship,
          title: "Abra Rides",
          description: "Cross Dubai Creek on traditional wooden boats for just 1 AED - one of Dubai's most iconic experiences."
        },
        {
          icon: History,
          title: "Al Fahidi District",
          description: "Explore the restored heritage quarter with wind tower houses, art galleries, and cafes."
        },
        {
          icon: Landmark,
          title: "Dubai Museum",
          description: "Visit Dubai's oldest building, Al Fahidi Fort, housing the museum showcasing pre-oil Dubai life."
        },
        {
          icon: UtensilsCrossed,
          title: "Authentic Cuisine",
          description: "Taste traditional Emirati dishes and street food from around the world at heritage restaurants."
        },
        {
          icon: Camera,
          title: "Spice Souk",
          description: "Inhale the aromas of saffron, cardamom, and incense in the atmospheric Spice Souk."
        }
      ]}
      highlightsTitle="What Makes Old Dubai Special"
      nearbyDistricts={[
        { name: "Al Karama", slug: "al-karama", description: "Shopping & Metro access" },
        { name: "Dubai Creek Harbour", slug: "dubai-creek-harbour", description: "Future landmark district" },
        { name: "Business Bay", slug: "business-bay", description: "Dubai Canal access" }
      ]}
      faqs={[
        { 
          question: "What can you buy at Dubai Gold Souk?", 
          answer: "Dubai Gold Souk offers gold jewelry at competitive prices, with gold sold by weight plus making charges. You'll also find silver, precious stones, pearls, and watches. Bargaining is expected and can reduce prices by 20-30%." 
        },
        { 
          question: "How much is an abra ride in Dubai Creek?", 
          answer: "An abra (traditional wooden boat) ride across Dubai Creek costs just 1 AED per person. It's one of Dubai's most iconic and affordable experiences, connecting Deira to Bur Dubai in about 5 minutes." 
        },
        { 
          question: "Is Old Dubai worth visiting?", 
          answer: "Absolutely! Old Dubai offers an authentic contrast to the modern city. Explore Al Fahidi Historical District, visit Dubai Museum, haggle in the souks, take an abra ride, and enjoy traditional Emirati cuisine at heritage restaurants." 
        },
        {
          question: "What is the best time to visit Old Dubai?",
          answer: "Visit in the morning (9-11 AM) or evening (4-9 PM) to avoid midday heat. The Gold and Spice Souks are busiest on weekends. Ramadan evenings offer a special atmosphere with extended hours."
        },
        {
          question: "How do I get to Old Dubai from Downtown?",
          answer: "Take the Metro Green Line from Burj Khalifa station to Al Fahidi or Baniyas Square stations. By taxi, it's about 15-20 minutes and AED 25-35 depending on traffic."
        }
      ]}
      cta={{
        title: "Discover Dubai's Heritage",
        description: "Immerse yourself in the authentic culture and traditions that shaped modern Dubai.",
        primaryAction: { label: "Plan Your Tour", href: "/destinations/dubai/districts/old-dubai#attractions" },
        secondaryAction: { label: "Heritage Guide", href: "/destinations/dubai/culture/heritage" }
      }}
    />
  );
}

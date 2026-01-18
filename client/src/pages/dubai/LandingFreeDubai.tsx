import { DubaiLandingTemplate } from "./templates/DubaiLandingTemplate";
import { getDubaiPageBySlug } from "@/data/dubai-pages";
import { 
  Beach, 
  Building2, 
  Droplets, 
  Trees, 
  Music, 
  ShoppingBag,
  Sunset,
  Camera
} from "lucide-react";

const pageData = getDubaiPageBySlug("free-things-to-do");

export default function LandingFreeDubai() {
  if (!pageData) return null;

  return (
    <DubaiLandingTemplate
      title={pageData.title}
      metaDescription={pageData.description}
      canonicalPath="/destinations/dubai/free-things-to-do"
      keywords={pageData.keywords}
      breadcrumbs={pageData.breadcrumbs}
      hero={{
        title: pageData.hero.title,
        subtitle: pageData.hero.subtitle,
        backgroundImage: pageData.hero.image,
        badges: pageData.hero.badges?.map(text => ({ text })),
        stats: pageData.stats,
      }}
      highlights={[
        {
          icon: Beach,
          title: "Public Beaches",
          description: "JBR Beach, Kite Beach, La Mer, and Marina Beach offer free access with stunning views of Dubai's skyline and crystal-clear waters.",
        },
        {
          icon: Droplets,
          title: "Dubai Fountain Shows",
          description: "The world's largest choreographed fountain performs every 30 minutes from 6pm-11pm, with daytime shows at 1pm and 1:30pm.",
        },
        {
          icon: Building2,
          title: "Al Fahidi Historic District",
          description: "Wander through wind-tower houses, traditional courtyards, and art galleries in this beautifully preserved heritage neighborhood.",
        },
        {
          icon: Trees,
          title: "Parks & Walking Trails",
          description: "Explore Creek Park, Al Barsha Pond Park, or walk the Dubai Water Canal promenade with free entry and stunning city views.",
        },
      ]}
      highlightsTitle="Top Free Experiences"
      highlightsSubtitle="Discover Dubai's best attractions that won't cost you a dirham"
      infoSections={[
        {
          icon: ShoppingBag,
          title: "Free Mall Experiences",
          description: "Dubai's malls offer world-class entertainment without entry fees.",
          badge: "Indoor",
          items: [
            "Dubai Mall Aquarium viewing (outside tunnel)",
            "Dubai Mall Fountain boardwalk experience",
            "Mall of the Emirates skiing viewpoint",
            "Ibn Battuta Mall themed court tours",
            "City Centre Mirdif indoor gardens",
          ],
        },
        {
          icon: Music,
          title: "Free Events & Festivals",
          description: "Year-round festivals and cultural events with free entry throughout Dubai.",
          badge: "Seasonal",
          items: [
            "Dubai Shopping Festival activations (Jan-Feb)",
            "Dubai Food Festival pop-ups (Feb-Mar)",
            "Ramadan markets and iftars (varies)",
            "Dubai Summer Surprises (Jul-Sep)",
            "Global Village cultural performances (Nov-Apr)",
          ],
        },
        {
          icon: Sunset,
          title: "Free Sunset Spots",
          description: "Watch spectacular Dubai sunsets from these premium viewpoints.",
          badge: "Daily",
          items: [
            "Kite Beach with Burj Al Arab views",
            "Dubai Marina Walk promenade",
            "Al Seef heritage waterfront",
            "Dubai Frame gardens (outside)",
            "Palm Jumeirah boardwalk",
          ],
        },
        {
          icon: Camera,
          title: "Free Photo Spots",
          description: "Capture Instagram-worthy shots at these iconic free locations.",
          badge: "Anytime",
          items: [
            "Burj Khalifa from Souk Al Bahar",
            "Dubai Creek abra crossing views",
            "Love Lake heart-shaped lakes",
            "Al Fahidi street art and murals",
            "Jumeirah Beach Road mosque views",
          ],
        },
      ]}
      infoSectionsTitle="Category Guide"
      infoSectionsSubtitle="Organize your free Dubai adventure by category"
      faqs={[
        ...(pageData.faqs || []),
        {
          question: "Are Dubai's beaches really free?",
          answer: "Yes! Public beaches like JBR Beach, Kite Beach, and La Mer are completely free to access. You only pay if you rent sun loungers or umbrellas. Beaches have free showers, changing rooms, and lifeguards.",
        },
        {
          question: "When are the Dubai Fountain shows?",
          answer: "The Dubai Fountain performs daily at 1:00 PM and 1:30 PM (afternoons) and every 30 minutes from 6:00 PM to 11:00 PM (evenings). Shows are completely free to watch from the Dubai Mall waterfront promenade or Souk Al Bahar.",
        },
        {
          question: "Can I visit Dubai's malls for free?",
          answer: "Absolutely! All Dubai malls have free entry. You can enjoy air-conditioning, window shopping, food court seating, and even some free attractions like aquarium viewing areas and themed decorations.",
        },
        {
          question: "What free activities are there for families?",
          answer: "Families can enjoy free beach days, park visits (Creek Park, Zabeel Park), Dubai Marina walks, Al Fahidi exploration, mosque visits (Jumeirah Mosque on certain days), and watching the Dubai Fountain shows together.",
        },
        {
          question: "Is the Dubai Desert free to visit?",
          answer: "The desert itself is free to access, but you'll need a 4x4 vehicle. Popular free spots include Al Qudra Lakes and Love Lake. For desert safaris with dune bashing, you'll need to book a paid tour.",
        },
      ]}
      faqTitle="Frequently Asked Questions"
      cta={{
        title: "Ready to Explore Dubai?",
        description: "Start planning your budget-friendly Dubai adventure with our complete destination guide.",
        primaryButton: {
          label: pageData.cta?.label || "Explore Dubai",
          href: pageData.cta?.href || "/destinations/dubai",
        },
        secondaryButton: {
          label: "View All Districts",
          href: "/destinations/dubai/districts",
        },
      }}
    />
  );
}

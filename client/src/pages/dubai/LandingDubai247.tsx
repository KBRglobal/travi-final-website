import { DubaiLandingTemplate } from "./templates/DubaiLandingTemplate";
import { getDubaiPageBySlug } from "@/data/dubai-pages";
import { 
  UtensilsCrossed, 
  Pill, 
  ShoppingCart, 
  Dumbbell,
  Fuel,
  Car,
  Coffee,
  Sparkles
} from "lucide-react";

const pageData = getDubaiPageBySlug("24-hours-open");

export default function LandingDubai247() {
  if (!pageData) return null;

  return (
    <DubaiLandingTemplate
      title={pageData.title}
      metaDescription={pageData.description}
      canonicalPath="/destinations/dubai/24-hours-open"
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
          icon: UtensilsCrossed,
          title: "24/7 Restaurants",
          description: "From international chains to local eateries, Dubai has hundreds of restaurants serving delicious food around the clock.",
        },
        {
          icon: Pill,
          title: "24-Hour Pharmacies",
          description: "Aster, Life, Boots, and hospital pharmacies operate 24/7 across Dubai for your medical needs at any hour.",
        },
        {
          icon: ShoppingCart,
          title: "24-Hour Supermarkets",
          description: "Carrefour, Spinneys, Lulu, and Choithrams locations throughout Dubai stay open all night for late-night shopping.",
        },
        {
          icon: Fuel,
          title: "Gas Stations & Services",
          description: "ENOC, EPPCO, and ADNOC stations operate 24/7 with convenience stores, ATMs, and car services.",
        },
      ]}
      highlightsTitle="Never Closes"
      highlightsSubtitle="Essential services available round the clock in Dubai"
      infoSections={[
        {
          icon: Coffee,
          title: "24-Hour Cafes & Coffee Shops",
          description: "Fuel up at any hour with coffee and snacks.",
          badge: "Caffeine",
          items: [
            "Tim Hortons - Multiple 24-hour locations across Dubai",
            "McDonald's McCafe - Most highway locations open 24/7",
            "Costa Coffee - Select Dubai Mall area locations",
            "Starbucks - Dubai Airport branches 24/7",
            "High Joint - Popular 24/7 cafe in JLT",
          ],
        },
        {
          icon: UtensilsCrossed,
          title: "Late Night Restaurants",
          description: "Satisfy hunger cravings at any time of night.",
          badge: "Food",
          items: [
            "Ravi Restaurant (Satwa) - Legendary Pakistani food, open till 3am+",
            "Operation Falafel - Multiple locations open late",
            "Al Mallah (Al Dhiyafah) - Shawarma until early morning",
            "Zaroob - Arabic street food, late-night staple",
            "McDonald's/KFC/Hardee's - Many 24-hour drive-throughs",
          ],
        },
        {
          icon: Dumbbell,
          title: "24-Hour Fitness",
          description: "Work out whenever it suits your schedule.",
          badge: "Health",
          items: [
            "Fitness First - Select locations with 24/7 access",
            "GymNation - Affordable 24/7 gym chain across Dubai",
            "Anytime Fitness - True 24/7 access with key fob entry",
            "Warehouse Gym - Several 24-hour locations",
            "Hotel gyms - Many 5-star hotels offer 24/7 access",
          ],
        },
        {
          icon: Sparkles,
          title: "24-Hour Services",
          description: "Essential services available any time of day or night.",
          badge: "Convenience",
          items: [
            "Dubai Taxi - 24/7 booking via app or call (+971 4 208 0808)",
            "Careem/Uber - Ride-hailing available round the clock",
            "Emergency services - Police (999), Ambulance (998)",
            "Hotels - 24-hour reception, room service, concierge",
            "Dubai Airport - Operates 24/7 with all facilities",
          ],
        },
        {
          icon: ShoppingCart,
          title: "24-Hour Retail & Convenience",
          description: "Shop for essentials whenever you need them.",
          badge: "Shopping",
          items: [
            "Carrefour Market - Many locations open 24 hours",
            "Zoom convenience stores at gas stations",
            "Al Maya supermarkets - Select 24-hour locations",
            "Emirates Co-op - Several 24-hour branches",
            "Airport Duty Free - Open for all departures",
          ],
        },
        {
          icon: Car,
          title: "24-Hour Auto Services",
          description: "Car trouble? Help is available around the clock.",
          badge: "Automotive",
          items: [
            "AAA/AADC roadside assistance",
            "Quick Fit auto service centers (select locations)",
            "Car wash services at most gas stations",
            "Valet parking at major hotels",
            "RTA customer service hotline (800 90 90)",
          ],
        },
      ]}
      infoSectionsTitle="Complete 24/7 Guide"
      infoSectionsSubtitle="Everything you need, whenever you need it in Dubai"
      faqs={[
        ...(pageData.faqs || []),
        {
          question: "Is Dubai really a 24-hour city?",
          answer: "Yes! Dubai truly operates around the clock. Essential services like pharmacies, supermarkets, gas stations, and restaurants are available 24/7. Many gyms and cafes also offer 24-hour access, and public transport runs late into the night.",
        },
        {
          question: "Where can I find 24-hour pharmacies in Dubai?",
          answer: "Major pharmacy chains like Aster, Life Pharmacy, and Boots have 24-hour branches across Dubai. Hospital pharmacies (Mediclinic, NMC, Aster) also operate 24/7. Most gas stations have basic pharmacy sections too.",
        },
        {
          question: "Are supermarkets open 24 hours in Dubai?",
          answer: "Many Carrefour, Spinneys, Lulu, and Choithrams locations operate 24 hours. Convenience stores at gas stations (Zoom, ENOC) are always open. Check individual store timings as not all branches are 24-hour.",
        },
        {
          question: "Can I get food delivered at 3am in Dubai?",
          answer: "Yes! Food delivery apps like Talabat, Zomato, and Deliveroo operate late into the night with many restaurants offering 24-hour delivery. Fast food chains like McDonald's and KFC deliver through the night.",
        },
        {
          question: "Is public transport available 24 hours?",
          answer: "Dubai Metro operates from 5am-midnight (Sat-Wed) and 5am-1am (Thu-Fri). Night buses run after metro closing. Dubai Taxi, Careem, and Uber are available 24/7 for reliable transportation at any hour.",
        },
        {
          question: "What entertainment is available late at night?",
          answer: "Dubai's nightclubs and bars in hotels operate until 3am. Shisha cafes stay open late. Global Village is open until midnight. Some bowling alleys and entertainment centers have extended hours on weekends.",
        },
      ]}
      faqTitle="24/7 Dubai Questions"
      cta={{
        title: "Explore Dubai Anytime",
        description: "Experience a city that truly never sleeps with our complete guide to Dubai.",
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

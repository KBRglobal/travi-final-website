import { DubaiLandingTemplate } from "./templates/DubaiLandingTemplate";
import { getDubaiPageBySlug } from "@/data/dubai-pages";
import { 
  Shirt, 
  Camera, 
  Wine, 
  Car, 
  Users,
  Smartphone,
  Heart,
  Shield
} from "lucide-react";

const pageData = getDubaiPageBySlug("laws-for-tourists");

export default function LandingDubaiLaws() {
  if (!pageData) return null;

  return (
    <DubaiLandingTemplate
      title={pageData.title}
      metaDescription={pageData.description}
      canonicalPath="/destinations/dubai/laws-for-tourists"
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
          icon: Shirt,
          title: "Dress Code",
          description: "Cover shoulders and knees in malls, markets, and public areas. Swimwear is only acceptable at beaches and pools.",
        },
        {
          icon: Camera,
          title: "Photography Rules",
          description: "Never photograph people without permission, especially women. Avoid taking photos of government buildings, airports, and military areas.",
        },
        {
          icon: Wine,
          title: "Alcohol Laws",
          description: "Alcohol is served in licensed venues (hotels, bars). Drinking in public or being drunk in public is illegal. Legal drinking age is 21.",
        },
        {
          icon: Users,
          title: "Public Behavior",
          description: "Public displays of affection should be minimal. Loud behavior, swearing, and rude gestures can result in fines or legal action.",
        },
      ]}
      highlightsTitle="Key Rules to Know"
      highlightsSubtitle="Essential guidelines for a safe and respectful visit to Dubai"
      infoSections={[
        {
          icon: Car,
          title: "Traffic & Driving Rules",
          description: "Dubai has strict traffic laws with heavy fines for violations.",
          badge: "Important",
          items: [
            "Zero tolerance for drink driving - any alcohol detected is illegal",
            "Seatbelts mandatory for all passengers",
            "Using mobile phones while driving is heavily fined (AED 800+)",
            "Speed limits: 60-80 km/h in city, 100-120 km/h on highways",
            "Jaywalking fines: AED 400 for crossing outside designated areas",
          ],
        },
        {
          icon: Smartphone,
          title: "Digital & Social Media Laws",
          description: "Online activity is monitored and certain content is restricted.",
          badge: "Caution",
          items: [
            "VPNs are legal but using them for illegal activities is not",
            "Sharing photos of others online without consent is illegal",
            "Defamation on social media can lead to deportation",
            "Certain websites and apps may be blocked",
            "Recording people without permission is punishable",
          ],
        },
        {
          icon: Heart,
          title: "Relationships & Cohabitation",
          description: "UAE has specific laws regarding relationships.",
          badge: "Updated",
          items: [
            "Unmarried couples can now legally share hotel rooms",
            "Cohabitation for unmarried couples was decriminalized in 2020",
            "Same-sex relationships remain illegal",
            "Public displays of affection should be minimal (holding hands is acceptable)",
            "Pregnancy outside marriage has been decriminalized for tourists",
          ],
        },
        {
          icon: Shield,
          title: "Religious Respect",
          description: "Dubai is a Muslim country with religious considerations.",
          badge: "Respect",
          items: [
            "During Ramadan: no eating, drinking, or smoking in public during daylight",
            "Friday is the holy day - some businesses close for Friday prayers",
            "Mosques may have restricted areas for non-Muslims",
            "Respect call to prayer times (5 times daily)",
            "Religious criticism or mockery is strictly prohibited",
          ],
        },
      ]}
      infoSectionsTitle="Detailed Guidelines"
      infoSectionsSubtitle="Comprehensive rules and regulations for tourists in Dubai"
      faqs={[
        ...(pageData.faqs || []),
        {
          question: "What happens if I break a law in Dubai?",
          answer: "Penalties range from fines (starting at AED 250) to imprisonment depending on the offense. Serious violations like drug offenses can result in deportation or severe sentences. Always stay informed and respect local laws.",
        },
        {
          question: "Can I drink alcohol in Dubai?",
          answer: "Yes, but only in licensed venues like hotel bars, restaurants, and clubs. You must be 21 or older. Drinking in public, being visibly intoxicated in public, or drink-driving is illegal with zero tolerance.",
        },
        {
          question: "What should I wear in Dubai?",
          answer: "In malls, markets, and public areas, cover your shoulders and knees. Swimwear is only for beaches and pools. In Old Dubai and cultural areas, dress more conservatively. Hotels and tourist areas are more relaxed.",
        },
        {
          question: "Can I take photos of anything in Dubai?",
          answer: "You can photograph landmarks and tourist attractions. Never photograph people without permission (especially women), government buildings, airports, military installations, or accident scenes. When in doubt, ask first.",
        },
        {
          question: "Are there any banned items I can't bring to Dubai?",
          answer: "Prohibited items include: drugs (severe penalties including death), pork products (unless for personal consumption from licensed shops), religious materials for proselytizing, and items deemed offensive to Islam. Prescription medication requires a doctor's letter.",
        },
        {
          question: "Is Dubai safe for solo female travelers?",
          answer: "Dubai is one of the safest cities in the world for women. Crime rates are extremely low. Normal precautions apply - dress modestly, avoid isolated areas at night, and use licensed taxis or ride-sharing apps.",
        },
      ]}
      faqTitle="Common Questions"
      cta={{
        title: "Travel Prepared",
        description: "Now that you know the rules, explore Dubai's amazing attractions with confidence.",
        primaryButton: {
          label: pageData.cta?.label || "Plan Your Trip",
          href: pageData.cta?.href || "/destinations/dubai",
        },
        secondaryButton: {
          label: "View Free Activities",
          href: "/destinations/dubai/free-things-to-do",
        },
      }}
    />
  );
}

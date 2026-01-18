import { DubaiLandingTemplate } from "./templates/DubaiLandingTemplate";
import { getDubaiPageBySlug } from "@/data/dubai-pages";
import { 
  Crown, 
  Lightbulb, 
  Trophy, 
  Quote,
  Building2,
  Plane,
  Users,
  Target
} from "lucide-react";

const pageData = getDubaiPageBySlug("sheikh-mohammed");

export default function LandingSheikhMohammed() {
  if (!pageData) return null;

  return (
    <DubaiLandingTemplate
      title={pageData.title}
      metaDescription={pageData.description}
      canonicalPath="/destinations/dubai/sheikh-mohammed"
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
          icon: Crown,
          title: "Ruler of Dubai",
          description: "Sheikh Mohammed bin Rashid Al Maktoum has served as Ruler of Dubai since January 4, 2006, and as Vice President and Prime Minister of the UAE.",
        },
        {
          icon: Lightbulb,
          title: "The Visionary",
          description: "Transformed Dubai from a small trading port into a global metropolis, pioneering mega-projects like Palm Jumeirah and Burj Khalifa.",
        },
        {
          icon: Trophy,
          title: "World Records",
          description: "Under his leadership, Dubai has achieved numerous world records: tallest building, largest mall, busiest airport for international passengers.",
        },
        {
          icon: Quote,
          title: "Famous Philosophy",
          description: '"The word impossible is not in our dictionary" - A motto that has driven Dubai\'s ambitious transformation and global aspirations.',
        },
      ]}
      highlightsTitle="Key Facts"
      highlightsSubtitle="Understanding the leader behind Dubai's extraordinary transformation"
      infoSections={[
        {
          icon: Building2,
          title: "Major Achievements",
          description: "Landmark projects and initiatives that shaped modern Dubai.",
          badge: "Legacy",
          items: [
            "Palm Jumeirah - World's largest artificial island (2001-2006)",
            "Burj Khalifa - World's tallest building at 828m (2010)",
            "Dubai Metro - First urban metro in the Arabian Peninsula (2009)",
            "Emirates Airline - Built into world's 4th largest airline",
            "Dubai Expo 2020 - First World Expo in the Middle East",
          ],
        },
        {
          icon: Target,
          title: "Dubai Vision 2071",
          description: "A 50-year plan to make Dubai the world's best city.",
          badge: "Future",
          items: [
            "Make UAE the world's best country by 2071 centennial",
            "Focus on AI, space exploration, and clean energy",
            "Develop future generations through world-class education",
            "Build a diversified, knowledge-based economy",
            "Position Dubai as a global hub for innovation",
          ],
        },
        {
          icon: Plane,
          title: "Tourism & Economy",
          description: "Initiatives that made Dubai a global tourism powerhouse.",
          badge: "Growth",
          items: [
            "Dubai Tourism Vision: 25 million visitors by 2025",
            "Created Dubai Holding and Dubai World investment groups",
            "Launched Dubai International Financial Centre (DIFC)",
            "Established free zones attracting global businesses",
            "Built the world's largest theme park complex",
          ],
        },
        {
          icon: Users,
          title: "Social Initiatives",
          description: "Humanitarian and social welfare programs.",
          badge: "Giving",
          items: [
            "Mohammed bin Rashid Al Maktoum Foundation - $10B for education",
            "Dubai Cares - Education for underprivileged children globally",
            "Arab Reading Challenge - Largest Arabic reading initiative",
            "Mohammed bin Rashid Space Centre - UAE's space program",
            "Dubai Charity Association - Social welfare programs",
          ],
        },
      ]}
      infoSectionsTitle="Vision & Legacy"
      infoSectionsSubtitle="The initiatives and achievements that define Sheikh Mohammed's leadership"
      faqs={[
        {
          question: "Who is Sheikh Mohammed bin Rashid Al Maktoum?",
          answer: "Sheikh Mohammed is the Ruler of Dubai (since 2006), Vice President of the UAE, and Prime Minister of the UAE. He is widely credited with transforming Dubai into a global business, tourism, and innovation hub.",
        },
        {
          question: "What is Sheikh Mohammed's most famous quote?",
          answer: '"The word impossible is not in our dictionary." This philosophy has driven Dubai\'s ambitious projects and its transformation from a small trading port to a world-renowned metropolis.',
        },
        {
          question: "What major projects did Sheikh Mohammed initiate?",
          answer: "Key projects include Palm Jumeirah, Burj Khalifa, Dubai Metro, Emirates Airline expansion, Dubai Mall, Dubai International Financial Centre, and the overall vision that made Dubai a global destination.",
        },
        {
          question: "What is Dubai Vision 2021 and 2071?",
          answer: "Vision 2021 aimed to make Dubai the world's best place to live and work by 2021 (UAE's 50th anniversary). Vision 2071 is a 50-year plan for the UAE's centennial, focusing on AI, space, and future generations.",
        },
        {
          question: "Is Sheikh Mohammed also involved in horse racing?",
          answer: "Yes, Sheikh Mohammed is a passionate equestrian and one of the world's leading horse racing figures. He founded Godolphin Racing, one of the most successful thoroughbred racing operations globally.",
        },
        {
          question: "Where can I see Sheikh Mohammed in Dubai?",
          answer: "Sheikh Mohammed is known for making surprise visits to government departments and public areas. While there's no scheduled public appearances, he's often seen at major events like Dubai World Cup, Expo, and national celebrations.",
        },
      ]}
      faqTitle="About Sheikh Mohammed"
      cta={{
        title: "Experience His Vision",
        description: "Explore the landmarks, districts, and experiences that showcase Sheikh Mohammed's vision for Dubai.",
        primaryButton: {
          label: pageData.cta?.label || "Discover Dubai",
          href: pageData.cta?.href || "/destinations/dubai",
        },
        secondaryButton: {
          label: "View Dubai Districts",
          href: "/destinations/dubai/districts",
        },
      }}
    />
  );
}

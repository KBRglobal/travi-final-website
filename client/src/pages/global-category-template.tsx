import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowRight,
  MapPin,
  Star,
  Globe,
  Compass,
  TrendingUp,
  BookOpen,
  Users,
} from "lucide-react";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { useLocale } from "@/lib/i18n/LocaleRouter";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { PublicHero } from "@/components/public-hero";

export type GlobalCategoryType = "hotels" | "attractions" | "dining" | "things-to-do" | "guides";

interface GlobalCategoryConfig {
  title: string;
  titleHe: string;
  subtitle: string;
  subtitleHe: string;
  heroImage: string;
  icon: typeof Globe;
  destinations: Array<{
    name: string;
    nameHe: string;
    slug: string;
    image: string;
    count: number;
    featured?: boolean;
  }>;
  editorialContent: {
    heading: string;
    headingHe: string;
    description: string;
    descriptionHe: string;
  };
  featuredGuides: Array<{
    title: string;
    titleHe: string;
    description: string;
    descriptionHe: string;
    href: string;
    image: string;
  }>;
}

const categoryConfigs: Record<GlobalCategoryType, GlobalCategoryConfig> = {
  hotels: {
    title: "Hotels & Resorts",
    titleHe: "מלונות ואתרי נופש",
    subtitle: "Discover world-class accommodations across stunning destinations",
    subtitleHe: "גלו אירוח ברמה עולמית ביעדים מדהימים",
    heroImage: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&h=1080&fit=crop",
    icon: Star,
    destinations: [
      { name: "Dubai", nameHe: "דובאי", slug: "dubai", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop", count: 524, featured: true },
      { name: "Paris", nameHe: "פריז", slug: "paris", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop", count: 412 },
      { name: "Tokyo", nameHe: "טוקיו", slug: "tokyo", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop", count: 389 },
      { name: "New York", nameHe: "ניו יורק", slug: "new-york", image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop", count: 456 },
      { name: "London", nameHe: "לונדון", slug: "london", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop", count: 378 },
      { name: "Bali", nameHe: "באלי", slug: "bali", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&h=600&fit=crop", count: 234 },
    ],
    editorialContent: {
      heading: "Expert-Curated Stays",
      headingHe: "אירוח באוצרות מומחים",
      description: "Our travel editors personally review and select the finest hotels, from iconic luxury properties to hidden boutique gems. Every recommendation reflects years of expertise and genuine local knowledge.",
      descriptionHe: "עורכי הנסיעות שלנו בוחנים ובוחרים אישית את המלונות הטובים ביותר, מנכסי יוקרה אייקוניים ועד פנינים בוטיק נסתרות.",
    },
    featuredGuides: [
      { title: "Best Luxury Hotels 2026", titleHe: "מלונות היוקרה הטובים ל-2026", description: "Our definitive guide to the world's most exceptional stays", descriptionHe: "המדריך המקיף שלנו למלונות היוקרתיים ביותר", href: "/guides/best-luxury-hotels-2026", image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&h=400&fit=crop" },
      { title: "Beach Resort Guide", titleHe: "מדריך אתרי נופש חוף", description: "Sun, sand, and five-star service", descriptionHe: "שמש, חול ושירות חמישה כוכבים", href: "/guides/beach-resorts", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=400&fit=crop" },
      { title: "Boutique Hotels Worth Booking", titleHe: "מלונות בוטיק ששווה להזמין", description: "Unique properties with character", descriptionHe: "נכסים ייחודיים עם אופי", href: "/guides/boutique-hotels", image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&h=400&fit=crop" },
    ],
  },
  attractions: {
    title: "Attractions & Experiences",
    titleHe: "אטרקציות וחוויות",
    subtitle: "Unforgettable experiences that define each destination",
    subtitleHe: "חוויות בלתי נשכחות שמגדירות כל יעד",
    heroImage: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&h=1080&fit=crop",
    icon: Compass,
    destinations: [
      { name: "Dubai", nameHe: "דובאי", slug: "dubai", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop", count: 312, featured: true },
      { name: "Paris", nameHe: "פריז", slug: "paris", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop", count: 287 },
      { name: "Rome", nameHe: "רומא", slug: "rome", image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop", count: 256 },
      { name: "Barcelona", nameHe: "ברצלונה", slug: "barcelona", image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&h=600&fit=crop", count: 198 },
      { name: "Singapore", nameHe: "סינגפור", slug: "singapore", image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&h=600&fit=crop", count: 176 },
      { name: "Sydney", nameHe: "סידני", slug: "sydney", image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop", count: 145 },
    ],
    editorialContent: {
      heading: "Beyond the Tourist Trail",
      headingHe: "מעבר לשביל התיירים",
      description: "We go deeper than typical travel guides. Our on-the-ground experts uncover authentic experiences, from world-famous landmarks to local secrets only insiders know.",
      descriptionHe: "אנחנו הולכים עמוק יותר ממדריכי נסיעות טיפוסיים. המומחים שלנו בשטח חושפים חוויות אותנטיות, מציוני דרך מפורסמים ועד סודות מקומיים.",
    },
    featuredGuides: [
      { title: "Must-See Landmarks 2026", titleHe: "ציוני דרך חובה ל-2026", description: "The world's most iconic sites", descriptionHe: "האתרים האיקוניים ביותר בעולם", href: "/guides/must-see-landmarks", image: "https://images.unsplash.com/photo-1549144511-f099e773c147?w=600&h=400&fit=crop" },
      { title: "Hidden Gems Guide", titleHe: "מדריך אבני חן נסתרות", description: "Off-the-beaten-path discoveries", descriptionHe: "תגליות מחוץ לדרך המוכה", href: "/guides/hidden-gems", image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&h=400&fit=crop" },
      { title: "Family Attractions", titleHe: "אטרקציות למשפחות", description: "Kid-friendly adventures worldwide", descriptionHe: "הרפתקאות ידידותיות לילדים", href: "/guides/family-attractions", image: "https://images.unsplash.com/photo-1472746729193-36ad213ac4a5?w=600&h=400&fit=crop" },
    ],
  },
  dining: {
    title: "Restaurants & Dining",
    titleHe: "מסעדות ואוכל",
    subtitle: "Culinary journeys from Michelin stars to street food treasures",
    subtitleHe: "מסעות קולינריים מכוכבי מישלן ועד אוצרות אוכל רחוב",
    heroImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&h=1080&fit=crop",
    icon: TrendingUp,
    destinations: [
      { name: "Dubai", nameHe: "דובאי", slug: "dubai", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop", count: 456, featured: true },
      { name: "Tokyo", nameHe: "טוקיו", slug: "tokyo", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop", count: 523 },
      { name: "Paris", nameHe: "פריז", slug: "paris", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop", count: 398 },
      { name: "Bangkok", nameHe: "בנגקוק", slug: "bangkok", image: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&h=600&fit=crop", count: 345 },
      { name: "Rome", nameHe: "רומא", slug: "rome", image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop", count: 289 },
      { name: "New York", nameHe: "ניו יורק", slug: "new-york", image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop", count: 412 },
    ],
    editorialContent: {
      heading: "Taste the World",
      headingHe: "טעמו את העולם",
      description: "From award-winning fine dining to beloved local eateries, our food experts curate the best culinary experiences. Every restaurant is personally vetted for quality, authenticity, and memorable flavors.",
      descriptionHe: "מאוכל גורמה עטור פרסים ועד מסעדות מקומיות אהובות, מומחי האוכל שלנו אוצרים את החוויות הקולינריות הטובות ביותר.",
    },
    featuredGuides: [
      { title: "Michelin Guide 2026", titleHe: "מדריך מישלן 2026", description: "Starred restaurants worldwide", descriptionHe: "מסעדות עטורות כוכבים ברחבי העולם", href: "/guides/michelin-restaurants", image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=600&h=400&fit=crop" },
      { title: "Street Food Adventures", titleHe: "הרפתקאות אוכל רחוב", description: "Authentic local flavors", descriptionHe: "טעמים מקומיים אותנטיים", href: "/guides/street-food", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop" },
      { title: "Rooftop Dining", titleHe: "אוכל על הגג", description: "Views as stunning as the food", descriptionHe: "נופים מרהיבים כמו האוכל", href: "/guides/rooftop-restaurants", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop" },
    ],
  },
  "things-to-do": {
    title: "Things to Do",
    titleHe: "דברים לעשות",
    subtitle: "Activities, tours, and adventures for every type of traveler",
    subtitleHe: "פעילויות, סיורים והרפתקאות לכל סוג של מטייל",
    heroImage: "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=1920&h=1080&fit=crop",
    icon: Users,
    destinations: [
      { name: "Dubai", nameHe: "דובאי", slug: "dubai", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop", count: 287, featured: true },
      { name: "Bali", nameHe: "באלי", slug: "bali", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&h=600&fit=crop", count: 234 },
      { name: "Tokyo", nameHe: "טוקיו", slug: "tokyo", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop", count: 312 },
      { name: "Iceland", nameHe: "איסלנד", slug: "iceland", image: "https://images.unsplash.com/photo-1520769669658-f07657f5a307?w=800&h=600&fit=crop", count: 145 },
      { name: "Costa Rica", nameHe: "קוסטה ריקה", slug: "costa-rica", image: "https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=800&h=600&fit=crop", count: 178 },
      { name: "Morocco", nameHe: "מרוקו", slug: "morocco", image: "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&h=600&fit=crop", count: 156 },
    ],
    editorialContent: {
      heading: "Adventures Await",
      headingHe: "הרפתקאות מחכות",
      description: "Whether you seek adrenaline-pumping activities or peaceful cultural experiences, we connect you with the best tours and adventures. Trusted operators, verified reviews, and insider tips included.",
      descriptionHe: "בין אם אתם מחפשים פעילויות מרגשות או חוויות תרבותיות שלוות, אנחנו מחברים אתכם עם הסיורים וההרפתקאות הטובים ביותר.",
    },
    featuredGuides: [
      { title: "Adventure Sports Guide", titleHe: "מדריך ספורט אתגרי", description: "Thrilling experiences worldwide", descriptionHe: "חוויות מרגשות ברחבי העולם", href: "/guides/adventure-sports", image: "https://images.unsplash.com/photo-1533130061792-64b345e4a833?w=600&h=400&fit=crop" },
      { title: "Cultural Experiences", titleHe: "חוויות תרבותיות", description: "Immersive local traditions", descriptionHe: "מסורות מקומיות סוחפות", href: "/guides/cultural-experiences", image: "https://images.unsplash.com/photo-1528164344705-47542687000d?w=600&h=400&fit=crop" },
      { title: "Day Trips & Tours", titleHe: "טיולי יום וסיורים", description: "Best guided experiences", descriptionHe: "חוויות מודרכות מובילות", href: "/guides/day-trips", image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=400&fit=crop" },
    ],
  },
  guides: {
    title: "Travel Guides",
    titleHe: "מדריכי טיולים",
    subtitle: "In-depth destination knowledge from expert travel editors",
    subtitleHe: "ידע מעמיק על יעדים מעורכי נסיעות מומחים",
    heroImage: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&h=1080&fit=crop",
    icon: BookOpen,
    destinations: [
      { name: "Dubai", nameHe: "דובאי", slug: "dubai", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop", count: 45, featured: true },
      { name: "Japan", nameHe: "יפן", slug: "japan", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=600&fit=crop", count: 38 },
      { name: "Italy", nameHe: "איטליה", slug: "italy", image: "https://images.unsplash.com/photo-1515859005217-8a1f08870f59?w=800&h=600&fit=crop", count: 42 },
      { name: "Thailand", nameHe: "תאילנד", slug: "thailand", image: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&h=600&fit=crop", count: 35 },
      { name: "Greece", nameHe: "יוון", slug: "greece", image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&h=600&fit=crop", count: 28 },
      { name: "Australia", nameHe: "אוסטרליה", slug: "australia", image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop", count: 32 },
    ],
    editorialContent: {
      heading: "Knowledge You Can Trust",
      headingHe: "ידע שאפשר לסמוך עליו",
      description: "Our comprehensive travel guides combine local expertise with rigorous research. Each guide is written by seasoned travelers and reviewed by destination specialists to ensure accuracy and depth.",
      descriptionHe: "מדריכי הנסיעות המקיפים שלנו משלבים מומחיות מקומית עם מחקר יסודי. כל מדריך נכתב על ידי מטיילים מנוסים ונבדק על ידי מומחי יעד.",
    },
    featuredGuides: [
      { title: "First-Timer Guides", titleHe: "מדריכים למבקרים ראשונים", description: "Everything you need to know", descriptionHe: "כל מה שצריך לדעת", href: "/guides/first-time-visitor", image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&h=400&fit=crop" },
      { title: "Budget Travel Tips", titleHe: "טיפים לטיול בתקציב", description: "Travel smart, save more", descriptionHe: "טיילו חכם, חסכו יותר", href: "/guides/budget-travel", image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop" },
      { title: "Luxury Escapes", titleHe: "בריחות יוקרה", description: "Premium travel experiences", descriptionHe: "חוויות נסיעה פרימיום", href: "/guides/luxury-travel", image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=400&fit=crop" },
    ],
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

interface GlobalCategoryTemplateProps {
  categoryType: GlobalCategoryType;
  children?: ReactNode;
  seoConfig?: {
    title: string;
    description: string;
  };
}

export default function GlobalCategoryTemplate({
  categoryType,
  children,
  seoConfig,
}: GlobalCategoryTemplateProps) {
  const { isRTL } = useLocale();
  const config = categoryConfigs[categoryType];

  useDocumentMeta({
    title: seoConfig?.title || config.title,
    description: seoConfig?.description || config.subtitle,
  });

  const title = isRTL ? config.titleHe : config.title;
  const subtitle = isRTL ? config.subtitleHe : config.subtitle;
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <PublicHero
        title={title}
        subtitle={subtitle}
        backgroundImage={config.heroImage}
        breadcrumbs={[
          { label: "Home", labelHe: "בית", href: "/" },
          { label: config.title, labelHe: config.titleHe },
        ]}
      />

      {/* Destinations Grid Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="space-y-12"
          >
            {/* Section Header */}
            <motion.div variants={fadeInUp} className="text-center max-w-3xl mx-auto">
              <Badge variant="secondary" className="mb-4">
                <Globe className="w-3 h-3 mr-1" />
                {isRTL ? "יעדים" : "Destinations"}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" style={{ fontFamily: "Chillax, sans-serif" }}>
                {isRTL ? `גלו ${config.titleHe}` : `Explore ${config.title}`}
              </h2>
              <p className="text-lg text-muted-foreground">
                {isRTL 
                  ? "בחרו יעד כדי לצפות באוסף מומחה שלנו"
                  : "Select a destination to browse our expert-curated collection"
                }
              </p>
            </motion.div>

            {/* Destination Cards Grid */}
            <motion.div 
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {config.destinations.map((destination, index) => (
                <motion.div key={destination.slug} variants={fadeInUp}>
                  <Link href={`/destinations/${destination.slug}/${categoryType === "things-to-do" ? "things-to-do" : categoryType}`}>
                    <Card 
                      className={cn(
                        "group overflow-hidden cursor-pointer transition-all duration-300",
                        "hover:shadow-xl hover:-translate-y-1",
                        destination.featured && "ring-2 ring-primary/20"
                      )}
                      data-testid={`card-destination-${destination.slug}`}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img
                          src={destination.image}
                          alt={isRTL ? destination.nameHe : destination.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        
                        {/* Featured Badge */}
                        {destination.featured && (
                          <Badge 
                            className="absolute top-4 right-4 bg-gradient-to-r from-[#6443F4] to-[#6443F4] text-white border-0"
                          >
                            {isRTL ? "מומלץ" : "Featured"}
                          </Badge>
                        )}

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "Chillax, sans-serif" }}>
                                {isRTL ? destination.nameHe : destination.name}
                              </h3>
                              <p className="text-white/80 text-sm">
                                {destination.count} {isRTL 
                                  ? (categoryType === "guides" ? "מדריכים" : "פריטים")
                                  : (categoryType === "guides" ? "guides" : "listings")
                                }
                              </p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 group-hover:bg-white/30 transition-colors">
                              <ArrowRight className={cn("w-5 h-5 text-white", isRTL && "rotate-180")} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Editorial Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid lg:grid-cols-2 gap-12 items-center"
          >
            {/* Text Content */}
            <motion.div variants={fadeInUp} className={cn("space-y-6", isRTL && "lg:order-2")}>
              <Badge variant="outline">
                <Icon className="w-3 h-3 mr-1" />
                {isRTL ? "הגישה שלנו" : "Our Approach"}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground" style={{ fontFamily: "Chillax, sans-serif" }}>
                {isRTL ? config.editorialContent.headingHe : config.editorialContent.heading}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {isRTL ? config.editorialContent.descriptionHe : config.editorialContent.description}
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Button 
                  className="rounded-xl px-8 bg-[#6443F4] hover:bg-[#5339D9] text-white"
                  data-testid="button-explore-all"
                >
                  {isRTL ? "גלו את כל היעדים" : "Explore All Destinations"}
                  <ArrowRight className={cn("w-4 h-4 ml-2", isRTL && "rotate-180 mr-2 ml-0")} />
                </Button>
              </div>
            </motion.div>

            {/* Stats/Trust Indicators */}
            <motion.div variants={fadeInUp} className={cn(isRTL && "lg:order-1")}>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2" style={{ fontFamily: "Chillax, sans-serif" }}>50+</div>
                  <div className="text-sm text-muted-foreground">{isRTL ? "יעדים" : "Destinations"}</div>
                </Card>
                <Card className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2" style={{ fontFamily: "Chillax, sans-serif" }}>10K+</div>
                  <div className="text-sm text-muted-foreground">{isRTL ? "רשומות" : "Listings"}</div>
                </Card>
                <Card className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2" style={{ fontFamily: "Chillax, sans-serif" }}>500+</div>
                  <div className="text-sm text-muted-foreground">{isRTL ? "מדריכים" : "Guides"}</div>
                </Card>
                <Card className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2" style={{ fontFamily: "Chillax, sans-serif" }}>24/7</div>
                  <div className="text-sm text-muted-foreground">{isRTL ? "עדכונים" : "Updates"}</div>
                </Card>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Featured Guides Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="space-y-12"
          >
            {/* Section Header */}
            <motion.div variants={fadeInUp} className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <Badge variant="secondary" className="mb-3">
                  <BookOpen className="w-3 h-3 mr-1" />
                  {isRTL ? "מהעורכים" : "From the Editors"}
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground" style={{ fontFamily: "Chillax, sans-serif" }}>
                  {isRTL ? "מדריכים מומלצים" : "Featured Guides"}
                </h2>
              </div>
              <Button variant="outline" className="rounded-full gap-2" data-testid="button-view-all-guides">
                {isRTL ? "צפו בכל המדריכים" : "View All Guides"}
                <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
              </Button>
            </motion.div>

            {/* Guides Grid */}
            <motion.div 
              variants={staggerContainer}
              className="grid md:grid-cols-3 gap-6"
            >
              {config.featuredGuides.map((guide, index) => (
                <motion.div key={index} variants={fadeInUp}>
                  <Link href={guide.href}>
                    <Card 
                      className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300"
                      data-testid={`card-guide-${index}`}
                    >
                      <div className="relative aspect-video overflow-hidden">
                        <img
                          src={guide.image}
                          alt={isRTL ? guide.titleHe : guide.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                          {isRTL ? guide.titleHe : guide.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? guide.descriptionHe : guide.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Custom Children Content */}
      {children}

      <PublicFooter />
    </div>
  );
}

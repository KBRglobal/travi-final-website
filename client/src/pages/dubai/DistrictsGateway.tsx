import { useState, useMemo } from "react";
import { Link } from "wouter";
import { MapPin, Search, Building2, Palmtree, Briefcase, Home, ArrowRight, Filter, Users, Map, TrendingUp, LayoutGrid } from "lucide-react";
import { DubaiPageLayout } from "./layouts/DubaiPageLayout";
import { DubaiHero, DubaiKeyStats, DubaiFAQ, DubaiCTA } from "./components";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DistrictCard {
  name: string;
  slug: string;
  description: string;
  category: "luxury" | "affordable" | "business" | "residential";
  badges: string[];
  image?: string;
}

const districts: DistrictCard[] = [
  {
    name: "Downtown Dubai",
    slug: "downtown",
    description: "Home to Burj Khalifa, Dubai Mall, and spectacular fountain shows",
    category: "luxury",
    badges: ["Burj Khalifa", "Dubai Mall"],
    image: "/destinations-hero/dubai/dubai/dubai-hero-burj-khalifa-palms-sunset.webp"
  },
  {
    name: "Dubai Marina",
    slug: "marina",
    description: "World's largest man-made marina with 200+ towers and waterfront dining",
    category: "luxury",
    badges: ["Waterfront", "Nightlife"],
    image: "/destinations-hero/dubai/dubai/dubai-hero-marina-abra-boat-night.webp"
  },
  {
    name: "JBR",
    slug: "jbr",
    description: "Vibrant beachfront community with The Walk promenade and Ain Dubai views",
    category: "residential",
    badges: ["Beachfront", "The Walk"],
    image: "/destinations-hero/dubai/dubai/dubai-hero-atlantis-palm-jumeirah-beach.webp"
  },
  {
    name: "Palm Jumeirah",
    slug: "palm-jumeirah",
    description: "The world's largest artificial island with ultra-luxury properties",
    category: "luxury",
    badges: ["Atlantis", "Ultra-Luxury"],
    image: "/destinations-hero/dubai/dubai/dubai-hero-atlantis-palm-jumeirah-beach.webp"
  },
  {
    name: "Jumeirah",
    slug: "jumeirah",
    description: "Prestigious beachside neighborhood with Burj Al Arab and luxury villas",
    category: "luxury",
    badges: ["Burj Al Arab", "Villas"],
    image: "/destinations-hero/dubai/dubai/dubai-hero-burj-al-arab-skyline-night.webp"
  },
  {
    name: "Business Bay",
    slug: "business-bay",
    description: "Dubai's CBD with Dubai Canal views and excellent investment potential",
    category: "business",
    badges: ["Dubai Canal", "High ROI"],
    image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp"
  },
  {
    name: "Old Dubai",
    slug: "old-dubai",
    description: "Historic Deira and Bur Dubai with Gold Souk and traditional souks",
    category: "affordable",
    badges: ["Gold Souk", "Heritage"],
    image: "/images/categories/dubai/dubai-old-town-wind-towers-colorful-traditional-architecture.webp"
  },
  {
    name: "Dubai Creek Harbour",
    slug: "creek-harbour",
    description: "Visionary waterfront destination home to the future tallest structure",
    category: "residential",
    badges: ["Creek Tower", "Emaar"],
    image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp"
  },
  {
    name: "Dubai South",
    slug: "dubai-south",
    description: "City within a city near Al Maktoum Airport and Expo City",
    category: "affordable",
    badges: ["Expo City", "Airport"],
    image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp"
  },
  {
    name: "Al Barsha",
    slug: "al-barsha",
    description: "Well-established community centered around Mall of the Emirates",
    category: "residential",
    badges: ["Mall of Emirates", "Ski Dubai"],
    image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp"
  },
  {
    name: "DIFC",
    slug: "difc",
    description: "Middle East's leading financial hub with fine dining and art galleries",
    category: "business",
    badges: ["Financial Hub", "Fine Dining"],
    image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp"
  },
  {
    name: "Dubai Hills Estate",
    slug: "hills-estate",
    description: "Premium green community with championship golf and family amenities",
    category: "residential",
    badges: ["Golf Course", "Emaar"],
    image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp"
  },
  {
    name: "JVC",
    slug: "jvc",
    description: "Top choice for affordable family living with highest rental yields",
    category: "affordable",
    badges: ["High ROI", "Family"],
    image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp"
  },
  {
    name: "Bluewaters Island",
    slug: "bluewaters",
    description: "Boutique island destination featuring Ain Dubai and Caesars Palace",
    category: "luxury",
    badges: ["Ain Dubai", "Island"],
    image: "/destinations-hero/dubai/dubai/dubai-hero-dubai-frame-skyline-aerial.webp"
  },
  {
    name: "International City",
    slug: "international-city",
    description: "Dubai's most affordable community with themed architecture",
    category: "affordable",
    badges: ["Budget-Friendly", "Dragon Mart"],
    image: "/images/categories/dubai/dubai-palm-jumeirah-marina-skyline-sunset-modern-architecture.webp"
  },
  {
    name: "Al Karama",
    slug: "al-karama",
    description: "Vibrant multicultural neighborhood with affordable shopping",
    category: "affordable",
    badges: ["Shopping", "Metro Access"],
    image: "/images/categories/dubai/dubai-old-town-wind-towers-colorful-traditional-architecture.webp"
  }
];

const categoryInfo = {
  luxury: { label: "Luxury", icon: Palmtree, color: "bg-amber-500/10 text-amber-600" },
  affordable: { label: "Affordable", icon: Home, color: "bg-green-500/10 text-green-600" },
  business: { label: "Business", icon: Briefcase, color: "bg-blue-500/10 text-blue-600" },
  residential: { label: "Residential", icon: Building2, color: "bg-purple-500/10 text-purple-600" }
};

export default function DistrictsGateway() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredDistricts = useMemo(() => {
    return districts.filter(district => {
      const matchesSearch = searchQuery === "" || 
        district.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        district.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        district.badges.some(b => b.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = !selectedCategory || district.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const groupedDistricts = useMemo(() => {
    const groups: Record<string, DistrictCard[]> = {
      luxury: [],
      business: [],
      residential: [],
      affordable: []
    };
    filteredDistricts.forEach(d => groups[d.category].push(d));
    return groups;
  }, [filteredDistricts]);

  const heroSection = (
    <DubaiHero
      title="Explore Dubai Districts"
      subtitle="Your comprehensive guide to every neighborhood in Dubai - from iconic waterfront communities to hidden cultural gems"
      backgroundImage="/destinations-hero/dubai/dubai/dubai-hero-dubai-frame-skyline-aerial.webp"
      badges={[
        { text: "16 Districts", variant: "default" },
        { text: "Investment Hotspots", variant: "secondary" },
        { text: "Local Insights", variant: "outline" }
      ]}
    />
  );

  return (
    <DubaiPageLayout
      title="Dubai Districts Guide 2026 - Explore All Dubai Neighborhoods"
      description="Complete guide to Dubai districts and neighborhoods. From Downtown Dubai to Palm Jumeirah, discover the best areas to stay, invest, and explore in Dubai."
      canonicalPath="/destinations/dubai/districts"
      keywords={["dubai districts", "dubai neighborhoods", "dubai areas", "where to stay dubai"]}
      heroSection={heroSection}
      showBreadcrumbs={false}
    >
      <DubaiKeyStats
        title="Dubai at a Glance"
        stats={[
          { value: "16+", label: "Major Districts", subtext: "Unique communities", icon: LayoutGrid },
          { value: "3.5M", label: "Population", subtext: "Growing annually", icon: Users },
          { value: "4,114", label: "sq km", subtext: "Total area", icon: Map },
          { value: "8%", label: "Avg Yield", subtext: "Rental returns", icon: TrendingUp }
        ]}
        columns={4}
      />

      <section className="py-12" data-testid="districts-explorer">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search districts by name, feature, or attraction..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-district-search"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              data-testid="button-filter-all"
            >
              <Filter className="w-4 h-4 mr-1" />
              All
            </Button>
            {Object.entries(categoryInfo).map(([key, { label, icon: Icon }]) => (
              <Button
                key={key}
                variant={selectedCategory === key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                data-testid={`button-filter-${key}`}
              >
                <Icon className="w-4 h-4 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {Object.entries(groupedDistricts).map(([category, categoryDistricts]) => {
          if (categoryDistricts.length === 0) return null;
          const { label, icon: Icon, color } = categoryInfo[category as keyof typeof categoryInfo];
          
          return (
            <div key={category} className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-lg ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold">{label} Districts</h2>
                <Badge variant="secondary">{categoryDistricts.length}</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoryDistricts.map((district) => (
                  <Link key={district.slug} href={`/destinations/dubai/districts/${district.slug}`}>
                    <Card className="hover-elevate cursor-pointer h-full overflow-hidden group" data-testid={`card-district-${district.slug}`}>
                      {district.image && (
                        <div className="h-32 overflow-hidden">
                          <img 
                            src={district.image} 
                            alt={district.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary shrink-0" />
                            <h3 className="font-semibold">{district.name}</h3>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {district.description}
                        </p>
                        <div className="flex gap-1 flex-wrap">
                          {district.badges.slice(0, 2).map((badge, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {badge}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {filteredDistricts.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No districts found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}
      </section>

      <DubaiFAQ
        title="Dubai Districts FAQ"
        faqs={[
          {
            question: "Which Dubai district is best for tourists?",
            answer: "Downtown Dubai is ideal for first-time visitors, offering proximity to major attractions like Burj Khalifa and Dubai Mall. Dubai Marina and JBR are great for beach lovers, while Old Dubai offers authentic cultural experiences."
          },
          {
            question: "Which Dubai district has the highest rental yields?",
            answer: "JVC (Jumeirah Village Circle) consistently offers the highest rental yields at 8-10%, followed by Business Bay at 8-8.5% and International City at 7-9%. These areas offer affordable entry points with strong rental demand."
          },
          {
            question: "Which Dubai district is best for families?",
            answer: "Dubai Hills Estate is excellent for families with its green spaces, golf course, and schools. Al Barsha offers good value with Mall of Emirates access, while Jumeirah provides beachside villa living with established communities."
          },
          {
            question: "Which Dubai district is most affordable?",
            answer: "International City offers the cheapest rents in Dubai, with studios from AED 18,000/year. Al Karama, Dubai South, and JVC also offer affordable options with better connectivity and amenities."
          }
        ]}
      />

      <DubaiCTA
        title="Find Your Perfect Dubai District"
        description="Get personalized recommendations based on your lifestyle, budget, and investment goals."
        primaryAction={{ label: "Explore Properties", href: "/destinations/dubai/off-plan" }}
        secondaryAction={{ label: "Investment Guide", href: "/destinations/dubai/off-plan/investment-guide" }}
      />
    </DubaiPageLayout>
  );
}

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useGeographicContext } from "@/contexts/geographic-context";
import { CategoryHeroSection } from "@/components/public/sections/category-hero-section";
import { FeaturedSection } from "@/components/public/sections/featured-section";
import { PopularNowSection } from "@/components/public/sections/popular-now-section";
import { ByAreaSection } from "@/components/public/sections/by-area-section";
import { RecentlyAddedSection } from "@/components/public/sections/recently-added-section";
import { CategoryFilterSidebar } from "@/components/public/sections/category-filter-sidebar";
import { BentoResultsGrid } from "@/components/public/sections/bento-results-grid";
import SubtleSkyBackground from "@/components/ui/subtle-sky-background";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { Button } from "@/components/ui/button";

const MOCK_HERO_IMAGE = "/destinations-hero/dubai/dubai/dubai-hero-burj-khalifa-palms-sunset.webp";

const MOCK_FEATURED = [
  {
    id: "featured-1",
    title: "Burj Khalifa At The Top Experience",
    subtitle: "Experience the world's tallest building with panoramic views of the city, desert, and ocean.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-dubai-frame-skyline-aerial.webp",
    href: "/attractions/burj-khalifa",
    rating: 4.9,
    badge: "Editor's Pick",
    location: "Downtown Dubai",
  },
  {
    id: "featured-2",
    title: "Dubai Frame: Gateway Between Two Worlds",
    subtitle: "Walk through history as you traverse from old Dubai to the modern metropolis.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-marina-abra-boat-night.webp",
    href: "/attractions/dubai-frame",
    rating: 4.7,
    badge: "Must Visit",
    location: "Zabeel Park",
  },
];

const MOCK_POPULAR = [
  {
    id: "popular-1",
    title: "Desert Safari Adventure",
    subtitle: "Thrilling dune bashing, camel rides, and traditional Bedouin dinner under the stars.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-habibi-welcome-desert-safari.webp",
    href: "/attractions/desert-safari",
    rating: 4.8,
    category: "Adventure",
    timeAgo: "2h ago",
  },
  {
    id: "popular-2",
    title: "Palm Jumeirah Atlantis",
    subtitle: "Iconic hotel with world-class aquarium and waterpark experiences.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-atlantis-palm-jumeirah-beach.webp",
    href: "/attractions/atlantis",
    rating: 4.6,
    category: "Landmark",
    timeAgo: "5h ago",
  },
  {
    id: "popular-3",
    title: "Dubai Marina Yacht Tour",
    subtitle: "Cruise through the stunning waterways of Dubai Marina at sunset.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-marina-abra-boat-night.webp",
    href: "/attractions/marina-yacht",
    rating: 4.5,
    category: "Water",
    timeAgo: "1d ago",
  },
  {
    id: "popular-4",
    title: "Old Dubai Heritage Walk",
    subtitle: "Discover the authentic soul of Dubai in Al Fahidi Historical District.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-burj-al-arab-skyline-night.webp",
    href: "/attractions/heritage-walk",
    rating: 4.4,
    category: "Culture",
    timeAgo: "2d ago",
  },
];

const MOCK_AREAS = [
  {
    id: "area-1",
    name: "Downtown Dubai",
    slug: "downtown",
    itemCount: 24,
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-burj-khalifa-palms-sunset.webp",
    href: "/areas/downtown",
  },
  {
    id: "area-2",
    name: "Dubai Marina",
    slug: "marina",
    itemCount: 18,
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-marina-abra-boat-night.webp",
    href: "/areas/marina",
  },
  {
    id: "area-3",
    name: "Palm Jumeirah",
    slug: "palm",
    itemCount: 12,
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-atlantis-palm-jumeirah-beach.webp",
    href: "/areas/palm",
  },
  {
    id: "area-4",
    name: "Old Dubai",
    slug: "old-dubai",
    itemCount: 15,
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-burj-al-arab-skyline-night.webp",
    href: "/areas/old-dubai",
  },
  {
    id: "area-5",
    name: "JBR Beach",
    slug: "jbr",
    itemCount: 9,
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-dubai-frame-skyline-aerial.webp",
    href: "/areas/jbr",
  },
];

const MOCK_RECENT = [
  {
    id: "recent-1",
    title: "Museum of the Future",
    subtitle: "An architectural marvel showcasing innovations that will shape tomorrow.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-dubai-frame-skyline-aerial.webp",
    href: "/attractions/museum-of-future",
    addedDate: "Added today",
    category: "Museum",
    rating: 4.9,
  },
  {
    id: "recent-2",
    title: "Ain Dubai",
    subtitle: "The world's largest observation wheel with breathtaking city views.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-marina-abra-boat-night.webp",
    href: "/attractions/ain-dubai",
    addedDate: "Added yesterday",
    category: "Landmark",
    rating: 4.7,
  },
  {
    id: "recent-3",
    title: "Global Village",
    subtitle: "Cultural extravaganza featuring pavilions from around the world.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-habibi-welcome-desert-safari.webp",
    href: "/attractions/global-village",
    addedDate: "2 days ago",
    category: "Entertainment",
    rating: 4.5,
  },
  {
    id: "recent-4",
    title: "Dubai Miracle Garden",
    subtitle: "The world's largest natural flower garden with stunning displays.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-atlantis-palm-jumeirah-beach.webp",
    href: "/attractions/miracle-garden",
    addedDate: "3 days ago",
    category: "Nature",
    rating: 4.6,
  },
];

const MOCK_GRID_ITEMS = [
  {
    id: "grid-1",
    title: "Burj Khalifa Observation Deck",
    subtitle: "See Dubai from 555 meters high at the world's tallest building.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-burj-khalifa-palms-sunset.webp",
    href: "/attractions/burj-khalifa",
    rating: 4.9,
    category: "Landmark",
    location: "Downtown Dubai",
    type: "attraction" as const,
  },
  {
    id: "grid-2",
    title: "Dubai Aquarium & Underwater Zoo",
    subtitle: "Home to the largest acrylic panel in the world and thousands of aquatic animals.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-marina-abra-boat-night.webp",
    href: "/attractions/dubai-aquarium",
    rating: 4.7,
    category: "Attraction",
    location: "Dubai Mall",
    type: "attraction" as const,
  },
  {
    id: "grid-3",
    title: "Palm Jumeirah Monorail",
    subtitle: "Scenic ride across the iconic Palm with stunning Arabian Gulf views.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-atlantis-palm-jumeirah-beach.webp",
    href: "/attractions/palm-monorail",
    rating: 4.3,
    category: "Transport",
    location: "Palm Jumeirah",
    type: "attraction" as const,
  },
  {
    id: "grid-4",
    title: "Dubai Gold Souk",
    subtitle: "Traditional market with dazzling displays of gold jewelry and precious gems.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-burj-al-arab-skyline-night.webp",
    href: "/attractions/gold-souk",
    rating: 4.4,
    category: "Shopping",
    location: "Deira",
    type: "attraction" as const,
  },
  {
    id: "grid-5",
    title: "Ski Dubai",
    subtitle: "Indoor ski resort with real snow, penguins, and thrilling slopes.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-dubai-frame-skyline-aerial.webp",
    href: "/attractions/ski-dubai",
    rating: 4.6,
    category: "Entertainment",
    location: "Mall of the Emirates",
    badge: "Family Fun",
    type: "attraction" as const,
  },
  {
    id: "grid-6",
    title: "La Mer Beachfront",
    subtitle: "Trendy beach destination with restaurants, boutiques, and water sports.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-habibi-welcome-desert-safari.webp",
    href: "/attractions/la-mer",
    rating: 4.5,
    category: "Beach",
    location: "Jumeirah",
    type: "attraction" as const,
  },
  {
    id: "grid-7",
    title: "Dubai Opera",
    subtitle: "World-class performing arts venue shaped like a traditional dhow.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-burj-khalifa-palms-sunset.webp",
    href: "/attractions/dubai-opera",
    rating: 4.8,
    category: "Culture",
    location: "Downtown Dubai",
    type: "attraction" as const,
  },
  {
    id: "grid-8",
    title: "Jumeirah Beach Hotel",
    subtitle: "Iconic wave-shaped hotel with private beach and stunning Burj Al Arab views.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-marina-abra-boat-night.webp",
    href: "/hotels/jumeirah-beach",
    rating: 4.7,
    category: "Hotel",
    location: "Jumeirah",
    type: "hotel" as const,
  },
  {
    id: "grid-9",
    title: "IMG Worlds of Adventure",
    subtitle: "Largest indoor theme park featuring Marvel and Cartoon Network zones.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-atlantis-palm-jumeirah-beach.webp",
    href: "/attractions/img-worlds",
    rating: 4.4,
    category: "Theme Park",
    location: "Dubai Land",
    type: "attraction" as const,
  },
  {
    id: "grid-10",
    title: "Pierchic Restaurant",
    subtitle: "Romantic seafood dining on a pier with panoramic ocean views.",
    imageUrl: "/destinations-hero/dubai/dubai/dubai-hero-burj-al-arab-skyline-night.webp",
    href: "/restaurants/pierchic",
    rating: 4.8,
    category: "Fine Dining",
    location: "Al Qasr",
    badge: "Romantic",
    type: "restaurant" as const,
  },
];

const FILTER_AREAS = {
  id: "areas",
  label: "Areas",
  options: [
    { id: "downtown", label: "Downtown Dubai", count: 24 },
    { id: "marina", label: "Dubai Marina", count: 18 },
    { id: "palm", label: "Palm Jumeirah", count: 12 },
    { id: "old-dubai", label: "Old Dubai", count: 15 },
    { id: "jbr", label: "JBR Beach", count: 9 },
    { id: "deira", label: "Deira", count: 11 },
    { id: "business-bay", label: "Business Bay", count: 8 },
  ],
};

const FILTER_TYPES = {
  id: "types",
  label: "Type",
  options: [
    { id: "attraction", label: "Attractions", count: 42 },
    { id: "restaurant", label: "Restaurants", count: 28 },
    { id: "hotel", label: "Hotels", count: 15 },
    { id: "shopping", label: "Shopping", count: 12 },
    { id: "entertainment", label: "Entertainment", count: 8 },
  ],
};

const SORT_OPTIONS = [
  { id: "recommended", label: "Recommended" },
  { id: "popular", label: "Most Popular" },
  { id: "rating", label: "Highest Rated" },
  { id: "newest", label: "Newest First" },
  { id: "az", label: "A to Z" },
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function CategoryListingPage() {
  const { context } = useGeographicContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
    areas: [],
    types: [],
  });
  const [selectedSort, setSelectedSort] = useState("recommended");
  const [displayCount, setDisplayCount] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);

  const categoryName = "Attractions";
  const categoryDescription = "Discover the most iconic landmarks, hidden gems, and unforgettable experiences that make Dubai a world-class destination.";
  const categorySlug = "attractions";

  const handleFilterChange = (groupId: string, optionId: string, checked: boolean) => {
    setSelectedFilters((prev) => {
      const currentFilters = prev[groupId] || [];
      if (checked) {
        return { ...prev, [groupId]: [...currentFilters, optionId] };
      }
      return { ...prev, [groupId]: currentFilters.filter((id) => id !== optionId) };
    });
  };

  const handleClearFilters = () => {
    setSelectedFilters({ areas: [], types: [] });
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setDisplayCount((prev) => prev + 10);
    setLoadingMore(false);
  };

  const filteredItems = useMemo(() => {
    let items = [...MOCK_GRID_ITEMS];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.subtitle.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query)
      );
    }

    if (selectedFilters.types.length > 0) {
      items = items.filter((item) => selectedFilters.types.includes(item.type));
    }

    if (selectedFilters.areas.length > 0) {
      items = items.filter((item) =>
        selectedFilters.areas.some((area) =>
          item.location?.toLowerCase().includes(area.replace("-", " "))
        )
      );
    }

    switch (selectedSort) {
      case "rating":
        items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "az":
        items.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }

    return items;
  }, [searchQuery, selectedFilters, selectedSort]);

  const displayedItems = filteredItems.slice(0, displayCount);
  const hasMore = displayCount < filteredItems.length;

  return (
    <div data-testid="page-category-listing" className="min-h-screen bg-white dark:bg-slate-950">
      <SubtleSkyBackground />
      <PublicNav variant="transparent" />

      <motion.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        <CategoryHeroSection
          categoryName={categoryName}
          categoryDescription={categoryDescription}
          itemCount={filteredItems.length}
          heroImageUrl={MOCK_HERO_IMAGE}
          categorySlug={categorySlug}
          onSearch={setSearchQuery}
        />

        <motion.div variants={fadeInUp}>
          <FeaturedSection
            title="Editor's Picks"
            subtitle="Hand-selected experiences our travel experts love the most"
            items={MOCK_FEATURED}
            viewAllHref={`/${categorySlug}/featured`}
          />
        </motion.div>

        <motion.div variants={fadeInUp}>
          <PopularNowSection items={MOCK_POPULAR} viewAllHref={`/${categorySlug}/popular`} />
        </motion.div>

        <motion.div variants={fadeInUp}>
          <ByAreaSection
            title="Explore by Area"
            subtitle="Find attractions in your favorite neighborhoods"
            areas={MOCK_AREAS}
            viewAllHref="/areas"
          />
        </motion.div>

        <motion.div variants={fadeInUp}>
          <RecentlyAddedSection items={MOCK_RECENT} viewAllHref={`/${categorySlug}/new`} />
        </motion.div>

        <motion.section 
          variants={fadeInUp}
          className="bg-slate-50 dark:bg-slate-900 py-12 md:py-16"
        >
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex items-start gap-8">
              <CategoryFilterSidebar
                areas={FILTER_AREAS}
                types={FILTER_TYPES}
                sortOptions={SORT_OPTIONS}
                selectedFilters={selectedFilters}
                selectedSort={selectedSort}
                onFilterChange={handleFilterChange}
                onSortChange={setSelectedSort}
                onClearFilters={handleClearFilters}
                totalResults={filteredItems.length}
              />

              <div className="flex-1 min-w-0">
                <div className="mb-6 hidden lg:block">
                  <h2 
                    className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-slate-900 dark:text-slate-100"
                    style={{ fontFamily: "'Chillax', var(--font-sans)" }}
                  >
                    All {categoryName}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Browse our complete collection of {categoryName.toLowerCase()}
                  </p>
                </div>

                <BentoResultsGrid
                  items={displayedItems}
                  onLoadMore={handleLoadMore}
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                />

                {hasMore && (
                  <div className="mt-8 text-center">
                    <Button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="rounded-full bg-[#6443F4] hover:bg-[#5539d4] text-white px-8"
                      data-testid="button-load-more"
                    >
                      {loadingMore ? "Loading..." : "Load More"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      </motion.div>

      <PublicFooter />
    </div>
  );
}

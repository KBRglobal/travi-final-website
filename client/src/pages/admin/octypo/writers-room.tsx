import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Users, ShieldCheck, Target } from "lucide-react";

interface Writer {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  type: "writer" | "validator" | "seo";
  description: string;
  experience: number;
  languages: number;
  traits: string[];
  quote: string;
  color: string;
}

const mockWriters: Writer[] = [
  {
    id: "1",
    name: "Sarah Mitchell",
    initials: "SM",
    specialty: "Long-form Travel Articles",
    type: "writer",
    description: "Sarah is a seasoned travel journalist with a passion for uncovering the soul of every destination. With 12 years of...",
    experience: 12,
    languages: 3,
    traits: ["Creative", "Warm", "Adventurous"],
    quote: "Every destination has a story waiting to be told.",
    color: "bg-teal-500",
  },
  {
    id: "2",
    name: "Michael Chen",
    initials: "MC",
    specialty: "Day-by-Day Itineraries",
    type: "writer",
    description: "Michael is the master of logistics, turning complex multi-destination trips into seamless day-by-day adventures. His...",
    experience: 8,
    languages: 3,
    traits: ["Analytical", "Detail-oriented", "Methodical"],
    quote: "The best trip is a well-planned trip.",
    color: "bg-green-500",
  },
  {
    id: "3",
    name: "David Rodriguez",
    initials: "DR",
    specialty: "Comprehensive Destination Guides",
    type: "writer",
    description: "David writes the definitive guides that travelers print out and stuff in their backpacks.",
    experience: 15,
    languages: 4,
    traits: ["Passionate", "Warm", "Enthusiastic"],
    quote: "To understand a place, you must walk its streets and talk to its people.",
    color: "bg-purple-500",
  },
  {
    id: "4",
    name: "Rebecca Thompson",
    initials: "RT",
    specialty: "Hotel & Restaurant Reviews",
    type: "writer",
    description: "Rebecca specializes in hospitality reviews with an eye for detail and quality.",
    experience: 7,
    languages: 2,
    traits: ["Critical", "Fair", "Thorough"],
    quote: "Great hospitality transforms a good trip into an unforgettable one.",
    color: "bg-pink-500",
  },
  {
    id: "5",
    name: "Ahmed Mansour",
    initials: "AM",
    specialty: "Budget Travel Tips",
    type: "writer",
    description: "Ahmed helps travelers make the most of their budget without sacrificing experiences.",
    experience: 10,
    languages: 5,
    traits: ["Practical", "Resourceful", "Friendly"],
    quote: "The best experiences don't always come with the highest price tag.",
    color: "bg-orange-500",
  },
  {
    id: "6",
    name: "Layla Nasser",
    initials: "LN",
    specialty: "Local Events & Festivals",
    type: "writer",
    description: "Layla captures the spirit of local celebrations and cultural events.",
    experience: 6,
    languages: 3,
    traits: ["Enthusiastic", "Cultural", "Vibrant"],
    quote: "Festivals reveal the heart of a culture.",
    color: "bg-yellow-500",
  },
  {
    id: "7",
    name: "Fact Checker",
    initials: "FC",
    specialty: "Factual Accuracy",
    type: "validator",
    description: "Verifies facts and claims in all content.",
    experience: 10,
    languages: 1,
    traits: ["Accurate", "Thorough", "Reliable"],
    quote: "Facts matter.",
    color: "bg-blue-500",
  },
  {
    id: "8",
    name: "SEO Optimizer",
    initials: "SO",
    specialty: "SEO Enhancement",
    type: "seo",
    description: "Optimizes content for search engines.",
    experience: 8,
    languages: 1,
    traits: ["Technical", "Strategic", "Data-driven"],
    quote: "Great content deserves to be found.",
    color: "bg-indigo-500",
  },
];

export default function OctypoWritersRoomPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const writers = mockWriters.filter(w => w.type === "writer");
  const validators = mockWriters.filter(w => w.type === "validator");
  const seoSpecialists = mockWriters.filter(w => w.type === "seo");

  const filteredWriters = mockWriters.filter((writer) => {
    const matchesSearch = 
      writer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      writer.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = 
      activeTab === "all" ||
      (activeTab === "writers" && writer.type === "writer") ||
      (activeTab === "validators" && writer.type === "validator") ||
      (activeTab === "seo" && writer.type === "seo");
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6" data-testid="octypo-writers-room-page">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a87] rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Writers Room</h1>
        <p className="text-white/80 max-w-2xl">
          Meet our team of AI agents - specialized writers, validators, and SEO experts working 
          together to create high-quality travel content. Each agent has their own personality, 
          expertise, and writing style.
        </p>
        <div className="flex items-center gap-6 mt-6 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{writers.length} Writers</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span>{validators.length} Validators</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span>{seoSpecialists.length} SEO Specialist</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, specialty, or expertise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-filter">
            <TabsTrigger value="all" data-testid="tab-all">
              All Agents ({mockWriters.length})
            </TabsTrigger>
            <TabsTrigger value="writers" data-testid="tab-writers">
              Writers ({writers.length})
            </TabsTrigger>
            <TabsTrigger value="validators" data-testid="tab-validators">
              Validators ({validators.length})
            </TabsTrigger>
            <TabsTrigger value="seo" data-testid="tab-seo">
              SEO ({seoSpecialists.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Writer Agents</h2>
        <p className="text-muted-foreground mb-6">
          Our specialized writers create engaging travel content across different formats and styles.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWriters.map((writer) => (
            <Card key={writer.id} className="overflow-hidden" data-testid={`writer-card-${writer.id}`}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className={`h-12 w-12 ${writer.color}`}>
                    <AvatarFallback className={`${writer.color} text-white font-semibold`}>
                      {writer.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{writer.name}</h3>
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
                        {writer.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{writer.specialty}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {writer.description}
                </p>

                <div className="flex items-center gap-4 text-sm mb-4">
                  <span className="font-medium">{writer.experience} years exp.</span>
                  <span className="text-muted-foreground">{writer.languages} languages</span>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {writer.traits.map((trait, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {trait}
                    </Badge>
                  ))}
                </div>

                <p className="text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-3">
                  "{writer.quote}"
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

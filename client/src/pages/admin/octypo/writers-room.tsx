import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, ShieldCheck, Target } from "lucide-react";

interface WriterFromAPI {
  id: string;
  name: string;
  specialty: string;
  experienceYears: number;
  languagesCount: number;
  traits: string[];
  stats: {
    generated: number;
    successRate: number;
    avgQuality: number;
    avgProcessingTimeMs: number;
  };
  expertise: string[];
  tone: string;
}

interface ValidatorFromAPI {
  id: string;
  name: string;
  specialty: string;
}

interface DisplayWriter {
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

const AVATAR_COLORS = [
  "bg-teal-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function mapWriterToDisplay(writer: WriterFromAPI, index: number): DisplayWriter {
  return {
    id: writer.id,
    name: writer.name,
    initials: getInitials(writer.name),
    specialty: writer.specialty,
    type: "writer",
    description: `Specialized in ${writer.expertise?.join(", ") || writer.specialty}. ${writer.stats?.generated > 0 ? `Has generated ${writer.stats.generated} pieces of content.` : ""}`,
    experience: writer.experienceYears || 0,
    languages: writer.languagesCount || 0,
    traits: writer.traits || [],
    quote: writer.tone ? `Writing tone: ${writer.tone}` : "",
    color: AVATAR_COLORS[index % AVATAR_COLORS.length],
  };
}

function mapValidatorToDisplay(validator: ValidatorFromAPI, index: number): DisplayWriter {
  const isValidator = validator.specialty.toLowerCase().includes("fact") || 
                      validator.specialty.toLowerCase().includes("valid") ||
                      validator.specialty.toLowerCase().includes("accuracy");
  return {
    id: validator.id,
    name: validator.name,
    initials: getInitials(validator.name),
    specialty: validator.specialty,
    type: isValidator ? "validator" : "seo",
    description: `Specialized in ${validator.specialty}.`,
    experience: 0,
    languages: 0,
    traits: [],
    quote: "",
    color: AVATAR_COLORS[(index + 5) % AVATAR_COLORS.length],
  };
}

export default function OctypoWritersRoomPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: writersData, isLoading: isLoadingWriters } = useQuery<{ writers: WriterFromAPI[] }>({
    queryKey: ['/api/octypo/agents/writers/detailed'],
  });

  const { data: validatorsData, isLoading: isLoadingValidators } = useQuery<ValidatorFromAPI[]>({
    queryKey: ['/api/octypo/agents/validators'],
  });

  const isLoading = isLoadingWriters || isLoadingValidators;

  const writerAgents: DisplayWriter[] = (writersData?.writers || []).map(mapWriterToDisplay);
  const validatorAgents: DisplayWriter[] = (validatorsData || []).map(mapValidatorToDisplay);

  const allAgents = [...writerAgents, ...validatorAgents];
  const writers = allAgents.filter(w => w.type === "writer");
  const validators = allAgents.filter(w => w.type === "validator");
  const seoSpecialists = allAgents.filter(w => w.type === "seo");

  const filteredWriters = allAgents.filter((writer) => {
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
              All Agents ({allAgents.length})
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

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4 mb-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-16 w-full mb-4" />
                  <div className="flex gap-2 mb-4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="flex gap-1 mb-4">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
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

                {writer.quote && (
                  <p className="text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-3">
                    "{writer.quote}"
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

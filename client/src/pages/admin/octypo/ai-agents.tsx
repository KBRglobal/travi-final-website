import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  MapPin,
  Star,
  ShieldCheck,
  Search as SearchIcon,
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  specialty: string;
  type: "writer" | "validator";
  description: string;
  languages: string[];
  stats: {
    generated: number;
    successRate: string;
    avgQuality: number;
    avgSeo: number;
  };
  icon: typeof FileText;
  active: boolean;
}

const mockAgents: Agent[] = [
  {
    id: "1",
    name: "Article Writer",
    specialty: "General Travel Articles",
    type: "writer",
    description: "Creates engaging travel articles",
    languages: ["English", "Hebrew"],
    stats: { generated: 245, successRate: "94%", avgQuality: 87, avgSeo: 82 },
    icon: FileText,
    active: true,
  },
  {
    id: "2",
    name: "Guide Writer",
    specialty: "Destination Guides",
    type: "writer",
    description: "Creates comprehensive guides",
    languages: ["English", "Hebrew", "Arabic"],
    stats: { generated: 156, successRate: "92%", avgQuality: 89, avgSeo: 85 },
    icon: MapPin,
    active: true,
  },
  {
    id: "3",
    name: "Review Writer",
    specialty: "Hotel & Restaurant Reviews",
    type: "writer",
    description: "Writes balanced reviews",
    languages: ["English"],
    stats: { generated: 312, successRate: "91%", avgQuality: 85, avgSeo: 80 },
    icon: Star,
    active: true,
  },
  {
    id: "4",
    name: "Fact Checker",
    specialty: "Factual Accuracy",
    type: "validator",
    description: "Verifies facts and claims",
    languages: ["English"],
    stats: { generated: 890, successRate: "98%", avgQuality: 95, avgSeo: 0 },
    icon: ShieldCheck,
    active: true,
  },
  {
    id: "5",
    name: "SEO Optimizer",
    specialty: "SEO Enhancement",
    type: "validator",
    description: "Optimizes content for search",
    languages: ["English"],
    stats: { generated: 567, successRate: "97%", avgQuality: 0, avgSeo: 94 },
    icon: SearchIcon,
    active: true,
  },
];

export default function OctypoAIAgentsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const writers = mockAgents.filter(a => a.type === "writer");
  const validators = mockAgents.filter(a => a.type === "validator");

  const filteredAgents = mockAgents.filter((agent) => {
    if (activeTab === "all") return true;
    if (activeTab === "writers") return agent.type === "writer";
    if (activeTab === "validators") return agent.type === "validator";
    return true;
  });

  return (
    <div className="space-y-6" data-testid="octypo-ai-agents-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">AI Agents</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-filter">
          <TabsTrigger value="all" data-testid="tab-all">
            All Agents <Badge variant="secondary" className="ml-2">{mockAgents.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="writers" data-testid="tab-writers">
            Writers <Badge variant="secondary" className="ml-2">{writers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="validators" data-testid="tab-validators">
            Validators <Badge variant="secondary" className="ml-2">{validators.length}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => (
          <Card key={agent.id} data-testid={`agent-card-${agent.id}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <agent.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground">{agent.specialty}</p>
                  </div>
                </div>
                {agent.active && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Active
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {agent.description}
              </p>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">Languages</p>
                <div className="flex flex-wrap gap-1">
                  {agent.languages.map((lang, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Generated</p>
                  <p className="text-xl font-bold">{agent.stats.generated}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                  <p className="text-xl font-bold">{agent.stats.successRate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Quality</p>
                  <p className="text-xl font-bold">{agent.stats.avgQuality || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg SEO</p>
                  <p className="text-xl font-bold">{agent.stats.avgSeo || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

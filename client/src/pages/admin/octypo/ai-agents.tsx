import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  ShieldCheck,
} from "lucide-react";

interface WriterAgent {
  id: string;
  name: string;
  specialty: string;
  expertise: string[];
  contentCount: number;
}

interface ValidatorAgent {
  id: string;
  name: string;
  specialty: string;
}

interface OctypoStats {
  totalAttractions: number;
  pendingContent: number;
  generatedContent: number;
  writerAgentCount: number;
  validatorAgentCount: number;
  avgQualityScore: number;
}

export default function OctypoAIAgentsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const { data: writersData, isLoading: writersLoading } = useQuery<WriterAgent[]>({
    queryKey: ['/api/octypo/agents/writers'],
  });

  const { data: validatorsData, isLoading: validatorsLoading } = useQuery<ValidatorAgent[]>({
    queryKey: ['/api/octypo/agents/validators'],
  });

  const { data: statsData } = useQuery<OctypoStats>({
    queryKey: ['/api/octypo/agents/stats'],
  });

  const writers = writersData || [];
  const validators = validatorsData || [];
  const isLoading = writersLoading || validatorsLoading;

  const allAgents = [
    ...writers.map(w => ({ ...w, type: 'writer' as const })),
    ...validators.map(v => ({ ...v, type: 'validator' as const })),
  ];

  const filteredAgents = allAgents.filter((agent) => {
    if (activeTab === "all") return true;
    if (activeTab === "writers") return agent.type === "writer";
    if (activeTab === "validators") return agent.type === "validator";
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="octypo-ai-agents-page">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">AI Agents</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full mb-4" />
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="octypo-ai-agents-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">AI Agents</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-filter">
          <TabsTrigger value="all" data-testid="tab-all">
            All Agents <Badge variant="secondary" className="ml-2">{allAgents.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="writers" data-testid="tab-writers">
            Writers <Badge variant="secondary" className="ml-2">{writers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="validators" data-testid="tab-validators">
            Validators <Badge variant="secondary" className="ml-2">{validators.length}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {statsData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Writers</p>
              <p className="text-2xl font-bold">{statsData.writerAgentCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Validators</p>
              <p className="text-2xl font-bold">{statsData.validatorAgentCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Generated Content</p>
              <p className="text-2xl font-bold">{statsData.generatedContent}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Avg Quality Score</p>
              <p className="text-2xl font-bold">{statsData.avgQualityScore.toFixed(1)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => (
          <Card key={agent.id} data-testid={`agent-card-${agent.id}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    {agent.type === 'writer' ? (
                      <FileText className="h-5 w-5 text-primary" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground">{agent.specialty}</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Active
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {agent.type === 'writer' ? 'AI Writer Agent' : 'AI Validator Agent'}
              </p>

              {agent.type === 'writer' && 'expertise' in agent && agent.expertise.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Expertise</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.expertise.map((exp, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {exp}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="text-lg font-semibold capitalize">{agent.type}</p>
                </div>
                {agent.type === 'writer' && 'contentCount' in agent && (
                  <div>
                    <p className="text-xs text-muted-foreground">Content Count</p>
                    <p className="text-lg font-semibold">{agent.contentCount}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No agents found
        </div>
      )}
    </div>
  );
}

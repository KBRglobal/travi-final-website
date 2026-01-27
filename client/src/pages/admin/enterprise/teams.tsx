import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UsersRound, Plus, Users, Crown, Shield, Lightbulb, Settings } from "lucide-react";

interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  memberCount: number;
  createdAt: string;
}

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
}

export default function TeamsPage() {
  const { toast } = useToast();

  const { data: teams, isLoading } = useQuery<Team[]>({
    queryKey: ["/api/enterprise/teams"],
  });

  const createTeamMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/enterprise/teams", { name: "New Team" }),
    onSuccess: () => {
      toast({ title: "Team created" });
      queryClient.invalidateQueries({ queryKey: ["/api/enterprise/teams"] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="heading-teams">
            <UsersRound className="h-8 w-8 text-primary" />
            Teams
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize users into teams for collaborative workflows
          </p>
        </div>
        <Button
          onClick={() => createTeamMutation.mutate()}
          disabled={createTeamMutation.isPending}
          data-testid="button-create-team"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      <div className="p-4 bg-muted rounded-lg border">
        <h3 className="font-medium flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          How It Works
        </h3>
        <p className="text-sm text-muted-foreground">
          Teams enable <strong>collaborative content management</strong>. Assign users to teams, set
          team-specific permissions, and create approval workflows that route through team leads.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UsersRound className="h-4 w-4" />
              Total Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-teams">
              {teams?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-members">
              {teams?.reduce((sum, t) => sum + (t.memberCount || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Active Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-active-teams">
              {teams?.filter(t => (t.memberCount || 0) > 0).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams?.length ? (
          teams.map(team => (
            <Card key={team.id} className="hover-elevate" data-testid={`team-card-${team.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UsersRound className="h-5 w-5 text-primary" />
                    {team.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`button-settings-team-${team.id}`}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>{team.description || "No description"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[...Array(Math.min(team.memberCount || 0, 4))].map((_, i) => (
                      <Avatar key={i} className="h-8 w-8 border-2 border-background">
                        <AvatarFallback className="text-xs">
                          {String.fromCharCode(65 + i)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {(team.memberCount || 0) > 4 && (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                        +{(team.memberCount || 0) - 4}
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary">{team.memberCount || 0} members</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <UsersRound className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No teams created yet</p>
              <p className="text-sm">Create a team to start organizing your users</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

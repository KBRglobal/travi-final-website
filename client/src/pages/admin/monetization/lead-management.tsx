import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Users, Mail, Phone, Calendar, CheckCircle2, Clock, XCircle, Lightbulb } from "lucide-react";

interface LeadStats {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
}

export default function LeadManagementPage() {
  const { data: stats, isLoading } = useQuery<LeadStats>({
    queryKey: ["/api/monetization/leads/stats"],
  });

  const { data: leads } = useQuery<any[]>({
    queryKey: ["/api/monetization/leads"],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="default">New</Badge>;
      case "contacted":
        return <Badge variant="secondary">Contacted</Badge>;
      case "qualified":
        return <Badge className="bg-blue-500">Qualified</Badge>;
      case "converted":
        return <Badge className="bg-green-500">Converted</Badge>;
      case "lost":
        return <Badge variant="destructive">Lost</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="heading-leads">
          <Target className="h-8 w-8 text-primary" />
          Lead Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Track and manage leads generated from your contents
        </p>
        <div className="mt-4 p-4 bg-muted rounded-lg border">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            How It Works / איך זה עובד
          </h3>
          <p className="text-sm text-muted-foreground">
            Leads are captured when visitors submit <strong>inquiry forms</strong> on hotel, tour, or business pages.
            Track their journey from inquiry to conversion. Share leads with partner businesses.
            <br />
            <span className="text-xs opacity-70">
              (לידים נאספים כשמבקרים שולחים טפסי פנייה. עקוב אחרי המסע מפנייה להמרה.)
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-leads">
              {stats?.totalLeads || 0}
            </div>
            <p className="text-xs text-muted-foreground">All-time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              New Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-new-leads">
              {stats?.newLeads || 0}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Qualified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600" data-testid="text-qualified-leads">
              {stats?.qualifiedLeads || 0}
            </div>
            <p className="text-xs text-muted-foreground">Ready to convert</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Converted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-converted-leads">
              {stats?.convertedLeads || 0}
            </div>
            <p className="text-xs text-muted-foreground">Successful conversions</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead Pipeline</CardTitle>
          <CardDescription>
            Manage leads through your sales funnel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Leads</TabsTrigger>
              <TabsTrigger value="new">New</TabsTrigger>
              <TabsTrigger value="qualified">Qualified</TabsTrigger>
              <TabsTrigger value="converted">Converted</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <ScrollArea className="h-[350px]">
                {leads?.length ? (
                  <div className="space-y-3">
                    {leads.map((lead: any) => (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                        data-testid={`lead-${lead.id}`}
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{lead.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </span>
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(lead.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{lead.type}</Badge>
                          {getStatusBadge(lead.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No leads captured yet</p>
                    <p className="text-sm">Leads will appear when visitors submit inquiry forms</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

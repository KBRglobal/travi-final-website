import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/public-layout";
import { 
  MousePointer2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Copy, 
  Link2,
  Calendar,
  Loader2,
  Search
} from "lucide-react";

interface DashboardData {
  partner: {
    code: string;
    name: string;
    commissionRate: number;
    isActive: boolean;
    createdAt: string;
  };
  stats: {
    totalClicks: number;
    totalSignups: number;
    totalConversions: number;
    totalCommission: number;
  };
  recentClicks: Array<{
    id: string;
    landingPage: string;
    createdAt: string;
  }>;
  conversions: Array<{
    id: string;
    email: string;
    status: string;
    createdAt: string;
  }>;
  commissions: Array<{
    id: string;
    amount: number;
    status: string;
    description: string;
    createdAt: string;
  }>;
  referralLink: string;
}

export default function PartnersDashboard() {
  const { toast } = useToast();
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const codeFromUrl = urlParams.get("code") || "";
  
  const [partnerCode, setPartnerCode] = useState(codeFromUrl);
  const [searchCode, setSearchCode] = useState(codeFromUrl);

  const { data, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ["/api/referrals/dashboard", searchCode],
    queryFn: async () => {
      if (!searchCode) throw new Error("No code");
      const res = await fetch(`/api/referrals/dashboard?code=${searchCode}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch dashboard");
      }
      return res.json();
    },
    enabled: !!searchCode,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard.",
    });
  };

  const handleSearch = () => {
    if (partnerCode) {
      setSearchCode(partnerCode);
    }
  };

  if (!searchCode) {
    return (
      <PageContainer>
        <div className="container mx-auto px-4 py-16 max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Partner Dashboard</CardTitle>
              <CardDescription>Enter your partner code to view your dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter your partner code"
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                  data-testid="input-search-code"
                />
                <Button onClick={handleSearch} data-testid="button-search">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Don't have a code?{" "}
                <a href="/partners/join" className="text-primary hover:underline" data-testid="link-join">
                  Join the partner program
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <div className="container mx-auto px-4 py-16 max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Partner Not Found</CardTitle>
              <CardDescription>
                The partner code "{searchCode}" was not found.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Try another code"
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                  data-testid="input-retry-code"
                />
                <Button onClick={handleSearch} data-testid="button-retry">
                  Search
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                <a href="/partners/join" className="text-primary hover:underline">
                  Register as a new partner
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">
              Partner Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {data.partner.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={data.partner.isActive ? "default" : "secondary"} data-testid="badge-status">
              {data.partner.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline" data-testid="badge-commission">
              {data.partner.commissionRate}% Commission
            </Badge>
          </div>
        </div>

        {/* Referral Link */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Your Referral Link
                </label>
                <div className="flex gap-2">
                  <Input 
                    value={data.referralLink} 
                    readOnly 
                    className="font-mono text-sm"
                    data-testid="input-referral-link"
                  />
                  <Button 
                    size="icon" 
                    variant="outline" 
                    onClick={() => copyToClipboard(data.referralLink)}
                    data-testid="button-copy-link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Partner Code</label>
                <div className="flex gap-2">
                  <Input 
                    value={data.partner.code} 
                    readOnly 
                    className="font-mono w-32"
                    data-testid="input-partner-code"
                  />
                  <Button 
                    size="icon" 
                    variant="outline" 
                    onClick={() => copyToClipboard(data.partner.code)}
                    data-testid="button-copy-code"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <MousePointer2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-clicks">{data.stats.totalClicks}</p>
                  <p className="text-sm text-muted-foreground">Clicks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-signups">{data.stats.totalSignups}</p>
                  <p className="text-sm text-muted-foreground">Signups</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-[#6443F4]/10 dark:bg-[#6443F4]/20">
                  <TrendingUp className="h-5 w-5 text-[#6443F4]" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-conversions">{data.stats.totalConversions}</p>
                  <p className="text-sm text-muted-foreground">Conversions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                  <DollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-earnings">${data.stats.totalCommission.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Earnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Clicks</CardTitle>
              <CardDescription>Last 10 clicks on your referral link</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentClicks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No clicks yet. Share your referral link to get started!
                </p>
              ) : (
                <div className="space-y-3">
                  {data.recentClicks.map((click) => (
                    <div key={click.id} className="flex items-center justify-between text-sm" data-testid={`row-click-${click.id}`}>
                      <span className="truncate max-w-[200px] text-muted-foreground">
                        {click.landingPage || "/"}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(click.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Conversions</CardTitle>
              <CardDescription>Signups from your referrals</CardDescription>
            </CardHeader>
            <CardContent>
              {data.conversions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No conversions yet. Keep sharing your link!
                </p>
              ) : (
                <div className="space-y-3">
                  {data.conversions.map((conv) => (
                    <div key={conv.id} className="flex items-center justify-between text-sm" data-testid={`row-conversion-${conv.id}`}>
                      <span className="truncate max-w-[150px]">
                        {conv.email || "Anonymous"}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" size="sm">
                          {conv.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(conv.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Commissions */}
        {data.commissions.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Commission History</CardTitle>
              <CardDescription>Your earned commissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.commissions.map((comm) => (
                  <div key={comm.id} className="flex items-center justify-between" data-testid={`row-commission-${comm.id}`}>
                    <div>
                      <p className="font-medium">${comm.amount.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">{comm.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={comm.status === "paid" ? "default" : comm.status === "approved" ? "secondary" : "outline"}
                      >
                        {comm.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comm.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

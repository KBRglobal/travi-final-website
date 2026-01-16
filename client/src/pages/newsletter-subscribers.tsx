import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Loader2, Mail, Users, Download, Search, Trash2, CheckCircle, Clock, XCircle, 
  AlertTriangle, Beaker, GitBranch, Zap, Play, Pause, Settings, BarChart3,
  TrendingUp, MessageSquare, ArrowRight, Calendar, Target, FileText, Plus,
  Filter, Globe, Languages
} from "lucide-react";
import { Redirect } from "wouter";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

type SubscriberStatus = "pending_confirmation" | "subscribed" | "unsubscribed" | "bounced" | "complained";

type NewsletterSubscriber = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  source: string | null;
  status: SubscriberStatus;
  languagePreference: string | null;
  interestTags: string[] | null;
  emailsBounced: number | null;
  bounceReason: string | null;
  lastBounceAt: string | null;
  subscribedAt: string;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
  isActive: boolean;
};

type NewsletterAbTest = {
  id: string;
  name: string;
  testType: string;
  status: string;
  variantA: { subject?: string; contents?: string };
  variantB: { subject?: string; contents?: string };
  splitPercentage: number;
  testDurationHours: number;
  autoSelectWinner: boolean;
  winnerMetric: string;
  winnerId: string | null;
  statsA: { sent: number; opened: number; clicked: number; bounced: number };
  statsB: { sent: number; opened: number; clicked: number; bounced: number };
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

type EmailTemplate = {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  htmlContent: string | null;
  category: string | null;
  variables: string[] | null;
  usageCount: number | null;
  createdAt: string;
};

type SubscriberSegment = {
  id: string;
  name: string;
  description: string | null;
  isDynamic: boolean;
  subscriberCount: number | null;
  createdAt: string;
};

type BounceStats = {
  totalBounced: number;
  totalSubscribers: number;
  bounceRate: number;
};

type NewsletterSegment = {
  id: string;
  name: string;
  type: "language" | "custom";
  language: string | null;
  subscriberCount: number;
  isDynamic: boolean;
  description?: string | null;
};

type NewsletterSegmentsResponse = {
  segments: NewsletterSegment[];
  totalActive: number;
  languageCounts: Record<string, number>;
};

const statusConfig: Record<SubscriberStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle }> = {
  pending_confirmation: { label: "Pending", variant: "secondary", icon: Clock },
  subscribed: { label: "Subscribed", variant: "default", icon: CheckCircle },
  unsubscribed: { label: "Unsubscribed", variant: "outline", icon: XCircle },
  bounced: { label: "Bounced", variant: "destructive", icon: AlertTriangle },
  complained: { label: "Complained", variant: "destructive", icon: AlertTriangle },
};

const abTestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  testType: z.string().default("subject_line"),
  subjectA: z.string().min(1, "Subject A is required"),
  subjectB: z.string().min(1, "Subject B is required"),
  splitPercentage: z.number().min(10).max(90).default(50),
  testDurationHours: z.number().min(1).max(168).default(24),
  autoSelectWinner: z.boolean().default(true),
  winnerMetric: z.string().default("open_rate"),
});

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  subject: z.string().optional(),
  htmlContent: z.string().optional(),
  category: z.string().default("general"),
});

const segmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isDynamic: z.boolean().default(true),
  field: z.string().default("languagePreference"),
  operator: z.string().default("equals"),
  value: z.string().optional(),
});

const sendCampaignSchema = z.object({
  campaignName: z.string().min(1, "Campaign name is required"),
  subject: z.string().min(1, "Subject is required"),
  subjectB: z.string().optional(),
  htmlContent: z.string().min(1, "Email contents is required"),
  segmentId: z.string().optional(),
  enableAbTest: z.boolean().default(false),
  testDurationHours: z.number().min(1).max(168).default(24),
  winnerMetric: z.string().default("open_rate"),
});

type AbTestFormData = z.infer<typeof abTestSchema>;
type TemplateFormData = z.infer<typeof templateSchema>;
type SegmentFormData = z.infer<typeof segmentSchema>;
type SendCampaignFormData = z.infer<typeof sendCampaignSchema>;

export default function NewsletterSubscribersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("subscribers");
  const [isAbTestDialogOpen, setIsAbTestDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isSegmentDialogOpen, setIsSegmentDialogOpen] = useState(false);
  const [isSendCampaignDialogOpen, setIsSendCampaignDialogOpen] = useState(false);

  const { data: subscribers = [], isLoading } = useQuery<NewsletterSubscriber[]>({
    queryKey: ["/api/newsletter/subscribers"],
    enabled: isAuthenticated,
  });

  const { data: abTests = [], isLoading: abTestsLoading } = useQuery<NewsletterAbTest[]>({
    queryKey: ["/api/newsletter/ab-tests"],
    enabled: isAuthenticated,
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
    enabled: isAuthenticated,
  });

  const { data: segments = [], isLoading: segmentsLoading } = useQuery<SubscriberSegment[]>({
    queryKey: ["/api/subscriber-segments"],
    enabled: isAuthenticated,
  });

  const { data: bounceStats } = useQuery<BounceStats>({
    queryKey: ["/api/newsletter/bounce-stats"],
    enabled: isAuthenticated,
  });

  const { data: newsletterSegmentsData } = useQuery<NewsletterSegmentsResponse>({
    queryKey: ["/api/newsletter/segments"],
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/newsletter/subscribers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletter/subscribers"] });
      toast({
        title: "Subscriber deleted",
        description: "The subscriber has been permanently removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete subscriber. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createAbTestMutation = useMutation({
    mutationFn: async (data: AbTestFormData) => {
      await apiRequest("POST", "/api/newsletter/ab-tests", {
        name: data.name,
        testType: data.testType,
        variantA: { subject: data.subjectA },
        variantB: { subject: data.subjectB },
        splitPercentage: data.splitPercentage,
        testDurationHours: data.testDurationHours,
        autoSelectWinner: data.autoSelectWinner,
        winnerMetric: data.winnerMetric,
        status: "draft",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletter/ab-tests"] });
      setIsAbTestDialogOpen(false);
      toast({ title: "A/B Test created", description: "Your test has been created and is ready to start." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create A/B test.", variant: "destructive" });
    },
  });

  const startAbTestMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/newsletter/ab-tests/${id}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletter/ab-tests"] });
      toast({ title: "Test started", description: "The A/B test is now running." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start test.", variant: "destructive" });
    },
  });

  const selectWinnerMutation = useMutation({
    mutationFn: async ({ id, winnerId }: { id: string; winnerId: string }) => {
      await apiRequest("POST", `/api/newsletter/ab-tests/${id}/select-winner`, { winnerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletter/ab-tests"] });
      toast({ title: "Winner selected", description: "The winning variant has been selected." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to select winner.", variant: "destructive" });
    },
  });

  const deleteAbTestMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/newsletter/ab-tests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletter/ab-tests"] });
      toast({ title: "Test deleted", description: "The A/B test has been deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete test.", variant: "destructive" });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      await apiRequest("POST", "/api/email-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setIsTemplateDialogOpen(false);
      toast({ title: "Template created", description: "Your email template has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create template.", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/email-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({ title: "Template deleted", description: "The template has been deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete template.", variant: "destructive" });
    },
  });

  const createSegmentMutation = useMutation({
    mutationFn: async (data: SegmentFormData) => {
      const conditions = data.value ? [{
        field: data.field,
        operator: data.operator,
        value: data.value,
        logicOperator: "AND",
        order: 0,
      }] : [];
      await apiRequest("POST", "/api/subscriber-segments", {
        name: data.name,
        description: data.description,
        isDynamic: data.isDynamic,
        conditions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriber-segments"] });
      setIsSegmentDialogOpen(false);
      toast({ title: "Segment created", description: "Your subscriber segment has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create segment.", variant: "destructive" });
    },
  });

  const deleteSegmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/subscriber-segments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriber-segments"] });
      toast({ title: "Segment deleted", description: "The segment has been deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete segment.", variant: "destructive" });
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (data: SendCampaignFormData) => {
      const response = await apiRequest("POST", "/api/newsletter/send", {
        campaignName: data.campaignName,
        subject: data.subject,
        subjectB: data.enableAbTest ? data.subjectB : undefined,
        htmlContent: data.htmlContent,
        segmentId: data.segmentId === "all" ? undefined : data.segmentId,
        enableAbTest: data.enableAbTest,
        testDurationHours: data.testDurationHours,
        winnerMetric: data.winnerMetric,
      });
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletter/segments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/newsletter/ab-tests"] });
      setIsSendCampaignDialogOpen(false);
      sendCampaignForm.reset();
      toast({ 
        title: "Campaign sent", 
        description: `Sent to ${data.recipientCount} subscribers${data.abTestId ? " with A/B testing enabled" : ""}` 
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send campaign.", variant: "destructive" });
    },
  });

  const abTestForm = useForm<AbTestFormData>({
    resolver: zodResolver(abTestSchema),
    defaultValues: {
      name: "",
      testType: "subject_line",
      subjectA: "",
      subjectB: "",
      splitPercentage: 50,
      testDurationHours: 24,
      autoSelectWinner: true,
      winnerMetric: "open_rate",
    },
  });

  const templateForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      subject: "",
      htmlContent: "",
      category: "general",
    },
  });

  const segmentForm = useForm<SegmentFormData>({
    resolver: zodResolver(segmentSchema),
    defaultValues: {
      name: "",
      description: "",
      isDynamic: true,
      field: "languagePreference",
      operator: "equals",
      value: "",
    },
  });

  const sendCampaignForm = useForm<SendCampaignFormData>({
    resolver: zodResolver(sendCampaignSchema),
    defaultValues: {
      campaignName: "",
      subject: "",
      subjectB: "",
      htmlContent: "",
      segmentId: "all",
      enableAbTest: false,
      testDurationHours: 24,
      winnerMetric: "open_rate",
    },
  });

  const enableAbTest = sendCampaignForm.watch("enableAbTest");

  const languageOptions = useMemo(() => {
    const languages = new Set<string>();
    subscribers.forEach(s => {
      if (s.languagePreference) languages.add(s.languagePreference);
    });
    return Array.from(languages).sort();
  }, [subscribers]);

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((subscriber) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        subscriber.email.toLowerCase().includes(searchLower) ||
        (subscriber.firstName?.toLowerCase().includes(searchLower)) ||
        (subscriber.lastName?.toLowerCase().includes(searchLower));
      const matchesStatus = filterStatus === "all" || subscriber.status === filterStatus;
      const matchesLanguage = filterLanguage === "all" || subscriber.languagePreference === filterLanguage;
      return matchesSearch && matchesStatus && matchesLanguage;
    });
  }, [subscribers, searchQuery, filterStatus, filterLanguage]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: subscribers.length };
    for (const s of subscribers) {
      counts[s.status] = (counts[s.status] || 0) + 1;
    }
    return counts;
  }, [subscribers]);

  const languageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of subscribers) {
      const lang = s.languagePreference || "unknown";
      counts[lang] = (counts[lang] || 0) + 1;
    }
    return counts;
  }, [subscribers]);

  const exportToCSV = () => {
    const headers = ["Email", "First Name", "Last Name", "Status", "Language", "Source", "Subscribed At", "Confirmed At"];
    const rows = filteredSubscribers.map((subscriber) => [
      subscriber.email,
      subscriber.firstName || "",
      subscriber.lastName || "",
      subscriber.status,
      subscriber.languagePreference || "en",
      subscriber.source || "coming_soon",
      subscriber.subscribedAt ? format(new Date(subscriber.subscribedAt), "yyyy-MM-dd HH:mm:ss") : "",
      subscriber.confirmedAt ? format(new Date(subscriber.confirmedAt), "yyyy-MM-dd HH:mm:ss") : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `newsletter-subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Newsletter Management</h1>
          <p className="text-muted-foreground">
            Manage subscribers, segments, A/B tests, and email templates
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1.5" data-testid="stat-total-subscribers">
            <Users className="w-4 h-4 mr-2" />
            {subscribers.length} total
          </Badge>
          <Badge variant="default" className="px-3 py-1.5" data-testid="stat-confirmed-subscribers">
            {statusCounts.subscribed || 0} confirmed
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5" data-testid="stat-pending-subscribers">
            {statusCounts.pending_confirmation || 0} pending
          </Badge>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="text-muted-foreground">
            <strong>Subscriber Segmentation:</strong> Filter subscribers by language preference, create dynamic segments for targeted campaigns.
          </p>
          <p className="text-muted-foreground">
            <strong>A/B Testing:</strong> Test different subject lines to maximize open rates and click-through rates.
          </p>
          <p className="text-muted-foreground">
            <strong>Templates:</strong> Create reusable email templates for consistent branding across campaigns.
          </p>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="subscribers" className="gap-2" data-testid="tab-subscribers">
            <Users className="w-4 h-4" />
            Subscribers
          </TabsTrigger>
          <TabsTrigger value="segments" className="gap-2" data-testid="tab-segments">
            <Filter className="w-4 h-4" />
            Segments
          </TabsTrigger>
          <TabsTrigger value="ab-testing" className="gap-2" data-testid="tab-ab-testing">
            <Beaker className="w-4 h-4" />
            A/B Testing
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2" data-testid="tab-templates">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="drip-campaigns" className="gap-2" data-testid="tab-drip-campaigns">
            <GitBranch className="w-4 h-4" />
            Drip Campaigns
          </TabsTrigger>
        </TabsList>

        {/* Subscribers Tab */}
        <TabsContent value="subscribers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Subscriber List
                  </CardTitle>
                  <CardDescription>
                    All newsletter subscribers with language preferences and consent tracking
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={exportToCSV}
                  disabled={filteredSubscribers.length === 0}
                  data-testid="button-export-csv"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-subscribers"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status ({statusCounts.all})</SelectItem>
                    <SelectItem value="subscribed">Subscribed ({statusCounts.subscribed || 0})</SelectItem>
                    <SelectItem value="pending_confirmation">Pending ({statusCounts.pending_confirmation || 0})</SelectItem>
                    <SelectItem value="unsubscribed">Unsubscribed ({statusCounts.unsubscribed || 0})</SelectItem>
                    <SelectItem value="bounced">Bounced ({statusCounts.bounced || 0})</SelectItem>
                    <SelectItem value="complained">Complained ({statusCounts.complained || 0})</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                  <SelectTrigger className="w-[160px]" data-testid="select-filter-language">
                    <Languages className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    {languageOptions.map(lang => (
                      <SelectItem key={lang} value={lang}>
                        {lang.toUpperCase()} ({languageCounts[lang] || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredSubscribers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  {searchQuery || filterStatus !== "all" || filterLanguage !== "all" ? (
                    <>
                      <p>No subscribers match your filters</p>
                      <p className="text-sm">Try adjusting your search or filter criteria</p>
                    </>
                  ) : (
                    <>
                      <p>No subscribers yet</p>
                      <p className="text-sm">Subscribers will appear here when people sign up</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subscriber</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Signed Up</TableHead>
                        <TableHead className="w-[50px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscribers.map((subscriber) => {
                        const config = statusConfig[subscriber.status];
                        const StatusIcon = config.icon;
                        const displayName = [subscriber.firstName, subscriber.lastName].filter(Boolean).join(" ");
                        
                        return (
                          <TableRow key={subscriber.id} data-testid={`row-subscriber-${subscriber.id}`}>
                            <TableCell>
                              <div>
                                <div className="font-medium" data-testid={`text-email-${subscriber.id}`}>
                                  {subscriber.email}
                                </div>
                                {displayName && (
                                  <div className="text-sm text-muted-foreground">
                                    {displayName}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={config.variant} className="gap-1">
                                <StatusIcon className="w-3 h-3" />
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1">
                                <Globe className="w-3 h-3" />
                                {subscriber.languagePreference?.toUpperCase() || "EN"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {subscriber.source || "coming_soon"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {subscriber.subscribedAt 
                                ? format(new Date(subscriber.subscribedAt), "MMM d, yyyy")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    data-testid={`button-delete-${subscriber.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Subscriber</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete {subscriber.email} and all associated data. 
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(subscriber.id)}
                                      className="bg-destructive text-destructive-foreground"
                                      data-testid={`button-confirm-delete-${subscriber.id}`}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {filteredSubscribers.length > 0 && (
                <div className="mt-4 text-sm text-muted-foreground">
                  Showing {filteredSubscribers.length} of {subscribers.length} subscribers
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Filter className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Segments</p>
                    <p className="text-2xl font-semibold" data-testid="stat-total-segments">{segments.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-green-500/10">
                    <Zap className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dynamic Segments</p>
                    <p className="text-2xl font-semibold" data-testid="stat-dynamic-segments">
                      {segments.filter(s => s.isDynamic).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-blue-500/10">
                    <Languages className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Languages</p>
                    <p className="text-2xl font-semibold" data-testid="stat-languages">{languageOptions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-orange-500/10">
                    <Users className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Segmented</p>
                    <p className="text-2xl font-semibold" data-testid="stat-segmented-users">
                      {segments.reduce((sum, s) => sum + (s.subscriberCount || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Subscriber Segments
                  </CardTitle>
                  <CardDescription>
                    Create segments by language preference, engagement, and other criteria
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Dialog open={isSendCampaignDialogOpen} onOpenChange={setIsSendCampaignDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-send-campaign">
                        <Mail className="w-4 h-4 mr-2" />
                        Send Campaign
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Send Newsletter Campaign</DialogTitle>
                        <DialogDescription>
                          Send a targeted campaign to specific subscriber segments with optional A/B testing.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...sendCampaignForm}>
                        <form onSubmit={sendCampaignForm.handleSubmit((data) => sendCampaignMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={sendCampaignForm.control}
                            name="campaignName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Campaign Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="December Newsletter" {...field} data-testid="input-campaign-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={sendCampaignForm.control}
                            name="segmentId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Target Segment</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-segment">
                                      <SelectValue placeholder="Select segment" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="all">All Subscribers ({newsletterSegmentsData?.totalActive || 0})</SelectItem>
                                    {newsletterSegmentsData?.segments.map(segment => (
                                      <SelectItem key={segment.id} value={segment.id}>
                                        {segment.name} ({segment.subscriberCount})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={sendCampaignForm.control}
                            name="subject"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Subject Line {enableAbTest && "(Variant A)"}</FormLabel>
                                <FormControl>
                                  <Input placeholder="Your Weekly Update" {...field} data-testid="input-subject" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={sendCampaignForm.control}
                            name="enableAbTest"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2 rounded-md border p-3">
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-ab-test" />
                                </FormControl>
                                <div>
                                  <FormLabel className="!mt-0 flex items-center gap-2">
                                    <Beaker className="w-4 h-4" />
                                    Enable A/B Testing
                                  </FormLabel>
                                  <FormDescription className="text-xs">
                                    Test two subject lines with a 50/50 split
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          {enableAbTest && (
                            <>
                              <FormField
                                control={sendCampaignForm.control}
                                name="subjectB"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Subject Line (Variant B)</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Your Weekly Digest" {...field} data-testid="input-subject-b" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={sendCampaignForm.control}
                                  name="testDurationHours"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Test Duration (hours)</FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="number" 
                                          min={1} 
                                          max={168} 
                                          {...field} 
                                          onChange={e => field.onChange(parseInt(e.target.value) || 24)}
                                          data-testid="input-test-duration" 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={sendCampaignForm.control}
                                  name="winnerMetric"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Winner Metric</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger data-testid="select-winner-metric">
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="open_rate">Open Rate</SelectItem>
                                          <SelectItem value="click_rate">Click Rate</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </>
                          )}
                          <FormField
                            control={sendCampaignForm.control}
                            name="htmlContent"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Content (HTML)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="<p>Hello {{firstName}},</p><p>Here's your weekly update...</p>" 
                                    className="min-h-[120px] font-mono text-sm"
                                    {...field} 
                                    data-testid="input-html-contents" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button 
                              type="submit" 
                              disabled={sendCampaignMutation.isPending} 
                              data-testid="button-send"
                            >
                              {sendCampaignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              <Mail className="w-4 h-4 mr-2" />
                              Send Campaign
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={isSegmentDialogOpen} onOpenChange={setIsSegmentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="button-create-segment">
                        <Plus className="w-4 h-4 mr-2" />
                        New Segment
                      </Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Subscriber Segment</DialogTitle>
                      <DialogDescription>
                        Create a segment to target specific subscribers based on their attributes.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...segmentForm}>
                      <form onSubmit={segmentForm.handleSubmit((data) => createSegmentMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={segmentForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Segment Name</FormLabel>
                              <FormControl>
                                <Input placeholder="English Speakers" {...field} data-testid="input-segment-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={segmentForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Subscribers who prefer English contents..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={segmentForm.control}
                            name="field"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Filter By</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-segment-field">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="languagePreference">Language</SelectItem>
                                    <SelectItem value="source">Source</SelectItem>
                                    <SelectItem value="status">Status</SelectItem>
                                    <SelectItem value="emailsOpened">Emails Opened</SelectItem>
                                    <SelectItem value="emailsClicked">Emails Clicked</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={segmentForm.control}
                            name="operator"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Condition</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-segment-operator">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="equals">Equals</SelectItem>
                                    <SelectItem value="not_equals">Not Equals</SelectItem>
                                    <SelectItem value="contains">Contains</SelectItem>
                                    <SelectItem value="greater_than">Greater Than</SelectItem>
                                    <SelectItem value="less_than">Less Than</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={segmentForm.control}
                          name="value"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Value</FormLabel>
                              <FormControl>
                                <Input placeholder="en" {...field} data-testid="input-segment-value" />
                              </FormControl>
                              <FormDescription>
                                For language: en, es, fr, etc. For numbers: enter a numeric value.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={segmentForm.control}
                          name="isDynamic"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="!mt-0">Dynamic segment (auto-updates)</FormLabel>
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createSegmentMutation.isPending} data-testid="button-save-segment">
                            {createSegmentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Segment
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
              </div>
            </CardHeader>
            <CardContent>
              {segmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : segments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No segments yet. Create your first segment to target specific subscribers.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {segments.map((segment) => (
                    <Card key={segment.id} className="hover-elevate" data-testid={`card-segment-${segment.id}`}>
                      <CardContent className="pt-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <h3 className="font-medium">{segment.name}</h3>
                            {segment.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{segment.description}</p>
                            )}
                          </div>
                          <Badge variant={segment.isDynamic ? "default" : "secondary"}>
                            {segment.isDynamic ? "Dynamic" : "Static"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t">
                          <span className="text-sm font-medium">
                            {segment.subscriberCount || 0} subscribers
                          </span>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-delete-segment-${segment.id}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Segment</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the segment "{segment.name}". This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteSegmentMutation.mutate(segment.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* A/B Testing Tab */}
        <TabsContent value="ab-testing" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Beaker className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Tests</p>
                    <p className="text-2xl font-semibold" data-testid="stat-active-tests">
                      {abTests.filter(t => t.status === "running").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-green-500/10">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-semibold" data-testid="stat-completed-tests">
                      {abTests.filter(t => t.status === "completed").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-destructive/10">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bounce Rate</p>
                    <p className="text-2xl font-semibold" data-testid="stat-bounce-rate">
                      {bounceStats?.bounceRate?.toFixed(1) || 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-orange-500/10">
                    <BarChart3 className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total A/B Tests</p>
                    <p className="text-2xl font-semibold" data-testid="stat-total-ab-tests">{abTests.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Beaker className="w-5 h-5" />
                    A/B Tests
                  </CardTitle>
                  <CardDescription>
                    Test subject lines, contents, and CTAs to optimize performance
                  </CardDescription>
                </div>
                <Dialog open={isAbTestDialogOpen} onOpenChange={setIsAbTestDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-ab-test">
                      <Beaker className="w-4 h-4 mr-2" />
                      New A/B Test
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create A/B Test</DialogTitle>
                      <DialogDescription>
                        Test two subject line variants to find the best performer.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...abTestForm}>
                      <form onSubmit={abTestForm.handleSubmit((data) => createAbTestMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={abTestForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Weekly Newsletter Subject Test" {...field} data-testid="input-ab-test-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={abTestForm.control}
                          name="subjectA"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subject Line A</FormLabel>
                              <FormControl>
                                <Input placeholder="Discover Hidden Gems in Dubai" {...field} data-testid="input-subject-a" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={abTestForm.control}
                          name="subjectB"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subject Line B</FormLabel>
                              <FormControl>
                                <Input placeholder="10 Must-See Dubai Attractions This Week" {...field} data-testid="input-subject-b" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={abTestForm.control}
                            name="splitPercentage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Split (Variant A %)</FormLabel>
                                <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={String(field.value)}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-split">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="50">50 / 50</SelectItem>
                                    <SelectItem value="60">60 / 40</SelectItem>
                                    <SelectItem value="70">70 / 30</SelectItem>
                                    <SelectItem value="80">80 / 20</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={abTestForm.control}
                            name="winnerMetric"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Winner Metric</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-metric">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="open_rate">Open Rate</SelectItem>
                                    <SelectItem value="click_rate">Click Rate</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={abTestForm.control}
                          name="testDurationHours"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Duration (hours)</FormLabel>
                              <FormControl>
                                <Input type="number" min={1} max={168} {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} data-testid="input-duration" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={abTestForm.control}
                          name="autoSelectWinner"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="!mt-0">Auto-select winner when test completes</FormLabel>
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createAbTestMutation.isPending} data-testid="button-save-ab-test">
                            {createAbTestMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Test
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {abTestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : abTests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Beaker className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No A/B tests yet. Create your first test to optimize email performance.</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {abTests.map((test) => {
                      const statsA = test.statsA || { sent: 0, opened: 0, clicked: 0, bounced: 0 };
                      const statsB = test.statsB || { sent: 0, opened: 0, clicked: 0, bounced: 0 };
                      const openRateA = statsA.sent > 0 ? ((statsA.opened / statsA.sent) * 100).toFixed(1) : "0";
                      const openRateB = statsB.sent > 0 ? ((statsB.opened / statsB.sent) * 100).toFixed(1) : "0";
                      const clickRateA = statsA.sent > 0 ? ((statsA.clicked / statsA.sent) * 100).toFixed(1) : "0";
                      const clickRateB = statsB.sent > 0 ? ((statsB.clicked / statsB.sent) * 100).toFixed(1) : "0";
                      
                      return (
                        <Card key={test.id} data-testid={`card-ab-test-${test.id}`}>
                          <CardContent className="pt-4">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-medium">{test.name}</h3>
                                  <Badge variant={test.status === "running" ? "default" : test.status === "completed" ? "secondary" : "outline"}>
                                    {test.status === "running" ? "Running" : test.status === "completed" ? "Completed" : "Draft"}
                                  </Badge>
                                  {test.winnerId && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
                                      Winner: Variant {test.winnerId.toUpperCase()}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {test.testType === "subject_line" ? "Subject Line Test" : test.testType}
                                  {test.startedAt && ` - Started ${format(new Date(test.startedAt), "MMM d, yyyy")}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {test.status === "draft" && (
                                  <Button 
                                    variant="default" 
                                    size="sm" 
                                    onClick={() => startAbTestMutation.mutate(test.id)}
                                    disabled={startAbTestMutation.isPending}
                                    data-testid={`button-start-test-${test.id}`}
                                  >
                                    <Play className="w-4 h-4 mr-1" />
                                    Start
                                  </Button>
                                )}
                                {test.status === "running" && (
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => selectWinnerMutation.mutate({ id: test.id, winnerId: "a" })}
                                      data-testid={`button-select-a-${test.id}`}
                                    >
                                      Select A
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => selectWinnerMutation.mutate({ id: test.id, winnerId: "b" })}
                                      data-testid={`button-select-b-${test.id}`}
                                    >
                                      Select B
                                    </Button>
                                  </div>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" data-testid={`button-delete-test-${test.id}`}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete A/B Test</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the test "{test.name}". This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteAbTestMutation.mutate(test.id)}
                                        className="bg-destructive text-destructive-foreground"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                              <div className={`p-3 rounded-md space-y-2 ${test.winnerId === "a" ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" : "bg-muted/50"}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Variant A</span>
                                  <span className="text-xs text-muted-foreground">{statsA.sent.toLocaleString()} sent</span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{test.variantA?.subject || "No subject"}</p>
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                  <span>Open: <strong>{openRateA}%</strong></span>
                                  <span>Click: <strong>{clickRateA}%</strong></span>
                                </div>
                              </div>
                              <div className={`p-3 rounded-md space-y-2 ${test.winnerId === "b" ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" : "bg-muted/50"}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Variant B</span>
                                  <span className="text-xs text-muted-foreground">{statsB.sent.toLocaleString()} sent</span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{test.variantB?.subject || "No subject"}</p>
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                  <span>Open: <strong>{openRateB}%</strong></span>
                                  <span>Click: <strong>{clickRateB}%</strong></span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Templates</p>
                    <p className="text-2xl font-semibold" data-testid="stat-total-templates">{templates.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-green-500/10">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Usage</p>
                    <p className="text-2xl font-semibold" data-testid="stat-template-usage">
                      {templates.reduce((sum, t) => sum + (t.usageCount || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-blue-500/10">
                    <Target className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Categories</p>
                    <p className="text-2xl font-semibold" data-testid="stat-template-categories">
                      {new Set(templates.map(t => t.category)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Email Templates
                  </CardTitle>
                  <CardDescription>
                    Reusable email templates for campaigns
                  </CardDescription>
                </div>
                <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-template">
                      <Plus className="w-4 h-4 mr-2" />
                      New Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Email Template</DialogTitle>
                      <DialogDescription>
                        Create a reusable template for your email campaigns.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...templateForm}>
                      <form onSubmit={templateForm.handleSubmit((data) => createTemplateMutation.mutate(data))} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={templateForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Template Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Welcome Email" {...field} data-testid="input-template-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={templateForm.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-template-category">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="welcome">Welcome</SelectItem>
                                    <SelectItem value="promotional">Promotional</SelectItem>
                                    <SelectItem value="digest">Digest</SelectItem>
                                    <SelectItem value="announcement">Announcement</SelectItem>
                                    <SelectItem value="transactional">Transactional</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={templateForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="A warm welcome email for new subscribers..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={templateForm.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Default Subject Line</FormLabel>
                              <FormControl>
                                <Input placeholder="Welcome to Our Newsletter!" {...field} data-testid="input-template-subject" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={templateForm.control}
                          name="htmlContent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>HTML Content</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="<h1>Welcome!</h1><p>Thank you for subscribing...</p>" 
                                  className="min-h-[200px] font-mono text-sm"
                                  {...field} 
                                  data-testid="textarea-template-contents"
                                />
                              </FormControl>
                              <FormDescription>
                                Use variables like {"{{firstName}}"}, {"{{unsubscribe_link}}"} for personalization.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createTemplateMutation.isPending} data-testid="button-save-template">
                            {createTemplateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Template
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No templates yet. Create your first reusable email template.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="hover-elevate" data-testid={`card-template-${template.id}`}>
                      <CardContent className="pt-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <h3 className="font-medium">{template.name}</h3>
                            {template.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                            )}
                          </div>
                          <Badge variant="secondary">{template.category || "general"}</Badge>
                        </div>
                        {template.subject && (
                          <p className="text-xs text-muted-foreground mt-2 truncate">
                            Subject: {template.subject}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t">
                          <span className="text-xs text-muted-foreground">
                            Used {template.usageCount || 0} times
                          </span>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-delete-template-${template.id}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the template "{template.name}". This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTemplateMutation.mutate(template.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drip Campaigns Tab */}
        <TabsContent value="drip-campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    Drip Campaigns
                  </CardTitle>
                  <CardDescription>
                    Automated email sequences triggered by user actions
                  </CardDescription>
                </div>
                <Button data-testid="button-create-drip-campaign">
                  <GitBranch className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Drip campaigns coming soon.</p>
                <p className="text-sm">Set up automated email sequences to nurture your subscribers.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  BarChart3,
  Users,
  CheckCircle,
  Trash2,
  Download,
  Star,
} from "lucide-react";
import { format } from "date-fns";
import type { Survey, SurveyResponse, SurveyQuestion } from "@shared/schema";

interface Analytics {
  totalResponses: number;
  completedResponses: number;
  survey: Survey;
  questionAnalytics: Record<string, {
    totalAnswers: number;
    answerDistribution: Record<string, number>;
  }>;
}

export default function SurveyResponsesPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("analytics");

  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ["/api/surveys", id, "analytics"],
  });

  const { data: responses, isLoading: responsesLoading } = useQuery<SurveyResponse[]>({
    queryKey: ["/api/surveys", id, "responses"],
  });

  const deleteMutation = useMutation({
    mutationFn: (responseId: string) =>
      apiRequest(`/api/surveys/${id}/responses/${responseId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", id] });
      toast({ title: "Response deleted successfully" });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete response", variant: "destructive" });
    },
  });

  const exportCSV = () => {
    if (!responses || !analytics?.survey) return;

    const questions = (analytics.survey.definition as any)?.questions || [];
    const headers = ["Response ID", "Email", "Name", "Completed", "Date", ...questions.map((q: SurveyQuestion) => q.title)];

    const rows = responses.map((response) => {
      const answers = questions.map((q: SurveyQuestion) => {
        const answer = response.answers[q.id];
        return Array.isArray(answer) ? answer.join("; ") : answer || "";
      });
      return [
        response.id,
        response.respondentEmail || "",
        response.respondentName || "",
        response.isComplete ? "Yes" : "No",
        format(new Date(response.createdAt!), "yyyy-MM-dd HH:mm"),
        ...answers,
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `survey-responses-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Responses exported successfully" });
  };

  const survey = analytics?.survey;
  const questions = (survey?.definition as any)?.questions || [];

  const renderAnswerChart = (question: SurveyQuestion, questionAnalytics: { totalAnswers: number; answerDistribution: Record<string, number> } | undefined) => {
    if (!questionAnalytics || questionAnalytics.totalAnswers === 0) {
      return <p className="text-sm text-muted-foreground">No responses yet</p>;
    }

    const distribution = questionAnalytics.answerDistribution;
    const total = questionAnalytics.totalAnswers;

    if (question.type === "rating") {
      const stars = [1, 2, 3, 4, 5];
      const totalRatings = stars.reduce((sum, star) => sum + (distribution[String(star)] || 0), 0);
      const avgRating = totalRatings > 0
        ? stars.reduce((sum, star) => sum + star * (distribution[String(star)] || 0), 0) / totalRatings
        : 0;

      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
            <div className="flex">
              {stars.map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${star <= Math.round(avgRating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">({totalRatings} ratings)</span>
          </div>
          <div className="space-y-1">
            {stars.map((star) => {
              const count = distribution[String(star)] || 0;
              const percent = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="w-4 text-sm">{star}</span>
                  <Progress value={percent} className="h-2 flex-1" />
                  <span className="w-16 text-xs text-muted-foreground text-right">{count} ({percent.toFixed(0)}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (question.type === "radio" || question.type === "checkbox" || question.type === "dropdown") {
      const options = question.options || [];
      return (
        <div className="space-y-2">
          {options.map((option) => {
            const count = distribution[option] || 0;
            const percent = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={option} className="flex items-center gap-2">
                <span className="flex-1 text-sm truncate">{option}</span>
                <Progress value={percent} className="w-32 h-2" />
                <span className="w-20 text-xs text-muted-foreground text-right">
                  {count} ({percent.toFixed(0)}%)
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    // For text/textarea, show sample answers
    const samples = Object.keys(distribution).slice(0, 5);
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{total} text responses</p>
        {samples.length > 0 && (
          <div className="space-y-1">
            {samples.map((sample, i) => (
              <p key={i} className="text-sm p-2 bg-muted/50 rounded">{sample}</p>
            ))}
            {Object.keys(distribution).length > 5 && (
              <p className="text-xs text-muted-foreground">...and {Object.keys(distribution).length - 5} more</p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (analyticsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/surveys")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{survey?.title || "Survey"} - Responses</h1>
            <p className="text-muted-foreground">View and analyze survey responses</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/admin/surveys/${id}`)} data-testid="button-edit">
            Edit Survey
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={!responses?.length} data-testid="button-export">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalResponses || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.completedResponses || 0}</div>
            {(analytics?.totalResponses || 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                {((analytics?.completedResponses || 0) / (analytics?.totalResponses || 1) * 100).toFixed(0)}% completion rate
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questions.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="responses" data-testid="tab-responses">Individual Responses</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          {questions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No questions in this survey</p>
              </CardContent>
            </Card>
          ) : (
            questions.map((question: SurveyQuestion, index: number) => (
              <Card key={question.id}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="shrink-0">{index + 1}</Badge>
                    <div>
                      <CardTitle className="text-base">{question.title || "Untitled Question"}</CardTitle>
                      {question.description && (
                        <p className="text-sm text-muted-foreground mt-1">{question.description}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderAnswerChart(question, analytics?.questionAnalytics[question.id])}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="responses">
          {responsesLoading ? (
            <Skeleton className="h-64" />
          ) : responses?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No responses yet</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses?.map((response) => (
                    <TableRow key={response.id} data-testid={`row-response-${response.id}`}>
                      <TableCell>{format(new Date(response.createdAt!), "MMM d, yyyy HH:mm")}</TableCell>
                      <TableCell>{response.respondentEmail || "-"}</TableCell>
                      <TableCell>{response.respondentName || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={response.isComplete ? "default" : "secondary"}>
                          {response.isComplete ? "Complete" : "Partial"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(response.id)}
                          data-testid={`button-delete-response-${response.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Response?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this survey response. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Send } from "lucide-react";
import type { SurveyQuestion, SurveyDefinition } from "@shared/schema";

interface PublicSurvey {
  id: string;
  title: string;
  description?: string;
  slug: string;
  definition: SurveyDefinition;
}

export default function PublicSurveyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [respondentEmail, setRespondentEmail] = useState("");
  const [respondentName, setRespondentName] = useState("");

  const { data: survey, isLoading, error } = useQuery<PublicSurvey>({
    queryKey: ["/api/public/surveys", slug],
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/public/surveys/${slug}/responses`, {
        method: "POST",
        body: JSON.stringify({
          answers,
          respondentEmail: respondentEmail || undefined,
          respondentName: respondentName || undefined,
          isComplete: true,
        }),
      });
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Failed to submit survey", variant: "destructive" });
    },
  });

  const questions = survey?.definition?.questions || [];

  const visibleQuestions = useMemo(() => {
    return questions.filter((question) => {
      if (!question.conditionalLogic?.enabled) return true;
      
      const { questionId, operator, value } = question.conditionalLogic;
      const answer = answers[questionId];
      
      if (!answer) return false;
      
      const answerStr = Array.isArray(answer) ? answer.join(",") : String(answer);
      const valueStr = Array.isArray(value) ? value.join(",") : String(value);
      
      switch (operator) {
        case "equals":
          return answerStr === valueStr;
        case "not_equals":
          return answerStr !== valueStr;
        case "contains":
          return answerStr.toLowerCase().includes(valueStr.toLowerCase());
        case "not_contains":
          return !answerStr.toLowerCase().includes(valueStr.toLowerCase());
        default:
          return true;
      }
    });
  }, [questions, answers]);

  const currentQuestion = visibleQuestions[currentStep];
  const totalSteps = visibleQuestions.length;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const setAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleCheckboxAnswer = (questionId: string, option: string, checked: boolean) => {
    const current = (answers[questionId] as string[]) || [];
    const updated = checked ? [...current, option] : current.filter((o) => o !== option);
    setAnswer(questionId, updated);
  };

  const canProceed = () => {
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;
    const answer = answers[currentQuestion.id];
    if (!answer) return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      submitMutation.mutate();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderQuestion = (question: SurveyQuestion) => {
    const answer = answers[question.id];

    switch (question.type) {
      case "text":
        return (
          <Input
            value={(answer as string) || ""}
            onChange={(e) => setAnswer(question.id, e.target.value)}
            placeholder={question.placeholder || "Your answer"}
            maxLength={question.maxLength}
            className="text-lg"
            data-testid={`input-question-${question.id}`}
          />
        );

      case "textarea":
        return (
          <Textarea
            value={(answer as string) || ""}
            onChange={(e) => setAnswer(question.id, e.target.value)}
            placeholder={question.placeholder || "Your answer"}
            maxLength={question.maxLength}
            className="min-h-[120px] text-base"
            data-testid={`textarea-question-${question.id}`}
          />
        );

      case "radio":
        return (
          <RadioGroup
            value={(answer as string) || ""}
            onValueChange={(value) => setAnswer(question.id, value)}
            className="space-y-3"
          >
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-3 p-3 rounded-md border hover-elevate">
                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                <Label htmlFor={`${question.id}-${option}`} className="flex-1 cursor-pointer text-base">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "checkbox":
        return (
          <div className="space-y-3">
            {question.options?.map((option) => {
              const isChecked = ((answer as string[]) || []).includes(option);
              return (
                <div key={option} className="flex items-center space-x-3 p-3 rounded-md border hover-elevate">
                  <Checkbox
                    id={`${question.id}-${option}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => toggleCheckboxAnswer(question.id, option, !!checked)}
                  />
                  <Label htmlFor={`${question.id}-${option}`} className="flex-1 cursor-pointer text-base">
                    {option}
                  </Label>
                </div>
              );
            })}
          </div>
        );

      case "rating":
        const ratingValue = parseInt((answer as string) || "0") || 0;
        const stars = [1, 2, 3, 4, 5];
        return (
          <div className="flex justify-center gap-2">
            {stars.map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setAnswer(question.id, String(star))}
                className="p-2 transition-transform hover:scale-110"
                data-testid={`rating-${question.id}-${star}`}
              >
                <Star
                  className={`h-10 w-10 transition-colors ${
                    star <= ratingValue ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
        );

      case "dropdown":
        return (
          <Select value={(answer as string) || ""} onValueChange={(value) => setAnswer(question.id, value)}>
            <SelectTrigger className="text-lg" data-testid={`select-question-${question.id}`}>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Survey Not Found</CardTitle>
            <CardDescription>
              This survey may have been closed or doesn't exist.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    const thankYouMessage = survey.definition?.settings?.thankYouMessage || "Thank you for completing the survey!";
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Survey Submitted</CardTitle>
            <CardDescription className="text-base">{thankYouMessage}</CardDescription>
          </CardHeader>
          {survey.definition?.settings?.redirectUrl && (
            <CardFooter className="justify-center">
              <Button onClick={() => window.location.href = survey.definition.settings!.redirectUrl!}>
                Continue
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    );
  }

  if (visibleQuestions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>{survey.title}</CardTitle>
            <CardDescription>This survey has no questions.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-4">
          <div>
            <CardTitle className="text-2xl">{survey.title}</CardTitle>
            {survey.description && <CardDescription className="text-base">{survey.description}</CardDescription>}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Question {currentStep + 1} of {totalSteps}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentQuestion && (
            <div className="space-y-4" key={currentQuestion.id}>
              <div>
                <h2 className="text-xl font-semibold flex items-start gap-2">
                  {currentQuestion.title}
                  {currentQuestion.required && <span className="text-destructive">*</span>}
                </h2>
                {currentQuestion.description && (
                  <p className="text-muted-foreground mt-1">{currentQuestion.description}</p>
                )}
              </div>
              {renderQuestion(currentQuestion)}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            data-testid="button-prev"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || submitMutation.isPending}
            data-testid="button-next"
          >
            {currentStep === totalSteps - 1 ? (
              <>
                {submitMutation.isPending ? "Submitting..." : "Submit"}
                <Send className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

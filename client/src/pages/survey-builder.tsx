import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  Plus,
  GripVertical,
  Trash2,
  Copy,
  Settings,
  Type,
  AlignLeft,
  CircleDot,
  CheckSquare,
  Star,
  ChevronDown,
  Eye,
  GitBranch,
  X,
} from "lucide-react";
import type { Survey, SurveyQuestion, SurveyDefinition } from "@shared/schema";

const questionTypeIcons: Record<string, typeof Type> = {
  text: Type,
  textarea: AlignLeft,
  radio: CircleDot,
  checkbox: CheckSquare,
  rating: Star,
  dropdown: ChevronDown,
};

const questionTypeLabels: Record<string, string> = {
  text: "Short Text",
  textarea: "Long Text",
  radio: "Single Choice",
  checkbox: "Multiple Choice",
  rating: "Rating (1-5 Stars)",
  dropdown: "Dropdown",
};

interface SortableQuestionProps {
  question: SurveyQuestion;
  questions: SurveyQuestion[];
  onUpdate: (id: string, updates: Partial<SurveyQuestion>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function SortableQuestion({ question, questions, onUpdate, onDelete, onDuplicate }: SortableQuestionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const [showConditions, setShowConditions] = useState(false);
  const Icon = questionTypeIcons[question.type] || Type;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(question.options || [])];
    newOptions[index] = value;
    onUpdate(question.id, { options: newOptions });
  };

  const addOption = () => {
    const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
    onUpdate(question.id, { options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = question.options?.filter((_, i) => i !== index);
    onUpdate(question.id, { options: newOptions });
  };

  const previousQuestions = questions.filter((q) => q.order < question.order);

  return (
    <Card ref={setNodeRef} style={style} className="border" data-testid={`question-card-${question.id}`}>
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
        <div {...attributes} {...listeners} className="cursor-grab pt-1">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="gap-1">
                <Icon className="h-3 w-3" />
                {questionTypeLabels[question.type]}
              </Badge>
              {question.required && <Badge variant="outline">Required</Badge>}
              {question.conditionalLogic?.enabled && (
                <Badge variant="outline" className="gap-1">
                  <GitBranch className="h-3 w-3" />
                  Conditional
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowConditions(!showConditions)}
                data-testid={`button-conditions-${question.id}`}
              >
                <GitBranch className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDuplicate(question.id)}
                data-testid={`button-duplicate-${question.id}`}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(question.id)}
                data-testid={`button-delete-${question.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Input
            value={question.title}
            onChange={(e) => onUpdate(question.id, { title: e.target.value })}
            placeholder="Question title"
            className="font-medium"
            data-testid={`input-question-title-${question.id}`}
          />
          <Input
            value={question.description || ""}
            onChange={(e) => onUpdate(question.id, { description: e.target.value })}
            placeholder="Description (optional)"
            className="text-sm"
            data-testid={`input-question-description-${question.id}`}
          />
        </div>
      </CardHeader>
      <CardContent className="pl-12 space-y-4">
        {(question.type === "radio" || question.type === "checkbox" || question.type === "dropdown") && (
          <div className="space-y-2">
            <Label>Options</Label>
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  data-testid={`input-option-${question.id}-${index}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(index)}
                  disabled={(question.options?.length || 0) <= 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addOption} data-testid={`button-add-option-${question.id}`}>
              <Plus className="h-4 w-4 mr-1" />
              Add Option
            </Button>
          </div>
        )}

        {(question.type === "text" || question.type === "textarea") && (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Placeholder</Label>
              <Input
                value={question.placeholder || ""}
                onChange={(e) => onUpdate(question.id, { placeholder: e.target.value })}
                placeholder="Enter placeholder text"
                data-testid={`input-placeholder-${question.id}`}
              />
            </div>
            <div className="w-24">
              <Label>Max Length</Label>
              <Input
                type="number"
                value={question.maxLength || ""}
                onChange={(e) => onUpdate(question.id, { maxLength: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="None"
                data-testid={`input-max-length-${question.id}`}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={question.required}
              onCheckedChange={(checked) => onUpdate(question.id, { required: checked })}
              data-testid={`switch-required-${question.id}`}
            />
            <Label>Required</Label>
          </div>
        </div>

        {showConditions && previousQuestions.length > 0 && (
          <div className="p-4 bg-muted/50 rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Conditional Logic</Label>
              <Switch
                checked={question.conditionalLogic?.enabled || false}
                onCheckedChange={(checked) =>
                  onUpdate(question.id, {
                    conditionalLogic: {
                      enabled: checked,
                      questionId: question.conditionalLogic?.questionId || previousQuestions[0]?.id || "",
                      operator: question.conditionalLogic?.operator || "equals",
                      value: question.conditionalLogic?.value || "",
                    },
                  })
                }
                data-testid={`switch-conditional-${question.id}`}
              />
            </div>
            {question.conditionalLogic?.enabled && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Show this question when...</p>
                <div className="grid gap-2 md:grid-cols-3">
                  <Select
                    value={question.conditionalLogic.questionId}
                    onValueChange={(value) =>
                      onUpdate(question.id, {
                        conditionalLogic: { ...question.conditionalLogic!, questionId: value },
                      })
                    }
                  >
                    <SelectTrigger data-testid={`select-condition-question-${question.id}`}>
                      <SelectValue placeholder="Select question" />
                    </SelectTrigger>
                    <SelectContent>
                      {previousQuestions.map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.title || `Question ${q.order + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={question.conditionalLogic.operator}
                    onValueChange={(value: any) =>
                      onUpdate(question.id, {
                        conditionalLogic: { ...question.conditionalLogic!, operator: value },
                      })
                    }
                  >
                    <SelectTrigger data-testid={`select-condition-operator-${question.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="not_equals">Not Equals</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="not_contains">Not Contains</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={typeof question.conditionalLogic.value === "string" ? question.conditionalLogic.value : ""}
                    onChange={(e) =>
                      onUpdate(question.id, {
                        conditionalLogic: { ...question.conditionalLogic!, value: e.target.value },
                      })
                    }
                    placeholder="Value"
                    data-testid={`input-condition-value-${question.id}`}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SurveyBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isNew = id === "new";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "closed" | "archived">("draft");
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: survey, isLoading } = useQuery<Survey>({
    queryKey: ["/api/surveys", id],
    enabled: !isNew,
  });

  useEffect(() => {
    if (survey) {
      setTitle(survey.title);
      setDescription(survey.description || "");
      setSlug(survey.slug);
      setStatus(survey.status);
      setQuestions((survey.definition as SurveyDefinition)?.questions || []);
    }
  }, [survey]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const definition: SurveyDefinition = { questions };
      const payload = {
        title,
        description,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        status,
        definition,
      };

      if (isNew) {
        const res = await apiRequest("/api/surveys", { method: "POST", body: JSON.stringify(payload) });
        return res.json() as Promise<{ id: string }>;
      } else {
        const res = await apiRequest(`/api/surveys/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
        return res.json() as Promise<{ id: string }>;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      toast({ title: isNew ? "Survey created successfully" : "Survey saved successfully" });
      if (isNew && data?.id) {
        navigate(`/admin/surveys/${data.id}`);
      }
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Failed to save survey", variant: "destructive" });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      const reordered = arrayMove(questions, oldIndex, newIndex).map((q, i) => ({ ...q, order: i }));
      setQuestions(reordered);
    }
  };

  const addQuestion = (type: SurveyQuestion["type"]) => {
    const newQuestion: SurveyQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      title: "",
      required: false,
      order: questions.length,
      ...(type === "radio" || type === "checkbox" || type === "dropdown" ? { options: ["Option 1", "Option 2"] } : {}),
      ...(type === "rating" ? { minRating: 1, maxRating: 5 } : {}),
    };
    setQuestions([...questions, newQuestion]);
    setShowAddQuestion(false);
  };

  const updateQuestion = (questionId: string, updates: Partial<SurveyQuestion>) => {
    setQuestions(questions.map((q) => (q.id === questionId ? { ...q, ...updates } : q)));
  };

  const deleteQuestion = (questionId: string) => {
    setQuestions(questions.filter((q) => q.id !== questionId).map((q, i) => ({ ...q, order: i })));
  };

  const duplicateQuestion = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (question) {
      const newQuestion: SurveyQuestion = {
        ...question,
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: `${question.title} (copy)`,
        order: questions.length,
      };
      setQuestions([...questions, newQuestion]);
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
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
            <h1 className="text-2xl font-bold">{isNew ? "Create Survey" : "Edit Survey"}</h1>
            <p className="text-muted-foreground">Build your survey with drag-and-drop questions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && status === "active" && (
            <Button
              variant="outline"
              onClick={() => window.open(`/survey/${slug}`, "_blank")}
              data-testid="button-preview"
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          )}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save">
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Survey Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Survey title"
                  data-testid="input-survey-title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this survey"
                  data-testid="input-survey-description"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                    placeholder="my-survey"
                    data-testid="input-survey-slug"
                  />
                  <p className="text-xs text-muted-foreground mt-1">/survey/{slug || "my-survey"}</p>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger data-testid="select-survey-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Questions ({questions.length})</h2>
            <Button onClick={() => setShowAddQuestion(true)} data-testid="button-add-question">
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>

          {questions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No questions yet</h3>
                <p className="text-muted-foreground text-center mb-4">Add your first question to start building the survey</p>
                <Button onClick={() => setShowAddQuestion(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </CardContent>
            </Card>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {questions.map((question) => (
                    <SortableQuestion
                      key={question.id}
                      question={question}
                      questions={questions}
                      onUpdate={updateQuestion}
                      onDelete={deleteQuestion}
                      onDuplicate={duplicateQuestion}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Questions</span>
                <span className="font-medium">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Required</span>
                <span className="font-medium">{questions.filter((q) => q.required).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conditional</span>
                <span className="font-medium">{questions.filter((q) => q.conditionalLogic?.enabled).length}</span>
              </div>
              {!isNew && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Responses</span>
                  <span className="font-medium">{survey?.responseCount || 0}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {!isNew && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate(`/admin/surveys/${id}/responses`)}
                  data-testid="button-view-responses"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  View Responses
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Question</DialogTitle>
            <DialogDescription>Choose a question type to add to your survey</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {Object.entries(questionTypeLabels).map(([type, label]) => {
              const Icon = questionTypeIcons[type];
              return (
                <Button
                  key={type}
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => addQuestion(type as SurveyQuestion["type"])}
                  data-testid={`button-add-${type}`}
                >
                  <Icon className="h-6 w-6" />
                  <span>{label}</span>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

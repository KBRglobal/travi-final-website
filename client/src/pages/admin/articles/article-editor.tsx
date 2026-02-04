import { useState, useCallback, useMemo, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Icons
import {
  Sparkles,
  Wand2,
  Save,
  Eye,
  ArrowLeft,
  FileText,
  Search,
  Share2,
  Settings,
  Image as ImageIcon,
  Link2,
  Tag,
  List,
  MessageSquare,
  HelpCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  ExternalLink,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Bell,
  Mail,
  BarChart3,
  Globe,
  BookOpen,
  Hash,
  RefreshCw,
} from "lucide-react";

// Hooks
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// Magic AI
import { MagicAIButton, type GeneratedContent } from "@/components/admin/MagicAIButton";

// =============================================================================
// TYPES & SCHEMA
// =============================================================================

const faqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
});

const galleryImageSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  alt: z.string().min(1, "Alt text is required"),
  caption: z.string().optional(),
});

const articleSchema = z.object({
  // Core Fields
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
  summary: z.string().max(500, "Summary is too long").optional(),
  body: z.string().min(1, "Body content is required"),
  tldr: z.array(z.string()).optional(),

  // SEO Fields
  primaryKeyword: z.string().optional(),
  secondaryKeywords: z.array(z.string()).optional(),
  metaTitle: z.string().max(60, "Meta title should be under 60 characters").optional(),
  metaDescription: z
    .string()
    .max(160, "Meta description should be under 160 characters")
    .optional(),

  // Media
  heroImage: z.string().url().optional().or(z.literal("")),
  heroImageAlt: z.string().optional(),
  galleryImages: z.array(galleryImageSchema).optional(),

  // Structure
  faqs: z.array(faqSchema).optional(),
  tableOfContents: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        level: z.number(),
      })
    )
    .optional(),
  internalLinks: z
    .array(
      z.object({
        text: z.string(),
        url: z.string(),
        position: z.string().optional(),
      })
    )
    .optional(),

  // Categorization
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  relatedArticles: z.array(z.string()).optional(),

  // Social Distribution
  facebookPost: z.string().optional(),
  twitterPost: z.string().max(280, "Twitter post must be under 280 characters").optional(),
  instagramCaption: z.string().optional(),
  linkedinPost: z.string().optional(),
  pushNotification: z
    .string()
    .max(100, "Push notification must be under 100 characters")
    .optional(),
  newsletterSubject: z
    .string()
    .max(80, "Newsletter subject should be under 80 characters")
    .optional(),

  // Settings
  status: z.enum(["draft", "review", "scheduled", "published"]),
  publishDate: z.string().optional(),
  author: z.string().optional(),
  isFeature: z.boolean().default(false),
  allowComments: z.boolean().default(true),
});

type ArticleFormData = z.infer<typeof articleSchema>;

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
}

// =============================================================================
// MAGIC FIELD WRAPPER COMPONENT
// =============================================================================

interface MagicFieldProps {
  label: string;
  description?: string;
  fieldName: string;
  context: Record<string, unknown>;
  onGenerated: (value: string) => void;
  children: React.ReactNode;
  characterLimit?: number;
  currentLength?: number;
}

function MagicField({
  label,
  description,
  fieldName,
  context,
  onGenerated,
  children,
  characterLimit,
  currentLength = 0,
}: MagicFieldProps) {
  const handleGenerated = useCallback(
    (results: GeneratedContent[]) => {
      if (results.length > 0 && results[0].value) {
        onGenerated(results[0].value);
      }
    },
    [onGenerated]
  );

  const isOverLimit = characterLimit && currentLength > characterLimit;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{label}</Label>
          {description && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-2">
          {characterLimit && (
            <span
              className={cn("text-xs", isOverLimit ? "text-destructive" : "text-muted-foreground")}
            >
              {currentLength}/{characterLimit}
            </span>
          )}
          <MagicAIButton
            field={fieldName}
            context={context}
            onGenerated={handleGenerated}
            variant="icon"
          />
        </div>
      </div>
      {children}
    </div>
  );
}

// =============================================================================
// SEO SCORE COMPONENT
// =============================================================================

interface SEOScoreProps {
  title: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  body: string;
}

function SEOScoreIndicator({
  title,
  metaTitle,
  metaDescription,
  primaryKeyword,
  body,
}: SEOScoreProps) {
  const scores = useMemo(() => {
    const items: { name: string; score: number; message: string }[] = [];

    // Title score
    const titleLen = (metaTitle || title).length;
    if (titleLen >= 30 && titleLen <= 60) {
      items.push({ name: "Title Length", score: 100, message: "Perfect length" });
    } else if (titleLen > 0) {
      items.push({
        name: "Title Length",
        score: 50,
        message: titleLen < 30 ? "Too short" : "Too long",
      });
    } else {
      items.push({ name: "Title Length", score: 0, message: "Missing" });
    }

    // Meta description score
    const descLen = metaDescription.length;
    if (descLen >= 120 && descLen <= 160) {
      items.push({ name: "Meta Description", score: 100, message: "Perfect length" });
    } else if (descLen > 0) {
      items.push({
        name: "Meta Description",
        score: 50,
        message: descLen < 120 ? "Too short" : "Too long",
      });
    } else {
      items.push({ name: "Meta Description", score: 0, message: "Missing" });
    }

    // Primary keyword score
    if (primaryKeyword) {
      const keywordInTitle = (metaTitle || title)
        .toLowerCase()
        .includes(primaryKeyword.toLowerCase());
      const keywordInDesc = metaDescription.toLowerCase().includes(primaryKeyword.toLowerCase());
      const keywordInBody = body.toLowerCase().includes(primaryKeyword.toLowerCase());

      let kwScore = 0;
      if (keywordInTitle) kwScore += 40;
      if (keywordInDesc) kwScore += 30;
      if (keywordInBody) kwScore += 30;

      items.push({
        name: "Keyword Usage",
        score: kwScore,
        message:
          kwScore === 100
            ? "Used in title, description & body"
            : kwScore >= 70
              ? "Good usage"
              : "Could improve keyword placement",
      });
    } else {
      items.push({ name: "Keyword Usage", score: 0, message: "No primary keyword set" });
    }

    // Content length score
    const wordCount = body.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 1500) {
      items.push({ name: "Content Length", score: 100, message: `${wordCount} words - Excellent` });
    } else if (wordCount >= 800) {
      items.push({ name: "Content Length", score: 70, message: `${wordCount} words - Good` });
    } else if (wordCount >= 300) {
      items.push({ name: "Content Length", score: 40, message: `${wordCount} words - Short` });
    } else {
      items.push({ name: "Content Length", score: 20, message: `${wordCount} words - Too short` });
    }

    return items;
  }, [title, metaTitle, metaDescription, primaryKeyword, body]);

  const overallScore = useMemo(() => {
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((sum, item) => sum + item.score, 0) / scores.length);
  }, [scores]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (score >= 50) return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            SEO Score
          </div>
          <Badge
            variant={
              overallScore >= 80 ? "default" : overallScore >= 50 ? "secondary" : "destructive"
            }
            className="text-lg px-3"
          >
            {overallScore}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {scores.map(item => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {getScoreIcon(item.score)}
              <span>{item.name}</span>
            </div>
            <span className={cn("text-xs", getScoreColor(item.score))}>{item.message}</span>
          </div>
        ))}
        <Separator />
        <Progress value={overallScore} className="h-2" />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// WORD COUNT DISPLAY
// =============================================================================

function WordCountDisplay({ text }: { text: string }) {
  const stats = useMemo(() => {
    const words = text.split(/\s+/).filter(Boolean).length;
    const characters = text.length;
    const readingTime = Math.ceil(words / 200);
    return { words, characters, readingTime };
  }, [text]);

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span>{stats.words.toLocaleString()} words</span>
      <span>{stats.characters.toLocaleString()} characters</span>
      <span>{stats.readingTime} min read</span>
    </div>
  );
}

// =============================================================================
// PREVIEW PANEL
// =============================================================================

interface PreviewPanelProps {
  article: ArticleFormData;
}

function PreviewPanel({ article }: PreviewPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4" />
          Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-300px)]">
          <article className="prose prose-sm dark:prose-invert max-w-none">
            {article.heroImage && (
              <img
                src={article.heroImage}
                alt={article.heroImageAlt || article.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}
            <h1 className="text-2xl font-bold mb-2">{article.title || "Untitled Article"}</h1>
            {article.summary && (
              <p className="text-muted-foreground italic border-l-4 pl-4 mb-4">{article.summary}</p>
            )}
            {article.tldr && article.tldr.length > 0 && (
              <div className="bg-muted p-4 rounded-lg mb-4">
                <h3 className="font-semibold text-sm mb-2">TL;DR</h3>
                <ul className="list-disc list-inside space-y-1">
                  {article.tldr.map((point, idx) => (
                    <li key={idx} className="text-sm">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: article.body
                  .replace(/^# (.*$)/gim, "<h1>$1</h1>")
                  .replace(/^## (.*$)/gim, "<h2>$1</h2>")
                  .replace(/^### (.*$)/gim, "<h3>$1</h3>")
                  .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
                  .replace(/\*(.*)\*/gim, "<em>$1</em>")
                  .replace(/\n/gim, "<br/>"),
              }}
            />
            {article.faqs && article.faqs.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
                <Accordion type="single" collapsible className="w-full">
                  {article.faqs.map((faq, idx) => (
                    <AccordionItem key={idx} value={`faq-${idx}`}>
                      <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                      <AccordionContent>{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </article>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN ARTICLE EDITOR COMPONENT
// =============================================================================

export default function ArticleEditor() {
  const [, params] = useRoute("/admin/articles/:id");
  const [, setLocation] = useLocation();
  const { id: articleId = "" } = params ?? {};
  const isNewArticle = !articleId || articleId === "new";

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("content");
  const [showPreview, setShowPreview] = useState(false);
  const [isMagicAllRunning, setIsMagicAllRunning] = useState(false);

  // Form setup
  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      slug: "",
      summary: "",
      body: "",
      tldr: [],
      primaryKeyword: "",
      secondaryKeywords: [],
      metaTitle: "",
      metaDescription: "",
      heroImage: "",
      heroImageAlt: "",
      galleryImages: [],
      faqs: [],
      tableOfContents: [],
      internalLinks: [],
      categoryId: "",
      tags: [],
      relatedArticles: [],
      facebookPost: "",
      twitterPost: "",
      instagramCaption: "",
      linkedinPost: "",
      pushNotification: "",
      newsletterSubject: "",
      status: "draft",
      publishDate: "",
      author: "",
      isFeature: false,
      allowComments: true,
    },
  });

  const {
    fields: faqFields,
    append: appendFaq,
    remove: removeFaq,
  } = useFieldArray({
    control: form.control,
    name: "faqs",
  });

  const {
    fields: galleryFields,
    append: appendGallery,
    remove: removeGallery,
  } = useFieldArray({
    control: form.control,
    name: "galleryImages",
  });

  const {
    fields: tldrFields,
    append: appendTldr,
    remove: removeTldr,
  } = useFieldArray({
    control: form.control,
    name: "tldr" as any,
  });

  // Watch form values
  const watchedValues = form.watch();
  const watchedTitle = form.watch("title");
  const watchedBody = form.watch("body");
  const watchedMetaTitle = form.watch("metaTitle");
  const watchedMetaDescription = form.watch("metaDescription");
  const watchedPrimaryKeyword = form.watch("primaryKeyword");
  const watchedTwitterPost = form.watch("twitterPost");
  const watchedPushNotification = form.watch("pushNotification");
  const watchedNewsletterSubject = form.watch("newsletterSubject");

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/admin/categories"],
  });

  // Fetch existing articles for related articles
  const { data: existingArticles = [] } = useQuery<Article[]>({
    queryKey: ["/api/admin/articles", { limit: 100 }],
  });

  // Fetch article data if editing
  const { data: articleData, isLoading: isLoadingArticle } = useQuery<ArticleFormData>({
    queryKey: [`/api/admin/articles/${articleId}`],
    enabled: !isNewArticle,
  });

  // Populate form with fetched data
  useEffect(() => {
    if (articleData) {
      form.reset(articleData);
    }
  }, [articleData, form]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ArticleFormData) => {
      const url = isNewArticle ? "/api/admin/articles" : `/api/admin/articles/${articleId}`;
      const method = isNewArticle ? "POST" : "PATCH";
      return apiRequest(url, { method, body: data });
    },
    onSuccess: response => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/articles"] });
      toast({
        title: "Article saved",
        description: "Your article has been saved successfully.",
      });
      const data = response as unknown as { id?: string };
      if (isNewArticle && data?.id) {
        setLocation(`/admin/articles/${data.id}`);
      }
    },
    onError: error => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save article.",
        variant: "destructive",
      });
    },
  });

  // Generate slug from title
  const generateSlug = useCallback((title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }, []);

  // Auto-generate slug when title changes
  useEffect(() => {
    if (watchedTitle && !form.getValues("slug")) {
      form.setValue("slug", generateSlug(watchedTitle));
    }
  }, [watchedTitle, form, generateSlug]);

  // Magic All - Generate entire article from topic
  const handleMagicAll = async () => {
    const topic = form.getValues("title");
    if (!topic) {
      toast({
        title: "Topic required",
        description: "Please enter a title/topic first to generate the article.",
        variant: "destructive",
      });
      return;
    }

    setIsMagicAllRunning(true);
    toast({
      title: "Magic All Started",
      description: "Generating complete article content...",
    });

    try {
      // Generate all fields via API
      const response = await apiRequest("/api/ai/generate-article", {
        method: "POST",
        body: { topic, generateAll: true },
      });

      const generatedData = response as unknown as Record<string, unknown>;
      if (generatedData) {
        // Populate all fields from response
        if (generatedData.slug) form.setValue("slug", generatedData.slug as string);
        if (generatedData.summary) form.setValue("summary", generatedData.summary as string);
        if (generatedData.body) form.setValue("body", generatedData.body as string);
        if (generatedData.tldr) form.setValue("tldr", generatedData.tldr as string[]);
        if (generatedData.primaryKeyword)
          form.setValue("primaryKeyword", generatedData.primaryKeyword as string);
        if (generatedData.secondaryKeywords)
          form.setValue("secondaryKeywords", generatedData.secondaryKeywords as string[]);
        if (generatedData.metaTitle) form.setValue("metaTitle", generatedData.metaTitle as string);
        if (generatedData.metaDescription)
          form.setValue("metaDescription", generatedData.metaDescription as string);
        if (generatedData.heroImageAlt)
          form.setValue("heroImageAlt", generatedData.heroImageAlt as string);
        if (generatedData.faqs)
          form.setValue("faqs", generatedData.faqs as { question: string; answer: string }[]);
        if (generatedData.tags) form.setValue("tags", generatedData.tags as string[]);
        if (generatedData.facebookPost)
          form.setValue("facebookPost", generatedData.facebookPost as string);
        if (generatedData.twitterPost)
          form.setValue("twitterPost", generatedData.twitterPost as string);
        if (generatedData.instagramCaption)
          form.setValue("instagramCaption", generatedData.instagramCaption as string);
        if (generatedData.linkedinPost)
          form.setValue("linkedinPost", generatedData.linkedinPost as string);
        if (generatedData.pushNotification)
          form.setValue("pushNotification", generatedData.pushNotification as string);
        if (generatedData.newsletterSubject)
          form.setValue("newsletterSubject", generatedData.newsletterSubject as string);

        toast({
          title: "Magic All Complete",
          description: "Article content has been generated successfully!",
        });
      }
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate article.",
        variant: "destructive",
      });
    } finally {
      setIsMagicAllRunning(false);
    }
  };

  // Generate Table of Contents from body
  const generateTableOfContents = useCallback(() => {
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const toc: { id: string; text: string; level: number }[] = [];
    let match;

    while ((match = headingRegex.exec(watchedBody)) !== null) {
      const level = match[1].length;
      const text = match[2];
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      toc.push({ id, text, level });
    }

    form.setValue("tableOfContents", toc);
    toast({
      title: "Table of Contents Generated",
      description: `Found ${toc.length} headings.`,
    });
  }, [watchedBody, form, toast]);

  // Form submission
  const onSubmit = (data: ArticleFormData) => {
    saveMutation.mutate(data);
  };

  // Build context for Magic AI
  const getFieldContext = useCallback(() => {
    return {
      title: watchedTitle,
      body: watchedBody,
      summary: form.getValues("summary"),
      primaryKeyword: watchedPrimaryKeyword,
      category: categories.find(c => c.id === form.getValues("categoryId"))?.name,
    };
  }, [watchedTitle, watchedBody, watchedPrimaryKeyword, categories, form]);

  if (!isNewArticle && isLoadingArticle) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/articles")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isNewArticle ? "Create Article" : "Edit Article"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isNewArticle
                  ? "Create a new article with AI assistance"
                  : `Editing: ${watchedTitle || "Untitled"}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleMagicAll}
              disabled={isMagicAllRunning || !watchedTitle}
              className="gap-2"
            >
              {isMagicAllRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Magic All
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? "Hide Preview" : "Preview"}
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Article
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className={cn("grid gap-6", showPreview ? "lg:grid-cols-2" : "grid-cols-1")}>
          {/* Editor Panel */}
          <div className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="content" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Content
                    </TabsTrigger>
                    <TabsTrigger value="seo" className="gap-2">
                      <Search className="h-4 w-4" />
                      SEO
                    </TabsTrigger>
                    <TabsTrigger value="social" className="gap-2">
                      <Share2 className="h-4 w-4" />
                      Social
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </TabsTrigger>
                  </TabsList>

                  {/* ============================================================= */}
                  {/* CONTENT TAB */}
                  {/* ============================================================= */}
                  <TabsContent value="content" className="space-y-6 mt-6">
                    {/* Core Fields Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          Core Content
                        </CardTitle>
                        <CardDescription>
                          Main article content with Magic AI assistance
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Title */}
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <MagicField
                                label="Title"
                                description="The main headline of your article"
                                fieldName="headline"
                                context={getFieldContext()}
                                onGenerated={value => form.setValue("title", value)}
                                characterLimit={200}
                                currentLength={field.value?.length || 0}
                              >
                                <FormControl>
                                  <Input
                                    placeholder="Enter article title..."
                                    {...field}
                                    className="text-lg font-semibold"
                                  />
                                </FormControl>
                              </MagicField>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Slug */}
                        <FormField
                          control={form.control}
                          name="slug"
                          render={({ field }) => (
                            <FormItem>
                              <MagicField
                                label="Slug"
                                description="URL-friendly version of the title"
                                fieldName="slug"
                                context={getFieldContext()}
                                onGenerated={value => form.setValue("slug", generateSlug(value))}
                              >
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input placeholder="article-url-slug" {...field} />
                                  </FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() =>
                                      form.setValue("slug", generateSlug(watchedTitle))
                                    }
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                </div>
                              </MagicField>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Summary/Excerpt */}
                        <FormField
                          control={form.control}
                          name="summary"
                          render={({ field }) => (
                            <FormItem>
                              <MagicField
                                label="Summary/Excerpt"
                                description="Brief summary shown in article cards and previews"
                                fieldName="summary"
                                context={getFieldContext()}
                                onGenerated={value => form.setValue("summary", value)}
                                characterLimit={500}
                                currentLength={field.value?.length || 0}
                              >
                                <FormControl>
                                  <Textarea
                                    placeholder="Write a brief summary of the article..."
                                    rows={3}
                                    {...field}
                                  />
                                </FormControl>
                              </MagicField>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Body Content */}
                        <FormField
                          control={form.control}
                          name="body"
                          render={({ field }) => (
                            <FormItem>
                              <MagicField
                                label="Body Content"
                                description="Main article content (supports Markdown)"
                                fieldName="article_body"
                                context={getFieldContext()}
                                onGenerated={value => form.setValue("body", value)}
                              >
                                <FormControl>
                                  <Textarea
                                    placeholder="Write your article content here... (Markdown supported)"
                                    rows={15}
                                    className="font-mono text-sm"
                                    {...field}
                                  />
                                </FormControl>
                              </MagicField>
                              <WordCountDisplay text={field.value || ""} />
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* TLDR */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label>TL;DR (Key Points)</Label>
                              <MagicAIButton
                                field="tldr"
                                context={getFieldContext()}
                                onGenerated={results => {
                                  if (results[0]?.value) {
                                    const points = results[0].value
                                      .split("\n")
                                      .filter(p => p.trim())
                                      .map(p => p.replace(/^[-*]\s*/, "").trim());
                                    form.setValue("tldr", points);
                                  }
                                }}
                                variant="icon"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => appendTldr("" as any)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Point
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {(form.watch("tldr") || []).map((_, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <Input
                                  {...form.register(`tldr.${idx}` as any)}
                                  placeholder={`Key point ${idx + 1}`}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeTldr(idx)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Media Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ImageIcon className="h-5 w-5" />
                          Media
                        </CardTitle>
                        <CardDescription>Hero image and gallery</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Hero Image */}
                        <FormField
                          control={form.control}
                          name="heroImage"
                          render={({ field }) => (
                            <FormItem>
                              <MagicField
                                label="Hero Image URL"
                                description="Main image for the article"
                                fieldName="hero_image"
                                context={getFieldContext()}
                                onGenerated={value => form.setValue("heroImage", value)}
                              >
                                <FormControl>
                                  <Input placeholder="https://example.com/image.jpg" {...field} />
                                </FormControl>
                              </MagicField>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Hero Image Preview */}
                        {form.watch("heroImage") && (
                          <div className="border rounded-lg overflow-hidden">
                            <img
                              src={form.watch("heroImage")}
                              alt="Hero preview"
                              className="w-full h-48 object-cover"
                              onError={e => {
                                (e.target as HTMLImageElement).src =
                                  "https://via.placeholder.com/800x400?text=Image+Not+Found";
                              }}
                            />
                          </div>
                        )}

                        {/* Hero Image Alt Text */}
                        <FormField
                          control={form.control}
                          name="heroImageAlt"
                          render={({ field }) => (
                            <FormItem>
                              <MagicField
                                label="Hero Image Alt Text"
                                description="Descriptive text for accessibility and SEO"
                                fieldName="image_alt"
                                context={getFieldContext()}
                                onGenerated={value => form.setValue("heroImageAlt", value)}
                              >
                                <FormControl>
                                  <Input placeholder="Describe the image..." {...field} />
                                </FormControl>
                              </MagicField>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Gallery Images */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label>Gallery Images</Label>
                              <MagicAIButton
                                field="gallery_images"
                                context={getFieldContext()}
                                onGenerated={results => {
                                  if (results[0]?.value) {
                                    try {
                                      const images = JSON.parse(results[0].value);
                                      form.setValue("galleryImages", images);
                                    } catch {
                                      // Handle parsing error
                                    }
                                  }
                                }}
                                variant="icon"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => appendGallery({ url: "", alt: "", caption: "" })}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Image
                            </Button>
                          </div>
                          <div className="space-y-3">
                            {galleryFields.map((field, idx) => (
                              <div key={field.id} className="border rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Image {idx + 1}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeGallery(idx)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                                <Input
                                  {...form.register(`galleryImages.${idx}.url`)}
                                  placeholder="Image URL"
                                />
                                <Input
                                  {...form.register(`galleryImages.${idx}.alt`)}
                                  placeholder="Alt text"
                                />
                                <Input
                                  {...form.register(`galleryImages.${idx}.caption`)}
                                  placeholder="Caption (optional)"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Structure Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <List className="h-5 w-5" />
                          Structure
                        </CardTitle>
                        <CardDescription>
                          FAQs, Table of Contents, and Internal Links
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* FAQs */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label>Frequently Asked Questions</Label>
                              <MagicAIButton
                                field="faqs"
                                context={getFieldContext()}
                                onGenerated={results => {
                                  if (results[0]?.value) {
                                    try {
                                      const faqs = JSON.parse(results[0].value);
                                      form.setValue("faqs", faqs);
                                    } catch {
                                      // Try parsing as text format
                                      const lines = results[0].value
                                        .split("\n")
                                        .filter(l => l.trim());
                                      const parsedFaqs: { question: string; answer: string }[] = [];
                                      for (let i = 0; i < lines.length; i += 2) {
                                        if (lines[i] && lines[i + 1]) {
                                          parsedFaqs.push({
                                            question: lines[i].replace(/^Q:\s*/i, ""),
                                            answer: lines[i + 1].replace(/^A:\s*/i, ""),
                                          });
                                        }
                                      }
                                      if (parsedFaqs.length > 0) {
                                        form.setValue("faqs", parsedFaqs);
                                      }
                                    }
                                  }
                                }}
                                variant="icon"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => appendFaq({ question: "", answer: "" })}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add FAQ
                            </Button>
                          </div>
                          <div className="space-y-3">
                            {faqFields.map((field, idx) => (
                              <div key={field.id} className="border rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">FAQ {idx + 1}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeFaq(idx)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                                <Input
                                  {...form.register(`faqs.${idx}.question`)}
                                  placeholder="Question"
                                />
                                <Textarea
                                  {...form.register(`faqs.${idx}.answer`)}
                                  placeholder="Answer"
                                  rows={2}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <Separator />

                        {/* Table of Contents */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label>Table of Contents</Label>
                              <MagicAIButton
                                field="table_of_contents"
                                context={getFieldContext()}
                                onGenerated={() => generateTableOfContents()}
                                variant="icon"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={generateTableOfContents}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Auto-Generate
                            </Button>
                          </div>
                          {form.watch("tableOfContents")?.length ? (
                            <div className="border rounded-lg p-3 space-y-1">
                              {form.watch("tableOfContents")?.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="text-sm"
                                  style={{ paddingLeft: `${(item.level - 1) * 16}px` }}
                                >
                                  <a href={`#${item.id}`} className="text-primary hover:underline">
                                    {item.text}
                                  </a>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Add headings in your content to generate a table of contents.
                            </p>
                          )}
                        </div>

                        <Separator />

                        {/* Internal Links */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label>Internal Links Suggestions</Label>
                            <MagicAIButton
                              field="internal_links"
                              context={getFieldContext()}
                              onGenerated={results => {
                                if (results[0]?.value) {
                                  try {
                                    const links = JSON.parse(results[0].value);
                                    form.setValue("internalLinks", links);
                                  } catch {
                                    // Handle parsing error
                                  }
                                }
                              }}
                              variant="icon"
                            />
                          </div>
                          {form.watch("internalLinks")?.length ? (
                            <div className="space-y-2">
                              {form.watch("internalLinks")?.map((link, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <Link2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{link.text}</span>
                                  <span className="text-muted-foreground">-</span>
                                  <a href={link.url} className="text-primary hover:underline">
                                    {link.url}
                                  </a>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Use Magic AI to suggest internal link placements.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Categorization Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Tag className="h-5 w-5" />
                          Categorization
                        </CardTitle>
                        <CardDescription>Category, tags, and related articles</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Category */}
                        <FormField
                          control={form.control}
                          name="categoryId"
                          render={({ field }) => (
                            <FormItem>
                              <MagicField
                                label="Category"
                                description="Main category for the article"
                                fieldName="category"
                                context={getFieldContext()}
                                onGenerated={value => {
                                  const category = categories.find(
                                    c => c.name.toLowerCase() === value.toLowerCase()
                                  );
                                  if (category) {
                                    form.setValue("categoryId", category.id);
                                  }
                                }}
                              >
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {categories.map(category => (
                                      <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </MagicField>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Tags */}
                        <FormField
                          control={form.control}
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <MagicField
                                label="Tags"
                                description="Comma-separated tags for the article"
                                fieldName="tags"
                                context={getFieldContext()}
                                onGenerated={value => {
                                  const tags = value
                                    .split(",")
                                    .map(t => t.trim())
                                    .filter(Boolean);
                                  form.setValue("tags", tags);
                                }}
                              >
                                <FormControl>
                                  <Input
                                    placeholder="travel, tips, destinations"
                                    value={field.value?.join(", ") || ""}
                                    onChange={e => {
                                      const tags = e.target.value
                                        .split(",")
                                        .map(t => t.trim())
                                        .filter(Boolean);
                                      field.onChange(tags);
                                    }}
                                  />
                                </FormControl>
                              </MagicField>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {field.value?.map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="gap-1">
                                    <Hash className="h-3 w-3" />
                                    {tag}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newTags = [...(field.value || [])];
                                        newTags.splice(idx, 1);
                                        field.onChange(newTags);
                                      }}
                                      className="ml-1 hover:text-destructive"
                                    >
                                      <XCircle className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Related Articles */}
                        <FormField
                          control={form.control}
                          name="relatedArticles"
                          render={({ field }) => (
                            <FormItem>
                              <MagicField
                                label="Related Articles"
                                description="Suggest related content to readers"
                                fieldName="related_articles"
                                context={getFieldContext()}
                                onGenerated={value => {
                                  try {
                                    const related = JSON.parse(value);
                                    form.setValue("relatedArticles", related);
                                  } catch {
                                    // Handle parsing error
                                  }
                                }}
                              >
                                <Select
                                  onValueChange={value => {
                                    const current = field.value || [];
                                    if (!current.includes(value)) {
                                      field.onChange([...current, value]);
                                    }
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Add related articles" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {existingArticles
                                      .filter(a => a.id !== articleId)
                                      .map(article => (
                                        <SelectItem key={article.id} value={article.id}>
                                          {article.title}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </MagicField>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {field.value?.map((id, idx) => {
                                  const article = existingArticles.find(a => a.id === id);
                                  return (
                                    <Badge key={idx} variant="outline" className="gap-1">
                                      <FileText className="h-3 w-3" />
                                      {article?.title || id}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newRelated = [...(field.value || [])];
                                          newRelated.splice(idx, 1);
                                          field.onChange(newRelated);
                                        }}
                                        className="ml-1 hover:text-destructive"
                                      >
                                        <XCircle className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  );
                                })}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ============================================================= */}
                  {/* SEO TAB */}
                  {/* ============================================================= */}
                  <TabsContent value="seo" className="space-y-6 mt-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* SEO Fields */}
                      <div className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Search className="h-5 w-5" />
                              Keywords
                            </CardTitle>
                            <CardDescription>
                              Primary and secondary keywords for SEO optimization
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {/* Primary Keyword */}
                            <FormField
                              control={form.control}
                              name="primaryKeyword"
                              render={({ field }) => (
                                <FormItem>
                                  <MagicField
                                    label="Primary Keyword"
                                    description="Main keyword to target for this article"
                                    fieldName="primary_keyword"
                                    context={getFieldContext()}
                                    onGenerated={value => form.setValue("primaryKeyword", value)}
                                  >
                                    <FormControl>
                                      <Input
                                        placeholder="e.g., best travel destinations 2024"
                                        {...field}
                                      />
                                    </FormControl>
                                  </MagicField>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Secondary Keywords */}
                            <FormField
                              control={form.control}
                              name="secondaryKeywords"
                              render={({ field }) => (
                                <FormItem>
                                  <MagicField
                                    label="Secondary Keywords (LSI)"
                                    description="Related keywords to improve semantic relevance"
                                    fieldName="secondary_keywords"
                                    context={getFieldContext()}
                                    onGenerated={value => {
                                      const keywords = value
                                        .split(",")
                                        .map(k => k.trim())
                                        .filter(Boolean);
                                      form.setValue("secondaryKeywords", keywords);
                                    }}
                                  >
                                    <FormControl>
                                      <Input
                                        placeholder="travel tips, vacation planning, tourism"
                                        value={field.value?.join(", ") || ""}
                                        onChange={e => {
                                          const keywords = e.target.value
                                            .split(",")
                                            .map(k => k.trim())
                                            .filter(Boolean);
                                          field.onChange(keywords);
                                        }}
                                      />
                                    </FormControl>
                                  </MagicField>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {field.value?.map((keyword, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Globe className="h-5 w-5" />
                              Meta Tags
                            </CardTitle>
                            <CardDescription>Search engine optimization metadata</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {/* Meta Title */}
                            <FormField
                              control={form.control}
                              name="metaTitle"
                              render={({ field }) => (
                                <FormItem>
                                  <MagicField
                                    label="Meta Title"
                                    description="Title shown in search results"
                                    fieldName="meta_title"
                                    context={getFieldContext()}
                                    onGenerated={value => form.setValue("metaTitle", value)}
                                    characterLimit={60}
                                    currentLength={field.value?.length || 0}
                                  >
                                    <FormControl>
                                      <Input
                                        placeholder={watchedTitle || "Enter meta title..."}
                                        {...field}
                                      />
                                    </FormControl>
                                  </MagicField>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Meta Description */}
                            <FormField
                              control={form.control}
                              name="metaDescription"
                              render={({ field }) => (
                                <FormItem>
                                  <MagicField
                                    label="Meta Description"
                                    description="Description shown in search results"
                                    fieldName="meta_description"
                                    context={getFieldContext()}
                                    onGenerated={value => form.setValue("metaDescription", value)}
                                    characterLimit={160}
                                    currentLength={field.value?.length || 0}
                                  >
                                    <FormControl>
                                      <Textarea
                                        placeholder="Write a compelling meta description..."
                                        rows={3}
                                        {...field}
                                      />
                                    </FormControl>
                                  </MagicField>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* SERP Preview */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">SERP Preview</Label>
                              <div className="border rounded-lg p-4 bg-muted/50 space-y-1">
                                <div className="text-blue-600 text-lg hover:underline cursor-pointer truncate">
                                  {watchedMetaTitle || watchedTitle || "Article Title"}
                                </div>
                                <div className="text-green-700 text-sm">
                                  example.com/articles/{form.watch("slug") || "article-slug"}
                                </div>
                                <div className="text-sm text-muted-foreground line-clamp-2">
                                  {watchedMetaDescription ||
                                    form.watch("summary") ||
                                    "Article description will appear here..."}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* SEO Score */}
                      <div className="space-y-6">
                        <SEOScoreIndicator
                          title={watchedTitle || ""}
                          metaTitle={watchedMetaTitle || ""}
                          metaDescription={watchedMetaDescription || ""}
                          primaryKeyword={watchedPrimaryKeyword || ""}
                          body={watchedBody || ""}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* ============================================================= */}
                  {/* SOCIAL TAB */}
                  {/* ============================================================= */}
                  <TabsContent value="social" className="space-y-6 mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Share2 className="h-5 w-5" />
                          Social Distribution
                        </CardTitle>
                        <CardDescription>
                          Generate optimized posts for each social platform
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Facebook */}
                        <FormField
                          control={form.control}
                          name="facebookPost"
                          render={({ field }) => (
                            <FormItem>
                              <MagicField
                                label="Facebook Post"
                                description="Engaging post for Facebook"
                                fieldName="facebook_post"
                                context={getFieldContext()}
                                onGenerated={value => form.setValue("facebookPost", value)}
                              >
                                <div className="flex items-start gap-2">
                                  <Facebook className="h-5 w-5 text-blue-600 mt-2" />
                                  <FormControl>
                                    <Textarea
                                      placeholder="Write an engaging Facebook post..."
                                      rows={4}
                                      {...field}
                                    />
                                  </FormControl>
                                </div>
                              </MagicField>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Twitter */}
                        <FormField
                          control={form.control}
                          name="twitterPost"
                          render={({ field }) => (
                            <FormItem>
                              <MagicField
                                label="Twitter/X Post"
                                description="Concise post for Twitter (max 280 characters)"
                                fieldName="twitter_post"
                                context={getFieldContext()}
                                onGenerated={value =>
                                  form.setValue("twitterPost", value.slice(0, 280))
                                }
                                characterLimit={280}
                                currentLength={field.value?.length || 0}
                              >
                                <div className="flex items-start gap-2">
                                  <Twitter className="h-5 w-5 text-sky-500 mt-2" />
                                  <FormControl>
                                    <Textarea
                                      placeholder="Write a tweet..."
                                      rows={3}
                                      maxLength={280}
                                      {...field}
                                    />
                                  </FormControl>
                                </div>
                              </MagicField>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Instagram */}
                        <FormField
                          control={form.control}
                          name="instagramCaption"
                          render={({ field }) => (
                            <FormItem>
                              <MagicField
                                label="Instagram Caption"
                                description="Caption with hashtags for Instagram"
                                fieldName="instagram_caption"
                                context={getFieldContext()}
                                onGenerated={value => form.setValue("instagramCaption", value)}
                              >
                                <div className="flex items-start gap-2">
                                  <Instagram className="h-5 w-5 text-pink-600 mt-2" />
                                  <FormControl>
                                    <Textarea
                                      placeholder="Write an Instagram caption with hashtags..."
                                      rows={5}
                                      {...field}
                                    />
                                  </FormControl>
                                </div>
                              </MagicField>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* LinkedIn */}
                        <FormField
                          control={form.control}
                          name="linkedinPost"
                          render={({ field }) => (
                            <FormItem>
                              <MagicField
                                label="LinkedIn Post"
                                description="Professional post for LinkedIn"
                                fieldName="linkedin_post"
                                context={getFieldContext()}
                                onGenerated={value => form.setValue("linkedinPost", value)}
                              >
                                <div className="flex items-start gap-2">
                                  <Linkedin className="h-5 w-5 text-blue-700 mt-2" />
                                  <FormControl>
                                    <Textarea
                                      placeholder="Write a professional LinkedIn post..."
                                      rows={5}
                                      {...field}
                                    />
                                  </FormControl>
                                </div>
                              </MagicField>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Separator />

                        {/* Push Notification */}
                        <FormField
                          control={form.control}
                          name="pushNotification"
                          render={({ field }) => (
                            <FormItem>
                              <MagicField
                                label="Push Notification"
                                description="Short notification text (max 100 characters)"
                                fieldName="push_notification"
                                context={getFieldContext()}
                                onGenerated={value =>
                                  form.setValue("pushNotification", value.slice(0, 100))
                                }
                                characterLimit={100}
                                currentLength={field.value?.length || 0}
                              >
                                <div className="flex items-start gap-2">
                                  <Bell className="h-5 w-5 text-amber-600 mt-2" />
                                  <FormControl>
                                    <Input
                                      placeholder="New article: ..."
                                      maxLength={100}
                                      {...field}
                                    />
                                  </FormControl>
                                </div>
                              </MagicField>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Newsletter Subject */}
                        <FormField
                          control={form.control}
                          name="newsletterSubject"
                          render={({ field }) => (
                            <FormItem>
                              <MagicField
                                label="Newsletter Subject Line"
                                description="Email subject line (max 80 characters)"
                                fieldName="newsletter_subject"
                                context={getFieldContext()}
                                onGenerated={value =>
                                  form.setValue("newsletterSubject", value.slice(0, 80))
                                }
                                characterLimit={80}
                                currentLength={field.value?.length || 0}
                              >
                                <div className="flex items-start gap-2">
                                  <Mail className="h-5 w-5 text-green-600 mt-2" />
                                  <FormControl>
                                    <Input placeholder="Subject: ..." maxLength={80} {...field} />
                                  </FormControl>
                                </div>
                              </MagicField>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ============================================================= */}
                  {/* SETTINGS TAB */}
                  {/* ============================================================= */}
                  <TabsContent value="settings" className="space-y-6 mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          Article Settings
                        </CardTitle>
                        <CardDescription>Publication status and display options</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Status */}
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="draft">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-gray-500" />
                                      Draft
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="review">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                                      In Review
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="scheduled">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                                      Scheduled
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="published">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-green-500" />
                                      Published
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Publish Date */}
                        {form.watch("status") === "scheduled" && (
                          <FormField
                            control={form.control}
                            name="publishDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Publish Date</FormLabel>
                                <FormControl>
                                  <Input type="datetime-local" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {/* Author */}
                        <FormField
                          control={form.control}
                          name="author"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Author</FormLabel>
                              <FormControl>
                                <Input placeholder="Author name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Separator />

                        {/* Feature Article */}
                        <FormField
                          control={form.control}
                          name="isFeature"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Feature Article</FormLabel>
                                <FormDescription>
                                  Display this article prominently on the homepage
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {/* Allow Comments */}
                        <FormField
                          control={form.control}
                          name="allowComments"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Allow Comments</FormLabel>
                                <FormDescription>
                                  Enable reader comments on this article
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </form>
            </Form>
          </div>

          {/* Preview Panel */}
          {showPreview && <PreviewPanel article={watchedValues} />}
        </div>
      </div>
    </TooltipProvider>
  );
}

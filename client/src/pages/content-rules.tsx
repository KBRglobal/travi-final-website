import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_CONTENT_RULES } from "@shared/schema";
import {
  Settings,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Save,
  RotateCcw,
  Ruler,
  ListOrdered,
  HelpCircle,
  Lightbulb,
  Link2,
  Search,
  Shield,
} from "lucide-react";

interface ContentRules {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  minWords: number;
  maxWords: number;
  optimalMinWords: number;
  optimalMaxWords: number;
  introMinWords: number;
  introMaxWords: number;
  quickFactsMin: number;
  quickFactsMax: number;
  quickFactsWordsMin: number;
  quickFactsWordsMax: number;
  mainSectionsMin: number;
  mainSectionsMax: number;
  mainSectionWordsMin: number;
  mainSectionWordsMax: number;
  faqsMin: number;
  faqsMax: number;
  faqAnswerWordsMin: number;
  faqAnswerWordsMax: number;
  proTipsMin: number;
  proTipsMax: number;
  proTipWordsMin: number;
  proTipWordsMax: number;
  conclusionMinWords: number;
  conclusionMaxWords: number;
  internalLinksMin: number;
  internalLinksMax: number;
  keywordDensityMin: number;
  keywordDensityMax: number;
  dubaiMentionsMin: number;
  maxRetries: number;
  contentType: string | null;
}

const DEFAULT_RULES: Omit<ContentRules, "id"> = DEFAULT_CONTENT_RULES;

function RuleInput({
  label,
  value,
  onChange,
  min = 0,
  max = 10000,
  description,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        min={min}
        max={max}
        className="w-full"
      />
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

function RangeInput({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  icon: Icon,
}: {
  label: string;
  minValue: number;
  maxValue: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <Label className="font-medium">{label}</Label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Minimum</Label>
          <Input
            type="number"
            value={minValue}
            onChange={e => onMinChange(parseInt(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Maximum</Label>
          <Input
            type="number"
            value={maxValue}
            onChange={e => onMaxChange(parseInt(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}

export default function ContentRulesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rules, setRules] = useState<Omit<ContentRules, "id">>(DEFAULT_RULES);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: savedRules, isLoading } = useQuery<ContentRules>({
    queryKey: ["/api/contents-rules"],
    queryFn: async () => {
      const res = await fetch("/api/contents-rules");
      if (!res.ok) {
        // Return default if not found
        return { id: "", ...DEFAULT_RULES };
      }
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Omit<ContentRules, "id">) => {
      const res = await fetch("/api/contents-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save rules");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contents-rules"] });
      toast({
        title: "Rules saved successfully",
        description: "The new rules will apply to all new content generation",
      });
      setHasChanges(false);
    },
    onError: () => {
      toast({
        title: "Save error",
        description: "Unable to save the rules",
        variant: "destructive",
      });
    },
  });

  const updateRule = <K extends keyof Omit<ContentRules, "id">>(
    key: K,
    value: Omit<ContentRules, "id">[K]
  ) => {
    setRules(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    setRules(DEFAULT_RULES);
    setHasChanges(true);
  };

  const calculateEstimatedWordCount = () => {
    const intro = (rules.introMinWords + rules.introMaxWords) / 2;
    const quickFacts =
      (rules.quickFactsMin * ((rules.quickFactsWordsMin + rules.quickFactsWordsMax) / 2)) /
      rules.quickFactsMin;
    const mainSections =
      rules.mainSectionsMin * ((rules.mainSectionWordsMin + rules.mainSectionWordsMax) / 2);
    const faqs = rules.faqsMin * ((rules.faqAnswerWordsMin + rules.faqAnswerWordsMax) / 2);
    const tips = rules.proTipsMin * ((rules.proTipWordsMin + rules.proTipWordsMax) / 2);
    const conclusion = (rules.conclusionMinWords + rules.conclusionMaxWords) / 2;

    return Math.round(intro + quickFacts + mainSections + faqs + tips + conclusion);
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Content Rules - Strict System
          </h1>
          <p className="text-muted-foreground mt-1">These rules cannot be bypassed by AI engines</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to defaults
          </Button>
          <Button
            onClick={() => saveMutation.mutate(rules)}
            disabled={!hasChanges || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save rules"}
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      <Alert variant={rules.isActive ? "default" : "destructive"}>
        <div className="flex items-center gap-2">
          {rules.isActive ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle>{rules.isActive ? "Rules are active" : "Rules are disabled"}</AlertTitle>
        </div>
        <AlertDescription className="mt-2 flex items-center justify-between">
          <span>
            {rules.isActive
              ? "All AI content generation will enforce these rules"
              : "Content generation will not enforce rules - not recommended!"}
          </span>
          <Switch
            checked={rules.isActive}
            onCheckedChange={checked => updateRule("isActive", checked)}
          />
        </AlertDescription>
      </Alert>

      {/* Estimated Word Count */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Estimated article length</p>
              <p className="text-3xl font-bold text-primary">
                {calculateEstimatedWordCount().toLocaleString()} words
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-lg px-3 py-1">
                {rules.minWords.toLocaleString()} - {rules.maxWords.toLocaleString()} words
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Allowed range</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules Tabs */}
      <Tabs defaultValue="wordcount" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="wordcount" className="gap-2">
            <Ruler className="h-4 w-4" />
            Content Length
          </TabsTrigger>
          <TabsTrigger value="structure" className="gap-2">
            <ListOrdered className="h-4 w-4" />
            Structure
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            FAQ & Tips
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-2">
            <Search className="h-4 w-4" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Settings className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* Word Count Tab */}
        <TabsContent value="wordcount" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Length Rules</CardTitle>
              <CardDescription>Set minimum and maximum words - must be met</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <RangeInput
                  label="Total article length (words)"
                  minValue={rules.minWords}
                  maxValue={rules.maxWords}
                  onMinChange={v => updateRule("minWords", v)}
                  onMaxChange={v => updateRule("maxWords", v)}
                  icon={FileText}
                />
                <RangeInput
                  label="Optimal length (words)"
                  minValue={rules.optimalMinWords}
                  maxValue={rules.optimalMaxWords}
                  onMinChange={v => updateRule("optimalMinWords", v)}
                  onMaxChange={v => updateRule("optimalMaxWords", v)}
                  icon={CheckCircle2}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <RangeInput
                  label="Introduction"
                  minValue={rules.introMinWords}
                  maxValue={rules.introMaxWords}
                  onMinChange={v => updateRule("introMinWords", v)}
                  onMaxChange={v => updateRule("introMaxWords", v)}
                />
                <RangeInput
                  label="Conclusion"
                  minValue={rules.conclusionMinWords}
                  maxValue={rules.conclusionMaxWords}
                  onMinChange={v => updateRule("conclusionMinWords", v)}
                  onMaxChange={v => updateRule("conclusionMaxWords", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Structure Tab */}
        <TabsContent value="structure" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Article Structure</CardTitle>
              <CardDescription>Set number of sections, Quick Facts and style</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <RangeInput
                  label="Main sections (H2)"
                  minValue={rules.mainSectionsMin}
                  maxValue={rules.mainSectionsMax}
                  onMinChange={v => updateRule("mainSectionsMin", v)}
                  onMaxChange={v => updateRule("mainSectionsMax", v)}
                  icon={ListOrdered}
                />
                <RangeInput
                  label="Words per main section"
                  minValue={rules.mainSectionWordsMin}
                  maxValue={rules.mainSectionWordsMax}
                  onMinChange={v => updateRule("mainSectionWordsMin", v)}
                  onMaxChange={v => updateRule("mainSectionWordsMax", v)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <RangeInput
                  label="Quick Facts (count)"
                  minValue={rules.quickFactsMin}
                  maxValue={rules.quickFactsMax}
                  onMinChange={v => updateRule("quickFactsMin", v)}
                  onMaxChange={v => updateRule("quickFactsMax", v)}
                />
                <RangeInput
                  label="Quick Facts (total words)"
                  minValue={rules.quickFactsWordsMin}
                  maxValue={rules.quickFactsWordsMax}
                  onMinChange={v => updateRule("quickFactsWordsMin", v)}
                  onMaxChange={v => updateRule("quickFactsWordsMax", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ & Tips Tab */}
        <TabsContent value="faq" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>FAQ and Pro Tips</CardTitle>
              <CardDescription>
                Settings for frequently asked questions and professional tips
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <RangeInput
                  label="Number of FAQ questions"
                  minValue={rules.faqsMin}
                  maxValue={rules.faqsMax}
                  onMinChange={v => updateRule("faqsMin", v)}
                  onMaxChange={v => updateRule("faqsMax", v)}
                  icon={HelpCircle}
                />
                <RangeInput
                  label="Words per answer"
                  minValue={rules.faqAnswerWordsMin}
                  maxValue={rules.faqAnswerWordsMax}
                  onMinChange={v => updateRule("faqAnswerWordsMin", v)}
                  onMaxChange={v => updateRule("faqAnswerWordsMax", v)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <RangeInput
                  label="Number of Pro Tips"
                  minValue={rules.proTipsMin}
                  maxValue={rules.proTipsMax}
                  onMinChange={v => updateRule("proTipsMin", v)}
                  onMaxChange={v => updateRule("proTipsMax", v)}
                  icon={Lightbulb}
                />
                <RangeInput
                  label="Words per tip"
                  minValue={rules.proTipWordsMin}
                  maxValue={rules.proTipWordsMax}
                  onMinChange={v => updateRule("proTipWordsMin", v)}
                  onMaxChange={v => updateRule("proTipWordsMax", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>Search engine optimization rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <RangeInput
                  label="Internal links"
                  minValue={rules.internalLinksMin}
                  maxValue={rules.internalLinksMax}
                  onMinChange={v => updateRule("internalLinksMin", v)}
                  onMaxChange={v => updateRule("internalLinksMax", v)}
                  icon={Link2}
                />
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Keyword density (%)</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Minimum</Label>
                      <Input
                        type="number"
                        value={rules.keywordDensityMin / 10}
                        onChange={e =>
                          updateRule("keywordDensityMin", parseFloat(e.target.value) * 10 || 0)
                        }
                        step="0.1"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Maximum</Label>
                      <Input
                        type="number"
                        value={rules.keywordDensityMax / 10}
                        onChange={e =>
                          updateRule("keywordDensityMax", parseFloat(e.target.value) * 10 || 0)
                        }
                        step="0.1"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <RuleInput
                label="Minimum 'Dubai' mentions"
                value={rules.dubaiMentionsMin}
                onChange={v => updateRule("dubaiMentionsMin", v)}
                min={1}
                max={20}
                description="How many times Dubai must appear in the article"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Additional system settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Rule name</Label>
                  <Input
                    value={rules.name}
                    onChange={e => updateRule("name", e.target.value)}
                    placeholder="dubai-seo-standard"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={rules.description}
                    onChange={e => updateRule("description", e.target.value)}
                    placeholder="Rule description..."
                    rows={3}
                  />
                </div>

                <RuleInput
                  label="Maximum retries"
                  value={rules.maxRetries}
                  onChange={v => updateRule("maxRetries", v)}
                  min={1}
                  max={10}
                  description="How many times the system will try to generate content until it meets the rules"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Article Structure Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Section</th>
                  <th className="text-center py-2">Words</th>
                  <th className="text-center py-2">% of Article</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Introduction</td>
                  <td className="text-center">
                    {rules.introMinWords}-{rules.introMaxWords}
                  </td>
                  <td className="text-center">~8%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Quick Facts</td>
                  <td className="text-center">
                    {rules.quickFactsWordsMin}-{rules.quickFactsWordsMax}
                  </td>
                  <td className="text-center">~5%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">
                    Main sections ({rules.mainSectionsMin}-{rules.mainSectionsMax})
                  </td>
                  <td className="text-center">
                    {rules.mainSectionsMin * rules.mainSectionWordsMin}-
                    {rules.mainSectionsMax * rules.mainSectionWordsMax}
                  </td>
                  <td className="text-center">~60%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">
                    FAQ ({rules.faqsMin}-{rules.faqsMax} questions)
                  </td>
                  <td className="text-center">
                    {rules.faqsMin * rules.faqAnswerWordsMin}-
                    {rules.faqsMax * rules.faqAnswerWordsMax}
                  </td>
                  <td className="text-center">~20%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">
                    Pro Tips ({rules.proTipsMin}-{rules.proTipsMax})
                  </td>
                  <td className="text-center">
                    {rules.proTipsMin * rules.proTipWordsMin}-
                    {rules.proTipsMax * rules.proTipWordsMax}
                  </td>
                  <td className="text-center">~7%</td>
                </tr>
                <tr>
                  <td className="py-2">Conclusion</td>
                  <td className="text-center">
                    {rules.conclusionMinWords}-{rules.conclusionMaxWords}
                  </td>
                  <td className="text-center">~5%</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td className="py-2">Total</td>
                  <td className="text-center text-primary">
                    {rules.minWords}-{rules.maxWords}
                  </td>
                  <td className="text-center">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

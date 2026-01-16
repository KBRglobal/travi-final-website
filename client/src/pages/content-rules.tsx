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
  Shield
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

const DEFAULT_RULES: Omit<ContentRules, 'id'> = DEFAULT_CONTENT_RULES;

function RuleInput({
  label,
  value,
  onChange,
  min = 0,
  max = 10000,
  description
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
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        min={min}
        max={max}
        className="w-full"
      />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
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
          <Label className="text-xs text-muted-foreground">מינימום</Label>
          <Input
            type="number"
            value={minValue}
            onChange={(e) => onMinChange(parseInt(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">מקסימום</Label>
          <Input
            type="number"
            value={maxValue}
            onChange={(e) => onMaxChange(parseInt(e.target.value) || 0)}
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
  const [rules, setRules] = useState<Omit<ContentRules, 'id'>>(DEFAULT_RULES);
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
    mutationFn: async (data: Omit<ContentRules, 'id'>) => {
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
        title: "חוקים נשמרו בהצלחה",
        description: "החוקים החדשים יחולו על כל יצירת תוכן חדשה",
      });
      setHasChanges(false);
    },
    onError: () => {
      toast({
        title: "שגיאה בשמירה",
        description: "לא ניתן לשמור את החוקים",
        variant: "destructive",
      });
    },
  });

  const updateRule = <K extends keyof Omit<ContentRules, 'id'>>(key: K, value: Omit<ContentRules, 'id'>[K]) => {
    setRules(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    setRules(DEFAULT_RULES);
    setHasChanges(true);
  };

  const calculateEstimatedWordCount = () => {
    const intro = (rules.introMinWords + rules.introMaxWords) / 2;
    const quickFacts = rules.quickFactsMin * ((rules.quickFactsWordsMin + rules.quickFactsWordsMax) / 2) / rules.quickFactsMin;
    const mainSections = rules.mainSectionsMin * ((rules.mainSectionWordsMin + rules.mainSectionWordsMax) / 2);
    const faqs = rules.faqsMin * ((rules.faqAnswerWordsMin + rules.faqAnswerWordsMax) / 2);
    const tips = rules.proTipsMin * ((rules.proTipWordsMin + rules.proTipWordsMax) / 2);
    const conclusion = (rules.conclusionMinWords + rules.conclusionMaxWords) / 2;

    return Math.round(intro + quickFacts + mainSections + faqs + tips + conclusion);
  };

  if (isLoading) {
    return <div className="p-8">טוען...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            חוקי תוכן - מערכת קשיחה
          </h1>
          <p className="text-muted-foreground mt-1">
            חוקים אלו אינם ניתנים לעקיפה על ידי מנועי AI
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 ml-2" />
            איפוס לברירת מחדל
          </Button>
          <Button
            onClick={() => saveMutation.mutate(rules)}
            disabled={!hasChanges || saveMutation.isPending}
          >
            <Save className="h-4 w-4 ml-2" />
            {saveMutation.isPending ? "שומר..." : "שמור חוקים"}
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
          <AlertTitle>
            {rules.isActive ? "החוקים פעילים" : "החוקים מושבתים"}
          </AlertTitle>
        </div>
        <AlertDescription className="mt-2 flex items-center justify-between">
          <span>
            {rules.isActive
              ? "כל יצירת תוכן AI תאכוף את החוקים האלו"
              : "יצירת תוכן לא תאכוף את החוקים - לא מומלץ!"}
          </span>
          <Switch
            checked={rules.isActive}
            onCheckedChange={(checked) => updateRule("isActive", checked)}
          />
        </AlertDescription>
      </Alert>

      {/* Estimated Word Count */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">אורך משוער למאמר</p>
              <p className="text-3xl font-bold text-primary">{calculateEstimatedWordCount().toLocaleString()} מילים</p>
            </div>
            <div className="text-left">
              <Badge variant="outline" className="text-lg px-3 py-1">
                {rules.minWords.toLocaleString()} - {rules.maxWords.toLocaleString()} מילים
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">טווח מותר</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules Tabs */}
      <Tabs defaultValue="wordcount" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="wordcount" className="gap-2">
            <Ruler className="h-4 w-4" />
            אורך תוכן
          </TabsTrigger>
          <TabsTrigger value="structure" className="gap-2">
            <ListOrdered className="h-4 w-4" />
            מבנה
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            FAQ & טיפים
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-2">
            <Search className="h-4 w-4" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Settings className="h-4 w-4" />
            מתקדם
          </TabsTrigger>
        </TabsList>

        {/* Word Count Tab */}
        <TabsContent value="wordcount" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>חוקי אורך תוכן</CardTitle>
              <CardDescription>
                הגדרת מינימום ומקסימום מילים - חובה לעמוד בהם
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <RangeInput
                  label="אורך מאמר כולל (מילים)"
                  minValue={rules.minWords}
                  maxValue={rules.maxWords}
                  onMinChange={(v) => updateRule("minWords", v)}
                  onMaxChange={(v) => updateRule("maxWords", v)}
                  icon={FileText}
                />
                <RangeInput
                  label="אורך אופטימלי (מילים)"
                  minValue={rules.optimalMinWords}
                  maxValue={rules.optimalMaxWords}
                  onMinChange={(v) => updateRule("optimalMinWords", v)}
                  onMaxChange={(v) => updateRule("optimalMaxWords", v)}
                  icon={CheckCircle2}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <RangeInput
                  label="פתיחה / Introduction"
                  minValue={rules.introMinWords}
                  maxValue={rules.introMaxWords}
                  onMinChange={(v) => updateRule("introMinWords", v)}
                  onMaxChange={(v) => updateRule("introMaxWords", v)}
                />
                <RangeInput
                  label="סיכום / Conclusion"
                  minValue={rules.conclusionMinWords}
                  maxValue={rules.conclusionMaxWords}
                  onMinChange={(v) => updateRule("conclusionMinWords", v)}
                  onMaxChange={(v) => updateRule("conclusionMaxWords", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Structure Tab */}
        <TabsContent value="structure" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>מבנה מאמר</CardTitle>
              <CardDescription>
                הגדרת מספר סעיפים, Quick Facts וסגנון
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <RangeInput
                  label="סעיפים ראשיים (H2)"
                  minValue={rules.mainSectionsMin}
                  maxValue={rules.mainSectionsMax}
                  onMinChange={(v) => updateRule("mainSectionsMin", v)}
                  onMaxChange={(v) => updateRule("mainSectionsMax", v)}
                  icon={ListOrdered}
                />
                <RangeInput
                  label="מילים לכל סעיף ראשי"
                  minValue={rules.mainSectionWordsMin}
                  maxValue={rules.mainSectionWordsMax}
                  onMinChange={(v) => updateRule("mainSectionWordsMin", v)}
                  onMaxChange={(v) => updateRule("mainSectionWordsMax", v)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <RangeInput
                  label="Quick Facts (כמות)"
                  minValue={rules.quickFactsMin}
                  maxValue={rules.quickFactsMax}
                  onMinChange={(v) => updateRule("quickFactsMin", v)}
                  onMaxChange={(v) => updateRule("quickFactsMax", v)}
                />
                <RangeInput
                  label="Quick Facts (מילים סה״כ)"
                  minValue={rules.quickFactsWordsMin}
                  maxValue={rules.quickFactsWordsMax}
                  onMinChange={(v) => updateRule("quickFactsWordsMin", v)}
                  onMaxChange={(v) => updateRule("quickFactsWordsMax", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ & Tips Tab */}
        <TabsContent value="faq" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>FAQ ו-Pro Tips</CardTitle>
              <CardDescription>
                הגדרות לשאלות נפוצות וטיפים מקצועיים
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <RangeInput
                  label="כמות שאלות FAQ"
                  minValue={rules.faqsMin}
                  maxValue={rules.faqsMax}
                  onMinChange={(v) => updateRule("faqsMin", v)}
                  onMaxChange={(v) => updateRule("faqsMax", v)}
                  icon={HelpCircle}
                />
                <RangeInput
                  label="מילים לכל תשובה"
                  minValue={rules.faqAnswerWordsMin}
                  maxValue={rules.faqAnswerWordsMax}
                  onMinChange={(v) => updateRule("faqAnswerWordsMin", v)}
                  onMaxChange={(v) => updateRule("faqAnswerWordsMax", v)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <RangeInput
                  label="כמות Pro Tips"
                  minValue={rules.proTipsMin}
                  maxValue={rules.proTipsMax}
                  onMinChange={(v) => updateRule("proTipsMin", v)}
                  onMaxChange={(v) => updateRule("proTipsMax", v)}
                  icon={Lightbulb}
                />
                <RangeInput
                  label="מילים לכל טיפ"
                  minValue={rules.proTipWordsMin}
                  maxValue={rules.proTipWordsMax}
                  onMinChange={(v) => updateRule("proTipWordsMin", v)}
                  onMaxChange={(v) => updateRule("proTipWordsMax", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות SEO</CardTitle>
              <CardDescription>
                חוקי אופטימיזציה למנועי חיפוש
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <RangeInput
                  label="קישורים פנימיים"
                  minValue={rules.internalLinksMin}
                  maxValue={rules.internalLinksMax}
                  onMinChange={(v) => updateRule("internalLinksMin", v)}
                  onMaxChange={(v) => updateRule("internalLinksMax", v)}
                  icon={Link2}
                />
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">צפיפות מילות מפתח (%)</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">מינימום</Label>
                      <Input
                        type="number"
                        value={rules.keywordDensityMin / 10}
                        onChange={(e) => updateRule("keywordDensityMin", parseFloat(e.target.value) * 10 || 0)}
                        step="0.1"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">מקסימום</Label>
                      <Input
                        type="number"
                        value={rules.keywordDensityMax / 10}
                        onChange={(e) => updateRule("keywordDensityMax", parseFloat(e.target.value) * 10 || 0)}
                        step="0.1"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <RuleInput
                label="אזכורי 'Dubai' / 'דובאי' מינימום"
                value={rules.dubaiMentionsMin}
                onChange={(v) => updateRule("dubaiMentionsMin", v)}
                min={1}
                max={20}
                description="כמה פעמים חייב להופיע דובאי/Dubai במאמר"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות מתקדמות</CardTitle>
              <CardDescription>
                הגדרות נוספות למערכת
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>שם החוק</Label>
                  <Input
                    value={rules.name}
                    onChange={(e) => updateRule("name", e.target.value)}
                    placeholder="dubai-seo-standard"
                  />
                </div>

                <div className="space-y-2">
                  <Label>תיאור</Label>
                  <Textarea
                    value={rules.description}
                    onChange={(e) => updateRule("description", e.target.value)}
                    placeholder="תיאור החוק..."
                    rows={3}
                  />
                </div>

                <RuleInput
                  label="מספר ניסיונות מקסימלי (Retries)"
                  value={rules.maxRetries}
                  onChange={(v) => updateRule("maxRetries", v)}
                  min={1}
                  max={10}
                  description="כמה פעמים המערכת תנסה ליצור תוכן עד שתעמוד בחוקים"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>סיכום מבנה מאמר</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-2">סעיף</th>
                  <th className="text-center py-2">מילים</th>
                  <th className="text-center py-2">אחוז מהמאמר</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">פתיחה</td>
                  <td className="text-center">{rules.introMinWords}-{rules.introMaxWords}</td>
                  <td className="text-center">~8%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Quick Facts</td>
                  <td className="text-center">{rules.quickFactsWordsMin}-{rules.quickFactsWordsMax}</td>
                  <td className="text-center">~5%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">סעיפים ראשיים ({rules.mainSectionsMin}-{rules.mainSectionsMax})</td>
                  <td className="text-center">{rules.mainSectionsMin * rules.mainSectionWordsMin}-{rules.mainSectionsMax * rules.mainSectionWordsMax}</td>
                  <td className="text-center">~60%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">FAQ ({rules.faqsMin}-{rules.faqsMax} שאלות)</td>
                  <td className="text-center">{rules.faqsMin * rules.faqAnswerWordsMin}-{rules.faqsMax * rules.faqAnswerWordsMax}</td>
                  <td className="text-center">~20%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Pro Tips ({rules.proTipsMin}-{rules.proTipsMax})</td>
                  <td className="text-center">{rules.proTipsMin * rules.proTipWordsMin}-{rules.proTipsMax * rules.proTipWordsMax}</td>
                  <td className="text-center">~7%</td>
                </tr>
                <tr>
                  <td className="py-2">סיכום</td>
                  <td className="text-center">{rules.conclusionMinWords}-{rules.conclusionMaxWords}</td>
                  <td className="text-center">~5%</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td className="py-2">סה״כ</td>
                  <td className="text-center text-primary">{rules.minWords}-{rules.maxWords}</td>
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
